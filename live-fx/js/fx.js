// LiveFX – overlay renderer. Receives { type:'fire', trigger } messages and draws the effect.
// Hardened: every user string goes through escapeHtml, image sources are allow-listed, rain is capped,
// sounds may be builtin (LiveFXSounds) or uploaded files (`file:assets/x.mp3`). See docs/CONTRACTS.md §9.
(function (global) {
  'use strict';

  // LiveFXSchema is resolved lazily (script order in overlay.html may put schema.js after fx.js);
  // the local fallbacks below keep the overlay working when schema.js is missing entirely.
  const schema = () => global.LiveFXSchema || null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const CONFETTI_COUNT = 90;
  const FILE_SOUND_MAX_MS = 60000;
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
    return /^[a-z][a-zA-Z0-9]{0,30}$/.test(spec) ? { kind: 'builtin', name: spec } : null;
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
      this.volume = 0.8;
      this.stats = { fires: 0, sounds: 0, fileSounds: 0 };
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

    /** `spec` is a builtin name ("airhorn") or "file:assets/x.mp3". Unknown specs are ignored. */
    playSound(spec) {
      const parsed = parseSound(spec);
      if (!parsed) return;
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
