// Cat Me If You Can – Namensfilter: keine Schimpfwörter, Beleidigungen, sexuellen Begriffe oder
// Hass-Symbole in Katzennamen und Spitznamen – egal in welcher Sprache.
//
// Zwei Stufen:
//   1. lokal (immer, sofort): Normalisierung gegen Verschleierung (Großschreibung, Akzente,
//      1337-Schrift, Wiederholungen, Leerzeichen/Punkte dazwischen) + Wortlisten für TR, DE, EN,
//      FR, ES, IT, NL, PL, RU (lateinisch + kyrillisch), AR (lateinisch + arabisch), EL.
//   2. KI (Server mit API-Key): Claude prüft zusätzlich in JEDER Sprache, auch Anspielungen
//      (server/moderator-claude.js). Ohne KI entscheidet Stufe 1 allein.
//
// ROOTS: Teilstring-Suche im zusammengezogenen Namen („s.i.k.t.i.r“, „ficken123“).
// WORDS: nur als ganzes Wort – sonst träfe „puta“ auch „computadora“.
// EXACT: nur wenn der GANZE Name genau das ist („am“ ist im Satz „Sam I am“ harmlos).
// TR_SIK: die „sik“-Familie wird ohne ı→i-Angleichung geprüft, damit „Işıkım“ (mein Licht) oder
// „sıkıntı“ nicht gesperrt werden.

const ROOTS = [
  // Türkçe
  'orospu', 'orspu', 'orosbu', 'dalyarak', 'amcik', 'aminakoy', 'aminako', 'aminak', 'gotveren', 'gotlek', 'gotos',
  'pezevenk', 'kahpe', 'kaltak', 'yavsak', 'kevase', 'gavat', 'ibne', 'pickurusu', 'serefsiz', 'kancik', 'hassiktir',
  'pedofil',
  // Deutsch
  'arschloch', 'arschgeige', 'arschgesicht', 'wichser', 'wichsen', 'fotze', 'hurensohn', 'hurenkind', 'schlampe', 'fick',
  'nutte', 'schwuchtel', 'missgeburt', 'spast', 'judensau', 'kanake', 'siegheil', 'heilhitler', 'drecksau',
  // English
  'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'asshole', 'arsehole', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard',
  'motherf', 'bastard', 'dickhead', 'jerkoff', 'blowjob', 'handjob', 'porn', 'penis', 'vagina', 'rapist', 'pedophil', 'paedophil',
  // Français / Español / Italiano / Nederlands / Polski
  'putain', 'salope', 'connard', 'encule', 'niquetamere', 'mierda', 'cabron', 'pendejo', 'joder', 'maricon', 'chinga',
  'cazzo', 'stronzo', 'vaffanculo', 'puttana', 'merda', 'klootzak', 'kurwa', 'pierdol', 'jebac', 'spierdalaj',
  // Русский (lateinisch + kyrillisch), Arabisch (lateinisch + Schrift), Griechisch
  'blyat', 'blyad', 'pizd', 'yebat', 'yobany', 'mudak', 'бля', 'пизд', 'хуй', 'хуе', 'хуя', 'ебат', 'ебан', 'мудак', 'сука',
  'sharmut', 'sharmout', 'sharmoot', 'kosomak', 'kusomak', 'شرموط', 'كسمك', 'منيوك', 'malaka',
  // Hass
  'hitler', 'whitepower', 'whitepride', 'kukluxklan',
];

const WORDS = [
  'yarak', 'yarrak', 'amk', 'pic', 'pust', 'tasak', 'gerizekali',
  'arsch', 'hure', 'nazi', 'nazis', 'neger', 'mongo',
  'ass', 'dick', 'cock', 'pussy', 'tits', 'boobs', 'fag', 'sex', 'rape', 'kkk', 'wank', 'twat', 'prick', 'pedo',
  'pute', 'conne', 'nique', 'puta', 'puto', 'cono', 'verga', 'culo', 'troia', 'kut', 'hoer', 'lul', 'kanker',
  'chuj', 'suka', 'zebi', 'ayre', 'زب', 'كس',
];

const EXACT = ['am', 'aq', 'mk', 'oc', 'pd', 'got', 'dol', 'hui', 'huy', 'cum'];

const TR_SIK = { roots: ['siktir', 'sikis', 'sikik', 'sikim', 'sikerim', 'sikeyim', 'siktig', 'sikiyim'], words: ['sik', 'sikko'] };

/** Namen, die Personal/Organisation vortäuschen könnten (nur für Spitznamen). */
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'system', 'sistem', 'support', 'destek', 'catme', 'catmeifyoucan', 'kedidex', 'belediye', 'official', 'resmi'];

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '€': 'e', '!': 'i', '|': 'i' };
const FOLD = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'þ': 'th', 'ё': 'е' };
// Kyrillische Doppelgänger lateinischer Buchstaben – nur in überwiegend lateinischen Namen ersetzt.
const HOMO = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'к': 'k', 'м': 'm', 'т': 't', 'в': 'b', 'н': 'h', 'і': 'i' };

/**
 * Normalisiert für den Vergleich: klein, ohne Akzente, 1337 → Buchstaben, Wiederholungen
 * zusammengezogen, alles außer Buchstaben/Ziffern → Leerzeichen. Das türkische ı bleibt erhalten
 * (foldDotless=true macht daraus i).
 */
export function normalizeForFilter(input, { foldDotless = true } = {}) {
  let s = String(input || '').normalize('NFKD').replace(/[̀-ًͯ-ٰٟ]/g, '');
  s = s.toLowerCase();
  s = [...s].map((ch) => (ch === 'ı' ? (foldDotless ? 'i' : 'ı') : FOLD[ch] ?? LEET[ch] ?? ch)).join('');
  const latin = (s.match(/[a-z]/g) || []).length;
  const cyr = (s.match(/[Ѐ-ӿ]/g) || []).length;
  if (latin && cyr && latin >= cyr) s = [...s].map((ch) => HOMO[ch] ?? ch).join('');
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  s = s.replace(/(\p{L})\1+/gu, '$1');
  return s;
}

const prep = (list) => [...new Set(list.map((w) => normalizeForFilter(w).replace(/ /g, '')))];
const ROOTS_N = prep(ROOTS);
const WORDS_N = new Set(prep(WORDS));
const EXACT_N = new Set(prep(EXACT));
const SIK_ROOTS = prep(TR_SIK.roots);
const SIK_WORDS = new Set(prep(TR_SIK.words));
const SIK_PREFIX = /^sik(er|erim|eyim|ik|im|in|is|ti|tir|iyim|ici)$/;
const RESERVED_N = new Set(prep(RESERVED));

/**
 * Prüft einen Namen. Rückgabe {ok: true} oder {ok: false, reason: 'profanity'|'reserved', match}.
 * kind: 'cat' | 'player' (reservierte Namen gelten nur für Spitznamen)
 */
export function checkName(input, { kind = 'cat' } = {}) {
  const raw = String(input || '');
  if (/1\D{0,2}4\D{0,2}8\D{0,2}8/.test(raw)) return { ok: false, reason: 'profanity', match: '1488' };
  const n = normalizeForFilter(raw);
  if (!n) return { ok: true };
  const tokens = n.split(' ');
  const compact = tokens.join('');
  if (EXACT_N.has(compact)) return { ok: false, reason: 'profanity', match: compact };
  for (const t of [...tokens, compact]) if (WORDS_N.has(t)) return { ok: false, reason: 'profanity', match: t };
  for (const r of ROOTS_N) if (compact.includes(r)) return { ok: false, reason: 'profanity', match: r };

  const nTr = normalizeForFilter(raw, { foldDotless: false });
  const tokTr = nTr.split(' ');
  const compactTr = tokTr.join('');
  for (const t of [...tokTr, compactTr]) if (SIK_WORDS.has(t) || SIK_PREFIX.test(t)) return { ok: false, reason: 'profanity', match: t };
  for (const r of SIK_ROOTS) if (compactTr.includes(r)) return { ok: false, reason: 'profanity', match: r };

  if (kind === 'player' && (RESERVED_N.has(compact) || tokens.some((t) => RESERVED_N.has(t)))) return { ok: false, reason: 'reserved', match: compact };
  return { ok: true };
}
