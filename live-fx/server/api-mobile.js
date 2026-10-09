// LiveFX – legacy phone handshake: `GET /m?token=<token>` (links from 2.2 and earlier, typed links, Stream Deck
// buttons) still works, but since 2.3 it no longer copies the master token into a cookie: it mints a paired device
// (server/pairing.js, cookie `livefx_dev`, revocable in the panel) and redirects to /mobile.html. New links and QR
// codes use the pairing page `/p#<secret>` (server/api-pairing.js), which never carries the token.
//
// Brute-force guard: 10 wrong tokens per minute per client address -> 429. Wrong attempts are counted even after
// the limit is reached (the window slides from the first failed attempt). Through the internet tunnel the client
// address is the visitor's `cf-connecting-ip` (auth.clientAddress), so one guesser cannot lock out the real phone.
'use strict';

const crypto = require('crypto');
const { json } = require('./router');
const auth = require('./auth');

const MOBILE_PAGE = '/mobile.html';
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 1000;

/** Constant-time string compare; unequal lengths are rejected without touching timingSafeEqual. */
function tokenMatches(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !given || !expected) return false;
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Per-address sliding window of failed attempts. */
function createLimiter({ max = MAX_ATTEMPTS, windowMs = WINDOW_MS, now = Date.now } = {}) {
  const failures = new Map(); // address -> { count, since }
  function entry(addr) {
    const t = now();
    let e = failures.get(addr);
    if (!e || t - e.since >= windowMs) {
      e = { count: 0, since: t };
      failures.set(addr, e);
    }
    return e;
  }
  return {
    blocked(addr) {
      return entry(addr).count >= max;
    },
    fail(addr) {
      entry(addr).count += 1;
      if (failures.size > 10000) failures.clear(); // never grow without bound
    },
    reset(addr) {
      failures.delete(addr);
    },
  };
}

function redirect(res, location) {
  res.writeHead(302, { location, 'cache-control': 'no-store', 'content-length': 0 });
  res.end();
}

function register(router, ctx) {
  const limiter = createLimiter();
  router.route('GET', '/m', async (req, res, rctx) => {
    const token = rctx.url.searchParams.get('token');
    if (token === null) {
      redirect(res, MOBILE_PAGE); // the cookie may already exist (or the page sends the phone to /p)
      return;
    }
    const addr = auth.clientAddress(req);
    if (limiter.blocked(addr)) {
      json(res, 429, { ok: false, error: 'rate_limited', message: 'Zu viele Fehlversuche – bitte eine Minute warten.' });
      return;
    }
    if (!tokenMatches(token, ctx.token)) {
      limiter.fail(addr);
      json(res, 401, { ok: false, error: 'unauthorized', message: 'Falscher Token – im Panel „📱 Handy“ den QR-Code scannen.' });
      return;
    }
    limiter.reset(addr);
    const secure = !!(ctx.config && ctx.config.secure) || auth.viaTunnel(req);
    const headers = { location: MOBILE_PAGE, 'cache-control': 'no-store', 'content-length': 0 };
    const pairing = ctx.pairing;
    if (pairing && typeof pairing.mintDevice === 'function') {
      // A phone that already holds a valid device cookie keeps it (no duplicate entry per tap on the old link).
      if (!pairing.deviceFromRequest(req)) {
        const { cookieValue } = pairing.mintDevice({
          userAgent: String(req.headers['user-agent'] || ''),
          via: auth.viaTunnel(req) ? 'tunnel' : auth.isLocal(req) ? 'local' : 'lan',
        });
        headers['set-cookie'] = require('./pairing').cookieHeader(cookieValue, { secure });
      }
    } else {
      headers['set-cookie'] = auth.cookieHeader(ctx.token) + (secure ? '; Secure' : ''); // no pairing store (unit use)
    }
    res.writeHead(302, headers);
    res.end();
  });
}

module.exports = { register, createLimiter, tokenMatches };
