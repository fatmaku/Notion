// node --test test/matcher-22.test.js
// LiveFX 2.2 matcher: blocked occurrences are not consumed, global gap 0.5 s, prefix firing on interim
// results, Turkish normalisation (ı/İ/I, ş≡s ç≡c ğ≡g at medium), phonetic aliases (js/phonetic.js) and the
// 1000-trigger latency budget.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.LiveFXPhonetic = require('../js/phonetic.js'); // the browser gets it from <script>; Node via the global
require('../js/matcher.js');
const { Matcher, normalize, DEFAULT_GLOBAL_MIN_GAP } = globalThis.LiveFXMatcher;

const T = [
  { id: 'tw', keywords: ['trommelwirbel'], cooldown: 3 },
  { id: 'ya', keywords: ['yok artık'], cooldown: 3 },
  { id: 'nw', keywords: ['no way'], cooldown: 3 },
  { id: 'ina', keywords: ['inanılmaz'], cooldown: 3 },
  { id: 'k', keywords: ['krass'], cooldown: 3 },
  { id: 'lg', keywords: ["let's go"], cooldown: 3 },
];

test('2.2 cooldown / gap: a blocked occurrence is not consumed, DEFAULT_GLOBAL_MIN_GAP is 0.5', () => {
  assert.equal(DEFAULT_GLOBAL_MIN_GAP, 0.5);
  const m = new Matcher(T);
  assert.equal(m.globalMinGap, 0.5);
  assert.equal(m.process('krass', 0).length, 1);
  assert.equal(m.process('krass krass', 1).length, 0, 'second occurrence blocked by the cooldown');
  assert.equal(m.firedInUtterance.get('k'), 1, 'only the fired occurrence is consumed');
  assert.equal(m.process('krass krass', 3).length, 1, 'fires once the cooldown passed');
  assert.equal(m.process('krass krass', 3.1).length, 0, 'now consumed');
  // global gap: the second trigger of one interim waits for the gap, then fires on the next interim
  const g = new Matcher(T);
  const hits = g.process('krass no way', 10);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].keyword, 'no way', 'longest keyword first');
  assert.equal(g.process('krass no way', 10.3).length, 0, 'gap 0.5 s not over');
  assert.equal(g.process('krass no way', 10.5).map((h) => h.keyword).join(), 'krass');
  assert.equal(g.process('krass no way', 11).length, 0);
  assert.equal(g.fireById('tw', 10.9).blocked, 'gap');
  assert.equal(g.fireById('tw', 11).blocked, null);
});

test('2.2 prefix firing: a unique >= 4-char prefix of a single-word keyword (>= 6 chars) fires on interims', async (t) => {
  await t.test('off by default; explain() reports prefix:true only with prefixFire and non-final', () => {
    const off = new Matcher(T);
    assert.equal(off.prefixFire, false);
    assert.equal(off.explain('und dann tromm').length, 0);
    const m = new Matcher(T, { prefixFire: true });
    const e = m.explain('und dann tromm');
    assert.equal(e.length, 1);
    assert.deepEqual([e[0].keyword, e[0].prefix, e[0].spoken, e[0].start, e[0].end, e[0].fuzzy], ['trommelwirbel', true, 'tromm', 2, 3, false]);
    assert.equal(m.explain('und dann tromm', { final: true }).length, 0, 'finals never prefix-fire');
    assert.equal(m.explain('tromm und dann').length, 0, 'only the last spoken token');
  });

  await t.test('process(): fires once, the completed word does not fire again, stats.prefixFires counts', () => {
    const m = new Matcher(T, { prefixFire: true });
    const h = m.process('und dann tromm', 1);
    assert.equal(h.length, 1);
    assert.equal(h[0].prefix, true);
    assert.equal(h[0].keyword, 'trommelwirbel');
    assert.equal(h[0].spoken, 'tromm');
    assert.equal(h[0].fuzzy, false);
    assert.equal(m.stats.prefixFires, 1);
    assert.equal(m.process('und dann trommel', 1.2).length, 0, 'still growing');
    assert.equal(m.process('und dann trommelwirbel', 1.4).length, 0, 'completed: already fired');
    assert.equal(m.process('und dann trommelwirbel', 1.6, { final: true }).length, 0);
    assert.equal(m.firedInUtterance.get('tw'), 1);
    m.endUtterance();
    assert.equal(m.process('und dann trommelwirbel', 10, { final: true }).length, 1, 'next utterance fires normally');
  });

  await t.test('the prefix turned into another word: forgotten, the real keyword later in the utterance fires', () => {
    const m = new Matcher(T, { prefixFire: true });
    assert.equal(m.process('tromm', 1).length, 1);
    assert.equal(m.process('trompete', 1.2).length, 0);
    assert.equal(m.firedInUtterance.get('tw') || 0, 0, 'released');
    assert.equal(m.process('trompete und trommelwirbel', 4).length, 1, 'real occurrence fires (cooldown 3 s over)');
  });

  await t.test('gates: >= 4 spoken chars, keyword >= 6 chars, single word, unique prefix, no exact token / stop-word', () => {
    const m = new Matcher(T, { prefixFire: true });
    assert.equal(m.explain('tro').length, 0, '3 chars');
    assert.equal(new Matcher([{ id: 'x', keywords: ['krass'] }], { prefixFire: true }).explain('kras').length, 0, 'keyword < 6');
    assert.equal(new Matcher([{ id: 'x', keywords: ['trommel wirbel'] }], { prefixFire: true }).explain('tromm').length, 0, 'multi-word keyword');
    const amb = new Matcher([{ id: 'a', keywords: ['trommelwirbel'] }, { id: 'b', keywords: ['trommelfell'] }], { prefixFire: true });
    assert.equal(amb.explain('tromm').length, 0, 'ambiguous');
    assert.equal(amb.explain('trommelw')[0].trigger.id, 'a', 'unique once long enough');
    const same = new Matcher([{ id: 'a', keywords: ['trommelwirbel'] }, { id: 'b', keywords: ['tromm'] }], { prefixFire: true });
    assert.equal(same.explain('tromm').filter((h) => h.prefix).length, 0, 'an exact keyword token never doubles as a prefix');
    const w = globalThis.LiveFXMatcher.STOPWORDS.de[0]; // e.g. "immer" -> keyword "immerzu"
    const stop = new Matcher([{ id: 'a', keywords: [`${w}zu`] }], { prefixFire: true, lang: 'de' });
    assert.equal(stop.explain(w).length, 0, `stop-word "${w}" is not a prefix fire`);
    assert.equal(stop.explain(`${w}z`).length, 1);
    assert.equal(new Matcher([{ id: 'a', keywords: [`${w}zu`] }], { prefixFire: true, lang: 'tr' }).explain(w).length, 1, 'other stop list: fires');
  });

  await t.test('prefix fire respects cooldown and global gap and never fires an alias', () => {
    const m = new Matcher(T, { prefixFire: true, phonetic: 'tr-TR' });
    assert.equal(m.process('tromm', 1).length, 1);
    m.endUtterance();
    assert.equal(m.process('tromm', 2).length, 0, 'cooldown');
    assert.equal(m.process('tromm', 4).length, 1);
    assert.equal(m.stats.prefixFires, 2);
    m.endUtterance();
    assert.equal(m.explain('letsg').filter((h) => h.prefix).length, 0, 'alias "letsgo" is not a prefix source');
  });
});

test('2.2 Turkish normalisation: ı/İ/I handling and ı≡i ş≡s ç≡c ğ≡g at medium', () => {
  assert.equal(normalize('İnanılmaz'), 'inanılmaz', 'İ -> i (Turkish mapping, no stray combining dot)');
  assert.equal(normalize('YOK ARTIK'), 'yok artik', 'no Turkish signal: I -> i');
  assert.equal(normalize('Yok ARTIK ŞEY'), 'yok artık şey', 'Turkish signal (Ş): I -> ı');
  assert.equal(normalize('INANILMAZ'), 'inanilmaz');
  assert.equal(normalize('İSTANBUL'), 'istanbul');
  assert.equal(normalize('ışık'), 'ışık');
  const m = new Matcher(T, { tolerance: 'medium' });
  for (const s of ['yok artik', 'YOK ARTIK', 'Yok Artık', 'yok artık']) assert.equal(m.explain(s)[0].keyword, 'yok artık', s);
  for (const s of ['İnanılmaz', 'INANILMAZ', 'inanilmaz', 'ınanılmaz', 'inanılmaz']) assert.equal(m.explain(s)[0].keyword, 'inanılmaz', s);
  const off = new Matcher(T);
  assert.equal(off.explain('yok artik').length, 0, 'off: exact only');
  assert.equal(off.explain('İnanılmaz').length, 1, 'off: case folding still Turkish-aware');
  const tr = new Matcher([{ id: 'a', keywords: ['şahane'] }, { id: 'b', keywords: ['çabuk'] }, { id: 'c', keywords: ['doğru'] }, { id: 'd', keywords: ['güzel'] }], { tolerance: 'medium' });
  assert.equal(tr.explain('sahane')[0].trigger.id, 'a', 'ş ≡ s');
  assert.equal(tr.explain('cabuk')[0].trigger.id, 'b', 'ç ≡ c');
  assert.equal(tr.explain('dogru')[0].trigger.id, 'c', 'ğ ≡ g');
  assert.equal(tr.explain('guzel')[0].trigger.id, 'd', 'ü ≡ u');
  assert.equal(tr.explain('SAHANE')[0].trigger.id, 'a');
  assert.equal(tr.explain('ŞAHANE')[0].trigger.id, 'a');
});

test('2.2 phonetic aliases: setPhonetic(primaryLang) indexes respellings as aliases (alias:true, never keywords)', async (t) => {
  await t.test('constructor option + getter + setPhonetic rebuilds; null/auto/off disables', () => {
    const m = new Matcher(T, { tolerance: 'medium', phonetic: 'tr-TR' });
    assert.equal(m.phonetic, 'tr');
    assert.equal(m.explain('no vey')[0].alias, true);
    assert.equal(m.setPhonetic('de-DE'), 'de');
    assert.equal(m.explain('no vey').length, 0, 'tr aliases gone');
    assert.equal(m.explain('no wey')[0].alias, true, 'de aliases in');
    assert.equal(m.explain('yok artic')[0].alias, true);
    assert.equal(m.setPhonetic('auto'), null);
    assert.equal(m.phonetic, null);
    assert.equal(m.explain('jok artick').length, 0);
    assert.equal(m.explain('yok artic').filter((h) => h.alias).length, 0, 'only the plain fuzzy hit remains');
    assert.equal(m.setPhonetic('off'), null);
    assert.equal(new Matcher(T).phonetic, null, 'default off');
  });

  await t.test('process(): alias hits carry alias:true, fuzzy:true, spoken = heard text, stats.aliasHits', () => {
    const m = new Matcher(T, { tolerance: 'medium', phonetic: 'tr-TR' });
    const h = m.process('bu no vey ya', 1);
    assert.equal(h.length, 1);
    assert.deepEqual([h[0].keyword, h[0].alias, h[0].fuzzy, h[0].spoken], ['no way', true, true, 'no vey']);
    assert.equal(m.stats.aliasHits, 1);
    m.endUtterance();
    assert.equal(m.process('novey', 5)[0].spoken, 'novey', 'joined form');
    m.endUtterance();
    assert.equal(m.process('letsgo', 9)[0].keyword, "let's go");
    m.endUtterance();
    assert.equal(m.process('leds go', 13)[0].keyword, "let's go");
    m.endUtterance();
    assert.equal(m.process('kras', 17)[0].keyword, 'krass', 'de -> tr respelling');
    m.endUtterance();
    const exact = m.process('no way', 21);
    assert.equal(exact[0].alias, undefined, 'the real keyword is not an alias hit');
    assert.equal(exact[0].fuzzy, false);
  });

  await t.test('an alias never shadows a real keyword of another trigger, and alias + real at one position count once', () => {
    const m = new Matcher([{ id: 'a', keywords: ['no way'] }, { id: 'b', keywords: ['no vey'] }], { phonetic: 'tr-TR' });
    const h = m.explain('no vey');
    assert.equal(h.length, 1);
    assert.equal(h[0].trigger.id, 'b');
    assert.equal(h[0].alias, undefined);
    const k = new Matcher(T, { tolerance: 'medium', phonetic: 'tr-TR' });
    assert.equal(k.explain('kras').length, 1, 'alias "kras" and fuzzy "krass" at one position = one hit');
    assert.equal(k.process('kras', 1).length, 1);
    assert.equal(k.firedInUtterance.get('k'), 1);
    assert.equal(k.process('kras kras', 1.1).length, 0, 'second occurrence within cooldown: blocked, not consumed');
  });

  await t.test('aliases are exact-only: the fuzzy net does not widen around a respelling; keywords in the primary language get none', () => {
    const m = new Matcher(T, { tolerance: 'high', phonetic: 'tr-TR' });
    assert.equal(m.explain('no vey').length, 1);
    assert.equal(m.explain('no veyy').length, 0, 'no DL match on an alias token');
    assert.equal(m._index.kws.filter((k) => k.alias && k.keyword === 'yok artık').length, 0, 'Turkish keyword, Turkish recognizer: no aliases');
    assert.ok(m._index.kws.filter((k) => k.alias && k.keyword === 'no way').length >= 2);
    // the index lists aliases per trigger but the trigger object itself is untouched
    assert.deepEqual(T[2].keywords, ['no way']);
  });

  await t.test('without js/phonetic.js the matcher works and simply has no aliases', () => {
    const saved = globalThis.LiveFXPhonetic;
    globalThis.LiveFXPhonetic = { expand: () => { throw new Error('boom'); } };
    try {
      const m = new Matcher(T, { phonetic: 'tr-TR' });
      assert.equal(m.explain('no vey').length, 0);
      assert.equal(m.explain('no way').length, 1);
    } finally {
      globalThis.LiveFXPhonetic = saved;
    }
  });
});

test('2.2 performance: 1000 triggers x 8 keywords, 20-word utterance, medium (+ phonetic aliases) – median < 3 ms', () => {
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const r = rng(42);
  const letters = 'abcdefghijklmnoprstuvyzçğışöü';
  const word = () => {
    const n = 5 + Math.floor(r() * 8);
    let s = '';
    for (let i = 0; i < n; i++) s += letters[Math.floor(r() * letters.length)];
    return s;
  };
  const triggers = [];
  for (let i = 0; i < 1000; i++) {
    const keywords = [];
    for (let k = 0; k < 8; k++) keywords.push(r() < 0.25 ? `${word()} ${word()}` : word());
    triggers.push({ id: `perf-${i}`, keywords, cooldown: 0 });
  }
  const kwTokens = triggers.flatMap((t) => t.keywords.flatMap((k) => k.split(' ')));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const utterances = [];
  for (let u = 0; u < 50; u++) {
    const words = [];
    for (let i = 0; i < 20; i++) {
      const src = r() < 0.5 ? pick(kwTokens) : word();
      words.push(r() < 0.5 ? src.slice(0, 2) + letters[Math.floor(r() * 26)] + src.slice(3) : src);
    }
    utterances.push(words.join(' '));
  }
  for (const phonetic of [null, 'tr-TR']) {
    const t0 = process.hrtime.bigint();
    const m = new Matcher(triggers, { tolerance: 'medium', lang: 'tr', globalMinGap: 0, prefixFire: true, phonetic });
    const build = Number(process.hrtime.bigint() - t0) / 1e6;
    for (let i = 0; i < 50; i++) {
      m.process(utterances[i % 50], i);
      m.endUtterance();
    }
    const times = [];
    for (let i = 0; i < 300; i++) {
      const text = utterances[i % 50];
      const t1 = process.hrtime.bigint();
      m.process(text, 1000 + i);
      times.push(Number(process.hrtime.bigint() - t1) / 1e6);
      m.endUtterance();
    }
    times.sort((a, b) => a - b);
    const median = times[150];
    const max = times[299];
    console.log(`matcher perf 2.2 (medium, 1000x8 keywords, 20 words${phonetic ? ', phonetic tr' : ''}): build ${build.toFixed(0)} ms, median ${median.toFixed(3)} ms, p90 ${times[270].toFixed(3)} ms, max ${max.toFixed(3)} ms`);
    assert.ok(median < 3, `median ${median} ms < 3 ms`);
    assert.ok(max < 30, `max ${max} ms < 30 ms`);
    assert.ok(build < 2000, `index build ${build} ms`);
  }
});
