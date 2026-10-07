// LiveFX – internet remote API (2.2): starts/stops the Cloudflare quick tunnel from server/tunnel.js.
//
//   GET  /api/tunnel         → { ok, status: idle|starting|online|error, url, hostname, since, error, phoneUrl, manualUrl, … }
//   POST /api/tunnel/start   → same shape, resolves when the tunnel is online or failed
//   POST /api/tunnel/stop    → same shape (status idle)
//
// All three need requireAuth (panel cookie / same-origin, or Bearer). The phone link is
// `https://<tunnel>/m?token=<token>` – HTTPS, so the phone microphone works.
//
// Host guard: while the tunnel is online its hostname is appended to LIVEFX_ALLOWED_HOSTS (auth.js reads the
// variable on every request), so `hostAllowed()` accepts `<words>.trycloudflare.com` without touching auth.js.
//
// Request guard (`guard(req)`, called by server.js before routing): cloudflared connects from 127.0.0.1, so
// auth.js would treat every tunnel request as loopback and index.html would hand the panel cookie to anyone
// who knows the URL. Requests that arrive through the tunnel (Host *.trycloudflare.com or a `cf-connecting-ip`
// header) are therefore allowed only with the panel cookie or a Bearer token – except `GET /m` (the token
// handshake that sets the cookie), `/health` and `/favicon.ico`.
'use strict';

const { json, HttpError } = require('./router');
const auth = require('./auth');
const { createTunnel } = require('./tunnel');

const TUNNEL_HOST_RE = /\.trycloudflare\.com$/i;
const OPEN_PATHS = new Set(['/m', '/health', '/favicon.ico']);

function hostOf(req) {
  const raw = String((req && req.headers && req.headers.host) || '').trim().toLowerCase();
  const colon = raw.lastIndexOf(':');
  return colon !== -1 && !raw.startsWith('[') && raw.indexOf(':') === colon ? raw.slice(0, colon) : raw.replace(/^\[|\].*$/g, '');
}

/** True when this request came in through the tunnel (not from the LAN or the PC itself). */
function viaTunnel(req) {
  const h = (req && req.headers) || {};
  return TUNNEL_HOST_RE.test(hostOf(req)) || typeof h['cf-connecting-ip'] === 'string';
}

/**
 * Returns an HttpError when a tunnel request must be refused, null otherwise. Public paths and
 * authenticated requests (cookie or Bearer) pass; everything else gets 401 with a German hint.
 */
function guard(req, ctx) {
  if (!viaTunnel(req)) return null;
  const pathname = String(req.url || '/').split('?')[0];
  if (OPEN_PATHS.has(pathname) && (req.method === 'GET' || req.method === 'HEAD')) return null;
  const token = ctx && ctx.token;
  if (auth.cookieOk(req, token)) return null;
  const header = String(req.headers.authorization || '');
  if (/^Bearer\s+\S+/i.test(header) && auth.isAuthorized({ headers: { authorization: header }, socket: {} }, token)) return null;
  return new HttpError(401, 'tunnel_login', 'Über das Internet bitte zuerst den Handy-Link mit Token öffnen (Panel → Karte „Handy“ → Internet-Link).');
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

function publicStatus(tunnel, ctx) {
  const s = tunnel.status();
  const phoneUrl = s.status === 'online' && s.url ? `${s.url}/m?token=${encodeURIComponent(ctx.token || '')}` : null;
  return { ok: true, ...s, phoneUrl };
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
