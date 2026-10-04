// Claude-Anbindung mit einer Attrappe statt echter API: Anfrageform, Auswertung, Ablehnung,
// Rückfall auf die einfache Analyse, Wiedererkennung, Namensprüfung.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClaudeAnalyzer, DEFAULT_MODEL, SYSTEM_PROMPT } from '../server/analyzer-claude.js';
import { createClaudeModerator } from '../server/moderator-claude.js';
import { withFallback, heuristicAnalyzer } from '../server/analyzers.js';

const img = { mime: 'image/jpeg', data: '/9j/AAAA' };
const reply = (obj, extra = {}) => ({ model: DEFAULT_MODEL, stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(obj) }], ...extra });

test('Analyse-Anfrage: Modell, Bilder, Structured Output, Fallbacks, Caching', async () => {
  let seen;
  const a = createClaudeAnalyzer({
    create: async (req, opts) => {
      seen = { req, opts };
      return reply({ is_cat: true, is_live_photo: true, ownership: 'street', pattern: 'sarman', age_group: 'adult', age_months_min: 24, age_months_max: 48, weight_kg_min: 3.8, weight_kg_max: 4.6, body_condition_score: 5, ear_tip: 'tipped', health_severity: 'none', summary_tr: 'Moda’nın keyifli sarmanı.', summary_de: 'Modas entspannter Kater.', summary_en: 'Moda’s chilled ginger.', nickname_ideas: ['Tarçın'] });
    },
  });
  const out = await a.analyze({ images: { full: img, crop: { ...img, data: '/9j/BBBB' } }, detector: { score: 0.91 }, lang: 'de', region: { name: 'Kadıköy', timezone: 'Europe/Istanbul' }, district: { name: 'Caferağa', aka: 'Moda' } });
  assert.equal(seen.req.model, 'claude-opus-5-5');
  assert.deepEqual(seen.req.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(seen.req.fallbacks, 'default');
  assert.equal(seen.req.output_config.format.type, 'json_schema');
  assert.equal(seen.req.output_config.effort, 'medium');
  assert.equal(seen.req.system[0].cache_control.type, 'ephemeral');
  assert.ok(!('thinking' in seen.req) && !('temperature' in seen.req), 'Opus 5.5: kein thinking/temperature');
  const content = seen.req.messages[0].content;
  assert.equal(content.filter((c) => c.type === 'image').length, 2);
  assert.match(content.at(-1).text, /Caferağa \(Moda\)/);
  assert.equal(seen.opts.timeout, 45000);
  assert.equal(out.analyzer, 'claude');
  assert.equal(out.pattern, 'sarman');
  assert.equal(out.ear_tip, 'tipped');
  assert.equal(out.summary.de, 'Modas entspannter Kater.');
  assert.match(SYSTEM_PROMPT, /street cats/i);
});

test('Ablehnung / Fehler → einfache Analyse übernimmt', async () => {
  const refusing = createClaudeAnalyzer({ create: async () => ({ stop_reason: 'refusal', content: [] }) });
  await assert.rejects(refusing.analyze({ images: { full: img } }), { code: 'refusal' });
  const broken = createClaudeAnalyzer({ create: async () => { throw Object.assign(new Error('overloaded'), { status: 529 }); } });
  const chain = withFallback(broken, heuristicAnalyzer);
  const a = await chain.analyze({ images: { full: img }, fingerprint: { colors: { orange: 0.8 } } });
  assert.equal(a.analyzer, 'heuristic');
  assert.equal(a.aiError, 'upstream');
  assert.equal(a.pattern, 'sarman');
  const garbage = createClaudeAnalyzer({ create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'kein json' }] }) });
  await assert.rejects(garbage.analyze({ images: { full: img } }), { code: 'bad_json' });
});

test('Wiedererkennung per KI: Treffer nur bei genug Sicherheit', async () => {
  const crops = { a: 'AAA', b: 'BBB' };
  let n = 0;
  const answers = [{ match_index: 2, confidence: 0.85, reason: 'same blaze' }, { match_index: 1, confidence: 0.4, reason: 'unsure' }];
  const a = createClaudeAnalyzer({
    create: async (req) => {
      assert.equal(req.messages[0].content.filter((c) => c.type === 'image').length, 3);
      return reply(answers[n++]);
    },
    readCrop: async (id) => crops[id] || null,
  });
  const cands = [{ id: 'c1', photoId: 'a', profile: { pattern: 'tekir' } }, { id: 'c2', photoId: 'b', profile: { pattern: 'tekir' } }];
  assert.equal((await a.compare({ images: { crop: img }, candidates: cands })).matchId, 'c2');
  assert.equal((await a.compare({ images: { crop: img }, candidates: cands })).matchId, null, 'zu unsicher → neue Katze');
});

test('KI-Namensprüfung mit Zwischenspeicher', async () => {
  let calls = 0;
  const m = createClaudeModerator({
    create: async (req) => {
      calls++;
      assert.equal(req.output_config.effort, 'low');
      const name = JSON.parse(req.messages[0].content.split('Name: ')[1]);
      return reply({ allowed: name !== 'Qahpik', category: name === 'Qahpik' ? 'insult' : 'ok', language: 'Kurdish' });
    },
  });
  assert.equal((await m.check('Qahpik', 'cat')).ok, false);
  assert.equal((await m.check('Pamuk', 'cat')).ok, true);
  assert.equal((await m.check('pamuk', 'cat')).ok, true);
  assert.equal(calls, 2, 'gleicher Name wird nicht doppelt geprüft');
});
