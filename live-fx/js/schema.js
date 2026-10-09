// LiveFX – trigger schema v3: validation, normalization, merging, ids, HTML escaping.
// Single source of truth shared by the browser (panel, overlay) and the Node server (UMD).
// v3 (LiveFX 2.0) adds the visual kinds `text`, `lower-third` and `combo`, the per-visual flags
// `glow` / `tilt` / `impact` + `intensity`, the trigger-level `gain`, overlay `THEMES` and the
// `theme` bus envelope. Every v2 trigger normalizes exactly as before (no new keys appear unless set).
// 2.2 (story band): overlay layout `storyLayout` band | full | frame with a `band` height (15..35 %), effect
// `zone` full | edges | bottom | top (`layout` envelope, `normalizeLayout`), the live-story envelopes `story`
// (transcript line) / `story-state` (scene state, `normalizeStoryState`) and a `bus` on `volume` messages
// (master | sfx | ambient, `VOLUME_BUSES`, defaults in `VOLUME_DEFAULTS`).
// 2.3: two more layout keys – `bandPosition` bottom | chat (portrait: band flush with the frame bottom or above the
// chat zone; landscape ignores it) and `storyStyle` emoji | sketch | mixed (how the live story is drawn; the sketch
// renderer is js/sketch.js, `LiveFXSketch` – without it every style renders as emoji).
(function (global) {
  'use strict';

  const VERSION = 3;
  const SCHEMA_VERSION = VERSION;
  const KINDS = ['card', 'image', 'banner', 'rain', 'confetti', 'scene', 'sticker', 'text', 'lower-third', 'combo'];
  const POSITIONS = ['center', 'top', 'safe'];
  // Story mode (1.3): full-screen ambient scenes that stay until the next one; 'clear' fades the current scene out.
  const SCENES = ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear'];
  // Ambient loop names known to js/sounds.js (`LiveFXSounds.loops`); kept here so the editor can list them without
  // sounds.js loaded. Validation of "loop:<name>" only checks the name syntax (see BUILTIN_SOUND_RE).
  const LOOPS = ['rain', 'wind', 'fireplace', 'birds', 'sea', 'thunder', 'nightCrickets', 'heartbeatSlow', 'churchBells', 'cityHum', 'spaceDrone', 'storm'];
  // v3: big animated word styles, overlay themes (css/overlay.css `body[data-theme]`).
  // 2.1: `sticker` = own text stickers (bold outline, comic burst background, two colours `color` / `color2`),
  // rendered as `.fx-bigtext.fx-text-sticker`; renderers that do not know it yet fall back to neon.
  const TEXT_STYLES = ['neon', 'gradient', 'bounce', 'glitch', 'sticker'];
  const THEMES = ['neon', 'pastel', 'minimal', 'kinderbuch'];
  const LIMITS = {
    triggers: 1000,
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
    // v3
    comboSteps: 6,
    comboDelay: 10000,
    title: 60,
    subtitle: 80,
    // 2.2
    bandMin: 15,
    bandMax: 35,
    storyText: 500,
    storyWord: 24,
  };
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
  const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const SOUND_EXT = ['mp3', 'wav', 'ogg'];
  // 2.1: bundled sticker sets are served from `memes/<set>/<file>.(webp|png)` (lower-case, no dots besides
  // the extension, so no traversal). ASSET_IMAGE_RE ("same-origin image the overlay may show") accepts both
  // uploaded assets and bundled stickers; MEMES_IMAGE_RE / UPLOAD_IMAGE_RE match each kind alone.
  const UPLOAD_IMAGE_RE = /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp)$/i;
  const MEMES_IMAGE_RE = /^memes\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.(webp|png)$/;
  const ASSET_IMAGE_RE = /^(?:assets\/[a-z0-9][a-z0-9._-]{0,99}\.(?:png|jpe?g|gif|webp)|memes\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.(?:webp|png))$/i;
  const ASSET_SOUND_RE = /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(mp3|wav|ogg)$/i;
  // 2.1: remote images are only hotlinks from the GIF providers' media hosts (KLIPY: klipy.com and one
  // sub-domain level, GIPHY: media/media0-9/i.giphy.com), https only, no userinfo, no port. Arbitrary http(s)
  // URLs are rejected (privacy: the overlay would call any host; safety: no unfiltered images on stream).
  const HOTLINK_SRC_RE = /^https:\/\/(?:(?:[a-z0-9-]{1,63}\.)?klipy\.com|(?:media[0-9]?|i)\.giphy\.com)\/[^\s"'<>\\]{1,480}$/i;
  /** @deprecated 2.1: alias of HOTLINK_SRC_RE (was any http(s) URL). */
  const HTTP_SRC_RE = HOTLINK_SRC_RE;
  // Performance modes of the overlay renderer (docs/PERFORMANCE.md), bus envelope `{type:'perf', perf}`.
  const PERF_MODES = ['auto', 'eco', 'high'];
  // 2.2 story band: where scenes render (`band` = bottom strip, `frame` = picture-in-picture box bottom-right,
  // `full` = whole frame) and where transient effects may go (`edges` = left/right columns, `bottom` = inside
  // the band, `top` = top strip, `full` = anywhere). Bus envelope `{type:'layout', storyLayout?, band?, zone?}`.
  const STORY_LAYOUTS = ['band', 'full', 'frame'];
  const ZONES = ['full', 'edges', 'bottom', 'top'];
  // 2.3: portrait band position (`bottom` = flush with the frame bottom, full width – the default; `chat` = above
  // the bottom 35 % chat zone, the 2.2 look) and the live-story drawing style (`mixed` = emoji sprites + sketch).
  // LAYOUT_DEFAULTS stays the 2.2 triple (panels spread it into their own layout object); the defaults of the two
  // 2.3 keys are separate constants – normalizeLayout() always returns all five keys.
  const BAND_POSITIONS = ['bottom', 'chat'];
  const STORY_STYLES = ['emoji', 'sketch', 'mixed'];
  const BAND_POSITION_DEFAULT = 'bottom';
  const STORY_STYLE_DEFAULT = 'mixed';
  const LAYOUT_DEFAULTS = Object.freeze({ storyLayout: 'band', band: 22, zone: 'edges' });
  const LAYOUT_ALL_DEFAULTS = Object.freeze({ ...LAYOUT_DEFAULTS, bandPosition: BAND_POSITION_DEFAULT, storyStyle: STORY_STYLE_DEFAULT });
  // 2.2 volume busses: `{type:'volume', volume, bus?}` – bus omitted = master (backwards compatible).
  const VOLUME_BUSES = ['master', 'sfx', 'ambient'];
  const VOLUME_DEFAULTS = Object.freeze({ master: 0.5, sfx: 0.8, ambient: 0.5 });
  // Live story (js/story-director.js): a scene state the overlay can render directly (`story-state` envelope).
  const STORY_MOODS = ['calm', 'happy', 'tense', 'sad', 'scary'];
  const STORY_ACTORS_MAX = 6;
  const STORY_PROPS_MAX = 5;
  const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;
  const BUILTIN_SOUND_RE = /^[a-z][a-zA-Z0-9]{0,30}$/;
  const MSG_ID_RE = /^[\w.-]{1,64}$/;

  function isSafeName(name) {
    return typeof name === 'string' && SAFE_NAME.test(name) && !name.includes('..');
  }

  /** Image source allowed in `visual.src`: uploaded asset, bundled sticker (`memes/…`) or KLIPY/GIPHY hotlink. */
  function isImageSrc(src) {
    if (typeof src !== 'string') return false;
    return ((UPLOAD_IMAGE_RE.test(src) || MEMES_IMAGE_RE.test(src)) && !src.includes('..')) || HOTLINK_SRC_RE.test(src);
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

  const isSet = (v) => v !== undefined && v !== null && v !== '';

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

  /** 1..3 or undefined (+ warning when not numeric). */
  function normalizeIntensity(v, warnings) {
    if (!isSet(v)) return undefined;
    const n = Math.round(Number(v));
    if (Number.isFinite(n)) return Math.min(3, Math.max(1, n));
    warnings.push('invalid visual.intensity');
    return undefined;
  }

  /** 0..1 or undefined (+ warning when not numeric). */
  function normalizeGain(v, warnings) {
    if (!isSet(v)) return undefined;
    const n = Number(v);
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
    warnings.push('invalid gain');
    return undefined;
  }

  /**
   * @param {any} raw
   * @param {string[]} warnings
   * @param {number} [depth]  0 for a trigger's own visual, 1 inside a combo step (combos may not nest)
   */
  function normalizeVisual(raw, warnings, depth = 0) {
    const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = {};
    if (v.kind !== undefined && !KINDS.includes(v.kind)) warnings.push(`unknown visual.kind "${String(v.kind).slice(0, 20)}"`);
    out.kind = KINDS.includes(v.kind) ? v.kind : 'card';
    if (out.kind === 'combo' && depth > 0) {
      warnings.push('combo inside a combo is not allowed, falling back to card');
      out.kind = 'card';
    }
    if (v.position !== undefined && !POSITIONS.includes(v.position)) warnings.push(`unknown visual.position "${String(v.position).slice(0, 20)}"`);
    out.position = POSITIONS.includes(v.position) ? v.position : 'center';
    // Stickers hold up to 4 emojis (ZWJ sequences are long), every other kind keeps the 16-char limit.
    const emoji = str(v.emoji, out.kind === 'sticker' ? LIMITS.stickerEmoji : LIMITS.emoji);
    if (emoji) out.emoji = emoji;
    const text = str(v.text, LIMITS.text);
    if (text) out.text = text;
    for (const f of ['bg', 'color', 'color2']) {
      if (!isSet(v[f])) continue;
      if (typeof v[f] === 'string' && COLOR_RE.test(v[f].trim())) out[f] = v[f].trim();
      else warnings.push(`invalid visual.${f}`);
    }
    if (isSet(v.src)) {
      const src = typeof v.src === 'string' ? v.src.trim() : '';
      if (isImageSrc(src)) out.src = src;
      else warnings.push('invalid visual.src');
    }
    if (out.kind === 'image' && !out.src) {
      warnings.push('image trigger without src, falling back to card');
      out.kind = 'card';
    }
    if (isSet(v.count)) {
      const n = Math.round(Number(v.count));
      if (Number.isFinite(n)) out.count = Math.min(LIMITS.rainCount, Math.max(1, n));
      else warnings.push('invalid visual.count');
    }
    if (v.shake === true) out.shake = true;
    // v3 flags (only `true` is stored, so v2 records never grow new keys).
    for (const f of ['glow', 'tilt', 'impact']) if (v[f] === true) out[f] = true;

    if (out.kind === 'scene') {
      if (SCENES.includes(v.scene)) out.scene = v.scene;
      else {
        warnings.push(`unknown visual.scene "${String(v.scene).slice(0, 20)}", falling back to card`);
        out.kind = 'card';
        return out;
      }
      const it = normalizeIntensity(v.intensity, warnings);
      if (it !== undefined) out.intensity = it;
      if (isSet(v.duration)) {
        const d = Number(v.duration);
        if (Number.isFinite(d) && d >= 0) out.duration = Math.min(LIMITS.sceneDuration, d);
        else warnings.push('invalid visual.duration');
      }
      if (v.caption === false) out.caption = false;
      else if (v.caption === true) out.caption = true;
      return out;
    }

    // v3: `intensity` on every other kind (1..3, default 1 when absent). A non-scene visual that still
    // carries a `scene` id is a v2 record whose kind was switched away from scene: its whole scene bundle
    // (scene, duration, caption, intensity) is dropped like v2 did, so old data normalizes unchanged.
    if (!isSet(v.scene)) {
      const it = normalizeIntensity(v.intensity, warnings);
      if (it !== undefined) out.intensity = it;
    }

    if (out.kind === 'text') {
      if (!out.text) {
        warnings.push('text visual without text, falling back to card');
        out.kind = 'card';
        return out;
      }
      if (isSet(v.style) && !TEXT_STYLES.includes(v.style)) warnings.push(`unknown visual.style "${String(v.style).slice(0, 20)}"`);
      out.style = TEXT_STYLES.includes(v.style) ? v.style : 'neon';
    } else if (out.kind === 'lower-third') {
      const title = str(v.title, LIMITS.title) || out.text;
      if (!title) {
        warnings.push('lower-third without title, falling back to banner');
        out.kind = 'banner';
        return out;
      }
      out.title = title;
      const subtitle = str(v.subtitle, LIMITS.subtitle);
      if (subtitle) out.subtitle = subtitle;
    } else if (out.kind === 'combo') {
      const stepsRaw = Array.isArray(v.steps) ? v.steps : [];
      if (!Array.isArray(v.steps)) warnings.push('combo without steps');
      if (stepsRaw.length > LIMITS.comboSteps) warnings.push(`too many combo steps (${stepsRaw.length}), kept ${LIMITS.comboSteps}`);
      const steps = [];
      stepsRaw.slice(0, LIMITS.comboSteps).forEach((s, i) => {
        if (!s || typeof s !== 'object' || Array.isArray(s)) {
          warnings.push(`combo step #${i} is not an object, skipped`);
          return;
        }
        let delay = Number(s.delay);
        if (!Number.isFinite(delay) || delay < 0) {
          if (isSet(s.delay)) warnings.push(`invalid delay in combo step #${i}`);
          delay = 0;
        }
        const step = { delay: Math.min(LIMITS.comboDelay, Math.round(delay)), visual: normalizeVisual(s.visual, warnings, depth + 1) };
        if (isSet(s.sound)) {
          if (parseSound(s.sound)) step.sound = s.sound;
          else warnings.push(`invalid sound in combo step #${i}`);
        }
        steps.push(step);
      });
      if (!steps.length) {
        warnings.push('combo without usable steps, falling back to card');
        out.kind = 'card';
        return out;
      }
      out.steps = steps;
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
    if (isSet(raw.cooldown)) {
      const c = Number(raw.cooldown);
      if (Number.isFinite(c) && c >= 0) cooldown = Math.min(LIMITS.cooldown, c);
      else warnings.push('invalid cooldown');
    }

    let sound = null;
    if (isSet(raw.sound)) {
      if (parseSound(raw.sound)) sound = raw.sound;
      else warnings.push(`invalid sound "${String(raw.sound).slice(0, 40)}"`);
    }

    const trigger = { id, label, keywords, enabled, cooldown, sound, visual: normalizeVisual(raw.visual, warnings) };
    const hint = str(raw.hint, LIMITS.hint);
    if (hint) trigger.hint = hint;
    // v3: per-trigger volume multiplier (effective = master × gain). Only stored when given (default 1).
    const gain = normalizeGain(raw.gain, warnings);
    if (gain !== undefined) trigger.gain = gain;
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

  /** Band height in percent of the frame height, clamped to LIMITS.bandMin..bandMax; `undefined` when not numeric. */
  function normalizeBand(v) {
    if (!isSet(v)) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.round(Math.min(LIMITS.bandMax, Math.max(LIMITS.bandMin, n)));
  }

  /**
   * 2.2: overlay layout `{storyLayout, band, zone, bandPosition, storyStyle}` (the last two since 2.3). Keys that
   * are missing or invalid in `raw` come from `base` (default LAYOUT_DEFAULTS), then from the defaults (a 2.2 base
   * without the new keys gets `bandPosition: 'bottom'`, `storyStyle: 'mixed'`), so a partial message merges onto the
   * current layout. Never throws.
   */
  function normalizeLayout(raw, base = LAYOUT_DEFAULTS) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const b = base && typeof base === 'object' ? base : LAYOUT_DEFAULTS;
    const band = normalizeBand(r.band);
    const pick = (list, key) => (list.includes(r[key]) ? r[key] : list.includes(b[key]) ? b[key] : LAYOUT_ALL_DEFAULTS[key]);
    return {
      storyLayout: pick(STORY_LAYOUTS, 'storyLayout'),
      band: band !== undefined ? band : normalizeBand(b.band) !== undefined ? normalizeBand(b.band) : LAYOUT_DEFAULTS.band,
      zone: pick(ZONES, 'zone'),
      bandPosition: pick(BAND_POSITIONS, 'bandPosition'),
      storyStyle: pick(STORY_STYLES, 'storyStyle'),
    };
  }

  /**
   * 2.2: live-story scene state `{scene, loop?, weather, time, place, landmark?, actors:[{emoji, role, action?}],
   * props:[{emoji, role}], mood, caption?, end?, shake?}` as produced by js/story-director.js. `scene` must be one of
   * SCENES (or null = no scene), actors are capped at 6 / props at 5, strings are trimmed and cut, unknown moods become
   * `calm`. Returns null for a non-object.
   */
  function normalizeStoryState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const word = (v) => str(v, LIMITS.storyWord).replace(/[^\p{L}\p{N}_-]+/gu, '');
    const out = {
      scene: SCENES.includes(raw.scene) && raw.scene !== 'clear' ? raw.scene : null,
      weather: word(raw.weather) || 'clear',
      time: word(raw.time) || 'day',
      place: word(raw.place) || null,
      mood: STORY_MOODS.includes(raw.mood) ? raw.mood : 'calm',
      actors: [],
    };
    const sprites = (list, max, withAction) => {
      const res = [];
      for (const a of Array.isArray(list) ? list : []) {
        if (!a || typeof a !== 'object') continue;
        const emoji = str(a.emoji, LIMITS.emoji);
        if (!emoji) continue;
        const item = { emoji, role: word(a.role) || 'actor' };
        if (withAction && a.action && word(a.action)) item.action = word(a.action);
        res.push(item);
        if (res.length >= max) break;
      }
      return res;
    };
    out.actors = sprites(raw.actors, STORY_ACTORS_MAX, true);
    out.props = sprites(raw.props, STORY_PROPS_MAX, false);
    const landmark = word(raw.landmark);
    if (landmark) out.landmark = landmark;
    if (typeof raw.loop === 'string' && BUILTIN_SOUND_RE.test(raw.loop)) out.loop = raw.loop;
    const caption = str(raw.caption, LIMITS.text);
    if (caption) out.caption = caption;
    if (raw.end === true) out.end = true;
    if (raw.shake === true) out.shake = true;
    return out;
  }

  /**
   * Validates a bus envelope posted to /fire. Unknown keys are stripped. v3 adds `theme`, 2.1 `perf`, 2.2 `layout`,
   * `story`, `story-state`; 2.3 the layout keys `bandPosition` / `storyStyle`.
   */
  function validateEnvelope(msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return { ok: false, error: 'envelope is not an object' };
    const TYPES = ['fire', 'volume', 'theme', 'perf', 'layout', 'story', 'story-state'];
    if (!TYPES.includes(msg.type)) return { ok: false, error: `type must be one of ${TYPES.map((t) => `"${t}"`).join(', ')}` };
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
    } else if (msg.type === 'theme') {
      if (!THEMES.includes(msg.theme)) return { ok: false, error: `theme must be one of ${THEMES.join(', ')}` };
      out.theme = msg.theme;
    } else if (msg.type === 'perf') {
      if (!PERF_MODES.includes(msg.perf)) return { ok: false, error: `perf must be one of ${PERF_MODES.join(', ')}` };
      out.perf = msg.perf;
    } else if (msg.type === 'layout') {
      // Partial: only the keys given (and valid) travel; the receiver merges them onto its current layout.
      let any = false;
      if (isSet(msg.storyLayout)) {
        if (!STORY_LAYOUTS.includes(msg.storyLayout)) return { ok: false, error: `storyLayout must be one of ${STORY_LAYOUTS.join(', ')}` };
        out.storyLayout = msg.storyLayout;
        any = true;
      }
      if (isSet(msg.band)) {
        const band = normalizeBand(msg.band);
        if (band === undefined) return { ok: false, error: 'band must be a number (percent)' };
        out.band = band;
        any = true;
      }
      if (isSet(msg.zone)) {
        if (!ZONES.includes(msg.zone)) return { ok: false, error: `zone must be one of ${ZONES.join(', ')}` };
        out.zone = msg.zone;
        any = true;
      }
      if (isSet(msg.bandPosition)) {
        if (!BAND_POSITIONS.includes(msg.bandPosition)) return { ok: false, error: `bandPosition must be one of ${BAND_POSITIONS.join(', ')}` };
        out.bandPosition = msg.bandPosition;
        any = true;
      }
      if (isSet(msg.storyStyle)) {
        if (!STORY_STYLES.includes(msg.storyStyle)) return { ok: false, error: `storyStyle must be one of ${STORY_STYLES.join(', ')}` };
        out.storyStyle = msg.storyStyle;
        any = true;
      }
      if (!any) return { ok: false, error: 'layout needs storyLayout, band, zone, bandPosition or storyStyle' };
    } else if (msg.type === 'story') {
      const text = str(msg.text, LIMITS.storyText);
      if (!text) return { ok: false, error: 'story needs text' };
      out.text = text;
      out.final = msg.final !== false;
      const lang = typeof msg.lang === 'string' ? msg.lang.trim().toLowerCase().slice(0, 2) : '';
      if (['de', 'tr', 'en'].includes(lang)) out.lang = lang;
      const source = str(msg.source, LIMITS.sourceLen);
      if (source) out.source = source;
    } else if (msg.type === 'story-state') {
      const state = normalizeStoryState(msg.state);
      if (!state) return { ok: false, error: 'story-state needs a state object' };
      out.state = state;
    } else {
      const v = Number(msg.volume);
      if (!Number.isFinite(v)) return { ok: false, error: 'volume must be a number' };
      out.volume = Math.min(1, Math.max(0, v));
      // 2.2: optional bus; omitted = master (older senders / receivers keep working).
      if (isSet(msg.bus)) {
        if (!VOLUME_BUSES.includes(msg.bus)) return { ok: false, error: `bus must be one of ${VOLUME_BUSES.join(', ')}` };
        if (msg.bus !== 'master') out.bus = msg.bus;
      }
    }
    return { ok: true, msg: out };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  global.LiveFXSchema = {
    VERSION,
    SCHEMA_VERSION,
    KINDS,
    POSITIONS,
    SCENES,
    LOOPS,
    TEXT_STYLES,
    THEMES,
    LIMITS,
    ID_RE,
    SAFE_NAME,
    IMAGE_EXT,
    SOUND_EXT,
    ASSET_IMAGE_RE,
    UPLOAD_IMAGE_RE,
    MEMES_IMAGE_RE,
    ASSET_SOUND_RE,
    HTTP_SRC_RE,
    HOTLINK_SRC_RE,
    PERF_MODES,
    STORY_LAYOUTS,
    ZONES,
    BAND_POSITIONS,
    STORY_STYLES,
    BAND_POSITION_DEFAULT,
    STORY_STYLE_DEFAULT,
    LAYOUT_DEFAULTS,
    VOLUME_BUSES,
    VOLUME_DEFAULTS,
    STORY_MOODS,
    COLOR_RE,
    normalizeLayout,
    normalizeBand,
    normalizeStoryState,
    isSafeName,
    isImageSrc,
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
