// Cat Me If You Can – Spielregeln. Alles Einstellbare an einem Ort; der Server kann Werte per
// data/game.override.json überschreiben (siehe server/app.js), ohne Code zu ändern.

import ru from '../core/labels/ru.js';
import ar from '../core/labels/ar.js';
import fa from '../core/labels/fa.js';

const L = (tr, de, en) => ({ tr, de, en });

export const GAME = {
  /** Tagesziel: so viele *verschiedene* Katzen an einem Tag → Gutschein. */
  dailyGoal: 20,
  /** Mindestabstand zwischen zwei Fängen (Sekunden) – Anti-Spam und Katzen nicht stressen. */
  catchCooldownSec: 20,
  /** Obergrenze Fänge pro Spieler und Tag. */
  maxCatchesPerDay: 150,
  /** Schneller als das zwischen zwei Fängen → „unmögliche Reise“, Fang zählt nicht. */
  maxSpeedKmh: 45,
  /** GPS-Genauigkeit schlechter als das (Meter) → Fang wird erfasst, zählt aber nicht. */
  maxGpsAccuracyM: 150,
  /** Kamera-Fotos müssen frisch sein (Sekunden zwischen Aufnahme und Upload). */
  maxPhotoAgeSec: 600,
  /** Gleiches Foto (dHash-Abstand ≤ x Bit) wird abgelehnt. */
  duplicateHashBits: 5,
  /** Wiedererkennung: Suchradius und Schwellwerte (siehe core/reid.js). */
  reid: { radiusM: 450, linkScore: 0.8, verifyLow: 0.55, autoLinkWithVerifier: 0.94, maxCandidates: 3 },
  /** So lange nicht gesehen → Status „lange nicht gesehen“. */
  missingAfterDays: 30,
  /** Öffentliche Karte: Koordinaten auf x Nachkommastellen runden (3 ≈ 110 m) – Schutz der Tiere. */
  publicLocationDecimals: 3,
  /** Hilfe-Meldungen pro Spieler und Tag. */
  maxHelpReportsPerDay: 10,

  xp: {
    discovery: 100, // neue Katze entdeckt
    firstCatch: 50, // Katze zum ersten Mal selbst gefangen
    dailyCatch: 20, // bekannte Katze, heute zum ersten Mal
    resighting: 5, // dieselbe Katze heute nochmal
    healthReport: 30, // Fang mit Gesundheitshinweis (Hilfe-Radar)
    dailyGoal: 200, // Tagesziel erreicht
    conditionReport: 10, // Zustand der Katze beim Fang gemeldet (gesund/hungrig/krank …)
  },

  /** XP-Schwellen je Level (Index = Level-1). */
  levels: [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500, 8500, 11000, 14000, 18000, 23000, 30000, 40000, 52000, 70000],
  levelTitles: [
    L('Çırak', 'Lehrling', 'Apprentice'),
    L('Sokak Gözcüsü', 'Straßenspäher', 'Street scout'),
    L('Mahalle Dostu', 'Kiez-Freund', 'Neighbourhood friend'),
    L('Kedi Avcısı', 'Katzenjäger', 'Cat hunter'),
    L('Moda Kâşifi', 'Moda-Entdecker', 'Moda explorer'),
    L('Kedi Fısıldayan', 'Katzenflüsterer', 'Cat whisperer'),
    L('Kadıköy Efsanesi', 'Kadıköy-Legende', 'Kadıköy legend'),
  ],

  /**
   * Abzeichen: `metric` ≥ `gte`. Verfügbare Metriken siehe core/progress.js → playerMetrics().
   * Neue Abzeichen = neuer Eintrag, kein Code nötig.
   */
  badges: [
    { id: 'first_catch', icon: '🐾', metric: 'catches', gte: 1, name: L('İlk Pati', 'Erste Pfote', 'First paw'), desc: L('İlk kediyi yakala', 'Fange deine erste Katze', 'Catch your first cat') },
    { id: 'ten_cats', icon: '🔟', metric: 'uniqueCats', gte: 10, name: L('On Numara', 'Zehnerpack', 'Perfect ten'), desc: L('10 farklı kedi', '10 verschiedene Katzen', '10 different cats') },
    { id: 'fifty_cats', icon: '📚', metric: 'uniqueCats', gte: 50, name: L('Koleksiyoncu', 'Sammler', 'Collector'), desc: L('50 farklı kedi', '50 verschiedene Katzen', '50 different cats') },
    { id: 'hundred_cats', icon: '💯', metric: 'uniqueCats', gte: 100, name: L('Kedi Fısıldayan', 'Katzenflüsterer', 'Cat whisperer'), desc: L('100 farklı kedi', '100 verschiedene Katzen', '100 different cats') },
    { id: 'daily_goal', icon: '☕', metric: 'goalDays', gte: 1, name: L('Yirmilik', 'Zwanziger', 'Twenty'), desc: L('Bir günde 20 kedi', '20 Katzen an einem Tag', '20 cats in one day') },
    { id: 'goal_5', icon: '🏆', metric: 'goalDays', gte: 5, name: L('Kafe Müdavimi', 'Stammgast', 'Café regular'), desc: L('5 gün hedefe ulaş', 'Tagesziel an 5 Tagen', 'Daily goal on 5 days') },
    { id: 'discoverer', icon: '🔭', metric: 'discoveries', gte: 5, name: L('Kâşif', 'Entdecker', 'Discoverer'), desc: L('5 yeni kedi keşfet', '5 neue Katzen entdecken', 'Discover 5 new cats') },
    { id: 'pioneer', icon: '🧭', metric: 'discoveries', gte: 25, name: L('Öncü', 'Pionier', 'Pioneer'), desc: L('25 yeni kedi keşfet', '25 neue Katzen entdecken', 'Discover 25 new cats') },
    { id: 'districts_5', icon: '🗺️', metric: 'districts', gte: 5, name: L('Mahalle Gezgini', 'Kiez-Wanderer', 'Wanderer'), desc: L('5 mahallede yakala', 'In 5 Mahalle fangen', 'Catch in 5 neighbourhoods') },
    { id: 'districts_all', icon: '👑', metric: 'districts', gte: 21, name: L('Kadıköy Haritası', 'Ganz Kadıköy', 'All of Kadıköy'), desc: L('21 mahallenin hepsi', 'Alle 21 Mahalle', 'All 21 neighbourhoods') },
    { id: 'night_owl', icon: '🦉', metric: 'nightCatches', gte: 3, name: L('Gece Kuşu', 'Nachteule', 'Night owl'), desc: L('22:00–05:00 arası 3 kedi', '3 Katzen zwischen 22 und 5 Uhr', '3 cats between 10pm and 5am') },
    { id: 'early_bird', icon: '🌅', metric: 'earlyCatches', gte: 3, name: L('Sabahçı', 'Frühaufsteher', 'Early bird'), desc: L('05:00–08:00 arası 3 kedi', '3 Katzen zwischen 5 und 8 Uhr', '3 cats between 5 and 8am') },
    { id: 'guardian', icon: '🩹', metric: 'healthReports', gte: 3, name: L('Sağlık Bekçisi', 'Gesundheitswächter', 'Health guardian'), desc: L('3 yardım gereken kediyi bildir', '3 hilfsbedürftige Katzen melden', 'Report 3 cats in need') },
    { id: 'patterns_8', icon: '🎨', metric: 'patterns', gte: 8, name: L('Renk Paleti', 'Farbpalette', 'Palette'), desc: L('8 farklı desen', '8 verschiedene Fellmuster', '8 different coat patterns') },
    { id: 'rare_find', icon: '💎', metric: 'rareCatches', gte: 1, name: L('Nadir Bulgu', 'Seltener Fund', 'Rare find'), desc: L('Nadir veya üstü bir kedi', 'Eine rare (oder seltenere) Katze', 'A rare-or-better cat') },
    { id: 'legend', icon: '🌟', metric: 'legendaryCatches', gte: 1, name: L('Efsane Avcısı', 'Legendenjäger', 'Legend hunter'), desc: L('Bir Kadıköy efsanesini yakala', 'Eine Kadıköy-Legende fangen', 'Catch a Kadıköy legend') },
    { id: 'streak_7', icon: '🔥', metric: 'maxStreak', gte: 7, name: L('7 Gün Seri', '7-Tage-Serie', '7-day streak'), desc: L('7 gün üst üste', '7 Tage hintereinander', '7 days in a row') },
  ],

  /** Tagesaufgaben: pro Tag werden `perDay` zufällig (aber für alle gleich) gezogen. */
  quests: {
    perDay: 3,
    xp: 75,
    pool: [
      { kind: 'count', n: 5 },
      { kind: 'count', n: 10 },
      { kind: 'pattern', pattern: 'tekir', n: 3 },
      { kind: 'pattern', pattern: 'sarman', n: 2 },
      { kind: 'pattern', pattern: 'smokin', n: 1 },
      { kind: 'pattern', pattern: 'siyah', n: 2 },
      { kind: 'district', n: 1 },
      { kind: 'district', n: 1 },
      { kind: 'districts', n: 3 },
      { kind: 'new', n: 1 },
      { kind: 'early', n: 1 },
      { kind: 'evening', n: 2 },
    ],
  },
};

// Abzeichen und Level-Titel in weiteren Sprachen (core/labels/<code>.js) einmischen.
for (const [lang, data] of Object.entries({ ru, ar, fa })) {
  for (const b of GAME.badges) {
    const tr = data && data.BADGES && data.BADGES[b.id];
    if (tr && tr.name) b.name[lang] = tr.name;
    if (tr && tr.desc) b.desc[lang] = tr.desc;
  }
  (data && Array.isArray(data.LEVEL_TITLES) ? data.LEVEL_TITLES : []).forEach((title, i) => {
    if (GAME.levelTitles[i] && title) GAME.levelTitles[i][lang] = title;
  });
}
