// LiveFX – content safety filter for GIF search (queries and provider results). UMD: Node (require) + browser
// (window.LiveFXSafety). No dependencies. See docs/GIFS.md („Sicherheitsfilter“).
//
//   LiveFXSafety.check(text)          -> {ok:true} | {ok:false, reason:<category id>, category, term, label}
//   LiveFXSafety.filterResults(items) -> items without the ones whose title/tags/slug/description is blocked
//   LiveFXSafety.partition(items)     -> {kept, removed:[{item, reason, term}]}
//   LiveFXSafety.message(reason, lang)-> „Dieser Suchbegriff ist gesperrt (Politik)“ (de|tr|en)
//   LiveFXSafety.CATEGORIES           -> {politics:{de,tr,en}, religion:…, hate:…, nsfw:…, violence:…, drugs:…}
//
// Why our own filter: GIPHY/KLIPY content ratings („g“) are known to leak, and a streamer must never show
// political, religious, hateful, sexual, violent or drug content by accident on stream. The list is
// deliberately conservative (words a streamer would not search for a fun reaction GIF) but avoids common
// words that only *contain* a blocked word (whole-word / phrase matching, see tokenize()).
//
// Normalisation (same idea as js/matcher.js): lowercase; Turkish ı/i ş/s ç/c ğ/g ö/o ü/u; German ä/ae→a,
// ö/oe→o, ü/ue→u, ß→ss; diacritics stripped; leetspeak 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s (only inside tokens
// that also contain letters, so plain numbers stay numbers); apostrophes and „*“ are removed inside words
// (Kuran'ı → kurani, f*ck → fck), all other punctuation separates words; letter runs of 3+ are reduced to 2
// („kiiirche“ → „kiirche“) and such elongated tokens additionally match with all repeats collapsed
// („kiiirche“ → „kirche“). We do NOT collapse doubles in general, because that would merge real words
// („krass“/„kras“, „gott“/„got“, „good“/„god“, „kann“/„kan“). Spaced-out letters („n a z i“, „k.i.r.c.h.e“)
// are joined. A term ending in „*“ matches as a word prefix (kirch* → Kirchen, Kirchturm).
(function (global) {
  'use strict';

  const CATEGORIES = {
    politics: { de: 'Politik', tr: 'Siyaset', en: 'Politics' },
    religion: { de: 'Religion', tr: 'Din', en: 'Religion' },
    hate: { de: 'Hass/Diskriminierung', tr: 'Nefret/Ayrımcılık', en: 'Hate/discrimination' },
    nsfw: { de: 'Sexuelle Inhalte', tr: 'Cinsel içerik', en: 'Sexual content' },
    violence: { de: 'Gewalt/Waffen/Terror', tr: 'Şiddet/Silah/Terör', en: 'Violence/weapons/terror' },
    drugs: { de: 'Drogen/Alkohol', tr: 'Uyuşturucu/Alkol', en: 'Drugs/alcohol' },
  };

  // Comma-separated terms per category (TR / DE / EN mixed). Written in plain lowercase; they go through
  // the same normalize() as the user text, so „präsident“ and „prasident“ are the same entry.
  const TERMS = {
    politics: `
      politik*, politic*, politician*, politiker*, siyaset*, siyasi, siyasetci*,
      president*, präsident*, cumhurbaşkan*, kanzler*, bundeskanzler*, başbakan*, prime minister, premierminister*, minister, ministers,
      parlament*, parliament*, meclis*, bundestag*, regierung*, government*, hükümet*, partei*, senator*,
      election*, wahlen, wahlkampf*, bundestagswahl*, landtagswahl*, europawahl*, kommunalwahl*, wahlurne*, seçim, seçimler*, seçime, seçimde, seçimi,
      referendum*, referandum*, ballot*, vote for, oy ver*, oy veri*,
      democrat*, republican*, demokrat*, communis*, kommunis*, komünist*, socialis*, sozialis*, sosyalist*, fascis*, faschis*, faşist*,
      akp, ak parti, chp, mhp, hdp, dem parti, iyi parti, zafer partisi, afd, cdu, csu, spd, fdp, bsw, die grünen, die linke, gop, labour party,
      trump, biden, obama, putin, erdoğan*, kılıçdaroğlu*, imamoğlu*, atatürk*, merkel, scholz, merz, selenskyj, zelensky*, netanyahu,
      protest*, demonstration*, direniş*, gezi parkı, hükümet istifa, her yer taksim,
      free palestine, from the river to the sea, black lives matter, blm, all lives matter, make america great again, maga, wir sind das volk,
      gaza, israel, israil, palestine*, palästina*, filistin*, kurdistan, kürdistan`,
    religion: `
      religion*, religious, religiös*, relijyon*, islam, islamic, islamisch*, islamist*, islamism*, islamophob*, muslim*, müslüman*, moslem*, christian, christians, christianity, christentum*, christlich*,
      hristiyan*, jewish, judaism, jude, juden, jüdisch*, yahudi*, judentum*, hindu*, buddhis*, buddha*, sikh, atheis*, ateist*,
      god, gods, goddess, gott, götter, lieber gott, oh mein gott, allah*, tanrı*, jesus, jesus christ, christus, hz isa, isa peygamber,
      muhammad, mohammed, muhammed, hz muhammed, prophet*, peygamber*, moses, pope, papst*, vatican*, vatikan*, satan*, şeytan*,
      bible*, bibel*, quran*, koran*, kuran*, torah, tora, tevrat*, incil*,
      church*, kirch*, kilise*, cami, camii, camiye, camiyi, camide, camiden, camiler, camilerde, camileri, mosque*, moschee*,
      synagogue*, synagog*, sinagog*, mecca, mekka, mekke, kaaba, kabe, hajj,
      pray, prays, prayer*, praying, beten, gebet*, namaz*, dua, dualar*, ezan*, amen, amin, hallelujah, halleluja, inshallah, inşallah,
      maşallah, mashallah, bismillah, allahu akbar, subhanallah, ramadan, ramazan, crucifix*, kruzifix*, rosary, rosenkranz, tesbih,
      hijab, burka, burqa, niqab, kopftuch*, türban*`,
    nsfw: `
      sex, sexy, sexual*, sexuell*, seks, seksi, sexi, porn*, porno*, nsfw, xxx, nude, nudes, nudity, naked, nackt*, çıplak*,
      boob*, tits, titty, titties, titten, nipple*, nippel*, penis*, vagina*, pussy, cock, cocks,
      fuck*, motherfuck*, fick*, siktir*, sikiş*, sikerim, sikeyim, amk, amına*, orospu*, hure*, whore*, slut*, schlampe*, bitch*,
      hentai, milf, onlyfans, erotic*, erotik*, orgasm*, orgazm*, horny, blowjob*, handjob*, cum, cumshot*, anal, dildo*, bdsm,
      fetish*, fetisch*, strip club, stripper*, asshole*, arschloch*, thot, camgirl*, playboy, pornhub, brazzers, kinky`,
    violence: `
      gun, guns, gunfire, gunshot*, gunman, waffe, waffen, silah*, pistol*, tabanca*, rifle*, gewehr*, tüfek*, weapon*, kalashnikov*,
      ak47, ak 47, ar15, ar 15, grenade*, granate*, el bombası, bomb, bombs, bombing*, bomber*, terror*, terör*, isis, isil, daesh, işid, taliban*,
      al qaida, al qaeda, hamas, hezbollah, hizbullah, pkk,
      kill, kills, killing*, murder*, mord, morde, mörder*, ermord*, öldür*, cinayet*, katil, katliam*, massacre*, massaker*,
      genocide*, völkermord*, soykırım*, beheading*, beheaded, enthaupt*, gore, blood, blut, suicide*, selbstmord*, suizid*, intihar*,
      self harm, mass shooting, school shooting, amoklauf*, amok, stabbing*, messerangriff*, erstech*, bıçakla*, violence, gewalt*, şiddet*,
      krieg, kriege, war crime*, kriegsverbrech*, savaş, torture*, folter*, işkence*, hinrichtung*, rape, raped, rapist*, vergewaltig*, tecavüz*`,
    drugs: `
      drug, drugs, droge, drogen, uyuşturucu*, weed, cannabis, marihuana, marijuana, kiffen, kiffer*, kokain*, cocaine, heroin, eroin,
      meth, crystal meth, lsd, ecstasy, mdma, esrar*, bong, bongs, stoned, smoke weed,
      alcohol*, alkohol*, alkol*, beer, beers, bier, biere, bira, wine, wein, şarap*, vodka, wodka, votka, rakı, whiskey, whisky, viski,
      tequila, schnaps, drunk, betrunken, besoffen, saufen, sarhoş*, cigarette*, zigarette*, sigara*, vape, vaping`,
  };

  // Hate speech, racist / homophobic slurs and extremist slogans (TR / DE / EN). Stored ROT13-encoded so the
  // source file does not contain plain slurs (code review, search results, screenshots of the repo). This is
  // obfuscation, not secrecy: decodeRot13() turns them back at load time. Same syntax as TERMS.
  const HATE_ROT13 = [
    'avttre*', 'avttn*', 'arteb', 'artebf', 'artebrf', 'fnaqavttre*', 'puvax*', 'tbbx*', 'fcvp', 'fcvpf', 'xvxr', 'xvxrf', 'jrgonpx*', 'enturnq*', 'gbjryurnq*',
    'ornare*', 'cnxv', 'cnxvf', 'cbepu zbaxrl', 'snttbg*', 'snt', 'sntf', 'qlxr*', 'genaal*', 'genaavrf', 'ergneq', 'ergneqf', 'ergneqrq',
    'furznyr*', 'artre*', 'xnanxr*', 'xnanpxr*', 'xhzzryghexr*', 'mvtrhare*', 'fpujhpugry*', 'whqrafnh*', 'hagrezrafpu*', 'fcnfg',
    'fcnfgv*', 'ghagr*', 'voar*', 'tnihe', 'tniheyne', 'tniheha', 'mrapv*', 'cvf xheg', 'cvf nenc', 'cvf fhevlryv', 'cvf rezrav', 'cvf lnuhqv', 'rezrav qbyh',
    'lnuhqv qbyh', 'anmv', 'anmvf', 'arbanmv*', 'uvgyre*', 'urvy uvgyre', 'fvrt urvy', 'xxx', 'xh xyhk xyna', 'juvgr cbjre',
    'juvgr cevqr', 'juvgr trabpvqr', 'terng ercynprzrag', 'fjnfgvxn*', 'unxraxerhm*', 'tnznyv unp', 'hzibyxhat', 'nhfynaqre enhf',
    'ghexra enhf', 'whqra enhf', 'xnanxra enhf', 'tnf gur wrjf', '1488', 'ubybubnk', 'ubybpnhfg ubnk',
  ];

  function decodeRot13(s) {
    return String(s).replace(/[a-z]/gi, (c) => {
      const b = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
    });
  }

  // ------------------------------------------------------------------ normalisation

  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

  /** Lowercase + Turkish/German folding + diacritics stripped. */
  function fold(text) {
    return String(text == null ? '' : text)
      .normalize('NFC')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ß/g, 'ss')
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .normalize('NFD')
      .replace(/\p{M}+/gu, '');
  }

  /** One raw word -> canonical forms: s2 (runs of 3+ reduced to 2), s1 (all runs collapsed), elongated flag. */
  function canon(word) {
    const w = word.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
    return { s2: w.replace(/(.)\1{2,}/gu, '$1$1'), s1: w.replace(/(.)\1+/gu, '$1'), elongated: /(.)\1{2,}/u.test(w) };
  }

  /** Text -> token list [{s2, s1, elongated}]. */
  function tokenize(text) {
    const words = [];
    // split on punctuation except the leet symbols @ $ and the in-word joiners ' * (so "ak-47" -> ak 47)
    for (let raw of fold(text).split(/[^\p{L}\p{N}@$'’`´*]+/u)) {
      if (/\p{L}/u.test(raw)) raw = raw.replace(/[013457@$]/g, (c) => LEET[c]);
      raw = raw.replace(/['’`´*]/g, '');
      for (const w of raw.split(/[^\p{L}\p{N}]+/u)) if (w) words.push(w);
    }
    // join spaced-out letters: "n a z i" / "k.i.r.c.h.e" -> "nazi" / "kirche"
    const joined = [];
    for (let i = 0; i < words.length; ) {
      let j = i;
      while (j < words.length && words[j].length === 1) j++;
      if (j - i >= 3) {
        joined.push(words.slice(i, j).join(''));
        i = j;
      } else {
        joined.push(words[i]);
        i++;
      }
    }
    return joined.map(canon);
  }

  /** Normalised plain string (for display / debugging): tokens joined by single spaces. */
  function normalize(text) {
    return tokenize(text)
      .map((t) => t.s2)
      .join(' ');
  }

  // ------------------------------------------------------------------ term index

  const SAFE_ELONGATED = new Set(['good', 'goods', 'soo', 'too', 'zoo', 'cool', 'yess']); // "goooood" is not "god"

  function keyOf(s) {
    return s.length >= 3 ? s.slice(0, 3) : s;
  }

  const INDEX = new Map(); // key (first 3 chars of s1 of the first token) -> [{tokens, category, term}]
  let TERM_COUNT = 0;

  function addTerm(category, rawTerm) {
    let t = String(rawTerm).trim();
    if (!t) return;
    const prefix = t.endsWith('*');
    if (prefix) t = t.slice(0, -1);
    const toks = tokenize(t);
    if (!toks.length) return;
    const tokens = toks.map((x, i) => ({ s2: x.s2, s1: x.s1, prefix: prefix && i === toks.length - 1 }));
    const key = keyOf(tokens[0].s1);
    if (!INDEX.has(key)) INDEX.set(key, []);
    INDEX.get(key).push({ tokens, category, term: t });
    TERM_COUNT++;
  }

  for (const [cat, list] of Object.entries(TERMS)) for (const term of list.split(',')) addTerm(cat, term);
  for (const enc of HATE_ROT13) addTerm('hate', decodeRot13(enc));

  function tokenMatches(t, w) {
    if (w.prefix ? t.s2.startsWith(w.s2) : t.s2 === w.s2) return true;
    if (!t.elongated || SAFE_ELONGATED.has(t.s2)) return false;
    return w.prefix ? t.s1.startsWith(w.s1) : t.s1 === w.s1;
  }

  function candidates(t) {
    // exact (s2) matches imply equal s1, so the s1 key covers exact, prefix and elongated lookups
    return INDEX.get(keyOf(t.s1)) || [];
  }

  // ------------------------------------------------------------------ API

  /** Checks a text. {ok:true} or {ok:false, reason, category, term, label}. Never throws. */
  function check(text) {
    let toks;
    try {
      toks = tokenize(text);
    } catch (_) {
      return { ok: true };
    }
    for (let i = 0; i < toks.length; i++) {
      for (const entry of candidates(toks[i])) {
        const n = entry.tokens.length;
        if (i + n > toks.length) continue;
        let hit = true;
        for (let k = 0; k < n && hit; k++) hit = tokenMatches(toks[i + k], entry.tokens[k]);
        if (hit) {
          const term = toks
            .slice(i, i + n)
            .map((x) => x.s2)
            .join(' ');
          return { ok: false, reason: entry.category, category: entry.category, term, label: CATEGORIES[entry.category] };
        }
      }
    }
    return { ok: true };
  }

  function checkFields(item) {
    if (!item || typeof item !== 'object') return { ok: false, reason: 'invalid', term: '' };
    const fields = [];
    for (const f of ['title', 'content_description', 'h1_title', 'alt_text', 'description', 'slug', 'username']) {
      if (typeof item[f] === 'string' && item[f]) fields.push(f === 'slug' ? item[f].replace(/[-_]+/g, ' ') : item[f]);
    }
    if (Array.isArray(item.tags)) {
      for (const t of item.tags) if (typeof t === 'string' && t) fields.push(t);
    } else if (typeof item.tags === 'string') {
      fields.push(item.tags);
    }
    for (const f of fields) {
      const r = check(f);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  /** Splits results into {kept, removed:[{item, reason, term}]}. */
  function partition(items) {
    const kept = [];
    const removed = [];
    for (const item of Array.isArray(items) ? items : []) {
      const r = checkFields(item);
      if (r.ok) kept.push(item);
      else removed.push({ item, reason: r.reason, term: r.term });
    }
    return { kept, removed };
  }

  /** Returns only the results whose title/tags/slug/description pass check(). */
  function filterResults(items) {
    return partition(items).kept;
  }

  const MSG = {
    de: (l) => `Dieser Suchbegriff ist gesperrt (${l}).`,
    tr: (l) => `Bu arama terimi engellendi (${l}).`,
    en: (l) => `This search term is blocked (${l}).`,
  };

  /** User-facing message for a blocked query in de|tr|en (default de). */
  function message(reason, lang) {
    const lg = MSG[lang] ? lang : 'de';
    const cat = CATEGORIES[reason];
    return MSG[lg](cat ? cat[lg] : reason || '?');
  }

  const api = {
    check,
    filterResults,
    partition,
    message,
    normalize,
    tokenize,
    CATEGORIES,
    categories: Object.keys(CATEGORIES),
    get termCount() {
      return TERM_COUNT;
    },
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  global.LiveFXSafety = api;
})(typeof window !== 'undefined' ? window : globalThis);
