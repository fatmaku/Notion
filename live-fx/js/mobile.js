// LiveFX – mobile remote (mobile.html): a phone-first mirror of the panel's soundboard. Tiles fire
// triggers through the bus (role `panel`, so the server broadcasts them to every overlay), the header
// pauses effects, and the bottom tab bar splits the page into ✨ Effekte · 📖 Story · 🔊 Ton · ☰ Mehr.
// See docs/HANDY.md and docs/CONTRACTS.md §11 "Mobile".
// 2.2: favourites (long-press / ⭐, localStorage `livefx.mobile.favs`), „Leiser/Lauter“ (±6 dB master,
// `{type:'volume', volume}`), story band + effect zone buttons (`{type:'layout', storyLayout}` /
// `{type:'layout', zone}`), pack tiles (load/unload through LiveFXPacksStore + LiveFXStore – the phone is a
// full remote, not only a soundboard).
// 2.3: story look buttons – „✏️ Stil“ cycles `{type:'layout', storyStyle}` mixed → sketch → emoji, „📐 Band“ toggles
// `{type:'layout', bandPosition}` bottom ↔ chat (portrait only); localStorage `livefx.mobile.look`, and both follow
// the server's remembered layout (`state.layout`) and layout messages from the panel.
// 2.4 (easy setup, phone first):
//   - bottom tab bar (localStorage `livefx.mobile.tab`), haptics on fire / pause (navigator.vibrate), dark/light auto;
//   - setup assistant on the first open (four swipe steps: ① verbunden ② Pakete ③ Test-Effekt ④ so geht's), skippable,
//     re-open from „Mehr“; opens by itself after a fresh pairing (`livefx.mobile.justPaired` from pair.html or a device
//     paired < 15 min ago), on `?setup=1`, or on the first visit of a real browser (not under automation). Done flag
//     `livefx.mobile.setup.done`. The test effect is POST /fire, whose answer counts the overlays that got it;
//   - session check (GET /api/devices): „Nicht gekoppelt“ banner instead of a green dot when the cookie is gone;
//   - „🎙 Handy-Mikro“ (js/phone-mic.js): Web Speech on the phone → POST /api/transcript (the PC's panel matches it when
//     speech input is „Extern (POST /api/transcript)“) + the phone's own matcher, the router decides who fires; level meter, language
//     Auto/DE/TR/EN (`livefx.mobile.micLang`). On the plain-http WLAN link: „Für das Handy-Mikro: Internet-Link nutzen“
//     with ONE button that starts the tunnel (POST /api/tunnel/start) and switches to an https pairing link;
//   - „📱 Weiteres Handy koppeln“: a fresh pairing QR (POST /api/pairing) on this phone for a second phone; „abmelden“.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const S = window.LiveFXSchema;
  const esc = (s) => S.escapeHtml(s == null ? '' : s);
  const SOURCE = 'Handy';
  const MIC_SOURCE = 'Handy-Mikro';
  const FLASH_MS = 350;
  const TRANSCRIPT_MAX = 160;
  const FAVS_KEY = 'livefx.mobile.favs';
  const LAYOUT_KEY = 'livefx.mobile.layout';
  const TAB_KEY = 'livefx.mobile.tab';
  const MIC_LANG_KEY = 'livefx.mobile.micLang';
  const SETUP_DONE_KEY = 'livefx.mobile.setup.done';
  const JUST_PAIRED_KEY = 'livefx.mobile.justPaired';
  const FRESH_PAIRING_MS = 15 * 60 * 1000;
  const TABS = ['fx', 'story', 'sound', 'more'];
  const SETUP_STEPS = 4;
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
  // The assistant's test effect: ad hoc (not stored), unmistakable on stream.
  const TEST_TRIGGER = Object.freeze({
    id: 'setup-test',
    label: 'Test vom Handy',
    keywords: [],
    enabled: true,
    cooldown: 0,
    sound: 'tada',
    visual: { kind: 'card', emoji: '📱', text: 'HANDY ✔', color: '#ffffff', bg: '#7c5cff' },
  });

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
  const params = new URLSearchParams(location.search);
  const PM = window.LiveFXPhoneMic || null;
  const standalone = !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);
  let triggers = [];
  let paused = false;
  let query = '';
  let matcher = null;
  let phoneMic = null;
  let transcriptTimer = null;
  let favs = readFavs();
  let volume = 0.8;
  let layout = readLayout();
  let look = readLook();
  let tab = 'fx';
  let session = { state: 'unknown', device: null }; // unknown | paired | local | unpaired | offline
  let lastBusStatus = bus.status();

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
  function lsDel(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      /* private mode */
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

  /** Short vibration as feedback (Android; iOS Safari ignores it). */
  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {
      /* not allowed before a user gesture */
    }
  }

  async function apiJson(method, url, body) {
    const init = { method, credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const r = await fetch(url, init);
    const data = await r.json().catch(() => null);
    return { status: r.status, ok: r.ok, data };
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
    if (fire(trigger, SOURCE)) {
      haptic(12);
      if (btn) {
        btn.classList.add('fired');
        setTimeout(() => btn.classList.remove('fired'), FLASH_MS);
      }
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
        haptic(20);
      }, LONG_PRESS_MS);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) {
      b.addEventListener(ev, (e) => {
        if (ev === 'pointermove' && e.pressure !== 0 && timer) return; // small jitter is fine
        if (ev !== 'pointermove') cancel();
      });
    }
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener(
      'click',
      (e) => {
        if (fired) {
          fired = false;
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true
    );
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
      haptic(10);
      await LiveFXStore.save(triggers);
    } finally {
      packBusy = false;
    }
  }

  function packTiles(root) {
    const list = PS.summary(triggers);
    root.innerHTML = '';
    let loadedCount = 0;
    for (const p of list) {
      if (p.loaded) loadedCount++;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pack-tile${p.loaded ? ' loaded' : p.present ? ' partial' : ''}`;
      b.dataset.pack = p.id;
      b.setAttribute('aria-pressed', p.loaded ? 'true' : 'false');
      b.title = p.description || p.label;
      b.innerHTML = `<span class="flag">${esc(p.flag)}</span><span class="lbl">${esc(p.label)}</span><span class="meta">${p.loaded ? '✓ geladen' : p.present ? `${p.present}/${p.count}` : `${p.count} Trigger`}</span>`;
      b.addEventListener('click', () => togglePack(p.id));
      root.appendChild(b);
    }
    return { loadedCount, total: list.length };
  }

  function renderPacks() {
    const root = $('#packs');
    const card = $('#packs-card');
    if (!root || !card) return;
    if (!PS || !window.LiveFXPacks) {
      card.hidden = true;
      return;
    }
    const { loadedCount, total } = packTiles(root);
    $('#packs-count').textContent = `${loadedCount}/${total} · ${triggers.length}/${PS.limit()} Trigger`;
    card.hidden = false;
    if (setupOpen()) renderSetupPacks();
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
    haptic(8);
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
        haptic(12);
        row.querySelectorAll('button.active').forEach((x) => x.classList.remove('active'));
        if (id !== 'clear') b.classList.add('active');
      });
      row.appendChild(b);
    }
    card.hidden = false;
  }

  // ---------- tabs (2.4) ----------
  function showTab(name, { remember = true, scroll = true } = {}) {
    const next = TABS.includes(name) ? name : 'fx';
    tab = next;
    for (const p of document.querySelectorAll('.tab[data-tab]')) p.hidden = p.dataset.tab !== next;
    for (const b of document.querySelectorAll('#tabbar [data-tab]')) b.setAttribute('aria-selected', b.dataset.tab === next ? 'true' : 'false');
    if (remember) lsSet(TAB_KEY, next);
    if (scroll) window.scrollTo(0, 0);
    if (next === 'more') refreshConnText();
    return next;
  }

  // ---------- session (2.4): paired device, the PC itself, or not paired ----------
  async function checkSession() {
    if (!online) {
      session = { state: 'offline', device: null };
      return session;
    }
    try {
      const r = await fetch('/api/devices', { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401 || r.status === 403) session = { state: 'unpaired', device: null };
      else if (r.ok) {
        const d = await r.json().catch(() => null);
        const me = d && Array.isArray(d.devices) ? d.devices.find((x) => x && x.current) : null;
        session = me ? { state: 'paired', device: me } : { state: 'local', device: null };
      } else session = { state: 'offline', device: null };
    } catch (_) {
      session = { state: 'offline', device: null };
    }
    reflectSession();
    return session;
  }

  let sessionCheckAt = 0;
  function recheckSessionSoon() {
    const now = Date.now();
    if (now - sessionCheckAt < 8000) return;
    sessionCheckAt = now;
    checkSession();
  }

  function reflectSession() {
    const unpaired = session.state === 'unpaired';
    $('#auth-banner').hidden = !unpaired;
    $('#btn-unpair').hidden = session.state !== 'paired';
    reflectBus(lastBusStatus);
    refreshConnText();
    if (setupOpen()) renderSetupConn();
  }

  function refreshConnText() {
    const el = $('#conn-text');
    if (!el) return;
    const connected = lastBusStatus.sse === 'open';
    let text;
    if (session.state === 'unpaired') text = '⚠️ Nicht gekoppelt – bitte im Panel am PC den QR-Code scannen.';
    else if (!online) text = 'Ohne Server (Datei geöffnet) – nur Vorschau.';
    else if (!connected) text = '⏳ Verbinde mit LiveFX am PC … (gleiches WLAN? Läuft LiveFX?)';
    else if (session.state === 'paired') text = `✔ Verbunden – dieses Handy ist gekoppelt als „${session.device.name}“.`;
    else text = '✔ Verbunden mit LiveFX (am PC geöffnet).';
    if (location.protocol === 'https:' && /trycloudflare\.com$/i.test(location.hostname) && connected) text += ' Über den Internet-Link (https).';
    el.textContent = text;
  }

  // ---------- setup assistant (2.4) ----------
  let setupIdx = 0;
  let setupScrollTarget = null;
  let setupScrollTimer = null;

  function setupOpen() {
    const el = $('#setup');
    return !!el && !el.hidden;
  }

  function openSetup(step = 0) {
    const el = $('#setup');
    el.hidden = false;
    document.body.classList.add('setup-open');
    lsDel(JUST_PAIRED_KEY);
    renderSetupConn();
    renderSetupPacks();
    $('#setup-test-result').textContent = '';
    $('#setup-test-result').className = 'result';
    const a2hs = $('#setup-a2hs');
    a2hs.hidden = standalone;
    a2hs.textContent = /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? '📲 Tipp: In Safari „Teilen“ → „Zum Home-Bildschirm“ – dann startest du LiveFX wie eine App.'
      : '📲 Tipp: Browser-Menü ⋮ → „Zum Startbildschirm hinzufügen“ – dann startest du LiveFX wie eine App.';
    setupGo(step, { smooth: false });
    try {
      $('#setup-next').focus({ preventScroll: true });
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  function closeSetup({ done = true } = {}) {
    if (!setupOpen()) return;
    $('#setup').hidden = true;
    document.body.classList.remove('setup-open');
    if (done) lsSet(SETUP_DONE_KEY, '1');
  }

  function finishSetup(skipped) {
    closeSetup({ done: true });
    showTab('fx');
    showLine(skipped ? '👍 Einrichtung übersprungen – unter ☰ Mehr kannst du sie jederzeit wieder öffnen.' : '✔ Fertig! Tippe eine Kachel – der Effekt erscheint im Stream.');
  }

  function setupGo(i, { smooth = true } = {}) {
    setupIdx = Math.max(0, Math.min(SETUP_STEPS - 1, i));
    const track = $('#setup-track');
    const left = setupIdx * track.clientWidth;
    clearTimeout(setupScrollTimer);
    setupScrollTarget = smooth ? setupIdx : null; // an instant jump needs no guard against in-between scroll events
    if (smooth) setupScrollTimer = setTimeout(() => (setupScrollTarget = null), 900);
    try {
      track.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
    } catch (_) {
      track.scrollLeft = left; // old browser without the 'instant' keyword
    }
    renderSetupNav();
    if (setupIdx === 1) renderSetupPacks();
    return setupIdx;
  }

  function onSetupScroll() {
    const track = $('#setup-track');
    const w = track.clientWidth || 1;
    if (setupScrollTarget !== null) {
      if (Math.abs(track.scrollLeft - setupScrollTarget * w) < 2) setupScrollTarget = null;
      return; // programmatic scroll still running: do not flicker back
    }
    const i = Math.round(track.scrollLeft / w);
    if (i !== setupIdx && i >= 0 && i < SETUP_STEPS) {
      setupIdx = i;
      renderSetupNav();
      if (i === 1) renderSetupPacks();
    }
  }

  function renderSetupNav() {
    const dots = $('#setup-dots').children;
    for (let k = 0; k < dots.length; k++) {
      dots[k].classList.toggle('on', k === setupIdx);
      dots[k].classList.toggle('done', k < setupIdx);
    }
    $('#setup-back').hidden = setupIdx === 0;
    $('#setup-next').textContent = setupIdx === SETUP_STEPS - 1 ? 'Los geht’s ✔' : 'Weiter →';
    $('#setup-skip').style.visibility = setupIdx === SETUP_STEPS - 1 ? 'hidden' : ''; // keeps the top bar height
    const track = $('#setup-track');
    for (const s of track.querySelectorAll('.setup-step')) s.setAttribute('aria-hidden', Number(s.dataset.step) - 1 === setupIdx ? 'false' : 'true');
  }

  function renderSetupConn() {
    const connected = lastBusStatus.sse === 'open';
    const icon = $('#setup-conn-icon');
    const title = $('#setup-conn-title');
    const text = $('#setup-conn-text');
    const dev = $('#setup-device');
    if (session.state === 'unpaired') {
      icon.className = 'big-icon warn';
      icon.textContent = '!';
      title.textContent = 'Nicht gekoppelt';
      text.textContent = 'Scanne im Panel am PC den QR-Code unter „📱 Handy“ – oder tippe auf „Jetzt koppeln“ und gib den 6-stelligen Code ein.';
    } else if (!connected) {
      icon.className = 'big-icon warn';
      icon.textContent = '…';
      title.textContent = 'Verbinde …';
      text.textContent = 'Einen Moment. Klappt es nicht: Ist das Handy im selben WLAN wie der PC? Läuft LiveFX am PC?';
    } else {
      icon.className = 'big-icon ok';
      icon.textContent = '✔';
      title.textContent = 'Verbunden';
      text.textContent = 'Dein Handy ist mit LiveFX auf dem PC verbunden – es ist jetzt deine Fernbedienung.';
    }
    $('#setup-pair').hidden = session.state !== 'unpaired';
    dev.textContent = session.state === 'paired' && session.device ? `Gekoppelt als „${session.device.name}“ – unter ☰ Mehr kannst du es wieder abmelden.` : '';
  }

  function renderSetupPacks() {
    const root = $('#setup-packs');
    if (!root || !PS || !window.LiveFXPacks) return;
    const { loadedCount } = packTiles(root);
    $('#setup-packs-count').textContent = loadedCount ? `${loadedCount} Paket${loadedCount === 1 ? '' : 'e'} geladen · ${triggers.length} Trigger insgesamt` : 'Noch kein Paket gewählt – du kannst das auch später unter ☰ Mehr machen.';
  }

  /** The assistant's test effect: POST /fire directly – its answer says how many overlays received it. */
  async function sendTestEffect() {
    const btn = $('#setup-test');
    const out = $('#setup-test-result');
    const say = (text, cls) => {
      out.textContent = text;
      out.className = `result${cls ? ` ${cls}` : ''}`;
    };
    btn.disabled = true;
    say('📤 Sende …');
    let result;
    try {
      const msg = { type: 'fire', trigger: { ...TEST_TRIGGER, visual: { ...TEST_TRIGGER.visual } }, source: 'Handy-Einrichtung', id: S.newId('panel'), ts: Date.now() };
      if (!online) throw new Error('offline');
      const r = await apiJson('POST', '/fire', msg);
      if (r.status === 401 || r.status === 403) {
        result = { ok: false, reason: 'auth' };
        say('⚠️ Nicht gekoppelt – bitte im Panel den QR-Code neu scannen.', 'err');
      } else if (!r.ok) {
        result = { ok: false, reason: 'server', status: r.status };
        say(`⚠️ Der PC hat abgelehnt (${r.status}).`, 'err');
      } else {
        const n = Number(r.data && r.data.overlays) || 0;
        result = { ok: true, overlays: n };
        haptic([15, 60, 15]);
        if (n > 0) say(`✔ Angekommen! ${n === 1 ? 'Ein Overlay zeigt' : `${n} Overlays zeigen`} jetzt „📱 HANDY ✔“ – siehst du ihn im Stream?`, 'ok');
        else say('📤 Gesendet – aber gerade ist kein Overlay offen. In OBS die Browserquelle mit LiveFX prüfen (oder am PC das Panel mit Vorschau öffnen) und nochmal testen.', 'warn');
      }
    } catch (_) {
      result = { ok: false, reason: 'network' };
      say('⚠️ PC nicht erreichbar – gleiches WLAN? Läuft LiveFX am PC?', 'err');
    } finally {
      btn.disabled = false;
    }
    return result;
  }

  function shouldAutoOpenSetup() {
    const p = params.get('setup');
    if (p === '1') return true;
    if (p === '0') return false;
    if (!online || session.state === 'unpaired') return false;
    if (lsGet(SETUP_DONE_KEY) === '1') return false;
    const just = Number(lsGet(JUST_PAIRED_KEY));
    if (just && Date.now() - just < FRESH_PAIRING_MS) return true;
    const created = session.device ? Date.parse(session.device.createdAt) : NaN;
    if (Number.isFinite(created) && Date.now() - created < FRESH_PAIRING_MS) return true;
    return !navigator.webdriver; // automated tests get the assistant only on ?setup=1 or after a pairing
  }

  // ---------- phone microphone (2.4, js/phone-mic.js) ----------
  function micChoice() {
    const v = lsGet(MIC_LANG_KEY);
    return PM && PM.LANGS.some((l) => l.id === v) ? v : 'auto';
  }

  function ensureMatcher(lang) {
    if (!matcher) matcher = new LiveFXMatcher.Matcher(triggers, { globalMinGap: 1.2, tolerance: 'medium', lang });
    else if (lang && typeof matcher.setLang === 'function') matcher.setLang(lang);
    return matcher;
  }

  function micActive() {
    return !!phoneMic && ['starting', 'listening', 'restarting'].includes(phoneMic.state);
  }

  function reflectMic(state) {
    const b = $('#btn-mic');
    const active = state === 'listening' || state === 'restarting' || state === 'starting';
    b.classList.toggle('listening', active);
    b.textContent = state === 'starting' ? '… startet' : active ? '🎙 Hört zu – antippen zum Stoppen' : '🎙 Handy-Mikro starten';
    $('#mic-live').hidden = !active;
    const st = $('#status');
    const langName = PM ? PM.langLabel(phoneMic ? phoneMic.choice : micChoice(), navigator.language) : '';
    st.textContent = active ? `Mikro an (${langName})` : st.dataset.conn || '';
    reflectRoute();
    if (!active) reflectLevel(0);
  }

  function reflectLevel(v) {
    const el = $('#mic-level');
    if (el) el.style.width = `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
  }

  function reflectRoute() {
    const el = $('#mic-route');
    if (!el) return;
    if (!micActive()) {
      el.hidden = true;
      return;
    }
    const r = phoneMic.route;
    el.hidden = false;
    el.textContent =
      r === 'pc'
        ? '🖥️ Effekte löst der PC aus (im Panel ist die Spracherkennung „Extern“) – das Handy schickt nur den Text.'
        : r === 'phone'
          ? '📱 Effekte löst dein Handy aus. Der Text geht zusätzlich an den PC.'
          : '🎧 Hört zu – Effekte kommen vom PC oder, wenn der nicht mithört, vom Handy.';
  }

  function micHint(text, warn) {
    const hint = $('#mic-hint');
    hint.textContent = text || '';
    hint.className = `hint${warn ? ' warn' : ''}`;
    hint.hidden = !text;
  }

  function createPhoneMic() {
    if (!PM) return null;
    const choice = micChoice();
    const lang = PM.resolveLang(choice, navigator.language);
    ensureMatcher(lang);
    return PM.create({
      win: window,
      lang: choice,
      match: (text) => (matcher ? matcher.process(String(text)) || [] : []),
      fire: (h) => {
        if (fire(h.trigger, `${MIC_SOURCE} „${String(h.spoken || h.keyword).slice(0, 40)}“`)) haptic(12);
      },
      onText: (text, isFinal, hits) => {
        showText(text, isFinal, hits.map((h) => h.spoken || h.keyword));
        if (isFinal && matcher && typeof matcher.endUtterance === 'function') matcher.endUtterance();
      },
      onState: reflectMic,
      onLevel: reflectLevel,
      onRoute: reflectRoute,
      onSend: (s) => {
        if (s && s.authError) micHint('⚠️ Der PC lehnt die Sprache ab – dieses Handy ist nicht gekoppelt. Bitte neu koppeln.', true);
        else if (s && s.ok) micHint('');
      },
      onError: (err) => {
        micHint(`${err.fatal ? '❌' : '⚠️'} ${err.message || err.code}`, true);
        if (err.fatal) reflectMic('error');
      },
    });
  }

  function toggleMic() {
    if (!phoneMic) phoneMic = createPhoneMic();
    if (!phoneMic) return;
    if (micActive()) {
      phoneMic.stop();
      return;
    }
    micHint('');
    ensureMatcher(phoneMic.lang).setTriggers(triggers);
    phoneMic.start();
    haptic(15);
  }

  /** On the plain-http WLAN link: start the internet link and switch to its https pairing link (one button). */
  async function upgradeToHttps() {
    const btn = $('#btn-mic-upgrade');
    const out = $('#mic-upgrade-msg');
    btn.disabled = true;
    out.textContent = '🌍 Internet-Link wird gestartet … (das kann bis zu 30 Sekunden dauern)';
    try {
      let st = await apiJson('GET', '/api/tunnel');
      if (st.status === 401 || st.status === 403) throw new Error('Nicht gekoppelt – bitte erst koppeln.');
      if (!st.ok || !st.data || st.data.status !== 'online') st = await apiJson('POST', '/api/tunnel/start', {});
      if (!st.ok || !st.data || st.data.status !== 'online') throw new Error((st.data && (st.data.error || st.data.message)) || 'Internet-Link ließ sich nicht starten.');
      const p = await apiJson('POST', '/api/pairing', { next: 'mobile' });
      const url = p.ok && p.data && p.data.pairing ? p.data.pairing.tunnelUrl : null;
      if (!url || !/^https:\/\//.test(url)) throw new Error('Kein Internet-Link verfügbar.');
      out.textContent = '✔ Internet-Link bereit – wechsle … (danach unter 🔊 Ton das Mikro starten)';
      location.assign(url);
      return url;
    } catch (e) {
      out.textContent = `❌ ${e && e.message ? e.message : e} – am PC im Panel „📱 Handy“ → „Internet-Link starten“ versuchen.`;
      btn.disabled = false;
      return null;
    }
  }

  function initMic() {
    const b = $('#btn-mic');
    const sel = $('#mic-lang');
    if (PM && sel) {
      const autoOpt = sel.querySelector('option[value="auto"]');
      if (autoOpt) autoOpt.textContent = PM.langLabel('auto', navigator.language);
      sel.value = micChoice();
      sel.addEventListener('change', () => {
        lsSet(MIC_LANG_KEY, sel.value);
        if (phoneMic) {
          const tag = phoneMic.setLang(sel.value);
          ensureMatcher(tag);
          reflectMic(phoneMic.state);
        }
      });
    }
    $('#mic-live').addEventListener('click', () => showTab('sound'));
    const avail = PM ? PM.availability(window) : { ok: false, reason: 'unsupported' };
    if (!avail.ok) {
      b.disabled = true;
      if (sel) sel.disabled = true;
      $('#mic-lang-field').hidden = true; // nothing to choose without a recognizer
      $('#mic-meter').hidden = true;
      if (avail.reason === 'insecure') {
        b.title = 'Das Handy-Mikro braucht https – den Internet-Link nutzen.';
        $('#mic-https').hidden = false;
        $('#btn-mic-upgrade').addEventListener('click', upgradeToHttps);
      } else {
        micHint(PM ? PM.MESSAGES.unsupported : 'Dieser Browser kann keine Spracherkennung.', false);
      }
      return;
    }
    micHint('');
    b.addEventListener('click', toggleMic);
  }

  /** Runs the phone's matcher on a line (as the microphone would) and fires the hits directly. */
  function handleText(text, isFinal, meta) {
    const str = String(text == null ? '' : text);
    let hits = [];
    try {
      hits = (ensureMatcher() && matcher.process(str)) || [];
    } catch (e) {
      console.warn('LiveFX matcher failed', e);
    }
    showText(str, !!isFinal, hits.map((h) => h.spoken || h.keyword));
    for (const h of hits) fire(h.trigger, `${MIC_SOURCE} „${String(h.spoken || h.keyword).slice(0, 40)}“`);
    if (isFinal && matcher && typeof matcher.endUtterance === 'function') matcher.endUtterance();
    void meta;
  }

  // ---------- invite: pair another phone from this one (2.4) ----------
  let invite = null; // { url, code, expiresAt }
  let inviteTimer = null;

  function drawQr(canvas, text) {
    const Q = window.LiveFXQR;
    if (!canvas || !Q || !text) return null;
    const qr = Q.encode(text);
    const margin = 4;
    Q.toCanvas(canvas, qr, { scale: Math.max(4, Math.ceil(480 / (qr.size + margin * 2))), margin, dark: '#000000', light: '#ffffff' });
    canvas.dataset.qrPayload = text;
    canvas.dataset.qrMargin = String(margin);
    return qr;
  }

  function renderInviteExpiry() {
    const el = $('#invite-expiry');
    if (!invite) return;
    const left = Date.parse(invite.expiresAt) - Date.now();
    if (!(left > 0)) {
      el.textContent = '⌛ Code abgelaufen – „↻ Neuer Code“ tippen.';
      clearInterval(inviteTimer);
      inviteTimer = null;
      return;
    }
    const s = Math.ceil(left / 1000);
    el.textContent = `Gilt noch ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min – nur einmal.`;
  }

  async function openInvite() {
    const box = $('#invite-box');
    box.hidden = false;
    $('#invite-code').textContent = '…';
    $('#invite-expiry').textContent = 'Neuer Code wird erzeugt …';
    try {
      const r = await apiJson('POST', '/api/pairing', { next: 'mobile' });
      if (!r.ok || !r.data || !r.data.pairing) throw new Error(r.status === 401 || r.status === 403 ? 'Nicht gekoppelt.' : `Fehler ${r.status}`);
      const p = r.data.pairing;
      const viaTunnel = /trycloudflare\.com$/i.test(location.hostname);
      const url = (viaTunnel ? p.tunnelUrl || p.url : p.lanUrl || p.url) || null;
      if (!url) throw new Error('Kein WLAN-Zugriff – am PC im Panel „📱 Handy“ den Internet-Link starten.');
      invite = { url, code: String(p.code || ''), expiresAt: p.expiresAt };
      drawQr($('#invite-qr'), url);
      $('#invite-code').textContent = invite.code.length === 6 ? `${invite.code.slice(0, 3)} ${invite.code.slice(3)}` : invite.code;
      $('#invite-url').textContent = p.manualUrl || url.replace(/#.*$/, '');
      clearInterval(inviteTimer);
      inviteTimer = setInterval(renderInviteExpiry, 1000);
      renderInviteExpiry();
      return invite;
    } catch (e) {
      invite = null;
      $('#invite-code').textContent = '';
      $('#invite-expiry').textContent = `❌ ${e && e.message ? e.message : e}`;
      return null;
    }
  }

  async function unpair() {
    if (session.state !== 'paired' || !session.device) return false;
    if (typeof window.confirm === 'function' && !window.confirm('Dieses Handy abmelden? Danach musst du es per QR-Code neu koppeln.')) return false;
    const r = await apiJson('DELETE', `/api/devices/${encodeURIComponent(session.device.id)}`).catch(() => null);
    if (r && r.ok) {
      lsDel(SETUP_DONE_KEY);
      location.replace('/p');
      return true;
    }
    showLine('⚠️ Abmelden hat nicht geklappt – am PC im Panel unter „📱 Handy“ entfernen.');
    return false;
  }

  // ---------- bus ----------
  function reflectBus(s) {
    lastBusStatus = s;
    const d = $('#dot-server');
    const st = $('#status');
    d.classList.remove('on', 'warn', 'err');
    let text;
    if (s.authError || session.state === 'unpaired') {
      d.classList.add('err');
      text = 'Nicht gekoppelt – QR-Code im Panel scannen';
    } else if (s.sse === 'open') {
      d.classList.add('on');
      text = 'verbunden';
    } else {
      d.classList.add('warn');
      text = online ? 'verbinde …' : 'kein Server';
    }
    d.title = text;
    st.dataset.conn = text;
    if (!micActive()) st.textContent = text;
    if (setupOpen()) renderSetupConn();
    if (tab === 'more') refreshConnText();
  }

  bus.onStatus((s) => {
    const was = lastBusStatus;
    reflectBus(s);
    if (s.authError && !was.authError) checkSession();
    // the stream dropped (server restart, device revoked, WLAN gone): ask the server whether we are still paired
    if (online && s.sse !== 'open' && was.sse === 'open') recheckSessionSoon();
    if (online && s.sse === 'closed') recheckSessionSoon();
  });

  bus.onMessage((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (phoneMic) phoneMic.observe(msg);
    if (msg.type === 'fire' && msg.trigger) {
      showLine(`🔥 ${esc(labelOf(msg.trigger))} <span class="muted">← ${esc(String(msg.source || 'extern').slice(0, 40))}</span>`);
    } else if (msg.type === 'transcript' && typeof msg.text === 'string') {
      if (!(micActive() && msg.source === MIC_SOURCE)) showText(msg.text, msg.final !== false, []); // our own lines are shown already
    } else if (msg.type === 'state') {
      if (msg.volume != null && Number.isFinite(Number(msg.volume))) setVolume(Number(msg.volume), { send: false }); // null = never set
      if (msg.layout && typeof msg.layout === 'object') setLook(msg.layout, { send: false }); // what the overlays show
    } else if (msg.type === 'layout') {
      setLook(msg, { send: false }); // panel / API changed the look
    } else if (msg.type === 'volume' && Number.isFinite(Number(msg.volume)) && (!msg.bus || msg.bus === 'master')) {
      setVolume(Number(msg.volume), { send: false }); // the phone's ±6 dB buttons work on the master bus only
    } else if (msg.type === 'pairing') {
      if (msg.event === 'paired' && invite && !$('#invite-box').hidden && msg.device && (!session.device || msg.device.id !== session.device.id)) {
        $('#invite-expiry').textContent = `✔ Gekoppelt: ${msg.device.name}`;
        $('#invite-code').textContent = '✔';
        clearInterval(inviteTimer);
        inviteTimer = null;
        invite = null;
      }
      if (msg.event === 'revoked' && session.device && (msg.id === '*' || msg.id === session.device.id)) checkSession();
    }
  });

  // ---------- controls ----------
  $('#btn-mute').addEventListener('click', () => {
    paused = !paused;
    const b = $('#btn-mute');
    b.textContent = paused ? '▶ Weiter' : '⏸ Pause';
    b.classList.toggle('paused', paused);
    haptic(paused ? [20, 40, 20] : 15);
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
  for (const b of document.querySelectorAll('#tabbar [data-tab]')) b.addEventListener('click', () => showTab(b.dataset.tab));
  $('#btn-setup').addEventListener('click', () => openSetup(0));
  $('#btn-invite').addEventListener('click', openInvite);
  $('#btn-invite-new').addEventListener('click', openInvite);
  $('#btn-unpair').addEventListener('click', unpair);
  $('#setup-next').addEventListener('click', () => (setupIdx >= SETUP_STEPS - 1 ? finishSetup(false) : setupGo(setupIdx + 1)));
  $('#setup-back').addEventListener('click', () => setupGo(setupIdx - 1));
  $('#setup-skip').addEventListener('click', () => finishSetup(true));
  $('#setup-test').addEventListener('click', sendTestEffect);
  $('#setup-track').addEventListener('scroll', onSetupScroll, { passive: true });
  // a finger on the track = the user swipes: stop treating scroll events as our own animation
  for (const ev of ['touchstart', 'pointerdown', 'wheel']) $('#setup-track').addEventListener(ev, () => (setupScrollTarget = null), { passive: true });
  window.addEventListener('resize', () => {
    if (!setupOpen()) return;
    const track = $('#setup-track');
    track.scrollLeft = setupIdx * track.clientWidth; // stay on the step after rotating the phone
  });
  document.addEventListener('keydown', (e) => {
    if (!setupOpen()) return;
    if (e.key === 'Escape') finishSetup(true);
    else if (e.key === 'ArrowRight') setupGo(setupIdx + 1);
    else if (e.key === 'ArrowLeft') setupGo(setupIdx - 1);
  });

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
    const saved = lsGet(TAB_KEY);
    showTab(TABS.includes(saved) ? saved : 'fx', { remember: false, scroll: false });
    await Promise.all([reload(), checkSession()]);
    applyFilter();
    if (shouldAutoOpenSetup()) openSetup(0);
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
    /** 2.4: the phone microphone (js/phone-mic.js) – created on the first „🎙 Handy-Mikro“ tap. */
    get asr() {
      return phoneMic;
    },
    get phoneMic() {
      return phoneMic;
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
    // 2.4
    showTab,
    get tab() {
      return tab;
    },
    get session() {
      return { ...session };
    },
    checkSession,
    setup: {
      open: openSetup,
      close: () => closeSetup({ done: false }),
      finish: finishSetup,
      go: setupGo,
      sendTest: sendTestEffect,
      get isOpen() {
        return setupOpen();
      },
      get step() {
        return setupIdx;
      },
    },
    toggleMic,
    upgradeToHttps,
    openInvite,
    TEST_TRIGGER,
    ready: boot(),
  };
})();
