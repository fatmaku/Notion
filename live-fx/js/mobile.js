// LiveFX – mobile remote (mobile.html): a phone-first mirror of the panel's soundboard. Tiles fire
// triggers through the bus (role `panel`, so the server broadcasts them to every overlay), the header
// pauses effects and sets the overlay volume, the scenes row mirrors the panel's scene pad, and the
// microphone button runs the browser ASR + matcher on the phone when the page is a secure context
// (https or localhost). See docs/HANDY.md and docs/CONTRACTS.md §11 "Mobile".
// 2.2: favourites (long-press / ⭐, localStorage `livefx.mobile.favs`), „Leiser/Lauter“ (±6 dB master,
// `{type:'volume', volume}`), story band + effect zone buttons (`{type:'layout', storyLayout}` /
// `{type:'layout', zone}`), pack tiles (load/unload through LiveFXPacksStore + LiveFXStore – the phone is a
// full remote, not only a soundboard).
// 2.3: story look buttons – „✏️ Stil“ cycles `{type:'layout', storyStyle}` mixed → sketch → emoji, „📐 Band“ toggles
// `{type:'layout', bandPosition}` bottom ↔ chat (portrait only); localStorage `livefx.mobile.look`, and both follow
// the server's remembered layout (`state.layout`) and layout messages from the panel.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const S = window.LiveFXSchema;
  const esc = (s) => S.escapeHtml(s == null ? '' : s);
  const SOURCE = 'Handy';
  const MIC_SOURCE = 'Handy-Mikro';
  const FLASH_MS = 350;
  const TRANSCRIPT_MAX = 160;
  const LANG_KEY = 'livefx.asr.lang';
  const FAVS_KEY = 'livefx.mobile.favs';
  const LAYOUT_KEY = 'livefx.mobile.layout';
  const MIC_HINT = 'Mikro am Handy braucht HTTPS – im Panel „Internet-Link“ starten oder docs/HANDY.md lesen.';
  const LONG_PRESS_MS = 550;
  const DB6 = 2; // +6 dB ≈ ×2, −6 dB ≈ ×0.5
  const VOL_MIN_STEP = 0.1;
  const ZONES = [
    { id: 'full', label: 'überall' },
    { id: 'edges', label: 'Ränder' },
    { id: 'bottom', label: 'unten' },
    { id: 'top', label: 'oben' },
  ];
  // 2.3 story look (same values as LiveFXSchema.STORY_STYLES / BAND_POSITIONS, cycle order = button order)
  const LOOK_KEY = 'livefx.mobile.look';
  const STYLES = [
    { id: 'mixed', label: 'Gemischt' },
    { id: 'sketch', label: 'Zeichnung' },
    { id: 'emoji', label: 'Emoji' },
  ];
  const BAND_POS = [
    { id: 'bottom', label: 'ganz unten' },
    { id: 'chat', label: 'über dem Chat' },
  ];
  const LOOK_DEFAULTS = { storyStyle: 'mixed', bandPosition: 'bottom' };

  // Scene pad mapping – copied from js/packs.js SCENE_INFO / js/panel.js sceneTrigger so the phone
  // fires exactly what the panel's scene pad fires (`loop` = LiveFXSounds.loops name or null).
  const SCENE_TABLE = {
    rain: { emoji: '🌧️', label: 'Regen', loop: 'rain' },
    night: { emoji: '🌙', label: 'Nacht', loop: 'nightCrickets' },
    forest: { emoji: '🌲', label: 'Wald', loop: 'birds' },
    sea: { emoji: '🌊', label: 'Meer', loop: 'sea' },
    fire: { emoji: '🔥', label: 'Feuer', loop: 'fireplace' },
    castle: { emoji: '🏰', label: 'Schloss', loop: 'churchBells' },
    snow: { emoji: '❄️', label: 'Schnee', loop: 'wind' },
    desert: { emoji: '🏜️', label: 'Wüste', loop: 'wind' },
    city: { emoji: '🌆', label: 'Stadt', loop: 'cityHum' },
    space: { emoji: '🪐', label: 'Weltraum', loop: 'spaceDrone' },
    sunrise: { emoji: '🌅', label: 'Sonnenaufgang', loop: 'birds' },
    storm: { emoji: '⛈️', label: 'Gewitter', loop: 'storm' },
    clear: { emoji: '🎬', label: 'Szene beenden', loop: null },
  };

  // ---------- state ----------
  const bus = new LiveFXBus.Bus({ role: 'panel' });
  LiveFXStore.attachBus(bus);
  const online = bus.serverBase !== null;
  const secure = !!window.isSecureContext;
  let triggers = [];
  let paused = false;
  let query = '';
  let asr = null;
  let matcher = null;
  let micWanted = false;
  let micLang = '';
  let transcriptTimer = null;
  let favs = readFavs();
  let volume = 0.8;
  let layout = readLayout();
  let look = readLook();

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* private mode / quota */
    }
  }
  function readFavs() {
    try {
      const parsed = JSON.parse(lsGet(FAVS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 60) : [];
    } catch (_) {
      return [];
    }
  }
  function readLayout() {
    try {
      const p = JSON.parse(lsGet(LAYOUT_KEY) || '{}');
      return { band: p && p.band === true, zone: p && ZONES.some((z) => z.id === p.zone) ? p.zone : 'full' };
    } catch (_) {
      return { band: false, zone: 'full' };
    }
  }

  function cleanLook(raw, base) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const b = base || LOOK_DEFAULTS;
    return {
      storyStyle: STYLES.some((x) => x.id === r.storyStyle) ? r.storyStyle : b.storyStyle,
      bandPosition: BAND_POS.some((x) => x.id === r.bandPosition) ? r.bandPosition : b.bandPosition,
    };
  }
  function readLook() {
    try {
      return cleanLook(JSON.parse(lsGet(LOOK_KEY) || '{}'));
    } catch (_) {
      return { ...LOOK_DEFAULTS };
    }
  }

  function labelOf(t) {
    return (t && (t.label || t.id)) || '?';
  }

  /** Public copy of a trigger: internal `_`-prefixed matcher keys stripped. */
  function publicTrigger(t) {
    const out = {};
    for (const k of Object.keys(t)) if (!k.startsWith('_')) out[k] = t[k];
    return out;
  }

  // ---------- transcript line ----------
  function showLine(html, { sticky = false } = {}) {
    const el = $('#transcript');
    if (!el) return;
    el.innerHTML = html;
    clearTimeout(transcriptTimer);
    if (!sticky) transcriptTimer = setTimeout(() => (el.innerHTML = '<span class="muted">Bereit.</span>'), 6000);
  }

  function showText(text, isFinal, keywords) {
    const raw = String(text == null ? '' : text).slice(-TRANSCRIPT_MAX);
    const marks = (keywords || []).map((k) => String(k).trim()).filter(Boolean);
    let html = esc(raw);
    for (const kw of marks) {
      const re = new RegExp(esc(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      html = html.replace(re, (m) => `<mark>${m}</mark>`);
    }
    showLine(isFinal ? html : `<span class="interim">${html}</span>`, { sticky: !isFinal });
  }

  // ---------- firing ----------
  function fire(trigger, source) {
    if (!trigger || typeof trigger !== 'object') return false;
    const src = String(source || SOURCE).slice(0, S.LIMITS.sourceLen);
    if (paused) {
      showLine(`⏸ (pausiert) ${esc(labelOf(trigger))}`);
      return false;
    }
    bus.send({ type: 'fire', trigger: publicTrigger(trigger), source: src });
    showLine(`🔥 ${esc(labelOf(trigger))}`);
    return true;
  }

  /** Tile taps: explicit user action, ignores cooldowns but not the enabled flag. */
  function manualFire(trigger, btn) {
    if (!trigger) return;
    if (trigger.enabled === false) {
      showLine(`🚫 ${esc(labelOf(trigger))} ist deaktiviert`);
      return;
    }
    if (fire(trigger, SOURCE) && btn) {
      btn.classList.add('fired');
      setTimeout(() => btn.classList.remove('fired'), FLASH_MS);
    }
  }

  // ---------- tiles ----------
  function matches(t, q) {
    if (!q) return true;
    const hay = [labelOf(t), t.id, ...(Array.isArray(t.keywords) ? t.keywords : [])].join(' ').toLowerCase();
    return hay.includes(q);
  }

  // ---------- favourites (2.2) ----------
  function isFav(id) {
    return favs.includes(id);
  }

  function setFav(id, on) {
    const next = favs.filter((x) => x !== id);
    if (on) next.unshift(id);
    favs = next.slice(0, 60);
    lsSet(FAVS_KEY, JSON.stringify(favs));
    renderFavs();
    for (const b of $('#pad').querySelectorAll(`button[data-id="${CSS.escape(id)}"]`)) b.classList.toggle('fav', on);
    const t = triggers.find((x) => x.id === id);
    showLine(on ? `⭐ ${esc(labelOf(t))} als Favorit gespeichert` : `☆ ${esc(labelOf(t))} aus den Favoriten entfernt`);
  }

  function toggleFav(id) {
    setFav(id, !isFav(id));
  }

  /** Long press (touch or mouse) on a tile toggles the favourite; a normal tap fires. */
  function attachLongPress(b, t) {
    let timer = null;
    let fired = false;
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };
    b.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      fired = false;
      cancel();
      timer = setTimeout(() => {
        fired = true;
        toggleFav(t.id);
        if (navigator.vibrate) navigator.vibrate(20);
      }, LONG_PRESS_MS);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) {
      b.addEventListener(ev, (e) => {
        if (ev === 'pointermove' && e.pressure !== 0 && timer) return; // small jitter is fine
        if (ev !== 'pointermove') cancel();
      });
    }
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      if (fired) {
        fired = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  function tile(t, { star = true } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = t.id;
    b.className = `${t.enabled === false ? 'off' : ''}${isFav(t.id) ? ' fav' : ''}`.trim();
    b.title = t.enabled === false ? `${labelOf(t)} (deaktiviert)` : labelOf(t);
    const thumb = LiveFXAssets.thumbnailFor(t);
    const visual = thumb.img ? `<img class="thumb" alt="" src="${esc(thumb.img)}">` : `<span class="emoji">${esc(thumb.emoji || '✨')}</span>`;
    b.innerHTML = `${visual}<span class="lbl">${esc(labelOf(t))}</span>${star ? '<span class="star" data-act="fav" title="Favorit" aria-label="Favorit">★</span>' : ''}`;
    b.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.closest && target.closest('[data-act="fav"]')) {
        toggleFav(t.id);
        return;
      }
      manualFire(t, b);
    });
    attachLongPress(b, t);
    return b;
  }

  function renderFavs() {
    const card = $('#favs-card');
    const root = $('#favs');
    if (!card || !root) return;
    const byId = new Map(triggers.map((t) => [t.id, t]));
    const list = favs.map((id) => byId.get(id)).filter(Boolean);
    root.innerHTML = '';
    for (const t of list) root.appendChild(tile(t, { star: true }));
    $('#favs-count').textContent = String(list.length);
    card.hidden = !list.length;
  }

  function renderPad() {
    const pad = $('#pad');
    pad.innerHTML = '';
    let shown = 0;
    triggers.forEach((t) => {
      const b = tile(t);
      b.hidden = !matches(t, query);
      if (!b.hidden) shown++;
      pad.appendChild(b);
    });
    $('#count').textContent = query ? `${shown}/${triggers.length}` : String(triggers.length);
    $('#empty').hidden = shown > 0;
    renderFavs();
    renderPacks();
  }

  // ---------- packs (2.2) ----------
  const PS = window.LiveFXPacksStore;
  let packBusy = false;

  async function togglePack(id) {
    if (!PS || packBusy) return;
    packBusy = true;
    try {
      const loaded = PS.isLoaded(triggers, id);
      const r = loaded ? PS.remove(triggers, id) : PS.add(triggers, id);
      triggers = r.triggers;
      if (matcher) matcher.setTriggers(triggers);
      renderPad();
      for (const w of r.warnings || []) showLine(`⚠️ ${esc(w)}`);
      if (loaded) showLine(`🗑️ ${esc(r.label)}: ${r.removed} Trigger entfernt`);
      else showLine(r.added ? `📦 ${esc(r.label)}: ${r.added} Trigger geladen` : `📦 ${esc(r.label)}: bereits geladen`);
      await LiveFXStore.save(triggers);
    } finally {
      packBusy = false;
    }
  }

  function renderPacks() {
    const root = $('#packs');
    const card = $('#packs-card');
    if (!root || !card) return;
    if (!PS || !window.LiveFXPacks) {
      card.hidden = true;
      return;
    }
    const list = PS.summary(triggers);
    root.innerHTML = '';
    let loadedCount = 0;
    for (const p of list) {
      if (p.loaded) loadedCount++;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pack-tile${p.loaded ? ' loaded' : p.present ? ' partial' : ''}`;
      b.dataset.pack = p.id;
      b.title = p.description || p.label;
      b.innerHTML = `<span class="flag">${esc(p.flag)}</span><span class="lbl">${esc(p.label)}</span><span class="meta">${p.loaded ? '✓ geladen' : p.present ? `${p.present}/${p.count}` : `${p.count} Trigger`}</span>`;
      b.addEventListener('click', () => togglePack(p.id));
      root.appendChild(b);
    }
    $('#packs-count').textContent = `${loadedCount}/${list.length} · ${triggers.length}/${PS.limit()} Trigger`;
    card.hidden = false;
  }

  // ---------- volume / layout (2.2) ----------
  function clamp01(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  }

  function reflectVolume() {
    const label = $('#vol-label');
    if (label) label.textContent = `${Math.round(volume * 100)} %`;
    const slider = $('#volume');
    if (slider && Math.abs(Number(slider.value) - volume) > 0.001) slider.value = String(Math.round(volume * 20) / 20);
  }

  function setVolume(v, { send = true } = {}) {
    volume = clamp01(v);
    reflectVolume();
    if (send) bus.send({ type: 'volume', volume });
  }

  function stepVolume(dir) {
    let next = dir > 0 ? volume * DB6 : volume / DB6;
    if (dir > 0 && next < volume + VOL_MIN_STEP) next = volume + VOL_MIN_STEP;
    if (dir < 0 && next < 0.05) next = 0;
    setVolume(Math.round(next * 100) / 100);
    showLine(`${dir > 0 ? '🔊 Lauter' : '🔉 Leiser'}: ${Math.round(volume * 100)} %`);
  }

  function saveLayout() {
    lsSet(LAYOUT_KEY, JSON.stringify(layout));
  }

  function reflectLayout() {
    const band = $('#btn-band');
    const zone = $('#btn-zone');
    if (band) {
      band.dataset.on = layout.band ? '1' : '0';
      band.classList.toggle('active', layout.band);
      band.textContent = layout.band ? '📖 Band aus' : '📖 Band an';
    }
    if (zone) {
      const z = ZONES.find((x) => x.id === layout.zone) || ZONES[0];
      zone.dataset.zone = z.id;
      zone.textContent = `🎯 Zone: ${z.label}`;
    }
  }

  function toggleBand() {
    layout.band = !layout.band;
    saveLayout();
    reflectLayout();
    bus.send({ type: 'layout', storyLayout: layout.band ? 'band' : 'full' });
    showLine(layout.band ? '📖 Story-Band eingeblendet' : '📖 Story-Band ausgeblendet (Vollbild)');
  }

  function cycleZone() {
    const i = ZONES.findIndex((z) => z.id === layout.zone);
    layout.zone = ZONES[(i + 1) % ZONES.length].id;
    saveLayout();
    reflectLayout();
    bus.send({ type: 'layout', zone: layout.zone });
    showLine(`🎯 Effekt-Zone: ${esc((ZONES.find((z) => z.id === layout.zone) || ZONES[0]).label)}`);
  }

  // ---------- story look (2.3) ----------
  function reflectLook() {
    const style = $('#btn-style');
    const pos = $('#btn-bandpos');
    if (style) {
      const st = STYLES.find((x) => x.id === look.storyStyle) || STYLES[0];
      style.dataset.style = st.id;
      style.textContent = `✏️ Stil: ${st.label}`;
    }
    if (pos) {
      const p = BAND_POS.find((x) => x.id === look.bandPosition) || BAND_POS[0];
      pos.dataset.pos = p.id;
      pos.textContent = `📐 Band: ${p.label}`;
    }
  }

  /** Applies a (partial) look; `send` puts only the changed keys on the bus. Returns the new look. */
  function setLook(patch, { send = true } = {}) {
    const next = cleanLook({ ...look, ...(patch || {}) }, look);
    const changed = {};
    for (const k of Object.keys(next)) if (next[k] !== look[k]) changed[k] = next[k];
    look = next;
    lsSet(LOOK_KEY, JSON.stringify(look));
    reflectLook();
    if (send && Object.keys(changed).length) bus.send({ type: 'layout', ...changed });
    return { ...look };
  }

  function cycleStyle() {
    const i = STYLES.findIndex((x) => x.id === look.storyStyle);
    setLook({ storyStyle: STYLES[(i + 1) % STYLES.length].id });
    showLine(`✏️ Story-Stil: ${esc((STYLES.find((x) => x.id === look.storyStyle) || STYLES[0]).label)}`);
  }

  function toggleBandPos() {
    setLook({ bandPosition: look.bandPosition === 'bottom' ? 'chat' : 'bottom' });
    showLine(`📐 Band (Hochkant): ${esc((BAND_POS.find((x) => x.id === look.bandPosition) || BAND_POS[0]).label)}`);
  }

  function applyFilter() {
    query = String($('#search').value || '').trim().toLowerCase();
    let shown = 0;
    const byId = new Map(triggers.map((t) => [t.id, t]));
    for (const b of $('#pad').querySelectorAll('button')) {
      const t = byId.get(b.dataset.id);
      b.hidden = !t || !matches(t, query);
      if (!b.hidden) shown++;
    }
    $('#count').textContent = query ? `${shown}/${triggers.length}` : String(triggers.length);
    $('#empty').hidden = shown > 0;
  }

  // ---------- scenes ----------
  function sceneIds() {
    if (S && Array.isArray(S.SCENES) && S.SCENES.length) return S.SCENES.slice();
    return [];
  }

  function sceneInfo(id) {
    const P = window.LiveFXPacks;
    const fromPacks = P && P.SCENE_INFO && Object.prototype.hasOwnProperty.call(P.SCENE_INFO, id) ? P.SCENE_INFO[id] : null;
    const info = fromPacks || SCENE_TABLE[id] || null;
    return { emoji: (info && info.emoji) || '🎬', label: (info && info.label) || id, loop: info && info.loop ? info.loop : null };
  }

  /** Ad-hoc scene trigger, identical to the panel's `sceneTrigger(id)` (not stored). */
  function sceneTrigger(id) {
    const info = sceneInfo(id);
    const Snd = window.LiveFXSounds;
    const known = !Snd || !Array.isArray(Snd.loops) || Snd.loops.includes(info.loop); // sounds.js is not loaded here
    const loop = info.loop && known ? `loop:${info.loop}` : null;
    return { id: `scene-${id}`, label: id === 'clear' ? info.label : `Szene: ${info.label}`, keywords: [], enabled: true, cooldown: 0, sound: loop, visual: { kind: 'scene', scene: id, position: 'center' } };
  }

  function renderScenes() {
    const ids = sceneIds();
    const card = $('#scenes-card');
    const row = $('#scenes');
    if (!ids.length) {
      card.hidden = true;
      return;
    }
    row.innerHTML = '';
    for (const id of ids) {
      const info = sceneInfo(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.scene = id;
      b.title = id === 'clear' ? 'Aktuelle Szene ausblenden und Atmosphäre stoppen' : `Szene „${info.label}“ starten`;
      b.innerHTML = `<span class="emoji">${esc(info.emoji)}</span><span class="lbl">${esc(info.label)}</span>`;
      b.addEventListener('click', () => {
        if (!fire(sceneTrigger(id), 'Handy-Szenen')) return;
        row.querySelectorAll('button.active').forEach((x) => x.classList.remove('active'));
        if (id !== 'clear') b.classList.add('active');
      });
      row.appendChild(b);
    }
    card.hidden = false;
  }

  // ---------- microphone (only in a secure context) ----------
  function pickLang() {
    let saved = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch (_) {
      /* unavailable */
    }
    if (saved && /^[a-z]{2}-[A-Z]{2}$/.test(saved)) return saved;
    const nav = String(navigator.language || 'de').toLowerCase();
    if (nav.startsWith('tr')) return 'tr-TR';
    if (nav.startsWith('en')) return nav === 'en-gb' ? 'en-GB' : 'en-US';
    return 'de-DE';
  }

  function micSupported() {
    return secure && !!window.LiveFXASR && LiveFXASR.backends.some((b) => b.name === 'webspeech' && b.supported);
  }

  function reflectMic(state) {
    const b = $('#btn-mic');
    const active = state === 'listening' || state === 'starting';
    b.classList.toggle('listening', active);
    b.textContent = state === 'starting' ? '… startet' : active ? '🎙️ Hört zu' : '🎙️ Mikro';
    $('#status').textContent = active ? `Mikro an (${micLang})` : $('#status').dataset.conn || '';
  }

  function handleText(text, isFinal, meta) {
    const str = String(text == null ? '' : text);
    let hits = [];
    try {
      hits = (matcher && matcher.process(str)) || [];
    } catch (e) {
      console.warn('LiveFX matcher failed', e);
    }
    showText(str, !!isFinal, hits.map((h) => h.spoken || h.keyword));
    for (const h of hits) fire(h.trigger, `${MIC_SOURCE} „${String(h.spoken || h.keyword).slice(0, 40)}“`);
    if (isFinal && matcher && typeof matcher.endUtterance === 'function') matcher.endUtterance();
    void meta;
  }

  function createAsr() {
    if (!micSupported()) return null;
    const lang = pickLang();
    micLang = lang;
    matcher = new LiveFXMatcher.Matcher(triggers, { globalMinGap: 1.2, tolerance: 'medium', lang });
    return LiveFXASR.create('webspeech', {
      lang,
      bus,
      alternatives: false,
      onText: handleText,
      onState: reflectMic,
      onError: (err) => {
        const hint = $('#mic-hint');
        hint.textContent = `${err.fatal ? '❌' : '⚠️'} ${err.message || err.code}`;
        hint.className = 'hint warn';
        hint.hidden = false;
        if (err.fatal) reflectMic('error');
      },
    });
  }

  function initMic() {
    const b = $('#btn-mic');
    const hint = $('#mic-hint');
    if (!secure) {
      b.disabled = true;
      b.title = MIC_HINT;
      hint.textContent = MIC_HINT;
      hint.hidden = false;
      return;
    }
    if (!micSupported()) {
      b.disabled = true;
      hint.textContent = 'Dieser Browser kann keine Spracherkennung – Chrome (Android) oder Safari (iOS) nutzen.';
      hint.hidden = false;
      return;
    }
    hint.hidden = true;
    b.addEventListener('click', () => {
      if (!asr) asr = createAsr();
      if (!asr) return;
      if (micWanted) {
        micWanted = false;
        asr.stop();
        return;
      }
      micWanted = true;
      asr.start();
    });
  }

  // ---------- bus ----------
  bus.onStatus((s) => {
    const d = $('#dot-server');
    const st = $('#status');
    d.classList.remove('on', 'warn', 'err');
    let text;
    if (s.authError) {
      d.classList.add('err');
      text = 'Nicht angemeldet – Link aus dem Panel neu öffnen';
    } else if (s.sse === 'open') {
      d.classList.add('on');
      text = 'verbunden';
    } else {
      d.classList.add('warn');
      text = online ? 'verbinde …' : 'kein Server';
    }
    d.title = text;
    st.dataset.conn = text;
    if (!(asr && (asr.state === 'listening' || asr.state === 'starting'))) st.textContent = text;
  });

  bus.onMessage((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'fire' && msg.trigger) {
      showLine(`🔥 ${esc(labelOf(msg.trigger))} <span class="muted">← ${esc(String(msg.source || 'extern').slice(0, 40))}</span>`);
    } else if (msg.type === 'transcript' && typeof msg.text === 'string') {
      showText(msg.text, msg.final !== false, []);
    } else if (msg.type === 'state') {
      if (Number.isFinite(Number(msg.volume))) setVolume(Number(msg.volume), { send: false });
      if (msg.layout && typeof msg.layout === 'object') setLook(msg.layout, { send: false }); // what the overlays show
    } else if (msg.type === 'layout') {
      setLook(msg, { send: false }); // panel / API changed the look
    } else if (msg.type === 'volume' && Number.isFinite(Number(msg.volume)) && (!msg.bus || msg.bus === 'master')) {
      setVolume(Number(msg.volume), { send: false }); // the phone's ±6 dB buttons work on the master bus only
    }
  });

  // ---------- controls ----------
  $('#btn-mute').addEventListener('click', () => {
    paused = !paused;
    const b = $('#btn-mute');
    b.textContent = paused ? '▶ Weiter' : '⏸ Pause';
    b.classList.toggle('paused', paused);
    showLine(paused ? '⏸ Effekte pausiert' : '▶ Effekte wieder aktiv');
  });
  $('#volume').addEventListener('input', (e) => setVolume(e.target.value));
  $('#btn-vol-down').addEventListener('click', () => stepVolume(-1));
  $('#btn-vol-up').addEventListener('click', () => stepVolume(1));
  $('#btn-band').addEventListener('click', toggleBand);
  $('#btn-zone').addEventListener('click', cycleZone);
  if ($('#btn-style')) $('#btn-style').addEventListener('click', cycleStyle);
  if ($('#btn-bandpos')) $('#btn-bandpos').addEventListener('click', toggleBandPos);
  $('#search').addEventListener('input', applyFilter);

  // ---------- store ----------
  async function reload() {
    const r = await LiveFXStore.load();
    triggers = r.triggers;
    renderPad();
    if (matcher) matcher.setTriggers(triggers);
    return r;
  }
  LiveFXStore.onRemoteChange(() => reload().then(() => showLine('🔄 Trigger aktualisiert')));

  async function boot() {
    renderScenes();
    initMic();
    reflectVolume();
    reflectLayout();
    reflectLook();
    await reload();
    applyFilter();
  }

  window.livefx = {
    bus,
    fire,
    handleText,
    sceneTrigger,
    get triggers() {
      return triggers;
    },
    get paused() {
      return paused;
    },
    get asr() {
      return asr;
    },
    get matcher() {
      return matcher;
    },
    store: LiveFXStore,
    // 2.2
    get favourites() {
      return favs.slice();
    },
    setFavourite: setFav,
    get volume() {
      return volume;
    },
    setVolume,
    stepVolume,
    get layout() {
      return { ...layout };
    },
    // 2.3
    get look() {
      return { ...look };
    },
    setLook,
    togglePack,
    ready: boot(),
  };
})();
