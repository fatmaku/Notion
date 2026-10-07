// node --test test/phonetic.test.js
// Unit tests for js/phonetic.js (LiveFX 2.2): rule-based respellings of cross-language keywords as a
// recognizer of another language would write them, used by the matcher as aliases (setPhonetic).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const P = require('../js/phonetic.js');

const v = (keyword, from, to) => P.variants(keyword, { from, to });

/** [keyword, from, to, expected variants (every one must be produced)] */
const CASES = [
  // English memes heard by a Turkish recognizer
  ['no way', 'en', 'tr', ['no vey', 'novey']],
  ["let's go", 'en', 'tr', ['letsgo', 'lets go', 'leds go']],
  ['sheesh', 'en', 'tr', ['şiş', 'şiiş']],
  ['what the', 'en', 'tr', ['vat de']],
  ['bruh', 'en', 'tr', ['bra', 'brah']],
  ['cringe', 'en', 'tr', ['krinç']],
  ['insane', 'en', 'tr', ['inseyn']],
  ['nice', 'en', 'tr', ['nays']],
  ['wow', 'en', 'tr', ['vav']],
  ['mind blown', 'en', 'tr', ['maynd blon']],
  ['respect', 'en', 'tr', ['rispekt']],
  ['money money', 'en', 'tr', ['mani mani']],
  ['we did it', 'en', 'tr', ['vi did it']],
  ['gg', 'en', 'tr', ['ci ci']],
  // German memes heard by a Turkish recognizer
  ['krass', 'de', 'tr', ['kras']],
  ['läuft bei dir', 'de', 'tr', ['loyft bay dir']],
  ['ehrenmann', 'de', 'tr', ['erenman']],
  ['digga', 'de', 'tr', ['diga']],
  ['geil', 'de', 'tr', ['gayl']],
  ['nein', 'de', 'tr', ['nayn']],
  ['jawohl', 'de', 'tr', ['yavol']],
  ['schade', 'de', 'tr', ['şade']],
  ['trommelwirbel', 'de', 'tr', ['tromelvirbel']],
  ['kein plan', 'de', 'tr', ['kayn plan']],
  ['feuer', 'de', 'tr', ['foyer']],
  // Turkish memes heard by a German recognizer
  ['yok artık', 'tr', 'de', ['yok artik', 'yok artic']],
  ['helal olsun', 'tr', 'de', ['hell al olsun']],
  ['aynen', 'tr', 'de', ['einen', 'eynen']],
  ['çok güzel', 'tr', 'de', ['tschok güsel']],
  ['şahane', 'tr', 'de', ['schahane']],
  ['hadi', 'tr', 'de', ['hardy']],
  ['vay be', 'tr', 'de', ['wai be']],
  ['kazandık', 'tr', 'de', ['kasandik']],
  // Turkish memes heard by an English recognizer
  ['yok artık', 'tr', 'en', ['yok artik', 'yok artic']],
  ['helal olsun', 'tr', 'en', ['hell al olsun']],
  ['kral', 'tr', 'en', ['crawl']],
  ['şok', 'tr', 'en', ['shok', 'shock']],
  ['abi', 'tr', 'en', ['abbey']],
  // English memes heard by a German recognizer
  ['no way', 'en', 'de', ['no wey']],
  ['sheesh', 'en', 'de', ['schisch']],
  ['what the', 'en', 'de', ['wot de', 'wat se']],
  ['nice', 'en', 'de', ['neis', 'nais']],
  ['cringe', 'en', 'de', ['krindsch']],
  // German memes heard by an English recognizer
  ['krass', 'de', 'en', ['crass']],
  ['ehrenmann', 'de', 'en', ['aaron man']],
  ['nein', 'de', 'en', ['nine']],
  ['läuft bei dir', 'de', 'en', ['loyft by dear']],
  ['geil', 'de', 'en', ['guile', 'gail']],
];

test(`phonetic: variants() produces the expected respellings (${CASES.length} cases)`, () => {
  for (const [keyword, from, to, expected] of CASES) {
    const out = v(keyword, from, to);
    for (const e of expected) assert.ok(out.includes(e), `${from}->${to} ${JSON.stringify(keyword)}: expected ${JSON.stringify(e)} in ${JSON.stringify(out)}`);
  }
});

test('phonetic: variants() invariants', async (t) => {
  await t.test('never the keyword itself, lower-case, whitespace-normalized, unique, <= MAX_VARIANTS', () => {
    assert.equal(P.MAX_VARIANTS, 8);
    for (const [keyword, from, to] of CASES) {
      const out = v(keyword, from, to);
      assert.ok(out.length >= 1 && out.length <= P.MAX_VARIANTS, `${keyword}: ${out.length}`);
      assert.equal(new Set(out).size, out.length, `${keyword}: unique`);
      for (const s of out) {
        assert.notEqual(s, keyword.toLowerCase());
        assert.equal(s, s.toLowerCase());
        assert.equal(s, s.replace(/\s+/g, ' ').trim());
        assert.ok(s.length, 'non-empty');
      }
    }
  });

  await t.test('language tags are accepted (tr-TR, de_AT, EN-us) and unknown / same-language pairs give []', () => {
    assert.ok(v('no way', 'en-US', 'tr-TR').includes('no vey'));
    assert.ok(v('no way', 'EN', 'tr_TR').includes('no vey'));
    assert.deepEqual(v('no way', 'en', 'en'), []);
    assert.deepEqual(v('no way', 'fr', 'tr'), []);
    assert.deepEqual(v('no way', 'en', null), []);
    assert.deepEqual(v('no way', null, 'tr'), []);
    assert.deepEqual(v('', 'en', 'tr'), []);
    assert.deepEqual(v(null, 'en', 'tr'), []);
    assert.deepEqual(P.variants('no way'), []);
  });

  await t.test('capitalisation, punctuation and apostrophes are cleaned first', () => {
    assert.deepEqual(v("Let's GO!", 'en', 'tr'), v("let's go", 'en', 'tr'));
    assert.ok(v('No way?!', 'en', 'tr').includes('no vey'));
    assert.ok(v('YOK ARTIK', 'tr', 'de').includes('yok artic'));
    assert.ok(v('İNANILMAZ', 'tr', 'de').includes('inanilmas'), 'dotted İ lower-cased the Turkish way');
  });

  await t.test('generic rules cover words outside the dictionary', () => {
    assert.ok(v('thunder', 'en', 'tr').includes('tander') || v('thunder', 'en', 'tr').some((s) => /^t/.test(s)), JSON.stringify(v('thunder', 'en', 'tr')));
    assert.ok(v('schnitzel', 'de', 'tr').some((s) => s.startsWith('şn')), JSON.stringify(v('schnitzel', 'de', 'tr')));
    assert.ok(v('başardık', 'tr', 'en').some((s) => s.includes('sh')), JSON.stringify(v('başardık', 'tr', 'en')));
    assert.ok(v('çekirdek', 'tr', 'de').some((s) => s.startsWith('tsch')), JSON.stringify(v('çekirdek', 'tr', 'de')));
    assert.ok(v('chill', 'en', 'de').includes('tschill'), JSON.stringify(v('chill', 'en', 'de')));
    assert.deepEqual(v('whatever', 'en', 'de'), [], 'nothing to respell -> no variant');
  });

  await t.test('joined forms only for short two-word memes', () => {
    assert.ok(v('no way', 'en', 'tr').includes('novey'));
    assert.ok(!v('läuft bei dir', 'de', 'tr').some((s) => !s.includes(' ')), 'three words are never joined');
    assert.ok(!v('mind blown', 'en', 'tr').includes('mayndblon'), 'long tokens are not joined');
  });
});

test('phonetic: guess() and family()', () => {
  assert.equal(P.guess('yok artık'), 'tr');
  assert.equal(P.guess('helal olsun'), 'tr');
  assert.equal(P.guess('krass'), 'de');
  assert.equal(P.guess('läuft bei dir'), 'de');
  assert.equal(P.guess('no way'), 'en');
  assert.equal(P.guess("let's go"), 'en');
  assert.equal(P.guess('xyzzy'), null, 'unknown -> null');
  assert.equal(P.guess(''), null);
  assert.equal(P.guess(null), null);
  assert.equal(P.family('tr-TR'), 'tr');
  assert.equal(P.family('de_AT'), 'de');
  assert.equal(P.family('EN-GB'), 'en');
  assert.equal(P.family('fr-FR'), null);
  assert.equal(P.family('auto'), null);
  assert.deepEqual(P.FAMILIES, ['de', 'tr', 'en']);
});

test('phonetic: expand(keywords, primaryLang) – only foreign keywords get aliases', async (t) => {
  await t.test('Turkish recognizer: EN + DE keywords get Turkish respellings, TR keywords none', () => {
    const out = P.expand(['no way', 'krass', 'yok artık', 'helal olsun', 'sheesh', 'läuft bei dir'], 'tr-TR');
    assert.ok(out['no way'].includes('no vey'));
    assert.deepEqual(out.krass, ['kras']);
    assert.deepEqual(out['yok artık'], []);
    assert.deepEqual(out['helal olsun'], []);
    assert.ok(out.sheesh.includes('şiş'));
    assert.ok(out['läuft bei dir'].includes('loyft bay dir'));
  });

  await t.test('German recognizer: TR + EN keywords; English recognizer: TR + DE keywords', () => {
    const de = P.expand(['yok artık', 'no way', 'krass'], 'de');
    assert.ok(de['yok artık'].includes('yok artik') && de['yok artık'].includes('yok artic'));
    assert.ok(de['no way'].includes('no wey'));
    assert.deepEqual(de.krass, []);
    const en = P.expand(['yok artık', 'no way', 'krass', 'helal olsun'], 'en-US');
    assert.ok(en['yok artık'].includes('yok artic'));
    assert.ok(en['helal olsun'].includes('hell al olsun'));
    assert.deepEqual(en['no way'], []);
    assert.ok(en.krass.includes('crass'));
  });

  await t.test('unknown keyword language: every other family contributes; caps at MAX_VARIANTS', () => {
    const out = P.expand(['xyzzy plugh'], 'tr');
    assert.ok(Array.isArray(out['xyzzy plugh']));
    assert.ok(out['xyzzy plugh'].length <= P.MAX_VARIANTS);
    for (const k of Object.keys(P.expand(['what the', 'yok artık', 'läuft bei dir'], 'en'))) assert.ok(P.expand([k], 'en')[k].length <= P.MAX_VARIANTS);
  });

  await t.test('robust input: non-strings skipped, unknown primary / non-array -> {}', () => {
    assert.deepEqual(P.expand(['no way', 42, null], 'tr')['no way'].length > 0, true);
    assert.equal(Object.keys(P.expand(['no way', 42, null], 'tr')).length, 1);
    assert.deepEqual(P.expand(['no way'], 'fr'), {});
    assert.deepEqual(P.expand(['no way'], null), {});
    assert.deepEqual(P.expand('no way', 'tr'), {});
    assert.deepEqual(P.expand(['no way'], 'auto'), {});
  });
});

test('phonetic: dictionaries are well-formed (lower-case keys and values, no value equals its key)', () => {
  for (const pair of Object.keys(P.DICT)) {
    assert.match(pair, /^(de|tr|en)-(de|tr|en)$/);
    for (const [k, vals] of Object.entries(P.DICT[pair])) {
      assert.equal(k, k.toLocaleLowerCase('tr'), `${pair} key ${k}`);
      assert.ok(Array.isArray(vals) && vals.length, `${pair} ${k}`);
      for (const s of vals) assert.equal(s, s.toLowerCase(), `${pair} ${k} -> ${s}`);
    }
  }
  for (const pair of Object.keys(P.RULES)) for (const [re, rep] of P.RULES[pair]) assert.ok(re instanceof RegExp && typeof rep === 'string', pair);
});

test('phonetic: UMD – a browser global is set when there is no module', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('../js/phonetic.js'), 'utf8');
  const self = {};
  new Function('self', 'module', src).call(self, self, undefined);
  assert.equal(typeof self.LiveFXPhonetic.variants, 'function');
  assert.ok(self.LiveFXPhonetic.variants('no way', { from: 'en', to: 'tr' }).includes('no vey'));
});
