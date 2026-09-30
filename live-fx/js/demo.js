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
    if ((S.ASSET_IMAGE_RE.test(s) && !s.includes('..')) || S.HTTP_SRC_RE.test(s)) return s;
    return '';
  }

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
      this._add({ kind: 'image', t0: now, dur: 2800, img: this._loadImage(src), text: typeof v.text === 'string' ? v.text : '', position: v.position });
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
      count = Math.min(S.LIMITS.rainCount, count);
      const emoji = typeof v.emoji === 'string' && v.emoji ? v.emoji : '✨';
      const drops = [];
      for (let i = 0; i < count; i++) {
        drops.push({ x: Math.random(), size: rand(28, 72), dur: rand(1800, 3200), delay: rand(0, 900) });
      }
      this._add({ kind: 'rain', t0: now, dur: 4500, emoji, drops });
    }

    confetti(v, now) {
      const bits = [];
      for (let i = 0; i < CONFETTI_COUNT; i++) {
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
      for (const fx of this.active) {
        const t = (now - fx.t0) / fx.dur;
        ctx.save();
        try {
          if (fx.kind === 'card' || fx.kind === 'image') this._drawCard(fx, t, now);
          else if (fx.kind === 'banner') this._drawBanner(fx, t);
          else if (fx.kind === 'rain') this._drawRain(fx, now);
          else if (fx.kind === 'confetti') this._drawConfetti(fx, now);
          else if (fx.kind === 'shake') this._drawFlash(now - fx.t0);
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
      const isImage = fx.kind === 'image';
      if (isImage) {
        const img = fx.img;
        const ok = img && img.complete && img.naturalWidth > 0;
        const maxImgW = this.portrait ? W * 0.8 : W * 0.4;
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
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = isImage ? '#111' : fx.bg;
      roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 32);
      ctx.fill();
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
        ctx.fillStyle = fx.color;
        ctx.font = `${emojiSize}px ${FONT}`;
        ctx.fillText(fx.emoji, 0, y, cardW - padX * 2);
        y += emojiSize;
      }
      if (text) {
        y += bodyW || imgW ? 8 : 0;
        ctx.fillStyle = isImage ? '#fff' : fx.color;
        ctx.font = `900 ${textSize}px ${FONT}`;
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

  /** Mirrors renderer.playSound but routes everything through mixNode (heard + recorded). */
  function playSound(spec) {
    const parsed = S.parseSound(spec);
    if (!parsed) return;
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
    renderer.fire(silent);
    canvasFx.fire(trigger);
    if (trigger.sound) playSound(trigger.sound);
  }

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

  global.livefxDemo = {
    renderer,
    canvasFx,
    CanvasFX,
    fire: (trigger) => fire(trigger, 'Demo'),
    render,
    handleText,
    startRecording,
    stopRecording,
    matcher,
    bus,
    asr,
    state,
  };

  Promise.all([loadTriggers(), openCamera()]).then(() => {
    state.ready = true;
  });
})(window);
