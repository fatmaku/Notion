// Unit tests for js/packs.js (language / culture meme packs). Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/sounds.js');
require('../js/triggers.js');
require('../js/schema.js');
require('../js/matcher.js');
require('../js/packs.js');

const S = globalThis.LiveFXSchema;
const P = globalThis.LiveFXPacks;
const defaults = globalThis.LiveFXDefaultTriggers;
const soundNames = globalThis.LiveFXSounds.names;
const MIN = { tr: 35, de: 25, en: 25 };

const lower = (k) => String(k).toLowerCase();

test('packs: list() describes tr / de / en with counts', () => {
  const list = P.list();
  assert.deepEqual(list.map((p) => p.id).sort(), ['de', 'en', 'tr']);
  for (const p of list) {
    assert.equal(typeof p.label, 'string');
    assert.equal(typeof p.flag, 'string');
    assert.equal(typeof p.description, 'string');
    assert.equal(p.count, P.packs[p.id].triggers.length);
    assert.ok(p.count >= MIN[p.id], `${p.id} has ${p.count} triggers (min ${MIN[p.id]})`);
  }
});

test('packs: get() returns deep copies and [] for unknown ids', () => {
  const a = P.get('tr');
  const b = P.get('tr');
  assert.notEqual(a, b);
  assert.notEqual(a[0], b[0]);
  assert.deepEqual(a, b);
  a[0].keywords.push('mutated');
  assert.ok(!P.get('tr')[0].keywords.includes('mutated'), 'source pack untouched');
  assert.deepEqual(P.get('nope'), []);
  assert.deepEqual(P.get('toString'), []);
});

test('packs: every trigger normalizes without warnings and keeps its id', () => {
  for (const p of P.list()) {
    for (const t of P.get(p.id)) {
      const n = S.normalizeTrigger(t);
      assert.ok(n, `${t.id} is an object`);
      assert.deepEqual(n.warnings, [], `${t.id}: ${n.warnings.join('; ')}`);
      assert.equal(n.trigger.id, t.id);
      assert.ok(t.id.startsWith(`${p.id}-`), `${t.id} is prefixed with ${p.id}-`);
      assert.equal(typeof t.hint, 'string');
      assert.ok(t.hint.length > 0 && t.hint.length <= S.LIMITS.hint, `${t.id} has a hint`);
      assert.ok(t.keywords.length >= 3 && t.keywords.length <= 8, `${t.id} has 3..8 keywords (${t.keywords.length})`);
      assert.ok(t.cooldown >= 1 && t.cooldown <= 60, `${t.id} cooldown sensible`);
      assert.ok(['card', 'banner', 'rain', 'confetti'].includes(t.visual.kind), `${t.id} visual kind`);
      assert.ok(t.visual.emoji, `${t.id} has an emoji`);
      if (t.visual.kind !== 'rain') assert.ok(t.visual.text, `${t.id} has a text`);
    }
  }
});

test('packs: ids unique across all packs and the defaults', () => {
  const seen = new Set(defaults.map((t) => t.id));
  for (const p of P.list()) {
    for (const t of P.get(p.id)) {
      assert.ok(!seen.has(t.id), `duplicate id ${t.id}`);
      seen.add(t.id);
    }
  }
});

test('packs: keywords non-empty, unique within a pack, and not copies of default keywords', () => {
  const defKw = new Set(defaults.flatMap((t) => t.keywords.map(lower)));
  for (const p of P.list()) {
    const seen = new Map();
    for (const t of P.get(p.id)) {
      for (const k of t.keywords) {
        assert.equal(typeof k, 'string');
        assert.ok(k.trim().length > 0, `${t.id}: empty keyword`);
        assert.equal(k, k.trim(), `${t.id}: keyword "${k}" not trimmed`);
        const l = lower(k);
        assert.ok(!seen.has(l), `${p.id}: keyword "${k}" in ${t.id} already used by ${seen.get(l)}`);
        seen.set(l, t.id);
        assert.ok(!defKw.has(l), `${t.id}: keyword "${k}" duplicates a default keyword`);
      }
    }
  }
});

test('packs: sounds are builtin names or null', () => {
  for (const p of P.list()) {
    for (const t of P.get(p.id)) {
      if (t.sound === null) continue;
      assert.ok(soundNames.includes(t.sound), `${t.id}: unknown sound "${t.sound}"`);
    }
  }
  assert.ok(P.get('tr').some((t) => t.sound), 'tr uses sounds');
});

test('packs: Turkish pack contains the signature phrases', () => {
  const kws = new Set(P.get('tr').flatMap((t) => t.keywords.map(lower)));
  for (const must of ['yok artık', 'helal olsun', 'aynen', 'kral', 'ohaa']) assert.ok(kws.has(must), `tr keyword "${must}"`);
});

test('packs: matcher fires Turkish pack triggers, longest keyword first', () => {
  const m = new globalThis.LiveFXMatcher.Matcher(defaults.concat(P.get('tr')));
  let hits = m.process('yok artık bu ne ya', 0);
  assert.ok(hits.length >= 1);
  assert.ok(hits[0].trigger.id.startsWith('tr-'), `tr trigger fired: ${hits[0].trigger.id}`);
  assert.equal(hits[0].keyword, 'yok artık');
  m.endUtterance();

  hits = m.process('helal olsun kral', 100);
  assert.equal(hits.length, 1, 'global gap lets only the first one through');
  assert.equal(hits[0].trigger.id, 'tr-helal');
  assert.equal(hits[0].keyword, 'helal olsun');
  m.endUtterance();

  hits = m.process('kral adam bu', 200);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-kral');
});

test('packs: defaults + all packs fit into the trigger limit', () => {
  const all = defaults.concat(P.get('tr'), P.get('de'), P.get('en'));
  assert.ok(all.length <= S.LIMITS.triggers, `${all.length} <= ${S.LIMITS.triggers}`);
  const n = S.normalizeTriggers(all);
  assert.deepEqual(n.warnings, []);
  assert.equal(n.triggers.length, all.length);
});
