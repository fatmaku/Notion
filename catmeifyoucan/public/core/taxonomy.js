// Cat Me If You Can – feste Wertelisten (Enums) für die Katzenanalyse, mit Beschriftungen.
//
// Dieselben Listen benutzen: das JSON-Schema für Claude (server/analyzer-claude.js), die
// Normalisierung (core/analysis.js), die Oberfläche und der CSV-Export. Neue Werte hier
// ergänzen – alles andere zieht nach. TR/DE/EN stehen hier, RU/AR/FA in core/labels/<code>.js
// (werden beim Laden eingemischt).

import ru from './labels/ru.js';
import ar from './labels/ar.js';
import fa from './labels/fa.js';

const L = (tr, de, en) => ({ tr, de, en });

/** Fell-/Typ-Klassen – das ist die „Art“ im KediDex (wie Pokémon-Typen). */
export const PATTERNS = {
  tekir: { label: L('Tekir', 'Tigerkatze', 'Tabby'), rarity: 'common', colors: ['brown', 'gray', 'black'] },
  sarman: { label: L('Sarman', 'Rote Katze', 'Ginger'), rarity: 'common', colors: ['orange'] },
  krem: { label: L('Krem', 'Creme', 'Cream'), rarity: 'uncommon', colors: ['cream'] },
  siyah: { label: L('Siyah', 'Schwarz', 'Black'), rarity: 'common', colors: ['black'] },
  beyaz: { label: L('Beyaz', 'Weiß', 'White'), rarity: 'uncommon', colors: ['white'] },
  gri: { label: L('Gri', 'Grau', 'Gray'), rarity: 'uncommon', colors: ['gray'] },
  smokin: { label: L('Smokin', 'Smoking (Schwarz-Weiß)', 'Tuxedo'), rarity: 'common', colors: ['black', 'white'] },
  tekir_beyaz: { label: L('Beyaz-Tekir', 'Tiger mit Weiß', 'Tabby & white'), rarity: 'common', colors: ['brown', 'gray', 'white'] },
  sarman_beyaz: { label: L('Beyaz-Sarman', 'Rot-Weiß', 'Ginger & white'), rarity: 'common', colors: ['orange', 'white'] },
  gri_beyaz: { label: L('Gri-Beyaz', 'Grau-Weiß', 'Gray & white'), rarity: 'uncommon', colors: ['gray', 'white'] },
  uc_renk: { label: L('Üç Renkli', 'Glückskatze (Dreifarbig)', 'Calico'), rarity: 'rare', colors: ['orange', 'black', 'white'] },
  kaplumbaga: { label: L('Kaplumbağa', 'Schildpatt', 'Tortoiseshell'), rarity: 'rare', colors: ['orange', 'black'] },
  renk_uclu: { label: L('Siyam Tipi', 'Point-Zeichnung (Siam-Typ)', 'Colorpoint'), rarity: 'rare', colors: ['cream', 'brown'] },
  van: { label: L('Van Deseni', 'Van-Zeichnung', 'Van pattern'), rarity: 'epic', colors: ['white', 'orange'] },
  diger: { label: L('Diğer', 'Andere', 'Other'), rarity: 'common', colors: [] },
};

/** Verwandte Muster – dieselbe Katze kann je nach Licht/Winkel so oder so eingestuft werden. */
export const PATTERN_RELATED = [
  ['tekir', 'tekir_beyaz'], ['tekir', 'gri'], ['tekir', 'kaplumbaga'],
  ['sarman', 'krem'], ['sarman', 'sarman_beyaz'], ['krem', 'sarman_beyaz'],
  ['siyah', 'smokin'], ['siyah', 'kaplumbaga'], ['gri', 'gri_beyaz'],
  ['beyaz', 'van'], ['beyaz', 'gri_beyaz'], ['beyaz', 'smokin'],
  ['uc_renk', 'kaplumbaga'], ['uc_renk', 'sarman_beyaz'], ['van', 'sarman_beyaz'], ['renk_uclu', 'krem'],
];

export const COAT_COLORS = {
  black: L('siyah', 'schwarz', 'black'),
  white: L('beyaz', 'weiß', 'white'),
  gray: L('gri', 'grau', 'gray'),
  orange: L('turuncu', 'rot/orange', 'orange'),
  cream: L('krem', 'creme', 'cream'),
  brown: L('kahverengi', 'braun', 'brown'),
};

export const EYE_COLORS = {
  yellow: L('sarı/kehribar', 'gelb/bernstein', 'yellow/amber'),
  green: L('yeşil', 'grün', 'green'),
  blue: L('mavi', 'blau', 'blue'),
  copper: L('bakır', 'kupfer', 'copper'),
  odd: L('iki renkli (heterokromi)', 'zweifarbig (Heterochromie)', 'odd-eyed'),
  unknown: L('görünmüyor', 'nicht sichtbar', 'not visible'),
};

export const AGE_GROUPS = {
  kitten: { label: L('Yavru', 'Kitten', 'Kitten'), months: [0, 6] },
  junior: { label: L('Genç', 'Jungkatze', 'Junior'), months: [6, 24] },
  adult: { label: L('Yetişkin', 'Erwachsen', 'Adult'), months: [24, 96] },
  senior: { label: L('Yaşlı', 'Senior', 'Senior'), months: [96, 240] },
  unknown: { label: L('Bilinmiyor', 'Unbekannt', 'Unknown'), months: [null, null] },
};

/** Body Condition Score 1–9 (WSAVA) → Klassen. */
export const BCS_CLASSES = {
  very_thin: { label: L('Çok zayıf', 'Stark untergewichtig', 'Very thin'), range: [1, 2] },
  thin: { label: L('Zayıf', 'Untergewichtig', 'Thin'), range: [3, 3] },
  ideal: { label: L('İdeal', 'Ideal', 'Ideal'), range: [4, 5] },
  overweight: { label: L('Kilolu', 'Übergewichtig', 'Overweight'), range: [6, 7] },
  obese: { label: L('Obez', 'Stark übergewichtig', 'Obese'), range: [8, 9] },
  unknown: { label: L('Değerlendirilemedi', 'Nicht beurteilbar', 'Not assessable'), range: [null, null] },
};

export const SEX = {
  female: L('Dişi', 'Weiblich', 'Female'),
  male: L('Erkek', 'Männlich', 'Male'),
  unknown: L('Bilinmiyor', 'Unbekannt', 'Unknown'),
};

/** Kulakkerbe/-spitze = Kastrationsmarke (TNR) – in Istanbul üblich. */
export const EAR_TIP = {
  tipped: L('Kulak kesik (kısırlaştırılmış)', 'Ohr markiert (kastriert)', 'Ear-tipped (neutered)'),
  none: L('Kulak işareti yok', 'Keine Ohrmarke', 'No ear tip'),
  not_visible: L('Kulaklar görünmüyor', 'Ohren nicht sichtbar', 'Ears not visible'),
};

export const HEALTH_FLAGS = {
  eye_discharge: L('Göz akıntısı', 'Augenausfluss', 'Eye discharge'),
  eye_injury: L('Göz yaralanması', 'Augenverletzung', 'Eye injury'),
  nasal_discharge: L('Burun akıntısı', 'Nasenausfluss', 'Nasal discharge'),
  wound: L('Yara', 'Wunde', 'Wound'),
  skin_issue: L('Deri sorunu', 'Hautproblem', 'Skin problem'),
  hair_loss: L('Tüy dökülmesi', 'Fellverlust', 'Hair loss'),
  limping: L('Topallama', 'Humpeln', 'Limping'),
  very_thin: L('Aşırı zayıflık', 'Starke Abmagerung', 'Emaciation'),
  ear_issue: L('Kulak sorunu', 'Ohrenproblem', 'Ear problem'),
  mouth_issue: L('Ağız/diş sorunu', 'Maul-/Zahnproblem', 'Mouth/teeth problem'),
  matted_coat: L('Keçeleşmiş tüy', 'Verfilztes Fell', 'Matted coat'),
  pregnant_possible: L('Hamile olabilir', 'Evtl. trächtig', 'Possibly pregnant'),
  nursing: L('Emziriyor', 'Säugend', 'Nursing'),
};

/** Dringlichkeit – Statusfarben im UI: none=good, mild=warning, attention=serious, urgent=critical. */
export const SEVERITY = {
  none: { label: L('Sağlıklı görünüyor', 'Wirkt gesund', 'Looks healthy'), rank: 0 },
  mild: { label: L('Hafif', 'Leicht', 'Mild'), rank: 1 },
  attention: { label: L('Dikkat', 'Beobachten', 'Needs attention'), rank: 2 },
  urgent: { label: L('Acil', 'Dringend', 'Urgent'), rank: 3 },
};

export const BEHAVIOR = {
  relaxed: L('Rahat', 'Entspannt', 'Relaxed'),
  sleeping: L('Uyuyor', 'Schläft', 'Sleeping'),
  curious: L('Meraklı', 'Neugierig', 'Curious'),
  alert: L('Tetikte', 'Wachsam', 'Alert'),
  eating: L('Yemek yiyor', 'Frisst', 'Eating'),
  playing: L('Oynuyor', 'Spielt', 'Playing'),
  grooming: L('Temizleniyor', 'Putzt sich', 'Grooming'),
  fearful: L('Korkmuş', 'Ängstlich', 'Fearful'),
  defensive: L('Savunmada', 'Abwehrend', 'Defensive'),
  unknown: L('Belirsiz', 'Unklar', 'Unclear'),
};

export const SETTINGS = {
  street: L('Sokak', 'Straße', 'Street'),
  park: L('Park', 'Park', 'Park'),
  coast: L('Sahil', 'Küste', 'Seaside'),
  garden: L('Bahçe', 'Garten', 'Garden'),
  shop_cafe: L('Dükkan/Kafe', 'Laden/Café', 'Shop/café'),
  market: L('Pazar', 'Markt', 'Market'),
  stairs_wall: L('Merdiven/Duvar', 'Treppe/Mauer', 'Stairs/wall'),
  car: L('Araba', 'Auto', 'Car'),
  roof: L('Çatı', 'Dach', 'Roof'),
  indoor: L('İç mekân', 'Innenraum', 'Indoor'),
  other: L('Diğer', 'Sonstiges', 'Other'),
};

/** Straßenkatze oder Hauskatze? Nur Straßenkatzen zählen im Spiel. */
export const OWNERSHIP = {
  street: L('Sokak kedisi', 'Straßenkatze', 'Street cat'),
  owned: L('Ev kedisi', 'Hauskatze', 'Pet cat'),
  unclear: L('Belirsiz', 'Unklar', 'Unclear'),
};

/** Status einer Katze im Zensus. `missing` wird beim Lesen berechnet (lange nicht gesehen). */
export const CAT_STATUS = {
  active: L('Sokakta, iyi', 'Draußen, gut', 'Outdoors, fine'),
  needs_help: L('Yardım gerekiyor', 'Braucht Hilfe', 'Needs help'),
  in_care: L('Tedavide/bakımda', 'In Behandlung', 'In care'),
  adopted: L('Sahiplendirildi', 'Adoptiert', 'Adopted'),
  missing: L('Uzun süredir görülmedi', 'Lange nicht gesehen', 'Not seen lately'),
  deceased: L('Hayatını kaybetti', 'Verstorben', 'Deceased'),
};

export const RARITY = {
  common: { label: L('Yaygın', 'Häufig', 'Common'), stars: 1, mult: 1 },
  uncommon: { label: L('Az bulunur', 'Selten', 'Uncommon'), stars: 2, mult: 1.25 },
  rare: { label: L('Nadir', 'Rar', 'Rare'), stars: 3, mult: 1.6 },
  epic: { label: L('Destansı', 'Episch', 'Epic'), stars: 4, mult: 2 },
  legendary: { label: L('Efsane', 'Legende', 'Legendary'), stars: 5, mult: 3 },
};

/**
 * Zustand, den Spieler:innen beim Fangen selbst melden (zusätzlich zur KI). severity bestimmt,
 * ob die Katze in den Hilfe-Radar kommt; need markiert Versorgungsbedarf (Futter/Wasser).
 */
export const CONDITION_TAGS = {
  healthy: { label: L('Sağlıklı', 'Gesund', 'Healthy'), icon: '😺', severity: 'none' },
  fed: { label: L('Besledim', 'Ich habe gefüttert', 'I fed it'), icon: '🥣', severity: 'none' },
  hungry: { label: L('Aç', 'Hungrig', 'Hungry'), icon: '🍽️', severity: 'mild', need: 'food' },
  thirsty: { label: L('Susamış', 'Durstig', 'Thirsty'), icon: '💧', severity: 'mild', need: 'water' },
  thin: { label: L('Çok zayıf', 'Sehr dünn', 'Very thin'), icon: '🦴', severity: 'attention' },
  sick: { label: L('Hasta (göz, burun, hapşırık)', 'Krank (Augen, Nase, Niesen)', 'Sick (eyes, nose, sneezing)'), icon: '🤒', severity: 'attention' },
  injured: { label: L('Yaralı', 'Verletzt', 'Injured'), icon: '🩹', severity: 'urgent' },
  limping: { label: L('Topallıyor', 'Humpelt', 'Limping'), icon: '🦵', severity: 'attention' },
  cold: { label: L('Üşüyor / ıslak', 'Friert / nass', 'Cold / wet'), icon: '🥶', severity: 'attention' },
  pregnant: { label: L('Hamile', 'Trächtig', 'Pregnant'), icon: '🤰', severity: 'mild' },
  kittens: { label: L('Yavruları var', 'Hat Kitten', 'Has kittens'), icon: '🍼', severity: 'mild' },
  danger: { label: L('Tehlikede (trafik, sıkışmış)', 'In Gefahr (Verkehr, eingeklemmt)', 'In danger (traffic, stuck)'), icon: '⚠️', severity: 'urgent' },
  lost_pet: { label: L('Kayıp ev kedisi olabilir', 'Vielleicht entlaufen', 'Maybe a lost pet'), icon: '🏠', severity: 'mild' },
};

export const PLACE_TYPES = {
  partner: { label: L('Partner kafe', 'Partner-Café', 'Partner café'), icon: '☕' },
  feeding: { label: L('Mama noktası', 'Futterstelle', 'Feeding point'), icon: '🥣' },
  water: { label: L('Su kabı', 'Wasserstelle', 'Water bowl'), icon: '💧' },
  shelter: { label: L('Kedi evi', 'Katzenhaus', 'Cat shelter'), icon: '🏠' },
  vet: { label: L('Veteriner', 'Tierarzt', 'Vet'), icon: '🩺' },
};

export const ROLES = ['player', 'volunteer', 'admin'];

export const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];

/** Beschriftung eines Enum-Werts in der gewünschten Sprache (Rückfall: en → tr → Schlüssel). */
export function label(table, key, lang = 'tr') {
  const entry = table && table[key];
  if (!entry) return key == null ? '' : String(key);
  const l = entry.label || entry;
  return l[lang] || l.en || l.tr || String(key);
}

/** Tabellen nach Namen – für die Sprachdateien in core/labels/. */
export const TABLES = {
  PATTERNS, COAT_COLORS, EYE_COLORS, AGE_GROUPS, BCS_CLASSES, SEX, EAR_TIP, HEALTH_FLAGS, SEVERITY, BEHAVIOR,
  SETTINGS, OWNERSHIP, CAT_STATUS, RARITY, CONDITION_TAGS, PLACE_TYPES,
};

/** Mischt eine Sprachdatei {TABELLE: {schlüssel: 'Text'}} in die Tabellen ein. */
export function mergeLabels(lang, data) {
  for (const [tableName, map] of Object.entries(data || {})) {
    const table = TABLES[tableName];
    if (!table || !map || typeof map !== 'object') continue;
    for (const [key, text] of Object.entries(map)) {
      const entry = table[key];
      if (!entry || typeof text !== 'string' || !text) continue;
      (entry.label || entry)[lang] = text;
    }
  }
}

mergeLabels('ru', ru);
mergeLabels('ar', ar);
mergeLabels('fa', fa);

export function patternsRelated(a, b) {
  if (!a || !b) return false;
  return PATTERN_RELATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
