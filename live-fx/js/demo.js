// LiveFX – demo / recording page (demo.html). Webcam + live effects + sounds in one browser tab,
// with a record button that produces a downloadable WebM clip. No OBS involved.
//
// Two render paths are driven from the same fire():
//   1. LiveFXRenderer (DOM, css/overlay.css) – what the streamer sees live inside #frame.
//   2. CanvasFX – a canvas twin of the common effect kinds, composed over the mirrored webcam frame
//      on #rec-canvas. MediaRecorder captures that canvas plus an audio mix (mic + effect sounds).
//
// The page is also a mini control panel: Web Speech ASR -> LiveFXMatcher over the stored triggers.
// Local hits render here AND are sent on the bus (so a real OBS overlay would fire too); `fire`
// messages coming from the bus (control panel, /api/fire) render here as well.
(function (global) {
  'use strict';

  const S = global.LiveFXSchema;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => S.escapeHtml(String(s == null ? '' : s));
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const LANG_KEY = 'livefx.demo.lang';
  const FORMAT_KEY = 'livefx.demo.format';
  const FONT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif';
  const FORMATS = { landscape: { w: 1280, h: 720 }, portrait: { w: 720, h: 1280 } };
  const IDLE_MS = 3000;
  const CONFETTI_COUNT = 90;
  const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];
  const FILE_SOUND_MAX_MS = 60000;
  const SCENE_FADE_MS = 800;
  const SCENE_PARTICLE_CAP = 40;
  const LOOP_FADE_SEC = 1.5;
  const STICKER_MS = 2800;
  // Canvas twin of the scene styles in css/overlay.css: gradient stops (top -> bottom), decoration, particles.
  const CANVAS_SCENES = {
    rain: { stops: ['#232f3e', '#3d5470', '#4d5f70'], streaks: 'rgba(210,228,255,0.35)', every: 140, particles: [{ emoji: '💧', mode: 'fall', size: [16, 30], dur: [1200, 2000] }] },
    night: { stops: ['#121840', '#05071c', '#020310'], stars: 90, decor: '🌙', every: 700, particles: [{ emoji: '✨', mode: 'twinkle', size: [12, 26], dur: [1500, 3000] }] },
    forest: { stops: ['#0b2410', '#1d5a2a', '#2d7a3a', '#123a1c'], ground: '🌲🌳🌲🌲🌳🌲🌳🌲', every: 420, particles: [{ emoji: '🍃', mode: 'fall', size: [18, 34], dur: [3500, 6000] }, { emoji: '✨', mode: 'twinkle', size: [8, 14], dur: [1500, 3000] }] },
    sea: { stops: ['#8fd8ff', '#47a6e8', '#1a6fbf', '#063a6e'], waves: true, every: 650, particles: [{ emoji: '🐟', mode: 'drift', size: [22, 40], dur: [7000, 12000] }, { emoji: '🫧', mode: 'rise', size: [12, 24], dur: [3000, 5000] }] },
    fire: { stops: ['#1f0705', '#7a1d10', '#e8542b', '#ffb347'], glow: true, every: 160, particles: [{ emoji: '✨', mode: 'rise', size: [10, 22], dur: [1500, 2800] }] },
    castle: { stops: ['#14082e', '#43176b', '#8a2f6e', '#2a1233'], ground: '🏰', groundScale: 1.8, stars: 40, every: 800, particles: [{ emoji: '🦇', mode: 'drift', size: [20, 34], dur: [5000, 9000] }, { emoji: '✨', mode: 'twinkle', size: [10, 20], dur: [1500, 3000] }] },
    snow: { stops: ['#a3c4e6', '#d6e6f5', '#f4f8fc'], every: 180, particles: [{ emoji: '❄️', mode: 'fall', size: [12, 30], dur: [4000, 7000] }] },
    desert: { stops: ['#ffd98a', '#ffb44d', '#f0a24a', '#a86a2a'], decor: '☀️', ground: '🌵  🐪   🌵', every: 900, particles: [{ emoji: '🍂', mode: 'drift', size: [14, 24], dur: [4000, 7000] }] },
    city: { stops: ['#060a1e', '#141b48', '#2a2160', '#0d1230'], ground: '🏢🏬🏙️🏢🏨🏢🏬🏢', every: 1100, particles: [{ emoji: '🚕', mode: 'drive', size: [30, 42], dur: [4000, 7000] }, { emoji: '✨', mode: 'twinkle', size: [8, 14], dur: [1000, 2000] }] },
    space: { stops: ['#1d1050', '#0a0626', '#030213'], stars: 120, decor: '🪐', every: 500, particles: [{ emoji: '✨', mode: 'twinkle', size: [8, 22], dur: [1500, 3000] }, { emoji: '☄️', mode: 'comet', size: [26, 40], dur: [1600, 2600] }] },
    sunrise: { stops: ['#2b1055', '#6a4b9a', '#ef8f6a', '#ffc26b', '#ffe9a8'], sun: true, every: 700, particles: [{ emoji: '🐦', mode: 'drift', size: [16, 26], dur: [6000, 10000] }, { emoji: '✨', mode: 'twinkle', size: [10, 20], dur: [1500, 3000] }] },
    storm: { stops: ['#05070c', '#1b222f', '#10141c'], streaks: 'rgba(210,228,255,0.35)', lightning: true, every: 110, particles: [{ emoji: '💧', mode: 'fall', size: [14, 28], dur: [900, 1600] }, { emoji: '⚡', mode: 'twinkle', size: [40, 90], dur: [400, 800] }] },
  };

  /** Splits into user-perceived characters (emoji incl. ZWJ sequences), whitespace dropped. */
  function graphemes(str) {
    const s = String(str || '');
    let parts;
    try {
      parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment);
    } catch (_) {
      parts = Array.from(s);
    }
    return parts.filter((g) => g.trim() !== '');
  }

  function lsGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_) {
      /* unavailable */
    }
  }

  function safeColor(c) {
    return typeof c === 'string' && S.COLOR_RE.test(c.trim()) ? c.trim() : '';
  }
  function safeSrc(src) {
    if (typeof src !== 'string') return '';
    const s = src.trim();
    if ((S.ASSET_IMAGE_RE.test(s) && !s.includes('..')) || (S.HOTLINK_SRC_RE || S.HTTP_SRC_RE).test(s)) return s;
    return '';
  }

  // Same polygon as the clip-path of .fx-text-sticker .fx-word::before (css/overlay.css), in % of the box.
  const BURST_POINTS = [[50, 0], [58, 12], [68, 2], [76, 13], [88, 4], [86, 18], [99, 22], [90, 34], [100, 50], [90, 66], [99, 78], [86, 82], [88, 96], [76, 87], [68, 98], [58, 88], [50, 100], [42, 88], [32, 98], [24, 87], [12, 96], [14, 82], [1, 78], [10, 66], [0, 50], [10, 34], [1, 22], [14, 18], [12, 4], [24, 13], [32, 2], [42, 12]];

  /** Piecewise-linear keyframe lookup: frames = [[t(0..1), value], ...] sorted by t. */
  function kf(frames, t) {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      if (t <= frames[i][0]) {
        const [t0, v0] = frames[i - 1];
        const [t1, v1] = frames[i];
        return v0 + ((t - t0) / (t1 - t0 || 1)) * (v1 - v0);
      }
    }
    return frames[frames.length - 1][1];
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ------------------------------------------------------------------ CanvasFX
  /**
   * Canvas twin of LiveFXRenderer for the recording. Mirrors timing and look of css/overlay.css:
   * card (pop 2.6 s), image (pop 2.8 s, static frame for GIFs), banner (slide 3.2 s), rain,
   * confetti and shake (jitter + white flash). `active` lists the running effects.
   */
  class CanvasFX {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.active = [];
      this.portrait = false;
      this.images = new Map(); // src -> HTMLImageElement (loaded or loading)
      /** Persistent scene layer (drawn first) – { id, t0, until, caption, particles, ... } or null. */
      this.scene = null;
      this._sceneOut = null; // previous scene while it crossfades out
      /** Optional hook called when a scene ends through its `duration`. */
      this.onSceneEnd = null;
      this._timers = new Set(); // combo step timers (cancelled by clear())
    }

    /** 1..3 (default 1) – scales rain / confetti counts like the DOM renderer. */
    _intensity(v) {
      const n = Math.round(Number(v && v.intensity));
      return Number.isFinite(n) ? Math.min(3, Math.max(1, n)) : 1;
    }

    /** Cancels pending combo steps and drops every running effect (the scene stays). */
    clear() {
      for (const t of this._timers) clearTimeout(t);
      this._timers.clear();
      this.active = [];
    }

    /** Big animated word (v2 `text` kind): neon glow | gradient | bounce | glitch | sticker (2.1), 3 s, letters staggered. */
    bigText(v, now) {
      const text = typeof v.text === 'string' ? v.text.trim() : '';
      if (!text) {
        this.card({ emoji: v.emoji || '💬', position: v.position }, now);
        return;
      }
      const styles = Array.isArray(S.TEXT_STYLES) ? S.TEXT_STYLES : ['neon', 'gradient', 'bounce', 'glitch', 'sticker'];
      const style = styles.includes(v.style) ? v.style : 'neon';
      const sticker = style === 'sticker';
      this._add({
        kind: 'text',
        t0: now,
        dur: 3000,
        // spaces are kept (like the overlay's .fx-space) so „YOK ARTIK“ does not become „YOKARTIK“
        letters: text.split(/\s+/).flatMap((w, i) => (i ? [' ', ...graphemes(w)] : graphemes(w))).slice(0, 40),
        style,
        c1: safeColor(v.color) || (sticker ? '#ffd166' : '#ff512f'),
        c2: safeColor(v.color2) || (sticker ? '#ff2d75' : '#dd2476'),
        emoji: typeof v.emoji === 'string' ? v.emoji : '',
        glow: v.glow === true || !styles.includes(v.style) || v.style === 'neon',
        position: v.position,
      });
    }

    /** Lower third (v2): bottom-left bar with title + subtitle, 4 s; portrait falls back to a banner. */
    lowerThird(v, now) {
      const title = typeof v.title === 'string' && v.title.trim() ? v.title.trim() : typeof v.text === 'string' ? v.text.trim() : '';
      const subtitle = typeof v.subtitle === 'string' ? v.subtitle.trim() : '';
      if (this.portrait) {
        this.banner({ emoji: v.emoji, text: subtitle ? `${title} · ${subtitle}` : title }, now);
        return;
      }
      this._add({ kind: 'lower-third', t0: now, dur: 4000, title: title || '…', subtitle, emoji: typeof v.emoji === 'string' ? v.emoji : '', accent: safeColor(v.color) || '#ff512f' });
    }

    /** Combo (v2): schedules each step's visual through fire(); sounds are the page's business (render()). */
    combo(v, now) {
      const steps = Array.isArray(v.steps) ? v.steps.slice(0, 6) : [];
      if (!steps.length) {
        this.card({ emoji: v.emoji || '🎬', text: v.text, position: v.position }, now);
        return;
      }
      for (const s of steps) {
        if (!s || typeof s !== 'object') continue;
        const sv = s.visual && typeof s.visual === 'object' ? s.visual : {};
        if (sv.kind === 'combo') continue;
        let delay = Number(s.delay);
        if (!Number.isFinite(delay) || delay < 0) delay = 0;
        const t = setTimeout(() => {
          this._timers.delete(t);
          this.fire({ visual: sv });
        }, Math.min(10000, delay));
        this._timers.add(t);
      }
    }

    get W() {
      return this.canvas.width;
    }
    get H() {
      return this.canvas.height;
    }

    fire(trigger, now = performance.now()) {
      if (!trigger || typeof trigger !== 'object') return;
      const v = trigger.visual && typeof trigger.visual === 'object' ? trigger.visual : {};
      switch (v.kind) {
        case 'scene':
          this.setScene(v, now);
          break;
        case 'text':
          this.bigText(v, now);
          break;
        case 'lower-third':
          this.lowerThird(v, now);
          break;
        case 'combo':
          this.combo(v, now);
          break;
        case 'sticker':
          this.sticker(v, now);
          break;
        case 'rain':
          this.rain(v, now);
          break;
        case 'banner':
          this.banner(v, now);
          break;
        case 'confetti':
          this.confetti(v, now);
          break;
        case 'image':
          this.image(v, now);
          break;
        case 'card':
        default:
          this.card(v, now);
      }
      if (v.shake) this.shake(now);
    }

    /** Scene layer: same rules as the DOM renderer (crossfade, same scene = caption update, clear, duration). */
    setScene(v, now) {
      const id = typeof v.scene === 'string' && S.SCENES.includes(v.scene) ? v.scene : '';
      if (!id) {
        this.card({ emoji: v.emoji, text: v.text, position: v.position }, now);
        return;
      }
      if (id === 'clear') {
        this.clearScene(now);
        return;
      }
      const caption = v.caption === false ? '' : typeof v.text === 'string' ? v.text.trim() : '';
      const d = Number(v.duration);
      const until = Number.isFinite(d) && d > 0 ? now + d * 1000 : 0;
      if (this.scene && this.scene.id === id) {
        this.scene.caption = caption;
        this.scene.until = until;
        return;
      }
      if (this.scene) this._sceneOut = { ...this.scene, tOut: now };
      const def = CANVAS_SCENES[id] || { stops: ['#000', '#222'], particles: [] };
      let intensity = Math.round(Number(v.intensity));
      if (!Number.isFinite(intensity)) intensity = 2;
      intensity = Math.min(3, Math.max(1, intensity));
      const override = typeof v.emoji === 'string' && v.emoji.trim() ? graphemes(v.emoji).slice(0, 4) : null;
      const stars = [];
      for (let i = 0; i < (def.stars || 0); i++) stars.push({ x: Math.random(), y: Math.random() * 0.7, r: rand(0.6, 1.8), phase: Math.random() * Math.PI * 2 });
      this.scene = {
        id,
        def,
        t0: now,
        until,
        caption,
        override,
        every: Math.max(40, Math.round((def.every || 400) * (2 / intensity))),
        lastSpawn: 0,
        particles: [],
        stars,
        nextFlash: now + rand(800, 3000),
        flashAt: -1e9,
      };
    }

    clearScene(now = performance.now()) {
      if (!this.scene) return;
      this._sceneOut = { ...this.scene, tOut: now };
      this.scene = null;
    }

    /** Emoji row with staggered bounce + optional text, 2.8 s (mirrors .fx-sticker). */
    sticker(v, now) {
      const list = graphemes(v.emoji).slice(0, 4);
      if (!list.length) list.push('⭐');
      this._add({ kind: 'sticker', t0: now, dur: STICKER_MS, emojis: list, text: typeof v.text === 'string' ? v.text : '', position: v.position });
    }

    _add(fx) {
      this.active.push(fx);
    }

    /** Vertical anchor + self offset like .fx-pos-* in overlay.css. Returns {top, ty} in px / factor. */
    _anchor(v) {
      const pos = S.POSITIONS.includes(v.position) ? v.position : 'center';
      if (pos === 'top') return { top: this.H * 0.18, ty: 0 };
      if (pos === 'safe' && this.portrait) return { top: this.H * 0.32, ty: -0.5 };
      return { top: this.H * 0.5, ty: -0.5 };
    }

    card(v, now) {
      this._add({
        kind: 'card',
        t0: now,
        dur: 2600,
        emoji: typeof v.emoji === 'string' ? v.emoji : '',
        text: typeof v.text === 'string' ? v.text : '',
        bg: safeColor(v.bg) || '#111',
        color: safeColor(v.color) || '#fff',
        position: v.position,
      });
    }

    image(v, now) {
      const src = safeSrc(v.src);
      if (!src) {
        this.card({ emoji: v.emoji || '🖼️', text: v.text, position: v.position }, now);
        return;
      }
      this._add({
        kind: 'image',
        t0: now,
        dur: 2800,
        img: this._loadImage(src),
        sticker: src.startsWith('memes/'), // bundled sticker: free-floating, no dark card box
        emoji: typeof v.emoji === 'string' && v.emoji ? v.emoji : '🖼️', // shown when the image fails to load
        text: typeof v.text === 'string' ? v.text : '',
        position: v.position,
      });
    }

    _loadImage(src) {
      if (this.images.has(src)) return this.images.get(src);
      const img = new Image();
      // Cross-origin images would taint the canvas and kill captureStream – ask for CORS; assets are same-origin.
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.setAttribute('src', src);
      this.images.set(src, img);
      if (this.images.size > 40) this.images.delete(this.images.keys().next().value);
      return img;
    }

    banner(v, now) {
      this._add({ kind: 'banner', t0: now, dur: 3200, emoji: typeof v.emoji === 'string' ? v.emoji : '', text: typeof v.text === 'string' ? v.text : '' });
    }

    rain(v, now) {
      let count = Math.round(Number(v.count));
      if (!Number.isFinite(count) || count < 1) count = 20;
      count = Math.min(S.LIMITS.rainCount, count) * this._intensity(v);
      const emoji = typeof v.emoji === 'string' && v.emoji ? v.emoji : '✨';
      const drops = [];
      for (let i = 0; i < count; i++) {
        drops.push({ x: Math.random(), size: rand(28, 72), dur: rand(1800, 3200), delay: rand(0, 900) });
      }
      this._add({ kind: 'rain', t0: now, dur: 4500, emoji, drops });
    }

    confetti(v, now) {
      const bits = [];
      for (let i = 0; i < CONFETTI_COUNT * this._intensity(v); i++) {
        bits.push({ x: Math.random(), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], dur: rand(2000, 3500), delay: rand(0, 600), rot: rand(0, 360) });
      }
      this._add({ kind: 'confetti', t0: now, dur: 4500, bits });
      if (v.emoji || v.text) this.card({ emoji: v.emoji, text: v.text, bg: 'rgba(0,0,0,.75)', color: '#fff', position: v.position }, now);
    }

    shake(now) {
      this._add({ kind: 'shake', t0: now, dur: 500 });
    }

    /** Removes finished effects. Returns the current shake offset {x, y} (0 when idle). */
    prune(now = performance.now()) {
      this.active = this.active.filter((fx) => now - fx.t0 < fx.dur);
      if (this._sceneOut && now - this._sceneOut.tOut > SCENE_FADE_MS) this._sceneOut = null;
      const sc = this.scene;
      if (sc) {
        sc.particles = sc.particles.filter((p) => now - p.t0 < p.dur);
        if (sc.until && now >= sc.until) {
          this.clearScene(now);
          if (typeof this.onSceneEnd === 'function') this.onSceneEnd(sc.id);
        }
      }
    }

    /** Offset to apply to the whole frame (screen shake), like @keyframes fx-shake. */
    shakeOffset(now) {
      let x = 0;
      let y = 0;
      for (const fx of this.active) {
        if (fx.kind !== 'shake') continue;
        const t = (now - fx.t0) / fx.dur;
        x += kf([[0, 0], [0.2, -14], [0.4, 12], [0.6, -8], [0.8, 6], [1, 0]], t);
        y += kf([[0, 0], [0.2, 8], [0.4, -6], [0.6, 6], [0.8, -4], [1, 0]], t);
      }
      return { x, y };
    }

    /** Draws every active effect on top of whatever is already on the canvas. */
    draw(now = performance.now()) {
      this.prune(now);
      const ctx = this.ctx;
      // Scene layer first: the outgoing one fades under the incoming one (800 ms crossfade like the DOM).
      for (const sc of [this._sceneOut, this.scene]) {
        if (!sc) continue;
        ctx.save();
        try {
          const alpha = sc.tOut !== undefined ? 1 - Math.min(1, (now - sc.tOut) / SCENE_FADE_MS) : Math.min(1, (now - sc.t0) / SCENE_FADE_MS);
          this._drawScene(sc, now, alpha);
        } catch (_) {
          /* never let the scene break the frame */
        }
        ctx.restore();
      }
      for (const fx of this.active) {
        const t = (now - fx.t0) / fx.dur;
        ctx.save();
        try {
          if (fx.kind === 'card' || fx.kind === 'image') this._drawCard(fx, t, now);
          else if (fx.kind === 'banner') this._drawBanner(fx, t);
          else if (fx.kind === 'rain') this._drawRain(fx, now);
          else if (fx.kind === 'confetti') this._drawConfetti(fx, now);
          else if (fx.kind === 'shake') this._drawFlash(now - fx.t0);
          else if (fx.kind === 'sticker') this._drawSticker(fx, t, now);
          else if (fx.kind === 'text') this._drawText(fx, t, now);
          else if (fx.kind === 'lower-third') this._drawLowerThird(fx, t);
        } catch (_) {
          /* never let one effect break the frame */
        }
        ctx.restore();
      }
    }

    _pop(t) {
      // @keyframes fx-pop: scale / rotate / opacity keyframes.
      return {
        scale: kf([[0, 0.2], [0.12, 1.15], [0.2, 1], [0.85, 1], [1, 0.6]], t),
        rot: kf([[0, -8], [0.12, 3], [0.2, 0], [1, 0]], t),
        alpha: kf([[0, 0], [0.12, 1], [0.85, 1], [1, 0]], t),
      };
    }

    _drawCard(fx, t, now) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const { scale, rot, alpha } = this._pop(t);
      const emojiSize = Math.min(160, W * 0.22);
      const textSize = Math.min(64, W * 0.09);
      const padX = Math.min(48, W * 0.05);
      const padY = Math.min(28, W * 0.03);
      const maxW = W * 0.92;

      let bodyW = 0;
      let bodyH = 0;
      let imgW = 0;
      let imgH = 0;
      const broken = fx.kind === 'image' && fx.img && fx.img.complete && !(fx.img.naturalWidth > 0);
      const isImage = fx.kind === 'image' && !broken;
      const noBox = isImage && fx.sticker;
      if (isImage) {
        const img = fx.img;
        const ok = img && img.complete && img.naturalWidth > 0;
        const maxImgW = fx.sticker ? Math.min(300, W * (this.portrait ? 0.46 : 0.26)) : this.portrait ? W * 0.8 : W * 0.4;
        const maxImgH = this.portrait ? H * 0.4 : H * 0.45;
        if (ok) {
          const k = Math.min(maxImgW / img.naturalWidth, maxImgH / img.naturalHeight, 1);
          imgW = img.naturalWidth * k;
          imgH = img.naturalHeight * k;
        } else {
          imgW = Math.min(maxImgW, 240);
          imgH = Math.min(maxImgH, 160);
        }
        bodyW = imgW;
        bodyH = imgH;
      } else {
        ctx.font = `${emojiSize}px ${FONT}`;
        bodyW = fx.emoji ? ctx.measureText(fx.emoji).width : 0;
        bodyH = fx.emoji ? emojiSize : 0;
      }
      const text = (fx.text || '').toUpperCase();
      let textW = 0;
      if (text) {
        ctx.font = `900 ${textSize}px ${FONT}`;
        textW = ctx.measureText(text).width + text.length * textSize * 0.04;
        bodyH += (bodyH ? 8 : 0) + textSize * 1.15;
      }
      const cardW = Math.min(maxW, Math.max(bodyW, textW) + padX * 2);
      const cardH = bodyH + padY * 2;
      const { top, ty } = this._anchor(fx);
      const cx = W / 2;
      const cy = top + ty * cardH + cardH / 2;

      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(scale, scale);
      if (!noBox) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetY = 20;
        ctx.fillStyle = isImage || broken ? '#111' : fx.bg;
        roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 32);
        ctx.fill();
      }
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      let y = -cardH / 2 + padY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (isImage) {
        const img = fx.img;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          roundRect(ctx, -imgW / 2, y, imgW, imgH, 20);
          ctx.clip();
          ctx.drawImage(img, -imgW / 2, y, imgW, imgH);
          ctx.restore();
        } else {
          ctx.fillStyle = '#333';
          roundRect(ctx, -imgW / 2, y, imgW, imgH, 20);
          ctx.fill();
        }
        y += imgH;
      } else if (fx.emoji) {
        ctx.fillStyle = fx.color || '#fff';
        ctx.font = `${emojiSize}px ${FONT}`;
        ctx.fillText(fx.emoji, 0, y, cardW - padX * 2);
        y += emojiSize;
      }
      if (text) {
        y += bodyW || imgW ? 8 : 0;
        ctx.fillStyle = fx.kind === 'image' ? '#fff' : fx.color;
        ctx.font = `900 ${textSize}px ${FONT}`;
        if (noBox) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = textSize * 0.2;
          ctx.strokeStyle = '#1b1530';
          ctx.strokeText(text, 0, y + textSize * 0.08, cardW - padX * 2);
        }
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowOffsetY = 4;
        ctx.fillText(text, 0, y + textSize * 0.08, cardW - padX * 2);
      }
      void now;
    }

    _drawBanner(fx, t) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const fontSize = Math.min(72, W * 0.08);
      const barH = fontSize * 1.2 + 36;
      const dx = kf([[0, -1.1], [0.15, 0], [0.85, 0], [1, 1.1]], t) * W;
      const y = H * 0.12;
      ctx.translate(dx, 0);
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#ff512f');
      grad.addColorStop(1, '#dd2476');
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, W, barH);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${fontSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const e = fx.emoji ? `${fx.emoji} ` : '';
      const label = `${e}${(fx.text || '').toUpperCase()}${fx.emoji ? ` ${fx.emoji}` : ''}`;
      ctx.fillText(label, W / 2, y + barH / 2, W * 0.96);
    }

    _fall() {
      return this.H * (this.portrait ? 0.62 : 1.15);
    }

    _drawRain(fx, now) {
      const ctx = this.ctx;
      const fall = this._fall();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 6;
      for (const d of fx.drops) {
        const t = (now - fx.t0 - d.delay) / d.dur;
        if (t < 0 || t > 1) continue;
        ctx.save();
        ctx.globalAlpha = kf([[0, 1], [0.9, 1], [1, 0]], t);
        ctx.translate(d.x * this.W, -100 + t * fall);
        ctx.rotate(t * 2 * Math.PI);
        ctx.font = `${d.size}px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(fx.emoji, 0, 0);
        ctx.restore();
      }
    }

    _drawConfetti(fx, now) {
      const ctx = this.ctx;
      const fall = this._fall();
      for (const b of fx.bits) {
        const t = (now - fx.t0 - b.delay) / b.dur;
        if (t < 0 || t > 1) continue;
        const eased = t * t; // ease-in
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(b.x * this.W + 7, -20 + eased * fall + 11);
        ctx.rotate(((b.rot + eased * 720) * Math.PI) / 180);
        ctx.fillStyle = b.color;
        roundRect(ctx, -7, -11, 14, 22, 3);
        ctx.fill();
        ctx.restore();
      }
    }

    _drawScene(sc, now, alpha) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const def = sc.def;
      ctx.globalAlpha = alpha;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      def.stops.forEach((c, i) => grad.addColorStop(i / (def.stops.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (sc.stars.length) {
        for (const st of sc.stars) {
          const tw = 0.45 + 0.55 * Math.abs(Math.sin(now / 900 + st.phase));
          ctx.globalAlpha = alpha * tw;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
      }
      if (def.streaks) {
        // Diagonal rain streaks scrolling downwards (repeating pattern like the CSS gradient).
        ctx.strokeStyle = def.streaks;
        ctx.lineWidth = 2;
        const step = 26;
        const off = (now / 2) % 120;
        ctx.beginPath();
        for (let x = -H * 0.2; x < W; x += step) {
          for (let y = -120 + off; y < H; y += 120) {
            ctx.moveTo(x + y * 0.14, y);
            ctx.lineTo(x + (y + 34) * 0.14, y + 34);
          }
        }
        ctx.stroke();
      }
      if (def.glow) {
        const f = 0.8 + 0.2 * Math.abs(Math.sin(now / 70)) * Math.abs(Math.cos(now / 130));
        const g = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.75 * f);
        g.addColorStop(0, 'rgba(255,225,120,0.75)');
        g.addColorStop(0.3, 'rgba(255,140,40,0.35)');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (def.sun) {
        const t = Math.min(1, (now - sc.t0) / 16000);
        const r = Math.min(210, W * 0.2);
        const cy = H * (0.95 - 0.3 * t);
        const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, r);
        g.addColorStop(0, '#fff6c8');
        g.addColorStop(0.45, '#ffd36b');
        g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (def.waves) {
        for (let k = 0; k < 2; k++) {
          ctx.fillStyle = k ? 'rgba(120,200,255,0.28)' : 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          const base = H * (this.portrait ? 0.63 : 0.53) + k * 12;
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 8) {
            const y = base + Math.sin(x / 90 + now / (900 + k * 400) * (k ? -1 : 1)) * 10 + Math.sin(x / 37 + now / 700) * 4;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (def.lightning) {
        if (now >= sc.nextFlash) {
          sc.flashAt = now;
          sc.nextFlash = now + rand(2500, 6500);
        }
        const dt = now - sc.flashAt;
        if (dt < 260) {
          const a = dt < 80 ? 0.85 : dt < 130 ? 0.15 : dt < 200 ? 0.6 : 0.6 * (1 - (dt - 200) / 60);
          ctx.globalAlpha = alpha * Math.max(0, a);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = alpha;
        }
      }
      ctx.textBaseline = 'alphabetic';
      if (def.decor) {
        const size = Math.min(180, W * 0.14);
        ctx.font = `${size}px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.shadowColor = 'rgba(255,255,255,0.55)';
        ctx.shadowBlur = 40;
        ctx.fillText(def.decor, W * 0.92, H * 0.06 + size - Math.abs(Math.sin(now / 4000)) * H * 0.04);
        ctx.shadowBlur = 0;
      }
      if (def.ground) {
        const size = Math.min(150, W * 0.12) * (def.groundScale || 1);
        ctx.font = `${size}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.filter = 'brightness(0.25) saturate(0.5)';
        ctx.fillText(def.ground, W / 2, (this.portrait ? H * 0.66 : H * 1.02) - size * 0.12, W);
        ctx.filter = 'none';
      }

      // Particles: spawn on the interval, capped at 40, then draw by mode.
      if (sc.tOut === undefined && def.particles.length && now - sc.lastSpawn >= sc.every && sc.particles.length < SCENE_PARTICLE_CAP) {
        sc.lastSpawn = now;
        const p = def.particles[Math.floor(Math.random() * def.particles.length)];
        sc.particles.push({
          t0: now,
          dur: rand(p.dur[0], p.dur[1]),
          emoji: sc.override ? sc.override[Math.floor(Math.random() * sc.override.length)] : p.emoji,
          mode: p.mode,
          x: Math.random(),
          y: rand(0.04, 0.7),
          size: rand(p.size[0], p.size[1]),
          flip: Math.random() < 0.5 ? -1 : 1,
        });
      }
      const fall = this._fall();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      for (const p of sc.particles) {
        const t = Math.min(1, (now - p.t0) / p.dur);
        let x = p.x * W;
        let y = 0;
        let a = 1;
        let scale = 1;
        let rot = 0;
        if (p.mode === 'fall') {
          y = -80 + t * fall;
          x += Math.sin(t * Math.PI) * 18;
          a = t < 0.08 ? t / 0.08 : t > 0.9 ? (1 - t) / 0.1 : 1;
          rot = Math.sin(t * Math.PI) * 20;
        } else if (p.mode === 'rise') {
          y = (this.portrait ? fall : fall - H * 0.1) - t * fall * 0.75;
          x += t * 40 * p.flip;
          a = t < 0.15 ? t / 0.15 : 1 - t;
          scale = 0.6 + t * 0.5;
        } else if (p.mode === 'drift' || p.mode === 'drive') {
          x = -120 + t * (W + 260);
          y = p.mode === 'drive' ? (this.portrait ? H * 0.63 : H * 0.99) - p.size : p.y * H + Math.sin(t * Math.PI) * -H * 0.03;
          a = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
        } else if (p.mode === 'comet') {
          y = p.y * 0.4 * H + t * t * fall * 0.45;
          x -= t * t * W * 0.6;
          a = t < 0.15 ? t / 0.15 : 1 - t;
          rot = -20;
        } else {
          // twinkle
          y = p.y * H;
          a = Math.sin(t * Math.PI);
          scale = 0.2 + 0.8 * Math.sin(t * Math.PI);
          rot = t * 40;
        }
        ctx.save();
        ctx.globalAlpha = alpha * Math.max(0, Math.min(1, a));
        ctx.translate(x, y);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.scale(scale * (p.mode === 'drift' || p.mode === 'drive' ? p.flip : 1), scale);
        ctx.font = `${p.size}px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }
      ctx.shadowBlur = 0;

      if (sc.caption) {
        const size = Math.min(44, W * 0.045);
        ctx.font = `700 ${size}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = Math.min(W * 0.86, ctx.measureText(sc.caption).width + 60);
        const th = size * 1.5 + 12;
        const cy = this.portrait ? H * 0.3 + th / 2 : H * 0.93 - th / 2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, W / 2 - tw / 2, cy - th / 2, tw, th, th / 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillText(sc.caption, W / 2, cy + 1, tw - 40);
        ctx.shadowBlur = 0;
      }
    }

    _drawSticker(fx, t, now) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const size = Math.min(150, W * 0.17);
      const gap = Math.min(24, W * 0.02);
      const textSize = fx.text ? Math.min(56, W * 0.07) : 0;
      const rowW = fx.emojis.length * size + (fx.emojis.length - 1) * gap;
      const totalH = size * 1.1 + (fx.text ? textSize * 1.2 + 4 : 0);
      const life = kf([[0, 0], [0.12, 1], [0.85, 1], [1, 0]], t);
      const scale = kf([[0, 0.4], [0.12, 1.08], [0.2, 1], [0.85, 1], [1, 0.7]], t);
      const { top, ty } = this._anchor(fx);
      const cy = top + ty * totalH + totalH / 2;
      ctx.globalAlpha = life;
      ctx.translate(W / 2, cy);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${size}px ${FONT}`;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 12;
      fx.emojis.forEach((e, i) => {
        const phase = ((now - fx.t0) / 900 - i * 0.13 / 0.9) % 1;
        const bounce = -22 * Math.sin(Math.max(0, phase) * Math.PI);
        const x = -rowW / 2 + size / 2 + i * (size + gap);
        ctx.fillText(e, x, -totalH / 2 + bounce);
      });
      if (fx.text) {
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${textSize}px ${FONT}`;
        ctx.fillText(fx.text.toUpperCase(), 0, -totalH / 2 + size * 1.1 + 4, W * 0.92);
      }
    }

    /** Canvas twin of .fx-bigtext: staggered letters, style-specific fill / glow / bounce / glitch. */
    _drawText(fx, t, now) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const sticker = fx.style === 'sticker';
      const size = sticker ? Math.min(this.portrait ? 96 : 124, W * (this.portrait ? 0.13 : 0.105)) : Math.min(150, W * (this.portrait ? 0.16 : 0.13));
      const emojiSize = fx.emoji ? Math.min(120, W * 0.14) : 0;
      const life = kf([[0, 0], [0.1, 1], [0.88, 1], [1, 0]], t);
      const scale = kf([[0, 0.8], [0.1, 1], [0.88, 1], [1, 1.15]], t);
      const { top, ty } = this._anchor(fx);
      const totalH = size * 1.05 + (emojiSize ? emojiSize + 6 : 0);
      const cy = top + ty * totalH + totalH / 2;
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const letters = fx.letters.map((g) => g.toUpperCase());
      const widths = letters.map((g) => ctx.measureText(g).width + size * 0.04);
      const rowW = widths.reduce((a, b) => a + b, 0);
      const k = Math.min(1, (W * 0.94) / Math.max(1, rowW));
      ctx.globalAlpha = life;
      ctx.translate(W / 2, cy);
      ctx.scale(scale * k, scale * k);
      let y = -totalH / 2;
      if (emojiSize) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${emojiSize}px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(fx.emoji, 0, y);
        ctx.restore();
        y += emojiSize + 6;
      }
      const baseline = y + size * 0.9;
      const elapsed = now - fx.t0;
      if (sticker) this._drawBurst(fx, rowW, size, y + size * 0.52, elapsed);
      let fill = fx.style === 'bounce' ? fx.c1 : '#fff';
      if (fx.style === 'gradient') {
        const g = ctx.createLinearGradient(-rowW / 2, 0, rowW / 2, 0);
        const off = (elapsed / 2000) % 1;
        g.addColorStop(0, off < 0.5 ? fx.c1 : fx.c2);
        g.addColorStop(0.5, off < 0.5 ? fx.c2 : fx.c1);
        g.addColorStop(1, off < 0.5 ? fx.c1 : fx.c2);
        fill = g;
      }
      let x = -rowW / 2;
      letters.forEach((g, i) => {
        const lt = Math.min(1, Math.max(0, (elapsed - i * 45) / 500));
        if (lt <= 0) {
          x += widths[i];
          return;
        }
        const inY = (1 - lt) * 40;
        const inS = 0.4 + 0.6 * lt;
        let dy = inY;
        if (fx.style === 'bounce') dy += -0.22 * size * Math.max(0, Math.sin(((elapsed - 500 - i * 70) / 800) * Math.PI * 2));
        ctx.save();
        ctx.globalAlpha = life * lt;
        ctx.translate(x + widths[i] / 2, baseline + dy);
        ctx.scale(inS, inS);
        ctx.font = `900 ${size}px ${FONT}`;
        ctx.textAlign = 'center';
        if (sticker) {
          // .fx-text-sticker letters: dark outline under a --c1 fill + one hard drop
          ctx.lineJoin = 'round';
          ctx.lineWidth = size * 0.28;
          ctx.strokeStyle = '#1b1530';
          ctx.strokeText(g, size * 0.04, size * 0.08);
          ctx.strokeText(g, 0, 0);
          ctx.fillStyle = fx.c1;
          ctx.fillText(g, 0, 0);
          ctx.restore();
          x += widths[i];
          return;
        }
        if (fx.glow || fx.style === 'neon') {
          const pulse = 0.7 + 0.3 * Math.abs(Math.sin(elapsed / 350));
          ctx.shadowColor = fx.c1;
          ctx.shadowBlur = 40 * pulse;
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowOffsetY = 6;
        }
        if (fx.style === 'glitch') {
          const j = Math.floor(elapsed / 70) % 3;
          ctx.fillStyle = fx.c1;
          ctx.fillText(g, [-6, 5, -3][j], -2);
          ctx.fillStyle = fx.c2;
          ctx.fillText(g, [5, -6, 3][j], 2);
          ctx.fillStyle = '#fff';
        } else ctx.fillStyle = fill;
        ctx.fillText(g, 0, 0);
        ctx.restore();
        x += widths[i];
      });
    }

    /** Comic burst behind a sticker word (twin of .fx-text-sticker .fx-word::before/::after): --c2 star, dark rim. */
    _drawBurst(fx, rowW, size, cy, elapsed) {
      const ctx = this.ctx;
      const w = rowW + size * 1.6; // padding 0.5em 0.8em like the CSS
      const h = size * 1.05 + size * 1.0;
      const pop = Math.min(1, elapsed / 450);
      const s = pop < 1 ? 0.1 + 0.9 * (1 - Math.pow(1 - pop, 3)) * 1.05 : 1 + 0.02 * Math.sin((elapsed - 450) / 500);
      const rot = ((pop < 1 ? -30 + 26 * pop : -4 + 3.5 * Math.sin((elapsed - 450) / 800)) * Math.PI) / 180;
      const pts = BURST_POINTS;
      ctx.save();
      ctx.translate(0, cy);
      ctx.rotate(rot);
      for (const [scale, color] of [[1.07, '#1b1530'], [1, fx.c2]]) {
        ctx.beginPath();
        pts.forEach(([px, py], i) => {
          const X = (px / 100 - 0.5) * w * s * scale;
          const Y = (py / 100 - 0.5) * h * s * scale;
          if (i) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();
    }

    /** Canvas twin of .fx-lower-third: bar bottom-left, slides in / out, accent stripe, title + subtitle. */
    _drawLowerThird(fx, t) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const titleSize = Math.min(48, W * 0.042);
      const subSize = fx.subtitle ? Math.min(28, W * 0.024) : 0;
      const emojiSize = fx.emoji ? Math.min(72, W * 0.06) : 0;
      ctx.font = `900 ${titleSize}px ${FONT}`;
      const tw = ctx.measureText(fx.title.toUpperCase()).width;
      ctx.font = `600 ${subSize}px ${FONT}`;
      const sw = fx.subtitle ? ctx.measureText(fx.subtitle).width : 0;
      const textW = Math.min(W * 0.6, Math.max(tw, sw));
      const barW = 22 + (emojiSize ? emojiSize + 18 : 0) + textW + 36 + 12;
      const barH = titleSize * 1.2 + (subSize ? subSize * 1.3 + 4 : 0) + 28;
      const x0 = W * 0.04;
      const y0 = H * 0.92 - barH;
      const dx = kf([[0, -1.2], [0.12, 0], [0.88, 0], [1, -1.2]], t) * (barW + x0);
      ctx.globalAlpha = kf([[0, 0], [0.12, 1], [0.88, 1], [1, 0]], t);
      ctx.translate(dx, 0);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#111';
      roundRect(ctx, x0, y0, barW, barH, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = fx.accent;
      ctx.fillRect(x0, y0 + 4, 12, barH - 8);
      let x = x0 + 22;
      ctx.textBaseline = 'middle';
      if (emojiSize) {
        ctx.font = `${emojiSize}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText(fx.emoji, x, y0 + barH / 2);
        x += emojiSize + 18;
      }
      const tIn = kf([[0, 0], [0.06, 0], [0.21, 1], [1, 1]], t);
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${titleSize}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.globalAlpha *= tIn;
      const titleY = subSize ? y0 + 14 + titleSize * 0.6 : y0 + barH / 2;
      ctx.fillText(fx.title.toUpperCase(), x - (1 - tIn) * 24, titleY, textW);
      if (subSize) {
        ctx.globalAlpha *= 0.85;
        ctx.font = `600 ${subSize}px ${FONT}`;
        ctx.fillText(fx.subtitle, x - (1 - tIn) * 24, titleY + titleSize * 0.6 + 4 + subSize * 0.65, textW);
      }
    }

    _drawFlash(elapsed) {
      if (elapsed > 400) return;
      const ctx = this.ctx;
      ctx.globalAlpha = 0.85 * (1 - elapsed / 400);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  // ------------------------------------------------------------------ page
  const params = new URLSearchParams(location.search);
  const stageEl = $('#stage');
  const frameEl = $('#frame');
  const camEl = $('#cam');
  const canvas = $('#rec-canvas');
  const noticeEl = $('#notice');
  const transcriptEl = $('#transcript');
  const padEl = $('#pad');
  const btnMic = $('#btn-mic');
  const btnRecord = $('#btn-record');
  const langEl = $('#lang');
  const volumeEl = $('#volume');
  const timerEl = $('#rec-timer');
  const badgeEl = $('#rec-badge');
  const resultEl = $('#result');
  const resultVideo = $('#result-video');
  const btnDownload = $('#btn-download');

  const renderer = new LiveFXRenderer.Renderer(stageEl);
  const canvasFx = new CanvasFX(canvas);
  const bus = new LiveFXBus.Bus({ role: 'panel' });
  const matcher = new LiveFXMatcher.Matcher([], LiveFXMatcher.TOLERANCES ? { tolerance: lsGet('livefx.asr.tolerance') || 'medium' } : {}); // same dialect tolerance as the panel

  const state = {
    ready: false,
    format: 'landscape',
    camera: false,
    mic: false,
    audio: false,
    recording: false,
    listening: false,
    volume: 0.8,
    loopName: null,
    triggers: [],
    lastBlob: null,
    error: null,
  };

  // ---------- notices ----------
  const notices = new Map();
  function notice(key, text) {
    if (text) notices.set(key, text);
    else notices.delete(key);
    const all = [...notices.values()];
    noticeEl.hidden = all.length === 0;
    noticeEl.innerHTML = all.map((t) => `<div>${esc(t)}</div>`).join('');
  }

  // ---------- format / frame ----------
  function applyFormat(fmt, { persist = true } = {}) {
    const f = FORMATS[fmt] ? fmt : 'landscape';
    state.format = f;
    document.body.classList.toggle('layout-portrait', f === 'portrait');
    canvasFx.portrait = f === 'portrait';
    if (!state.recording && (canvas.width !== FORMATS[f].w || canvas.height !== FORMATS[f].h)) {
      canvas.width = FORMATS[f].w;
      canvas.height = FORMATS[f].h;
    }
    for (const b of document.querySelectorAll('#bar .fmt')) b.classList.toggle('active', b.id === `fmt-${f}`);
    if (persist) lsSet(FORMAT_KEY, f);
    layoutFrame();
    if (typeof renderer.refreshLayout === 'function') renderer.refreshLayout(); // portrait band sits above the chat zone
  }

  /** Fits the frame (16:9 or 9:16) into the viewport, centred with black bars. */
  function layoutFrame() {
    const vw = global.innerWidth;
    const vh = global.innerHeight;
    const ratio = FORMATS[state.format].w / FORMATS[state.format].h;
    let w = vw;
    let h = w / ratio;
    if (h > vh) {
      h = vh;
      w = h * ratio;
    }
    w = Math.round(w);
    h = Math.round(h);
    frameEl.style.width = `${w}px`;
    frameEl.style.height = `${h}px`;
    frameEl.style.left = `${Math.round((vw - w) / 2)}px`;
    frameEl.style.top = `${Math.round((vh - h) / 2)}px`;
    // overlay.css positions rain/confetti with vw/vh units – pin them to the frame instead.
    document.body.style.setProperty('--fx-x0', '0px');
    document.body.style.setProperty('--fx-xspan', `${w}px`);
    document.body.style.setProperty('--fx-fall', `${Math.round(h * (state.format === 'portrait' ? 0.62 : 1.15))}px`);
  }

  // ---------- audio graph ----------
  // ctx -> mixNode -> speakers AND -> recDest (recorded). The mic goes to recDest only (no feedback).
  let audioCtx = null;
  let mixNode = null;
  let recDest = null;
  let micStream = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try {
        audioCtx = new AC();
        mixNode = audioCtx.createGain();
        mixNode.gain.value = 1;
        mixNode.connect(audioCtx.destination);
        recDest = audioCtx.createMediaStreamDestination();
        mixNode.connect(recDest);
        renderer.audioCtx = audioCtx; // the DOM renderer never plays sounds here, but keep it consistent
      } catch (_) {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  // ---------- ambient loops (story mode) ----------
  // One loop at a time, through mixNode so it is heard and recorded. LiveFXSounds.loop may be missing
  // (older sounds.js) – then loops are silently ignored.
  let ambient = null; // { name, handle, gain }

  function playLoop(name) {
    const sounds = global.LiveFXSounds;
    if (!sounds || typeof sounds.loop !== 'function' || !name) return false;
    if (ambient && ambient.name === name) return true;
    const ctx = ensureAudio();
    if (!ctx) return false;
    stopLoop();
    let gain;
    let handle;
    try {
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(state.volume, ctx.currentTime + LOOP_FADE_SEC);
      gain.connect(mixNode);
      handle = sounds.loop(name, ctx, gain, 1);
    } catch (_) {
      handle = null;
    }
    if (!handle || typeof handle.stop !== 'function') return false;
    ambient = { name, handle, gain };
    state.loopName = name;
    return true;
  }

  function stopLoop(fadeSec = LOOP_FADE_SEC) {
    const l = ambient;
    ambient = null;
    state.loopName = null;
    if (!l) return;
    try {
      const g = l.gain.gain;
      g.cancelScheduledValues(audioCtx.currentTime);
      g.setValueAtTime(g.value, audioCtx.currentTime);
      g.linearRampToValueAtTime(0, audioCtx.currentTime + fadeSec);
    } catch (_) {
      /* ignore */
    }
    try {
      l.handle.stop(fadeSec);
    } catch (_) {
      /* ignore */
    }
    setTimeout(() => {
      try {
        l.gain.disconnect();
      } catch (_) {
        /* ignore */
      }
    }, fadeSec * 1000 + 200);
  }

  /** Mirrors renderer.playSound but routes everything through mixNode (heard + recorded). */
  function playSound(spec) {
    const parsed = S.parseSound(spec);
    if (!parsed) return;
    if (parsed.kind === 'loop') {
      playLoop(parsed.name);
      return;
    }
    const ctx = ensureAudio();
    if (!ctx) return;
    if (parsed.kind === 'builtin') {
      try {
        global.LiveFXSounds.play(parsed.name, ctx, mixNode, state.volume);
      } catch (_) {
        /* unknown builtin */
      }
      return;
    }
    playFile(parsed.url, ctx);
  }

  function playFile(url, ctx) {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.setAttribute('src', url);
    audio.style.display = 'none';
    stageEl.appendChild(audio);
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
    let routed = false;
    try {
      const src = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = state.volume;
      src.connect(gain).connect(mixNode);
      routed = true;
    } catch (_) {
      routed = false;
    }
    if (!routed) audio.volume = clamp01(state.volume);
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  // ---------- firing ----------
  function publicTrigger(t) {
    const out = {};
    for (const k of Object.keys(t)) if (!k.startsWith('_')) out[k] = t[k];
    return out;
  }

  /** Renders a trigger locally (DOM + canvas) and plays its sound through the mix. */
  function render(trigger) {
    if (!trigger || typeof trigger !== 'object') return;
    const silent = { ...trigger, sound: null }; // sounds are ours (mixNode), not the renderer's
    const v = trigger.visual && typeof trigger.visual === 'object' ? trigger.visual : {};
    if (v.kind === 'scene' && v.scene === 'clear') stopLoop(); // the renderer would do this for its own loop
    if (v.kind === 'combo' && Array.isArray(v.steps)) {
      // Combo step sounds go through the mix too (and are stripped from the renderer's copy, no double play).
      silent.visual = { ...v, steps: v.steps.map((s) => (s && typeof s === 'object' ? { ...s, sound: null } : s)) };
      v.steps.slice(0, 6).forEach((s) => {
        if (!s || typeof s !== 'object' || !s.sound) return;
        const delay = Number(s.delay);
        setTimeout(() => playSound(s.sound), Number.isFinite(delay) && delay > 0 ? Math.min(10000, delay) : 0);
      });
    }
    renderer.fire(silent);
    canvasFx.fire(trigger);
    if (trigger.sound) playSound(trigger.sound);
  }
  canvasFx.onSceneEnd = () => stopLoop();

  /** Local fire: render here and tell every overlay on the bus. */
  function fire(trigger, source) {
    if (!trigger || typeof trigger !== 'object') return;
    const t = publicTrigger(trigger);
    render(t);
    bus.send({ type: 'fire', trigger: t, source: String(source || 'Demo').slice(0, S.LIMITS.sourceLen) });
  }

  bus.onMessage((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'fire') render(msg.trigger);
  });

  // ---------- transcript + matcher ----------
  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Escaped transcript HTML with every matched keyword wrapped in <mark>. */
  function highlight(text, keywords) {
    const raw = String(text);
    const ranges = [];
    for (const kw of keywords) {
      const words = String(kw || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => escapeRegExp(w).replace(/'/g, "['’´`]"));
      if (!words.length) continue;
      let re;
      try {
        re = new RegExp(`(^|[^\\p{L}\\p{N}])(${words.join('[^\\p{L}\\p{N}]+')})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
      } catch (_) {
        continue;
      }
      let m;
      while ((m = re.exec(raw)) !== null) {
        const start = m.index + m[1].length;
        ranges.push([start, start + m[2].length]);
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let html = '';
    let pos = 0;
    for (const [start, end] of ranges) {
      if (start < pos) continue;
      html += `${esc(raw.slice(pos, start))}<mark>${esc(raw.slice(start, end))}</mark>`;
      pos = end;
    }
    return html + esc(raw.slice(pos));
  }

  function handleText(text, isFinal, meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    const str = String(text == null ? '' : text);
    const hits = matcher.process(str);
    transcriptEl.innerHTML = `<span class="${isFinal ? 'final' : 'interim'}">${highlight(str, hits.map((h) => h.keyword))}</span>`;
    for (const h of hits) fire(h.trigger, `${String(m.source || 'Mikro')}: „${h.keyword}“`);
    if (isFinal) matcher.endUtterance();
    feedStory(str, isFinal);
  }

  // ---------- 2.2 story band + live story ----------
  // Layout (band | full | frame, zone) from ?story= / ?band= / ?zone= or the two selects; the live story
  // (checkbox) feeds every transcript line into the director, whose state the DOM renderer draws in the band
  // (the CanvasFX twin gets the scene for the recording) and is sent on the bus as `story` so OBS overlays follow.
  const storyLayoutEl = $('#story-layout');
  const zoneEl = $('#zone');
  const liveStoryEl = $('#live-story');
  const STORY_KEY = 'livefx.demo.story';
  const director = global.LiveFXStoryDirector ? global.LiveFXStoryDirector.create({ lang: 'auto', caption: false }) : null;
  let storyScene = null;
  if (director) {
    director.onChange((st) => {
      renderer.story(st);
      const scene = st.scene || null;
      if (scene !== storyScene) {
        storyScene = scene;
        canvasFx.fire({ visual: { kind: 'scene', scene: scene || 'clear', intensity: 2 } });
        if (scene) playLoop(st.loop || null);
        else stopLoop();
      }
    });
  }
  function applyLayout(patch) {
    const l = renderer.setLayout(patch || {});
    if (storyLayoutEl) storyLayoutEl.value = l.storyLayout;
    if (zoneEl) zoneEl.value = l.zone;
    return l;
  }
  function feedStory(text, isFinal) {
    if (!director || !liveStoryEl || !liveStoryEl.checked) return;
    const line = String(text || '').trim();
    if (!line) return;
    const lang = String(langEl.value || '').slice(0, 2);
    director.feed(line, { final: isFinal !== false, lang });
    if (isFinal !== false) bus.send({ type: 'story', text: line.slice(0, S.LIMITS.storyText || 500), final: true, lang, source: 'Demo' });
  }
  if (storyLayoutEl) storyLayoutEl.addEventListener('change', () => applyLayout({ storyLayout: storyLayoutEl.value }));
  if (zoneEl) zoneEl.addEventListener('change', () => applyLayout({ zone: zoneEl.value }));
  if (liveStoryEl) {
    liveStoryEl.checked = lsGet(STORY_KEY) === '1';
    liveStoryEl.addEventListener('change', () => {
      lsSet(STORY_KEY, liveStoryEl.checked ? '1' : '0');
      if (!liveStoryEl.checked && director) director.reset();
    });
  }

  // ---------- ASR ----------
  const savedLang = lsGet(LANG_KEY);
  if (savedLang && [...langEl.options].some((o) => o.value === savedLang)) langEl.value = savedLang;

  const asr = LiveFXASR.create('webspeech', {
    lang: langEl.value,
    bus,
    onText: (text, isFinal, meta) => handleText(text, isFinal, meta),
    onState: (s) => {
      state.listening = s === 'listening' || s === 'starting' || s === 'restarting';
      btnMic.classList.toggle('on', state.listening);
      btnMic.textContent = state.listening ? '🎙️ Mikro stoppen' : '🎙️ Mikro starten';
    },
    onError: (e) => {
      notice('asr', e && e.message ? e.message : 'Spracherkennung: Fehler');
      if (e && e.fatal) state.listening = false;
    },
  });

  btnMic.addEventListener('click', () => {
    ensureAudio();
    if (state.listening) asr.stop();
    else {
      notice('asr', '');
      asr.start();
    }
  });
  langEl.addEventListener('change', () => {
    lsSet(LANG_KEY, langEl.value);
    asr.setLang(langEl.value);
  });

  // ---------- volume ----------
  volumeEl.addEventListener('input', () => {
    state.volume = clamp01(Number(volumeEl.value) || 0);
    renderer.volume = state.volume;
    if (ambient && audioCtx) {
      try {
        ambient.gain.gain.cancelScheduledValues(audioCtx.currentTime);
        ambient.gain.gain.setTargetAtTime(state.volume, audioCtx.currentTime, 0.05);
      } catch (_) {
        /* ignore */
      }
    }
  });

  // ---------- soundboard ----------
  function renderPad() {
    padEl.innerHTML = '';
    for (const t of state.triggers.filter((x) => x.enabled !== false).slice(0, 8)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = t.id;
      const v = t.visual || {};
      const src = v.kind === 'image' ? safeSrc(v.src) : '';
      if (src) {
        const img = document.createElement('img');
        img.alt = '';
        img.setAttribute('src', src);
        b.appendChild(img);
      } else if (v.emoji) {
        b.appendChild(document.createTextNode(`${v.emoji} `));
      }
      b.appendChild(document.createTextNode(t.label || t.id));
      b.addEventListener('click', () => {
        ensureAudio();
        fire(t, 'Demo-Pad');
      });
      padEl.appendChild(b);
    }
  }

  async function loadTriggers() {
    try {
      const res = await LiveFXStore.load();
      state.triggers = res.triggers;
    } catch (_) {
      state.triggers = S.normalizeTriggers(global.LiveFXDefaultTriggers || []).triggers;
    }
    matcher.setTriggers(state.triggers);
    renderPad();
  }
  if (LiveFXStore.onRemoteChange) LiveFXStore.onRemoteChange(() => loadTriggers());

  // ---------- webcam / mic ----------
  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notice('cam', 'Keine Kamera verfügbar (Browser ohne getUserMedia). Der Hintergrund bleibt schwarz.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      camEl.srcObject = stream;
      state.camera = true;
      notice('cam', '');
    } catch (e) {
      state.camera = false;
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      notice('cam', denied
        ? 'Kamera-Zugriff verweigert. Bitte in der Adressleiste die Kamera erlauben und die Seite neu laden – bis dahin bleibt der Hintergrund schwarz.'
        : 'Keine Kamera gefunden – die Aufnahme läuft mit schwarzem Hintergrund.');
    }
  }

  async function openMic() {
    if (micStream) return true;
    const ctx = ensureAudio();
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(micStream);
      src.connect(recDest); // recorded, not played back (no echo)
      state.mic = true;
      notice('mic', '');
      return true;
    } catch (e) {
      state.mic = false;
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      notice('mic', denied ? 'Mikrofon-Zugriff verweigert – die Aufnahme enthält nur die Effekt-Sounds.' : 'Kein Mikrofon gefunden – die Aufnahme enthält nur die Effekt-Sounds.');
      return false;
    }
  }

  // ---------- composition loop ----------
  function drawFrame(now) {
    const ctx = canvasFx.ctx;
    const W = canvas.width;
    const H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const off = canvasFx.shakeOffset(now);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(off.x, off.y);
    if (state.camera && camEl.readyState >= 2 && camEl.videoWidth > 0) {
      const vw = camEl.videoWidth;
      const vh = camEl.videoHeight;
      const k = Math.max(W / vw, H / vh); // cover-fit
      const dw = vw * k;
      const dh = vh * k;
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1); // mirrored like the live view
      ctx.drawImage(camEl, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }
    canvasFx.draw(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function loop(now) {
    if (state.recording) drawFrame(now);
    else canvasFx.prune(now);
    global.requestAnimationFrame(loop);
  }
  global.requestAnimationFrame(loop);

  // ---------- recording ----------
  let recorder = null;
  let chunks = [];
  let timerId = null;
  let startedAt = 0;
  let stopPromise = null;

  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const m of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
      try {
        if (MediaRecorder.isTypeSupported(m)) return m;
      } catch (_) {
        /* ignore */
      }
    }
    return 'video/webm';
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  async function startRecording() {
    if (state.recording) return;
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      notice('rec', 'Dieser Browser kann nicht aufnehmen (kein MediaRecorder). Bitte Chrome oder Edge nutzen.');
      throw new Error('MediaRecorder unsupported');
    }
    ensureAudio();
    await openMic();
    resultEl.hidden = true;
    canvas.width = FORMATS[state.format].w;
    canvas.height = FORMATS[state.format].h;
    drawFrame(performance.now());

    const stream = canvas.captureStream(30);
    state.audio = false;
    if (recDest) {
      try {
        for (const track of recDest.stream.getAudioTracks()) stream.addTrack(track);
        state.audio = stream.getAudioTracks().length > 0;
      } catch (_) {
        state.audio = false;
      }
    }
    const mime = pickMime();
    const make = (s) => {
      try {
        return new MediaRecorder(s, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
      } catch (_) {
        return new MediaRecorder(s);
      }
    };
    try {
      recorder = make(stream);
    } catch (e) {
      // Audio mixing not available: fall back to video only.
      state.audio = false;
      recorder = make(new MediaStream(stream.getVideoTracks()));
    }
    chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const started = new Promise((resolve, reject) => {
      recorder.onstart = () => resolve(true);
      recorder.onerror = (e) => reject((e && e.error) || new Error('MediaRecorder error'));
      setTimeout(() => resolve(false), 1500); // Chromium fires `start` only once the first frame arrived
    });
    // The loop paints the canvas only while recording – enable it before start() so frames flow.
    state.recording = true;
    try {
      recorder.start(500);
      await started;
      if (recorder.state !== 'recording') throw new Error('MediaRecorder did not start');
    } catch (e) {
      state.recording = false;
      recorder = null;
      throw e;
    }
    startedAt = Date.now();
    timerEl.textContent = '00:00';
    badgeEl.hidden = false;
    btnRecord.textContent = '⏹ Stopp 00:00';
    btnRecord.classList.add('recording');
    for (const b of document.querySelectorAll('#bar .fmt')) b.disabled = true;
    timerId = setInterval(() => {
      const t = fmtTime(Date.now() - startedAt);
      timerEl.textContent = t;
      btnRecord.textContent = `⏹ Stopp ${t}`;
    }, 250);
  }

  function stopRecording() {
    if (!state.recording || !recorder) return Promise.resolve(state.lastBlob);
    if (stopPromise) return stopPromise;
    const rec = recorder;
    stopPromise = new Promise((resolve) => {
      rec.onstop = () => {
        const type = rec.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type });
        chunks = [];
        state.recording = false;
        state.lastBlob = blob;
        recorder = null;
        stopPromise = null;
        clearInterval(timerId);
        badgeEl.hidden = true;
        btnRecord.textContent = '⏺ Aufnahme starten';
        btnRecord.classList.remove('recording');
        for (const b of document.querySelectorAll('#bar .fmt')) b.disabled = false;
        showResult(blob);
        resolve(blob);
      };
      // Safety net: never leave the page stuck in "recording" when the browser drops the stop event.
      const guard = setTimeout(() => {
        if (recorder === rec) rec.onstop();
      }, 5000);
      const onstop = rec.onstop;
      rec.onstop = () => {
        clearTimeout(guard);
        rec.onstop = null;
        onstop();
      };
      try {
        rec.stop();
      } catch (_) {
        rec.onstop();
      }
    });
    return stopPromise;
  }

  let lastUrl = null;
  function showResult(blob) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    resultVideo.setAttribute('src', lastUrl);
    btnDownload.setAttribute('href', lastUrl);
    btnDownload.setAttribute('download', `livefx-demo-${stamp()}.webm`);
    resultEl.hidden = false;
  }

  btnRecord.addEventListener('click', () => {
    if (state.recording) stopRecording();
    else startRecording().catch((e) => notice('rec', `Aufnahme konnte nicht starten: ${e && e.message ? e.message : e}`));
  });
  $('#btn-close-result').addEventListener('click', () => {
    resultEl.hidden = true;
    resultVideo.pause();
  });

  // ---------- format buttons ----------
  $('#fmt-landscape').addEventListener('click', () => !state.recording && applyFormat('landscape'));
  $('#fmt-portrait').addEventListener('click', () => !state.recording && applyFormat('portrait'));
  global.addEventListener('resize', layoutFrame);

  // ---------- auto-hiding bar ----------
  let idleTimer = null;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (resultEl.hidden) document.body.classList.add('idle');
    }, IDLE_MS);
  }
  document.addEventListener('mousemove', wake);
  document.addEventListener('pointerdown', wake);
  document.addEventListener('keydown', wake);
  wake();

  // Browsers block audio until a gesture: unlock on the first click anywhere.
  document.addEventListener('pointerdown', () => ensureAudio(), { once: true });

  // ---------- boot ----------
  const initialFormat = params.get('layout') === 'portrait' ? 'portrait' : lsGet(FORMAT_KEY) || 'landscape';
  applyFormat(initialFormat, { persist: false });
  state.volume = clamp01(Number(volumeEl.value) || 0.8);
  renderer.volume = state.volume;
  applyLayout({ storyLayout: params.get('story'), band: params.get('band'), zone: params.get('zone') });

  global.livefxDemo = {
    renderer,
    canvasFx,
    CanvasFX,
    director,
    setLayout: applyLayout,
    feedStory,
    fire: (trigger) => fire(trigger, 'Demo'),
    render,
    handleText,
    startRecording,
    stopRecording,
    playLoop,
    stopLoop,
    matcher,
    bus,
    asr,
    state,
  };

  Promise.all([loadTriggers(), openCamera()]).then(() => {
    state.ready = true;
  });
})(window);
