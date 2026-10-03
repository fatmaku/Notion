/* LiveFX Vision-Trailer engine (35 s) – deterministic: render(t) draws the exact frame for time t (seconds)
   on ONE canvas (no DOM layout per frame), so capture is fast and every frame is reproducible.
   ?ratio=9x16 (default, 1080×1920) | 16x9 (1920×1080) · ?lang=de (default) | tr | en · ?capture disables the live loop.
   All on-screen text lives in DICT (DE master, TR and EN written as native versions). Long strings are fitted by
   measuring (fitWrap), so TR/EN never overflow. In 9:16 the bottom 35 % carries no text (platform UI zone).
   Lines: A Erzählfilm (green) · B Sprachen lernen (gold) · C VR/AR & Bühne (light blue) · D Auto-Edit (pink). */
'use strict';
const Q = new URLSearchParams(location.search);
const RATIO = Q.get('ratio') === '16x9' ? '16x9' : '9x16';
const LANG = ['de', 'tr', 'en'].includes(Q.get('lang')) ? Q.get('lang') : 'de';
const P = RATIO === '9x16';
const W = P ? 1080 : 1920, H = P ? 1920 : 1080;
const DUR = 35;
const SAFE = P ? H * 0.65 : H; // no text below this y in 9:16

/* ---------------- dictionary (DE = master) ---------------- */
const WORDS = {
  apple: { e: '🍎', de: { art: 'der', w: 'Apfel', syl: ['Ap', 'fel'] }, tr: { w: 'elma', syl: ['el', 'ma'] }, en: { w: 'apple', syl: ['ap', 'ple'] } },
  cat: { e: '🐈', de: { art: 'die', w: 'Katze', syl: ['Kat', 'ze'] }, tr: { w: 'kedi', syl: ['ke', 'di'] }, en: { w: 'cat', syl: ['cat'] } },
};
const DICT = {
  de: {
    hookQ: 'Was wäre, wenn Worte Bilder machen?', hook1: 'Du redest.', hook2: 'Es wird Bild.',
    vision: 'VISION',
    lineA: 'A · Erzählfilm', lineB: 'B · Sprachen lernen', lineC: 'C · VR/AR & Bühne', lineD: 'D · Auto-Edit',
    tagA: 'Live aus Worten. Kein Schnitt. Kein Rechenzentrum.',
    story: ['Es war *Nacht* …', 'ein *Mädchen* ging in den *Wald* …', 'es begann zu *regnen* …', 'plötzlich ein *Drache*!'],
    chips: ['🌙 Nacht', '🌲 Wald', '👧 Mädchen', '🐉 Drache'], atmo: 'Atmo: ☔ Regen',
    live: 'LIVE', cam: 'Kamera (Platzhalter)', cost: '☁️ 0,00 €', fps: '⚡ 60 fps im Browser',
    tagB: 'Jedes Wort ein Bild. Jede Sprache eine Stimme.',
    q: ['„', '“'], second: 'tr', ok: '✓ Nachgesprochen', kid: 'Kind',
    tagC: 'Bühne · Klassenzimmer · Hörbuch · Brille',
    stage: 'Bühne', applause: 'Applaus!', stageLT: '🎉 Bühnen-Modus: Stimme → Effekt', class: 'Klassenzimmer · AR', glasses: 'Brille · XR', hud: '☔ yağmur · Regen', book: 'Hörbuch',
    tagD: 'Video rein. Fertig geschnitten raus. Kein Upload.',
    file: 'mein_stream.mp4', drop: 'Video hierher ziehen', listen: 'Höre zu … (lokal)', done: '✓ 42 Ereignisse erkannt',
    dchips: ['😂 Meme', '🌲 Szene', '🔍 Zoom', '✂️ Schnitt'], export: '⬇ 3 Clips exportieren',
    clipWords: ['Das', 'war', 'echt', 'KRASS!'], card: 'KRASS!',
    claim: 'Deine Stimme wird zum Video.', run: 'Läuft im Browser · DE · TR · EN',
    pilot: 'Pilot-Partner gesucht:', pilot2: 'Plattformen · Bildung · Verlage', web: '[Website]',
  },
  tr: {
    hookQ: 'Ya kelimeler resim yapsaydı?', hook1: 'Sen anlat.', hook2: 'Sahne oluşsun.',
    vision: 'VİZYON',
    lineA: 'A · Anlatı filmi', lineB: 'B · Dil öğrenme', lineC: 'C · VR/AR ve sahne', lineD: 'D · Otomatik kurgu',
    tagA: 'Kelimelerden canlı film. Kurgu yok. Veri merkezi yok.',
    story: ['*Gece*ydi …', 'bir *kız* *orman*a gitti …', '*yağmur* yağmaya başladı …', 'birden bir *ejderha*!'],
    chips: ['🌙 Gece', '🌲 Orman', '👧 Kız', '🐉 Ejderha'], atmo: 'Atmosfer: ☔ Yağmur',
    live: 'CANLI', cam: 'Kamera (yer tutucu)', cost: '☁️ 0,00 €', fps: '⚡ Tarayıcıda 60 fps',
    tagB: 'Her kelime bir resim. Her dil bir ses.',
    q: ['“', '”'], second: 'en', ok: '✓ Doğru söyledin', kid: 'Çocuk',
    tagC: 'Sahne · Sınıf · Sesli kitap · Gözlük',
    stage: 'Sahne', applause: 'Alkış!', stageLT: '🎉 Sahne modu: ses → efekt', class: 'Sınıf · AR', glasses: 'Gözlük · XR', hud: '☔ Regen · yağmur', book: 'Sesli kitap',
    tagD: 'Videoyu bırak. Kurgulanmış klipler çıksın. Yükleme yok.',
    file: 'yayınım.mp4', drop: 'Videoyu buraya sürükle', listen: 'Dinliyorum … (yerel)', done: '✓ 42 olay bulundu',
    dchips: ['😂 Meme', '🌲 Sahne', '🔍 Zoom', '✂️ Kesme'], export: '⬇ 3 klibi dışa aktar',
    clipWords: ['Bu', 'gerçekten', 'MÜTHİŞ!'], card: 'MÜTHİŞ!',
    claim: 'Sesin videoya dönüşür.', run: 'Tarayıcıda çalışır · DE · TR · EN',
    pilot: 'Pilot ortaklar arıyoruz:', pilot2: 'Platformlar · Eğitim · Yayınevleri', web: '[Web sitesi]',
  },
  en: {
    hookQ: 'What if words made pictures?', hook1: 'You talk.', hook2: 'It becomes a scene.',
    vision: 'VISION',
    lineA: 'A · Story film', lineB: 'B · Language learning', lineC: 'C · VR/AR & stage', lineD: 'D · Auto-edit',
    tagA: 'Live from words. No editing. No data center.',
    story: ['It was *night* …', 'a *girl* walked into the *forest* …', 'it started to *rain* …', 'suddenly, a *dragon*!'],
    chips: ['🌙 Night', '🌲 Forest', '👧 Girl', '🐉 Dragon'], atmo: 'Ambience: ☔ Rain',
    live: 'LIVE', cam: 'Camera (placeholder)', cost: '☁️ €0.00', fps: '⚡ 60 fps in the browser',
    tagB: 'Every word a picture. Every language a voice.',
    q: ['“', '”'], second: 'de', ok: '✓ Well said', kid: 'Child',
    tagC: 'Stage · Classroom · Audiobook · Glasses',
    stage: 'Stage', applause: 'Applause!', stageLT: '🎉 Stage mode: voice → effect', class: 'Classroom · AR', glasses: 'Glasses · XR', hud: '☔ yağmur · rain', book: 'Audiobook',
    tagD: 'Video in. Edited clips out. No upload.',
    file: 'my_stream.mp4', drop: 'Drop your video here', listen: 'Listening … (local)', done: '✓ 42 moments found',
    dchips: ['😂 Meme', '🌲 Scene', '🔍 Zoom', '✂️ Cut'], export: '⬇ Export 3 clips',
    clipWords: ['That', 'was', 'totally', 'WILD!'], card: 'WILD!',
    claim: 'Your voice becomes video.', run: 'Runs in your browser · DE · TR · EN',
    pilot: 'Looking for pilot partners:', pilot2: 'Platforms · Education · Publishers', web: '[Website]',
  },
};
const T = DICT[LANG];
document.documentElement.lang = LANG;

/* ---------------- math ---------------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeBack = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const pop = (t, a, d = .45) => easeBack(prog(t, a, a + d));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, p) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(p))).toString(16).padStart(2, '0')).join(''); };
const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;

const C = { bg: '#0f1115', pink: '#ff2d75', green: '#2dffb5', gold: '#ffd166', blue: '#5ad1ff', ink: '#f3f5fb', mute: '#9aa3b8', card: '#171a22' };

/* ---------------- canvas + text helpers ---------------- */
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const FONT = 'Lexend, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
const font = (sz, w = 700) => `${w} ${Math.round(sz)}px ${FONT}`;
let SA = 1; // scene alpha
const alpha = (a) => { ctx.globalAlpha = clamp(SA * a); };

function wrap(str, maxW, sz, w) {
  ctx.font = font(sz, w);
  const words = str.split(' '), lines = []; let cur = '';
  for (const wd of words) { const tst = cur ? cur + ' ' + wd : wd; if (cur && ctx.measureText(tst).width > maxW) { lines.push(cur); cur = wd; } else cur = tst; }
  if (cur) lines.push(cur); return lines;
}
const FW = new Map();
/* largest size ≤ sz at which str fits into maxLines lines of width maxW (memoized: identical every frame) */
function fitWrap(str, maxW, sz, maxLines = 1, w = 700) {
  const k = [str, maxW, sz, maxLines, w].join('|'); if (FW.has(k)) return FW.get(k);
  let s = sz, r;
  for (; s > 14; s -= 1) {
    const L = wrap(str, maxW, s, w); ctx.font = font(s, w);
    if (L.length <= maxLines && L.every((l) => ctx.measureText(l).width <= maxW)) { r = { s, lines: L }; break; }
  }
  r = r || { s, lines: wrap(str, maxW, s, w) }; FW.set(k, r); return r;
}
function text(str, x, y, sz, color, o = {}) {
  ctx.font = font(sz, o.w || 700); ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || sz * .45; ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.shadowBlur = o.blur ? o.blur * 2 : sz; ctx.fillText(str, x, y); ctx.shadowBlur = 0; }
  else { ctx.fillStyle = color; ctx.fillText(str, x, y); }
}
/* fitted, wrapped block: y = top of block; returns bottom y */
function block(str, x, y, maxW, sz, lines, color, o = {}) {
  const f = fitWrap(str, maxW, sz, lines, o.w || 700), lh = f.s * (o.lh || 1.18);
  f.lines.forEach((l, i) => text(l, x, y + lh * (i + .5), f.s, color, o));
  return y + lh * f.lines.length;
}
function rr(x, y, w, h, r, fill, stroke, lw = 3) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
/* pill: anchor 'l' | 'r' | 'c'; returns width */
function pill(str, x, y, sz, color, o = {}) {
  ctx.font = font(sz, o.w || 700);
  const tw = Math.min(ctx.measureText(str).width, o.maxW || 1e9), padX = sz * .8, h = sz * 1.9, w = tw + padX * 2;
  const x0 = o.anchor === 'r' ? x - w : o.anchor === 'c' ? x - w / 2 : x;
  if (o.glowBox) { ctx.shadowColor = color; ctx.shadowBlur = 30; }
  rr(x0, y - h / 2, w, h, h / 2, o.fill || rgba(color, .16), color, Math.max(2, sz / 14)); ctx.shadowBlur = 0;
  let s = sz; if (ctx.measureText(str).width > tw) s = sz * tw / ctx.measureText(str).width;
  text(str, x0 + w / 2, y + sz * .04, s, o.ink || color, { w: o.w || 700 });
  return w;
}
function emoji(e, x, y, sz, rot = 0, sx = 1, sy = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
  ctx.font = `${Math.round(sz)}px "Noto Color Emoji","Apple Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0); ctx.restore();
}

/* ---------------- particles (analytic in t) ---------------- */
const CONF = [C.pink, C.green, C.gold, C.blue, '#ffffff', '#c084fc'];
function confetti(t, t0, dur, x0, y0, n = 120, spread = 1, seed = 0, scale = 1) {
  const dt = t - t0; if (dt < 0 || dt > dur) return;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + seed), h2 = hash(i * 3 + seed + 1), h3 = hash(i * 7 + seed + 2), h4 = hash(i * 11 + seed + 3);
    const ang = -Math.PI / 2 + (h1 - .5) * Math.PI * .9 * spread, sp = (700 + h2 * 1100) * scale;
    const x = x0 + Math.cos(ang) * sp * dt * Math.exp(-dt * .9) + Math.sin(dt * 5 + i) * 16 * scale;
    const y = y0 + Math.sin(ang) * sp * dt * Math.exp(-dt * .9) + 800 * scale * dt * dt * .5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(dt * (4 + h3 * 8) + i); alpha(1 - prog(dt, dur * .6, dur));
    ctx.fillStyle = CONF[i % CONF.length]; ctx.fillRect((-8 - h4 * 6) * scale, -4 * scale, (16 + h4 * 12) * scale, 8 * scale); ctx.restore();
  }
  alpha(1);
}
function rainLines(t, amt, x, y, w, h, n = 160, seed = 0) {
  if (amt <= 0) return;
  ctx.strokeStyle = `rgba(190,220,255,${.55 * amt * SA})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 1300 + hash(i + seed) * 800, len = 30 + hash(i * 3 + seed) * 50;
    const yy = y + ((hash(i * 7 + seed) * (h + 160) + t * sp) % (h + 160)) - 80, xx = x + hash(i * 11 + seed) * w;
    ctx.moveTo(xx, yy); ctx.lineTo(xx - 7, yy + len);
  }
  ctx.stroke();
}
function starField(t, amt, x, y, w, h, n = 90) {
  if (amt <= 0) return;
  for (let i = 0; i < n; i++) {
    const tw = .35 + .65 * Math.pow(Math.sin(t * 1.4 + hash(i) * 6.28) * .5 + .5, 2);
    ctx.fillStyle = `rgba(255,255,255,${amt * tw * SA})`; ctx.beginPath(); ctx.arc(x + hash(i * 3) * w, y + hash(i * 5) * h, 1.5 + hash(i * 7) * 2.2, 0, 6.283); ctx.fill();
  }
}
function waveBars(t, cx0, cy, w, h, color, amp, n = 28, seed = 0) {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const env = Math.sin(Math.PI * (i + .5) / n);
    const v = .12 + amp * env * (.45 + .55 * Math.abs(Math.sin(t * (7 + hash(i + seed) * 6) + i * 1.7)));
    const bh = Math.max(6, h * v);
    rr(cx0 - w / 2 + i * bw + bw * .2, cy - bh / 2, bw * .6, bh, bw * .3, color);
  }
}

/* ---------------- shared header: line label, Vision badge, tagline ---------------- */
function header(t, a, color, label, tag) {
  const m = P ? 60 : 64, y = P ? 78 : 66, sz = P ? 38 : 32;
  const ap = pop(t, a + .1, .45);
  alpha(clamp(ap)); pill(label, m, y, sz, color, { fill: rgba(color, .18) });
  pill(T.vision, W - m, y, sz * .78, color, { anchor: 'r', fill: 'rgba(15,17,21,.85)', glowBox: true });
  // progress dots A–D
  const cols = [C.green, C.gold, C.blue, C.pink], idx = cols.indexOf(color);
  ctx.font = font(sz * .78); const vw = ctx.measureText(T.vision).width + sz * .78 * 1.6;
  cols.forEach((c, i) => { alpha(clamp(ap) * (i === idx ? 1 : .35)); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W - m - vw - 30 - (3 - i) * 26, y, i === idx ? 9 : 7, 0, 6.283); ctx.fill(); });
  const tp = prog(t, a + .5, a + .9); alpha(tp);
  const dy = (1 - easeOut(tp)) * 24;
  if (P) block(tag, W / 2, 132 + dy, W - 120, 54, 2, '#fff', { glow: rgba(color, .9), blur: 18 });
  else block(tag, W / 2, 978 + dy, W - 240, 52, 1, '#fff', { glow: rgba(color, .9), blur: 18 });
  alpha(1);
}

/* ---------------- background ---------------- */
function background(t, col) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const gx = W * (.5 + Math.sin(t * .31) * .28), gy = H * (.4 + Math.cos(t * .23) * .25), R = Math.max(W, H) * .7;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
  g.addColorStop(0, rgba(col, .26)); g.addColorStop(.35, rgba(col, .07)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x < W; x += 120) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
  for (let y = 0; y < H; y += 120) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
  ctx.stroke();
}

/* ======================= SCENES ======================= */
const SCENES = [];
const scene = (a, b, col, draw) => SCENES.push({ a, b, col, draw });

/* ---------- 0–3: Hook ---------- */
scene(0, 3.05, C.pink, (t) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cy = P ? H * .5 : H * .62;
  const amp = .35 + .5 * Math.abs(Math.sin(t * 3.1)) * (t > 1.5 ? 1.2 : .8);
  ctx.shadowColor = C.pink; ctx.shadowBlur = 30; waveBars(t, W / 2, cy, P ? 820 : 900, P ? 260 : 220, C.pink, amp, 36); ctx.shadowBlur = 0;
  if (t < 1.5) {
    const a = prog(t, .15, .45) * (1 - prog(t, 1.38, 1.5)); alpha(a);
    block(T.hookQ, W / 2, P ? H * .25 : H * .14, W - (P ? 140 : 300), P ? 92 : 92, P ? 3 : 2, '#fff', { glow: C.pink, blur: 20 });
  } else {
    const a1 = clamp(pop(t, 1.55, .35)), a2 = clamp(pop(t, 2.05, .4));
    alpha(a1); const y1 = P ? H * .26 : H * .17;
    block(T.hook1, W / 2, y1, W - 160, P ? 110 : 100, 1, C.ink, { w: 700 });
    alpha(a2); ctx.save(); const sc = lerp(.6, 1, pop(t, 2.05, .4)), y2 = y1 + (P ? 190 : 150);
    ctx.translate(W / 2, y2); ctx.scale(sc, sc); ctx.translate(-W / 2, -y2);
    block(T.hook2, W / 2, y1 + (P ? 120 : 110), W - 160, P ? 130 : 120, 1, '#fff', { glow: C.pink, blur: 26 }); ctx.restore();
  }
  alpha(1);
});

/* ---------- 3–11: A Erzählfilm ---------- */
const STORY_T = [[3.3, 4.1], [4.5, 5.8], [6.4, 7.3], [8.1, 8.9]];
const CHIP_T = [4.05, 5.55, 5.95, 8.95];
function parseKw(s) { const out = []; let kw = false; for (const ch of s) { if (ch === '*') { kw = !kw; continue; } out.push({ ch, kw }); } return out; }
const STORY = T.story.map(parseKw);
/* transcript bar: types the current sentence char by char, keywords in green */
function transcript(t, x, y, w, h) {
  rr(x, y, w, h, 28, 'rgba(23,26,34,.94)', 'rgba(255,255,255,.12)', 2);
  const mr = Math.min(h * .28, 40), mx = x + 26 + mr, my = y + h / 2;
  let i = 0; for (let k = 0; k < STORY_T.length; k++) if (t >= STORY_T[k][0]) i = k;
  const [ta, tb] = STORY_T[i], s = STORY[i], typing = t < tb + .05;
  const pulse = typing ? .5 + .5 * Math.sin(t * 9) : 0;
  ctx.fillStyle = rgba(C.pink, .5 - pulse * .4); ctx.beginPath(); ctx.arc(mx, my, mr + pulse * 14, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.pink; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  emoji('🎙️', mx, my + 2, mr * 1.1);
  const tx = mx + mr + 26, tw = x + w - tx - 26;
  // one font size for all sentences of this language (stable look): fit the longest into 2 lines
  const longest = T.story.map((q) => q.replace(/\*/g, '')).sort((a, b) => b.length - a.length)[0];
  const f = fitWrap(longest, tw, P ? 46 : 42, 2, 600), sz = f.s, lh = sz * 1.22;
  const n = Math.floor(s.length * prog(t, ta, tb));
  const plain = s.map((c) => c.ch).join(''), lines = wrap(plain, tw, sz, 600);
  ctx.font = font(sz, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let idx = 0; const y0 = my - (lines.length - 1) * lh / 2; let cx2 = tx, cy2 = y0;
  lines.forEach((ln, li) => {
    let xx = tx; const yy = y0 + li * lh;
    for (const ch of ln) {
      while (idx < s.length && s[idx].ch !== ch) idx++; // skip spaces dropped by wrapping
      if (idx >= n) break;
      ctx.fillStyle = s[idx].kw ? C.green : C.ink; ctx.font = font(sz, s[idx].kw ? 700 : 600);
      ctx.fillText(ch, xx, yy); xx += ctx.measureText(ch).width; idx++; cx2 = xx; cy2 = yy;
    }
    if (idx < s.length && s[idx].ch === ' ') { idx++; }
  });
  if (typing && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = C.green; ctx.fillRect(cx2 + 4, cy2 - sz * .5, 5, sz); }
}
function cameraFrame(t, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#232838'); g.addColorStop(1, '#12151d');
  rr(x, y, w, h, 26, g, 'rgba(255,255,255,.16)', 3);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.clip();
  const sx = x + w / 2, sy = y + h * .95, s = h / 400;
  ctx.fillStyle = '#343b50';
  ctx.beginPath(); ctx.ellipse(sx, sy, 170 * s, 120 * s, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(sx, sy - 190 * s, 72 * s, 0, 6.283); ctx.fill();
  // voice ripple
  const typing = STORY_T.some(([a, b]) => t >= a && t <= b + .1);
  if (typing) for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k / 3) % 1; ctx.strokeStyle = rgba(C.pink, (1 - ph) * .7 * SA); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx, sy - 190 * s, (80 + ph * 120) * s, -.6, .6); ctx.stroke(); }
  ctx.restore();
  const ps = P ? 26 : 24;
  pill('● ' + T.live, x + 22, y + 22 + ps, ps, '#ff4d4d', { fill: 'rgba(255,60,60,.22)' });
  pill(T.cost, x + w - 22, y + 22 + ps, ps, C.green, { anchor: 'r', fill: 'rgba(15,17,21,.75)' });
  text(T.cam, x + 26, y + h - 30, P ? 26 : 24, 'rgba(255,255,255,.55)', { align: 'left', w: 500 });
}
function pine(x, base, hgt, s) {
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  ctx.fillStyle = '#3a2a1d'; ctx.fillRect(-hgt * .04, -hgt * .14, hgt * .08, hgt * .16);
  for (let k = 0; k < 3; k++) {
    const yb = -hgt * (.1 + k * .27), wd = hgt * (.36 - k * .08);
    ctx.fillStyle = k % 2 ? '#1d6a4b' : '#17573e';
    ctx.beginPath(); ctx.moveTo(-wd, yb); ctx.lineTo(wd, yb); ctx.lineTo(0, yb - hgt * .42); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = rgba(C.green, .35 * SA); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -hgt * .96); ctx.lineTo(hgt * .2, -hgt * .64); ctx.stroke();
  ctx.restore();
}
function world(t, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 28); ctx.clip();
  const shk = t > 8.9 && t < 9.4 ? Math.sin(t * 95) * 14 * (1 - prog(t, 8.9, 9.4)) : 0;
  ctx.translate(shk, shk * .5);
  const night = ease(prog(t, 3.75, 4.7)), rain = prog(t, 7.0, 7.6);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, mix(mix('#5a7bd8', '#070b22', night), '#0a0d18', rain * .5));
  g.addColorStop(.7, mix(mix('#ffb38a', '#1f2a66', night), '#1a2030', rain * .5));
  ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  starField(t, night * (1 - rain * .7), x, y, w, h * .55);
  // moon / sun
  const mx = x + w * .78, my = y + h * lerp(.32, .16, night), mr = Math.min(w, h) * .07;
  alpha(1 - rain * .7); ctx.shadowColor = night > .5 ? 'rgba(255,230,160,.8)' : 'rgba(255,200,120,.8)'; ctx.shadowBlur = 60;
  ctx.fillStyle = mix('#ffcf6e', '#fff3c4', night); ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
  if (night > .3) { ctx.fillStyle = mix('#ffb38a', '#11173d', night); ctx.beginPath(); ctx.arc(mx + mr * .45, my - mr * .2, mr * .85, 0, 6.283); ctx.fill(); }
  alpha(1);
  // hills
  const gy = y + h * .74;
  ctx.fillStyle = mix('#5b6fb0', '#1a2346', night);
  ctx.beginPath(); ctx.moveTo(x, gy); for (let i = 0; i <= 12; i++) ctx.lineTo(x + w * i / 12, gy - h * (.08 + .06 * Math.sin(i * 1.3 + 1))); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  ctx.fillStyle = mix('#3d7a4c', '#0f2219', night); ctx.fillRect(x, gy, w, h - (gy - y));
  // trees grow from below
  const nT = 7;
  for (let i = 0; i < nT; i++) {
    const tx = x + w * (.06 + i * .14 + (hash(i * 3) - .5) * .05), th = h * (.26 + hash(i * 5) * .14);
    pine(tx, gy + h * .03 + (i % 2) * h * .02, th, easeBack(prog(t, 5.3 + i * .09, 5.85 + i * .09)));
  }
  // girl walks in, stays
  const gp = easeOut(prog(t, 5.85, 6.9)), gxp = lerp(x - 80, x + w * .33, gp);
  const walking = t > 5.85 && t < 6.9, bob = walking ? Math.abs(Math.sin(t * 14)) * h * .015 : 0;
  if (t > 5.85) emoji('👧', gxp, gy - h * .05 - bob, h * .12, walking ? Math.sin(t * 14) * .08 : 0);
  if (t > 7.6) emoji('☂️', gxp + h * .03, gy - h * .17, h * .1 * clamp(pop(t, 7.6, .4)));
  rainLines(t, rain, x, y, w, h, P ? 150 : 180);
  // lightning + dragon
  const fl = t > 8.85 ? Math.exp(-(t - 8.85) * 9) : 0;
  if (fl > .02) {
    ctx.strokeStyle = `rgba(255,255,230,${fl * SA})`; ctx.lineWidth = 7; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30;
    ctx.beginPath(); let bx = x + w * .62, by = y; ctx.moveTo(bx, by);
    for (let k = 1; k <= 6; k++) { bx += (hash(k * 13) - .5) * w * .12; by += h * .09; ctx.lineTo(bx, by); } ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,255,255,${fl * .55 * SA})`; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  }
  if (t > 8.9) {
    const ap = clamp(pop(t, 8.9, .45)), fly = ease(prog(t, 9.7, 11.0));
    const dx = lerp(x + w * .7, x + w * 1.05, fly), dy = lerp(gy - h * .16, y + h * .12, fly);
    const flap = 1 + Math.sin(t * 16) * .06 * (fly > 0 ? 1 : .3);
    emoji('🐉', dx, dy, h * .24 * ap, lerp(0, -.35, fly), -1, flap);
  }
  ctx.restore();
  // recognized-word chips (state timeline) along the top of the world
  const cs = P ? 28 : 26; let cxp = x + 20;
  T.chips.forEach((c, i) => {
    const p = pop(t, CHIP_T[i], .4); if (p <= 0) return;
    alpha(clamp(p)); cxp += pill(c, cxp, y + 24 + cs, cs, C.green, { fill: 'rgba(10,14,20,.78)' }) + 12;
  });
  alpha(clamp(pop(t, 7.35, .4)));
  if (t > 7.35) pill(T.atmo, x + w - 20, y + 24 + cs + cs * 2.3, cs, C.blue, { anchor: 'r', fill: 'rgba(10,14,20,.78)' });
  alpha(1);
}
scene(3, 11.05, C.green, (t) => {
  if (P) {
    cameraFrame(t, 60, 268, W - 120, 330);
    transcript(t, 60, 620, W - 120, 150);
    world(t, 60, 796, W - 120, 1080);
  } else {
    cameraFrame(t, 64, 126, 820, 460);
    transcript(t, 64, 610, 820, 170);
    alpha(prog(t, 3.6, 4)); text(T.fps, 64 + 410, 850, 34, C.green, { w: 600 }); alpha(1);
    world(t, 924, 126, W - 924 - 64, 790);
  }
  header(t, 3, C.green, T.lineA, T.tagA);
});

/* ---------- 11–18: B Sprachen lernen ---------- */
const ORDER = { de: ['de', 'tr', 'en'], tr: ['tr', 'de', 'en'], en: ['en', 'de', 'tr'] }[LANG];
const FACE_T = [12.1, 13.3, 14.4, 15.6]; // apple faces start; 15.6 = cat card
const SPEAK = [[11.4, 11.95], [12.35, 12.95], [13.5, 14.05], [14.6, 15.15], [15.55, 16.0], [16.15, 16.7]];
function articleColor(a) { return a === 'der' ? '#2f7bff' : a === 'die' ? '#ff4d5e' : '#1fae6b'; }
function wordCard(t, x, y, w, h, wordKey, lang, flipIn, flipOut) {
  const sIn = flipIn == null ? 1 : Math.abs(Math.cos((1 - prog(t, flipIn, flipIn + .3)) * Math.PI / 2));
  const sOut = flipOut == null ? 1 : Math.abs(Math.cos(prog(t, flipOut - .3, flipOut) * Math.PI / 2));
  const sx = Math.min(sIn, sOut); if (sx <= .01) return;
  const W0 = WORDS[wordKey], d = W0[lang];
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sx, 1); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = rgba(C.gold, .6); ctx.shadowBlur = 50;
  rr(x, y, w, h, 40, '#fff8e8', C.gold, 6); ctx.shadowBlur = 0;
  // paper lines
  ctx.strokeStyle = 'rgba(200,170,110,.18)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let ly = y + 70; ly < y + h - 20; ly += 54) { ctx.moveTo(x + 30, ly); ctx.lineTo(x + w - 30, ly); } ctx.stroke();
  const ps = P ? 30 : 28;
  pill(lang.toUpperCase(), x + 28, y + 30 + ps, ps, '#b07a00', { fill: 'rgba(255,209,102,.35)' });
  const em = Math.min(h * .36, w * .4);
  emoji(W0.e, x + w / 2, y + h * .3, em, Math.sin(t * 2) * .05);
  // word with coloured article
  const main = (d.art ? d.art + ' ' : '') + d.w, f = fitWrap(main, w - 80, P ? 118 : 110, 1);
  ctx.font = font(f.s); const full = ctx.measureText(main).width, aw = d.art ? ctx.measureText(d.art + ' ').width : 0;
  const wy = y + h * .62, x0 = x + w / 2 - full / 2;
  if (d.art) text(d.art, x0, wy, f.s, articleColor(d.art), { align: 'left' });
  text(d.w, x0 + aw, wy, f.s, '#1b1b2a', { align: 'left' });
  // syllables with arcs + speaker
  const ss = P ? 50 : 46; ctx.font = font(ss, 600);
  const gap = ss * .5, segW = d.syl.map((s) => ctx.measureText(s).width), sp = ss * 1.95; // icon + sound arcs end before the first syllable
  const tot = segW.reduce((a, b) => a + b, 0) + gap * (d.syl.length - 1) + sp;
  let sx0 = x + w / 2 - tot / 2; const sy = y + h * .82;
  const speaking = SPEAK.some(([a, b]) => t >= a && t <= b);
  emoji('🔊', sx0 + ss * .5, sy, ss * .9); if (speaking) for (let k = 0; k < 2; k++) { ctx.strokeStyle = rgba('#d08a00', .9 * SA); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx0 + ss * .7, sy, ss * (.55 + k * .3) + Math.sin(t * 12) * 3, -.7, .7); ctx.stroke(); }
  sx0 += sp;
  d.syl.forEach((s, i) => {
    const active = speaking && Math.floor((t * 4) % d.syl.length) === i;
    text(s, sx0 + segW[i] / 2, sy, ss, active ? '#d08a00' : '#5b4a2a', { w: 600 });
    ctx.strokeStyle = active ? '#d08a00' : 'rgba(176,122,0,.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(sx0 + segW[i] / 2, sy + ss * .55, segW[i] / 2 + 4, ss * .25, 0, 0, Math.PI); ctx.stroke();
    if (i < d.syl.length - 1) text('·', sx0 + segW[i] + gap / 2, sy, ss, '#b07a00');
    sx0 += segW[i] + gap;
  });
  ctx.restore();
}
function bubble(t, x, y, w, h, str, t0, col) {
  const p = clamp(pop(t, t0, .4)); if (p <= 0) return; alpha(p);
  emoji('🧒', x + h * .45, y + h / 2, h * .72);
  const bx = x + h * .95, bw = w - h * .95;
  rr(bx, y, bw, h, h * .35, 'rgba(23,26,34,.94)', col, 3);
  ctx.fillStyle = 'rgba(23,26,34,.94)'; ctx.beginPath(); ctx.moveTo(bx + 2, y + h * .45); ctx.lineTo(bx - 22, y + h * .6); ctx.lineTo(bx + 2, y + h * .72); ctx.fill();
  const f = fitWrap(str, bw - 60, h * .46, 1);
  text(str, bx + bw / 2, y + h / 2, f.s, '#fff', { glow: rgba(col, .8), blur: 14 });
  alpha(1);
}
scene(11, 18.05, C.gold, (t) => {
  const second = T.second, cat = WORDS.cat[second];
  const say1 = T.q[0] + WORDS.apple[LANG].w + T.q[1], say2 = T.q[0] + cat.w + T.q[1];
  const speakNow = SPEAK.some(([a, b]) => t >= a && t <= b), amp = speakNow ? .9 : .15;
  let card, pillsY, wave;
  if (P) { bubble(t, 60, 270, W - 120, 150, t < 15.4 ? say1 : say2, t < 15.4 ? 11.3 : 15.4, C.gold); card = [110, 450, W - 220, 600]; pillsY = 1110; wave = [W / 2, 1520, 880, 380]; }
  else { bubble(t, 64, 170, 760, 150, t < 15.4 ? say1 : say2, t < 15.4 ? 11.3 : 15.4, C.gold); card = [900, 130, 940, 790]; pillsY = 400; wave = [64 + 380, 650, 700, 300]; }
  ctx.shadowColor = C.gold; ctx.shadowBlur = 24; alpha(.9); waveBars(t, wave[0], wave[1], wave[2], wave[3], C.gold, amp, 32, 4); ctx.shadowBlur = 0; alpha(1);
  // card sequence
  const [cx0, cy0, cw, ch] = card, ap = clamp(pop(t, FACE_T[0], .45));
  ctx.save(); const sc = lerp(.7, 1, ap); ctx.translate(cx0 + cw / 2, cy0 + ch / 2); ctx.scale(sc, sc); ctx.translate(-(cx0 + cw / 2), -(cy0 + ch / 2)); alpha(ap);
  let face = -1; for (let i = 0; i < 4; i++) if (t >= FACE_T[i] - (i ? .3 : 0)) face = i;
  if (face >= 0 && face < 3) wordCard(t, cx0, cy0, cw, ch, 'apple', ORDER[face], face ? FACE_T[face] : null, face < 3 ? FACE_T[face + 1] : null);
  if (face === 3) {
    wordCard(t, cx0, cy0, cw, ch, 'cat', LANG, FACE_T[3], null);
    const ok = clamp(pop(t, 16.75, .4));
    if (ok > 0) { alpha(ok); pill(T.ok, cx0 + cw - 30, cy0 + 30 + (P ? 30 : 28), P ? 30 : 28, '#1fae6b', { anchor: 'r', fill: 'rgba(31,174,107,.18)', ink: '#14794b' }); alpha(ap); confetti(t, 16.75, 1.2, cx0 + cw / 2, cy0 + ch * .15, 40, 1.3, 9, .7); }
  }
  ctx.restore(); alpha(1);
  // language pills
  const act = face >= 0 && face < 3 ? ORDER[face] : LANG, ps = P ? 36 : 34;
  ctx.font = font(ps); const pw = ['DE', 'TR', 'EN'].map((s) => ctx.measureText(s).width + ps * 1.6), gap = 22, tot = pw.reduce((a, b) => a + b) + gap * 2;
  let px = P ? W / 2 - tot / 2 : 64 + 380 - tot / 2;
  ['de', 'tr', 'en'].forEach((l, i) => {
    alpha(prog(t, 11.6 + i * .1, 11.9 + i * .1)); const on = l === act;
    pill(l.toUpperCase(), px, pillsY, ps, on ? C.gold : C.mute, { fill: on ? rgba(C.gold, .25) : 'rgba(23,26,34,.9)' }); px += pw[i] + gap;
  });
  alpha(1);
  header(t, 11, C.gold, T.lineB, T.tagB);
});

/* ---------- 18–25: C VR/AR, Bühne, Klassenzimmer, Brille ---------- */
function panelFrame(t, t0, x, y, w, h, label, drawInner) {
  const op = easeOut(prog(t, t0, t0 + .45)); if (op <= 0) return;
  ctx.save(); const hh = h * op; ctx.beginPath(); ctx.roundRect(x, y + (h - hh) / 2, w, hh, 26); ctx.clip();
  rr(x, y, w, h, 26, '#11151f');
  drawInner(x, y, w, h, t - t0);
  ctx.restore();
  rr(x, y + (h - hh) / 2, w, hh, 26, null, rgba(C.blue, .8), 3);
  alpha(prog(t, t0 + .3, t0 + .6)); const ls = P ? 26 : 28;
  pill(label, x + 18, y + 18 + ls, ls, C.blue, { fill: 'rgba(10,14,20,.82)' }); alpha(1);
}
function stagePanel(t, x, y, w, h, lt) {
  // LED wall
  const cols = 14, rows = 6, cw = w / cols, chh = h * .55 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const v = .5 + .5 * Math.sin(i * .7 + j * .9 - t * 4);
    ctx.fillStyle = `hsla(${(300 + i * 8 + t * 40) % 360},90%,${30 + v * 30}%,${.85 * SA})`;
    ctx.fillRect(x + i * cw + 3, y + j * chh + 3, cw - 6, chh - 6);
  }
  ctx.fillStyle = '#1a1d28'; ctx.fillRect(x, y + h * .78, w, h * .22);
  // spotlights
  for (let k = 0; k < 2; k++) {
    const sx = x + w * (k ? .85 : .15), g = ctx.createLinearGradient(sx, y, x + w / 2, y + h * .8);
    g.addColorStop(0, 'rgba(255,255,220,.5)'); g.addColorStop(1, 'rgba(255,255,220,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(x + w / 2 - w * .16, y + h * .8); ctx.lineTo(x + w / 2 + w * .16, y + h * .8); ctx.fill();
  }
  // performer silhouette
  const px = x + w / 2, py = y + h * .8, s = h / 420;
  ctx.fillStyle = '#05060a'; ctx.beginPath(); ctx.ellipse(px, py, 60 * s, 100 * s, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(px, py - 130 * s, 38 * s, 0, 6.283); ctx.fill();
  const ap = clamp(pop(t, 18.9, .45));
  if (ap > 0) { alpha(ap); const f = fitWrap(T.applause, w * .8, P ? 74 : 80, 1); text(T.applause, x + w / 2, y + h * .3, f.s * lerp(.5, 1, ap), '#fff', { glow: C.pink, blur: 22 }); alpha(1); }
  confetti(t, 19.0, 2.6, x + w / 2, y + h * .5, 90, 1.5, 21, h / 700);
  const lp = easeOut(prog(t, 19.3, 19.7));
  if (lp > 0) { const lh = P ? 54 : 60; rr(x + 18 - (1 - lp) * w, y + h - lh - 18, w - 36, lh, 14, 'rgba(255,45,117,.9)'); alpha(lp); block(lt, x + w / 2 - (1 - lp) * w, y + h - lh - 18 + lh * .1, w - 70, lh * .5, 1, '#fff', { w: 700 }); alpha(1); }
}
function classPanel(t, x, y, w, h) {
  // table + open book
  ctx.fillStyle = '#5a3d27'; ctx.fillRect(x, y + h * .62, w, h * .38);
  const bx = x + w / 2, by = y + h * .78, bw = w * .62, bh = h * .2;
  ctx.fillStyle = '#f4ead2'; ctx.beginPath(); ctx.moveTo(bx - bw / 2, by); ctx.lineTo(bx, by + bh * .15); ctx.lineTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2 - 20, by - bh); ctx.lineTo(bx, by - bh * .85); ctx.lineTo(bx - bw / 2 + 20, by - bh); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + bh * .15); ctx.lineTo(bx, by - bh * .85); ctx.stroke();
  // phone tilting over the book
  const tilt = Math.sin((t - 20.3) * 1.6) * .12, phH = h * .66, phW = phH * .52, phx = x + w / 2, phy = y + h * .44;
  ctx.save(); ctx.translate(phx, phy); ctx.rotate(tilt);
  rr(-phW / 2 - 8, -phH / 2 - 8, phW + 16, phH + 16, 26, '#0b0c10', 'rgba(255,255,255,.6)', 3);
  ctx.beginPath(); ctx.roundRect(-phW / 2, -phH / 2, phW, phH, 18); ctx.clip();
  const g = ctx.createLinearGradient(0, -phH / 2, 0, phH / 2); g.addColorStop(0, '#1d2a66'); g.addColorStop(1, '#4b3a7a'); ctx.fillStyle = g; ctx.fillRect(-phW / 2, -phH / 2, phW, phH);
  // parallax layers move opposite to tilt
  for (let k = 0; k < 3; k++) {
    const off = -tilt * (k + 1) * 160, yy = -phH * (.05 - k * .12);
    ctx.fillStyle = ['#2c3d7a', '#25603f', '#1a4a31'][k]; ctx.beginPath(); ctx.moveTo(-phW, phH / 2);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-phW + i * phW * 2 / 8 + off, yy - 20 * Math.sin(i * 1.7 + k));
    ctx.lineTo(phW, phH / 2); ctx.fill();
  }
  ctx.fillStyle = '#f4ead2'; ctx.fillRect(-phW / 2, phH * .28, phW, phH * .22);
  const dp = clamp(pop(t, 20.9, .45)); emoji('🐉', -tilt * 60, phH * .18, phW * .62 * dp, 0, -1, 1 + Math.sin(t * 5) * .03);
  ctx.restore();
  alpha(prog(t, 21.2, 21.5)); pill('🎧 ' + T.book, x + w - 18, y + 18 + (P ? 26 : 28), P ? 26 : 28, C.gold, { anchor: 'r', fill: 'rgba(10,14,20,.82)' }); alpha(1);
}
function glassesPanel(t, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#20263a'); g.addColorStop(1, '#0d1018'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,209,102,${(.15 + .15 * hash(i)) * SA})`; ctx.fillRect(x + w * hash(i * 3), y + h * (.45 + hash(i * 5) * .2), 18, 26); }
  rainLines(t, .6, x, y, w, h, 60, 7);
  const cxp = x + w / 2, cyp = y + h * .56, lw = Math.min(w * .4, h * .9), lh = lw * .62;
  ctx.strokeStyle = '#e9eefc'; ctx.lineWidth = Math.max(6, lw * .045); ctx.shadowColor = C.blue; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.roundRect(cxp - lw * 1.08, cyp - lh / 2, lw, lh, lh * .4); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(cxp + lw * .08, cyp - lh / 2, lw, lh, lh * .4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cxp - lw * .08, cyp - lh * .2); ctx.quadraticCurveTo(cxp, cyp - lh * .38, cxp + lw * .08, cyp - lh * .2); ctx.stroke();
  ctx.shadowBlur = 0;
  // HUD card spanning both lenses
  const hp = clamp(pop(t, 21.9, .45));
  if (hp > 0) {
    alpha(hp); const f = fitWrap(T.hud, lw * 1.8, P ? 46 : 44, 1), hw = Math.min(lw * 2, f.s * 0.62 * T.hud.length + 80), hh = f.s * 1.9;
    ctx.font = font(f.s); const tw = ctx.measureText(T.hud).width + 70;
    ctx.shadowColor = C.blue; ctx.shadowBlur = 24; rr(cxp - tw / 2, cyp - hh / 2, tw, hh, hh / 2, 'rgba(12,34,52,.96)', C.blue, 3); ctx.shadowBlur = 0;
    text(T.hud, cxp, cyp, f.s, '#fff', { glow: C.blue, blur: 12 }); alpha(1);
  }
}
scene(18, 25.05, C.blue, (t) => {
  const pan = P ? [[60, 270, W - 120, 300], [60, 592, W - 120, 300], [60, 914, W - 120, 320]]
    : [[64, 126, 580, 800], [670, 126, 580, 800], [1276, 126, 580, 800]];
  panelFrame(t, 18.3, ...pan[0], T.stage, (x, y, w, h) => stagePanel(t, x, y, w, h, T.stageLT));
  panelFrame(t, 20.3, ...pan[1], T.class, (x, y, w, h) => classPanel(t, x, y, w, h));
  panelFrame(t, 21.3, ...pan[2], T.glasses, (x, y, w, h) => glassesPanel(t, x, y, w, h));
  header(t, 18, C.blue, T.lineC, T.tagC);
});

/* ---------- 25–32: D Auto-Edit ---------- */
const DCH = [C.pink, C.green, C.gold, '#8b93a7'];
const TL = Array.from({ length: 16 }, (_, i) => ({ k: [0, 1, 3, 2, 0, 3, 1, 0, 2, 3, 0, 1, 3, 2, 0, 3][i], x: .02 + i * .06 + hash(i * 3) * .015, w: .04 + hash(i * 7) * .02, tr: [0, 1, 3, 2, 0, 3, 1, 0, 2, 3, 0, 1, 3, 2, 0, 3][i] }));
function clip(t, x, y, w, h, hero) {
  rr(x, y, w, h, 18, '#1b2030', 'rgba(255,255,255,.5)', 3);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#2a2140'); g.addColorStop(1, '#141826'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const s = w / 300; ctx.fillStyle = '#3b4360'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .92, 120 * s, 100 * s, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(x + w / 2, y + h * .92 - 160 * s, 58 * s, 0, 6.283); ctx.fill();
  if (hero) {
    const words = T.clipWords, n = words.filter((_, i) => t >= 29.4 + i * .38).length;
    const shown = words.slice(0, n).join(' ');
    if (n) { const f = fitWrap(words.join(' '), w - 30, w * .11, 2); block(shown, x + w / 2, y + h * .62, w - 30, f.s, 2, '#fff', { glow: 'rgba(0,0,0,.9)', blur: 6 }); }
    const kt = 29.4 + (words.length - 1) * .38, kp = clamp(pop(t, kt, .4));
    if (kp > 0) {
      ctx.save(); ctx.translate(x + w / 2, y + h * .3); ctx.rotate(-.08); ctx.scale(kp, kp);
      const f = fitWrap(T.card, w * .8, w * .17, 1); ctx.font = font(f.s); const tw = ctx.measureText(T.card).width + 40;
      rr(-tw / 2, -f.s * .9, tw, f.s * 1.8, 18, '#0b0c10', C.pink, 4);
      text(T.card, 0, 0, f.s, '#fff', { glow: C.pink, blur: 14 }); emoji('🤯', tw / 2 - 6, -f.s * .9, f.s * .9);
      ctx.restore();
    }
  }
  ctx.restore();
}
scene(25, 32.05, C.pink, (t) => {
  const win = P ? [60, 270, W - 120, 520] : [64, 126, 1130, 800];
  const [wx, wy, ww, wh] = win, wp = clamp(pop(t, 25.1, .45));
  alpha(wp);
  rr(wx, wy, ww, wh, 22, '#151821', 'rgba(255,255,255,.16)', 3);
  ctx.fillStyle = '#1e2230'; ctx.beginPath(); ctx.roundRect(wx, wy, ww, 56, [22, 22, 0, 0]); ctx.fill();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(wx + 34 + i * 30, wy + 28, 9, 0, 6.283); ctx.fill(); });
  text('LiveFX Studio', wx + ww / 2, wy + 29, 26, C.mute, { w: 600 });
  // preview / drop zone
  const pvx = wx + 24, pvy = wy + 76, pvw = ww - 48, pvh = wh * (P ? .48 : .55);
  ctx.setLineDash([14, 10]); rr(pvx, pvy, pvw, pvh, 16, 'rgba(255,45,117,.05)', rgba(C.pink, .6), 3); ctx.setLineDash([]);
  const dropped = t > 25.9;
  if (!dropped) text('⬇ ' + T.drop, pvx + pvw / 2, pvy + pvh * .78, P ? 30 : 32, C.mute, { w: 500 });
  // file flies in
  const fp = ease(prog(t, 25.3, 25.9)), fs = P ? 34 : 36;
  if (t > 25.3) {
    const fx = pvx + pvw / 2, fy = lerp(wy - 260, pvy + pvh * .42, fp), sc = dropped ? lerp(1, .82, prog(t, 25.9, 26.1)) : 1;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(sc, sc); ctx.rotate((1 - fp) * -.25);
    ctx.font = font(fs, 600); const tw = ctx.measureText(T.file).width + fs * 3.2;
    rr(-tw / 2, -fs * 1.2, tw, fs * 2.4, 16, '#232838', C.pink, 3);
    emoji('🎞️', -tw / 2 + fs * 1.2, 0, fs * 1.3); text(T.file, -tw / 2 + fs * 2.3, 0, fs, '#fff', { align: 'left', w: 600 });
    ctx.restore();
  }
  // listening + progress
  if (t > 26.0) {
    const lp = prog(t, 26.0, 27.3), sy = pvy + pvh * .82;
    const msg = lp < 1 ? T.listen : T.done;
    text(msg, pvx + pvw / 2, sy, P ? 30 : 32, lp < 1 ? C.ink : C.green, { w: 600 });
    rr(pvx + pvw * .15, sy + 30, pvw * .7, 10, 5, 'rgba(255,255,255,.1)'); rr(pvx + pvw * .15, sy + 30, pvw * .7 * lp, 10, 5, C.pink);
  }
  // timeline with 4 tracks filling with chips
  const tlx = wx + 24, tly = pvy + pvh + 20, tlw = ww - 48, tlh = wh - (tly - wy) - (P ? 20 : 110);
  rr(tlx, tly, tlw, tlh, 12, '#0e1017');
  const trh = tlh / 4;
  for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(tlx, tly + k * trh + 2, tlw, trh - 4); }
  TL.forEach((c, i) => {
    const cp = clamp(pop(t, 26.5 + i * .11, .3)); if (cp <= 0) return;
    rr(tlx + c.x * tlw, tly + c.tr * trh + trh * (.5 - .32 * cp), c.w * tlw, trh * .64 * cp, 6, DCH[c.k]);
  });
  const ph = prog(t, 26.5, 28.4); ctx.fillStyle = '#fff'; ctx.fillRect(tlx + ph * tlw, tly - 6, 3, tlh + 12);
  // legend chips (in 16:9 under the timeline, in 9:16 inside the preview corner)
  const ls = P ? 24 : 26; let lx = P ? wx : tlx; const ly = P ? wy + wh + 34 : tly + tlh + 34;
  T.dchips.forEach((s, i) => { alpha(wp * prog(t, 26.5 + i * .25, 26.8 + i * .25)); lx += pill(s, lx, ly, ls, DCH[i], { fill: rgba(DCH[i], .15) }) + 10; });
  alpha(wp);
  // export button
  const eb = P ? [wx + ww - 24, ly + (P ? 0 : 0)] : [wx + ww - 24, tly + tlh + 34];
  if (!P) { const click = t > 28.3 && t < 28.6; pill(T.export, eb[0], eb[1], 26, C.pink, { anchor: 'r', fill: click ? C.pink : rgba(C.pink, .2), ink: click ? '#fff' : C.pink, glowBox: t > 28.3 }); }
  else if (t > 27.6) { alpha(wp * prog(t, 27.6, 27.9)); const click = t > 28.3 && t < 28.6; pill(T.export, pvx + pvw - 14, pvy + 14 + 24, 24, C.pink, { anchor: 'r', fill: click ? C.pink : 'rgba(15,17,21,.9)', ink: click ? '#fff' : C.pink, glowBox: t > 28.3 }); }
  alpha(1);
  // three 9:16 clips jump out
  const slots = P ? [[120, 880, 214, 360], [433, 862, 214, 380], [746, 880, 214, 360]] : [[1236, 210, 180, 320], [1436, 160, 220, 400], [1676, 210, 180, 320]];
  slots.forEach((s, i) => {
    const t0 = 28.5 + i * .15, cp = easeBack(prog(t, t0, t0 + .5)); if (cp <= 0) return;
    const sx = lerp(tlx + tlw * (.2 + i * .3), s[0], cp), sy = lerp(tly, s[1], cp);
    let sw = s[2] * lerp(.3, 1, cp), sh = s[3] * lerp(.3, 1, cp);
    const hero = i === 1, hs = hero ? 1 + .12 * ease(prog(t, 29.1, 29.5)) : 1;
    alpha(clamp(cp)); ctx.save(); ctx.translate(sx + sw / 2, sy + sh / 2); ctx.scale(hs, hs); ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
    if (hero) { ctx.shadowColor = C.pink; ctx.shadowBlur = 40; }
    clip(t, sx, sy, sw, sh, hero); ctx.shadowBlur = 0; ctx.restore();
  });
  alpha(1);
  header(t, 25, C.pink, T.lineD, T.tagD);
});

/* ---------- 32–35: CTA ---------- */
scene(32, 35.01, C.pink, (t) => {
  const rcx = W / 2, rcy = P ? 300 : 250, R = P ? 170 : 150, ts = P ? 100 : 92;
  const tiles = [[C.green, '🎬'], [C.gold, '🍎'], [C.blue, '🥽'], [C.pink, '✂️']];
  const corners = [[-200, -200], [W + 200, -200], [-200, H + 200], [W + 200, H + 200]];
  const rot = t * .5;
  // mic in center
  const mp = clamp(pop(t, 32.1, .5));
  alpha(mp); ctx.shadowColor = C.pink; ctx.shadowBlur = 60; ctx.fillStyle = C.pink; ctx.beginPath(); ctx.arc(rcx, rcy, R * .5 * mp, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
  emoji('🎙️', rcx, rcy + 4, R * .55 * mp);
  ctx.strokeStyle = rgba(C.pink, .35 * SA); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rcx, rcy, R, 0, 6.283); ctx.stroke();
  tiles.forEach(([c, e], i) => {
    const fp = ease(prog(t, 32.0 + i * .08, 32.75 + i * .08)), a = rot + i * Math.PI / 2 - Math.PI / 4;
    const x = lerp(corners[i][0], rcx + Math.cos(a) * R, fp), y = lerp(corners[i][1], rcy + Math.sin(a) * R, fp);
    alpha(1); ctx.save(); ctx.translate(x, y); ctx.rotate((1 - fp) * 2);
    ctx.shadowColor = c; ctx.shadowBlur = 30; rr(-ts / 2, -ts / 2, ts, ts, ts * .26, rgba(c, .9)); ctx.shadowBlur = 0;
    emoji(e, 0, 2, ts * .55); ctx.restore();
  });
  const lp = clamp(pop(t, 32.6, .5)), ly = P ? 580 : 520, lsz = P ? 150 : 130;
  // confetti only above the logo, so it never runs over claim/partner text
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, ly - lsz * .6); ctx.clip();
  confetti(t, 32.7, 2.0, rcx, rcy, 70, 1.4, 41, P ? 1 : .8); ctx.restore(); alpha(1);
  alpha(lp); ctx.save(); ctx.translate(W / 2, ly); ctx.scale(lerp(.6, 1, lp), lerp(.6, 1, lp));
  ctx.font = font(lsz); const lw1 = ctx.measureText('Live').width, lw2 = ctx.measureText('FX').width;
  text('Live', -(lw1 + lw2) / 2, 0, lsz, '#fff', { align: 'left' }); text('FX', -(lw1 + lw2) / 2 + lw1, 0, lsz, C.pink, { align: 'left', glow: C.pink, blur: 20 });
  ctx.restore();
  alpha(prog(t, 32.9, 33.25));
  const cb = block(T.claim, W / 2, ly + (P ? 100 : 85) + (1 - easeOut(prog(t, 32.9, 33.4))) * 30, W - (P ? 140 : 300), P ? 84 : 76, 2, '#fff', { glow: C.pink, blur: 22 });
  alpha(prog(t, 33.35, 33.65)); const y3 = block(T.run, W / 2, cb + (P ? 30 : 18), W - 160, P ? 40 : 36, 1, C.mute, { w: 500 });
  alpha(prog(t, 33.6, 33.9)); const y4 = block(T.pilot, W / 2, y3 + (P ? 30 : 16), W - 160, P ? 40 : 36, 1, C.gold, { w: 600 });
  alpha(prog(t, 33.75, 34.05)); const y5 = block(T.pilot2, W / 2, y4 + 4, W - 160, P ? 54 : 50, 1, '#fff', { w: 700 });
  alpha(clamp(pop(t, 33.95, .4))); pill(T.web, W / 2, y5 + (P ? 60 : 50), P ? 38 : 34, C.gold, { anchor: 'c' });
  window.CTA_BOTTOM = y5 + (P ? 60 + 38 * .95 : 50 + 34 * .95); // pill bottom; must stay <= SAFE in 9:16
  alpha(1);
});

/* ---------------- master render ---------------- */
function render(t) {
  t = clamp(t, 0, DUR);
  const cur = SCENES.find((s) => t >= s.a && t < s.b) || SCENES[SCENES.length - 1];
  background(t, cur.col);
  SCENES.forEach((s) => {
    if (t < s.a - .01 || t >= s.b) return;
    SA = Math.min(1, prog(t, s.a, s.a + .25), 1 - prog(t, s.b - .25, s.b));
    if (s.a === 0) SA = 1;
    ctx.save(); alpha(1); s.draw(t); ctx.restore();
  });
  SA = 1; ctx.globalAlpha = 1;
  // final fade
  const f = prog(t, 34.6, 35);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
  if (Q.has('safe')) { ctx.strokeStyle = 'rgba(255,0,0,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, SAFE); ctx.lineTo(W, SAFE); ctx.stroke(); }
}
window.render = render; window.DUR = DUR; window.RATIO = RATIO; window.LANG = LANG;
const SAMPLE = 'ÄÖÜäöüß çğıİöşüÇĞŞ €·„“”…–';
window.READY = Promise.all([
  document.fonts.load(`700 40px Lexend`, SAMPLE), document.fonts.load(`600 40px Lexend`, SAMPLE), document.fonts.load(`500 40px Lexend`, SAMPLE),
  document.fonts.load(`40px "Noto Color Emoji"`, '🍎🐉'),
]).then(() => document.fonts.ready).then(() => { FW.clear(); render(0); });

if (!Q.has('capture')) {
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.transform = `scale(${s})`; cv.style.marginLeft = ((innerWidth - W * s) / 2) + 'px'; };
  addEventListener('resize', fit); fit();
  window.READY.then(() => {
    const t0 = performance.now(), off = Number(Q.get('t') || 0);
    const loop = () => { render(((performance.now() - t0) / 1000 + off) % DUR); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
