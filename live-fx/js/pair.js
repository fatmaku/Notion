// LiveFX – pairing page (pair.html, served as `/p`): the page behind the QR code `/p#<secret>`.
// UMD: `window.LiveFXPair` (+ `window.livefxPair` = the running page) / `module.exports` (pure helpers for tests).
//
//   1. The secret comes in the URL fragment (never sent to the server in a request line, never logged). It is removed
//      from the address bar at once and POSTed to /api/pair → paired-device cookie `livefx_dev` (server/pairing.js).
//   2. Big friendly states: „Verbinde …“ → „✔ Verbunden!“ (+ „Weiter zur Fernbedienung“, automatic after a short
//      countdown) or „✖ Code abgelaufen / schon benutzt / falsch“ with what to do next („neuen QR im Panel anzeigen“).
//   3. Fallback without a camera: the 6-digit code from the panel, typed into one big numeric field (auto-submit).
//   4. „📲 Zum Startbildschirm hinzufügen“: the platform's steps (iOS share sheet, Android menu or the install prompt).
//      An iPhone home-screen app has its own cookie jar – it opens this page once more, the 6-digit code pairs it.
//   5. No secret: GET /api/devices tells whether this browser is already paired (→ „Schon gekoppelt“) or is the PC.
//   `?next=camera|panel` picks the page after pairing (default: the phone remote /mobile.html). DE / TR / EN.
//   localStorage `livefx.mobile.justPaired` = time of a fresh pairing (mobile.html opens its setup assistant).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.LiveFXPair = api;
    if (typeof document !== 'undefined' && document.getElementById('pair')) root.livefxPair = api.init(root);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NEXT_PAGES = { mobile: '/mobile.html', camera: '/camera.html', panel: '/' };
  const SECRET_RE = /^[A-Za-z0-9_-]{16,128}$/;
  const COUNTDOWN_S = 4;
  const JUST_PAIRED_KEY = 'livefx.mobile.justPaired';
  const LANG_KEY = 'livefx.pair.lang';

  const T = {
    de: {
      startTitle: 'Handy koppeln',
      startLead: 'Scanne den QR-Code im LiveFX-Panel am PC – oder tippe unten den 6-stelligen Code ein.',
      busyTitle: 'Verbinde …',
      busyLead: 'Einen Moment – dein Handy meldet sich bei LiveFX auf dem PC an.',
      okTitle: 'Verbunden!',
      okAgain: 'Wieder verbunden!',
      okLead: 'Dein Handy ist jetzt die Fernbedienung für LiveFX.',
      okLeadCamera: 'Dein Handy ist gekoppelt – gleich öffnet sich die Kamera-Ansicht.',
      okLeadPanel: 'Dieses Gerät ist gekoppelt – gleich öffnet sich das Panel.',
      device: 'Gerät: {name}',
      go: 'Weiter zur Fernbedienung',
      goCamera: 'Weiter zur Kamera-Ansicht',
      goPanel: 'Weiter zum Panel',
      countdown: 'Geht in {s} s automatisch weiter …',
      countdownPaused: 'Tippe auf „Weiter“, wenn du so weit bist.',
      a2hsTitle: '📲 Tipp: Zum Startbildschirm hinzufügen',
      a2hsIos: 'Tippe in Safari unten auf „Teilen“ (□↑) → „Zum Home-Bildschirm“. Beim ersten Öffnen der App einmal den 6-stelligen Code aus dem Panel eintippen.',
      a2hsAndroid: 'Tippe oben rechts auf ⋮ → „Zum Startbildschirm hinzufügen“ (oder „App installieren“).',
      a2hsPrompt: 'Dann startest du die Fernbedienung wie eine App – ohne QR-Code.',
      a2hsOther: 'Im Browser-Menü „Zum Startbildschirm hinzufügen“ wählen – dann startest du LiveFX wie eine App.',
      install: 'Als App installieren',
      retry: 'Nochmal versuchen',
      alreadyTitle: 'Schon gekoppelt',
      alreadyLead: 'Dieses Handy ist bereits mit LiveFX verbunden.',
      localTitle: 'Du bist am PC',
      localLead: 'Diese Seite ist fürs Handy. Den QR-Code zum Scannen findest du im Panel unter „📱 Handy“.',
      toPanel: 'Zum Panel',
      codeLabel: '6-stelligen Code aus dem Panel eintippen',
      submit: 'Koppeln',
      showForm: 'Trotzdem einen Code eintippen',
      helpTitle: 'Hilfe – so klappt’s',
      h1: 'Am PC: LiveFX starten, im Panel oben auf „📱 Handy“ tippen (oder Start-Assistent Schritt 1).',
      h2: 'QR-Code mit der Handy-Kamera scannen – oder den 6-stelligen Code hier eintippen.',
      h3: 'Handy und PC müssen im selben WLAN sein. Unterwegs/mobile Daten: im Panel „Internet-Link starten“.',
      h4: 'Code abgelaufen? Ein Code gilt 10 Minuten und nur einmal – im Panel einfach einen neuen anzeigen.',
      needSix: 'Bitte alle 6 Ziffern eintippen.',
      busy: 'Koppeln …',
      errors: {
        expired: ['Code abgelaufen', 'Ein Code gilt 10 Minuten. Zeig im Panel am PC einen neuen QR-Code an („📱 Handy“ → „Neuer Code“) und scanne ihn – oder tippe den neuen Code unten ein.'],
        used: ['QR-Code schon benutzt', 'Jeder QR-Code funktioniert nur einmal. Im Panel steht schon ein neuer – scannen oder den Code unten eintippen.'],
        invalid_code: ['Code stimmt nicht', 'Bitte den 6-stelligen Code aus dem Panel nochmal genau eintippen – oder den QR-Code scannen.'],
        locked: ['Zu viele Fehlversuche', 'Aus Sicherheitsgründen gelten die alten Codes nicht mehr. Im Panel einen neuen QR-Code anzeigen.'],
        rate_limited: ['Kurz warten', 'Zu viele Versuche in kurzer Zeit – bitte eine Minute warten und dann nochmal.'],
        cross_origin: ['Falsche Adresse', 'Bitte den QR-Code im Panel scannen oder die Adresse genau so öffnen, wie sie im Panel steht.'],
        network: ['PC nicht erreichbar', 'Ist das Handy im selben WLAN wie der PC? Läuft LiveFX am PC noch? Unterwegs: im Panel „Internet-Link starten“.'],
        other: ['Koppeln hat nicht geklappt', 'Bitte im Panel einen neuen QR-Code anzeigen und nochmal scannen.'],
      },
    },
    tr: {
      startTitle: 'Telefonu eşleştir',
      startLead: 'PC’deki LiveFX panelinde QR kodu tara – ya da aşağıya 6 haneli kodu yaz.',
      busyTitle: 'Bağlanıyor …',
      busyLead: 'Bir saniye – telefonun PC’deki LiveFX’e bağlanıyor.',
      okTitle: 'Bağlandı!',
      okAgain: 'Yeniden bağlandı!',
      okLead: 'Telefonun artık LiveFX’in uzaktan kumandası.',
      okLeadCamera: 'Telefon eşleştirildi – kamera görünümü açılıyor.',
      okLeadPanel: 'Bu cihaz eşleştirildi – panel açılıyor.',
      device: 'Cihaz: {name}',
      go: 'Kumandaya geç',
      goCamera: 'Kamera görünümüne geç',
      goPanel: 'Panele geç',
      countdown: '{s} sn içinde otomatik devam ediyor …',
      countdownPaused: 'Hazır olunca „Devam“a dokun.',
      a2hsTitle: '📲 İpucu: Ana ekrana ekle',
      a2hsIos: 'Safari’de alttaki „Paylaş“ (□↑) → „Ana Ekrana Ekle“. Uygulamayı ilk açtığında paneldeki 6 haneli kodu bir kez yaz.',
      a2hsAndroid: 'Sağ üstte ⋮ → „Ana ekrana ekle“ (ya da „Uygulamayı yükle“).',
      a2hsPrompt: 'Böylece kumandayı uygulama gibi açarsın – QR kod olmadan.',
      a2hsOther: 'Tarayıcı menüsünden „Ana ekrana ekle“yi seç – LiveFX’i uygulama gibi açarsın.',
      install: 'Uygulama olarak yükle',
      retry: 'Tekrar dene',
      alreadyTitle: 'Zaten eşleştirilmiş',
      alreadyLead: 'Bu telefon zaten LiveFX’e bağlı.',
      localTitle: 'PC’desin',
      localLead: 'Bu sayfa telefon için. Taranacak QR kodu panelde „📱 Handy“ altında.',
      toPanel: 'Panele git',
      codeLabel: 'Paneldeki 6 haneli kodu yaz',
      submit: 'Eşleştir',
      showForm: 'Yine de kod gir',
      helpTitle: 'Yardım – nasıl olur',
      h1: 'PC’de: LiveFX’i başlat, panelde üstteki „📱 Handy“ye dokun (ya da başlangıç asistanı 1. adım).',
      h2: 'QR kodu telefon kamerasıyla tara – ya da 6 haneli kodu buraya yaz.',
      h3: 'Telefon ve PC aynı Wi‑Fi’de olmalı. Dışarıda/mobil veri: panelde „Internet-Link starten“.',
      h4: 'Kodun süresi mi doldu? Bir kod 10 dakika ve tek kullanımlık – panelde yenisini göster.',
      needSix: 'Lütfen 6 hanenin hepsini yaz.',
      busy: 'Eşleştiriliyor …',
      errors: {
        expired: ['Kodun süresi doldu', 'Bir kod 10 dakika geçerli. PC’deki panelde yeni bir QR kod göster („📱 Handy“ → „Neuer Code“) ve tara – ya da yeni kodu aşağıya yaz.'],
        used: ['QR kod zaten kullanıldı', 'Her QR kod yalnızca bir kez çalışır. Panelde yenisi var – tara ya da kodu aşağıya yaz.'],
        invalid_code: ['Kod yanlış', 'Paneldeki 6 haneli kodu tekrar dikkatle yaz – ya da QR kodu tara.'],
        locked: ['Çok fazla hatalı deneme', 'Güvenlik için eski kodlar artık geçersiz. Panelde yeni bir QR kod göster.'],
        rate_limited: ['Biraz bekle', 'Kısa sürede çok fazla deneme – bir dakika bekleyip tekrar dene.'],
        cross_origin: ['Yanlış adres', 'Paneldeki QR kodu tara ya da adresi panelde yazdığı gibi aç.'],
        network: ['PC’ye ulaşılamıyor', 'Telefon PC ile aynı Wi‑Fi’de mi? LiveFX PC’de hâlâ çalışıyor mu? Dışarıdaysan: panelde „Internet-Link starten“.'],
        other: ['Eşleştirme olmadı', 'Panelde yeni bir QR kod göster ve tekrar tara.'],
      },
    },
    en: {
      startTitle: 'Pair your phone',
      startLead: 'Scan the QR code in the LiveFX panel on your PC – or type the 6-digit code below.',
      busyTitle: 'Connecting …',
      busyLead: 'One moment – your phone is signing in to LiveFX on the PC.',
      okTitle: 'Connected!',
      okAgain: 'Connected again!',
      okLead: 'Your phone is now the remote for LiveFX.',
      okLeadCamera: 'Your phone is paired – the camera view opens in a moment.',
      okLeadPanel: 'This device is paired – the panel opens in a moment.',
      device: 'Device: {name}',
      go: 'Open the remote',
      goCamera: 'Open the camera view',
      goPanel: 'Open the panel',
      countdown: 'Continuing automatically in {s} s …',
      countdownPaused: 'Tap “Open” when you are ready.',
      a2hsTitle: '📲 Tip: add it to your home screen',
      a2hsIos: 'In Safari tap “Share” (□↑) at the bottom → “Add to Home Screen”. The first time you open the app, type the 6-digit code from the panel once.',
      a2hsAndroid: 'Tap ⋮ at the top right → “Add to Home screen” (or “Install app”).',
      a2hsPrompt: 'Then the remote starts like an app – no QR code needed.',
      a2hsOther: 'Choose “Add to Home screen” in the browser menu – then LiveFX starts like an app.',
      install: 'Install as app',
      retry: 'Try again',
      alreadyTitle: 'Already paired',
      alreadyLead: 'This phone is already connected to LiveFX.',
      localTitle: 'You are on the PC',
      localLead: 'This page is for the phone. The QR code to scan is in the panel under “📱 Handy”.',
      toPanel: 'Open the panel',
      codeLabel: 'Type the 6-digit code from the panel',
      submit: 'Pair',
      showForm: 'Type a code anyway',
      helpTitle: 'Help – how it works',
      h1: 'On the PC: start LiveFX, tap “📱 Handy” at the top of the panel (or step 1 of the start assistant).',
      h2: 'Scan the QR code with the phone camera – or type the 6-digit code here.',
      h3: 'Phone and PC must be on the same Wi‑Fi. Away from home / mobile data: “Internet-Link starten” in the panel.',
      h4: 'Code expired? A code is valid for 10 minutes and once only – just show a new one in the panel.',
      needSix: 'Please type all 6 digits.',
      busy: 'Pairing …',
      errors: {
        expired: ['Code expired', 'A code is valid for 10 minutes. Show a new QR code in the panel on the PC (“📱 Handy” → “Neuer Code”) and scan it – or type the new code below.'],
        used: ['QR code already used', 'Each QR code works only once. The panel already shows a new one – scan it or type the code below.'],
        invalid_code: ['Wrong code', 'Please type the 6-digit code from the panel again carefully – or scan the QR code.'],
        locked: ['Too many wrong attempts', 'For safety the old codes no longer work. Show a new QR code in the panel.'],
        rate_limited: ['Please wait', 'Too many attempts in a short time – wait a minute and try again.'],
        cross_origin: ['Wrong address', 'Scan the QR code in the panel or open the address exactly as shown there.'],
        network: ['PC not reachable', 'Is the phone on the same Wi‑Fi as the PC? Is LiveFX still running? Away from home: “Internet-Link starten” in the panel.'],
        other: ['Pairing did not work', 'Show a new QR code in the panel and scan it again.'],
      },
    },
  };

  // ---------- pure helpers ----------

  /** Digits of a typed code (spaces, dashes and other noise removed), at most 6. */
  function cleanCode(v) {
    return String(v == null ? '' : v)
      .replace(/\D/g, '')
      .slice(0, 6);
  }

  /** '123456' → '123 456' (easier to read and compare with the panel). */
  function formatCode(v) {
    const d = cleanCode(v);
    return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
  }

  /** Pairing secret from a location hash ('#abc…' → 'abc…'); '' when it does not look like one. */
  function parseSecret(hash) {
    const s = String(hash || '').replace(/^#/, '').trim();
    return SECRET_RE.test(s) ? s : '';
  }

  function nextKey(v) {
    return Object.prototype.hasOwnProperty.call(NEXT_PAGES, v) ? v : 'mobile';
  }

  /** Page to open after pairing: the server's answer when it is one of ours, else the `next` default. */
  function redirectTarget(serverRedirect, next) {
    const r = typeof serverRedirect === 'string' ? serverRedirect : '';
    if (Object.values(NEXT_PAGES).includes(r)) return r;
    return NEXT_PAGES[nextKey(next)];
  }

  /** Error key for an answer of POST /api/pair (status + JSON) or a network failure (status 0). */
  function errorKey(status, data) {
    if (!status) return 'network';
    const code = data && typeof data.error === 'string' ? data.error : '';
    if (code === 'invalid' || code === 'invalid_code') return 'invalid_code';
    if (['expired', 'used', 'locked', 'rate_limited', 'cross_origin'].includes(code)) return code;
    if (status === 429) return 'rate_limited';
    if (status === 403) return 'cross_origin';
    return 'other';
  }

  /** 'ios' | 'android' | 'other' for the home-screen hint. */
  function platform(ua, maxTouchPoints) {
    const s = String(ua || '');
    if (/iPhone|iPad|iPod/.test(s) || (/Macintosh/.test(s) && Number(maxTouchPoints) > 1)) return 'ios';
    if (/Android/.test(s)) return 'android';
    return 'other';
  }

  function pickLang(saved, navLang) {
    if (saved && T[saved]) return saved;
    const n = String(navLang || 'de').toLowerCase();
    if (n.startsWith('tr')) return 'tr';
    if (n.startsWith('en')) return 'en';
    return 'de';
  }

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
  }

  // ---------- page ----------

  function init(win) {
    const doc = win.document;
    const $ = (id) => doc.getElementById(id);
    const main = $('pair');
    const ls = {
      get(k) {
        try {
          return win.localStorage.getItem(k);
        } catch (_) {
          return null;
        }
      },
      set(k, v) {
        try {
          win.localStorage.setItem(k, v);
        } catch (_) {
          /* private mode */
        }
      },
    };
    const params = new URLSearchParams(win.location.search);
    const next = nextKey(params.get('next') || '');
    const nav = win.navigator || {};
    const plat = platform(nav.userAgent, nav.maxTouchPoints);
    const standalone = !!((win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true);
    let lang = pickLang(ls.get(LANG_KEY), nav.language);
    let state = 'start';
    let lastError = null;
    let device = null;
    let again = false;
    let target = NEXT_PAGES[next];
    let countdownTimer = null;
    let countdownLeft = 0;
    let installEvent = null;
    let busy = false;
    let fromQr = false;

    const t = () => T[lang];

    function setState(s) {
      state = s;
      main.dataset.state = s;
      for (const el of doc.querySelectorAll('[data-state-view]')) el.hidden = el.dataset.stateView !== s;
      const form = $('pair-form');
      // The code form: always offered except while busy / after success; on the PC and when paired only on request.
      form.hidden = s === 'busy' || s === 'ok' || s === 'local' || s === 'already';
      $('pair-show-form').hidden = !(s === 'local' || s === 'already');
      $('pair-help').hidden = s === 'ok' || s === 'busy';
      if (s !== 'ok') stopCountdown();
    }

    function msg(text, cls) {
      const el = $('pair-msg');
      el.textContent = text || '';
      el.className = `msg${cls ? ` ${cls}` : ''}`;
    }

    function applyLang() {
      const L = t();
      doc.documentElement.lang = lang;
      for (const el of doc.querySelectorAll('[data-t]')) {
        const v = L[el.dataset.t];
        if (typeof v === 'string') el.textContent = v;
      }
      for (const b of doc.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
      doc.title = `LiveFX – ${L.startTitle}`;
      renderOk();
      renderError();
      renderAlready();
      renderCountdown();
    }

    function goLabel() {
      return next === 'camera' ? t().goCamera : next === 'panel' ? t().goPanel : t().go;
    }

    function renderOk() {
      const L = t();
      $('pair-ok-title').textContent = again ? L.okAgain : L.okTitle;
      const lead = doc.querySelector('[data-state-view="ok"] [data-t="okLead"]');
      if (lead) lead.textContent = next === 'camera' ? L.okLeadCamera : next === 'panel' ? L.okLeadPanel : L.okLead;
      const dev = $('pair-device');
      dev.hidden = !(device && device.name);
      if (device && device.name) dev.textContent = fill(L.device, { name: device.name });
      const go = $('pair-go');
      go.href = target;
      go.querySelector('[data-t="go"]').textContent = goLabel();
      renderA2hs();
    }

    function renderA2hs() {
      const L = t();
      const box = $('pair-a2hs');
      const show = next === 'mobile' && !standalone;
      box.hidden = !show;
      if (!show) return;
      $('pair-install').hidden = !installEvent;
      $('pair-a2hs-text').textContent = installEvent ? L.a2hsPrompt : plat === 'ios' ? L.a2hsIos : plat === 'android' ? L.a2hsAndroid : L.a2hsOther;
    }

    function renderError() {
      if (!lastError) return;
      const [title, text] = t().errors[lastError] || t().errors.other;
      $('pair-err-title').textContent = title;
      $('pair-err-text').textContent = text;
      $('pair-retry').hidden = !(lastError === 'network' || lastError === 'rate_limited');
    }

    function renderAlready() {
      const el = $('pair-already-device');
      el.hidden = !(device && device.name);
      if (device && device.name) el.textContent = fill(t().device, { name: device.name });
      const go = $('pair-already-go');
      go.href = NEXT_PAGES[next];
      go.querySelector('[data-t="go"]').textContent = goLabel();
    }

    // ---------- countdown → redirect ----------
    function renderCountdown() {
      const el = $('pair-countdown');
      if (state !== 'ok') {
        el.textContent = '';
        return;
      }
      el.textContent = countdownTimer ? fill(t().countdown, { s: countdownLeft }) : t().countdownPaused;
    }

    function stopCountdown() {
      if (countdownTimer) win.clearInterval(countdownTimer);
      countdownTimer = null;
      renderCountdown();
    }

    function startCountdown(seconds) {
      stopCountdown();
      countdownLeft = seconds;
      countdownTimer = win.setInterval(() => {
        countdownLeft--;
        if (countdownLeft <= 0) {
          stopCountdown();
          go();
          return;
        }
        renderCountdown();
      }, 1000);
      renderCountdown();
    }

    function go() {
      win.location.replace(target);
    }

    // ---------- pairing ----------
    async function pair(body) {
      if (busy) return null;
      busy = true;
      lastError = null;
      setState('busy');
      msg(t().busy, 'busy');
      $('pair-submit').disabled = true;
      let status = 0;
      let data = null;
      try {
        const r = await win.fetch('/api/pair', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, next }),
        });
        status = r.status;
        data = await r.json().catch(() => null);
      } catch (_) {
        status = 0;
      }
      busy = false;
      $('pair-submit').disabled = false;
      if (status >= 200 && status < 300 && data && data.ok) {
        device = data.device || null;
        again = !!data.again;
        target = redirectTarget(data.redirect, next);
        ls.set(JUST_PAIRED_KEY, String(Date.now()));
        msg('');
        setState('ok');
        renderOk();
        // A home-screen app or a camera/panel target: straight on. On the phone: time to read the home-screen tip.
        startCountdown(standalone || next !== 'mobile' ? 1 : COUNTDOWN_S);
        try {
          $('pair-go').focus({ preventScroll: true });
        } catch (_) {
          /* old browser */
        }
        return { ok: true, data };
      }
      lastError = errorKey(status, data);
      setState('error');
      renderError();
      msg('');
      const input = $('pair-code');
      if (body.code) {
        input.setAttribute('aria-invalid', 'true');
        if (lastError === 'invalid_code') input.select();
      }
      // From a QR scan the camera is the better way again; after typing, keep the keyboard up.
      if (!fromQr) {
        try {
          input.focus({ preventScroll: true });
        } catch (_) {
          /* ignore */
        }
      }
      return { ok: false, error: lastError, status };
    }

    function pairSecret(secret) {
      fromQr = true;
      try {
        win.history.replaceState(null, '', win.location.pathname + win.location.search); // secret out of the address bar
      } catch (_) {
        /* old browser */
      }
      return pair({ secret });
    }

    function submitCode() {
      const code = cleanCode($('pair-code').value);
      if (code.length !== 6) {
        msg(t().needSix, 'err');
        $('pair-code').setAttribute('aria-invalid', 'true');
        return Promise.resolve(null);
      }
      fromQr = false;
      return pair({ code });
    }

    /** No secret in the URL: already paired here? Or is this the PC itself? */
    async function probe() {
      try {
        const r = await win.fetch('/api/devices', { credentials: 'same-origin', cache: 'no-store' });
        if (r.status !== 200) return 'start';
        const d = await r.json().catch(() => null);
        const me = d && Array.isArray(d.devices) ? d.devices.find((x) => x && x.current) : null;
        if (me) {
          device = me;
          renderAlready();
          return 'already';
        }
        return 'local';
      } catch (_) {
        return 'start';
      }
    }

    // ---------- events ----------
    $('pair-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitCode();
    });
    $('pair-code').addEventListener('input', () => {
      const el = $('pair-code');
      const formatted = formatCode(el.value);
      if (formatted !== el.value) el.value = formatted;
      el.removeAttribute('aria-invalid');
      if (cleanCode(formatted).length === 6 && !busy) submitCode();
      else if (state === 'start' || state === 'error') msg('');
    });
    $('pair-show-form').addEventListener('click', () => {
      $('pair-form').hidden = false;
      $('pair-show-form').hidden = true;
      try {
        $('pair-code').focus();
      } catch (_) {
        /* ignore */
      }
    });
    $('pair-retry').addEventListener('click', () => {
      setState('start');
      try {
        $('pair-code').focus();
      } catch (_) {
        /* ignore */
      }
    });
    $('pair-go').addEventListener('click', (e) => {
      e.preventDefault();
      stopCountdown();
      go();
    });
    // Reading the home-screen tip pauses the automatic redirect.
    $('pair-a2hs').addEventListener('click', () => stopCountdown());
    $('pair-install').addEventListener('click', async () => {
      stopCountdown();
      const ev = installEvent;
      if (!ev) return;
      installEvent = null;
      try {
        await ev.prompt();
      } catch (_) {
        /* dismissed */
      }
      renderA2hs();
    });
    win.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installEvent = e;
      renderA2hs();
    });
    for (const b of doc.querySelectorAll('[data-lang]')) {
      b.addEventListener('click', () => {
        lang = pickLang(b.dataset.lang);
        ls.set(LANG_KEY, lang);
        applyLang();
      });
    }
    // Scanning the QR again while this page is open changes only the fragment (no reload).
    win.addEventListener('hashchange', () => {
      const s = parseSecret(win.location.hash);
      if (s) pairSecret(s);
    });

    // ---------- start ----------
    applyLang();
    const secret = parseSecret(win.location.hash);
    let ready;
    if (secret) ready = pairSecret(secret);
    else {
      if (win.location.hash) {
        try {
          win.history.replaceState(null, '', win.location.pathname + win.location.search);
        } catch (_) {
          /* ignore */
        }
      }
      setState('busy');
      $('pair-help').hidden = true;
      ready = probe().then((s) => {
        setState(s);
        if (s === 'start') {
          try {
            $('pair-code').focus({ preventScroll: true });
          } catch (_) {
            /* ignore */
          }
        }
        return s;
      });
    }

    return {
      ready,
      pair,
      submitCode,
      go,
      stopCountdown,
      get state() {
        return state;
      },
      get error() {
        return lastError;
      },
      get device() {
        return device;
      },
      get target() {
        return target;
      },
      get lang() {
        return lang;
      },
      get platform() {
        return plat;
      },
      setLang(l) {
        lang = pickLang(l);
        applyLang();
      },
    };
  }

  return { T, NEXT_PAGES, JUST_PAIRED_KEY, cleanCode, formatCode, parseSecret, redirectTarget, errorKey, platform, pickLang, nextKey, init };
});
