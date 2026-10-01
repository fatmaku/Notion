// node --test test/langdetect.test.js
// Unit tests for js/langdetect.js (DE / TR / EN detection on short, ASR-flavoured transcripts).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const L = require('../js/langdetect.js');

const SENTENCES = [
  // German – clean and stream slang (ASR output often drops punctuation and capitalisation)
  ['ich glaube das ist nicht so gut', 'de'],
  ['krass alter', 'de'],
  ['das war echt krass alter', 'de'],
  ['wir spielen jetzt eine runde', 'de'],
  ['komm schon digga das geht doch nicht', 'de'],
  ['ey leute schaut mal hier', 'de'],
  ['ich hab das geschafft', 'de'],
  ['warum funktioniert das schon wieder nicht', 'de'],
  ['die Entscheidung war richtig', 'de'],
  ['bruder was ist das für ein spiel', 'de'],
  // Turkish – with and without diacritics (dialect / sloppy ASR)
  ['yok artik', 'tr'],
  ['yok artık abi', 'tr'],
  ['bugün çok güzel bir gün', 'tr'],
  ['şimdi ne yapıyoruz', 'tr'],
  ['abi bak bu nasıl oldu', 'tr'],
  ['hadi lan gidiyoruz', 'tr'],
  ['tamam tamam anladım', 'tr'],
  ['bu oyun çok zor değil mi', 'tr'],
  ['aynen kanka ben de öyle düşünüyorum', 'tr'],
  ['evet evet geliyorum hemen', 'tr'],
  ['BİR DAKİKA BEKLE', 'tr'],
  // English – clean and casual
  ["that's wild bro", 'en'],
  ['I think we should go now', 'en'],
  ['what the hell is going on', 'en'],
  ['okay okay chill guys', 'en'],
  ['this is actually insane', 'en'],
  ['we are running out of time', 'en'],
  ["let's go let's go", 'en'],
  ['you know what i mean', 'en'],
  ['the game is not loading again', 'en'],
];

test('langdetect: detect() picks the right family for 30 DE/TR/EN sentences', () => {
  for (const [text, expected] of SENTENCES) {
    const r = L.detect(text);
    assert.equal(r.lang, expected, `${JSON.stringify(text)} -> ${JSON.stringify(r)}`);
    assert.ok(r.score >= L.MIN_SCORE && r.score <= 1, `score in range for ${text}`);
    assert.deepEqual(Object.keys(r.scores).sort(), ['de', 'en', 'tr']);
    assert.ok(r.scores[expected] >= r.scores.de && r.scores[expected] >= r.scores.tr && r.scores[expected] >= r.scores.en);
  }
});

test('langdetect: mixed, empty and short input', async (t) => {
  await t.test('mixed "abi das ist krass" -> de or tr, never null', () => {
    const r = L.detect('abi das ist krass');
    assert.ok(r.lang === 'de' || r.lang === 'tr', JSON.stringify(r));
    assert.ok(r.scores.de > 0 && r.scores.tr > 0);
  });

  await t.test('the dominant language of a short mixed sentence wins', () => {
    assert.equal(L.detect('abi das ist krass alter').lang, 'de');
    assert.equal(L.detect('yok artik abi das').lang, 'tr');
    assert.equal(L.detect('bro that was krass').lang, 'en');
  });

  await t.test('empty / non-string / whitespace / punctuation -> null with zero scores', () => {
    for (const v of ['', '   ', null, undefined, 42, '!!! ...', {}]) {
      assert.deepEqual(L.detect(v), { lang: null, score: 0, scores: { de: 0, tr: 0, en: 0 } }, String(v));
    }
  });

  await t.test('a single token without diacritics is not enough', () => {
    assert.equal(L.detect('krass').lang, null);
    assert.equal(L.detect('ja').lang, null);
    assert.equal(L.detect('evet').lang, null);
    assert.equal(L.detect('hello').lang, null);
  });

  await t.test('a single token with Turkish or German diacritics is enough', () => {
    assert.equal(L.detect('yapıyorum').lang, 'tr');
    assert.equal(L.detect('değil').lang, 'tr');
    assert.equal(L.detect('schön').lang, 'de');
    assert.equal(L.detect('Straße').lang, 'de');
  });

  await t.test('unknown words only -> null, scores stay 0', () => {
    const r = L.detect('xyz qwq');
    assert.equal(r.lang, null);
    assert.equal(r.score, 0);
  });

  await t.test('Turkish-aware lowercasing: dotted capital İ and dotless I', () => {
    assert.equal(L.detect('İYİ Kİ GELDİN ABİ').lang, 'tr');
    assert.equal(L.detect('ŞIMDI NE YAPIYORUZ').lang, 'tr');
    assert.equal(L.detect('I THINK THIS IS IT').lang, 'en');
  });

  await t.test('suffix hints decide when function words are missing', () => {
    assert.equal(L.detect('geliyorum gidiyorum').lang, 'tr');
    assert.equal(L.detect('Entscheidung Wahrscheinlichkeit').lang, 'de');
    assert.equal(L.detect('running jumping').lang, 'en');
  });
});

test('langdetect: tag() / family() / STOPWORDS', async (t) => {
  await t.test('family() maps tags to de|tr|en, anything else null', () => {
    assert.equal(L.family('de-DE'), 'de');
    assert.equal(L.family('de-AT'), 'de');
    assert.equal(L.family('de_CH'), 'de');
    assert.equal(L.family('TR-tr'), 'tr');
    assert.equal(L.family('en-GB'), 'en');
    assert.equal(L.family('en'), 'en');
    assert.equal(L.family('fr-FR'), null);
    assert.equal(L.family('deutsch'), null);
    assert.equal(L.family(''), null);
    assert.equal(L.family(null), null);
    assert.equal(L.family(undefined), null);
  });

  await t.test('tag() returns the default BCP-47 tag or the preferred variant of the family', () => {
    assert.equal(L.tag('de'), 'de-DE');
    assert.equal(L.tag('tr'), 'tr-TR');
    assert.equal(L.tag('en'), 'en-US');
    assert.equal(L.tag('de', ['tr-TR', 'de-AT', 'de-CH']), 'de-AT');
    assert.equal(L.tag('en', ['de-AT', 'tr-TR']), 'en-US');
    assert.equal(L.tag('en-GB', ['en-IN']), 'en-IN', 'a full tag is reduced to its family first');
    assert.equal(L.tag('fr'), null);
    assert.equal(L.tag(null, ['de-DE']), null);
    assert.equal(L.tag('tr', 'de-DE'), 'tr-TR', 'non-array prefer is ignored');
  });

  await t.test('STOPWORDS: three frozen lists, lowercase, no word in two lists', () => {
    assert.deepEqual(Object.keys(L.STOPWORDS).sort(), ['de', 'en', 'tr']);
    const seen = new Map();
    for (const f of ['de', 'tr', 'en']) {
      assert.ok(Object.isFrozen(L.STOPWORDS[f]));
      assert.ok(L.STOPWORDS[f].length >= 50, `${f} has ${L.STOPWORDS[f].length} words`);
      for (const w of L.STOPWORDS[f]) {
        assert.equal(w, w.toLocaleLowerCase('tr'), `${w} is lowercase`);
        if (seen.has(w)) assert.fail(`${w} is in ${seen.get(w)} and ${f}`);
        seen.set(w, f);
      }
    }
    for (const w of ['und', 'ist', 'das', 'nicht', 'krass']) assert.ok(L.STOPWORDS.de.includes(w), w);
    for (const w of ['ve', 'bir', 'çok', 'değil', 'yok', 'tamam']) assert.ok(L.STOPWORDS.tr.includes(w), w);
    for (const w of ['the', 'and', 'is', 'not', 'okay']) assert.ok(L.STOPWORDS.en.includes(w), w);
    assert.deepEqual(L.FAMILIES, ['de', 'tr', 'en']);
    assert.deepEqual(L.DEFAULT_TAGS, { de: 'de-DE', tr: 'tr-TR', en: 'en-US' });
  });

  await t.test('UMD: a browser global is set when there is no module', () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const src = fs.readFileSync(require.resolve('../js/langdetect.js'), 'utf8');
    const ctx = { self: undefined };
    ctx.self = ctx;
    vm.runInNewContext(src, ctx);
    assert.equal(typeof ctx.LiveFXLangDetect.detect, 'function');
    assert.equal(ctx.LiveFXLangDetect.detect('yok artik').lang, 'tr');
  });
});
