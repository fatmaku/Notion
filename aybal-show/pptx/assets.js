// Renders the decorative PNG assets (wave, dot fields, curve, icons, hero with gradient) used by build.js.
const sharp = require('sharp');
const fs = require('fs');
const out = p => `${__dirname}/gen/${p}`;
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

async function wave(name, color, n = 46) {
  const W = n * 18, H = 100; let b = '';
  for (let i = 0; i < n; i++) {
    const h = 14 + Math.abs(Math.sin(i * .55) * Math.cos(i * .21)) * 84;
    b += `<rect x="${i * 18 + 5}" y="${(H - h) / 2}" width="7" height="${h}" rx="3.5" fill="${color}"/>`;
  }
  await sharp(svg(W, H, b)).png().toFile(out(name));
}
async function dots() { // 101 dots, each = 1M families
  const c = 17, cell = 60, r = 21; let b = '';
  for (let i = 0; i < 101; i++) {
    const x = (i % c) * cell + cell / 2, y = Math.floor(i / c) * cell + cell / 2;
    b += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 9 == 4 ? '#C35A76' : '#D4B27A'}"/>`;
  }
  await sharp(svg(c * cell, 6 * cell, b)).png().toFile(out('dots.png'));
}
async function houses() {
  const c = 20, cell = 44; let b = '';
  for (let i = 0; i < 100; i++) {
    const x = (i % c) * cell + 4, y = Math.floor(i / c) * cell + 4, s = 34;
    b += `<polygon points="${x + s / 2},${y} ${x + s},${y + s * .45} ${x + s},${y + s} ${x},${y + s} ${x},${y + s * .45}" fill="#D4B27A"/>`;
  }
  await sharp(svg(c * cell, 5 * cell, b)).png().toFile(out('houses.png'));
}
async function curve(pts) { // pts in px (100px per inch) relative to the image box
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  await sharp(svg(1177, 150, `<path d="${d}" fill="none" stroke="#B08A4A" stroke-width="4" stroke-linecap="round"/>`), { density: 144 }).png().toFile(out('curve.png'));
}
const ICONS = {
  shield: '<path d="M12 2l9 4v7c0 6-4 11-9 13C7 24 3 19 3 13V6z"/><path d="M8 14l3 3 5-6"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/>',
  people: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 6-5 2 0 4 1 4 3"/>',
  growth: '<path d="M4 20V14M10 20V10M16 20V6M3 9l6-5 5 4 7-6"/>',
};
async function icon(name, color) {
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 28" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`)).png().toFile(out(`icon-${name}.png`));
}
async function hero() { // crop to the cover panel ratio and fade the left edge into the plum background
  const src = `${__dirname}/../assets/hero.jpg`;
  const W = 939, H = Math.round(939 / (7.033 / 7.5));
  const g = svg(W, H, `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#2E0B18" stop-opacity="1"/><stop offset=".22" stop-color="#2E0B18" stop-opacity=".6"/><stop offset=".5" stop-color="#2E0B18" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`);
  await sharp(src).resize(W, H, { fit: 'cover' }).composite([{ input: g }]).jpeg({ quality: 88 }).toFile(out('hero-cover.jpg'));
}
module.exports = { run: async (curvePts) => {
  await wave('wave-gold.png', '#B08A4A'); await wave('wave-wine.png', '#6E1630', 40);
  await dots(); await houses(); await curve(curvePts); await hero();
  await icon('shield', '#B08A4A'); for (const n of ['grid', 'people', 'growth']) await icon(n, '#D4B27A');
}};
