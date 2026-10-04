// LiveFX – trigger editor dialog. `LiveFXEditor.open(trigger, {assets, sounds, onTest, onDelete})`
// resolves with the normalized trigger on „Speichern“ or null on cancel/Escape. One <dialog> is
// created lazily and reused. All injected strings are escaped. See docs/CONTRACTS.md §11.
// Story mode (1.3): kinds `scene` (scene select, intensity, caption) and `sticker`, plus the
// "Atmosphäre (Loop)" sound group (`loop:<name>` from LiveFXSounds.loops).
// LiveFX 2.0 (schema v3): kinds `text` (style, two colours), `lower-third` (title, subtitle) and `combo`
// (steps as JSON with validation), the flags glow / tilt / impact, an intensity select and a gain slider.
(function (global) {
  'use strict';

  const S = () => global.LiveFXSchema;
  const esc = (s) => S().escapeHtml(s);

  const KIND_LABELS = {
    card: 'Karte (Emoji + Text)',
    image: 'Bild',
    banner: 'Banner',
    rain: 'Emoji-Regen',
    confetti: 'Konfetti',
    scene: 'Szene (Hintergrund + Atmosphäre)',
    sticker: 'Sticker (2–4 Emojis)',
    text: 'Großer Text (animiert)',
    'lower-third': 'Bauchbinde (Titel + Untertitel)',
    combo: 'Combo (mehrere Schritte)',
  };
  const STYLE_LABELS = { neon: 'Neon (pulsierend)', gradient: 'Farbverlauf', bounce: 'Hüpfend', glitch: 'Glitch', sticker: 'Sticker (Comic)' };
  // German scene names for the scene select; unknown ids fall back to the id itself.
  const SCENE_LABELS = { rain: 'Regen', night: 'Nacht', forest: 'Wald', sea: 'Meer', fire: 'Feuer', castle: 'Schloss', snow: 'Schnee', desert: 'Wüste', city: 'Stadt', space: 'Weltraum', sunrise: 'Sonnenaufgang', storm: 'Gewitter', clear: 'Szene beenden' };
  const POS_LABELS = { center: 'Mitte', top: 'Oben', safe: 'Sicher (Hochkant: über dem Chat)' };
  // Which fields each visual kind uses. Others are hidden (values are kept in the draft anyway).
  const FIELDS_BY_KIND = {
    card: ['emoji', 'text', 'colors', 'position', 'intensity', 'fx'],
    image: ['image', 'emoji', 'text', 'position', 'intensity', 'fx'], // emoji = fallback when the image fails to load
    banner: ['emoji', 'text', 'position', 'intensity', 'fx'],
    rain: ['emoji', 'count', 'intensity', 'fx'],
    confetti: ['emoji', 'text', 'intensity', 'fx'],
    scene: ['scene', 'intensity', 'text'],
    sticker: ['emoji', 'text', 'position', 'intensity', 'fx'],
    text: ['emoji', 'text', 'style', 'colors', 'position', 'intensity', 'fx'],
    'lower-third': ['emoji', 'title', 'subtitle', 'colors', 'intensity', 'fx'],
    combo: ['steps', 'fx'],
  };
  // Which colour pickers of the colour row each kind shows.
  const COLORS_BY_KIND = { card: ['bg', 'color'], text: ['color', 'color2'], 'lower-third': ['color'] };
  const STEPS_PLACEHOLDER = '[\n  { "delay": 0, "visual": { "kind": "text", "text": "WOW", "style": "neon" }, "sound": "airhorn" },\n  { "delay": 600, "visual": { "kind": "confetti" } }\n]';

  /** Scene ids: LiveFXSchema.SCENES when the schema knows scenes, else the pack table, else []. */
  function sceneIds() {
    const sc = S();
    if (sc && Array.isArray(sc.SCENES) && sc.SCENES.length) return sc.SCENES.slice();
    const P = global.LiveFXPacks;
    return P && Array.isArray(P.SCENE_IDS) ? P.SCENE_IDS.slice() : [];
  }

  function sceneLabel(id) {
    const P = global.LiveFXPacks;
    const info = P && P.SCENE_INFO && Object.prototype.hasOwnProperty.call(P.SCENE_INFO, id) ? P.SCENE_INFO[id] : null;
    const emoji = info && info.emoji ? `${info.emoji} ` : '';
    return `${emoji}${SCENE_LABELS[id] || (info && info.label) || id}`;
  }

  let dialog = null;
  let current = null; // {resolve, opts, trigger}

  function option(value, label, selected) {
    return `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
  }

  function normalizeAssets(assets) {
    if (Array.isArray(assets)) {
      return global.LiveFXAssets && global.LiveFXAssets.groupAssets
        ? global.LiveFXAssets.groupAssets(assets)
        : { images: assets.filter((a) => a.type === 'image'), sounds: assets.filter((a) => a.type === 'sound') };
    }
    const a = assets && typeof assets === 'object' ? assets : {};
    return { images: Array.isArray(a.images) ? a.images : [], sounds: Array.isArray(a.sounds) ? a.sounds : [] };
  }

  function build() {
    const d = document.createElement('dialog');
    d.className = 'fx-editor';
    d.innerHTML = `
      <form method="dialog" class="fx-editor-form" novalidate>
        <header class="fx-editor-head">
          <h3 class="fx-editor-title">Trigger bearbeiten</h3>
          <button type="button" class="fx-editor-close" data-act="cancel" aria-label="Schließen">✕</button>
        </header>
        <div class="fx-editor-body">
          <div class="fx-editor-grid">
            <label class="fx-f fx-f-label">Name<input name="label" maxlength="40" required></label>
            <label class="fx-f fx-f-enabled fx-check"><input type="checkbox" name="enabled"> Aktiv</label>
            <label class="fx-f fx-f-keywords fx-wide">Stichwörter (durch Komma getrennt)<textarea name="keywords" rows="2" placeholder="krass, wow, unfassbar"></textarea></label>
            <label class="fx-f fx-f-hint fx-wide">Hinweis für KI (Smart-Modus)<input name="hint" maxlength="120" placeholder="z.B. Streamer ist völlig baff"></label>
            <label class="fx-f fx-f-cooldown">Cooldown (s)<input name="cooldown" type="number" min="0" max="3600" step="0.5"></label>
            <label class="fx-f fx-f-kind">Effekt<select name="kind"></select></label>
            <label class="fx-f fx-f-position" data-field="position">Position<select name="position"></select></label>
            <label class="fx-f fx-f-scene" data-field="scene">Szene<select name="scene"></select></label>
            <label class="fx-f fx-f-intensity" data-field="intensity">Intensität<select name="intensity"><option value="1">1 – dezent</option><option value="2">2 – kräftig (Lichtstrahlen)</option><option value="3">3 – maximal</option></select></label>
            <label class="fx-f fx-f-style" data-field="style">Stil<select name="style"></select></label>
            <label class="fx-f fx-f-emoji" data-field="emoji">Emoji<input name="emoji" maxlength="32" placeholder="🤯"></label>
            <label class="fx-f fx-f-text" data-field="text">Text<input name="text" maxlength="80" placeholder="KRASS"></label>
            <label class="fx-f fx-f-title" data-field="title">Titel<input name="title" maxlength="60" placeholder="Max Mustermann"></label>
            <label class="fx-f fx-f-subtitle" data-field="subtitle">Untertitel<input name="subtitle" maxlength="80" placeholder="Gast von heute"></label>
            <div class="fx-f fx-f-colors fx-wide" data-field="colors">
              <div class="fx-color-row">
                <label data-color="bg">Hintergrund<span class="fx-color-pick"><input type="color" name="bg" value="#111111"><label class="fx-check fx-inline"><input type="checkbox" name="bgDefault"> Standard</label></span></label>
                <label data-color="color">Textfarbe<span class="fx-color-pick"><input type="color" name="color" value="#ffffff"><label class="fx-check fx-inline"><input type="checkbox" name="colorDefault"> Standard</label></span></label>
                <label data-color="color2">Zweite Farbe<span class="fx-color-pick"><input type="color" name="color2" value="#dd2476"><label class="fx-check fx-inline"><input type="checkbox" name="color2Default"> Standard</label></span></label>
              </div>
            </div>
            <div class="fx-f fx-f-steps fx-wide" data-field="steps">
              <label>Combo-Schritte (JSON, max. 6 – <code>delay</code> in ms, <code>visual</code> wie oben, optional <code>sound</code>)<textarea name="steps" rows="6" spellcheck="false"></textarea></label>
              <div class="fx-steps-error" hidden></div>
            </div>
            <div class="fx-f fx-f-image fx-wide" data-field="image">
              <label>Bild<select name="src"></select></label>
              <div class="fx-image-row">
                <img class="fx-image-preview" alt="" hidden>
                <button type="button" class="small" data-act="upload-image">Hochladen…</button>
                <input type="file" accept="image/*" hidden class="fx-image-file">
                <span class="fx-image-status"></span>
              </div>
            </div>
            <label class="fx-f fx-f-sound">Sound<select name="sound"></select></label>
            <label class="fx-f fx-f-count" data-field="count">Anzahl<input name="count" type="number" min="1" max="60" step="1"></label>
            <label class="fx-f fx-f-shake fx-check"><input type="checkbox" name="shake"> Screen-Shake</label>
            <div class="fx-f fx-f-fx fx-wide fx-flags" data-field="fx">
              <label class="fx-check fx-inline"><input type="checkbox" name="glow"> Glow</label>
              <label class="fx-check fx-inline"><input type="checkbox" name="tilt"> 3D-Kippen</label>
              <label class="fx-check fx-inline"><input type="checkbox" name="impact"> Impact (Zoom-Stoß)</label>
            </div>
            <label class="fx-f fx-f-gain fx-wide">Lautstärke dieses Triggers <output name="gainOut">100 %</output><input name="gain" type="range" min="0" max="1" step="0.05" value="1"></label>
          </div>
          <div class="fx-editor-warnings" hidden></div>
        </div>
        <footer class="fx-editor-foot">
          <button type="button" class="danger" data-act="delete" hidden>Löschen</button>
          <span class="fx-spacer"></span>
          <button type="button" data-act="test">▶ Testen</button>
          <button type="button" data-act="cancel">Abbrechen</button>
          <button type="button" class="primary" data-act="save">Speichern</button>
        </footer>
      </form>`;
    document.body.appendChild(d);

    d.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || !current) return;
      const act = btn.dataset.act;
      if (act === 'cancel') finish(null);
      else if (act === 'save') save();
      else if (act === 'test') test();
      else if (act === 'delete') remove();
      else if (act === 'upload-image') d.querySelector('.fx-image-file').click();
    });
    d.addEventListener('cancel', (ev) => {
      // Escape key: the browser closes the dialog; resolve null.
      ev.preventDefault();
      finish(null);
    });
    d.addEventListener('close', () => {
      // `close` is dispatched asynchronously; a new open() may already have re-shown the dialog.
      if (current && !d.open) finish(null);
    });
    d.querySelector('form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      save();
    });
    d.querySelector('[name="kind"]').addEventListener('change', updateVisibility);
    d.querySelector('[name="src"]').addEventListener('change', updatePreview);
    d.querySelector('[name="bgDefault"]').addEventListener('change', updateColorState);
    d.querySelector('[name="colorDefault"]').addEventListener('change', updateColorState);
    d.querySelector('[name="color2Default"]').addEventListener('change', updateColorState);
    d.querySelector('[name="gain"]').addEventListener('input', updateGainLabel);
    d.querySelector('[name="steps"]').addEventListener('input', () => validateSteps(true));
    d.querySelector('.fx-image-file').addEventListener('change', onImageFile);
    return d;
  }

  function field(name) {
    return dialog.querySelector(`[name="${name}"]`);
  }

  function fillSelects(opts, trigger) {
    const v = trigger.visual || {};
    const sc = S();
    field('kind').innerHTML = sc.KINDS.map((k) => option(k, KIND_LABELS[k] || k, (v.kind || 'card') === k)).join('');
    const scenes = sceneIds();
    const curScene = typeof v.scene === 'string' && scenes.includes(v.scene) ? v.scene : scenes[0] || '';
    field('scene').innerHTML = scenes.map((id) => option(id, sceneLabel(id), id === curScene)).join('');
    field('position').innerHTML = sc.POSITIONS.map((p) => option(p, POS_LABELS[p] || p, (v.position || 'center') === p)).join('');
    const styles = Array.isArray(sc.TEXT_STYLES) && sc.TEXT_STYLES.length ? sc.TEXT_STYLES : ['neon', 'gradient', 'bounce', 'glitch'];
    field('style').innerHTML = styles.map((st) => option(st, STYLE_LABELS[st] || st, (v.style || 'neon') === st)).join('');

    const assets = normalizeAssets(opts.assets);
    const imgs = assets.images.slice();
    const curSrc = typeof v.src === 'string' ? v.src : '';
    if (curSrc && !imgs.some((a) => a.url === curSrc)) imgs.unshift({ name: curSrc, url: curSrc });
    field('src').innerHTML = option('', '– kein Bild gewählt –', !curSrc) + imgs.map((a) => option(a.url, a.name, a.url === curSrc)).join('');

    const builtin = Array.isArray(opts.sounds) ? opts.sounds : global.LiveFXSounds ? global.LiveFXSounds.names : [];
    const cur = typeof trigger.sound === 'string' ? trigger.sound : '';
    let html = option('', '– keiner –', !cur);
    html += builtin.map((n) => option(n, n, n === cur)).join('');
    const files = assets.sounds.map((a) => `file:${a.url}`);
    if (cur.startsWith('file:') && !files.includes(cur)) files.unshift(cur);
    html += files.map((f) => option(f, `🎵 ${f.replace(/^file:assets\//, '')}`, f === cur)).join('');
    // Ambient loops ("loop:<name>", story mode). Guarded: older sounds.js has no `loops`.
    const loopSrc = Array.isArray(opts.loops) ? opts.loops : global.LiveFXSounds && Array.isArray(global.LiveFXSounds.loops) ? global.LiveFXSounds.loops : [];
    const loops = loopSrc.filter((n) => typeof n === 'string' && /^[a-z][a-zA-Z0-9]{0,30}$/.test(n)).map((n) => `loop:${n}`);
    if (cur.startsWith('loop:') && !loops.includes(cur)) loops.unshift(cur);
    if (loops.length) html += `<optgroup label="Atmosphäre (Loop)">${loops.map((l) => option(l, `🌫️ ${l.slice(5)}`, l === cur)).join('')}</optgroup>`;
    field('sound').innerHTML = html;
  }

  function fillForm(trigger) {
    const v = trigger.visual || {};
    field('label').value = trigger.label || '';
    field('enabled').checked = trigger.enabled !== false;
    field('keywords').value = Array.isArray(trigger.keywords) ? trigger.keywords.join(', ') : String(trigger.keywords || '');
    field('hint').value = trigger.hint || '';
    field('cooldown').value = trigger.cooldown === undefined || trigger.cooldown === null ? 4 : trigger.cooldown;
    field('emoji').value = v.emoji || '';
    field('text').value = v.text || '';
    field('count').value = v.count || 20;
    const defaultIntensity = v.kind === 'scene' ? 2 : 1;
    field('intensity').value = String(v.intensity === undefined || v.intensity === null ? defaultIntensity : Math.min(3, Math.max(1, Math.round(Number(v.intensity)) || defaultIntensity)));
    field('shake').checked = v.shake === true;
    field('title').value = v.title || '';
    field('subtitle').value = v.subtitle || '';
    field('steps').value = Array.isArray(v.steps) && v.steps.length ? JSON.stringify(v.steps, null, 2) : '';
    field('steps').placeholder = STEPS_PLACEHOLDER;
    for (const f of ['glow', 'tilt', 'impact']) field(f).checked = v[f] === true;
    const gain = Number(trigger.gain);
    field('gain').value = String(Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 1);
    updateGainLabel();
    setColor('bg', v.bg, '#111111');
    setColor('color', v.color, '#ffffff');
    setColor('color2', v.color2, '#dd2476');
    validateSteps(false);
    updateVisibility();
    updatePreview();
  }

  function updateGainLabel() {
    const out = dialog.querySelector('[name="gainOut"]');
    if (out) out.value = `${Math.round(Number(field('gain').value) * 100)} %`;
  }

  /**
   * Parses the combo steps textarea. Returns `{steps, error}`; `error` is a German message when the JSON
   * is invalid or not an array of step objects. `show` renders the message under the textarea.
   */
  function validateSteps(show) {
    const raw = field('steps').value.trim();
    const box = dialog.querySelector('.fx-steps-error');
    let steps = [];
    let error = '';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) error = 'Combo-Schritte müssen ein JSON-Array sein ([ … ]).';
        else if (!parsed.length) error = 'Mindestens ein Schritt wird gebraucht.';
        else if (parsed.length > 6) error = `Maximal 6 Schritte (aktuell ${parsed.length}).`;
        else if (parsed.some((st) => !st || typeof st !== 'object' || Array.isArray(st))) error = 'Jeder Schritt muss ein Objekt { "delay": …, "visual": { … } } sein.';
        else if (parsed.some((st) => st.visual && st.visual.kind === 'combo')) error = 'Ein Combo-Schritt darf selbst keine Combo sein.';
        else steps = parsed;
      } catch (e) {
        error = `Ungültiges JSON: ${e.message}`;
      }
    } else error = 'Combo-Schritte fehlen.';
    if (show || !error) {
      box.textContent = error;
      box.hidden = !error;
    }
    return { steps, error };
  }

  /** <input type=color> only understands #rrggbb; other formats keep "Standard" checked. */
  function setColor(name, value, fallback) {
    const hex = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
    field(name).value = hex || fallback;
    field(`${name}Default`).checked = !value;
    field(name).dataset.raw = value && !hex ? value : '';
    updateColorState();
  }

  function updateColorState() {
    for (const n of ['bg', 'color', 'color2']) field(n).disabled = field(`${n}Default`).checked;
  }

  function updateVisibility() {
    const kind = field('kind').value;
    const show = FIELDS_BY_KIND[kind] || FIELDS_BY_KIND.card;
    for (const el of dialog.querySelectorAll('[data-field]')) el.hidden = !show.includes(el.dataset.field);
    const colors = COLORS_BY_KIND[kind] || COLORS_BY_KIND.card;
    for (const el of dialog.querySelectorAll('[data-color]')) el.hidden = !colors.includes(el.dataset.color);
    // 3D tilt only makes sense for card-like kinds.
    dialog.querySelector('[name="tilt"]').closest('label').hidden = !['card', 'image', 'confetti'].includes(kind);
  }

  function updatePreview() {
    const img = dialog.querySelector('.fx-image-preview');
    const src = field('src').value;
    const sc = S();
    if (src && (sc.ASSET_IMAGE_RE.test(src) || (sc.HOTLINK_SRC_RE || sc.HTTP_SRC_RE).test(src))) {
      img.setAttribute('src', src);
      img.hidden = false;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
    }
  }

  async function onImageFile() {
    const input = dialog.querySelector('.fx-image-file');
    const status = dialog.querySelector('.fx-image-status');
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !current) return;
    if (!global.LiveFXAssets) {
      status.textContent = 'Upload nicht verfügbar (assets.js fehlt)';
      return;
    }
    status.textContent = `Lade „${file.name}“ hoch …`;
    try {
      const asset = await global.LiveFXAssets.upload(file);
      status.textContent = 'Hochgeladen.';
      const a = normalizeAssets(current.opts.assets);
      if (asset && asset.type === 'image') a.images.push(asset);
      current.opts.assets = a;
      const draft = readDraft();
      draft.visual.src = asset.url;
      fillSelects(current.opts, draft);
      updatePreview();
      if (typeof current.opts.onAssetsChange === 'function') current.opts.onAssetsChange(a);
    } catch (e) {
      status.textContent = `Fehler: ${e.message}`;
    }
  }

  /** Reads the form into a raw trigger object (not yet normalized). */
  function readDraft() {
    const base = current.trigger;
    const kind = field('kind').value;
    const visual = { kind, position: field('position').value };
    const emoji = field('emoji').value.trim();
    const text = field('text').value.trim();
    if (emoji) visual.emoji = emoji;
    if (text) visual.text = text;
    const colors = COLORS_BY_KIND[kind] || [];
    if (colors.includes('bg') && !field('bgDefault').checked) visual.bg = field('bg').dataset.raw || field('bg').value;
    if (colors.includes('color') && !field('colorDefault').checked) visual.color = field('color').dataset.raw || field('color').value;
    if (colors.includes('color2') && !field('color2Default').checked) visual.color2 = field('color2').dataset.raw || field('color2').value;
    if (kind === 'image') visual.src = field('src').value;
    if (kind === 'rain') visual.count = Number(field('count').value) || undefined;
    if (kind === 'scene') visual.scene = field('scene').value;
    if (kind === 'text') visual.style = field('style').value;
    if (kind === 'lower-third') {
      const title = field('title').value.trim();
      const subtitle = field('subtitle').value.trim();
      if (title) visual.title = title;
      if (subtitle) visual.subtitle = subtitle;
    }
    current.stepsError = '';
    if (kind === 'combo') {
      const { steps, error } = validateSteps(true);
      visual.steps = steps;
      current.stepsError = error;
    }
    const show = FIELDS_BY_KIND[kind] || FIELDS_BY_KIND.card;
    if (show.includes('intensity')) {
      const it = Number(field('intensity').value);
      const def = kind === 'scene' ? 2 : 1;
      if (Number.isFinite(it) && field('intensity').value !== '' && (kind === 'scene' || Math.round(it) !== def)) visual.intensity = Math.min(3, Math.max(1, Math.round(it)));
    }
    if (field('shake').checked) visual.shake = true;
    if (show.includes('fx')) {
      if (field('glow').checked) visual.glow = true;
      if (field('impact').checked) visual.impact = true;
      if (field('tilt').checked && !field('tilt').closest('label').hidden) visual.tilt = true;
    }
    const draft = {
      id: base.id,
      label: field('label').value.trim(),
      keywords: field('keywords').value,
      enabled: field('enabled').checked,
      cooldown: field('cooldown').value === '' ? 4 : Number(field('cooldown').value),
      sound: field('sound').value || null,
      visual,
    };
    const gain = Number(field('gain').value);
    if (Number.isFinite(gain) && gain < 1) draft.gain = Math.max(0, gain);
    const hint = field('hint').value.trim();
    if (hint) draft.hint = hint;
    // Keep unknown extra keys of the original (e.g. hotkey) so nothing silently disappears.
    for (const k of Object.keys(base)) if (!(k in draft) && !k.startsWith('_')) draft[k] = base[k];
    return draft;
  }

  function normalizedDraft() {
    const draft = readDraft();
    const n = S().normalizeTrigger(draft, { usedIds: new Set() });
    if (!n) return { trigger: null, warnings: ['Trigger ungültig'] };
    const warnings = n.warnings.map((w) => w.replace(/^[^:]+: /, ''));
    if (current.stepsError) warnings.unshift(`Combo-Schritte: ${current.stepsError}`);
    return { trigger: n.trigger, warnings };
  }

  function showWarnings(list) {
    const box = dialog.querySelector('.fx-editor-warnings');
    if (!list || !list.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    box.innerHTML = `<b>Hinweise:</b><ul>${list.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
  }

  function test() {
    const { trigger, warnings } = normalizedDraft();
    showWarnings(warnings);
    if (trigger && typeof current.opts.onTest === 'function') current.opts.onTest(trigger);
  }

  function save() {
    const { trigger, warnings } = normalizedDraft();
    if (!trigger) {
      showWarnings(warnings);
      return;
    }
    if (!field('label').value.trim()) {
      showWarnings(['Bitte einen Namen eingeben.']);
      field('label').focus();
      return;
    }
    if (current.stepsError) {
      showWarnings(warnings);
      field('steps').focus();
      return;
    }
    showWarnings(warnings);
    if (typeof current.opts.onSave === 'function') current.opts.onSave(trigger);
    finish(trigger);
  }

  function remove() {
    if (typeof current.opts.onDelete !== 'function') return;
    if (!global.confirm(`„${current.trigger.label || current.trigger.id}“ wirklich löschen?`)) return;
    const t = current.trigger;
    const done = current;
    finish(null);
    done.opts.onDelete(t);
  }

  function finish(result) {
    const c = current;
    if (!c) return;
    current = null;
    try {
      if (dialog.open) dialog.close();
    } catch (_) {
      /* ignore */
    }
    c.resolve(result);
  }

  /**
   * @param {object} trigger  existing trigger (or a fresh one with an id from LiveFXSchema.newId)
   * @param {{assets?: {images:[], sounds:[]}|[], sounds?: string[], onTest?, onSave?, onDelete?, onAssetsChange?, title?}} opts
   * @returns {Promise<object|null>} normalized trigger, or null when cancelled
   */
  function open(trigger, opts = {}) {
    if (!S()) return Promise.reject(new Error('LiveFXSchema fehlt'));
    if (!dialog) dialog = build();
    if (current) finish(null);
    const t = trigger && typeof trigger === 'object' ? JSON.parse(JSON.stringify(trigger)) : {};
    if (!t.id) t.id = S().newId('t');
    return new Promise((resolve) => {
      current = { resolve, opts: { ...opts }, trigger: t };
      dialog.querySelector('.fx-editor-title').textContent = opts.title || (trigger && trigger.label ? `Trigger: ${trigger.label}` : 'Neuer Trigger');
      dialog.querySelector('[data-act="delete"]').hidden = typeof opts.onDelete !== 'function';
      dialog.querySelector('[data-act="test"]').hidden = typeof opts.onTest !== 'function';
      dialog.querySelector('.fx-image-status').textContent = '';
      showWarnings([]);
      fillSelects(current.opts, t);
      fillForm(t);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      setTimeout(() => field('label').focus(), 0);
    });
  }

  function close() {
    finish(null);
  }

  global.LiveFXEditor = { open, close, isOpen: () => !!current };
})(typeof window !== 'undefined' ? window : globalThis);
