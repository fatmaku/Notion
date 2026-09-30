// LiveFX – phone handshake: `GET /m?token=<token>` turns the token from a typed/shared link into the
// same HttpOnly panel cookie that index.html sets, then redirects to /mobile.html. The phone page itself
// never sees the token. See docs/CONTRACTS.md §4 and docs/HANDY.md.
//
// Brute-force guard: 10 wrong tokens per minute per socket address -> 429. Wrong attempts are counted
// even after the limit is reached (the window slides from the first failed attempt).
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
      redirect(res, MOBILE_PAGE); // the cookie may already exist (or the page shows the hint)
      return;
    }
    const addr = String((req.socket && req.socket.remoteAddress) || 'unknown');
    if (limiter.blocked(addr)) {
      json(res, 429, { ok: false, error: 'rate_limited', message: 'Zu viele Fehlversuche – bitte eine Minute warten.' });
      return;
    }
    if (!tokenMatches(token, ctx.token)) {
      limiter.fail(addr);
      json(res, 401, { ok: false, error: 'unauthorized', message: 'Falscher Token – den Link aus der Karte „Handy“ im Panel verwenden.' });
      return;
    }
    limiter.reset(addr);
    const secure = !!(ctx.config && ctx.config.secure);
    res.writeHead(302, {
      location: MOBILE_PAGE,
      'set-cookie': auth.cookieHeader(ctx.token) + (secure ? '; Secure' : ''),
      'cache-control': 'no-store',
      'content-length': 0,
    });
    res.end();
  });
}

module.exports = { register, createLimiter, tokenMatches };
