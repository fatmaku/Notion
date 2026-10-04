// Cat Me If You Can – Wiedererkennung: Ist die gerade fotografierte Katze schon im KediDex?
//
// Straßenkatzen in Kadıköy haben Reviere von wenigen hundert Metern. Kandidaten sind daher
// Katzen, die zuletzt im Umkreis `radiusM` gesehen wurden. Bewertet wird:
//   Farbe (Fingerabdruck) 45 % · Fellmuster 25 % · Entfernung 20 % · Augenfarbe/Fell 10 %
// plus harte Abzüge für Widersprüche (Ohrmarke, Augenfarbe, Kitten ↔ Senior).
//
// Entscheidung (siehe decide()): sicher → verknüpfen; unsicher → KI-Vergleich (wenn verfügbar),
// sonst neue Katze mit „needsReview“ für die Moderation. Fehler korrigiert die Moderation
// (zusammenführen / abtrennen) – die Tageszählung rechnet danach automatisch richtig.

import { haversine } from './geo.js';
import { colorSimilarity } from './fingerprint.js';
import { patternsRelated } from './taxonomy.js';

export function patternScore(a, b) {
  if (!a || !b || a === 'diger' || b === 'diger') return 0.5;
  if (a === b) return 1;
  return patternsRelated(a, b) ? 0.6 : 0;
}

/**
 * Score 0..1 dafür, dass Sichtung `obs` die Katze `cat` zeigt.
 * obs: {lat, lon, at, fingerprint, analysis}; cat: {lastLat, lastLon, lastSeenAt, fingerprint, profile}
 */
export function scoreCandidate(obs, cat, { radiusM = 450 } = {}) {
  const reasons = [];
  const dist = haversine(obs.lat, obs.lon, cat.lastLat, cat.lastLon);
  const distScore = Math.max(0, 1 - dist / radiusM);
  const colorSim = colorSimilarity(obs.fingerprint && obs.fingerprint.colors, cat.fingerprint && cat.fingerprint.colors);
  const hasColors = !!(obs.fingerprint && obs.fingerprint.colors && cat.fingerprint && cat.fingerprint.colors);
  const a = obs.analysis || {};
  const p = cat.profile || {};
  const pat = patternScore(a.pattern, p.pattern);
  let extra = 0.5;
  if (a.eye_color && p.eye_color && a.eye_color !== 'unknown' && p.eye_color !== 'unknown') extra = a.eye_color === p.eye_color ? 1 : 0;
  if (a.long_hair != null && p.long_hair != null && a.long_hair !== p.long_hair) extra = Math.min(extra, 0.2);

  let score = (hasColors ? 0.45 * colorSim : 0.45 * pat) + 0.25 * pat + 0.2 * distScore + 0.1 * extra;
  let conflict = false;
  reasons.push(`dist=${Math.round(dist)}m`, `color=${hasColors ? colorSim.toFixed(2) : 'n/a'}`, `pattern=${pat}`);

  // Harte Widersprüche
  if (p.ear_tip === 'tipped' && a.ear_tip === 'none') {
    score -= 0.4; // eine gekerbte Ohrspitze wächst nicht nach
    reasons.push('ear_tip_conflict');
    conflict = true;
  }
  if (a.eye_color && p.eye_color && a.eye_color !== 'unknown' && p.eye_color !== 'unknown' && a.eye_color !== p.eye_color) {
    const soft = new Set(['yellow', 'green', 'copper']); // Licht kann gelb/grün/kupfer verwechseln
    if (!(soft.has(a.eye_color) && soft.has(p.eye_color))) {
      score -= 0.3;
      reasons.push('eye_conflict');
      conflict = true;
    }
  }
  const monthsSince = Math.max(0, (obs.at - (cat.lastSeenAt || obs.at)) / (30 * 86400000));
  if (p.age_group === 'senior' && a.age_group === 'kitten') {
    score -= 0.5;
    reasons.push('age_conflict');
    conflict = true;
  } else if (p.age_group === 'adult' && a.age_group === 'kitten' && monthsSince < 6) {
    score -= 0.35;
    reasons.push('age_conflict');
    conflict = true;
  }
  if (p.sex_guess && a.sex_guess && p.sex_guess !== 'unknown' && a.sex_guess !== 'unknown' && p.sex_guess !== a.sex_guess && (p.pattern === 'uc_renk' || a.pattern === 'uc_renk')) {
    score -= 0.2;
    reasons.push('sex_conflict');
    conflict = true;
  }
  if (dist > radiusM) score = 0;
  return { score: Math.max(0, Math.min(1, Math.round(score * 1000) / 1000)), dist: Math.round(dist), colorSim, pattern: pat, conflict, reasons };
}

/** Kandidaten (aktive Katzen in der Nähe), bestbewertet zuerst. */
export function findCandidates(cats, obs, { radiusM = 450, maxCandidates = 3, minScore = 0.3, verifyLow = 0.55, nearM = 80 } = {}) {
  const latPad = radiusM / 110574;
  const lonPad = radiusM / (111320 * Math.cos((obs.lat * Math.PI) / 180));
  const out = [];
  for (const cat of cats) {
    if (cat.mergedInto || cat.status === 'deceased') continue;
    if (!Number.isFinite(cat.lastLat) || Math.abs(cat.lastLat - obs.lat) > latPad || Math.abs(cat.lastLon - obs.lon) > lonPad) continue;
    const s = scoreCandidate(obs, cat, { radiusM });
    // Die Fellfarben berechnet das Handy – ein manipulierter Fingerabdruck darf eine Katze mit
    // passendem (vom Server analysiertem) Muster ganz in der Nähe nicht „unsichtbar“ machen:
    // solche Kandidaten landen mindestens im Prüfbereich (KI-Vergleich bzw. Moderation).
    if (s.dist <= nearM && s.pattern >= 0.6 && !s.conflict && s.score < verifyLow) {
      s.score = verifyLow;
      s.reasons.push('near_same_pattern');
    }
    if (s.score >= minScore) out.push({ cat, ...s });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, maxCandidates);
}

/**
 * Entscheidung. Rückgabe {action: 'link'|'verify'|'new', candidate?, needsReview?}
 * - mit KI-Vergleich: ≥ autoLinkWithVerifier direkt verknüpfen, ≥ verifyLow fragen, sonst neu
 * - ohne:             ≥ linkScore verknüpfen, ≥ verifyLow neu + needsReview, sonst neu
 */
export function decide(candidates, cfg, { hasVerifier = false } = {}) {
  const top = candidates[0];
  if (!top) return { action: 'new' };
  if (hasVerifier) {
    if (top.score >= cfg.autoLinkWithVerifier && (!candidates[1] || candidates[1].score < cfg.verifyLow)) return { action: 'link', candidate: top };
    if (top.score >= cfg.verifyLow) return { action: 'verify' };
    return { action: 'new' };
  }
  const second = candidates[1];
  if (top.score >= cfg.linkScore) return { action: 'link', candidate: top, needsReview: !!second && top.score - second.score < 0.05 };
  if (top.score >= cfg.verifyLow) return { action: 'new', needsReview: true };
  return { action: 'new' };
}
