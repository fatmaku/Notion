// LiveFX – overlay renderer. Receives { type:'fire', trigger } messages and draws the effect.
// Hardened: every user string goes through escapeHtml, image sources are allow-listed, rain is capped,
// sounds may be builtin (LiveFXSounds) or uploaded files (`file:assets/x.mp3`). See docs/CONTRACTS.md §9.
// Story mode (1.3): one persistent `.fx-scene` layer (gradient + CSS animation + emoji particles) that stays
// until the next scene, ambient loops (`loop:<name>` via LiveFXSounds.loop) and the `sticker` kind.
(function (global) {
  'use strict';

  // LiveFXSchema is resolved lazily (script order in overlay.html may put schema.js after fx.js);
  // the local fallbacks below keep the overlay working when schema.js is missing entirely.
  const schema = () => global.LiveFXSchema || null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const CONFETTI_COUNT = 90;
  const FILE_SOUND_MAX_MS = 60000;
  const SCENE_FADE_MS = 800;
  const SCENE_PARTICLE_CAP = 40;
  const LOOP_FADE_SEC = 1.5;
  const STICKER_MS = 2800;
  const STICKER_MAX = 4;
  const FALLBACK_SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear'];

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

  /** Splits a string into user-perceived characters (emoji incl. ZWJ sequences), whitespace dropped. */
  function graphemes(s) {
    const str = String(s || '');
    let parts;
    try {
      parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str), (x) => x.segment);
    } catch (_) {
      parts = Array.from(str);
    }
    return parts.filter((g) => g.trim() !== '' && !/^[\u200d\ufe0f]$/.test(g));
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

  class Renderer {
    constructor(root) {
      this.root = root;
      this.audioCtx = null;
      this._volume = 0.8;
      this.stats = { fires: 0, sounds: 0, fileSounds: 0, scenes: 0 };
      /** Id of the scene currently on stage (null = none). */
      this.currentScene = null;
      /** Name of the running ambient loop (null = none). */
      this.loopName = null;
      /** Optional hook `(sceneId|null) => void`, called whenever the scene changes or clears. */
      this.onScene = null;
      this._scene = null; // { id, el, spawnTimer, clearTimer }
      this._loop = null; // { name, handle, gain }
    }

    /** 0..1; also applied live to the running ambient loop through its GainNode. */
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

    /** `spec` is a builtin name ("airhorn"), "file:assets/x.mp3" or "loop:rain". Unknown specs are ignored. */
    playSound(spec) {
      const parsed = parseSound(spec);
      if (!parsed) return;
      if (parsed.kind === 'loop') {
        this.playLoop(parsed.name);
        return;
      }
      if (parsed.kind === 'builtin') {
        const ctx = this.ensureAudio();
        if (!ctx || !global.LiveFXSounds) return;
        try {
          global.LiveFXSounds.play(parsed.name, ctx, ctx.destination, this.volume);
          this.stats.sounds++;
        } catch (_) {
          /* unknown builtin name */
        }
        return;
      }
      this.playFile(parsed.url);
    }

    playFile(url) {
      if (typeof document === 'undefined' || typeof Audio === 'undefined') return;
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
          const gain = ctx.createGain();
          gain.gain.value = this.volume;
          src.connect(gain).connect(ctx.destination);
          routed = true;
        } catch (_) {
          routed = false;
        }
      }
      if (!routed) audio.volume = Math.min(1, Math.max(0, this.volume));
      this.stats.fileSounds++;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    fire(trigger) {
      if (!trigger || typeof trigger !== 'object') return;
      this.stats.fires++;
      const v = trigger.visual && typeof trigger.visual === 'object' ? trigger.visual : {};
      if (trigger.sound) this.playSound(trigger.sound);
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
        case 'card':
        default:
          this.card(v);
      }
      if (v.shake) this.shake();
    }

    _spawn(el, ms) {
      this.root.appendChild(el);
      setTimeout(() => el.remove(), ms);
    }

    card(v) {
      const el = document.createElement('div');
      el.className = `fx-card ${posClass(v)}`;
      const bg = safeColor(v.bg);
      const color = safeColor(v.color);
      if (bg) el.style.background = bg;
      if (color) el.style.color = color;
      el.innerHTML = `<div class="fx-emoji">${escapeHtml(v.emoji || '')}</div>${v.text ? `<div class="fx-text">${escapeHtml(v.text)}</div>` : ''}`;
      this._spawn(el, 2600);
    }

    image(v) {
      const src = safeSrc(v.src);
      if (!src) {
        console.warn('LiveFX: image source rejected, rendering card instead:', String(v.src).slice(0, 80));
        this.card({ emoji: v.emoji || '🖼️', text: v.text, position: v.position });
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
      this._spawn(el, 2800);
    }

    banner(v) {
      const el = document.createElement('div');
      el.className = `fx-banner ${posClass(v)}`;
      const emoji = escapeHtml(v.emoji || '');
      el.innerHTML = `<span>${emoji}</span> ${escapeHtml(v.text || '')} <span>${emoji}</span>`;
      this._spawn(el, 3200);
    }

    rain(v) {
      let count = Math.round(Number(v.count));
      if (!Number.isFinite(count) || count < 1) count = 20;
      count = Math.min(rainMax(), count);
      const emoji = typeof v.emoji === 'string' && v.emoji ? v.emoji : '✨';
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-drop';
        el.textContent = emoji;
        placeX(el);
        el.style.fontSize = `${rand(28, 72)}px`;
        el.style.animationDuration = `${rand(1.8, 3.2)}s`;
        el.style.animationDelay = `${rand(0, 0.9)}s`;
        this._spawn(el, 4500);
      }
    }

    confetti(v) {
      const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        const el = document.createElement('div');
        el.className = 'fx-confetti';
        placeX(el);
        el.style.background = colors[i % colors.length];
        el.style.animationDuration = `${rand(2, 3.5)}s`;
        el.style.animationDelay = `${rand(0, 0.6)}s`;
        el.style.transform = `rotate(${rand(0, 360)}deg)`;
        this._spawn(el, 4500);
      }
      if (v.emoji || v.text) this.card({ emoji: v.emoji, text: v.text, bg: 'rgba(0,0,0,.75)', color: '#fff', position: v.position });
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
     * `duration` > 0 seconds auto-clears. Particles are spawned by an interval that dies with the layer.
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
      if (!list.length) return;
      let intensity = Math.round(Number(v && v.intensity));
      if (!Number.isFinite(intensity)) intensity = 2;
      intensity = Math.min(3, Math.max(1, intensity));
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
      this._spawn(el, STICKER_MS);
    }

    shake() {
      this.root.classList.remove('fx-shake');
      void this.root.offsetWidth; // restart animation
      this.root.classList.add('fx-shake');
      const flash = document.createElement('div');
      flash.className = 'fx-flash';
      this._spawn(flash, 400);
    }
  }

  global.LiveFXRenderer = { Renderer, escapeHtml };
})(typeof window !== 'undefined' ? window : globalThis);
