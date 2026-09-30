// LiveFX – trigger editor dialog. `LiveFXEditor.open(trigger, {assets, sounds, onTest, onDelete})`
// resolves with the normalized trigger on „Speichern“ or null on cancel/Escape. One <dialog> is
// created lazily and reused. All injected strings are escaped. See docs/CONTRACTS.md §11.
// Story mode (1.3): kinds `scene` (scene select, intensity, caption) and `sticker`, plus the
// "Atmosphäre (Loop)" sound group (`loop:<name>` from LiveFXSounds.loops).
(function (global) {
  'use strict';

  const S = () => global.LiveFXSchema;
  const esc = (s) => S().escapeHtml(s);

  const KIND_LABELS = { card: 'Karte (Emoji + Text)', image: 'Bild', banner: 'Banner', rain: 'Emoji-Regen', confetti: 'Konfetti', scene: 'Szene (Hintergrund + Atmosphäre)', sticker: 'Sticker (2–4 Emojis)' };
  // German scene names for the scene select; unknown ids fall back to the id itself.
  const SCENE_LABELS = { rain: 'Regen', night: 'Nacht', forest: 'Wald', sea: 'Meer', fire: 'Feuer', castle: 'Schloss', snow: 'Schnee', desert: 'Wüste', city: 'Stadt', space: 'Weltraum', sunrise: 'Sonnenaufgang', storm: 'Gewitter', clear: 'Szene beenden' };
  const POS_LABELS = { center: 'Mitte', top: 'Oben', safe: 'Sicher (Hochkant: über dem Chat)' };
  // Which fields each visual kind uses. Others are hidden (values are kept in the draft anyway).
  const FIELDS_BY_KIND = {
    card: ['emoji', 'text', 'colors', 'position'],
    image: ['image', 'text', 'position'],
    banner: ['emoji', 'text', 'position'],
    rain: ['emoji', 'count'],
    confetti: ['emoji', 'text'],
    scene: ['scene', 'intensity', 'text'],
    sticker: ['emoji', 'text', 'position'],
  };

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
            <label class="fx-f fx-f-intensity" data-field="intensity">Intensität (1–3)<input name="intensity" type="number" min="1" max="3" step="1"></label>
            <label class="fx-f fx-f-emoji" data-field="emoji">Emoji<input name="emoji" maxlength="32" placeholder="🤯"></label>
            <label class="fx-f fx-f-text" data-field="text">Text<input name="text" maxlength="80" placeholder="KRASS"></label>
            <div class="fx-f fx-f-colors fx-wide" data-field="colors">
              <div class="fx-color-row">
                <label>Hintergrund<span class="fx-color-pick"><input type="color" name="bg" value="#111111"><label class="fx-check fx-inline"><input type="checkbox" name="bgDefault"> Standard</label></span></label>
                <label>Textfarbe<span class="fx-color-pick"><input type="color" name="color" value="#ffffff"><label class="fx-check fx-inline"><input type="checkbox" name="colorDefault"> Standard</label></span></label>
              </div>
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
    field('intensity').value = v.intensity === undefined || v.intensity === null ? 2 : v.intensity;
    field('shake').checked = v.shake === true;
    setColor('bg', v.bg, '#111111');
    setColor('color', v.color, '#ffffff');
    updateVisibility();
    updatePreview();
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
    for (const n of ['bg', 'color']) field(n).disabled = field(`${n}Default`).checked;
  }

  function updateVisibility() {
    const kind = field('kind').value;
    const show = FIELDS_BY_KIND[kind] || FIELDS_BY_KIND.card;
    for (const el of dialog.querySelectorAll('[data-field]')) el.hidden = !show.includes(el.dataset.field);
  }

  function updatePreview() {
    const img = dialog.querySelector('.fx-image-preview');
    const src = field('src').value;
    const sc = S();
    if (src && (sc.ASSET_IMAGE_RE.test(src) || sc.HTTP_SRC_RE.test(src))) {
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
    if (kind === 'card') {
      if (!field('bgDefault').checked) visual.bg = field('bg').dataset.raw || field('bg').value;
      if (!field('colorDefault').checked) visual.color = field('color').dataset.raw || field('color').value;
    }
    if (kind === 'image') visual.src = field('src').value;
    if (kind === 'rain') visual.count = Number(field('count').value) || undefined;
    if (kind === 'scene') {
      visual.scene = field('scene').value;
      const it = Number(field('intensity').value);
      if (Number.isFinite(it) && field('intensity').value !== '') visual.intensity = Math.min(3, Math.max(1, Math.round(it)));
    }
    if (field('shake').checked) visual.shake = true;
    const draft = {
      id: base.id,
      label: field('label').value.trim(),
      keywords: field('keywords').value,
      enabled: field('enabled').checked,
      cooldown: field('cooldown').value === '' ? 4 : Number(field('cooldown').value),
      sound: field('sound').value || null,
      visual,
    };
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
    return { trigger: n.trigger, warnings: n.warnings.map((w) => w.replace(/^[^:]+: /, '')) };
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
