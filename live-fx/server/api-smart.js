// LiveFX – smart mode HTTP routes. See docs/CONTRACTS.md §4 and §7.
//
//   POST /api/smart/classify  (auth)  {text, lang?} -> {ok, triggerId|null, confidence, model, ms, cached}
//   GET  /api/smart/status             -> {ok, available, reason, model, mock, calls, errors, timeouts, lastError}
'use strict';

const { readJson, json } = require('./router');
const { requireAuth } = require('./auth');

function register(router, ctx) {
  router.route(
    'POST',
    '/api/smart/classify',
    requireAuth(async (req, res) => {
      const body = await readJson(req, 16 * 1024);
      const lang = typeof body.lang === 'string' ? body.lang.trim().slice(0, 10) : undefined;
      const r = await ctx.smart.classify(body.text, { lang });
      json(res, 200, { ok: true, triggerId: r.triggerId, confidence: r.confidence, model: r.model || ctx.smart.model, ms: r.ms, cached: r.cached === true });
    })
  );

  router.route('GET', '/api/smart/status', (req, res) => {
    const s = ctx.smart;
    const st = s.stats || {};
    json(res, 200, {
      ok: true,
      available: s.available === true,
      reason: s.reason || null,
      model: s.model,
      mock: s.mock === true,
      calls: st.calls || 0,
      errors: st.errors || 0,
      timeouts: st.timeouts || 0,
      lastError: st.lastError || null,
    });
  });
}

module.exports = { register };
