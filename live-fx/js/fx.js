// LiveFX – overlay renderer. Receives { type:'fire', trigger } messages and draws the effect.
(function (global) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);

  class Renderer {
    constructor(root) {
      this.root = root;
      this.audioCtx = null;
      this.volume = 0.8;
    }

    ensureAudio() {
      if (!this.audioCtx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) this.audioCtx = new AC();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
      return this.audioCtx;
    }

    playSound(name) {
      const ctx = this.ensureAudio();
      if (!ctx || !name) return;
      global.LiveFXSounds.play(name, ctx, ctx.destination, this.volume);
    }

    fire(trigger) {
      if (!trigger) return;
      const v = trigger.visual || {};
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
      el.className = 'fx-card';
      if (v.bg) el.style.background = v.bg;
      if (v.color) el.style.color = v.color;
      el.innerHTML = `<div class="fx-emoji">${v.emoji || ''}</div>${v.text ? `<div class="fx-text">${escapeHtml(v.text)}</div>` : ''}`;
      this._spawn(el, 2600);
    }

    image(v) {
      const el = document.createElement('div');
      el.className = 'fx-card fx-card-image';
      el.innerHTML = `<img src="${v.src}" alt="">${v.text ? `<div class="fx-text">${escapeHtml(v.text)}</div>` : ''}`;
      this._spawn(el, 2800);
    }

    banner(v) {
      const el = document.createElement('div');
      el.className = 'fx-banner';
      el.innerHTML = `<span>${v.emoji || ''}</span> ${escapeHtml(v.text || '')} <span>${v.emoji || ''}</span>`;
      this._spawn(el, 3200);
    }

    rain(v) {
      const count = v.count || 20;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-drop';
        el.textContent = v.emoji || '✨';
        el.style.left = `${rand(0, 100)}vw`;
        el.style.fontSize = `${rand(28, 72)}px`;
        el.style.animationDuration = `${rand(1.8, 3.2)}s`;
        el.style.animationDelay = `${rand(0, 0.9)}s`;
        this._spawn(el, 4500);
      }
    }

    confetti(v) {
      const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'];
      for (let i = 0; i < 90; i++) {
        const el = document.createElement('div');
        el.className = 'fx-confetti';
        el.style.left = `${rand(0, 100)}vw`;
        el.style.background = colors[i % colors.length];
        el.style.animationDuration = `${rand(2, 3.5)}s`;
        el.style.animationDelay = `${rand(0, 0.6)}s`;
        el.style.transform = `rotate(${rand(0, 360)}deg)`;
        this._spawn(el, 4500);
      }
      if (v.emoji || v.text) this.card({ emoji: v.emoji, text: v.text, bg: 'rgba(0,0,0,.75)', color: '#fff' });
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  global.LiveFXRenderer = { Renderer };
})(typeof window !== 'undefined' ? window : globalThis);
