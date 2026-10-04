// Cat Me If You Can – gezeichnete Katzen-Avatare (SVG) für Katzen ohne Foto (Demo-Daten) und als
// Platzhalter. Farben und Zeichnung folgen dem Fellmuster, Augenfarbe aus dem Profil.

const COAT = {
  black: '#2b2b2e', white: '#f4efe6', gray: '#8d8f96', orange: '#e9893a', cream: '#efd3a4', brown: '#8a6a4a',
};
const EYES = { yellow: '#e8c53a', green: '#7fb34a', blue: '#6fb6e8', copper: '#c97a2b', odd: null, unknown: '#e8c53a' };

const SCHEMES = {
  tekir: { base: '#8a7a68', stripes: '#3f352c' },
  tekir_beyaz: { base: '#8a7a68', stripes: '#3f352c', white: true },
  sarman: { base: COAT.orange, stripes: '#b8611e' },
  sarman_beyaz: { base: COAT.orange, stripes: '#b8611e', white: true },
  krem: { base: COAT.cream, stripes: '#d9b47c' },
  siyah: { base: COAT.black },
  beyaz: { base: COAT.white },
  gri: { base: COAT.gray },
  gri_beyaz: { base: COAT.gray, white: true },
  smokin: { base: COAT.black, white: true },
  uc_renk: { base: COAT.white, patches: [COAT.orange, COAT.black] },
  kaplumbaga: { base: COAT.black, patches: [COAT.orange, '#5a3a22'] },
  renk_uclu: { base: '#f1e4cc', points: '#6b4a32' },
  van: { base: COAT.white, patches: [COAT.orange], vanOnly: true },
  diger: { base: '#b9a58c', stripes: '#7c6a55' },
};

function hashOf(s) {
  let h = 2166136261;
  for (const ch of String(s || 'x')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function catAvatarSvg(cat) {
  const p = (cat && (cat.profile || cat)) || {};
  const pattern = p.pattern || cat.pattern || 'diger';
  const sc = SCHEMES[pattern] || SCHEMES.diger;
  const h = hashOf(cat.id || cat.name || pattern);
  const eye = p.eye_color === 'odd' ? null : EYES[p.eye_color] || (h % 3 === 0 ? EYES.green : EYES.yellow);
  const eyeL = eye || EYES.blue;
  const eyeR = eye || EYES.yellow;
  const tipped = p.ear_tip === 'tipped';
  const bg = ['#fde6c8', '#d8efe9', '#f6dfe9', '#e3e4f7', '#f3efc9'][h % 5];
  const parts = [];
  parts.push(`<rect width="120" height="120" rx="24" fill="${bg}"/>`);
  // Ohren (linkes Ohr bei Ohrmarke gekappt)
  const earL = tipped ? 'M26 58 L30 22 L44 30 L56 40 Z' : 'M26 58 L28 16 L56 40 Z';
  parts.push(`<path d="${earL}" fill="${sc.base}"/><path d="M94 58 L92 16 L64 40 Z" fill="${sc.base}"/>`);
  parts.push(`<path d="M32 50 L33 28 L48 40 Z" fill="#e9a3a3" opacity=".55"/><path d="M88 50 L87 28 L72 40 Z" fill="#e9a3a3" opacity=".55"/>`);
  parts.push(`<ellipse cx="60" cy="70" rx="40" ry="34" fill="${sc.base}"/>`);
  if (sc.patches) {
    const [c1, c2] = sc.patches;
    if (sc.vanOnly) parts.push(`<path d="M24 58 Q40 36 60 44 Q50 56 30 64 Z" fill="${c1}"/><path d="M96 58 Q80 36 60 44 Q70 54 90 62 Z" fill="${c1}"/>`);
    else {
      parts.push(`<path d="M22 66 Q30 38 58 40 Q48 60 26 80 Z" fill="${c1}"/>`);
      if (c2) parts.push(`<path d="M98 64 Q92 40 66 40 Q72 58 94 78 Z" fill="${c2}"/>`);
    }
  }
  if (sc.stripes) {
    parts.push(`<g stroke="${sc.stripes}" stroke-width="4" stroke-linecap="round" fill="none"><path d="M60 38 v12"/><path d="M50 40 l2 10"/><path d="M70 40 l-2 10"/><path d="M24 70 h10"/><path d="M26 80 h9"/><path d="M96 70 h-10"/><path d="M94 80 h-9"/></g>`);
  }
  if (sc.points) parts.push(`<ellipse cx="60" cy="82" rx="22" ry="17" fill="${sc.points}" opacity=".85"/>`);
  if (sc.white) parts.push(`<path d="M60 58 Q44 70 42 90 Q60 104 78 90 Q76 70 60 58 Z" fill="${COAT.white}"/>`);
  // Gesicht
  parts.push(`<ellipse cx="45" cy="68" rx="7" ry="8" fill="${eyeL}"/><ellipse cx="75" cy="68" rx="7" ry="8" fill="${eyeR}"/>`);
  parts.push(`<ellipse cx="45" cy="69" rx="2.4" ry="6" fill="#141414"/><ellipse cx="75" cy="69" rx="2.4" ry="6" fill="#141414"/>`);
  parts.push(`<path d="M55 80 h10 l-5 6 z" fill="#d97a8a"/><path d="M60 86 q-3 6 -9 4 M60 86 q3 6 9 4" stroke="#3a2a22" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  parts.push(`<g stroke="${sc.base === COAT.white || sc.base === COAT.cream ? '#9b8f80' : '#f4efe6'}" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M40 84 L16 80 M40 88 L18 92 M80 84 L104 80 M80 88 L102 92"/></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${parts.join('')}</svg>`;
}

const cache = new Map();
export function catAvatarDataUrl(cat) {
  const p = (cat && (cat.profile || cat)) || {};
  const key = `${cat.id || cat.name}|${p.pattern || cat.pattern}|${p.eye_color}|${p.ear_tip}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(catAvatarSvg(cat))}`;
    if (cache.size > 500) cache.clear();
    cache.set(key, url);
  }
  return url;
}
