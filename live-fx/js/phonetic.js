// LiveFX – phonetic respellings for cross-language keywords (LiveFX 2.2).
//
// A speech recognizer only knows the vocabulary of the language it runs in. A Turkish recognizer
// hears the English meme "no way" as "no vey" and the German "läuft bei dir" as "loyft bay dir"; a
// German one hears "yok artık" as "yok artik" or "jok artic". This module produces such respellings
// by rule – a small per-pair dictionary for the words that matter most, plus generic grapheme rules –
// so js/matcher.js can index them as aliases of the real keyword (`setPhonetic(primaryLang)`).
//
//   LiveFXPhonetic.variants('no way', { from: 'en', to: 'tr' })   -> ['no vey', 'novey', ...]
//   LiveFXPhonetic.expand(['no way', 'krass'], 'tr-TR')          -> { 'no way': [...], krass: ['kras', ...] }
//   LiveFXPhonetic.guess('yok artık')                              -> 'tr'   (null when unsure)
//
// Variants are lower-case, whitespace-normalized, never equal to the keyword, at most MAX_VARIANTS per
// keyword. The matcher drops variants that equal a real keyword of any trigger. UMD: browser global
// `LiveFXPhonetic`, CommonJS `module.exports` (tests, js/matcher.js under Node).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiveFXPhonetic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FAMILIES = Object.freeze(['de', 'tr', 'en']);
  const MAX_VARIANTS = 8;

  // ---- dictionaries: word in `from` -> how a `to` recognizer tends to write it ------------------
  // Multi-word values are allowed ("hell al"); the keyword itself is never produced.
  const DICT = {
    'en-tr': {
      way: ['vey'], "let's": ['lets', 'leds'], lets: ['leds'], sheesh: ['şiş', 'şiiş'], what: ['vat'], the: ['de'],
      bruh: ['bra', 'brah'], cringe: ['krinç', 'krinc'], insane: ['inseyn'], damn: ['dem'], nice: ['nays'], wow: ['vav', 'vau'],
      cool: ['kul'], game: ['geym'], win: ['vin'], fire: ['fayr'], money: ['mani'], cash: ['keş'], love: ['lav'],
      funny: ['fani'], never: ['nevır', 'never'], fail: ['feyl'], oops: ['ups'], cute: ['kyut'], clap: ['klep'],
      drumroll: ['dramrol'], wrong: ['rong'], mind: ['maynd'], blown: ['blon'], awkward: ['okvırd'], respect: ['rispekt'],
      applause: ['eplos'], good: ['gud'], slay: ['sley'], hype: ['hayp'], goat: ['got'], rizz: ['riz'], sus: ['sas'],
      cooked: ['kukt'], clutch: ['klaç'], twist: ['tvist'], poggers: ['pogırs'], lit: ['lit'], cap: ['kep'], yes: ['yes'],
      lol: ['lol'], lmao: ['lmao'], dollar: ['dolar'], euro: ['yuro'], we: ['vi'], did: ['did'], it: ['it'], me: ['mi'],
      think: ['tink'], let: ['let'], no: ['no'], go: ['go'], big: ['big'], moment: ['moment'], plot: ['plot'],
      crazy: ['kreyzi'], wild: ['vayld'], dude: ['dud'], bro: ['bro'], chat: ['çet'], ratio: ['reyşo'], based: ['beyst'],
      sigma: ['sigma'], gyatt: ['gyat'], skibidi: ['skibidi'], yeet: ['yit'], vibe: ['vayb'], ez: ['iz'], gg: ['ci ci', 'gg'],
    },
    'de-tr': {
      krass: ['kras'], läuft: ['loyft', 'löyft'], bei: ['bay'], dir: ['dir'], ehrenmann: ['erenman'], digga: ['diga'],
      diggi: ['digi'], alter: ['alter'], geil: ['gayl'], nein: ['nayn'], schade: ['şade'], mist: ['mist'],
      geschafft: ['geşaft'], jawohl: ['yavol'], gewonnen: ['gevonen'], applaus: ['aplaus'], peinlich: ['paynlih'],
      feuer: ['foyer'], heiß: ['hays'], liebe: ['libe'], herz: ['herts'], süß: ['süs'], falsch: ['falş'], stimmt: ['ştimt'],
      nicht: ['niht'], trommelwirbel: ['tromelvirbel'], warte: ['varte'], gut: ['gut'], gespielt: ['geşpilt'],
      lustig: ['lustig'], witzig: ['vitsig'], wahnsinn: ['vansin'], unfassbar: ['unfasbar'], kohle: ['kole'], reich: ['rayh'],
      brennt: ['brent'], geld: ['gelt'], bruder: ['bruder'], schwede: ['şvede'], plan: ['plan'], kein: ['kayn'],
      safe: ['seyf'], lost: ['lost'], jackpot: ['cekpot'], cringy: ['krinci'], verkackt: ['ferkakt'], ups: ['ups'],
      überleg: ['überleg'], moment: ['moment'], mal: ['mal'], niemals: ['nimals'], unfall: ['unfal'], ehrenfrau: ['erenfrau'],
      mega: ['mega'], 'läuft bei dir': ['loyft bay dir'], wunderbar: ['vunderbar'], spitze: ['şpitse'], hammer: ['hamer'],
    },
    'tr-de': {
      yok: ['yok', 'jok'], artık: ['artik', 'artic', 'artick'], artik: ['artic'], helal: ['helal', 'hell al'], olsun: ['olsun', 'olsen'],
      aynen: ['einen', 'eynen'], kral: ['kral', 'kraal'], efsane: ['efsane', 'efsahne'], oha: ['oha', 'ooha'], abi: ['abi', 'abbi'],
      kanka: ['kanka'], hadi: ['hadi', 'hardy'], evet: ['evet', 'ewet'], tamam: ['tamam', 'tamm'], çok: ['tschok', 'chok'],
      iyi: ['iji', 'ii'], güzel: ['güsel', 'gusel'], inanılmaz: ['inanilmas', 'inanilmaz'], vay: ['wai', 'vai'], canım: ['djanim', 'canim'],
      eyvah: ['eiwah', 'eywah'], başardık: ['baschardik', 'basardik'], şahane: ['schahane'], kızdım: ['kisdim'],
      yeter: ['jeter'], kazandık: ['kasandik', 'kazandik'], bitti: ['bitti'], harika: ['harika'], süper: ['super'],
      hayır: ['hayir', 'hajir'], olamaz: ['olamas'], komik: ['komik'], para: ['para'], ateş: ['atesch'], aşk: ['aschk'],
      tatlı: ['tatli'], alkış: ['alkisch'], utanç: ['utantsch'], yanlış: ['janlisch', 'yanlisch'], düşüneyim: ['düschünejim'],
      be: ['be'], ya: ['ya', 'ja'], lan: ['lan'], ulan: ['ulan'], olm: ['olm'], kardeşim: ['kardeschim'], rezil: ['resil'],
      şok: ['schok'], deli: ['deli'], yalan: ['jalan'], doğru: ['doru', 'dogru'], gel: ['gel'], çekil: ['tschekil'],
    },
    'tr-en': {
      yok: ['yok', 'yoke'], artık: ['artik', 'artic', 'artick'], artik: ['artic'], helal: ['helal', 'hell al'], olsun: ['olsun', 'all soon'],
      aynen: ['eye nen', 'einen'], kral: ['kral', 'crawl'], efsane: ['efsane', 'f sunny'], oha: ['oha', 'oh ha'], abi: ['abi', 'abbey'],
      kanka: ['kanka', 'conker'], hadi: ['hadi', 'hoddy'], evet: ['evet', 'avet'], tamam: ['tamam', 'tamum'], çok: ['chok', 'choke'],
      iyi: ['ee', 'iyi'], güzel: ['guzel', 'goosel'], inanılmaz: ['inanilmaz', 'inanilmas'], vay: ['vie', 'vay'], canım: ['janim', 'janum'],
      eyvah: ['eyvah', 'ayvah'], başardık: ['basardik', 'bashardik'], şahane: ['shahane'], kızdım: ['kizdim'],
      yeter: ['yeter', 'yetter'], kazandık: ['kazandik', 'kazandick'], bitti: ['bitti', 'beatty'], harika: ['harika', 'harry ka'],
      süper: ['super'], hayır: ['hayir', 'hire'], olamaz: ['olamaz', 'olamas'], komik: ['komik', 'comic'], para: ['para'],
      ateş: ['atesh'], aşk: ['ashk'], tatlı: ['tatli'], alkış: ['alkish'], utanç: ['utanch'], yanlış: ['yanlish'],
      düşüneyim: ['dushuneyim'], ya: ['ya', 'yah'], lan: ['lan'], kardeşim: ['kardeshim'], şok: ['shok', 'shock'], yalan: ['yalan'],
      doğru: ['doru', 'dogru'], çekil: ['chekil'],
    },
    'en-de': {
      way: ['wey', 'wei'], "let's": ['lets', 'läts'], lets: ['läts'], sheesh: ['schisch', 'schiesch'], what: ['wot', 'wat'], the: ['se', 'de'],
      bruh: ['bra', 'brah'], cringe: ['krindsch'], insane: ['insein'], nice: ['neis', 'nais'], cool: ['kul'], fire: ['feier'],
      money: ['manni'], cash: ['käsch'], love: ['laff', 'low'], funny: ['fanni'], never: ['newer'], win: ['win'],
      clutch: ['klatsch'], slay: ['slej', 'slei'], hype: ['heip', 'haip'], rizz: ['ris'], sus: ['sass'], mind: ['meind', 'maind'],
      blown: ['bloun'], awkward: ['okwörd'], yes: ['jes'], fail: ['feil'], game: ['gejm', 'geim'], wrong: ['rong'],
      respect: ['rispekt'], applause: ['äplos'], drumroll: ['dramroll'], goat: ['gout'], cooked: ['kukt'], twist: ['twist'],
      poggers: ['poggers'], cute: ['kjut'], oops: ['ups'], crazy: ['kreisi'], wild: ['waild'], dude: ['dud'], chat: ['tschät'],
      yeet: ['jiet'], vibe: ['weib', 'vaib'], we: ['wi'], did: ['did'], it: ['it'], think: ['sink'], no: ['no'], go: ['go'],
      wow: ['wau'], lit: ['lit'], cap: ['käp'], big: ['big'], ez: ['is'], gg: ['dschi dschi', 'gg'],
    },
    'de-en': {
      krass: ['crass', 'kras'], läuft: ['loyft', 'loift'], bei: ['by', 'bye'], dir: ['dear', 'deer'], ehrenmann: ['aaron man', 'erenman'],
      digga: ['digger'], diggi: ['diggy'], alter: ['alter'], geil: ['guile', 'gail'], nein: ['nine', 'nain'], schade: ['shada'],
      mist: ['mist'], geschafft: ['geshaft'], jawohl: ['yavol'], gewonnen: ['gevonen'], applaus: ['applause'], peinlich: ['pinelich'],
      feuer: ['foyer'], heiß: ['hice', 'heiss'], liebe: ['leeba'], herz: ['hertz'], süß: ['suess', 'zeus'], falsch: ['falsh'],
      stimmt: ['shtimt'], nicht: ['nikt', 'nisht'], trommelwirbel: ['tromelvirbel'], warte: ['varta'], gut: ['goot'],
      gespielt: ['geshpeelt'], lustig: ['lustig'], witzig: ['vitsig'], wahnsinn: ['vahnsin'], unfassbar: ['unfasbar'],
      kohle: ['cola'], reich: ['rike'], brennt: ['brent'], geld: ['gelt'], bruder: ['brooder'], schwede: ['shveda'],
      plan: ['plan'], kein: ['kine'], safe: ['safe'], lost: ['lost'], jackpot: ['jackpot'], cringy: ['cringy'], mega: ['mega'],
      verkackt: ['ferkakt'], niemals: ['neemals'], wunderbar: ['vunderbar'], spitze: ['shpitsa'], hammer: ['hammer'],
    },
  };

  // ---- generic grapheme rules: [regex, replacement] applied in order to one token -------------------
  // A rule never sees the output of an earlier one (applyRules shields replacements), but a longer
  // pattern must still precede its substrings (tsch before sch, sch before ch).
  const RULES = {
    'en-tr': [
      [/^wh/g, 'v'], [/sh/g, 'ş'], [/ch/g, 'ç'], [/th/g, 't'], [/ph/g, 'f'], [/ee/g, 'i'], [/oo/g, 'u'], [/ea/g, 'i'],
      [/ay$/g, 'ey'], [/ai/g, 'ey'], [/ou/g, 'au'], [/c(?=[eiy])/g, 's'], [/c/g, 'k'], [/x/g, 'ks'], [/qu/g, 'kv'], [/q/g, 'k'],
      [/j/g, 'c'], [/w/g, 'v'], [/y(?=[^aeiouı]|$)/g, 'i'], [/(.)\1/g, '$1'],
    ],
    'de-tr': [
      [/tsch/g, 'ç'], [/sch/g, 'ş'], [/^st/g, 'şt'], [/^sp/g, 'şp'], [/ch/g, 'h'], [/ei/g, 'ay'], [/äu|eu/g, 'oy'], [/ie/g, 'i'],
      [/ä/g, 'e'], [/ß/g, 's'], [/tz|z/g, 'ts'], [/ck/g, 'k'], [/qu/g, 'kv'], [/x/g, 'ks'], [/ph/g, 'f'], [/v/g, 'f'], [/w/g, 'v'],
      [/j/g, 'y'], [/([aeiou])h(?=[^aeiou]|$)/g, '$1'], [/(.)\1/g, '$1'],
    ],
    'tr-de': [
      [/j/g, 'sch'], [/ş/g, 'sch'], [/ç/g, 'tsch'], [/c/g, 'dsch'], [/ğ/g, ''], [/ı/g, 'i'], [/y/g, 'j'], [/v/g, 'w'], [/z/g, 's'],
    ],
    'tr-en': [
      [/j/g, 'zh'], [/ş/g, 'sh'], [/ç/g, 'ch'], [/c/g, 'j'], [/ğ/g, ''], [/ı/g, 'i'], [/ö/g, 'o'], [/ü/g, 'u'],
    ],
    'en-de': [
      [/ch/g, 'tsch'], [/sh/g, 'sch'], [/th/g, 's'], [/j/g, 'dsch'], [/ee/g, 'i'], [/oo/g, 'u'], [/ay$/g, 'ey'], [/ai/g, 'ei'],
      [/c(?=[eiy])/g, 's'], [/c/g, 'k'], [/y(?=[^aeiou]|$)/g, 'i'], [/ou/g, 'au'],
    ],
    'de-en': [
      [/tsch/g, 'ch'], [/sch/g, 'sh'], [/ch/g, 'k'], [/ei/g, 'ai'], [/äu|eu/g, 'oy'], [/ie/g, 'ee'], [/ä/g, 'e'], [/ö/g, 'o'],
      [/ü/g, 'u'], [/ß/g, 'ss'], [/tz|z/g, 'ts'], [/qu/g, 'kv'], [/v/g, 'f'], [/w/g, 'v'], [/j/g, 'y'],
    ],
  };

  const TR_MARK = /[ışğçİŞĞÇ]/;
  const DE_MARK = /[äßÄ]/;
  const TR_WORDS = new Set(['yok', 'var', 'abi', 'aynen', 'hadi', 'oha', 'helal', 'olsun', 'kral', 'efsane', 'evet', 'tamam', 'kanka', 'lan', 'bu', 'ne', 'ya', 'be']);
  const DE_WORDS = new Set(['krass', 'alter', 'digga', 'nein', 'geil', 'bruder', 'mist', 'schade', 'geschafft', 'jawohl', 'applaus', 'feuer', 'liebe', 'herz', 'falsch', 'nicht', 'warte', 'gut', 'und', 'der', 'die', 'das', 'ich', 'bei', 'dir', 'kein', 'plan']);
  const EN_WORDS = new Set(['no', 'way', "let's", 'lets', 'go', 'sheesh', 'what', 'the', 'bruh', 'cringe', 'insane', 'nice', 'cool', 'fire', 'money', 'cash', 'love', 'funny', 'never', 'fail', 'win', 'yes', 'wow', 'big', 'slay', 'hype', 'goat', 'rizz', 'sus', 'clutch', 'mind', 'blown', 'good', 'game']);

  function family(tag) {
    const m = String(tag || '')
      .toLowerCase()
      .match(/^(de|tr|en)(?=$|[-_])/);
    return m ? m[1] : null;
  }

  function lower(text) {
    const s = String(text == null ? '' : text);
    try {
      return (TR_MARK.test(s) ? s.toLocaleLowerCase('tr') : s.toLowerCase()).replace(/i̇/g, 'i');
    } catch (_) {
      return s.toLowerCase();
    }
  }

  function clean(text) {
    return lower(text)
      .replace(/[’´`]/g, "'")
      .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Best guess of a keyword's language from its letters and a few marker words; null when unsure. */
  function guess(keyword) {
    const text = clean(keyword);
    if (!text) return null;
    if (TR_MARK.test(text)) return 'tr';
    if (DE_MARK.test(text)) return 'de';
    const score = { de: 0, tr: 0, en: 0 };
    for (const tok of text.split(' ')) {
      if (TR_WORDS.has(tok)) score.tr++;
      if (DE_WORDS.has(tok)) score.de++;
      if (EN_WORDS.has(tok)) score.en++;
      if (/[öü]/.test(tok)) score.tr += 0.5, (score.de += 0.5);
    }
    let best = null;
    for (const f of FAMILIES) if (score[f] > 0 && (best == null || score[f] > score[best])) best = f;
    if (best == null) return null;
    const ties = FAMILIES.filter((f) => score[f] === score[best]);
    return ties.length === 1 ? best : null;
  }

  // Replacements are emitted upper-case so that no later (lower-case) rule rewrites them, then the
  // result is lower-cased the Turkish way (I -> ı, İ -> i keeps dotless/dotted i intact).
  function applyRules(token, rules) {
    let s = token;
    for (const [re, rep] of rules) s = s.replace(re, rep.toLocaleUpperCase('tr'));
    return s.toLocaleLowerCase('tr');
  }

  /** Per-token options: dictionary first, then the generic respelling, then the token itself. */
  function tokenOptions(token, pair) {
    const out = [];
    const d = DICT[pair] && DICT[pair][token];
    if (d) for (const v of d) if (!out.includes(v)) out.push(v);
    const g = applyRules(token.replace(/'/g, ''), RULES[pair] || []);
    if (g && !out.includes(g)) out.push(g);
    const bare = token.replace(/'/g, '');
    if (bare && !out.includes(bare)) out.push(bare);
    if (!out.includes(token)) out.push(token);
    return out;
  }

  /**
   * Respellings of `keyword` as a `to` recognizer would write a `from` word.
   * @returns {string[]} without the keyword itself; [] for unknown pairs / empty input
   */
  function variants(keyword, opts) {
    const from = family(opts && opts.from);
    const to = family(opts && opts.to);
    const text = clean(keyword);
    if (!from || !to || from === to || !text) return [];
    const pair = `${from}-${to}`;
    if (!DICT[pair] && !RULES[pair]) return [];
    const out = [];
    const add = (v) => {
      const s = v.replace(/\s+/g, ' ').trim();
      if (!s || s === text || out.includes(s)) return;
      out.push(s);
    };
    const phrase = DICT[pair] && DICT[pair][text];
    if (phrase) for (const v of phrase) add(v);
    const tokens = text.split(' ');
    const options = tokens.map((t) => tokenOptions(t, pair));
    // Cartesian product, breadth-first so that "all tokens respelled" and "one token respelled" come first.
    const combos = [[]];
    for (const opt of options) {
      const next = [];
      for (const c of combos) for (const o of opt) next.push(c.concat(o));
      combos.splice(0, combos.length, ...next.slice(0, 64));
    }
    for (const c of combos) add(c.join(' '));
    // Joined form for short two-word memes ("no vey" -> "novey", "lets go" -> "letsgo").
    if (tokens.length === 2) {
      for (const c of combos.slice(0, 4)) {
        if (c.every((t) => t.length <= 4 && !t.includes(' '))) add(c.join(''));
      }
    }
    return out.slice(0, MAX_VARIANTS);
  }

  /**
   * Aliases for a keyword list given the primary recognizer language: every source language other
   * than the primary (narrowed by guess()) contributes its respellings.
   * @returns {Object<string, string[]>} keyword (as given) -> variants
   */
  function expand(keywords, primaryLang) {
    const to = family(primaryLang);
    const out = {};
    if (!to || !Array.isArray(keywords)) return out;
    for (const keyword of keywords) {
      if (typeof keyword !== 'string') continue;
      const g = guess(keyword);
      if (g === to) {
        out[keyword] = [];
        continue;
      }
      const sources = g ? [g] : FAMILIES.filter((f) => f !== to);
      const list = [];
      for (const from of sources) {
        for (const v of variants(keyword, { from, to })) if (!list.includes(v)) list.push(v);
      }
      out[keyword] = list.slice(0, MAX_VARIANTS);
    }
    return out;
  }

  return { variants, expand, guess, family, FAMILIES, MAX_VARIANTS, DICT, RULES };
});
