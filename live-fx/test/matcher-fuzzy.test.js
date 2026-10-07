// Fuzzy matching (LiveFX 1.2, docs/DESIGN-RECOGNITION.md section A). Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/triggers.js');
require('../js/packs.js');
require('../js/matcher.js');

const { Matcher, normalize, fold, damerau, TOLERANCES, STOPWORDS } = globalThis.LiveFXMatcher;
const defaults = globalThis.LiveFXDefaultTriggers;
const P = globalThis.LiveFXPacks;
const everything = () => defaults.concat(P.get('tr'), P.get('de'), P.get('en'));

// Deterministic PRNG so failures are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---- reference implementation: the pre-1.2 matcher (substring counting on the padded string) ----
// 2.2 semantics folded in: a blocked occurrence is not consumed (only fired ones are), and on equal
// keyword length the most recently loaded trigger (array order) goes first.
function oldCountOccurrences(haystack, keyword) {
  const padded = ` ${haystack} `;
  const needle = ` ${keyword} `;
  let count = 0;
  let idx = padded.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = padded.indexOf(needle, idx + 1);
  }
  return count;
}
class OldMatcher {
  constructor(triggers, opts = {}) {
    this.all = (triggers || []).map((t, i) => ({ ...t, _key: t.id || `idx-${i}`, _keywords: (t.keywords || []).map(normalize).filter(Boolean) }));
    this.triggers = this.all.filter((t) => t.enabled !== false);
    this.globalMinGap = opts.globalMinGap ?? 1.2;
    this.lastFireAt = new Map();
    this.lastGlobalFire = -Infinity;
    this.firedInUtterance = new Map();
  }
  endUtterance() { this.firedInUtterance.clear(); }
  process(transcript, now) {
    const text = normalize(transcript);
    const fired = [];
    if (!text) return fired;
    const candidates = [];
    this.triggers.forEach((trig, ti) => {
      let occurrences = 0;
      let matchedKeyword = null;
      for (const kw of trig._keywords) {
        const c = oldCountOccurrences(text, kw);
        if (c > 0) {
          occurrences += c;
          if (!matchedKeyword || kw.length > matchedKeyword.length) matchedKeyword = kw;
        }
      }
      const already = this.firedInUtterance.get(trig._key) || 0;
      if (occurrences <= already) return;
      candidates.push({ trig, ti, matchedKeyword, occurrences });
    });
    candidates.sort((a, b) => b.matchedKeyword.length - a.matchedKeyword.length || b.ti - a.ti);
    for (const { trig, matchedKeyword, occurrences } of candidates) {
      const last = this.lastFireAt.get(trig._key) ?? -Infinity;
      if (now - last < (trig.cooldown ?? 3)) continue;
      if (now - this.lastGlobalFire < this.globalMinGap) continue;
      this.lastFireAt.set(trig._key, now);
      this.lastGlobalFire = now;
      this.firedInUtterance.set(trig._key, occurrences);
      fired.push({ trigger: trig, keyword: matchedKeyword });
    }
    return fired;
  }
}

const hitIds = (hits) => hits.map((h) => h.trigger.id);

// ---- exports ----

test('fuzzy: exported API', () => {
  assert.deepEqual([...TOLERANCES], ['off', 'medium', 'high']);
  assert.deepEqual(Object.keys(STOPWORDS).sort(), ['de', 'en', 'tr']);
  assert.equal(typeof fold, 'function');
  assert.equal(typeof damerau, 'function');
  const m = new Matcher(defaults);
  assert.equal(m.tolerance, 'off', 'default tolerance is off');
  assert.equal(m.setTolerance('medium'), 'medium');
  assert.equal(m.tolerance, 'medium');
  assert.equal(m.setTolerance('bogus'), 'off', 'invalid level -> off');
  assert.equal(new Matcher(defaults, { tolerance: 'nope' }).tolerance, 'off');
  assert.equal(new Matcher(defaults, { tolerance: 'high', lang: 'de-AT' }).lang, 'de');
  assert.equal(m.setLang('tr-TR'), 'tr');
  assert.equal(m.setLang('auto'), null);
  assert.equal(m.setLang('xx'), null);
  assert.equal(typeof m.explain, 'function');
});

test('fuzzy: fold tables', () => {
  assert.equal(fold('krass', 'off'), 'krass');
  assert.equal(fold('maşallah', 'medium'), 'masallah');
  assert.equal(fold('yok artık', 'medium'), 'yok artik');
  assert.equal(fold('schön', 'medium'), 'schon');
  assert.equal(fold('straße', 'medium'), 'strasse');
  assert.equal(fold("let's", 'medium'), 'lets');
  assert.equal(fold('inşallah', 'medium'), 'insallah');
  assert.equal(fold('ohaaa', 'high'), 'oha', 'doubled letters collapse');
  assert.equal(fold('krass', 'high'), 'kras');
  assert.equal(fold('physik', 'high'), 'fisik');
  assert.equal(fold('zucker', 'high'), 'zuker');
  assert.equal(fold('laeuft', 'high', 'de'), 'lauft');
  assert.equal(fold('läuft', 'high', 'de'), 'lauft');
  assert.equal(fold('wahnsinn', 'high', 'de'), 'vahnsin');
  assert.equal(fold('taxi', 'high', 'tr'), 'taksi');
  assert.equal(fold('wow', 'high', 'tr'), 'vov');
  assert.equal(fold('wow', 'high', 'en'), 'wow', 'en has no language table');
  assert.equal(fold('wow', 'high'), 'wow', 'no language -> common table only');
});

test('fuzzy: damerau distance with cut-off', () => {
  assert.equal(damerau('krass', 'krass'), 0);
  assert.equal(damerau('grass', 'krass'), 1);
  assert.equal(damerau('olsn', 'olsun'), 1);
  assert.equal(damerau('kral', 'karl', 2), 1, 'transposition counts once');
  assert.equal(damerau('abc', 'xyz', 1), 2, 'cut-off returns max + 1');
  assert.equal(damerau('abcdefgh', 'a', 2), 3);
  assert.equal(damerau('', 'abc'), 3);
  assert.equal(damerau('kitten', 'sitting'), 3);
});

test('fuzzy: stop-words are >= 5 chars, plentiful and never a keyword token of defaults or packs', () => {
  const tokens = new Set(everything().flatMap((t) => t.keywords.flatMap((k) => normalize(k).split(' '))));
  for (const lang of ['de', 'tr', 'en']) {
    const list = STOPWORDS[lang];
    assert.ok(list.length >= 35, `${lang}: ${list.length} stop-words`);
    assert.equal(new Set(list).size, list.length, `${lang}: duplicates`);
    for (const w of list) {
      assert.ok(w.length >= 5, `${lang}: "${w}" shorter than 5`);
      assert.equal(w, normalize(w), `${lang}: "${w}" not normalized`);
      assert.ok(!tokens.has(w), `${lang}: stop-word "${w}" is a keyword token`);
    }
  }
});

// ---- off: byte-identical to the old matcher ----

test('off: every default and pack keyword fires its own trigger', () => {
  const all = everything();
  for (const trig of all) {
    for (const kw of trig.keywords) {
      const m = new Matcher(all, { globalMinGap: 0 });
      const hits = m.process(`ich sag mal ${kw} okay`, 0);
      const mine = hits.find((h) => h.trigger.id === trig.id);
      assert.ok(mine, `"${kw}" fires ${trig.id} (got ${hitIds(hits).join(',') || 'nothing'})`);
      assert.equal(mine.fuzzy, false);
      assert.equal(mine.spoken, mine.keyword);
    }
  }
});

test('off: random utterances match the old substring counter 1:1 (incl. cooldown sequence)', () => {
  const all = everything();
  const r = rng(1234);
  const vocab = all.flatMap((t) => t.keywords.flatMap((k) => normalize(k).split(' ')))
    .concat(['ich', 'das', 'ist', 'ja', 'und', 'ein', 'die', 'der', 'bu', 'ne', 'ya', 'the', 'a', 'grass', 'olsn', 'wahnsin', 'kra']);
  const punct = ['', '', '', ',', '!', '?', '...', ' -'];
  const utter = () => {
    const n = 1 + Math.floor(r() * 12);
    const words = [];
    for (let i = 0; i < n; i++) words.push(pick(r, vocab) + pick(r, punct));
    return words.join(' ');
  };
  for (let round = 0; round < 20; round++) {
    const gap = pick(r, [0, 0.5, 1.2]);
    const a = new OldMatcher(all, { globalMinGap: gap });
    const b = new Matcher(all, { globalMinGap: gap });
    let now = 0;
    for (let step = 0; step < 60; step++) {
      now += r() * 4;
      let text = utter();
      // Simulate interim growth: the same utterance is fed twice with a suffix.
      const grown = `${text} ${pick(r, vocab)}`;
      for (const t of [text, grown]) {
        const ha = a.process(t, now);
        const hb = b.process(t, now);
        assert.deepEqual(hb.map((h) => [h.trigger.id, h.keyword, h.fuzzy, h.spoken]),
          ha.map((h) => [h.trigger.id, h.keyword, false, h.keyword]), `utterance "${t}" at ${now}`);
        now += 0.3;
      }
      if (r() < 0.7) { a.endUtterance(); b.endUtterance(); }
      assert.deepEqual([...b.firedInUtterance], [...a.firedInUtterance]);
    }
  }
});

test('off: overlapping occurrences count like the old matcher ("aynen aynen aynen" -> 2 + 3)', () => {
  const all = defaults.concat(P.get('tr'));
  const m = new Matcher(all, { globalMinGap: 0 });
  m.process('aynen aynen aynen', 0);
  assert.equal(m.firedInUtterance.get('tr-aynen'), 5, '3x "aynen" + 2x "aynen aynen"');
  assert.equal(m.explain('aynen aynen aynen').length, 5);
});

// ---- medium / high ----

test('"das war grass" -> wow at medium and high, not at off', () => {
  for (const level of ['medium', 'high']) {
    const m = new Matcher(defaults, { tolerance: level });
    const hits = m.process('das war grass', 0);
    assert.equal(hits.length, 1, `${level}: one hit`);
    assert.equal(hits[0].trigger.id, 'wow');
    assert.equal(hits[0].fuzzy, true);
    assert.equal(hits[0].spoken, 'grass');
    assert.equal(hits[0].keyword, 'krass');
  }
  assert.equal(new Matcher(defaults).process('das war grass', 0).length, 0, 'off: no hit');
  const m = new Matcher(defaults, { tolerance: 'high' });
  m.setTolerance('off');
  assert.equal(m.process('das war grass', 0).length, 0, 'setTolerance(off) takes effect without rebuild');
});

test('custom "yok artık": "yok artik" hits at medium (fold), not at off', () => {
  const trig = [{ id: 'ya', keywords: ['yok artık'] }];
  assert.equal(new Matcher(trig).process('yok artik', 0).length, 0);
  const hits = new Matcher(trig, { tolerance: 'medium' }).process('yok artik bu ne', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].keyword, 'yok artık');
  assert.equal(hits[0].spoken, 'yok artik');
  assert.equal(hits[0].fuzzy, true);
});

test('"kral" (<= 4 chars) is exact only even at high', () => {
  const all = defaults.concat(P.get('tr'));
  for (const spoken of ['kra', 'karl', 'krall']) {
    const m = new Matcher(all, { tolerance: 'high', lang: 'tr' });
    assert.ok(!m.explain(spoken).some((h) => h.trigger.id === 'tr-kral'), `"${spoken}" never hits tr-kral`);
    const hits = new Matcher(P.get('tr'), { tolerance: 'high', lang: 'tr' }).process(spoken, 0);
    assert.equal(hits.length, 0, `"${spoken}" hits nothing in the tr pack (got ${hitIds(hits)})`);
  }
  // "krall" does fold onto the default "krass" (kral/kras, DL 1 on 5-char tokens) – that is by the rules.
  assert.deepEqual(hitIds(new Matcher(all, { tolerance: 'high' }).process('krall', 0)), ['wow']);
  const hits = new Matcher(all, { tolerance: 'high', lang: 'tr' }).process('kral', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-kral');
  assert.equal(hits[0].fuzzy, false);
});

test('"helal olsn" -> "helal olsun" at medium token-wise; at off only the bare "helal" keyword', () => {
  const all = defaults.concat(P.get('tr'));
  let hits = new Matcher(all, { tolerance: 'medium' }).process('helal olsn', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-helal');
  assert.equal(hits[0].keyword, 'helal olsun', 'longest keyword wins');
  assert.equal(hits[0].spoken, 'helal olsn');
  assert.equal(hits[0].fuzzy, true);

  hits = new Matcher(all).process('helal olsn', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-helal');
  assert.equal(hits[0].keyword, 'helal');
  assert.equal(hits[0].fuzzy, false);
  assert.equal(hits[0].spoken, 'helal');
});

test('guards: exact keyword token of another trigger and stop-words are never fuzzy-matched', () => {
  // (2a) "schon" is an exact keyword token -> "schön" (fold-equal / DL 1) must stay silent.
  const two = [{ id: 'schon', keywords: ['schon'] }, { id: 'schoen', keywords: ['schön'] }];
  for (const level of ['medium', 'high']) {
    const m = new Matcher(two, { tolerance: level, lang: 'de', globalMinGap: 0 });
    const hits = m.process('das hab ich schon', 0);
    assert.deepEqual(hitIds(hits), ['schon'], `${level}: only the exact trigger fires`);
    assert.equal(hits[0].fuzzy, false);
    assert.deepEqual(m.explain('das hab ich schon').map((h) => h.trigger.id), ['schon']);
    // the reverse direction is fine: "schön" spoken is not a keyword of "schon"
    assert.deepEqual(m.explain('wie schön').map((h) => h.trigger.id), ['schoen']);
  }
  // (2b) stop-word: "immer" (de) vs custom keyword "immel" (DL 1).
  const one = [{ id: 'x', keywords: ['immel'] }];
  assert.equal(new Matcher(one, { tolerance: 'high', lang: 'de' }).explain('das ist immer so').length, 0, 'de stop-word blocks');
  assert.equal(new Matcher(one, { tolerance: 'high' }).explain('das ist immer so').length, 0, 'no lang -> all stop-word lists');
  assert.equal(new Matcher(one, { tolerance: 'high', lang: 'auto' }).explain('das ist immer so').length, 0);
  const en = new Matcher(one, { tolerance: 'high', lang: 'en' });
  assert.equal(en.explain('das ist immer so').length, 1, 'en list does not contain "immer"');
  en.setLang('de-CH');
  assert.equal(en.explain('das ist immer so').length, 0, 'setLang switches the list');
  assert.equal(en.explain('das ist immel so').length, 1, 'exact still matches');
  // (1) length guard: "krassest" (8) vs "krass" (5) at high folds to "krasest" / "kras": DL 3 anyway,
  //     but "grasss" (6) -> "gras" equals "kras"? no: DL 1 and |6-5| = 1 -> allowed; "grassss" (7) -> blocked.
  const m = new Matcher(defaults, { tolerance: 'high' });
  assert.equal(m.explain('grasss').length, 1);
  assert.equal(m.explain('grassss').length, 0, '|len diff| 2 > allowed 1');
});

test('counting with fuzzy hits: interim growth, second occurrence, longest wins, exact beats fuzzy on ties', () => {
  const all = defaults.concat(P.get('tr'));
  const m = new Matcher(all, { tolerance: 'medium' });
  assert.deepEqual(hitIds(m.process('das war grass', 0)), ['wow']);
  assert.equal(m.process('das war grass und', 1).length, 0, 'interim growth must not re-fire');
  assert.equal(m.process('das war grass und wirklich', 2).length, 0);
  const hits = m.process('das war grass und wirklich krass', 10);
  assert.equal(hits.length, 1, 'second occurrence fires after cooldown');
  assert.equal(hits[0].fuzzy, false, 'exact occurrence preferred for spoken');
  assert.equal(hits[0].spoken, 'krass');
  m.endUtterance();

  // longest keyword wins even when only the long one is fuzzy
  let h = m.process('helal olsn', 100);
  assert.equal(h[0].keyword, 'helal olsun');
  assert.equal(h[0].fuzzy, true);
  m.endUtterance();

  // tie on keyword length: exact beats fuzzy ("wahns" exact vs "krass" via "grass")
  const tie = new Matcher([{ id: 't', keywords: ['krass', 'wahns'] }], { tolerance: 'medium' });
  h = tie.process('grass wahns', 0);
  assert.equal(h.length, 1);
  assert.equal(h[0].keyword, 'wahns');
  assert.equal(h[0].fuzzy, false);
  assert.equal(tie.firedInUtterance.get('t'), 2, 'both occurrences counted');
  h = tie.process('grass wahns grass', 20);
  assert.equal(h.length, 1, 'third occurrence fires');
  assert.equal(h[0].keyword, 'wahns', 'longest / exact preference is per utterance, not per new occurrence');
});

test('explain(): pure scan with start/end, no side effects', () => {
  const all = defaults.concat(P.get('tr'));
  const m = new Matcher(all, { tolerance: 'medium' });
  const before = [...m.lastFireAt];
  const res = m.explain('Das war grass, helal olsn!');
  assert.deepEqual([...m.lastFireAt], before);
  assert.equal(m.firedInUtterance.size, 0);
  assert.equal(m.lastGlobalFire, -Infinity);
  const wow = res.find((h) => h.trigger.id === 'wow');
  assert.deepEqual({ ...wow, trigger: wow.trigger.id }, { trigger: 'wow', keyword: 'krass', fuzzy: true, spoken: 'grass', start: 2, end: 3 });
  const helal = res.filter((h) => h.trigger.id === 'tr-helal').map((h) => [h.keyword, h.spoken, h.fuzzy, h.start, h.end]);
  assert.deepEqual(helal, [['helal olsun', 'helal olsn', true, 3, 5], ['helal', 'helal', false, 3, 4]]);
  assert.equal(res[0].start, 2, 'sorted by start');
  assert.equal(m.process('das war grass', 0).length, 1, 'explain did not consume anything');
  assert.equal(new Matcher(all).explain('').length, 0);
  assert.equal(new Matcher(all).explain('   !!! ').length, 0);
});

test('disabled triggers stay out of the fuzzy index; setTriggers rebuilds it', () => {
  const m = new Matcher(defaults.map((x) => (x.id === 'wow' ? { ...x, enabled: false } : x)), { tolerance: 'high' });
  assert.equal(m.process('das war grass', 0).length, 0);
  m.setTriggers(defaults);
  assert.equal(m.process('das war grass', 10).length, 1);
  m.setTriggers([]);
  assert.equal(m.process('das war grass', 20).length, 0);
  m.setTriggers(null);
  assert.equal(m.process('krass', 30).length, 0);
});

test('fireById / cooldown semantics unchanged with fuzzy on', () => {
  const m = new Matcher(defaults, { tolerance: 'high' });
  assert.equal(m.fireById('wow', 0).blocked, null);
  assert.equal(m.process('das war grass', 1).length, 0, 'cooldown shared with fireById');
  assert.equal(m.firedInUtterance.get('wow'), undefined, '2.2: a blocked occurrence is not consumed');
  assert.equal(m.process('das war grass', 4.9).length, 0, 'still in cooldown');
  assert.equal(m.process('das war grass', 5).length, 1, 'fires once the cooldown passed (same utterance)');
  assert.equal(m.process('das war grass', 5.1).length, 0, 'consumed now');
  m.endUtterance();
  assert.equal(m.process('das war grass', 10).length, 1);
  assert.equal(m.fireById('wow', 11).blocked, 'cooldown');
  const t = m.fireById('wow', 100).trigger;
  assert.doesNotThrow(() => JSON.stringify(t), 'trigger objects stay serializable');
});

test('Turkish: "masallah" -> "maşallah" at medium; doubled letters collapse at high', () => {
  const masallah = [{ id: 'm', keywords: ['maşallah'] }];
  assert.equal(new Matcher(masallah).process('masallah', 0).length, 0, 'off');
  let hits = new Matcher(masallah, { tolerance: 'medium', lang: 'tr' }).process('masallah ya', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].spoken, 'masallah');
  assert.equal(hits[0].fuzzy, true);

  // pack: "ohaaa" is a keyword; the stretched "ohaaaaa" only folds onto it at high
  const all = defaults.concat(P.get('tr'));
  assert.equal(new Matcher(all, { tolerance: 'medium', lang: 'tr' }).explain('ohaaaaa').length, 0, 'medium: DL 2 > 1');
  hits = new Matcher(all, { tolerance: 'high', lang: 'tr' }).process('ohaaaaa', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-oha');
  assert.equal(hits[0].keyword, 'ohaaa');
  assert.equal(hits[0].spoken, 'ohaaaaa');
  // custom trigger with only "ohaaa": "ohaa" (4 chars) still folds onto it at high
  const oha = [{ id: 'o', keywords: ['ohaaa'] }];
  assert.equal(new Matcher(oha, { tolerance: 'high', lang: 'tr' }).explain('ohaa')[0].keyword, 'ohaaa');
  assert.equal(new Matcher(oha).explain('ohaa').length, 0);
});

test('performance: 200 triggers x 8 keywords, 20-word utterance, high', () => {
  const r = rng(42);
  const letters = 'abcdefghijklmnoprstuvyzçğışöü';
  const word = () => {
    const n = 5 + Math.floor(r() * 8);
    let s = '';
    for (let i = 0; i < n; i++) s += letters[Math.floor(r() * letters.length)];
    return s;
  };
  const triggers = [];
  for (let i = 0; i < 200; i++) {
    const keywords = [];
    for (let k = 0; k < 8; k++) keywords.push(r() < 0.25 ? `${word()} ${word()}` : word());
    triggers.push({ id: `perf-${i}`, keywords, cooldown: 0 });
  }
  const m = new Matcher(triggers, { tolerance: 'high', lang: 'tr', globalMinGap: 0 });
  const kwTokens = triggers.flatMap((t) => t.keywords.flatMap((k) => k.split(' ')));
  const utterances = [];
  for (let u = 0; u < 50; u++) {
    const words = [];
    for (let i = 0; i < 20; i++) {
      const src = r() < 0.5 ? pick(r, kwTokens) : word();
      // mutate half of them by one character
      words.push(r() < 0.5 ? src.slice(0, 2) + letters[Math.floor(r() * 26)] + src.slice(3) : src);
    }
    utterances.push(words.join(' '));
  }
  for (let i = 0; i < 50; i++) { m.process(utterances[i % utterances.length], i); m.endUtterance(); }
  const times = [];
  for (let i = 0; i < 300; i++) {
    const text = utterances[i % utterances.length];
    const t0 = process.hrtime.bigint();
    m.process(text, 1000 + i);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    m.endUtterance();
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const max = times[times.length - 1];
  console.log(`matcher perf (high, 200x8 keywords, 20 words): median ${median.toFixed(3)} ms, p90 ${times[Math.floor(times.length * 0.9)].toFixed(3)} ms, max ${max.toFixed(3)} ms`);
  assert.ok(median < 1, `median ${median} ms < 1 ms`);
  assert.ok(max < 10, `max ${max} ms < 10 ms`);
});

test('candidate filters are complete: index results equal a brute-force scan (medium DL 1, high DL 2)', () => {
  const r = rng(7);
  const letters = 'abcdefghijklmnoprstuvyzçğışöüß';
  const word = (min, max) => {
    const n = min + Math.floor(r() * (max - min + 1));
    let s = '';
    for (let i = 0; i < n; i++) s += letters[Math.floor(r() * letters.length)];
    return s;
  };
  const mutate = (w, edits) => {
    let s = w;
    for (let e = 0; e < edits; e++) {
      const i = Math.floor(r() * s.length);
      const op = Math.floor(r() * 4);
      if (op === 0) s = s.slice(0, i) + letters[Math.floor(r() * letters.length)] + s.slice(i + 1);
      else if (op === 1) s = s.slice(0, i) + letters[Math.floor(r() * letters.length)] + s.slice(i);
      else if (op === 2 && s.length > 1) s = s.slice(0, i) + s.slice(i + 1);
      else if (i + 1 < s.length) s = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    }
    return s;
  };
  const triggers = [];
  for (let i = 0; i < 300; i++) {
    triggers.push({ id: `t${i}`, keywords: [word(5, 8), word(9, 12), `${word(5, 12)} ${word(5, 12)}`, 'aaaaaaaaaa', 'ohaaaaaaaaa'] });
  }
  for (const level of ['medium', 'high']) {
    const m = new Matcher(triggers, { tolerance: level, lang: 'de', globalMinGap: 0 });
    const brute = (spoken) => {
      const out = new Set();
      for (const t of triggers) {
        for (const kw of t.keywords) {
          for (const tok of normalize(kw).split(' ')) {
            if (tok === spoken) { out.add(`${t.id}|${kw}`); continue; }
            if (tok.length < 5 || m._index.exactTokens.has(spoken) || m._stop.has(spoken)) continue;
            const f = fold(spoken, level, 'de');
            const g = fold(tok, level, 'de');
            const max = tok.length < 9 ? 1 : level === 'high' ? 2 : 1;
            if (f === g || (Math.abs(spoken.length - tok.length) <= max && damerau(f, g) <= max)) out.add(`${t.id}|${kw}`);
          }
        }
      }
      return out;
    };
    for (let n = 0; n < 400; n++) {
      const kw = pick(r, pick(r, triggers).keywords).split(' ')[0];
      const spoken = normalize(r() < 0.8 ? mutate(kw, Math.floor(r() * 3)) : word(5, 12));
      if (!spoken || spoken.includes(' ')) continue;
      const got = new Set();
      for (const [ref] of m._candidates(spoken)) got.add(`${ref.kw.trig.id}|${ref.kw.keyword}`);
      assert.deepEqual([...got].sort(), [...brute(spoken)].sort(), `${level}: candidates for "${spoken}"`);
    }
  }
});
