// Cat Me If You Can – Zeichnungen für die Social-Media-Bilder (alles SVG, keine Emoji-Schrift nötig).
// Farben aus docs/BRAND.md, Abschnitt 7. Zufall ist immer „gesät“, damit jedes Rendern gleich aussieht.

export const C = {
  navy: '#14213d', orange: '#f28c28', cream: '#fbf3e4', teal: '#1f8a8a', sun: '#f6d55c',
  orangeD: '#c4610f', tealD: '#156a6a', night: '#0d1730', night2: '#1b2c52', paper: '#fffaf1', rose: '#e9a3a3',
};

/** Kleiner, gesäter Zufallsgenerator (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let uid = 0;
const id = (p) => `${p}${++uid}`;
const f1 = (n) => Math.round(n * 10) / 10;

// ───────────────────────── Symbole (24 × 24, Linien in currentColor) ─────────────────────────
const ICONS = {
  pin: '<path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.6"/>',
  play: '<path d="M8.5 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  paw: '<g fill="currentColor" stroke="none"><ellipse cx="6" cy="10" rx="2.3" ry="2.9"/><ellipse cx="10" cy="6.2" rx="2.3" ry="2.9"/><ellipse cx="14" cy="6.2" rx="2.3" ry="2.9"/><ellipse cx="18" cy="10" rx="2.3" ry="2.9"/><path d="M12 11.5c-3.3 0-6 3.3-6 5.8 0 2 1.6 2.9 3.2 2.9 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.6 0 3.2-.9 3.2-2.9 0-2.5-2.7-5.8-6-5.8z"/></g>',
  camera: '<path d="M4 8h3.2l1.8-2.8h6L16.8 8H20a1.2 1.2 0 0 1 1.2 1.2v9.6A1.2 1.2 0 0 1 20 20H4a1.2 1.2 0 0 1-1.2-1.2V9.2A1.2 1.2 0 0 1 4 8z"/><circle cx="12" cy="13.8" r="3.6"/>',
  tap: '<path d="M9.5 13.5V5.2a1.7 1.7 0 0 1 3.4 0v6.3"/><path d="M12.9 10.6a1.7 1.7 0 0 1 3.4 0v1.6"/><path d="M16.3 11.4a1.7 1.7 0 0 1 3.4 0v3.4a6.4 6.4 0 0 1-6.4 6.4h-.9a6 6 0 0 1-4.9-2.6l-2.7-4a1.7 1.7 0 0 1 2.8-1.9l1.9 2.6"/><path d="M5.6 4.4 4.2 3M5 7.6H3"/>',
  heart: '<path d="M12 20.3s-7.8-4.6-9.2-9.6A5 5 0 0 1 12 7a5 5 0 0 1 9.2 3.7c-1.4 5-9.2 9.6-9.2 9.6z" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.6 9.6 17 19 7.4"/>',
  cup: '<path d="M4 8.5h12.5v4.2a5.2 5.2 0 0 1-5.2 5.2H9.2A5.2 5.2 0 0 1 4 12.7z"/><path d="M16.5 9.8h1.3a2.6 2.6 0 0 1 0 5.2h-1.6"/><path d="M3 21h15"/><path d="M8 2.8c-.9 1 .9 2-.1 3.1M12 2.8c-.9 1 .9 2-.1 3.1"/>',
  healthy: '<path d="M5.2 9.6 5 4.2l4.2 3.1h5.6L19 4.2l-.2 5.4a7.6 7.6 0 0 1 1.7 4.8c0 4-3.8 6.4-8.5 6.4s-8.5-2.4-8.5-6.4a7.6 7.6 0 0 1 1.7-4.8z"/><path d="M9.2 15.4c1.5 1.4 4.1 1.4 5.6 0"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>',
  hungry: '<path d="M2.8 13h18.4a9.2 6.6 0 0 1-18.4 0z"/><path d="M6.5 20.2h11"/><path d="M8.6 7.6c1.9-2.3 4.9-2.3 6.8 0-1.9 2.3-4.9 2.3-6.8 0z"/><path d="M15.4 7.6 17.6 6v3.2z"/>',
  sick: '<path d="M10 4.4a2 2 0 0 1 4 0v9a4.2 4.2 0 1 1-4 0z"/><path d="M12 9.2v6.2"/><path d="M18 5.5h3M19.5 4v3"/>',
  injured: '<g transform="rotate(-38 12 12)"><rect x="2.2" y="8.3" width="19.6" height="7.4" rx="3.7"/><rect x="8.6" y="8.3" width="6.8" height="7.4" fill="currentColor" fill-opacity=".18"/><circle cx="10.6" cy="10.8" r=".55" fill="currentColor" stroke="none"/><circle cx="13.4" cy="10.8" r=".55" fill="currentColor" stroke="none"/><circle cx="10.6" cy="13.2" r=".55" fill="currentColor" stroke="none"/><circle cx="13.4" cy="13.2" r=".55" fill="currentColor" stroke="none"/></g>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Fünf Sterne wie auf der Sammelkarte, die ersten n gefüllt. */
export function stars(n = 3) {
  const p = 'M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z';
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p}" fill="${i < n ? C.sun : C.cream}" stroke="${C.navy}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }
  return s;
}

/** Vier-Zack-Funkeln (für Sterne am Himmel und Glanz). */
function sparkle(x, y, r, fill, op = 1) {
  const k = r * 0.28;
  return `<path d="M${f1(x)} ${f1(y - r)}Q${f1(x + k)} ${f1(y - k)} ${f1(x + r)} ${f1(y)}Q${f1(x + k)} ${f1(y + k)} ${f1(x)} ${f1(y + r)}Q${f1(x - k)} ${f1(y + k)} ${f1(x - r)} ${f1(y)}Q${f1(x - k)} ${f1(y - k)} ${f1(x)} ${f1(y - r)}Z" fill="${fill}" opacity="${op}"/>`;
}

/** Sternenhimmel über eine Fläche. avoid: [{x,y,r}] – dort keine Sterne. */
export function starfield({ w, h, n = 70, seed = 5, color = C.cream, sparkleColor = C.sun, avoid = [] }) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    if (avoid.some((a) => Math.hypot(a.x - x, a.y - y) < a.r)) continue;
    const big = r() < 0.12;
    if (big) s += sparkle(x, y, 7 + r() * 9, sparkleColor, 0.85);
    else s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.2 + r() * 2.4)}" fill="${color}" opacity="${f1(0.25 + r() * 0.55)}"/>`;
  }
  return `<svg class="layer" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${s}</svg>`;
}

/** Mondsichel. */
export function moon(cx, cy, r, bg = C.navy) {
  const m = id('moon');
  return `<svg class="layer" viewBox="0 0 ${cx * 2} ${cy * 2}" width="${cx * 2}" height="${cy * 2}" style="overflow:visible" aria-hidden="true">
    <defs><mask id="${m}"><rect x="0" y="0" width="${cx * 2 + r * 2}" height="${cy * 2 + r * 2}" fill="#fff"/><circle cx="${cx + r * 0.42}" cy="${cy - r * 0.22}" r="${r * 0.86}" fill="#000"/></mask></defs>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="${C.sun}" opacity=".07"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.sun}" mask="url(#${m})"/>
  </svg>`;
}

/**
 * Silhouette von Kadıköy (Häuser, eine Moschee mit zwei Minaretten, ein Bahnhof mit zwei Türmen wie
 * Haydarpaşa) über dem Wasser, dazu eine Fähre. Rückgabe: SVG-Markup in voller Breite.
 */
export function cityscape({ w = 1080, sky = 260, water = 90, seed = 3, back = C.night2, front = C.night, light = C.sun, lights = 0.22, eyes = 0, waterFill = '#0f1d3d', waveColor = C.cream, ferry = true, ferryX = 0.62 }) {
  const r = rng(seed);
  const h = sky + water;
  const base = sky;
  let backD = '';
  for (let x = -20; x < w + 20; ) {
    const bw = 46 + r() * 74;
    const bh = sky * (0.34 + r() * 0.24);
    backD += `M${f1(x)} ${base}V${f1(base - bh)}h${f1(bw)}V${base}Z`;
    x += bw - 4;
  }
  let frontD = '';
  let win = '';
  for (let x = -10; x < w + 10; ) {
    const bw = 40 + r() * 78;
    const bh = sky * (0.14 + r() * 0.22);
    frontD += `M${f1(x)} ${base}V${f1(base - bh)}h${f1(bw)}V${base}Z`;
    for (let wy = base - bh + 14; wy < base - 14; wy += 22) {
      for (let wx = x + 9; wx < x + bw - 12; wx += 17) {
        if (r() < lights) win += `<rect x="${f1(wx)}" y="${f1(wy)}" width="7" height="9" rx="1.5"/>`;
      }
    }
    x += bw + r() * 5;
  }
  // Moschee: Kuppel + zwei Minarette
  const mx = w * 0.2;
  const mh = sky * 0.3;
  const dome = sky * 0.17;
  frontD += `M${f1(mx - dome * 1.5)} ${base}V${f1(base - mh)}H${f1(mx + dome * 1.5)}V${base}Z`;
  frontD += `M${f1(mx - dome)} ${f1(base - mh)}A${f1(dome)} ${f1(dome)} 0 0 1 ${f1(mx + dome)} ${f1(base - mh)}Z`;
  frontD += `M${f1(mx - 2)} ${f1(base - mh - dome)}h4v${f1(-dome * 0.45)}h-4Z`;
  for (const dx of [-dome * 2.1, dome * 2.1]) {
    const tx = mx + dx;
    const th = sky * 0.78;
    frontD += `M${f1(tx - 6)} ${base}V${f1(base - th)}H${f1(tx + 6)}V${base}Z`;
    frontD += `M${f1(tx - 9)} ${f1(base - th * 0.72)}h18v6h-18Z`;
    frontD += `M${f1(tx - 6)} ${f1(base - th)}L${f1(tx)} ${f1(base - th - 28)}L${f1(tx + 6)} ${f1(base - th)}Z`;
  }
  // Bahnhof mit zwei Türmen
  const sx = w * 0.78;
  const sw = Math.min(260, w * 0.24);
  const shh = sky * 0.36;
  frontD += `M${f1(sx - sw / 2)} ${base}V${f1(base - shh)}H${f1(sx + sw / 2)}V${base}Z`;
  for (const tx of [sx - sw / 2 + 18, sx + sw / 2 - 18]) {
    const th = sky * 0.6;
    frontD += `M${f1(tx - 18)} ${base}V${f1(base - th)}H${f1(tx + 18)}V${base}Z`;
    frontD += `M${f1(tx - 22)} ${f1(base - th)}L${f1(tx)} ${f1(base - th - 46)}L${f1(tx + 22)} ${f1(base - th)}Z`;
  }
  // Katzenaugen im Dunkeln
  let eyeS = '';
  const er = rng(seed + 11);
  for (let i = 0; i < eyes; i++) {
    const ex = 60 + er() * (w - 120);
    const ey = base - 10 - er() * sky * 0.08;
    eyeS += `<g fill="${light}"><ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="4.2" ry="3"/><ellipse cx="${f1(ex + 13)}" cy="${f1(ey)}" rx="4.2" ry="3"/></g>`;
  }
  // Wasser + Wellen
  let waves = '';
  const wr = rng(seed + 7);
  for (let i = 0; i < 18; i++) {
    const wx = wr() * w;
    const wy = base + 14 + wr() * (water - 24);
    const wl = 20 + wr() * 60;
    waves += `<path d="M${f1(wx)} ${f1(wy)}h${f1(wl)}" stroke="${waveColor}" stroke-width="3" stroke-linecap="round" opacity="${f1(0.12 + wr() * 0.2)}"/>`;
  }
  const fer = ferry ? ferryBoat(w * ferryX, base + water * 0.42, Math.min(1, water / 90) * 0.95) : '';
  return `<svg class="layer" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <path d="${backD}" fill="${back}"/>
    <path d="${frontD}" fill="${front}"/>
    <g fill="${light}" opacity=".55">${win}</g>
    ${eyeS}
    <rect x="0" y="${base}" width="${w}" height="${water}" fill="${waterFill}"/>
    ${waves}
    ${fer}
  </svg>`;
}

/** Istanbuler Fähre (Vapur). x/y = Mitte der Wasserlinie. */
export function ferryBoat(x, y, s = 1) {
  return `<g transform="translate(${f1(x - 105 * s)} ${f1(y)}) scale(${f1(s * 100) / 100})">
    <path d="M-6 -30H216L198 0H10Z" fill="${C.cream}"/>
    <path d="M2 -12H208L198 0H10Z" fill="${C.navy}"/>
    <rect x="24" y="-60" width="162" height="30" rx="4" fill="${C.cream}"/>
    <g fill="${C.navy}" opacity=".85">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${34 + i * 21}" y="-52" width="12" height="11" rx="2"/>`).join('')}</g>
    <rect x="52" y="-80" width="106" height="20" rx="4" fill="${C.cream}"/>
    <rect x="94" y="-112" width="24" height="32" rx="3" fill="${C.cream}"/>
    <rect x="94" y="-112" width="24" height="9" rx="2" fill="${C.navy}"/>
    <path d="M14 8h180" stroke="${C.cream}" stroke-width="4" stroke-linecap="round" opacity=".25"/>
  </g>`;
}

/** Wollknäuel (im Spiel fliegt es auf die Katze) mit Flugspur. */
export function yarn(size = 140, color = C.orange, line = C.orangeD) {
  const c = id('yc');
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
    <defs><clipPath id="${c}"><circle cx="100" cy="100" r="70"/></clipPath></defs>
    <circle cx="100" cy="100" r="70" fill="${color}"/>
    <g clip-path="url(#${c})" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round">
      <path d="M40 60c40 10 80 50 90 110"/><path d="M60 40c30 30 50 80 40 140"/><path d="M150 50c-40 10-80 60-90 110"/>
      <path d="M30 110c40-20 100-20 140 10"/><path d="M90 30c20 20 60 30 90 20"/>
    </g>
    <circle cx="100" cy="100" r="70" fill="none" stroke="${line}" stroke-width="4" opacity=".5"/>
    <path d="M150 150c18 14 30 26 26 40" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
}

/** Konfetti rund um eine Fläche (Mitte frei). */
export function confetti({ w, h, n = 40, seed = 9, hole = null }) {
  const r = rng(seed);
  const cols = [C.orange, C.sun, C.cream, C.rose];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    if (hole && x > hole.x && x < hole.x + hole.w && y > hole.y && y < hole.y + hole.h) continue;
    const col = cols[Math.floor(r() * cols.length)];
    const rot = Math.round(r() * 180);
    if (r() < 0.3) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 + r() * 5)}" fill="${col}"/>`;
    else s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(14 + r() * 14)}" height="${f1(8 + r() * 5)}" rx="3" fill="${col}" transform="rotate(${rot} ${f1(x)} ${f1(y)})"/>`;
  }
  return `<svg class="layer" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${s}</svg>`;
}

/** Sucher-Ecken wie im Logo. */
export function viewfinder(w, h, { color = C.cream, len = 70, sw = 12, r = 22, op = 1 } = {}) {
  const k = sw / 2;
  return `<svg class="layer" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}">
      <path d="M${k} ${len}V${r + k}a${r} ${r} 0 0 1 ${r} ${-r}H${len}"/>
      <path d="M${w - len} ${k}H${w - r - k}a${r} ${r} 0 0 1 ${r} ${r}V${len}"/>
      <path d="M${w - k} ${h - len}V${h - r - k}a${r} ${r} 0 0 1 ${-r} ${r}H${w - len}"/>
      <path d="M${len} ${h - k}H${r + k}a${r} ${r} 0 0 1 ${-r} ${-r}V${h - len}"/>
    </g>
  </svg>`;
}

/** Stadtplan-Ausschnitt mit gezählten Katzen (Punkte) und einer Hilfe-Meldung (Nadel mit Herz). */
export function mapPanel(w = 540, h = 560, seed = 21) {
  const r = rng(seed);
  const c = id('mp');
  let dots = '';
  const pts = [];
  for (let i = 0; pts.length < 26 && i < 400; i++) {
    const x = 60 + r() * (w - 100);
    const y = 50 + r() * (h - 90);
    if (x < 150 && y > h * 0.6) continue; // Meer
    if (x < 200 && y < 120) continue;
    if (Math.hypot(x - w * 0.6, y - h * 0.42) < 70) continue; // Platz für die Nadel
    if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 46)) continue;
    pts.push([x, y]);
  }
  pts.forEach(([x, y], i) => {
    const col = i % 7 === 3 ? C.orange : C.teal;
    dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="11" fill="${col}" stroke="${C.paper}" stroke-width="4"/>`;
  });
  const px = w * 0.6;
  const py = h * 0.42;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <defs><clipPath id="${c}"><rect width="${w}" height="${h}" rx="44"/></clipPath></defs>
    <g clip-path="url(#${c})">
      <rect width="${w}" height="${h}" fill="#e4f1ec"/>
      <path d="M0 ${h * 0.58}C${w * 0.16} ${h * 0.6} ${w * 0.26} ${h * 0.78} ${w * 0.22} ${h}H0Z" fill="#b9dfdb"/>
      <path d="M0 0H${w * 0.36}C${w * 0.3} ${h * 0.12} ${w * 0.16} ${h * 0.18} 0 ${h * 0.2}Z" fill="#b9dfdb"/>
      <rect x="${w * 0.62}" y="${h * 0.66}" width="${w * 0.22}" height="${h * 0.16}" rx="18" fill="#cfe7d2"/>
      <rect x="${w * 0.3}" y="${h * 0.16}" width="${w * 0.16}" height="${h * 0.12}" rx="16" fill="#cfe7d2"/>
      <g fill="none" stroke="#fff" stroke-linecap="round">
        <path d="M${w * 0.1} ${h * 0.36}C${w * 0.4} ${h * 0.32} ${w * 0.7} ${h * 0.3} ${w * 1.05} ${h * 0.22}" stroke-width="22"/>
        <path d="M${w * 0.34} ${h * 1.02}C${w * 0.42} ${h * 0.7} ${w * 0.5} ${h * 0.4} ${w * 0.56} -10" stroke-width="20"/>
        <path d="M${w * 0.26} ${h * 0.62}H${w * 1.02}" stroke-width="16"/>
        <path d="M${w * 0.8} ${h * 1.02}V${h * 0.3}" stroke-width="14"/>
        <path d="M${w * 0.18} ${h * 0.86}C${w * 0.4} ${h * 0.84} ${w * 0.6} ${h * 0.9} ${w * 1.02} ${h * 0.86}" stroke-width="12"/>
      </g>
      ${dots}
      <circle cx="${px}" cy="${py + 6}" r="62" fill="none" stroke="${C.orange}" stroke-width="5" opacity=".35"/>
      <circle cx="${px}" cy="${py + 6}" r="96" fill="none" stroke="${C.orange}" stroke-width="4" opacity=".18"/>
      <g transform="translate(${px - 36} ${py - 74})">
        <path d="M36 98S0 64 0 36a36 36 0 0 1 72 0c0 28-36 62-36 62z" fill="${C.orange}" stroke="${C.paper}" stroke-width="5"/>
        <path d="M36 52s-14-8-15.5-17A8.6 8.6 0 0 1 36 29a8.6 8.6 0 0 1 15.5 6C50 44 36 52 36 52z" fill="${C.paper}"/>
      </g>
    </g>
  </svg>`;
}

/**
 * Café-Fenster in Kadıköy: Abendhimmel, Silhouette, Wasser mit Fähre, davor ein Tisch mit Kaffeetasse
 * (Pfote im Milchschaum) und einer zwinkernden Sarman-Katze. viewBox 900 × 660.
 */
export function cafeWindow() {
  const g = id('sky');
  const cw = id('win');
  const cc = id('cup');
  const city = cityscape({ w: 780, sky: 210, water: 100, seed: 8, back: '#2a3a63', front: C.navy, lights: 0.18, waterFill: C.teal, waveColor: C.cream, ferryX: 0.3 });
  return `<svg viewBox="0 0 900 660" width="900" height="660" aria-hidden="true">
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".6" stop-color="#f8b25a"/><stop offset="1" stop-color="#f28c28"/></linearGradient>
      <clipPath id="${cw}"><rect x="60" y="10" width="780" height="500" rx="70"/></clipPath>
      <clipPath id="${cc}"><path d="M190 330H410V362C410 442 365 490 300 490S190 442 190 362Z"/></clipPath>
    </defs>
    <g clip-path="url(#${cw})">
      <rect x="60" y="10" width="780" height="500" fill="url(#${g})"/>
      <circle cx="640" cy="236" r="74" fill="${C.cream}" opacity=".95"/>
      <circle cx="640" cy="236" r="120" fill="${C.cream}" opacity=".18"/>
      <g fill="none" stroke="${C.navy}" stroke-width="4" stroke-linecap="round" opacity=".7">
        <path d="M200 110q10-10 20 0q10-10 20 0"/><path d="M262 82q8-8 16 0q8-8 16 0"/><path d="M480 128q7-7 14 0q7-7 14 0"/>
      </g>
      <svg x="60" y="${510 - 310}" width="780" height="310" viewBox="0 0 780 310">${city.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>
    </g>
    <rect x="60" y="10" width="780" height="500" rx="70" fill="none" stroke="${C.cream}" stroke-width="16"/>
    <rect x="0" y="498" width="900" height="46" rx="16" fill="#8a5a3a"/>
    <rect x="0" y="498" width="900" height="12" rx="6" fill="#a8744c"/>
    <!-- Tasse -->
    <ellipse cx="300" cy="500" rx="152" ry="18" fill="${C.cream}" stroke="${C.navy}" stroke-width="6"/>
    <path d="M404 372C476 366 478 456 398 452" fill="none" stroke="${C.navy}" stroke-width="24" stroke-linecap="round"/>
    <path d="M404 372C476 366 478 456 398 452" fill="none" stroke="${C.cream}" stroke-width="9" stroke-linecap="round"/>
    <path d="M190 330H410V362C410 442 365 490 300 490S190 442 190 362Z" fill="${C.cream}"/>
    <g clip-path="url(#${cc})"><rect x="180" y="384" width="240" height="30" fill="${C.orange}"/><rect x="180" y="420" width="240" height="8" fill="${C.teal}"/></g>
    <path d="M190 330H410V362C410 442 365 490 300 490S190 442 190 362Z" fill="none" stroke="${C.navy}" stroke-width="8" stroke-linejoin="round"/>
    <ellipse cx="300" cy="330" rx="110" ry="22" fill="#7a4a2a" stroke="${C.navy}" stroke-width="8"/>
    <g fill="${C.cream}"><ellipse cx="300" cy="335" rx="17" ry="9"/><ellipse cx="275" cy="326" rx="6" ry="4.5"/><ellipse cx="290" cy="320" rx="6" ry="4.5"/><ellipse cx="310" cy="320" rx="6" ry="4.5"/><ellipse cx="325" cy="326" rx="6" ry="4.5"/></g>
    <g fill="none" stroke="${C.cream}" stroke-width="11" stroke-linecap="round" opacity=".95">
      <path d="M262 290C244 262 282 246 264 210C252 186 276 168 268 140"/>
      <path d="M304 286C288 256 324 238 306 196C294 170 318 150 310 120"/>
      <path d="M344 290C328 266 360 250 346 220"/>
    </g>
    <path d="M318 98s-14-8-15.5-17A8.6 8.6 0 0 1 318 75a8.6 8.6 0 0 1 15.5 6C332 90 318 98 318 98z" fill="${C.orange}" transform="rotate(10 318 86)"/>
    <!-- Katze -->
    <path d="M722 492C806 494 826 428 792 396" fill="none" stroke="${C.orange}" stroke-width="26" stroke-linecap="round"/>
    <path d="M792 396c-6-6-12-8-18-6" fill="none" stroke="${C.orangeD}" stroke-width="26" stroke-linecap="round"/>
    <path d="M592 498C560 498 556 440 566 400C578 350 610 324 660 324S742 350 754 400C764 440 760 498 728 498Z" fill="${C.orange}"/>
    <g fill="none" stroke="${C.orangeD}" stroke-width="9" stroke-linecap="round"><path d="M578 404c14 4 22 14 24 26"/><path d="M574 440c14 2 22 10 24 20"/><path d="M742 404c-14 4-22 14-24 26"/><path d="M746 440c-14 2-22 10-24 20"/></g>
    <path d="M660 342C628 354 624 424 660 466C696 424 692 354 660 342Z" fill="${C.cream}"/>
    <ellipse cx="630" cy="494" rx="24" ry="13" fill="${C.cream}"/><ellipse cx="690" cy="494" rx="24" ry="13" fill="${C.cream}"/>
    <path d="M594 252 598 172l50 40ZM726 252l-4-80-50 40Z" fill="${C.orange}"/>
    <path d="M606 236l2-42 26 22ZM714 236l-2-42-26 22Z" fill="${C.orangeD}"/>
    <ellipse cx="660" cy="270" rx="80" ry="66" fill="${C.orange}"/>
    <g fill="${C.orangeD}"><path d="M650 208h20l-4 30h-12z"/><path d="M618 214l16-2 4 24-12 4z"/><path d="M702 214l-16-2-4 24 12 4z"/></g>
    <ellipse cx="660" cy="304" rx="40" ry="26" fill="${C.cream}"/>
    <path d="M612 274c8-13 34-16 46-3-10 11-36 14-46 3z" fill="${C.navy}"/>
    <circle cx="640" cy="273" r="5" fill="${C.sun}"/>
    <path d="M672 276c10-9 28-9 38 0" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/>
    <path d="M651 292h18l-9 10z" fill="${C.navy}"/>
    <path d="M660 302c-1 9-13 12-19 4M660 302c2 8 15 11 21 0" fill="none" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/>
    <g stroke="${C.cream}" stroke-width="4" stroke-linecap="round"><path d="M614 300l-46-7M614 310l-42 6M706 300l46-7M706 310l42 6"/></g>
  </svg>`;
}

/** Pfotenspur entlang einer Kurve (Deko für leere Story-Zonen, ohne Text). */
export function pawTrail({ w, h, from, to, bend = 0, n = 9, size = 46, color = C.navy, op = 0.12 }) {
  const paw = '<ellipse cx="-11" cy="-7" rx="4" ry="5.2" transform="rotate(-20 -11 -7)"/><ellipse cx="-4" cy="-14.5" rx="4" ry="5.2" transform="rotate(-6 -4 -14.5)"/><ellipse cx="4" cy="-14.5" rx="4" ry="5.2" transform="rotate(6 4 -14.5)"/><ellipse cx="11" cy="-7" rx="4" ry="5.2" transform="rotate(20 11 -7)"/><path d="M0 -1c-6 0-11 5.5-11 10 0 3.6 2.9 5.2 5.8 5.2 2.2 0 3.3-1 5.2-1s3 1 5.2 1c2.9 0 5.8-1.6 5.8-5.2 0-4.5-5-10-11-10z"/>';
  const [x0, y0] = from;
  const [x1, y1] = to;
  const cx = (x0 + x1) / 2 - (y1 - y0) * bend;
  const cy = (y0 + y1) / 2 + (x1 - x0) * bend;
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const side = i % 2 ? 1 : -1;
    const ox = (-dy / Math.hypot(dx, dy)) * side * size * 0.38;
    const oy = (dx / Math.hypot(dx, dy)) * side * size * 0.38;
    s += `<g transform="translate(${f1(x + ox)} ${f1(y + oy)}) rotate(${f1(ang)}) scale(${f1(size / 30)})">${paw}</g>`;
  }
  return `<svg class="layer" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><g fill="${color}" opacity="${op}">${s}</g></svg>`;
}
