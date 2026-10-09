// LiveFX – internet remote API (2.2): starts/stops the Cloudflare quick tunnel from server/tunnel.js.
//
//   GET  /api/tunnel         → { ok, status: idle|starting|online|error, url, hostname, since, error, phoneUrl, pairing, manualUrl, … }
//   POST /api/tunnel/start   → same shape, resolves when the tunnel is online or failed
//   POST /api/tunnel/stop    → same shape (status idle)
//
// All three need requireAuth (panel on this PC, a paired device, or Bearer). 2.3: the phone link is a pairing link
// `https://<tunnel>/p#<secret>` (server/api-pairing.js, single use, 10 minutes) – HTTPS, so the phone microphone works,
// and the master token is no longer part of any link or QR code. `pairing` carries { code, expiresAt, url, … }.
//
// Host guard: while the tunnel is online its hostname is appended to LIVEFX_ALLOWED_HOSTS (auth.js reads the
// variable on every request), so `hostAllowed()` accepts `<words>.trycloudflare.com` without touching auth.js.
//
// Request guard: cloudflared connects from 127.0.0.1, so tunnel requests (Host *.trycloudflare.com or a
// `cf-connecting-ip` header) are never treated as local – auth.guard() (server.js, before routing) handles them like
// LAN requests: without a session only the pairing page, GET /m, /health and public static files are reachable.
// `guard(req, ctx)` below is the 2.2 helper kept for callers/tests: an HttpError for a refused tunnel request.
'use strict';

const { json, HttpError } = require('./router');
const auth = require('./auth');
const { createTunnel } = require('./tunnel');

const { TUNNEL_HOST_RE, viaTunnel } = auth;

/**
 * Returns an HttpError when a tunnel request must be refused, null otherwise (LAN / local requests: null).
 * Same rules as auth.guard(): public paths and requests with a session (device cookie, legacy cookie, Bearer) pass.
 */
function guard(req, ctx) {
  if (!viaTunnel(req)) return null;
  const d = auth.decide(req, ctx || {});
  if (d.action === 'pass') return null;
  return new HttpError(401, 'tunnel_login', d.code === 'tunnel_login' ? d.message : 'Über das Internet bitte zuerst koppeln: im Panel „📱 Handy“ → Internet-Link → QR-Code scannen.');
}

function allowHost(hostname) {
  const list = String(process.env.LIVEFX_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (hostname && !list.includes(hostname)) list.push(hostname);
  process.env.LIVEFX_ALLOWED_HOSTS = list.join(',');
}

function disallowHost(hostname) {
  const list = String(process.env.LIVEFX_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h && h !== hostname);
  process.env.LIVEFX_ALLOWED_HOSTS = list.join(',');
}

/** Status + (when online) a pairing link on the tunnel base; the open code is reused while it has time left. */
function publicStatus(tunnel, ctx) {
  const s = tunnel.status();
  let phoneUrl = null;
  let pairing = null;
  if (s.status === 'online' && s.url && ctx.pairing) {
    const code = ctx.pairing.current();
    const base = String(s.url).replace(/\/+$/, '');
    phoneUrl = `${base}/p#${code.secret}`;
    pairing = { code: code.code, expiresAt: new Date(code.expiresAt).toISOString(), ttlMs: code.ttlMs, url: phoneUrl, manualUrl: `${base}/p`, cameraUrl: `${base}/p?next=camera#${code.secret}` };
  }
  return { ok: true, ...s, phoneUrl, pairing };
}

function register(router, ctx) {
  const tunnel = ctx.tunnel || createTunnel({ dataDir: ctx.dataDir, log: ctx.log, getPort: () => (ctx.config && ctx.config.port) || 8787 });
  ctx.tunnel = tunnel;
  let allowed = null;
  tunnel.onChange((s) => {
    if (s.status === 'online' && s.hostname) {
      if (allowed && allowed !== s.hostname) disallowHost(allowed);
      allowed = s.hostname;
      allowHost(allowed);
    } else if (allowed) {
      disallowHost(allowed);
      allowed = null;
    }
  });

  router.route('GET', '/api/tunnel', auth.requireAuth(async (req, res) => json(res, 200, publicStatus(tunnel, ctx))));
  router.route(
    'POST',
    '/api/tunnel/start',
    auth.requireAuth(async (req, res) => {
      await tunnel.start();
      json(res, 200, publicStatus(tunnel, ctx));
    })
  );
  router.route(
    'POST',
    '/api/tunnel/stop',
    auth.requireAuth(async (req, res) => {
      await tunnel.stop();
      json(res, 200, publicStatus(tunnel, ctx));
    })
  );
}

module.exports = { register, guard, viaTunnel, allowHost, disallowHost, TUNNEL_HOST_RE };
