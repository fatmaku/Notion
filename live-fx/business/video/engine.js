/* LiveFX trailer engine – deterministic: render(t) draws the exact frame for time t (seconds).
   ?ratio=9x16 (default, 1080×1920) | 16x9 (1920×1080). ?capture disables the live loop.
   Everything (DOM text, canvas particles) is a pure function of t, so Playwright can step frames. */
'use strict';
const Q = new URLSearchParams(location.search);
const RATIO = Q.get('ratio') === '16x9' ? '16x9' : '9x16';
const P = RATIO === '9x16';
const W = P ? 1080 : 1920, H = P ? 1920 : 1080;
const DUR = 50;
/* ?lang=de (default) | tr | en – every on-screen text lives in STR; de reproduces the original trailer frame for frame. */
const LANG = ['tr', 'en'].includes(Q.get('lang')) ? Q.get('lang') : 'de';
if (LANG !== 'de') document.documentElement.lang = LANG;

const STR = {
  de: {
    hookA: 'Live-Untertitel?', hookB: 'Wir machen', hookC: 'LIVE-MEMES.', hookD: '',
    s1Label: 'Du sagst es – es passiert.',
    s1: [
      { lang: 'Deutsch', text: [{ t: 'das ist ' }, { t: 'krass', kw: 1 }, { t: ' …' }], em: '🤯', tt: 'KRASS!', snd: '🔊 Airhorn' },
      { lang: 'Türkçe', text: [{ t: 'yok artık', kw: 1 }, { t: '!' }], em: '😱', tt: 'YOK ARTIK!', snd: '🔊 Vine-Boom' },
      { lang: 'English', text: [{ t: "let's go", kw: 1 }], em: '🚀', tt: "LET'S GO", snd: '🔊 Whoosh' },
    ],
    s1Big: "LET'S GO!",
    s2Title: '3 Sprachen.<br><span class="green">Automatisch.</span>',
    s2Count: '<b>0</b> Memes im Paket',
    s2Ex: ['„krass!“ · „oh nein“ · „bruh“', '„yok artık!“ · „ohaa“ · „helal olsun“', '„no way!“ · „let’s go“ · „lol“'],
    s2Sub: 'Die Sprache wird beim Reden erkannt – kein Umschalten.',
    s2Gif: '🔎 GIF-Suche: Tenor · Giphy', s2Own: '⬆️ Eigene Memes &amp; Sounds',
    s3Label: '📖 Story-Modus: Vorlesen wird zur Szene',
    s3Amb1: '🌧️ Atmo: Regen', s3Amb2: '🦗 Atmo: Grillen · Nachtwind',
    s3Cap: 'Echte Szene aus dem LiveFX-Overlay',
    s3: [
      { lang: 'Deutsch', text: [{ t: 'Es ' }, { t: 'regnete', kw: 1 }, { t: ' in der ' }, { t: 'Nacht', kw: 1 }, { t: '…' }], st: 'Es regnete<br>in der Nacht…' },
      { lang: 'Türkçe', text: [{ t: 'bir varmış bir yokmuş', kw: 1 }, { t: '…' }], st: 'Bir varmış,<br>bir yokmuş…' },
    ],
    s4Label: 'Zuschauer machen mit.',
    s4Tiers: [['1 Gift', '🙂 Sticker'], ['10 Gifts', '😱 Emoji-Regen'], ['100 Gifts', '🏰 Vollbild-Szene']],
    s4Sub: 'Chat-Befehle (Twitch · YouTube) &amp; Geschenke-Stufen (TikTok via Webhook)',
    s5Title: 'Überall, wo du <span class="pink">live</span> gehst.',
    s5Cap0: 'Control Panel – spricht, hört zu, zeigt', s5CapA: 'Control Panel – hört zu, erkennt, zeigt', s5CapB: 'Overlay in OBS – Browser-Quelle, sofort live',
    s5Feats: ['📱 Handy als Fernbedienung', '🎨 4 Looks (Neon, Pastell, Minimal …)', '✈️ Läuft komplett offline', '🔊 Sounds ohne Lizenz-Risiko'],
    s6Tag: 'Deine Stimme<br>wird zum Effekt.',
    s6Pilot: 'Pilot-Partner gesucht:',
    s6Foot: 'Open Source · OBS-ready · Deutsch / Türkçe / English',
    sz: {},
  },
  tr: {
    hookA: 'Canlı altyazı mı?', hookB: 'Biz', hookC: 'CANLI MEME', hookD: 'yapıyoruz.',
    s1Label: 'Sen söylersin – olur.',
    s1: [
      { lang: 'Türkçe', text: [{ t: 'bu çok fena … ' }, { t: 'efsane', kw: 1 }, { t: '!' }], em: '🏆', tt: 'EFSANE!', snd: '🔊 Airhorn' },
      { lang: 'Türkçe', text: [{ t: 'yok artık', kw: 1 }, { t: '!' }], em: '😱', tt: 'YOK ARTIK!', snd: '🔊 Vine-Boom' },
      { lang: 'Türkçe', text: [{ t: 'hadi bakalım', kw: 1 }, { t: '!' }], em: '🚀', tt: 'HADİ BAKALIM', snd: '🔊 Whoosh' },
    ],
    s1Big: 'HADİ BAKALIM!',
    s2Title: '3 dil.<br><span class="green">Otomatik.</span>',
    s2Count: 'Pakette <b>0</b> meme',
    s2Ex: ['“krass!” · “oh nein” · “bruh”', '“yok artık!” · “ohaa” · “efsane”', '“no way!” · “let’s go” · “lol”'],
    s2Sub: 'Dil, sen konuşurken kendiliğinden tanınır.',
    s2Gif: '🔎 GIF arama: Tenor · Giphy', s2Own: '⬆️ Kendi meme ve seslerin',
    s3Label: '📖 Hikâye modu: Okudukların sahneye dönüşür',
    s3Amb1: '🌧️ Ortam sesi: Yağmur', s3Amb2: '🦗 Ortam sesi: Cırcır böceği · Gece rüzgârı',
    s3Cap: 'LiveFX katmanından gerçek bir sahne',
    s3: [
      { lang: 'Türkçe', text: [{ t: 'Gece', kw: 1 }, { t: ' ' }, { t: 'yağmur yağıyordu', kw: 1 }, { t: '…' }], st: 'Gece yağmur<br>yağıyordu…' },
      { lang: 'Türkçe', text: [{ t: 'bir varmış bir yokmuş', kw: 1 }, { t: '…' }], st: 'Bir varmış,<br>bir yokmuş…' },
    ],
    s4Label: 'İzleyiciler de oyunda.',
    s4Tiers: [['1 hediye', '🙂 Çıkartma'], ['10 hediye', '😱 Emoji yağmuru'], ['100 hediye', '🏰 Tam ekran sahne']],
    s4Sub: 'Sohbet komutları (Twitch · YouTube) ve hediye seviyeleri (TikTok, webhook ile)',
    s5Title: '<span class="pink">Canlı</span> yayın nerede, LiveFX orada.',
    s5Cap0: 'Kontrol paneli – dinler, tanır, gösterir', s5CapA: 'Kontrol paneli – dinler, tanır, gösterir', s5CapB: 'OBS’te katman – tarayıcı kaynağı, anında yayında',
    s5Feats: ['📱 Telefonun uzaktan kumanda olur', '🎨 4 tema (Neon, Pastel, Minimal …)', '✈️ Tamamen çevrimdışı çalışır', '🔊 Lisans derdi olmayan sesler'],
    s6Tag: 'Sesin<br>efekte dönüşür.',
    s6Pilot: 'Pilot ortaklar arıyoruz:',
    s6Foot: 'Açık kaynak · OBS’e hazır · Deutsch / Türkçe / English',
    sz: { hookC: [128, 190], s1Big: [118, 150], s3Label: 34, s3Amb: 30, s4Tier: 32, s4TierMin: 160, s2Ex: 34 },
  },
  en: {
    hookA: 'Live captions?', hookB: 'We do', hookC: 'LIVE MEMES.', hookD: '',
    s1Label: 'You say it – it happens.',
    s1: [
      { lang: 'English', text: [{ t: "that's insane … " }, { t: 'wild', kw: 1 }, { t: '!' }], em: '🤯', tt: 'WILD!', snd: '🔊 Airhorn' },
      { lang: 'English', text: [{ t: 'oh my god', kw: 1 }, { t: '!' }], em: '😱', tt: 'OMG', snd: '🔊 Scratch' },
      { lang: 'English', text: [{ t: "let's go", kw: 1 }, { t: '!' }], em: '🚀', tt: "LET'S GO", snd: '🔊 Whoosh' },
    ],
    s1Big: "LET'S GO!",
    s2Title: '3 languages.<br><span class="green">Automatic.</span>',
    s2Count: '<b>0</b> memes in the pack',
    s2Ex: ['“krass!” · “oh nein” · “bruh”', '“yok artık!” · “ohaa” · “efsane”', '“no way!” · “let’s go” · “lol”'],
    s2Sub: 'The language is detected while you talk – no switching.',
    s2Gif: '🔎 GIF search: Tenor · Giphy', s2Own: '⬆️ Your own memes &amp; sounds',
    s3Label: '📖 Story mode: reading aloud becomes a scene',
    s3Amb1: '🌧️ Ambience: rain', s3Amb2: '🦗 Ambience: crickets · night wind',
    s3Cap: 'Real scene from the LiveFX overlay',
    s3: [
      { lang: 'English', text: [{ t: 'It was ' }, { t: 'raining', kw: 1 }, { t: ' at ' }, { t: 'night', kw: 1 }, { t: '…' }], st: 'It was raining<br>at night…' },
      { lang: 'English', text: [{ t: 'once upon a time', kw: 1 }, { t: '…' }], st: 'Once upon<br>a time…' },
    ],
    s4Label: 'Viewers join in.',
    s4Tiers: [['1 gift', '🙂 Sticker'], ['10 gifts', '😱 Emoji rain'], ['100 gifts', '🏰 Full-screen scene']],
    s4Sub: 'Chat commands (Twitch · YouTube) &amp; gift tiers (TikTok via webhook)',
    s5Title: 'Wherever you go <span class="pink">live</span>.',
    s5Cap0: 'Control panel – listens, recognises, shows', s5CapA: 'Control panel – listens, recognises, shows', s5CapB: 'Overlay in OBS – browser source, live instantly',
    s5Feats: ['📱 Your phone as a remote', '🎨 4 looks (Neon, Pastel, Minimal …)', '✈️ Runs fully offline', '🔊 Sounds with no licensing risk'],
    s6Tag: 'Your voice<br>becomes the effect.',
    s6Pilot: 'Looking for pilot partners:',
    s6Foot: 'Open source · OBS-ready · Deutsch / Türkçe / English',
    sz: { s3Label: 36, s2Ex: 34, s4Tier: 34, s4TierMin: 150 },
  },
};
const T = STR[LANG];
/* Overlay screenshots: assets/<name>.<lang>.jpg where a localized shot exists (shot from the real overlay in that
   language), otherwise the German original. The control panel has no localized UI yet, so panel.jpg stays German. */
const LOC_ASSETS = { tr: ['overlay-story', 'overlay-card'], en: ['overlay-story', 'overlay-card'] };
const asset = (name) => 'assets/' + name + ((LOC_ASSETS[LANG] || []).includes(name) ? '.' + LANG : '') + '.jpg';
const img = (name, attrs = '') => '<img src="' + asset(name) + '" data-fallback="assets/' + name + '.jpg"' + (attrs ? ' ' + attrs : '') + '>';
/* per-language size override: sz(key, default9x16, default16x9) – arrays in T.sz are [9x16, 16x9] */
const sz = (k, dp, dl = dp) => { const v = T.sz[k]; return v == null ? (P ? dp : dl) : Array.isArray(v) ? v[P ? 0 : 1] : v; };

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeBack = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const win = (t, a, b, f = .35) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));
const pop = (t, a, d = .5) => easeBack(prog(t, a, a + d));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const stage = document.getElementById('stage');
stage.style.width = W + 'px'; stage.style.height = H + 'px';
const scenesEl = document.getElementById('scenes');
const glow = document.getElementById('glow');
const black = document.getElementById('black');
const cv = document.getElementById('fx'); cv.width = W; cv.height = H;
const cx = cv.getContext('2d');
const EMOJI_FONT = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';

const SCENES = [];
function scene(a, b, build) {
  const el = document.createElement('div'); el.className = 'scene'; scenesEl.appendChild(el);
  const s = { a, b, el, update: build(el) || (() => {}) };
  SCENES.push(s); return s;
}
function el(parent, cls, html, style) {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html || '';
  if (style) Object.assign(d.style, style); parent.appendChild(d); return d;
}
const show = (e, on) => { e.style.display = on ? '' : 'none'; return on; };

/* ---------- shared transcript bar ---------- */
function mkBar(parent, top) {
  const bar = el(parent, 'bar', `<div class="mic">🎙️</div><div class="tx"></div><div class="lang"></div>`, { top: top + 'px' });
  const tx = bar.querySelector('.tx'), lang = bar.querySelector('.lang');
  return {
    el: bar,
    /* phrase: [{t:'text', kw:bool}], typed from ta at cps chars/s; lang badge appears once typing is done */
    type(t, phrase, ta, langName, cps = 16) {
      const total = phrase.reduce((n, s) => n + s.t.length, 0);
      const n = Math.min(total, Math.floor(Math.max(0, t - ta) * cps));
      let left = n, html = '';
      for (const s of phrase) { if (left <= 0) break; const part = s.t.slice(0, left); left -= part.length; html += s.kw ? `<span class="kw">${esc(part)}</span>` : esc(part); }
      const done = n >= total;
      tx.innerHTML = html + (done ? '' : '<span class="caret"></span>');
      tx.querySelector('.caret') && (tx.querySelector('.caret').style.opacity = Math.floor(t * 3) % 2 ? 0 : 1);
      lang.textContent = langName; lang.style.opacity = done ? pop(t, ta + total / cps, .4) : 0;
      lang.style.transform = `scale(${done ? pop(t, ta + total / cps, .4) : .5})`;
      const pulse = done ? 0 : .5 + .5 * Math.sin(t * 9);
      bar.querySelector('.mic').style.boxShadow = `0 0 0 ${pulse * 18}px rgba(255,45,117,${.5 - pulse * .4})`;
      return done;
    },
  };
}

/* ---------- canvas particle helpers (all analytic in t) ---------- */
const CONF = ['#ff2d75', '#2dffb5', '#ffd166', '#5ad1ff', '#ffffff', '#c084fc'];
function confetti(t, t0, dur, x0, y0, n = 160, spread = 1, seed = 0) {
  const dt = t - t0; if (dt < 0 || dt > dur) return;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + seed), h2 = hash(i * 3 + seed + 1), h3 = hash(i * 7 + seed + 2), h4 = hash(i * 11 + seed + 3);
    const ang = -Math.PI / 2 + (h1 - .5) * Math.PI * .9 * spread, sp = 900 + h2 * 1400;
    const x = x0 + Math.cos(ang) * sp * dt * Math.exp(-dt * .9) + Math.sin(dt * 5 + i) * 20;
    const y = y0 + Math.sin(ang) * sp * dt * Math.exp(-dt * .9) + 900 * dt * dt * .5;
    if (y > H + 40) continue;
    const a = 1 - prog(dt, dur * .6, dur);
    cx.save(); cx.translate(x, y); cx.rotate(dt * (4 + h3 * 8) + i); cx.globalAlpha = a;
    cx.fillStyle = CONF[i % CONF.length]; cx.fillRect(-9 - h4 * 8, -5, 18 + h4 * 16, 10); cx.restore();
  }
  cx.globalAlpha = 1;
}
function emojiRain(t, t0, dur, emojis, n = 40, size = 90, yMax = H * .72, seed = 0) {
  const dt = t - t0; if (dt < 0 || dt > dur + 2) return;
  cx.font = `${size}px ${EMOJI_FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const birth = hash(i + seed) * (dur - 1), life = dt - birth; if (life < 0) continue;
    const sp = 500 + hash(i * 5 + seed) * 500, y = -80 + life * sp; if (y > yMax + 60) continue;
    const x = 60 + hash(i * 9 + seed) * (W - 120) + Math.sin(life * 3 + i) * 30;
    const a = clamp(life * 4) * (1 - prog(y, yMax - 120, yMax + 60));
    cx.save(); cx.translate(x, y); cx.rotate(Math.sin(life * 2.5 + i) * .35); cx.globalAlpha = a;
    cx.fillText(emojis[i % emojis.length], 0, 0); cx.restore();
  }
  cx.globalAlpha = 1;
}
function sparks(t, x, y, r, n = 50, color = '255,45,117', amt = 1, seed = 0) {
  if (amt <= 0) return;
  cx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ph = hash(i + seed) * 6.28, rr = r * (.6 + hash(i * 3 + seed) * .8) + Math.sin(t * 1.5 + ph) * r * .15;
    const an = ph + t * (.2 + hash(i * 7 + seed) * .4);
    const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * .55;
    const a = amt * (.2 + .8 * Math.pow(Math.sin(t * 2.3 + ph * 3) * .5 + .5, 3));
    const sz = 3 + hash(i * 11 + seed) * 6;
    const g = cx.createRadialGradient(px, py, 0, px, py, sz * 3); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(px, py, sz * 3, 0, 6.283); cx.fill();
  }
  cx.globalCompositeOperation = 'source-over';
}
function rain(t, amt, n = 220) {
  if (amt <= 0) return;
  cx.strokeStyle = `rgba(190,220,255,${.55 * amt})`; cx.lineWidth = 3; cx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 1400 + hash(i) * 900, len = 40 + hash(i * 3) * 60;
    const y = ((hash(i * 7) * H + t * sp) % (H + 200)) - 100, x = hash(i * 11) * W - (t * 120) % 40 + i % 3;
    cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - 6, y + len); cx.stroke();
  }
  // splashes
  cx.font = `34px ${EMOJI_FONT}`; cx.textAlign = 'center';
  for (let i = 0; i < 14; i++) {
    const ph = hash(i * 13) * 2, life = (t + ph) % .9;
    cx.globalAlpha = amt * (1 - life / .9) * .8;
    cx.fillText('💧', 80 + hash(i * 17) * (W - 160), H * (P ? .6 : .55) + hash(i * 19) * 60 - life * 90);
  }
  cx.globalAlpha = 1;
}
function stars(t, amt, n = 160) {
  if (amt <= 0) return;
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3) * W, y = hash(i * 5) * H * .75, tw = .35 + .65 * Math.pow(Math.sin(t * 1.4 + hash(i) * 6.28) * .5 + .5, 2);
    cx.fillStyle = `rgba(255,255,255,${amt * tw})`; cx.beginPath(); cx.arc(x, y, 1.5 + hash(i * 7) * 2.2, 0, 6.283); cx.fill();
  }
}

/* ======================= SCENE 0 (0–4): hook ======================= */
const topY = P ? H * .085 : H * .09, barY = P ? H * .78 : H * .80, midY = P ? H * .46 : H * .47;
scene(0, 4.2, (s) => {
  const a = el(s, 'abs c big', T.hookA + ' <span style="font-family:' + EMOJI_FONT + '">🙄</span>', { top: (H * .42) + 'px', fontSize: (P ? 88 : 96) + 'px', color: '#9aa3b8' });
  const b = el(s, 'abs c big', T.hookB, { top: (P ? H * .36 : H * .33) + 'px', fontSize: (P ? 86 : 92) + 'px' });
  const c = el(s, 'abs c big neon', T.hookC, { top: (P ? H * .43 : H * .44) + 'px', fontSize: sz('hookC', 150, 200) + 'px', letterSpacing: '.02em' });
  const d = T.hookD ? el(s, 'abs c big', T.hookD, { top: (P ? H * .53 : H * .62) + 'px', fontSize: (P ? 86 : 92) + 'px' }) : null;
  return (t) => {
    const ap = pop(t, .4, .6), aOut = prog(t, 1.5, 1.9);
    show(a, t >= .35 && t < 1.95);
    a.style.opacity = clamp(prog(t, .4, .7)) * (1 - aOut);
    a.style.transform = `scale(${lerp(.8, 1, ap) * (1 - aOut * .15)}) translateY(${-aOut * 60}px)`;
    a.style.textDecoration = t > 1.2 ? 'line-through' : 'none';
    show(b, t >= 1.9); show(c, t >= 2.1);
    b.style.opacity = prog(t, 1.9, 2.2); b.style.transform = `translateY(${(1 - easeOut(prog(t, 1.9, 2.4))) * 40}px)`;
    const flick = t < 2.9 ? (hash(Math.floor(t * 40)) > .3 ? 1 : .25) : 1;
    c.style.opacity = prog(t, 2.1, 2.3) * flick;
    c.style.transform = `scale(${lerp(.7, 1, pop(t, 2.1, .55))})`;
    if (d) { show(d, t >= 2.4); d.style.opacity = prog(t, 2.4, 2.7); d.style.transform = `translateY(${(1 - easeOut(prog(t, 2.4, 2.9))) * 40}px)`; }
  };
});

/* ================= SCENE 1 (4–14): Du sagst es – es passiert ================= */
const S1 = { card: null };
scene(4, 14.2, (s) => {
  const lab = el(s, 'abs c', '<span class="label">' + T.s1Label + '</span>', { top: topY + 'px' });
  const bar = mkBar(s, barY);
  const card = el(s, 'card', '<div class="em"></div><div class="tt"></div>');
  const em = card.querySelector('.em'), tt = card.querySelector('.tt');
  const snd = el(s, 'snd', '🔊 Airhorn', { left: '50%', top: (midY + 300) + 'px' });
  const rocket = el(s, 'rocket', '🚀');
  const lg = el(s, 'abs c big neon-y', T.s1Big, { top: (P ? H * .30 : H * .28) + 'px', fontSize: sz('s1Big', 150, 170) + 'px' });
  const PH = [
    { ta: 4.6, fire: 6.0, end: 7.7 },
    { ta: 7.9, fire: 8.9, end: 10.8 },
    { ta: 11.0, fire: 11.8, end: 14.2 },
  ].map((p, i) => Object.assign(p, T.s1[i]));
  return (t) => {
    lab.style.opacity = prog(t, 4.1, 4.5); lab.style.transform = `scale(${lerp(.8, 1, pop(t, 4.1, .5))})`;
    const ph = PH.find((p) => t >= p.ta && t < p.end) || PH[2];
    bar.el.style.opacity = prog(t, 4.3, 4.7); bar.el.style.transform = `translateY(${(1 - easeOut(prog(t, 4.3, 4.8))) * 60}px)`;
    bar.type(t, ph.text, ph.ta, ph.lang);
    const isCard = ph.em !== '🚀';
    const cardOn = isCard && t >= ph.fire && t < ph.end;
    show(card, cardOn); show(snd, cardOn);
    if (cardOn) {
      em.textContent = ph.em; tt.textContent = ph.tt; snd.textContent = ph.snd;
      const p = pop(t, ph.fire, .45), out = 1 - prog(t, ph.end - .25, ph.end);
      card.style.transform = `translateY(${midY - H / 2}px) scale(${p * out}) rotate(${Math.sin((t - ph.fire) * 6) * 2 * (1 - prog(t, ph.fire, ph.fire + 1))}deg)`;
      card.style.opacity = out;
      const sp = pop(t, ph.fire + .3, .4), bump = 1 + .08 * Math.max(0, Math.sin((t - ph.fire) * 14)) * (1 - prog(t, ph.fire, ph.fire + 1.2));
      snd.style.transform = `translate(-50%,0) scale(${sp * bump * out})`; snd.style.opacity = out;
    }
    const rk = t >= 11.8 && t < 14.2;
    show(rocket, rk); show(lg, rk);
    if (rk) {
      const p = easeOut(prog(t, 11.8, 13.2));
      rocket.style.top = lerp(H + 100, P ? H * .50 : H * .46, p) + 'px';
      rocket.style.transform = `rotate(${-8 + Math.sin(t * 10) * 4}deg) scale(${1 + .15 * p})`;
      rocket.style.opacity = 1 - prog(t, 13.9, 14.2);
      lg.style.opacity = prog(t, 12.4, 12.7) * (1 - prog(t, 13.9, 14.2)); lg.style.transform = `scale(${lerp(.6, 1, pop(t, 12.4, .5))})`;
    }
    // canvas layers for this scene
    S1.fx = () => {
      confetti(t, 6.0, 2.2, W / 2, midY, 180, 1, 11);
      if (t > 6.0 && t < 7.7) sparks(t, W / 2, midY, 420, 50, '255,45,117', win(t, 6.0, 7.7), 3);
      emojiRain(t, 8.9, 2.0, ['😱', '🔥', '💀', '😂'], 36, 96, P ? H * .72 : H * .74, 21);
      if (t >= 11.8 && t < 14.2) {
        const p = easeOut(prog(t, 11.8, 13.2)), ry = lerp(H + 100, P ? H * .50 : H * .46, p) + 300;
        cx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          const dy = i * 28 + (t * 900) % 28, y = ry + dy, a = (1 - i / 40) * .9 * (1 - prog(t, 13.9, 14.2));
          const x = W / 2 + Math.sin(t * 20 + i) * (6 + i * 1.2), r = 14 + i * 1.5;
          const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,230,140,${a})`); g.addColorStop(.5, `rgba(255,120,60,${a * .6})`); g.addColorStop(1, 'rgba(255,45,117,0)');
          cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
        }
        cx.globalCompositeOperation = 'source-over';
        sparks(t, W / 2, P ? H * .36 : H * .36, 500, 40, '255,209,102', win(t, 12.4, 14.2), 9);
      }
    };
  };
});

/* ================= SCENE 2 (14–22): 3 Sprachen, automatisch ================= */
scene(14, 22.2, (s) => {
  const title = el(s, 'abs c big', T.s2Title, { top: (P ? H * .09 : H * .07) + 'px', fontSize: (P ? 100 : 104) + 'px' });
  const L = [
    { fl: '🇩🇪', nm: 'Deutsch', ex: T.s2Ex[0], n: 49 },
    { fl: '🇹🇷', nm: 'Türkçe', ex: T.s2Ex[1], n: 85 },
    { fl: '🇬🇧', nm: 'English', ex: T.s2Ex[2], n: 50 },
  ];
  const cardsW = 560, gap = P ? 28 : 60;
  const cards = L.map((l, i) => {
    const left = P ? (W - cardsW) / 2 : (W - 3 * cardsW - 2 * gap) / 2 + i * (cardsW + gap);
    const top = P ? H * .245 + i * (330 + gap) : H * .33;
    const c = el(s, 'flagcard', `<div class="fl" style="font-family:${EMOJI_FONT}">${l.fl}</div><div class="nm">${l.nm}</div><div class="ex">${l.ex}</div><div class="ct">${T.s2Count}</div>`, { left: left + 'px', top: top + 'px' });
    if (T.sz.s2Ex) c.querySelector('.ex').style.fontSize = T.sz.s2Ex + 'px';
    return { el: c, ct: c.querySelector('.ct b'), n: l.n, at: 14.9 + i * .7 };
  });
  const sub = el(s, 'abs c', T.s2Sub, { top: (P ? H * .825 : H * .78) + 'px', fontSize: (P ? 40 : 44) + 'px', color: 'var(--mute)', padding: '0 80px', fontWeight: 500 });
  const gif = el(s, 'abs c', `<span class="pill y">${T.s2Gif}</span> <span class="pill g">${T.s2Own}</span>`, { top: (P ? H * .885 : H * .87) + 'px' });
  return (t) => {
    title.style.opacity = prog(t, 14.1, 14.5); title.style.transform = `translateY(${(1 - easeOut(prog(t, 14.1, 14.7))) * 50}px)`;
    cards.forEach((c) => {
      const p = prog(t, c.at, c.at + .6), q = easeBack(p);
      show(c.el, t >= c.at);
      c.el.style.opacity = clamp(p * 3);
      c.el.style.transform = `perspective(1400px) rotateX(${(1 - q) * -90}deg) scale(${lerp(.9, 1, q)})`;
      c.ct.textContent = Math.round(c.n * easeOut(prog(t, c.at + .4, c.at + 1.6)));
    });
    sub.style.opacity = prog(t, 17.6, 18.1);
    gif.style.opacity = prog(t, 19.2, 19.6); gif.style.transform = `scale(${lerp(.8, 1, pop(t, 19.2, .5))})`;
    gif.querySelectorAll('.pill')[1].style.opacity = prog(t, 20.0, 20.4);
  };
});

/* ================= SCENE 3 (22–30): Story-Modus ================= */
scene(22, 30.2, (s) => {
  s.style.background = 'linear-gradient(180deg,#0f1115 0%,#0f1115 100%)';
  const night = el(s, 'abs', '', { inset: 0, background: 'linear-gradient(180deg,#05071a 0%,#0b1340 45%,#1c2c66 100%)', opacity: 0 });
  const moon = el(s, '', '', { position: 'absolute', left: (P ? W * .62 : W * .56) + 'px', top: (P ? H * .13 : H * .10) + 'px' }); moon.id = 'moon';
  const castle = el(s, '', `<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
    <defs><linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101738"/><stop offset="1" stop-color="#05071a"/></linearGradient></defs>
    <path fill="#070a1f" d="M0 420 L0 300 L120 300 L120 260 L150 260 L150 300 L180 300 L180 260 L210 260 L210 300 L240 300 L240 220 L300 220 L300 180 L320 120 L340 180 L340 220 L380 220 L380 170 L410 170 L410 130 L430 80 L450 130 L450 170 L480 170 L480 220 L520 220 L520 170 L550 170 L550 130 L570 80 L590 130 L590 170 L620 170 L620 220 L660 220 L660 180 L680 120 L700 180 L700 220 L760 220 L760 300 L790 300 L790 260 L820 260 L820 300 L850 300 L850 260 L880 260 L880 300 L1000 300 L1000 420 Z"/>
    <path fill="url(#hill)" d="M0 420 L0 350 Q250 300 500 340 Q750 380 1000 330 L1000 420 Z"/>
    <g fill="#ffd166" class="win"><rect x="420" y="150" width="20" height="30" rx="8"/><rect x="560" y="150" width="20" height="30" rx="8"/><rect x="330" y="240" width="18" height="26" rx="7"/><rect x="490" y="250" width="22" height="34" rx="9"/><rect x="650" y="240" width="18" height="26" rx="7"/></g>
    <rect x="432" y="60" width="4" height="30" fill="#ff2d75"/><path d="M436 60 L470 68 L436 78 Z" fill="#ff2d75"/>
    <rect x="572" y="60" width="4" height="30" fill="#2dffb5"/><path d="M576 60 L610 68 L576 78 Z" fill="#2dffb5"/></svg>`, {}); castle.id = 'castle';
  const wins = castle.querySelectorAll('.win rect');
  const lab = el(s, 'abs c', '<span class="label">' + T.s3Label + '</span>', { top: topY + 'px' });
  if (T.sz.s3Label) lab.firstChild.style.fontSize = T.sz.s3Label + 'px';
  const bar = mkBar(s, barY);
  const st = el(s, 'story-text', '');
  const ambPos = P ? { top: (topY + 130) + 'px' } : { top: (topY + 130) + 'px', right: 'auto', left: '60px' };
  const amb1 = el(s, 'amb', T.s3Amb1, ambPos);
  const amb2 = el(s, 'amb', T.s3Amb2, ambPos);
  if (T.sz.s3Amb) amb1.style.fontSize = amb2.style.fontSize = T.sz.s3Amb + 'px';
  const frame = el(s, 'frame', img('overlay-story') + '<div class="cap">' + T.s3Cap + '</div>', P ? { width: '440px', height: '782px', left: (W / 2 - 220) + 'px', top: (H * .22) + 'px' } : { width: '394px', height: '700px', left: (W - 60 - 394) + 'px', top: (H * .16) + 'px' });
  const PH = [
    { ta: 22.5, fire: 24.2, end: 26.4 },
    { ta: 26.4, fire: 27.8, end: 30.2 },
  ].map((p, i) => Object.assign(p, T.s3[i]));
  return (t) => {
    lab.style.opacity = prog(t, 22.1, 22.5) * (1 - prog(t, 28.3, 28.6)); lab.style.transform = `scale(${lerp(.8, 1, pop(t, 22.1, .5))})`;
    const ph = PH.find((p) => t >= p.ta && t < p.end) || PH[1];
    show(bar.el, t < 28.5);
    bar.el.style.opacity = prog(t, 22.3, 22.7) * (1 - prog(t, 28.2, 28.5));
    bar.type(t, ph.text, ph.ta, ph.lang, 14);
    const np = easeOut(prog(t, 24.2, 25.2));
    night.style.opacity = np;
    moon.style.opacity = np; moon.style.transform = `translateY(${(1 - np) * 120}px) scale(${lerp(.6, 1, np)})`;
    const cp = easeOut(prog(t, 27.8, 29.0));
    show(castle, t >= 27.8); castle.style.transform = `translateY(${(1 - cp) * 420}px)`; castle.style.opacity = cp;
    wins.forEach((w, i) => { w.style.opacity = .5 + .5 * (hash(Math.floor(t * 6) + i) > .3 ? 1 : .4); });
    const stOn = t >= ph.fire && t < ph.end - .2 && !(t >= 28.5);
    show(st, stOn);
    if (stOn) { st.innerHTML = ph.st; const p = pop(t, ph.fire, .5); st.style.transform = `translate(-50%,-50%) translateY(${P ? -60 : -40}px) scale(${p})`; st.style.opacity = clamp(prog(t, ph.fire, ph.fire + .2)); }
    show(amb1, t >= 24.4 && t < 27.8); amb1.style.transform = `scale(${pop(t, 24.4, .4)})`;
    show(amb2, t >= 28.0); amb2.style.transform = `scale(${pop(t, 28.0, .4)})`;
    show(frame, t >= 28.5);
    const fp = easeOut(prog(t, 28.5, 29.1));
    frame.style.opacity = fp; frame.style.transform = `translateY(${(1 - fp) * 120}px) rotate(${P ? 0 : -3 * (1 - fp)}deg)`;
    S1.fx3 = () => { stars(t, np * (1 - cp * .3)); rain(t, np * (1 - prog(t, 27.4, 28.0))); };
  };
});

/* ================= SCENE 4 (30–38): Zuschauer machen mit ================= */
scene(30, 38.2, (s) => {
  const lab = el(s, 'abs c', '<span class="label">' + T.s4Label + '</span>', { top: topY + 'px' });
  const chatY = P ? H * .20 : H * .22;
  const chats = [
    { at: 30.6, html: '<b>mert_99</b>: <span class="cmd">!airhorn</span>', fx: '📣', snd: '🔊 Airhorn' },
    { at: 32.4, html: '<b>lena.streams</b>: <span class="cmd">!hype</span>', fx: '🎉', snd: '🔊 Tada' },
    { at: 34.0, html: '<b>ayşe</b>: <span class="cmd">!gg</span>', fx: '🎮', snd: '🔊 Level-up' },
  ].map((c, i) => Object.assign(c, { el: el(s, 'chat', c.html, { top: (chatY + i * 120) + 'px' }) }));
  const fx = el(s, 'abs', '', { left: 0, right: 0, top: (P ? H * .42 : H * .30) + 'px', textAlign: 'center', fontSize: (P ? 300 : 260) + 'px', lineHeight: 1, fontFamily: EMOJI_FONT });
  const snd = el(s, 'snd', '', { left: '50%', top: (P ? H * .60 : H * .60) + 'px' });
  const tiers = [
    { at: 35.2, g: '🎁', n: T.s4Tiers[0][0], e: T.s4Tiers[0][1] },
    { at: 35.8, g: '🎁🎁', n: T.s4Tiers[1][0], e: T.s4Tiers[1][1] },
    { at: 36.4, g: '🎁🎁🎁', n: T.s4Tiers[2][0], e: T.s4Tiers[2][1] },
  ].map((c, i) => Object.assign(c, { el: el(s, 'tier', `<span class="g" style="font-family:${EMOJI_FONT}">${c.g}</span><span class="n">${c.n}</span><span class="arr">→</span><span>${c.e.slice(3)}</span><span class="e" style="font-family:${EMOJI_FONT}">${c.e.slice(0, 2)}</span>`, { top: ((P ? H * .62 : H * .60) + i * 110) + 'px', ...(P ? {} : { left: (W / 2 - 500) + 'px', right: 'auto', width: '1000px' }) }) }));
  if (T.sz.s4Tier) tiers.forEach((c) => { c.el.style.fontSize = T.sz.s4Tier + 'px'; c.el.style.whiteSpace = 'nowrap'; c.el.querySelector('.n').style.minWidth = T.sz.s4TierMin + 'px'; });
  const sub = el(s, 'abs c', T.s4Sub, { top: (P ? H * .88 : H * .91) + 'px', fontSize: '36px', color: 'var(--mute)', padding: '0 60px', fontWeight: 500 });
  return (t) => {
    lab.style.opacity = prog(t, 30.1, 30.5); lab.style.transform = `scale(${lerp(.8, 1, pop(t, 30.1, .5))})`;
    let active = null;
    chats.forEach((c) => {
      const on = t >= c.at; show(c.el, on); if (!on) return;
      const p = easeOut(prog(t, c.at, c.at + .4));
      c.el.style.opacity = p * (1 - prog(t, 36.6, 37.0)); c.el.style.transform = `translateX(${(1 - p) * -80}px)`;
      if (t >= c.at + .35 && t < c.at + 1.7) active = c;
    });
    show(fx, !!active); show(snd, !!active);
    if (active) {
      const p = pop(t, active.at + .35, .4), out = 1 - prog(t, active.at + 1.45, active.at + 1.7);
      fx.textContent = active.fx; fx.style.transform = `scale(${p * out}) rotate(${Math.sin((t - active.at) * 12) * 6 * (1 - prog(t, active.at, active.at + 1))}deg)`;
      snd.textContent = active.snd; snd.style.transform = `translate(-50%,0) scale(${pop(t, active.at + .6, .4) * out})`;
    }
    tiers.forEach((c) => {
      const on = t >= c.at; show(c.el, on); if (!on) return;
      const p = easeOut(prog(t, c.at, c.at + .45));
      c.el.style.opacity = p; c.el.style.transform = `translateY(${(1 - p) * 60}px) scale(${lerp(.9, 1, p)})`;
    });
    sub.style.opacity = prog(t, 36.6, 37.0);
    S1.fx4 = () => {
      if (t >= 31.0 && t < 33) sparks(t, W / 2, P ? H * .50 : H * .42, 360, 40, '255,209,102', win(t, 31.0, 32.3), 5);
      confetti(t, 32.8, 2.2, W / 2, P ? H * .50 : H * .42, 150, 1, 31);
      emojiRain(t, 36.4, 1.6, ['🎁', '💎', '⭐'], 22, 80, P ? H * .60 : H * .58, 41);
    };
  };
});

/* ================= SCENE 5 (38–44): Überall ================= */
scene(38, 44.2, (s) => {
  const title = el(s, 'abs c big', T.s5Title, { top: (P ? H * .07 : H * .06) + 'px', fontSize: (P ? 80 : 86) + 'px', padding: '0 60px' });
  const fw = P ? 940 : 900, fh = Math.round(fw * 0.5625);
  const frame = el(s, 'frame', img('panel', 'class="a"') + img('overlay-card', 'class="b" style="position:absolute;inset:0"') + '<div class="cap">' + T.s5Cap0 + '</div>', { width: fw + 'px', height: fh + 'px', left: (P ? (W - fw) / 2 : 80) + 'px', top: (P ? H * .17 : H * .20) + 'px' });
  const imgB = frame.querySelector('.b'), cap = frame.querySelector('.cap');
  const obs = el(s, 'abs', '<span class="pill">🎥 OBS · Streamlabs · TikTok LIVE Studio</span>', P ? { left: 0, right: 0, textAlign: 'center', top: (H * .17 + fh + 40) + 'px' } : { left: '80px', top: (H * .20 + fh + 36) + 'px', width: fw + 'px', textAlign: 'center' });
  const B = [['Instagram Live', '#ff2d75'], ['TikTok LIVE', '#2dffb5'], ['YouTube Live', '#ff4d4d'], ['Twitch', '#c084fc']];
  const badges = B.map(([n, c], i) => el(s, 'badge', n, { borderColor: c, color: c, ...(P ? { left: '50%', top: (H * .17 + fh + 190 + i * 112) + 'px' } : { left: (80 + fw + 90) + 'px', top: (H * .20 + i * 118) + 'px' }) }));
  const feats = T.s5Feats.map((f, i) => el(s, 'abs', `<span class="pill g">${f}</span>`, P ? { left: 0, right: 0, textAlign: 'center', top: (H * .17 + fh + 190 + 4 * 112 + 30 + i * 96) + 'px' } : { left: (80 + fw + 90) + 'px', top: (H * .20 + 4 * 118 + 30 + i * 86) + 'px' }));
  return (t) => {
    title.style.opacity = prog(t, 38.1, 38.5); title.style.transform = `translateY(${(1 - easeOut(prog(t, 38.1, 38.7))) * 40}px)`;
    const fp = easeOut(prog(t, 38.3, 38.9));
    frame.style.opacity = fp; frame.style.transform = `scale(${lerp(.9, 1, fp)})`;
    const sw = prog(t, 41.2, 41.7); imgB.style.opacity = sw; cap.textContent = sw > .5 ? T.s5CapB : T.s5CapA;
    obs.style.opacity = prog(t, 38.9, 39.3);
    badges.forEach((b, i) => { const a = 39.3 + i * .3, p = pop(t, a, .45); b.style.opacity = clamp(prog(t, a, a + .2)); b.style.transform = `${P ? 'translateX(-50%) ' : ''}scale(${p})`; });
    feats.forEach((f, i) => { const a = 40.9 + i * .35, p = easeOut(prog(t, a, a + .4)); f.style.opacity = p; f.style.transform = `translateX(${(1 - p) * (P ? 0 : 60)}px) translateY(${(1 - p) * (P ? 30 : 0)}px)`; });
    S1.fx5 = () => { sparks(t, W / 2, H * .5, Math.max(W, H) * .55, 40, '45,255,181', .5, 7); };
  };
});

/* ================= SCENE 6 (44–50): CTA ================= */
scene(44, 50.01, (s) => {
  const logo = el(s, 'abs c logo', '<span style="font-family:' + EMOJI_FONT + '">🎬</span> Live<span class="fx">FX</span>', { top: (P ? H * .22 : H * .16) + 'px', fontSize: (P ? 170 : 180) + 'px' });
  const tag = el(s, 'abs c big neon', T.s6Tag, { top: (P ? H * .36 : H * .38) + 'px', fontSize: (P ? 98 : 96) + 'px', padding: '0 40px' });
  const url = el(s, 'abs c', '<span class="pill y" style="font-size:52px;padding:20px 50px">livefx.app</span>', { top: (P ? H * .56 : H * .66) + 'px' });
  const pil = el(s, 'abs c', T.s6Pilot, { top: (P ? H * .68 : H * .80) + 'px', fontSize: '42px', color: 'var(--mute)', fontWeight: 500 });
  const pil2 = el(s, 'abs c big', 'TikTok <span class="mute">·</span> Meta <span class="mute">·</span> YouTube', { top: (P ? H * .715 : H * .855) + 'px', fontSize: (P ? 66 : 62) + 'px' });
  const foot = el(s, 'abs c', T.s6Foot, { top: (P ? H * .86 : H * .94) + 'px', fontSize: '32px', color: 'var(--mute)' });
  return (t) => {
    const lp = pop(t, 44.2, .7); logo.style.opacity = clamp(prog(t, 44.2, 44.5)); logo.style.transform = `scale(${lerp(.5, 1, lp)})`;
    tag.style.opacity = prog(t, 45.0, 45.4); tag.style.transform = `translateY(${(1 - easeOut(prog(t, 45.0, 45.6))) * 50}px)`;
    const up = pop(t, 46.0, .5); url.style.opacity = clamp(prog(t, 46.0, 46.2)); url.style.transform = `scale(${up})`;
    pil.style.opacity = prog(t, 46.8, 47.2); pil2.style.opacity = prog(t, 47.1, 47.5); pil2.style.transform = `translateY(${(1 - easeOut(prog(t, 47.1, 47.6))) * 30}px)`;
    foot.style.opacity = prog(t, 47.8, 48.2);
    S1.fx6 = () => {
      confetti(t, 44.3, 3.5, W / 2, P ? H * .30 : H * .25, 140, 1.4, 61);
      sparks(t, W / 2, P ? H * .42 : H * .45, Math.max(W, H) * .4, 60, '255,45,117', .7, 13);
    };
  };
});

/* ---------- master render ---------- */
function render(t) {
  t = clamp(t, 0, DUR);
  S1.fx = S1.fx3 = S1.fx4 = S1.fx5 = S1.fx6 = null;
  SCENES.forEach((s) => {
    const on = t >= s.a - .01 && t < s.b;
    s.el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) { s.el.style.opacity = 0; return; }
    s.el.style.opacity = Math.min(1, prog(t, s.a, s.a + .25), 1 - prog(t, s.b - .25, s.b));
    s.update(t);
  });
  const gx = 50 + Math.sin(t * .31) * 28, gy = 40 + Math.cos(t * .23) * 25;
  const col = t < 22 || t >= 44 ? '255,45,117' : t < 30 ? '80,120,255' : t < 38 ? '255,209,102' : '45,255,181';
  glow.style.background = `radial-gradient(circle at ${gx}% ${gy}%,rgba(${col},.32),rgba(${col},.08) 30%,rgba(0,0,0,0) 55%)`;
  glow.style.opacity = t < 1.9 ? 0 : 1;
  cx.clearRect(0, 0, W, H);
  [S1.fx3, S1.fx, S1.fx4, S1.fx5, S1.fx6].forEach((f) => f && f());
  // ambient drifting dust
  cx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 50; i++) {
    const y = ((hash(i + 99) * H - t * (12 + hash(i + 3) * 25)) % H + H) % H, x = hash(i) * W + Math.sin(t * .5 + hash(i + 5) * 6.28) * 30;
    const a = (.15 + .4 * Math.pow(Math.sin(t * 1.5 + i) * .5 + .5, 3)) * (t > 1.9 ? 1 : 0);
    const g = cx.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, 8, 0, 6.283); cx.fill();
  }
  cx.globalCompositeOperation = 'source-over';
  black.style.opacity = Math.max(1 - prog(t, 0, .4), prog(t, 49.2, 50));
}
window.render = render; window.DUR = DUR; window.RATIO = RATIO;
/* a missing localized shot falls back to the German one before READY resolves */
const decodeImg = (i) => i.decode().catch(() => {
  const fb = i.dataset.fallback;
  if (!fb || i.getAttribute('src') === fb) return;
  i.src = fb; return i.decode().catch(() => {});
});
window.READY = Promise.all([document.fonts.ready, ...[...document.images].map(decodeImg)]);

if (!Q.has('capture')) {
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; stage.style.marginLeft = ((innerWidth - W * s) / 2) + 'px'; };
  addEventListener('resize', fit); fit();
  const t0 = performance.now(), off = Number(Q.get('t') || 0);
  const loop = () => { render(((performance.now() - t0) / 1000 + off) % DUR); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
