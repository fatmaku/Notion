// Cat Me If You Can – Zeit in der Zeitzone der Region. Ein „Spieltag“ ist der Kalendertag vor Ort
// (Kadıköy: Europe/Istanbul) – nicht UTC, nicht die Zeitzone des Handys.

const fmtCache = new Map();

function formatter(tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(ts, tz) {
  const out = {};
  for (const p of formatter(tz).formatToParts(new Date(ts))) out[p.type] = p.value;
  return out;
}

/** 'YYYY-MM-DD' des Zeitpunkts in der Zeitzone. */
export function dayKey(ts, tz) {
  const p = parts(ts, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Stunde 0–23 vor Ort. */
export function localHour(ts, tz) {
  return Number(parts(ts, tz).hour) % 24;
}

/** Offset der Zeitzone gegenüber UTC in Minuten zum Zeitpunkt ts (Istanbul: +180). */
export function tzOffsetMinutes(ts, tz) {
  const p = parts(ts, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(ts / 1000) * 1000) / 60000);
}

/** Erster Millisekunden-Zeitpunkt des Tages `day` vor Ort. */
export function startOfDay(day, tz) {
  const guess = Date.parse(`${day}T00:00:00Z`);
  return guess - tzOffsetMinutes(guess, tz) * 60000;
}

/** Letzter Millisekunden-Zeitpunkt des Tages `day` vor Ort. */
export function endOfDay(day, tz) {
  return startOfDay(addDays(day, 1), tz) - 1;
}

export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Ganze Tage zwischen zwei Day-Keys (b - a). */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

/** Deterministischer Zufall aus einem String (Tagesaufgaben sind für alle gleich). */
export function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function mulberry32() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
