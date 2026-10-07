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
// LiveFX 2.1 (performance, see docs/PERFORMANCE.md):
//   - single render path: rain and scene particles draw on the canvas only (DOM `.fx-drop` / `.fx-particle`
//     only as fallback without canvas); a rain leaves one cheap `.fx-rain[data-count]` marker in the DOM
//   - light rays + explosion ring (intensity >= 2) draw on the canvas: the rays are one pre-rendered 512 px
//     sprite per theme colour, the ring a stroked circle – no 1400 px DOM layers (DOM `.fx-rays` / `.fx-ring`
//     only as fallback without canvas)
//   - performance mode `renderer.setPerf('auto' | 'eco' | 'high')` -> `renderer.perf` (requested mode),
//     `renderer.perfActive` (look in use), `body[data-perf]` (= perfActive) and `body[data-perf-mode]`;
//     auto starts high and switches to eco for good after 30 consecutive slow frames (stats.perfSwitches)
// LiveFX 2.2 (story band, docs/STORY.md):
//   - `renderer.setLayout({storyLayout, band, zone})`: scenes live in `#stage > .fx-band[data-layout]` (band = bottom
//     strip of `--fx-band` height, frame = 30 % box bottom-right, full = whole frame); the camera above stays untouched
//     (canvas parallax / actors are clipped to the band rect). `zone` (full | edges | bottom | top) moves transient
//     effects: rain / confetti spawn in the edge columns (`--fx-edge`), cards / text / stickers / banners alternate
//     between the left and right column (`.fx-col-left|right`), `bottom` puts them into the band (`.fx-in-band`),
//     `top` pins them to the top strip; flash + impact zoom only in zone `full`.
//   - live story: `renderer.story(state)` (state from js/story-director.js or a `story-state` message) switches the
//     scene, plays the suggested ambient loop, draws emoji actors that walk in / out on the canvas inside the band
//     and tints the band by mood; the band fades after `renderer.storyIdleMs` (60 s) without `storyTouch()`.
//   - three volume levels `renderer.setVolume('master'|'sfx'|'ambient', v)` -> mixer master / busses; loops run on
//     the mixer's ambient bus (ducking + limiter) – the old GainNode-to-destination path stays only as fallback.
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
  // Fallback when schema.js is missing; the live list is LiveFXSchema.TEXT_STYLES (see textStyles()).
  const TEXT_STYLES = ['neon', 'gradient', 'bounce', 'glitch', 'sticker'];
  const FALLBACK_SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear'];
  // Particle layer: cap per intensity, auto-reduce when a frame takes longer than 20 ms for 30 frames in a row.
  const PARTICLE_CAP = { 1: 400, 2: 800, 3: 1200 };
  const PARTICLE_CAP_MIN = 120;
  const SLOW_FRAME_MS = 20;
  const SLOW_FRAMES = 30;
  const AMBIENT_CAP = { 1: 40, 2: 70, 3: 110 };
  const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];
  // Performance mode (2.1): eco halves particle caps, drops glow / rays / entry motion / impact zoom,
  // confetti = 45 pieces, glitch text renders as neon, stickers do not bounce.
  const PERF_MODES = ['auto', 'eco', 'high'];
  const ECO_CONFETTI = 45;
  const RAIN_MARK_MS = 4500;
  const RAYS_SPRITE_PX = 512;
  const PERF_CALIBRATE_FRAMES = 20;
  const FLARE_MAX = { rays: 2, ring: 3 };
  // 2.2 story band / zones / volumes (fallbacks when schema.js is missing; the live lists are in LiveFXSchema).
  const STORY_LAYOUTS = ['band', 'full', 'frame'];
  const ZONES = ['full', 'edges', 'bottom', 'top'];
  const VOLUME_BUSES = ['master', 'sfx', 'ambient'];
  const VOLUME_DEFAULTS = { master: 0.5, sfx: 0.8, ambient: 0.5 };
  const STORY_IDLE_MS = 60000;
  const ACTOR_SLOTS = [0.3, 0.7, 0.5, 0.15, 0.85, 0.42];
  const PROP_SLOTS = [0.78, 0.22, 0.6, 0.08, 0.92];
  const ACTOR_FADE = 0.6;
  // Scene -> ambient loop suggestion when a `story-state` carries no `loop` (js/story-director.js has the same table).
  const LOOP_BY_SCENE = { rain: 'rain', storm: 'storm', night: 'nightCrickets', forest: 'birds', sea: 'sea', fire: 'fireplace', castle: 'wind', snow: 'wind', desert: 'wind', city: 'cityHum', space: 'spaceDrone', sunrise: 'birds' };

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
    assetImageRe: /^(?:assets\/[a-z0-9][a-z0-9._-]{0,99}\.(?:png|jpe?g|gif|webp)|memes\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.(?:webp|png))$/i,
    // same as LiveFXSchema.HOTLINK_SRC_RE: KLIPY / GIPHY media hosts only, https, no userinfo / port
    hotlinkSrcRe: /^https:\/\/(?:(?:[a-z0-9-]{1,63}\.)?klipy\.com|(?:media[0-9]?|i)\.giphy\.com)\/[^\s"'<>\\]{1,480}$/i,
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
  const hotlinkSrcRe = () => (schema() && (schema().HOTLINK_SRC_RE || schema().HTTP_SRC_RE)) || FALLBACK.hotlinkSrcRe;
  const textStyles = () => {
    const list = schema() && schema().TEXT_STYLES;
    return Array.isArray(list) && list.length ? list : TEXT_STYLES;
  };
  const colorRe = () => (schema() && schema().COLOR_RE) || FALLBACK.colorRe;
  const storyLayouts = () => (schema() && schema().STORY_LAYOUTS) || STORY_LAYOUTS;
  const zones = () => (schema() && schema().ZONES) || ZONES;
  const volumeDefaults = () => (schema() && schema().VOLUME_DEFAULTS) || VOLUME_DEFAULTS;
  const bandLimits = () => {
    const L = schema() && schema().LIMITS;
    return [(L && L.bandMin) || 15, (L && L.bandMax) || 35];
  };
  const LAYOUT_DEFAULTS = { storyLayout: 'band', band: 22, zone: 'edges' };
  /** `LiveFXSchema.normalizeLayout` when present, else the same merge locally (partial onto base). */
  function normalizeLayoutLocal(raw, base) {
    const S = schema();
    if (S && typeof S.normalizeLayout === 'function') return S.normalizeLayout(raw, base || S.LAYOUT_DEFAULTS);
    const r = raw && typeof raw === 'object' ? raw : {};
    const b = base && typeof base === 'object' ? base : LAYOUT_DEFAULTS;
    const [min, max] = bandLimits();
    const n = Number(r.band);
    return {
      storyLayout: storyLayouts().includes(r.storyLayout) ? r.storyLayout : storyLayouts().includes(b.storyLayout) ? b.storyLayout : 'band',
      band: Number.isFinite(n) ? Math.round(clamp(n, min, max)) : Number.isFinite(Number(b.band)) ? Number(b.band) : LAYOUT_DEFAULTS.band,
      zone: zones().includes(r.zone) ? r.zone : zones().includes(b.zone) ? b.zone : 'edges',
    };
  }

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
    if ((assetImageRe().test(s) && !s.includes('..')) || hotlinkSrcRe().test(s)) return s;
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
  function placeX(el, zone) {
    const x = zoneX(zone);
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

  /** Current effect zone from body[data-zone] (set by Renderer.setLayout). */
  function bodyZone() {
    const z = typeof document !== 'undefined' && document.body && document.body.dataset ? document.body.dataset.zone : '';
    return zones().includes(z) ? z : 'full';
  }

  /** Edge column width as a fraction of the stage width (--fx-edge, default 22 %, portrait 30 %). */
  function edgeFraction(w) {
    const px = cssLengthPx('--fx-edge', 0.22 * w, w);
    return clamp(px / Math.max(1, w), 0.08, 0.45);
  }

  /** Horizontal spawn fraction 0..1 for a falling thing: zone `edges` keeps it in the left / right column. */
  function zoneX(zone) {
    const z = zone || bodyZone();
    if (z !== 'edges') return Math.random();
    const w = (typeof global.innerWidth === 'number' && global.innerWidth) || 1;
    const e = edgeFraction(w);
    const r = Math.random() * e;
    return Math.random() < 0.5 ? r : 1 - e + r;
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
      this.eco = false; // performance mode eco: half caps
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
      /** Story band rect in canvas px `{x0, y0, w, h}` (null = whole canvas / --fx-fall semantics). */
      this.rect = null;
      this.bandEl = null; // `.fx-band` element the rect is read from
      this.zone = 'full';
      /** Story actors (emoji sprites walking in / out inside the band) and static props. */
      this.actors = [];
      this.props = [];
      this._rectAt = 0;
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
      while (idx < kids.length && (kids[idx].classList.contains('fx-scene') || kids[idx].classList.contains('fx-band'))) idx++;
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
      this.updateRect();
    }

    /**
     * Story band geometry: with a `.fx-band` element that is not `full`, the scene rect is its box (canvas px);
     * otherwise the old whole-frame semantics apply (`--fx-x0` / `--fx-xspan` wide, `--fx-fall` high).
     */
    setBand(el, layout, zone) {
      this.bandEl = el || null;
      this.layoutMode = storyLayouts().includes(layout) ? layout : 'band';
      this.zone = zones().includes(zone) ? zone : 'full';
      this.updateRect();
      this._rectAt = 0;
    }

    updateRect() {
      this._rectAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const el = this.bandEl;
      if (!el || this.layoutMode === 'full' || typeof el.getBoundingClientRect !== 'function') {
        this.rect = null;
        return null;
      }
      const r = el.getBoundingClientRect();
      const c = this.canvas && this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
      if (!r.width || !r.height) {
        this.rect = null;
        return null;
      }
      this.rect = { x0: r.left - c.left, y0: r.top - c.top, w: r.width, h: r.height };
      return this.rect;
    }

    /** Scene rect (band) or the whole-frame fallback `{x0, y0: 0, w, h: fall}`. */
    sceneRect() {
      if (this.rect) return this.rect;
      const [x0, span] = this.band();
      return { x0, y0: 0, w: span, h: this.fallPx(), full: true };
    }

    /**
     * Where transient bursts (rain / confetti) may spawn and how far they fall, by zone:
     * full = whole frame, edges = left / right columns (`--fx-edge`), bottom = inside the band, top = top 30 %.
     */
    effectBox() {
      const [bx0, span] = this.band();
      const z = this.zone;
      if (z === 'edges') {
        const e = edgeFraction(this.w) * this.w;
        return { cols: [[0, e], [this.w - e, e]], y0: 0, fall: this.fallPx() };
      }
      if (z === 'bottom') {
        const r = this.sceneRect();
        return { cols: [[r.x0, r.w]], y0: r.y0, fall: r.h };
      }
      if (z === 'top') return { cols: [[bx0, span]], y0: 0, fall: Math.min(this.fallPx(), this.h * 0.3) };
      return { cols: [[bx0, span]], y0: 0, fall: this.fallPx() };
    }

    _boxX(box) {
      const col = box.cols[Math.floor(Math.random() * box.cols.length)];
      return col[0] + Math.random() * col[1];
    }

    /** Base cap per intensity (400 / 800 / 1200); an auto-reduced cap stays as the ceiling until the page reloads. */
    setCap(intensity) {
      const base = PARTICLE_CAP[clamp(intensity, 1, 3)] || PARTICLE_CAP[1];
      const want = this.eco ? Math.floor(base / 2) : base;
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
      const box = this.effectBox();
      const wind = rand(-30, 30);
      for (let i = 0; i < count; i++) {
        const size = rand(22, 60);
        this.add({
          kind: 'emoji',
          text: emoji,
          x: this._boxX(box),
          y: box.y0 - rand(20, 220),
          floor: box.y0 + box.fall,
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
      const box = this.effectBox();
      const wind = rand(-40, 40);
      for (let i = 0; i < count; i++) {
        this.add({
          kind: 'rect',
          color: colors[i % colors.length],
          x: this._boxX(box),
          y: box.y0 - rand(10, 160),
          floor: box.y0 + box.fall,
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

    /**
     * Light rays + explosion ring behind a card (intensity >= 2), drawn first (behind all particles).
     * Rays: the cached sprite, rotating 0 -> 40° and growing 0.3 -> 1.15 × `size` over 2.6 s (opacity 0 -> .55 ->
     * .4 -> 0). Ring: a shock wave growing to 200 px × intensity in 0.9 s, thick and fading. Outside the
     * particle cap, but at most FLARE_MAX rays / rings are alive (the oldest one gives way): cards share the
     * centre, so stacked rays look the same while each costs a large drawImage per frame.
     */
    flare(cx, cy, intensity, sprite, size) {
      if (!this.ok) return;
      const i = clamp(intensity, 1, 3);
      for (const kind of ['rays', 'ring']) {
        const alive = this.items.filter((p) => p.flare && p.kind === kind);
        const drop = alive.length - (FLARE_MAX[kind] - 1);
        if (drop > 0) {
          const gone = new Set(alive.slice(0, drop));
          this.items = this.items.filter((p) => !gone.has(p));
        }
      }
      const base = { x: cx, y: cy, vx: 0, vy: 0, g: 0, wind: 0, drift: 0, phase: 0, rot: 0, vr: 0, age: 0, alpha: 1, layer: -1, flare: true };
      if (sprite) this.items.push({ ...base, kind: 'rays', sprite, size, life: 2.6 });
      this.items.push({ ...base, kind: 'ring', color: sprite ? sprite.color : '#fff', size: 200 * i, life: 0.9 });
      this.stats.particles = this.items.length;
      this.start();
    }

    /** Scene parallax: emoji from the scene definition on three layers (far: small/slow, near: big/fast). */
    setAmbient(def, intensity, override) {
      const list = def && Array.isArray(def.particles) ? def.particles : [];
      if (!list.length || !this.ok) {
        this.ambient = null;
        return;
      }
      const cap = AMBIENT_CAP[intensity] || AMBIENT_CAP[2];
      this.ambient = { list, every: Math.max(60, Math.round((def.every || 400) * (2 / intensity) * 0.9)), intensity, override, last: 0, cap: this.eco ? Math.floor(cap / 2) : cap };
      this.start();
    }

    clearAmbient() {
      this.ambient = null;
      this.items = this.items.filter((p) => !p.ambient);
    }

    /** Spawns the ambient particles due since the last frame (up to 4 per frame, so density does not depend on fps). */
    _spawnAmbient(now) {
      const a = this.ambient;
      if (!a) return;
      // A band shorter than half the frame spawns up to twice as often (the strip would look empty otherwise).
      const every = this.rect ? a.every * clamp(this.rect.h / (this.h * 0.5), 0.5, 1) : a.every;
      if (now - a.last < every) return;
      const due = a.last ? Math.min(4, Math.floor((now - a.last) / every)) : 1;
      a.last = now;
      let alive = this.items.reduce((n, p) => n + (p.ambient ? 1 : 0), 0);
      for (let i = 0; i < due && alive < a.cap; i++, alive++) this._spawnAmbientOne(a);
    }

    _spawnAmbientOne(a) {
      const p = pickWeighted(a.list);
      const layer = Math.floor(Math.random() * 3); // 0 far, 1 mid, 2 near
      const k = [0.55, 1, 1.45][layer];
      const size = rand(p.size[0], p.size[1]) * k;
      const text = a.override ? a.override[Math.floor(Math.random() * a.override.length)] : p.emoji;
      const r = this.sceneRect();
      const x0 = r.x0;
      const span = r.w;
      const y0 = r.y0;
      const fall = r.h;
      // Inside a band the sprites scale with the band height (a 237 px strip gets ~60 % sized emoji).
      const scale = r.full ? 1 : clamp(fall / 400, 0.55, 1);
      const sz = size * scale;
      const dur = rand(p.dur[0], p.dur[1]) / k;
      const base = { kind: 'emoji', text, size: sz, layer, ambient: true, life: dur, alpha: [0.45, 0.75, 1][layer], g: 0, wind: 0, drift: rand(0.5, 1.5) * scale, phase: rand(0, 6.28), rot: 0, vr: 0, fade: true };
      if (p.mode === 'fall') Object.assign(base, { x: x0 + Math.random() * span, y: y0 - sz, vx: rand(-10, 10), vy: (fall + sz) / dur, vr: rand(-0.6, 0.6) });
      else if (p.mode === 'rise') Object.assign(base, { x: x0 + Math.random() * span, y: y0 + fall, vx: rand(-15, 15), vy: -(fall * 0.8) / dur });
      else if (p.mode === 'drift') Object.assign(base, { x: x0 - sz, y: y0 + rand(0.05, 0.7) * fall, vx: (span + sz * 2) / dur, vy: rand(-6, 6) * scale });
      else if (p.mode === 'drive') Object.assign(base, { x: x0 - sz, y: y0 + fall - sz * 1.2, vx: (span + sz * 2) / dur, vy: 0 });
      else if (p.mode === 'comet') Object.assign(base, { x: x0 + span * rand(0.4, 1), y: y0 + rand(0, 0.25) * fall, vx: -(span * 0.6) / dur, vy: (fall * 0.45) / dur });
      else Object.assign(base, { x: x0 + Math.random() * span, y: y0 + rand(0.04, 0.7) * fall, vx: 0, vy: 0, twinkle: true, vr: rand(-0.4, 0.4) });
      this.add(base);
    }

    // ---------------------------------------------------------------- story actors (2.2)
    /**
     * Diffs `actors` (`[{emoji, role, action?}]`) and `props` (`[{emoji, role}]`) against the sprites on stage:
     * new actors walk in from a random side to their slot, removed ones walk out and vanish, props fade in / out
     * in place. Everything lives in the band rect and is drawn by the particle loop.
     */
    setActors(actors, props) {
      if (!this.ok) return;
      const want = Array.isArray(actors) ? actors.filter((a) => a && a.emoji) : [];
      const keep = new Set();
      want.forEach((a, i) => {
        const role = String(a.role || a.emoji);
        keep.add(role);
        let cur = this.actors.find((x) => x.role === role && x.state !== 'out');
        if (!cur) {
          const fromLeft = Math.random() < 0.5;
          cur = { kind: 'actor', role, emoji: String(a.emoji), slot: i, state: 'in', age: 0, phase: rand(0, 6.28), fromLeft, dir: fromLeft ? 1 : -1, x: null, y: null, alpha: 1 };
          this.actors.push(cur);
        }
        cur.slot = i;
        cur.emoji = String(a.emoji);
        cur.action = typeof a.action === 'string' ? a.action : null;
      });
      for (const a of this.actors) {
        if (!keep.has(a.role) && a.state !== 'out') {
          a.state = 'out';
          a.age = 0;
          a.dir = a.x !== null && a.x < this.w / 2 ? -1 : 1;
        }
      }
      const wantProps = Array.isArray(props) ? props.filter((p) => p && p.emoji) : [];
      const keepProps = new Set();
      wantProps.forEach((p, i) => {
        const role = String(p.role || p.emoji);
        keepProps.add(role);
        let cur = this.props.find((x) => x.role === role && x.state !== 'out');
        if (!cur) {
          cur = { kind: 'prop', role, emoji: String(p.emoji), slot: i, state: 'in', age: 0, alpha: 0 };
          this.props.push(cur);
        }
        cur.slot = i;
        cur.emoji = String(p.emoji);
      });
      for (const p of this.props) {
        if (!keepProps.has(p.role) && p.state !== 'out') {
          p.state = 'out';
          p.age = 0;
        }
      }
      this.start();
    }

    clearActors() {
      this.actors.length = 0;
      this.props.length = 0;
    }

    _actorSize(r) {
      return clamp(r.h * 0.4, 28, 130);
    }

    _updateActors(dt, real) {
      if (!this.actors.length && !this.props.length) return;
      const r = this.sceneRect();
      const size = this._actorSize(r);
      const ground = r.y0 + r.h - size * 0.62;
      const speed = Math.max(60, r.w * 0.22);
      let n = 0;
      for (const a of this.actors) {
        a.age += real;
        const tx = r.x0 + r.w * (ACTOR_SLOTS[a.slot % ACTOR_SLOTS.length] || 0.5);
        if (a.x === null) {
          a.x = a.fromLeft ? r.x0 - size : r.x0 + r.w + size;
          a.y = ground;
        }
        let target = tx;
        if (a.state === 'out') target = a.dir < 0 ? r.x0 - size * 1.5 : r.x0 + r.w + size * 1.5;
        else if (a.action === 'run') target = tx + Math.sin(a.age * 1.6 + a.phase) * r.w * 0.12;
        const d = target - a.x;
        const step = (a.action === 'run' || a.state === 'out' ? speed * 1.6 : speed) * dt;
        a.moving = Math.abs(d) > 2;
        if (a.moving) {
          a.x += clamp(d, -step, step);
          a.dir = d < 0 ? -1 : 1;
        }
        // vertical pose per action (fly / swim hover, jump bounces, dance sways, sleep lies down)
        let y = ground;
        let rot = 0;
        if (a.action === 'fly') y = r.y0 + r.h * 0.32 + Math.sin(a.age * 2 + a.phase) * size * 0.18;
        else if (a.action === 'swim') y = r.y0 + r.h * 0.7 + Math.sin(a.age * 2.5 + a.phase) * size * 0.08;
        else if (a.action === 'jump') y = ground - Math.abs(Math.sin(a.age * 4)) * size * 0.6;
        else if (a.action === 'dance') rot = Math.sin(a.age * 5) * 0.25;
        else if (a.action === 'sleep') rot = -1.2;
        else if (a.action === 'cry' || a.action === 'laugh') rot = Math.sin(a.age * 9) * 0.08;
        if (a.moving && a.action !== 'fly' && a.action !== 'swim') y -= Math.abs(Math.sin(a.age * 9)) * size * 0.06;
        a.y = y;
        a.rot = rot;
        a.size = size;
        if (a.state === 'in' && !a.moving) a.state = 'stay';
        if (a.state === 'out' && !a.moving) continue; // walked out
        this.actors[n++] = a;
      }
      this.actors.length = n;
      let m = 0;
      for (const p of this.props) {
        p.age += real;
        p.alpha = p.state === 'out' ? Math.max(0, 1 - p.age / ACTOR_FADE) : Math.min(1, p.age / ACTOR_FADE);
        p.size = clamp(r.h * 0.5, 30, 160);
        p.x = r.x0 + r.w * (PROP_SLOTS[p.slot % PROP_SLOTS.length] || 0.5);
        p.y = r.y0 + r.h - p.size * 0.58;
        if (p.state === 'out' && p.alpha <= 0) continue;
        this.props[m++] = p;
      }
      this.props.length = m;
    }

    _drawActors(ctx, dpr) {
      if (!this.actors.length && !this.props.length) return;
      for (const p of this.props) {
        const s = this._sprite(p.emoji, p.size);
        if (!s || p.alpha <= 0.01) continue;
        ctx.globalAlpha = p.alpha * 0.95;
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
        ctx.drawImage(s.canvas, -s.size / 2, -s.size / 2, s.size, s.size);
      }
      for (const a of this.actors) {
        if (a.x === null) continue;
        const s = this._sprite(a.emoji, a.size);
        if (!s) continue;
        ctx.globalAlpha = 1;
        ctx.setTransform(dpr, 0, 0, dpr, a.x * dpr, a.y * dpr);
        if (a.dir < 0) ctx.scale(-1, 1);
        if (a.rot) ctx.rotate(a.rot);
        ctx.drawImage(s.canvas, -s.size / 2, -s.size / 2, s.size, s.size);
      }
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
      if (!this.actors.length && !this.props.length) this.stop();
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
      // `real` = wall-clock seconds since the last frame; the physics step is clamped (stable integration),
      // but particles AGE by real time (capped at 1 s) – otherwise a slow-painting page (2 fps) would
      // stretch a 3 s burst to a minute and keep this loop alive the whole time.
      const real = this.last ? Math.max(0, (now - this.last) / 1000) : 1 / 60;
      const dt = clamp(real, 0.001, 0.05);
      this.last = now;
      if (this.bandEl && now - this._rectAt > 1000) this.updateRect(); // layout messages / band resizes
      this._spawnAmbient(now);
      this._update(dt, Math.min(real, 1));
      this._updateActors(dt, Math.min(real, 1));
      this._draw();
      const ms = (typeof performance !== 'undefined' ? performance.now() : now) - t0;
      this.stats.frameMs = Math.round(ms * 100) / 100;
      // fps: average over ~1 s windows.
      this.fpsAcc += real;
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
      if (this.items.length || this.ambient || this.actors.length || this.props.length) this.raf = requestAnimationFrame(this._tick);
      else this.stop();
    }

    _update(dt, ageStep = dt) {
      const fall = this.fallPx();
      const r = this.rect;
      const items = this.items;
      let n = 0;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        p.age += ageStep;
        if (p.age >= p.life) continue;
        if (p.flare) {
          items[n++] = p;
          continue;
        }
        p.vy += p.g * dt;
        p.vx += (p.wind - p.vx) * 0.4 * dt;
        p.x += (p.vx + Math.sin(p.age * p.drift * 2 + p.phase) * 18 * p.drift) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (!p.ambient && p.y > (p.floor !== undefined ? p.floor : fall) + 40) continue;
        if (p.ambient && r && (p.y > r.y0 + r.h + p.size || p.x < r.x0 - p.size * 2 - 60 || p.x > r.x0 + r.w + p.size * 2 + 60)) continue;
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
      const r = this.rect;
      // Flares (rays / ring) first, then far layers so near particles draw on top.
      for (const p of this.items) if (p.flare) this._drawFlare(ctx, p, dpr);
      // Band mode: scene parallax + actors are clipped to the band rect (nothing is ever painted over the camera)
      // with a soft fade along the band's top edge, like the CSS mask on `.fx-band`.
      const clipped = !!r;
      if (clipped) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.rect(r.x0, r.y0, r.w, r.h);
        ctx.clip();
      }
      const fadeTop = r ? Math.max(1, r.h * 0.18) : 0;
      for (let pass = 0; pass < 2; pass++) {
        // pass 0: ambient (inside the clip), pass 1: transient bursts (whole frame)
        if (pass === 1) {
          this._drawActors(ctx, dpr);
          if (clipped) ctx.restore();
        }
        for (let layer = 0; layer < 3; layer++) {
          for (const p of this.items) {
            if (p.layer !== layer || p.flare) continue;
            if ((pass === 0) !== !!p.ambient) continue;
            const t = p.age / p.life;
            let alpha = p.alpha;
            if (p.twinkle) alpha *= Math.sin(Math.PI * t);
            else if (p.fade) alpha *= t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1;
            else alpha *= t > 0.8 ? (1 - t) / 0.2 : 1;
            if (!p.ambient) {
              const floor = p.floor !== undefined ? p.floor : fall;
              const top = p.floor !== undefined ? floor - (floor - (p.y0 || 0)) * 0.1 : fall * 0.9;
              if (p.y > top) alpha *= clamp((floor + 40 - p.y) / (floor - top + 40), 0, 1);
            } else if (r && p.y < r.y0 + fadeTop) alpha *= clamp((p.y - r.y0) / fadeTop, 0, 1);
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
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _drawFlare(ctx, p, dpr) {
      const t = clamp(p.age / p.life, 0, 1);
      if (p.kind === 'rays') {
        // keyframes: 0 % -> 0, 12 % -> .55, 60 % -> .4, 100 % -> 0 (ease-out growth + spin)
        const alpha = t < 0.12 ? (t / 0.12) * 0.55 : t < 0.6 ? 0.55 - ((t - 0.12) / 0.48) * 0.15 : 0.4 * (1 - (t - 0.6) / 0.4);
        if (alpha <= 0.01) return;
        const e = 1 - Math.pow(1 - t, 2);
        const d = p.size * (0.3 + 0.85 * e) * p.sprite.crop;
        ctx.globalAlpha = alpha;
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
        ctx.rotate((40 * e * Math.PI) / 180);
        ctx.drawImage(p.sprite.canvas, -d / 2, -d / 2, d, d);
        return;
      }
      // ring: ease-out-quart growth, border thins relative to the radius, fades out
      const e = 1 - Math.pow(1 - t, 4);
      const r = 6 + (p.size - 6) * e;
      const lw = Math.max(1.5, r * 0.16 * (1 - 0.6 * e));
      const alpha = 0.95 * (1 - t);
      if (alpha <= 0.01) return;
      ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = alpha * 0.35; // soft halo
      ctx.lineWidth = lw * 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------------ renderer
  class Renderer {
    constructor(root) {
      this.root = root;
      this.audioCtx = null;
      /** 2.2: three levels (0..1) – master (= the old `volume`), sfx one-shots, ambient loops. */
      this.volumes = { ...volumeDefaults() };
      this._volume = this.volumes.master;
      this.stats = { fires: 0, sounds: 0, fileSounds: 0, scenes: 0, combos: 0, particles: 0, fps: 60, frameMs: 0, reduced: 0, canvas: false, perfSwitches: 0, stories: 0 };
      /** Requested performance mode (auto | eco | high) and the look actually in use (high | eco). */
      this.perf = 'auto';
      this.perfActive = 'high';
      this._mon = { raf: 0, last: 0, slow: 0, minFrame: Infinity, calibrate: PERF_CALIBRATE_FRAMES };
      this._monTick = this._monTick.bind(this);
      this._rays = { key: '', sprite: null };
      /** Id of the scene currently on stage (null = none). */
      this.currentScene = null;
      /** Name of the running ambient loop (null = none). */
      this.loopName = null;
      /** Optional hook `(sceneId|null) => void`, called whenever the scene changes or clears. */
      this.onScene = null;
      /** Active theme name (see THEMES); `setTheme` mirrors it to `body[data-theme]`. */
      this.theme = 'neon';
      this._scene = null; // { id, el, spawnTimer, clearTimer }
      this._loop = null; // { name, handle, gain?, mixer? }
      this._timers = new Set(); // combo step timers
      /** 2.2 layout `{storyLayout, band, zone}` (see setLayout) and the `.fx-band` element scenes live in. */
      this.layout = normalizeLayoutLocal({});
      this._bandSet = false; // true once a layout carried an explicit band height (portrait otherwise uses 20 %)
      this._bandEl = null;
      this._colSide = 0; // zone `edges`: cards alternate left / right
      /** 2.2 live story: last state given to story(), idle timeout (ms) after which the band fades. */
      this.storyState = null;
      this.storyIdleMs = STORY_IDLE_MS;
      this._storyIdle = null;
      this.particles = new ParticleLayer(root, this.stats);
      this.stats.canvas = this.particles.ok;
      if (typeof document !== 'undefined' && document.body && document.body.dataset && themes().includes(document.body.dataset.theme)) this.theme = document.body.dataset.theme;
      this._applyPerf('high');
      this.setLayout({});
      if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        // Infinite scene animations pause while the page is hidden (OBS source not visible, tab in background).
        const onVis = () => {
          if (document.body) document.body.classList.toggle('fx-hidden', !!document.hidden);
          this._mon.last = 0;
        };
        document.addEventListener('visibilitychange', onVis);
        onVis();
      }
      this._monStart(); // calibrates the display frame interval (auto mode)
    }

    // ---------------------------------------------------------------- performance mode
    /**
     * `auto` (default): starts with the full look and switches to `eco` for good once 30 frames in a row took
     * longer than the frame budget (20 ms, or 1.25 × the display interval on a capped source such as OBS at
     * 30 fps). `eco`: half particle caps, no glow / rays / entry motion / impact zoom, confetti 45, glitch text
     * as neon, stickers without bounce. `high`: everything on. Unknown values fall back to auto. Calling it
     * with the mode already set keeps the current state (an auto switch to eco survives a repeated message).
     */
    setPerf(mode) {
      const m = PERF_MODES.includes(mode) ? mode : 'auto';
      if (m === this.perf && this._perfSet) return m;
      this._perfSet = true;
      this.perf = m;
      this._mon.slow = 0;
      this._applyPerf(m === 'eco' ? 'eco' : 'high');
      if (m === 'auto') this._monStart();
      return m;
    }

    _applyPerf(level) {
      const was = this.perfActive;
      this.perfActive = level;
      this.particles.eco = level === 'eco';
      const amb = this.particles.ambient;
      if (amb && was !== level) amb.cap = level === 'eco' ? Math.floor(amb.cap / 2) : AMBIENT_CAP[amb.intensity] || AMBIENT_CAP[2];
      if (typeof document !== 'undefined' && document.body && document.body.dataset) {
        document.body.dataset.perf = level;
        document.body.dataset.perfMode = this.perf;
      }
    }

    get eco() {
      return this.perfActive === 'eco';
    }

    _monStart() {
      if (this._mon.raf || typeof requestAnimationFrame !== 'function') return;
      if (this.perf !== 'auto' || this.perfActive !== 'high') return;
      this._mon.last = 0;
      this._mon.raf = requestAnimationFrame(this._monTick);
    }

    /** rAF monitor (auto mode only): runs while effects are on stage, counts consecutive slow frames. */
    _monTick(now) {
      const m = this._mon;
      m.raf = 0;
      if (this.perf !== 'auto' || this.perfActive !== 'high') return;
      const dt = m.last ? now - m.last : 0;
      m.last = now;
      if (dt > 0 && dt < 1000) {
        if (dt < m.minFrame) m.minFrame = Math.max(4, dt);
        if (m.calibrate > 0) m.calibrate--;
        else {
          const budget = Math.max(SLOW_FRAME_MS, (m.minFrame >= 25 ? m.minFrame : 0) * 1.25);
          if (dt > budget) {
            if (++m.slow >= SLOW_FRAMES) {
              m.slow = 0;
              this.stats.perfSwitches++;
              this._applyPerf('eco');
              return;
            }
          } else m.slow = 0;
        }
      } else if (dt >= 1000) m.slow = 0; // paused page: start over
      if (m.calibrate > 0 || this._hasTransient() || this._scene || this.particles.raf) m.raf = requestAnimationFrame(this._monTick);
    }

    /** True while a transient effect node (card, text, banner …) is on stage – they are appended last. */
    _hasTransient() {
      const el = this.root && this.root.lastElementChild;
      return !!el && !el.classList.contains('fx-canvas') && !el.classList.contains('fx-scene') && !el.classList.contains('fx-band') && el.tagName !== 'AUDIO';
    }

    /**
     * Light-ray sprite for the current theme colour: 20 rays of 6° every 18° (the old repeating-conic-gradient)
     * with the old radial falloff (fades out at the disc edge). Rendered once per
     * theme into a 512 px offscreen canvas and reused by every card (ParticleLayer.flare draws it scaled).
     */
    _raysSprite() {
      if (typeof document === 'undefined' || !document.body) return null;
      const key = this.theme;
      if (this._rays.key === key) return this._rays.sprite;
      let color = '';
      try {
        color = getComputedStyle(document.body).getPropertyValue('--fx-glow').trim();
      } catch (_) {
        color = '';
      }
      color = color || 'rgba(255, 77, 109, 0.85)';
      let sprite = null;
      try {
        const n = RAYS_SPRITE_PX;
        const c = document.createElement('canvas');
        c.width = n;
        c.height = n;
        const g = c.getContext('2d');
        if (g) {
          const r = n / 2;
          g.fillStyle = color;
          for (let i = 0; i < 20; i++) {
            const a0 = ((i * 18 - 90) * Math.PI) / 180;
            g.beginPath();
            g.moveTo(r, r);
            g.arc(r, r, r, a0, a0 + (6 * Math.PI) / 180);
            g.closePath();
            g.fill();
          }
          g.globalCompositeOperation = 'destination-in';
          const fall = g.createRadialGradient(r, r, 0, r, r, r);
          // = the old mask radial-gradient(circle …) whose stops were relative to the farthest corner (√2 × r)
          fall.addColorStop(0, 'rgba(0,0,0,0.9)');
          fall.addColorStop(0.42, 'rgba(0,0,0,0.5)');
          fall.addColorStop(0.96, 'rgba(0,0,0,0)');
          fall.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = fall;
          g.fillRect(0, 0, n, n);
          sprite = { canvas: c, color, crop: 1 };
        }
      } catch (_) {
        sprite = null;
      }
      this._rays = { key, sprite };
      return sprite;
    }

    /** Master level 0..1 (= `volumes.master`); applied live to the mixer master and the fallback loop gain. */
    get volume() {
      return this._volume;
    }
    set volume(v) {
      this.setVolume('master', v);
    }

    /**
     * 2.2: `setVolume('master' | 'sfx' | 'ambient', v)` (unknown bus = master, non-numeric keeps the level).
     * master -> `mixer.setMaster`, sfx / ambient -> `mixer.setBus`; the fallback loop (no mixer) gets
     * master × ambient on its GainNode. Returns the level now stored for that bus.
     */
    setVolume(bus, v) {
      const b = VOLUME_BUSES.includes(bus) ? bus : 'master';
      const n = Number(v);
      if (!Number.isFinite(n) || v === null || v === '') return this.volumes[b];
      const level = clamp(n, 0, 1);
      this.volumes[b] = level;
      if (b === 'master') this._volume = level;
      if ((b === 'master' || b === 'ambient') && this._loop && this._loop.gain && this.audioCtx) {
        try {
          const g = this._loop.gain.gain;
          g.cancelScheduledValues(this.audioCtx.currentTime);
          g.setTargetAtTime(this._volume * this.volumes.ambient, this.audioCtx.currentTime, 0.05);
        } catch (_) {
          /* ignore */
        }
      }
      const mixer = this._mixer();
      if (mixer) {
        this._mixerSynced = mixer;
        try {
          if (b === 'master' && typeof mixer.setMaster === 'function') mixer.setMaster(level);
          else if (b !== 'master' && typeof mixer.setBus === 'function') mixer.setBus(b, level);
        } catch (_) {
          /* ignore */
        }
      }
      return level;
    }

    /** Audio engine v2 (`LiveFXSounds.mixer`) when present, else null. */
    _mixer() {
      const s = global.LiveFXSounds;
      return s && s.mixer && typeof s.mixer.play === 'function' ? s.mixer : null;
    }

    /**
     * The mixer, initialised on the renderer's own AudioContext (one context for everything) and with the
     * three levels pushed once per mixer instance. Null without a mixer.
     */
    _mixerReady() {
      const mixer = this._mixer();
      if (!mixer) return null;
      if (!mixer.ctx && typeof mixer.init === 'function') {
        const ctx = this.ensureAudio();
        if (ctx) {
          try {
            mixer.init(ctx);
          } catch (_) {
            /* mixer keeps creating its own context */
          }
        }
      }
      if (this._mixerSynced !== mixer) {
        this._mixerSynced = mixer;
        try {
          if (typeof mixer.setMaster === 'function') mixer.setMaster(this.volumes.master);
          if (typeof mixer.setBus === 'function') {
            mixer.setBus('sfx', this.volumes.sfx);
            mixer.setBus('ambient', this.volumes.ambient);
          }
        } catch (_) {
          /* ignore */
        }
      }
      return mixer;
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
        // One AudioContext for everything: hand the renderer's context to the mixer before its first
        // play() would create a second one (file sounds / loops already use `this.audioCtx`).
        const mixer = this._mixerReady();
        if (mixer) {
          try {
            const voice = mixer.play(parsed.name, { gain, pan: clamp(Number(opts.pan) || 0, -1, 1), intensity: clamp(Number(opts.intensity) || 1, 1, 3) });
            if (voice !== null) this.stats.sounds++; // null = unknown name / no WebAudio
          } catch (_) {
            /* unknown builtin name */
          }
          return;
        }
        const ctx = this.ensureAudio();
        if (!ctx || !global.LiveFXSounds || typeof global.LiveFXSounds.play !== 'function') return;
        try {
          global.LiveFXSounds.play(parsed.name, ctx, ctx.destination, level * this.volumes.sfx);
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
      const level = clamp(this.volume * this.volumes.sfx * (Number.isFinite(Number(gain)) ? clamp(Number(gain), 0, 1) : 1), 0, 1);
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
      // zone `edges`: card-like visuals land in the left / right column – lean the sound the same way.
      if (this.layout.zone === 'edges' && ['card', 'image', 'text', 'sticker', 'banner', undefined].includes(v.kind)) return this._colSide ? 0.5 : -0.5;
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
        if (el.classList.contains('fx-scene') || el.classList.contains('fx-band') || el.classList.contains('fx-canvas') || el.tagName === 'AUDIO') continue;
        el.remove();
      }
      this.root.classList.remove('fx-impact', 'fx-shake');
    }

    // ---------------------------------------------------------------- story band / zones (2.2)
    /** The `.fx-band` element (first child of #stage) that holds the scene layer; created on demand. */
    _band() {
      if (this._bandEl && this._bandEl.parentNode === this.root) return this._bandEl;
      if (typeof document === 'undefined' || !this.root) return null;
      let el = this.root.querySelector(':scope > .fx-band');
      if (!el) {
        el = document.createElement('div');
        el.className = 'fx-band';
        el.setAttribute('aria-hidden', 'true');
      }
      el.dataset.layout = this.layout.storyLayout;
      if (this.root.firstChild !== el) this.root.insertBefore(el, this.root.firstChild);
      this._bandEl = el;
      return el;
    }

    /**
     * Overlay layout `{storyLayout: band|full|frame, band: 15..35 (% of the height), zone: full|edges|bottom|top}`.
     * Partial objects merge onto the current layout (unknown values keep the old key). Mirrors to
     * `.fx-band[data-layout]`, `body[data-story-layout]`, `body[data-zone]` and `--fx-band` (unitless percent; in
     * portrait without an explicit band 20, the strip sits above the chat zone – see css/overlay.css).
     * Returns the layout in use.
     */
    setLayout(raw) {
      const r = raw && typeof raw === 'object' ? raw : {};
      const next = normalizeLayoutLocal(r, this.layout);
      if (r.band !== undefined && r.band !== null && r.band !== '' && Number.isFinite(Number(r.band))) this._bandSet = true;
      this.layout = next;
      const body = typeof document !== 'undefined' ? document.body : null;
      const portrait = !!(body && body.classList && body.classList.contains('layout-portrait'));
      this.bandPct = portrait && !this._bandSet ? Math.min(next.band, 20) : next.band;
      if (body && body.dataset) {
        body.dataset.storyLayout = next.storyLayout;
        body.dataset.zone = next.zone;
        try {
          body.style.setProperty('--fx-band', String(this.bandPct));
        } catch (_) {
          /* ignore */
        }
      }
      const band = this._band();
      if (band) band.dataset.layout = next.storyLayout;
      this.particles.setBand(band, next.storyLayout, next.zone);
      return { ...next };
    }

    /** Re-applies the layout (e.g. after `body.layout-portrait` toggled); same as `setLayout({})`. */
    refreshLayout() {
      return this.setLayout({});
    }

    /**
     * Places a card-like element by zone: `edges` -> `.fx-col-left` / `.fx-col-right` (alternating),
     * `bottom` -> `.fx-in-band`, `top` -> `.fx-zone-top`, `full` -> untouched. Returns the column (-1 | 0 | 1).
     */
    _place(el) {
      const z = this.layout.zone;
      if (z === 'edges') {
        const side = this._colSide ? 1 : -1;
        this._colSide = this._colSide ? 0 : 1;
        el.classList.add(side < 0 ? 'fx-col-left' : 'fx-col-right');
        return side;
      }
      if (z === 'bottom') el.classList.add('fx-in-band');
      else if (z === 'top') el.classList.add('fx-zone-top');
      return 0;
    }

    /** Centre (px) + size for the rays / ring flare of a card: the column, the band or the frame centre. */
    _flareAnchor(side, top) {
      const w = this.root.clientWidth || global.innerWidth || 1;
      const h = this.root.clientHeight || global.innerHeight || 1;
      const portrait = typeof document !== 'undefined' && document.body && document.body.classList.contains('layout-portrait');
      const z = this.layout.zone;
      if (z === 'edges' && side) {
        const e = edgeFraction(w) * w;
        return { x: side < 0 ? e / 2 : w - e / 2, y: h * top, size: Math.min(e * 1.8, 900) };
      }
      if (z === 'bottom') {
        const r = this.particles.sceneRect();
        return { x: r.x0 + r.w / 2, y: r.y0 + r.h / 2, size: Math.min(r.h * 2.2, 900) };
      }
      if (z === 'top') return { x: w / 2, y: h * 0.15, size: Math.min(h * 0.6, 700) };
      return { x: w / 2, y: h * top, size: portrait ? Math.min(1.2 * w, 700) : Math.min(1.6 * h, 1400) };
    }

    // ---------------------------------------------------------------- live story (2.2)
    /**
     * Renders a story state (`js/story-director.js` or a `story-state` message): scene + ambient loop by scene,
     * emoji actors / props on the canvas inside the band, mood tint (`.fx-band[data-mood]`), `shake`.
     * `end` or no scene clears the band (actors walk out, loop fades). Returns the normalized state or null.
     */
    story(raw) {
      const S = schema();
      let st = null;
      if (S && typeof S.normalizeStoryState === 'function') st = S.normalizeStoryState(raw);
      else if (raw && typeof raw === 'object' && !Array.isArray(raw)) st = { ...raw, actors: Array.isArray(raw.actors) ? raw.actors : [], props: Array.isArray(raw.props) ? raw.props : [] };
      if (!st) return null;
      this.stats.stories++;
      this.storyState = st;
      const band = this._band();
      if (!st.scene || st.end) {
        this.particles.setActors([], []);
        this.clearScene();
        this.stopLoop();
        if (band) delete band.dataset.mood;
        this.storyTouch();
        return st;
      }
      if (band) {
        band.classList.remove('fx-band-idle');
        band.dataset.mood = st.mood || 'calm';
      }
      this.scene({ scene: st.scene, text: st.caption || '', intensity: 2, caption: !!st.caption });
      const loop = st.loop || LOOP_BY_SCENE[st.scene] || null;
      if (loop) this.playLoop(loop);
      this.particles.setActors(st.actors, st.props);
      if (st.shake) this.shake();
      this.storyTouch();
      return st;
    }

    /** Keeps the band awake: without a call for `storyIdleMs` the band fades (`.fx-band-idle`). */
    storyTouch() {
      clearTimeout(this._storyIdle);
      const band = this._band();
      if (band) band.classList.remove('fx-band-idle');
      if (!(this.storyIdleMs > 0)) return;
      this._storyIdle = setTimeout(() => {
        const b = this._band();
        if (b && this.storyState && this.storyState.scene) b.classList.add('fx-band-idle');
      }, this.storyIdleMs);
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
      this._monStart();
      if (animName) {
        el.addEventListener('animationend', (e) => {
          if (e.target === el && e.animationName === animName) remove();
        });
      }
      this.root.appendChild(el);
    }

    /**
     * v2 decoration shared by card-like elements: `.fx-glow` (one glow shadow), `.fx-tilt` (3D card),
     * `.fx-blur-in` (entry motion: opacity + scale/translate – the name is historic, no filter is animated) and,
     * at intensity >= 2, light rays (pre-rendered sprite) + explosion ring behind the content plus a spark burst
     * on the canvas (intensity 3). Performance mode eco keeps only tilt and the intensity variable.
     */
    _decorate(el, v, opts = {}) {
      const intensity = intensityOf(v, 1);
      const eco = this.eco;
      if (!eco) el.classList.add('fx-blur-in');
      if (v && v.glow && !eco) el.classList.add('fx-glow');
      if (v && v.tilt && opts.tilt !== false) el.classList.add('fx-tilt');
      el.style.setProperty('--fx-i', String(intensity));
      if (intensity >= 2 && opts.rays !== false && !eco) {
        el.classList.add('fx-has-rays');
        const portrait = document.body.classList.contains('layout-portrait');
        const top = v && v.position === 'top' ? 0.28 : v && v.position === 'safe' && portrait ? 0.32 : 0.5;
        const a = this._flareAnchor(opts.side || 0, top);
        const sprite = this.particles.ok ? this._raysSprite() : null;
        if (sprite) {
          // Canvas path: rays sprite + explosion ring drawn behind the DOM effects (no big DOM layers).
          el.dataset.rays = 'canvas';
          this.particles.ensureOrder();
          this.particles.flare(a.x, a.y, intensity, sprite, a.size);
        } else {
          // Fallback without canvas: CSS rays (radial gradient) + ring behind the content.
          const rays = document.createElement('div');
          rays.className = 'fx-rays';
          const ring = document.createElement('div');
          ring.className = 'fx-ring';
          el.prepend(ring);
          el.prepend(rays);
        }
        if (intensity >= 3 && this.particles.ok) {
          this.particles.setCap(intensity);
          this.particles.sparks(a.x, a.y, 40, safeColor(v && v.color) || '#ffd166');
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
      this._decorate(el, v, { side: this._place(el) });
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
      // Bundled stickers (memes/…) are transparent cut-outs: they float free, without the dark card box.
      const sticker = src.startsWith('memes/');
      el.className = `fx-card fx-card-image${sticker ? ' fx-sticker-img' : ''} ${posClass(v)}`;
      const img = document.createElement('img');
      img.alt = '';
      // A source that does not load (deleted upload, expired hotlink, offline provider) becomes the emoji card.
      img.onerror = () => {
        img.onerror = null;
        if (!el.isConnected) return;
        el.remove();
        this.card({ emoji: v.emoji || '🖼️', text: v.text, position: v.position, glow: v.glow, tilt: v.tilt, intensity: v.intensity });
      };
      img.setAttribute('src', src);
      el.appendChild(img);
      if (v.text) {
        const t = document.createElement('div');
        t.className = 'fx-text';
        t.textContent = String(v.text);
        el.appendChild(t);
      }
      this._decorate(el, v, { side: this._place(el) });
      this._spawn(el, 2800, v.tilt ? 'fx-pop-tilt' : 'fx-pop');
    }

    banner(v) {
      const el = document.createElement('div');
      el.className = `fx-banner ${posClass(v)}`;
      const emoji = escapeHtml(v.emoji || '');
      el.innerHTML = `${emoji} ${escapeHtml(v.text || '')} ${emoji}`; // text only: no extra nodes
      const color = safeColor(v.color);
      if (color) el.style.setProperty('--fx-accent', color);
      this._place(el);
      this._decorate(el, v, { tilt: false, rays: false });
      this._spawn(el, 3200, 'fx-slide');
    }

    /**
     * Emoji rain. Canvas (single render path): a burst of `count × intensity × 2` emoji with gravity, wind,
     * drift and rotation (eco: half) plus ONE invisible marker `.fx-rain[data-count][data-emoji]` for tools /
     * tests, removed after 4.5 s. Without canvas: `count` DOM drops (`.fx-drop`, --x positioned, CSS fall).
     */
    rain(v) {
      let count = Math.round(Number(v.count));
      if (!Number.isFinite(count) || count < 1) count = 20;
      count = Math.min(rainMax(), count);
      const emoji = typeof v.emoji === 'string' && v.emoji ? v.emoji : '✨';
      const intensity = intensityOf(v, 1);
      if (this.particles.ok) {
        const mark = document.createElement('div');
        mark.className = 'fx-rain';
        mark.setAttribute('aria-hidden', 'true');
        mark.dataset.count = String(count);
        mark.dataset.emoji = emoji;
        this._spawn(mark, RAIN_MARK_MS);
        this.particles.ensureOrder();
        this.particles.setCap(intensity);
        const burst = count * intensity * (this.eco ? 1 : 2);
        this.particles.rain(graphemes(emoji)[0] || emoji, Math.min(this.particles.cap, burst));
        return;
      }
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
        frag.appendChild(el);
        drops.push(el);
      }
      this.root.appendChild(frag); // one DOM write for the whole batch
      setTimeout(() => drops.forEach((el) => el.remove()), RAIN_MARK_MS);
    }

    /** Confetti on the canvas (90 × intensity rotating rects, eco: 45; gravity/wind/wobble); DOM `.fx-confetti` fallback. */
    confetti(v) {
      const intensity = intensityOf(v, 1);
      if (this.particles.ok) {
        this.particles.ensureOrder();
        this.particles.setCap(intensity);
        this.particles.confetti(Math.min(this.particles.cap, this.eco ? ECO_CONFETTI : CONFETTI_COUNT * intensity), CONFETTI_COLORS);
      } else {
        const frag = document.createDocumentFragment();
        const list = [];
        const n = this.eco ? ECO_CONFETTI : CONFETTI_COUNT;
        for (let i = 0; i < n; i++) {
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
      let style = textStyles().includes(v.style) ? v.style : 'neon';
      if (style === 'glitch' && this.eco) style = 'neon'; // eco: no clip-path jitter layers
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
      if (style === 'glitch') {
        // Two offset copies of the same word structure (identical wrapping: one nowrap `.fx-w` per word, the
        // same space spans) that the CSS clips + jitters. Words are plain text here – no per-letter spans.
        const originals = Array.from(word.children);
        for (const cls of ['fx-glitch-a', 'fx-glitch-b']) {
          const layer = document.createElement('span');
          layer.className = `fx-glitch-layer ${cls}`;
          layer.setAttribute('aria-hidden', 'true');
          for (const child of originals) {
            if (child.classList.contains('fx-space')) layer.appendChild(child.cloneNode(true));
            else {
              const w = document.createElement('span');
              w.className = 'fx-w';
              w.textContent = child.textContent;
              layer.appendChild(w);
            }
          }
          word.appendChild(layer);
        }
      }
      el.appendChild(word);
      if (v.emoji) {
        const e = document.createElement('div');
        e.className = 'fx-emoji';
        e.textContent = String(v.emoji);
        el.prepend(e);
      }
      this._decorate(el, { ...v, glow: v.glow || style === 'neon' }, { tilt: false, side: this._place(el) });
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
      // 2.2: with the audio engine v2 the loop runs on the mixer's ambient bus (level `volumes.ambient`,
      // ducked by one-shots, through the limiter). The GainNode-to-destination path stays as fallback.
      const mixer = this._mixerReady();
      if (mixer && typeof mixer.startLoop === 'function' && mixer.ctx === ctx) {
        let h = null;
        try {
          h = mixer.startLoop(name, { gain: 1 });
        } catch (_) {
          h = null;
        }
        if (h && typeof h.stop === 'function') {
          this._loop = { name, handle: h, mixer: true };
          this.loopName = name;
          return true;
        }
      }
      let gain;
      let handle;
      try {
        gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this._volume * this.volumes.ambient, now + LOOP_FADE_SEC);
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
      if (loop.mixer) {
        const mixer = this._mixer();
        try {
          if (mixer && typeof mixer.stopLoop === 'function') mixer.stopLoop(fade);
          else loop.handle.stop(fade);
        } catch (_) {
          /* ignore */
        }
        return;
      }
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
     * `duration` > 0 seconds auto-clears. Particles are three parallax emoji layers on the canvas (far / mid /
     * near; `data-particles="canvas"`); without canvas a DOM spawner fills `.fx-scene-particles` instead.
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
      // DOM particle container only for the no-canvas fallback (the canvas draws the parallax particles).
      let particles = null;
      if (!this.particles.ok) {
        particles = document.createElement('div');
        particles.className = 'fx-scene-particles';
        el.appendChild(particles);
      }

      // 2.2: the scene lives inside the band (first child of #stage) – band / frame layouts keep the camera free.
      const band = this._band() || this.root;
      band.insertBefore(el, band.firstChild);
      this.particles.updateRect();
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
      entry.el.dataset.particles = this.particles.ok ? 'canvas' : 'dom';
      if (this.particles.ok) {
        // Single render path: the canvas parallax layers (far / mid / near) are the scene particles.
        this.particles.ensureOrder();
        this.particles.setCap(intensity);
        this.particles.clearAmbient();
        this.particles.setAmbient(def, intensity, override);
        this._monStart();
        return;
      }
      // Fallback without canvas: DOM emoji spawned by an interval that dies with the layer.
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
      this._decorate(el, v, { tilt: false, side: this._place(el) });
      this._spawn(el, STICKER_MS, 'fx-sticker-life');
    }

    /** Stage shake; the white flash only in zone `full` (it would cover the camera otherwise). */
    shake() {
      this.root.classList.remove('fx-shake');
      void this.root.offsetWidth; // restart animation
      this.root.classList.add('fx-shake');
      if (this.layout.zone !== 'full') return;
      const flash = document.createElement('div');
      flash.className = 'fx-flash';
      this._spawn(flash, 400, 'fx-flash');
    }

    /** Stage zoom bump: #stage scale 1 -> 1.04 -> 1 in 250 ms (`.fx-impact`); zone `full` only (2.2). */
    impact() {
      const root = this.root;
      if (!this.eco && this.layout.zone === 'full') {
        // Zoom bump (eco: skipped – a full-stage transform re-composites every layer).
        root.classList.remove('fx-impact');
        void root.offsetWidth;
        root.classList.add('fx-impact');
        clearTimeout(this._impactTimer);
        this._impactTimer = setTimeout(() => root.classList.remove('fx-impact'), 300);
      }
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
