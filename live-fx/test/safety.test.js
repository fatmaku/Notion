// Unit tests for js/safety.js (GIF search safety filter): categories, TR/DE normalisation, leetspeak,
// whole-word / phrase matching and false-positive guards.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Safety = require('../js/safety.js');

// Slur samples are ROT13-encoded here too, so the test file contains no plain slurs.
const rot13 = (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26) + (c <= 'Z' ? 65 : 97)));

const BLOCKED = [
  // [text, category]
  ['Kirche', 'religion'],
  ['cami', 'religion'],
  ['church', 'religion'],
  ['election', 'politics'],
  ['gun', 'violence'],
  [rot13('avttre'), 'hate'],
  [rot13('Fpujhpugry'), 'hate'],
  [rot13('voar'), 'hate'],
  ['Kirchen', 'religion'],
  ['camide namaz', 'religion'],
  ["Kuran'ı", 'religion'],
  ['Moschee', 'religion'],
  ['allahu akbar', 'religion'],
  ['Cumhurbaşkanı', 'politics'],
  ['cumhurbaskani', 'politics'],
  ['Präsident', 'politics'],
  ['praesident', 'politics'],
  ['Bundeskanzler', 'politics'],
  ['seçim', 'politics'],
  ['Bundestagswahl 2025', 'politics'],
  ['AfD', 'politics'],
  ['black lives matter', 'politics'],
  ['heil hitler', 'hate'],
  ['n a z i', 'hate'],
  ['N4Z1', 'hate'],
  ['1488', 'hate'],
  ['sexy dance', 'nsfw'],
  ['p0rn', 'nsfw'],
  ['nackt', 'nsfw'],
  ['çıplak', 'nsfw'],
  ['siktir', 'nsfw'],
  ['Pistole', 'violence'],
  ['silahlı', 'violence'],
  ['terörist', 'violence'],
  ['AK-47', 'violence'],
  ['Bier', 'drugs'],
  ['rakı', 'drugs'],
  ['w33d', 'drugs'],
  ['vodka shots', 'drugs'],
  ['kiiirche', 'religion'],
  ['K.I.R.C.H.E', 'religion'],
  ['g0tt', 'religion'],
  ['CHURCH!!!', 'religion'],
  ['tanrım', 'religion'],
  ['Sarhoş', 'drugs'],
];

const ALLOWED = [
  'krass',
  'yok artık',
  'party',
  'birthday party',
  'class',
  'pass',
  'first class',
  'ass', // not a term on its own (German „Ass“ = ace)
  'katze',
  'applaus',
  'facepalm',
  'mind blown',
  'got it',
  'ich kann das',
  'goooood vibes',
  'güneş',
  'Waffel',
  'kriegen',
  'oldu',
  'şık',
  'camia',
  'negroni',
  'shooting star',
  'Weihnachten',
  'bomba gibi',
  'Kürt',
  'Türk',
  'hallo',
  'merhaba',
  'GG EZ',
  'tebrikler',
  'wahnsinn',
  'erste Wahl',
  'grass',
  'Islamabad',
];

test('safety: blocked terms (TR/DE/EN, normalisation, leetspeak)', () => {
  for (const [text, cat] of BLOCKED) {
    const r = Safety.check(text);
    assert.equal(r.ok, false, `${text} should be blocked`);
    assert.equal(r.reason, cat, `${text}: expected ${cat}, got ${r.reason}`);
    assert.equal(r.category, cat);
    assert.ok(r.term, `${text}: term reported`);
    assert.ok(r.label && r.label.de && r.label.tr && r.label.en);
  }
});

test('safety: false-positive guards stay allowed', () => {
  for (const text of ALLOWED) {
    const r = Safety.check(text);
    assert.equal(r.ok, true, `${text} must not be blocked (got ${r.reason}: ${r.term})`);
  }
});

test('safety: at least 40 cases covered', () => {
  assert.ok(BLOCKED.length + ALLOWED.length >= 40);
  assert.ok(Safety.termCount > 300, `term count ${Safety.termCount}`);
});

test('safety: categories exposed with DE/TR/EN labels', () => {
  assert.deepEqual(Safety.categories, ['politics', 'religion', 'hate', 'nsfw', 'violence', 'drugs']);
  for (const id of Safety.categories) {
    for (const lg of ['de', 'tr', 'en']) assert.equal(typeof Safety.CATEGORIES[id][lg], 'string');
  }
  assert.equal(Safety.message('politics', 'de'), 'Dieser Suchbegriff ist gesperrt (Politik).');
  assert.equal(Safety.message('religion', 'tr'), 'Bu arama terimi engellendi (Din).');
  assert.equal(Safety.message('drugs', 'en'), 'This search term is blocked (Drugs/alcohol).');
  assert.match(Safety.message('nsfw', 'xx'), /^Dieser Suchbegriff ist gesperrt/);
});

test('safety: normalisation details', () => {
  assert.equal(Safety.normalize('Größe Straße'), 'grosse strasse');
  assert.equal(Safety.normalize('ŞIK çiçek ĞÜÖ'), 'sik cicek guo');
  assert.equal(Safety.normalize('Müller Mueller'), 'muller muller');
  assert.equal(Safety.normalize('h3ll0 w0rld'), 'hello world');
  assert.equal(Safety.normalize('1990'), '1990', 'plain numbers are not leet-mapped');
  assert.equal(Safety.normalize('soooo'), 'soo');
  assert.equal(Safety.normalize('wow!!! ...nice'), 'wow nice');
  assert.equal(Safety.normalize('k i r c h e'), 'kirche');
});

test('safety: phrases need all words in order; whole words only', () => {
  assert.equal(Safety.check('lives matter').ok, true);
  assert.equal(Safety.check('black matter lives').ok, true);
  assert.equal(Safety.check('Black Lives Matter!').ok, false);
  assert.equal(Safety.check('gunther').ok, true);
  assert.equal(Safety.check('a gun b').ok, false);
  assert.equal(Safety.check('').ok, true);
  assert.equal(Safety.check(null).ok, true);
  assert.equal(Safety.check(12345).ok, true);
});

test('safety: filterResults / partition by title, tags, slug, description', () => {
  const items = [
    { id: '1', title: 'Cat jump', tags: ['cat'], slug: 'cat-jump-abc' },
    { id: '2', title: 'Beer time', tags: [] },
    { id: '3', title: 'Funny', tags: ['fun', 'gun'] },
    { id: '4', title: 'Crowd', slug: 'crowd-in-church-xyz' },
    { id: '5', title: 'Ok', content_description: 'people praying' },
    { id: '6', title: 'Dog', alt_text: 'happy dog' },
    null,
    'junk',
  ];
  const kept = Safety.filterResults(items);
  assert.deepEqual(kept.map((x) => x.id), ['1', '6']);
  const p = Safety.partition(items);
  assert.equal(p.kept.length, 2);
  assert.deepEqual(p.removed.filter((r) => r.item && r.item.id).map((r) => [r.item.id, r.reason]), [
    ['2', 'drugs'],
    ['3', 'violence'],
    ['4', 'religion'],
    ['5', 'religion'],
  ]);
  assert.deepEqual(Safety.filterResults(undefined), []);
});

test('safety: works as a browser global too', () => {
  assert.equal(globalThis.LiveFXSafety, Safety);
});
