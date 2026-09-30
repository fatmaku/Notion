// LiveFX – `POST /api/transcript`: lets an external speech engine (Whisper, a phone app, a chat bot)
// push text into every connected panel, where the matcher treats it like microphone input.
// See docs/CONTRACTS.md §4 and §6 (external ASR backend).
'use strict';

require('../js/schema.js');
const { readJson, HttpError, json } = require('./router');
const { requireAuth } = require('./auth');

const Schema = globalThis.LiveFXSchema;

function str(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function register(router, ctx) {
  router.route(
    'POST',
    '/api/transcript',
    requireAuth(async (req, res) => {
      const body = await readJson(req);
      const max = Schema.LIMITS.transcriptChars;
      if (typeof body.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'invalid_text', 'text muss ein nicht-leerer String sein');
      if (body.text.length > max) throw new HttpError(400, 'invalid_text', `text darf höchstens ${max} Zeichen haben`);
      const msg = {
        id: Schema.newId('tr'),
        type: 'transcript',
        ts: Date.now(),
        text: body.text.trim(),
        final: body.final !== false,
        source: str(body.source, Schema.LIMITS.sourceLen) || 'Extern',
      };
      const lang = str(body.lang, 10);
      if (lang) msg.lang = lang;
      ctx.bus.broadcast(msg, { audience: 'panel' });
      json(res, 200, { ok: true, panels: ctx.bus.counts().panels });
    })
  );
}

module.exports = { register };
