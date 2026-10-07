// LiveFX – tiny language detector for mixed DE / TR / EN speech (backend `auto` in js/asr.js).
//
// Streamers switch between German, Turkish and English mid-sentence; Web Speech only listens in
// one language at a time. This module scores a (short, ASR-flavoured) transcript against three
// signal classes and reports the dominant family:
//
//   1. function words per language (STOPWORDS) – the strongest signal, 1 point per hit
//   2. diacritics: ı ş ğ İ -> tr, ä ß -> de, ö/ü shared de+tr (lower weight), ç -> tr
//   3. suffix / prefix hints (-yor -lar -mış … tr, -ung -keit -lich sch- … de, -ing -tion th- … en)
//   4. (2.2) Turkish signals: the letters ı ş ğ İ Ş Ğ decide for `tr` at once (`signal: 'letters'`, score
//      at least TR_LETTER_SCORE), and TR_SHORT – short Turkish stream words ("len", "yav", "hocam") –
//      score 0.5 each (`signal: 'words'`). Any Turkish signal switches to `toLocaleLowerCase('tr')`
//      (I -> ı, İ -> i) so "YAPIYORUM" / "İYİ" tokenize as Turkish.
//
//   LiveFXLangDetect.detect('yok artik abi')  -> { lang:'tr', score:0.9, scores:{de:0, tr:1.8, en:0.2} }
//   LiveFXLangDetect.tag('de', ['de-AT'])     -> 'de-AT'   (default 'de-DE' | 'tr-TR' | 'en-US')
//   LiveFXLangDetect.family('en-GB')          -> 'en'
//
// `score` is the share of the winner in the total evidence (0..1); `lang` is null below MIN_SCORE
// or when a single token carries no diacritic evidence. UMD: browser global `LiveFXLangDetect`,
// CommonJS `module.exports` (tests, js/asr.js under Node).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiveFXLangDetect = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FAMILIES = Object.freeze(['de', 'tr', 'en']);
  const DEFAULT_TAGS = Object.freeze({ de: 'de-DE', tr: 'tr-TR', en: 'en-US' });
  const MIN_SCORE = 0.35; // the winner must hold more than a third of the evidence (3 families)

  // Function words and stream slang per language. Words that exist in two of the languages with
  // the same spelling ("in", "so", "man", "was", "die", "ben", "bin", "also") are left out on purpose.
  const STOPWORDS = Object.freeze({
    de: Object.freeze([
      'und', 'ist', 'das', 'nicht', 'warum', 'ich', 'wir', 'ihr', 'aber', 'auch', 'mit', 'der', 'ein', 'eine', 'einen',
      'einem', 'schon', 'jetzt', 'krass', 'alter', 'digga', 'oder', 'doch', 'noch', 'mal', 'nein',
      'nichts', 'kein', 'keine', 'hab', 'habe', 'haben', 'hat', 'sind', 'bist', 'wird', 'werden', 'wie',
      'wo', 'wer', 'wieso', 'weil', 'wenn', 'dann', 'dass', 'denn', 'sehr', 'hier', 'dort',
      'heute', 'morgen', 'gestern', 'ja', 'nee', 'geil', 'ey', 'bruder', 'einfach', 'richtig',
      'wirklich', 'echt', 'gut', 'schlecht', 'mein', 'dein', 'sein', 'uns', 'euch', 'ihm', 'ihn', 'sie', 'es',
      'wäre', 'waren', 'kann', 'können', 'muss', 'müssen', 'wollen', 'soll', 'sollen',
      'darf', 'dürfen', 'macht', 'machen', 'gemacht', 'geht', 'gehen', 'kommt', 'kommen', 'gibt', 'gib',
      'mach', 'komm', 'schau', 'guck', 'lass', 'los', 'zu', 'von', 'vom', 'zum', 'zur', 'für', 'auf', 'aus',
      'bei', 'nach', 'über', 'unter', 'vor', 'ohne', 'durch', 'gegen', 'am', 'im', 'ins', 'den', 'dem',
      'des', 'diese', 'dieser', 'dieses', 'jede', 'jeder', 'alle', 'alles', 'viel', 'viele', 'mehr', 'weniger',
      'immer', 'nie', 'wieder', 'gerade', 'eigentlich', 'vielleicht', 'natürlich', 'bisschen', 'bissl',
      'leute', 'spiel', 'runde', 'danke', 'bitte', 'warte',
    ]),
    tr: Object.freeze([
      've', 'bir', 'bu', 'var', 'yok', 'şu', 'o', 'çok', 'değil', 'ama', 'için', 'ben', 'biz', 'sen', 'siz', 'onlar', 'evet',
      'hayır', 'hayir', 'tamam', 'şey', 'sey', 'ne', 'nasıl', 'nasil', 'neden', 'niye', 'kim',
      'nerede', 'nereye', 'hangi', 'kaç', 'kac', 'abi', 'abla', 'kanka', 'lan', 'yani', 'hadi', 'haydi', 'aynen',
      'işte', 'iste', 'böyle', 'boyle', 'şöyle', 'soyle', 'gibi', 'kadar', 'daha', 'en', 'hiç', 'hic', 'hep',
      'hepsi', 'bütün', 'bazı', 'bazi', 'herkes', 'hiçbir', 'birşey', 'bişey', 'bişi', 'bana', 'sana',
      'beni', 'seni', 'bize', 'size', 'benim', 'senin', 'bizim', 'sizin', 'onun', 'onu', 'ona', 'bunu', 'buna',
      'şunu', 'burada', 'orada', 'şurada', 'burda', 'orda', 'şimdi', 'simdi', 'sonra', 'önce', 'bugün',
      'bugun', 'yarın', 'yarin', 'dün', 'dun', 'zaten', 'belki', 'galiba', 'herhalde', 'çünkü', 'cunku', 'fakat',
      'ancak', 'yoksa', 'eğer', 'eger', 'ise', 'iyi', 'kötü', 'kotu', 'güzel', 'guzel', 'harika', 'süper',
      'oldu', 'olmadı', 'olmadi', 'olur', 'olmaz', 'oluyor', 'yoktu', 'vardı', 'vardi', 'gel', 'git',
      'bak', 'yap', 'yapma', 'dur', 'bekle', 'ya', 'yaa', 'aman', 'vay', 'oha', 'eyvah', 'inşallah', 'insallah',
      'maşallah', 'masallah', 'tabii', 'tabi', 'peki', 'lütfen', 'lutfen', 'teşekkürler', 'tesekkurler', 'sağol',
      'sagol', 'merhaba', 'selam', 'arkadaşlar', 'arkadaslar', 'çocuklar', 'cocuklar', 'oyun', 'maç',
      'artık', 'artik', 'hemen', 'biraz', 'falan', 'filan', 'mi', 'mı', 'mu', 'mü', 'ki', 'ile',
      'diye', 'dedi', 'dedim', 'diyor', 'diyorum', 'biliyorum', 'bilmiyorum', 'istiyorum', 'gidiyorum', 'bence',
    ]),
    en: Object.freeze([
      'the', 'and', 'is', 'not', 'you', 'we', 'this', 'that', 'with', 'but', 'what', 'okay', 'yes', 'no',
      'yeah', 'yep', 'nope', 'are', 'be', 'been', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
      'done', 'can', 'could', 'would', 'should', 'just', 'like', 'really', 'very', 'too',
      'now', 'then', 'there', 'here', 'where', 'when', 'why', 'how', 'who', 'which', 'some', 'any', 'all',
      'more', 'most', 'much', 'many', 'my', 'your', 'our', 'their', 'his', 'its', 'me', 'him', 'them',
      'they', 'he', 'she', 'it', 'us', 'i', "i'm", "it's", "that's", "don't", 'dont', "can't", 'cant',
      "didn't", "isn't", "you're", 'gonna', 'wanna', 'gotta', 'bro', 'dude', 'guys', 'wild',
      'crazy', 'insane', 'lol', 'lmao', 'omg', 'damn', 'wow', 'nice', 'cool', 'good', 'bad', 'great', 'let',
      "let's", 'lets', 'get', 'got', 'go', 'going', 'come', 'see', 'look', 'know', 'think', 'thing', 'things',
      'stuff', 'of', 'to', 'at', 'for', 'from', 'by', 'about', 'into', 'over', 'out', 'up', 'down',
      'off', 'if', 'or', 'because', 'cause', 'maybe', 'actually', 'literally', 'basically', 'honestly', 'right',
      'thanks', 'thank', 'please', 'hello', 'hi', 'again', 'never', 'always', 'still', 'already',
    ]),
  });

  const SETS = { de: new Set(STOPWORDS.de), tr: new Set(STOPWORDS.tr), en: new Set(STOPWORDS.en) };

  // 2.2: short Turkish stream words that are not safe enough for a full point (address forms,
  // fillers, phonetic ASR spellings). Half a point each; none of them is in STOPWORDS.
  const TR_SHORT = Object.freeze([
    'bi', 'abe', 'ha', 'hı', 'hıhı', 'len', 'ulan', 'olm', 'oğlum', 'oglum', 'yav', 'yaw', 'aga', 'ağa',
    'reis', 'hocam', 'usta', 'moruk', 'birader', 'kardeş', 'kardes', 'kanki', 'knk', 'napıyon', 'napiyon', 'napıyorsun',
    'noldu', 'nolur', 'naber', 'nabersin', 'ayy', 'ayyy', 'öf', 'uff', 'amanın', 'ayol',
  ]);
  const TR_SHORT_SET = new Set(TR_SHORT);
  const TR_SHORT_WEIGHT = 0.5;
  const TR_LETTER_SCORE = 0.75; // a Turkish letter decides at once: score at least this (ASR quick switch >= 0.6)

  // Character evidence: [regex (global), { family: weight }]. ö/ü exist in both German and Turkish.
  const CHARS = [
    [/[ışğ]/g, { tr: 1 }],
    [/ç/g, { tr: 0.8 }],
    [/[äß]/g, { de: 1 }],
    [/[öü]/g, { de: 0.4, tr: 0.4 }],
  ];

  // Morphology hints on tokens of >= 4 letters: [regex, family, weight]. Deliberately weak – they
  // only tip the balance when the function words are missing ("spielen", "geliyorum", "running").
  const HINTS = [
    [/(ıyor|iyor|uyor|üyor|yor)$/, 'tr', 0.6],
    [/(lar|ler)[ıiuü]?$/, 'tr', 0.35],
    [/(mış|miş|muş|müş)$/, 'tr', 0.6],
    [/(acak|ecek|acağ|eceğ)/, 'tr', 0.5],
    [/(dım|dim|dum|düm|tım|tim|tum|tüm|dık|dik|duk|dük)$/, 'tr', 0.4],
    [/(lık|lik|luk|lük)$/, 'tr', 0.4],
    [/(ım|üm|um|ın|ün|un)$/, 'tr', 0.2],
    [/(ung|keit|heit|lich|chen|isch|schaft)$/, 'de', 0.45],
    [/^sch/, 'de', 0.35],
    [/^(ge|ver|zer)[a-zäöü]{3,}(t|en)$/, 'de', 0.35],
    [/en$/, 'de', 0.15],
    [/(ing|ness|ment|ship|ful|less|ly|tion)$/, 'en', 0.4],
    [/^(th|wh)/, 'en', 0.4],
    [/^(you|every|some|any)/, 'en', 0.3],
  ];

  const TR_DIACRITICS = /[ışğİŞĞ]/;

  function blank() {
    return { de: 0, tr: 0, en: 0 };
  }

  /** Lower-cases Turkish-aware (İ -> i, I -> ı) when the text shows a Turkish signal (letters or words). */
  function lower(text, turkish) {
    try {
      return turkish || TR_DIACRITICS.test(text) ? text.toLocaleLowerCase('tr') : text.toLocaleLowerCase('en');
    } catch (_) {
      return text.toLowerCase();
    }
  }

  function hasTurkishWord(tokens) {
    return tokens.some((t) => SETS.tr.has(t) || TR_SHORT_SET.has(t));
  }

  /** Tokens of `text`; Turkish lower-casing when the text carries a Turkish letter or word. */
  function tokenize(text, turkish) {
    const plain = split(lower(text, turkish));
    if (turkish || TR_DIACRITICS.test(text) || !hasTurkishWord(plain)) return plain;
    return split(lower(text, true));
  }

  function split(text) {
    return text
      .replace(/[’´`]/g, "'")
      .replace(/[^\p{L}\p{N}']+/gu, ' ')
      .replace(/(^|\s)'+|'+(\s|$)/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function detect(text) {
    const scores = blank();
    const empty = { lang: null, score: 0, scores };
    if (typeof text !== 'string') return empty;
    const raw = text.trim();
    if (!raw) return empty;
    const letters = TR_DIACRITICS.test(raw);
    const tokens = tokenize(raw, letters);
    if (!tokens.length) return empty;
    const words = hasTurkishWord(tokens);

    let diacritics = 0;
    const lo = lower(raw, letters || words);
    const dottedI = (raw.match(/İ/g) || []).length; // lower-cased to a plain i: count it here
    if (dottedI) {
      diacritics += dottedI;
      scores.tr += dottedI;
    }
    for (const [re, weights] of CHARS) {
      const n = (lo.match(re) || []).length;
      if (!n) continue;
      diacritics += n;
      for (const f of Object.keys(weights)) scores[f] += n * weights[f];
    }

    for (const tok of tokens) {
      let hit = false;
      for (const f of FAMILIES) {
        if (SETS[f].has(tok)) {
          scores[f] += 1;
          hit = true;
        }
      }
      if (TR_SHORT_SET.has(tok)) {
        scores.tr += TR_SHORT_WEIGHT;
        hit = true;
      }
      if (hit || tok.length < 4) continue;
      for (const [re, f, w] of HINTS) {
        if (!re.test(tok)) continue;
        scores[f] += w;
      }
    }

    const total = scores.de + scores.tr + scores.en;
    if (!(total > 0)) return empty;
    if (letters) {
      // ı ş ğ İ Ş Ğ exist in Turkish only (a German / English recognizer never writes them).
      const share = Math.round((scores.tr / total) * 1000) / 1000;
      return { lang: 'tr', score: Math.max(share, TR_LETTER_SCORE), scores, signal: 'letters' };
    }
    let best = FAMILIES[0];
    for (const f of FAMILIES) if (scores[f] > scores[best]) best = f;
    const score = Math.round((scores[best] / total) * 1000) / 1000;
    if (score < MIN_SCORE) return { lang: null, score, scores };
    if (tokens.length < 2 && diacritics === 0) return { lang: null, score, scores };
    const out = { lang: best, score, scores };
    if (best === 'tr' && words) out.signal = 'words';
    return out;
  }

  /** 'de-DE' | 'de_AT' | 'de' -> 'de'; anything else -> null. */
  function family(tag) {
    const m = String(tag || '')
      .toLowerCase()
      .match(/^(de|tr|en)(?=$|[-_])/);
    return m ? m[1] : null;
  }

  /** Family -> BCP-47 tag; `prefer` (list of tags) wins when one of them belongs to the family. */
  function tag(lang, prefer) {
    const fam = family(lang);
    if (!fam) return null;
    if (Array.isArray(prefer)) {
      for (const p of prefer) if (family(p) === fam) return p;
    }
    return DEFAULT_TAGS[fam];
  }

  return { detect, tag, family, tokenize, STOPWORDS, TR_SHORT, TR_SHORT_WEIGHT, TR_LETTER_SCORE, FAMILIES, DEFAULT_TAGS, MIN_SCORE };
});
