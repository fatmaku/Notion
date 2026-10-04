// Cat Me If You Can – offene Daten: Katzen als CSV und GeoJSON (gerundete Koordinaten), z. B. für
// Tierschutzvereine, Tierärzt:innen oder die Veterinärabteilung der Stadtverwaltung.

import { label, PATTERNS, AGE_GROUPS, SEVERITY, CAT_STATUS, EAR_TIP, BCS_CLASSES } from '../public/core/taxonomy.js';

function csvCell(v) {
  if (v == null) return '';
  let s = Array.isArray(v) ? v.join('|') : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keine Formeln in Tabellenprogrammen
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function catsCsv(engine, { regionId, lang = 'tr' } = {}) {
  const items = engine.exportCats({ regionId });
  const cols = [
    'id', 'name', 'district', 'lat', 'lon', 'status', 'pattern', 'age_group', 'age_months_min', 'age_months_max',
    'weight_kg_min', 'weight_kg_max', 'body_condition', 'bcs', 'ear_tip', 'health_severity', 'health_flags',
    'first_seen', 'last_seen', 'observations', 'catchers', 'rarity',
  ];
  const rows = [cols.join(',')];
  for (const c of items) {
    const l = c.latest || {};
    const p = c.profile || {};
    rows.push([
      c.id, c.name, c.districtName, c.lat, c.lon, label(CAT_STATUS, c.status, lang), label(PATTERNS, p.pattern, lang),
      label(AGE_GROUPS, l.age_group, lang), l.age_months_min, l.age_months_max, l.weight_kg_min, l.weight_kg_max,
      label(BCS_CLASSES, l.body_condition, lang), l.body_condition_score, label(EAR_TIP, p.ear_tip, lang),
      label(SEVERITY, l.health_severity, lang), l.health_flags, iso(c.firstSeenAt), iso(c.lastSeenAt),
      c.observationCount, c.catcherCount, c.rarity,
    ].map(csvCell).join(','));
  }
  return '﻿' + rows.join('\r\n') + '\r\n';
}

export function catsGeoJson(engine, { regionId } = {}) {
  const items = engine.exportCats({ regionId });
  return {
    type: 'FeatureCollection',
    features: items.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      properties: {
        id: c.id,
        name: c.name,
        district: c.districtName,
        status: c.status,
        pattern: c.profile && c.profile.pattern,
        age_group: c.latest && c.latest.age_group,
        body_condition: c.latest && c.latest.body_condition,
        ear_tip: c.profile && c.profile.ear_tip,
        health_severity: c.latest && c.latest.health_severity,
        first_seen: iso(c.firstSeenAt),
        last_seen: iso(c.lastSeenAt),
        observations: c.observationCount,
      },
    })),
  };
}

function iso(t) {
  return t ? new Date(t).toISOString() : '';
}
