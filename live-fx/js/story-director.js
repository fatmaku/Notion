// LiveFX 2.2 – live story director (global `LiveFXStoryDirector`, UMD: browser + Node).
//
// Turns what the streamer says into a scene state, sentence by sentence, with plain word lists (DE / TR / EN,
// taken from business/prototypes/live-story.html) – no model, no cloud, a few microseconds per line:
//
//   const d = LiveFXStoryDirector.create({ lang: 'auto' });
//   d.onChange((state) => renderer.story(state));
//   d.feed('Es regnete in der Nacht im Wald, der Drache flog über das Schloss', { final: true });
//   d.state -> { scene: 'rain', weather: 'rain', time: 'night', place: 'forest', landmark: 'castle', mood: 'calm',
//                actors: [{ emoji: '🐉', role: 'dragon', action: 'fly' }], props: [{ emoji: '🏰', role: 'castle' }], … }
//
// Word roles: place (forest, sea, city, castle, desert, mountains, village, meadow, space, cave), time (night,
// morning, day, evening), weather (clear, rain, snow, storm, wind, fog), figure (22 sprites), object (16 props),
// action (come, go, run, fly, jump, swim, sleep, dance, cry, laugh, vanish), mood (happy, tense, sad, scary, calm),
// plus `stop` ("hörte auf" -> weather clear), `end` ("Ende" -> fade out) and `open` ("es war einmal" -> new scene).
// Interim lines (`final: false`) only move the fast roles (place / time / weather / mood); figures, objects and
// actions wait for the final line so half-recognised words do not spawn sprites.
//
// The state maps onto the 13 overlay scenes (`scene`): weather wins (rain / storm / snow), then a place with a
// scene of its own (forest, sea, city, castle, desert, space; cave -> night, mountains -> snow), a campfire object
// (-> fire), then the time of day (night -> night, morning / evening -> sunrise). A plain daytime meadow with
// nobody on it has no scene (`null`) – the band stays empty until the story gives it something to draw.
//
// Lifecycle (2.2.1): props (car, castle landmark …) and actors live only as long as the story talks about them.
// Every final line is one sentence; a mention (or a verb / person pronoun bound to an actor) refreshes the item.
// A prop that is not mentioned again leaves after 3 later sentences or 45 s, an actor walks out after 4 sentences or
// 60 s (`TTL`, whichever comes first; `tick(now)` applies the time limit between lines, the overlay calls it every
// second). A new place or new weather is a new picture: props not mentioned in that or the previous sentence leave
// (actors stay – they follow the story). Removal verbs ("ging weg", "gitti", "left", "verschwand", "kayboldu",
// "disappeared" …) remove the named actor or object; "gitti" with a destination ("ormana gitti") is a walk. End words
// only count at the end of a line ("… das Ende", "masal bitti"; the bare Turkish "son" only as a line of its own).
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.LiveFXStoryDirector = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LANGS = ['de', 'tr', 'en'];
  const LI = { de: 0, tr: 1, en: 2 };
  const ACTORS_MAX = 6;
  const PROPS_MAX = 4;
  // 2.2.1 lifetimes: sentences (final lines) after the last mention / ms without a mention, whichever comes first.
  const TTL = Object.freeze({ propLines: 3, propMs: 45000, actorLines: 4, actorMs: 60000 });
  // Person pronouns that keep the last figure alive ("es" / "it" are mostly dummy subjects: "es regnete").
  const PERSON_PRON = { er: 1, sie: 1, ihn: 1, ihm: 1, o: 1, onu: 1, ona: 1, he: 1, she: 1, they: 1, him: 1, her: 1 };
  // Single-word end markers that are ambiguous inside a sentence ("en son", "son dakika", "am Ende des Tages"):
  // they end the story only in a short line of at most this many words.
  const END_SHORT = { son: 2, ende: 6 };

  const SPRITE = {
    girl: '👧', boy: '👦', grandma: '👵', grandpa: '👴', king: '🤴', princess: '👸', knight: '🤺', witch: '🧙‍♀️', dragon: '🐉',
    cat: '🐈', dog: '🐕', horse: '🐎', bird: '🐦', fish: '🐟', bear: '🐻', fox: '🦊', rabbit: '🐇', owl: '🦉', robot: '🤖',
    unicorn: '🦄', ghost: '👻', astronaut: '🧑‍🚀',
    tree: '🌳', house: '🏠', treasure: '💰', ship: '⛵', car: '🚗', flower: '🌸', fire: '🔥', star: '⭐', ball: '⚽', book: '📖',
    bridge: '🌉', tent: '⛺', lantern: '🏮', cake: '🎂', key: '🔑', heart: '❤️',
  };

  // Lexicon: role -> id -> [de, tr, en] alternatives separated by "|" (multi-word phrases allowed).
  const LEX = {
    place: {
      forest: ['wald|walde|waldes|wälder|urwald|dschungel', 'orman|ormanda|ormana|ormanın|ormandaki|ormanı|ağaçlık', 'forest|woods|wood|jungle'],
      sea: ['meer|meeres|ozean|strand|küste', 'deniz|denize|denizde|denizin|okyanus|sahil|kıyı', 'sea|ocean|beach|shore|coast'],
      city: ['stadt|städte|großstadt|grossstadt|hochhäuser', 'şehir|şehre|şehirde|şehrin|kent|kentte', 'city|town|skyscrapers'],
      castle: ['schloss|schloß|schlosses|burg|palast', 'kale|kalenin|kaleye|kalede|saray|sarayın|şato', 'castle|palace'],
      desert: ['wüste|wüsten|oase', 'çöl|çölde|çöle|vaha', 'desert|oasis'],
      mountains: ['berg|berge|bergen|gebirge|gipfel', 'dağ|dağlar|dağda|dağa|dağın|dağların|zirve', 'mountain|mountains|hills|peak'],
      village: ['dorf|dorfes|dörfchen|dörfer', 'köy|köyde|köye|köyün|köyü|kasaba', 'village|hamlet'],
      meadow: ['wiese|wiesen|feld|felder|garten', 'çayır|çimen|çimenlik|bahçe|bahçede|tarla', 'meadow|field|fields|garden'],
      space: ['weltraum|weltall|universum|planet|planeten', 'uzay|uzayda|uzaya|gezegen|evren', 'space|outer space|planet|galaxy|universe'],
      cave: ['höhle|höhlen', 'mağara|mağarada|mağaraya', 'cave|cavern'],
    },
    time: {
      night: ['nacht|nachts|mitternacht|dunkel|dunkelheit|mond', 'gece|geceleyin|gecenin|karanlık|karanlıkta|ay ışığı', 'night|midnight|dark|darkness|moonlight'],
      morning: ['morgen|morgens|frühmorgens|sonnenaufgang|morgengrauen', 'sabah|sabahleyin|sabahın|şafak|gün doğumu', 'morning|dawn|sunrise'],
      day: ['tag|tages|mittag|mittags|tagsüber', 'gündüz|öğlen|öğle|gün ortası', 'day|noon|daytime|midday'],
      evening: ['abend|abends|sonnenuntergang|dämmerung', 'akşam|akşamüstü|akşamleyin|gün batımı', 'evening|sunset|dusk'],
    },
    weather: {
      clear: [
        'sonnig|sonnenschein|heiter|die sonne schien|die sonne scheint|kam die sonne raus|kam die sonne heraus|die sonne kam raus|die sonne kam heraus',
        'güneşli|güneş açtı|güneş çıktı|güneş doğdu',
        'sunny|sunshine|the sun came out|sun came out|the sun was shining|the sun shone',
      ],
      rain: ['regen|regnete|regnet|regnen|regnerisch|regentropfen|nieselregen', 'yağmur|yağmurda|yağmurlu|yağmuru|sağanak', 'rain|rained|raining|rainy|raindrops|drizzle'],
      snow: ['schnee|schneite|schneit|schneien|schneeflocken', 'kar|karlı|karda|kar tanesi|kar taneleri', 'snow|snowed|snowing|snowy|snowflakes'],
      storm: ['gewitter|blitz|blitze|blitzte|donner|donnerte', 'fırtına|fırtınada|şimşek|şimşekler|gök gürültüsü|yıldırım', 'thunderstorm|storm|lightning|thunder'],
      wind: ['wind|windig|sturm|wehte|böen', 'rüzgar|rüzgâr|rüzgarlı|rüzgârlı|esiyordu|esti', 'wind|windy|breeze|gale'],
      fog: ['nebel|neblig|dunst', 'sis|sisli|pus', 'fog|foggy|mist|misty'],
    },
    figure: {
      girl: ['mädchen|mädchens|tochter', 'kız|kızı|kızın|kızcağız', 'girl|daughter'],
      boy: ['junge|jungen|knabe|sohn', 'oğlan|oğlu|erkek çocuk|çocuk', 'boy|lad'],
      grandma: ['oma|großmutter|grossmutter', 'nine|büyükanne|babaanne|anneanne', 'grandma|granny|grandmother'],
      grandpa: ['opa|großvater|grossvater', 'dede|büyükbaba', 'grandpa|grandfather'],
      king: ['könig|königs|prinz|prinzen', 'kral|kralı|prens', 'king|prince'],
      princess: ['prinzessin|königin', 'prenses|prensesi|kraliçe', 'princess|queen'],
      knight: ['ritter', 'şövalye|şövalyesi', 'knight'],
      witch: ['hexe|zauberer|zauberin', 'cadı|büyücü', 'witch|wizard'],
      dragon: ['drache|drachen|drachens', 'ejderha|ejderhanın|ejderhayı|ejder', 'dragon|dragons'],
      cat: ['katze|kater|kätzchen', 'kedi|kedicik|kediyi', 'cat|kitten'],
      dog: ['hund|hündchen|welpe', 'köpek|köpeği|köpekçik', 'dog|puppy'],
      horse: ['pferd|pony', 'at|atı', 'horse|pony'],
      bird: ['vogel|vögel|vögelchen', 'kuş|kuşu|kuşlar', 'bird|birds'],
      fish: ['fisch|fische', 'balık|balığı', 'fish'],
      bear: ['bär|bären', 'ayı|ayıyı', 'bear'],
      fox: ['fuchs|füchsin', 'tilki|tilkiyi', 'fox'],
      rabbit: ['hase|hasen|kaninchen', 'tavşan|tavşanı', 'rabbit|bunny|hare'],
      owl: ['eule|uhu', 'baykuş', 'owl'],
      robot: ['roboter', 'robot', 'robot'],
      unicorn: ['einhorn', 'tek boynuzlu at|unicorn', 'unicorn'],
      ghost: ['geist|gespenst', 'hayalet|hortlak', 'ghost'],
      astronaut: ['astronautin|astronaut', 'astronot', 'astronaut'],
    },
    object: {
      tree: ['baum|bäume|tanne', 'ağaç|ağacı|ağaçlar', 'tree|trees'],
      house: ['haus|häuser|hütte|häuschen', 'ev|evi|kulübe|kulübesi', 'house|hut|cottage'],
      treasure: ['schatz|schatztruhe|gold', 'hazine|hazineyi|altın', 'treasure|gold'],
      ship: ['schiff|boot', 'gemi|gemiyi|tekne', 'ship|boat'],
      car: ['auto|autos', 'araba|arabayı', 'car'],
      flower: ['blume|blumen', 'çiçek|çiçekler|çiçeği', 'flower|flowers'],
      fire: ['feuer|lagerfeuer|flammen|kamin', 'ateş|ateşi|kamp ateşi|alev|şömine', 'fire|campfire|flames|fireplace'],
      star: ['stern|sterne', 'yıldız|yıldızlar', 'star|stars'],
      ball: ['ball', 'top|topu', 'ball'],
      book: ['buch|bücher', 'kitap|kitabı', 'book'],
      bridge: ['brücke', 'köprü|köprüyü|köprünün', 'bridge'],
      tent: ['zelt', 'çadır|çadırı', 'tent'],
      lantern: ['laterne|lampe|kerze', 'fener|feneri|mum', 'lantern|lamp|candle'],
      cake: ['kuchen|torte', 'pasta|kek', 'cake'],
      key: ['schlüssel', 'anahtar|anahtarı', 'key'],
      heart: ['herz|herzen', 'kalp|kalbi', 'heart'],
    },
    action: {
      come: ['kam|kommt|kommen|kamen|erschien|erscheint|stand|tauchte auf', 'geldi|gelir|geliyor|gelmiş|çıktı|çıkmış|belirdi|vardı|varmış', 'came|comes|come|appeared|appears|arrived'],
      go: ['ging|geht|gehen|lief|spazierte|wanderte', 'gidiyor|gitmiş|yürüdü|yürüyordu|yürümüş', 'went|goes|walked|walks|walking'],
      // 2.2.1: leaving the stage (removes the named actor / object); with a destination in the line it is a walk.
      leave: [
        'ging weg|gingen weg|lief weg|liefen weg|rannte weg|rannten weg|fuhr weg|fuhr davon|fuhren weg|flog weg|flog davon|flogen weg|ging fort|zog weiter|verließ|verließen|haute ab',
        'gitti|gittiler|gidip gitti|çekip gitti|uzaklaştı|uzaklaştılar|ayrıldı|ayrıldılar|terk etti|kaçıp gitti',
        'left|went away|walked away|ran away|drove away|drove off|flew away|flew off|went off|sailed away',
      ],
      run: ['rannte|rennt|rennen|rannten', 'koştu|koşuyor|koşmuş|koştular', 'ran|runs|running|run'],
      fly: ['flog|fliegt|fliegen|flogen|hob ab', 'uçtu|uçuyor|uçmuş|uçtular|havalandı', 'flew|flies|fly|flying|took off'],
      jump: ['sprang|springt|springen|hüpfte|hüpft', 'zıpladı|zıplıyor|zıplamış|atladı', 'jumped|jumps|jump|hopped'],
      swim: ['schwamm|schwimmt|schwimmen', 'yüzdü|yüzüyor|yüzmüş', 'swam|swims|swimming|swim'],
      sleep: ['schlief|schläft|schlafen|eingeschlafen', 'uyudu|uyuyor|uyuyordu|uyumuş|uyuya kaldı', 'slept|sleeps|sleeping|asleep|sleep'],
      dance: ['tanzte|tanzt|tanzen', 'dans etti|dans ediyor|dans etmiş', 'danced|dances|dancing|dance'],
      cry: ['weinte|weint|weinen', 'ağladı|ağlıyor|ağlamış', 'cried|cries|crying|wept'],
      laugh: ['lachte|lacht|lachen', 'güldü|gülüyor|gülmüş', 'laughed|laughs|laughing'],
      vanish: ['verschwand|verschwindet|verschwinden', 'kayboldu|kaybolmuş|yok oldu|gözden kayboldu', 'vanished|disappeared|vanishes|disappears'],
    },
    mood: {
      happy: ['fröhlich|glücklich|lustig|freute|freude', 'mutlu|neşeli|sevinçli|sevindi', 'happy|cheerful|joyful|glad'],
      tense: ['plötzlich|spannend|auf einmal|unerwartet', 'birden|aniden|birdenbire|heyecanlı', 'suddenly|all of a sudden|exciting'],
      sad: ['traurig|unglücklich|einsam', 'üzgün|hüzünlü|mutsuz|yalnız', 'sad|unhappy|lonely'],
      scary: ['gruselig|unheimlich|angst|schaurig|fürchtete', 'korkunç|ürkütücü|korku|korktu|korkmuş', 'scary|creepy|spooky|afraid|scared'],
      calm: ['ruhig|still|friedlich|leise', 'sakin|sessiz|huzurlu', 'calm|quiet|peaceful'],
    },
    stop: { x: ['hörte auf|hört auf|aufgehört|vorbei|kein|keine|nicht mehr', 'durdu|durmuş|dindi|dinmiş|kesildi|bitti', 'stopped|stops|ended|no more'] },
    end: { x: ['ende|das ende', 'son|masal bitti|hikaye bitti|hikâye bitti|masalımız bitti|hikayemiz bitti', 'the end'] },
    open: { x: ['es war einmal|vor langer zeit', 'bir varmış bir yokmuş|evvel zaman içinde', 'once upon a time|long ago'] },
    pron: { x: ['er|sie|es|ihn|ihm', 'o|onu|ona', 'he|she|it|they|him|her'] },
  };
  const STOPW = {
    de: 'der die das und ist ein eine einen im in mit auf war über den dem zu da los am'.split(' '),
    tr: 'bir ve bu çok da de ile için üzerinden küçük büyük olmuş'.split(' '),
    en: 'the a an and is was in on of to over at into there'.split(' '),
  };
  // A built place named next to a nature place ("im Wald … über das Schloss") becomes a landmark prop in the band.
  const LANDMARK_SPRITE = { castle: '🏰', city: '🏙️', village: '🏘️' };
  const NATURE = { forest: 1, sea: 1, desert: 1, mountains: 1, meadow: 1, cave: 1, space: 1 };
  const FAST = ['place', 'time', 'weather', 'mood'];

  // Scene mapping (overlay scenes: rain night forest sea fire castle snow desert city space sunrise storm).
  const SCENE_BY_WEATHER = { rain: 'rain', storm: 'storm', snow: 'snow' };
  const SCENE_BY_PLACE = { forest: 'forest', sea: 'sea', city: 'city', castle: 'castle', desert: 'desert', space: 'space', cave: 'night', mountains: 'snow' };
  const SCENE_BY_TIME = { night: 'night', morning: 'sunrise', evening: 'sunrise' };
  // Ambient loop suggestion per scene (js/sounds.js `LiveFXSounds.loops`); the renderer plays it on the ambient bus.
  const LOOP_BY_SCENE = { rain: 'rain', storm: 'storm', night: 'nightCrickets', forest: 'birds', sea: 'sea', fire: 'fireplace', castle: 'wind', snow: 'wind', desert: 'wind', city: 'cityHum', space: 'spaceDrone', sunrise: 'birds' };

  // ---- normalisation + index --------------------------------------------------------------------
  function lower(s, L) {
    s = String(s).normalize('NFC');
    if (L === 'tr') {
      try {
        return s.toLocaleLowerCase('tr');
      } catch (_) {
        /* fall through */
      }
    }
    return s.replace(/İ/g, 'i').toLowerCase();
  }
  function norm(s, L) {
    return lower(s, L).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  const FOLD = { ı: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', ä: 'a', â: 'a', î: 'i', û: 'u', é: 'e', ß: 'ss' };
  function fold(s) {
    return s.replace(/[ışğçöüäâîûéß]/g, (c) => FOLD[c]);
  }
  const IDX = {};
  const PHR = {};
  const FZ = {};
  for (const L of LANGS) {
    const map = new Map();
    const phr = [];
    const fz = [];
    for (const role of Object.keys(LEX)) {
      for (const id of Object.keys(LEX[role])) {
        for (const f of LEX[role][id][LI[L]].split('|')) {
          const n = fold(norm(f, L));
          if (!n) continue;
          const e = { role, id };
          if (n.includes(' ')) phr.push({ toks: n.split(' '), e });
          else {
            if (!map.has(n)) map.set(n, []);
            map.get(n).push(e);
            if (n.length >= 5 && role !== 'pron' && role !== 'stop') fz.push([n, e]);
          }
        }
      }
    }
    phr.sort((a, b) => b.toks.length - a.toks.length);
    IDX[L] = map;
    PHR[L] = phr;
    FZ[L] = fz;
  }
  /** Damerau-Levenshtein distance <= 1 (one typo / ASR slip). */
  function dl1(a, b) {
    if (a === b) return true;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  const TR_SUF = ['ndan', 'nden', 'nın', 'nin', 'nun', 'nün', 'dan', 'den', 'tan', 'ten', 'lar', 'ler', 'yla', 'yle', 'daki', 'deki', 'la', 'le', 'ya', 'ye', 'yı', 'yi', 'yu', 'yü', 'da', 'de', 'ta', 'te', 'ım', 'im', 'um', 'üm', 'sı', 'si', 'su', 'sü', 'ın', 'in', 'un', 'ün', 'nı', 'ni', 'nu', 'nü', 'na', 'ne', 'ı', 'i', 'u', 'ü', 'a', 'e'];
  const MUT = { b: 'p', c: 'ç', d: 't', ğ: 'k', g: 'k' };
  function trStem(tok, depth) {
    for (const s of TR_SUF) {
      if (tok.length - s.length >= 3 && tok.slice(-s.length) === s) {
        const st = tok.slice(0, -s.length);
        const f = fold(st);
        if (IDX.tr.has(f)) return IDX.tr.get(f);
        const last = st.slice(-1);
        if (MUT[last]) {
          const f2 = fold(st.slice(0, -1) + MUT[last]);
          if (IDX.tr.has(f2)) return IDX.tr.get(f2);
        }
        if (depth < 1) {
          const r = trStem(st, depth + 1);
          if (r) return r;
        }
      }
    }
    return null;
  }
  function lookup(tok, L) {
    const f = fold(tok);
    if (IDX[L].has(f)) return IDX[L].get(f);
    if (L === 'tr') {
      const r = trStem(tok, 0);
      if (r) return r;
    }
    if (f.length >= 6) for (const [w, e] of FZ[L]) if (dl1(f, w)) return [e];
    return null;
  }
  /** Matches one language: hits (role, id, pos, word) in sentence order plus a language score. */
  function matchLang(text, L) {
    const toks = norm(text, L).split(' ').filter(Boolean);
    const ft = toks.map(fold);
    const used = [];
    const hits = [];
    let stop = 0;
    for (const p of PHR[L]) {
      for (let s = 0; s + p.toks.length <= ft.length; s++) {
        let ok = true;
        for (let j = 0; j < p.toks.length; j++) {
          if (used[s + j] || ft[s + j] !== p.toks[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (let j = 0; j < p.toks.length; j++) used[s + j] = 1;
          hits.push({ pos: s, role: p.e.role, id: p.e.id, word: toks.slice(s, s + p.toks.length).join(' ') });
        }
      }
    }
    toks.forEach((tk, k) => {
      if (STOPW[L].includes(tk)) stop++;
      if (used[k]) return;
      const r = lookup(tk, L);
      if (r) for (const e of r) hits.push({ pos: k, role: e.role, id: e.id, word: tk });
    });
    hits.sort((a, b) => a.pos - b.pos);
    const content = hits.filter((h) => h.role !== 'pron').length;
    return { lang: L, hits, tokens: toks, score: content * 3 + stop + (hits.length - content) };
  }
  /** An end marker counts at the end of the line only; ambiguous single words (END_SHORT) only in a short line. */
  function isEndHit(h, toks) {
    const len = h.word.split(' ').length;
    if (h.pos + len !== toks.length) return false;
    const w = fold(h.word);
    if (END_SHORT[w] && toks.length > END_SHORT[w]) return false;
    return !(w === 'son' && h.pos > 0 && fold(toks[h.pos - 1]) === 'en'); // "en son" = "lastly"
  }

  // ---- state ---------------------------------------------------------------------------------------
  function emptyState() {
    // `landmarkSeen` / `landmarkAt` = last mention of the landmark (sentence number / ms) – internal, not in snapshot().
    return { scene: null, loop: null, place: null, landmark: null, landmarkSeen: 0, landmarkAt: 0, time: 'day', weather: 'clear', mood: 'calm', actors: [], props: [], caption: '', lang: null, end: false, shake: false };
  }
  function sceneFor(w) {
    if (SCENE_BY_WEATHER[w.weather]) return SCENE_BY_WEATHER[w.weather];
    if (w.landmark && SCENE_BY_PLACE[w.landmark] && !SCENE_BY_PLACE[w.place]) return SCENE_BY_PLACE[w.landmark];
    if (w.place && SCENE_BY_PLACE[w.place]) return SCENE_BY_PLACE[w.place];
    if (w.props.some((p) => p.role === 'fire')) return 'fire';
    if (SCENE_BY_TIME[w.time]) return SCENE_BY_TIME[w.time];
    if (w.place || w.actors.length || w.props.length) return 'sunrise'; // a daylight stage for whoever is on it
    return null;
  }
  function snapshot(w) {
    return {
      scene: w.scene,
      loop: w.scene ? LOOP_BY_SCENE[w.scene] || null : null,
      place: w.place,
      landmark: w.landmark,
      time: w.time,
      weather: w.weather,
      mood: w.mood,
      actors: w.actors.map((a) => ({ emoji: a.emoji, role: a.role, action: a.action })),
      props: (w.landmark && LANDMARK_SPRITE[w.landmark] ? [{ emoji: LANDMARK_SPRITE[w.landmark], role: w.landmark }] : []).concat(w.props.map((p) => ({ emoji: p.emoji, role: p.role }))),
      caption: w.caption,
      lang: w.lang,
      end: w.end,
      shake: w.shake,
    };
  }

  /**
   * @param {{lang?: 'auto'|'de'|'tr'|'en', caption?: boolean, ttl?: Partial<typeof TTL>, now?: () => number}} [opts]
   *   `caption: true` keeps the last final line as scene caption; `ttl` overrides the lifetimes, `now` the clock (ms).
   */
  function create(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    let langSel = LANGS.includes(o.lang) ? o.lang : 'auto';
    let lastLang = null;
    const listeners = new Set();
    let w = emptyState();
    let lastJson = JSON.stringify(snapshot(w));
    let lastFig = null;
    const ttl = { ...TTL };
    if (o.ttl && typeof o.ttl === 'object') for (const k of Object.keys(TTL)) if (Number.isFinite(o.ttl[k]) && o.ttl[k] >= 0) ttl[k] = o.ttl[k];
    const clock = typeof o.now === 'function' ? o.now : () => Date.now();
    let lineNo = 0; // final sentences so far
    let ctx = { place: null, weather: 'clear' }; // the picture after the last final line (context-change detection)

    const touch = (x, now) => {
      x.seen = lineNo;
      x.seenAt = now;
    };
    /** Removes props / actors / the landmark past their lifetime (`byLines`: also the sentence limit). */
    function expire(now, byLines) {
      const gone = [];
      const old = (seen, seenAt, lines, ms) => (byLines && lineNo - seen >= lines) || now - seenAt >= ms;
      w.props = w.props.filter((p) => !(old(p.seen, p.seenAt, ttl.propLines, ttl.propMs) && gone.push({ kind: 'prop', role: p.role })));
      w.actors = w.actors.filter((a) => !(old(a.seen, a.seenAt, ttl.actorLines, ttl.actorMs) && gone.push({ kind: 'actor', role: a.role })));
      if (w.landmark && old(w.landmarkSeen, w.landmarkAt, ttl.propLines, ttl.propMs)) {
        gone.push({ kind: 'landmark', role: w.landmark });
        w.landmark = null;
      }
      return gone;
    }

    function analyse(text, forced) {
      const L = LANGS.includes(forced) ? forced : langSel !== 'auto' ? langSel : null;
      if (L) return matchLang(text, L);
      let best = null;
      for (const l of LANGS) {
        const r = matchLang(text, l);
        if (!best || r.score > best.score || (r.score === best.score && l === lastLang)) best = r;
      }
      if (best.score > 0) lastLang = best.lang;
      return best;
    }

    /** Notifies the listeners `(state, {reason: 'feed'|'tick'|'reset'})` when the snapshot changed. */
    function emit(reason = 'feed') {
      const s = snapshot(w);
      const json = JSON.stringify(s);
      if (json === lastJson) return false;
      lastJson = json;
      for (const fn of listeners) {
        try {
          fn(s, { reason });
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('LiveFX story listener failed', e);
        }
      }
      return true;
    }

    const api = {
      /** Current scene state (fresh copy). */
      get state() {
        return snapshot(w);
      },
      get lang() {
        return langSel;
      },
      setLang(l) {
        langSel = LANGS.includes(l) ? l : 'auto';
        return langSel;
      },
      /** `fn(state, {reason})` on every change; reason `feed` (a line), `tick` (lifetime expiry) or `reset`. */
      onChange(fn) {
        if (typeof fn === 'function') listeners.add(fn);
        return () => listeners.delete(fn);
      },
      /** Final sentences fed so far (the lifetime clock of props / actors). */
      get lines() {
        return lineNo;
      },
      reset() {
        w = emptyState();
        lastFig = null;
        ctx = { place: null, weather: 'clear' };
        emit('reset');
        return api.state;
      },
      /**
       * Time-based lifetime between lines: removes props not mentioned for `TTL.propMs` (45 s) and actors not
       * mentioned for `TTL.actorMs` (60 s). Call it about once a second (the overlay does). Returns
       * `{ changed, expired: [{kind: 'prop'|'actor'|'landmark', role}], state }`.
       */
      tick(now) {
        const t = Number.isFinite(now) ? now : clock();
        const expired = w.end ? [] : expire(t, false);
        if (!expired.length) return { changed: false, expired, state: api.state };
        w.shake = false; // shake belongs to the line that said "suddenly", not to an expiry
        w.scene = sceneFor(w);
        return { changed: emit('tick'), expired, state: api.state };
      },
      /**
       * Feeds one transcript line. `final: false` = interim (only place / time / weather / mood move).
       * `now` (ms) overrides the clock for this line. Returns `{ lang, hits, decisions, changed, state }` –
       * `decisions` lists every applied word (2.2.1: also `{role: 'expire', kind, id}` for items whose lifetime ended).
       */
      feed(text, fopts = {}) {
        const f = fopts && typeof fopts === 'object' ? fopts : {};
        const final = f.final !== false;
        const line = typeof text === 'string' ? text.trim() : '';
        if (!line) return { lang: lastLang, hits: 0, decisions: [], changed: false, state: api.state };
        const now = Number.isFinite(f.now) ? f.now : clock();
        const r = analyse(line, f.lang);
        const hits = r.hits;
        const by = (role) => hits.filter((h) => h.role === role);
        const last = (a) => a[a.length - 1];
        const dec = [];
        w.shake = false;
        if (hits.length) w.lang = r.lang;
        if (final) lineNo++;
        // Time limit first (a host without tick() still gets it), the sentence limit after the line's mentions.
        for (const g of expire(now, false)) dec.push({ role: 'expire', kind: g.kind, id: g.role });

        if (by('open').length) {
          // Story opening: a fresh stage (figures walk out, daytime, clear sky).
          w = Object.assign(emptyState(), { lang: r.lang });
          lastFig = null;
          dec.push({ role: 'open', word: by('open')[0].word });
        }
        const pl = by('place');
        if (pl.length) {
          const nat = pl.filter((h) => NATURE[h.id]);
          const str = pl.filter((h) => !NATURE[h.id]);
          if (nat.length && str.length) {
            w.place = last(nat).id;
            w.landmark = last(str).id;
            w.landmarkSeen = lineNo;
            w.landmarkAt = now;
            dec.push({ role: 'place', id: w.place, word: last(nat).word }, { role: 'landmark', id: w.landmark, word: last(str).word });
          } else {
            const p = last(pl).id;
            if (p !== w.place) w.landmark = null;
            w.place = p;
            dec.push({ role: 'place', id: p, word: last(pl).word });
          }
        }
        const tm = by('time');
        if (tm.length) {
          w.time = last(tm).id;
          dec.push({ role: 'time', id: w.time, word: last(tm).word });
        }
        const we = by('weather');
        const st = by('stop');
        if (st.length && (we.length || w.weather !== 'clear')) {
          w.weather = 'clear';
          dec.push({ role: 'stop', word: st[0].word });
        } else if (we.length) {
          w.weather = last(we).id;
          dec.push({ role: 'weather', id: w.weather, word: last(we).word });
        }
        const md = by('mood');
        if (md.length) {
          w.mood = last(md).id;
          dec.push({ role: 'mood', id: w.mood, word: last(md).word });
        }
        if (final) {
          const fg = by('figure');
          const seen = {};
          for (const h of fg) {
            if (seen[h.id]) continue;
            seen[h.id] = 1;
            let a = w.actors.find((x) => x.role === h.id);
            if (!a) {
              a = { emoji: SPRITE[h.id] || '⭐', role: h.id, action: null };
              w.actors.push(a);
              while (w.actors.length > ACTORS_MAX) w.actors.shift();
            }
            touch(a, now);
            dec.push({ role: 'figure', id: h.id, word: h.word });
          }
          if (fg.length) lastFig = last(fg).id;
          const ob = by('object');
          const so = {};
          for (const h of ob) {
            if (so[h.id]) continue;
            so[h.id] = 1;
            let p = w.props.find((x) => x.role === h.id);
            if (!p) {
              p = { emoji: SPRITE[h.id] || '⭐', role: h.id };
              w.props.push(p);
              while (w.props.length > PROPS_MAX) w.props.shift();
            }
            touch(p, now);
            dec.push({ role: 'object', id: h.id, word: h.word });
          }
          if (w.landmark && pl.some((h) => h.id === w.landmark)) {
            w.landmarkSeen = lineNo;
            w.landmarkAt = now;
          }
          // A person pronoun ("sie", "o", "he") keeps talking about the last figure.
          const lastActor = () => (lastFig && w.actors.find((a) => a.role === lastFig)) || last(w.actors) || null;
          if (by('pron').some((h) => PERSON_PRON[fold(h.word)])) {
            const a = lastActor();
            if (a) touch(a, now);
          }
          const nearest = (list, pos) => {
            let near = null;
            for (const x of list) {
              const dist = Math.abs(x.pos - pos);
              if (!near || dist < near.dist || (dist === near.dist && x.pos < pos)) near = { h: x, dist };
            }
            return near ? near.h : null;
          };
          for (const h of by('action')) {
            // A removal verb with a destination in the line ("ormana gitti", "left for the castle") is a walk.
            const id = h.id === 'leave' && pl.length ? 'go' : h.id;
            if (id === 'vanish' || id === 'leave') {
              // Removal: the nearest figure or object in the line leaves (an object: "das Auto verschwand", "araba
              // gitti"); a landmark named alone ("das Schloss verschwand") leaves the band; else the last figure.
              const t = nearest(fg.concat(ob), h.pos);
              if (t && t.role === 'object') {
                w.props = w.props.filter((p) => p.role !== t.id);
                dec.push({ role: 'action', id, who: t.id, word: h.word });
                continue;
              }
              const pron = by('pron').some((x) => PERSON_PRON[fold(x.word)]);
              if (!t && pl.length && !pron) {
                // "Das Schloss verschwand" – only a landmark can leave; "der Wald verschwand im Nebel" changes nothing.
                const lm = pl.find((x) => x.id === w.landmark);
                if (lm) {
                  w.landmark = null;
                  dec.push({ role: 'action', id, who: lm.id, word: h.word });
                }
                continue;
              }
              const a = t ? w.actors.find((x) => x.role === t.id) : lastActor();
              if (!a) continue;
              w.actors = w.actors.filter((x) => x !== a);
              if (lastFig === a.role) lastFig = null;
              dec.push({ role: 'action', id, who: a.role, word: h.word });
              continue;
            }
            // The nearest figure in the line owns the verb (ties go to the one before it – "der Drache flog" –
            // but "dann schlief die Katze ein" binds to the cat after the verb); otherwise the last figure seen.
            const near = nearest(fg, h.pos);
            const a = near ? w.actors.find((x) => x.role === near.id) : lastActor();
            if (!a) continue;
            if (id !== 'come') a.action = id;
            touch(a, now);
            dec.push({ role: 'action', id, who: a.role, word: h.word });
          }
          if (md.some((h) => h.id === 'tense')) w.shake = true;
          // New place or new weather = a new picture: props from the old one leave unless the same or the previous
          // sentence named them (actors stay; they leave by lifetime, a removal verb or the end).
          if (w.place !== ctx.place || w.weather !== ctx.weather) {
            const keep = [];
            for (const p of w.props) {
              if (lineNo - p.seen <= 1) keep.push(p);
              else dec.push({ role: 'expire', kind: 'prop', id: p.role });
            }
            w.props = keep;
            if (w.landmark && lineNo - w.landmarkSeen > 1) {
              dec.push({ role: 'expire', kind: 'landmark', id: w.landmark });
              w.landmark = null;
            }
          }
          for (const g of expire(now, true)) dec.push({ role: 'expire', kind: g.kind, id: g.role });
          const ends = by('end').filter((h) => isEndHit(h, r.tokens));
          if (ends.length) {
            w.end = true;
            w.actors = [];
            w.props = [];
            w.place = null;
            w.landmark = null;
            w.weather = 'clear';
            w.time = 'day';
            dec.push({ role: 'end', word: ends[0].word });
          } else if (dec.length) w.end = false;
          ctx = { place: w.place, weather: w.weather };
          if (o.caption && hits.length) w.caption = line.length > 80 ? `${line.slice(0, 79)}…` : line;
        }
        w.scene = w.end ? null : sceneFor(w);
        const changed = emit('feed');
        return { lang: r.lang, hits: hits.length, decisions: dec, changed, state: api.state };
      },
    };
    return api;
  }

  return { create, matchLang, SPRITE, LEX, LANGS, TTL, SCENE_BY_PLACE, SCENE_BY_WEATHER, SCENE_BY_TIME, LOOP_BY_SCENE };
});
