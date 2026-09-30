// LiveFX – control panel: wires ASR → matcher → bus → overlay together with the trigger store,
// media library, editor dialog, smart mode and the external API card. See docs/CONTRACTS.md §11.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const S = window.LiveFXSchema;
  const esc = (s) => S.escapeHtml(s == null ? '' : s);
  const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't'];
  const SMART_REASONS = {
    no_sdk: 'KI nicht verfügbar: npm install @anthropic-ai/sdk zod',
    no_key: 'KI nicht verfügbar: ANTHROPIC_API_KEY setzen',
    disabled: 'KI deaktiviert (LIVEFX_SMART=0)',
    bad_key: 'KI nicht verfügbar: API-Key ungültig (ANTHROPIC_API_KEY prüfen)',
    offline: 'KI nicht verfügbar: Server nötig (node server.js)',
  };

  // ---------- state ----------
  const bus = new LiveFXBus.Bus({ role: 'panel' });
  LiveFXStore.attachBus(bus);
  const online = bus.serverBase !== null;
  const matcher = new LiveFXMatcher.Matcher([], { globalMinGap: Number($('#gap').value) || 0 });
  let triggers = [];
  let paused = false;
  let asr = null; // current LiveFXASR backend instance
  let asrWanted = false; // the streamer pressed start (survives backend/lang swaps)
  let smart = null;
  let utteranceHits = 0;
  let library = null;
  let pendingRemote = false; // triggers-updated arrived while the editor was open
  let config = null;

  // ---------- helpers ----------
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

  function log(msg) {
    const el = $('#log');
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
    el.prepend(line);
    while (el.children.length > 80) el.lastChild.remove();
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Public copy of a trigger: internal `_`-prefixed matcher keys stripped. */
  function publicTrigger(t) {
    const out = {};
    for (const k of Object.keys(t)) if (!k.startsWith('_')) out[k] = t[k];
    return out;
  }

  function labelOf(t) {
    return (t && (t.label || t.id)) || '?';
  }

  // ---------- firing ----------
  function fire(trigger, source) {
    if (!trigger || typeof trigger !== 'object') return;
    const src = String(source || 'Panel').slice(0, S.LIMITS.sourceLen);
    if (paused) {
      log(`⏸ (pausiert) ${labelOf(trigger)} ← ${src}`);
      return;
    }
    bus.send({ type: 'fire', trigger: publicTrigger(trigger), source: src });
    log(`🔥 ${labelOf(trigger)}  ←  ${src}`);
  }

  /** Hotkeys and pad buttons: explicit user action, ignores cooldowns but not the enabled flag. */
  function manualFire(trigger, source) {
    if (!trigger) return;
    if (trigger.enabled === false) {
      log(`🚫 ${labelOf(trigger)} ist deaktiviert (${source})`);
      return;
    }
    fire(trigger, source);
  }

  // ---------- transcript ----------
  const transcriptEl = $('#transcript');
  let history = []; // HTML of the last final lines (already escaped)

  /**
   * Builds the highlighted transcript HTML from the RAW text: match ranges are collected with
   * unicode word boundaries first, then every segment is escaped and matches wrapped in <mark>.
   */
  function highlight(text, keywords) {
    const raw = String(text);
    const ranges = [];
    for (const kw of keywords) {
      const words = String(kw || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => escapeRegExp(w).replace(/'/g, "['’´`]"));
      if (!words.length) continue;
      let re;
      try {
        re = new RegExp(`(^|[^\\p{L}\\p{N}])(${words.join('[^\\p{L}\\p{N}]+')})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
      } catch (_) {
        continue;
      }
      let m;
      while ((m = re.exec(raw)) !== null) {
        const start = m.index + m[1].length;
        ranges.push([start, start + m[2].length]);
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let html = '';
    let pos = 0;
    for (const [start, end] of ranges) {
      if (start < pos) continue; // overlapping match – already highlighted
      html += esc(raw.slice(pos, start)) + '<mark>' + esc(raw.slice(start, end)) + '</mark>';
      pos = end;
    }
    return html + esc(raw.slice(pos));
  }

  function renderTranscript(text, isFinal, keywords) {
    const html = highlight(text, keywords);
    const lines = history.concat([`<span class="${isFinal ? 'final' : 'interim'}">${html}</span>`]);
    transcriptEl.innerHTML = lines.join('<br>');
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
    if (isFinal) {
      history.push(`<span class="final">${html}</span>`);
      history = history.slice(-6);
    }
  }

  // ---------- speech → matcher → smart ----------
  function handleText(text, isFinal, meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    const source = String(m.source || 'Text');
    const str = String(text == null ? '' : text);
    const hits = matcher.process(str);
    utteranceHits += hits.length;
    renderTranscript(str, !!isFinal, hits.map((h) => h.keyword));
    for (const h of hits) fire(h.trigger, `${source}: „${h.keyword}“`);
    if (isFinal) {
      matcher.endUtterance();
      const hitsInUtterance = utteranceHits;
      utteranceHits = 0;
      if (hitsInUtterance === 0 && smart && smart.status.available && smart.shouldClassify(str, 0, true)) {
        classifySmart(str, m.lang || $('#lang').value);
      }
    }
  }

  async function classifySmart(text, lang) {
    let r;
    try {
      r = await smart.classify(text, lang);
    } catch (e) {
      log(`⚠️ KI-Fehler: ${e && e.message ? e.message : e}`);
      return;
    }
    if (!r) return;
    if (r.error) {
      log(`⚠️ KI: ${r.error}`);
      return;
    }
    const pct = Math.round((Number(r.confidence) || 0) * 100);
    if (!r.triggerId || r.confidence < smart.threshold) {
      log(`🤖 KI: kein passender Trigger (${pct} %)`);
      return;
    }
    const res = matcher.fireById(r.triggerId);
    if (res.blocked) {
      log(`🤖 KI: ${r.triggerId} blockiert (${res.blocked})`);
      return;
    }
    fire(res.trigger, `KI (${pct} %): „${text.slice(0, 40)}“`);
  }

  // ---------- ASR ----------
  function asrActive() {
    return !!asr && ['listening', 'starting', 'restarting'].includes(asr.state);
  }

  function setMic(on) {
    $('#dot-mic').classList.toggle('on', on);
    $('#btn-listen').classList.toggle('listening', on);
  }

  function reflectAsrState(state) {
    const btn = $('#btn-listen');
    const ext = asr && asr.name === 'external';
    setMic(state === 'listening');
    if (state === 'listening') btn.textContent = ext ? '📡 Wartet auf externe Transkripte (Stop)' : '🎙️ Hört zu … (Stop)';
    else if (state === 'starting' || state === 'restarting') btn.textContent = '⏳ verbindet …';
    else btn.textContent = ext ? '📡 Externe Transkripte empfangen' : '🎙️ Mikro starten';
    if (state === 'idle' || state === 'error' || state === 'unsupported') asrWanted = false;
  }

  function createAsr(name) {
    if (asr) {
      try {
        asr.stop();
      } catch (_) {
        /* ignore */
      }
    }
    const backend = LiveFXASR.backends.some((b) => b.name === name) ? name : 'webspeech';
    asr = LiveFXASR.create(backend, {
      lang: $('#lang').value,
      bus,
      onText: (text, isFinal, meta) => handleText(text, isFinal, meta),
      onState: (state) => reflectAsrState(state),
      onError: (err) => {
        log(`${err.fatal ? '❌' : '⚠️'} ${err.message || err.code}`);
        if (err.fatal) reflectAsrState('error');
      },
    });
    reflectAsrState(asr.state === 'unsupported' ? 'idle' : asr.state);
    return asr;
  }

  function fillAsrSelect() {
    const sel = $('#asr');
    const saved = lsGet('livefx.asr');
    sel.innerHTML = LiveFXASR.backends
      .map((b) => `<option value="${esc(b.name)}"${b.supported ? '' : ' disabled'}>${esc(b.label)}${b.supported ? '' : ' (nicht verfügbar)'}</option>`)
      .join('');
    const supported = LiveFXASR.backends.filter((b) => b.supported).map((b) => b.name);
    sel.value = supported.includes(saved) ? saved : supported[0] || 'webspeech';
  }

  $('#btn-listen').addEventListener('click', () => {
    if (!asr) return;
    if (asrActive()) {
      asrWanted = false;
      asr.stop();
      return;
    }
    asrWanted = true;
    asr.start();
  });
  $('#lang').addEventListener('change', () => asr && asr.setLang($('#lang').value));
  $('#asr').addEventListener('change', () => {
    const wanted = asrWanted || asrActive();
    lsSet('livefx.asr', $('#asr').value);
    createAsr($('#asr').value);
    if (wanted) {
      asrWanted = true;
      asr.start();
    }
  });

  // ---------- simulation (no mic) ----------
  function simulate() {
    const text = $('#sim').value.trim();
    if (!text) return;
    handleText(text, true, { source: 'Text', lang: $('#lang').value });
    $('#sim').value = '';
  }
  $('#btn-sim').addEventListener('click', simulate);
  $('#sim').addEventListener('keydown', (e) => e.key === 'Enter' && simulate());

  // ---------- soundboard / hotkeys ----------
  function renderPad() {
    const pad = $('#pad');
    pad.innerHTML = '';
    triggers.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = t.enabled === false ? 'off' : '';
      b.title = t.enabled === false ? `${labelOf(t)} (deaktiviert)` : labelOf(t);
      const key = HOTKEYS[i];
      const thumb = LiveFXAssets.thumbnailFor(t);
      const visual = thumb.img
        ? `<img class="thumb" alt="" src="${esc(thumb.img)}">`
        : `<span class="emoji">${esc(thumb.emoji || '✨')}</span>`;
      b.innerHTML = `${key ? `<span class="key">${esc(key.toUpperCase())}</span>` : ''}${visual}<span class="lbl">${esc(labelOf(t))}</span>`;
      b.addEventListener('click', () => manualFire(t, 'Button'));
      pad.appendChild(b);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (LiveFXEditor.isOpen()) return;
    const target = e.target;
    if (target && typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable]')) return;
    const idx = HOTKEYS.indexOf(String(e.key || '').toLowerCase());
    if (idx < 0 || !triggers[idx]) return;
    manualFire(triggers[idx], `Hotkey ${e.key.toUpperCase()}`);
  });

  // ---------- trigger table ----------
  function soundOptions(current) {
    const cur = typeof current === 'string' ? current : '';
    const opts = ['', ...LiveFXSounds.names];
    if (cur && !opts.includes(cur)) opts.push(cur);
    return opts
      .map((s) => {
        const label = s === '' ? '– keiner –' : s.startsWith('file:') ? `🎵 ${s.replace(/^file:assets\//, '')}` : s;
        return `<option value="${esc(s)}"${s === cur ? ' selected' : ''}>${esc(label)}</option>`;
      })
      .join('');
  }

  function renderRows() {
    const tbody = $('#trigger-rows');
    tbody.innerHTML = '';
    triggers.forEach((t) => {
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      if (t.enabled === false) tr.classList.add('off');
      tr.innerHTML = `
        <td><input type="checkbox"${t.enabled === false ? '' : ' checked'} data-f="enabled" class="check" title="Aktiv"></td>
        <td class="name"><input value="${esc(t.label)}" data-f="label" maxlength="40"></td>
        <td class="kw"><input value="${esc((t.keywords || []).join(', '))}" data-f="keywords"></td>
        <td><select data-f="sound">${soundOptions(t.sound)}</select></td>
        <td class="acts"><button type="button" class="small" data-act="edit" title="Bearbeiten">✎</button><button type="button" class="small" data-act="test" title="Testen">▶</button><button type="button" class="small danger" data-act="del" title="Löschen">✕</button></td>`;
      tr.querySelectorAll('[data-f]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const f = inp.dataset.f;
          if (f === 'enabled') t.enabled = inp.checked;
          else if (f === 'keywords') t.keywords = inp.value.split(',').map((s) => s.trim()).filter(Boolean);
          else if (f === 'sound') t.sound = inp.value || null;
          else t[f] = inp.value;
          tr.classList.toggle('off', t.enabled === false);
          commit({ rows: false });
        });
      });
      tr.querySelector('[data-act="edit"]').addEventListener('click', () => openEditor(t));
      tr.querySelector('[data-act="test"]').addEventListener('click', () => fire(t, 'Test'));
      tr.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm(`„${labelOf(t)}“ wirklich löschen?`)) return;
        removeTrigger(t.id);
      });
      tbody.appendChild(tr);
    });
  }

  /** Applies `triggers` to the matcher and the UI, then persists. */
  function commit({ rows = true, save = true } = {}) {
    matcher.setTriggers(triggers);
    renderPad();
    if (rows) renderRows();
    if (save) LiveFXStore.save(triggers);
  }

  function removeTrigger(id) {
    const idx = triggers.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const [gone] = triggers.splice(idx, 1);
    commit();
    log(`🗑️ ${labelOf(gone)} gelöscht`);
  }

  async function openEditor(trigger, { isNew = false } = {}) {
    let assets = [];
    if (online) {
      try {
        assets = await LiveFXAssets.list();
      } catch (e) {
        log(`⚠️ Medienliste: ${e.message}`);
      }
    }
    const opts = {
      assets: LiveFXAssets.groupAssets(assets),
      sounds: LiveFXSounds.names,
      onTest: (draft) => fire(draft, 'Test'),
      onAssetsChange: () => library && library.refresh(),
      title: isNew ? 'Neuer Trigger' : `Trigger: ${labelOf(trigger)}`,
    };
    if (!isNew) opts.onDelete = (t) => removeTrigger(t.id);
    const result = await LiveFXEditor.open(trigger, opts);
    if (result) {
      const idx = triggers.findIndex((t) => t.id === result.id);
      if (idx >= 0) triggers[idx] = result;
      else triggers.push(result);
      commit();
      log(`💾 ${labelOf(result)} gespeichert`);
    }
    if (pendingRemote) {
      pendingRemote = false;
      reloadFromStore('anderer Client');
    }
  }

  $('#btn-add').addEventListener('click', () => {
    if (triggers.length >= S.LIMITS.triggers) {
      log(`⚠️ Maximal ${S.LIMITS.triggers} Trigger`);
      return;
    }
    openEditor(
      { id: S.newId('t'), label: '', keywords: [], enabled: true, cooldown: 4, sound: 'pop', visual: { kind: 'card', emoji: '🐸', position: 'center' } },
      { isNew: true }
    );
  });

  $('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Alle Trigger auf Standard zurücksetzen?')) return;
    const r = await LiveFXStore.reset();
    triggers = r.triggers;
    commit({ save: false });
    log('↩️ Trigger auf Standard zurückgesetzt');
  });

  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(triggers.map(publicTrigger), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'livefx-triggers.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.triggers) ? parsed.triggers : null;
      if (!list) throw new Error('kein Trigger-Array');
      const n = S.normalizeTriggers(list);
      for (const w of n.warnings) log(`⚠️ Import: ${w}`);
      if (!n.triggers.length) throw new Error('keine gültigen Trigger');
      triggers = n.triggers;
      commit();
      log(`📥 ${n.triggers.length} Trigger importiert`);
    } catch (err) {
      log(`❌ Import fehlgeschlagen: ${err.message}`);
    }
  });

  // ---------- store / remote ----------
  async function reloadFromStore(why) {
    if (LiveFXEditor.isOpen()) {
      pendingRemote = true;
      return;
    }
    const r = await LiveFXStore.load();
    triggers = r.triggers;
    commit({ save: false });
    log(`🔄 Trigger neu geladen (${why || sourceLabel(r.source)})`);
  }

  function sourceLabel(source) {
    return source === 'server' ? 'Server' : source === 'local' ? 'lokal' : 'Standard';
  }

  LiveFXStore.onRemoteChange(() => reloadFromStore('anderer Client'));

  // ---------- bus ----------
  bus.onStatus((s) => {
    const d = $('#dot-server');
    d.classList.remove('on', 'warn', 'err');
    if (s.authError) {
      d.classList.add('err');
      d.title = 'Token-Fehler: Server lehnt Nachrichten ab (401/403)';
    } else if (s.sse === 'open') {
      d.classList.add('on');
      d.title = 'server.js läuft – OBS-Overlay verbunden';
    } else {
      d.classList.add('warn');
      d.title = online ? 'Verbindung zum Server wird aufgebaut …' : 'server.js läuft nicht – nur Vorschau im selben Browser';
    }
  });

  bus.onMessage((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'fire' && msg.trigger) log(`🔥 ${labelOf(msg.trigger)}  ←  ${String(msg.source || 'extern').slice(0, 80)}`);
  });

  // ---------- smart mode ----------
  function smartReasonText(st) {
    if (st.available) return `KI bereit · Modell ${st.model || '?'}${st.mock ? ' (Mock)' : ''}`;
    return SMART_REASONS[st.reason] || `KI nicht verfügbar${st.reason ? `: ${st.reason}` : ''}`;
  }

  function reflectSmart(st) {
    const cb = $('#smart');
    const dot = $('#dot-smart');
    const pill = $('#pill-smart');
    const avail = !!st.available;
    cb.disabled = !avail;
    cb.checked = avail && smart.enabled;
    dot.classList.toggle('on', avail && smart.enabled);
    dot.classList.toggle('warn', !avail);
    pill.title = smartReasonText(st);
    dot.title = pill.title;
  }

  $('#smart').addEventListener('change', () => {
    smart.setEnabled($('#smart').checked);
    log(smart.enabled ? '🤖 KI-Modus an' : '🤖 KI-Modus aus');
  });

  // ---------- misc controls ----------
  $('#btn-open-overlay').addEventListener('click', () => window.open('overlay.html', 'livefx-overlay'));
  $('#btn-mute').addEventListener('click', () => {
    paused = !paused;
    $('#btn-mute').textContent = paused ? '▶ Weiter' : '⏸ Pause';
    log(paused ? '⏸ Effekte pausiert' : '▶ Effekte wieder aktiv');
  });
  $('#volume').addEventListener('input', (e) => bus.send({ type: 'volume', volume: Math.min(1, Math.max(0, Number(e.target.value) || 0)) }));
  $('#gap').addEventListener('change', (e) => (matcher.globalMinGap = Math.max(0, Number(e.target.value) || 0)));

  $('#btn-copy-token').addEventListener('click', async () => {
    const input = $('#token');
    if (!input.value) return;
    try {
      await navigator.clipboard.writeText(input.value);
      log('📋 Token kopiert');
    } catch (_) {
      input.focus();
      input.select();
      log('📋 Token markiert – mit Strg+C kopieren');
    }
  });

  // ---------- external API card ----------
  function renderApiCard(token) {
    const origin = online ? location.origin : 'http://127.0.0.1:8787';
    $('#url-landscape').textContent = `${origin}/overlay.html`;
    $('#url-portrait').textContent = `${origin}/overlay.html?layout=portrait`;
    const t = token || '<TOKEN>';
    $('#curl-example').textContent =
      `curl -X POST ${origin}/api/fire \\\n` +
      `  -H "Authorization: Bearer ${t}" \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      `  -d '{"id":"wow","source":"Stream Deck"}'`;
    $('#token').value = token || '';
    $('#btn-copy-token').disabled = !token;
    $('#api-offline-hint').hidden = !!token;
  }

  async function loadConfig() {
    if (!online) return null;
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d && d.ok) return d;
      log(`⚠️ /api/config: ${(d && (d.error || d.message)) || r.status}`);
    } catch (e) {
      log(`⚠️ /api/config nicht erreichbar: ${e.message}`);
    }
    return null;
  }

  // ---------- boot ----------
  async function boot() {
    fillAsrSelect();
    renderApiCard(null);
    if (!online) log('ℹ️ Kein Server (file://): nur Vorschau im selben Browser. Für OBS, Uploads und API: node server.js');

    smart = LiveFXSmart.create({ bus, onStatus: reflectSmart });
    reflectSmart(smart.status);

    config = await loadConfig();
    if (config) {
      renderApiCard(config.token);
      log(`✅ Server verbunden (LiveFX ${config.version || ''})`);
    }

    const loaded = await LiveFXStore.load();
    triggers = loaded.triggers;
    commit({ save: false });
    log(`📂 Trigger geladen: ${sourceLabel(loaded.source)} (${triggers.length})`);

    if (online) {
      library = LiveFXAssets.mountLibrary($('#asset-library'), { onChange: () => {} });
      smart.refreshStatus().then((st) => log(`🤖 ${smartReasonText(st)}`));
    } else {
      $('#asset-library').innerHTML = '<div class="help">Uploads brauchen den Server: <code>node server.js</code></div>';
    }

    createAsr($('#asr').value);
    log('Bereit. Tipp: Ohne Mikro einfach oben Text eintippen.');
  }

  window.livefx = {
    bus,
    matcher,
    fire,
    handleText,
    get triggers() {
      return triggers;
    },
    setTriggers(list) {
      triggers = Array.isArray(list) ? list : [];
      commit();
    },
    get asr() {
      return asr;
    },
    get smart() {
      return smart;
    },
    store: LiveFXStore,
    ready: boot(),
  };
})();
