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
  // Snapshot before this page writes anything: does this browser already know LiveFX? (first-run mode, see initFirstRun)
  const hadLocalState = (() => {
    try {
      for (let i = 0; i < localStorage.length; i++) if (String(localStorage.key(i)).startsWith('livefx.')) return true;
    } catch (_) {
      /* private mode */
    }
    return false;
  })();
  const SetupLib = window.LiveFXSetup || null; // js/setup-card.js (pairing QR, setup card) – optional
  const pageParams = new URLSearchParams(location.search);
  const bus = new LiveFXBus.Bus({ role: 'panel' });
  LiveFXStore.attachBus(bus);
  const online = bus.serverBase !== null;
  // Recognition settings (localStorage `livefx.asr.*`, see docs/DESIGN-RECOGNITION.md §C).
  const ASR_KEYS = { lang: 'livefx.asr.lang', tolerance: 'livefx.asr.tolerance', reaction: 'livefx.asr.reaction', alternatives: 'livefx.asr.alternatives', restart: 'livefx.asr.restart', ignored: 'livefx.asr.ignored' };
  const TOLERANCES = ['off', 'medium', 'high'];
  const REACTIONS = ['fast', 'safe'];
  const RESTART_MS = 60000;
  const STALL_MS = 20000;
  const IGNORED_CAP = 50;
  const MISSES_MAX = 8;
  const MISS_CHIPS_MAX = 8; // longer phrases need an explicit word selection
  const SUGGEST_MAX = 3;
  const SELFCHECK_MS = 8000;
  const LATENCY_WINDOW = 5;
  // 1.5: `lang: 'auto'` = automatic DE/TR/EN detection (backend `auto`, docs/CONTRACTS.md §6); new users start with it.
  const AUTO_LANGS = ['de-DE', 'tr-TR', 'en-US'];
  const LANG_NAMES = { de: 'Deutsch', tr: 'Türkçe', en: 'English' };
  const settings = { lang: 'auto', tolerance: 'medium', reaction: 'fast', alternatives: true, restart: false, ignored: [] };
  let detected = null; // { lang, family, mode, reason } – last `lang` event of the auto backend
  const matcher = new LiveFXMatcher.Matcher([], { globalMinGap: Number($('#gap').value) || 0, tolerance: settings.tolerance, lang: settings.lang });
  let triggers = [];
  let paused = false;
  let asr = null; // current LiveFXASR backend instance
  let asrWanted = false; // the streamer pressed start (survives backend/lang swaps)
  let smart = null;
  let utteranceHits = 0;
  let library = null;
  let pendingRemote = false; // triggers-updated arrived while the editor was open
  let config = null;
  let meter = null; // LiveFXMeter instance (null when meter.js is missing)
  let meterStarted = false;
  let missSeq = 0;
  let misses = []; // { id, text, norm, words } – last final utterances without any hit
  let suggestions = []; // { trigger, spoken, keyword } – fuzzy hits the streamer may save as keywords
  let lastMissNorm = null;
  const latencies = []; // ms between end of speech (meter) and the final result
  let lastMatcherMs = null;
  let selfCheck = null; // { word, timer, startedAt, voiceSeenAt }

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
  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      /* private mode */
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
    let out = publicTrigger(trigger);
    // 2.0: „Intensität aus Stimme“ – the mic level at the moment of the hit picks the effect strength.
    const intensity = voiceIntensity();
    if (intensity) out = { ...out, visual: { ...(out.visual || {}), intensity } };
    bus.send({ type: 'fire', trigger: out, source: src });
    log(`🔥 ${labelOf(trigger)}  ←  ${src}${intensity ? `  · Intensität ${intensity}` : ''}`);
    recordComboFire(trigger, src);
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
  function fireSource(source, h) {
    const spoken = h.spoken || h.keyword;
    return h.fuzzy && spoken !== h.keyword ? `${source}: „${spoken}“ (≈ ${h.keyword})` : `${source}: „${spoken}“`;
  }

  /** Runs the matcher with timing; keeps the rolling matcher-time figure for #diag-latency. */
  function runMatcher(text) {
    const t0 = performance.now();
    let hits;
    try {
      hits = matcher.process(text) || [];
    } catch (e) {
      log(`⚠️ Matcher-Fehler: ${e && e.message ? e.message : e}`);
      hits = [];
    }
    lastMatcherMs = performance.now() - t0;
    renderLatency();
    return hits;
  }

  function handleText(text, isFinal, meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    const source = String(m.source || 'Text');
    const str = String(text == null ? '' : text);
    // Reaction "sicher": interim results only feed the transcript, matching waits for the final sentence.
    if (!isFinal && settings.reaction === 'safe') {
      renderTranscript(str, false, []);
      sendLiveStory(str, false, m);
      return;
    }
    const hits = runMatcher(str);
    utteranceHits += hits.length;
    renderTranscript(str, !!isFinal, hits.map((h) => h.spoken || h.keyword));
    sendLiveStory(str, !!isFinal, m);
    for (const h of hits) {
      fire(h.trigger, fireSource(source, h));
      if (h.fuzzy && h.spoken && h.spoken !== h.keyword) addSuggestion(h);
    }
    if (!isFinal) return;

    // Alternative readings of the final sentence: only when the primary text hit nothing.
    if (utteranceHits === 0 && Array.isArray(m.alternatives)) {
      for (const alt of m.alternatives) {
        const altText = String(alt == null ? '' : alt).trim();
        if (!altText) continue;
        const altHits = runMatcher(altText);
        if (!altHits.length) continue;
        utteranceHits += altHits.length;
        for (const h of altHits) {
          fire(h.trigger, fireSource(`${source} (Alt.)`, h));
          if (h.fuzzy && h.spoken && h.spoken !== h.keyword) addSuggestion(h);
        }
        renderTranscript(altText, true, altHits.map((h) => h.spoken || h.keyword));
        break;
      }
    }
    if (typeof matcher.endUtterance === 'function') matcher.endUtterance();
    const hitsInUtterance = utteranceHits;
    utteranceHits = 0;
    recordLatency(m);
    if (selfCheck) finishSelfCheck(str, hitsInUtterance);
    if (hitsInUtterance === 0) {
      const missId = addMiss(str);
      if (smart && smart.status.available && smart.shouldClassify(str, 0, true)) classifySmart(str, m.lang || effectiveLang(), missId);
    }
  }

  async function classifySmart(text, lang, missId) {
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
    if (missId != null) removeMiss(missId); // the sentence was understood after all
  }

  // ---------- learning card (fuzzy suggestions + misses) ----------
  const learnEl = $('#recog-learn');
  const suggestEl = $('#fuzzy-suggest');
  const missesEl = $('#misses');
  const normalize = (t) => (LiveFXMatcher.normalize ? LiveFXMatcher.normalize(t) : String(t || '').toLowerCase().trim());

  function addSuggestion(h) {
    const trig = h.trigger;
    if (!trig || !trig.id) return;
    const spoken = String(h.spoken).trim();
    if (!spoken || suggestions.some((x) => x.trigger.id === trig.id && x.spoken === spoken)) return;
    if ((trig.keywords || []).some((k) => normalize(k) === normalize(spoken))) return;
    suggestions.push({ trigger: trig, spoken, keyword: h.keyword });
    suggestions = suggestions.slice(-SUGGEST_MAX);
    renderLearn();
  }

  /** Remembers a final sentence without any hit; returns its id (or null when skipped). */
  function addMiss(text) {
    const raw = String(text || '').trim();
    const norm = normalize(raw);
    if (!norm) return null;
    if (norm === lastMissNorm) return null;
    lastMissNorm = norm;
    if (settings.ignored.includes(norm)) return null;
    const id = ++missSeq;
    misses.push({ id, text: raw.slice(0, 200), norm, words: norm.split(' ').filter(Boolean) });
    misses = misses.slice(-MISSES_MAX);
    renderLearn();
    return id;
  }

  function removeMiss(id) {
    const before = misses.length;
    misses = misses.filter((x) => x.id !== id);
    if (misses.length !== before) renderLearn();
  }

  function ignoreMiss(id) {
    const miss = misses.find((x) => x.id === id);
    if (!miss) return;
    if (!settings.ignored.includes(miss.norm)) settings.ignored.push(miss.norm);
    settings.ignored = settings.ignored.slice(-IGNORED_CAP);
    lsSet(ASR_KEYS.ignored, JSON.stringify(settings.ignored));
    misses = misses.filter((x) => x.norm !== miss.norm);
    renderLearn();
    log(`🙈 „${miss.text.slice(0, 40)}“ wird ignoriert`);
  }

  function triggerOptions() {
    return triggers.map((t) => `<option value="${esc(t.id)}">${esc(labelOf(t))}</option>`).join('');
  }

  function renderLearn() {
    if (!learnEl || !suggestEl || !missesEl) return;
    suggestEl.innerHTML = suggestions
      .map(
        (sg) =>
          `<button type="button" data-act="learn" data-trigger="${esc(sg.trigger.id)}" data-spoken="${esc(sg.spoken)}" title="Erkannt als „${esc(sg.keyword)}“">📚 „${esc(sg.spoken)}“ als Stichwort für ${esc(labelOf(sg.trigger))} speichern</button>`
      )
      .join('');
    suggestEl.querySelectorAll('[data-act="learn"]').forEach((b) => {
      b.addEventListener('click', () => learnKeyword(b.dataset.trigger, b.dataset.spoken));
    });
    missesEl.innerHTML = '';
    for (const miss of misses) {
      const li = document.createElement('li');
      li.dataset.miss = String(miss.id);
      li.innerHTML =
        `<span class="miss-label" title="Kein Trigger hat auf diesen Satz reagiert">Kein Treffer</span>` +
        `<span class="words">${miss.words.map((w) => `<button type="button" class="chip" data-word="${esc(w)}">${esc(w)}</button>`).join('')}</span>` +
        `<select data-act="assign" title="Auswahl (oder ganzen Satz) als Stichwort speichern"><option value="">→ Trigger zuweisen…</option>${triggerOptions()}</select>` +
        `<button type="button" data-act="ignore" title="Diesen Satz nicht mehr vorschlagen">Ignorieren</button>`;
      li.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => chip.classList.toggle('sel')));
      li.querySelector('[data-act="assign"]').addEventListener('change', (e) => {
        const sel = e.target;
        const id = sel.value;
        if (!id) return;
        const picked = Array.from(li.querySelectorAll('.chip.sel')).map((c) => c.dataset.word);
        let phrase = picked.join(' ');
        if (!phrase) {
          if (miss.words.length > MISS_CHIPS_MAX) {
            log(`⚠️ Satz zu lang – bitte die passenden Wörter anklicken`);
            sel.value = '';
            return;
          }
          phrase = miss.text;
        }
        if (learnKeyword(id, phrase)) removeMiss(miss.id);
        else sel.value = '';
      });
      li.querySelector('[data-act="ignore"]').addEventListener('click', () => ignoreMiss(miss.id));
      missesEl.appendChild(li);
    }
    learnEl.hidden = !suggestions.length && !misses.length;
  }

  /**
   * Adds `phrase` as a keyword of trigger `triggerId` (trimmed, capped at LIMITS.keywordLen), persists
   * and re-renders. Returns true when the keyword was stored.
   */
  function learnKeyword(triggerId, phrase) {
    const t = triggers.find((x) => x.id === triggerId);
    const kw = String(phrase == null ? '' : phrase).trim().slice(0, S.LIMITS.keywordLen).trim();
    if (!t) {
      log(`⚠️ Lernen: Trigger „${String(triggerId).slice(0, 40)}“ nicht gefunden`);
      return false;
    }
    if (!kw) return false;
    const list = Array.isArray(t.keywords) ? t.keywords : [];
    if (list.some((k) => normalize(k) === normalize(kw))) {
      log(`ℹ️ „${kw}“ ist bei ${labelOf(t)} schon eingetragen`);
      suggestions = suggestions.filter((x) => !(x.trigger.id === t.id && x.spoken === kw));
      renderLearn();
      return false;
    }
    if (list.length >= S.LIMITS.keywords) {
      log(`⚠️ ${labelOf(t)}: maximal ${S.LIMITS.keywords} Stichwörter`);
      return false;
    }
    t.keywords = list.concat([kw]);
    commit();
    log(`📚 „${kw}“ → ${labelOf(t)} gelernt`);
    suggestions = suggestions.filter((x) => !(x.trigger.id === t.id && x.spoken === kw));
    misses = misses.filter((x) => x.norm !== normalize(kw));
    renderLearn();
    return true;
  }

  // ---------- diagnostics ----------
  function fmtMs(ms) {
    if (!Number.isFinite(ms)) return '–';
    return ms >= 100 ? `${Math.round(ms)} ms` : `${ms.toFixed(1).replace('.', ',')} ms`;
  }

  /** Latency of a final result: time since the meter last saw voice (only with mic + meter). */
  function recordLatency(m) {
    if (!meter || !Number.isFinite(m.at) || !Number.isFinite(meter.lastVoiceAt) || !meter.lastVoiceAt) return;
    const d = m.at - meter.lastVoiceAt;
    if (d < 0 || d > 10000) return;
    latencies.push(d);
    while (latencies.length > LATENCY_WINDOW) latencies.shift();
    renderLatency();
  }

  function renderLatency() {
    const el = $('#diag-latency');
    if (!el) return;
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
    const rec = avg == null ? '–' : `~${Math.round(avg)} ms nach Sprachende`;
    el.textContent = `Erkennung: ${rec} · Matcher ${fmtMs(lastMatcherMs)}`;
  }

  function renderDiagState() {
    const el = $('#diag-state');
    if (!el) return;
    const state = asr ? asr.state : 'idle';
    const st = asr && asr.stats && typeof asr.stats === 'object' ? asr.stats : null;
    let text = `Zustand: ${state}`;
    if (st) {
      const last = Number.isFinite(st.lastResultAt) && st.lastResultAt > 0 ? `${Math.max(0, Math.round((performance.now() - st.lastResultAt) / 1000))} s` : '–';
      const planned = Number(st.plannedRestarts) || 0;
      const stalls = Number(st.stalls) || 0;
      const restarts = Number(st.restarts) || 0; // total (planned + stalled + error restarts)
      text += ` · letztes Ergebnis vor ${last} · Neustarts ${restarts} (geplant ${planned}, hängend ${stalls})`;
    }
    el.textContent = text;
  }

  /** Language tag the matcher/smart/story code should use right now (auto → last detected, default de-DE). */
  function effectiveLang() {
    if (settings.lang !== 'auto') return settings.lang;
    return detected && typeof detected.lang === 'string' && detected.lang ? detected.lang : AUTO_LANGS[0];
  }

  function familyOf(tag) {
    return String(tag || '').toLowerCase().split(/[-_]/)[0];
  }

  function renderLangPill() {
    const el = $('#pill-lang-value');
    if (!el) return;
    if (settings.lang !== 'auto') el.textContent = settings.lang;
    else el.textContent = detected && detected.family ? `Auto · ${String(detected.family).toUpperCase()}` : 'Auto';
  }

  function renderDiagLang() {
    const el = $('#diag-lang');
    if (!el) return;
    if (settings.lang !== 'auto') {
      el.textContent = `Sprache: ${settings.lang} (fest eingestellt)`;
      return;
    }
    if (!detected) {
      el.textContent = 'Erkannte Sprache: – (automatisch: Deutsch / Türkçe / English)';
      return;
    }
    const fam = familyOf(detected.family || detected.lang);
    const name = LANG_NAMES[fam] || fam.toUpperCase();
    el.textContent = `Erkannte Sprache: ${name} (${detected.lang})${detected.mode ? ` · Modus: ${detected.mode}` : ''}`;
  }

  /** `lang` event of the auto backend: remember, show, follow with matcher + story pack. */
  function onLangDetected(ev) {
    const lang = typeof ev.lang === 'string' && ev.lang ? ev.lang : null;
    if (!lang) return;
    const family = typeof ev.family === 'string' && ev.family ? ev.family : familyOf(lang);
    const prevFamily = detected ? detected.family : null;
    detected = { lang, family, mode: typeof ev.mode === 'string' ? ev.mode : null, reason: typeof ev.reason === 'string' ? ev.reason : null };
    renderLangPill();
    renderDiagLang();
    if (settings.lang !== 'auto') return;
    if (typeof matcher.setLang === 'function') matcher.setLang(lang);
    if (prevFamily !== family) {
      log(`🌐 Sprache erkannt: ${LANG_NAMES[family] || family} (${lang})${detected.mode ? ` · ${detected.mode}` : ''}`);
      if (storyOn) loadStoryPack();
    }
  }

  function onAsrEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    if (ev.type === 'lang') return onLangDetected(ev);
    if (ev.type === 'planned-restart') log('🔁 Erkenner planmäßig neu gestartet');
    else if (ev.type === 'stall') log('⚠️ Erkennung hing – Neustart');
    else if (ev.type === 'restart') log('🔁 Erkenner neu gestartet');
    renderDiagState();
  }

  function onLevel(rms, peak) {
    const level = $('#mic-level');
    const db = $('#mic-db');
    const r = Number(rms) || 0;
    if (level) level.style.setProperty('--level', String(Math.min(1, Math.max(0, r * 4))));
    if (db) db.textContent = r > 0.0001 ? `${Math.round(20 * Math.log10(r))} dB` : '−∞ dB';
    if (selfCheck && meter && meter.isVoiceActive && meter.isVoiceActive()) selfCheck.voiceSeenAt = performance.now();
    void peak;
  }

  function createMeter() {
    const M = window.LiveFXMeter;
    if (!M || typeof M.create !== 'function') return null;
    try {
      return M.create({ fps: 10, threshold: 0.02, onLevel });
    } catch (e) {
      log(`⚠️ Pegelmesser: ${e && e.message ? e.message : e}`);
      return null;
    }
  }

  /** Starts the mic meter (needs a user gesture); failures are logged once. */
  async function startMeter() {
    if (!meter || meterStarted || typeof meter.start !== 'function') return;
    meterStarted = true;
    try {
      const ok = await meter.start();
      if (!ok) {
        log(`⚠️ Mikro-Pegel nicht verfügbar${meter.error ? `: ${meter.error}` : ''}`);
        $('#mic-db').textContent = '–';
      }
    } catch (e) {
      log(`⚠️ Mikro-Pegel: ${e && e.message ? e.message : e}`);
    }
  }

  function stopMeter() {
    if (!meter || !meterStarted) return;
    meterStarted = false;
    try {
      if (typeof meter.stop === 'function') meter.stop();
    } catch (_) {
      /* ignore */
    }
    $('#mic-level').style.setProperty('--level', '0');
    $('#mic-db').textContent = '–';
  }

  // ---------- self-check ----------
  function setSelfCheckStatus(text) {
    $('#selfcheck-status').textContent = text;
  }

  function selfCheckWord() {
    const wow = triggers.find((t) => t.id === 'wow' && t.enabled !== false && (t.keywords || []).length);
    const t = wow || triggers.find((x) => x.enabled !== false && (x.keywords || []).length);
    return t ? String(t.keywords[0]) : null;
  }

  function startSelfCheck() {
    const word = selfCheckWord();
    if (!word) {
      setSelfCheckStatus('❌ kein aktiver Trigger mit Stichwort');
      return;
    }
    cancelSelfCheck();
    selfCheck = { word, startedAt: performance.now(), voiceSeenAt: 0, timer: null };
    selfCheck.timer = setTimeout(() => timeoutSelfCheck(), SELFCHECK_MS);
    setSelfCheckStatus(`Test: sag „${word}“`);
    startMeter();
    if (asr && !asrActive()) {
      asrWanted = true;
      try {
        asr.start();
      } catch (e) {
        log(`⚠️ Selbsttest: ${e && e.message ? e.message : e}`);
      }
    }
  }

  function cancelSelfCheck() {
    if (selfCheck && selfCheck.timer) clearTimeout(selfCheck.timer);
    selfCheck = null;
  }

  function timeoutSelfCheck() {
    if (!selfCheck) return;
    const sc = selfCheck;
    cancelSelfCheck();
    const voice = sc.voiceSeenAt > 0 || (meter && Number.isFinite(meter.lastVoiceAt) && meter.lastVoiceAt >= sc.startedAt);
    setSelfCheckStatus(voice ? '❌ nichts erkannt – Sprache/Toleranz prüfen' : '❌ Mikro liefert kein Signal');
    log(voice ? '🔍 Selbsttest: nichts erkannt' : '🔍 Selbsttest: kein Mikro-Signal');
  }

  /** Called with the next final sentence while a self-check is running. */
  function finishSelfCheck(text, hitsInUtterance) {
    if (!selfCheck) return;
    const sc = selfCheck;
    cancelSelfCheck();
    const wantNorm = normalize(sc.word);
    let found = false;
    if (typeof matcher.explain === 'function') {
      try {
        found = (matcher.explain(text) || []).some((h) => normalize(h.keyword) === wantNorm);
      } catch (_) {
        found = false;
      }
    } else found = hitsInUtterance > 0 || normalize(text).includes(wantNorm);
    const ms = Math.round(performance.now() - sc.startedAt);
    const heard = String(text).trim().slice(0, 60);
    if (found) setSelfCheckStatus(`✅ „${sc.word}“ erkannt (${ms} ms) – alles läuft`);
    else setSelfCheckStatus(`❌ verstanden: „${heard}“ – kein Treffer für „${sc.word}“ (Toleranz erhöhen?)`);
    log(found ? `🔍 Selbsttest ✅ „${sc.word}“` : `🔍 Selbsttest ❌ „${heard}“`);
  }

  $('#btn-selfcheck').addEventListener('click', startSelfCheck);

  // ---------- recognition settings ----------
  function readSettings() {
    const lang = lsGet(ASR_KEYS.lang);
    const tol = lsGet(ASR_KEYS.tolerance);
    const rea = lsGet(ASR_KEYS.reaction);
    const alt = lsGet(ASR_KEYS.alternatives);
    const rst = lsGet(ASR_KEYS.restart);
    const langEl = $('#lang');
    if (lang && Array.from(langEl.options).some((o) => o.value === lang)) settings.lang = lang;
    settings.tolerance = TOLERANCES.includes(tol) ? tol : 'medium';
    settings.reaction = REACTIONS.includes(rea) ? rea : 'fast';
    settings.alternatives = alt == null ? true : alt === '1';
    settings.restart = rst === '1';
    let ignored = [];
    try {
      const parsed = JSON.parse(lsGet(ASR_KEYS.ignored) || '[]');
      if (Array.isArray(parsed)) ignored = parsed.filter((x) => typeof x === 'string').slice(-IGNORED_CAP);
    } catch (_) {
      /* corrupt entry – start fresh */
    }
    settings.ignored = ignored;
  }

  function reflectSettings() {
    $('#lang').value = settings.lang;
    $('#asr-tolerance').value = settings.tolerance;
    $('#asr-reaction').value = settings.reaction;
    $('#asr-alternatives').checked = settings.alternatives;
    $('#asr-restart').checked = settings.restart;
    renderLangPill();
    renderDiagLang();
  }

  /** Reads the stored settings, mirrors them into the card and pushes them to matcher/ASR. */
  function loadAsrSettings() {
    readSettings();
    reflectSettings();
    pushSettings();
  }

  function pushSettings() {
    if (typeof matcher.setTolerance === 'function') matcher.setTolerance(settings.tolerance);
    if (typeof matcher.setLang === 'function') matcher.setLang(settings.lang === 'auto' ? (detected ? detected.lang : null) : settings.lang);
    if (asr) {
      if (typeof asr.setLang === 'function') asr.setLang(asrLangFor(asr.name));
      if (typeof asr.setOptions === 'function') asr.setOptions({ alternatives: settings.alternatives, restartEveryMs: settings.restart ? RESTART_MS : 0, stallMs: STALL_MS });
    }
  }

  /** Applies the card's controls immediately (no reload) and persists them. */
  function applyAsrSettings() {
    const before = { ...settings };
    settings.lang = $('#lang').value || settings.lang;
    settings.tolerance = TOLERANCES.includes($('#asr-tolerance').value) ? $('#asr-tolerance').value : 'medium';
    settings.reaction = REACTIONS.includes($('#asr-reaction').value) ? $('#asr-reaction').value : 'fast';
    settings.alternatives = $('#asr-alternatives').checked;
    settings.restart = $('#asr-restart').checked;
    lsSet(ASR_KEYS.lang, settings.lang);
    lsSet(ASR_KEYS.tolerance, settings.tolerance);
    lsSet(ASR_KEYS.reaction, settings.reaction);
    lsSet(ASR_KEYS.alternatives, settings.alternatives ? '1' : '0');
    lsSet(ASR_KEYS.restart, settings.restart ? '1' : '0');
    if (before.lang !== settings.lang) detected = null;
    renderLangPill();
    renderDiagLang();
    pushSettings();
    // auto ↔ fixed language switches the backend (webspeech ↔ auto) – rebuild the recognizer.
    if (before.lang !== settings.lang && asr && (before.lang === 'auto' || settings.lang === 'auto')) recreateAsr();
    if (before.tolerance !== settings.tolerance) log(`🎯 Dialekt-Toleranz: ${{ off: 'aus', medium: 'mittel', high: 'hoch' }[settings.tolerance]}`);
    if (before.reaction !== settings.reaction) log(settings.reaction === 'safe' ? '🐢 Reaktion: sicher (nur finale Sätze)' : '⚡ Reaktion: schnell');
    if (before.lang !== settings.lang) log(settings.lang === 'auto' ? '🌐 Sprache: automatisch (Deutsch / Türkçe / English)' : `🌐 Sprache: ${settings.lang}`);
  }

  /** Rebuilds the ASR with the current settings; keeps listening when it was active. */
  function recreateAsr() {
    const wanted = asrWanted || asrActive();
    createAsr($('#asr').value);
    if (wanted) {
      asrWanted = true;
      try {
        asr.start();
      } catch (e) {
        log(`⚠️ Erkenner: ${e && e.message ? e.message : e}`);
      }
    }
  }

  for (const id of ['#lang', '#asr-tolerance', '#asr-reaction', '#asr-alternatives', '#asr-restart']) {
    $(id).addEventListener('change', applyAsrSettings);
  }
  $('#pill-lang').addEventListener('click', () => {
    const card = $('#asr-settings');
    if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      $('#lang').focus({ preventScroll: true });
    } catch (_) {
      /* ignore */
    }
  });

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
    if (state === 'idle' || state === 'error' || state === 'unsupported') {
      asrWanted = false;
      stopMeter();
    }
    renderDiagState();
  }

  function createAsr(name) {
    if (asr) {
      try {
        asr.stop();
      } catch (_) {
        /* ignore */
      }
    }
    const backend = pickBackend(name);
    const opts = {
      lang: asrLangFor(backend),
      primaryLang, // 2.2: the language the streamer mostly speaks (phonetic aliases, auto-detect bias)
      bus,
      alternatives: settings.alternatives,
      restartEveryMs: settings.restart ? RESTART_MS : 0,
      stallMs: STALL_MS,
      voiceActivity: () => !!(meter && meterStarted && typeof meter.isVoiceActive === 'function' && meter.isVoiceActive()),
      onEvent: onAsrEvent,
      onText: (text, isFinal, meta) => handleText(text, isFinal, meta),
      onState: (state) => reflectAsrState(state),
      onError: (err) => {
        log(`${err.fatal ? '❌' : '⚠️'} ${err.message || err.code}`);
        if (err.fatal) reflectAsrState('error');
      },
    };
    if (backend === 'auto') opts.langs = AUTO_LANGS.slice();
    asr = LiveFXASR.create(backend, opts);
    if (backend !== name && settings.lang === 'auto' && name === 'webspeech') log('ℹ️ Automatische Sprache: Backend „auto“ fehlt – Browser-Erkennung mit Deutsch');
    reflectAsrState(asr.state === 'unsupported' ? 'idle' : asr.state);
    return asr;
  }

  function hasBackend(n) {
    try {
      return LiveFXASR.backends.some((b) => b.name === n);
    } catch (_) {
      return false;
    }
  }

  /**
   * Backend for the `#asr` choice + language: `auto` language upgrades the browser backend to `auto`
   * (when js/asr.js provides it), falls back to webspeech otherwise; external/whisper stay as chosen.
   */
  function pickBackend(name) {
    let backend = hasBackend(name) ? name : 'webspeech';
    if (settings.lang === 'auto' && (backend === 'webspeech' || backend === 'auto')) backend = hasBackend('auto') ? 'auto' : 'webspeech';
    else if (backend === 'auto' && !hasBackend('auto')) backend = 'webspeech';
    return backend;
  }

  /** Language tag handed to a backend: `auto` for auto/whisper, the first auto language for webspeech. */
  function asrLangFor(backend) {
    if (settings.lang !== 'auto') return settings.lang;
    return backend === 'auto' || backend === 'whisper' || backend === 'external' ? 'auto' : AUTO_LANGS[0];
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
    if (asr.name !== 'external') startMeter();
    asr.start();
  });
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
    handleText(text, true, { source: 'Text', lang: effectiveLang() });
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
  /** Ambient loop names (`LiveFXSounds.loops`, guarded – older sounds.js has none). */
  function loopNames() {
    const l = LiveFXSounds && Array.isArray(LiveFXSounds.loops) ? LiveFXSounds.loops : [];
    return l.filter((n) => typeof n === 'string' && /^[a-z][a-zA-Z0-9]{0,30}$/.test(n));
  }

  function soundOptions(current) {
    const cur = typeof current === 'string' ? current : '';
    const loops = loopNames().map((n) => `loop:${n}`);
    const opts = ['', ...LiveFXSounds.names];
    if (cur && !opts.includes(cur) && !loops.includes(cur)) opts.push(cur);
    const opt = (s) => {
      const label = s === '' ? '– keiner –' : s.startsWith('file:') ? `🎵 ${s.replace(/^file:assets\//, '')}` : s.startsWith('loop:') ? `🌫️ ${s.slice(5)}` : s;
      return `<option value="${esc(s)}"${s === cur ? ' selected' : ''}>${esc(label)}</option>`;
    };
    let html = opts.map(opt).join('');
    if (loops.length) html += `<optgroup label="Atmosphäre (Loop)">${loops.map(opt).join('')}</optgroup>`;
    return html;
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
    renderPacks();
    if (misses.length || suggestions.length) renderLearn();
    refreshTriggerSelects();
    if (save) LiveFXStore.save(triggers);
  }

  // ---------- meme packs ----------
  // 2.2: the pack ↔ trigger-list arithmetic lives in js/packs-store.js (LiveFXPacksStore), shared with the
  // phone page, so both ends load / unload exactly the same way. The fallbacks below keep an older
  // packs-store-less install working.
  const packsApi = window.LiveFXPacks;
  const packsStore = window.LiveFXPacksStore || null;

  /** How many triggers of a pack are currently in the list (by id). */
  function packPresent(packId) {
    if (packsStore) return packsStore.present(triggers, packId);
    const ids = new Set(packsApi.get(packId).map((t) => t.id));
    return triggers.filter((t) => ids.has(t.id)).length;
  }

  function packLoaded(p) {
    if (packsStore) return packsStore.isLoaded(triggers, p.id);
    const present = packPresent(p.id);
    return p.count > 0 && present >= Math.ceil(p.count * 0.8);
  }

  function loadPack(packId) {
    const pack = packsApi.packs[packId];
    if (!pack) return;
    let added;
    let warnings;
    if (packsStore) {
      const r = packsStore.add(triggers, packId);
      added = r.triggers.length - triggers.length;
      warnings = r.warnings;
      if (added) triggers = r.triggers;
    } else {
      const have = new Set(triggers.map((t) => t.id));
      const fresh = packsApi.get(packId).filter((t) => !have.has(t.id));
      const room = Math.max(0, S.LIMITS.triggers - triggers.length);
      const n = S.normalizeTriggers(fresh.slice(0, room));
      warnings = n.warnings.map((w) => `Paket: ${w}`);
      if (fresh.length > room) warnings.unshift(`Maximal ${S.LIMITS.triggers} Trigger – ${fresh.length - room} aus „${pack.label}“ nicht geladen`);
      added = n.triggers.length;
      if (added) triggers = triggers.concat(n.triggers);
    }
    for (const w of warnings) log(`⚠️ ${w}`);
    if (!added) {
      log(`📦 ${pack.label}: bereits geladen`);
      renderPacks();
      return;
    }
    commit();
    log(`📦 ${pack.label}: ${added} Trigger geladen`);
  }

  function unloadPack(packId) {
    const pack = packsApi.packs[packId];
    if (!pack) return;
    const before = triggers.length;
    if (packsStore) triggers = packsStore.remove(triggers, packId).triggers;
    else {
      const prefix = `${packId}-`;
      triggers = triggers.filter((t) => !String(t.id).startsWith(prefix));
    }
    const gone = before - triggers.length;
    if (!gone) {
      renderPacks();
      return;
    }
    commit();
    log(`🗑️ ${pack.label}: ${gone} Trigger entfernt`);
  }

  function togglePack(packId) {
    const p = packsApi && packsApi.packs[packId];
    if (!p) return;
    if (packLoaded({ id: packId, count: p.triggers.length })) unloadPack(packId);
    else loadPack(packId);
  }

  function renderPacks() {
    renderWizardPacks();
    const root = $('#packs');
    if (!root || !packsApi) return;
    root.innerHTML = '';
    for (const p of packsApi.list()) {
      const present = packPresent(p.id);
      const loaded = packLoaded(p);
      const el = document.createElement('div');
      el.className = `pack${loaded ? ' loaded' : ''}`;
      el.dataset.pack = p.id;
      const count = loaded ? `✓ geladen (${present})` : present ? `${present} / ${p.count} Trigger` : `${p.count} Trigger`;
      if (p.story) el.classList.add('story');
      el.innerHTML = `
        <div class="flag${p.story ? ' story' : ''}">${esc(p.flag)}</div>
        <div class="info">
          <div class="title">${esc(p.label)} <span class="count${loaded ? ' loaded' : ''}">${esc(count)}</span></div>
          <div class="desc">${esc(p.description)}</div>
        </div>
        <div class="btns">
          <button type="button" class="small" data-act="load"${loaded ? ' disabled' : ''}>Laden</button>
          <button type="button" class="small danger" data-act="unload"${present ? '' : ' disabled'}>Entfernen</button>
        </div>`;
      el.querySelector('[data-act="load"]').addEventListener('click', () => loadPack(p.id));
      el.querySelector('[data-act="unload"]').addEventListener('click', () => unloadPack(p.id));
      root.appendChild(el);
    }
  }

  // ---------- story mode (1.3) ----------
  // Reading aloud: the story pack of the current language family is loaded, the recognition is switched
  // to tolerance "mittel" and a 2 s gap; the previous values come back when it is turned off (the pack
  // stays). 2.2: the reaction is no longer forced to "sicher" – the live story director handles interim
  // lines itself (only the fast roles move), so keyword effects may stay fast while reading.
  // Persisted: `livefx.story` ('1'/'0') and `livefx.story.prev` (JSON).
  const STORY_KEYS = { on: 'livefx.story', prev: 'livefx.story.prev' };
  const STORY_GAP = 2;
  let storyOn = false;
  let storyPrev = null; // { tolerance, reaction, gap } captured when the mode was switched on

  /** Scene ids: schema first, then the pack table (packs.js loads before schema.js), else nothing. */
  function sceneIds() {
    if (S && Array.isArray(S.SCENES) && S.SCENES.length) return S.SCENES.slice();
    if (packsApi && Array.isArray(packsApi.SCENE_IDS)) return packsApi.SCENE_IDS.slice();
    return [];
  }

  function sceneInfo(id) {
    const info = packsApi && packsApi.SCENE_INFO && Object.prototype.hasOwnProperty.call(packsApi.SCENE_INFO, id) ? packsApi.SCENE_INFO[id] : null;
    return { emoji: (info && info.emoji) || '🎬', label: (info && info.label) || id, loop: info && info.loop ? info.loop : null };
  }

  /** Ad-hoc trigger for the scene pad (not stored): `{id:'scene-<x>', visual:{kind:'scene', scene}, sound: loop|null}`. */
  function sceneTrigger(id) {
    const info = sceneInfo(id);
    const loop = info.loop && loopNames().includes(info.loop) ? `loop:${info.loop}` : null;
    return { id: `scene-${id}`, label: id === 'clear' ? info.label : `Szene: ${info.label}`, keywords: [], enabled: true, cooldown: 0, sound: loop, visual: { kind: 'scene', scene: id, position: 'center' } };
  }

  function renderScenePad() {
    const pad = $('#scene-pad');
    if (!pad) return;
    pad.innerHTML = '';
    for (const id of sceneIds()) {
      const info = sceneInfo(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.scene = id;
      b.title = id === 'clear' ? 'Aktuelle Szene ausblenden und Atmosphäre stoppen' : `Szene „${info.label}“ starten`;
      b.innerHTML = `<span class="emoji">${esc(info.emoji)}</span><span class="lbl">${esc(info.label)}</span>`;
      b.addEventListener('click', () => {
        fire(sceneTrigger(id), 'Szenen-Pad');
        pad.querySelectorAll('button.active').forEach((x) => x.classList.remove('active'));
        if (id !== 'clear') b.classList.add('active');
      });
      pad.appendChild(b);
    }
  }

  function readStoryPrev() {
    try {
      const p = JSON.parse(lsGet(STORY_KEYS.prev) || 'null');
      if (p && typeof p === 'object') return { tolerance: TOLERANCES.includes(p.tolerance) ? p.tolerance : 'medium', reaction: REACTIONS.includes(p.reaction) ? p.reaction : 'fast', gap: Number.isFinite(Number(p.gap)) ? Math.max(0, Number(p.gap)) : 1.2 };
    } catch (_) {
      /* corrupt entry */
    }
    return null;
  }

  function setGap(value) {
    const g = Math.max(0, Number(value) || 0);
    $('#gap').value = String(g);
    matcher.globalMinGap = g;
  }

  function applyStorySettings() {
    $('#asr-tolerance').value = 'medium';
    applyAsrSettings();
    setGap(STORY_GAP);
  }

  /** Loads the story pack for the current language family (idempotent). */
  function loadStoryPack() {
    if (!packsApi || typeof packsApi.storyPackFor !== 'function') return;
    const id = packsApi.storyPackFor(effectiveLang());
    if (packsApi.packs[id]) loadPack(id);
  }

  function setStoryMode(on, { persist = true, restoring = false } = {}) {
    const el = $('#story-mode');
    const pad = $('#scene-pad');
    storyOn = !!on;
    if (el) el.checked = storyOn;
    if (storyOn) {
      if (!restoring) {
        storyPrev = { tolerance: settings.tolerance, reaction: settings.reaction, gap: Number($('#gap').value) || 0 };
        lsSet(STORY_KEYS.prev, JSON.stringify(storyPrev));
      } else if (!storyPrev) storyPrev = readStoryPrev();
      applyStorySettings();
      loadStoryPack();
      renderScenePad();
      if (pad) pad.hidden = false;
      if (!restoring) log('📖 Story-Modus an – lies vor, Szenen kommen von selbst');
      if (!restoring && !liveStory) setLiveStory(true, { persist: false });
    } else {
      if (pad) pad.hidden = true;
      const prev = storyPrev || readStoryPrev();
      if (prev) {
        $('#asr-tolerance').value = prev.tolerance;
        applyAsrSettings();
        setGap(prev.gap);
      }
      storyPrev = null;
      if (!restoring) log('📖 Story-Modus aus – Einstellungen wiederhergestellt (Paket bleibt)');
    }
    if (persist) lsSet(STORY_KEYS.on, storyOn ? '1' : '0');
  }

  $('#story-mode').addEventListener('change', (e) => setStoryMode(e.target.checked));
  $('#lang').addEventListener('change', () => {
    if (storyOn) loadStoryPack();
  });

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
      loops: loopNames(),
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
    else if (msg.type === 'chat' || msg.type === 'gift') onChatEvent(msg);
    else if (msg.type === 'layout') {
      // 2.3: the phone (or the API) changed the story look – mirror it in the selects (no resend)
      const patch = {};
      if (typeof msg.storyStyle === 'string') patch.storyStyle = msg.storyStyle;
      if (typeof msg.bandPosition === 'string') patch.bandPosition = msg.bandPosition;
      if (Object.keys(patch).length) setStoryLook(patch, { send: false });
    }
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
  // ---------- theme ----------
  // Persisted in localStorage `livefx.theme`; the overlay follows the bus message unless `?theme=` pins it,
  // and the server repeats it in the `state` message so a freshly connected OBS source gets the same look.
  const THEME_KEY = 'livefx.theme';
  function applyTheme(name, { send = true } = {}) {
    const themes = (window.LiveFXSchema && window.LiveFXSchema.THEMES) || ['neon', 'pastel', 'minimal', 'kinderbuch'];
    const theme = themes.includes(name) ? name : 'neon';
    if ($('#theme')) $('#theme').value = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
    if (send) bus.send({ type: 'theme', theme });
    return theme;
  }
  let savedTheme = 'neon';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'neon'; } catch (e) { /* ignore */ }
  applyTheme(savedTheme, { send: false });
  if ($('#theme')) $('#theme').addEventListener('change', (e) => { applyTheme(e.target.value); log(`🎨 Theme: ${e.target.value}`); });
  if (savedTheme !== 'neon') setTimeout(() => bus.send({ type: 'theme', theme: savedTheme }), 1500);

  // ---------- performance mode (2.1, docs/PERFORMANCE.md) ----------
  // Same pattern as the theme: persisted in localStorage `livefx.perf`, sent as {type:'perf', perf}; the overlay
  // follows unless `?perf=` pins it, and the server repeats it in the `state` message for late overlays.
  const PERF_KEY = 'livefx.perf';
  const PERF_LABELS = { auto: 'Automatisch', eco: 'Eco', high: 'Hoch' };
  function applyPerf(name, { send = true } = {}) {
    const modes = (window.LiveFXSchema && window.LiveFXSchema.PERF_MODES) || ['auto', 'eco', 'high'];
    const perf = modes.includes(name) ? name : 'auto';
    if ($('#perf')) $('#perf').value = perf;
    try { localStorage.setItem(PERF_KEY, perf); } catch (e) { /* private mode */ }
    if (send) bus.send({ type: 'perf', perf });
    return perf;
  }
  let savedPerf = 'auto';
  try { savedPerf = localStorage.getItem(PERF_KEY) || 'auto'; } catch (e) { /* ignore */ }
  savedPerf = applyPerf(savedPerf, { send: false });
  if ($('#perf')) $('#perf').addEventListener('change', (e) => { const p = applyPerf(e.target.value); log(`⚡ Leistung: ${PERF_LABELS[p] || p}`); });
  if (savedPerf !== 'auto') setTimeout(() => bus.send({ type: 'perf', perf: savedPerf }), 1500);

  // ---------- volumes (2.2): master / sfx / ambient, docs/STORY.md ----------
  // `{type:'volume', volume, bus}` – `bus` omitted or 'master' is the old master message (older overlays keep
  // working). Persisted in localStorage `livefx.volumes` (JSON); the sliders #volume (master), #volume-sfx and
  // #volume-ambient send on input. The server only remembers the master level for late overlays, so the
  // sfx / ambient levels are re-sent on boot.
  const VOLUMES_KEY = 'livefx.volumes';
  const VOLUME_BUSES = (window.LiveFXSchema && window.LiveFXSchema.VOLUME_BUSES) || ['master', 'sfx', 'ambient'];
  const VOLUME_DEFAULTS = (window.LiveFXSchema && window.LiveFXSchema.VOLUME_DEFAULTS) || { master: 0.5, sfx: 0.8, ambient: 0.5 };
  const VOLUME_INPUTS = { master: '#volume', sfx: '#volume-sfx', ambient: '#volume-ambient' };
  const volumes = { ...VOLUME_DEFAULTS };

  function clamp01(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : NaN;
  }

  function readVolumes() {
    try {
      const p = JSON.parse(lsGet(VOLUMES_KEY) || '{}');
      for (const b of VOLUME_BUSES) if (p && Number.isFinite(clamp01(p[b]))) volumes[b] = clamp01(p[b]);
    } catch (_) {
      /* corrupt entry */
    }
  }

  function reflectVolumes() {
    for (const b of VOLUME_BUSES) {
      const el = $(VOLUME_INPUTS[b]);
      if (el && Math.abs(Number(el.value) - volumes[b]) > 0.001) el.value = String(volumes[b]);
    }
  }

  function volumeMessage(b) {
    const msg = { type: 'volume', volume: volumes[b] };
    if (b !== 'master') msg.bus = b;
    return msg;
  }

  /** Sets one bus level, persists, sends `{type:'volume', volume, bus}` (bus omitted for master). */
  function setVolume(b, v, { send = true, persist = true } = {}) {
    const busName = VOLUME_BUSES.includes(b) ? b : 'master';
    const n = clamp01(v);
    if (!Number.isFinite(n)) return volumes[busName];
    volumes[busName] = n;
    reflectVolumes();
    if (persist) lsSet(VOLUMES_KEY, JSON.stringify(volumes));
    if (send) {
      bus.send(volumeMessage(busName));
      enforcePreviewMute(true);
    }
    return n;
  }

  for (const b of VOLUME_BUSES) {
    const el = $(VOLUME_INPUTS[b]);
    if (el) el.addEventListener('input', (e) => setVolume(b, e.target.value));
  }

  // ---------- overlay layout (2.2): story band / zone, docs/STORY.md ----------
  // `{type:'layout', storyLayout, band, zone}` – always the full triple so a late overlay gets a consistent
  // state. Persisted in localStorage `livefx.layout`.
  const LAYOUT_KEY = 'livefx.layout';
  const STORY_LAYOUTS = (window.LiveFXSchema && window.LiveFXSchema.STORY_LAYOUTS) || ['band', 'full', 'frame'];
  const ZONES = (window.LiveFXSchema && window.LiveFXSchema.ZONES) || ['full', 'edges', 'bottom', 'top'];
  const LAYOUT_DEFAULTS = (window.LiveFXSchema && window.LiveFXSchema.LAYOUT_DEFAULTS) || { storyLayout: 'band', band: 22, zone: 'edges' };
  const BAND_MIN = (S.LIMITS && S.LIMITS.bandMin) || 15;
  const BAND_MAX = (S.LIMITS && S.LIMITS.bandMax) || 35;
  const layout = { ...LAYOUT_DEFAULTS };

  function cleanLayout(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const band = Math.round(Number(r.band));
    return {
      storyLayout: STORY_LAYOUTS.includes(r.storyLayout) ? r.storyLayout : layout.storyLayout,
      band: Number.isFinite(band) ? Math.min(BAND_MAX, Math.max(BAND_MIN, band)) : layout.band,
      zone: ZONES.includes(r.zone) ? r.zone : layout.zone,
    };
  }

  function readLayout() {
    try {
      Object.assign(layout, cleanLayout(JSON.parse(lsGet(LAYOUT_KEY) || '{}')));
    } catch (_) {
      /* corrupt entry */
    }
  }

  function reflectLayout() {
    if ($('#story-layout')) $('#story-layout').value = layout.storyLayout;
    if ($('#band-height')) $('#band-height').value = String(layout.band);
    if ($('#effect-zone')) $('#effect-zone').value = layout.zone;
  }

  function setLayout(patch, { send = true, persist = true } = {}) {
    Object.assign(layout, cleanLayout({ ...layout, ...(patch || {}) }));
    reflectLayout();
    if (persist) lsSet(LAYOUT_KEY, JSON.stringify(layout));
    if (send) bus.send({ type: 'layout', ...layout });
    return { ...layout };
  }

  const LAYOUT_LABELS = { band: 'Band', full: 'Vollbild', frame: 'Rahmen' };
  const ZONE_LABELS = { full: 'überall', edges: 'Ränder', bottom: 'unten', top: 'oben' };
  if ($('#story-layout')) $('#story-layout').addEventListener('change', (e) => { setLayout({ storyLayout: e.target.value }); log(`🖼️ Story-Layout: ${LAYOUT_LABELS[layout.storyLayout] || layout.storyLayout}`); });
  if ($('#band-height')) $('#band-height').addEventListener('change', (e) => { setLayout({ band: e.target.value }); log(`🖼️ Band-Höhe: ${layout.band} %`); });
  if ($('#effect-zone')) $('#effect-zone').addEventListener('change', (e) => { setLayout({ zone: e.target.value }); log(`🎯 Effekt-Zone: ${ZONE_LABELS[layout.zone] || layout.zone}`); });

  // ---------- story look (2.3): „Story-Stil“ + „Band-Position (Hochkant)“, docs/STORY.md ----------
  // The two keys ride along with the existing layout triple: `{type:'layout', storyLayout, band, zone, storyStyle,
  // bandPosition}`. Persisted separately (`livefx.layout.look`) so `livefx.layout.get()` stays the 2.2 triple.
  const LOOK_KEY = 'livefx.layout.look';
  const STORY_STYLES = (window.LiveFXSchema && window.LiveFXSchema.STORY_STYLES) || ['emoji', 'sketch', 'mixed'];
  const BAND_POSITIONS = (window.LiveFXSchema && window.LiveFXSchema.BAND_POSITIONS) || ['bottom', 'chat'];
  const LOOK_DEFAULTS = { storyStyle: 'mixed', bandPosition: 'bottom' };
  const look = { ...LOOK_DEFAULTS };

  function cleanLook(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
      storyStyle: STORY_STYLES.includes(r.storyStyle) ? r.storyStyle : look.storyStyle,
      bandPosition: BAND_POSITIONS.includes(r.bandPosition) ? r.bandPosition : look.bandPosition,
    };
  }

  function readLook() {
    try {
      Object.assign(look, cleanLook(JSON.parse(lsGet(LOOK_KEY) || '{}')));
    } catch (_) {
      /* corrupt entry */
    }
  }

  function reflectLook() {
    if ($('#story-style')) $('#story-style').value = look.storyStyle;
    if ($('#band-position')) $('#band-position').value = look.bandPosition;
  }

  function setStoryLook(patch, { send = true, persist = true } = {}) {
    Object.assign(look, cleanLook({ ...look, ...(patch || {}) }));
    reflectLook();
    if (persist) lsSet(LOOK_KEY, JSON.stringify(look));
    if (send) bus.send({ type: 'layout', ...layout, ...look });
    return { ...look };
  }

  const STYLE_LABELS = { mixed: 'Gemischt', sketch: 'Zeichnung', emoji: 'Emoji' };
  const BAND_POS_LABELS = { bottom: 'ganz unten', chat: 'über dem Chat' };
  if ($('#story-style')) $('#story-style').addEventListener('change', (e) => { setStoryLook({ storyStyle: e.target.value }); log(`✏️ Story-Stil: ${STYLE_LABELS[look.storyStyle] || look.storyStyle}`); });
  if ($('#band-position')) $('#band-position').addEventListener('change', (e) => { setStoryLook({ bandPosition: e.target.value }); log(`📐 Band-Position (Hochkant): ${BAND_POS_LABELS[look.bandPosition] || look.bandPosition}`); });

  // ---------- camera view (2.3): camera.html = webcam + overlay in one window, docs/KAMERA.md ----------
  const SKETCH_FILM_QUERY = '?cam=off&storystyle=sketch&story=full&mic=1&record=1';
  function cameraUrl(query = '') {
    const origin = online ? location.origin : 'http://127.0.0.1:8787';
    return `${origin}/camera.html${query}`;
  }

  function initCameraCard() {
    if ($('#camera-url')) $('#camera-url').textContent = cameraUrl();
    if ($('#btn-camera-record')) {
      $('#btn-camera-record').addEventListener('click', () => {
        const w = window.open('camera.html?record=1', '_blank');
        log(w ? '⏺ Kamera-Ansicht im Aufnahme-Modus geöffnet' : '⚠️ Popup blockiert – camera.html?record=1 von Hand öffnen');
      });
    }
    // 2.3 „Zeichenfilm“: no webcam, story style sketch, Live-Mikro on, record mode – the narrated story as a drawn video
    if ($('#btn-camera-sketch')) {
      $('#btn-camera-sketch').addEventListener('click', () => {
        const w = window.open(`camera.html${SKETCH_FILM_QUERY}`, '_blank');
        log(w ? '✏️ Zeichenfilm geöffnet: ⏺ drücken und erzählen' : `⚠️ Popup blockiert – camera.html${SKETCH_FILM_QUERY} von Hand öffnen`);
      });
    }
    if ($('#btn-copy-camera')) {
      $('#btn-copy-camera').addEventListener('click', async () => {
        const b = $('#btn-copy-camera');
        try {
          await navigator.clipboard.writeText(cameraUrl());
          b.textContent = '✅ Kopiert';
          log('📋 Link der Kamera-Ansicht kopiert');
        } catch (_) {
          b.textContent = 'Link markieren – Strg+C';
        }
        setTimeout(() => (b.textContent = '📋 Link kopieren'), 2000);
      });
    }
  }

  // ---------- primary language (2.2) ----------
  // The language the streamer mostly speaks: handed to the ASR (`primaryLang`) and to the matcher
  // (`setPhonetic` – keywords of the other languages are indexed as phonetic respellings, js/phonetic.js).
  const PRIMARY_KEY = 'livefx.asr.primary';
  const PRIMARY_LANGS = ['tr-TR', 'de-DE', 'en-US'];
  let primaryLang = PRIMARY_LANGS.includes(lsGet(PRIMARY_KEY)) ? lsGet(PRIMARY_KEY) : 'de-DE';

  function setPrimaryLang(tag, { persist = true, recreate = true } = {}) {
    const next = PRIMARY_LANGS.includes(tag) ? tag : primaryLang;
    const changed = next !== primaryLang;
    primaryLang = next;
    if ($('#primary-lang')) $('#primary-lang').value = primaryLang;
    if (persist) lsSet(PRIMARY_KEY, primaryLang);
    if (typeof matcher.setPhonetic === 'function') {
      try {
        matcher.setPhonetic(primaryLang);
      } catch (e) {
        log(`⚠️ Phonetik: ${e && e.message ? e.message : e}`);
      }
    }
    if (changed && recreate && asr) recreateAsr();
    if (changed && persist) log(`🗣️ Hauptsprache: ${LANG_NAMES[familyOf(primaryLang)] || primaryLang}`);
    return primaryLang;
  }

  if ($('#primary-lang')) $('#primary-lang').addEventListener('change', (e) => setPrimaryLang(e.target.value));

  // ---------- live story (2.2) ----------
  // Every transcript line (interim + final) goes to the overlay as `{type:'story', text, final, lang}`; the
  // story director there (js/story-director.js) turns it into the scene state. Persisted `livefx.liveStory`.
  const LIVE_STORY_KEY = 'livefx.liveStory';
  let liveStory = lsGet(LIVE_STORY_KEY) === '1';
  let lastStoryLine = '';

  function setLiveStory(on, { persist = true } = {}) {
    liveStory = !!on;
    if ($('#live-story')) $('#live-story').checked = liveStory;
    if (persist) {
      lsSet(LIVE_STORY_KEY, liveStory ? '1' : '0');
      log(liveStory ? '📖 Live-Story an – jede erkannte Zeile baut die Szene im Band' : '📖 Live-Story aus');
    }
  }

  function sendLiveStory(text, isFinal, meta) {
    if (!liveStory) return;
    const line = String(text || '').trim();
    if (!line) return;
    if (!isFinal && line === lastStoryLine) return; // the recognizer repeats unchanged interims
    lastStoryLine = isFinal ? '' : line;
    const fam = familyOf((meta && meta.lang) || effectiveLang());
    const msg = { type: 'story', text: line.slice(0, (S.LIMITS && S.LIMITS.storyText) || 500), final: !!isFinal };
    if (['de', 'tr', 'en'].includes(fam)) msg.lang = fam;
    bus.send(msg);
  }

  if ($('#live-story')) $('#live-story').addEventListener('change', (e) => setLiveStory(e.target.checked));

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

  // ---------- audio (1.5): silent preview, echo warning, Ton-Check ----------
  // The preview iframe is an overlay like the one in OBS: with sound on, every effect would play twice
  // (panel tab + OBS browser source) and OBS' desktop audio would capture the tab on top (echo).
  // Default: `overlay.html?volume=0`; `livefx.previewSound` ('1'/'0' in localStorage) switches it on.
  const PREVIEW_KEY = 'livefx.previewSound';
  const AUDIOCHECK_PREFIX = 'livefx.audiocheck.';
  const AUDIOCHECK_KEYS = ['mic-source', 'browser-audio', 'desktop-audio', 'monitoring', 'preview-off'];
  const HEALTH_POLL_MS = 5000;
  const MIC_TEST_MS = 5000;
  let previewSound = lsGet(PREVIEW_KEY) === '1';
  let overlaysConnected = null; // from /health (the preview iframe counts as one); null = unknown / offline
  let micTest = null; // { startedAt, timer, hadMeter }

  function clampVolume(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  }

  function previewVolume() {
    return previewSound ? clampVolume($('#volume').value) : 0;
  }

  /** Points the preview at `overlay.html?volume=<0|slider>` (only when it differs – avoids reloads). */
  function applyPreviewSrc() {
    const f = $('#preview');
    if (!f) return;
    const src = `overlay.html?volume=${previewVolume()}`;
    if (f.getAttribute('src') !== src) f.setAttribute('src', src);
  }

  /**
   * Keeps the muted preview silent: bus `volume` messages (slider, phone, API) reach the iframe like any
   * overlay, so its renderer volume is pinned back to 0 (same origin). Cheap, runs once a second.
   */
  function enforcePreviewMute(delayed) {
    if (previewSound) return;
    const apply = () => {
      if (previewSound) return;
      try {
        const w = $('#preview').contentWindow;
        const r = w && w.livefx && w.livefx.renderer;
        if (r && r.volume !== 0) r.volume = 0;
      } catch (_) {
        /* cross-origin / not loaded yet */
      }
    };
    apply();
    if (delayed) setTimeout(apply, 400);
  }

  function setPreviewSound(on, { persist = true } = {}) {
    const next = !!on;
    const changed = next !== previewSound;
    previewSound = next;
    const cb = $('#preview-sound');
    if (cb) cb.checked = previewSound;
    if (persist) lsSet(PREVIEW_KEY, previewSound ? '1' : '0');
    applyPreviewSrc();
    enforcePreviewMute(true);
    renderAudioCheck();
    renderEchoWarning();
    if (changed) {
      log(previewSound ? '🔈 Vorschau-Ton an – nur zum Reinhören, vor dem Stream wieder aus' : '🔇 Vorschau-Ton aus');
      pollHealth();
    }
  }

  /** Echo risk: the preview plays sound AND another overlay (OBS) is connected (overlays ≥ 2). */
  function echoRisk() {
    return previewSound && Number.isFinite(overlaysConnected) && overlaysConnected >= 2;
  }

  function renderEchoWarning() {
    const el = $('#echo-warning');
    if (!el) return;
    const show = echoRisk();
    if (show && el.hidden) log('⚠️ Echo-Gefahr: OBS-Overlay verbunden und Vorschau-Ton an');
    el.hidden = !show;
  }

  let healthInFlight = false;
  async function pollHealth() {
    if (!online || healthInFlight) return;
    healthInFlight = true;
    try {
      const r = await fetch('/health', { cache: 'no-store' });
      const d = await r.json();
      overlaysConnected = r.ok && d && Number.isFinite(Number(d.overlays)) ? Number(d.overlays) : null;
    } catch (_) {
      overlaysConnected = null;
    } finally {
      healthInFlight = false;
    }
    renderEchoWarning();
    renderWizardObs();
  }

  // Ton-Check list: `livefx.audiocheck.<key>` = '1'/'0'; `preview-off` mirrors the preview switch.
  function audioCheckGet(key) {
    if (key === 'preview-off') return !previewSound;
    return lsGet(AUDIOCHECK_PREFIX + key) === '1';
  }

  function audioCheckSet(key, on) {
    if (!AUDIOCHECK_KEYS.includes(key) || key === 'preview-off') return;
    lsSet(AUDIOCHECK_PREFIX + key, on ? '1' : '0');
    renderAudioCheck();
  }

  function renderAudioCheck() {
    document.querySelectorAll('#audiocheck input[data-key]').forEach((cb) => {
      const key = cb.dataset.key;
      if (!AUDIOCHECK_KEYS.includes(key)) return;
      cb.checked = audioCheckGet(key);
    });
  }

  function setMicTestStatus(text, cls) {
    const el = $('#mic-test-status');
    if (!el) return;
    el.textContent = text;
    el.className = `help${cls ? ` ${cls}` : ''}`;
  }

  /** Mic test: runs the meter for 5 s and reports whether it saw any level above the voice threshold. */
  async function startMicTest() {
    if (micTest) return;
    if (!meter) {
      setMicTestStatus('❌ kein Pegelmesser (Browser ohne WebAudio?)', 'err');
      setWizMicStatus('❌ kein Pegelmesser (Browser ohne WebAudio?)', 'err');
      return;
    }
    const hadMeter = meterStarted;
    micTest = { startedAt: performance.now(), timer: null, hadMeter };
    setMicTestStatus('⏳ Sprich jetzt … (5 s)');
    await startMeter();
    if (!micTest) return;
    micTest.timer = setTimeout(finishMicTest, MIC_TEST_MS);
  }

  function finishMicTest() {
    if (!micTest) return;
    const mt = micTest;
    micTest = null;
    const seen = Number.isFinite(meter && meter.lastVoiceAt) && meter.lastVoiceAt >= mt.startedAt;
    const level = meter && Number.isFinite(meter.peak) ? meter.peak : 0;
    const ok = seen || level >= 0.02;
    setMicTestStatus(ok ? '✔ Mikro liefert Pegel – in OBS muss sich der Balken deiner Mikro-Quelle genauso bewegen' : '❌ kein Pegel – Mikro prüfen (Berechtigung, richtiges Gerät, stumm?)', ok ? 'ok' : 'err');
    setWizMicStatus(ok ? '✔ Mikro liefert Pegel' : '❌ kein Pegel – Berechtigung / Gerät prüfen', ok ? 'ok' : 'err');
    log(ok ? '🎙️ Mikro-Test: Pegel da' : '🎙️ Mikro-Test: kein Pegel');
    if (!mt.hadMeter && !asrActive()) stopMeter();
  }

  /** Ad-hoc test trigger for OBS: card „TON-TEST“ with the `pop` sound (through the bus, not the muted preview). */
  function audioTestTrigger() {
    const raw = { id: 'audio-test', label: 'TON-TEST', keywords: [], enabled: true, cooldown: 0, sound: 'pop', visual: { kind: 'card', emoji: '🔊', text: 'TON-TEST', position: 'center' } };
    const n = typeof S.normalizeTrigger === 'function' ? S.normalizeTrigger(raw) : null;
    return n && n.trigger ? n.trigger : raw;
  }

  function fireAudioTest() {
    fire(audioTestTrigger(), 'Ton-Check');
    if (previewSound) log('ℹ️ Vorschau-Ton ist an – du hörst den Test auch hier im Panel');
  }

  $('#preview-sound').addEventListener('change', (e) => setPreviewSound(e.target.checked));
  $('#echo-off').addEventListener('click', () => setPreviewSound(false));
  $('#btn-mic-test').addEventListener('click', startMicTest);
  $('#btn-obs-sound').addEventListener('click', fireAudioTest);
  document.querySelectorAll('#audiocheck input[data-key]').forEach((cb) => {
    cb.addEventListener('change', () => audioCheckSet(cb.dataset.key, cb.checked));
  });

  // ---------- viewer triggers (2.0): chat commands, gift tiers, chat feed ----------
  // Settings live on the server (data/chat.json, GET/PUT /api/chat); the panel only mirrors them.
  // Chat + gift events arrive on the panel SSE channel (`{type:'chat'|'gift'}`) and fill the feed.
  const CHAT_FEED_MAX = 20;
  const CHAT_STATUS_POLL_MS = 10000;
  const CHAT_STATE_TEXT = { off: 'aus', connecting: 'verbindet …', connected: 'verbunden', disconnected: 'getrennt – neuer Versuch', error: 'Fehler', ended: 'Stream beendet' };
  let chatSettings = null; // last public settings from the server (apiKey never included)
  let chatStatus = null;
  let chatFeed = []; // last CHAT_FEED_MAX chat / gift events (newest last)

  function triggerOptionsHtml(current, emptyLabel) {
    const cur = typeof current === 'string' ? current : '';
    let html = `<option value="">${esc(emptyLabel || '– Trigger –')}</option>`;
    let found = !cur;
    for (const t of triggers) {
      if (t.id === cur) found = true;
      html += `<option value="${esc(t.id)}"${t.id === cur ? ' selected' : ''}>${esc(labelOf(t))}</option>`;
    }
    if (!found) html += `<option value="${esc(cur)}" selected>${esc(cur)} (fehlt)</option>`;
    return html;
  }

  /** Trigger <select>s outside the trigger table (commands, tiers, combos) follow the trigger list. */
  function refreshTriggerSelects() {
    document.querySelectorAll('select[data-trigger-select]').forEach((sel) => {
      const cur = sel.value;
      sel.innerHTML = triggerOptionsHtml(cur, sel.dataset.empty);
      sel.value = cur;
    });
  }

  function addCommandRow(cmd, triggerId) {
    const tbody = $('#chat-commands');
    if (!tbody) return null;
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="cmd"><input data-f="cmd" value="${esc(cmd || '')}" placeholder="!befehl" maxlength="40" spellcheck="false"></td>` +
      `<td><select data-f="trigger" data-trigger-select data-empty="– Trigger wählen –">${triggerOptionsHtml(triggerId || '', '– Trigger wählen –')}</select></td>` +
      `<td class="acts"><button type="button" class="small danger" data-act="del" title="Befehl entfernen">✕</button></td>`;
    tr.querySelector('[data-act="del"]').addEventListener('click', () => tr.remove());
    tbody.appendChild(tr);
    return tr;
  }

  function renderCommands(commands) {
    const tbody = $('#chat-commands');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (const [cmd, id] of Object.entries(commands || {})) addCommandRow(cmd, id);
  }

  function readCommands() {
    const out = {};
    document.querySelectorAll('#chat-commands tr').forEach((tr) => {
      const cmd = tr.querySelector('[data-f="cmd"]').value.trim();
      const id = tr.querySelector('[data-f="trigger"]').value;
      if (cmd && id) out[cmd] = id;
    });
    return out;
  }

  function renderTiers(tiers) {
    const tbody = $('#gift-tiers');
    if (!tbody) return;
    tbody.innerHTML = '';
    const list = Array.isArray(tiers) && tiers.length ? tiers.slice(0, 3) : [{ min: 1 }, { min: 10 }, { min: 100 }];
    while (list.length < 3) list.push({ min: list.length ? list[list.length - 1].min * 10 : 1, trigger: '' });
    for (const tier of list) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td class="num"><input data-f="min" type="number" min="0" step="1" value="${esc(String(tier.min ?? 0))}"></td>` +
        `<td><select data-f="trigger" data-trigger-select data-empty="– kein Effekt –">${triggerOptionsHtml(tier.trigger || '', '– kein Effekt –')}</select></td>`;
      tbody.appendChild(tr);
    }
  }

  function readTiers() {
    const out = [];
    document.querySelectorAll('#gift-tiers tr').forEach((tr) => {
      const min = Number(tr.querySelector('[data-f="min"]').value);
      const trigger = tr.querySelector('[data-f="trigger"]').value;
      if (Number.isFinite(min) && min >= 0) out.push({ min, trigger });
    });
    return out;
  }

  function reflectChatSettings(st) {
    chatSettings = st;
    if (!st) return;
    $('#chat-twitch-channel').value = st.twitch.channel || '';
    $('#chat-twitch-enabled').checked = !!st.twitch.enabled;
    $('#chat-yt-video').value = st.youtube.videoId || '';
    $('#chat-yt-enabled').checked = !!st.youtube.enabled;
    $('#chat-yt-key').value = '';
    $('#chat-yt-key').placeholder = st.youtube.hasKey ? '•••••••• (gespeichert – nur zum Ändern eintippen)' : 'AIza…';
    $('#chat-yt-haskey').hidden = !st.youtube.hasKey;
    $('#chat-prefix').value = st.prefix || '!';
    $('#chat-cd-user').value = String(Math.round((Number(st.cooldownPerUserMs) || 0) / 1000));
    $('#chat-cd-global').value = String((Number(st.cooldownGlobalMs) || 0) / 1000);
    $('#chat-allowall').checked = !!st.allowAll;
    renderCommands(st.commands);
    renderTiers(st.gifts && st.gifts.tiers);
  }

  function renderChatStatus(st) {
    chatStatus = st || null;
    for (const p of ['twitch', 'youtube']) {
      const state = st ? st[p] : 'off';
      const err = st ? st[`${p}Error`] : null;
      const dot = $(`#dot-${p}`);
      const txt = $(`#chat-status-${p}`);
      if (dot) {
        dot.classList.remove('on', 'warn', 'err');
        if (state === 'connected') dot.classList.add('on');
        else if (state === 'connecting' || state === 'disconnected') dot.classList.add('warn');
        else if (state === 'error') dot.classList.add('err');
      }
      if (txt) txt.textContent = CHAT_STATE_TEXT[state] || state || 'aus';
      const pill = $(`#chat-pill-${p}`);
      if (pill) pill.title = err ? String(err) : state === 'connected' ? 'Verbunden – Befehle aus dem Chat werden ausgelöst' : '';
    }
    const count = $('#chat-count');
    if (count) count.textContent = st ? String(st.messages || 0) : '0';
  }

  function setChatSaveStatus(text, cls) {
    const el = $('#chat-save-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = `help${cls ? ` ${cls}` : ''}`;
  }

  async function chatRequest(method, path, body) {
    const opts = { method, cache: 'no-store', headers: {} };
    if (body !== undefined) {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(path, opts);
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.ok) throw new Error((d && (d.message || d.error)) || `HTTP ${r.status}`);
    return d;
  }

  async function loadChat() {
    if (!online) {
      $('#chat-offline-hint').hidden = false;
      renderTiers(null);
      return null;
    }
    try {
      const d = await chatRequest('GET', '/api/chat');
      reflectChatSettings(d.settings);
      renderChatStatus(d.status);
      chatFeed = (Array.isArray(d.recent) ? d.recent : []).slice(-CHAT_FEED_MAX);
      renderChatFeed();
      return d;
    } catch (e) {
      log(`⚠️ Zuschauer-Trigger: ${e.message}`);
      return null;
    }
  }

  let chatStatusInFlight = false;
  async function refreshChatStatus() {
    if (!online || chatStatusInFlight) return;
    chatStatusInFlight = true;
    try {
      const d = await chatRequest('GET', '/api/chat');
      renderChatStatus(d.status);
      if (d.settings && chatSettings) {
        chatSettings.youtube.hasKey = d.settings.youtube.hasKey;
        $('#chat-yt-haskey').hidden = !d.settings.youtube.hasKey;
      }
    } catch (_) {
      /* server gone – the OBS-Bridge dot shows it */
    } finally {
      chatStatusInFlight = false;
    }
  }

  function readChatForm() {
    const patch = {
      twitch: { channel: $('#chat-twitch-channel').value.trim(), enabled: $('#chat-twitch-enabled').checked },
      youtube: { videoId: $('#chat-yt-video').value.trim(), enabled: $('#chat-yt-enabled').checked },
      prefix: $('#chat-prefix').value.trim() || '!',
      cooldownPerUserMs: Math.max(0, Math.round((Number($('#chat-cd-user').value) || 0) * 1000)),
      cooldownGlobalMs: Math.max(0, Math.round((Number($('#chat-cd-global').value) || 0) * 1000)),
      allowAll: $('#chat-allowall').checked,
      commands: readCommands(),
      gifts: { tiers: readTiers() },
    };
    const key = $('#chat-yt-key').value.trim();
    if (key) patch.youtube.apiKey = key; // only sent when typed; the server keeps the stored one otherwise
    return patch;
  }

  async function saveChat(patch) {
    if (!online) {
      setChatSaveStatus('Server nötig (node server.js)', 'err');
      return null;
    }
    const body = patch && typeof patch === 'object' ? patch : readChatForm();
    setChatSaveStatus('speichert …');
    try {
      const d = await chatRequest('PUT', '/api/chat', body);
      reflectChatSettings(d.settings);
      renderChatStatus(d.status);
      const warn = Array.isArray(d.warnings) ? d.warnings : [];
      for (const w of warn) log(`⚠️ Zuschauer-Trigger: ${w}`);
      setChatSaveStatus(warn.length ? `gespeichert – ${warn.length} Hinweis(e) im Log` : '✔ gespeichert', warn.length ? '' : 'ok');
      const n = Object.keys(d.settings.commands || {}).length;
      log(`💬 Zuschauer-Trigger gespeichert: ${n} Befehl${n === 1 ? '' : 'e'}${d.settings.twitch.enabled ? ` · Twitch #${d.settings.twitch.channel}` : ''}${d.settings.youtube.enabled ? ' · YouTube' : ''}`);
      return d;
    } catch (e) {
      setChatSaveStatus(`Fehler: ${e.message}`, 'err');
      log(`❌ Zuschauer-Trigger: ${e.message}`);
      return null;
    }
  }

  async function testChat(text, user) {
    const t = String(text == null ? $('#chat-test-text').value : text).trim();
    if (!t) return null;
    if (!online) {
      log('⚠️ Test-Nachricht braucht den Server (node server.js)');
      return null;
    }
    try {
      const d = await chatRequest('POST', '/api/chat/test', { platform: 'test', user: String(user == null ? $('#chat-test-user').value : user).trim() || 'Tester', text: t });
      if (d.fired) log(`💬 Test „${t}“ → ${d.trigger} ausgelöst`);
      else if (d.reason) log(`💬 Test „${t}“ → ${d.trigger || d.command} blockiert (${d.reason})`);
      else if (d.command) log(`💬 Test „${t}“ → kein Trigger für ${d.command}`);
      else log(`💬 Test „${t}“ → nur Chat (kein Befehl)`);
      if (text == null) $('#chat-test-text').value = '';
      return d;
    } catch (e) {
      log(`❌ Test-Nachricht: ${e.message}`);
      return null;
    }
  }

  function chatLineHtml(ev) {
    if (ev.type === 'gift') {
      const amount = `${ev.amount}${ev.currency ? ` ${ev.currency}` : ''}${ev.gift ? ` · ${ev.gift}` : ''}`;
      const fx = ev.fired ? `→ ${esc(labelOf(triggers.find((t) => t.id === ev.fired) || { id: ev.fired }))}` : ev.tier == null ? 'keine Stufe' : `blockiert (${esc(ev.reason || '?')})`;
      return `<div class="chat-line gift" data-type="gift"><span class="platform">${esc(ev.platform)}</span><span class="user">🎁 ${esc(ev.user)}</span><span class="text">${esc(amount)}${ev.text ? ` – ${esc(ev.text)}` : ''}</span><span class="fx">${fx}</span></div>`;
    }
    const cls = ev.fired ? ' fired' : ev.blocked ? ' blocked' : '';
    let fx = '';
    if (ev.fired) fx = `→ ${esc(labelOf(triggers.find((t) => t.id === ev.fired) || { id: ev.fired }))}`;
    else if (ev.blocked) fx = esc(String(ev.blocked).startsWith('cooldown') ? 'Cooldown' : String(ev.blocked));
    return `<div class="chat-line${cls}" data-type="chat"${ev.fired ? ` data-fired="${esc(ev.fired)}"` : ''}><span class="platform">${esc(ev.platform)}</span><span class="user">${esc(ev.user)}</span><span class="text">${esc(ev.text)}</span>${fx ? `<span class="fx">${fx}</span>` : ''}</div>`;
  }

  function renderChatFeed() {
    const el = $('#chat-feed');
    if (!el) return;
    if (!chatFeed.length) {
      el.innerHTML = '<div class="help empty">Noch keine Nachrichten.</div>';
      return;
    }
    el.innerHTML = chatFeed.map(chatLineHtml).join('');
    el.scrollTop = el.scrollHeight;
  }

  function onChatEvent(msg) {
    chatFeed.push(msg);
    chatFeed = chatFeed.slice(-CHAT_FEED_MAX);
    renderChatFeed();
    if (chatStatus && msg.type === 'chat') {
      chatStatus.messages = (Number(chatStatus.messages) || 0) + 1;
      $('#chat-count').textContent = String(chatStatus.messages);
    }
    if (msg.type === 'gift') log(`🎁 ${msg.user} (${msg.platform}): ${msg.amount}${msg.currency ? ` ${msg.currency}` : ''}${msg.fired ? ` → ${msg.fired}` : msg.tier == null ? ' – keine Stufe' : ` – ${msg.reason}`}`);
  }

  $('#btn-chat-save').addEventListener('click', () => saveChat());
  $('#btn-chat-cmd-add').addEventListener('click', () => {
    const tr = addCommandRow(`${$('#chat-prefix').value.trim() || '!'}`, '');
    if (tr) tr.querySelector('[data-f="cmd"]').focus();
  });
  $('#btn-chat-test').addEventListener('click', () => testChat());
  $('#chat-test-text').addEventListener('keydown', (e) => e.key === 'Enter' && testChat());

  // ---------- combos (2.0): N fires of one trigger within a window -> an extra trigger ----------
  // Rules `{keywordTriggerId, times, withinMs, fireTriggerId}` in localStorage `livefx.combos`.
  const COMBO_KEY = 'livefx.combos';
  const COMBO_DEFAULT = [{ keywordTriggerId: 'wow', times: 3, withinMs: 10000, fireTriggerId: 'win' }]; // 3× „krass“ in 10 s -> confetti
  const COMBO_MAX = 20;
  let combos = [];
  const comboFires = new Map(); // trigger id -> [ms, ...] (fires via fire(), any source except combos)

  function cleanCombo(r) {
    if (!r || typeof r !== 'object') return null;
    const kw = typeof r.keywordTriggerId === 'string' ? r.keywordTriggerId.trim() : '';
    const fireId = typeof r.fireTriggerId === 'string' ? r.fireTriggerId.trim() : '';
    const times = Math.min(20, Math.max(2, Math.round(Number(r.times) || 0)));
    const withinMs = Math.min(600000, Math.max(500, Math.round(Number(r.withinMs) || 0)));
    return { keywordTriggerId: kw, times, withinMs, fireTriggerId: fireId };
  }

  function readCombos() {
    const raw = lsGet(COMBO_KEY);
    if (raw == null) return COMBO_DEFAULT.map(cleanCombo);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(cleanCombo).filter(Boolean).slice(0, COMBO_MAX);
    } catch (_) {
      /* corrupt entry */
    }
    return [];
  }

  function setCombos(list, { persist = true, render = true } = {}) {
    combos = (Array.isArray(list) ? list : []).map(cleanCombo).filter(Boolean).slice(0, COMBO_MAX);
    if (persist) lsSet(COMBO_KEY, JSON.stringify(combos));
    if (render) renderCombos();
    return combos;
  }

  function readComboRows() {
    const out = [];
    document.querySelectorAll('#combo-rows tr').forEach((tr) => {
      out.push({
        keywordTriggerId: tr.querySelector('[data-f="keyword"]').value,
        times: Number(tr.querySelector('[data-f="times"]').value),
        withinMs: Math.round((Number(tr.querySelector('[data-f="within"]').value) || 0) * 1000),
        fireTriggerId: tr.querySelector('[data-f="fire"]').value,
      });
    });
    return out;
  }

  function renderCombos() {
    const tbody = $('#combo-rows');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (const r of combos) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td><select data-f="keyword" data-trigger-select data-empty="– Trigger –">${triggerOptionsHtml(r.keywordTriggerId, '– Trigger –')}</select></td>` +
        `<td class="num"><input data-f="times" type="number" min="2" max="20" step="1" value="${esc(String(r.times))}"></td>` +
        `<td class="num"><input data-f="within" type="number" min="1" max="600" step="1" value="${esc(String(Math.round(r.withinMs / 1000)))}"></td>` +
        `<td><select data-f="fire" data-trigger-select data-empty="– Effekt –">${triggerOptionsHtml(r.fireTriggerId, '– Effekt –')}</select></td>` +
        `<td class="acts"><button type="button" class="small danger" data-act="del" title="Kombi entfernen">✕</button></td>`;
      tr.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('change', () => setCombos(readComboRows(), { render: false })));
      tr.querySelector('[data-act="del"]').addEventListener('click', () => {
        tr.remove();
        setCombos(readComboRows(), { render: false });
      });
      tbody.appendChild(tr);
    }
  }

  /** Called from fire(): counts the fire and triggers matching combo rules. Combo fires never count. */
  function recordComboFire(trigger, source) {
    if (!trigger || !trigger.id || String(source || '').startsWith('Kombi')) return;
    const now = Date.now();
    const list = (comboFires.get(trigger.id) || []).filter((t) => now - t < 600000);
    list.push(now);
    comboFires.set(trigger.id, list);
    for (const r of combos) {
      if (r.keywordTriggerId !== trigger.id || !r.fireTriggerId) continue;
      const hits = list.filter((t) => now - t <= r.withinMs).length;
      if (hits < r.times) continue;
      comboFires.set(trigger.id, []); // start over so 6 fires make two combos, not four
      const target = triggers.find((t) => t.id === r.fireTriggerId);
      if (!target) {
        log(`⚠️ Kombi: Trigger „${r.fireTriggerId}“ fehlt`);
        continue;
      }
      if (target.enabled === false) continue;
      log(`🔥 Kombi: ${r.times}× ${labelOf(trigger)} in ${Math.round(r.withinMs / 1000)} s → ${labelOf(target)}`);
      fire(target, `Kombi ${r.times}× ${labelOf(trigger)}`);
      break;
    }
  }

  $('#btn-combo-add').addEventListener('click', () => {
    if (combos.length >= COMBO_MAX) return log(`⚠️ Maximal ${COMBO_MAX} Kombis`);
    const first = triggers[0] ? triggers[0].id : '';
    setCombos(combos.concat([{ keywordTriggerId: first, times: 3, withinMs: 10000, fireTriggerId: '' }]));
  });

  // ---------- intensity from voice (2.0) ----------
  // The meter's level/peak at the hit maps to visual.intensity 1..3 (< 0.3 -> 1, < 0.6 -> 2, else 3).
  const INTENSITY_KEY = 'livefx.intensityFromVoice';
  let intensityFromVoice = lsGet(INTENSITY_KEY) === '1';

  function voiceIntensity() {
    if (!intensityFromVoice || !meter) return null;
    const level = Math.max(Number(meter.level) || 0, Number(meter.peak) || 0);
    if (!meterStarted && !(level > 0)) return null; // mic not running and nothing stubbed: leave the trigger alone
    return level < 0.3 ? 1 : level < 0.6 ? 2 : 3;
  }

  function setIntensityFromVoice(on, { persist = true } = {}) {
    intensityFromVoice = !!on;
    const cb = $('#intensity-voice');
    if (cb) cb.checked = intensityFromVoice;
    if (persist) {
      lsSet(INTENSITY_KEY, intensityFromVoice ? '1' : '0');
      log(intensityFromVoice ? '🎚️ Intensität aus Stimme an – lauter sprechen = stärkerer Effekt' : '🎚️ Intensität aus Stimme aus');
    }
  }

  $('#intensity-voice').addEventListener('change', (e) => setIntensityFromVoice(e.target.checked));

  // ---------- start wizard (2.2) ----------
  // Three steps on top of the panel: 1 mic test (shares the Ton-Check meter), 2 OBS: overlay URL + copy,
  // exact size per format, 6-step mini guide, live status from /health (overlays ≥ 2 = the preview iframe
  // plus OBS) and a test effect, 3 packs as tiles with the x / LIMITS.triggers counter and keyword collisions.
  const WIZ_SIZES = { landscape: '1920 × 1080', portrait: '1080 × 1920' };
  const WIZ_FORMAT_KEY = 'livefx.wizard.format';
  let wizFormat = lsGet(WIZ_FORMAT_KEY) === 'portrait' ? 'portrait' : 'landscape';

  function wizardOverlayUrl() {
    const origin = online ? location.origin : 'http://127.0.0.1:8787';
    return `${origin}/overlay.html${wizFormat === 'portrait' ? '?layout=portrait' : ''}`;
  }

  function renderWizardObs() {
    const url = $('#wiz-overlay-url');
    if (!url) return;
    url.value = wizardOverlayUrl();
    if ($('#wiz-format')) $('#wiz-format').value = wizFormat;
    if ($('#wiz-size')) $('#wiz-size').textContent = WIZ_SIZES[wizFormat];
    const connected = Number.isFinite(overlaysConnected) && overlaysConnected >= 2;
    const dot = $('#wiz-obs-dot');
    if (dot) {
      dot.classList.toggle('on', connected);
      dot.classList.toggle('warn', !connected && online);
    }
    if ($('#wiz-obs-state')) $('#wiz-obs-state').textContent = connected ? 'Overlay verbunden ✔' : online ? 'Overlay noch nicht verbunden' : 'Server nötig (node server.js)';
    const step = $('#wiz-obs');
    if (step) step.classList.toggle('done', connected);
    // small QR of the overlay URL as the LAN sees it (OBS on a 2nd PC, streaming apps on the phone) – never in overlay.html
    const lanUrl = lanOverlayUrl();
    const box = $('#wiz-obs-qr-box');
    if (box && SetupLib) {
      SetupLib.drawQr($('#wiz-obs-qr'), lanUrl, { css: 112, label: lanUrl ? `QR-Code: ${lanUrl}` : '' });
      if ($('#wiz-obs-lan-url')) $('#wiz-obs-lan-url').textContent = lanUrl;
      box.hidden = !lanUrl;
    }
  }

  function setWizardFormat(f, { persist = true } = {}) {
    wizFormat = f === 'portrait' ? 'portrait' : 'landscape';
    if (persist) lsSet(WIZ_FORMAT_KEY, wizFormat);
    renderWizardObs();
    return wizFormat;
  }

  async function copyText(text, btn, idleLabel) {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '✅ Kopiert';
      log('📋 Overlay-URL kopiert – in OBS als Browser-Quelle einfügen');
    } catch (_) {
      btn.textContent = 'Markiert – Strg+C';
      const input = $('#wiz-overlay-url');
      if (input) {
        input.focus();
        input.select();
      }
    }
    setTimeout(() => (btn.textContent = idleLabel), 2000);
  }

  /** Test effect for step 2: confetti + card „TEST“ with the `pop` sound (through the bus → OBS, not the muted preview). */
  function wizardTestTrigger() {
    const raw = { id: 'wizard-test', label: 'TEST', keywords: [], enabled: true, cooldown: 0, sound: 'pop', visual: { kind: 'card', emoji: '🎉', text: 'LiveFX läuft!', position: 'center' } };
    const n = typeof S.normalizeTrigger === 'function' ? S.normalizeTrigger(raw) : null;
    return n && n.trigger ? n.trigger : raw;
  }

  function fireWizardTest() {
    fire(wizardTestTrigger(), 'Start-Assistent');
    pollHealth();
  }

  function setWizMicStatus(text, cls) {
    const el = $('#wiz-mic-status');
    if (!el) return;
    el.textContent = text;
    el.className = `help wiz-status${cls ? ` ${cls}` : ''}`;
    const step = $('#wiz-mic');
    if (step) step.classList.toggle('done', cls === 'ok');
  }

  function renderWizardPacks() {
    const root = $('#wiz-pack-tiles');
    if (!root || !packsApi) return;
    const list = packsStore ? packsStore.summary(triggers) : packsApi.list().map((p) => ({ ...p, present: packPresent(p.id), loaded: packLoaded(p) }));
    root.innerHTML = '';
    let loadedCount = 0;
    for (const p of list) {
      if (p.loaded) loadedCount++;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pack-tile${p.loaded ? ' loaded' : p.present ? ' partial' : ''}`;
      b.dataset.pack = p.id;
      b.title = `${p.description || p.label}${p.loaded ? ' – klicken zum Entfernen' : ' – klicken zum Laden'}`;
      b.innerHTML = `<span class="flag">${esc(p.flag)}</span><span class="lbl">${esc(p.label)}</span><span class="meta">${p.loaded ? '✓ geladen' : p.present ? `${p.present}/${p.count}` : `${p.count} Trigger`}</span>`;
      b.addEventListener('click', () => togglePack(p.id));
      root.appendChild(b);
    }
    const limit = packsStore ? packsStore.limit() : S.LIMITS.triggers;
    if ($('#wiz-pack-count')) $('#wiz-pack-count').textContent = `${triggers.length} / ${limit} Trigger · ${loadedCount} / ${list.length} Pakete`;
    const step = $('#wiz-packs');
    if (step) step.classList.toggle('done', loadedCount > 0);
    const coll = $('#wiz-collisions');
    if (coll) {
      let hits = [];
      try {
        hits = packsStore ? packsStore.collisions(triggers) : [];
      } catch (_) {
        hits = [];
      }
      if (hits.length) {
        const shown = hits.slice(0, 5).map((c) => `„${c.keyword}“ (${(c.packs || []).join(' + ')})`).join(', ');
        coll.textContent = `⚠️ ${hits.length} Stichwort${hits.length === 1 ? '' : 'e'} in mehreren Paketen: ${shown}${hits.length > 5 ? ' …' : ''} – beim Sprechen feuern beide.`;
        coll.hidden = false;
      } else coll.hidden = true;
    }
  }

  // „Erweitert“: the cards marked `data-advanced` (API, combos, demo clip, OBS text, log) stay hidden until the
  // streamer opens them; `livefx.panel.advanced` = '1' keeps them open. Default: collapsed.
  const ADVANCED_KEY = 'livefx.panel.advanced';
  let advancedOpen = lsGet(ADVANCED_KEY) === '1';

  function setAdvanced(on, { persist = true } = {}) {
    advancedOpen = !!on;
    document.body.classList.toggle('panel-simple', !advancedOpen);
    const btn = $('#btn-advanced');
    if (btn) {
      btn.setAttribute('aria-expanded', advancedOpen ? 'true' : 'false');
      btn.textContent = advancedOpen ? '⚙️ Erweitert ausblenden' : '⚙️ Erweitert anzeigen';
    }
    if (persist) lsSet(ADVANCED_KEY, advancedOpen ? '1' : '0');
    return advancedOpen;
  }

  // ---------- easy setup: step 0 „📱 Handy verbinden“, header dialog, Handy card, OBS QR, setup card, first run ----------
  // One pairing controller (js/setup-card.js createPairing) drives three views of the same QR: the start assistant's
  // step 0, the „📱 Handy“ card and the header dialog. It polls GET /api/setup every 2 s while a view is on screen and
  // falls back to the 2.2 token link on servers without the route. `?setupTimeout=<ms>` shortens the 25 s until the
  // „anderes Netz?“ hint (tests).
  const SETUP_DONE_KEY = 'livefx.setup.done';
  const FIRST_RUN_KEY = 'livefx.setup.firstrun';
  const WIZ_COLLAPSED_KEY = 'livefx.wizard.collapsed';
  let pairing = null;
  let firstRun = false;
  let firstRunPendingAtLoad = false;
  let wizardCollapsed = lsGet(WIZ_COLLAPSED_KEY) === '1';
  let lastConnectedName = '';

  /** Overlay URL for another device in the WLAN (from /api/setup, else built from the LAN address); '' = none. */
  function lanOverlayUrl(format = wizFormat) {
    const d = pairing && pairing.data;
    const lan = d && d.overlay && d.overlay.lan;
    return (lan && lan[format === 'portrait' ? 'portrait' : 'landscape']) || '';
  }

  function onPairingChange(s) {
    const step = $('#wiz-phone');
    if (step) step.classList.toggle('done', !!s.done);
    const dot = $('#dot-phone');
    if (dot) {
      dot.classList.toggle('on', !!s.done);
      dot.classList.toggle('warn', !s.done && (s.mode === 'setup' || s.mode === 'legacy'));
      dot.classList.toggle('err', s.mode === 'offline' || s.mode === 'error');
    }
    const pill = $('#pill-phone');
    if (pill) pill.title = s.connected ? `Handy verbunden: ${s.connected} – klicken für QR-Code und Geräte` : s.devices ? `${s.devices} Handy gekoppelt – klicken für QR-Code und Geräte` : 'Handy koppeln: QR-Code mit der Handy-Kamera scannen';
    const card = $('#mobile-card');
    if (card) {
      card.classList.toggle('has-pairing', s.mode === 'setup');
      card.classList.toggle('no-pairing', s.mode !== 'setup');
    }
    if (s.connected && s.connected !== lastConnectedName) {
      lastConnectedName = s.connected;
      const step0 = $('#wiz-phone');
      if (step0) step0.classList.remove('focused');
    }
    renderWizardObs();
  }

  /** What the printable card shows: the pairing link the QR shows right now + the overlay URL for the LAN. */
  function setupCardData() {
    const st = pairing ? pairing.state : null;
    const p = pairing && pairing.data ? pairing.data.pairing : null;
    return {
      pairingUrl: (st && st.url) || '',
      code: (st && st.code) || '',
      expiresAt: p ? p.expiresAt : null,
      legacy: !!(p && p.legacy),
      overlayUrl: lanOverlayUrl() || wizardOverlayUrl(),
      version: (config && config.version) || (pairing && pairing.data && pairing.data.version) || '',
      size: 'a6',
    };
  }

  function openSetupCard() {
    if (!SetupLib) return null;
    const w = SetupLib.openCard(setupCardData());
    log(w ? '🖨 Einrichtungskarte geöffnet – drucken oder als Bild speichern' : '⚠️ Popup blockiert – Popups für diese Seite erlauben');
    return w;
  }

  function openPhoneDialog() {
    const d = $('#phone-dialog');
    if (!d) return;
    try {
      if (typeof d.showModal === 'function') {
        if (!d.open) d.showModal();
      } else d.setAttribute('open', '');
    } catch (_) {
      d.setAttribute('open', '');
    }
    if (pairing) pairing.refresh();
  }

  function closePhoneDialog() {
    const d = $('#phone-dialog');
    if (!d) return;
    if (typeof d.close === 'function' && d.open) d.close();
    else d.removeAttribute('open');
  }

  function initSetup() {
    const views = Array.from(document.querySelectorAll('[data-pair-view]'));
    if (!SetupLib) {
      for (const v of views) v.innerHTML = '<p class="help warn">Einrichtungs-Modul fehlt (js/setup-card.js) – Seite neu laden (Strg+F5).</p>';
      return null;
    }
    for (const v of views) v.innerHTML = SetupLib.pairViewHtml({ id: v.dataset.pairView, qr: Number(v.dataset.qr) || 280, compact: v.dataset.compact === '1' });
    const timeoutMs = Number(pageParams.get('setupTimeout')) > 0 ? Number(pageParams.get('setupTimeout')) : SetupLib.DEFAULT_TIMEOUT_MS;
    pairing = SetupLib.createPairing({
      roots: views,
      online,
      timeoutMs,
      log,
      getConfig: () => config,
      onChange: onPairingChange,
      onAction: (act) => {
        if (act === 'card') openSetupCard();
      },
    });
    // the server announces pairings / removals on the bus (SSE `pairing`, panel audience): refresh at once, not in 2 s
    bus.onMessage((m) => {
      if (m && m.type === 'pairing' && pairing) pairing.refresh();
    });
    if ($('#pill-phone')) $('#pill-phone').addEventListener('click', openPhoneDialog);
    if ($('#phone-dialog-close')) $('#phone-dialog-close').addEventListener('click', closePhoneDialog);
    if ($('#phone-dialog')) {
      $('#phone-dialog').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePhoneDialog(); // click on the backdrop
      });
    }
    pairing.start();
    return pairing;
  }

  function setWizardCollapsed(on, { persist = true } = {}) {
    wizardCollapsed = !!on && !firstRun;
    document.body.classList.toggle('wizard-collapsed', wizardCollapsed);
    const btn = $('#btn-wizard-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', wizardCollapsed ? 'false' : 'true');
      btn.textContent = wizardCollapsed ? '▸ Aufklappen' : '▾ Einklappen';
    }
    if (persist) lsSet(WIZ_COLLAPSED_KEY, wizardCollapsed ? '1' : '0');
    if (pairing) pairing.render();
    return wizardCollapsed;
  }

  /**
   * First-run mode (fresh install): the assistant is expanded, step 0 focused, all other cards collapsed behind one bar
   * until „Fertig“ (`livefx.setup.done`). Survives reloads until then (`livefx.setup.firstrun`). `?firstrun=1|0` forces
   * it; automation (navigator.webdriver) never gets it unless forced, so scripted tests see the full panel.
   */
  function setFirstRun(on, { persist = true, focus = false } = {}) {
    firstRun = !!on;
    document.body.classList.toggle('first-run', firstRun);
    if (firstRun) {
      if (persist) lsSet(FIRST_RUN_KEY, '1');
      setWizardCollapsed(false, { persist: false });
      const step = $('#wiz-phone');
      if (step && focus) {
        step.classList.add('focused');
        try {
          step.focus({ preventScroll: true });
        } catch (_) {
          /* ignore */
        }
        if (typeof step.scrollIntoView === 'function' && step.getBoundingClientRect().top > window.innerHeight * 0.6) step.scrollIntoView({ block: 'start' });
      }
    } else {
      const step = $('#wiz-phone');
      if (step) step.classList.remove('focused');
      if (persist) {
        lsSet(SETUP_DONE_KEY, '1');
        lsRemove(FIRST_RUN_KEY);
      }
    }
    if (pairing) pairing.render();
    return firstRun;
  }

  function finishFirstRun() {
    if (!firstRun) return;
    setFirstRun(false);
    log('✅ Einrichtung abgeschlossen – alle Karten sind sichtbar. Handy-QR: „📱 Handy“ oben rechts.');
    const grid = $('#panel-grid');
    if (grid && typeof grid.scrollIntoView === 'function') grid.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function initFirstRun() {
    const force = pageParams.get('firstrun');
    firstRunPendingAtLoad = lsGet(FIRST_RUN_KEY) === '1';
    const on = SetupLib
      ? SetupLib.isFirstRun({
          force: force === '1' || force === '0' ? force : null,
          automated: !!(navigator && navigator.webdriver),
          setupDone: lsGet(SETUP_DONE_KEY) === '1',
          hadLocalState: hadLocalState && !firstRunPendingAtLoad,
          serverFresh: null,
        })
      : false;
    if (on) setFirstRun(true, { focus: true });
    if ($('#btn-setup-done')) $('#btn-setup-done').addEventListener('click', finishFirstRun);
    if ($('#btn-show-panel')) $('#btn-show-panel').addEventListener('click', finishFirstRun);
    return on;
  }

  /**
   * Not a fresh install after all: the server already has a trigger list the streamer saved (e.g. set up in another
   * browser). The server writes its defaults on the very first start, so „fresh“ = untouched defaults from this run.
   */
  async function confirmFirstRun() {
    if (!firstRun || !online || firstRunPendingAtLoad || pageParams.get('firstrun') === '1' || !SetupLib) return firstRun;
    try {
      const [tr, hr] = await Promise.all([fetch('/api/triggers', { cache: 'no-store' }), fetch('/health', { cache: 'no-store' })]);
      const d = await tr.json();
      const h = await hr.json().catch(() => ({}));
      if (!tr.ok || !d) return firstRun;
      const fresh = SetupLib.serverLooksFresh({
        updatedAt: d.updatedAt,
        removed: d.removed,
        triggers: d.triggers,
        defaults: window.LiveFXDefaultTriggers || [],
        uptimeS: h && Number.isFinite(Number(h.uptime)) ? Number(h.uptime) : null,
      });
      if (!fresh) {
        setFirstRun(false, { persist: false });
        lsRemove(FIRST_RUN_KEY);
      }
    } catch (_) {
      /* keep it */
    }
    return firstRun;
  }

  function initWizard() {
    setAdvanced(advancedOpen, { persist: false });
    setWizardCollapsed(wizardCollapsed, { persist: false });
    if ($('#btn-wizard-toggle')) $('#btn-wizard-toggle').addEventListener('click', () => setWizardCollapsed(!wizardCollapsed));
    initSetup();
    initFirstRun();
    if ($('#btn-advanced')) $('#btn-advanced').addEventListener('click', () => setAdvanced(!advancedOpen));
    if ($('#wiz-mic-test')) {
      $('#wiz-mic-test').addEventListener('click', async () => {
        setWizMicStatus('⏳ Sprich jetzt … (5 s)');
        await startMicTest();
      });
    }
    if ($('#wiz-copy-url')) $('#wiz-copy-url').addEventListener('click', () => copyText(wizardOverlayUrl(), $('#wiz-copy-url'), '📋 Kopieren'));
    if ($('#wiz-format')) $('#wiz-format').addEventListener('change', (e) => setWizardFormat(e.target.value));
    if ($('#wiz-test-fx')) $('#wiz-test-fx').addEventListener('click', fireWizardTest);
    renderWizardObs();
    renderWizardPacks();
  }

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
    loadAsrSettings(); // matcher tolerance/lang before the triggers are indexed; the ASR gets them in createAsr
    meter = createMeter();
    renderLatency();
    renderDiagState();
    setInterval(renderDiagState, 1000);
    renderApiCard(null);
    // 2.2: volumes / layout / primary language / live story from localStorage, before the preview loads.
    readVolumes();
    reflectVolumes();
    readLayout();
    reflectLayout();
    readLook();
    reflectLook();
    initCameraCard();
    setPrimaryLang(primaryLang, { persist: false, recreate: false });
    setLiveStory(liveStory, { persist: false });
    initWizard();
    setPreviewSound(previewSound, { persist: false });
    setInterval(() => enforcePreviewMute(false), 1000);
    if (online) {
      pollHealth();
      // Background polling pauses while the tab is hidden (explicit calls still work); a hidden tab
      // cannot show the echo warning anyway, and OBS keeps its own overlay count.
      setInterval(() => !document.hidden && pollHealth(), HEALTH_POLL_MS);
    }
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
    if (firstRun) {
      await confirmFirstRun();
      if (firstRun) log('👋 Willkommen! Erst das Handy koppeln (QR scannen), dann OBS verbinden – „Fertig“ zeigt alle Funktionen.');
    }
    if (lsGet(STORY_KEYS.on) === '1') setStoryMode(true, { persist: false, restoring: true });
    setCombos(readCombos(), { persist: false });
    setIntensityFromVoice(intensityFromVoice, { persist: false });
    await loadChat();
    if (online) setInterval(() => !document.hidden && refreshChatStatus(), CHAT_STATUS_POLL_MS);

    if (online) {
      library = LiveFXAssets.mountLibrary($('#asset-library'), {
        onChange: () => {},
        // GIF search / sticker library „Als Trigger“: open the editor prefilled with the image (GIF: provider
        // hotlink; sticker: memes/… with its emoji as fallback and the sticker's keywords in the panel language).
        onCreateTrigger: (asset, result) => {
          if (triggers.length >= S.LIMITS.triggers) return log(`⚠️ Maximal ${S.LIMITS.triggers} Trigger`);
          const label = String((result && result.title) || asset.name).replace(/\s*#\d+.*$/, '').slice(0, S.LIMITS.label) || 'Meme';
          const visual = { kind: 'image', src: asset.url, position: 'safe' };
          if (typeof asset.emoji === 'string' && asset.emoji) visual.emoji = asset.emoji;
          const keywords = Array.isArray(asset.keywords) ? asset.keywords.filter((k) => typeof k === 'string' && k.trim()).slice(0, 3) : [];
          openEditor({ id: S.newId('t'), label, keywords, enabled: true, cooldown: 5, sound: 'pop', visual }, { isNew: true });
        },
      });
      smart.refreshStatus().then((st) => log(`🤖 ${smartReasonText(st)}`));
    } else {
      $('#asset-library').innerHTML = '<div class="help">Uploads brauchen den Server: <code>node server.js</code></div>';
    }

    createAsr($('#asr').value);
    pushSettings();
    // Late overlays (OBS) get the levels + layout the streamer last used; the server repeats only the master
    // volume / theme / perf in its `state` message.
    setTimeout(() => {
      for (const b of VOLUME_BUSES) if (Math.abs(volumes[b] - VOLUME_DEFAULTS[b]) > 0.001) bus.send(volumeMessage(b));
      if (layout.storyLayout !== LAYOUT_DEFAULTS.storyLayout || layout.band !== LAYOUT_DEFAULTS.band || layout.zone !== LAYOUT_DEFAULTS.zone) bus.send({ type: 'layout', ...layout });
      if (look.storyStyle !== LOOK_DEFAULTS.storyStyle || look.bandPosition !== LOOK_DEFAULTS.bandPosition) bus.send({ type: 'layout', ...layout, ...look });
    }, 1500);
    log('Bereit. Tipp: Ohne Mikro einfach oben Text eintippen.');
  }

  window.livefx = {
    theme: { get: () => ($('#theme') ? $('#theme').value : 'neon'), set: (name) => applyTheme(name) },
    perf: { get: () => ($('#perf') ? $('#perf').value : 'auto'), set: (name) => applyPerf(name) },
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
    learnKeyword,
    setStoryMode,
    get storyMode() {
      return storyOn;
    },
    sceneTrigger,
    get asrSettings() {
      return { ...settings, ignored: settings.ignored.slice() };
    },
    get meter() {
      return meter;
    },
    selfCheck: {
      start: startSelfCheck,
      timeout: timeoutSelfCheck,
      get active() {
        return !!selfCheck;
      },
    },
    previewSound: {
      get: () => previewSound,
      set: (on) => setPreviewSound(on),
    },
    audioCheck: {
      get: audioCheckGet,
      set: audioCheckSet,
      keys: AUDIOCHECK_KEYS.slice(),
      micTest: startMicTest,
      testTrigger: audioTestTrigger,
      fireTest: fireAudioTest,
    },
    get echo() {
      return { overlays: overlaysConnected, risk: echoRisk() };
    },
    pollHealth,
    get detectedLang() {
      return detected ? { ...detected } : null;
    },
    asrEvent: onAsrEvent, // same path as the backend's onEvent (tests feed `lang` events here)
    effectiveLang,
    // 2.0 viewer triggers / combos / voice intensity
    chat: {
      load: loadChat,
      save: saveChat,
      test: testChat,
      get settings() {
        return chatSettings ? JSON.parse(JSON.stringify(chatSettings)) : null;
      },
      get status() {
        return chatStatus ? { ...chatStatus } : null;
      },
      get feed() {
        return chatFeed.slice();
      },
    },
    combos: {
      get rules() {
        return combos.map((r) => ({ ...r }));
      },
      set: (rules) => setCombos(rules),
      record: recordComboFire,
    },
    get intensityFromVoice() {
      return intensityFromVoice;
    },
    set intensityFromVoice(on) {
      setIntensityFromVoice(on);
    },
    voiceIntensity,
    // 2.2: wizard, advanced toggle, volumes (busses), overlay layout, primary language, live story, packs
    wizard: {
      get format() {
        return wizFormat;
      },
      setFormat: setWizardFormat,
      overlayUrl: wizardOverlayUrl,
      testTrigger: wizardTestTrigger,
      fireTest: fireWizardTest,
      render: () => {
        renderWizardObs();
        renderWizardPacks();
      },
    },
    advanced: {
      get: () => advancedOpen,
      set: (on) => setAdvanced(on),
    },
    // easy setup: pairing controller (QR views), first-run mode, printable card, collapsible assistant
    setup: {
      get pairing() {
        return pairing;
      },
      get firstRun() {
        return firstRun;
      },
      setFirstRun: (on) => setFirstRun(on),
      finish: finishFirstRun,
      openCard: openSetupCard,
      cardData: setupCardData,
      lanOverlayUrl,
      openDialog: openPhoneDialog,
      closeDialog: closePhoneDialog,
      get wizardCollapsed() {
        return wizardCollapsed;
      },
      setWizardCollapsed: (on) => setWizardCollapsed(on),
    },
    volumes: {
      get: () => ({ ...volumes }),
      set: (b, v) => setVolume(b, v),
      defaults: { ...VOLUME_DEFAULTS },
    },
    layout: {
      get: () => ({ ...layout }),
      set: (patch) => setLayout(patch),
    },
    // 2.3: Story-Stil + Band-Position (Hochkant) – sent with the layout triple
    storyLook: {
      get: () => ({ ...look }),
      set: (patch) => setStoryLook(patch),
    },
    cameraUrl,
    get primaryLang() {
      return primaryLang;
    },
    set primaryLang(tag) {
      setPrimaryLang(tag);
    },
    liveStory: {
      get: () => liveStory,
      set: (on) => setLiveStory(on),
    },
    packs: {
      load: loadPack,
      unload: unloadPack,
      toggle: togglePack,
      present: packPresent,
    },
    ready: boot(),
  };
})();
