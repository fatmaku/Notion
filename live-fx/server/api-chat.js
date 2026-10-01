// LiveFX – „Zuschauer-Trigger“ (2.0): chat commands from Twitch / YouTube fire triggers, gifts hit
// tiers. Settings live in data/chat.json (the YouTube API key never leaves the server – GET returns
// `hasKey` only). See docs/VIEWER.md and docs/CONTRACTS.md „Zuschauer-Trigger“.
//
//   GET  /api/chat        -> { ok, settings (public), status, recent }
//   PUT  /api/chat        -> partial update, persists, restarts the affected connectors
//   POST /api/chat/test   -> { platform?, user?, text } injected as if received from chat
//
// The fire path mirrors POST /api/fire {id}: cooldown-aware via state.matcher.fireById, same
// envelope on the bus (`type:'fire'`, `source:'chat:<platform>:<user>'`). Every chat message is
// also broadcast to panels as `{type:'chat', platform, user, text, command?, fired?, blocked?}`.
'use strict';

const fs = require('fs');
const path = require('path');
require('../js/schema.js');
const { readJson, HttpError, json } = require('./router');
const { requireAuth } = require('./auth');
const twitchMod = require('./chat-twitch');
const youtubeMod = require('./chat-youtube');

const Schema = globalThis.LiveFXSchema;
const FILE_NAME = 'chat.json';
const RECENT_MAX = 50;
const COMMANDS_MAX = 100;
const TIERS_MAX = 10;
const COOLDOWN_MAX_MS = 3600000;
const PLATFORMS = ['twitch', 'youtube', 'tiktok', 'test', 'other'];

const DEFAULTS = Object.freeze({
  twitch: { channel: '', enabled: false },
  youtube: { apiKey: '', videoId: '', enabled: false },
  prefix: '!',
  cooldownPerUserMs: 15000,
  cooldownGlobalMs: 3000,
  commands: {},
  allowAll: false,
  gifts: {
    tiers: [
      { min: 1, trigger: '' },
      { min: 10, trigger: '' },
      { min: 100, trigger: '' },
    ],
  },
});

function str(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** `label` -> `label-slug` (letters/digits, dashes); used by `allowAll` so `!let's go` finds "Let's go". */
function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalizes a command key: trimmed, lower-cased, prefix added when missing, no inner whitespace. */
function commandKey(raw, prefix) {
  let k = String(raw || '').trim().toLowerCase();
  if (!k) return '';
  if (/\s/.test(k)) return '';
  if (!k.startsWith(prefix)) k = prefix + k;
  if (k.length <= prefix.length || k.length > 40) return '';
  return k;
}

/** Strips matcher-internal keys (`_key`, `_keywords`, …) before a trigger leaves the server. */
function publicTrigger(t) {
  const out = {};
  for (const k of Object.keys(t)) if (!k.startsWith('_')) out[k] = t[k];
  return out;
}

/**
 * Fires a stored trigger by id the way POST /api/fire does (same cooldown rules via the shared matcher,
 * same envelope). Returns `{fired, reason, trigger, id}` – never throws for unknown ids.
 */
function fireTrigger(ctx, id, { source = 'chat', force = false } = {}) {
  const tid = typeof id === 'string' ? id.trim() : '';
  if (!tid) return { fired: false, reason: 'unknown', trigger: null, id: null };
  const stored = ctx.state.getTriggers().find((t) => t && t.id === tid);
  if (!stored) return { fired: false, reason: 'unknown', trigger: null, id: null };
  let trigger = stored;
  if (force) {
    if (stored.enabled === false) return { fired: false, reason: 'disabled', trigger: tid, id: null };
  } else {
    const r = ctx.state.matcher.fireById(tid);
    if (r.blocked) return { fired: false, reason: r.blocked, trigger: tid, id: null };
    if (r.trigger) trigger = r.trigger;
  }
  const msg = { id: Schema.newId('chat'), type: 'fire', ts: Date.now(), trigger: publicTrigger(trigger), source: str(source, Schema.LIMITS.sourceLen) || 'chat' };
  ctx.bus.broadcast(msg, { audience: 'all' });
  return { fired: true, reason: null, trigger: tid, id: msg.id };
}

/** Merges a partial update into settings; returns { settings, warnings }. Unknown keys are ignored. */
function mergeSettings(current, patch) {
  const warnings = [];
  const out = clone(current);
  const p = patch && typeof patch === 'object' ? patch : {};
  if (p.twitch && typeof p.twitch === 'object') {
    if (p.twitch.channel !== undefined) {
      const raw = str(p.twitch.channel, 120);
      const ch = raw ? twitchMod.normalizeChannel(raw) : '';
      if (raw && !ch) warnings.push('Twitch-Kanalname ungültig (nur Buchstaben, Zahlen, _)');
      out.twitch.channel = ch;
    }
    if (p.twitch.enabled !== undefined) out.twitch.enabled = p.twitch.enabled === true;
  }
  if (p.youtube && typeof p.youtube === 'object') {
    if (typeof p.youtube.apiKey === 'string') out.youtube.apiKey = str(p.youtube.apiKey, 200);
    if (p.youtube.videoId !== undefined) {
      const raw = str(p.youtube.videoId, 300);
      const v = raw ? youtubeMod.normalizeVideoId(raw) : '';
      if (raw && !v) warnings.push('YouTube-Video-ID ungültig (ID oder Link zum Livestream)');
      out.youtube.videoId = v;
    }
    if (p.youtube.enabled !== undefined) out.youtube.enabled = p.youtube.enabled === true;
  }
  if (p.prefix !== undefined) {
    const pre = str(p.prefix, 3);
    if (pre && !/\s/.test(pre)) out.prefix = pre;
    else warnings.push('Präfix muss 1–3 Zeichen ohne Leerzeichen sein');
  }
  for (const k of ['cooldownPerUserMs', 'cooldownGlobalMs']) {
    if (p[k] === undefined) continue;
    const n = Number(p[k]);
    if (Number.isFinite(n) && n >= 0) out[k] = Math.min(COOLDOWN_MAX_MS, Math.round(n));
    else warnings.push(`${k} muss eine Zahl ≥ 0 sein`);
  }
  if (p.allowAll !== undefined) out.allowAll = p.allowAll === true;
  if (p.commands !== undefined) {
    if (!p.commands || typeof p.commands !== 'object' || Array.isArray(p.commands)) warnings.push('commands muss ein Objekt {"!befehl": "trigger-id"} sein');
    else {
      const cmds = {};
      for (const [rawKey, rawVal] of Object.entries(p.commands)) {
        const key = commandKey(rawKey, out.prefix);
        if (!key) {
          warnings.push(`Befehl „${String(rawKey).slice(0, 20)}“ ungültig`);
          continue;
        }
        const val = str(rawVal, Schema.LIMITS.idLen);
        if (!val) continue; // empty value = remove
        if (!Schema.ID_RE.test(val)) {
          warnings.push(`Befehl ${key}: Trigger-ID „${val.slice(0, 20)}“ ungültig`);
          continue;
        }
        if (Object.keys(cmds).length >= COMMANDS_MAX) {
          warnings.push(`maximal ${COMMANDS_MAX} Befehle`);
          break;
        }
        cmds[key] = val;
      }
      out.commands = cmds;
    }
  }
  if (p.gifts !== undefined) {
    const tiersIn = p.gifts && typeof p.gifts === 'object' && Array.isArray(p.gifts.tiers) ? p.gifts.tiers : null;
    if (!tiersIn) warnings.push('gifts.tiers muss ein Array [{min, trigger}] sein');
    else {
      const tiers = [];
      for (const t of tiersIn.slice(0, TIERS_MAX)) {
        if (!t || typeof t !== 'object') continue;
        const min = Number(t.min);
        const trigger = str(t.trigger, Schema.LIMITS.idLen);
        if (!Number.isFinite(min) || min < 0) {
          warnings.push('Geschenk-Stufe: min muss eine Zahl ≥ 0 sein');
          continue;
        }
        if (trigger && !Schema.ID_RE.test(trigger)) {
          warnings.push(`Geschenk-Stufe ${min}: Trigger-ID ungültig`);
          continue;
        }
        tiers.push({ min, trigger });
      }
      tiers.sort((a, b) => a.min - b.min);
      out.gifts.tiers = tiers;
    }
  }
  return { settings: out, warnings };
}

function createChat(ctx, { twitchFactory, youtubeFactory, env = process.env } = {}) {
  const log = ctx.log || (() => {});
  const file = ctx.dataDir ? path.join(ctx.dataDir, FILE_NAME) : null;
  let settings = clone(DEFAULTS);
  const recent = [];
  const userLast = new Map(); // `${platform}:${user}` -> ms
  let globalLast = 0;
  let total = 0;
  let twitch = null;
  let youtube = null;
  const connState = { twitch: 'off', youtube: 'off', twitchError: null, youtubeError: null };

  // ---- persistence ----
  function load() {
    if (!file) return;
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') log(`chat: ${file} nicht lesbar: ${e.message}`);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const m = mergeSettings(clone(DEFAULTS), parsed && typeof parsed === 'object' ? parsed : {});
      settings = m.settings;
      for (const w of m.warnings) log(`chat: ${FILE_NAME}: ${w}`);
    } catch (e) {
      log(`chat: ${FILE_NAME} ist kein gültiges JSON – Standardwerte`);
    }
  }

  function persist() {
    if (!file) return false;
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), ...settings }, null, 2) + '\n', { mode: 0o600 });
      fs.renameSync(tmp, file);
      return true;
    } catch (e) {
      log(`chat: ${file} nicht schreibbar: ${e.message}`);
      try {
        fs.unlinkSync(tmp);
      } catch (_) {
        /* never created */
      }
      return false;
    }
  }

  // ---- events ----
  function remember(ev) {
    recent.push(ev);
    while (recent.length > RECENT_MAX) recent.shift();
  }

  function emitChat(ev) {
    const msg = { id: Schema.newId('chat'), type: 'chat', ts: ev.ts || Date.now(), platform: ev.platform, user: ev.user, text: ev.text };
    if (ev.command) msg.command = ev.command;
    if (ev.fired) msg.fired = ev.fired;
    if (ev.blocked) msg.blocked = ev.blocked;
    remember({ ...msg, type: 'chat' });
    ctx.bus.broadcast(msg, { audience: 'panel' });
    return msg;
  }

  /** Resolves `!word` to a trigger id: explicit mapping first, then (allowAll) id or label slug. */
  function resolveCommand(word) {
    const explicit = settings.commands[word];
    if (explicit) return explicit;
    if (!settings.allowAll) return null;
    const name = word.slice(settings.prefix.length);
    if (!name) return null;
    const list = ctx.state.getTriggers();
    const hit = list.find((t) => t && typeof t.id === 'string' && t.id.toLowerCase() === name) || list.find((t) => t && slug(t.label) === name);
    return hit ? hit.id : null;
  }

  function ingest(raw) {
    const platform = PLATFORMS.includes(raw && raw.platform) ? raw.platform : 'other';
    const user = str(raw && raw.user, 60) || 'Zuschauer';
    const text = str(raw && raw.text, 500);
    total++;
    const result = { platform, user, text, command: null, fired: null, reason: null, trigger: null };
    if (!text) return result;
    const bits = Number(raw && raw.bits);
    if (Number.isFinite(bits) && bits > 0) gift({ platform, user, amount: bits / 100, currency: 'USD', gift: 'bits', raw: bits, text });
    const prefix = settings.prefix;
    const first = text.split(/\s+/)[0].toLowerCase();
    if (first.startsWith(prefix) && first.length > prefix.length) {
      result.command = first;
      const id = resolveCommand(first);
      if (id) {
        const now = Date.now();
        const key = `${platform}:${(raw && raw.login) || user.toLowerCase()}`;
        const userLastAt = userLast.get(key) || 0;
        if (now - userLastAt < settings.cooldownPerUserMs) result.reason = 'cooldown:user';
        else if (now - globalLast < settings.cooldownGlobalMs) result.reason = 'cooldown:global';
        else {
          const r = fireTrigger(ctx, id, { source: `chat:${platform}:${user}` });
          result.trigger = id;
          if (r.fired) {
            result.fired = id;
            userLast.set(key, now);
            globalLast = now;
            if (userLast.size > 5000) userLast.delete(userLast.keys().next().value);
          } else result.reason = r.reason;
        }
      }
    }
    emitChat({ platform, user, text, command: result.command, fired: result.fired, blocked: result.reason, ts: raw && raw.ts });
    return result;
  }

  function gift(raw) {
    const platform = PLATFORMS.includes(raw && raw.platform) ? raw.platform : str(raw && raw.platform, 20) || 'other';
    const user = str(raw && raw.user, 60) || 'Zuschauer';
    const amount = Number(raw && raw.amount);
    const amt = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    const ev = { platform, user, amount: amt, currency: str(raw && raw.currency, 8), gift: str(raw && raw.gift, 40), text: str(raw && raw.text, 500), tier: null, fired: null, trigger: null, reason: null };
    const tiers = settings.gifts.tiers.filter((t) => t.trigger && t.min <= amt).sort((a, b) => b.min - a.min);
    const tier = tiers[0] || null;
    if (tier) {
      ev.tier = tier.min;
      ev.trigger = tier.trigger;
      const r = fireTrigger(ctx, tier.trigger, { source: `gift:${platform}:${user}`, force: true });
      if (r.fired) ev.fired = tier.trigger;
      else ev.reason = r.reason;
    } else ev.reason = 'no_tier';
    const msg = { id: Schema.newId('gift'), type: 'gift', ts: Date.now(), ...ev };
    remember(msg);
    ctx.bus.broadcast(msg, { audience: 'panel' });
    return ev;
  }

  // ---- connectors ----
  function stopTwitch() {
    if (twitch) twitch.stop();
    twitch = null;
    connState.twitch = 'off';
  }
  function stopYoutube() {
    if (youtube) youtube.stop();
    youtube = null;
    connState.youtube = 'off';
  }
  function startTwitch() {
    stopTwitch();
    if (!settings.twitch.enabled || !settings.twitch.channel) return;
    const factory = twitchFactory || twitchMod.createTwitchChat;
    twitch = factory({
      channel: settings.twitch.channel,
      url: env.LIVEFX_TWITCH_WS_URL || undefined,
      log,
      onMessage: (m) => ingest(m),
      onState: (s, detail) => {
        connState.twitch = s;
        if (detail) connState.twitchError = detail;
        if (s === 'connected') connState.twitchError = null;
        log(`chat: twitch #${settings.twitch.channel} ${s}${detail ? ` (${detail})` : ''}`);
      },
    });
    twitch.start();
  }
  function startYoutube() {
    stopYoutube();
    if (!settings.youtube.enabled || !settings.youtube.videoId || !settings.youtube.apiKey) return;
    const factory = youtubeFactory || youtubeMod.createYouTubeChat;
    youtube = factory({
      apiKey: settings.youtube.apiKey,
      videoId: settings.youtube.videoId,
      apiBase: env.LIVEFX_YOUTUBE_API_BASE || undefined,
      log,
      onMessage: (m) => ingest(m),
      onGift: (g) => gift(g),
      onState: (s, detail) => {
        connState.youtube = s;
        if (detail) connState.youtubeError = detail;
        if (s === 'connected') connState.youtubeError = null;
        log(`chat: youtube ${settings.youtube.videoId} ${s}${detail ? ` (${detail})` : ''}`);
      },
    });
    youtube.start();
  }

  function publicSettings() {
    const s = clone(settings);
    s.youtube = { videoId: s.youtube.videoId, enabled: s.youtube.enabled, hasKey: !!settings.youtube.apiKey };
    return s;
  }

  function status() {
    return {
      twitch: settings.twitch.enabled && settings.twitch.channel ? connState.twitch : 'off',
      youtube: settings.youtube.enabled && settings.youtube.videoId ? (settings.youtube.apiKey ? connState.youtube : 'error') : 'off',
      twitchError: connState.twitchError,
      youtubeError: !settings.youtube.apiKey && settings.youtube.enabled ? 'API-Key fehlt' : connState.youtubeError,
      messages: total,
      twitchMessages: twitch ? twitch.messages : 0,
      youtubeMessages: youtube ? youtube.messages : 0,
    };
  }

  function update(patch) {
    const before = { twitch: JSON.stringify(settings.twitch), youtube: JSON.stringify(settings.youtube) };
    const m = mergeSettings(settings, patch);
    settings = m.settings;
    const warnings = m.warnings.slice();
    if (!persist() && file) warnings.push('Chat-Einstellungen konnten nicht gespeichert werden (Dateisystem)');
    if (JSON.stringify(settings.twitch) !== before.twitch) startTwitch();
    if (JSON.stringify(settings.youtube) !== before.youtube) startYoutube();
    return { warnings };
  }

  function stop() {
    stopTwitch();
    stopYoutube();
  }

  load();
  startTwitch();
  startYoutube();

  return {
    get settings() {
      return settings;
    },
    publicSettings,
    status,
    recent: (n = 20) => recent.slice(-n),
    ingest,
    gift,
    update,
    stop,
    resolveCommand,
    get connectors() {
      return { twitch, youtube };
    },
  };
}

function register(router, ctx) {
  const chat = () => {
    if (!ctx.chat) throw new HttpError(503, 'chat_unavailable', 'Chat-Modul nicht initialisiert');
    return ctx.chat;
  };

  router.route(
    'GET',
    '/api/chat',
    requireAuth(async (req, res) => {
      const c = chat();
      json(res, 200, { ok: true, settings: c.publicSettings(), status: c.status(), recent: c.recent(20) });
    })
  );

  router.route(
    'PUT',
    '/api/chat',
    requireAuth(async (req, res) => {
      const body = await readJson(req, 200000);
      const c = chat();
      const r = c.update(body);
      json(res, 200, { ok: true, settings: c.publicSettings(), status: c.status(), warnings: r.warnings });
    })
  );

  router.route(
    'POST',
    '/api/chat/test',
    requireAuth(async (req, res) => {
      const body = await readJson(req);
      const text = str(body.text, 500);
      if (!text) throw new HttpError(400, 'invalid_text', 'text muss ein nicht-leerer String sein');
      const c = chat();
      const r = c.ingest({ platform: PLATFORMS.includes(body.platform) ? body.platform : 'test', user: str(body.user, 60) || 'Tester', text });
      json(res, 200, { ok: true, fired: !!r.fired, trigger: r.trigger, command: r.command, reason: r.reason });
    })
  );
}

module.exports = { createChat, register, fireTrigger, mergeSettings, slug, commandKey, DEFAULTS, FILE_NAME, RECENT_MAX };
