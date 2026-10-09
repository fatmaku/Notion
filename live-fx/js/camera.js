// LiveFX – camera view (camera.html, docs/KAMERA.md). Global `LiveFXCamera` (UMD: the pure helpers load in Node for
// tests; the page boots itself when camera.html's `#frame` exists).
//
// One window = webcam + LiveFX overlay, so one capture carries both:
//   - OBS: Fensteraufnahme (window capture) of this window – or the usual scene + „Virtuelle Kamera starten“ – then
//     „OBS Virtual Camera“ is a camera in WhatsApp Desktop, FaceTime (macOS 13+ camera extension), Zoom, Teams, Meet.
//   - without OBS: share this window / tab as the screen in a call (Zoom, Meet, Teams, WhatsApp Desktop).
//   - built-in recorder (⏺, `?record=1` opens the page ready to record): picture + overlay + microphone + effect
//     sounds -> MP4 (where the browser can) or WebM, download or share (phone: straight to WhatsApp).
//   - Live-Mikro (`?mic=1`, button 🎙️): browser speech recognition in this page – keywords fire effects through the
//     bus (every overlay, OBS too), sentences go to the story director (`{type:'story'}`) – a complete „studio“.
//
// Layout: `#frame` has the OUTPUT size in CSS px (1280×720 / 720×1280, `?res=1080` 1920×1080 / 1080×1920) and is scaled
// to fit the window with a transform, so the overlay iframe (overlay.html with the forwarded URL parameters, plus
// `layout=portrait` in 9:16) lays out exactly like an OBS browser source of that size.
//
// Recording: the `Compositor` paints one frame per tick onto a canvas of the output size – the camera (cover-fit,
// mirrored like the preview) and a raster of the overlay iframe's live DOM (backgrounds incl. gradients, borders,
// box / text shadows, text with its current animated transform + opacity, emoji, images, the particle + sketch
// canvases, `::before` / `::after` boxes, clip-path inset / polygon, overflow clips, the band's mask) – then
// MediaRecorder records `canvas.captureStream()` plus one mixed audio track (microphone + the overlay mixer's output,
// tapped inside the overlay's AudioContext). WebM recordings go through `LiveFXSketch.record` when the overlay
// provides it (same result shape); MP4 and the tab mode use `record()` below. Cross-origin GIFs (KLIPY / GIPHY) would
// taint the canvas and are skipped, uploaded file sounds bypass the mixer (js/fx.js playFile -> ctx.destination) and
// are missing – „Pixelgenau“ (tab capture, getDisplayMedia narrowed to #frame by CropTarget, else RestrictionTarget,
// else the whole tab – each checked for real frames first; tab audio; Chrome desktop) records exactly the pixels and
// sounds of the page instead. MP4 is only picked with an explicit H.264 codec (phones play that); see mimeCandidates.
//
// URL parameters: aspect=16:9|9:16 · res=720|1080 · mirror=0|1 · cam=<deviceId>|off (off = no webcam, 2.3) · clean=1 (picture only) · mute=1 ·
// record=1 · mic=1 · lang=tr-TR|de-DE|en-US – and the overlay's own: theme, volume, perf, story, band, zone, bandpos,
// storystyle (forwarded to overlay.html).
//
//   window.livefxCamera = { ready, state, overlay, devices(), setDevice(id), setMirror(on), setAspect(a), setRes(r),
//     setSound(on), setClean(on), setStoryStyle(s), compositor, startRecording(opts), stopRecording(), recording,
//     lastRecording, studio: { prepare(), start(), stop(), handleText(text, final) } }
(function (global, factory) {
  const api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.LiveFXCamera = api;
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const go = () => {
      if (document.getElementById('frame') && document.getElementById('fx') && !window.livefxCamera) api.boot();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';

  const VERSION = '2.3.0';
  const ASPECTS = ['16:9', '9:16'];
  const RESOLUTIONS = { 720: [1280, 720], 1080: [1920, 1080] };
  const FORMATS = ['auto', 'mp4', 'webm'];
  const REC_MODES = ['canvas', 'tab'];
  const STORY_STYLES = ['emoji', 'sketch', 'mixed'];
  const LANGS = ['tr-TR', 'de-DE', 'en-US'];
  const PREFS_KEY = 'livefx.camera';
  // 2.3: camera choice „🎨 Ohne Kamera“ (`?cam=off`): no webcam, the dark board behind the overlay – effects + the
  // drawn live story on their own, e.g. to record a „Zeichenfilm“ while narrating (docs/SKETCH.md, docs/KAMERA.md).
  const NO_CAM = 'off';
  // overlay.html parameters handed through to the embedded overlay (`layout` is set from the aspect).
  const OVERLAY_PARAMS = ['theme', 'volume', 'perf', 'story', 'band', 'zone', 'bandpos', 'storystyle'];
  const FPS = 30;
  const MAX_REC_MS = 20 * 60 * 1000; // 20 min: ~0.5 GB at 720p in memory – long enough for a story, safe on phones
  const BITRATE = { 720: 3500000, 1080: 7000000 };
  // „Pixelgenau“: a capture way counts once it delivered this many frames within TAB_PROBE_MS (else the next way is
  // tried); a cropTo / restrictTo call that takes longer than TAB_STEP_MS counts as failed
  const TAB_PROBE_FRAMES = 3;
  const TAB_PROBE_MS = 1500;
  const TAB_STEP_MS = 2000;
  const PAINT_MAX_NODES = 900;
  const LAYER_MAX_DEPTH = 2;
  const POLL_MS = 1000;
  const SOURCE = 'Kamera-Mikro';
  // Live-Mikro: loaded on demand, in this order (the same set mobile.html runs its microphone with).
  const STUDIO_SCRIPTS = ['js/schema.js', 'js/triggers.js', 'js/packs.js', 'js/phonetic.js', 'js/langdetect.js', 'js/matcher.js', 'js/bus.js', 'js/store.js', 'js/asr.js'];
  const IDENTITY = [1, 0, 0, 1];
  const SQRT2 = Math.SQRT2;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const now = () => (global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now());

  // ------------------------------------------------------------------ pure helpers (unit-tested in Node)
  function normAspect(v) {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    return s === '9:16' || s === '9x16' || s === '916' || s === 'portrait' || s === 'hochkant' ? '9:16' : '16:9';
  }
  function normRes(v) {
    return Number(v) === 1080 || String(v).toLowerCase() === '1080p' ? 1080 : 720;
  }
  /** Output size in px for an aspect + resolution: 16:9 720 -> 1280×720, 9:16 1080 -> 1080×1920. */
  function outputSize(aspect, res) {
    const [a, b] = RESOLUTIONS[normRes(res)];
    return normAspect(aspect) === '9:16' ? { width: b, height: a } : { width: a, height: b };
  }
  /** overlay.html URL for the iframe: the allow-listed overlay parameters of `search` (+ `extra`), portrait layout. */
  function overlaySrc(search, aspect, extra) {
    const p = new URLSearchParams(search || '');
    const out = new URLSearchParams();
    if (normAspect(aspect) === '9:16') out.set('layout', 'portrait');
    for (const k of OVERLAY_PARAMS) if (p.has(k) && p.get(k) !== '') out.set(k, p.get(k));
    if (extra && typeof extra === 'object') {
      for (const k of OVERLAY_PARAMS) {
        if (!(k in extra)) continue;
        if (extra[k] === null || extra[k] === undefined || extra[k] === '') out.delete(k);
        else out.set(k, String(extra[k]));
      }
    }
    const q = out.toString();
    return `overlay.html${q ? `?${q}` : ''}`;
  }
  /** Scale + offset that fits a w×h box into availW×availH (centered, aspect kept). */
  function fitBox(availW, availH, w, h) {
    const W = Math.max(1, Number(availW) || 1);
    const H = Math.max(1, Number(availH) || 1);
    const scale = Math.max(0.01, Math.min(W / w, H / h));
    return { scale, x: Math.round((W - w * scale) / 2), y: Math.round((H - h * scale) / 2) };
  }
  /** Source crop of a srcW×srcH picture that covers dstW×dstH (object-fit: cover, centered). */
  function coverRect(srcW, srcH, dstW, dstH) {
    const sa = srcW / srcH;
    const da = dstW / dstH;
    if (sa > da) {
      const sw = srcH * da;
      return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
    }
    const sh = srcW / da;
    return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
  }
  /** Splits `s` at top-level `sep` (not inside parentheses or quotes). */
  function splitTopLevel(s, sep = ',') {
    const out = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (const ch of String(s == null ? '' : s)) {
      if (quote) {
        if (ch === quote) quote = '';
        cur += ch;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === sep && depth === 0) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function matchParen(s, open) {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')' && --depth === 0) return i;
    }
    return s.length - 1;
  }
  function toDeg(v, unit) {
    const u = String(unit || 'deg').toLowerCase();
    if (u === 'rad') return (v * 180) / Math.PI;
    if (u === 'turn') return v * 360;
    if (u === 'grad') return v * 0.9;
    return v;
  }
  /** '18%' -> {v:18,u:'%'}, '12px' -> {v:12,u:'px'}, '90deg' -> {v:90,u:'deg'}; null otherwise. */
  function parseLen(t) {
    const m = /^(-?[\d.]+(?:e-?\d+)?)(px|%|deg|rad|turn|grad)?$/i.exec(String(t || '').trim());
    if (!m) return null;
    const v = parseFloat(m[1]);
    if (!Number.isFinite(v)) return null;
    const u = (m[2] || 'px').toLowerCase();
    if (u === 'rad' || u === 'turn' || u === 'grad') return { v: toDeg(v, u), u: 'deg' };
    return { v, u };
  }
  const COLOR_FN = /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/i;
  /** Splits a leading colour (`rgb(…)`, `#fff`, `red`) from the rest of a token. */
  function takeColor(tok) {
    const s = String(tok || '').trim();
    const fm = /^([a-z-]+)\(/i.exec(s);
    if (fm && COLOR_FN.test(fm[1])) {
      const end = matchParen(s, fm[0].length - 1);
      return { color: s.slice(0, end + 1), rest: s.slice(end + 1).trim() };
    }
    const sp = s.split(/\s+/);
    if (!sp[0] || /^-?[\d.]/.test(sp[0])) return { color: '', rest: s };
    return { color: sp[0], rest: sp.slice(1).join(' ') };
  }
  /** Colour stop(s) of a gradient token; a stop with two positions yields two stops; hints yield none. */
  function parseStop(tok) {
    const { color, rest } = takeColor(tok);
    if (!color) return [];
    const ps = rest ? rest.split(/\s+/).map(parseLen).filter(Boolean) : [];
    return ps.length ? ps.map((pos) => ({ color, pos })) : [{ color, pos: null }];
  }
  function isColorStart(tok) {
    const s = String(tok || '').trim();
    if (/\b(circle|ellipse|at|closest-side|closest-corner|farthest-side|farthest-corner|from)\b/i.test(s) && !/^(rgba?|hsla?)\(/i.test(s)) return false;
    if (/^-?[\d.]+(px|%|em|rem|vw|vh)?(\s|$)/i.test(s)) return false;
    return !!takeColor(s).color;
  }
  function posKeyword(t) {
    const k = String(t || '').toLowerCase();
    if (k === 'left' || k === 'top') return { v: 0, u: '%' };
    if (k === 'right' || k === 'bottom') return { v: 100, u: '%' };
    if (k === 'center') return { v: 50, u: '%' };
    return parseLen(k);
  }
  /** `at x y` -> [{v,u},{v,u}] (keywords, % or px; default centre). */
  function parseAt(s) {
    const at = [{ v: 50, u: '%' }, { v: 50, u: '%' }];
    const m = /\bat\s+(.+)$/i.exec(s || '');
    if (!m) return at;
    const words = m[1].trim().split(/\s+/);
    let x = null;
    let y = null;
    for (const w of words) {
      const lw = w.toLowerCase();
      if (lw === 'top' || lw === 'bottom') y = posKeyword(lw);
      else if (lw === 'left' || lw === 'right') x = posKeyword(lw);
      else if (x === null) x = posKeyword(lw);
      else if (y === null) y = posKeyword(lw);
    }
    return [x || at[0], y || at[1]];
  }
  /**
   * CSS gradient (computed style serialisation) -> { type: linear|radial|conic, repeating, stops: [{color, pos}], … }:
   * linear `angle` (deg, CSS: 0 = up, clockwise) or `to` {x,y}; radial `shape`, `size` (keyword | [lenX, lenY]),
   * `at`; conic `from`, `at`. Null for anything else (url(), image-set(), none).
   */
  function parseGradient(str) {
    const m = /^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]*)\)$/i.exec(String(str || '').trim());
    if (!m) return null;
    const parts = splitTopLevel(m[3]);
    if (!parts.length) return null;
    const g = { type: m[2].toLowerCase(), repeating: !!m[1], stops: [] };
    let i = 0;
    const first = parts[0];
    if (g.type === 'linear') {
      g.angle = 180;
      g.to = null;
      const am = /^(-?[\d.]+)(deg|rad|turn|grad)$/i.exec(first);
      if (am) {
        g.angle = toDeg(parseFloat(am[1]), am[2]);
        i = 1;
      } else if (/^to\s/i.test(first)) {
        const w = first.toLowerCase().split(/\s+/).slice(1);
        g.to = { x: w.includes('left') ? -1 : w.includes('right') ? 1 : 0, y: w.includes('top') ? -1 : w.includes('bottom') ? 1 : 0 };
        i = 1;
      }
    } else if (g.type === 'radial') {
      g.shape = 'ellipse';
      g.size = 'farthest-corner';
      g.at = [{ v: 50, u: '%' }, { v: 50, u: '%' }];
      if (!isColorStart(first)) {
        i = 1;
        const pre = first.split(/\bat\b/i)[0].trim().toLowerCase();
        const words = pre ? pre.split(/\s+/) : [];
        const lens = [];
        for (const w of words) {
          if (w === 'circle' || w === 'ellipse') g.shape = w;
          else if (/^(closest|farthest)-(side|corner)$/.test(w)) g.size = w;
          else if (parseLen(w)) lens.push(parseLen(w));
        }
        if (lens.length) {
          g.size = [lens[0], lens[1] || lens[0]];
          if (lens.length === 1 && !words.includes('ellipse')) g.shape = 'circle';
        }
        g.at = parseAt(first);
      }
    } else {
      g.from = 0;
      g.at = [{ v: 50, u: '%' }, { v: 50, u: '%' }];
      if (!isColorStart(first)) {
        i = 1;
        const fm = /\bfrom\s+(-?[\d.]+)(deg|rad|turn|grad)/i.exec(first);
        if (fm) g.from = toDeg(parseFloat(fm[1]), fm[2]);
        g.at = parseAt(first);
      }
    }
    for (; i < parts.length; i++) g.stops.push(...parseStop(parts[i]));
    return g.stops.length ? g : null;
  }
  /** Stop offsets 0..1 for a gradient line of `L` px (missing positions spread evenly, kept monotonic). */
  function resolveStops(stops, L) {
    const pos = stops.map((s) => {
      if (!s.pos) return null;
      if (s.pos.u === '%') return s.pos.v / 100;
      if (s.pos.u === 'deg') return s.pos.v / 360;
      return s.pos.v / (L || 1);
    });
    if (!pos.length) return [];
    if (pos[0] === null) pos[0] = 0;
    if (pos[pos.length - 1] === null) pos[pos.length - 1] = Math.max(1, ...pos.filter((p) => p !== null));
    for (let i = 1; i < pos.length; i++) {
      if (pos[i] !== null) continue;
      let j = i;
      while (pos[j] === null) j++;
      const a = pos[i - 1];
      const b = pos[j];
      for (let q = i; q < j; q++) pos[q] = a + ((b - a) * (q - i + 1)) / (j - i + 1);
      i = j;
    }
    let prev = 0;
    return pos.map((p) => (prev = Math.max(prev, clamp(p, 0, 1))));
  }
  /** box-shadow / text-shadow -> [{color, x, y, blur, spread, inset}] (computed serialisation, colour first or last). */
  function parseShadows(str) {
    if (!str || str === 'none') return [];
    const out = [];
    for (const part of splitTopLevel(str)) {
      let s = part.trim();
      let inset = false;
      if (/\binset\b/i.test(s)) {
        inset = true;
        s = s.replace(/\binset\b/i, '').trim();
      }
      let color = '';
      let rest = s;
      const lead = takeColor(s);
      if (lead.color && !/^-?[\d.]/.test(s)) {
        color = lead.color;
        rest = lead.rest;
      } else {
        const fm = /((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)\s*$/i.exec(s);
        if (fm) {
          color = fm[1];
          rest = s.slice(0, fm.index).trim();
        }
      }
      const n = rest.split(/\s+/).map(parseLen).filter(Boolean).map((l) => l.v);
      if (n.length < 2) continue;
      out.push({ color: color || 'rgba(0, 0, 0, 0.5)', x: n[0], y: n[1], blur: n[2] || 0, spread: n[3] || 0, inset });
    }
    return out;
  }
  function isTransparent(c) {
    if (!c) return true;
    const s = String(c).trim().toLowerCase();
    return s === 'transparent' || s === 'none' || /^rgba\([^)]*,\s*0(\.0+)?\)$/.test(s) || /\/\s*0(\.0+)?\)$/.test(s);
  }
  /**
   * MediaRecorder MIME candidates for a format. Auto / MP4 prefer MP4 with an explicit H.264 codec (WhatsApp / iPhone
   * play that) at level 4.0 (enough for 1080p30; avc1.42E01E = level 3.0 is too low for 720p30), then WebM. A bare
   * 'video/mp4' comes last of all: Chromium on Linux accepts it but writes VP9 + Opus into the MP4 – phones choke on that,
   * while WebM at least gets the honest „WebM“ warning. Safari (H.264 only) still ends up with MP4 through it.
   */
  function mimeCandidates(format, hasAudio) {
    const mp4 = hasAudio
      ? ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4D0028,mp4a.40.2', 'video/mp4;codecs=avc1.42E028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.640028,opus', 'video/mp4;codecs=avc1,opus']
      : ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4D0028', 'video/mp4;codecs=avc1.42E028', 'video/mp4;codecs=avc1'];
    const webm = hasAudio ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return (format === 'webm' ? webm.concat(mp4) : mp4.concat(webm)).concat('video/mp4');
  }
  /**
   * Does a recording of this MIME type play on phones (WhatsApp, iPhone)? True for MP4 with H.264 (avc1 / avc3) or with
   * no codec named (Safari's plain 'video/mp4' is always H.264); false for WebM and for MP4 holding VP8 / VP9 / AV1.
   */
  function phoneSafe(mime) {
    const m = String(mime || '').toLowerCase();
    if (!/^video\/mp4/.test(m)) return false;
    const codecs = /codecs\s*=\s*"?([^";]*)/.exec(m);
    return !codecs || /\bavc[13]\b/.test(codecs[1]);
  }
  function pickMime(format, hasAudio, isSupported) {
    const ok = typeof isSupported === 'function' ? isSupported : () => false;
    for (const m of mimeCandidates(format, hasAudio)) {
      try {
        if (ok(m)) return m;
      } catch (_) {
        /* next */
      }
    }
    return '';
  }
  function extFor(mime) {
    return /mp4/i.test(String(mime || '')) ? 'mp4' : 'webm';
  }
  function formatTime(ms) {
    const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function fileStamp(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  /** Language family of a BCP-47 tag ('tr-TR' -> 'tr'); '' for anything else. */
  function familyOf(tag) {
    const f = String(tag || '').slice(0, 2).toLowerCase();
    return ['de', 'tr', 'en'].includes(f) ? f : '';
  }
  /** Camera error -> German hint. */
  function cameraErrorText(e, secure) {
    const name = (e && e.name) || '';
    if (secure === false) return 'Kamera braucht HTTPS (oder localhost). Am Handy den Internet-Link aus dem Panel öffnen – siehe docs/KAMERA.md.';
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'Kamera blockiert – im Browser erlauben (Schloss-Symbol neben der Adresse) und „Erneut versuchen“.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'Keine Kamera gefunden – Kamera anschließen oder oben eine andere wählen.';
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'Kamera ist belegt – meist von OBS, Zoom oder einer anderen App. Dort freigeben und „Erneut versuchen“.';
    return `Kamera startet nicht (${name || (e && e.message) || 'unbekannt'}).`;
  }

  // ------------------------------------------------------------------ 2D matrix helpers (CSS order [a, b, c, d])
  function mul(A, B) {
    return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3]];
  }
  /** Linear part of an element's computed transform incl. the individual `scale` / `rotate` properties (R·S·M). */
  function linearOf(cs, DM) {
    let m = null;
    const t = cs.transform;
    if (t && t !== 'none' && DM) {
      try {
        const d = new DM(t);
        m = [d.a, d.b, d.c, d.d];
      } catch (_) {
        m = null;
      }
    }
    const sc = cs.scale;
    if (sc && sc !== 'none') {
      const p = sc.trim().split(/\s+/).map(parseFloat);
      if (Number.isFinite(p[0])) {
        const S = [p[0], 0, 0, Number.isFinite(p[1]) ? p[1] : p[0]];
        m = m ? mul(S, m) : S;
      }
    }
    const rot = cs.rotate;
    if (rot && rot !== 'none' && !/^\s*[xy]\s/i.test(rot)) {
      const am = /(-?[\d.]+)(deg|rad|turn|grad)\s*$/i.exec(rot);
      if (am) {
        const r = (toDeg(parseFloat(am[1]), am[2]) * Math.PI) / 180;
        const R = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r)];
        m = m ? mul(R, m) : R;
      }
    }
    return m;
  }
  function px(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  function radiusOf(cs, w, h) {
    const raw = String(cs.borderTopLeftRadius || '0').split(/\s+/)[0];
    let r = parseFloat(raw) || 0;
    if (/%$/.test(raw)) r = (r / 100) * Math.min(w, h);
    return clamp(r, 0, Math.min(w, h) / 2);
  }
  function roundRectPath(g, x, y, w, h, r) {
    if (!(r > 0.5)) {
      g.rect(x, y, w, h);
      return;
    }
    if (typeof g.roundRect === 'function') {
      g.roundRect(x, y, w, h, r);
      return;
    }
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function setFilter(g, f) {
    if (!('filter' in g)) return;
    const v = f && !/url\(/i.test(f) ? f : 'none';
    if (g.filter !== v) g.filter = v;
  }
  function lenOf(l, ref) {
    if (!l) return 0;
    return l.u === '%' ? (l.v / 100) * ref : l.v;
  }
  /** background-size of one layer -> {w, h} in px for explicit lengths / percentages; null for auto / cover / contain. */
  function tileSize(v, w, h) {
    const parts = String(v || 'auto').trim().split(/\s+/);
    const a = parseLen(parts[0]);
    if (!a || a.u === 'deg') return null;
    const b = parts[1] && parts[1] !== 'auto' ? parseLen(parts[1]) : null;
    const tw = lenOf(a, w);
    const th = b && b.u !== 'deg' ? lenOf(b, h) : h;
    return tw > 0 && th > 0 ? { w: tw, h: th } : null;
  }
  /** clip-path inset() / polygon() / circle() as a path in a box centred on the origin; false when unsupported. */
  function clipPathPath(g, str, w, h) {
    const s = String(str || '').trim();
    const x0 = -w / 2;
    const y0 = -h / 2;
    let m = /^inset\(([^)]*)\)/i.exec(s);
    if (m) {
      const body = m[1].split(/\bround\b/i);
      const v = body[0].trim().split(/\s+/).map(parseLen);
      const [t, r, b, l] = [v[0], v[1] || v[0], v[2] || v[0], v[3] || v[1] || v[0]];
      const top = lenOf(t, h);
      const right = lenOf(r, w);
      const bottom = lenOf(b, h);
      const left = lenOf(l, w);
      const rr = body[1] ? lenOf(parseLen(body[1].trim().split(/\s+/)[0]), Math.min(w, h)) : 0;
      roundRectPath(g, x0 + left, y0 + top, Math.max(0, w - left - right), Math.max(0, h - top - bottom), rr);
      return true;
    }
    m = /^polygon\(([\s\S]*)\)/i.exec(s);
    if (m) {
      const pts = splitTopLevel(m[1]).filter((p) => !/^(nonzero|evenodd)$/i.test(p));
      let first = true;
      for (const p of pts) {
        const [a, b] = p.trim().split(/\s+/).map(parseLen);
        if (!a || !b) continue;
        const x = x0 + lenOf(a, w);
        const y = y0 + lenOf(b, h);
        if (first) g.moveTo(x, y);
        else g.lineTo(x, y);
        first = false;
      }
      g.closePath();
      return !first;
    }
    m = /^circle\(([^)]*)\)/i.exec(s);
    if (m) {
      const pre = m[1].split(/\bat\b/i)[0].trim();
      const at = parseAt(m[1]);
      const cx = x0 + lenOf(at[0], w);
      const cy = y0 + lenOf(at[1], h);
      const rl = parseLen(pre);
      const r = rl ? lenOf(rl, Math.sqrt((w * w + h * h) / 2)) : Math.min(w, h) / 2;
      g.moveTo(cx + r, cy);
      g.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
      return true;
    }
    return false;
  }
  /** Canvas fill style for a parsed gradient over the box (x, y, w, h); `sy` = vertical scale for ellipses. */
  function gradientStyle(g, grad, x, y, w, h) {
    if (!grad) return null;
    let style = null;
    let sy = 1;
    let cx = x + w / 2;
    let cy = y + h / 2;
    let L = 1;
    try {
      if (grad.type === 'linear') {
        let A = grad.angle;
        if (grad.to) {
          const { x: tx, y: ty } = grad.to;
          if (!tx) A = ty < 0 ? 0 : 180;
          else if (!ty) A = tx > 0 ? 90 : 270;
          else A = (Math.atan2(h * tx, -(w * ty)) * 180) / Math.PI;
        }
        const a = (A * Math.PI) / 180;
        const dx = Math.sin(a);
        const dy = -Math.cos(a);
        L = Math.abs(w * dx) + Math.abs(h * dy) || 1;
        style = g.createLinearGradient(cx - (dx * L) / 2, cy - (dy * L) / 2, cx + (dx * L) / 2, cy + (dy * L) / 2);
      } else if (grad.type === 'radial') {
        cx = x + lenOf(grad.at[0], w);
        cy = y + lenOf(grad.at[1], h);
        const l = Math.abs(cx - x);
        const r = Math.abs(x + w - cx);
        const t = Math.abs(cy - y);
        const b = Math.abs(y + h - cy);
        let rx;
        let ry;
        if (Array.isArray(grad.size)) {
          rx = lenOf(grad.size[0], w);
          ry = lenOf(grad.size[1], h);
        } else if (grad.shape === 'circle') {
          const corners = [Math.hypot(l, t), Math.hypot(r, t), Math.hypot(l, b), Math.hypot(r, b)];
          rx = grad.size === 'closest-side' ? Math.min(l, r, t, b) : grad.size === 'farthest-side' ? Math.max(l, r, t, b) : grad.size === 'closest-corner' ? Math.min(...corners) : Math.max(...corners);
          ry = rx;
        } else if (grad.size === 'closest-side') {
          rx = Math.min(l, r);
          ry = Math.min(t, b);
        } else if (grad.size === 'farthest-side') {
          rx = Math.max(l, r);
          ry = Math.max(t, b);
        } else if (grad.size === 'closest-corner') {
          rx = Math.min(l, r) * SQRT2;
          ry = Math.min(t, b) * SQRT2;
        } else {
          rx = Math.max(l, r) * SQRT2;
          ry = Math.max(t, b) * SQRT2;
        }
        rx = Math.max(0.5, rx);
        ry = Math.max(0.5, ry);
        L = rx;
        sy = ry / rx;
        style = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
      } else if (grad.type === 'conic' && typeof g.createConicGradient === 'function') {
        cx = x + lenOf(grad.at[0], w);
        cy = y + lenOf(grad.at[1], h);
        style = g.createConicGradient(((grad.from - 90) * Math.PI) / 180, cx, cy);
        L = 360;
      }
    } catch (_) {
      style = null;
    }
    if (!style) return null;
    const offs = resolveStops(grad.stops, L);
    grad.stops.forEach((s, i) => {
      try {
        style.addColorStop(offs[i], s.color);
      } catch (_) {
        /* unknown colour syntax */
      }
    });
    return { style, sy, cx, cy };
  }
  function fillWith(g, st) {
    if (!st) return;
    g.fillStyle = st.style;
    if (st.sy && Math.abs(st.sy - 1) > 1e-3) {
      g.save();
      g.translate(st.cx, st.cy);
      g.scale(1, st.sy);
      g.translate(-st.cx, -st.cy);
      g.fill();
      g.restore();
    } else g.fill();
  }
  function applyShadow(g, sh, s) {
    if (!sh || isTransparent(sh.color)) return false;
    g.shadowColor = sh.color;
    g.shadowBlur = Math.max(0, sh.blur * s);
    g.shadowOffsetX = sh.x * s;
    g.shadowOffsetY = sh.y * s;
    return true;
  }
  function clearShadow(g) {
    g.shadowColor = 'rgba(0, 0, 0, 0)';
    g.shadowBlur = 0;
    g.shadowOffsetX = 0;
    g.shadowOffsetY = 0;
  }
  function textTransform(text, tt) {
    if (tt === 'uppercase') return text.toUpperCase();
    if (tt === 'lowercase') return text.toLowerCase();
    if (tt === 'capitalize') return text.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
    return text;
  }
  function contentText(content) {
    const m = /^"([\s\S]*)"$/.exec(String(content || '').trim());
    return m ? m[1].replace(/\\"/g, '"').replace(/\\a\s?/gi, '\n') : '';
  }
  function maskOf(cs) {
    const v = cs.webkitMaskImage || cs.maskImage;
    if (!v || v === 'none') return null;
    const g = parseGradient(splitTopLevel(v)[0] || '');
    return g && g.type !== 'conic' ? g : null;
  }
  function zOf(cs) {
    if (cs.position === 'static' || cs.zIndex === 'auto') return 0;
    const z = parseInt(cs.zIndex, 10);
    return Number.isFinite(z) ? z : 0;
  }

  // ------------------------------------------------------------------ compositor
  /**
   * Paints camera + overlay into `canvas` (output size). `video` = the camera <video>, `frame` = the overlay iframe
   * (same origin), `mirror()` = whether the preview is mirrored. `paint()` draws one frame and returns
   * `{nodes, texts, images, skipped, ms}`; `start(fps)` / `stop()` run it continuously (rAF while visible, a timer
   * while the tab is hidden).
   */
  class Compositor {
    constructor(opts = {}) {
      this.video = opts.video || null;
      this.frame = opts.frame || null;
      this.mirror = typeof opts.mirror === 'function' ? opts.mirror : () => !!opts.mirror;
      this.canvas = opts.canvas || document.createElement('canvas');
      this.g = this.canvas.getContext('2d');
      this._g = this.g;
      this.layers = [];
      this._depth = 0;
      this._ox = 0; // origin (device px) of the layer being painted
      this._oy = 0;
      this._imgs = new Map();
      this._range = null;
      this._rangeDoc = null;
      this.running = false;
      this.fps = FPS;
      this._raf = 0;
      this._timer = 0;
      this.stats = { frames: 0, ms: 0, avgMs: 0, maxMs: 0, nodes: 0, texts: 0, images: 0, skipped: 0 };
      this.resize(opts.width || 1280, opts.height || 720);
    }

    resize(w, h) {
      const W = Math.max(2, Math.round(w));
      const H = Math.max(2, Math.round(h));
      if (this.canvas.width !== W) this.canvas.width = W;
      if (this.canvas.height !== H) this.canvas.height = H;
      this.layers = [];
    }

    start(fps = FPS) {
      this.fps = clamp(Number(fps) || FPS, 1, 60);
      if (this.running) return;
      this.running = true;
      const interval = 1000 / this.fps;
      let last = 0;
      const tick = (t) => {
        this._raf = 0;
        this._timer = 0;
        if (!this.running) return;
        const ts = typeof t === 'number' ? t : now();
        if (!last || ts - last >= interval - 4) {
          last = ts;
          this.paint();
        }
        schedule();
      };
      const schedule = () => {
        if (!this.running) return;
        if ((typeof document !== 'undefined' && document.hidden) || typeof requestAnimationFrame !== 'function') this._timer = setTimeout(() => tick(now()), interval);
        else this._raf = requestAnimationFrame(tick);
      };
      this.paint();
      schedule();
    }

    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      clearTimeout(this._timer);
      this._raf = 0;
      this._timer = 0;
    }

    paint() {
      const t0 = now();
      const g = this.g;
      const W = this.canvas.width;
      const H = this.canvas.height;
      this._g = g;
      this._depth = 0;
      this._ox = 0;
      this._oy = 0;
      this._n = { nodes: 0, texts: 0, images: 0, skipped: 0 };
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      setFilter(g, 'none');
      clearShadow(g);
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      this._paintVideo(g, W, H);
      try {
        this._paintOverlay(W, H);
      } catch (e) {
        if (!this._warned) {
          this._warned = true;
          if (global.console) console.warn('LiveFXCamera: overlay raster failed', e);
        }
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      setFilter(g, 'none');
      const ms = now() - t0;
      const st = this.stats;
      st.frames++;
      st.ms = ms;
      st.avgMs = st.avgMs ? st.avgMs * 0.9 + ms * 0.1 : ms;
      st.maxMs = Math.max(st.maxMs, ms);
      Object.assign(st, this._n);
      return { ...this._n, ms };
    }

    _paintVideo(g, W, H) {
      const v = this.video;
      if (v && v.readyState >= 2 && v.videoWidth && v.videoHeight) {
        const c = coverRect(v.videoWidth, v.videoHeight, W, H);
        if (this.mirror()) g.setTransform(-1, 0, 0, 1, W, 0);
        try {
          g.drawImage(v, c.sx, c.sy, c.sw, c.sh, 0, 0, W, H);
        } catch (_) {
          /* frame not ready */
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        return;
      }
      const rg = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7);
      rg.addColorStop(0, '#2a2f3b');
      rg.addColorStop(1, '#0d0f14');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }

    _paintOverlay(W) {
      let doc;
      let win;
      try {
        doc = this.frame && this.frame.contentDocument;
        win = this.frame && this.frame.contentWindow;
      } catch (_) {
        return;
      }
      if (!doc || !win || !doc.body) return;
      const root = doc.getElementById('stage') || doc.body;
      this._doc = doc;
      this._win = win;
      this._origin = win.location.origin;
      this._DM = win.DOMMatrix || global.DOMMatrix || null;
      this._k = W / (doc.documentElement.clientWidth || W);
      if (this._rangeDoc !== doc) {
        this._range = doc.createRange();
        this._rangeDoc = doc;
      }
      this._paintEl(root, null, { m: IDENTITY, alpha: 1, filter: '' });
    }

    _sameOrigin(url, el) {
      if (!url) return false;
      if (/^(data|blob):/i.test(url)) return true;
      if (el && el.crossOrigin) return true; // loaded with CORS – clean
      try {
        return new URL(url, this._doc.baseURI).origin === this._origin;
      } catch (_) {
        return false;
      }
    }

    _paintEl(el, cs, p) {
      const n = this._n;
      if (n.nodes >= PAINT_MAX_NODES) return;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'AUDIO' || tag === 'LINK') return;
      const win = this._win;
      const s = cs || win.getComputedStyle(el);
      if (s.display === 'none') return;
      const op = parseFloat(s.opacity);
      const alpha = p.alpha * (Number.isFinite(op) ? op : 1);
      if (alpha < 0.005) return;
      n.nodes++;
      const lin = linearOf(s, this._DM);
      const m = lin ? mul(p.m, lin) : p.m;
      const det = m[0] * m[3] - m[1] * m[2];
      if (Math.abs(det) < 1e-6) return;
      const own = s.filter && s.filter !== 'none' ? s.filter : '';
      const filter = own ? (p.filter ? `${p.filter} ${own}` : own) : p.filter;
      const r = el.getBoundingClientRect();
      const ow = typeof el.offsetWidth === 'number' ? el.offsetWidth : r.width;
      const oh = typeof el.offsetHeight === 'number' ? el.offsetHeight : r.height;
      const zero = !(ow > 0 && oh > 0);
      const clipsKids = s.overflowX !== 'visible' || s.overflowY !== 'visible';
      if (zero && clipsKids) return; // e.g. the `.fx-rain` marker
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const k = this._k;
      const clipPath = s.clipPath && s.clipPath !== 'none' ? s.clipPath : '';
      const mask = zero ? null : maskOf(s);
      // a masked element (the story band's soft top edge) paints into a layer of its own bounding box
      const layer = mask ? this._pushLayer(r.left * k, r.top * k, r.width * k, r.height * k) : null;
      const box = { w: ow, h: oh, m, det, cx, cy, tf: [k * m[0], k * m[1], k * m[2], k * m[3], k * cx - this._ox, k * cy - this._oy], cs: s };
      const g = this._g;
      let saved = 0;
      if (!zero && clipsKids) {
        g.save();
        saved++;
        g.setTransform(...box.tf);
        g.beginPath();
        roundRectPath(g, -ow / 2, -oh / 2, ow, oh, radiusOf(s, ow, oh));
        g.clip();
      }
      if (!zero && clipPath) {
        g.save();
        saved++;
        g.setTransform(...box.tf);
        g.beginPath();
        if (clipPathPath(g, clipPath, ow, oh)) g.clip();
      }
      const visible = s.visibility !== 'hidden' && s.visibility !== 'collapse';
      if (visible && !zero) this._paintSelf(el, s, box, alpha, filter);
      else if (visible && el.firstChild) this._paintTexts(el, s, box, alpha, filter);
      const kids = [];
      for (const c of el.children) {
        const ccs = win.getComputedStyle(c);
        kids.push({ c, cs: ccs, z: zOf(ccs) });
      }
      if (kids.length > 1) kids.sort((a, b) => a.z - b.z);
      const pc = { m, alpha, filter };
      for (const kd of kids) this._paintEl(kd.c, kd.cs, pc);
      if (visible && !zero) this._paintPseudo(el, '::after', box, alpha, filter);
      while (saved--) g.restore();
      if (layer) this._popLayer(layer, mask, box);
    }

    _paintSelf(el, cs, box, alpha, filter) {
      const g = this._g;
      g.setTransform(...box.tf);
      g.globalAlpha = alpha;
      setFilter(g, filter);
      const textClip = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
      this._paintBox(g, cs, box.w, box.h, textClip, this._k * Math.sqrt(Math.abs(box.det)));
      const tag = el.tagName;
      if (tag === 'IMG' || tag === 'CANVAS' || tag === 'VIDEO') this._paintReplaced(g, el, cs, box);
      this._paintPseudo(el, '::before', box, alpha, filter);
      if (el.firstChild) this._paintTexts(el, cs, box, alpha, filter);
    }

    /** Background colour + gradient / url() layers, the first outer box-shadow, the top border (as all four). */
    _paintBox(g, cs, w, h, textClip, s) {
      const bgc = cs.backgroundColor;
      const hasColor = !isTransparent(bgc);
      const layers = !textClip && cs.backgroundImage && cs.backgroundImage !== 'none' ? splitTopLevel(cs.backgroundImage) : [];
      const bw = px(cs.borderTopWidth);
      const hasBorder = bw > 0 && cs.borderTopStyle !== 'none' && cs.borderTopStyle !== 'hidden' && !isTransparent(cs.borderTopColor);
      if (!hasColor && !layers.length && !hasBorder) return;
      const rad = radiusOf(cs, w, h);
      const x = -w / 2;
      const y = -h / 2;
      g.beginPath();
      roundRectPath(g, x, y, w, h, rad);
      const sh = hasColor || layers.length ? parseShadows(cs.boxShadow).find((q) => !q.inset) : null;
      if (hasColor) {
        g.fillStyle = bgc;
        const shadowed = applyShadow(g, sh, s);
        g.fill();
        if (shadowed) clearShadow(g);
      }
      const sizes = layers.length ? splitTopLevel(cs.backgroundSize || 'auto') : [];
      const repeats = layers.length ? splitTopLevel(cs.backgroundRepeat || 'repeat') : [];
      for (let i = layers.length - 1; i >= 0; i--) {
        const L = layers[i];
        const grad = parseGradient(L);
        if (grad) {
          const shadowed = !hasColor && i === layers.length - 1 && applyShadow(g, sh, s);
          const tile = tileSize(sizes[i % sizes.length], w, h);
          const rep = String(repeats[i % repeats.length] || 'repeat');
          if (tile && (tile.w < w - 0.5 || tile.h < h - 0.5) && !/no-repeat/.test(rep)) this._fillTiled(g, L, grad, tile, x, y);
          else fillWith(g, gradientStyle(g, grad, x, y, w, h));
          if (shadowed) clearShadow(g);
          continue;
        }
        const um = /^url\(\s*["']?([\s\S]*?)["']?\s*\)$/i.exec(L);
        if (um) this._fillUrl(g, um[1], cs, x, y, w, h);
      }
      if (hasBorder) {
        g.lineWidth = bw;
        g.strokeStyle = cs.borderTopColor;
        if (cs.borderTopStyle === 'dashed') g.setLineDash([bw * 3, bw * 2]);
        else if (cs.borderTopStyle === 'dotted') g.setLineDash([bw, bw]);
        g.beginPath();
        roundRectPath(g, x + bw / 2, y + bw / 2, Math.max(0, w - bw), Math.max(0, h - bw), Math.max(0, rad - bw / 2));
        g.stroke();
        g.setLineDash([]);
      }
    }

    /** A gradient layer with a small background-size (e.g. the rain streak texture): one cached tile, repeated. */
    _fillTiled(g, key, grad, tile, x, y) {
      const tw = Math.max(1, Math.round(tile.w));
      const th = Math.max(1, Math.round(tile.h));
      const id = `${key}|${tw}|${th}`;
      let pat = this._tiles && this._tiles.get(id);
      if (!pat) {
        if (!this._tiles || this._tiles.size > 32) this._tiles = new Map();
        const c = document.createElement('canvas');
        c.width = tw;
        c.height = th;
        const tg = c.getContext('2d');
        tg.beginPath();
        tg.rect(0, 0, tw, th);
        fillWith(tg, gradientStyle(tg, grad, 0, 0, tw, th));
        pat = g.createPattern(c, 'repeat');
        this._tiles.set(id, pat);
      }
      if (!pat) return;
      if (typeof pat.setTransform === 'function' && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([1, 0, 0, 1, x, y]));
      g.fillStyle = pat;
      g.fill();
    }

    _image(url) {
      let img = this._imgs.get(url);
      if (!img) {
        if (this._imgs.size > 64) this._imgs.clear();
        img = new Image();
        img.decoding = 'async';
        img.src = url;
        this._imgs.set(url, img);
      }
      return img.complete && img.naturalWidth ? img : null;
    }

    _fillUrl(g, raw, cs, x, y, w, h) {
      let url;
      try {
        url = new URL(raw, this._doc.baseURI).href;
      } catch (_) {
        return;
      }
      if (!this._sameOrigin(url)) {
        this._n.skipped++;
        return;
      }
      const img = this._image(url);
      if (!img) return;
      const size = String(cs.backgroundSize || 'auto');
      let dx = x;
      let dy = y;
      let dw = w;
      let dh = h;
      if (size === 'cover' || size === 'contain') {
        const sc = size === 'cover' ? Math.max(w / img.naturalWidth, h / img.naturalHeight) : Math.min(w / img.naturalWidth, h / img.naturalHeight);
        dw = img.naturalWidth * sc;
        dh = img.naturalHeight * sc;
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
      }
      g.save();
      g.clip();
      try {
        g.drawImage(img, dx, dy, dw, dh);
        this._n.images++;
      } catch (_) {
        /* broken image */
      }
      g.restore();
    }

    _paintReplaced(g, el, cs, box) {
      const tag = el.tagName;
      let iw;
      let ih;
      if (tag === 'IMG') {
        if (!el.complete || !el.naturalWidth) return;
        if (!this._sameOrigin(el.currentSrc || el.src, el)) {
          this._n.skipped++;
          return;
        }
        iw = el.naturalWidth;
        ih = el.naturalHeight;
      } else if (tag === 'VIDEO') {
        if (el.readyState < 2 || !el.videoWidth) return;
        if (!this._sameOrigin(el.currentSrc || el.src, el)) {
          this._n.skipped++;
          return;
        }
        iw = el.videoWidth;
        ih = el.videoHeight;
      } else {
        if (!el.width || !el.height) return;
        iw = el.width;
        ih = el.height;
      }
      const bl = px(cs.borderLeftWidth) + px(cs.paddingLeft);
      const br = px(cs.borderRightWidth) + px(cs.paddingRight);
      const bt = px(cs.borderTopWidth) + px(cs.paddingTop);
      const bb = px(cs.borderBottomWidth) + px(cs.paddingBottom);
      let x = -box.w / 2 + bl;
      let y = -box.h / 2 + bt;
      let w = box.w - bl - br;
      let h = box.h - bt - bb;
      if (!(w > 0 && h > 0)) return;
      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;
      const fit = tag === 'CANVAS' ? 'fill' : cs.objectFit;
      if (fit === 'cover') ({ sx, sy, sw, sh } = coverRect(iw, ih, w, h));
      else if (fit === 'contain' || fit === 'scale-down') {
        let sc = Math.min(w / iw, h / ih);
        if (fit === 'scale-down') sc = Math.min(1, sc);
        const dw = iw * sc;
        const dh = ih * sc;
        x += (w - dw) / 2;
        y += (h - dh) / 2;
        w = dw;
        h = dh;
      }
      const rad = radiusOf(cs, box.w, box.h);
      if (rad > 0.5) {
        g.save();
        g.beginPath();
        roundRectPath(g, -box.w / 2, -box.h / 2, box.w, box.h, rad);
        g.clip();
      }
      try {
        g.drawImage(el, sx, sy, sw, sh, x, y, w, h);
        this._n.images++;
      } catch (_) {
        /* not drawable yet */
      }
      if (rad > 0.5) g.restore();
    }

    /** Absolutely positioned ::before / ::after: box (background, border, shadow, clip-path) + text content. */
    _paintPseudo(el, which, box, alpha, filter) {
      let ps;
      try {
        ps = this._win.getComputedStyle(el, which);
      } catch (_) {
        return;
      }
      const content = ps.content;
      if (!content || content === 'none' || content === 'normal') return;
      if (ps.display === 'none' || ps.visibility === 'hidden' || ps.position !== 'absolute') return;
      const op = parseFloat(ps.opacity);
      const a = alpha * (Number.isFinite(op) ? op : 1);
      if (a < 0.005) return;
      const w = parseFloat(ps.width);
      const h = parseFloat(ps.height);
      const left = parseFloat(ps.left);
      const top = parseFloat(ps.top);
      if (!(w > 0 && h > 0) || !Number.isFinite(left) || !Number.isFinite(top)) return;
      const ecs = box.cs;
      const pcx = -box.w / 2 + px(ecs.borderLeftWidth) + left + w / 2;
      const pcy = -box.h / 2 + px(ecs.borderTopWidth) + top + h / 2;
      const g = this._g;
      g.save();
      g.setTransform(...box.tf);
      g.translate(pcx, pcy);
      const lin = linearOf(ps, this._DM);
      if (lin) g.transform(lin[0], lin[1], lin[2], lin[3], 0, 0);
      g.globalAlpha = a;
      const pf = ps.filter && ps.filter !== 'none' ? (filter ? `${filter} ${ps.filter}` : ps.filter) : filter;
      setFilter(g, pf);
      if (ps.clipPath && ps.clipPath !== 'none') {
        g.beginPath();
        if (clipPathPath(g, ps.clipPath, w, h)) g.clip();
      }
      this._paintBox(g, ps, w, h, false, this._k * Math.sqrt(Math.abs(box.det)));
      const txt = textTransform(contentText(content), ps.textTransform).trim();
      if (txt) {
        g.font = `${ps.fontStyle} ${ps.fontWeight} ${ps.fontSize} ${ps.fontFamily}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = ps.color;
        g.fillText(txt, 0, 0);
        this._n.texts++;
      }
      g.restore();
    }

    /** Text nodes of `el`, each at its laid-out position (one run, or word by word when it wraps). */
    _paintTexts(el, cs, box, alpha, filter) {
      let has = false;
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
          has = true;
          break;
        }
      }
      if (!has) return;
      const textClip = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
      let grad = null;
      if (textClip && cs.backgroundImage && cs.backgroundImage !== 'none') grad = splitTopLevel(cs.backgroundImage).map(parseGradient).find(Boolean) || null;
      const fill = cs.webkitTextFillColor || cs.color;
      const noFill = isTransparent(fill) && !grad;
      const strokeW = px(cs.webkitTextStrokeWidth);
      if (noFill && !(strokeW > 0)) return;
      const g = this._g;
      g.setTransform(...box.tf);
      g.globalAlpha = alpha;
      setFilter(g, filter);
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ('letterSpacing' in g) {
        const ls = cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : '0px';
        if (g.letterSpacing !== ls) g.letterSpacing = ls;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const shadows = parseShadows(cs.textShadow).slice(0, 2);
      const s = this._k * Math.sqrt(Math.abs(box.det));
      const fillStyle = noFill ? null : grad ? (gradientStyle(g, grad, -box.w / 2, -box.h / 2, box.w, box.h) || { style: fill }).style : fill;
      const range = this._range;
      const [a, b, c, d] = box.m;
      const det = box.det;
      const draw = (text, rect) => {
        if (!text) return;
        const dx = rect.left + rect.width / 2 - box.cx;
        const dy = rect.top + rect.height / 2 - box.cy;
        const lx = (d * dx - c * dy) / det;
        const ly = (-b * dx + a * dy) / det;
        if (fillStyle) {
          g.fillStyle = fillStyle;
          if (shadows.length) {
            for (const sh of shadows) {
              applyShadow(g, sh, s);
              g.fillText(text, lx, ly);
            }
            clearShadow(g);
          } else g.fillText(text, lx, ly);
        }
        if (strokeW > 0 && !isTransparent(cs.webkitTextStrokeColor)) {
          g.lineWidth = strokeW;
          g.lineJoin = 'round';
          g.strokeStyle = cs.webkitTextStrokeColor;
          g.strokeText(text, lx, ly);
        }
        this._n.texts++;
      };
      for (const node of el.childNodes) {
        if (node.nodeType !== 3) continue;
        const raw = node.nodeValue;
        if (!raw || !raw.trim()) continue;
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        if (!rects.length) continue;
        if (rects.length === 1) {
          draw(textTransform(raw.replace(/\s+/g, ' ').trim(), cs.textTransform), rects[0]);
          continue;
        }
        const re = /\S+/g;
        let mm;
        let words = 0;
        while ((mm = re.exec(raw)) && words++ < 80) {
          range.setStart(node, mm.index);
          range.setEnd(node, mm.index + mm[0].length);
          draw(textTransform(mm[0], cs.textTransform), range.getBoundingClientRect());
        }
      }
    }

    /** Offscreen layer for the device-px rect (x, y, w, h); draws go there (offset by its origin) until _popLayer. */
    _pushLayer(x, y, w, h) {
      if (this._depth >= LAYER_MAX_DEPTH || typeof document === 'undefined') return null;
      const X = Math.max(0, Math.floor(x));
      const Y = Math.max(0, Math.floor(y));
      const lw = Math.min(this.canvas.width, Math.ceil(x + w)) - X;
      const lh = Math.min(this.canvas.height, Math.ceil(y + h)) - Y;
      if (!(lw > 0 && lh > 0)) return null;
      let L = this.layers[this._depth];
      if (!L) {
        const c = document.createElement('canvas');
        L = { canvas: c, g: c.getContext('2d') };
        this.layers[this._depth] = L;
      }
      // grow-only backing store (a resize clears it anyway); only the lw×lh corner is used
      if (L.canvas.width < lw) L.canvas.width = lw;
      if (L.canvas.height < lh) L.canvas.height = lh;
      this._depth++;
      L.g.setTransform(1, 0, 0, 1, 0, 0);
      L.g.globalCompositeOperation = 'source-over';
      L.g.globalAlpha = 1;
      setFilter(L.g, 'none');
      L.g.clearRect(0, 0, lw, lh);
      L.g.save();
      L.g.beginPath();
      L.g.rect(0, 0, lw, lh);
      L.g.clip();
      const prev = { g: this._g, ox: this._ox, oy: this._oy };
      this._g = L.g;
      this._ox = X;
      this._oy = Y;
      return { L, prev, X, Y, lw, lh };
    }

    _popLayer(layer, mask, box) {
      const lg = layer.L.g;
      lg.save();
      lg.setTransform(...box.tf);
      lg.globalAlpha = 1;
      setFilter(lg, 'none');
      clearShadow(lg);
      lg.globalCompositeOperation = 'destination-in';
      lg.beginPath();
      lg.rect(-box.w / 2, -box.h / 2, box.w, box.h);
      const st = gradientStyle(lg, mask, -box.w / 2, -box.h / 2, box.w, box.h);
      if (st) fillWith(lg, st);
      lg.restore();
      lg.restore(); // the layer clip from _pushLayer
      this._depth--;
      this._g = layer.prev.g;
      this._ox = layer.prev.ox;
      this._oy = layer.prev.oy;
      const g = this._g;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      setFilter(g, 'none');
      clearShadow(g);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(layer.L.canvas, 0, 0, layer.lw, layer.lh, layer.X - this._ox, layer.Y - this._oy, layer.lw, layer.lh);
      g.restore();
    }
  }

  // ------------------------------------------------------------------ recorder
  function isTypeSupported(m) {
    return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' ? MediaRecorder.isTypeSupported(m) : m === 'video/webm';
  }
  /**
   * Records a MediaStream with MediaRecorder – the result shape of `LiveFXSketch.record`: resolves
   * { blob, url, mimeType, bytes, ms, filename }; the promise has `.stop()` and `.recorder`. `ms` caps the length.
   */
  function record(stream, opts = {}) {
    if (typeof MediaRecorder === 'undefined') return Promise.reject(new Error('Dieser Browser kann nicht aufnehmen (MediaRecorder fehlt).'));
    const hasAudio = stream.getAudioTracks().length > 0;
    const mimeType = opts.mimeType || pickMime(opts.format || 'auto', hasAudio, isTypeSupported);
    let rec;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: Number(opts.bitrate) || BITRATE[720], audioBitsPerSecond: 128000 } : undefined);
    } catch (e) {
      return Promise.reject(e);
    }
    const chunks = [];
    const started = Date.now();
    const filename = opts.filename || `livefx-kamera-${fileStamp()}.${extFor(rec.mimeType || mimeType)}`;
    let timer = null;
    const p = new Promise((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      rec.onerror = (e) => reject((e && e.error) || new Error('Aufnahme fehlgeschlagen'));
      rec.onstop = () => {
        clearTimeout(timer);
        const full = String(rec.mimeType || mimeType || 'video/webm');
        const type = full.split(';')[0] || 'video/webm';
        const blob = new Blob(chunks, { type });
        const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
        // `codecs`: the recorder's full type (browsers fill in the codecs they really used) – for the phone check
        resolve({ blob, url, mimeType: blob.type, codecs: full, bytes: blob.size, ms: Date.now() - started, filename });
      };
      rec.start(250);
      timer = setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop();
      }, clamp(Number(opts.ms) || MAX_REC_MS, 100, MAX_REC_MS));
    });
    p.stop = () => {
      if (rec.state !== 'inactive') rec.stop();
      return p;
    };
    p.recorder = rec;
    p.mimeType = mimeType;
    return p;
  }

  // ------------------------------------------------------------------ page
  function boot() {
    const doc = document;
    const $ = (sel) => doc.querySelector(sel);
    const params = new URLSearchParams(location.search);
    const secure = !!global.isSecureContext;
    const md = global.navigator && global.navigator.mediaDevices;

    function lsGet(k) {
      try {
        return global.localStorage.getItem(k);
      } catch (_) {
        return null;
      }
    }
    function lsSet(k, v) {
      try {
        global.localStorage.setItem(k, v);
      } catch (_) {
        /* private mode */
      }
    }
    let prefs = {};
    try {
      prefs = JSON.parse(lsGet(PREFS_KEY) || '{}') || {};
    } catch (_) {
      prefs = {};
    }
    const primary = lsGet('livefx.asr.primary');
    const navLang = String((global.navigator && global.navigator.language) || 'de').toLowerCase();
    const pinnedStyle = params.get('storystyle');
    const state = {
      aspect: normAspect(params.get('aspect') || prefs.aspect),
      res: normRes(params.get('res') || prefs.res),
      mirror: params.has('mirror') ? params.get('mirror') !== '0' : prefs.mirror !== false,
      deviceId: params.get('cam') || prefs.deviceId || '',
      micId: prefs.micId || '',
      format: FORMATS.includes(prefs.format) ? prefs.format : 'auto',
      recMode: REC_MODES.includes(prefs.recMode) ? prefs.recMode : 'canvas',
      recMic: prefs.recMic !== false,
      recFx: prefs.recFx !== false,
      sound: params.get('mute') === '1' ? false : prefs.sound !== false,
      clean: params.get('clean') === '1',
      storyStyle: STORY_STYLES.includes(pinnedStyle) ? pinnedStyle : STORY_STYLES.includes(prefs.storyStyle) ? prefs.storyStyle : '',
      studioLang: LANGS.includes(params.get('lang')) ? params.get('lang') : LANGS.includes(prefs.studioLang) ? prefs.studioLang : LANGS.includes(primary) ? primary : navLang.startsWith('tr') ? 'tr-TR' : navLang.startsWith('en') ? 'en-US' : 'de-DE',
      studioStory: prefs.studioStory !== false,
      camera: 'starting',
      cameraError: '',
    };
    function savePrefs() {
      const { aspect, res, mirror, deviceId, micId, format, recMode, recMic, recFx, storyStyle, studioLang, studioStory } = state;
      const out = { aspect, res, mirror, deviceId, micId, format, recMode, recMic, recFx, storyStyle, studioLang, studioStory };
      // 2.3: „Ohne Kamera“ and a URL-pinned story style (e.g. the panel's „✏️ Zeichenfilm“ link) last for this page
      // only – the next plain camera.html opens the webcam / the remembered style again.
      if (deviceId === NO_CAM) out.deviceId = prefs.deviceId && prefs.deviceId !== NO_CAM ? prefs.deviceId : '';
      if (STORY_STYLES.includes(pinnedStyle)) out.storyStyle = STORY_STYLES.includes(prefs.storyStyle) ? prefs.storyStyle : '';
      if (params.get('mute') !== '1') out.sound = state.sound;
      else if (typeof prefs.sound === 'boolean') out.sound = prefs.sound;
      prefs = { ...prefs, ...out };
      lsSet(PREFS_KEY, JSON.stringify(out));
    }

    const view = $('#view');
    const frame = $('#frame');
    const video = $('#cam');
    const iframe = $('#fx');
    const bar = $('#bar');
    const camOff = $('#cam-off');
    let stream = null;
    let cameras = [];
    let mics = [];
    const compositor = new Compositor({ video, frame: iframe, mirror: () => state.mirror });

    // ---------- hints / status ----------
    let hintTimer = null;
    function reflectMsg() {
      const idle = $('#idle');
      if (idle) idle.hidden = !$('#hint').hidden || !$('#transcript').hidden;
    }
    function hint(text, { sticky = false } = {}) {
      const el = $('#hint');
      if (!el) return;
      clearTimeout(hintTimer);
      el.textContent = text || '';
      el.title = text || '';
      el.hidden = !text;
      if (text && !sticky) {
        hintTimer = setTimeout(() => {
          el.hidden = true;
          reflectMsg();
        }, 7000);
      }
      reflectMsg();
    }

    // ---------- layout ----------
    function fit() {
      const barH = state.clean ? 0 : bar.offsetHeight;
      doc.documentElement.style.setProperty('--bar-h', `${barH}px`);
      const { width, height } = outputSize(state.aspect, state.res);
      const f = fitBox(view.clientWidth || global.innerWidth, view.clientHeight || global.innerHeight - barH, width, height);
      frame.style.transform = `translate(${f.x}px, ${f.y}px) scale(${f.scale})`;
    }
    function applyFrame() {
      const { width, height } = outputSize(state.aspect, state.res);
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      frame.dataset.aspect = state.aspect;
      compositor.resize(width, height);
      $('#btn-aspect').textContent = state.aspect;
      $('#btn-aspect').title = state.aspect === '9:16' ? 'Hochkant 9:16 – klicken für quer 16:9' : 'Quer 16:9 – klicken für hochkant 9:16';
      fit();
    }
    function reflectMirror() {
      video.classList.toggle('mirror', state.mirror);
      $('#btn-mirror').setAttribute('aria-pressed', String(state.mirror));
    }
    function setClean(on) {
      state.clean = !!on;
      doc.body.classList.toggle('clean', state.clean);
      fit();
      return state.clean;
    }

    // ---------- overlay iframe ----------
    function overlayWin() {
      try {
        return iframe.contentWindow || null;
      } catch (_) {
        return null;
      }
    }
    function overlayApi() {
      const w = overlayWin();
      return (w && w.livefx) || null;
    }
    let iframeLoaded = null;
    function loadOverlay() {
      const src = overlaySrc(location.search, state.aspect, { storystyle: state.storyStyle || (pinnedStyle && STORY_STYLES.includes(pinnedStyle) ? pinnedStyle : null) });
      iframeLoaded = new Promise((resolve) => {
        const done = () => {
          iframe.removeEventListener('load', done);
          resolve();
        };
        iframe.addEventListener('load', done);
        setTimeout(done, 8000);
      });
      monitor.ctx = null;
      iframe.src = src;
      return iframeLoaded;
    }
    /** Portrait / landscape without a reload: the overlay's body class + a re-layout (its window resizes too). */
    function applyOverlayAspect() {
      const w = overlayWin();
      const d = w && w.document;
      if (!d || !d.body) return;
      d.body.classList.toggle('layout-portrait', state.aspect === '9:16');
      const r = overlayApi() && overlayApi().renderer;
      if (r) {
        try {
          if (typeof r.refreshLayout === 'function') r.refreshLayout();
          else if (typeof r.setLayout === 'function') r.setLayout({});
        } catch (_) {
          /* older overlay */
        }
      }
    }

    // monitor = the effect sounds on this computer's speakers (the recording tap is independent of it)
    const monitor = { ctx: null, node: null, out: null, on: true };
    function overlayMixer() {
      const w = overlayWin();
      const lf = w && w.livefx;
      const r = lf && lf.renderer;
      if (!r) return null;
      let mixer = null;
      try {
        if (typeof r._mixerReady === 'function') mixer = r._mixerReady();
      } catch (_) {
        mixer = null;
      }
      if (!mixer) {
        const S = w.LiveFXSounds;
        mixer = S && S.mixer;
        if (mixer && !mixer.ctx && typeof r.ensureAudio === 'function' && typeof mixer.init === 'function') {
          const ctx = r.ensureAudio();
          if (ctx) mixer.init(ctx);
        }
      }
      if (!mixer || !mixer.ctx) return null;
      const node = mixer.limiter || mixer.master;
      return node ? { ctx: mixer.ctx, node, out: mixer.out || mixer.ctx.destination } : null;
    }
    function applyMonitor() {
      $('#btn-sound').setAttribute('aria-pressed', String(state.sound));
      $('#btn-sound').textContent = state.sound ? '🔊' : '🔇';
      if (state.sound && !monitor.ctx) return; // nothing muted yet – leave the overlay alone
      const mx = overlayMixer();
      if (!mx) return;
      if (monitor.ctx !== mx.ctx || monitor.node !== mx.node) {
        monitor.ctx = mx.ctx;
        monitor.node = mx.node;
        monitor.out = mx.out;
        monitor.on = true; // a fresh mixer is connected to its output
      }
      if (state.sound === monitor.on) return;
      try {
        if (state.sound) mx.node.connect(mx.out);
        else mx.node.disconnect(mx.out);
        monitor.on = state.sound;
      } catch (_) {
        monitor.on = state.sound;
      }
    }
    function setSound(on) {
      state.sound = !!on;
      savePrefs();
      applyMonitor();
      return state.sound;
    }
    function pollOverlay() {
      const lf = overlayApi();
      const dot = $('#dot');
      dot.classList.remove('on', 'warn', 'err');
      let text;
      if (!lf) {
        dot.classList.add('warn');
        text = 'Overlay lädt …';
      } else {
        const s = lf.bus && typeof lf.bus.status === 'function' ? lf.bus.status() : {};
        if (s.authError) {
          dot.classList.add('err');
          text = 'Overlay: nicht angemeldet';
        } else if (s.sse === 'open') {
          dot.classList.add('on');
          text = 'Overlay verbunden';
        } else if (lf.bus && lf.bus.serverBase === null) {
          dot.classList.add('warn');
          text = 'ohne Server (nur dieses Fenster)';
        } else {
          dot.classList.add('warn');
          text = 'Overlay verbindet …';
        }
      }
      if (rec) text = `● Aufnahme ${formatTime(Date.now() - rec.started)} · ${text}`;
      if (state.camera === 'error') text = `Kamera aus · ${text}`;
      else if (state.camera === 'off') text = `ohne Kamera · ${text}`;
      $('#status').textContent = text;
      dot.title = text;
      applyMonitor();
    }

    // ---------- camera ----------
    function showCamOff(text) {
      camOff.hidden = !text;
      $('#cam-off-text').textContent = text || '';
    }
    function stopCamera() {
      if (stream) for (const t of stream.getTracks()) t.stop();
      stream = null;
      video.srcObject = null;
    }
    async function startCamera() {
      stopCamera();
      state.camera = 'starting';
      showCamOff('');
      frame.classList.toggle('no-cam', state.deviceId === NO_CAM);
      if (state.deviceId === NO_CAM) {
        // „Ohne Kamera“: nothing to open – the board background (css .cam-frame, painted the same by the compositor)
        state.camera = 'off';
        state.cameraError = '';
        savePrefs();
        pollOverlay();
        await refreshDevices();
        return true;
      }
      if (!md || typeof md.getUserMedia !== 'function') {
        state.camera = 'error';
        state.cameraError = cameraErrorText({ name: 'NotSupportedError' }, secure ? undefined : false);
        if (secure) state.cameraError = 'Dieser Browser gibt keine Kamera frei – Chrome, Edge, Firefox oder Safari nutzen.';
        showCamOff(state.cameraError);
        return false;
      }
      const { width, height } = outputSize(state.aspect, state.res);
      const long = Math.max(width, height);
      const short = Math.min(width, height);
      const coarse = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
      // Phones film portrait natively; desktop webcams are landscape and get cropped (cover) – no upscaled crop.
      const portraitCam = coarse && state.aspect === '9:16';
      const v = { width: { ideal: portraitCam ? short : long }, height: { ideal: portraitCam ? long : short }, frameRate: { ideal: FPS } };
      if (state.deviceId) v.deviceId = { exact: state.deviceId };
      else v.facingMode = 'user';
      try {
        stream = await md.getUserMedia({ video: v, audio: false });
      } catch (e) {
        if (state.deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
          state.deviceId = '';
          return startCamera();
        }
        state.camera = 'error';
        state.cameraError = cameraErrorText(e);
        showCamOff(state.cameraError);
        refreshDevices();
        return false;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch (_) {
        /* autoplay muted – plays on its own */
      }
      const track = stream.getVideoTracks()[0];
      const set = track && typeof track.getSettings === 'function' ? track.getSettings() : {};
      if (set.deviceId) state.deviceId = set.deviceId;
      if (track) {
        track.addEventListener('ended', () => {
          if (stream && stream.getVideoTracks()[0] === track) {
            state.camera = 'error';
            state.cameraError = 'Kamera getrennt – wieder anschließen und „Erneut versuchen“.';
            showCamOff(state.cameraError);
          }
        });
      }
      state.camera = 'on';
      state.cameraError = '';
      savePrefs();
      pollOverlay();
      await refreshDevices();
      return true;
    }
    async function refreshDevices() {
      if (!md || typeof md.enumerateDevices !== 'function') return [];
      let list = [];
      try {
        list = await md.enumerateDevices();
      } catch (_) {
        list = [];
      }
      cameras = list.filter((d) => d.kind === 'videoinput');
      mics = list.filter((d) => d.kind === 'audioinput');
      const fill = (sel, items, current, word, empty) => {
        sel.textContent = '';
        if (!items.length) {
          const o = doc.createElement('option');
          o.value = '';
          o.textContent = empty;
          sel.appendChild(o);
          return;
        }
        items.forEach((d, i) => {
          const o = doc.createElement('option');
          o.value = d.deviceId || '';
          o.textContent = d.label || `${word} ${i + 1}`;
          sel.appendChild(o);
        });
        if (current && items.some((d) => d.deviceId === current)) sel.value = current;
      };
      const camSel = $('#cam-device');
      fill(camSel, cameras, state.deviceId, 'Kamera', 'keine Kamera');
      const noCam = doc.createElement('option');
      noCam.value = NO_CAM;
      noCam.textContent = '🎨 Ohne Kamera';
      camSel.appendChild(noCam);
      if (state.deviceId === NO_CAM) camSel.value = NO_CAM;
      const micSel = $('#mic-device');
      fill(micSel, mics, state.micId, 'Mikrofon', 'Standard-Mikrofon');
      if (mics.length && !mics.some((d) => d.deviceId === state.micId)) micSel.value = mics[0].deviceId;
      return cameras.map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));
    }
    function setDevice(id) {
      state.deviceId = String(id || '');
      savePrefs();
      return startCamera();
    }
    function setMirror(on) {
      state.mirror = !!on;
      reflectMirror();
      savePrefs();
      return state.mirror;
    }
    function setAspect(a) {
      const next = normAspect(a);
      if (next === state.aspect) return state.aspect;
      state.aspect = next;
      savePrefs();
      applyFrame();
      applyOverlayAspect();
      if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) startCamera(); // phone: native orientation
      return state.aspect;
    }
    function setRes(r) {
      state.res = normRes(r);
      $('#res').value = String(state.res);
      savePrefs();
      applyFrame();
      return state.res;
    }
    function setStoryStyle(s) {
      state.storyStyle = STORY_STYLES.includes(s) ? s : '';
      $('#story-style').value = state.storyStyle;
      savePrefs();
      return loadOverlay().then(() => state.storyStyle);
    }

    // ---------- recording ----------
    let rec = null;
    let lastRecording = null;
    let recTicker = null;
    let lastUrl = '';

    /**
     * One audio track for the recording: microphone + effect sounds. Canvas mode taps the overlay mixer inside the
     * overlay's AudioContext; tab mode prefers the captured tab audio (`tabAudio`, has every sound of the page incl.
     * uploaded files) mixed with the microphone here.
     */
    async function buildAudio(withMic, withFx, tabAudio) {
      const out = { stream: null, cleanup: [], mic: false, fx: false };
      let mic = null;
      if (withMic && md && typeof md.getUserMedia === 'function') {
        try {
          const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
          if (state.micId) audio.deviceId = { ideal: state.micId };
          mic = await md.getUserMedia({ audio, video: false });
          out.cleanup.push(() => mic.getTracks().forEach((t) => t.stop()));
          out.mic = true;
        } catch (e) {
          hint(`🎤 Mikro nicht verfügbar (${e.name || e.message}) – Aufnahme ohne Mikro.`);
        }
      }
      const tabTracks = withFx && tabAudio ? tabAudio.getAudioTracks() : [];
      if (tabTracks.length) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!mic || !AC) {
          out.stream = new MediaStream(tabTracks);
          out.fx = true;
          return out;
        }
        try {
          const ctx = new AC();
          const dest = ctx.createMediaStreamDestination();
          ctx.createMediaStreamSource(new MediaStream(tabTracks)).connect(dest);
          ctx.createMediaStreamSource(mic).connect(dest);
          out.cleanup.push(() => ctx.close().catch(() => {}));
          out.stream = dest.stream;
          out.fx = true;
          return out;
        } catch (_) {
          /* fall through to the mixer tap */
        }
      }
      const mx = withFx ? overlayMixer() : null;
      if (mx) {
        try {
          const ctx = mx.ctx;
          if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume().catch(() => {});
          const dest = ctx.createMediaStreamDestination();
          mx.node.connect(dest);
          out.cleanup.push(() => {
            try {
              mx.node.disconnect(dest);
            } catch (_) {
              /* already gone */
            }
          });
          if (mic) {
            const src = ctx.createMediaStreamSource(mic);
            src.connect(dest);
            out.cleanup.push(() => src.disconnect());
          }
          out.stream = dest.stream;
          out.fx = true;
          return out;
        } catch (_) {
          /* fall back to the microphone alone */
        }
      }
      out.stream = mic;
      return out;
    }

    /**
     * Counts the frames a capture track really delivers, through a hidden muted <video> sink (Chrome only produces tab
     * frames while something consumes them, so the probe stays attached until the recorder runs – `close()`).
     * `wait(n, ms)` resolves true once `n` more frames arrived, false after `ms`. Needed because a capture target the
     * browser cannot honour does not fail: Chrome's restrictTo() on an ineligible element resolves, only logs „Element
     * is not eligible for restriction“ and then sends no frames at all (a recording of it has sound but no picture),
     * and a cropTo() can stall after a single frame. Hence several frames, not just one.
     */
    function frameProbe(track) {
      const v = doc.createElement('video');
      v.muted = true;
      v.playsInline = true;
      let frames = 0;
      let closed = false;
      const waiters = new Set();
      const tick = () => {
        frames++;
        for (const w of [...waiters]) w(false);
      };
      try {
        v.srcObject = new MediaStream([track]);
      } catch (_) {
        closed = true;
      }
      if (!closed) {
        if (typeof v.requestVideoFrameCallback === 'function') {
          const cb = (t, meta) => {
            if (closed) return;
            if (!meta || meta.width > 0) tick();
            v.requestVideoFrameCallback(cb);
          };
          v.requestVideoFrameCallback(cb);
        } else {
          v.addEventListener('timeupdate', () => v.videoWidth > 0 && tick()); // no rVFC: ~4 per second while playing
        }
        const pr = v.play();
        if (pr && typeof pr.catch === 'function') pr.catch(() => {});
      }
      return {
        wait(n, ms) {
          if (closed) return Promise.resolve(false);
          const from = frames;
          return new Promise((resolve) => {
            let timer = null;
            const check = (abort) => {
              if (!abort && frames - from < n) return;
              waiters.delete(check);
              clearTimeout(timer);
              resolve(!abort);
            };
            waiters.add(check);
            timer = setTimeout(() => check(true), ms);
          });
        },
        close() {
          if (closed) return;
          closed = true;
          for (const w of [...waiters]) w(true);
          try {
            v.pause();
          } catch (_) {
            /* ignore */
          }
          v.srcObject = null;
        },
      };
    }
    /** Rejects when `p` has not settled after `ms` (a cropTo / restrictTo on a stalled track never does). */
    function within(p, ms) {
      let timer = null;
      return Promise.race([Promise.resolve(p), new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), ms)))]).finally(() => clearTimeout(timer));
    }

    /**
     * „Pixelgenau“: captures this tab and narrows it to the picture (#frame). Each way must deliver real frames before
     * the recorder starts, the next one is tried otherwise:
     *   1. restrict – RestrictionTarget / restrictTo (Element Capture, Chrome 132+): only the frame's own pixels, nothing
     *                 painted over it. Needs #frame to be a backdrop root: `.capture-target` (opacity 0.999,
     *                 css/camera.css) meanwhile – without it Chrome sends no frames at all.
     *   2. crop     – CropTarget / cropTo (Chrome 104+): the frame's rectangle of the tab
     *   3. tab      – the whole tab (the toolbar below the picture is in the video then)
     * Resolves { stream, target: 'restrict' | 'crop' | 'tab', settle(), release() } – settle() once the recorder runs
     * (drops the probe sink), release() when the recording ended; rejects when no way delivers a picture.
     */
    async function tabCapture(withAudio) {
      if (!md || typeof md.getDisplayMedia !== 'function') throw new Error('Tab-Aufnahme gibt es nur in Chrome / Edge am PC.');
      const ds = await md.getDisplayMedia({
        video: { frameRate: FPS, displaySurface: 'browser' },
        audio: withAudio ? { suppressLocalAudioPlayback: false } : false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      });
      const stopAll = () => ds.getTracks().forEach((t) => t.stop());
      const track = ds.getVideoTracks()[0];
      if (!track) {
        stopAll();
        throw new Error('der Tab liefert kein Bild');
      }
      const unmark = () => frame.classList.remove('capture-target');
      const ways = [];
      if (global.RestrictionTarget && typeof track.restrictTo === 'function') {
        ways.push({
          target: 'restrict',
          on: async () => {
            frame.classList.add('capture-target');
            await track.restrictTo(await global.RestrictionTarget.fromElement(frame));
          },
          off: () => track.restrictTo(null),
        });
      }
      if (global.CropTarget && typeof track.cropTo === 'function') {
        ways.push({ target: 'crop', on: async () => track.cropTo(await global.CropTarget.fromElement(frame)), off: () => track.cropTo(null) });
      }
      ways.push({ target: 'tab', on: () => null, off: () => null });
      const probe = frameProbe(track);
      for (const way of ways) {
        let ok = false;
        try {
          await within(way.on(), TAB_STEP_MS);
          ok = await probe.wait(TAB_PROBE_FRAMES, TAB_PROBE_MS);
        } catch (_) {
          ok = false;
        }
        if (ok) {
          const release = () => {
            probe.close();
            if (way.target === 'restrict') unmark();
          };
          return { stream: ds, target: way.target, settle: () => probe.close(), release };
        }
        try {
          await within(way.off(), TAB_STEP_MS);
        } catch (_) {
          /* next way */
        }
        unmark();
        if (track.readyState === 'ended') break;
      }
      probe.close();
      stopAll();
      unmark();
      throw new Error('vom Tab kommt kein Bild');
    }

    function sketchRecorder() {
      const w = overlayWin();
      const SK = (w && w.LiveFXSketch) || global.LiveFXSketch;
      return SK && typeof SK.record === 'function' ? SK.record.bind(SK) : null;
    }

    function reflectRec() {
      const b = $('#btn-rec');
      b.classList.toggle('on', !!rec);
      b.textContent = rec ? `⏹ ${formatTime(Date.now() - rec.started)}` : '⏺ Aufnahme';
      b.title = rec ? 'Aufnahme stoppen (Taste R)' : 'Aufnahme starten (Taste R)';
      for (const id of ['#res', '#format', '#rec-mode', '#story-style', '#btn-aspect']) {
        const el = $(id);
        if (el) el.disabled = !!rec;
      }
    }

    let starting = null;
    let stopWanted = false;
    /**
     * Starts a recording (one at a time). Resolves with the result `{blob, url, mimeType, bytes, ms, filename}` once it
     * ends (stop, length cap) – or null when it failed (the reason is shown as a hint). Never rejects.
     */
    function startRecording(opts = {}) {
      if (rec) return rec.done;
      if (starting) return starting.then((r) => (r ? r.done : null));
      stopWanted = false;
      starting = beginRecording(opts).catch((e) => {
        hint(`❌ Aufnahme startet nicht: ${(e && (e.message || e.name)) || e}`, { sticky: true });
        return null;
      });
      const s = starting;
      s.then(() => {
        if (starting === s) starting = null;
      });
      return s.then((r) => (r ? r.done : null));
    }

    async function beginRecording(opts) {
      const format = FORMATS.includes(opts.format) ? opts.format : state.format;
      let mode = REC_MODES.includes(opts.mode) ? opts.mode : state.recMode;
      const withMic = opts.mic !== undefined ? !!opts.mic : state.recMic;
      const withFx = opts.fx !== undefined ? !!opts.fx : state.recFx;
      const bitrate = BITRATE[state.res];
      const ms = clamp(Number(opts.ms) || MAX_REC_MS, 100, MAX_REC_MS);
      let display = null;
      let target = '';
      let release = null;
      let settle = null;
      let note = '';
      if (mode === 'tab') {
        // first, while the click still counts as a user gesture (getDisplayMedia needs one)
        hint('Pixelgenau: prüfe die Tab-Aufnahme …');
        try {
          const cap = await tabCapture(withFx);
          display = cap.stream;
          target = cap.target;
          release = cap.release;
          settle = cap.settle;
          note = target === 'tab' ? ' · Pixelgenau: ganzer Tab (Leiste mit im Video – Taste H blendet sie aus)' : ' · Pixelgenau';
        } catch (e) {
          note = ` · Pixelgenau nicht möglich (${e.message || e.name}) – Leinwand`;
          mode = 'canvas';
        }
      }
      const audio = await buildAudio(withMic, withFx, display);
      if (release) audio.cleanup.push(release);
      if (display) audio.cleanup.push(() => display.getTracks().forEach((t) => t.stop()));
      const aTracks = audio.stream ? audio.stream.getAudioTracks() : [];
      const mime = pickMime(format, aTracks.length > 0, isTypeSupported);
      const filename = `livefx-kamera-${fileStamp()}.${extFor(mime)}`;
      let p;
      let via = 'camera';
      try {
        if (mode === 'tab' && display) {
          p = record(new MediaStream([...display.getVideoTracks(), ...aTracks]), { mimeType: mime, ms, bitrate, filename });
        } else {
          compositor.start(FPS);
          const SK = sketchRecorder();
          if (SK && /^video\/webm/.test(mime) && opts.own !== true) {
            // same contract, WebM only (its blob type is always video/webm)
            p = SK({ canvas: compositor.canvas, audio: audio.stream, ms, fps: FPS, download: false, mimeType: mime, filename, bitrate });
            via = 'sketch';
          } else {
            const vs = compositor.canvas.captureStream(FPS);
            p = record(new MediaStream([...vs.getVideoTracks(), ...aTracks]), { mimeType: mime, ms, bitrate, filename });
            audio.cleanup.push(() => vs.getTracks().forEach((t) => t.stop()));
          }
        }
      } catch (e) {
        p = Promise.reject(e);
      }
      // the recorder is a sink of the capture track now – the probe sink can go once it runs
      if (settle) setTimeout(settle, 1000);
      const r = { p, done: null, started: Date.now(), mode, mime, audio, via, target };
      rec = r;
      if (mode === 'tab' && display) {
        // Chrome's „Freigabe beenden“ bar ends the capture track: end the file there instead of recording no picture
        const vt = display.getVideoTracks()[0];
        const onEnded = () => {
          if (rec === r) stopRecording();
        };
        if (vt) {
          vt.addEventListener('ended', onEnded, { once: true });
          audio.cleanup.push(() => vt.removeEventListener('ended', onEnded));
          if (vt.readyState === 'ended') stopWanted = true;
        }
      }
      reflectRec();
      clearInterval(recTicker);
      recTicker = setInterval(() => {
        reflectRec();
        pollOverlay();
      }, 500);
      const finish = () => {
        if (rec === r) rec = null;
        clearInterval(recTicker);
        hint('');
        if (mode !== 'tab') compositor.stop();
        for (const fn of audio.cleanup) {
          try {
            fn();
          } catch (_) {
            /* ignore */
          }
        }
        reflectRec();
        pollOverlay();
      };
      const result = Promise.resolve(p).then(adoptResult);
      result.then(
        (res) => {
          finish();
          showResult(res, r);
        },
        (e) => {
          finish();
          hint(`❌ Aufnahme fehlgeschlagen: ${(e && (e.message || e.name)) || e}`, { sticky: true });
        }
      );
      // registered after the handler above, so `lastRecording` is set when a caller's await resumes
      r.done = result.then(
        (res) => res,
        () => null
      );
      hint(`⏺ Aufnahme läuft${audio.mic ? ' · Mikro' : ''}${audio.fx ? ' · Effekt-Sounds' : ''}${note} – ⏹ zum Beenden.`);
      if (stopWanted) {
        stopWanted = false;
        stopRecording();
      }
      return r;
    }

    /**
     * A WebM made by the overlay's `LiveFXSketch.record` lives in the iframe's realm: its Blob fails `instanceof Blob`
     * here and its blob: URL dies as soon as the overlay reloads (Story-Stil switch) – the download link would break.
     * Copies it into this page (no re-encode, the bytes are shared).
     */
    function adoptResult(res) {
      if (!res || !res.blob || res.blob instanceof Blob) return res;
      const blob = new Blob([res.blob], { type: res.blob.type || res.mimeType || 'video/webm' });
      const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : res.url;
      try {
        const w = overlayWin();
        if (res.url && url !== res.url && w && w.URL) w.URL.revokeObjectURL(res.url);
      } catch (_) {
        /* overlay gone – its URL went with it */
      }
      return { ...res, blob, url, bytes: blob.size };
    }

    /** Ends the running recording (or the one still starting); resolves with its result (null on failure). */
    function stopRecording() {
      if (!rec) {
        if (starting) {
          stopWanted = true;
          return starting.then((r) => (r ? r.done : null));
        }
        return Promise.resolve(lastRecording);
      }
      const r = rec;
      try {
        if (r.p && typeof r.p.stop === 'function') r.p.stop();
      } catch (_) {
        /* already stopped */
      }
      return r.done || Promise.resolve(null);
    }

    function showResult(res, r) {
      if (!res) return;
      if (lastUrl && lastUrl !== res.url && URL.revokeObjectURL) URL.revokeObjectURL(lastUrl);
      lastUrl = res.url;
      lastRecording = { ...res, mode: r.mode, via: r.via, target: r.target || '' };
      const ext = extFor(res.mimeType);
      const baseType = String(res.mimeType || '').split(';')[0] || `video/${ext}`;
      const box = $('#rec-result');
      $('#rec-video').src = res.url;
      const dl = $('#rec-download');
      dl.href = res.url;
      dl.download = res.filename;
      const mb = (res.bytes / 1e6).toFixed(res.bytes < 1e7 ? 1 : 0);
      // the recorder's real codecs where it reports them (an MP4 can hold VP9 on Chromium/Linux)
      const safe = phoneSafe(res.codecs || r.mime || res.mimeType);
      let warn = '';
      if (ext === 'webm') warn = ' – WhatsApp / iPhone spielen WebM oft nicht ab: am besten in Chrome/Edge unter Windows / macOS oder in Safari aufnehmen (dort wird es MP4/H.264) oder umwandeln.';
      else if (!safe) warn = ' – dieses MP4 enthält kein H.264 (Browser ohne H.264-Encoder): iPhone / WhatsApp spielen es evtl. nicht ab – umwandeln oder in Chrome/Edge unter Windows / macOS bzw. Safari aufnehmen.';
      $('#rec-info').textContent = `${formatTime(res.ms)} · ${mb} MB · ${ext.toUpperCase()}${ext === 'mp4' && safe ? ' (H.264)' : ''}${warn}`;
      const share = $('#rec-share');
      let file = null;
      try {
        file = typeof File === 'function' ? new File([res.blob], res.filename, { type: baseType }) : null;
      } catch (_) {
        file = null;
      }
      const nav = global.navigator;
      share.hidden = !(file && nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }));
      share.onclick = () => nav.share({ files: [file], title: 'LiveFX', text: 'Mit LiveFX aufgenommen' }).catch(() => {});
      box.hidden = false;
      try {
        dl.focus();
      } catch (_) {
        /* ignore */
      }
    }

    // ---------- Live-Mikro (studio) ----------
    const scriptLoads = new Map();
    function loadScript(src) {
      if (scriptLoads.has(src)) return scriptLoads.get(src);
      const pr = new Promise((resolve, reject) => {
        const s = doc.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`${src} lädt nicht`));
        doc.head.appendChild(s);
      });
      scriptLoads.set(src, pr);
      return pr;
    }
    const studio = {
      state: 'off',
      bus: null,
      matcher: null,
      asr: null,
      triggers: [],
      wanted: false,
      _lastLine: '',
      async prepare() {
        for (const src of STUDIO_SCRIPTS) await loadScript(src);
        if (!this.bus) {
          this.bus = new global.LiveFXBus.Bus({ role: 'panel' });
          if (global.LiveFXStore && typeof global.LiveFXStore.attachBus === 'function') global.LiveFXStore.attachBus(this.bus);
          if (global.LiveFXStore && typeof global.LiveFXStore.onRemoteChange === 'function') global.LiveFXStore.onRemoteChange(() => this.reload().then(() => hint('🔄 Trigger aktualisiert')));
        }
        if (!this.matcher) await this.reload();
        return this;
      },
      async reload() {
        const r = await global.LiveFXStore.load();
        this.triggers = (r && r.triggers) || [];
        if (this.matcher && this._lang === state.studioLang) this.matcher.setTriggers(this.triggers);
        else this._makeMatcher();
        return this.triggers.length;
      },
      _makeMatcher() {
        this._lang = state.studioLang;
        this.matcher = new global.LiveFXMatcher.Matcher(this.triggers, { globalMinGap: 1.2, tolerance: 'medium', lang: state.studioLang });
        if (typeof this.matcher.setPhonetic === 'function') {
          try {
            this.matcher.setPhonetic(state.studioLang);
          } catch (_) {
            /* phonetics optional */
          }
        }
      },
      handleText(text, isFinal) {
        const str = String(text == null ? '' : text);
        if (!this.matcher || !this.bus) return 0;
        let hits = [];
        try {
          hits = this.matcher.process(str) || [];
        } catch (e) {
          if (global.console) console.warn('LiveFX matcher failed', e);
        }
        const S = global.LiveFXSchema;
        const max = (S && S.LIMITS && S.LIMITS.sourceLen) || 80;
        for (const h of hits) {
          const t = {};
          for (const k of Object.keys(h.trigger || {})) if (!k.startsWith('_')) t[k] = h.trigger[k];
          this.bus.send({ type: 'fire', trigger: t, source: `${SOURCE} „${String(h.spoken || h.keyword).slice(0, 40)}“`.slice(0, max) });
        }
        if (isFinal && typeof this.matcher.endUtterance === 'function') this.matcher.endUtterance();
        if (state.studioStory) this.sendStory(str, isFinal);
        showTranscript(str, !!isFinal, hits.map((h) => h.spoken || h.keyword));
        return hits.length;
      },
      sendStory(text, isFinal) {
        const line = String(text || '').trim();
        if (!line || !this.bus) return;
        if (!isFinal && line === this._lastLine) return;
        this._lastLine = isFinal ? '' : line;
        const S = global.LiveFXSchema;
        const msg = { type: 'story', text: line.slice(0, (S && S.LIMITS && S.LIMITS.storyText) || 500), final: !!isFinal };
        const fam = familyOf(state.studioLang);
        if (fam) msg.lang = fam;
        this.bus.send(msg);
      },
      async start() {
        if (!secure) {
          hint('🎙️ Live-Mikro braucht HTTPS (oder localhost) – am Handy den Internet-Link aus dem Panel nutzen.', { sticky: true });
          return false;
        }
        try {
          await this.prepare();
        } catch (e) {
          hint(`🎙️ Live-Mikro lädt nicht: ${e.message}`, { sticky: true });
          return false;
        }
        const A = global.LiveFXASR;
        const ok = A && Array.isArray(A.backends) && A.backends.some((b) => b.name === 'webspeech' && b.supported);
        if (!ok) {
          hint('🎙️ Dieser Browser hat keine Spracherkennung – Chrome / Edge (PC, Android) oder Safari (iPhone) nutzen.', { sticky: true });
          return false;
        }
        if (this._lang !== state.studioLang) this._makeMatcher();
        if (this.asr) {
          try {
            this.asr.stop();
          } catch (_) {
            /* ignore */
          }
        }
        this.asr = A.create('webspeech', {
          lang: state.studioLang,
          bus: this.bus,
          alternatives: false,
          onText: (t, f) => this.handleText(t, f),
          onState: (st) => {
            this.state = st;
            reflectStudio();
          },
          onError: (err) => hint(`${err.fatal ? '❌' : '⚠️'} Live-Mikro: ${err.message || err.code}`, { sticky: !!err.fatal }),
        });
        this.wanted = true;
        this.asr.start();
        reflectStudio();
        hint(`🎙️ Live-Mikro an (${state.studioLang}) – Stichwörter feuern Effekte${state.studioStory ? ', Sätze bauen die Live-Story' : ''}. Nicht gleichzeitig im Panel das Mikro laufen lassen.`);
        return true;
      },
      stop() {
        this.wanted = false;
        if (this.asr) {
          try {
            this.asr.stop();
          } catch (_) {
            /* ignore */
          }
        }
        this.state = 'off';
        reflectStudio();
      },
    };
    function reflectStudio() {
      const b = $('#btn-studio');
      const on = studio.wanted && studio.state !== 'error';
      b.classList.toggle('on', on);
      b.textContent = on ? (studio.state === 'listening' ? '🎙️ hört zu' : '🎙️ startet …') : '🎙️ Live-Mikro';
    }
    let transcriptTimer = null;
    function showTranscript(text, isFinal, marks) {
      const el = $('#transcript');
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      let html = esc(String(text).slice(-160));
      for (const kw of marks || []) {
        const k = esc(String(kw || '').trim());
        if (!k) continue;
        html = html.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), (m) => `<mark>${m}</mark>`);
      }
      el.innerHTML = isFinal ? html : `<span class="interim">${html}</span>`;
      el.hidden = false;
      reflectMsg();
      clearTimeout(transcriptTimer);
      transcriptTimer = setTimeout(() => {
        el.hidden = true;
        reflectMsg();
      }, 8000);
    }

    // ---------- controls ----------
    function toggleFullscreen() {
      const d = doc;
      try {
        if (d.fullscreenElement) d.exitFullscreen();
        else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
      } catch (_) {
        /* not allowed */
      }
    }
    function openOutput() {
      const { width, height } = outputSize(state.aspect, state.res);
      const sw = (global.screen && global.screen.availWidth) || width;
      const sh = (global.screen && global.screen.availHeight) || height;
      const sc = Math.min(1, (sw * 0.9) / width, (sh * 0.9) / height);
      const u = new URL(location.href);
      for (const k of ['record', 'mic']) u.searchParams.delete(k);
      u.searchParams.set('clean', '1');
      u.searchParams.set('mute', '1'); // the sounds already play in this window
      u.searchParams.set('aspect', state.aspect);
      u.searchParams.set('res', String(state.res));
      u.searchParams.set('mirror', state.mirror ? '1' : '0');
      if (state.deviceId) u.searchParams.set('cam', state.deviceId);
      if (state.storyStyle) u.searchParams.set('storystyle', state.storyStyle);
      const w = global.open(u.href, 'livefx-camera-output', `popup=yes,width=${Math.round(width * sc)},height=${Math.round(height * sc)}`);
      hint(w ? '⧉ Ausgabefenster offen – in OBS „Fensteraufnahme“ oder im Call „Fenster teilen“ wählen. Taste H blendet dort die Leiste ein.' : '⧉ Popup blockiert – Popups für diese Seite erlauben.');
      return w;
    }

    $('#cam-device').addEventListener('change', (e) => setDevice(e.target.value));
    $('#mic-device').addEventListener('change', (e) => {
      state.micId = e.target.value;
      savePrefs();
    });
    $('#btn-mirror').addEventListener('click', () => setMirror(!state.mirror));
    $('#btn-aspect').addEventListener('click', () => setAspect(state.aspect === '9:16' ? '16:9' : '9:16'));
    $('#btn-sound').addEventListener('click', () => setSound(!state.sound));
    $('#btn-rec').addEventListener('click', () => (rec || starting ? stopRecording() : startRecording()));
    $('#btn-studio').addEventListener('click', () => (studio.wanted ? studio.stop() : studio.start()));
    $('#btn-full').addEventListener('click', toggleFullscreen);
    $('#btn-popup').addEventListener('click', openOutput);
    $('#btn-cam-retry').addEventListener('click', () => startCamera());
    $('#btn-more').addEventListener('click', () => {
      const d = $('#drawer');
      d.hidden = !d.hidden;
      $('#btn-more').setAttribute('aria-expanded', String(!d.hidden));
      fit();
    });
    $('#res').addEventListener('change', (e) => setRes(e.target.value));
    $('#format').addEventListener('change', (e) => {
      state.format = FORMATS.includes(e.target.value) ? e.target.value : 'auto';
      savePrefs();
    });
    $('#rec-mode').addEventListener('change', (e) => {
      state.recMode = REC_MODES.includes(e.target.value) ? e.target.value : 'canvas';
      savePrefs();
    });
    $('#story-style').addEventListener('change', (e) => setStoryStyle(e.target.value));
    function setStudioLang(tag) {
      state.studioLang = LANGS.includes(tag) ? tag : state.studioLang;
      $('#studio-lang').value = state.studioLang;
      savePrefs();
      if (studio.matcher && studio._lang !== state.studioLang) studio._makeMatcher();
      if (studio.wanted) studio.start();
      return state.studioLang;
    }
    $('#studio-lang').addEventListener('change', (e) => setStudioLang(e.target.value));
    $('#rec-mic').addEventListener('change', (e) => {
      state.recMic = e.target.checked;
      savePrefs();
    });
    $('#rec-fx').addEventListener('change', (e) => {
      state.recFx = e.target.checked;
      savePrefs();
    });
    $('#studio-story').addEventListener('change', (e) => {
      state.studioStory = e.target.checked;
      savePrefs();
    });
    $('#rec-close').addEventListener('click', () => {
      $('#rec-result').hidden = true;
      try {
        $('#rec-video').pause();
      } catch (_) {
        /* ignore */
      }
    });
    view.addEventListener('dblclick', () => setClean(!state.clean));
    doc.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'r') rec || starting ? stopRecording() : startRecording();
      else if (k === 'm') setMirror(!state.mirror);
      else if (k === 'f') toggleFullscreen();
      else if (k === 'h') setClean(!state.clean);
      else if (k === 'escape' && !$('#rec-result').hidden) $('#rec-close').click();
      else return;
      e.preventDefault();
    });
    // The first gesture unlocks the overlay's audio (the iframe is click-through, so it never gets one itself).
    doc.addEventListener(
      'pointerdown',
      () => {
        const r = overlayApi() && overlayApi().renderer;
        if (r && typeof r.ensureAudio === 'function') r.ensureAudio();
      },
      { capture: true }
    );
    global.addEventListener('resize', fit);
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => fit()).observe(bar);
    if (md && typeof md.addEventListener === 'function') md.addEventListener('devicechange', () => refreshDevices());

    // ---------- start ----------
    $('#res').value = String(state.res);
    $('#format').value = state.format;
    $('#rec-mode').value = state.recMode;
    $('#story-style').value = state.storyStyle;
    $('#studio-lang').value = state.studioLang;
    $('#rec-mic').checked = state.recMic;
    $('#rec-fx').checked = state.recFx;
    $('#studio-story').checked = state.studioStory;
    const tabOk = !!(md && typeof md.getDisplayMedia === 'function');
    $('#rec-mode').querySelector('option[value="tab"]').disabled = !tabOk;
    if (!tabOk && state.recMode === 'tab') state.recMode = 'canvas';
    if (typeof MediaRecorder === 'undefined') {
      $('#btn-rec').disabled = true;
      $('#btn-rec').title = 'Dieser Browser kann nicht aufnehmen';
    }
    if (pinnedStyle && STORY_STYLES.includes(pinnedStyle)) $('#story-style').disabled = true;
    doc.body.classList.toggle('record-mode', params.get('record') === '1');
    setClean(state.clean);
    reflectMirror();
    applyFrame();
    reflectRec();
    reflectStudio();
    const overlayReady = loadOverlay();
    const cameraReady = startCamera();
    setInterval(pollOverlay, POLL_MS);
    pollOverlay();
    if (params.get('record') === '1') hint('⏺ Aufnahme-Modus: „Aufnahme“ drücken, erzählen, stoppen – das Video bleibt auf deinem Gerät (Herunterladen / Teilen).', { sticky: false });
    if (params.get('mic') === '1') overlayReady.then(() => studio.start());

    const pub = {
      VERSION,
      get state() {
        return { ...state, recording: !!rec, devices: cameras.length };
      },
      ready: Promise.all([overlayReady, cameraReady]).then(() => pub),
      get video() {
        return video;
      },
      get iframe() {
        return iframe;
      },
      get overlay() {
        return overlayApi();
      },
      devices: () => cameras.map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind })),
      microphones: () => mics.map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind })),
      refreshDevices,
      setDevice,
      setMirror,
      setAspect,
      setRes,
      setSound,
      setClean,
      setStoryStyle,
      setStudioLang,
      startCamera,
      stopCamera,
      compositor,
      startRecording,
      stopRecording,
      get recording() {
        return rec ? { started: rec.started, mode: rec.mode, mime: rec.mime, via: rec.via, target: rec.target } : null;
      },
      get lastRecording() {
        return lastRecording;
      },
      studio,
      openOutput,
      hint,
    };
    global.livefxCamera = pub;
    return pub;
  }

  return {
    VERSION,
    ASPECTS,
    FORMATS,
    OVERLAY_PARAMS,
    STUDIO_SCRIPTS,
    MAX_REC_MS,
    normAspect,
    normRes,
    outputSize,
    overlaySrc,
    fitBox,
    coverRect,
    splitTopLevel,
    parseGradient,
    resolveStops,
    parseShadows,
    isTransparent,
    mimeCandidates,
    pickMime,
    phoneSafe,
    extFor,
    formatTime,
    familyOf,
    cameraErrorText,
    Compositor,
    record,
    boot,
  };
});
