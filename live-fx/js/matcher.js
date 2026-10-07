// LiveFX – keyword matcher. Turns a (possibly still-interim) speech transcript into fired triggers.
//
// Speech recognition delivers the same utterance many times while it grows
// ("ich", "ich hab", "ich hab das", "ich hab das geschafft"). We therefore count
// how often each keyword occurs in the *current* utterance and only fire for
// occurrences we have not fired for yet. Per-trigger cooldowns and a global
// rate limit keep the overlay from turning into a slot machine.
//
// Matching is token based: `normalize(text).split(' ')` is compared window-wise
// against the normalized keyword tokens. With `tolerance: 'off'` (the default) a
// token only matches when it is byte-identical, which reproduces the historic
// substring counting 1:1. With 'medium' / 'high' a token may also match after
// diacritic folding or with a small Damerau-Levenshtein distance – see
// docs/DESIGN-RECOGNITION.md section A for the binding rules.
//
// LiveFX 2.2 (latency): an occurrence that is blocked by a cooldown / the global gap is NOT
// consumed any more – it is re-evaluated on the next interim/final of the same utterance and fires
// once the block has passed. `prefixFire` fires a unique word prefix on an interim result before the
// full word arrives. `setPhonetic(lang)` indexes rule-based respellings (js/phonetic.js) as aliases.
//
// UMD: also loaded by Node (server/state.js, server/smart.js).
(function (global) {
  'use strict';

  // Turkish signal: dotless ı / dotted İ / ş / ğ -> use the Turkish case mapping (İ -> i, I -> ı);
  // everywhere else the plain mapping, with the stray combining dot of `'İ'.toLowerCase()` removed.
  const TR_SIGNAL = /[ıİşŞğĞ]/;

  function lower(text) {
    if (TR_SIGNAL.test(text)) {
      try {
        return text.toLocaleLowerCase('tr');
      } catch (_) {
        /* fall through */
      }
    }
    return text.toLowerCase().replace(/i̇/g, 'i');
  }

  function normalize(text) {
    return lower(text || '')
      .replace(/[’´`]/g, "'")
      .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const TOLERANCES = Object.freeze(['off', 'medium', 'high']);
  const LANGS = Object.freeze(['de', 'tr', 'en']);
  const PIECE_OFFSETS = [0, 3, 6];
  const DEFAULT_GLOBAL_MIN_GAP = 0.5; // seconds between any two effects (2.2: was 1.2)
  const PREFIX_MIN = 4; // spoken prefix length needed for prefix firing
  const PREFIX_KEYWORD_MIN = 6; // ... and the keyword it completes to must be at least this long

  // Frequent words (>= 5 chars) that speech recognizers hear all the time. They are never
  // fuzzy-matched against keywords ("schön" must not fire for "schon"). None of them may
  // equal a keyword token of the default set or of a pack (test/matcher-fuzzy.test.js asserts it).
  const STOPWORDS = Object.freeze({
    de: Object.freeze([
      'immer', 'wieder', 'heute', 'gerade', 'eigentlich', 'vielleicht', 'dieser', 'diese', 'dieses',
      'haben', 'hatte', 'wurde', 'werden', 'waren', 'können', 'könnte', 'sollte', 'müssen', 'viele',
      'einfach', 'wirklich', 'natürlich', 'ziemlich', 'gleich', 'nachher', 'vorher', 'damals',
      'irgendwie', 'irgendwas', 'sowieso', 'gesagt', 'gemacht', 'machen', 'sagen', 'gehen', 'kommen',
      'wollen', 'sollen', 'zwischen', 'während', 'nachdem', 'trotzdem', 'deshalb', 'deswegen',
      'andere', 'anderen', 'keine', 'unsere', 'welche', 'etwas', 'nichts', 'jemand', 'niemand',
      'glaube', 'denke', 'wissen', 'finde', 'total', 'richtig', 'ungefähr', 'bisschen', 'nämlich',
      'übrigens', 'allerdings', 'jedenfalls', 'zumindest', 'hoffentlich', 'wahrscheinlich', 'sicher',
      'bestimmt', 'gestern', 'selber', 'selbst', 'dabei', 'damit', 'davon', 'dafür', 'darauf',
      'gewesen', 'geworden',
    ]),
    tr: Object.freeze([
      'şimdi', 'sonra', 'bugün', 'yarın', 'böyle', 'şöyle', 'biraz', 'kadar', 'çünkü', 'zaten',
      'belki', 'hemen', 'ancak', 'fakat', 'yoksa', 'aslında', 'gerçekten', 'tamamen', 'herkes',
      'hiçbir', 'bütün', 'bazen', 'genelde', 'galiba', 'herhalde', 'mesela', 'zaman', 'dakika',
      'önceden', 'bunlar', 'şunlar', 'onlar', 'bunun', 'benim', 'senin', 'bizim', 'sizin', 'kendi',
      'kendim', 'kendisi', 'burada', 'orada', 'şurada', 'nerede', 'nasıl', 'neden', 'niçin', 'kimse',
      'hepsi', 'fazla', 'birkaç', 'birçok', 'dedim', 'dedin', 'diyor', 'diyorum', 'diyorsun',
      'olarak', 'olduğu', 'şekilde', 'arasında', 'içinde', 'dışında', 'yanında', 'boyunca',
      'hakkında', 'devam', 'biliyorum', 'bilmiyorum', 'sanırım', 'istiyorum', 'gidiyorum',
      'geliyorum', 'bakıyorum', 'yapıyorum', 'hayat',
    ]),
    en: Object.freeze([
      'there', 'their', 'about', 'would', 'could', 'should', 'really', 'thought', 'because', 'maybe',
      'though', 'although', 'which', 'where', 'while', 'these', 'those', 'other', 'another', 'after',
      'before', 'again', 'still', 'always', 'every', 'something', 'anything', 'nothing', 'everything',
      'someone', 'anyone', 'people', 'being', 'going', 'doing', 'having', 'getting', 'actually',
      'basically', 'literally', 'probably', 'definitely', 'honestly', 'pretty', 'kinda', 'gonna',
      'wanna', 'right', 'around', 'through', 'between', 'since', 'until', 'under', 'little', 'might',
      'first', 'second', 'minute', 'minutes', 'hours', 'today', 'yesterday', 'tonight', 'already',
      'almost', 'enough', 'quite', 'rather', 'whatever', 'whenever', 'however', 'anyway', 'anyways',
      'thing', 'things', 'stuff', 'alright', 'guess', 'means', 'saying', 'looks', 'looking', 'seems',
    ]),
  });

  // ---- folding -------------------------------------------------------------------------------

  // Confusion tables applied at 'high' (after the medium fold, before collapsing doubled letters).
  const CONFUSION_ALL = [
    [/ph/g, 'f'], [/ck/g, 'k'], [/th/g, 't'], [/tz/g, 'z'], [/dt/g, 't'], [/y/g, 'i'],
  ];
  const CONFUSION_LANG = {
    de: [[/ae/g, 'a'], [/oe/g, 'o'], [/ue/g, 'u'], [/w/g, 'v']],
    tr: [[/w/g, 'v'], [/x/g, 'ks']],
    en: [],
  };

  // medium: NFD + strip marks turns ş->s, ç->c, ğ->g, ä->a …; ı (dotless) has no decomposition.
  function foldMedium(token) {
    return token
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .replace(/ı/g, 'i')
      .replace(/ß/g, 'ss')
      .replace(/'/g, '');
  }

  function foldHigh(token, lang) {
    let s = foldMedium(token);
    for (const [re, rep] of CONFUSION_LANG[lang] || []) s = s.replace(re, rep);
    for (const [re, rep] of CONFUSION_ALL) s = s.replace(re, rep);
    return s.replace(/(.)\1+/gu, '$1'); // collapse runs of the same letter ("ohaaa" -> "oha")
  }

  /**
   * Folds an already normalized token for comparison at the given tolerance level.
   * 'off' (or anything unknown) returns the token unchanged.
   */
  function fold(token, level, lang) {
    if (level === 'medium') return foldMedium(token);
    if (level === 'high') return foldHigh(token, normLang(lang));
    return token;
  }

  // Reusable rows for damerau() (grown on demand; the matcher is single-threaded).
  let dlRows = [new Int32Array(64), new Int32Array(64), new Int32Array(64)];

  /**
   * Damerau-Levenshtein distance (optimal string alignment) with a cut-off: returns
   * `max + 1` as soon as the distance is known to exceed `max`.
   */
  function damerau(a, b, max = Infinity) {
    if (a === b) return 0;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    if (!la) return lb;
    if (!lb) return la;
    if (dlRows[0].length <= lb) dlRows = dlRows.map(() => new Int32Array(lb + 1));
    let [prev2, prev, cur] = dlRows;
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      let rowMin = i;
      const ca = a.charCodeAt(i - 1);
      const pa = i > 1 ? a.charCodeAt(i - 2) : -1;
      for (let j = 1; j <= lb; j++) {
        const cb = b.charCodeAt(j - 1);
        let v = prev[j - 1] + (ca === cb ? 0 : 1);
        const del = prev[j] + 1;
        if (del < v) v = del;
        const ins = cur[j - 1] + 1;
        if (ins < v) v = ins;
        if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && pa === cb) {
          const tr = prev2[j - 2] + 1;
          if (tr < v) v = tr;
        }
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      const tmp = prev2;
      prev2 = prev;
      prev = cur;
      cur = tmp;
    }
    const d = prev[lb];
    return d > max ? max + 1 : d;
  }

  function normLang(lang) {
    if (!lang || typeof lang !== 'string') return null;
    const base = lang.toLowerCase().split(/[-_]/)[0];
    return LANGS.includes(base) ? base : null; // 'auto' and unknown -> null
  }

  /** Allowed edit distance for a keyword token of the given (normalized) length. */
  function allowedDistance(len, level) {
    if (len < 5) return 0;
    if (len < 9) return 1;
    return level === 'high' ? 2 : 1;
  }

  /** js/phonetic.js when loaded (browser global or Node require); null otherwise. */
  function phoneticModule() {
    if (global.LiveFXPhonetic) return global.LiveFXPhonetic;
    if (typeof require === 'function') {
      try {
        return require('./phonetic.js');
      } catch (_) {
        /* not available */
      }
    }
    return null;
  }

  // ---- matcher -------------------------------------------------------------------------------

  class Matcher {
    constructor(triggers, opts = {}) {
      this.globalMinGap = opts.globalMinGap ?? DEFAULT_GLOBAL_MIN_GAP; // seconds between any two effects
      this.prefixFire = !!opts.prefixFire; // fire a unique word prefix on interim results
      this._tolerance = TOLERANCES.includes(opts.tolerance) ? opts.tolerance : 'off';
      this._lang = normLang(opts.lang);
      this._stop = buildStopSet(this._lang);
      this._phoneticLang = normLang(opts.phonetic);
      this.stats = { prefixFires: 0, aliasHits: 0 };
      this._stamp = 0; // per-token scan counter (see _fuzzyCandidates)
      this.setTriggers(triggers);
      this.lastFireAt = new Map(); // triggerId -> timestamp (s)
      this.lastGlobalFire = -Infinity;
      this.firedInUtterance = new Map(); // triggerId -> count already fired for the current utterance
      this._prefixPending = new Map(); // triggerId -> [{ start, exact }] prefix fires waiting for the full word
    }

    get tolerance() {
      return this._tolerance;
    }

    /** 'off' | 'medium' | 'high'; anything else -> 'off'. No index rebuild needed. */
    setTolerance(level) {
      this._tolerance = TOLERANCES.includes(level) ? level : 'off';
      return this._tolerance;
    }

    get lang() {
      return this._lang;
    }

    /** 'de' | 'tr' | 'en' (region suffix ignored: 'de-AT' -> 'de'); 'auto' / null -> all stop-word lists. */
    setLang(lang) {
      const next = normLang(lang);
      if (next === this._lang) return next;
      this._lang = next;
      this._stop = buildStopSet(next);
      this._buildIndex(); // the high fold depends on the language
      return next;
    }

    get phonetic() {
      return this._phoneticLang;
    }

    /**
     * Primary recognizer language ('tr-TR' -> 'tr'); null / 'auto' / 'off' switches aliases off.
     * Keywords of the other languages get rule-based respellings (js/phonetic.js) indexed as aliases
     * so a Turkish recognizer still catches "no way" heard as "no vey". Rebuilds the index.
     */
    setPhonetic(lang) {
      const next = normLang(lang);
      if (next === this._phoneticLang) return next;
      this._phoneticLang = next;
      this._buildIndex();
      return next;
    }

    setTriggers(triggers) {
      // Keep every trigger (fireById must report disabled ones), match only the enabled ones.
      this.all = (triggers || []).map((t, i) => ({
        ...t,
        _key: t.id || `idx-${i}`,
        _keywords: (t.keywords || []).map(normalize).filter(Boolean),
      }));
      this.triggers = this.all.filter((t) => t.enabled !== false);
      this._buildIndex();
    }

    /** Alias strings per trigger (index aligned with this.triggers): [[{keyword, alias}]]. */
    _aliases() {
      const lang = this._phoneticLang;
      const out = this.triggers.map(() => []);
      if (!lang) return out;
      const ph = phoneticModule();
      if (!ph || typeof ph.expand !== 'function') return out;
      const real = new Set();
      for (const trig of this.triggers) for (const k of trig._keywords) real.add(k);
      this.triggers.forEach((trig, ti) => {
        let map;
        try {
          map = ph.expand(trig._keywords, lang);
        } catch (_) {
          return;
        }
        const seen = new Set();
        for (const keyword of trig._keywords) {
          const variants = map && map[keyword];
          if (!Array.isArray(variants)) continue;
          for (const v of variants) {
            const alias = normalize(v);
            if (!alias || alias === keyword || real.has(alias) || seen.has(alias)) continue; // never shadow a real keyword
            seen.add(alias);
            out[ti].push({ keyword, alias });
          }
        }
      });
      return out;
    }

    _buildIndex() {
      const lang = this._lang;
      const kws = []; // kwRef list, idx === position
      const exactIndex = new Map(); // token -> [tokenRef]
      const exactTokens = new Set(); // real keyword tokens (precision guard 2; aliases excluded)
      const prefixIndex = new Map(); // first PREFIX_MIN chars -> [tokenRef] (real tokens, len > PREFIX_MIN)
      // DL <= 1 buckets: one edit on a folded token of >= 5 chars leaves its first two or its last
      // two characters intact and changes the length by at most one, so `pre`/`suf` are keyed by
      // (2-char prefix | 2-char suffix) + folded length. Shorter folds land in `rest` (always compared).
      const levels = {
        medium: { foldIndex: new Map(), pre: new Map(), suf: new Map(), rest: [] },
        high: { foldIndex: new Map(), pre: new Map(), suf: new Map(), pieces: new Map(), chars: new Map(), rest: [] },
      };
      const bucket1 = (lv, f, ref) => {
        if (f.length < 5) {
          lv.rest.push(ref);
          return;
        }
        push2(lv.pre, f.slice(0, 2), f.length, ref);
        push2(lv.suf, f.slice(-2), f.length, ref);
      };
      const push = (map, key, ref) => {
        const arr = map.get(key);
        if (arr) arr.push(ref);
        else map.set(key, [ref]);
      };
      // Two-level bucket: key -> { [length]: [tokenRef] } (one Map lookup per key, lengths by property).
      const push2 = (map, key, len, ref) => {
        let byLen = map.get(key);
        if (!byLen) {
          byLen = Object.create(null);
          map.set(key, byLen);
        }
        const arr = byLen[len];
        if (arr) arr.push(ref);
        else byLen[len] = [ref];
      };
      const byTrigger = []; // aligned with this.triggers: [kwRef]
      const aliases = this._aliases();
      const addKeyword = (trig, refs, keyword, alias) => {
        const text = alias || keyword;
        const parts = text.split(' ');
        const kw = { idx: kws.length, trig, keyword, alias: alias || null, tokens: [], n: parts.length };
        kws.push(kw);
        refs.push(kw);
        parts.forEach((exact, pos) => {
          const foldM = foldMedium(exact);
          const foldH = foldHigh(exact, lang);
          const ref = { kw, pos, exact, foldM, foldH, len: exact.length, stamp: 0 };
          kw.tokens.push(ref);
          push(exactIndex, exact, ref);
          if (!alias) {
            exactTokens.add(exact);
            if (ref.len > PREFIX_MIN) push(prefixIndex, exact.slice(0, PREFIX_MIN), ref);
          }
          if (alias || ref.len < 5) return; // aliases + short tokens: exact only at every level
          push(levels.medium.foldIndex, foldM, ref);
          push(levels.high.foldIndex, foldH, ref);
          bucket1(levels.medium, foldM, ref); // medium: DL <= 1 for every token >= 5
          if (ref.len < 9) {
            bucket1(levels.high, foldH, ref); // high: DL <= 1 (high fold)
          } else if (foldH.length >= 8) {
            // high: DL <= 2 -> pigeonhole pieces of the folded form. Three 2-char pieces
            // separated by a 1-char gap: a transposition touches at most one piece, so two
            // edits leave at least one piece intact (found as a substring of the spoken fold).
            for (const at of PIECE_OFFSETS) push2(levels.high.pieces, foldH.substr(at, 2), foldH.length, ref);
          } else if (foldH.length >= 5) {
            // high, short fold (collapsed letters): three single chars at offsets 0/2/4 – a
            // transposition touches at most one of them, so one survives two edits.
            for (const at of PIECE_OFFSETS) push2(levels.high.chars, foldH[at / 3 * 2], foldH.length, ref);
          } else {
            levels.high.rest.push(ref); // folded form too short for pieces: always compared
          }
        });
      };
      this.triggers.forEach((trig, ti) => {
        const refs = [];
        byTrigger.push(refs);
        for (const keyword of trig._keywords) addKeyword(trig, refs, keyword, null);
        for (const { keyword, alias } of aliases[ti]) addKeyword(trig, refs, keyword, alias);
      });
      this._index = { kws, byTrigger, exactIndex, exactTokens, prefixIndex, levels };
    }

    _cooldownState(trig, now) {
      const last = this.lastFireAt.get(trig._key) ?? -Infinity;
      if (now - last < (trig.cooldown ?? 3)) return 'cooldown';
      if (now - this.lastGlobalFire < this.globalMinGap) return 'gap';
      return null;
    }

    _markFired(trig, now) {
      this.lastFireAt.set(trig._key, now);
      this.lastGlobalFire = now;
    }

    /**
     * Fires a trigger by id outside of speech matching (hotkeys, API, smart mode) while
     * honouring the same cooldown / global gap rules.
     * @returns {{trigger: object|null, blocked: null|'cooldown'|'gap'|'disabled'|'unknown'}}
     */
    fireById(id, now = Date.now() / 1000) {
      const trig = (this.all || []).find((t) => t.id === id);
      if (!trig) return { trigger: null, blocked: 'unknown' };
      if (trig.enabled === false) return { trigger: trig, blocked: 'disabled' };
      const blocked = this._cooldownState(trig, now);
      if (blocked) return { trigger: trig, blocked };
      this._markFired(trig, now);
      return { trigger: trig, blocked: null };
    }

    /** Call when the recognizer finalizes an utterance so counters reset. */
    endUtterance() {
      this.firedInUtterance.clear();
      this._prefixPending.clear();
    }

    /**
     * Token candidates for one spoken token: exact matches plus (tolerance permitting)
     * fold-equal and edit-distance matches. Returns [[tokenRef, fuzzy], ...].
     */
    _candidates(s) {
      const { exactIndex, exactTokens, levels } = this._index;
      const level = this._tolerance;
      const out = [];
      const exact = exactIndex.get(s);
      if (exact) for (const ref of exact) out.push([ref, false]);
      if (level === 'off') return out;
      // Precision guard 2: a spoken token that is itself a keyword token of any trigger,
      // or a common stop-word, is only ever matched exactly.
      if (exactTokens.has(s) || this._stop.has(s)) return out;
      const lv = levels[level];
      const f = level === 'high' ? foldHigh(s, this._lang) : foldMedium(s);
      const foldKey = level === 'high' ? 'foldH' : 'foldM';
      const stamp = ++this._stamp; // marks refs already compared for this token (no Set per token)
      const eq = lv.foldIndex.get(f);
      if (eq) {
        for (const ref of eq) {
          ref.stamp = stamp;
          out.push([ref, true]);
        }
      }
      const slen = s.length;
      const tryRef = (ref) => {
        if (ref.stamp === stamp) return;
        ref.stamp = stamp;
        const max = allowedDistance(ref.len, level);
        if (Math.abs(slen - ref.len) > max) return; // precision guard 1
        if (damerau(f, ref[foldKey], max) <= max) out.push([ref, true]);
      };
      const flen = f.length;
      if (flen) {
        const tryBucket = (byLen, spread) => {
          if (!byLen) return;
          for (let d = -spread; d <= spread; d++) {
            const arr = byLen[flen + d];
            if (arr) for (const ref of arr) tryRef(ref);
          }
        };
        tryBucket(lv.pre.get(f.slice(0, 2)), 1);
        tryBucket(lv.suf.get(f.slice(-2)), 1);
        for (const ref of lv.rest) tryRef(ref);
        if (level === 'high') {
          // DL <= 2 changes the folded length by at most two -> pieces are bucketed by length as well.
          for (let p = 0; p + 1 < flen; p++) tryBucket(lv.pieces.get(f.substr(p, 2)), 2);
          if (lv.chars.size) for (let p = 0; p < flen; p++) tryBucket(lv.chars.get(f[p]), 2);
        }
      }
      return out;
    }

    /**
     * Scans the tokens and returns every complete keyword occurrence:
     * Map<kwIdx, Array<{start, fuzzy}>> (each token counts once per (kw, pos, i)).
     */
    _scan(tokens) {
      const hits = new Map(); // kwIdx -> Map(start -> slots[]) where slots[pos] = 0 exact | 1 fuzzy | undefined
      for (let i = 0; i < tokens.length; i++) {
        const cands = this._candidates(tokens[i]);
        for (const [ref, fuzzy] of cands) {
          const start = i - ref.pos;
          if (start < 0 || start + ref.kw.n > tokens.length) continue;
          let byStart = hits.get(ref.kw.idx);
          if (!byStart) {
            byStart = new Map();
            hits.set(ref.kw.idx, byStart);
          }
          let slots = byStart.get(start);
          if (!slots) {
            slots = new Array(ref.kw.n);
            byStart.set(start, slots);
          }
          const v = fuzzy ? 1 : 0;
          if (slots[ref.pos] === undefined || v < slots[ref.pos]) slots[ref.pos] = v; // exact wins
        }
      }
      const occ = new Map();
      for (const [idx, byStart] of hits) {
        const list = [];
        for (const [start, slots] of byStart) {
          let complete = true;
          let fuzzy = false;
          for (let p = 0; p < slots.length; p++) {
            if (slots[p] === undefined) {
              complete = false;
              break;
            }
            if (slots[p] === 1) fuzzy = true;
          }
          if (complete) list.push({ start, fuzzy });
        }
        if (list.length) occ.set(idx, list);
      }
      return occ;
    }

    /**
     * Prefix firing: the last spoken token (>= 4 chars, not a keyword token / stop-word) that is a
     * strict prefix of exactly one real keyword token across all triggers, where that keyword is a
     * single word of >= 6 chars. Returns the tokenRef or null.
     */
    _prefixCandidate(tokens) {
      const i = tokens.length - 1;
      const s = tokens[i];
      if (!s || s.length < PREFIX_MIN) return null;
      const { exactIndex, exactTokens, prefixIndex } = this._index;
      if (exactTokens.has(s) || exactIndex.has(s) || this._stop.has(s)) return null;
      const bucket = prefixIndex.get(s.slice(0, PREFIX_MIN));
      if (!bucket) return null;
      let found = null;
      for (const ref of bucket) {
        if (ref.len <= s.length || !ref.exact.startsWith(s)) continue;
        if (found) return null; // ambiguous
        found = ref;
      }
      if (!found || found.kw.n !== 1 || found.len < PREFIX_KEYWORD_MIN) return null;
      return found;
    }

    /**
     * Pure scan without cooldown / utterance side effects. Token indices refer to
     * `normalize(text).split(' ')`; `end` is exclusive. With `prefixFire` on and `opts.final`
     * false (the default) a qualifying last token is reported as `{prefix: true}`.
     * @returns {Array<{trigger, keyword, fuzzy, spoken, start, end, alias?, prefix?}>}
     */
    explain(transcript, opts) {
      const final = !!(opts && opts.final);
      const text = normalize(transcript);
      if (!text) return [];
      const tokens = text.split(' ');
      const occ = this._scan(tokens);
      const out = [];
      const seen = new Map(); // trigger|keyword|start -> index in out (alias + real keyword at one position = one hit)
      for (const [idx, list] of occ) {
        const kw = this._index.kws[idx];
        for (const { start, fuzzy } of list) {
          const h = {
            trigger: kw.trig,
            keyword: kw.keyword,
            fuzzy: fuzzy || !!kw.alias,
            spoken: tokens.slice(start, start + kw.n).join(' '),
            start,
            end: start + kw.n,
          };
          if (kw.alias) h.alias = true;
          const key = `${kw.trig._key}|${kw.keyword}|${start}`;
          const at = seen.get(key);
          if (at === undefined) {
            seen.set(key, out.length);
            out.push(h);
          } else if (rank(h) < rank(out[at])) {
            out[at] = h; // exact beats alias beats fuzzy
          }
        }
      }
      if (this.prefixFire && !final) {
        const ref = this._prefixCandidate(tokens);
        if (ref) {
          const start = tokens.length - 1;
          out.push({ trigger: ref.kw.trig, keyword: ref.kw.keyword, fuzzy: false, spoken: tokens[start], start, end: start + 1, prefix: true });
        }
      }
      out.sort((a, b) => a.start - b.start || b.keyword.length - a.keyword.length || (a.fuzzy ? 1 : 0) - (b.fuzzy ? 1 : 0));
      return out;
    }

    /**
     * @param {string} transcript current (interim or final) utterance text
     * @param {number} now seconds
     * @param {{final?: boolean}} [opts] `final: true` for the final result of an utterance (no prefix firing)
     * @returns {Array<{trigger, keyword, fuzzy, spoken, alias?, prefix?}>} triggers that should fire now
     */
    process(transcript, now = Date.now() / 1000, opts) {
      const final = !!(opts && opts.final);
      const text = normalize(transcript);
      const fired = [];
      if (!text) return fired;
      const tokens = text.split(' ');
      const occ = this._scan(tokens);

      // Collect every trigger with a new occurrence, then let the most specific
      // (longest) keyword go first: "oh nein" (fail) beats "nein" (no).
      const candidates = [];
      const { byTrigger } = this._index;
      const inRound = new Set();
      for (let ti = 0; ti < this.triggers.length; ti++) {
        const trig = this.triggers[ti];
        const refs = byTrigger[ti];
        let occurrences = 0;
        let matched = null; // { keyword, n, fuzzy, start, alias }
        let starts = null; // keyword|start of counted occurrences (an alias never counts twice)
        for (const kw of refs) {
          const list = occ.get(kw.idx);
          if (!list) continue;
          if (refs.length > trig._keywords.length) {
            // aliases present: count every (keyword, start) once
            if (!starts) starts = new Set();
            for (const o of list) {
              const key = `${kw.keyword}|${o.start}`;
              if (!starts.has(key)) {
                starts.add(key);
                occurrences++;
              }
            }
          } else {
            occurrences += list.length;
          }
          // Prefer an exact occurrence of this keyword for `spoken`.
          let best = list[0];
          for (const o of list) {
            if (!o.fuzzy && best.fuzzy) best = o;
          }
          const fuzzy = best.fuzzy || !!kw.alias;
          // Longest keyword wins; on equal length exact beats fuzzy.
          if (!matched || kw.keyword.length > matched.keyword.length ||
              (kw.keyword.length === matched.keyword.length && matched.fuzzy && !fuzzy)) {
            matched = { keyword: kw.keyword, n: kw.n, fuzzy, start: best.start, alias: !!kw.alias };
          }
        }
        // Prefix fires of this utterance: still growing -> counted; completed -> now a real
        // occurrence; turned into another word -> forgotten (and no longer consumed).
        const alive = this._settlePrefixes(trig, refs, tokens, occ);
        const already = this.firedInUtterance.get(trig._key) || 0;
        if (occurrences + alive <= already || !matched) continue;
        inRound.add(trig._key);
        candidates.push({ trig, ti, matched, total: occurrences + alive, prefix: false });
      }

      if (this.prefixFire && !final) {
        const ref = this._prefixCandidate(tokens);
        if (ref) {
          const trig = ref.kw.trig;
          const start = tokens.length - 1;
          const pend = this._prefixPending.get(trig._key);
          const dup = pend && pend.some((p) => p.start === start);
          if (!inRound.has(trig._key) && !dup) {
            const ti = this.triggers.indexOf(trig);
            const already = this.firedInUtterance.get(trig._key) || 0;
            candidates.push({ trig, ti, matched: { keyword: ref.kw.keyword, n: 1, fuzzy: false, start, alias: false }, total: already + 1, prefix: true, exact: ref.exact });
          }
        }
      }

      // Longest keyword first; on a tie the most recently loaded trigger (array order) wins.
      candidates.sort((a, b) => b.matched.keyword.length - a.matched.keyword.length || b.ti - a.ti);

      for (const c of candidates) {
        const { trig, matched } = c;
        if (this._cooldownState(trig, now)) continue; // not consumed: re-evaluated on the next result
        this._markFired(trig, now);
        this.firedInUtterance.set(trig._key, c.total);
        const hit = {
          trigger: trig,
          keyword: matched.keyword,
          fuzzy: matched.fuzzy,
          spoken: matched.fuzzy || c.prefix ? tokens.slice(matched.start, matched.start + matched.n).join(' ') : matched.keyword,
        };
        if (matched.alias) {
          hit.alias = true;
          this.stats.aliasHits++;
        }
        if (c.prefix) {
          hit.prefix = true;
          this.stats.prefixFires++;
          const pend = this._prefixPending.get(trig._key);
          if (pend) pend.push({ start: matched.start, exact: c.exact });
          else this._prefixPending.set(trig._key, [{ start: matched.start, exact: c.exact }]);
        }
        fired.push(hit);
      }
      return fired;
    }

    /** Returns the number of prefix fires of `trig` whose word is still growing (see process()). */
    _settlePrefixes(trig, refs, tokens, occ) {
      const pend = this._prefixPending.get(trig._key);
      if (!pend || !pend.length) return 0;
      let alive = 0;
      for (let i = pend.length - 1; i >= 0; i--) {
        const p = pend[i];
        const tok = tokens[p.start];
        if (tok !== undefined && tok.length < p.exact.length && p.exact.startsWith(tok)) {
          alive++;
          continue;
        }
        pend.splice(i, 1);
        let realized = false;
        for (const kw of refs) {
          const list = occ.get(kw.idx);
          if (list && list.some((o) => o.start === p.start)) {
            realized = true;
            break;
          }
        }
        if (!realized) {
          const n = this.firedInUtterance.get(trig._key) || 0;
          if (n > 0) this.firedInUtterance.set(trig._key, n - 1);
        }
      }
      if (!pend.length) this._prefixPending.delete(trig._key);
      return alive;
    }
  }

  /** Hit precedence for one (trigger, keyword, position): exact 0, alias 1, fuzzy 2. */
  function rank(h) {
    return h.alias ? 1 : h.fuzzy ? 2 : 0;
  }

  function buildStopSet(lang) {
    const lists = lang ? [STOPWORDS[lang]] : LANGS.map((l) => STOPWORDS[l]);
    return new Set(lists.flat());
  }

  global.LiveFXMatcher = { Matcher, normalize, fold, damerau, TOLERANCES, STOPWORDS, DEFAULT_GLOBAL_MIN_GAP };
})(typeof window !== 'undefined' ? window : globalThis);
