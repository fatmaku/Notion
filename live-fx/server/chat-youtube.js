// LiveFX – YouTube live chat reader (2.0, „Zuschauer-Trigger“). Polls the YouTube Data API v3, zero deps.
//
//   1. GET videos?part=liveStreamingDetails&id=<videoId>   -> liveStreamingDetails.activeLiveChatId
//   2. GET liveChat/messages?liveChatId=…&part=snippet,authorDetails[&pageToken=…]  every
//      `pollingIntervalMillis` (the API tells us; we never poll faster than MIN_POLL_MS)
//
// Super Chats (`snippet.type === 'superChatEvent'`) are reported through `onGift` with the amount in
// currency units (amountMicros / 1e6) so they take the same path as POST /api/gift.
//
//   const yt = createYouTubeChat({ apiKey, videoId, onMessage, onGift, onState, fetchImpl, apiBase });
//   yt.start(); yt.stop(); yt.state // 'off' | 'connecting' | 'connected' | 'error' | 'ended'
'use strict';

const DEFAULT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MIN_POLL_MS = 2000;
const DEFAULT_POLL_MS = 5000;
const ERROR_RETRY_MS = 15000;
const BACKLOG_MS = 15000; // messages older than start - 15 s are history, not live chat
const VIDEO_RE = /^[A-Za-z0-9_-]{6,20}$/;

/** Accepts a bare video id or any youtube.com / youtu.be URL. '' when nothing usable. */
function normalizeVideoId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (VIDEO_RE.test(s)) return s;
  try {
    const u = new URL(s);
    const v = u.searchParams.get('v');
    if (v && VIDEO_RE.test(v)) return v;
    const m = /\/(live|shorts|embed|v)\/([A-Za-z0-9_-]{6,20})/.exec(u.pathname) || (u.hostname.endsWith('youtu.be') ? /^\/([A-Za-z0-9_-]{6,20})/.exec(u.pathname) : null);
    if (m) return m[m.length - 1];
  } catch (_) {
    /* not a URL */
  }
  return '';
}

function createYouTubeChat({ apiKey, videoId, onMessage, onGift, onState, fetchImpl, apiBase, log = () => {} } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const vid = normalizeVideoId(videoId);
  const key = String(apiKey || '').trim();
  let wanted = false;
  let timer = null;
  let gen = 0; // bumps on stop() so an in-flight poll of an old run is ignored
  const api = { state: 'off', videoId: vid, liveChatId: null, messages: 0, polls: 0, lastError: null, nextPageToken: null, startedAt: 0 };

  function setState(s, detail) {
    if (api.state === s && !detail) return;
    api.state = s;
    if (detail) api.lastError = detail;
    try {
      if (typeof onState === 'function') onState(s, detail);
    } catch (e) {
      log(`youtube: onState failed: ${e.message}`);
    }
  }

  function url(path, params) {
    const u = new URL(`${base}/${path}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    u.searchParams.set('key', key);
    return u.toString();
  }

  async function getJson(u) {
    const res = await fetchFn(u, { headers: { accept: 'application/json' } });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      const reason = data && data.error && Array.isArray(data.error.errors) && data.error.errors[0] ? data.error.errors[0].reason : '';
      const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      const e = new Error(reason ? `${msg} (${reason})` : msg);
      e.status = res.status;
      e.reason = reason;
      throw e;
    }
    return data || {};
  }

  function schedule(ms, myGen) {
    if (!wanted || myGen !== gen) return;
    timer = setTimeout(() => {
      timer = null;
      poll(myGen).catch((e) => log(`youtube: poll crashed: ${e.message}`));
    }, Math.max(MIN_POLL_MS, ms));
    if (typeof timer.unref === 'function') timer.unref();
  }

  async function resolveChatId(myGen) {
    const data = await getJson(url('videos', { part: 'liveStreamingDetails', id: vid }));
    if (myGen !== gen) return null;
    const item = Array.isArray(data.items) ? data.items[0] : null;
    const details = item && item.liveStreamingDetails;
    if (!item) throw Object.assign(new Error('Video nicht gefunden (videoId prüfen)'), { fatal: true });
    if (!details || !details.activeLiveChatId) throw Object.assign(new Error('Kein aktiver Live-Chat (Stream nicht live?)'), { fatal: details && details.actualEndTime ? true : false });
    return details.activeLiveChatId;
  }

  function handleItem(it) {
    const sn = it && it.snippet ? it.snippet : {};
    const au = it && it.authorDetails ? it.authorDetails : {};
    const published = Date.parse(sn.publishedAt || '');
    if (Number.isFinite(published) && published < api.startedAt - BACKLOG_MS) return; // backlog from before we joined
    const user = String(au.displayName || 'YouTube').slice(0, 60);
    api.messages++;
    if (sn.type === 'superChatEvent' || sn.type === 'superStickerEvent') {
      const d = sn.superChatDetails || sn.superStickerDetails || {};
      const micros = Number(d.amountMicros);
      const ev = {
        platform: 'youtube',
        user,
        amount: Number.isFinite(micros) ? Math.round(micros / 10000) / 100 : 0,
        currency: String(d.currency || '').slice(0, 8),
        gift: sn.type === 'superStickerEvent' ? 'supersticker' : 'superchat',
        text: String(d.userComment || sn.displayMessage || '').slice(0, 500),
        ts: Number.isFinite(published) ? published : Date.now(),
      };
      try {
        if (typeof onGift === 'function') onGift(ev);
      } catch (e) {
        log(`youtube: onGift failed: ${e.message}`);
      }
      return;
    }
    const text = String((sn.textMessageDetails && sn.textMessageDetails.messageText) || sn.displayMessage || '').slice(0, 500);
    if (!text) return;
    try {
      if (typeof onMessage === 'function') onMessage({ platform: 'youtube', user, text, ts: Number.isFinite(published) ? published : Date.now(), id: it.id });
    } catch (e) {
      log(`youtube: onMessage failed: ${e.message}`);
    }
  }

  async function poll(myGen) {
    if (!wanted || myGen !== gen) return;
    try {
      if (!api.liveChatId) {
        api.liveChatId = await resolveChatId(myGen);
        if (myGen !== gen) return;
      }
      const data = await getJson(url('liveChat/messages', { liveChatId: api.liveChatId, part: 'snippet,authorDetails', pageToken: api.nextPageToken, maxResults: 200 }));
      if (myGen !== gen) return;
      api.polls++;
      setState('connected');
      for (const it of Array.isArray(data.items) ? data.items : []) handleItem(it);
      api.nextPageToken = data.nextPageToken || api.nextPageToken;
      if (data.offlineAt) {
        setState('ended', 'Live-Chat beendet');
        wanted = false;
        return;
      }
      const ms = Number(data.pollingIntervalMillis);
      schedule(Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_POLL_MS, myGen);
    } catch (e) {
      if (myGen !== gen) return;
      log(`youtube: ${e.message}`);
      if (e.reason === 'liveChatEnded' || e.reason === 'liveChatNotFound') {
        api.liveChatId = null;
        api.nextPageToken = null;
      }
      const fatal = e.fatal || e.status === 400 || e.status === 403 || e.status === 401;
      setState('error', e.message);
      if (fatal && e.status === 403) {
        wanted = false; // quota / bad key: polling again will not help, the streamer must act
        return;
      }
      schedule(ERROR_RETRY_MS, myGen);
    }
  }

  api.start = () => {
    if (!key) {
      setState('error', 'API-Key fehlt');
      return api;
    }
    if (!vid) {
      setState('error', 'ungültige Video-ID');
      return api;
    }
    if (typeof fetchFn !== 'function') {
      setState('error', 'fetch nicht verfügbar');
      return api;
    }
    wanted = true;
    gen++;
    api.startedAt = Date.now();
    api.liveChatId = null;
    api.nextPageToken = null;
    setState('connecting');
    poll(gen).catch((e) => log(`youtube: poll crashed: ${e.message}`));
    return api;
  };

  api.stop = () => {
    wanted = false;
    gen++;
    if (timer) clearTimeout(timer);
    timer = null;
    setState('off');
    return api;
  };

  return api;
}

module.exports = { createYouTubeChat, normalizeVideoId, DEFAULT_API_BASE, MIN_POLL_MS };
