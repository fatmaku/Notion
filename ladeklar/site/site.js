// LADEKLAR website: route-net hero, the phone that taps itself, language word, ROI calculator,
// price toggle, trailer player. No tracking, no third-party requests.
import { routeNet } from '../web/js/routenet.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const eur = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';

/* ---------- hero: route net ---------- */
const netCanvas = $('#net');
if (netCanvas) {
  const net = routeNet(netCanvas, { trucks: 22, labels: 'all', labelSize: 12, focus: ['S', 'HH'], route: null, path: ['S', 'WÜ', 'F', 'KS', 'H', 'HH'], pathProgress: 0, alpha: 0.9, pad: 28 });
  let t0 = performance.now(), raf = 0, visible = true;
  const tick = (now) => {
    const sec = (now - t0) / 1000;
    net.set({ pathProgress: (sec % 16) / 13 > 1 ? 1 : (sec % 16) / 13 });
    net.drawAt(sec);
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  new ResizeObserver(() => { net.resize(); if (reduce) net.drawAt(6); }).observe(netCanvas);
  if (reduce) { net.set({ pathProgress: 0.62 }); net.drawAt(6); }
  else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(netCanvas);
    raf = requestAnimationFrame(tick);
  }
}

/* ---------- hero: the phone taps itself, the office gets the push ---------- */
const stage = $('#stage');
if (stage) {
  const shots = Object.fromEntries($$('.scr img', stage).map((i) => [i.dataset.k, i]));
  const tap = $('.tap', stage), feed = $('#feed');
  const T = JSON.parse(stage.dataset.taps); // tap centres in CSS px of a 390×844 screen
  const show = (k) => Object.entries(shots).forEach(([n, i]) => i.classList.toggle('on', n === k));
  const doTap = (k) => {
    tap.style.left = (T[k].x / 390) * 100 + '%';
    tap.style.top = (T[k].y / 844) * 100 + '%';
    tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
  };
  const push = (title, sub, kind) => {
    const n = document.createElement('div');
    n.className = 'note new ' + (kind || '');
    n.innerHTML = `<span class="ni"><svg class="ic" viewBox="0 0 24 24"><use href="#i-${kind === 'done' ? 'file-check' : 'bell'}"/></svg></span><div><small>KAYA Dispo · jetzt</small><b></b><p></p></div>`;
    n.querySelector('b').textContent = title; n.querySelector('p').textContent = sub;
    feed.prepend(n);
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('new')));
    $$('.note', feed).slice(3).forEach((o) => { o.classList.add('gone'); setTimeout(() => o.remove(), 600); });
  };
  const SEQ = [
    [0, () => show('phone-1-confirm')],
    [1500, () => doTap('phone-1-confirm')],
    [1800, () => { show('phone-1b-ok'); push('Sven Krause hat bestätigt', 'KAY-2610-0019 · Stuttgart → Hamburg · S-KL 2041'); }],
    [3200, () => show('phone-2-loaded')],
    [4700, () => doTap('phone-2-loaded')],
    [5000, () => { show('phone-2b-ok'); push('Aufgeladen · unterwegs', 'Bosch Werk Feuerbach · 30 Paletten · 17,8 t'); }],
    [6400, () => show('phone-3-unloaded')],
    [7900, () => doTap('phone-3-unloaded')],
    [8200, () => { show('phone-3b-ok'); push('Abgeladen in Hamburg', 'HHLA Container Terminal · Ankunft 14:02'); }],
    [9600, () => show('phone-4-podbutton')],
    [11000, () => doTap('phone-4-podbutton')],
    [11300, () => show('phone-5-pod')],
    [12800, () => doTap('phone-5-pod')],
    [13100, () => { show('phone-6-delivered'); push('Zugestellt · Lieferschein liegt vor', 'Abliefernachweis als PDF · Rechnung kann raus', 'done'); }],
  ];
  const LOOP = 16500;
  let timers = [], running = false;
  const run = () => {
    timers.forEach(clearTimeout);
    timers = SEQ.map(([at, fn]) => setTimeout(fn, at));
    timers.push(setTimeout(run, LOOP));
  };
  const setRun = (on) => {
    if (on === running) return;
    running = on;
    if (on) run(); else { timers.forEach(clearTimeout); timers = []; }
  };
  if (!reduce) {
    let inView = true;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; setRun(inView && !document.hidden); }, { threshold: 0.15 }).observe(stage);
    document.addEventListener('visibilitychange', () => setRun(inView && !document.hidden));
    setRun(true);
  }
}

/* ---------- one word, eight languages ---------- */
const word = $('#word');
if (word && !reduce) {
  const words = $$('span', word);
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    const cur = words[i]; i = (i + 1) % words.length; const nxt = words[i];
    cur.classList.replace('on', 'out');
    nxt.classList.remove('out'); nxt.classList.add('on');
    setTimeout(() => cur.classList.remove('out'), 700);
    $$('.langs figure').forEach((f, k) => f.classList.toggle('hot', k === i));
  }, 2200);
}

/* ---------- reveal on scroll (transform only: content is readable before it moves) ---------- */
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight) { el.classList.add('pre'); io.observe(el); }
  });
}

/* ---------- ROI calculator (assumptions as in BUSINESSPLAN.md, chapter 4) ---------- */
const roi = $('#roi');
if (roi) {
  const inp = { n: $('#roi-n'), d: $('#roi-d'), r: $('#roi-r') };
  const out = (k) => $(`[data-o="${k}"]`, roi);
  const shown = {};
  const tween = (k, val, fmt) => {
    const el = out(k); const from = shown[k] ?? val; shown[k] = val;
    if (reduce || from === val) { el.textContent = fmt(val); return; }
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / 420); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (val - from) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const plan = (n) => {
    if (n <= 3) return ['Start', 49];
    if (n <= 15) return ['Flotte', 129];
    const flotte = 129 + (n - 15) * 7, premium = 299 + Math.max(0, n - 40) * 6;
    return flotte <= premium ? ['Flotte', flotte] : ['Premium', premium];
  };
  const calc = () => {
    const n = +inp.n.value, d = +inp.d.value, rate = +inp.r.value;
    $('#roi-n-v').textContent = n; $('#roi-d-v').textContent = d.toLocaleString('de-DE'); $('#roi-r-v').textContent = eur(rate);
    const deliveries = n * d * 21;
    const hours = (deliveries * 2 * 3 * 0.6) / 60;
    const parts = {
      calls: hours * rate,
      search: deliveries * 0.03 * 0.25 * rate,
      cash: n * 10700 * (4 / 30) * 0.09 / 12,
      wait: n * 2 * 1 * 40 * 0.5,
    };
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    const [pn, price] = plan(n);
    tween('hours', hours, (v) => Math.round(v).toLocaleString('de-DE'));
    tween('total', total, (v) => eur(Math.round(v)));
    tween('price', price, (v) => eur(Math.round(v)));
    out('plan').textContent = pn;
    out('deliveries').textContent = deliveries.toLocaleString('de-DE');
    out('ratio').textContent = (total / price).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' : 1';
    for (const [k, v] of Object.entries(parts)) {
      const bar = $(`[data-b="${k}"]`, roi);
      bar.style.setProperty('--w', ((v / total) * 100).toFixed(2) + '%');
      $('span', bar.parentElement.previousElementSibling).textContent = eur(Math.round(v));
    }
  };
  Object.values(inp).forEach((i) => i.addEventListener('input', calc));
  calc();
}

/* ---------- prices: monthly / yearly ---------- */
const bill = $('#billing');
if (bill) {
  const set = (yearly) => {
    $$('button', bill).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === 'y') === yearly)));
    $$('[data-m]').forEach((el) => {
      const m = +el.dataset.m;
      el.textContent = yearly ? eur((m * 10) / 12, 2).replace(',00', '') : eur(m);
    });
    $$('[data-y]').forEach((el) => { el.textContent = yearly ? `${eur(+el.dataset.y * 10)} jährlich · 2 Monate geschenkt` : 'monatlich kündbar zum Monatsende'; });
  };
  bill.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.v === 'y'); });
  set(false);
}

/* ---------- trailer: poster with a big play button, native controls once playing ---------- */
const film = $('#film');
if (film) {
  const v = $('video', film), btn = $('.play', film);
  btn.addEventListener('click', () => {
    v.controls = true; film.classList.add('playing');
    v.play().catch(() => { film.classList.remove('playing'); });
  });
  v.addEventListener('ended', () => film.classList.remove('playing'));
}

/* ---------- copy contact address ---------- */
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const txt = b.dataset.copy;
  try { await navigator.clipboard.writeText(txt); b.dataset.state = 'ok'; }
  catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.dataset.state = 'sel'; }
  setTimeout(() => delete b.dataset.state, 1800);
}));

/* ---------- header shadow after scrolling ---------- */
const head = $('.top');
if (head) {
  const onScroll = () => head.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}
