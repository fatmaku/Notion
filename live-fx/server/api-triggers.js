// LiveFX – trigger persistence API. See docs/CONTRACTS.md §4.
//   GET /api/triggers  -> { ok, version: 2, triggers (merged with defaults), removed, updatedAt }
//   PUT /api/triggers  -> { ok, count, warnings, updatedAt }   (auth) then broadcasts `triggers-updated`
'use strict';

const { HttpError, json, readJson } = require('./router');
const auth = require('./auth');

const BODY_LIMIT = 2 * 1024 * 1024; // 200 triggers with long keyword lists fit easily

function register(router, ctx) {
  router.route('GET', '/api/triggers', (req, res, c) => {
    const state = c.state;
    json(res, 200, {
      ok: true,
      version: state.version,
      triggers: state.getTriggers(),
      removed: state.getRemoved(),
      updatedAt: state.updatedAt,
    });
  });

  router.route(
    'PUT',
    '/api/triggers',
    auth.requireAuth(async (req, res, c) => {
      const body = await readJson(req, BODY_LIMIT);
      if (!Array.isArray(body.triggers)) throw new HttpError(400, 'invalid_triggers', 'triggers must be an array');
      if (body.removed !== undefined && body.removed !== null && !Array.isArray(body.removed)) {
        throw new HttpError(400, 'invalid_triggers', 'removed must be an array of ids');
      }
      const result = c.state.setTriggers({ triggers: body.triggers, removed: body.removed ?? undefined });
      const updatedAt = c.state.updatedAt;
      json(res, 200, { ok: true, count: result.count, warnings: result.warnings, updatedAt });
      c.log(`triggers: ${result.count} gespeichert${result.warnings.length ? ` (${result.warnings.length} Hinweise)` : ''}`);
      c.bus.broadcast({ type: 'triggers-updated', updatedAt });
    })
  );
}

module.exports = { register };
