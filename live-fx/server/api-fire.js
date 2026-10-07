// LiveFX – firing routes: the panel's raw bus envelope (`POST /fire`), the friendly external API
// (`POST /api/fire {id}`), and `GET /api/config`. See docs/CONTRACTS.md §4.
'use strict';

const os = require('os');
require('../js/schema.js');
const { readJson, HttpError, json } = require('./router');
const { requireAuth } = require('./auth');

const Schema = globalThis.LiveFXSchema;

function str(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

/** IPv4 addresses of this machine that other devices in the LAN can reach (no loopback). */
function lanIps() {
  const out = [];
  let ifaces = {};
  try {
    ifaces = os.networkInterfaces() || {};
  } catch (_) {
    return out;
  }
  for (const list of Object.values(ifaces)) {
    for (const a of list || []) {
      const v4 = a.family === 'IPv4' || a.family === 4;
      if (v4 && !a.internal && a.address && !out.includes(a.address)) out.push(a.address);
    }
  }
  return out;
}

/** Strips matcher-internal keys (`_key`, `_keywords`, …) before a trigger leaves the server. */
function publicTrigger(t) {
  const out = {};
  for (const k of Object.keys(t)) if (!k.startsWith('_')) out[k] = t[k];
  return out;
}

function register(router, ctx) {
  // Raw envelope from the panel (or anything that speaks the bus protocol).
  router.route(
    'POST',
    '/fire',
    requireAuth(async (req, res) => {
      const body = await readJson(req);
      const v = Schema.validateEnvelope(body);
      if (!v.ok) throw new HttpError(400, 'invalid_envelope', v.error);
      const msg = v.msg;
      if (msg.type === 'volume') {
        // 2.2: per-bus levels; a message without `bus` is the master level (1.x senders) and keeps `state.volume`.
        const bus = msg.bus || 'master';
        ctx.state.volumes = { ...(ctx.state.volumes || {}), [bus]: msg.volume };
        if (bus === 'master') ctx.state.volume = msg.volume;
      }
      if (msg.type === 'theme') ctx.state.theme = msg.theme;
      if (msg.type === 'perf') ctx.state.perf = msg.perf;
      if (msg.type === 'layout') {
        // Partial merge: only the keys this message carries change (a band set in portrait by the overlay stays).
        const cur = ctx.state.layout || {};
        const next = { ...cur };
        for (const k of ['storyLayout', 'band', 'zone']) if (msg[k] !== undefined) next[k] = msg[k];
        ctx.state.layout = next;
      }
      ctx.bus.broadcast(msg, { audience: 'all' });
      json(res, 200, { ok: true, id: msg.id, overlays: ctx.bus.counts().overlays });
    })
  );

  // Friendly API: fire a stored trigger by id (cooldown-aware) or an ad-hoc trigger object.
  router.route(
    'POST',
    '/api/fire',
    requireAuth(async (req, res) => {
      const body = await readJson(req);
      const source = str(body.source, Schema.LIMITS.sourceLen) || 'API';
      const force = body.force === true;

      if (body.trigger !== undefined) {
        const n = Schema.normalizeTrigger(body.trigger);
        if (!n) throw new HttpError(400, 'invalid_trigger', 'trigger must be an object');
        const msg = { id: Schema.newId('api'), type: 'fire', ts: Date.now(), trigger: n.trigger, source };
        ctx.bus.broadcast(msg, { audience: 'all' });
        json(res, 200, { ok: true, fired: true, id: msg.id, warnings: n.warnings });
        return;
      }

      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) throw new HttpError(400, 'invalid_request', 'body needs {id} or {trigger}');
      const stored = ctx.state.getTriggers().find((t) => t && t.id === id);
      if (!stored) throw new HttpError(404, 'unknown_trigger', `kein Trigger mit id "${id.slice(0, 40)}"`);

      let trigger = stored;
      if (!force) {
        const r = ctx.state.matcher.fireById(id);
        if (r.blocked) {
          json(res, 200, { ok: true, fired: false, reason: r.blocked, id });
          return;
        }
        if (r.trigger) trigger = r.trigger;
      }
      const msg = { id: Schema.newId('api'), type: 'fire', ts: Date.now(), trigger: publicTrigger(trigger), source };
      ctx.bus.broadcast(msg, { audience: 'all' });
      json(res, 200, { ok: true, fired: true, id: msg.id, trigger: id });
    })
  );

  // Panel bootstrap: version, token (shown to the streamer for external tools), smart status, limits,
  // plus what the "Handy" card needs to build the phone link: LAN IPs, bound port, https or not.
  router.route(
    'GET',
    '/api/config',
    requireAuth(async (req, res) => {
      const smart = ctx.smart || {};
      json(res, 200, {
        ok: true,
        version: ctx.config.version,
        token: ctx.token,
        smart: { available: !!smart.available, reason: smart.reason ?? null, model: smart.model ?? null, mock: !!smart.mock },
        limits: { assetBytes: Schema.LIMITS.assetBytes },
        lanIps: lanIps(),
        secure: !!ctx.config.secure,
        port: Number(ctx.config.port) || 0,
      });
    })
  );
}

module.exports = { register };
