// LiveFX – overlay renderer v2. Receives { type:'fire', trigger } messages and draws the effect.
// Hardened: every user string goes through escapeHtml, image sources are allow-listed, rain is capped,
// sounds may be builtin (LiveFXSounds) or uploaded files (`file:assets/x.mp3`). See docs/CONTRACTS.md §9.
// Story mode (1.3): one persistent `.fx-scene` layer (gradient + CSS animation + emoji particles) that stays
// until the next scene, ambient loops (`loop:<name>` via LiveFXSounds.loop) and the `sticker` kind.
// LiveFX 2.0 (renderer v2):
//   - one `<canvas class="fx-canvas">` particle layer (single rAF loop, dynamic cap, auto-reduce) for
//     confetti, rain bursts and scene parallax layers; DOM fallback when `getContext` is unavailable
//   - kinds `text` (neon | gradient | bounce | glitch, letters staggered), `lower-third` (landscape; banner
//     in portrait) and `combo` (scheduled steps, cancelled by `renderer.clear()`)
//   - per-visual `glow`, `tilt` (3D card), `impact` (stage zoom bump), `intensity` 1..3 (particle count,
//     light rays / explosion ring behind cards at >= 2), per-trigger `gain` (effective = volume × gain)
//   - themes (`renderer.setTheme(name)` -> `body[data-theme]`, CSS variables in css/overlay.css)
//   - audio engine v2 hook: `LiveFXSounds.mixer.play(name, {gain, pan, intensity})` when present
(function (global) {
  'use strict';

  // LiveFXSchema is resolved lazily (script order in overlay.html may put schema.js after fx.js);
  // the local fallbacks below keep the overlay working when schema.js is missing entirely.
  const schema = () => global.LiveFXSchema || null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const CONFETTI_COUNT = 90;
  const FILE_SOUND_MAX_MS = 60000;
  const SCENE_FADE_MS = 800;
  const SCENE_PARTICLE_CAP = 40;
  const LOOP_FADE_SEC = 1.5;
  const STICKER_MS = 2800;
  const STICKER_MAX = 4;
  const CARD_MS = 2600;
  const TEXT_MS = 3000;
  const LOWER_THIRD_MS = 4000;
  const TEXT_MAX_LETTERS = 40;
  const THEMES = ['neon', 'pastel', 'minimal', 'kinderbuch'];
  const TEXT_STYLES = ['neon', 'gradient', 'bounce', 'glitch'];
  const FALLBACK_SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear'];
  // Particle layer: cap per intensity, auto-reduce when a frame takes longer than 20 ms for 30 frames in a row.
  const PARTICLE_CAP = { 1: 400, 2: 800, 3: 1200 };
  const PARTICLE_CAP_MIN = 120;
  const SLOW_FRAME_MS = 20;
  const SLOW_FRAMES = 30;
  const AMBIENT_CAP = { 1: 40, 2: 70, 3: 110 };
  const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];

  /**
   * Per-scene decoration. `decor` sits top-right (sun, moon, planet), `ground` is a bottom row of silhouettes,
   * `particles` are emoji spawned continuously while the scene is active: `mode` is one of
   * fall | rise | drift | twinkle | comet | drive (see css/overlay.css .fx-particle-*), `every` the spawn
   * interval in ms at intensity 2, `w` the pick weight, `size` the font-size range in px, `dur` the life in s.
   */
  const SCENE_DEFS = {
    rain: { every: 140, particles: [{ emoji: '💧', mode: 'fall', w: 4, size: [16, 30], dur: [1.2, 2] }] },
    night: { decor: '🌙', every: 700, particles: [{ emoji: '✨', mode: 'twinkle', w: 3, size: [12, 26], dur: [1.5, 3] }, { emoji: '⭐', mode: 'twinkle', w: 1, size: [10, 18], dur: [2, 3.5] }] },
    forest: { ground: '🌲🌳🌲🌲🌳🌲🌳🌲', every: 420, particles: [{ emoji: '🍃', mode: 'fall', w: 3, size: [18, 34], dur: [3.5, 6] }, { emoji: '✨', mode: 'twinkle', w: 2, size: [8, 14], dur: [1.5, 3] }] },
    sea: { every: 650, particles: [{ emoji: '🐟', mode: 'drift', w: 2, size: [22, 40], dur: [7, 12] }, { emoji: '🫧', mode: 'rise', w: 2, size: [12, 24], dur: [3, 5] }, { emoji: '⛵', mode: 'drift', w: 1, size: [34, 48], dur: [14, 18] }] },
    fire: { every: 160, particles: [{ emoji: '✨', mode: 'rise', w: 4, size: [10, 22], dur: [1.5, 2.8] }, { emoji: '🔥', mode: 'rise', w: 1, size: [14, 24], dur: [1.2, 2] }] },
    castle: { ground: '🏰', every: 800, particles: [{ emoji: '🦇', mode: 'drift', w: 2, size: [20, 34], dur: [5, 9] }, { emoji: '✨', mode: 'twinkle', w: 2, size: [10, 20], dur: [1.5, 3] }] },
    snow: { every: 180, particles: [{ emoji: '❄️', mode: 'fall', w: 4, size: [12, 30], dur: [4, 7] }, { emoji: '•', mode: 'fall', w: 2, size: [8, 14], dur: [3, 6] }] },
    desert: { decor: '☀️', ground: '🌵  🐪   🌵', every: 900, particles: [{ emoji: '🍂', mode: 'drift', w: 2, size: [14, 24], dur: [4, 7] }] },
    city: { ground: '🏢🏬🏙️🏢🏨🏢🏬🏢', every: 1100, particles: [{ emoji: '🚕', mode: 'drive', w: 2, size: [30, 42], dur: [4, 7] }, { emoji: '🚗', mode: 'drive', w: 1, size: [28, 38], dur: [4, 6] }, { emoji: '✨', mode: 'twinkle', w: 1, size: [8, 14], dur: [1, 2] }] },
    space: { decor: '🪐', every: 500, particles: [{ emoji: '✨', mode: 'twinkle', w: 4, size: [8, 22], dur: [1.5, 3] }, { emoji: '☄️', mode: 'comet', w: 1, size: [26, 40], dur: [1.6, 2.6] }] },
    sunrise: { every: 700, particles: [{ emoji: '🐦', mode: 'drift', w: 2, size: [16, 26], dur: [6, 10] }, { emoji: '✨', mode: 'twinkle', w: 2, size: [10, 20], dur: [1.5, 3] }] },
    storm: { every: 110, particles: [{ emoji: '💧', mode: 'fall', w: 5, size: [14, 28], dur: [0.9, 1.6] }, { emoji: '⚡', mode: 'twinkle', w: 1, size: [40, 90], dur: [0.4, 0.8] }] },
  };
  const FALLBACK = {
    rainCount: 60,
    positions: ['center', 'top', 'safe'],
    assetImageRe: /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp)$/i,
    httpSrcRe: /^https?:\/\/[^\s"'<>]{1,500}$/i,
    colorRe: /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i,
  };
  const rainMax = () => {
    const S = schema();
    return (S && S.LIMITS && S.LIMITS.rainCount) || FALLBACK.rainCount;
  };
  const positions = () => (schema() && schema().POSITIONS) || FALLBACK.positions;
  const scenes = () => (schema() && schema().SCENES) || FALLBACK_SCENES;
  const themes = () => (schema() && schema().THEMES) || THEMES;
  const assetImageRe = () => (schema() && schema().ASSET_IMAGE_RE) || FALLBACK.assetImageRe;
  const httpSrcRe = () => (schema() && schema().HTTP_SRC_RE) || FALLBACK.httpSrcRe;
  const colorRe = () => (schema() && schema().COLOR_RE) || FALLBACK.colorRe;

  function escapeHtml(s) {
    const S = schema();
    if (S && typeof S.escapeHtml === 'function') return S.escapeHtml(s);
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function parseSound(spec) {
    const S = schema();
    if (S && typeof S.parseSound === 'function') return S.parseSound(spec);
    if (typeof spec !== 'string' || !spec) return null;
    if (spec.startsWith('file:')) {
      const url = spec.slice(5);
      return /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(mp3|wav|ogg)$/i.test(url) && !url.includes('..') ? { kind: 'file', url } : null;
    }
    if (spec.startsWith('loop:')) {
      const name = spec.slice(5);
      return /^[a-z][a-zA-Z0-9]{0,30}$/.test(name) ? { kind: 'loop', name } : null;
    }
    return /^[a-z][a-zA-Z0-9]{0,30}$/.test(spec) ? { kind: 'builtin', name: spec } : null;
  }

  /** Splits a string into user-perceived characters (emoji incl. ZWJ sequences). `keepSpaces` keeps blanks. */
  function graphemes(s, keepSpaces = false) {
    const str = String(s || '');
    let parts;
    try {
      parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str), (x) => x.segment);
    } catch (_) {
      parts = Array.from(str);
    }
    return parts.filter((g) => (keepSpaces || g.trim() !== '') && !/^[‍️]$/.test(g));
  }

  function pickWeighted(list) {
    const total = list.reduce((n, p) => n + (p.w || 1), 0);
    let r = Math.random() * total;
    for (const p of list) {
      r -= p.w || 1;
      if (r <= 0) return p;
    }
    return list[list.length - 1];
  }

  function safeColor(c) {
    return typeof c === 'string' && colorRe().test(c.trim()) ? c.trim() : '';
  }

  function safeSrc(src) {
    if (typeof src !== 'string') return '';
    const s = src.trim();
    if ((assetImageRe().test(s) && !s.includes('..')) || httpSrcRe().test(s)) return s;
    return '';
  }

  function posClass(v) {
    const p = v && positions().includes(v.position) ? v.position : 'center';
    return `fx-pos-${p}`;
  }

  /** 1..3, default 1 (scenes default to 2 – see _startParticles). */
  function intensityOf(v, def = 1) {
    let n = Math.round(Number(v && v.intensity));
    if (!Number.isFinite(n)) n = def;
    return clamp(n, 1, 3);
  }

  /**
   * Horizontal placement of falling things. The overlay CSS positions drops/confetti with
   * `left: calc(var(--fx-x0, 0vw) + var(--x, 0) * var(--fx-xspan, 100vw))` so a portrait layout can
   * narrow the band. Until that CSS rule is present (older overlay.css without `--fx-xspan`), an
   * element without inline `left` would sit at x=0 – so we additionally set inline `left` when the
   * variable is not defined on :root. Cached once per page.
   */
  let needsInlineLeft = null;
  function placeX(el) {
    const x = Math.random();
    el.style.setProperty('--x', String(x));
    if (needsInlineLeft === null) {
      try {
        needsInlineLeft = getComputedStyle(document.documentElement).getPropertyValue('--fx-xspan').trim() === '';
      } catch (_) {
        needsInlineLeft = true;
      }
    }
    if (needsInlineLeft) el.style.left = `${x * 100}vw`;
  }

  /** Reads a CSS length variable from body (vw/vh/px/%) into px of the stage. */
  function cssLengthPx(name, fallbackPx, axisPx) {
    let raw = '';
    try {
      raw = getComputedStyle(document.body).getPropertyValue(name).trim();
    } catch (_) {
      raw = '';
    }
    const m = /^(-?[\d.]+)(vw|vh|px|%)?$/.exec(raw);
    if (!m) return fallbackPx;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return fallbackPx;
    if (m[2] === 'vw') return (n / 100) * (global.innerWidth || axisPx);
    if (m[2] === 'vh') return (n / 100) * (global.innerHeight || axisPx);
    if (m[2] === '%') return (n / 100) * axisPx;
    return n;
  }

  // ------------------------------------------------------------------ particle layer (canvas)
  /**
   * One `<canvas class="fx-canvas">` inside the stage, one requestAnimationFrame loop that only runs while
   * something is alive. Particles: { x, y, vx, vy, g, wind, rot, vr, life, age, size, kind, text|color, alpha,
   * wobble, layer }. `kind` is 'emoji' (drawn from a cached sprite), 'rect' (confetti, 3D-ish scale wobble)
   * or 'spark'. Scene parallax runs through `ambient` (3 layers: far / mid / near).
   */
  class ParticleLayer {
    constructor(root, stats) {
      this.root = root;
      this.stats = stats;
      this.items = [];
      this.ambient = null; // { list, every, intensity, override, last }
      this.cap = PARTICLE_CAP[1];
      this.reducedTo = 0;
      this.ctx = null;
      this.canvas = null;
      this.sprites = new Map();
      this.raf = 0;
      this.last = 0;
      this.slow = 0;
      this.fpsAcc = 0;
      this.fpsN = 0;
      this.fpsAt = 0;
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.ok = false;
      this._tick = this._tick.bind(this);
      this._onResize = () => this.resize();
      this._init();
    }

    _init() {
      if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;
      let canvas;
      let ctx = null;
      try {
        canvas = document.createElement('canvas');
        ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      } catch (_) {
        ctx = null;
      }
      if (!ctx) return;
      canvas.className = 'fx-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this.canvas = canvas;
      this.ctx = ctx;
      this.ok = true;
      this.root.appendChild(canvas);
      this.resize();
      try {
        global.addEventListener('resize', this._onResize);
      } catch (_) {
        /* ignore */
      }
    }

    /** Keeps the canvas as the lowest effect layer (right above the scene layers) and its size in sync. */
    ensureOrder() {
      if (!this.ok) return;
      const kids = Array.from(this.root.children);
      let idx = 0;
      while (idx < kids.length && kids[idx].classList.contains('fx-scene')) idx++;
      if (kids[idx] !== this.canvas) this.root.insertBefore(this.canvas, kids[idx] || null);
      const w = this.root.clientWidth || global.innerWidth || 1;
      const h = this.root.clientHeight || global.innerHeight || 1;
      if (Math.abs(w - this.w) > 1 || Math.abs(h - this.h) > 1) this.resize();
    }

    resize() {
      if (!this.ok) return;
      const r = this.root.getBoundingClientRect ? this.root.getBoundingClientRect() : { width: 0, height: 0 };
      this.w = Math.max(1, Math.round(r.width || global.innerWidth || 1));
      this.h = Math.max(1, Math.round(r.height || global.innerHeight || 1));
      this.dpr = clamp(global.devicePixelRatio || 1, 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.sprites.clear();
    }

    /** Base cap per intensity (400 / 800 / 1200); an auto-reduced cap stays as the ceiling until the page reloads. */
    setCap(intensity) {
      const want = PARTICLE_CAP[clamp(intensity, 1, 3)] || PARTICLE_CAP[1];
      this.cap = this.reducedTo ? Math.min(want, this.reducedTo) : want;
    }

    /** Horizontal spawn band in px: [x0, span] (portrait layouts narrow it through --fx-x0/--fx-xspan). */
    band() {
      const x0 = cssLengthPx('--fx-x0', 0, this.w);
      const span = cssLengthPx('--fx-xspan', this.w, this.w);
      return [x0, Math.max(10, span)];
    }

    fallPx() {
      return cssLengthPx('--fx-fall', this.h * 1.15, this.h);
    }

    add(p) {
      if (!this.ok) return false;
      if (this.items.length >= this.cap) return false;
      p.age = 0;
      if (p.alpha === undefined) p.alpha = 1;
      if (p.layer === undefined) p.layer = 1;
      this.items.push(p);
      this.stats.particles = this.items.length;
      this.start();
      return true;
    }

    /** Rain burst: `count` emoji with gravity, wind, drift and rotation. */
    rain(emoji, count) {
      const [x0, span] = this.band();
      const wind = rand(-30, 30);
      for (let i = 0; i < count; i++) {
        const size = rand(22, 60);
        this.add({
          kind: 'emoji',
          text: emoji,
          x: x0 + Math.random() * span,
          y: -rand(20, 220),
          vx: rand(-20, 20),
          vy: rand(120, 260),
          g: rand(140, 260),
          wind,
          drift: rand(0.5, 2.5),
          phase: rand(0, 6.28),
          rot: rand(0, 6.28),
          vr: rand(-2, 2),
          size,
          life: rand(2.2, 3.6),
          layer: size > 44 ? 2 : size > 32 ? 1 : 0,
        });
      }
    }

    /** Confetti: rotating rects with a 3D-ish scale wobble; `count` pieces. */
    confetti(count, colors) {
      const [x0, span] = this.band();
      const wind = rand(-40, 40);
      for (let i = 0; i < count; i++) {
        this.add({
          kind: 'rect',
          color: colors[i % colors.length],
          x: x0 + Math.random() * span,
          y: -rand(10, 160),
          vx: rand(-60, 60),
          vy: rand(60, 200),
          g: rand(200, 420),
          wind,
          drift: rand(1, 3),
          phase: rand(0, 6.28),
          rot: rand(0, 6.28),
          vr: rand(-6, 6),
          wobble: rand(2, 6),
          w: rand(8, 14),
          h: rand(14, 24),
          life: rand(2.2, 3.8),
          layer: i % 3,
        });
      }
    }

    /** Short radial burst of sparks behind a card (intensity >= 2). */
    sparks(cx, cy, count, color) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(120, 420);
        this.add({ kind: 'spark', color, x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, wind: 0, drift: 0, phase: 0, rot: 0, vr: 0, size: rand(2, 5), life: rand(0.5, 1.1), layer: 2 });
      }
    }

    /** Scene parallax: emoji from the scene definition on three layers (far: small/slow, near: big/fast). */
    setAmbient(def, intensity, override) {
      const list = def && Array.isArray(def.particles) ? def.particles : [];
      if (!list.length || !this.ok) {
        this.ambient = null;
        return;
      }
      this.ambient = { list, every: Math.max(60, Math.round((def.every || 400) * (2 / intensity) * 0.9)), intensity, override, last: 0, cap: AMBIENT_CAP[intensity] || AMBIENT_CAP[2] };
      this.start();
    }

    clearAmbient() {
      this.ambient = null;
      this.items = this.items.filter((p) => !p.ambient);
    }

    _spawnAmbient(now) {
      const a = this.ambient;
      if (!a || now - a.last < a.every) return;
      a.last = now;
      const alive = this.items.reduce((n, p) => n + (p.ambient ? 1 : 0), 0);
      if (alive >= a.cap) return;
      const p = pickWeighted(a.list);
      const layer = Math.floor(Math.random() * 3); // 0 far, 1 mid, 2 near
      const k = [0.55, 1, 1.45][layer];
      const size = rand(p.size[0], p.size[1]) * k;
      const text = a.override ? a.override[Math.floor(Math.random() * a.override.length)] : p.emoji;
      const [x0, span] = this.band();
      const fall = this.fallPx();
      const dur = rand(p.dur[0], p.dur[1]) / k;
      const base = { kind: 'emoji', text, size, layer, ambient: true, life: dur, alpha: [0.45, 0.75, 1][layer], g: 0, wind: 0, drift: rand(0.5, 1.5), phase: rand(0, 6.28), rot: 0, vr: 0, fade: true };
      if (p.mode === 'fall') Object.assign(base, { x: x0 + Math.random() * span, y: -size, vx: rand(-10, 10), vy: (fall + size) / dur, vr: rand(-0.6, 0.6) });
      else if (p.mode === 'rise') Object.assign(base, { x: x0 + Math.random() * span, y: fall, vx: rand(-15, 15), vy: -(fall * 0.8) / dur });
      else if (p.mode === 'drift') Object.assign(base, { x: x0 - size, y: rand(0.05, 0.7) * this.h, vx: (span + size * 2) / dur, vy: rand(-6, 6) });
      else if (p.mode === 'drive') Object.assign(base, { x: x0 - size, y: Math.min(this.h, fall) - size * 1.2, vx: (span + size * 2) / dur, vy: 0 });
      else if (p.mode === 'comet') Object.assign(base, { x: x0 + span * rand(0.4, 1), y: rand(0, 0.25) * this.h, vx: -(span * 0.6) / dur, vy: (fall * 0.45) / dur });
      else Object.assign(base, { x: x0 + Math.random() * span, y: rand(0.04, 0.7) * this.h, vx: 0, vy: 0, twinkle: true, vr: rand(-0.4, 0.4) });
      this.add(base);
    }

    start() {
      if (!this.ok || this.raf) return;
      this.last = 0;
      this.raf = requestAnimationFrame(this._tick);
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.ok && this.items.length === 0) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clear() {
      this.items.length = 0;
      this.ambient = null;
      this.stats.particles = 0;
      this.stop();
    }

    _sprite(text, size) {
      const bucket = Math.max(8, Math.round(size / 4) * 4);
      const key = `${text}|${bucket}`;
      let s = this.sprites.get(key);
      if (s) return s;
      const pad = Math.ceil(bucket * 0.3);
      const dim = Math.ceil((bucket + pad * 2) * this.dpr);
      const c = document.createElement('canvas');
      c.width = dim;
      c.height = dim;
      const g = c.getContext('2d');
      if (!g) return null;
      g.scale(this.dpr, this.dpr);
      g.font = `${bucket}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.35)';
      g.shadowBlur = 6;
      g.shadowOffsetY = 3;
      g.fillStyle = '#fff';
      g.fillText(text, (bucket + pad * 2) / 2, (bucket + pad * 2) / 2);
      s = { canvas: c, size: bucket + pad * 2 };
      if (this.sprites.size > 160) this.sprites.delete(this.sprites.keys().next().value);
      this.sprites.set(key, s);
      return s;
    }

    _tick(now) {
      this.raf = 0;
      const t0 = typeof performance !== 'undefined' ? performance.now() : now;
      const dt = this.last ? clamp((now - this.last) / 1000, 0.001, 0.05) : 1 / 60;
      this.last = now;
      this._spawnAmbient(now);
      this._update(dt);
      this._draw();
      const ms = (typeof performance !== 'undefined' ? performance.now() : now) - t0;
      this.stats.frameMs = Math.round(ms * 100) / 100;
      // fps: average over ~1 s windows.
      this.fpsAcc += dt;
      this.fpsN++;
      if (this.fpsAcc >= 1) {
        this.stats.fps = Math.round(this.fpsN / this.fpsAcc);
        this.fpsAcc = 0;
        this.fpsN = 0;
      }
      if (ms > SLOW_FRAME_MS) {
        if (++this.slow >= SLOW_FRAMES) {
          this.slow = 0;
          const next = Math.max(PARTICLE_CAP_MIN, Math.floor(this.cap * 0.6));
          if (next < this.cap) {
            this.cap = next;
            this.reducedTo = next;
            this.stats.reduced = (this.stats.reduced || 0) + 1;
          }
        }
      } else this.slow = 0;
      this.stats.particles = this.items.length;
      if (this.items.length || this.ambient) this.raf = requestAnimationFrame(this._tick);
      else this.stop();
    }

    _update(dt) {
      const fall = this.fallPx();
      const items = this.items;
      let n = 0;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        p.age += dt;
        if (p.age >= p.life) continue;
        p.vy += p.g * dt;
        p.vx += (p.wind - p.vx) * 0.4 * dt;
        p.x += (p.vx + Math.sin(p.age * p.drift * 2 + p.phase) * 18 * p.drift) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (!p.ambient && p.y > fall + 40) continue;
        if (p.x < -200 || p.x > this.w + 200 || p.y > this.h + 200) continue;
        items[n++] = p;
      }
      items.length = n;
    }

    _draw() {
      const ctx = this.ctx;
      const dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      const fall = this.fallPx();
      // Far layers first so near particles draw on top.
      for (let layer = 0; layer < 3; layer++) {
        for (const p of this.items) {
          if (p.layer !== layer) continue;
          const t = p.age / p.life;
          let alpha = p.alpha;
          if (p.twinkle) alpha *= Math.sin(Math.PI * t);
          else if (p.fade) alpha *= t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1;
          else alpha *= t > 0.8 ? (1 - t) / 0.2 : 1;
          if (!p.ambient && p.y > fall * 0.9) alpha *= clamp((fall + 40 - p.y) / (fall * 0.1 + 40), 0, 1);
          if (alpha <= 0.01) continue;
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
          ctx.rotate(p.rot);
          if (p.kind === 'rect') {
            const sx = Math.cos(p.age * p.wobble + p.phase); // 3D-ish flip around the vertical axis
            ctx.scale(Math.max(0.15, Math.abs(sx)), 1);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          } else if (p.kind === 'spark') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const s = this._sprite(p.text, p.size);
            if (s) ctx.drawImage(s.canvas, -s.size / 2, -s.size / 2, s.size, s.size);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // ------------------------------------------------------------------ renderer
  class Renderer {
    constructor(root) {
      this.root = root;
      this.audioCtx = null;
      this._volume = 0.8;
      this.stats = { fires: 0, sounds: 0, fileSounds: 0, scenes: 0, combos: 0, particles: 0, fps: 60, frameMs: 0, reduced: 0, canvas: false };
      /** Id of the scene currently on stage (null = none). */
      this.currentScene = null;
      /** Name of the running ambient loop (null = none). */
      this.loopName = null;
      /** Optional hook `(sceneId|null) => void`, called whenever the scene changes or clears. */
      this.onScene = null;
      /** Active theme name (see THEMES); `setTheme` mirrors it to `body[data-theme]`. */
      this.theme = 'neon';
      this._scene = null; // { id, el, spawnTimer, clearTimer }
      this._loop = null; // { name, handle, gain }
      this._timers = new Set(); // combo step timers
      this.particles = new ParticleLayer(root, this.stats);
      this.stats.canvas = this.particles.ok;
      if (typeof document !== 'undefined' && document.body && document.body.dataset && themes().includes(document.body.dataset.theme)) this.theme = document.body.dataset.theme;
    }

    /** 0..1; also applied live to the running ambient loop through its GainNode and the v2 mixer master. */
    get volume() {
      return this._volume;
    }
    set volume(v) {
      const n = Number(v);
      this._volume = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : this._volume;
      if (this._loop && this._loop.gain && this.audioCtx) {
        try {
          const g = this._loop.gain.gain;
          g.cancelScheduledValues(this.audioCtx.currentTime);
          g.setTargetAtTime(this._volume, this.audioCtx.currentTime, 0.05);
        } catch (_) {
          /* ignore */
        }
      }
      const mixer = this._mixer();
      if (mixer && typeof mixer.setMaster === 'function') {
        this._mixerSynced = mixer;
        try {
          mixer.setMaster(this._volume);
        } catch (_) {
          /* ignore */
        }
      }
    }

    /** Audio engine v2 (`LiveFXSounds.mixer`) when present, else null. */
    _mixer() {
      const s = global.LiveFXSounds;
      return s && s.mixer && typeof s.mixer.play === 'function' ? s.mixer : null;
    }

    /** Overlay theme: one of THEMES -> `body[data-theme]` (neon = default look). Returns the active name. */
    setTheme(name) {
      const list = themes();
      const t = list.includes(name) ? name : 'neon';
      this.theme = t;
      if (typeof document !== 'undefined' && document.body) {
        if (t === 'neon') delete document.body.dataset.theme;
        else document.body.dataset.theme = t;
        document.body.classList.toggle('fx-themed', t !== 'neon');
      }
      return t;
    }

    ensureAudio() {
      if (!this.audioCtx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) {
          try {
            this.audioCtx = new AC();
          } catch (_) {
            this.audioCtx = null;
          }
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
      return this.audioCtx;
    }

    /**
     * `spec` is a builtin name ("airhorn"), "file:assets/x.mp3" or "loop:rain". Unknown specs are ignored.
     * `opts.gain` (0..1, default 1) multiplies the master volume, `opts.pan` (-1..1) and `opts.intensity`
     * reach the v2 mixer (`LiveFXSounds.mixer.play`) when it exists; the old `LiveFXSounds.play` otherwise.
     */
    playSound(spec, opts = {}) {
      const parsed = parseSound(spec);
      if (!parsed) return;
      const gain = Number.isFinite(Number(opts.gain)) ? clamp(Number(opts.gain), 0, 1) : 1;
      const level = this.volume * gain;
      if (parsed.kind === 'loop') {
        this.playLoop(parsed.name);
        return;
      }
      if (parsed.kind === 'builtin') {
        const mixer = this._mixer();
        if (mixer) {
          if (this._mixerSynced !== mixer && typeof mixer.setMaster === 'function') {
            this._mixerSynced = mixer;
            try {
              mixer.setMaster(this.volume);
            } catch (_) {
              /* ignore */
            }
          }
          try {
            mixer.play(parsed.name, { gain, pan: clamp(Number(opts.pan) || 0, -1, 1), intensity: clamp(Number(opts.intensity) || 1, 1, 3) });
            this.stats.sounds++;
          } catch (_) {
            /* unknown builtin name */
          }
          return;
        }
        const ctx = this.ensureAudio();
        if (!ctx || !global.LiveFXSounds || typeof global.LiveFXSounds.play !== 'function') return;
        try {
          global.LiveFXSounds.play(parsed.name, ctx, ctx.destination, level);
          this.stats.sounds++;
        } catch (_) {
          /* unknown builtin name */
        }
        return;
      }
      this.playFile(parsed.url, gain);
    }

    playFile(url, gain = 1) {
      if (typeof document === 'undefined' || typeof Audio === 'undefined') return;
      const level = clamp(this.volume * (Number.isFinite(Number(gain)) ? clamp(Number(gain), 0, 1) : 1), 0, 1);
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.setAttribute('src', url); // relative: works for http(s) and inside OBS
      audio.style.display = 'none';
      this.root.appendChild(audio);
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          audio.pause();
        } catch (_) {
          /* ignore */
        }
        audio.remove();
      };
      const timer = setTimeout(cleanup, FILE_SOUND_MAX_MS);
      audio.addEventListener('ended', cleanup);
      audio.addEventListener('error', cleanup);

      const ctx = this.ensureAudio();
      let routed = false;
      if (ctx && typeof ctx.createMediaElementSource === 'function') {
        try {
          const src = ctx.createMediaElementSource(audio);
          const g = ctx.createGain();
          g.gain.value = level;
          src.connect(g).connect(ctx.destination);
          routed = true;
        } catch (_) {
          routed = false;
        }
      }
      if (!routed) audio.volume = level;
      this.stats.fileSounds++;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    /** Stereo position of a visual: -1 left .. 1 right (center 0; rain/confetti band and lower-third lean). */
    _pan(v) {
      if (!v) return 0;
      if (v.kind === 'lower-third') return -0.6;
      if (v.kind === 'rain' || v.kind === 'confetti' || v.kind === 'sticker') {
        const w = (this.root && this.root.clientWidth) || global.innerWidth || 1;
        const x0 = cssLengthPx('--fx-x0', 0, w);
        const span = cssLengthPx('--fx-xspan', w, w);
        const centre = (x0 + span / 2) / w - 0.5; // -0.5 .. 0.5
        return clamp(centre * 1.2, -0.6, 0.6);
      }
      return 0;
    }

    fire(trigger) {
      if (!trigger || typeof trigger !== 'object') return;
      this.stats.fires++;
      const v = trigger.visual && typeof trigger.visual === 'object' ? trigger.visual : {};
      const gain = Number.isFinite(Number(trigger.gain)) ? clamp(Number(trigger.gain), 0, 1) : 1;
      const intensity = intensityOf(v, v.kind === 'scene' ? 2 : 1);
      if (trigger.sound) this.playSound(trigger.sound, { gain, pan: this._pan(v), intensity });
      switch (v.kind) {
        case 'scene':
          this.scene(v);
          break;
        case 'sticker':
          this.sticker(v);
          break;
        case 'rain':
          this.rain(v);
          break;
        case 'banner':
          this.banner(v);
          break;
        case 'confetti':
          this.confetti(v);
          break;
        case 'image':
          this.image(v);
          break;
        case 'text':
          this.text(v);
          break;
        case 'lower-third':
          this.lowerThird(v);
          break;
        case 'combo':
          this.combo(v, gain);
          break;
        case 'card':
        default:
          this.card(v);
      }
      if (v.shake) this.shake();
      if (v.impact) this.impact();
    }

    /**
     * Cancels scheduled combo steps, clears canvas particles and removes transient effect nodes
     * (cards, banners, text, drops …). The scene layer and the ambient loop stay.
     */
    clear() {
      for (const t of this._timers) clearTimeout(t);
      this._timers.clear();
      this.particles.clear();
      for (const el of Array.from(this.root.children)) {
        if (el.classList.contains('fx-scene') || el.classList.contains('fx-canvas') || el.tagName === 'AUDIO') continue;
        el.remove();
      }
      this.root.classList.remove('fx-impact', 'fx-shake');
    }

    _spawn(el, ms, animName) {
      let done = false;
      const remove = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.remove();
      };
      const timer = setTimeout(remove, ms);
      if (animName) {
        el.addEventListener('animationend', (e) => {
          if (e.target === el && e.animationName === animName) remove();
        });
      }
      this.root.appendChild(el);
    }

    /**
     * v2 decoration shared by card-like elements: `.fx-glow` (glow layers), `.fx-tilt` (3D card),
     * `.fx-blur-in` (entry motion blur) and, at intensity >= 2, light rays + explosion ring behind the
     * content plus a spark burst on the canvas (intensity 3).
     */
    _decorate(el, v, opts = {}) {
      const intensity = intensityOf(v, 1);
      el.classList.add('fx-blur-in');
      if (v && v.glow) el.classList.add('fx-glow');
      if (v && v.tilt && opts.tilt !== false) el.classList.add('fx-tilt');
      el.style.setProperty('--fx-i', String(intensity));
      if (intensity >= 2 && opts.rays !== false) {
        const rays = document.createElement('div');
        rays.className = 'fx-rays';
        const ring = document.createElement('div');
        ring.className = 'fx-ring';
        el.prepend(ring);
        el.prepend(rays);
        el.classList.add('fx-has-rays');
        if (intensity >= 3 && this.particles.ok) {
          const w = this.root.clientWidth || global.innerWidth || 1;
          const h = this.root.clientHeight || global.innerHeight || 1;
          const top = v && v.position === 'top' ? 0.28 : v && v.position === 'safe' && document.body.classList.contains('layout-portrait') ? 0.32 : 0.5;
          this.particles.setCap(intensity);
          this.particles.sparks(w / 2, h * top, 40, safeColor(v && v.color) || '#ffd166');
        }
      }
      return el;
    }

    card(v) {
      const el = document.createElement('div');
      el.className = `fx-card ${posClass(v)}`;
      const bg = safeColor(v.bg);
      const color = safeColor(v.color);
      if (bg) el.style.background = bg;
      if (color) el.style.color = color;
      el.innerHTML = `<div class="fx-emoji">${escapeHtml(v.emoji || '')}</div>${v.text ? `<div class="fx-text">${escapeHtml(v.text)}</div>` : ''}`;
      this._decorate(el, v);
      this._spawn(el, CARD_MS, v.tilt ? 'fx-pop-tilt' : 'fx-pop');
    }

    image(v) {
      const src = safeSrc(v.src);
      if (!src) {
        console.warn('LiveFX: image source rejected, rendering card instead:', String(v.src).slice(0, 80));
        this.card({ emoji: v.emoji || '🖼️', text: v.text, position: v.position, glow: v.glow, tilt: v.tilt, intensity: v.intensity });
        return;
      }
      const el = document.createElement('div');
      el.className = `fx-card fx-card-image ${posClass(v)}`;
      const img = document.createElement('img');
      img.alt = '';
      img.setAttribute('src', src);
      el.appendChild(img);
      if (v.text) {
        const t = document.createElement('div');
        t.className = 'fx-text';
        t.textContent = String(v.text);
        el.appendChild(t);
      }
      this._decorate(el, v);
      this._spawn(el, 2800, v.tilt ? 'fx-pop-tilt' : 'fx-pop');
    }

    banner(v) {
      const el = document.createElement('div');
      el.className = `fx-banner ${posClass(v)}`;
      const emoji = escapeHtml(v.emoji || '');
      el.innerHTML = `<span>${emoji}</span> ${escapeHtml(v.text || '')} <span>${emoji}</span>`;
      const color = safeColor(v.color);
      if (color) el.style.setProperty('--fx-accent', color);
      this._decorate(el, v, { tilt: false, rays: false });
      this._spawn(el, 3200, 'fx-slide');
    }

    /**
     * Emoji rain: `count` DOM drops (`.fx-drop`, --x positioned, CSS fall) plus – when the canvas is
     * available – a burst of `count × intensity × 2` canvas emoji with gravity, wind, drift and rotation.
     */
    rain(v) {
      let count = Math.round(Number(v.count));
      if (!Number.isFinite(count) || count < 1) count = 20;
      count = Math.min(rainMax(), count);
      const emoji = typeof v.emoji === 'string' && v.emoji ? v.emoji : '✨';
      const intensity = intensityOf(v, 1);
      const frag = document.createDocumentFragment();
      const drops = [];
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-drop';
        el.textContent = emoji;
        placeX(el);
        el.style.fontSize = `${rand(28, 72)}px`;
        el.style.animationDuration = `${rand(1.8, 3.2)}s`;
        el.style.animationDelay = `${rand(0, 0.9)}s`;
        if (v.glow) el.classList.add('fx-glow');
        frag.appendChild(el);
        drops.push(el);
      }
      this.root.appendChild(frag); // one DOM write for the whole batch
      setTimeout(() => drops.forEach((el) => el.remove()), 4500);
      if (this.particles.ok) {
        this.particles.ensureOrder();
        this.particles.setCap(intensity);
        this.particles.rain(graphemes(emoji)[0] || emoji, Math.min(this.particles.cap, count * intensity * 2));
      }
    }

    /** Confetti on the canvas (90 × intensity rotating rects, gravity/wind/wobble); DOM `.fx-confetti` fallback. */
    confetti(v) {
      const intensity = intensityOf(v, 1);
      if (this.particles.ok) {
        this.particles.ensureOrder();
        this.particles.setCap(intensity);
        this.particles.confetti(Math.min(this.particles.cap, CONFETTI_COUNT * intensity), CONFETTI_COLORS);
      } else {
        const frag = document.createDocumentFragment();
        const list = [];
        for (let i = 0; i < CONFETTI_COUNT; i++) {
          const el = document.createElement('div');
          el.className = 'fx-confetti';
          placeX(el);
          el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          el.style.animationDuration = `${rand(2, 3.5)}s`;
          el.style.animationDelay = `${rand(0, 0.6)}s`;
          el.style.transform = `rotate(${rand(0, 360)}deg)`;
          frag.appendChild(el);
          list.push(el);
        }
        this.root.appendChild(frag);
        setTimeout(() => list.forEach((el) => el.remove()), 4500);
      }
      if (v.emoji || v.text) this.card({ emoji: v.emoji, text: v.text, bg: 'rgba(0,0,0,.75)', color: '#fff', position: v.position, glow: v.glow, tilt: v.tilt, intensity: v.intensity });
    }

    /**
     * Big animated word: one `span.fx-letter` per grapheme (staggered through --i), styles neon (pulsing glow),
     * gradient (animated background-clip), bounce and glitch (clip-path jitter on ::before/::after). 3 s.
     */
    text(v) {
      const raw = typeof v.text === 'string' ? v.text.trim() : '';
      if (!raw) {
        this.card({ emoji: v.emoji || '💬', position: v.position, glow: v.glow, intensity: v.intensity });
        return;
      }
      const style = TEXT_STYLES.includes(v.style) ? v.style : 'neon';
      const letters = graphemes(raw, true).slice(0, TEXT_MAX_LETTERS);
      const el = document.createElement('div');
      el.className = `fx-bigtext fx-text-${style} ${posClass(v)}`;
      const c1 = safeColor(v.color);
      const c2 = safeColor(v.color2);
      if (c1) el.style.setProperty('--c1', c1);
      if (c2) el.style.setProperty('--c2', c2);
      const word = document.createElement('div');
      word.className = 'fx-word';
      word.setAttribute('data-text', letters.join('')); // glitch layers read attr(data-text); attribute = escaped by DOM
      // Letters of one word sit in a nowrap `span.fx-w`, so lines only break at spaces.
      let group = null;
      letters.forEach((g, i) => {
        const span = document.createElement('span');
        span.className = 'fx-letter';
        span.style.setProperty('--i', String(i));
        if (g.trim() === '') {
          span.classList.add('fx-space');
          span.textContent = '\u00a0';
          word.appendChild(span);
          group = null;
          return;
        }
        if (!group) {
          group = document.createElement('span');
          group.className = 'fx-w';
          word.appendChild(group);
        }
        span.textContent = g;
        group.appendChild(span);
      });
      el.appendChild(word);
      if (v.emoji) {
        const e = document.createElement('div');
        e.className = 'fx-emoji';
        e.textContent = String(v.emoji);
        el.prepend(e);
      }
      this._decorate(el, { ...v, glow: v.glow || style === 'neon' }, { tilt: false });
      this._spawn(el, TEXT_MS, 'fx-bigtext-life');
    }

    /**
     * Lower third: bottom-left bar with title + subtitle sliding in, 4 s. Landscape only – in portrait
     * (body.layout-portrait) the chat covers that corner, so it falls back to a banner with the title.
     */
    lowerThird(v) {
      const title = typeof v.title === 'string' && v.title.trim() ? v.title.trim() : typeof v.text === 'string' ? v.text.trim() : '';
      const subtitle = typeof v.subtitle === 'string' ? v.subtitle.trim() : '';
      if (document.body.classList.contains('layout-portrait')) {
        this.banner({ emoji: v.emoji, text: subtitle ? `${title} · ${subtitle}` : title, position: v.position, color: v.color, glow: v.glow, intensity: v.intensity });
        return;
      }
      const el = document.createElement('div');
      el.className = 'fx-lower-third';
      const color = safeColor(v.color);
      if (color) el.style.setProperty('--fx-accent', color);
      const bar = document.createElement('div');
      bar.className = 'fx-lt-bar';
      if (v.emoji) {
        const e = document.createElement('div');
        e.className = 'fx-lt-emoji';
        e.textContent = String(v.emoji);
        bar.appendChild(e);
      }
      const txt = document.createElement('div');
      txt.className = 'fx-lt-text';
      const t = document.createElement('div');
      t.className = 'fx-lt-title';
      t.textContent = title || '…';
      txt.appendChild(t);
      if (subtitle) {
        const s = document.createElement('div');
        s.className = 'fx-lt-subtitle';
        s.textContent = subtitle;
        txt.appendChild(s);
      }
      bar.appendChild(txt);
      el.appendChild(bar);
      this._decorate(el, v, { tilt: false, rays: false });
      this._spawn(el, LOWER_THIRD_MS, 'fx-lt-life');
    }

    /**
     * Combo: every step `{delay, visual, sound?}` is scheduled with setTimeout and fired through the same
     * `fire` path (so sounds, decoration and stats behave exactly like a direct trigger). `renderer.clear()`
     * cancels pending steps. Steps are capped at 6 and may not contain a combo themselves.
     */
    combo(v, gain = 1) {
      const steps = Array.isArray(v.steps) ? v.steps.slice(0, 6) : [];
      if (!steps.length) {
        this.card({ emoji: v.emoji || '🎬', text: v.text, position: v.position });
        return;
      }
      this.stats.combos++;
      steps.forEach((s) => {
        if (!s || typeof s !== 'object') return;
        const sv = s.visual && typeof s.visual === 'object' ? s.visual : {};
        if (sv.kind === 'combo') return; // never recurse
        let delay = Number(s.delay);
        if (!Number.isFinite(delay) || delay < 0) delay = 0;
        const t = setTimeout(() => {
          this._timers.delete(t);
          this.fire({ id: 'combo-step', gain, sound: typeof s.sound === 'string' ? s.sound : null, visual: sv });
        }, Math.min(10000, delay));
        this._timers.add(t);
      });
    }

    /**
     * Ambient loop through `LiveFXSounds.loop(name, ctx, out, volume) -> {stop(fadeSec)}`. Only one loop runs at a
     * time: a new name fades the old one out (1.5 s) and the new one in; the same name again is a no-op.
     * Without `LiveFXSounds.loop` (older sounds.js) or without WebAudio this is a silent no-op.
     */
    playLoop(name) {
      const sounds = global.LiveFXSounds;
      if (!sounds || typeof sounds.loop !== 'function' || typeof name !== 'string' || !name) return false;
      if (this._loop && this._loop.name === name) return true;
      const ctx = this.ensureAudio();
      if (!ctx) return false;
      this.stopLoop(LOOP_FADE_SEC);
      let gain;
      let handle;
      try {
        gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this._volume, now + LOOP_FADE_SEC);
        gain.connect(ctx.destination);
        handle = sounds.loop(name, ctx, gain, 1);
      } catch (_) {
        handle = null;
      }
      if (!handle || typeof handle.stop !== 'function') {
        try {
          if (gain) gain.disconnect();
        } catch (_) {
          /* ignore */
        }
        return false;
      }
      this._loop = { name, handle, gain };
      this.loopName = name;
      return true;
    }

    /** Fades the running loop out (default 1.5 s) and forgets it. Safe to call when nothing plays. */
    stopLoop(fadeSec = LOOP_FADE_SEC) {
      const loop = this._loop;
      this._loop = null;
      this.loopName = null;
      if (!loop) return;
      const fade = Number.isFinite(fadeSec) && fadeSec >= 0 ? fadeSec : LOOP_FADE_SEC;
      const ctx = this.audioCtx;
      try {
        if (ctx && loop.gain) {
          const g = loop.gain.gain;
          g.cancelScheduledValues(ctx.currentTime);
          g.setValueAtTime(g.value, ctx.currentTime);
          g.linearRampToValueAtTime(0, ctx.currentTime + fade);
        }
      } catch (_) {
        /* ignore */
      }
      try {
        loop.handle.stop(fade);
      } catch (_) {
        /* ignore */
      }
      setTimeout(() => {
        try {
          loop.gain.disconnect();
        } catch (_) {
          /* ignore */
        }
      }, fade * 1000 + 200);
    }

    /**
     * Persistent scene layer `#stage .fx-scene[data-scene=id]` (first child, so effects draw above it).
     * Switching scenes crossfades over 800 ms (old layer gets `.fx-scene-out`, then is removed); the same
     * scene again only updates the caption. `scene: 'clear'` fades out and stops the ambient loop.
     * `duration` > 0 seconds auto-clears. Particles are spawned by an interval that dies with the layer;
     * v2 adds three parallax emoji layers on the canvas (far / mid / near) for the same scene.
     */
    scene(v) {
      const id = v && typeof v.scene === 'string' ? v.scene : '';
      if (!scenes().includes(id)) {
        console.warn('LiveFX: unknown scene, rendering card instead:', String(id).slice(0, 20));
        this.card({ emoji: v && v.emoji, text: v && v.text, position: v && v.position });
        return;
      }
      this.stats.scenes++;
      if (id === 'clear') {
        this.clearScene();
        this.stopLoop();
        return;
      }
      const cur = this._scene;
      if (cur && cur.id === id) {
        this._sceneCaption(cur.el, v);
        this._sceneDuration(cur, v);
        return;
      }
      if (cur) this._fadeOutScene(cur);

      const def = SCENE_DEFS[id] || { particles: [] };
      const el = document.createElement('div');
      el.className = `fx-scene fx-scene-${id}`;
      el.dataset.scene = id;
      const bg = document.createElement('div');
      bg.className = 'fx-scene-bg';
      const l1 = document.createElement('div');
      l1.className = 'fx-scene-layer fx-scene-l1';
      const l2 = document.createElement('div');
      l2.className = 'fx-scene-layer fx-scene-l2';
      const fx = document.createElement('div');
      fx.className = 'fx-scene-fx';
      el.append(bg, l1, l2, fx);
      if (def.decor) {
        const d = document.createElement('div');
        d.className = 'fx-scene-decor';
        d.textContent = def.decor;
        el.appendChild(d);
      }
      if (def.ground) {
        const g = document.createElement('div');
        g.className = 'fx-scene-ground';
        g.textContent = def.ground;
        el.appendChild(g);
      }
      const particles = document.createElement('div');
      particles.className = 'fx-scene-particles';
      el.appendChild(particles);

      this.root.insertBefore(el, this.root.firstChild);
      void el.offsetWidth; // commit opacity 0 before the transition to 1
      el.classList.add('fx-scene-on');

      const entry = { id, el, particles, spawnTimer: null, clearTimer: null };
      this._scene = entry;
      this.currentScene = id;
      this._sceneCaption(el, v);
      this._startParticles(entry, def, v);
      this._sceneDuration(entry, v);
      if (typeof this.onScene === 'function') this.onScene(id);
    }

    /** Fades the current scene out (if any). Does not touch the ambient loop. */
    clearScene() {
      const cur = this._scene;
      this._scene = null;
      this.currentScene = null;
      this.particles.clearAmbient();
      if (!cur) return;
      this._fadeOutScene(cur);
      if (typeof this.onScene === 'function') this.onScene(null);
    }

    _fadeOutScene(entry) {
      clearInterval(entry.spawnTimer);
      clearTimeout(entry.clearTimer);
      entry.el.classList.add('fx-scene-out');
      setTimeout(() => entry.el.remove(), SCENE_FADE_MS + 50);
    }

    _sceneCaption(el, v) {
      const old = el.querySelector('.fx-scene-caption');
      if (old) old.remove();
      const text = v && typeof v.text === 'string' ? v.text.trim() : '';
      if (!text || (v && v.caption === false)) return;
      const cap = document.createElement('div');
      cap.className = 'fx-scene-caption';
      cap.textContent = text; // escaped by construction (text node)
      el.appendChild(cap);
    }

    _sceneDuration(entry, v) {
      clearTimeout(entry.clearTimer);
      entry.clearTimer = null;
      const d = v ? Number(v.duration) : 0;
      if (!Number.isFinite(d) || d <= 0) return;
      entry.clearTimer = setTimeout(() => {
        if (this._scene !== entry) return;
        this.clearScene();
        this.stopLoop();
      }, d * 1000);
    }

    _startParticles(entry, def, v) {
      const list = Array.isArray(def.particles) ? def.particles : [];
      if (!list.length) {
        this.particles.clearAmbient();
        return;
      }
      const intensity = intensityOf(v, 2);
      const override = v && typeof v.emoji === 'string' && v.emoji.trim() ? graphemes(v.emoji).slice(0, 4) : null;
      const every = Math.max(40, Math.round((def.every || 400) * (2 / intensity)));
      const spawn = () => {
        if (!entry.el.isConnected) {
          clearInterval(entry.spawnTimer);
          return;
        }
        if (entry.particles.childElementCount >= SCENE_PARTICLE_CAP) return;
        const p = pickWeighted(list);
        const el = document.createElement('div');
        el.className = `fx-particle fx-particle-${p.mode}`;
        el.textContent = override ? override[Math.floor(Math.random() * override.length)] : p.emoji;
        placeX(el);
        el.style.setProperty('--y', `${rand(4, 70)}%`);
        el.style.fontSize = `${rand(p.size[0], p.size[1])}px`;
        const dur = rand(p.dur[0], p.dur[1]);
        el.style.animationDuration = `${dur}s`;
        if (Math.random() < 0.5) el.style.setProperty('--flip', '-1');
        entry.particles.appendChild(el);
        setTimeout(() => el.remove(), dur * 1000 + 100);
      };
      spawn();
      entry.spawnTimer = setInterval(spawn, every);
      // Canvas parallax layers for the same scene (no-op without canvas).
      this.particles.ensureOrder();
      this.particles.setCap(intensity);
      this.particles.clearAmbient();
      this.particles.setAmbient(def, intensity, override);
    }

    /** 2-4 emojis in a row with a staggered bounce, optional text below. 2.8 s. */
    sticker(v) {
      const list = graphemes(v && v.emoji).slice(0, STICKER_MAX);
      if (!list.length) list.push('⭐');
      const el = document.createElement('div');
      el.className = `fx-sticker ${posClass(v)}`;
      const row = document.createElement('div');
      row.className = 'fx-sticker-row';
      list.forEach((g, i) => {
        const span = document.createElement('span');
        span.className = 'fx-sticker-emoji';
        span.style.setProperty('--i', String(i));
        span.textContent = g;
        row.appendChild(span);
      });
      el.appendChild(row);
      if (v && v.text) {
        const t = document.createElement('div');
        t.className = 'fx-text';
        t.textContent = String(v.text);
        el.appendChild(t);
      }
      this._decorate(el, v, { tilt: false });
      this._spawn(el, STICKER_MS, 'fx-sticker-life');
    }

    shake() {
      this.root.classList.remove('fx-shake');
      void this.root.offsetWidth; // restart animation
      this.root.classList.add('fx-shake');
      const flash = document.createElement('div');
      flash.className = 'fx-flash';
      this._spawn(flash, 400, 'fx-flash');
    }

    /** Stage zoom bump: #stage scale 1 -> 1.04 -> 1 in 250 ms (`.fx-impact`). */
    impact() {
      const root = this.root;
      root.classList.remove('fx-impact');
      void root.offsetWidth;
      root.classList.add('fx-impact');
      clearTimeout(this._impactTimer);
      this._impactTimer = setTimeout(() => root.classList.remove('fx-impact'), 300);
      const mixer = this._mixer();
      if (mixer && typeof mixer.duck === 'function') {
        try {
          mixer.duck(250);
        } catch (_) {
          /* ignore */
        }
      }
    }
  }

  global.LiveFXRenderer = { Renderer, ParticleLayer, escapeHtml, THEMES, TEXT_STYLES };
})(typeof window !== 'undefined' ? window : globalThis);
