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
// UMD: also loaded by Node (server/state.js, server/smart.js).
(function (global) {
  'use strict';

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[’´`]/g, "'")
      .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const TOLERANCES = Object.freeze(['off', 'medium', 'high']);
  const LANGS = Object.freeze(['de', 'tr', 'en']);
  const PIECE_OFFSETS = [0, 3, 6];

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

  // ---- matcher -------------------------------------------------------------------------------

  class Matcher {
    constructor(triggers, opts = {}) {
      this.globalMinGap = opts.globalMinGap ?? 1.2; // seconds between any two effects
      this._tolerance = TOLERANCES.includes(opts.tolerance) ? opts.tolerance : 'off';
      this._lang = normLang(opts.lang);
      this._stop = buildStopSet(this._lang);
      this.setTriggers(triggers);
      this.lastFireAt = new Map(); // triggerId -> timestamp (s)
      this.lastGlobalFire = -Infinity;
      this.firedInUtterance = new Map(); // triggerId -> count already fired for the current utterance
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

    _buildIndex() {
      const lang = this._lang;
      const kws = []; // kwRef list, idx === position
      const exactIndex = new Map(); // token -> [tokenRef]
      const exactTokens = new Set();
      const levels = {
        medium: { foldIndex: new Map(), first: new Map(), last: new Map() },
        high: { foldIndex: new Map(), first: new Map(), last: new Map(), pieces: new Map(), rest: [] },
      };
      const push = (map, key, ref) => {
        const arr = map.get(key);
        if (arr) arr.push(ref);
        else map.set(key, [ref]);
      };
      const byTrigger = []; // aligned with this.triggers: [kwRef]
      for (const trig of this.triggers) {
        const refs = [];
        byTrigger.push(refs);
        for (const keyword of trig._keywords) {
          const parts = keyword.split(' ');
          const kw = { idx: kws.length, trig, keyword, tokens: [], n: parts.length };
          kws.push(kw);
          refs.push(kw);
          parts.forEach((exact, pos) => {
            const foldM = foldMedium(exact);
            const foldH = foldHigh(exact, lang);
            const ref = { kw, pos, exact, foldM, foldH, len: exact.length };
            kw.tokens.push(ref);
            push(exactIndex, exact, ref);
            exactTokens.add(exact);
            if (ref.len < 5) return; // short tokens: exact only at every level
            push(levels.medium.foldIndex, foldM, ref);
            push(levels.high.foldIndex, foldH, ref);
            // medium: DL <= 1 for every token >= 5 -> first/last buckets on the folded form.
            push(levels.medium.first, foldM[0], ref);
            push(levels.medium.last, foldM[foldM.length - 1], ref);
            if (ref.len < 9) {
              // high: DL <= 1 -> first/last buckets (high fold)
              push(levels.high.first, foldH[0], ref);
              push(levels.high.last, foldH[foldH.length - 1], ref);
            } else if (foldH.length >= 8) {
              // high: DL <= 2 -> pigeonhole pieces of the folded form. Three 2-char pieces
              // separated by a 1-char gap: a transposition touches at most one piece, so two
              // edits leave at least one piece intact (found as a substring of the spoken fold).
              for (const at of PIECE_OFFSETS) push(levels.high.pieces, foldH.substr(at, 2), ref);
            } else {
              levels.high.rest.push(ref); // folded form too short for pieces: always compared
            }
          });
        }
      }
      this._index = { kws, byTrigger, exactIndex, exactTokens, levels };
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
      const seen = new Set();
      const eq = lv.foldIndex.get(f);
      if (eq) {
        for (const ref of eq) {
          seen.add(ref);
          out.push([ref, true]);
        }
      }
      const slen = s.length;
      const tryRef = (ref) => {
        if (seen.has(ref)) return;
        seen.add(ref);
        const max = allowedDistance(ref.len, level);
        if (Math.abs(slen - ref.len) > max) return; // precision guard 1
        if (damerau(f, ref[foldKey], max) <= max) out.push([ref, true]);
      };
      if (f.length) {
        const a = lv.first.get(f[0]);
        if (a) for (const ref of a) tryRef(ref);
        const b = lv.last.get(f[f.length - 1]);
        if (b) for (const ref of b) tryRef(ref);
        if (level === 'high') {
          for (let p = 0; p + 1 < f.length; p++) {
            const c = lv.pieces.get(f.substr(p, 2));
            if (c) for (const ref of c) tryRef(ref);
          }
          for (const ref of lv.rest) tryRef(ref);
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
     * Pure scan without cooldown / utterance side effects. Token indices refer to
     * `normalize(text).split(' ')`; `end` is exclusive.
     * @returns {Array<{trigger, keyword, fuzzy, spoken, start, end}>}
     */
    explain(transcript) {
      const text = normalize(transcript);
      if (!text) return [];
      const tokens = text.split(' ');
      const occ = this._scan(tokens);
      const out = [];
      for (const [idx, list] of occ) {
        const kw = this._index.kws[idx];
        for (const { start, fuzzy } of list) {
          out.push({
            trigger: kw.trig,
            keyword: kw.keyword,
            fuzzy,
            spoken: tokens.slice(start, start + kw.n).join(' '),
            start,
            end: start + kw.n,
          });
        }
      }
      out.sort((a, b) => a.start - b.start || b.keyword.length - a.keyword.length || (a.fuzzy ? 1 : 0) - (b.fuzzy ? 1 : 0));
      return out;
    }

    /**
     * @param {string} transcript current (interim or final) utterance text
     * @param {number} now seconds
     * @returns {Array<{trigger, keyword, fuzzy, spoken}>} triggers that should fire now
     */
    process(transcript, now = Date.now() / 1000) {
      const text = normalize(transcript);
      const fired = [];
      if (!text) return fired;
      const tokens = text.split(' ');
      const occ = this._scan(tokens);

      // Collect every trigger with a new occurrence, then let the most specific
      // (longest) keyword go first: "oh nein" (fail) beats "nein" (no).
      const candidates = [];
      const { byTrigger } = this._index;
      for (let ti = 0; ti < this.triggers.length; ti++) {
        const trig = this.triggers[ti];
        let occurrences = 0;
        let matched = null; // { keyword, n, fuzzy, start }
        for (const kw of byTrigger[ti]) {
          const list = occ.get(kw.idx);
          if (!list) continue;
          occurrences += list.length;
          // Prefer an exact occurrence of this keyword for `spoken`.
          let best = list[0];
          for (const o of list) {
            if (!o.fuzzy && best.fuzzy) best = o;
          }
          // Longest keyword wins; on equal length exact beats fuzzy.
          if (!matched || kw.keyword.length > matched.keyword.length ||
              (kw.keyword.length === matched.keyword.length && matched.fuzzy && !best.fuzzy)) {
            matched = { keyword: kw.keyword, n: kw.n, fuzzy: best.fuzzy, start: best.start };
          }
        }
        const already = this.firedInUtterance.get(trig._key) || 0;
        if (occurrences <= already) continue;

        // New occurrence. Mark it consumed even if cooldown blocks it, so it
        // doesn't fire late when the cooldown expires mid-sentence.
        this.firedInUtterance.set(trig._key, occurrences);
        candidates.push({ trig, matched });
      }
      candidates.sort((a, b) => b.matched.keyword.length - a.matched.keyword.length);

      for (const { trig, matched } of candidates) {
        if (this._cooldownState(trig, now)) continue;
        this._markFired(trig, now);
        fired.push({
          trigger: trig,
          keyword: matched.keyword,
          fuzzy: matched.fuzzy,
          spoken: matched.fuzzy ? tokens.slice(matched.start, matched.start + matched.n).join(' ') : matched.keyword,
        });
      }
      return fired;
    }
  }

  function buildStopSet(lang) {
    const lists = lang ? [STOPWORDS[lang]] : LANGS.map((l) => STOPWORDS[l]);
    return new Set(lists.flat());
  }

  global.LiveFXMatcher = { Matcher, normalize, fold, damerau, TOLERANCES, STOPWORDS };
})(typeof window !== 'undefined' ? window : globalThis);
