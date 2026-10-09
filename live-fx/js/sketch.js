// LiveFX – sketch layer ("Zeichenfilm"), global `LiveFXSketch` (UMD: browser + Node). docs/SKETCH.md
//
// Draws the live story as a whiteboard animation inside the story band: every scene element (tree, house, car,
// dragon, rain, sun, …) is an ordered list of hand-drawn strokes in a unit box, generated from code with a seeded
// hand-jitter (the same element always looks the same). A pen draws each new element in 0.6–1.2 s; removed elements
// get a quick erase wipe; weather is animated strokes (rain lines falling, snow, lightning, wind, fog, waves), the
// sun's rays turn slowly, figures walk / fly / dance by their action. Mood tints the ink, the theme picks ink + halo
// (default ink #fff with a soft dark halo, readable on any camera picture), the time of day sets a semi-transparent
// sky wash – all of it only on the band canvas the renderer hands out.
//
//   const sketch = LiveFXSketch.attach(renderer, () => renderer.sketchSurface()); // js/fx.js does this once
//   sketch.setStyle('sketch');            // 'emoji' (drawing hidden) | 'sketch' (drawing only) | 'mixed'
//   sketch.update(storyState);            // every story state: diff -> draw in / erase / glide
//   sketch.stats                          // { style, elements, drawing, frameMs, avgMs, p95Ms, maxMs, fps, running, … }
//   LiveFXSketch.LIBRARY                  // drawable ids
//   LiveFXSketch.pathFor('car')           // { id, aspect, length, strokes: [{ pts: [x0,y0,…] (0..1), w, closed, fill? }] }
//   LiveFXSketch.record({ canvas, audio, ms }) // MediaRecorder WebM (download), resolves { blob, url, bytes, … }
//
// Performance (JS ≤ 2 ms per drawn frame at 1080p; the browser's raster + canvas upload is the larger part and is
// measured in test/e2e/31-sketch.js): paths are precomputed and cached, every element is rasterised once into its
// own sprite (halo + ink layers; a pen only adds the new segments of the frame), settled elements are painted once
// into band-sized caches (one blit per frame for all of them), only moving things are drawn per frame, weather and
// walking run at ~30 fps, slow animations (sun rays, clouds) at ~10 fps, and the rAF loop stops when nothing moves,
// the band is idle / hidden or the style is `emoji`.
(function (global, factory) {
  const api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  // Never replace a LiveFXSketch that is already there (a test stub installed before this script, or a newer copy).
  if (!global.LiveFXSketch) global.LiveFXSketch = api;
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const STYLES = ['emoji', 'sketch', 'mixed'];
  // Geometry: paths are sampled every STEP height units; the hand-jitter displaces points by up to JITTER.
  const STEP = 0.012;
  const JITTER = 0.0055;
  // Timing (seconds): an element draws in DRAW_MIN..DRAW_MAX by its stroke length; a scene update staggers its
  // new elements (at most STAGGER_STEP apart, all started within STAGGER_SPAN).
  const DRAW_MIN = 0.6;
  const DRAW_MAX = 1.2;
  const DRAW_PER_UNIT = 0.09;
  const PEN_GAP_MAX = 0.06;
  const STAGGER_STEP = 0.16;
  const STAGGER_SPAN = 1.4;
  const ERASE_MS = 380;
  const ERASE_STEP_MS = 35;
  const GLIDE_MS = 550;
  const FADE_MS = 800;
  const FILL_FADE_MS = 350;
  const WASH_MS = 900;
  // Frame cadence by what moves (eco in brackets): pen / erase / glide every frame (≤ 30 fps), steady motion – weather
  // strokes, walking / dancing figures – at ~30 fps (20), sea waves at ~15 fps (10), slow-only motion – sun rays,
  // drifting clouds, bobbing boat, flickering fire – at ~7 fps (4); nothing moving = no frames. Every drawn frame
  // costs the browser a full upload of the band canvas (≈ 2 ms at 1920×238 in software rendering, whatever was
  // drawn), so fewer frames is the main saving.
  const STEADY_MS = 33;
  const WAVES_MS = 66;
  const SLOW_MS = 150;
  const STILL = Infinity;
  const WAITING = -1;
  const CACHE_SEGS = 3; // band-sized caches of settled elements (static runs between moving ones, in draw order)
  const REBUILD_MS = 300; // a cache is repainted at most this often (a scene drawing in changes its runs often)
  const IDLE_CLEAR_MS = 900; // the idle band fades in 0.8 s (css/overlay.css) – then the drawing is dropped
  const PENS_MAX = 3; // pen tips on screen at once (the newest strokes)
  const POSE_FRAMES = { walk: 8, legs: 6, flap: 4, flicker: 4 };
  // Same slots as the renderer's emoji actors / props (js/fx.js), so mixed scenes line up.
  const ACTOR_SLOTS = [0.3, 0.7, 0.5, 0.15, 0.85, 0.42];
  const PROP_SLOTS = [0.78, 0.22, 0.6, 0.08, 0.92];
  const LAYER = { sky: 0, ground: 1, back: 2, mid: 3, front: 4, weather: 5 };
  const WASH_ITEM = Object.freeze({ key: 'wash' }); // the sky wash as an item of the draw order

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const TAU = Math.PI * 2;
  const RAD = Math.PI / 180;

  // ------------------------------------------------------------------ seeded randomness
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** Deterministic 0..1 from an integer (procedural weather: drop i always starts at the same place). */
  function hash01(i) {
    let x = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // ------------------------------------------------------------------ path builder (height units: x 0..aspect, y 0..1, y down)
  class Builder {
    constructor(aspect) {
      this.aspect = aspect;
      this.strokes = [];
      this._c = null;
    }
    /** Starts a stroke: `o` = { w (width factor), fill (palette key, closed strokes), part, jitter }. */
    s(o) {
      this._end();
      this._c = { pts: [], o: o || {}, closed: false };
      return this;
    }
    M(x, y) {
      const c = this._c;
      c.pts.push(x, y);
      this._x = x;
      this._y = y;
      this._sx = x;
      this._sy = y;
      return this;
    }
    L(x, y) {
      const n = Math.max(1, Math.ceil(Math.hypot(x - this._x, y - this._y) / STEP));
      for (let i = 1; i <= n; i++) this._c.pts.push(lerp(this._x, x, i / n), lerp(this._y, y, i / n));
      this._x = x;
      this._y = y;
      return this;
    }
    Q(cx, cy, x, y) {
      const x0 = this._x;
      const y0 = this._y;
      const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x - cx, y - cy);
      const n = Math.max(2, Math.ceil(len / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        this._c.pts.push(u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
      }
      this._x = x;
      this._y = y;
      return this;
    }
    C(c1x, c1y, c2x, c2y, x, y) {
      const x0 = this._x;
      const y0 = this._y;
      const len = Math.hypot(c1x - x0, c1y - y0) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(x - c2x, y - c2y);
      const n = Math.max(3, Math.ceil(len / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        this._c.pts.push(u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y);
      }
      this._x = x;
      this._y = y;
      return this;
    }
    /** Elliptic arc from angle a0 to a1 (degrees, 0 = right, 90 = down); connects with a line if needed. */
    A(cx, cy, rx, ry, a0, a1, rot = 0) {
      const p = (a) => {
        const ca = Math.cos(a * RAD);
        const sa = Math.sin(a * RAD);
        const cr = Math.cos(rot * RAD);
        const sr = Math.sin(rot * RAD);
        return [cx + rx * ca * cr - ry * sa * sr, cy + rx * ca * sr + ry * sa * cr];
      };
      const [sx, sy] = p(a0);
      if (!this._c.pts.length) this.M(sx, sy);
      else if (Math.hypot(sx - this._x, sy - this._y) > 1e-6) this.L(sx, sy);
      const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * RAD * Math.max(rx, ry)) / STEP));
      for (let i = 1; i <= n; i++) {
        const [x, y] = p(lerp(a0, a1, i / n));
        this._c.pts.push(x, y);
        this._x = x;
        this._y = y;
      }
      return this;
    }
    /** Smooth Catmull-Rom curve from the current point through `pts` ([[x, y], …]); `closed` loops back to the start. */
    T(pts, closed) {
      const P = [[this._x, this._y], ...pts];
      const n = P.length;
      const seg = (p0, p1, p2, p3) => {
        const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / STEP));
        for (let k = 1; k <= m; k++) {
          const t = k / m;
          const t2 = t * t;
          const t3 = t2 * t;
          this._c.pts.push(
            0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
          );
        }
      };
      if (closed) {
        for (let i = 0; i < n; i++) seg(P[(i - 1 + n) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]);
        this._x = P[0][0];
        this._y = P[0][1];
        this._c.closed = true;
      } else {
        for (let i = 0; i < n - 1; i++) seg(P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(n - 1, i + 2)]);
        this._x = P[n - 1][0];
        this._y = P[n - 1][1];
      }
      return this;
    }
    Z() {
      this.L(this._sx, this._sy);
      this._c.closed = true;
      return this;
    }
    _end() {
      const c = this._c;
      this._c = null;
      if (!c || c.pts.length < 2) return this;
      this.strokes.push({ pts: c.pts, w: c.o.w || 1, fill: c.o.fill || null, closed: !!(c.closed || c.o.closed), part: c.o.part || null, jitter: c.o.jitter === undefined ? 1 : c.o.jitter, dot: 0 });
      return this;
    }
    end() {
      return this._end();
    }
    // ---- shorthands
    line(x1, y1, x2, y2, o) {
      return this.s(o).M(x1, y1).L(x2, y2).end();
    }
    poly(pts, o) {
      this.s(o).M(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) this.L(pts[i][0], pts[i][1]);
      if (o && o.closed) this.Z();
      return this.end();
    }
    curve(pts, o) {
      this.s(o).M(pts[0][0], pts[0][1]).T(pts.slice(1), !!(o && o.closed));
      return this.end();
    }
    rect(x, y, w, h, o) {
      return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], Object.assign({ closed: true }, o));
    }
    circle(cx, cy, r, o) {
      return this.s(Object.assign({ closed: true }, o)).A(cx, cy, r, r, -90, 270).end();
    }
    ellipse(cx, cy, rx, ry, rot, o) {
      return this.s(Object.assign({ closed: true }, o)).A(cx, cy, rx, ry, -90, 270, rot || 0).end();
    }
    /** Arc between two angles (degrees). */
    arc(cx, cy, rx, ry, a0, a1, o) {
      return this.s(o).A(cx, cy, rx, ry, a0, a1).end();
    }
    /** Scalloped blob (tree crown, bush, cloud): n points on an ellipse joined by outward bulges. */
    scallop(cx, cy, rx, ry, n, bulge, o, a0 = 90) {
      const pt = (k, f = 1) => {
        const a = (a0 + (k / n) * 360) * RAD;
        return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f];
      };
      const p0 = pt(0);
      this.s(Object.assign({ closed: true }, o)).M(p0[0], p0[1]);
      for (let k = 0; k < n; k++) {
        const c = pt(k + 0.5, 1 + bulge);
        const e = pt(k + 1);
        this.Q(c[0], c[1], e[0], e[1]);
      }
      this._c.closed = true;
      return this.end();
    }
    /** A filled dot (eyes, buttons); r in height units. */
    dot(x, y, r) {
      this._end();
      this.strokes.push({ pts: [x, y, x, y], w: 1, fill: null, closed: false, part: null, jitter: 0, dot: r || 0.014 });
      return this;
    }
  }

  // ------------------------------------------------------------------ fill palette (washed at the theme's under-layer alpha)
  const FILL = {
    roof: '#e4572e', wall: '#f3e3c3', wood: '#a0673a', light: '#ffd166', leaf: '#43aa5b', pine: '#2d8a4e', car: '#e63946', glass: '#a8dadc',
    tire: '#2b2d42', sun: '#ffcc33', moon: '#fff2b3', cloud: '#dfe7f0', cloudDark: '#5c677d', bolt: '#ffe14d', rock: '#7d8ca3',
    snow: '#ffffff', sail: '#f1f1f1', stone: '#9a8fa6', flag: '#e63946', dragon: '#4caf50', wing: '#2e7d32', fur: '#d9a066',
    ear: '#8d5a2b', bird: '#4fa3e0', beak: '#ffb703', petal: '#ff7eb6', dress: '#c77dff', dress2: '#9381ff', heart: '#ff4d6d',
    gold: '#ffd23f', fire: '#ff7b00', flame: '#ffd000', tent: '#f4a261', page: '#fffbea', cake: '#f7cad0', ball: '#4cc9f0',
    fish: '#ff9f1c', ghost: '#ffffff', planet: '#9d4edd', sand: '#e9c46a', water: '#3a86ff', metal: '#adb5bd', cactus: '#52b788',
    night: '#22223b', fur2: '#cbb8a8', ear2: '#ffb3c6', owl: '#a47148', horse: '#b5835a', unicorn: '#f8f0ff', bear: '#8d5524',
    fox: '#f3722c', city: '#5c677d', cloak: '#3a0ca3', hat: '#5a189a', shield: '#4361ee', crown: '#ffd23f', helmet: '#cfe8ff',
  };

  // ------------------------------------------------------------------ the library
  /**
   * LIB[id] = { aspect (box width / height), size (height in band units u), anim?, wide?, build(b, P) }.
   * `build` draws in height units (x 0..aspect, y 0..1, 1 = ground) with the Builder; `P.phase` (null = rest pose,
   * 0..1 = animation phase) drives walk cycles / wing flaps / flames, `P.aspect` is the box aspect for wide items,
   * `P.rnd()` a seeded random (content variation, separate from the jitter).
   */
  const LIB = Object.create(null);
  function def(id, spec) {
    LIB[id] = spec;
  }
  const flap = (phase) => (phase === null || phase === undefined ? 0.15 : 0.5 - 0.5 * Math.cos(TAU * phase));
  function crenel(x0, x1, y, hm, n) {
    const pts = [];
    const d = (x1 - x0) / (2 * n - 1);
    for (let k = 0; k < 2 * n - 1; k++) {
      const xa = x0 + k * d;
      const xb = xa + d;
      const top = k % 2 === 0 ? y - hm : y;
      pts.push([xa, top], [xb, top]);
      if (k < 2 * n - 2) pts.push([xb, k % 2 === 0 ? y : y - hm]);
    }
    return pts;
  }

  // ---- nature
  def('tree', {
    aspect: 0.85, size: 0.74,
    build(b) {
      b.poly([[0.37, 0.98], [0.39, 0.66], [0.31, 0.57]]);
      b.poly([[0.49, 0.98], [0.46, 0.66], [0.55, 0.56]]);
      b.scallop(0.425, 0.36, 0.3, 0.27, 9, 0.16, { fill: 'leaf' });
      b.line(0.42, 0.66, 0.43, 0.5, { w: 0.8 });
    },
  });
  def('pine', {
    aspect: 0.62, size: 0.8,
    build(b) {
      b.poly([[0.27, 0.99], [0.27, 0.86]]);
      b.poly([[0.35, 0.99], [0.35, 0.86]]);
      b.poly([[0.31, 0.02], [0.1, 0.34], [0.21, 0.33], [0.04, 0.6], [0.17, 0.59], [0.0, 0.86], [0.62, 0.86], [0.45, 0.59], [0.58, 0.6], [0.41, 0.33], [0.52, 0.34]], { closed: true, fill: 'pine' });
    },
  });
  def('bush', {
    aspect: 1.3, size: 0.18,
    build(b) {
      b.s({ closed: true, fill: 'leaf' }).M(0.06, 0.97).Q(-0.04, 0.6, 0.22, 0.52).Q(0.3, 0.16, 0.6, 0.3).Q(0.86, 0.1, 1.0, 0.42).Q(1.34, 0.46, 1.24, 0.97).Z().end();
    },
  });
  def('grass', {
    aspect: 0.6, size: 0.08,
    build(b) {
      b.s().M(0.12, 0.98).Q(0.14, 0.5, 0.02, 0.32).end();
      b.s().M(0.26, 0.98).Q(0.27, 0.4, 0.32, 0.08).end();
      b.s().M(0.38, 0.98).Q(0.42, 0.5, 0.56, 0.3).end();
    },
  });
  def('flower', {
    aspect: 0.62, size: 0.24,
    build(b) {
      b.s().M(0.31, 0.99).Q(0.26, 0.7, 0.31, 0.42).end();
      b.s({ closed: true, fill: 'leaf' }).M(0.29, 0.8).Q(0.12, 0.66, 0.06, 0.72).Q(0.16, 0.84, 0.29, 0.8).Z().end();
      b.s({ closed: true, fill: 'leaf' }).M(0.3, 0.66).Q(0.48, 0.54, 0.56, 0.6).Q(0.46, 0.72, 0.3, 0.66).Z().end();
      for (let k = 0; k < 6; k++) {
        const a = -90 + k * 60;
        b.ellipse(0.31 + Math.cos(a * RAD) * 0.12, 0.27 + Math.sin(a * RAD) * 0.12, 0.085, 0.058, a, { fill: 'petal' });
      }
      b.circle(0.31, 0.27, 0.06, { fill: 'sun' });
    },
  });
  def('mountains', {
    aspect: 2.6, size: 0.66,
    build(b) {
      b.poly([[0, 0.99], [0.42, 0.32], [0.66, 0.6], [1.1, 0.08], [1.5, 0.62], [1.72, 0.44], [2.6, 0.99]], { closed: true, fill: 'rock' });
      b.poly([[0.307, 0.5], [0.36, 0.46], [0.41, 0.51], [0.47, 0.45], [0.549, 0.47]]);
      b.poly([[0.914, 0.3], [0.98, 0.26], [1.04, 0.32], [1.12, 0.24], [1.19, 0.31], [1.263, 0.3]]);
    },
  });
  def('cactus', {
    aspect: 0.7, size: 0.46,
    build(b) {
      b.s({ closed: true, fill: 'cactus' }).M(0.28, 0.98).L(0.28, 0.16).Q(0.35, 0.04, 0.42, 0.16).L(0.42, 0.98).Z().end();
      b.s({ closed: true, fill: 'cactus' }).M(0.28, 0.6).L(0.16, 0.6).Q(0.1, 0.6, 0.1, 0.52).L(0.1, 0.36).Q(0.13, 0.29, 0.16, 0.36).L(0.16, 0.52).L(0.28, 0.52).end();
      b.s({ closed: true, fill: 'cactus' }).M(0.42, 0.5).L(0.54, 0.5).Q(0.6, 0.5, 0.6, 0.42).L(0.6, 0.26).Q(0.57, 0.19, 0.54, 0.26).L(0.54, 0.42).L(0.42, 0.42).end();
      b.line(0.35, 0.3, 0.35, 0.36, { w: 0.6 });
      b.line(0.35, 0.56, 0.35, 0.62, { w: 0.6 });
      b.line(0.35, 0.8, 0.35, 0.86, { w: 0.6 });
    },
  });
  def('dunes', {
    aspect: 6, size: 0.12, wide: true,
    build(b, P) {
      const A = P.aspect;
      const n = Math.max(2, Math.round(A / 2.4));
      b.s({ w: 1.1 }).M(0, 0.7);
      for (let k = 0; k < n; k++) {
        const x0 = (k / n) * A;
        const x1 = ((k + 1) / n) * A;
        b.Q(lerp(x0, x1, 0.4), 0.0 + 0.2 * P.rnd(), x1, 0.62 + 0.1 * P.rnd());
      }
      b.end();
      b.s({ w: 0.8 }).M(A * 0.08, 0.98);
      for (let k = 0; k < n; k++) {
        const x0 = ((k + 0.5) / n) * A;
        b.Q(x0 - A * 0.12 / n, 0.45, x0 + A * 0.25 / n, 0.9);
      }
      b.end();
    },
  });
  def('horizon', {
    aspect: 8, size: 0.06, wide: true,
    build(b, P) {
      const A = P.aspect;
      const pts = [];
      const n = Math.max(3, Math.round(A / 1.5));
      for (let k = 1; k <= n; k++) pts.push([(k / n) * A, 0.5 + (P.rnd() - 0.5) * 0.25]);
      b.s({ w: 1.1 }).M(0, 0.52).T(pts).end();
      const tufts = Math.max(2, Math.round(A / 5));
      for (let k = 0; k < tufts; k++) {
        const x = ((k + 0.3 + P.rnd() * 0.4) / tufts) * A;
        b.poly([[x - 0.28, 0.52], [x - 0.12, 0.12], [x, 0.52], [x + 0.14, 0.06], [x + 0.28, 0.52]], { w: 0.7 });
      }
    },
  });
  def('road', {
    aspect: 8, size: 0.14, wide: true,
    build(b, P) {
      const A = P.aspect;
      b.line(0, 0.22, A, 0.2, { w: 1.1 });
      b.line(0, 0.96, A, 0.97, { w: 1.1 });
      for (let x = 0.3; x < A - 0.5; x += 1.4) b.line(x, 0.6, x + 0.7, 0.6, { w: 0.9 });
    },
  });
  def('cave', {
    aspect: 2, size: 0.8,
    build(b) {
      b.poly([[0.0, 0.98], [0.12, 0.52], [0.42, 0.14], [0.92, 0.03], [1.42, 0.1], [1.8, 0.42], [2.0, 0.98]], { closed: true, fill: 'rock' });
      b.s({ closed: true, fill: 'night' }).M(0.5, 0.98).Q(0.48, 0.34, 1.0, 0.34).Q(1.52, 0.34, 1.5, 0.98).Z().end();
      b.poly([[0.2, 0.7], [0.3, 0.6], [0.34, 0.72]], { w: 0.7 });
      b.poly([[1.66, 0.62], [1.74, 0.54], [1.8, 0.66]], { w: 0.7 });
    },
  });

  // ---- sky + weather
  def('sun', {
    aspect: 1, size: 0.34, anim: 'rays',
    build(b) {
      b.circle(0.5, 0.5, 0.21, { fill: 'sun' });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + 0.26;
        const r1 = k % 2 ? 0.39 : 0.46;
        b.line(0.5 + Math.cos(a) * 0.29, 0.5 + Math.sin(a) * 0.29, 0.5 + Math.cos(a) * r1, 0.5 + Math.sin(a) * r1, { part: 'rays' });
      }
    },
  });
  def('moon', {
    aspect: 1, size: 0.32,
    build(b) {
      b.s({ closed: true, fill: 'moon' }).A(0.5, 0.5, 0.38, 0.38, -70, -290).A(0.828, 0.5, 0.408, 0.408, 119, 241).end();
      b.dot(0.33, 0.42, 0.025);
      b.dot(0.38, 0.62, 0.018);
    },
  });
  def('star', {
    aspect: 1, size: 0.12,
    build(b) {
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -90 + k * 36;
        const r = k % 2 ? 0.19 : 0.46;
        pts.push([0.5 + Math.cos(a * RAD) * r, 0.53 + Math.sin(a * RAD) * r]);
      }
      b.poly(pts, { closed: true, fill: 'sun' });
    },
  });
  def('cloud', {
    aspect: 1.8, size: 0.28,
    build(b, P) {
      b.s({ closed: true, fill: P.variant === 'dark' ? 'cloudDark' : 'cloud' })
        .M(0.3, 0.8).L(1.5, 0.8)
        .Q(1.74, 0.76, 1.62, 0.56).Q(1.64, 0.3, 1.37, 0.36).Q(1.3, 0.06, 1.0, 0.18).Q(0.82, 0.0, 0.64, 0.24).Q(0.4, 0.16, 0.4, 0.44).Q(0.08, 0.46, 0.3, 0.8)
        .end();
    },
  });
  def('rain', {
    aspect: 1, size: 0.3,
    build(b) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = 0.2 + c * 0.3 + (r % 2) * 0.1;
        const y = 0.06 + r * 0.32;
        b.line(x, y, x - 0.07, y + 0.22);
      }
    },
  });
  def('snowflake', {
    aspect: 1, size: 0.14,
    build(b) {
      const R = 0.44;
      for (let k = 0; k < 3; k++) {
        const a = 90 * RAD + (k * Math.PI) / 3;
        b.line(0.5 - Math.cos(a) * R, 0.5 - Math.sin(a) * R, 0.5 + Math.cos(a) * R, 0.5 + Math.sin(a) * R);
      }
      for (let k = 0; k < 6; k++) {
        const a = 90 * RAD + (k * Math.PI) / 3;
        const px = 0.5 + Math.cos(a) * R * 0.62;
        const py = 0.5 + Math.sin(a) * R * 0.62;
        b.poly([[px + Math.cos(a + 0.7) * 0.13, py + Math.sin(a + 0.7) * 0.13], [px, py], [px + Math.cos(a - 0.7) * 0.13, py + Math.sin(a - 0.7) * 0.13]], { w: 0.8 });
      }
    },
  });
  def('lightning', {
    aspect: 0.62, size: 0.4,
    build(b) {
      b.poly([[0.36, 0.0], [0.08, 0.52], [0.28, 0.52], [0.12, 1.0], [0.54, 0.4], [0.32, 0.4], [0.52, 0.0]], { closed: true, fill: 'bolt' });
    },
  });
  def('waves', {
    aspect: 3, size: 0.2,
    build(b, P) {
      const A = P.aspect || 3;
      for (let r = 0; r < 3; r++) {
        const y0 = 0.2 + r * 0.32;
        b.s({ w: r ? 0.85 : 1 }).M(0, y0);
        const n = Math.ceil(A / STEP);
        for (let i = 1; i <= n; i++) {
          const x = (i / n) * A;
          b._c.pts.push(x, y0 + 0.08 * Math.sin((x / 0.55) * TAU + r * 1.7));
        }
        b._x = A;
        b.end();
      }
    },
  });
  def('planet', {
    aspect: 1.4, size: 0.36,
    build(b) {
      b.circle(0.7, 0.5, 0.3, { fill: 'planet' });
      b.arc(0.7, 0.54, 0.64, 0.14, 0, 180, { w: 1.1 });
      b.arc(0.7, 0.54, 0.64, 0.14, 180, 240);
      b.arc(0.7, 0.54, 0.64, 0.14, 300, 360);
      b.arc(0.6, 0.42, 0.1, 0.1, 200, 280, { w: 0.6 });
    },
  });

  // ---- buildings + things
  def('house', {
    aspect: 1, size: 0.56,
    build(b) {
      b.poly([[0.16, 0.5], [0.16, 0.98], [0.84, 0.98], [0.84, 0.5]], { closed: true, fill: 'wall' });
      b.poly([[0.06, 0.5], [0.5, 0.1], [0.94, 0.5]], { closed: true, fill: 'roof' });
      b.poly([[0.66, 0.29], [0.66, 0.14], [0.77, 0.14], [0.77, 0.39]]);
      b.poly([[0.42, 0.98], [0.42, 0.71], [0.58, 0.71], [0.58, 0.98]], { closed: true, fill: 'wood' });
      b.dot(0.545, 0.85, 0.014);
      b.rect(0.23, 0.58, 0.13, 0.12, { fill: 'light' });
      b.line(0.295, 0.58, 0.295, 0.7, { w: 0.7 });
      b.line(0.23, 0.64, 0.36, 0.64, { w: 0.7 });
      b.rect(0.64, 0.58, 0.13, 0.12, { fill: 'light' });
      b.line(0.705, 0.58, 0.705, 0.7, { w: 0.7 });
      b.line(0.64, 0.64, 0.77, 0.64, { w: 0.7 });
    },
  });
  def('castle', {
    aspect: 1.4, size: 0.84,
    build(b) {
      b.poly([[0.06, 0.99], ...crenel(0.06, 0.36, 0.24, 0.07, 3), [0.36, 0.99]], { closed: true, fill: 'stone' });
      b.poly([[1.04, 0.99], ...crenel(1.04, 1.34, 0.24, 0.07, 3), [1.34, 0.99]], { closed: true, fill: 'stone' });
      b.poly([[0.36, 0.48], ...crenel(0.36, 1.04, 0.48, 0.06, 4), [1.04, 0.48]]);
      b.s({ closed: true, fill: 'wood' }).M(0.56, 0.99).L(0.56, 0.78).A(0.7, 0.78, 0.14, 0.14, 180, 360).L(0.84, 0.99).Z().end();
      b.line(0.65, 0.66, 0.65, 0.99, { w: 0.6 });
      b.line(0.75, 0.66, 0.75, 0.99, { w: 0.6 });
      b.poly([[0.17, 0.52], [0.17, 0.42], [0.21, 0.37], [0.25, 0.42], [0.25, 0.52]], { closed: true, fill: 'light' });
      b.poly([[1.15, 0.52], [1.15, 0.42], [1.19, 0.37], [1.23, 0.42], [1.23, 0.52]], { closed: true, fill: 'light' });
      b.line(0.21, 0.17, 0.21, 0.01);
      b.poly([[0.21, 0.01], [0.33, 0.045], [0.21, 0.08]], { closed: true, fill: 'flag' });
      b.line(1.19, 0.17, 1.19, 0.01);
      b.poly([[1.19, 0.01], [1.31, 0.045], [1.19, 0.08]], { closed: true, fill: 'flag' });
    },
  });
  def('city', {
    aspect: 2.4, size: 0.72, wide: true,
    build(b, P) {
      const A = P.aspect || 2.4;
      const n = Math.max(3, Math.round(A * 2));
      const slot = A / n;
      for (let k = 0; k < n; k++) {
        const bw = slot * (0.62 + P.rnd() * 0.3);
        const x0 = k * slot + (slot - bw) / 2;
        const top = 0.1 + P.rnd() * 0.5;
        b.poly([[x0, 0.99], [x0, top], [x0 + bw, top], [x0 + bw, 0.99]], { fill: 'city' });
        const rows = Math.floor((0.92 - top) / 0.14);
        for (let r = 0; r < rows; r++) {
          const y = top + 0.08 + r * 0.14;
          b.line(x0 + bw * 0.22, y, x0 + bw * 0.38, y, { w: 1.2 });
          b.line(x0 + bw * 0.62, y, x0 + bw * 0.78, y, { w: 1.2 });
        }
        if (P.rnd() < 0.35) b.line(x0 + bw / 2, top, x0 + bw / 2, top - 0.08, { w: 0.7 });
      }
    },
  });
  def('car', {
    aspect: 2, size: 0.36,
    build(b) {
      b.s({ closed: true, fill: 'car' })
        .M(0.08, 0.82).L(0.06, 0.62).L(0.38, 0.56).L(0.62, 0.3).L(1.3, 0.3).L(1.52, 0.55).L(1.86, 0.6).L(1.94, 0.7).L(1.92, 0.82).L(1.68, 0.82)
        .A(1.46, 0.84, 0.22, 0.22, -5, -175).L(0.76, 0.82).A(0.54, 0.84, 0.22, 0.22, -5, -175).L(0.08, 0.82)
        .end();
      b.circle(0.54, 0.84, 0.155, { fill: 'tire' });
      b.circle(1.46, 0.84, 0.155, { fill: 'tire' });
      b.dot(0.54, 0.84, 0.045);
      b.dot(1.46, 0.84, 0.045);
      b.poly([[0.7, 0.52], [0.82, 0.36], [0.98, 0.36], [0.98, 0.52]], { closed: true, fill: 'glass' });
      b.poly([[1.06, 0.52], [1.06, 0.36], [1.24, 0.36], [1.36, 0.52]], { closed: true, fill: 'glass' });
      b.line(1.02, 0.56, 1.02, 0.78, { w: 0.7 });
      b.line(1.08, 0.61, 1.15, 0.61, { w: 0.7 });
      b.circle(1.85, 0.67, 0.035, { fill: 'light' });
    },
  });
  def('boat', {
    aspect: 1.4, size: 0.4,
    build(b) {
      b.poly([[0.08, 0.62], [1.32, 0.62], [1.1, 0.92], [0.3, 0.92]], { closed: true, fill: 'wood' });
      b.line(0.7, 0.62, 0.7, 0.04);
      b.poly([[0.75, 0.08], [0.75, 0.56], [1.18, 0.56]], { closed: true, fill: 'sail' });
      b.poly([[0.65, 0.14], [0.65, 0.56], [0.3, 0.56]], { closed: true, fill: 'sail' });
      b.poly([[0.7, 0.04], [0.84, 0.075], [0.7, 0.11]], { closed: true, fill: 'flag' });
    },
  });
  def('ship', {
    aspect: 1.8, size: 0.46,
    build(b) {
      b.poly([[0.04, 0.56], [1.76, 0.56], [1.5, 0.92], [0.26, 0.92]], { closed: true, fill: 'wood' });
      for (const x of [0.5, 0.9, 1.3]) b.circle(x, 0.7, 0.045, { fill: 'light' });
      b.line(0.6, 0.56, 0.6, 0.04);
      b.line(1.16, 0.56, 1.16, 0.1);
      b.s({ closed: true, fill: 'sail' }).M(0.4, 0.12).L(0.8, 0.12).Q(0.86, 0.3, 0.8, 0.46).L(0.4, 0.46).Q(0.46, 0.3, 0.4, 0.12).end();
      b.s({ closed: true, fill: 'sail' }).M(0.98, 0.17).L(1.34, 0.17).Q(1.4, 0.33, 1.34, 0.48).L(0.98, 0.48).Q(1.04, 0.33, 0.98, 0.17).end();
      b.poly([[0.6, 0.04], [0.74, 0.07], [0.6, 0.1]], { closed: true, fill: 'flag' });
    },
  });
  def('bridge', {
    aspect: 2.4, size: 0.36,
    build(b) {
      b.line(0.0, 0.42, 2.4, 0.42, { w: 1.2 });
      b.line(0.0, 0.24, 2.4, 0.24);
      b.s().M(0.16, 0.98).Q(1.2, 0.12, 2.24, 0.98).end();
      for (let k = 0; k <= 7; k++) b.line(0.1 + k * 0.314, 0.24, 0.1 + k * 0.314, 0.42, { w: 0.7 });
      b.line(0.16, 0.98, 0.16, 0.42, { w: 0.9 });
      b.line(2.24, 0.98, 2.24, 0.42, { w: 0.9 });
    },
  });
  def('tent', {
    aspect: 1.2, size: 0.42,
    build(b) {
      b.poly([[0.06, 0.97], [0.6, 0.12], [1.14, 0.97]], { closed: true, fill: 'tent' });
      b.line(0.6, 0.12, 0.6, 0.02);
      b.poly([[0.6, 0.45], [0.44, 0.97], [0.76, 0.97]], { closed: true, fill: 'night' });
      b.line(0.16, 0.82, 0.0, 0.97, { w: 0.6 });
      b.line(1.04, 0.82, 1.2, 0.97, { w: 0.6 });
    },
  });
  def('chest', {
    aspect: 1.3, size: 0.24,
    build(b) {
      b.poly([[0.1, 0.52], [1.2, 0.52], [1.2, 0.96], [0.1, 0.96]], { closed: true, fill: 'wood' });
      b.s({ closed: true, fill: 'wood' }).M(0.1, 0.52).L(0.1, 0.36).Q(0.65, 0.08, 1.2, 0.36).L(1.2, 0.52).end();
      b.line(0.34, 0.265, 0.34, 0.96, { w: 0.8 });
      b.line(0.96, 0.265, 0.96, 0.96, { w: 0.8 });
      b.rect(0.58, 0.45, 0.14, 0.16, { fill: 'gold' });
      b.dot(0.65, 0.53, 0.018);
      b.line(0.26, 0.04, 0.26, 0.16, { w: 0.6 });
      b.line(0.2, 0.1, 0.32, 0.1, { w: 0.6 });
      b.line(1.02, 0.0, 1.02, 0.1, { w: 0.6 });
      b.line(0.97, 0.05, 1.07, 0.05, { w: 0.6 });
    },
  });
  def('campfire', {
    aspect: 1.2, size: 0.3, anim: 'flicker',
    build(b, P) {
      const ph = P.phase === null || P.phase === undefined ? 0 : P.phase;
      const j = (k) => 0.045 * Math.sin(TAU * ph + k * 1.9);
      b.line(0.12, 0.96, 1.08, 0.78, { w: 1.6, fill: null });
      b.line(0.12, 0.78, 1.08, 0.96, { w: 1.6 });
      b.s({ closed: true, fill: 'fire' }).M(0.34, 0.84)
        .T([[0.26, 0.62 + j(1)], [0.36, 0.44], [0.42, 0.3 + j(2)], [0.52, 0.4], [0.6 + j(3) * 0.5, 0.06 + j(4)], [0.72, 0.36], [0.8, 0.26 + j(5)], [0.88, 0.56], [0.82, 0.84]])
        .Z().end();
      b.s({ closed: true, fill: 'flame' }).M(0.48, 0.84).T([[0.44, 0.68], [0.56, 0.48 + j(6)], [0.62, 0.36 + j(7)], [0.7, 0.66], [0.68, 0.84]]).Z().end();
    },
  });
  def('heart', {
    aspect: 1, size: 0.2,
    build(b) {
      b.s({ closed: true, fill: 'heart' }).M(0.5, 0.92).C(0.02, 0.6, 0.06, 0.1, 0.5, 0.3).C(0.94, 0.1, 0.98, 0.6, 0.5, 0.92).end();
    },
  });
  def('key', {
    aspect: 1.8, size: 0.12,
    build(b) {
      b.circle(0.32, 0.5, 0.24, { fill: 'gold' });
      b.circle(0.32, 0.5, 0.09);
      b.line(0.56, 0.5, 1.72, 0.5, { w: 1.6 });
      b.poly([[1.32, 0.5], [1.32, 0.74], [1.44, 0.74], [1.44, 0.5]]);
      b.poly([[1.56, 0.5], [1.56, 0.68], [1.66, 0.68], [1.66, 0.5]]);
    },
  });
  def('book', {
    aspect: 1.4, size: 0.18,
    build(b) {
      b.s({ closed: true, fill: 'page' }).M(0.7, 0.3).Q(0.4, 0.16, 0.08, 0.26).L(0.08, 0.86).Q(0.4, 0.76, 0.7, 0.9).Z().end();
      b.s({ closed: true, fill: 'page' }).M(0.7, 0.3).Q(1.0, 0.16, 1.32, 0.26).L(1.32, 0.86).Q(1.0, 0.76, 0.7, 0.9).Z().end();
      for (let r = 0; r < 3; r++) {
        b.line(0.18, 0.42 + r * 0.13, 0.6, 0.45 + r * 0.13, { w: 0.6 });
        b.line(0.8, 0.45 + r * 0.13, 1.22, 0.42 + r * 0.13, { w: 0.6 });
      }
    },
  });
  def('lantern', {
    aspect: 0.6, size: 0.26,
    build(b) {
      b.arc(0.3, 0.12, 0.08, 0.08, 180, 360);
      b.poly([[0.12, 0.26], [0.2, 0.13], [0.4, 0.13], [0.48, 0.26]], { closed: true, fill: 'metal' });
      b.poly([[0.14, 0.26], [0.14, 0.82], [0.46, 0.82], [0.46, 0.26]], { closed: true, fill: 'light' });
      b.s({ closed: true, fill: 'fire' }).M(0.3, 0.7).Q(0.18, 0.6, 0.3, 0.4).Q(0.42, 0.6, 0.3, 0.7).end();
      b.poly([[0.08, 0.82], [0.52, 0.82], [0.46, 0.95], [0.14, 0.95]], { closed: true, fill: 'metal' });
    },
  });
  def('cake', {
    aspect: 1.1, size: 0.24,
    build(b) {
      b.poly([[0.08, 0.62], [0.08, 0.97], [1.02, 0.97], [1.02, 0.62]], { closed: true, fill: 'cake' });
      b.s({ w: 0.8 }).M(0.08, 0.62);
      for (let k = 0; k < 6; k++) b.Q(0.08 + (k + 0.5) * 0.157, 0.76, 0.08 + (k + 1) * 0.157, 0.62);
      b.end();
      b.poly([[0.24, 0.36], [0.24, 0.62], [0.86, 0.62], [0.86, 0.36]], { closed: true, fill: 'cake' });
      b.rect(0.52, 0.18, 0.06, 0.18, { fill: 'light' });
      b.s({ closed: true, fill: 'fire' }).M(0.55, 0.17).Q(0.48, 0.1, 0.55, 0.02).Q(0.62, 0.1, 0.55, 0.17).end();
    },
  });
  def('ball', {
    aspect: 1, size: 0.14,
    build(b) {
      b.circle(0.5, 0.52, 0.42, { fill: 'ball' });
      b.s().M(0.5, 0.1).Q(0.22, 0.52, 0.5, 0.94).end();
      b.s().M(0.5, 0.1).Q(0.78, 0.52, 0.5, 0.94).end();
      b.line(0.09, 0.5, 0.91, 0.5, { w: 0.8 });
    },
  });

  // ---- animals
  def('cat', {
    aspect: 0.9, size: 0.3,
    build(b) {
      b.s({ closed: true, fill: 'fur' }).M(0.3, 0.27).L(0.31, 0.08).L(0.4, 0.17).Q(0.45, 0.15, 0.5, 0.17).L(0.59, 0.08).L(0.6, 0.27).Q(0.62, 0.45, 0.45, 0.47).Q(0.28, 0.45, 0.3, 0.27).end();
      b.dot(0.39, 0.29, 0.018);
      b.dot(0.51, 0.29, 0.018);
      b.poly([[0.43, 0.35], [0.47, 0.35], [0.45, 0.375]], { w: 0.6 });
      b.line(0.37, 0.36, 0.2, 0.34, { w: 0.5 });
      b.line(0.37, 0.38, 0.21, 0.41, { w: 0.5 });
      b.line(0.53, 0.36, 0.7, 0.34, { w: 0.5 });
      b.line(0.53, 0.38, 0.69, 0.41, { w: 0.5 });
      b.s({ closed: true, fill: 'fur' }).M(0.36, 0.46).Q(0.16, 0.62, 0.22, 0.98).L(0.68, 0.98).Q(0.74, 0.62, 0.54, 0.46).end();
      b.line(0.38, 0.72, 0.38, 0.98, { w: 0.8 });
      b.line(0.52, 0.72, 0.52, 0.98, { w: 0.8 });
      b.s().M(0.68, 0.94).Q(0.9, 0.95, 0.86, 0.74).Q(0.83, 0.6, 0.76, 0.63).end();
    },
  });
  /** Four legs from hips (side-view quadruped), swinging by `phase`. */
  function legs(b, hips, y0, y1, phase, amp) {
    hips.forEach((hx, k) => {
      const sw = phase === null || phase === undefined ? (k % 2 ? 0.015 : -0.015) : amp * Math.sin(TAU * phase + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0));
      const kx = hx + sw * 0.5;
      b.poly([[hx, y0], [kx, lerp(y0, y1, 0.55)], [hx + sw, y1], [hx + sw + 0.05, y1]], { w: 0.95 });
    });
  }
  def('dog', {
    aspect: 1.4, size: 0.3, anim: 'legs',
    build(b, P) {
      b.curve([[0.3, 0.46], [0.6, 0.43], [0.95, 0.44], [1.06, 0.56], [0.98, 0.68], [0.62, 0.7], [0.32, 0.68], [0.24, 0.57]], { closed: true, fill: 'fur' });
      b.s({ closed: true, fill: 'fur' }).M(1.0, 0.46).Q(0.97, 0.22, 1.12, 0.2).Q(1.24, 0.2, 1.26, 0.3).L(1.38, 0.34).Q(1.42, 0.42, 1.34, 0.45).L(1.18, 0.47).Q(1.1, 0.53, 1.02, 0.5).end();
      b.poly([[1.08, 0.22], [1.0, 0.42], [1.08, 0.4], [1.15, 0.25]], { closed: true, fill: 'ear' });
      b.dot(1.17, 0.29, 0.018);
      b.dot(1.38, 0.36, 0.026);
      const wag = P.phase === null || P.phase === undefined ? 0 : 0.05 * Math.sin(TAU * P.phase * 2);
      b.s().M(0.26, 0.52).Q(0.12, 0.42, 0.14 + wag, 0.24).end();
      legs(b, [0.36, 0.48, 0.84, 0.96], 0.66, 0.97, P.phase, 0.09);
    },
  });
  def('fox', {
    aspect: 1.5, size: 0.28, anim: 'legs',
    build(b, P) {
      b.curve([[0.42, 0.5], [0.7, 0.45], [0.98, 0.5], [1.05, 0.6], [0.96, 0.68], [0.7, 0.71], [0.44, 0.68], [0.37, 0.6]], { closed: true, fill: 'fox' });
      b.poly([[0.96, 0.5], [1.0, 0.2], [1.08, 0.32], [1.16, 0.2], [1.2, 0.36], [1.44, 0.45], [1.2, 0.54], [1.06, 0.58]], { closed: true, fill: 'fox' });
      b.dot(1.17, 0.4, 0.017);
      b.dot(1.43, 0.45, 0.022);
      b.s({ closed: true, fill: 'fox' }).M(0.44, 0.54).Q(0.2, 0.38, 0.05, 0.5).Q(0.12, 0.72, 0.44, 0.62).end();
      b.s({ w: 0.7 }).M(0.13, 0.45).Q(0.08, 0.54, 0.14, 0.63).end();
      legs(b, [0.52, 0.6, 0.86, 0.94], 0.66, 0.97, P.phase, 0.08);
    },
  });
  def('horse', {
    aspect: 1.5, size: 0.46, anim: 'legs',
    build(b, P) {
      b.curve([[0.3, 0.42], [0.7, 0.37], [1.05, 0.42], [1.14, 0.55], [1.05, 0.66], [0.7, 0.71], [0.32, 0.66], [0.22, 0.54]], { closed: true, fill: P.variant === 'unicorn' ? 'unicorn' : 'horse' });
      b.poly([[1.0, 0.44], [1.18, 0.14], [1.24, 0.09], [1.31, 0.12], [1.47, 0.28], [1.45, 0.35], [1.27, 0.31], [1.12, 0.53]], { closed: true, fill: P.variant === 'unicorn' ? 'unicorn' : 'horse' });
      b.poly([[1.2, 0.12], [1.21, 0.02], [1.27, 0.1]], { w: 0.8 });
      b.dot(1.28, 0.18, 0.017);
      b.poly([[1.18, 0.14], [1.1, 0.19], [1.13, 0.24], [1.04, 0.3], [1.08, 0.34], [1.0, 0.42]], { w: 0.8 });
      b.s().M(0.27, 0.45).Q(0.1, 0.5, 0.1, 0.78).end();
      b.s({ w: 0.8 }).M(0.27, 0.48).Q(0.17, 0.58, 0.16, 0.8).end();
      if (P.variant === 'unicorn') {
        b.poly([[1.215, 0.135], [1.44, -0.02], [1.29, 0.165]], { closed: true, fill: 'gold' });
        b.line(1.29, 0.1, 1.33, 0.12, { w: 0.5 });
        b.line(1.35, 0.06, 1.38, 0.075, { w: 0.5 });
      }
      legs(b, [0.38, 0.5, 0.9, 1.02], 0.64, 0.98, P.phase, 0.1);
    },
  });
  def('unicorn', { aspect: 1.5, size: 0.46, anim: 'legs', build: (b, P) => LIB.horse.build(b, Object.assign({}, P, { variant: 'unicorn' })) });
  def('bear', {
    aspect: 1, size: 0.42,
    build(b) {
      b.circle(0.3, 0.12, 0.07, { fill: 'bear' });
      b.circle(0.7, 0.12, 0.07, { fill: 'bear' });
      b.circle(0.5, 0.26, 0.17, { fill: 'bear' });
      b.ellipse(0.5, 0.33, 0.075, 0.055, 0, { fill: 'light' });
      b.dot(0.5, 0.31, 0.022);
      b.dot(0.43, 0.22, 0.018);
      b.dot(0.57, 0.22, 0.018);
      b.ellipse(0.5, 0.68, 0.3, 0.27, 0, { fill: 'bear' });
      b.ellipse(0.5, 0.7, 0.15, 0.15, 0, { fill: 'light' });
      b.s().M(0.25, 0.52).Q(0.12, 0.66, 0.24, 0.78).end();
      b.s().M(0.75, 0.52).Q(0.88, 0.66, 0.76, 0.78).end();
      b.ellipse(0.32, 0.93, 0.1, 0.05, 0);
      b.ellipse(0.68, 0.93, 0.1, 0.05, 0);
    },
  });
  def('rabbit', {
    aspect: 0.9, size: 0.26,
    build(b) {
      b.s({ closed: true, fill: 'fur2' }).M(0.62, 0.5).Q(0.86, 0.66, 0.78, 0.97).L(0.2, 0.97).Q(0.08, 0.7, 0.36, 0.56).Q(0.48, 0.46, 0.62, 0.5).end();
      b.circle(0.66, 0.4, 0.13, { fill: 'fur2' });
      b.s({ closed: true, fill: 'ear2' }).M(0.6, 0.3).Q(0.48, 0.02, 0.58, 0.02).Q(0.67, 0.12, 0.66, 0.29).end();
      b.s({ closed: true, fill: 'ear2' }).M(0.69, 0.29).Q(0.74, 0.0, 0.83, 0.05).Q(0.81, 0.2, 0.74, 0.31).end();
      b.dot(0.71, 0.37, 0.017);
      b.dot(0.79, 0.42, 0.016);
      b.circle(0.15, 0.82, 0.06, { fill: 'light' });
      b.poly([[0.62, 0.8], [0.64, 0.97], [0.73, 0.97]], { w: 0.8 });
      b.line(0.79, 0.44, 0.92, 0.42, { w: 0.5 });
    },
  });
  def('bird', {
    aspect: 1.3, size: 0.18, anim: 'flap',
    build(b, P) {
      const f = flap(P.phase);
      b.curve([[0.3, 0.55], [0.55, 0.42], [0.85, 0.42], [0.98, 0.5], [0.9, 0.64], [0.6, 0.7], [0.38, 0.66]], { closed: true, fill: 'bird' });
      b.circle(0.98, 0.38, 0.12, { fill: 'bird' });
      b.poly([[1.09, 0.34], [1.27, 0.39], [1.09, 0.43]], { closed: true, fill: 'beak' });
      b.dot(1.0, 0.35, 0.02);
      b.poly([[0.34, 0.56], [0.06, 0.44], [0.12, 0.58], [0.04, 0.7], [0.36, 0.64]]);
      const k = 1 - 1.8 * f;
      const wy = (y) => 0.5 - (0.5 - y) * k;
      b.s({ closed: true, fill: 'bird' }).M(0.84, 0.48).Q(0.74, wy(0.12), 0.4, wy(0.06))
        .Q(0.46, wy(0.2), 0.5, wy(0.26)).Q(0.56, wy(0.3), 0.6, wy(0.36)).Q(0.64, wy(0.42), 0.66, wy(0.5)).L(0.84, 0.48).end();
      b.line(0.62, 0.69, 0.6, 0.84, { w: 0.7 });
      b.line(0.72, 0.69, 0.74, 0.84, { w: 0.7 });
    },
  });
  def('owl', {
    aspect: 0.8, size: 0.3,
    build(b) {
      b.ellipse(0.4, 0.56, 0.3, 0.4, 0, { fill: 'owl' });
      b.poly([[0.16, 0.3], [0.12, 0.1], [0.28, 0.22]], { w: 0.9 });
      b.poly([[0.64, 0.3], [0.68, 0.1], [0.52, 0.22]], { w: 0.9 });
      b.circle(0.29, 0.38, 0.09, { fill: 'light' });
      b.circle(0.51, 0.38, 0.09, { fill: 'light' });
      b.dot(0.3, 0.39, 0.032);
      b.dot(0.5, 0.39, 0.032);
      b.poly([[0.36, 0.48], [0.44, 0.48], [0.4, 0.57]], { closed: true, fill: 'beak' });
      b.s().M(0.12, 0.5).Q(0.06, 0.74, 0.2, 0.88).end();
      b.s().M(0.68, 0.5).Q(0.74, 0.74, 0.6, 0.88).end();
      for (const [x, y] of [[0.32, 0.66], [0.44, 0.66], [0.38, 0.76]]) b.poly([[x - 0.04, y], [x, y + 0.04], [x + 0.04, y]], { w: 0.6 });
    },
  });
  def('fish', {
    aspect: 1.6, size: 0.16,
    build(b) {
      b.s({ closed: true, fill: 'fish' }).M(0.3, 0.5).Q(0.75, 0.1, 1.3, 0.5).Q(0.75, 0.9, 0.3, 0.5).end();
      b.poly([[0.32, 0.5], [0.06, 0.28], [0.12, 0.5], [0.06, 0.72]], { closed: true, fill: 'fish' });
      b.dot(1.08, 0.44, 0.03);
      b.s({ w: 0.7 }).M(0.96, 0.34).Q(0.88, 0.5, 0.96, 0.66).end();
      b.poly([[0.62, 0.34], [0.72, 0.18], [0.82, 0.32]], { w: 0.7 });
    },
  });
  def('dragon', {
    aspect: 1.6, size: 0.56, anim: 'flap',
    build(b, P) {
      const f = P.phase === null || P.phase === undefined ? 0 : flap(P.phase);
      // body + neck + head in profile (facing right)
      b.curve([[0.42, 0.66], [0.58, 0.52], [0.86, 0.5], [1.06, 0.55], [1.12, 0.66], [1.0, 0.78], [0.74, 0.8], [0.5, 0.76]], { closed: true, fill: 'dragon' });
      b.s({ closed: true, fill: 'dragon' }).M(1.0, 0.54).Q(1.1, 0.34, 1.22, 0.24).L(1.32, 0.15).Q(1.42, 0.1, 1.5, 0.14).L(1.6, 0.21).Q(1.62, 0.26, 1.57, 0.28).L(1.44, 0.29).L(1.56, 0.33).Q(1.5, 0.37, 1.4, 0.34).Q(1.28, 0.4, 1.14, 0.64).end();
      b.dot(1.44, 0.19, 0.02);
      b.poly([[1.33, 0.15], [1.24, 0.03], [1.4, 0.12]], { closed: true, fill: 'gold' });
      b.dot(1.57, 0.2, 0.01);
      // back spikes along neck and body
      b.poly([[1.17, 0.31], [1.16, 0.22], [1.22, 0.26], [1.24, 0.17], [1.29, 0.21]], { w: 0.8 });
      b.poly([[0.5, 0.6], [0.52, 0.5], [0.58, 0.55], [0.62, 0.45], [0.67, 0.52]], { w: 0.8 });
      // bat wing: leading-edge bone + scalloped membrane; the flap mirrors it around the back line
      const k = 1 - 1.5 * f;
      const wy = (y) => 0.52 - (0.52 - y) * k;
      b.s({ closed: true, fill: 'wing' }).M(0.98, 0.52).Q(0.96, wy(0.06), 0.52, wy(-0.02))
        .Q(0.52, wy(0.18), 0.6, wy(0.3)).Q(0.66, wy(0.18), 0.74, wy(0.34)).Q(0.8, wy(0.22), 0.86, wy(0.38)).Q(0.92, wy(0.3), 0.94, wy(0.48)).L(0.98, 0.52).end();
      b.line(0.94, wy(0.12), 0.66, wy(0.2), { w: 0.6 });
      b.line(0.94, wy(0.12), 0.8, wy(0.26), { w: 0.6 });
      // tail with an arrow tip, legs with claws
      b.s().M(0.44, 0.7).Q(0.24, 0.84, 0.12, 0.66).Q(0.06, 0.56, 0.08, 0.46).end();
      b.poly([[0.08, 0.46], [0.0, 0.42], [0.1, 0.34], [0.14, 0.46]], { closed: true, fill: 'dragon' });
      b.poly([[0.62, 0.78], [0.6, 0.97], [0.66, 0.94], [0.7, 0.97]], { w: 0.9 });
      b.poly([[0.94, 0.77], [0.97, 0.97], [1.03, 0.94], [1.08, 0.97]], { w: 0.9 });
      b.s({ w: 0.6 }).M(0.7, 0.66).Q(0.82, 0.7, 0.94, 0.66).end();
    },
  });
  def('ghost', {
    aspect: 0.85, size: 0.42,
    build(b) {
      b.s({ closed: true, fill: 'ghost' }).M(0.12, 0.9).L(0.12, 0.4).Q(0.12, 0.04, 0.425, 0.04).Q(0.73, 0.04, 0.73, 0.4).L(0.73, 0.9)
        .Q(0.66, 0.98, 0.59, 0.9).Q(0.52, 0.82, 0.46, 0.9).Q(0.39, 0.98, 0.32, 0.9).Q(0.25, 0.82, 0.19, 0.9).Q(0.155, 0.95, 0.12, 0.9).end();
      b.ellipse(0.33, 0.34, 0.04, 0.06, 0, { fill: 'night' });
      b.ellipse(0.52, 0.34, 0.04, 0.06, 0, { fill: 'night' });
      b.circle(0.425, 0.52, 0.045, { fill: 'night' });
      b.s().M(0.12, 0.52).Q(0.02, 0.5, 0.0, 0.42).end();
      b.s().M(0.73, 0.52).Q(0.83, 0.5, 0.85, 0.42).end();
    },
  });
  def('robot', {
    aspect: 0.75, size: 0.46,
    build(b) {
      b.line(0.375, 0.12, 0.375, 0.04);
      b.dot(0.375, 0.035, 0.025);
      b.rect(0.2, 0.12, 0.35, 0.24, { fill: 'metal' });
      b.rect(0.26, 0.19, 0.07, 0.06, { fill: 'light' });
      b.rect(0.42, 0.19, 0.07, 0.06, { fill: 'light' });
      b.line(0.28, 0.3, 0.47, 0.3, { w: 0.7 });
      b.line(0.375, 0.36, 0.375, 0.4);
      b.rect(0.14, 0.4, 0.47, 0.34, { fill: 'metal' });
      b.rect(0.28, 0.48, 0.19, 0.12, { fill: 'light' });
      b.poly([[0.14, 0.44], [0.04, 0.6], [0.06, 0.72]]);
      b.poly([[0.61, 0.44], [0.71, 0.6], [0.69, 0.72]]);
      b.rect(0.2, 0.74, 0.1, 0.24);
      b.rect(0.45, 0.74, 0.1, 0.24);
    },
  });

  // ---- people: a stick figure with a walk cycle (phase) plus a costume per role
  function person(variant) {
    return function (b, P) {
      const walking = P.phase !== null && P.phase !== undefined;
      const s = walking ? Math.sin(TAU * P.phase) : 0;
      const th = walking ? 26 * RAD * s : 9 * RAD;
      const al = walking ? -22 * RAD * s : 16 * RAD;
      const cx = 0.3;
      const hipY = 0.62;
      const legL = 0.35;
      const lift = 0.97 - (hipY + legL * Math.cos(th)); // keeps the lower foot on the ground
      const Y = (y) => y + lift;
      const head = { x: cx, y: Y(0.2), r: 0.085 };
      const sh = { x: cx, y: Y(0.35) };
      const hip = { x: cx, y: Y(hipY) };
      const foot = (a) => ({ x: hip.x + legL * Math.sin(a), y: hip.y + legL * Math.cos(a) });
      const hand = (a) => ({ x: sh.x + 0.25 * Math.sin(a), y: sh.y + 0.25 * Math.cos(a) });
      const fL = foot(th);
      const fR = foot(-th);
      const hL = hand(al);
      const hR = hand(-al);
      const dress = variant === 'girl' || variant === 'princess' || variant === 'grandma' || variant === 'witch';
      // head + body
      if (variant === 'astronaut') b.circle(head.x, head.y, 0.13, { fill: 'helmet' });
      b.circle(head.x, head.y, head.r);
      b.dot(head.x + 0.03, head.y - 0.01, 0.012);
      const hem = variant === 'princess' || variant === 'witch' ? 0.82 : 0.7;
      if (dress) {
        b.poly([[cx, Y(0.31)], [cx - (hem - 0.3) * 0.42, Y(hem)], [cx + (hem - 0.3) * 0.42, Y(hem)]], { closed: true, fill: variant === 'witch' ? 'cloak' : variant === 'grandma' ? 'dress2' : 'dress' });
      } else b.line(cx, Y(0.285), cx, hip.y);
      if (variant === 'king') b.poly([[cx - 0.04, Y(0.32)], [cx - 0.16, Y(0.74)], [cx + 0.16, Y(0.74)], [cx + 0.04, Y(0.32)]], { closed: true, fill: 'cloak' });
      // legs (below a dress they start at its hem)
      if (dress) {
        const k = (0.97 - Y(hem)) / legL;
        for (const [sx, f] of [[-0.05, fL], [0.05, fR]]) {
          const x0 = cx + sx;
          const fx = x0 + (f.x - hip.x) * k;
          b.poly([[x0, Y(hem)], [fx, f.y], [fx + 0.06, f.y]]);
        }
      } else {
        b.poly([[hip.x, hip.y], [fL.x, fL.y], [fL.x + 0.06, fL.y]]);
        b.poly([[hip.x, hip.y], [fR.x, fR.y], [fR.x + 0.06, fR.y]]);
      }
      // arms
      b.line(sh.x, sh.y, hL.x, hL.y);
      b.line(sh.x, sh.y, hR.x, hR.y);
      // costumes
      const top = head.y - head.r;
      if (variant === 'girl') {
        b.arc(head.x, head.y, head.r + 0.012, head.r + 0.012, 195, 345, { w: 1.2 });
        b.s().M(head.x - 0.08, head.y - 0.03).Q(head.x - 0.16, head.y + 0.02, head.x - 0.14, head.y + 0.1).end();
        b.s().M(head.x + 0.08, head.y - 0.03).Q(head.x + 0.16, head.y + 0.02, head.x + 0.14, head.y + 0.1).end();
      } else if (variant === 'boy') {
        b.s({ closed: true, fill: 'shield' }).A(head.x, head.y - 0.005, head.r + 0.01, head.r + 0.01, 180, 360).L(head.x - head.r - 0.01, head.y - 0.005).end();
        b.line(head.x + 0.02, head.y - 0.01, head.x + 0.17, head.y - 0.005);
      } else if (variant === 'king' || variant === 'princess') {
        const w = variant === 'king' ? 0.09 : 0.065;
        const hgt = variant === 'king' ? 0.09 : 0.065;
        b.poly([[cx - w, top + 0.02], [cx - w, top - hgt], [cx - w / 2, top - hgt * 0.45], [cx, top - hgt * 1.05], [cx + w / 2, top - hgt * 0.45], [cx + w, top - hgt], [cx + w, top + 0.02]], { closed: true, fill: 'crown' });
        if (variant === 'princess') {
          b.s().M(head.x - 0.08, head.y - 0.04).Q(head.x - 0.12, head.y + 0.08, head.x - 0.1, head.y + 0.16).end();
          b.s().M(head.x + 0.08, head.y - 0.04).Q(head.x + 0.12, head.y + 0.08, head.x + 0.1, head.y + 0.16).end();
        }
      } else if (variant === 'knight') {
        b.line(head.x - head.r, head.y - 0.01, head.x + head.r, head.y - 0.01, { w: 1.2 });
        b.s().M(head.x, top).Q(head.x + 0.07, top - 0.1, head.x + 0.14, top - 0.05).end();
        b.line(hR.x, hR.y, hR.x + 0.16, hR.y - 0.3, { w: 1.2 });
        b.line(hR.x - 0.04, hR.y - 0.05, hR.x + 0.06, hR.y + 0.0, { w: 1.1 });
        b.circle(hL.x - 0.02, hL.y - 0.04, 0.085, { fill: 'shield' });
      } else if (variant === 'witch') {
        b.line(cx - 0.15, top + 0.015, cx + 0.15, top + 0.015, { w: 1.2 });
        b.poly([[cx - 0.08, top + 0.015], [cx + 0.04, top - 0.13], [cx + 0.09, top + 0.015]], { closed: true, fill: 'hat' });
        b.line(hR.x - 0.12, hR.y + 0.2, hR.x + 0.1, hR.y - 0.18, { w: 1.1 });
        b.poly([[hR.x - 0.12, hR.y + 0.2], [hR.x - 0.2, hR.y + 0.3], [hR.x - 0.1, hR.y + 0.28], [hR.x - 0.08, hR.y + 0.34]], { w: 0.8 });
      } else if (variant === 'grandma' || variant === 'grandpa') {
        if (variant === 'grandma') b.circle(head.x - 0.02, top - 0.025, 0.035);
        else {
          b.line(cx - 0.12, top + 0.02, cx + 0.12, top + 0.02, { w: 1.2 });
          b.rect(cx - 0.07, top - 0.07, 0.14, 0.09, { fill: 'hat' });
          b.s().M(head.x - 0.05, head.y + 0.04).Q(head.x + 0.01, head.y + 0.14, head.x + 0.07, head.y + 0.04).end();
        }
        b.s().M(hR.x + 0.02, 0.97).L(hR.x + 0.02, hR.y).Q(hR.x + 0.02, hR.y - 0.06, hR.x - 0.04, hR.y - 0.04).end();
      } else if (variant === 'astronaut') {
        b.rect(cx - 0.17, Y(0.36), 0.08, 0.2, { fill: 'metal' });
      }
    };
  }
  for (const v of ['person', 'girl', 'boy', 'grandma', 'grandpa', 'king', 'princess', 'knight', 'witch', 'astronaut']) {
    def(v, { aspect: 0.6, size: v === 'person' ? 0.5 : 0.5, anim: 'walk', person: true, build: person(v) });
  }

  const LIBRARY = Object.freeze(Object.keys(LIB));

  // ------------------------------------------------------------------ paths: jitter, normalise, cache
  const PATH_CACHE = new Map();
  const PATH_CACHE_MAX = 600;
  /**
   * The strokes of library item `id` in its unit box (x 0..1 = 0..aspect height units, y 0..1, y down), with the
   * seeded hand-jitter applied. Same id + seed + phase (+ aspect for wide items) -> identical result (cached).
   * opts: { seed (default hash of id), phase (null = rest pose, 0..1 walk / flap / flicker), aspect (wide items),
   * variant }. Returns null for an unknown id.
   */
  function pathFor(id, opts = {}) {
    const lib = LIB[id];
    if (!lib) return null;
    const o = opts && typeof opts === 'object' ? opts : {};
    const seed = Number.isFinite(o.seed) ? o.seed >>> 0 : hashStr(id);
    const frames = POSE_FRAMES[lib.anim] || 0;
    let phase = o.phase === null || o.phase === undefined || !frames ? null : ((Number(o.phase) % 1) + 1) % 1;
    if (phase !== null) phase = Math.round(phase * 64) / 64;
    const aspect = lib.wide && Number.isFinite(o.aspect) && o.aspect > 0 ? Math.round(clamp(o.aspect, 0.5, 80) * 4) / 4 : lib.aspect;
    const variant = typeof o.variant === 'string' ? o.variant : '';
    const key = `${id}|${seed}|${phase}|${aspect}|${variant}`;
    const hit = PATH_CACHE.get(key);
    if (hit) return hit;
    const b = new Builder(aspect);
    const rnd = mulberry32(seed ^ 0x5bd1e995);
    lib.build(b, { phase, aspect, rnd, variant });
    b.end();
    const jr = mulberry32(seed);
    const strokes = b.strokes.map((s) => finishStroke(s, aspect, jr));
    let length = 0;
    for (const s of strokes) length += s.len;
    const path = { id, seed, phase, aspect, length: Math.round(length * 1000) / 1000, strokes };
    if (PATH_CACHE.size >= PATH_CACHE_MAX) PATH_CACHE.delete(PATH_CACHE.keys().next().value);
    PATH_CACHE.set(key, path);
    return path;
  }

  /** Applies jitter (smooth, seeded, perpendicular), overshoot at stroke ends and normalises x by the aspect. */
  function finishStroke(s, aspect, rng) {
    // Always consume the same number of random values per stroke, so a pose change (walk phase) never re-jitters
    // the strokes that did not move (no "line boil").
    const r = [rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng()];
    const src = s.pts;
    const n = src.length / 2;
    const w = Math.round(s.w * (0.9 + r[7] * 0.2) * 1000) / 1000;
    if (s.dot) {
      return { pts: [round4(src[0] / aspect), round4(src[1])], w: 1, closed: false, fill: null, part: s.part, dot: s.dot, len: 0.03 };
    }
    const amp = JITTER * s.jitter;
    const f1 = 9 + r[0] * 6;
    const f2 = 23 + r[1] * 14;
    const p1 = r[2] * TAU;
    const p2 = r[3] * TAU;
    const sx = (r[4] - 0.5) * 0.006 * s.jitter;
    const sy = (r[5] - 0.5) * 0.006 * s.jitter;
    let acc = 0;
    let pts = [];
    for (let i = 0; i < n; i++) {
      const x = src[i * 2];
      const y = src[i * 2 + 1];
      if (i > 0) acc += Math.hypot(x - src[i * 2 - 2], y - src[i * 2 - 1]);
      const a = Math.max(0, i - 1);
      const c = Math.min(n - 1, i + 1);
      let tx = src[c * 2] - src[a * 2];
      let ty = src[c * 2 + 1] - src[a * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const off = amp * (0.65 * Math.sin(f1 * acc + p1) + 0.35 * Math.sin(f2 * acc + p2));
      pts.push(x - ty * off + sx, y + tx * off + sy);
    }
    if (s.closed && n > 4) {
      // a hand closes a shape by running a little past its start
      let over = 0;
      for (let i = 1; i < n && over < 0.018; i++) {
        over += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
        pts.push(pts[i * 2], pts[i * 2 + 1]);
      }
    } else if (n >= 2 && s.jitter > 0) {
      const ext = (ia, ib, e) => {
        const dx = pts[ia * 2] - pts[ib * 2];
        const dy = pts[ia * 2 + 1] - pts[ib * 2 + 1];
        const d = Math.hypot(dx, dy) || 1;
        return [pts[ia * 2] + (dx / d) * e, pts[ia * 2 + 1] + (dy / d) * e];
      };
      const head = ext(0, 1, 0.004 + r[6] * 0.008);
      const tail = ext(n - 1, n - 2, 0.004 + r[4] * 0.01);
      pts = [head[0], head[1], ...pts, tail[0], tail[1]];
    }
    let len = 0;
    for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    const out = [];
    for (let i = 0; i < pts.length; i += 2) out.push(round4(pts[i] / aspect), round4(pts[i + 1]));
    return { pts: out, w, closed: s.closed, fill: s.fill, part: s.part, dot: 0, len: Math.round(len * 10000) / 10000 };
  }
  function round4(v) {
    return Math.round(v * 10000) / 10000;
  }

  /** Prepared path for rasterising: height-unit coordinates + cumulative lengths per stroke (cached on the path). */
  function prepare(path) {
    if (path._prep) return path._prep;
    const A = path.aspect;
    const strokes = path.strokes.map((s) => {
      const n = s.pts.length / 2;
      const xs = new Float32Array(n);
      const ys = new Float32Array(n);
      const cum = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        xs[i] = s.pts[i * 2] * A;
        ys[i] = s.pts[i * 2 + 1];
        if (i) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
      }
      return { xs, ys, cum, len: s.dot ? 0 : cum[n - 1], w: s.w, closed: s.closed, fill: s.fill, part: s.part, dot: s.dot, phase: hash01(n * 31 + Math.round(s.w * 100)) * TAU };
    });
    Object.defineProperty(path, '_prep', { value: { aspect: A, strokes, lengths: path.strokes.map((s) => s.len) }, enumerable: false });
    return path._prep;
  }
  /** Stroke extent of an element's drawing in height units ({minX, maxX, minY, maxY}; the whole box without one). */
  function extentOf(el) {
    const prep = el && el.prep;
    if (!prep) return { minX: 0, maxX: (el && el.aspect) || 1, minY: 0, maxY: 1 };
    if (prep.ext) return prep.ext;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const st of prep.strokes) {
      for (let i = 0; i < st.xs.length; i++) {
        const r = st.dot || 0;
        minX = Math.min(minX, st.xs[i] - r);
        maxX = Math.max(maxX, st.xs[i] + r);
        minY = Math.min(minY, st.ys[i] - r);
        maxY = Math.max(maxY, st.ys[i] + r);
      }
    }
    prep.ext = Number.isFinite(minX) ? { minX, maxX, minY, maxY } : { minX: 0, maxX: prep.aspect, minY: 0, maxY: 1 };
    return prep.ext;
  }

  // ------------------------------------------------------------------ scheduler (pure, unit-tested)
  /** Draw-in time (s) for a path of `length` height units: 0.6 s + 0.09 s per unit, at most 1.2 s. */
  function durationFor(length) {
    const l = Number(length);
    return clamp(DRAW_MIN + DRAW_PER_UNIT * (Number.isFinite(l) && l > 0 ? l : 0), DRAW_MIN, DRAW_MAX);
  }
  /**
   * Stroke timings inside one element: the pen draws the strokes one after another, each in time proportional to
   * its length (a dot / tiny stroke gets at least 2 % of the total), with a short pen-lift gap between strokes
   * (≤ 60 ms, ≤ 20 % of the duration in total). Returns [{ t0, t1 }] in seconds, t1 of the last stroke = duration.
   */
  function schedule(lengths, duration) {
    const n = Array.isArray(lengths) ? lengths.length : 0;
    const D = Math.max(0, Number(duration) || 0);
    if (!n) return [];
    const gap = n > 1 ? Math.min(PEN_GAP_MAX, (0.2 * D) / (n - 1)) : 0;
    const avail = Math.max(0, D - gap * (n - 1));
    const total = lengths.reduce((a, l) => a + Math.max(0, Number(l) || 0), 0);
    const weights = lengths.map((l) => Math.max(Math.max(0, Number(l) || 0), total * 0.02, 1e-6));
    const sum = weights.reduce((a, b) => a + b, 0);
    const out = [];
    let t = 0;
    for (let i = 0; i < n; i++) {
      const dt = (avail * weights[i]) / sum;
      out.push({ t0: t, t1: i === n - 1 ? D : t + dt });
      t += dt + gap;
    }
    return out;
  }
  /** Linear progress 0..1 of every stroke at time t (s) – the renderer eases it (pen slows at stroke ends). */
  function progress(sched, t) {
    return sched.map((s) => (t <= s.t0 ? 0 : t >= s.t1 ? 1 : (t - s.t0) / Math.max(1e-9, s.t1 - s.t0)));
  }
  /** Start offsets (s) for `n` new elements of one update: ≤ 0.16 s apart, all started within 1.4 s. */
  function stagger(n) {
    if (!(n > 1)) return n === 1 ? [0] : [];
    const step = Math.min(STAGGER_STEP, STAGGER_SPAN / (n - 1));
    return Array.from({ length: n }, (_, i) => Math.round(i * step * 1000) / 1000);
  }

  // ------------------------------------------------------------------ colours: ink by theme + mood, sky wash by time
  const THEME_INK = {
    neon: { ink: '#ffffff', halo: '#000000', under: 0.5 },
    pastel: { ink: '#fffafd', halo: '#3d2b45', under: 0.48 },
    minimal: { ink: '#f4f4f6', halo: '#000000', under: 0.42 },
    kinderbuch: { ink: '#fffdf2', halo: '#4a2c10', under: 0.52 },
  };
  const MOOD_TINT = { calm: null, happy: ['#ffd36b', 0.42], tense: ['#ff8a70', 0.45], sad: ['#95b8ff', 0.5], scary: ['#c79bff', 0.5] };
  function hexRgb(h) {
    const s = String(h).replace('#', '');
    const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s.padEnd(6, '0').slice(0, 6);
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  function rgbHex(c) {
    return '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function mixHex(a, b, t) {
    const x = hexRgb(a);
    const y = hexRgb(b);
    return rgbHex([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]);
  }
  /** Ink colour + halo for a theme / mood: `{ ink, halo, under }` (under = alpha of the halo + colour wash layer). */
  function inkFor(theme, mood) {
    const th = THEME_INK[theme] || THEME_INK.neon;
    const m = MOOD_TINT[mood];
    return { ink: m ? mixHex(th.ink, m[0], m[1]) : th.ink, halo: th.halo, under: th.under };
  }
  const SKY = {
    day: [[110, 170, 255, 0.2], [150, 200, 255, 0.05]],
    morning: [[255, 150, 90, 0.32], [255, 214, 150, 0.1]],
    evening: [[110, 60, 170, 0.4], [255, 120, 80, 0.2]],
    night: [[8, 14, 48, 0.58], [20, 30, 80, 0.32]],
  };
  const WEATHER_SKY = { rain: [[45, 55, 75, 0.42], [70, 80, 100, 0.18]], storm: [[22, 22, 38, 0.56], [45, 45, 65, 0.28]], snow: [[190, 205, 230, 0.32], [220, 230, 245, 0.12]], fog: [[195, 195, 205, 0.36], [210, 210, 220, 0.24]] };
  const SPACE_SKY = [[5, 5, 25, 0.62], [25, 10, 55, 0.45]];
  const GROUND_WASH = { forest: [40, 90, 45, 0.3], meadow: [70, 130, 60, 0.28], village: [80, 110, 60, 0.26], desert: [210, 170, 90, 0.3], city: [55, 55, 65, 0.32], mountains: [90, 100, 120, 0.26], castle: [70, 60, 80, 0.26], cave: [40, 30, 30, 0.36], sea: [30, 90, 170, 0.3] };
  /** Sky wash for a state: `{ key, top, bottom, ground }` (rgba arrays) or null when nothing is on stage. */
  function washFor(st) {
    if (!st) return null;
    let sky = st.place === 'space' ? SPACE_SKY : SKY[st.time] || SKY.day;
    const wx = WEATHER_SKY[st.weather];
    if (wx && st.place !== 'space') {
      const k = st.time === 'night' ? 0.45 : 0.75;
      sky = sky.map((c, i) => [lerp(c[0], wx[i][0], k), lerp(c[1], wx[i][1], k), lerp(c[2], wx[i][2], k), Math.max(c[3], wx[i][3])]);
    }
    let ground = GROUND_WASH[st.place] || [0, 0, 0, 0.18];
    if (st.weather === 'snow') ground = [235, 240, 250, 0.32];
    if (st.place === 'space') ground = null;
    return { key: JSON.stringify([sky, ground]), top: sky[0], bottom: sky[1], ground };
  }
  const rgba = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(c[3] * a, 0, 1).toFixed(3)})`;

  // ------------------------------------------------------------------ story state -> scene elements (pure)
  const ROLE_ID = {
    person: 'person', girl: 'girl', boy: 'boy', grandma: 'grandma', grandpa: 'grandpa', king: 'king', princess: 'princess', knight: 'knight', witch: 'witch',
    astronaut: 'astronaut', dragon: 'dragon', cat: 'cat', dog: 'dog', horse: 'horse', unicorn: 'unicorn', bird: 'bird', fish: 'fish', bear: 'bear', fox: 'fox',
    rabbit: 'rabbit', owl: 'owl', robot: 'robot', ghost: 'ghost',
    tree: 'tree', pine: 'pine', house: 'house', hut: 'house', treasure: 'chest', chest: 'chest', ship: 'ship', boat: 'boat', car: 'car', flower: 'flower',
    fire: 'campfire', campfire: 'campfire', star: 'star', ball: 'ball', book: 'book', bridge: 'bridge', tent: 'tent', lantern: 'lantern', cake: 'cake', key: 'key',
    heart: 'heart', castle: 'castle', city: 'city', village: 'house', sun: 'sun', moon: 'moon', cloud: 'cloud', mountain: 'mountains', mountains: 'mountains',
    cactus: 'cactus', planet: 'planet', snowflake: 'snowflake', lightning: 'lightning', bush: 'bush', cave: 'cave',
  };
  const EMOJI_ID = {
    '👧': 'girl', '👦': 'boy', '👵': 'grandma', '👴': 'grandpa', '🤴': 'king', '👸': 'princess', '🤺': 'knight', '🧙‍♀️': 'witch', '🧙': 'witch', '🧑‍🚀': 'astronaut',
    '🐉': 'dragon', '🐲': 'dragon', '🐈': 'cat', '🐱': 'cat', '🐕': 'dog', '🐶': 'dog', '🐎': 'horse', '🐴': 'horse', '🦄': 'unicorn', '🐦': 'bird', '🐟': 'fish',
    '🐠': 'fish', '🐻': 'bear', '🦊': 'fox', '🐇': 'rabbit', '🐰': 'rabbit', '🦉': 'owl', '🤖': 'robot', '👻': 'ghost', '🧍': 'person', '🚶': 'person',
    '🌳': 'tree', '🌲': 'pine', '🏠': 'house', '🏡': 'house', '🏘️': 'house', '💰': 'chest', '💎': 'chest', '⛵': 'boat', '🚢': 'ship', '🚗': 'car', '🚕': 'car',
    '🌸': 'flower', '🌷': 'flower', '🔥': 'campfire', '⭐': 'star', '🌟': 'star', '⚽': 'ball', '📖': 'book', '🌉': 'bridge', '⛺': 'tent', '🏮': 'lantern',
    '🎂': 'cake', '🔑': 'key', '❤️': 'heart', '💖': 'heart', '🏰': 'castle', '🏙️': 'city', '☀️': 'sun', '🌙': 'moon', '☁️': 'cloud', '🌵': 'cactus', '🪐': 'planet',
    '❄️': 'snowflake', '⚡': 'lightning', '🏔️': 'mountains', '⛰️': 'mountains',
  };
  /** Library id for a story actor / prop (`{role, emoji}`), or null when there is no drawing for it. */
  function idFor(item) {
    if (!item || typeof item !== 'object') return null;
    const r = typeof item.role === 'string' ? item.role.toLowerCase() : '';
    if (ROLE_ID[r]) return ROLE_ID[r];
    const e = typeof item.emoji === 'string' ? item.emoji.trim() : '';
    return EMOJI_ID[e] || EMOJI_ID[e.replace(/️/g, '')] || null;
  }
  // A bare scene id (scene pad / story-state without details) still gets its place / time / weather.
  const SCENE_HINT = { rain: { weather: 'rain' }, storm: { weather: 'storm' }, snow: { weather: 'snow' }, night: { time: 'night' }, sunrise: { time: 'morning' }, forest: { place: 'forest' }, sea: { place: 'sea' }, city: { place: 'city' }, castle: { place: 'castle' }, desert: { place: 'desert' }, space: { place: 'space' }, fire: { prop: 'fire', time: 'night' } };
  const SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm'];

  /** Light normalisation of a story state (the renderer already ran LiveFXSchema.normalizeStoryState). */
  function normState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const word = (v) => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 24) : '');
    const list = (v, max) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, max).map((x) => ({ emoji: typeof x.emoji === 'string' ? x.emoji.slice(0, 16) : '', role: word(x.role), action: word(x.action) || null })) : []);
    const st = {
      scene: SCENES.includes(raw.scene) ? raw.scene : null,
      time: word(raw.time) || 'day',
      weather: word(raw.weather) || 'clear',
      place: word(raw.place) || null,
      landmark: word(raw.landmark) || null,
      mood: word(raw.mood) || 'calm',
      actors: list(raw.actors, 6),
      props: list(raw.props, 5),
      end: raw.end === true,
    };
    const hint = st.scene && SCENE_HINT[st.scene];
    if (hint) {
      if (hint.weather && st.weather === 'clear') st.weather = hint.weather;
      if (hint.time && st.time === 'day') st.time = hint.time;
      if (hint.place && !st.place) st.place = hint.place;
      if (hint.prop && !st.props.some((p) => idFor(p) === 'campfire')) st.props.push({ emoji: '🔥', role: 'fire', action: null });
    }
    return st;
  }

  /**
   * Lays a story state out in a band of `size` {w, h} CSS px. Returns `{ els, wash, u, ground }`; every element is
   * `{ key, id, x (centre), y (baseline), h, layer, alpha, fixed, aspect?, proc?, action?, emoji? }`. Keys are stable
   * (same state -> same keys) so update() can diff. `opts.style` 'mixed' leaves actors + props to the renderer's
   * emoji sprites (unless opts.mixedProps), `opts.keep` (Set of keys on stage) keeps background elements where they
   * are and `opts.pos` (Map key -> x) keeps props / actors / sun, moon and clouds on stage at their place.
   */
  function compose(raw, size, opts = {}) {
    const st = normState(raw);
    const W = Math.max(1, Number(size && size.w) || 1);
    const H = Math.max(1, Number(size && size.h) || 1);
    const u = Math.min(H, W * 0.45, 420);
    const ground = H * 0.9;
    const out = { els: [], wash: null, u, ground };
    if (!st || st.end || !st.scene) return out;
    const style = STYLES.includes(opts.style) ? opts.style : 'sketch';
    const keep = opts.keep instanceof Set ? opts.keep : new Set();
    const drawActors = style === 'sketch';
    const drawProps = style === 'sketch' || !!opts.mixedProps;
    const els = out.els;
    const rng = mulberry32(hashStr(`${W}x${H}`));
    // the band fades in over its top 18 % (css/overlay.css mask): sky items start below most of that fade
    const skyTop = Math.max(0.12 * H, ground - 1.25 * u);
    const add = (key, id, x, y, h, layer, extra) => {
      if (!LIB[id] && !(extra && (extra.proc || extra.emoji))) return null;
      const e = Object.assign({ key, id, x, y, h, layer, alpha: 1, fixed: false }, extra || {});
      els.push(e);
      return e;
    };
    const width = (id, h) => h * ((LIB[id] && LIB[id].aspect) || 1);
    const front = [];
    const sea = st.place === 'sea';
    const waterline = H * 0.72;
    out.wash = style === 'mixed' ? null : washFor(st);

    // -- props + actors first (they stand in front), placed jointly so they do not cover each other; the
    //    background then fades where it would sit behind them
    const fronts = [];
    if (drawProps) {
      st.props.forEach((p, i) => {
        if (p.role && (p.role === st.landmark || p.role === st.place)) return; // the landmark is drawn as scenery
        const id = idFor(p) || (p.emoji ? 'emoji' : null);
        if (!id) return;
        const h = id === 'emoji' ? u * 0.34 : u * LIB[id].size;
        let y = ground;
        let layer = LAYER.mid;
        if (id === 'star' || id === 'sun' || id === 'moon' || id === 'cloud' || id === 'planet') {
          y = skyTop + h + (id === 'star' ? u * 0.04 : 0);
          layer = LAYER.sky;
        } else if (id === 'heart') y = ground - u * 0.35;
        else if ((id === 'boat' || id === 'ship') && sea) y = waterline + h * 0.12;
        fronts.push({ key: `prop:${p.role || id}`, id, h, y, layer, pref: W * PROP_SLOTS[i % PROP_SLOTS.length], ground: y >= ground - 1, extra: { emoji: id === 'emoji' ? p.emoji : undefined, float: id === 'heart' || ((id === 'boat' || id === 'ship') && sea) } });
      });
    }
    if (drawActors) {
      st.actors.forEach((a, i) => {
        const id = idFor(a) || (a.emoji ? 'emoji' : null);
        if (!id) return;
        const h = id === 'emoji' ? u * 0.4 : u * LIB[id].size;
        let y = ground;
        if (a.action === 'fly') y = Math.min(ground - u * 0.3, ground - u * 0.62 + h);
        else if (a.action === 'swim' && sea) y = waterline + h * 0.25;
        else if (id === 'fish') y = sea ? waterline + h * 0.6 : ground - u * 0.05;
        fronts.push({ key: `actor:${a.role || id}`, id, h, y, layer: LAYER.front, pref: W * ACTOR_SLOTS[i % ACTOR_SLOTS.length], ground: y >= ground - 1, extra: { emoji: id === 'emoji' ? a.emoji : undefined, action: a.action, person: !!(LIB[id] && LIB[id].person) } });
      });
    }
    // greedy placement on a grid: enough room first (≥ 0.3 u gap), then the canonical slot; stage elements keep x
    const pos = opts.pos instanceof Map ? opts.pos : new Map();
    const placed = [];
    const comfort = u * 0.3;
    const cand = [];
    for (let k = 0; k < 17; k++) cand.push(W * (0.06 + (k / 16) * 0.88));
    for (const f of fronts) f.hw = (f.id === 'emoji' ? f.h : width(f.id, f.h)) / 2;
    for (const f of fronts) {
      if (pos.has(f.key)) f.x = pos.get(f.key);
      else if (!f.ground) f.x = f.pref;
      if (f.x !== undefined && f.ground) placed.push(f);
    }
    for (const f of fronts) {
      if (f.x !== undefined) continue;
      let best = null;
      for (const x of cand.concat([f.pref])) {
        let gap = comfort;
        for (const q of placed) gap = Math.min(gap, Math.abs(x - q.x) - (q.hw + f.hw));
        if (x - f.hw < 0 || x + f.hw > W) gap -= u * 0.5;
        const score = gap - Math.abs(x - f.pref) * 0.12;
        if (!best || score > best.score) best = { x, score };
      }
      f.x = best.x;
      placed.push(f);
    }
    for (const f of fronts) {
      // a walker patrols the room between its neighbours (never further than 14 % of the width / 0.6 u)
      let range;
      if (f.layer === LAYER.front && (f.extra.action === 'go' || f.extra.action === 'run')) {
        let room = Math.min(f.x - f.hw, W - f.x - f.hw);
        for (const q of placed) if (q !== f) room = Math.min(room, Math.abs(f.x - q.x) - q.hw - f.hw);
        range = clamp(room, u * 0.08, Math.min(W * 0.14, u * 0.6));
      }
      const e = add(f.key, f.id, f.x, f.y, f.h, f.layer, Object.assign({}, f.extra, range ? { range } : {}));
      if (e && f.ground) front.push([f.x, f.hw]);
    }
    const emojiSlots = []; // mixed: [x, hw] of the renderer's emoji sprites
    if (!drawProps || !drawActors) {
      // mixed: the renderer draws its emoji sprites at its own slots – keep the scenery clear of them as well
      if (!drawProps) st.props.forEach((p, i) => emojiSlots.push([W * PROP_SLOTS[i % PROP_SLOTS.length], u * 0.25]));
      if (!drawActors) st.actors.forEach((a, i) => a.action !== 'fly' && emojiSlots.push([W * ACTOR_SLOTS[i % ACTOR_SLOTS.length], u * 0.2]));
      front.push(...emojiSlots);
    }
    const free = (x, hw) => front.every(([fx, fhw]) => Math.abs(x - fx) > fhw + hw * 0.55);
    /** No prop / figure (on the ground or in the air, sketched or emoji) within hw of x. */
    const clearX = (x, hw) => fronts.every((f) => Math.abs(x - f.x) > f.hw + hw) && front.every(([fx, fhw]) => Math.abs(x - fx) > fhw + hw);
    /** First of the x fractions that is clear (else the first). */
    const pickX = (fracs, hw) => {
      const hit = fracs.find((fx) => clearX(W * fx, hw));
      return W * (hit === undefined ? fracs[0] : hit);
    };
    const backs = []; // [x, hw] of the background elements placed so far (trees may overlap each other a little)
    const backEls = []; // the background elements themselves (sky items keep clear of them / cap their height)
    const bfree = (x, hw) => backs.every(([bx, bhw]) => Math.abs(x - bx) > (bhw + hw) * 0.72);
    /** Background element; behind a front element it is drawn fainter and a little smaller (never dropped). */
    const back = (key, id, x, y, h, extra) => {
      const clear = keep.has(key) || free(x, width(id, h) / 2);
      const hh = clear ? h : h * 0.88;
      backs.push([x, width(id, hh) / 2]);
      const e = add(key, id, x, y, hh, LAYER.back, Object.assign({ fixed: true, alpha: clear ? 0.85 : 0.5 }, extra));
      if (e) backEls.push(e);
      return e;
    };

    // -- ground line
    if (st.place === 'space') {
      /* no ground in space */
    } else if (sea) add('ground:sea', 'waves', W / 2, H, H - waterline + u * 0.08, LAYER.ground, { proc: 'waves', fixed: true });
    else if (st.place === 'city') add('ground:road', 'road', W / 2, ground + u * 0.1, u * 0.14, LAYER.ground, { aspect: W / (u * 0.14), fixed: true, penRef: u * 0.5 });
    else if (st.place === 'desert') add('ground:dunes', 'dunes', W / 2, ground + u * 0.04, u * 0.16, LAYER.ground, { aspect: W / (u * 0.16), fixed: true, penRef: u * 0.5 });
    else add('ground:horizon', 'horizon', W / 2, ground + u * 0.05, u * 0.1, LAYER.ground, { aspect: W / (u * 0.1), fixed: true, penRef: u * 0.5 });

    // -- place scenery
    /**
     * Repeated scenery (forest, meadow, village, mountains): n slots across the band. A slot whose spot is taken by a
     * prop / actor steps aside (up to 0.7 slot), then tries a smaller "distant" copy, and is left out when nothing
     * fits – except that at least two (or n) items always stay (faint, behind the front element). Elements already
     * on stage keep their place (`opts.pos`), so a new prop never shuffles the forest.
     */
    const spread = (n, key, pick, hk, yk) => {
      const slot = W / n;
      const late = [];
      let placedN = 0;
      for (let k = 0; k < n; k++) {
        const x0 = ((k + 0.5) / n) * W + (rng() - 0.5) * slot * 0.45;
        const id = pick(k);
        const h = u * LIB[id].size * hk(k);
        const hw = width(id, h) / 2;
        const ck = `${key}:${k}`;
        const y = yk ? yk(k) : ground;
        if (keep.has(ck)) {
          back(ck, id, pos.has(ck) ? pos.get(ck) : x0, y, h);
          placedN++;
          continue;
        }
        const inside = (x, w2) => x - w2 > -w2 * 0.5 && x + w2 < W + w2 * 0.5;
        let spot = null;
        for (const sc of [1, 0.68]) {
          for (const d of [0, 0.3, -0.3, 0.5, -0.5, 0.7, -0.7]) {
            const x = x0 + d * slot;
            const w2 = hw * sc;
            if (inside(x, w2) && free(x, w2) && bfree(x, w2)) {
              spot = { x, sc };
              break;
            }
          }
          if (spot) break;
        }
        if (spot) {
          back(ck, id, spot.x, y, h * spot.sc, spot.sc < 1 ? { alpha: 0.7 } : undefined);
          placedN++;
        } else late.push([ck, id, x0, y, h]);
      }
      // nothing fitted: keep a minimum of scenery, faint and smaller behind the front elements
      for (const [ck, id, x0, y, h] of late) {
        if (placedN >= Math.min(2, n)) break;
        back(ck, id, x0, y, h * 0.78, { alpha: 0.5 });
        placedN++;
      }
    };
    const ratio = W / u;
    switch (st.place) {
      case 'forest':
        spread(clamp(Math.round(ratio * 1.05), 3, 9), 'forest', (k) => (hash01(k * 7 + 3) < 0.55 ? 'pine' : 'tree'), (k) => 0.82 + hash01(k * 5 + 1) * 0.22);
        break;
      case 'meadow':
        spread(clamp(Math.round(ratio * 1.4), 3, 10), 'meadow', (k) => (k % 3 === 2 ? 'bush' : 'flower'), () => 1);
        break;
      case 'village':
        spread(clamp(Math.round(ratio * 0.45), 2, 4), 'village', (k) => (k % 2 ? 'tree' : 'house'), (k) => (k % 2 ? 0.8 : 0.85));
        break;
      case 'mountains':
        spread(clamp(Math.round(ratio * 0.28), 1, 3), 'mountains', () => 'mountains', () => 1);
        break;
      case 'desert':
        back('desert:cactus:0', 'cactus', W * 0.22, ground, u * 0.46);
        back('desert:cactus:1', 'cactus', W * 0.9, ground, u * 0.36);
        break;
      case 'city':
        add('city:skyline', 'city', W / 2, ground + u * 0.03, u * 0.72, LAYER.back, { aspect: (W * 0.96) / (u * 0.72), fixed: true, alpha: 0.7, penRef: u * 0.6 });
        break;
      case 'castle':
        back('castle', 'castle', W * 0.5, ground, u * 0.84);
        break;
      case 'cave':
        back('cave', 'cave', W * 0.5, ground, u * 0.8);
        break;
      case 'space':
        add('space:planet', 'planet', pickX([0.74, 0.26, 0.5, 0.9], u * 0.3), skyTop + u * 0.5, u * 0.42, LAYER.sky, { fixed: true, drift: Math.min(W * 0.025, u * 0.15) });
        break;
      default:
        break;
    }
    // landmark next to a nature place ("im Wald … über das Schloss")
    const emojiLandmark = !drawProps && st.props.some((p) => p.role === st.landmark); // mixed: already an emoji prop
    if (st.landmark && st.landmark !== st.place && !emojiLandmark) {
      if (st.landmark === 'castle') back('landmark:castle', 'castle', W * 0.62, ground, u * 0.74);
      else if (st.landmark === 'city') add('landmark:city', 'city', W * 0.78, ground + u * 0.02, u * 0.5, LAYER.back, { aspect: (W * 0.3) / (u * 0.5), fixed: true, alpha: 0.75, penRef: u * 0.5 });
      else if (st.landmark === 'village') {
        back('landmark:village:0', 'house', W * 0.64, ground, u * 0.44);
        back('landmark:village:1', 'house', W * 0.82, ground, u * 0.38);
      }
    }

    // -- sky: sun / moon / stars by time, clouds by weather. Sky items keep clear of props and figures (those do not
    //    move) and prefer the gaps between tall scenery; new scenery that still reaches into a sun / moon / cloud is
    //    drawn lower (a 16:9 band of 22 % has little sky above full-height trees); stars only go where the sky is free.
    const wet = st.weather === 'rain' || st.weather === 'storm' || st.weather === 'snow' || st.weather === 'fog';
    const sky = st.place !== 'space';
    const room = ground - skyTop; // sky + land above the ground line
    const DRIFT = Math.min(W * 0.025, u * 0.15);
    const ew = (e) => e.h * (e.aspect || (LIB[e.id] && LIB[e.id].aspect) || 1);
    // what a sky item should not sit behind: { l, r, t, w (weight) } – props / figures first, then scenery
    const talls = [];
    for (const f of fronts) talls.push({ l: f.x - f.hw, r: f.x + f.hw, t: f.y - f.h, w: 10 });
    for (const [fx, fhw] of emojiSlots) talls.push({ l: fx - fhw, r: fx + fhw, t: ground - u * 0.5, w: 10 });
    for (const e of els) if (e.layer === LAYER.back) talls.push({ l: e.x - ew(e) / 2, r: e.x + ew(e) / 2, t: e.y - e.h, w: keep.has(e.key) ? 4 : 1 });
    const skyBoxes = [];
    /** Sky item at the x (of `fracs`, in order of preference) with the least in its way; an item on stage stays. */
    const skyAdd = (key, id, fracs, y, h, extra) => {
      const hw = width(id, h) / 2 + (extra.drift ? DRIFT : 0);
      const top = y - h - (extra.rays ? h * 0.21 : 0);
      const bottom = y + (extra.rays ? h * 0.21 : 0);
      let x = pos.get(key);
      if (x === undefined) {
        let best = null;
        fracs.forEach((fx, i) => {
          const cx = W * clamp(fx, 0.04, 0.96);
          let c = i * 0.01;
          for (const q of talls) if (q.t < bottom && q.l < cx + hw && cx - hw < q.r) c += q.w;
          if (!best || c < best.c) best = { x: cx, c };
        });
        x = best.x;
      }
      const e = add(key, id, x, y, h, LAYER.sky, Object.assign({ fixed: true }, extra));
      if (e) {
        skyBoxes.push({ l: x - hw, r: x + hw, t: top, b: bottom, low: !!extra.low });
        talls.push({ l: x - hw, r: x + hw, t: top, w: 3 }); // the next sky item keeps clear of this one too
      }
      return e;
    };
    const near = (c) => [c, c + 0.05, c - 0.05, c + 0.1, c - 0.1, c + 0.15, c - 0.15];
    if (sky && st.time === 'night') {
      const h = Math.min(u * 0.3, room * 0.34);
      skyAdd('sky:moon', 'moon', [0.87, 0.13, 0.75, 0.25, 0.62, 0.38, 0.94, 0.06], skyTop + h * 1.07, h, {});
    } else if (sky && (st.time === 'morning' || st.time === 'evening')) {
      // a low sun on the horizon (on the waterline at sea): morning left, evening right – the other side when a
      // prop / figure stands there
      const sh = u * 0.38;
      const pref = st.time === 'morning' ? 0.12 : 0.88;
      skyAdd('sky:sun:low', 'sun', [pref, 1 - pref, pref < 0.5 ? pref + 0.1 : pref - 0.1, pref < 0.5 ? 0.9 - pref : 1.1 - pref], sea ? waterline + sh * 0.42 : ground + u * 0.04, sh, { rays: true, low: true });
    } else if (sky && !wet) {
      const h = Math.min(u * 0.34, room * 0.36);
      skyAdd('sky:sun', 'sun', [0.88, 0.12, 0.75, 0.25, 0.62, 0.38], skyTop + h, h, { rays: true });
    }
    if (sky) {
      if (st.weather === 'rain' || st.weather === 'storm' || st.weather === 'snow') {
        const n = clamp(Math.round(ratio * 0.42), 2, 4);
        for (let k = 0; k < n; k++) {
          const h = Math.min(u * (0.26 + hash01(k * 3 + 9) * 0.08), room * 0.32);
          skyAdd(`sky:cloud:${k}`, 'cloud', near((k + 0.5) / n), skyTop + h + hash01(k * 19 + 1) * u * 0.05, h, { drift: DRIFT, variant: st.weather === 'storm' ? 'dark' : '' });
        }
      } else if (st.weather === 'clear' && st.time === 'day') {
        const h = Math.min(u * 0.2, room * 0.26);
        skyAdd('sky:cloud:fair', 'cloud', near(0.42), skyTop + h * 1.2, h, { drift: DRIFT, alpha: 0.85 });
      } else if (st.weather === 'wind') {
        const h = Math.min(u * 0.22, room * 0.28);
        skyAdd('sky:cloud:wind', 'cloud', near(0.3), skyTop + h * 1.18, h, { drift: DRIFT });
      }
    }
    // new scenery under a sun / moon / cloud stays below it (not below a low sun: that one rises behind the trees)
    for (const e of backEls) {
      if (keep.has(e.key)) continue;
      const hw = ew(e) / 2;
      let lim = Infinity;
      for (const b of skyBoxes) if (!b.low && b.l < e.x + hw && e.x - hw < b.r) lim = Math.min(lim, b.b);
      const maxH = e.y - lim - u * 0.02 - 6;
      if (maxH < e.h && maxH >= e.h * 0.55) e.h = maxH;
    }
    if (st.place === 'space' || st.time === 'night') {
      // stars only in the free sky: not behind the moon, the planet, scenery, props or figures
      const n = clamp(Math.round(ratio * 1.2), 4, 9);
      const boxes = [];
      for (const e of els) {
        if (e.proc || e.layer === LAYER.ground || e.layer === LAYER.weather) continue;
        const hw = ew(e) / 2 + (e.drift ? DRIFT : 0);
        boxes.push({ l: e.x - hw, r: e.x + hw, t: e.y - e.h - (e.action === 'fly' ? e.h * 0.15 : 0), b: e.y });
      }
      const freeSky = (x, y, h) => boxes.every((q) => !(q.l < x + h * 0.7 && x - h * 0.7 < q.r && q.t < y + h * 0.2 && y - h * 1.2 < q.b));
      const slot = W / n;
      const depth = st.place === 'space' ? Math.max(u * 0.32, H * 0.75 - skyTop) : Math.min(u * 0.32, room * 0.3);
      let placedN = 0;
      const star = (key, x, y, h) => {
        add(key, 'star', x, y, h, LAYER.sky, { fixed: true, alpha: 0.85 });
        boxes.push({ l: x - h * 1.3, r: x + h * 1.3, t: y - h * 1.8, b: y + h * 0.8 }); // stars keep some distance
        placedN++;
      };
      for (let k = 0; k < n; k++) {
        const x0 = ((k + 0.5) / n) * W + (hash01(k * 11 + 2) - 0.5) * slot * 0.6;
        const h = u * (0.06 + hash01(k * 13 + 7) * 0.05);
        const y0 = skyTop + h + hash01(k * 17 + 5) * depth;
        for (const [dx, y] of [[0, y0], [0, skyTop + h], [0.3, y0], [-0.3, y0], [0.3, skyTop + h], [-0.3, skyTop + h], [0.5, y0], [-0.5, y0]]) {
          const x = x0 + dx * slot;
          if (x > h && x < W - h && freeSky(x, y, h)) {
            star(`sky:star:${k}`, x, y, h);
            break;
          }
        }
      }
      // a crowded sky (tall trees, a castle, a dragon): a few more tries anywhere, so the night keeps some stars
      for (let j = 0; placedN < Math.min(n, 4) && j < 32; j++) {
        const h = u * (0.06 + hash01(j * 5 + 3) * 0.04);
        const x = h + hash01(j * 7 + 41) * (W - 2 * h);
        const y = skyTop + h + hash01(j * 3 + 17) * depth;
        if (freeSky(x, y, h)) star(`sky:star:x${j}`, x, y, h);
      }
    }
    // procedural weather strokes (in mixed the renderer's emoji parallax already shows the weather)
    if (style !== 'mixed') {
      if (st.weather === 'rain' || st.weather === 'storm') add('wx:rain', 'rain', W / 2, H, H, LAYER.weather, { proc: st.weather === 'storm' ? 'storm' : 'rain', fixed: true });
      else if (st.weather === 'snow') add('wx:snow', 'snowflake', W / 2, H, H, LAYER.weather, { proc: 'snow', fixed: true });
      else if (st.weather === 'wind') add('wx:wind', 'cloud', W / 2, H, H, LAYER.weather, { proc: 'wind', fixed: true });
      else if (st.weather === 'fog') add('wx:fog', 'cloud', W / 2, H, H, LAYER.weather, { proc: 'fog', fixed: true });
    } else if (st.weather === 'storm') add('wx:storm', 'lightning', W / 2, H, H, LAYER.weather, { proc: 'lightning', fixed: true });
    return out;
  }
  const hits = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const LAYER_ORDER = (e) => (e.layer === LAYER.ground ? 0 : e.layer === LAYER.back ? 1 : e.layer === LAYER.mid ? 2 : e.layer === LAYER.front ? 3 : e.layer === LAYER.sky ? 4 : 5);

  /** Diff of two key lists: `{ added, removed, kept }`. */
  function diff(prev, next) {
    const a = new Set(prev || []);
    const b = new Set(next || []);
    return { added: [...b].filter((k) => !a.has(k)), removed: [...a].filter((k) => !b.has(k)), kept: [...b].filter((k) => a.has(k)) };
  }

  // ------------------------------------------------------------------ raster helpers (browser only)
  function makeLayer(doc, w, h) {
    const c = doc.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    if (!g) return null;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return { c, g };
  }
  /** Pen width factor along a stroke: thin start, full middle, thin end, a slight pressure wobble. */
  function taper(st, s) {
    const L = st.len || 1e-6;
    const a = Math.min(1, s / (0.06 * L + 0.01));
    const b = Math.min(1, (L - s) / (0.1 * L + 0.012));
    return (0.45 + 0.55 * Math.max(0, a) * Math.max(0, b)) * (1 + 0.1 * Math.sin(s * 37 + st.phase));
  }
  function pointAt(st, i, s) {
    const c0 = st.cum[i];
    const c1 = st.cum[i + 1];
    const t = c1 > c0 ? (s - c0) / (c1 - c0) : 0;
    return [st.xs[i] + (st.xs[i + 1] - st.xs[i]) * t, st.ys[i] + (st.ys[i + 1] - st.ys[i]) * t];
  }
  /** Strokes arclength [a, b] of a prepared stroke onto g (S px per height unit, origin ox/oy), batching equal widths. */
  function strokeRange(g, st, a, b, S, ox, oy, base, extra) {
    const n = st.cum.length;
    if (n < 2 || !(b > a)) return;
    let i = 0;
    while (i < n - 2 && st.cum[i + 1] <= a) i++;
    let curW = -1;
    let open = false;
    for (; i < n - 1 && st.cum[i] < b; i++) {
      const s0 = Math.max(a, st.cum[i]);
      const s1 = Math.min(b, st.cum[i + 1]);
      if (!(s1 > s0)) continue;
      const w = Math.max(0.5, Math.round((base * st.w * taper(st, (s0 + s1) / 2) + extra) * 2) / 2);
      const p1 = pointAt(st, i, s1);
      if (w !== curW) {
        if (open) g.stroke();
        const p0 = pointAt(st, i, s0);
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(ox + p0[0] * S, oy + p0[1] * S);
        curW = w;
        open = true;
      }
      g.lineTo(ox + p1[0] * S, oy + p1[1] * S);
    }
    if (open) g.stroke();
  }
  function tracePoly(g, st, S, ox, oy) {
    g.beginPath();
    for (let i = 0; i < st.xs.length; i++) {
      const x = ox + st.xs[i] * S;
      const y = oy + st.ys[i] * S;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
  }

  /** Paints arclength [a, b] of a prepared stroke: halo into ug (wider), ink into ig; dots are filled circles. */
  function paintStroke(ug, ig, st, a, b, G) {
    if (st.dot) {
      const r = Math.max(st.dot * G.S, G.pen * 0.55);
      const x = G.pad + st.xs[0] * G.S;
      const y = G.pad + st.ys[0] * G.S;
      ug.beginPath();
      ug.arc(x, y, r + G.halo, 0, TAU);
      ug.fill();
      ig.beginPath();
      ig.arc(x, y, r, 0, TAU);
      ig.fill();
      return;
    }
    strokeRange(ug, st, a, b, G.S, G.pad, G.pad, G.pen, G.halo * 2);
    strokeRange(ig, st, a, b, G.S, G.pad, G.pad, G.pen, 0);
  }

  // ------------------------------------------------------------------ the sketch renderer
  const INSTANCES = typeof WeakMap === 'function' ? new WeakMap() : null;

  class Sketch {
    constructor(renderer, getCtx, opts) {
      this.renderer = renderer || null;
      this.getCtx = typeof getCtx === 'function' ? getCtx : null;
      this.opts = opts && typeof opts === 'object' ? opts : {};
      /**
       * mixed: draw the props as well? `'auto'` (default) draws them whenever the renderer shows no emoji props of its
       * own (no duplicate car: js/fx.js 2.3 still hands props to its emoji layer in mixed), true / false force it.
       */
      this.mixedProps = this.opts.mixedProps === true || this.opts.mixedProps === false ? this.opts.mixedProps : 'auto';
      this.style = 'emoji';
      this.els = [];
      this.state = null; // last normalised input state
      this.idle = false;
      this.detached = false;
      // frameMs / meanMs / avgMs / p95Ms / maxMs: JavaScript time of a drawn frame – the last one, the mean since
      // resetStats(), a running average of the recent frames, p95 of the last 120, the maximum. The browser
      // rasterises the canvas commands and uploads the canvas afterwards (not included; ≈ 2 ms per drawn frame at
      // 1920×238 in software rendering – test/e2e/31-sketch.js measures the whole main thread). fps: drawn frames
      // per second; cached: settled-element caches blitted in the last frame, rebuilds: caches repainted since
      // resetStats().
      this.stats = { style: 'emoji', elements: 0, drawing: 0, erasing: 0, animated: 0, sprites: 0, frames: 0, frameMs: 0, meanMs: 0, avgMs: 0, p95Ms: 0, maxMs: 0, fps: 0, cached: 0, rebuilds: 0, running: false, updates: 0, surface: null, ink: '#ffffff', version: VERSION };
      this._sumMs = 0;
      this._doc = typeof document !== 'undefined' ? document : null;
      this._raf = 0;
      this._frame = this._frame.bind(this);
      this._surf = null;
      this._size = null; // { w, h, dpr, W, H } of the surface the elements were laid out for
      this._wash = { cur: null, prev: null, t0: 0 };
      this._theme = null;
      this._mood = 'calm';
      this._colors = inkFor('neon', 'calm');
      this._lastDraw = 0;
      this._fpsAt = 0;
      this._fpsN = 0;
      this._watchUntil = 0; // keep looking at the surface size for a moment after a resize
      this._needDraw = false;
      this._idleTimer = null;
      this._own = null; // own canvas when the renderer hands out no surface
      this._segs = []; // settled-element caches: [{ L: layer, M: occlusion mask layer | null, sig }]
      this._epoch = 0; // bumped by everything that changes how a settled element looks (update, colours, resize)
      this._uidN = 0;
      this._rasterBudget = 1; // pose frames rasterised per frame (spreads a walk cycle over frames)
      this._t0 = now();
      this._lastInput = null;
      this._installHooks();
      const init = this.opts.style || (renderer && renderer.layout && renderer.layout.storyStyle) || (this._doc && this._doc.body && this._doc.body.dataset && this._doc.body.dataset.storyStyle);
      if (STYLES.includes(init)) this.setStyle(init);
    }

    // ---- public API
    /**
     * Style: `emoji` hides + stops the drawing (the renderer's emoji band as before), `sketch` draws everything
     * (scenery, weather, props, actors), `mixed` draws the scenery + weather while the renderer keeps its emoji
     * actors / props. Returns the style in use.
     */
    setStyle(style) {
      if (!STYLES.includes(style) || this.detached) return this.style;
      if (style === this.style) return style;
      const prev = this.style;
      this.style = style;
      this.stats.style = style;
      if (style === 'emoji') {
        this._dropAll();
        this._clearSurface();
        this._stop();
        return style;
      }
      if (prev === 'emoji') this._dropAll(); // fresh drawing (draws in again)
      if (this.state) this._applySoon();
      return style;
    }

    /**
     * Re-composes after a style change on a microtask: the renderer follows setStyle() with update() in the same
     * task (and only then knows which emoji sprites it shows), so that update wins and nothing draws twice.
     */
    _applySoon() {
      this._pending = true;
      const run = () => {
        if (!this._pending) return;
        this._pending = false;
        if (this.state && this.style !== 'emoji' && !this.idle && !this.detached) this._apply();
      };
      if (typeof queueMicrotask === 'function') queueMicrotask(run);
      else setTimeout(run, 0);
    }

    /** Story state from the renderer hook (`{...state, style?, idle?}`): diff -> draw in / erase / glide. */
    update(raw) {
      if (this.detached) return this.stats;
      this.stats.updates++;
      this._lastInput = raw;
      if (raw && typeof raw === 'object' && STYLES.includes(raw.style) && raw.style !== this.style) this.setStyle(raw.style);
      const idle = !!(raw && raw.idle);
      this.state = normState(raw);
      this._pending = false;
      if (idle) {
        this._goIdle();
        return this.stats;
      }
      if (this.idle) this._wake();
      if (this.style === 'emoji') return this.stats;
      this._apply();
      return this.stats;
    }

    /** Redraws everything from scratch (draw-in animation again). */
    redraw() {
      this._dropAll();
      if (this.state && this.style !== 'emoji') this._apply();
    }

    /** Records the drawing (default: this sketch's canvas) – see LiveFXSketch.record. */
    record(opts = {}) {
      const s = this._surface();
      return record(Object.assign({ canvas: s && s.canvas }, opts));
    }

    get canvas() {
      const s = this._surface();
      return s ? s.canvas : null;
    }

    /** Debug view of the elements on stage. */
    get elements() {
      return this.els.map((e) => ({ key: e.key, id: e.id, state: e.state, x: Math.round(e.x), y: Math.round(e.y), h: Math.round(e.h), layer: e.layer, action: e.action || null }));
    }

    resetStats() {
      Object.assign(this.stats, { frames: 0, frameMs: 0, meanMs: 0, avgMs: 0, p95Ms: 0, maxMs: 0, rebuilds: 0 });
      this._ring = null;
      this._sumMs = 0;
    }

    detach() {
      if (this.detached) return;
      this._stop();
      this._dropAll();
      this._clearSurface();
      this.detached = true;
      if (this._ro) this._ro.disconnect();
      if (this._mo) this._mo.disconnect();
      if (this._onVis && this._doc) this._doc.removeEventListener('visibilitychange', this._onVis);
      if (this.renderer && this._sceneHook && this.renderer.onScene === this._sceneHook) this.renderer.onScene = this._sceneHookPrev || null;
      if (this._own && this._own.parentNode) this._own.parentNode.removeChild(this._own);
      if (INSTANCES && this.renderer) INSTANCES.delete(this.renderer);
      if (this.renderer && this.renderer.sketch === this) this.renderer.sketch = null;
    }

    /** mixed: true when the sketch draws the props (the renderer's emoji layer shows none of the state's props). */
    _mixedProps() {
      if (this.mixedProps !== 'auto') return !!this.mixedProps;
      const st = this.state;
      if (!st || !st.props.length) return false;
      const P = this.renderer && this.renderer.particles;
      if (!P || !P.ok || !Array.isArray(P.props)) return true;
      return !P.props.some((p) => p && p.state !== 'out');
    }

    // ---- hooks into the page / renderer
    _installHooks() {
      const doc = this._doc;
      if (doc && typeof doc.addEventListener === 'function') {
        this._onVis = () => {
          if (doc.hidden) this._stop();
          else this._kick();
        };
        doc.addEventListener('visibilitychange', this._onVis);
      }
      // Scenes fired without a story (scene pad, story packs) still get a drawing: chain the renderer's onScene hook.
      const R = this.renderer;
      if (R && typeof R === 'object' && 'onScene' in R) {
        const prev = typeof R.onScene === 'function' ? R.onScene : null;
        this._sceneHookPrev = prev;
        this._sceneHook = (id) => {
          if (prev) {
            try {
              prev(id);
            } catch (_) {
              /* the other hook's problem */
            }
          }
          this._onScene(id);
        };
        R.onScene = this._sceneHook;
      }
    }

    _onScene(id) {
      if (this.style === 'emoji' || this.detached || this.idle) return;
      const st = this.renderer && this.renderer.storyState;
      // story() switches the scene itself and calls update() right after – only foreign scenes are handled here.
      if (st && st.scene === id) return;
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => {
          const cur = this.renderer && this.renderer.currentScene;
          const s2 = this.renderer && this.renderer.storyState;
          // the idle band clears its scene and hands the sketch `idle` in the same task – not a foreign scene
          if (this.style === 'emoji' || this.idle || this.detached || (this.renderer && this.renderer.storyIdle) || (s2 && s2.scene === cur && cur)) return;
          this.state = cur ? normState({ scene: cur }) : null;
          this._apply();
        });
      }
    }

    // ---- surface
    _surface() {
      let s = null;
      if (this.getCtx) {
        try {
          s = this.getCtx();
        } catch (_) {
          s = null;
        }
      }
      let canvas = null;
      let ctx = null;
      let w = 0;
      let h = 0;
      let dpr = 0;
      if (s && typeof s.getImageData === 'function') {
        ctx = s;
        canvas = s.canvas;
      } else if (s && s.ctx) {
        ctx = s.ctx;
        canvas = s.canvas || s.ctx.canvas;
        w = Number(s.width) || 0;
        h = Number(s.height) || 0;
        dpr = Number(s.dpr) || 0;
      }
      if (!ctx || !canvas) {
        const own = this._ownSurface();
        if (!own) return null;
        ({ canvas, ctx, w, h, dpr } = own);
      }
      dpr = dpr || clamp((global.devicePixelRatio || 1), 1, 2);
      if (!w || !h) {
        w = canvas.clientWidth || canvas.width / dpr;
        h = canvas.clientHeight || canvas.height / dpr;
      }
      const surf = { canvas, ctx, w, h, dpr, W: canvas.width, H: canvas.height };
      if (!this._surf || this._surf.canvas !== canvas) this._observe(canvas);
      this._surf = surf;
      this.stats.surface = this._own && canvas === this._own ? 'own' : 'renderer';
      return surf;
    }

    /** Fallback without a renderer surface: a `.fx-sketch` canvas inside the renderer's band (or the stage). */
    _ownSurface() {
      const doc = this._doc;
      if (!doc) return null;
      const R = this.renderer;
      let band = null;
      try {
        band = (R && typeof R._band === 'function' && R._band()) || (R && R.root && R.root.querySelector && R.root.querySelector(':scope > .fx-band')) || doc.querySelector('.fx-band');
      } catch (_) {
        band = null;
      }
      if (!band) return null;
      let c = this._own;
      if (!c) {
        c = doc.createElement('canvas');
        if (!c.getContext || !c.getContext('2d')) return null;
        c.className = 'fx-sketch';
        c.setAttribute('aria-hidden', 'true');
        this._own = c;
      }
      if (c.parentNode !== band) band.appendChild(c);
      const dpr = clamp(global.devicePixelRatio || 1, 1, 2);
      const w = Math.max(1, Math.round(band.clientWidth || 1));
      const h = Math.max(1, Math.round(band.clientHeight || 1));
      if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
      if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
      return { canvas: c, ctx: c.getContext('2d'), w, h, dpr };
    }

    /** Watches the canvas box (band resize / layout message / band moved) and the band's idle class. */
    _observe(canvas) {
      if (this._ro) this._ro.disconnect();
      if (this._mo) this._mo.disconnect();
      if (typeof ResizeObserver === 'function') {
        this._ro = new ResizeObserver(() => {
          this._watchUntil = now() + 700;
          this._kick();
        });
        this._ro.observe(canvas);
      }
      const band = canvas.parentNode;
      if (band && typeof MutationObserver === 'function') {
        this._mo = new MutationObserver(() => {
          if (!band.classList.contains('fx-band-idle')) this._kick();
        });
        this._mo.observe(band, { attributes: true, attributeFilter: ['class'] });
      }
    }

    _clearSurface() {
      const s = this._surf || this._surface();
      if (!s) return;
      s.ctx.setTransform(1, 0, 0, 1, 0, 0);
      s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
    }

    // ---- idle (band faded by the renderer's idle timer)
    _goIdle() {
      this.idle = true;
      this._stop();
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        if (!this.idle) return;
        this._dropAll();
        this._clearSurface();
      }, IDLE_CLEAR_MS);
    }

    _wake() {
      this.idle = false;
      clearTimeout(this._idleTimer);
    }

    // ---- composition / diff
    _apply(opts = {}) {
      const s = this._surface();
      if (!s || this.style === 'emoji') return;
      const resized = this._layoutFor(s);
      const instant = !!opts.instant || resized;
      const t = now();
      const live = this.els.filter((e) => e.state !== 'erase');
      const keep = new Set(live.map((e) => e.key));
      const pos = new Map(live.filter((e) => e.layer !== LAYER.ground && e.layer !== LAYER.weather).map((e) => [e.key, e.x]));
      const comp = compose(this.state, { w: s.w, h: s.h }, { style: this.style, keep, pos, mixedProps: this._mixedProps() });
      this._u = comp.u;
      this._ground = comp.ground;
      this._setWash(comp.wash, instant ? t - WASH_MS : t);
      this._mood = (this.state && this.state.mood) || 'calm';
      this._syncColors();
      const next = new Map(comp.els.map((e) => [e.key, e]));
      let ei = 0;
      for (const el of this.els) {
        if (el.state === 'erase' || next.has(el.key)) continue;
        el.state = 'erase';
        el.t0 = t + ERASE_STEP_MS * ei++;
      }
      const added = [];
      for (const d of comp.els) {
        const cur = this.els.find((e) => e.key === d.key && e.state !== 'erase');
        if (cur) this._retarget(cur, d, t);
        else added.push(d);
      }
      // weather fades in at once; drawn elements follow each other (ground, background, props, actors, sky)
      for (const d of added) if (d.proc) this.els.push(this._makeEl(d, t, instant));
      const drawn = added.filter((d) => !d.proc).sort((a, b) => LAYER_ORDER(a) - LAYER_ORDER(b) || a.x - b.x);
      const offs = stagger(drawn.length);
      drawn.forEach((d, i) => this.els.push(this._makeEl(d, instant ? t : t + offs[i] * 1000, instant)));
      this.els.sort((a, b) => a.layer - b.layer);
      this._epoch++; // alpha / order of settled elements may have changed -> caches repaint once
      this._needDraw = true;
      this._kick();
    }

    /** Remembers the surface size the layout is for; a new size drops the sprites (re-laid out instantly). */
    _layoutFor(s) {
      const sz = this._size;
      if (sz && sz.W === s.W && sz.H === s.H && sz.w === s.w && sz.h === s.h) return false;
      const changed = !!sz;
      this._size = { w: s.w, h: s.h, dpr: s.dpr, W: s.W, H: s.H };
      this._segs = [];
      this._epoch++;
      if (changed) {
        for (const el of this.els) this._freeEl(el);
        this.els = [];
      }
      return changed;
    }

    _makeEl(d, startAt, instant) {
      const lib = LIB[d.id];
      const el = Object.assign({}, d, { state: 'wait', t0: startAt, seed: hashStr(d.key), spr: null, frames: null, gx: null, walk: 0, instant: !!instant, complete: false, _uid: ++this._uidN, _m: 0 });
      if (d.proc) {
        el.dur = FADE_MS;
        return el;
      }
      if (d.id === 'emoji' || !lib) {
        el.id = 'emoji';
        el.dur = 450;
        el.aspect = 1;
        return el;
      }
      el.aspect = lib.wide ? d.aspect || lib.aspect : lib.aspect;
      el.path = pathFor(d.id, { seed: el.seed, aspect: lib.wide ? el.aspect : undefined, variant: d.variant });
      el.prep = prepare(el.path);
      el.aspect = el.path.aspect;
      const D = durationFor(el.path.length);
      el.sched = schedule(el.prep.lengths, D);
      el.dur = D * 1000;
      el.anim = lib.anim || null;
      return el;
    }

    _retarget(el, d, t) {
      el.action = d.action || null;
      el.alpha = d.alpha;
      el.range = d.range;
      if (el.fixed || d.fixed) return;
      if (Math.abs(d.x - el.x) > 1 || Math.abs(d.y - el.y) > 1) {
        el.gx = { x0: this._elX(el, t), y0: el.y, x1: d.x, y1: d.y, t0: t };
        el.x = d.x;
        el.y = d.y;
      }
    }

    _setWash(w, t) {
      const cur = this._wash.cur;
      if ((cur && w && cur.key === w.key) || (!cur && !w)) return;
      this._wash = { prev: cur, cur: w, t0: t };
    }

    _syncColors() {
      const doc = this._doc;
      const theme = (doc && doc.body && doc.body.dataset && doc.body.dataset.theme) || (this.renderer && this.renderer.theme) || 'neon';
      const c = inkFor(theme, this._mood);
      const old = this._colors;
      if (old && c.ink === old.ink && c.halo === old.halo && c.under === old.under) return;
      const haloChanged = !old || c.halo !== old.halo;
      this._theme = theme;
      this._colors = c;
      this.stats.ink = c.ink;
      this._epoch++;
      this._needDraw = true;
      for (const el of this.els) {
        if (!el.spr || el.spr.emoji) continue;
        if (haloChanged) {
          // the halo colour lives in the under layer -> rasterise again (rare: a theme switch)
          const done = el.complete;
          this._freeEl(el);
          if (done) this._rasterFull(el);
          else el.complete = false;
        } else this._recolor(el);
      }
    }

    _recolor(el) {
      const ink = this._colors.ink;
      const tint = (L) => {
        if (!L) return;
        L.g.save();
        L.g.globalCompositeOperation = 'source-in';
        L.g.fillStyle = ink;
        L.g.fillRect(0, 0, L.c.width, L.c.height);
        L.g.restore();
        L.g.strokeStyle = ink;
        L.g.fillStyle = ink;
      };
      tint(el.spr.ink);
      if (el.spr.rays) tint(el.spr.rays.ink);
      if (el.frames) for (const f of el.frames) if (f) tint(f.ink);
    }

    _dropAll() {
      for (const el of this.els) this._freeEl(el);
      this.els = [];
      this._segs = []; // the caches, rain drop and wave strips are band-sized canvases: free them with the drawing
      this._dropSpr = null;
      this._waveSpr = null;
      this._epoch++;
      this._wash = { cur: null, prev: null, t0: 0 };
      this._count();
    }

    _freeEl(el) {
      el.spr = null;
      el.frames = null;
      el.drawn = null;
      el.filled = null;
      el.complete = false;
    }

    // ---- sprites (per element: an `under` layer = halo + colour wash, an `ink` layer, the sun's rays apart)
    _geom(el) {
      const dpr = this._size ? this._size.dpr : 1;
      const refH = el.penRef || el.h;
      const pen = clamp(refH * 0.028, 1.4, 5.5) * dpr;
      const pad = Math.ceil(pen * 1.8 + el.h * dpr * 0.05 + 3);
      const S = el.h * dpr;
      const bw = el.h * (el.aspect || 1) * dpr;
      return { dpr, pen, halo: Math.max(1.2 * dpr, pen * 0.6), pad, S, bw, bh: S, sw: Math.ceil(bw + pad * 2), sh: Math.ceil(S + pad * 2) };
    }

    _layers(G) {
      const doc = this._doc;
      const under = makeLayer(doc, G.sw, G.sh);
      const ink = makeLayer(doc, G.sw, G.sh);
      if (!under || !ink) return null;
      under.g.strokeStyle = under.g.fillStyle = this._colors.halo;
      ink.g.strokeStyle = ink.g.fillStyle = this._colors.ink;
      return { under, ink };
    }

    _alloc(el) {
      const G = this._geom(el);
      const main = this._layers(G);
      if (!main) return null;
      const spr = { g: G, under: main.under, ink: main.ink, fill: null, fillAt: 0, rays: null };
      if (el.rays) spr.rays = this._layers(G);
      el.spr = spr;
      el.drawn = new Float32Array(el.prep.strokes.length);
      el.filled = new Uint8Array(el.prep.strokes.length);
      el.complete = false;
      this.stats.sprites++;
      return spr;
    }

    _target(el, st) {
      return st.part === 'rays' && el.spr.rays ? el.spr.rays : el.spr;
    }

    /** Colour wash of a closed stroke: into a fading fill layer while drawing, else straight under the halo. */
    _fill(el, st, animated) {
      const spr = el.spr;
      const G = spr.g;
      if (!st.fill || !st.closed || !FILL[st.fill]) return;
      const tgt = this._target(el, st);
      let g = tgt.under.g;
      let destOver = true;
      if (animated && tgt === spr) {
        if (!spr.fill) spr.fill = makeLayer(this._doc, G.sw, G.sh);
        if (spr.fill) {
          g = spr.fill.g;
          destOver = false;
          spr.fillAt = now();
        }
      }
      g.save();
      if (destOver) g.globalCompositeOperation = 'destination-over';
      g.fillStyle = FILL[st.fill];
      tracePoly(g, st, G.S, G.pad, G.pad);
      g.fill();
      g.restore();
    }

    /** Rasterises the whole element at once (no pen): resize, theme switch, instant elements. */
    _rasterFull(el) {
      if (el.id === 'emoji') return this._rasterEmoji(el);
      if (!el.prep || !this._alloc(el)) return null;
      const G = el.spr.g;
      el.prep.strokes.forEach((st, i) => {
        const tgt = this._target(el, st);
        paintStroke(tgt.under.g, tgt.ink.g, st, 0, st.len, G);
        el.drawn[i] = st.len;
        el.filled[i] = 1;
      });
      for (const st of el.prep.strokes) this._fill(el, st, false);
      el.complete = true;
      return el.spr;
    }

    _rasterEmoji(el) {
      const G = this._geom(el);
      const L = makeLayer(this._doc, G.sw, G.sh);
      if (!L) return null;
      L.g.font = `${Math.round(G.S * 0.86)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif`;
      L.g.textAlign = 'center';
      L.g.textBaseline = 'middle';
      L.g.shadowColor = 'rgba(0,0,0,0.45)';
      L.g.shadowBlur = 6 * G.dpr;
      L.g.fillText(el.emoji || '⭐', G.sw / 2, G.pad + G.S * 0.52);
      el.spr = { g: G, under: null, ink: L, fill: null, rays: null, emoji: true };
      el.complete = true;
      this.stats.sprites++;
      return el.spr;
    }

    /** Pose frame k of an animated element (walk / legs / flap / flicker), rasterised lazily once. */
    _poseFrame(el, k) {
      const n = POSE_FRAMES[el.anim] || 0;
      if (!n || !el.spr) return null;
      if (!el.frames) el.frames = new Array(n).fill(null);
      if (el.frames[k]) return el.frames[k];
      if (this._rasterBudget <= 0) {
        // this frame already rasterised a pose: stand in with the nearest pose that is ready (or the rest pose)
        for (let d = 1; d < n; d++) {
          const f = el.frames[(k + d) % n] || el.frames[(k - d + n) % n];
          if (f) return f;
        }
        return null;
      }
      this._rasterBudget--;
      const prep = prepare(pathFor(el.id, { seed: el.seed, phase: k / n, variant: el.variant }));
      const G = el.spr.g;
      const L = this._layers(G);
      if (!L) return null;
      for (const st of prep.strokes) paintStroke(L.under.g, L.ink.g, st, 0, st.len, G);
      for (const st of prep.strokes) {
        if (!st.fill || !st.closed || !FILL[st.fill]) continue;
        L.under.g.save();
        L.under.g.globalCompositeOperation = 'destination-over';
        L.under.g.fillStyle = FILL[st.fill];
        tracePoly(L.under.g, st, G.S, G.pad, G.pad);
        L.under.g.fill();
        L.under.g.restore();
      }
      el.frames[k] = L;
      return L;
    }

    /** Pen step: strokes the segments new since the last frame into the sprite; returns the pen tip (sprite px). */
    _penStep(el, lt) {
      const spr = el.spr;
      const G = spr.g;
      const prog = progress(el.sched, el.state === 'draw' ? lt : Infinity);
      let pen = null;
      let done = 0;
      for (let i = 0; i < prog.length; i++) {
        const p = prog[i];
        if (p <= 0) continue;
        const st = el.prep.strokes[i];
        const tgt = this._target(el, st);
        const target = st.dot ? 0 : easeInOut(p) * st.len;
        if (st.dot) {
          if (!el.filled[i]) paintStroke(tgt.under.g, tgt.ink.g, st, 0, 0, G);
        } else if (target > el.drawn[i]) {
          paintStroke(tgt.under.g, tgt.ink.g, st, el.drawn[i], target, G);
          el.drawn[i] = target;
        }
        if (p >= 1) {
          if (!el.filled[i]) {
            this._fill(el, st, true);
            el.filled[i] = 1;
          }
          done++;
        } else if (!st.dot) {
          const n = st.cum.length;
          let j = 0;
          while (j < n - 2 && st.cum[j + 1] < target) j++;
          const q = pointAt(st, j, target);
          pen = tgt === spr || el.state !== 'show' ? [G.pad + q[0] * G.S, G.pad + q[1] * G.S] : null;
        }
      }
      if (done === prog.length) el.complete = true;
      return pen;
    }

    // ---- frame loop
    _kick() {
      if (this._raf || this.detached || this.style === 'emoji' || this.idle) return;
      if (this._doc && this._doc.hidden) return;
      if (typeof requestAnimationFrame !== 'function') return;
      this._raf = requestAnimationFrame(this._frame);
      this.stats.running = true;
    }

    _stop() {
      if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.stats.running = false;
    }

    _frame() {
      this._raf = 0;
      if (this.detached || this.style === 'emoji' || this.idle) return this._stop();
      const s = this._surface();
      if (!s) return this._stop();
      const band = s.canvas.parentNode;
      if (band && band.classList && band.classList.contains('fx-band-idle')) return this._stop();
      const t = now();
      if (this._size && (this._size.W !== s.W || this._size.H !== s.H || this._size.w !== s.w || this._size.h !== s.h)) this._apply({ instant: true });
      this._syncColors();
      // What moves decides the cadence: the shortest frame interval any element asks for (_motion); an element
      // waiting for its staggered start (or a resize settling) keeps the loop alive without drawing.
      let iv = STILL;
      let alive = t < this._watchUntil; // a resize may still be settling (the surface is re-measured every 500 ms)
      for (const el of this.els) {
        const m = this._motion(el, t);
        el._m = m;
        if (m === WAITING) alive = true;
        else if (m < iv) iv = m;
      }
      if (this._wash.t0 && t - this._wash.t0 < WASH_MS) iv = 0;
      if (iv < STILL && this.renderer && this.renderer.perfActive === 'eco') iv = Math.max(33, iv * 1.5);
      const moving = iv < STILL;
      // rAF ticks every ~16.7 ms: the 4 ms tolerance makes 33 ms every 2nd tick (not every 3rd)
      const due = this._needDraw || (moving ? t - this._lastDraw >= iv - 4 : !alive);
      if (due) {
        this._needDraw = false;
        this._draw(s, t);
        this._lastDraw = t;
        const ms = now() - t;
        const st = this.stats;
        st.frames++;
        st.frameMs = Math.round(ms * 1000) / 1000;
        st.avgMs = st.frames === 1 ? st.frameMs : Math.round((st.avgMs * 0.9 + ms * 0.1) * 1000) / 1000;
        this._sumMs += ms;
        st.meanMs = Math.round((this._sumMs / st.frames) * 1000) / 1000;
        if (ms > st.maxMs) st.maxMs = st.frameMs;
        // p95 over the last 120 drawn frames (sprite rasterising on draw-in shows up here, not in avgMs)
        const ring = this._ring || (this._ring = { a: new Float32Array(120), n: 0 });
        ring.a[ring.n % 120] = ms;
        ring.n++;
        if (ring.n % 15 === 0 || ring.n < 15) {
          const k = Math.min(ring.n, 120);
          const arr = Array.prototype.slice.call(ring.a, 0, k).sort((x, y) => x - y);
          st.p95Ms = Math.round(arr[Math.min(k - 1, Math.floor(k * 0.95))] * 1000) / 1000;
        }
        this._fpsN++;
        if (!this._fpsAt) this._fpsAt = t;
        if (t - this._fpsAt >= 1000) {
          st.fps = Math.round((this._fpsN * 1000) / (t - this._fpsAt));
          this._fpsAt = t;
          this._fpsN = 0;
        }
      }
      if (this.els.some((e) => e.state === 'gone')) this.els = this.els.filter((e) => e.state !== 'gone');
      this._count();
      if (moving || alive) {
        this._raf = requestAnimationFrame(this._frame);
        this.stats.running = true;
      } else {
        this._stop();
        this._fpsAt = 0;
        this._fpsN = 0;
        if (!this.els.length && !this._wash.cur) this._clearSurface();
      }
    }

    _count() {
      let drawing = 0;
      let erasing = 0;
      let animated = 0;
      for (const e of this.els) {
        if (e.state === 'draw' || e.state === 'wait') drawing++;
        else if (e.state === 'erase') erasing++;
        if (e._moving) animated++;
      }
      Object.assign(this.stats, { elements: this.els.length, drawing, erasing, animated });
    }

    /**
     * Advances an element's state; returns how often it needs a new frame (ms): 0 = every frame (pen, erase, glide,
     * colour fading in), STEADY_MS (weather strokes, walking, dancing …), WAVES_MS (sea), SLOW_MS (sun rays, drifting
     * clouds, bobbing, flicker), STILL = never (painted into a cache), WAITING = before its start (nothing to draw).
     */
    _motion(el, t) {
      el._moving = false;
      if (el.state === 'wait') {
        if (t < el.t0) return WAITING;
        el.state = el.instant ? 'show' : 'draw';
        this._needDraw = true;
      }
      if (el.state === 'draw') {
        if (t - el.t0 < (el.dur || 0) || (!el.complete && !el.proc && el.id !== 'emoji' && el.spr)) return 0;
        el.state = 'show';
        this._needDraw = true;
      }
      if (el.state === 'erase') {
        if (t - el.t0 >= (el.proc ? FADE_MS : ERASE_MS)) {
          el.state = 'gone';
          this._freeEl(el);
          this._needDraw = true;
          return STILL;
        }
        return 0;
      }
      if (el.spr && el.spr.fill) return 0; // colour wash still fading in
      if (el.gx) {
        if (t - el.gx.t0 < GLIDE_MS) return 0;
        el.gx = null;
        this._needDraw = true;
      }
      if (el.proc === 'lightning') {
        // mixed storm: frames only while a bolt flashes (the loop stays awake for the next one)
        if (el.bolt && t <= el.bolt.t0 + 700) return STEADY_MS;
        if (el.bolt) {
          el.bolt = null;
          this._needDraw = true;
        }
        if (!el.nextBolt) el.nextBolt = t + 600;
        return t >= el.nextBolt ? STEADY_MS : WAITING;
      }
      if (el.proc) return el.proc === 'fog' ? SLOW_MS : el.proc === 'waves' ? WAVES_MS : STEADY_MS;
      el._moving = true;
      const a = el.layer === LAYER.front ? el.action : null;
      if (a === 'go' || a === 'run' || a === 'fly' || a === 'jump' || a === 'dance' || a === 'cry' || a === 'laugh' || a === 'swim') return STEADY_MS;
      if (el.anim === 'flicker' || el.rays || el.drift || el.float || el.id === 'ghost') return SLOW_MS;
      el._moving = false;
      return STILL;
    }

    _elX(el, t) {
      if (el.gx) return lerp(el.gx.x0, el.gx.x1, easeInOut((t - el.gx.t0) / GLIDE_MS));
      return el.x;
    }

    _draw(s, t) {
      const g = s.ctx;
      this._rasterBudget = 1;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, s.canvas.width, s.canvas.height);
      const pens = [];
      let cached = 0;
      for (const it of this._plan(s, t)) {
        if (it.run) cached += this._blitSeg(g, it, s, t) ? 1 : 0;
        else if (it === WASH_ITEM) this._drawWash(g, s, t);
        else if (it.proc) this._drawProc(g, it, s, t);
        else this._drawEl(g, it, s, t, pens, null);
      }
      this.stats.cached = cached;
      // at most three pens on screen (the newest strokes) – more looks like a swarm
      pens.sort((a, b) => a[2] - b[2]);
      for (const p of pens.slice(-PENS_MAX)) this._drawPen(g, p[0], p[1], s.dpr);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
      this._prefetchPose();
    }

    /**
     * This frame's draw order: the sky wash, then the elements by layer. Runs of settled items (still + shown) become
     * cached segments – a band-sized canvas painted once and blitted every frame (the largest CACHE_SEGS runs with
     * ≥ 2 items or the wash); moving items are drawn live between them, so the stacking order stays exact.
     */
    _plan(s, t) {
      const w = this._wash;
      const washStill = !(w.t0 && t - w.t0 < WASH_MS);
      const items = [];
      if (w.cur || (w.prev && !washStill)) items.push(WASH_ITEM); // (mixed: no wash once the old one faded out)
      for (const el of this.els) if (el.state !== 'gone' && el.state !== 'wait') items.push(el);
      const isStill = (it) => (it === WASH_ITEM ? washStill : it._m === STILL && it.state === 'show' && !it.proc);
      // A moving item (drifting cloud, sun, walker, pen) that never overlaps the whole run of settled items after it
      // may be drawn after that run – same picture, but the settled items around it join one cached run (fewer
      // blits, no occlusion mask). Only whole runs: a partial move would split a run.
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it === WASH_ITEM || it.proc || isStill(it)) continue;
        const bx = this._box(it, s);
        let j = i;
        while (j + 1 < items.length && items[j + 1] !== WASH_ITEM && isStill(items[j + 1]) && !hits(bx, this._box(items[j + 1], s))) j++;
        if (j > i && (j + 1 >= items.length || !isStill(items[j + 1]))) {
          items.splice(i, 1);
          items.splice(j, 0, it);
        }
      }
      const runs = [];
      let cur = null;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const still = isStill(it);
        if (!still) cur = null;
        else if (cur) cur.items.push(it);
        else runs.push((cur = { run: true, start: i, items: [it], slot: 0, under: i > 0 }));
      }
      const pick = runs
        .filter((r) => r.items.length >= 2 || r.items[0] === WASH_ITEM)
        .sort((a, b) => b.items.length - a.items.length)
        .slice(0, CACHE_SEGS)
        .sort((a, b) => a.start - b.start);
      if (!pick.length) return items;
      const out = [];
      let k = 0;
      for (let i = 0; i < items.length; ) {
        const r = pick[k];
        if (r && r.start === i) {
          r.slot = k++;
          out.push(r);
          i += r.items.length;
        } else out.push(items[i++]);
      }
      return out;
    }

    /**
     * Conservative box (CSS px: l, r, t, b) of everything an element may paint while it keeps its current motion:
     * its strokes + pen width and halo (not the padded sprite – neighbours may come close without "overlapping"),
     * walk range, bob / jump / sway, drift, glide path; turning rays get the circle around their strokes, a lying
     * figure its turned box.
     */
    _box(el, s) {
      const dpr = s.dpr || 1;
      const G = el.spr ? el.spr.g : this._geom(el);
      let x0 = el.x;
      let x1 = el.x;
      let y0 = el.y;
      let y1 = el.y;
      if (el.gx) {
        x0 = Math.min(el.gx.x0, el.gx.x1);
        x1 = Math.max(el.gx.x0, el.gx.x1);
        y0 = Math.min(el.gx.y0, el.gx.y1);
        y1 = Math.max(el.gx.y0, el.gx.y1);
      }
      const a = el.layer === LAYER.front ? el.action : null;
      let mx = 0;
      let my = 0;
      if (a === 'go' || a === 'run') mx += el.range || Math.min(s.w * 0.14, (this._u || el.h) * 0.6);
      if (a) {
        mx += el.h * 0.1;
        my += el.h * (a === 'jump' ? 0.4 : 0.12);
      }
      if (el.drift) mx += (typeof el.drift === 'number' ? el.drift : s.w * 0.025) + 1;
      if (el.float || el.id === 'ghost') my += el.h * 0.06;
      if (a === 'dance' || (el.id === 'emoji' && el.state === 'draw')) {
        mx += el.h * 0.2; // sways ±0.18 rad around the feet / pops in up to 1.12×
        my += el.h * 0.15;
      }
      const ext = extentOf(el);
      const m = (G.pen + G.halo) / dpr + 1;
      const h = el.h;
      const A = G.bw / dpr / h;
      if (el.rays) {
        // the rays turn around the box centre
        const r = Math.hypot(Math.max(A / 2 - ext.minX, ext.maxX - A / 2), Math.max(0.5 - ext.minY, ext.maxY - 0.5)) * h + m;
        return { l: x0 - r - mx, r: x1 + r + mx, t: y0 - h / 2 - r - my, b: y1 - h / 2 + r + my };
      }
      if (a === 'sleep') {
        // lying: a quarter turn around the box centre, which sits `lift` above the ground (as in _drawEl)
        const lift = (G.bw / 2 - ext.minX * G.S + G.pen * 0.5) / dpr;
        return { l: x0 + (ext.minY - 0.5) * h - m - mx, r: x1 + (ext.maxY - 0.5) * h + m + mx, t: y0 - lift - (ext.maxX - A / 2) * h - m - my, b: y1 - lift - (ext.minX - A / 2) * h + m + my };
      }
      return { l: x0 + (ext.minX - A / 2) * h - m - mx, r: x1 + (ext.maxX - A / 2) * h + m + mx, t: y0 - h + ext.minY * h - m - my, b: y1 - h + ext.maxY * h + m + my };
    }

    /** Blits a cached segment (repainted when its items changed): its occlusion mask first, then its pixels. */
    _blitSeg(g, run, s, t) {
      const W = s.canvas.width;
      const H = s.canvas.height;
      // something is drawn below this run -> its scenery / props / figures must punch their silhouette out of it
      const occl = run.under && run.items.some((it) => it !== WASH_ITEM && it.layer >= LAYER.back && it.layer <= LAYER.front);
      let sig = `${this._epoch}|${W}x${H}|${occl ? 1 : 0}`;
      for (const it of run.items) sig += it === WASH_ITEM ? `|w${this._wash.t0}` : `|${it._uid}:${it.alpha}:${it.x}:${it.y}`;
      let seg = this._segs[run.slot];
      // a repaint rasterises the whole run at once (in this frame): while a scene is still drawing in, its runs
      // change every few frames – then the run is drawn live and repainted at most every REBUILD_MS
      if (!seg || seg.sig !== sig) seg = seg && t - seg.at < REBUILD_MS ? null : this._buildSeg(run, sig, occl, s, t);
      if (!seg) {
        const pens = [];
        for (const it of run.items) {
          if (it === WASH_ITEM) this._drawWash(g, s, t);
          else this._drawEl(g, it, s, t, pens, null);
        }
        return false;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      if (seg.M) {
        g.globalCompositeOperation = 'destination-out';
        g.drawImage(seg.M.c, 0, 0);
      }
      g.globalCompositeOperation = 'source-over';
      g.drawImage(seg.L.c, 0, 0);
      return true;
    }

    _buildSeg(run, sig, occl, s, t) {
      const W = s.canvas.width;
      const H = s.canvas.height;
      let seg = this._segs[run.slot];
      if (!seg || seg.L.c.width !== W || seg.L.c.height !== H) {
        const L = makeLayer(this._doc, W, H);
        if (!L) return null;
        seg = { L, M: null, sig: '', at: 0 };
        this._segs[run.slot] = seg;
      }
      if (!occl) seg.M = null;
      else if (!seg.M || seg.M.c.width !== W || seg.M.c.height !== H) seg.M = makeLayer(this._doc, W, H);
      const prep = (c) => {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, W, H);
      };
      prep(seg.L.g);
      const mg = seg.M ? seg.M.g : null;
      if (mg) prep(mg);
      const pens = [];
      for (const it of run.items) {
        if (it === WASH_ITEM) this._drawWash(seg.L.g, s, t);
        else this._drawEl(seg.L.g, it, s, t, pens, mg);
      }
      seg.L.g.globalAlpha = 1;
      seg.L.g.globalCompositeOperation = 'source-over';
      seg.sig = sig;
      seg.at = t;
      this.stats.rebuilds++;
      return seg;
    }

    /** A left-over raster budget rasterises one missing pose of a moving figure / fire ahead of need. */
    _prefetchPose() {
      if (this._rasterBudget <= 0) return;
      for (const el of this.els) {
        if (!el.spr || el.state !== 'show' || !el.anim || !el._moving) continue;
        const a = el.layer === LAYER.front ? el.action : null;
        const uses = el.anim === 'flicker' || (el.anim === 'flap' && a === 'fly') || ((el.anim === 'walk' || el.anim === 'legs') && (a === 'go' || a === 'run'));
        if (!uses) continue;
        const n = POSE_FRAMES[el.anim] || 0;
        if (!el.frames) el.frames = new Array(n).fill(null);
        const k = el.frames.indexOf(null);
        if (k >= 0) {
          this._poseFrame(el, k);
          return;
        }
      }
    }

    _drawWash(g, s, t) {
      const w = this._wash;
      const k = w.t0 ? clamp((t - w.t0) / WASH_MS, 0, 1) : 1;
      const W = s.canvas.width;
      const H = s.canvas.height;
      const gy = Math.round((this._ground || s.h * 0.9) * s.dpr);
      const one = (c, a) => {
        if (!c || a <= 0.001) return;
        const sy = c.ground ? gy : H; // no ground (space): the sky reaches the band bottom
        const grad = g.createLinearGradient(0, 0, 0, sy);
        grad.addColorStop(0, rgba(c.top, a));
        grad.addColorStop(1, rgba(c.bottom, a));
        g.globalAlpha = 1;
        g.fillStyle = grad;
        g.fillRect(0, 0, W, sy);
        if (c.ground) {
          g.fillStyle = rgba(c.ground, a);
          g.fillRect(0, gy, W, H - gy);
        }
      };
      if (k < 1) one(w.prev, 1 - k);
      one(w.cur, k);
    }

    /** Pose of a shown element by its action: offset, rotation, mirror, pose frame. */
    _pose(el, s, t, x, y) {
      const sec = (t - this._t0) / 1000;
      const ph = (el.seed % 628) / 100;
      const n = POSE_FRAMES[el.anim] || 0;
      const a = el.layer === LAYER.front ? el.action : null;
      const p = { x, y, rot: 0, flip: 1, frame: null, lying: false };
      if (a === 'go' || a === 'run') {
        const range = el.range || Math.min(s.w * 0.14, (this._u || el.h) * 0.6);
        const om = a === 'run' ? 1.1 : 0.45;
        const nx = x + range * Math.sin(sec * om + ph);
        if (el._px !== undefined) el.walk += Math.abs(nx - el._px);
        el._px = nx;
        p.x = nx;
        p.flip = Math.cos(sec * om + ph) < 0 ? -1 : 1;
        if (n && (el.anim === 'walk' || el.anim === 'legs')) p.frame = this._poseFrame(el, Math.floor((el.walk / (el.h * 0.45)) * n) % n);
        else p.y -= Math.abs(Math.sin(sec * 6 + ph)) * el.h * 0.06;
      } else if (a === 'fly') {
        p.y += Math.sin(sec * 2 + ph) * el.h * 0.08;
        if (n && el.anim === 'flap') p.frame = this._poseFrame(el, Math.floor(sec * 6) % n);
      } else if (a === 'jump') p.y -= Math.abs(Math.sin(sec * 3.2 + ph)) * el.h * 0.35;
      else if (a === 'dance') {
        p.rot = Math.sin(sec * 4 + ph) * 0.18;
        p.y -= Math.abs(Math.sin(sec * 4 + ph)) * el.h * 0.06;
      } else if (a === 'swim') p.y += Math.sin(sec * 2.4 + ph) * el.h * 0.05;
      else if (a === 'cry' || a === 'laugh') p.x += Math.sin(sec * 30) * el.h * 0.02;
      else if (a === 'sleep') {
        p.rot = -Math.PI / 2;
        p.lying = true;
      }
      if (el.anim === 'flicker') p.frame = this._poseFrame(el, Math.floor(sec * 8) % POSE_FRAMES.flicker);
      if (el.drift) p.x += Math.sin(sec * 0.15 + ph) * (typeof el.drift === 'number' ? el.drift : s.w * 0.025);
      if (el.float || el.id === 'ghost') p.y += Math.sin(sec * 1.5 + ph) * el.h * 0.05;
      return p;
    }

    /** Draws one element onto g (`mg`: occlusion mask of a cached segment – receives the silhouette as well). */
    _drawEl(g, el, s, t, pens, mg) {
      const lt = (t - el.t0) / 1000;
      let spr = el.spr;
      if (!spr) {
        if (el.id === 'emoji') spr = this._rasterEmoji(el);
        else if (el.state === 'draw') spr = this._alloc(el);
        else spr = this._rasterFull(el);
        if (!spr) return;
      }
      const G = spr.g;
      const pen = !spr.emoji && !el.complete ? this._penStep(el, lt) : null;
      // the colour wash fades in, then merges under the halo (one blit less per frame)
      if (spr.fill && el.complete && now() - spr.fillAt > FILL_FADE_MS) {
        spr.under.g.save();
        spr.under.g.globalCompositeOperation = 'destination-over';
        spr.under.g.drawImage(spr.fill.c, 0, 0);
        spr.under.g.restore();
        spr.fill = null;
      }
      let x = this._elX(el, t);
      let y = el.gx ? lerp(el.gx.y0, el.gx.y1, easeInOut((t - el.gx.t0) / GLIDE_MS)) : el.y;
      let alpha = el.alpha === undefined ? 1 : el.alpha;
      let rot = 0;
      let flip = 1;
      let scale = 1;
      let frame = null;
      let lying = false;
      if (el.state === 'show' || el.state === 'erase') {
        const p = this._pose(el, s, t, x, y);
        ({ x, y, rot, flip, frame, lying } = p);
      }
      let crop = 0;
      if (el.state === 'erase') {
        crop = clamp((t - el.t0) / ERASE_MS, 0, 1);
        alpha *= 1 - crop * 0.35;
      }
      if (el.id === 'emoji' && el.state === 'draw') {
        const k = clamp(lt / 0.45, 0, 1);
        scale = 0.3 + 0.7 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.12;
        alpha *= k;
      }
      const dpr = s.dpr;
      const left = x * dpr - G.bw / 2 - G.pad;
      const top = y * dpr - G.bh - G.pad;
      const transformed = rot !== 0 || flip < 0 || scale !== 1;
      // a sleeping figure lies on its lowest stroke (after the quarter turn: the leftmost point of the drawing)
      const lift = lying ? (G.bw / 2 - extentOf(el).minX * G.S) + G.pen * 0.5 : 0;
      const place = (c) => {
        if (transformed) {
          // pivot at the feet (bottom centre); a lying figure turns around its box centre
          c.setTransform(1, 0, 0, 1, 0, 0);
          if (lying) {
            c.translate(x * dpr, y * dpr - lift);
            c.rotate(rot);
            c.scale(flip, 1);
            c.translate(-G.sw / 2, -(G.pad + G.bh / 2));
          } else {
            c.translate(x * dpr, y * dpr);
            c.rotate(rot);
            c.scale(flip * scale, scale);
            c.translate(-G.sw / 2, -(G.sh - G.pad));
          }
        } else c.setTransform(1, 0, 0, 1, left, top);
      };
      place(g);
      const blit = (L, a, c = g) => {
        if (!L || a <= 0.003) return;
        c.globalAlpha = clamp(a, 0, 1);
        if (crop > 0) {
          const sx = Math.floor(crop * L.c.width);
          if (sx < L.c.width) c.drawImage(L.c, sx, 0, L.c.width - sx, L.c.height, sx, 0, L.c.width - sx, L.c.height);
        } else c.drawImage(L.c, 0, 0);
      };
      const A = this._colors.under;
      // occlusion: scenery, props and figures punch their silhouette (colour wash + halo) out of what lies behind,
      // so a tree trunk never shows through the car – one extra blit per element (a cached segment keeps the
      // silhouettes in its mask and punches them out of what is drawn below it)
      if (el.layer >= LAYER.back && el.layer <= LAYER.front) {
        const sil = (c) => {
          if (frame) blit(frame.under, alpha, c);
          else {
            if (spr.fill) blit(spr.fill, alpha * clamp((now() - spr.fillAt) / FILL_FADE_MS, 0, 1), c);
            blit(spr.under, alpha, c);
          }
        };
        g.globalCompositeOperation = 'destination-out';
        sil(g);
        g.globalCompositeOperation = 'source-over';
        if (mg) {
          place(mg);
          sil(mg);
          mg.globalAlpha = 1;
          mg.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      if (frame) {
        blit(frame.under, alpha * A);
        blit(frame.ink, alpha);
      } else {
        if (spr.fill) blit(spr.fill, alpha * A * clamp((now() - spr.fillAt) / FILL_FADE_MS, 0, 1));
        blit(spr.under, alpha * A);
        blit(spr.ink, alpha);
      }
      if (spr.rays) {
        const ang = el.state === 'show' ? ((t - this._t0) / 1000) * 0.12 : 0;
        const cx = G.pad + G.bw / 2;
        const cy = G.pad + G.bh / 2;
        g.translate(cx, cy);
        g.rotate(ang);
        g.translate(-cx, -cy);
        blit(spr.rays.under, alpha * A);
        blit(spr.rays.ink, alpha);
      }
      if (crop > 0 && crop < 1) {
        // eraser smear at the wipe front
        const sx = crop * G.sw;
        g.globalAlpha = 0.22 * (1 - crop);
        g.strokeStyle = this._colors.ink;
        g.lineWidth = Math.max(4, G.sw * 0.05);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(sx, G.pad);
        g.lineTo(sx - G.sw * 0.04, G.sh - G.pad);
        g.stroke();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (pen && !transformed) pens.push([left + pen[0], top + pen[1], el.t0]);
    }

    _drawPen(g, x, y, dpr) {
      const L = clamp((this._u || 200) * 0.09, 12, 30) * dpr;
      const ang = -1.0;
      const ex = x + Math.cos(ang) * L;
      const ey = y + Math.sin(ang) * L;
      g.globalAlpha = 0.55;
      g.strokeStyle = this._colors.halo;
      g.lineCap = 'round';
      g.lineWidth = 7 * dpr;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(ex, ey);
      g.stroke();
      g.globalAlpha = 1;
      g.strokeStyle = this._colors.ink;
      g.lineWidth = 3.6 * dpr;
      g.beginPath();
      g.moveTo(x + Math.cos(ang) * 3 * dpr, y + Math.sin(ang) * 3 * dpr);
      g.lineTo(ex, ey);
      g.stroke();
      g.fillStyle = this._colors.ink;
      g.beginPath();
      g.arc(x, y, 2.4 * dpr, 0, TAU);
      g.fill();
    }

    /** Procedural weather: rain / storm (+ lightning), snow, wind, fog, sea waves – a few paths per frame. */
    _drawProc(g, el, s, t) {
      const dpr = s.dpr;
      const W = s.canvas.width;
      const Hc = s.canvas.height;
      const sec = (t - this._t0) / 1000;
      let a = 1;
      if (el.state === 'draw') a = clamp((t - el.t0) / FADE_MS, 0, 1);
      else if (el.state === 'erase') a = 1 - clamp((t - el.t0) / FADE_MS, 0, 1);
      if (a <= 0.003) return;
      const u = (this._u || s.h) * dpr;
      const gy = (this._ground || s.h * 0.9) * dpr;
      const ink = this._colors.ink;
      const halo = this._colors.halo;
      const eco = this.renderer && this.renderer.perfActive === 'eco';
      const twoPass = (lw, alphaInk, alphaHalo) => {
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.globalAlpha = a * alphaHalo;
        g.strokeStyle = halo;
        g.lineWidth = lw + 2.6 * dpr;
        g.stroke();
        g.globalAlpha = a * alphaInk;
        g.strokeStyle = ink;
        g.lineWidth = lw;
        g.stroke();
      };
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (el.proc === 'rain' || el.proc === 'storm') {
        const heavy = el.proc === 'storm';
        const top = Math.max(0, gy - u * 1.05);
        const fall = gy - top;
        const n = Math.round(clamp((W / u) * (heavy ? 16 : 11), 14, heavy ? 110 : 80) * (eco ? 0.5 : 1));
        const len = u * (heavy ? 0.1 : 0.08);
        // every drop is one blit of a pre-drawn stroke (halo + ink): far cheaper to rasterise than 2 × n strokes
        const D = this._drop(len, Math.max(1.2, u * 0.012), dpr);
        g.globalAlpha = a;
        for (let i = 0; i < n; i++) {
          const r1 = hash01(i * 7 + 1);
          const r2 = hash01(i * 13 + 5);
          const v = (heavy ? 1.9 : 1.35) + r2 * 0.7;
          const y = top + (((sec * v * (u / fall) * 1.6 + r1) % 1) * fall);
          const x = ((r2 * 1.37 + i / n + sec * 0.02) % 1) * W;
          const l = Math.min(len, gy - y);
          if (l <= 1) continue;
          if (!D) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x - l * 0.28, y + l);
            twoPass(Math.max(1.2, u * 0.012), 0.85, 0.32);
            continue;
          }
          const dx = Math.round(x - D.ox);
          const dy = Math.round(y - D.oy);
          if (l >= len) g.drawImage(D.c, dx, dy);
          else {
            const h = Math.min(D.c.height, Math.ceil(D.oy + l + 1)); // the drop reaches the ground: its upper part
            g.drawImage(D.c, 0, 0, D.c.width, h, dx, dy, D.c.width, h);
          }
        }
        g.globalAlpha = 1;
        if (heavy && !eco) this._lightning(g, el, s, t, a);
      } else if (el.proc === 'lightning') this._lightning(g, el, s, t, a);
      else if (el.proc === 'snow') {
        const top = Math.max(0, gy - u * 1.05);
        const fall = gy - top;
        const n = Math.round(clamp((W / u) * 9, 12, 60) * (eco ? 0.5 : 1));
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const r1 = hash01(i * 5 + 3);
          const r2 = hash01(i * 11 + 9);
          const r3 = hash01(i * 17 + 1);
          const y = top + (((sec * (0.18 + r2 * 0.14) * (u / fall) + r1) % 1) * fall);
          const x = ((r2 * 1.9 + i / n) % 1) * W + Math.sin(sec * 0.8 + i) * u * 0.05;
          const r = u * (0.012 + r3 * 0.012);
          const rot = sec * 0.6 + i;
          for (let k = 0; k < 3; k++) {
            const an = rot + (k * Math.PI) / 3;
            g.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r);
            g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
          }
        }
        twoPass(Math.max(1, u * 0.008), 0.95, 0.3);
      } else if (el.proc === 'wind') {
        for (let i = 0; i < 4; i++) {
          const k = (sec / 2.8 + i / 4) % 1;
          const x0 = (-0.3 + k * 1.5) * W;
          const y0 = gy - u * (0.75 - i * 0.16);
          const L = W * 0.22;
          g.beginPath();
          g.moveTo(x0, y0);
          for (let j = 1; j <= 24; j++) {
            const f = j / 24;
            g.lineTo(x0 + f * L, y0 + Math.sin(f * TAU + i) * u * 0.03);
          }
          g.arc(x0 + L, y0 - u * 0.04, u * 0.04, Math.PI / 2, Math.PI * 2.2, true);
          const fade = Math.sin(Math.PI * k);
          const aa = a;
          a = aa * fade;
          twoPass(Math.max(1.2, u * 0.012), 0.8, 0.25);
          a = aa;
        }
      } else if (el.proc === 'fog') {
        for (let i = 0; i < 4; i++) {
          const y = gy - u * (0.12 + i * 0.16);
          const off = Math.sin(sec * 0.12 + i * 1.7) * W * 0.08;
          g.beginPath();
          g.moveTo(-W * 0.1 + off + i * W * 0.05, y);
          g.lineTo(W * 1.1 + off - i * W * 0.07, y + u * 0.01);
          g.globalAlpha = a * 0.16;
          g.strokeStyle = ink;
          g.lineWidth = u * 0.07;
          g.lineCap = 'round';
          g.stroke();
        }
      } else if (el.proc === 'waves') {
        const wl = (s.h * 0.72) * dpr;
        const amp = u * 0.035;
        const lam = u * 0.5;
        const reveal = el.state === 'draw' ? a : 1;
        const xmax = W * reveal;
        // the waves only scroll sideways: each row (and the water below the first one) is drawn once into a strip
        // one wave length wider than the band and blitted at its phase offset – 4 blits instead of paths
        const WV = this._waves(W, Hc, wl, amp, lam, u, dpr);
        if (WV) {
          const xw = Math.max(1, Math.ceil(xmax));
          for (const row of WV.rows) {
            const off = (((((sec * row.k + row.ph) * lam) / TAU) % lam) + lam) % lam;
            g.globalAlpha = row.fill ? 0.24 * (el.state === 'erase' ? a : 1) : a;
            g.drawImage(row.c, off, 0, xw, row.c.height, 0, row.y, xw, row.c.height);
          }
          g.globalAlpha = 1;
          return;
        }
        const dx = Math.max(6 * dpr, lam / 14); // ~14 points per wave length are smooth enough
        // water wash below the first wave
        g.beginPath();
        g.moveTo(0, Hc);
        for (let x = 0; x <= xmax; x += dx) g.lineTo(x, wl + amp * Math.sin((x / lam) * TAU + sec * 1.2));
        g.lineTo(xmax, Hc);
        g.closePath();
        g.globalAlpha = 0.24 * (el.state === 'erase' ? a : 1);
        g.fillStyle = FILL.water;
        g.fill();
        for (let r = 0; r < 3; r++) {
          const y0 = wl + r * (Hc - wl) * 0.34;
          g.beginPath();
          for (let x = 0; x <= xmax + dx; x += dx) {
            const y = y0 + amp * (1 - r * 0.25) * Math.sin((x / lam) * TAU + sec * (1.2 + r * 0.35) + r * 1.7);
            if (x) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          twoPass(Math.max(1.4, u * 0.016) * (1 - r * 0.2), 0.95, 0.35);
        }
      }
      g.globalAlpha = 1;
    }

    /** Wave strips for the sea (water wash + 3 wave rows, each one wave length wider than the band), cached. */
    _waves(W, Hc, wl, amp, lam, u, dpr) {
      const ink = this._colors.ink;
      const halo = this._colors.halo;
      const key = `${W}|${Hc}|${Math.round(wl)}|${Math.round(u)}|${dpr}|${ink}|${halo}`;
      if (this._waveSpr && this._waveSpr.key === key) return this._waveSpr;
      if (!this._doc) return null;
      const sw = Math.ceil(W + lam) + 2;
      const dx = Math.max(4 * dpr, lam / 24);
      const rows = [];
      // water wash (follows the first row)
      const fill = makeLayer(this._doc, sw, Math.max(1, Hc - wl + amp + 2));
      if (!fill) return null;
      fill.g.beginPath();
      fill.g.moveTo(0, fill.c.height);
      for (let x = 0; x <= sw + dx; x += dx) fill.g.lineTo(x, amp + amp * Math.sin((x / lam) * TAU));
      fill.g.lineTo(sw, fill.c.height);
      fill.g.closePath();
      fill.g.fillStyle = FILL.water;
      fill.g.fill();
      rows.push({ c: fill.c, y: Math.round(wl - amp), k: 1.2, ph: 0, fill: true });
      for (let r = 0; r < 3; r++) {
        const ar = amp * (1 - r * 0.25);
        const lw = Math.max(1.4, u * 0.016) * (1 - r * 0.2);
        const pad = Math.ceil((lw + 2.6 * dpr) / 2 + 2);
        const L = makeLayer(this._doc, sw, ar * 2 + pad * 2);
        if (!L) return null;
        L.g.beginPath();
        for (let x = 0; x <= sw + dx; x += dx) {
          const y = pad + ar + ar * Math.sin((x / lam) * TAU);
          if (x) L.g.lineTo(x, y);
          else L.g.moveTo(x, y);
        }
        L.g.globalAlpha = 0.35;
        L.g.strokeStyle = halo;
        L.g.lineWidth = lw + 2.6 * dpr;
        L.g.stroke();
        L.g.globalAlpha = 0.95;
        L.g.strokeStyle = ink;
        L.g.lineWidth = lw;
        L.g.stroke();
        rows.push({ c: L.c, y: Math.round(wl + r * (Hc - wl) * 0.34 - ar - pad), k: 1.2 + r * 0.35, ph: r * 1.7, fill: false });
      }
      this._waveSpr = { key, rows };
      return this._waveSpr;
    }

    /** Rain drop sprite (a slanted stroke of length len with halo, drawn once per size / colour). */
    _drop(len, lw, dpr) {
      const ink = this._colors.ink;
      const halo = this._colors.halo;
      const key = `${Math.round(len * 2)}|${lw}|${dpr}|${ink}|${halo}`;
      if (this._dropSpr && this._dropSpr.key === key) return this._dropSpr;
      const hw = lw + 2.6 * dpr;
      const pad = Math.ceil(hw / 2 + 1);
      const L = this._doc && makeLayer(this._doc, len * 0.28 + pad * 2, len + pad * 2);
      if (!L) return null;
      const x0 = pad + len * 0.28;
      const y0 = pad;
      const line = (w, color, alpha) => {
        L.g.globalAlpha = alpha;
        L.g.strokeStyle = color;
        L.g.lineWidth = w;
        L.g.beginPath();
        L.g.moveTo(x0, y0);
        L.g.lineTo(x0 - len * 0.28, y0 + len);
        L.g.stroke();
      };
      line(hw, halo, 0.32);
      line(lw, ink, 0.85);
      this._dropSpr = { key, c: L.c, ox: x0, oy: y0 };
      return this._dropSpr;
    }

    _lightning(g, el, s, t, a) {
      const dpr = s.dpr;
      const u = (this._u || s.h) * dpr;
      const gy = (this._ground || s.h * 0.9) * dpr;
      if (!el.bolt || t > el.bolt.t0 + 700) {
        if (!el.nextBolt) el.nextBolt = t + 600;
        if (t >= el.nextBolt) {
          const r = mulberry32((el.seed + Math.floor(t)) >>> 0);
          const x = (0.15 + r() * 0.7) * s.canvas.width;
          const pts = [[x, Math.max(0, gy - u * 1.0)]];
          const steps = 6;
          for (let i = 1; i <= steps; i++) pts.push([x + (r() - 0.5) * u * 0.25, pts[0][1] + ((gy - u * 0.15 - pts[0][1]) * i) / steps]);
          el.bolt = { t0: t, pts };
          el.nextBolt = t + 2200 + r() * 2600;
        }
      }
      const b = el.bolt;
      if (!b) return;
      const k = (t - b.t0) / 1000;
      if (k > 0.7) return;
      const grow = clamp(k / 0.12, 0, 1);
      const fade = k < 0.26 ? 1 : 1 - (k - 0.26) / 0.44;
      if (k < 0.3) {
        g.globalAlpha = a * 0.2 * (1 - k / 0.3);
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, s.canvas.width, s.canvas.height);
      }
      const n = Math.max(2, Math.ceil(grow * b.pts.length));
      g.beginPath();
      g.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let i = 1; i < n; i++) g.lineTo(b.pts[i][0], b.pts[i][1]);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.globalAlpha = a * 0.45 * fade;
      g.strokeStyle = this._colors.halo;
      g.lineWidth = u * 0.03 + 3 * dpr;
      g.stroke();
      g.globalAlpha = a * fade;
      g.strokeStyle = FILL.bolt;
      g.lineWidth = u * 0.022;
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = u * 0.008;
      g.stroke();
    }
  }

  // ------------------------------------------------------------------ recording helper
  function pickMime(requested, hasAudio) {
    if (typeof MediaRecorder === 'undefined') return '';
    const list = [requested, hasAudio ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9', hasAudio ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8', 'video/webm'].filter(Boolean);
    for (const m of list) {
      try {
        if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(m)) return m;
      } catch (_) {
        /* next */
      }
    }
    return '';
  }
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  /**
   * Records a canvas (default: the sketch canvas) as WebM with MediaRecorder for `ms` milliseconds (100 ms .. 30 min,
   * default 10 s), optionally with the audio tracks of `audio` (a MediaStream, e.g. the microphone). `background`
   * (CSS colour) composites the transparent drawing onto a solid colour first (players without alpha). `download`
   * (default true) saves `filename` (livefx-sketch-<date>.webm). Resolves { blob, url, mimeType, bytes, ms, filename };
   * the returned promise has `.stop()` to end early. Rejects without canvas.captureStream / MediaRecorder.
   * No panel button / bus message drives it yet: call it from the browser console of overlay.html in a normal tab
   * (not inside an OBS browser source – no console there, and the download goes nowhere). docs/SKETCH.md
   */
  function record(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const canvas = o.canvas;
    if (!canvas || typeof canvas.captureStream !== 'function') return Promise.reject(new Error('LiveFXSketch.record: a canvas with captureStream() is required'));
    if (typeof MediaRecorder === 'undefined') return Promise.reject(new Error('LiveFXSketch.record: MediaRecorder is not available'));
    const ms = clamp(Number(o.ms) || 10000, 100, 30 * 60 * 1000);
    const fps = clamp(Number(o.fps) || 30, 1, 60);
    let src = canvas;
    let comp = 0;
    if (typeof o.background === 'string' && o.background && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = canvas.height;
      const g = c.getContext('2d');
      const paint = () => {
        g.globalCompositeOperation = 'copy';
        g.fillStyle = o.background;
        g.fillRect(0, 0, c.width, c.height);
        g.globalCompositeOperation = 'source-over';
        g.drawImage(canvas, 0, 0);
        comp = requestAnimationFrame(paint);
      };
      paint();
      src = c;
    }
    const stream = src.captureStream(fps);
    const audio = o.audio && typeof o.audio.getAudioTracks === 'function' ? o.audio.getAudioTracks() : [];
    for (const tr of audio) stream.addTrack(tr);
    const mimeType = pickMime(o.mimeType, audio.length > 0);
    let rec;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: Number(o.bitrate) || 6000000 } : undefined);
    } catch (e) {
      cancelAnimationFrame(comp);
      return Promise.reject(e);
    }
    const chunks = [];
    const started = Date.now();
    const filename = typeof o.filename === 'string' && o.filename ? o.filename : `livefx-sketch-${stamp()}.webm`;
    let timer = null;
    const p = new Promise((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      rec.onerror = (e) => reject((e && e.error) || new Error('LiveFXSketch.record failed'));
      rec.onstop = () => {
        clearTimeout(timer);
        if (comp) cancelAnimationFrame(comp);
        for (const tr of stream.getVideoTracks()) tr.stop(); // the caller's audio tracks stay alive
        const blob = new Blob(chunks, { type: (rec.mimeType || mimeType || 'video/webm').split(';')[0] === 'video/webm' ? rec.mimeType || mimeType || 'video/webm' : 'video/webm' });
        const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
        if (o.download !== false && url && typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        resolve({ blob, url, mimeType: blob.type, bytes: blob.size, ms: Date.now() - started, filename });
      };
      rec.start(250);
      timer = setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop();
      }, ms);
    });
    p.stop = () => {
      if (rec.state !== 'inactive') rec.stop();
      return p;
    };
    p.recorder = rec;
    return p;
  }

  // ------------------------------------------------------------------ attach
  /**
   * Attaches the sketch renderer to a LiveFX renderer (once per renderer – a second call returns the same object).
   * `getCtx()` returns the band surface `{canvas, ctx, width, height, dpr, …}` (js/fx.js `renderer.sketchSurface()`),
   * a bare 2D context, or nothing – then a `.fx-sketch` canvas is created inside the renderer's `.fx-band`.
   */
  function attach(renderer, getCtx, opts) {
    if (!renderer || typeof renderer !== 'object') throw new TypeError('LiveFXSketch.attach: renderer required');
    let sk = INSTANCES ? INSTANCES.get(renderer) : renderer.__livefxSketch;
    if (sk && !sk.detached) {
      if (typeof getCtx === 'function') sk.getCtx = getCtx;
      return sk;
    }
    sk = new Sketch(renderer, getCtx, opts);
    if (INSTANCES) INSTANCES.set(renderer, sk);
    else renderer.__livefxSketch = sk;
    return sk;
  }

  return {
    VERSION,
    STYLES,
    LIBRARY,
    ROLE_ID,
    EMOJI_ID,
    attach,
    pathFor,
    record,
    compose,
    diff,
    schedule,
    progress,
    durationFor,
    stagger,
    inkFor,
    washFor,
    idFor,
    hashStr,
    Sketch,
    LIMITS: { DRAW_MIN, DRAW_MAX, STAGGER_STEP, STAGGER_SPAN, ERASE_MS, PEN_GAP_MAX },
  };
});
