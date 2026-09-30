// LiveFX – trigger schema v2: validation, normalization, merging, ids, HTML escaping.
// Single source of truth shared by the browser (panel, overlay) and the Node server (UMD).
(function (global) {
  'use strict';

  const VERSION = 2;
  const KINDS = ['card', 'image', 'banner', 'rain', 'confetti', 'scene', 'sticker'];
  const POSITIONS = ['center', 'top', 'safe'];
  // Story mode (1.3): full-screen ambient scenes that stay until the next one; 'clear' fades the current scene out.
  const SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear'];
  // Ambient loop names known to js/sounds.js (`LiveFXSounds.loops`); kept here so the editor can list them without
  // sounds.js loaded. Validation of "loop:<name>" only checks the name syntax (see BUILTIN_SOUND_RE).
  const LOOPS = ['rain', 'wind', 'fireplace', 'birds', 'sea', 'thunder', 'nightCrickets', 'heartbeatSlow', 'churchBells', 'cityHum', 'spaceDrone', 'storm'];
  const LIMITS = {
    triggers: 200,
    keywords: 50,
    keywordLen: 60,
    label: 40,
    text: 80,
    emoji: 16,
    hint: 120,
    rainCount: 60,
    stickerEmoji: 32,
    sceneDuration: 3600,
    cooldown: 3600,
    transcriptChars: 2000,
    assetBytes: 8 * 1024 * 1024,
    sourceLen: 80,
    idLen: 64,
  };
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
  const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const SOUND_EXT = ['mp3', 'wav', 'ogg'];
  const ASSET_IMAGE_RE = /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp)$/i;
  const ASSET_SOUND_RE = /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(mp3|wav|ogg)$/i;
  const HTTP_SRC_RE = /^https?:\/\/[^\s"'<>]{1,500}$/i;
  const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;
  const BUILTIN_SOUND_RE = /^[a-z][a-zA-Z0-9]{0,30}$/;
  const MSG_ID_RE = /^[\w.-]{1,64}$/;

  function isSafeName(name) {
    return typeof name === 'string' && SAFE_NAME.test(name) && !name.includes('..');
  }

  function newId(prefix = 'm') {
    const c = global.crypto;
    let rnd;
    if (c && typeof c.randomUUID === 'function') rnd = c.randomUUID().replace(/-/g, '').slice(0, 12);
    else rnd = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return `${prefix}-${rnd}`;
  }

  function str(v, max) {
    if (typeof v !== 'string') return '';
    const s = v.trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function parseSound(s) {
    if (typeof s !== 'string' || !s) return null;
    if (s.startsWith('file:')) {
      const url = s.slice(5);
      return ASSET_SOUND_RE.test(url) && !url.includes('..') ? { kind: 'file', url } : null;
    }
    if (s.startsWith('loop:')) {
      const name = s.slice(5);
      return BUILTIN_SOUND_RE.test(name) ? { kind: 'loop', name } : null;
    }
    return BUILTIN_SOUND_RE.test(s) ? { kind: 'builtin', name: s } : null;
  }

  function normalizeKeywords(raw, warnings) {
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (typeof raw === 'string') list = raw.split(',');
    const seen = new Set();
    const out = [];
    for (const k of list) {
      const s = str(k, LIMITS.keywordLen);
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    if (out.length > LIMITS.keywords) {
      warnings.push(`too many keywords (${out.length}), kept ${LIMITS.keywords}`);
      return out.slice(0, LIMITS.keywords);
    }
    return out;
  }

  function normalizeVisual(raw, warnings) {
    const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = {};
    if (v.kind !== undefined && !KINDS.includes(v.kind)) warnings.push(`unknown visual.kind "${String(v.kind).slice(0, 20)}"`);
    out.kind = KINDS.includes(v.kind) ? v.kind : 'card';
    if (v.position !== undefined && !POSITIONS.includes(v.position)) warnings.push(`unknown visual.position "${String(v.position).slice(0, 20)}"`);
    out.position = POSITIONS.includes(v.position) ? v.position : 'center';
    // Stickers hold up to 4 emojis (ZWJ sequences are long), every other kind keeps the 16-char limit.
    const emoji = str(v.emoji, out.kind === 'sticker' ? LIMITS.stickerEmoji : LIMITS.emoji);
    if (emoji) out.emoji = emoji;
    const text = str(v.text, LIMITS.text);
    if (text) out.text = text;
    for (const f of ['bg', 'color']) {
      if (v[f] === undefined || v[f] === null || v[f] === '') continue;
      if (typeof v[f] === 'string' && COLOR_RE.test(v[f].trim())) out[f] = v[f].trim();
      else warnings.push(`invalid visual.${f}`);
    }
    if (v.src !== undefined && v.src !== null && v.src !== '') {
      const src = typeof v.src === 'string' ? v.src.trim() : '';
      if ((ASSET_IMAGE_RE.test(src) && !src.includes('..')) || HTTP_SRC_RE.test(src)) out.src = src;
      else warnings.push('invalid visual.src');
    }
    if (out.kind === 'image' && !out.src) {
      warnings.push('image trigger without src, falling back to card');
      out.kind = 'card';
    }
    if (v.count !== undefined && v.count !== null && v.count !== '') {
      const n = Math.round(Number(v.count));
      if (Number.isFinite(n)) out.count = Math.min(LIMITS.rainCount, Math.max(1, n));
      else warnings.push('invalid visual.count');
    }
    if (v.shake === true) out.shake = true;
    if (out.kind === 'scene') {
      if (SCENES.includes(v.scene)) out.scene = v.scene;
      else {
        warnings.push(`unknown visual.scene "${String(v.scene).slice(0, 20)}", falling back to card`);
        out.kind = 'card';
        return out;
      }
      if (v.intensity !== undefined && v.intensity !== null && v.intensity !== '') {
        const n = Math.round(Number(v.intensity));
        if (Number.isFinite(n)) out.intensity = Math.min(3, Math.max(1, n));
        else warnings.push('invalid visual.intensity');
      }
      if (v.duration !== undefined && v.duration !== null && v.duration !== '') {
        const d = Number(v.duration);
        if (Number.isFinite(d) && d >= 0) out.duration = Math.min(LIMITS.sceneDuration, d);
        else warnings.push('invalid visual.duration');
      }
      if (v.caption === false) out.caption = false;
      else if (v.caption === true) out.caption = true;
    }
    return out;
  }

  /**
   * @param {any} raw
   * @param {{usedIds?: Set<string>}} [opts]
   * @returns {{trigger: object, warnings: string[]} | null}
   */
  function normalizeTrigger(raw, opts = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const usedIds = opts.usedIds || new Set();
    const warnings = [];

    let id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
    if (!id) warnings.push(raw.id === undefined ? 'missing id' : `invalid id "${String(raw.id).slice(0, 20)}"`);
    if (id && usedIds.has(id)) {
      warnings.push(`duplicate id "${id}"`);
      id = null;
    }
    if (!id) {
      let n = usedIds.size + 1;
      do id = `custom-${n++}`;
      while (usedIds.has(id));
    }
    usedIds.add(id);

    const label = str(raw.label, LIMITS.label) || id;
    const keywords = normalizeKeywords(raw.keywords, warnings);
    const enabled = raw.enabled !== false;

    let cooldown = 4;
    if (raw.cooldown !== undefined && raw.cooldown !== null && raw.cooldown !== '') {
      const c = Number(raw.cooldown);
      if (Number.isFinite(c) && c >= 0) cooldown = Math.min(LIMITS.cooldown, c);
      else warnings.push('invalid cooldown');
    }

    let sound = null;
    if (raw.sound !== undefined && raw.sound !== null && raw.sound !== '') {
      if (parseSound(raw.sound)) sound = raw.sound;
      else warnings.push(`invalid sound "${String(raw.sound).slice(0, 40)}"`);
    }

    const trigger = { id, label, keywords, enabled, cooldown, sound, visual: normalizeVisual(raw.visual, warnings) };
    const hint = str(raw.hint, LIMITS.hint);
    if (hint) trigger.hint = hint;
    return { trigger, warnings: warnings.map((w) => `${id}: ${w}`) };
  }

  /** Never throws. Non-arrays yield an empty list. */
  function normalizeTriggers(any) {
    if (!Array.isArray(any)) return { triggers: [], warnings: ['triggers is not an array'] };
    const warnings = [];
    const usedIds = new Set();
    const triggers = [];
    const list = any.length > LIMITS.triggers ? any.slice(0, LIMITS.triggers) : any;
    if (any.length > LIMITS.triggers) warnings.push(`too many triggers (${any.length}), kept ${LIMITS.triggers}`);
    list.forEach((raw, i) => {
      const n = normalizeTrigger(raw, { usedIds });
      if (!n) {
        warnings.push(`entry #${i} is not an object, skipped`);
        return;
      }
      triggers.push(n.trigger);
      warnings.push(...n.warnings);
    });
    return { triggers, warnings };
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function mergeWithDefaults({ triggers, removed }, defaults) {
    const list = Array.isArray(triggers) ? triggers : [];
    const ids = new Set(list.map((t) => t.id));
    const rem = new Set(Array.isArray(removed) ? removed : []);
    const out = list.slice();
    for (const d of defaults || []) {
      if (!ids.has(d.id) && !rem.has(d.id)) out.push(clone(d));
    }
    return out;
  }

  function deriveRemoved(triggers, defaults) {
    const ids = new Set((triggers || []).map((t) => t.id));
    return (defaults || []).map((d) => d.id).filter((id) => !ids.has(id));
  }

  /** Validates a bus envelope posted to /fire. Unknown keys are stripped. */
  function validateEnvelope(msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return { ok: false, error: 'envelope is not an object' };
    if (msg.type !== 'fire' && msg.type !== 'volume') return { ok: false, error: 'type must be "fire" or "volume"' };
    const out = {
      id: typeof msg.id === 'string' && MSG_ID_RE.test(msg.id) ? msg.id : newId('m'),
      type: msg.type,
      ts: Number.isFinite(msg.ts) ? msg.ts : Date.now(),
    };
    if (msg.type === 'fire') {
      const n = normalizeTrigger(msg.trigger);
      if (!n) return { ok: false, error: 'trigger missing' };
      out.trigger = n.trigger;
      out.source = str(msg.source, LIMITS.sourceLen) || 'API';
    } else {
      const v = Number(msg.volume);
      if (!Number.isFinite(v)) return { ok: false, error: 'volume must be a number' };
      out.volume = Math.min(1, Math.max(0, v));
    }
    return { ok: true, msg: out };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  global.LiveFXSchema = {
    VERSION,
    KINDS,
    POSITIONS,
    SCENES,
    LOOPS,
    LIMITS,
    ID_RE,
    SAFE_NAME,
    IMAGE_EXT,
    SOUND_EXT,
    ASSET_IMAGE_RE,
    ASSET_SOUND_RE,
    HTTP_SRC_RE,
    COLOR_RE,
    isSafeName,
    newId,
    parseSound,
    normalizeTrigger,
    normalizeTriggers,
    mergeWithDefaults,
    deriveRemoved,
    validateEnvelope,
    escapeHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
