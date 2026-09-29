// LiveFX – control panel logic: mic → speech recognition → matcher → bus → overlay.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const STORAGE_KEY = 'livefx.triggers.v1';
  const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't'];

  const bus = new LiveFXBus.Bus({ role: 'panel' });
  let triggers = loadTriggers();
  const matcher = new LiveFXMatcher.Matcher(triggers, { globalMinGap: Number($('#gap').value) });
  let paused = false;
  let recognition = null;
  let listening = false;

  // ---------- persistence ----------
  function loadTriggers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return JSON.parse(JSON.stringify(LiveFXDefaultTriggers));
  }
  function saveTriggers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));
    matcher.setTriggers(triggers);
    renderPad();
    renderRows();
  }

  // ---------- firing ----------
  function fire(trigger, source) {
    if (paused) return log(`⏸ (pausiert) ${trigger.label}`);
    const { _keywords, ...clean } = trigger;
    bus.send({ type: 'fire', trigger: clean, source });
    log(`🔥 ${trigger.label}  ←  ${source}`);
  }

  // ---------- speech ----------
  function setupRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      log('❌ Dieser Browser kann keine Spracherkennung. Bitte Chrome oder Edge nutzen.');
      return null;
    }
    const rec = new SR();
    rec.lang = $('#lang').value;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => {
      let finalText = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      const current = (finalText || interim).trim();
      handleText(current, !!finalText, 'Mikro');
    };
    rec.onstart = () => setMic(true);
    rec.onend = () => {
      setMic(false);
      if (listening) {
        // Chrome stops after silence / ~60s; restart to keep it continuous.
        try { rec.start(); } catch (_) {}
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        listening = false;
        setMic(false);
        log('❌ Mikrofon-Zugriff verweigert.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        log(`⚠️ Spracherkennung: ${e.error}`);
      }
    };
    return rec;
  }

  function handleText(text, isFinal, source) {
    const hits = matcher.process(text);
    renderTranscript(text, isFinal, hits.map((h) => h.keyword));
    for (const h of hits) fire(h.trigger, `${source}: „${h.keyword}“`);
    if (isFinal) matcher.endUtterance();
  }

  function setMic(on) {
    $('#dot-mic').classList.toggle('on', on);
    $('#btn-listen').classList.toggle('listening', on);
    $('#btn-listen').textContent = on ? '🎙️ Hört zu … (Stop)' : '🎙️ Mikro starten';
  }

  $('#btn-listen').addEventListener('click', () => {
    if (listening) {
      listening = false;
      recognition && recognition.stop();
      return;
    }
    recognition = setupRecognition();
    if (!recognition) return;
    listening = true;
    try {
      recognition.start();
    } catch (e) {
      log(`⚠️ ${e.message}`);
    }
  });

  $('#lang').addEventListener('change', () => {
    if (listening) {
      listening = false;
      recognition.stop();
      setTimeout(() => $('#btn-listen').click(), 300);
    }
  });

  // ---------- simulation (no mic) ----------
  function simulate() {
    const text = $('#sim').value.trim();
    if (!text) return;
    handleText(text, true, 'Text');
    $('#sim').value = '';
  }
  $('#btn-sim').addEventListener('click', simulate);
  $('#sim').addEventListener('keydown', (e) => e.key === 'Enter' && simulate());

  // ---------- transcript view ----------
  const transcriptEl = $('#transcript');
  let history = [];
  function renderTranscript(text, isFinal, keywords) {
    let html = escapeHtml(text);
    for (const kw of keywords) {
      html = html.replace(new RegExp(`(${escapeRegExp(kw)})`, 'i'), '<mark>$1</mark>');
    }
    const lines = history.concat([`<span class="${isFinal ? '' : 'interim'}">${html}</span>`]);
    transcriptEl.innerHTML = lines.join('<br>');
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
    if (isFinal) {
      history.push(`<span>${html}</span>`);
      history = history.slice(-6);
    }
  }

  // ---------- soundboard ----------
  function renderPad() {
    const pad = $('#pad');
    pad.innerHTML = '';
    triggers.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = t.enabled === false ? 'off' : '';
      const key = HOTKEYS[i];
      b.innerHTML = `${key ? `<span class="key">${key.toUpperCase()}</span>` : ''}<span class="emoji">${t.visual?.emoji || '✨'}</span><span>${escapeHtml(t.label)}</span>`;
      b.addEventListener('click', () => fire(t, 'Button'));
      pad.appendChild(b);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const idx = HOTKEYS.indexOf(e.key.toLowerCase());
    if (idx >= 0 && triggers[idx]) fire(triggers[idx], `Hotkey ${e.key}`);
  });

  // ---------- trigger editor ----------
  function renderRows() {
    const tbody = $('#trigger-rows');
    tbody.innerHTML = '';
    triggers.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" ${t.enabled === false ? '' : 'checked'} data-f="enabled" style="width:auto"></td>
        <td><input value="${escapeAttr(t.label)}" data-f="label"></td>
        <td class="kw"><input value="${escapeAttr((t.keywords || []).join(', '))}" data-f="keywords"></td>
        <td><select data-f="sound">${['', ...LiveFXSounds.names].map((s) => `<option value="${s}" ${s === (t.sound || '') ? 'selected' : ''}>${s || '– keiner –'}</option>`).join('')}</select></td>
        <td><button class="small" data-act="test" title="Testen">▶</button> <button class="small danger" data-act="del" title="Löschen">✕</button></td>`;
      tr.querySelectorAll('[data-f]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const f = inp.dataset.f;
          if (f === 'enabled') t.enabled = inp.checked;
          else if (f === 'keywords') t.keywords = inp.value.split(',').map((s) => s.trim()).filter(Boolean);
          else t[f] = inp.value;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));
          matcher.setTriggers(triggers);
          renderPad();
        });
      });
      tr.querySelector('[data-act="test"]').addEventListener('click', () => fire(t, 'Test'));
      tr.querySelector('[data-act="del"]').addEventListener('click', () => {
        triggers.splice(i, 1);
        saveTriggers();
      });
      tbody.appendChild(tr);
    });
  }

  $('#btn-add').addEventListener('click', () => {
    const emoji = prompt('Emoji für den Effekt (z.B. 🐸):', '🐸') || '✨';
    const text = prompt('Text auf der Karte (optional):', '') || '';
    triggers.push({
      id: `custom-${Date.now()}`,
      label: text || emoji,
      keywords: [],
      visual: { kind: 'card', emoji, text, bg: '#111', color: '#fff' },
      sound: 'pop',
      cooldown: 4,
    });
    saveTriggers();
  });
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Alle Trigger auf Standard zurücksetzen?')) return;
    triggers = JSON.parse(JSON.stringify(LiveFXDefaultTriggers));
    saveTriggers();
  });
  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(triggers, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'livefx-triggers.json';
    a.click();
  });
  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (!Array.isArray(parsed)) throw new Error('kein Array');
      triggers = parsed;
      saveTriggers();
      log(`📥 ${parsed.length} Trigger importiert`);
    } catch (err) {
      log(`❌ Import fehlgeschlagen: ${err.message}`);
    }
  });

  // ---------- misc controls ----------
  $('#btn-open-overlay').addEventListener('click', () => window.open('overlay.html', 'livefx-overlay'));
  $('#btn-mute').addEventListener('click', () => {
    paused = !paused;
    $('#btn-mute').textContent = paused ? '▶ Weiter' : '⏸ Pause';
  });
  $('#volume').addEventListener('input', (e) => bus.send({ type: 'volume', volume: Number(e.target.value) }));
  $('#gap').addEventListener('change', (e) => (matcher.globalMinGap = Number(e.target.value)));

  function log(msg) {
    const el = $('#log');
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
    el.prepend(line);
    while (el.children.length > 60) el.lastChild.remove();
  }

  setInterval(() => {
    bus._pingServer && bus._pingServer();
    const d = $('#dot-server');
    d.classList.toggle('on', bus.serverOk);
    d.classList.toggle('warn', !bus.serverOk);
    d.title = bus.serverOk ? 'server.js läuft – OBS-Overlay verbunden' : 'server.js läuft nicht – nur Vorschau im selben Browser';
  }, 2000);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  const escapeAttr = escapeHtml;
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  renderPad();
  renderRows();
  log('Bereit. Tipp: Ohne Mikro einfach unten Text eintippen.');
  window.livefx = { bus, matcher, fire, handleText, get triggers() { return triggers; } };
})();
