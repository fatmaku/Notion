// LiveFX – mobile remote (mobile.html): a phone-first mirror of the panel's soundboard. Tiles fire
// triggers through the bus (role `panel`, so the server broadcasts them to every overlay), the header
// pauses effects and sets the overlay volume, the scenes row mirrors the panel's scene pad, and the
// microphone button runs the browser ASR + matcher on the phone when the page is a secure context
// (https or localhost). See docs/HANDY.md and docs/CONTRACTS.md §11 "Mobile".
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
  const MIC_HINT = 'Mikro am Handy braucht HTTPS – siehe Anleitung (docs/HANDY.md).';

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

  function renderPad() {
    const pad = $('#pad');
    pad.innerHTML = '';
    let shown = 0;
    triggers.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = t.id;
      b.className = t.enabled === false ? 'off' : '';
      b.title = t.enabled === false ? `${labelOf(t)} (deaktiviert)` : labelOf(t);
      const thumb = LiveFXAssets.thumbnailFor(t);
      const visual = thumb.img ? `<img class="thumb" alt="" src="${esc(thumb.img)}">` : `<span class="emoji">${esc(thumb.emoji || '✨')}</span>`;
      b.innerHTML = `${visual}<span class="lbl">${esc(labelOf(t))}</span>`;
      b.hidden = !matches(t, query);
      if (!b.hidden) shown++;
      b.addEventListener('click', () => manualFire(t, b));
      pad.appendChild(b);
    });
    $('#count').textContent = query ? `${shown}/${triggers.length}` : String(triggers.length);
    $('#empty').hidden = shown > 0;
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
  $('#volume').addEventListener('input', (e) => bus.send({ type: 'volume', volume: Math.min(1, Math.max(0, Number(e.target.value) || 0)) }));
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
    ready: boot(),
  };
})();
