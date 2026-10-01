// LiveFX – Twitch chat reader (2.0, „Zuschauer-Trigger“). Anonymous IRC over WebSocket, zero deps.
//
// Twitch lets anyone read a channel's chat without logging in: connect to wss://irc-ws.chat.twitch.tv,
// send `NICK justinfan<random>` (the anonymous nick family), `JOIN #<channel>` and PRIVMSG lines start
// flowing. We request the `tags` capability so `display-name` and `bits` are available.
//
//   const tw = createTwitchChat({ channel: 'somestreamer', onMessage({platform, user, text, bits}), onState(state) });
//   tw.start(); tw.stop(); tw.state  // 'off' | 'connecting' | 'connected' | 'disconnected' | 'error'
//
// Testability: `url` and `WebSocketImpl` are injectable (test/helpers/ws-server.js runs a tiny in-process
// WebSocket server). `parseLine()` is exported for the IRC parser tests.
'use strict';

const DEFAULT_URL = 'wss://irc-ws.chat.twitch.tv:443';
const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 30000;
const CHANNEL_RE = /^[a-z0-9_]{1,25}$/i;

/** Normalizes a channel name: lower-cased, leading `#`, `@` or a twitch.tv URL stripped. '' when invalid. */
function normalizeChannel(raw) {
  let s = String(raw || '').trim().toLowerCase();
  s = s.replace(/^https?:\/\/(www\.|m\.)?twitch\.tv\//, '');
  s = s.replace(/^[#@]+/, '').replace(/[/?#].*$/, '');
  return CHANNEL_RE.test(s) ? s : '';
}

function parseTags(raw) {
  const tags = {};
  for (const part of String(raw || '').split(';')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const k = eq === -1 ? part : part.slice(0, eq);
    const v = eq === -1 ? '' : part.slice(eq + 1);
    // IRCv3 escaping: \s space, \: semicolon, \\ backslash, \r, \n
    tags[k] = v.replace(/\\(.)/g, (_, c) => ({ s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' })[c] ?? c);
  }
  return tags;
}

/**
 * Parses one IRC line. Returns `{command, tags, prefix, params, trailing, user, channel, text}` or null.
 * PRIVMSG: `@tags :nick!nick@nick.tmi.twitch.tv PRIVMSG #channel :message`.
 */
function parseLine(line) {
  let rest = String(line || '').replace(/\r?\n$/, '').replace(/\r$/, '');
  if (!rest.trim()) return null;
  let tags = {};
  if (rest.startsWith('@')) {
    const sp = rest.indexOf(' ');
    if (sp === -1) return null;
    tags = parseTags(rest.slice(1, sp));
    rest = rest.slice(sp + 1);
  }
  let prefix = '';
  if (rest.startsWith(':')) {
    const sp = rest.indexOf(' ');
    if (sp === -1) return null;
    prefix = rest.slice(1, sp);
    rest = rest.slice(sp + 1);
  }
  let trailing = null;
  const colon = rest.indexOf(' :');
  if (colon !== -1) {
    trailing = rest.slice(colon + 2);
    rest = rest.slice(0, colon);
  } else if (rest.startsWith(':')) {
    trailing = rest.slice(1);
    rest = '';
  }
  const params = rest.split(' ').filter(Boolean);
  const command = (params.shift() || '').toUpperCase();
  if (!command) return null;
  const out = { command, tags, prefix, params, trailing };
  if (command === 'PRIVMSG') {
    const nick = prefix.split('!')[0] || '';
    out.user = tags['display-name'] || nick;
    out.login = nick;
    out.channel = (params[0] || '').replace(/^#/, '');
    out.text = trailing || '';
    const bits = Number(tags.bits);
    if (Number.isFinite(bits) && bits > 0) out.bits = bits;
  }
  return out;
}

function createTwitchChat({ channel, onMessage, onState, url, WebSocketImpl, log = () => {}, backoffMinMs = BACKOFF_MIN_MS, backoffMaxMs = BACKOFF_MAX_MS } = {}) {
  const chan = normalizeChannel(channel);
  const WS = WebSocketImpl || globalThis.WebSocket;
  const target = url || DEFAULT_URL;
  let ws = null;
  let wanted = false;
  let timer = null;
  let attempts = 0;
  const api = { state: 'off', channel: chan, messages: 0, lastError: null };

  function setState(s, detail) {
    if (api.state === s && !detail) return;
    api.state = s;
    if (detail) api.lastError = detail;
    try {
      if (typeof onState === 'function') onState(s, detail);
    } catch (e) {
      log(`twitch: onState failed: ${e.message}`);
    }
  }

  function send(line) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(`${line}\r\n`);
      return true;
    } catch (e) {
      log(`twitch: send failed: ${e.message}`);
      return false;
    }
  }

  function handleLine(line) {
    const p = parseLine(line);
    if (!p) return;
    if (p.command === 'PING') {
      send(`PONG :${p.trailing || 'tmi.twitch.tv'}`);
      return;
    }
    if (p.command === '001' || p.command === '366') {
      attempts = 0;
      setState('connected');
      return;
    }
    if (p.command === 'RECONNECT') {
      log('twitch: server asked to reconnect');
      try {
        ws.close();
      } catch (_) {
        /* ignore */
      }
      return;
    }
    if (p.command === 'NOTICE' && /login|auth/i.test(p.trailing || '')) {
      setState('error', p.trailing);
      return;
    }
    if (p.command === 'PRIVMSG' && p.channel === chan) {
      api.messages++;
      const msg = { platform: 'twitch', user: String(p.user || '').slice(0, 60), login: p.login, text: String(p.text || '').slice(0, 500), ts: Date.now() };
      if (p.bits) msg.bits = p.bits;
      if (p.tags.id) msg.id = p.tags.id;
      try {
        if (typeof onMessage === 'function') onMessage(msg);
      } catch (e) {
        log(`twitch: onMessage failed: ${e.message}`);
      }
    }
  }

  function scheduleReconnect() {
    if (!wanted || timer) return;
    const delay = Math.min(backoffMaxMs, backoffMinMs * 2 ** Math.min(attempts, 10));
    attempts++;
    timer = setTimeout(() => {
      timer = null;
      connect();
    }, delay);
    if (typeof timer.unref === 'function') timer.unref();
  }

  function connect() {
    if (!wanted || ws) return;
    if (!WS) {
      setState('error', 'WebSocket nicht verfügbar (Node 22 nötig)');
      return;
    }
    setState('connecting');
    let sock;
    try {
      sock = new WS(target);
    } catch (e) {
      setState('error', e.message);
      scheduleReconnect();
      return;
    }
    ws = sock;
    let buf = '';
    sock.addEventListener('open', () => {
      if (ws !== sock) return;
      send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
      send(`JOIN #${chan}`);
    });
    sock.addEventListener('message', (ev) => {
      if (ws !== sock) return;
      buf += typeof ev.data === 'string' ? ev.data : String(ev.data || '');
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        handleLine(line);
      }
    });
    sock.addEventListener('error', () => {
      if (ws !== sock) return;
      api.lastError = 'Verbindungsfehler';
    });
    sock.addEventListener('close', () => {
      if (ws !== sock) return;
      ws = null;
      if (wanted) {
        setState('disconnected');
        scheduleReconnect();
      } else setState('off');
    });
  }

  api.start = () => {
    if (!chan) {
      setState('error', 'ungültiger Kanalname');
      return api;
    }
    wanted = true;
    attempts = 0;
    connect();
    return api;
  };

  api.stop = () => {
    wanted = false;
    if (timer) clearTimeout(timer);
    timer = null;
    const sock = ws;
    ws = null;
    if (sock) {
      try {
        sock.close();
      } catch (_) {
        /* ignore */
      }
    }
    setState('off');
    return api;
  };

  /** Feeds a raw IRC line as if received (tests). */
  api.inject = (line) => handleLine(line);

  return api;
}

module.exports = { createTwitchChat, parseLine, parseTags, normalizeChannel, DEFAULT_URL };
