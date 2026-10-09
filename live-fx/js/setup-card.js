// LiveFX – easy setup: phone pairing by QR code and the printable setup card. UMD: `window.LiveFXSetup` /
// `module.exports`. Used by the panel (start assistant step 0 „📱 Handy verbinden“, the „📱 Handy“ card, the header
// dialog, the OBS step's overlay QR) and by the camera view („📱 Fernbedienung“).
//
// Data: GET /api/setup → { lanUrls, bestLanUrl, panelUrl, overlayUrls, tunnel: { state, url }, pairing: { url, code,
// expiresAt }, devices: [{ id, name, lastSeen }], version } – read through normalizeSetup(), which tolerates missing or
// extra fields. Servers without the route (404): fromConfig() builds the 2.2 phone link from GET /api/config
// (`/m?token=…`, marked `legacy` – it carries the token, the UI says so). A QR never shows a loopback address (a phone
// cannot reach 127.0.0.1): then the internet link (Cloudflare quick tunnel, POST /api/tunnel/start) is offered at once.
//
//   pure (Node + browser): normalizeSetup, fromConfig, overlayLinks, tunnelPairingUrl, withOrigin, isLoopbackUrl,
//     cleanUrl, formatCode, parseTime, relTime, countdown, isFirstRun, serverLooksFresh, pairViewHtml, cardHtml, escapeHtml
//   browser: drawQr(canvas, text, opts), createPairing(opts) → controller, openCard(data), cardCanvas(data), cardPng(data)
//
// Pairing controller (createPairing): polls /api/setup every 2 s while one of its views is on screen, shows „✔ Handy
// verbunden: <name>“ as soon as a device id appears that was not there when the view opened, renews the pairing code
// shortly before it expires (POST /api/pairing), shows the „anderes Netz?“ hint after `timeoutMs` (25 s; the panel takes
// `?setupTimeout=` for tests) with ONE button that starts the tunnel and swaps the QR to the tunnel pairing link, and lists
// the paired devices with „entfernen“ (DELETE /api/devices/<id>).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.LiveFXSetup = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  const TUNNEL_STATES = ['idle', 'starting', 'online', 'error', 'stopping'];
  const DEFAULT_TIMEOUT_MS = 25000;
  const POLL_MS = 2000;
  const RENEW_BEFORE_MS = 20000;
  const QR_MARGIN = 4; // quiet zone in modules (ISO 18004 asks for 4)

  // ---------- small helpers ----------
  function QR() {
    if (root && root.LiveFXQR) return root.LiveFXQR;
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      try {
        return require('./qr.js');
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function str(v, max) {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  }

  /** http(s) URL or '' (normalised by URL; at most 400 characters – a QR holds 213 bytes anyway). */
  function cleanUrl(v) {
    if (typeof v !== 'string') return '';
    const s = v.trim();
    if (!s || s.length > 400) return '';
    try {
      const u = new URL(s);
      return /^https?:$/.test(u.protocol) && u.hostname ? u.href : '';
    } catch (_) {
      return '';
    }
  }

  function originOf(url) {
    try {
      return new URL(url).origin;
    } catch (_) {
      return '';
    }
  }

  function isLoopbackHost(host) {
    const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
    return h === 'localhost' || h === '::1' || h === '0.0.0.0' || h === '::' || /^127\./.test(h) || h.endsWith('.localhost');
  }

  function isLoopbackUrl(url) {
    try {
      return isLoopbackHost(new URL(url).hostname);
    } catch (_) {
      return false;
    }
  }

  /** Same path / query / hash on another origin: the pairing link on the tunnel or on another LAN address. */
  function withOrigin(url, origin) {
    try {
      const u = new URL(url);
      const o = new URL(origin);
      return `${o.origin}${u.pathname}${u.search}${u.hash}`;
    } catch (_) {
      return '';
    }
  }

  function withParam(url, key, value) {
    try {
      const u = new URL(url);
      u.searchParams.set(key, value);
      return u.href;
    } catch (_) {
      return '';
    }
  }

  function cleanCode(v) {
    return String(v == null ? '' : v).replace(/[^0-9A-Za-z]/g, '').slice(0, 12);
  }

  /** '482913' → '482 913', 'ABCD1234' → 'ABCD 1234'. */
  function formatCode(code) {
    const c = cleanCode(code);
    if (c.length > 6 && c.length % 4 === 0) return c.replace(/(.{4})(?=.)/g, '$1 ');
    return c.replace(/(.{3})(?=.)/g, '$1 ');
  }

  /** ms timestamp from a number (seconds or ms) or a date string; null when unusable. */
  function parseTime(v) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v < 1e11 ? v * 1000 : v;
    if (typeof v === 'string' && v.trim()) {
      if (/^\d+$/.test(v.trim())) return parseTime(Number(v.trim()));
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  function relTime(ts, now = Date.now()) {
    if (!Number.isFinite(ts)) return '';
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 45) return 'gerade eben';
    const m = Math.round(s / 60);
    if (m < 60) return `vor ${m} min`;
    const h = Math.round(m / 60);
    if (h < 36) return `vor ${h} h`;
    return `vor ${Math.round(h / 24)} Tagen`;
  }

  function countdown(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function clockTime(ts) {
    if (!Number.isFinite(ts)) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- setup data ----------
  /**
   * Overlay links for OBS: { local: { landscape, portrait }, lan: { landscape, portrait } }. Accepts whatever
   * `overlayUrls` holds (object, nested object, array of strings): every http(s) string is sorted by host (loopback →
   * local, else lan) and by `layout=portrait`. A missing portrait link is derived from the landscape one (keeps any
   * key parameter); a missing LAN link is built from `bestLanUrl`.
   */
  function overlayLinks(raw, { bestLanUrl = '', origin = '' } = {}) {
    const found = [];
    (function walk(v, depth) {
      if (v == null || depth > 3) return;
      if (typeof v === 'string') {
        const u = cleanUrl(v);
        if (u) found.push(u);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
      else if (typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], depth + 1);
    })(raw, 0);
    const out = { local: { landscape: '', portrait: '' }, lan: { landscape: '', portrait: '' } };
    for (const u of found) {
      const slot = isLoopbackUrl(u) ? out.local : out.lan;
      const key = /[?&]layout=portrait(&|#|$)/.test(u) ? 'portrait' : 'landscape';
      if (!slot[key]) slot[key] = u;
    }
    for (const slot of [out.local, out.lan]) if (slot.landscape && !slot.portrait) slot.portrait = withParam(slot.landscape, 'layout', 'portrait');
    const lanBase = bestLanUrl && !isLoopbackUrl(bestLanUrl) ? originOf(bestLanUrl) : '';
    if (lanBase && !out.lan.landscape) {
      out.lan.landscape = `${lanBase}/overlay.html`;
      if (!out.lan.portrait) out.lan.portrait = `${lanBase}/overlay.html?layout=portrait`;
    }
    const localBase = origin && isLoopbackUrl(origin) ? originOf(origin) : '';
    if (localBase && !out.local.landscape) {
      out.local.landscape = `${localBase}/overlay.html`;
      out.local.portrait = `${localBase}/overlay.html?layout=portrait`;
    }
    return out;
  }

  function tunnelFrom(t, { legacy = false } = {}) {
    const o = t && typeof t === 'object' ? t : {};
    const state = TUNNEL_STATES.includes(o.state) ? o.state : TUNNEL_STATES.includes(o.status) ? o.status : 'idle';
    return {
      state,
      url: state === 'online' ? cleanUrl(o.url) : '',
      error: str(o.error, 240),
      // 2.2 servers: `phoneUrl` = tunnel URL + /m?token=… (only used in legacy mode – the setup route has pairing links)
      pairingUrl: state === 'online' ? cleanUrl(o.pairingUrl) || (legacy ? cleanUrl(o.phoneUrl) : '') : '',
    };
  }

  /**
   * `pairing` of /api/setup or POST /api/pairing: { url, lanUrl, tunnelUrl, manualUrl, code, expiresAt } – `url` is the
   * tunnel link while the tunnel runs, else the LAN link; `lanUrl: null` = this PC is not reachable in the LAN.
   */
  function pairingFrom(p) {
    if (!p || typeof p !== 'object') return null;
    const url = cleanUrl(p.url);
    const lanUrl = cleanUrl(p.lanUrl);
    const tunnelUrl = cleanUrl(p.tunnelUrl);
    const code = cleanCode(p.code);
    if (!url && !lanUrl && !tunnelUrl && !code) return null;
    return {
      url: url || lanUrl || tunnelUrl,
      lanUrl,
      hasLan: Object.prototype.hasOwnProperty.call(p, 'lanUrl'),
      tunnelUrl,
      manualUrl: cleanUrl(p.manualUrl),
      code,
      expiresAt: parseTime(p.expiresAt),
      legacy: false,
    };
  }

  /** GET /api/setup body → normalised setup (null when unusable). See the header for the shape. */
  function normalizeSetup(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw.setup && typeof raw.setup === 'object' ? raw.setup : raw;
    const lanUrls = [];
    const addLan = (u) => {
      const o = cleanUrl(u) && !isLoopbackUrl(u) ? originOf(u) : '';
      if (o && !lanUrls.includes(o)) lanUrls.push(o);
    };
    addLan(src.bestLanUrl);
    (Array.isArray(src.lanUrls) ? src.lanUrls : []).forEach(addLan);
    const bestLanUrl = lanUrls[0] || '';
    const devices = (Array.isArray(src.devices) ? src.devices : [])
      .filter((d) => d && typeof d === 'object' && (typeof d.id === 'string' || typeof d.id === 'number') && String(d.id))
      .slice(0, 50)
      .map((d) => ({
        id: String(d.id).slice(0, 80),
        name: str(d.name, 60) || 'Handy',
        lastSeen: parseTime(d.lastSeen),
        createdAt: parseTime(d.createdAt),
      }));
    const lan = src.lan && typeof src.lan === 'object' ? { listening: src.lan.listening !== false, reason: str(src.lan.reason, 40) } : { listening: true, reason: '' };
    return {
      source: 'setup',
      version: str(src.version, 40),
      lanUrls,
      bestLanUrl,
      panelUrl: cleanUrl(src.panelUrl),
      overlay: overlayLinks(src.overlayUrls, { bestLanUrl, origin: cleanUrl(src.panelUrl) }),
      tunnel: tunnelFrom(src.tunnel),
      pairing: pairingFrom(src.pairing),
      devices,
      devicesKnown: Array.isArray(src.devices),
      lan,
      firstRun: typeof src.firstRun === 'boolean' ? src.firstRun : null,
    };
  }

  /** Older servers (no /api/setup): the 2.2 phone link `http://<LAN-IP>:<port>/m?token=…` from GET /api/config. */
  function fromConfig(cfg, loc) {
    const l = loc || {};
    const scheme = cfg && cfg.secure ? 'https' : l.protocol === 'https:' ? 'https' : 'http';
    const port = cfg && Number(cfg.port) > 0 ? Number(cfg.port) : Number(l.port) || (scheme === 'https' ? 443 : 80);
    const ips = cfg && Array.isArray(cfg.lanIps) ? cfg.lanIps.filter((ip) => typeof ip === 'string' && /^[0-9a-f.:]+$/i.test(ip)) : [];
    const lanUrls = ips.map((ip) => `${scheme}://${ip.includes(':') ? `[${ip}]` : ip}:${port}`).filter((o) => cleanUrl(o) && !isLoopbackUrl(o));
    const token = cfg && typeof cfg.token === 'string' ? cfg.token : '';
    const best = lanUrls[0] || '';
    const url = best && token ? `${best}/m?token=${encodeURIComponent(token)}` : '';
    const origin = typeof l.origin === 'string' ? l.origin : '';
    return {
      source: 'config',
      version: cfg ? str(cfg.version, 40) : '',
      lanUrls,
      bestLanUrl: best,
      panelUrl: origin ? `${origin}/` : '',
      overlay: overlayLinks(null, { bestLanUrl: best, origin }),
      tunnel: tunnelFrom(null),
      pairing: url ? { url, lanUrl: url, hasLan: true, tunnelUrl: '', manualUrl: '', code: '', expiresAt: null, legacy: true } : null,
      devices: [],
      devicesKnown: false,
      lan: { listening: true, reason: '' },
      firstRun: null,
    };
  }

  /** The pairing link through the running tunnel ('' while the tunnel is not online). */
  function tunnelPairingUrl(s) {
    if (!s || !s.tunnel || s.tunnel.state !== 'online') return '';
    if (s.tunnel.pairingUrl) return s.tunnel.pairingUrl;
    const p = s.pairing;
    if (p && p.tunnelUrl) return p.tunnelUrl;
    const base = p ? p.lanUrl || p.url : '';
    if (s.tunnel.url && base) return withOrigin(base, s.tunnel.url);
    return '';
  }

  /**
   * First-run mode (assistant expanded, step 0 focused, the other cards collapsed): `?firstrun=1|0` forces it; never
   * under automation (navigator.webdriver – scripted tests and tools see the full panel); never once the streamer
   * finished it (`livefx.setup.done`) or when this browser already has LiveFX settings; otherwise when the server has
   * no saved triggers yet (`serverFresh`, unknown = fresh).
   */
  function isFirstRun({ force = null, automated = false, setupDone = false, hadLocalState = false, serverFresh = null } = {}) {
    if (force === '1' || force === true) return true;
    if (force === '0' || force === false) return false;
    if (automated || setupDone || hadLocalState) return false;
    return serverFresh !== false;
  }

  /**
   * Fresh install as the server sees it: GET /api/triggers never saved (`updatedAt` null) – or only the defaults the
   * server writes on its very first start (same ids in the same order, nothing removed) saved during THIS server run
   * (`uptimeS` from /health; 15 s slack). A trigger list the streamer touched, or one from an earlier run, is not fresh.
   */
  function serverLooksFresh({ updatedAt = null, removed = [], triggers = [], defaults = [], uptimeS = null, now = Date.now() } = {}) {
    if (!updatedAt) return true;
    const t = parseTime(updatedAt);
    const up = Number(uptimeS);
    if (!Number.isFinite(t) || uptimeS === null || !Number.isFinite(up)) return false;
    const untouched =
      (!Array.isArray(removed) || removed.length === 0) &&
      Array.isArray(triggers) &&
      Array.isArray(defaults) &&
      defaults.length > 0 &&
      triggers.length === defaults.length &&
      triggers.every((x, i) => x && defaults[i] && x.id === defaults[i].id);
    return untouched && t >= now - up * 1000 - 15000;
  }

  // ---------- QR drawing ----------
  /**
   * Draws `text` as a QR code into `canvas`: black on white, `margin` modules quiet zone, at least `css` CSS pixels wide
   * (whole CSS pixels per module, painted at 2× for sharp HiDPI screens). Marks the canvas with data-qr-payload /
   * -margin / -module / -ec (tests and screen readers read them). Clears it for an empty text. Skips the redraw when
   * payload and size did not change.
   */
  function drawQr(canvas, text, { css = 280, margin = QR_MARGIN, dpr = 2, label = '' } = {}) {
    if (!canvas) return null;
    const lib = QR();
    const clear = () => {
      canvas.width = 0;
      canvas.height = 0;
      canvas.style.width = '';
      canvas.style.height = '';
      for (const k of ['qrPayload', 'qrSize', 'qrVersion', 'qrMargin', 'qrModule', 'qrEc', 'qrCss']) delete canvas.dataset[k];
    };
    if (!text || !lib || typeof lib.encode !== 'function') {
      if (canvas.dataset.qrPayload !== undefined || canvas.width) clear();
      return null;
    }
    if (canvas.dataset.qrPayload === text && canvas.dataset.qrCss === String(css) && canvas.width > 0) return { cached: true, size: Number(canvas.dataset.qrSize) };
    let qr;
    try {
      qr = lib.encode(text);
    } catch (_) {
      clear();
      return null;
    }
    const n = qr.size + margin * 2;
    const per = Math.max(1, Math.ceil(css / n));
    lib.toCanvas(canvas, qr, { scale: per * dpr, margin, dark: '#000000', light: '#ffffff' });
    canvas.style.width = `${n * per}px`;
    canvas.style.height = 'auto';
    canvas.dataset.qrPayload = text;
    canvas.dataset.qrMargin = String(margin);
    canvas.dataset.qrModule = String(per * dpr);
    canvas.dataset.qrEc = qr.ecLevel || 'M';
    canvas.dataset.qrCss = String(css);
    if (label) canvas.setAttribute('aria-label', label);
    return qr;
  }

  // ---------- pairing view markup ----------
  const PHONE_STEPS = ['Handy-<b>Kamera</b> öffnen – keine App nötig', '<b>QR-Code</b> scannen und den Link antippen', 'Fertig: Soundboard, Szenen &amp; Lautstärke am Handy ✔'];

  /**
   * Markup of one pairing view (QR + code + status + hint + devices). `id` prefixes the element ids
   * (`<id>-qr`, `-code`, `-state`, `-dot`, `-url-line`, `-hint`, `-tunnel`, `-devices`, `-expiry`, `-new`, `-copy`, `-lan`);
   * `qr` = QR width in CSS px; `card: false` drops the „Einrichtungskarte“ button; `steps` = three HTML lines.
   */
  function pairViewHtml({ id = 'pair', qr = 280, card = true, steps = PHONE_STEPS, compact = false } = {}) {
    const p = escapeHtml(id);
    const lines = (Array.isArray(steps) && steps.length ? steps : PHONE_STEPS).map((s) => `<li>${s}</li>`).join('');
    return (
      `<div class="pair-grid${compact ? ' compact' : ''}" data-qr="${Number(qr) || 280}">` +
      `<div class="pair-qr-col">` +
      `<div class="qr-wrap pair-qr-wrap" id="${p}-qr-wrap" data-pair="qr-wrap">` +
      `<canvas class="pair-qr" id="${p}-qr" data-pair="qr" width="0" height="0" role="img" aria-label="QR-Code zum Koppeln des Handys"></canvas>` +
      `<div class="qr-empty" id="${p}-qr-empty" data-pair="qr-empty">QR-Code lädt …</div>` +
      `</div>` +
      `<div class="pair-code" id="${p}-code-line" data-pair="code-line" hidden>Code <b id="${p}-code" data-pair="code"></b></div>` +
      `<div class="help pair-expiry" id="${p}-expiry" data-pair="expiry"></div>` +
      `</div>` +
      `<div class="pair-info-col">` +
      `<div class="pair-state" role="status" aria-live="polite"><span class="dot" id="${p}-dot" data-pair="dot"></span> <span id="${p}-state" data-pair="state">lädt …</span></div>` +
      `<ol class="help pair-steps">${lines}</ol>` +
      `<p class="help pair-url-line" id="${p}-url-line" data-pair="url-line" hidden></p>` +
      `<div class="pair-addrs" id="${p}-addrs" data-pair="addrs" hidden></div>` +
      `<p class="help warn" id="${p}-warn" data-pair="warn" hidden></p>` +
      `<div class="actions pair-actions">` +
      `<button type="button" class="small" id="${p}-new" data-pair-act="new" title="Neuen Einmal-Code erzeugen (der alte wird ungültig)">🔄 Neuer Code</button>` +
      `<button type="button" class="small" id="${p}-copy" data-pair-act="copy" title="Kopplungs-Link kopieren, z. B. um ihn dir selbst zu schicken">📋 Link kopieren</button>` +
      (card ? `<button type="button" class="small" id="${p}-card" data-pair-act="card" title="Druckbare Karte mit Handy-QR und Overlay-QR (A6/A5, auch als Bild)">🖨 Einrichtungskarte</button>` : '') +
      `<button type="button" class="small" id="${p}-lan" data-pair-act="lan" hidden>↩ WLAN-Code zeigen</button>` +
      `</div>` +
      `<div class="pair-hint" id="${p}-hint" data-pair="hint" hidden>` +
      `<div class="pair-hint-title">📶 Handy in einem anderen Netz (z. B. mobile Daten)? → Internet-Link</div>` +
      `<p class="help">Ein Knopf, kein Konto: LiveFX öffnet einen sicheren Cloudflare-Link (https) und tauscht den QR-Code aus. Beim ersten Mal lädt LiveFX dafür ein kleines Programm (~40&nbsp;MB, bis zu 1 Minute).</p>` +
      `<div class="actions"><button type="button" class="primary" id="${p}-tunnel" data-pair-act="tunnel">🌐 Internet-Link starten</button></div>` +
      `<p class="help" id="${p}-tunnel-msg" data-pair="tunnel-msg"></p>` +
      `<p class="help">Lieber im WLAN? Handy und PC ins <b>gleiche</b> WLAN (kein Gäste-WLAN) und beim ersten Start die Windows-Firewall-Frage für Node.js mit „Zulassen“ (privates Netzwerk) beantworten.</p>` +
      `</div>` +
      `<ul class="pair-devices" id="${p}-devices" data-pair="devices" hidden></ul>` +
      `</div>` +
      `</div>`
    );
  }

  // ---------- pairing controller ----------
  function createPairing(opts = {}) {
    const win = opts.window || root;
    const doc = opts.document || (win && win.document);
    const roots = (opts.roots || []).filter(Boolean);
    const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : (u, i) => win.fetch(u, i);
    const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : DEFAULT_TIMEOUT_MS;
    const pollMs = Number(opts.pollMs) > 0 ? Number(opts.pollMs) : POLL_MS;
    const renewBeforeMs = Number(opts.renewBeforeMs) > 0 ? Number(opts.renewBeforeMs) : RENEW_BEFORE_MS;
    const online = opts.online !== undefined ? !!opts.online : !!(win && win.location && /^https?:$/.test(win.location.protocol));
    const log = typeof opts.log === 'function' ? opts.log : () => {};
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    const onAction = typeof opts.onAction === 'function' ? opts.onAction : () => {};
    const getConfig = typeof opts.getConfig === 'function' ? opts.getConfig : () => null;

    const st = {
      mode: online ? 'loading' : 'offline', // loading | setup | legacy | forbidden | error | offline
      data: null,
      known: null, // device ids present when the view opened
      connected: null, // the device that appeared since
      hintAt: 0,
      hintShown: false,
      tunnelWanted: false,
      tunnelBusy: false,
      tunnelMsg: '',
      altOrigin: '',
      renewing: false,
      renewBlockedUntil: 0,
      lastFetch: 0,
      fetching: false,
      healthBase: null,
      legacyCfg: null,
      running: false,
      error: '',
    };
    let timer = null;
    let lastSummary = '';

    async function req(method, path, body) {
      const init = { method, cache: 'no-store', headers: {} };
      if (body !== undefined) {
        init.headers['content-type'] = 'application/json';
        init.body = JSON.stringify(body);
      }
      const r = await fetchImpl(path, init);
      let data = null;
      try {
        data = await r.json();
      } catch (_) {
        data = null;
      }
      return { status: r.status, ok: r.ok, data };
    }

    function apply(n) {
      st.data = n;
      if (n.source !== 'setup' || !n.devicesKnown) return;
      const ids = n.devices.map((d) => d.id);
      if (!st.known) {
        st.known = new Set(ids);
        return;
      }
      for (const d of n.devices) {
        if (st.known.has(d.id)) continue;
        st.known.add(d.id);
        st.connected = d;
        log(`📱 Handy verbunden: ${d.name}`);
      }
      if (st.connected) st.connected = n.devices.find((d) => d.id === st.connected.id) || null;
    }

    async function refreshLegacy() {
      let cfg = getConfig() || st.legacyCfg;
      if (!cfg) {
        const r = await req('GET', '/api/config');
        cfg = r.ok && r.data && r.data.ok ? r.data : null;
        st.legacyCfg = cfg;
      }
      if (!cfg) {
        st.mode = 'error';
        st.error = 'Server-Daten fehlen (/api/config)';
        return;
      }
      const n = fromConfig(cfg, win.location);
      try {
        const t = await req('GET', '/api/tunnel');
        if (t.ok && t.data) n.tunnel = tunnelFrom(t.data, { legacy: true });
      } catch (_) {
        /* no tunnel route */
      }
      // no device list on these servers: a second remote (SSE role panel) on /health counts as „connected“
      try {
        const h = await req('GET', '/health');
        const panels = Number(h.data && h.data.panels);
        if (Number.isFinite(panels)) {
          if (st.healthBase === null) st.healthBase = panels;
          else if (panels > st.healthBase && !st.connected) {
            st.connected = { id: 'remote', name: 'Fernbedienung', legacy: true };
            log('📱 Fernbedienung verbunden (Handy oder weiteres Fenster)');
          } else if (panels <= st.healthBase && st.connected && st.connected.legacy) st.connected = null;
        }
      } catch (_) {
        /* ignore */
      }
      st.data = n;
    }

    async function refresh() {
      if (!online || st.fetching) return st.data;
      st.fetching = true;
      try {
        if (st.mode !== 'legacy') {
          const r = await req('GET', '/api/setup');
          const n = r.ok && r.data && r.data.ok !== false ? normalizeSetup(r.data) : null;
          if (n) {
            st.mode = 'setup';
            st.error = '';
            apply(n);
          } else if (r.status === 404) st.mode = 'legacy';
          else if (r.status === 401 || r.status === 403) st.mode = 'forbidden';
          else {
            st.error = (r.data && (r.data.message || r.data.error)) || `HTTP ${r.status}`;
            if (!st.data) st.mode = 'error';
          }
        }
        if (st.mode === 'legacy') await refreshLegacy();
      } catch (e) {
        st.error = (e && e.message) || 'Server nicht erreichbar';
        if (!st.data) st.mode = 'error';
      } finally {
        st.fetching = false;
        st.lastFetch = Date.now();
      }
      render();
      return st.data;
    }

    function lanLink() {
      const d = st.data;
      const p = d && d.pairing;
      if (!p || (d.lan && d.lan.listening === false)) return '';
      // `lanUrl` when the server names it (null = not reachable in the LAN); else `url` unless that is the tunnel link
      let url = p.hasLan ? p.lanUrl : p.url && !(d.tunnel && d.tunnel.url && originOf(p.url) === originOf(d.tunnel.url)) ? p.url : '';
      if (!url) return '';
      if (st.altOrigin && d.lanUrls.includes(st.altOrigin)) url = withOrigin(url, st.altOrigin);
      if (isLoopbackUrl(url)) url = d.bestLanUrl ? withOrigin(url, d.bestLanUrl) : '';
      return url;
    }

    /** The typed fallback: `<origin of the QR link>/p` + the 6-digit code ('' when the server has no code page). */
    function manualLink(link) {
      const p = st.data && st.data.pairing;
      if (!p || !p.manualUrl || !p.code || !link.url) return '';
      return withOrigin(p.manualUrl, originOf(link.url));
    }

    /** { url, via: 'lan' | 'tunnel' | '' } – the link the QR shows right now. */
    function current() {
      const t = tunnelPairingUrl(st.data);
      const lan = lanLink();
      if (t && (st.tunnelWanted || !lan)) return { url: t, via: 'tunnel' };
      return { url: lan, via: lan ? 'lan' : '' };
    }

    function tunnelState() {
      return st.data && st.data.tunnel ? st.data.tunnel.state : 'idle';
    }

    function hintVisible(now, link) {
      if (st.mode !== 'setup' && st.mode !== 'legacy') return false;
      if (st.connected || link.via === 'tunnel') return false;
      if (!lanLink()) return true; // the phone cannot reach this PC over the LAN: offer the internet link at once
      return !!st.hintAt && now >= st.hintAt;
    }

    function status(now, link) {
      const d = st.data;
      if (st.mode === 'offline') return { text: 'Server nötig: LiveFX starten und das Panel über http://127.0.0.1:8787 öffnen', dot: 'err' };
      if (st.mode === 'loading') return { text: 'lädt …', dot: '' };
      if (st.mode === 'forbidden') return { text: 'Koppeln geht nur am PC, auf dem LiveFX läuft (http://127.0.0.1:8787)', dot: 'warn' };
      if (st.mode === 'error' && !d) return { text: `Server nicht erreichbar${st.error ? ` (${st.error})` : ''} – läuft LiveFX noch?`, dot: 'err' };
      if (st.connected) return { text: st.connected.legacy ? '✔ Fernbedienung verbunden (Handy oder weiteres Fenster)' : `✔ Handy verbunden: ${st.connected.name}`, dot: 'on' };
      const ts = tunnelState();
      if (st.tunnelWanted && (ts === 'starting' || st.tunnelBusy) && link.via !== 'tunnel') return { text: '🌐 Internet-Link startet … (beim ersten Mal bis zu 1 Minute)', dot: 'warn' };
      const devs = d && d.devices ? d.devices : [];
      if (link.via === 'tunnel') return { text: '🌐 Internet-QR aktiv – klappt auch mit mobilen Daten. Jetzt scannen …', dot: 'warn' };
      if (!link.url && d && d.lan && d.lan.listening === false) return { text: 'Handy-Zugriff ist aus: LiveFX läuft nur auf diesem PC (--local). Normal starten – oder den Internet-Link nehmen', dot: 'warn' };
      if (!link.url && d && d.lan && d.lan.reason === 'no_network') return { text: 'Kein WLAN gefunden – PC ins WLAN (oder Handy-Hotspot) – oder den Internet-Link nehmen', dot: 'warn' };
      if (!link.url) return { text: 'Das Handy erreicht diesen PC gerade nicht über das WLAN – nimm den Internet-Link', dot: 'warn' };
      if (devs.length) {
        const last = devs.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))[0];
        const when = relTime(last.lastSeen, now);
        return { text: `✔ ${devs.length === 1 ? `Gekoppelt: ${last.name}` : `${devs.length} Handys gekoppelt`}${when ? ` (zuletzt ${when})` : ''} – weiteres Handy: QR scannen`, dot: 'on' };
      }
      return { text: 'Warte auf dein Handy … QR-Code mit der Handy-Kamera scannen', dot: 'warn' };
    }

    function setDot(el, cls) {
      if (!el) return;
      el.classList.remove('on', 'warn', 'err', 'pulse');
      if (cls) el.classList.add(cls);
      if (cls === 'warn') el.classList.add('pulse');
    }

    function devicesHtml(devs, now) {
      return devs
        .map(
          (dv) =>
            `<li data-device="${escapeHtml(dv.id)}"><span class="dev-name">📱 ${escapeHtml(dv.name)}</span>` +
            `<span class="help dev-seen">${escapeHtml(dv.lastSeen ? `zuletzt ${relTime(dv.lastSeen, now)}` : '')}</span>` +
            `<button type="button" class="small danger" data-pair-act="remove" data-id="${escapeHtml(dv.id)}" title="Dieses Handy abmelden – es braucht dann einen neuen QR-Code">entfernen</button></li>`
        )
        .join('');
    }

    function renderRoot(r, ctx) {
      const q = (k) => r.querySelector(`[data-pair="${k}"]`);
      const grid = r.matches('[data-qr]') ? r : r.querySelector('[data-qr]');
      const css = (grid && Number(grid.dataset.qr)) || 280;
      const canvas = q('qr');
      drawQr(canvas, ctx.link.url, { css, label: ctx.link.url ? `QR-Code: ${ctx.link.via === 'tunnel' ? 'Internet-Link' : 'WLAN-Link'} zum Koppeln des Handys` : '' });
      if (canvas) canvas.hidden = !ctx.link.url;
      const empty = q('qr-empty');
      if (empty) {
        empty.hidden = !!ctx.link.url;
        empty.textContent = ctx.emptyText;
      }
      const wrap = q('qr-wrap');
      if (wrap) wrap.classList.toggle('empty', !ctx.link.url);
      const p = ctx.pairing;
      const code = p && !p.legacy && p.code && ctx.link.url ? formatCode(p.code) : '';
      if (q('code')) q('code').textContent = code;
      if (q('code-line')) q('code-line').hidden = !code;
      const urlLine = q('url-line');
      if (urlLine) {
        const manual = code ? ctx.manual : '';
        const sig = `${manual}|${ctx.link.url}|${code}`;
        if (urlLine.dataset.sig !== sig) {
          urlLine.dataset.sig = sig;
          urlLine.innerHTML = manual
            ? `Kein QR-Scanner? Am Handy <code class="manual" data-pair="url">${escapeHtml(manual)}</code> öffnen und den Code <b>${escapeHtml(code)}</b> eintippen.`
            : `Kein QR-Scanner? Im Handy-Browser öffnen: <code data-pair="url">${escapeHtml(ctx.link.url)}</code>`;
        }
        urlLine.hidden = !ctx.link.url;
      }
      if (q('expiry')) q('expiry').textContent = ctx.expiry;
      if (q('state')) q('state').textContent = ctx.status.text;
      setDot(q('dot'), ctx.status.dot);
      const warn = q('warn');
      if (warn) {
        warn.textContent = ctx.warn;
        warn.hidden = !ctx.warn;
      }
      const addrs = q('addrs');
      if (addrs) {
        const list = ctx.link.via === 'lan' && st.data ? st.data.lanUrls : [];
        const active = originOf(ctx.link.url);
        const sig = `${list.join('|')}#${active}`;
        if (addrs.dataset.sig !== sig) {
          addrs.dataset.sig = sig;
          addrs.innerHTML =
            list.length > 1
              ? `<span class="help">Klappt nicht? Andere Adresse probieren:</span> ${list
                  .map((o) => `<button type="button" class="chip${o === active ? ' sel' : ''}" data-pair-act="addr" data-origin="${escapeHtml(o)}">${escapeHtml(o.replace(/^https?:\/\//, ''))}</button>`)
                  .join(' ')}`
              : '';
        }
        addrs.hidden = list.length <= 1;
      }
      const hint = q('hint');
      if (hint) hint.hidden = !ctx.hint;
      r.querySelectorAll('[data-pair-act="tunnel"]').forEach((b) => {
        const ts = tunnelState();
        const starting = st.tunnelBusy || ts === 'starting';
        b.disabled = starting || st.mode === 'forbidden';
        b.textContent = starting ? '⏳ Internet-Link startet …' : ts === 'online' ? '🌐 Internet-QR zeigen' : '🌐 Internet-Link starten';
      });
      if (q('tunnel-msg')) q('tunnel-msg').textContent = ctx.tunnelMsg;
      r.querySelectorAll('[data-pair-act="lan"]').forEach((b) => (b.hidden = !(ctx.link.via === 'tunnel' && lanLink())));
      r.querySelectorAll('[data-pair-act="new"]').forEach((b) => (b.disabled = st.mode !== 'setup'));
      r.querySelectorAll('[data-pair-act="copy"]').forEach((b) => (b.disabled = !ctx.link.url));
      const ul = q('devices');
      if (ul) {
        const devs = st.data && st.data.devices ? st.data.devices : [];
        const html = devicesHtml(devs, ctx.now);
        if (ul.dataset.sig !== html) {
          ul.dataset.sig = html;
          ul.innerHTML = html;
        }
        ul.hidden = !devs.length;
      }
      r.classList.toggle('done', ctx.done);
      r.classList.toggle('pair-connected', !!st.connected);
      r.classList.toggle('pair-tunnel', ctx.link.via === 'tunnel');
      r.classList.toggle('pair-legacy', !!(p && p.legacy));
    }

    function render() {
      const now = Date.now();
      const link = current();
      const p = st.data && st.data.pairing;
      const hint = hintVisible(now, link);
      if (hint && !st.hintShown) log('📶 Noch kein Handy da – Tipp: anderes Netz? → Internet-Link');
      st.hintShown = hint;
      let expiry = '';
      if (p && !p.legacy && Number.isFinite(p.expiresAt) && link.url) {
        const left = p.expiresAt - now;
        expiry = left > 0 ? `Code gilt noch ${countdown(left)} min und nur einmal – danach kommt automatisch ein neuer.` : 'Code abgelaufen – neuer Code wird geholt …';
      }
      let warn = '';
      if (p && p.legacy && link.url) warn = '⚠️ Älterer LiveFX-Server: Dieser Link enthält deinen Zugangs-Token – nicht im Stream zeigen.';
      else if (st.mode === 'error' && st.data) warn = `⚠️ Server antwortet gerade nicht (${st.error}) – Anzeige kann veraltet sein.`;
      let emptyText = 'QR-Code lädt …';
      if (st.mode === 'offline') emptyText = 'Server nötig';
      else if (st.mode === 'forbidden') emptyText = 'Nur am PC';
      else if ((st.mode === 'setup' || st.mode === 'legacy') && !link.url) emptyText = st.tunnelBusy || tunnelState() === 'starting' ? 'Internet-Link startet …' : 'Kein WLAN-Code – Internet-Link nutzen ↓';
      else if (st.mode === 'error') emptyText = 'Server nicht erreichbar';
      const ts = tunnelState();
      const tunnelMsg = st.tunnelMsg || (st.tunnelWanted && ts === 'error' && st.data && st.data.tunnel.error ? `Fehler: ${st.data.tunnel.error}` : '');
      const ctx = {
        now,
        link,
        manual: manualLink(link),
        pairing: p,
        hint,
        expiry,
        warn,
        emptyText,
        tunnelMsg,
        status: status(now, link),
        done: !!st.connected || !!(st.data && st.data.devices && st.data.devices.length),
      };
      for (const r of roots) renderRoot(r, ctx);
      const summary = { mode: st.mode, url: link.url, via: link.via, connected: st.connected ? st.connected.name : '', devices: st.data && st.data.devices ? st.data.devices.length : 0, hint, done: ctx.done, tunnel: ts };
      const sig = JSON.stringify(summary);
      if (sig !== lastSummary) {
        lastSummary = sig;
        try {
          onChange(summary, api);
        } catch (_) {
          /* the host's problem */
        }
      }
    }

    function visible() {
      if (doc && doc.hidden) return false;
      if (typeof opts.isVisible === 'function') return !!opts.isVisible();
      const h = (win && win.innerHeight) || 0;
      return roots.some((r) => {
        if (!r.isConnected) return false;
        const rect = r.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < h;
      });
    }

    function maybeRenew(now, vis) {
      const p = st.data && st.data.pairing;
      if (!vis || st.mode !== 'setup' || !p || p.legacy || !Number.isFinite(p.expiresAt) || st.renewing || now < st.renewBlockedUntil) return;
      if (p.expiresAt - now > renewBeforeMs) return;
      st.renewing = true;
      newCode({ auto: true }).finally(() => {
        st.renewing = false;
      });
    }

    function tick() {
      if (!st.running) return;
      const now = Date.now();
      const vis = visible();
      const wait = st.mode === 'forbidden' ? Math.max(10000, pollMs) : st.mode === 'error' ? Math.max(5000, pollMs) : pollMs;
      if (vis && online && !st.fetching && now - st.lastFetch >= wait) refresh();
      if (vis && !st.hintAt && current().url) st.hintAt = now + timeoutMs; // the clock starts once a QR is on screen
      maybeRenew(now, vis);
      if (vis) render();
    }

    async function newCode({ auto = false } = {}) {
      if (st.mode !== 'setup') return st.data && st.data.pairing;
      try {
        const r = await req('POST', '/api/pairing', {});
        const p = r.ok && r.data ? pairingFrom(r.data.pairing || r.data) : null;
        if (p && st.data) {
          st.data.pairing = p;
          log(auto ? '🔄 Kopplungs-Code automatisch erneuert' : '🔄 Neuer Kopplungs-Code');
        } else st.renewBlockedUntil = Date.now() + 10000;
      } catch (_) {
        st.renewBlockedUntil = Date.now() + 10000;
      }
      st.lastFetch = 0;
      await refresh();
      return st.data && st.data.pairing;
    }

    async function startTunnel() {
      st.tunnelWanted = true;
      if (tunnelState() === 'online') {
        render();
        return st.data.tunnel;
      }
      if (st.tunnelBusy) return null;
      st.tunnelBusy = true;
      st.tunnelMsg = '';
      if (st.data) st.data.tunnel = { ...st.data.tunnel, state: 'starting', error: '' };
      render();
      log('🌐 Internet-Link wird gestartet …');
      try {
        const r = await req('POST', '/api/tunnel/start');
        if (r.ok && r.data && r.data.ok !== false) {
          if (st.data) st.data.tunnel = tunnelFrom(r.data, { legacy: st.mode === 'legacy' });
          if (st.data && st.data.tunnel.state === 'error') st.tunnelMsg = `Internet-Link startet nicht: ${st.data.tunnel.error || 'unbekannter Fehler'}`;
        } else st.tunnelMsg = `Internet-Link startet nicht: ${(r.data && (r.data.message || r.data.error)) || `HTTP ${r.status}`}`;
      } catch (e) {
        st.tunnelMsg = `Internet-Link startet nicht: ${(e && e.message) || e}`;
      } finally {
        st.tunnelBusy = false;
      }
      if (st.tunnelMsg) log(`⚠️ ${st.tunnelMsg}`);
      st.lastFetch = 0;
      await refresh();
      return st.data && st.data.tunnel;
    }

    async function removeDevice(id) {
      const key = String(id || '');
      if (!key || st.mode !== 'setup') return false;
      let r = await req('DELETE', `/api/devices/${encodeURIComponent(key)}`).catch(() => ({ ok: false, status: 0 }));
      if (r.status === 404 || r.status === 405) r = await req('DELETE', `/api/devices?id=${encodeURIComponent(key)}`, { id: key }).catch(() => ({ ok: false, status: 0 }));
      if (r.ok) log('🗑 Handy entfernt – es braucht jetzt einen neuen QR-Code');
      else log(`⚠️ Handy nicht entfernt (HTTP ${r.status})`);
      if (r.ok && st.connected && st.connected.id === key) st.connected = null;
      st.lastFetch = 0;
      await refresh();
      return !!r.ok;
    }

    async function copyLink(button) {
      const { url } = current();
      if (!url) return false;
      let ok = false;
      try {
        await win.navigator.clipboard.writeText(url);
        ok = true;
      } catch (_) {
        ok = false;
      }
      if (button) {
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.textContent = ok ? '✅ Kopiert' : 'Link unten markieren – Strg+C';
        setTimeout(() => (button.textContent = button.dataset.label), 2000);
      }
      return ok;
    }

    function onClick(e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-pair-act]') : null;
      if (!b || b.disabled) return;
      const act = b.dataset.pairAct;
      if (act === 'new') newCode();
      else if (act === 'copy') copyLink(b);
      else if (act === 'tunnel') startTunnel();
      else if (act === 'lan') {
        st.tunnelWanted = false;
        render();
      } else if (act === 'remove') removeDevice(b.dataset.id);
      else if (act === 'addr') {
        st.altOrigin = b.dataset.origin || '';
        render();
      } else onAction(act, api);
    }
    for (const r of roots) r.addEventListener('click', onClick);

    function start() {
      st.running = true;
      if (!timer) timer = setInterval(tick, 1000);
      if (online && !st.fetching && Date.now() - st.lastFetch >= pollMs) refresh();
      else render();
      return api;
    }

    function stop() {
      st.running = false;
      clearInterval(timer);
      timer = null;
    }

    const api = {
      start,
      stop,
      refresh,
      render,
      newCode,
      startTunnel,
      removeDevice,
      copyLink,
      current,
      useLan() {
        st.tunnelWanted = false;
        render();
      },
      get data() {
        return st.data;
      },
      get state() {
        const link = current();
        return {
          mode: st.mode,
          url: link.url,
          via: link.via,
          code: st.data && st.data.pairing ? st.data.pairing.code : '',
          connected: st.connected ? { ...st.connected } : null,
          devices: st.data && st.data.devices ? st.data.devices.map((d) => ({ ...d })) : [],
          hint: st.hintShown,
          hintAt: st.hintAt,
          tunnel: tunnelState(),
          tunnelWanted: st.tunnelWanted,
          running: st.running,
        };
      },
      roots,
    };
    return api;
  }

  // ---------- printable setup card ----------
  const CARD_LINES = [
    ['DE', '① Handy-Kamera auf den linken QR-Code → Link öffnen ② Link des rechten QR-Codes in OBS / Streaming-App als Browser-Quelle einfügen ③ Test-Effekt – fertig!'],
    ['TR', "① Telefon kamerasını soldaki QR koduna tut → bağlantıyı aç ② Sağdaki QR bağlantısını OBS'e / yayın uygulamasına tarayıcı kaynağı olarak ekle ③ Test efekti – hazır!"],
    ['EN', '① Point your phone camera at the left QR code → open the link ② Add the right QR link as a browser source in OBS / your streaming app ③ Fire a test effect – done!'],
  ];

  function cardModel(data) {
    const d = data || {};
    const pairingUrl = cleanUrl(d.pairingUrl);
    const overlayUrl = cleanUrl(d.overlayUrl);
    return {
      pairingUrl,
      overlayUrl,
      code: d.legacy ? '' : formatCode(d.code),
      expiresAt: parseTime(d.expiresAt),
      legacy: !!d.legacy,
      overlayLocalOnly: overlayUrl ? isLoopbackUrl(overlayUrl) : false,
      size: d.size === 'a5' ? 'a5' : 'a6',
      version: str(d.version, 40),
      portrait: !!(overlayUrl && /[?&]layout=portrait/.test(overlayUrl)),
      created: Number.isFinite(d.created) ? d.created : Date.now(),
    };
  }

  function qrSvg(text) {
    const lib = QR();
    if (!text || !lib || typeof lib.toSvg !== 'function') return '';
    try {
      return lib.toSvg(text, { scale: 4, margin: QR_MARGIN, dark: '#000000', light: '#ffffff' });
    } catch (_) {
      return '';
    }
  }

  const PAGE_CSS = { a6: '@page { size: 148mm 105mm; margin: 0; }', a5: '@page { size: 210mm 148mm; margin: 0; }' };

  /** The print page (A6 / A5 landscape): pairing QR + code, overlay QR + URL, three instruction lines DE / TR / EN. */
  function cardHtml(data) {
    const m = cardModel(data);
    const date = new Date(m.created);
    const dateText = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    const pairSvg = qrSvg(m.pairingUrl);
    const overlaySvg = qrSvg(m.overlayUrl);
    const valid = m.legacy
      ? '⚠️ enthält deinen Zugangs-Token – Karte nicht zeigen'
      : m.expiresAt
        ? `gilt bis ${clockTime(m.expiresAt)} Uhr · nur einmal · tek kullanımlık · one-time`
        : 'nur einmal · tek kullanımlık · one-time';
    const pairBox = pairSvg
      ? `<div class="qr" data-qr-payload="${escapeHtml(m.pairingUrl)}">${pairSvg}</div>${m.code ? `<div class="code">Code <b>${escapeHtml(m.code)}</b></div>` : ''}<div class="url">${escapeHtml(m.pairingUrl)}</div><div class="small">${escapeHtml(valid)}</div>`
      : '<div class="qr none">Handy-QR im Panel: Start-Assistent → „📱 Handy verbinden“</div>';
    const overlayNote = m.overlayLocalOnly ? 'nur auf diesem PC · sadece bu PC · this PC only' : `Browser-Quelle ${m.portrait ? '1080×1920' : '1920×1080'} · gleiches WLAN · aynı Wi-Fi · same Wi-Fi`;
    const overlayBox = overlaySvg
      ? `<div class="qr" data-qr-payload="${escapeHtml(m.overlayUrl)}">${overlaySvg}</div><div class="url">${escapeHtml(m.overlayUrl)}</div><div class="small">${escapeHtml(overlayNote)}</div>`
      : '<div class="qr none">Overlay-URL im Panel: Start-Assistent → „OBS verbinden“</div>';
    const lines = CARD_LINES.map(([lang, text]) => `<li><b>${lang}</b> ${escapeHtml(text)}</li>`).join('');
    return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiveFX – Einrichtungskarte</title>
<style id="card-page">${PAGE_CSS[m.size]}</style>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #e9ebf0; color: #111; font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px; background: #181b22; color: #e8eaf0; font-size: 14px; }
  .toolbar button, .toolbar select { font: inherit; padding: 8px 12px; border-radius: 10px; border: 1px solid #2b303c; background: #20242e; color: #e8eaf0; cursor: pointer; }
  .toolbar button.primary { background: #7c5cff; border-color: #7c5cff; color: #fff; font-weight: 700; }
  .toolbar .tip { color: #8d93a3; font-size: 12px; flex: 1 1 220px; }
  .stage { padding: 20px 16px 40px; display: flex; justify-content: center; overflow-x: auto; }
  .sheet { --w: 148mm; --h: 105mm; font-size: 2.55mm; width: var(--w); height: var(--h); background: #fff; padding: 5mm 6mm; display: flex; flex-direction: column; gap: 2.2mm; box-shadow: 0 6px 30px rgba(0,0,0,.18); border-radius: 2mm; overflow: hidden; flex: 0 0 auto; }
  body[data-size="a5"] .sheet { --w: 210mm; --h: 148mm; font-size: 3.6mm; padding: 7mm 9mm; }
  .sheet header { display: flex; align-items: baseline; gap: .8em; border-bottom: .35mm solid #111; padding-bottom: 1.2mm; }
  .sheet header b { font-size: 1.6em; letter-spacing: -.01em; }
  .sheet header span { font-weight: 600; }
  .sheet header small { margin-left: auto; color: #555; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; flex: 1 1 auto; min-height: 0; }
  figure { margin: 0; border: .3mm solid #bbb; border-radius: 2mm; padding: 1.6mm 2mm; display: flex; flex-direction: column; align-items: center; gap: .9mm; text-align: center; min-width: 0; }
  figcaption { font-weight: 700; font-size: 1.05em; }
  .qr svg { width: 15em; height: 15em; display: block; }
  .qr.none { width: 15em; height: 15em; display: flex; align-items: center; justify-content: center; border: .3mm dashed #999; color: #555; padding: 2mm; }
  .code { font-size: 1.35em; letter-spacing: .06em; }
  .code b { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .url { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .82em; word-break: break-all; color: #222; }
  .small { font-size: .78em; color: #555; }
  ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .6mm; font-size: .88em; line-height: 1.3; }
  ol b { display: inline-block; min-width: 2em; background: #111; color: #fff; border-radius: .6mm; text-align: center; margin-right: .4em; font-size: .9em; }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none !important; }
    .stage { padding: 0; display: block; }
    .sheet { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body data-size="${m.size}">
<div class="toolbar" role="toolbar" aria-label="Einrichtungskarte">
  <button type="button" class="primary" id="card-print">🖨 Drucken</button>
  <label>Format <select id="card-size"><option value="a6"${m.size === 'a6' ? ' selected' : ''}>A6 (Postkarte)</option><option value="a5"${m.size === 'a5' ? ' selected' : ''}>A5</option></select></label>
  <button type="button" id="card-png">🖼 Als Bild speichern</button>
  <span class="tip">Tipp: Karte neben den PC legen oder das Bild aufs Handy schicken. Der Handy-Code gilt nur kurz – für ein weiteres Handy die Karte im Panel neu erzeugen. Die Overlay-Adresse bleibt gleich.</span>
</div>
<div class="stage">
<main class="sheet" id="card">
  <header><b>🎬 LiveFX</b><span>Einrichtung · Kurulum · Setup</span><small>${escapeHtml(m.version ? `v${m.version} · ` : '')}${dateText}</small></header>
  <section class="cols">
    <figure data-kind="pair"><figcaption>📱 Handy · Telefon · Phone</figcaption>${pairBox}</figure>
    <figure data-kind="overlay"><figcaption>🎥 Overlay · OBS · App</figcaption>${overlayBox}</figure>
  </section>
  <ol class="howto">${lines}</ol>
</main>
</div>
</body>
</html>`;
  }

  function wrapLines(g, text, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    // URLs without spaces: hard-break by width
    const out = [];
    for (const l of lines) {
      if (g.measureText(l).width <= maxW) {
        out.push(l);
        continue;
      }
      let cur = '';
      for (const ch of l) {
        if (g.measureText(cur + ch).width > maxW && cur) {
          out.push(cur);
          cur = ch;
        } else cur += ch;
      }
      if (cur) out.push(cur);
    }
    return out;
  }

  function paintQr(g, text, x, y, size) {
    const lib = QR();
    if (!text || !lib) return false;
    let qr;
    try {
      qr = lib.encode(text);
    } catch (_) {
      return false;
    }
    const n = qr.size + QR_MARGIN * 2;
    const m = size / n;
    g.fillStyle = '#ffffff';
    g.fillRect(x, y, size, size);
    g.fillStyle = '#000000';
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r * qr.size + c]) g.fillRect(Math.floor(x + (c + QR_MARGIN) * m), Math.floor(y + (r + QR_MARGIN) * m), Math.ceil(m), Math.ceil(m));
      }
    }
    return true;
  }

  /** The card as a picture (A6 landscape, 10 px per mm = 1480 × 1050): same content as cardHtml. */
  function cardCanvas(data, { document: d } = {}) {
    const doc = d || (root && root.document);
    if (!doc) return null;
    const m = cardModel(data);
    const W = 1480;
    const H = 1050;
    const c = doc.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return c;
    const font = (px, weight = 400, mono = false) => `${weight} ${px}px ${mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'Inter, "Segoe UI", system-ui, sans-serif'}`;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#111111';
    g.textBaseline = 'top';
    g.font = font(46, 800);
    g.fillText('🎬 LiveFX', 60, 44);
    g.font = font(30, 600);
    g.fillText('Einrichtung · Kurulum · Setup', 330, 54);
    g.fillRect(60, 110, W - 120, 4);
    const colW = (W - 120 - 40) / 2;
    const qrSize = 400;
    const boxes = [
      { x: 60, title: '📱 Handy · Telefon · Phone', url: m.pairingUrl, sub: m.code ? `Code ${m.code}` : '', note: m.legacy ? '⚠️ enthält deinen Zugangs-Token' : m.expiresAt ? `gilt bis ${clockTime(m.expiresAt)} Uhr · nur einmal` : 'nur einmal' },
      { x: 60 + colW + 40, title: '🎥 Overlay · OBS · App', url: m.overlayUrl, sub: '', note: m.overlayLocalOnly ? 'nur auf diesem PC' : `Browser-Quelle ${m.portrait ? '1080×1920' : '1920×1080'} · gleiches WLAN` },
    ];
    for (const b of boxes) {
      g.strokeStyle = '#bbbbbb';
      g.lineWidth = 3;
      g.strokeRect(b.x, 135, colW, 640);
      g.fillStyle = '#111111';
      g.font = font(28, 700);
      g.textAlign = 'center';
      g.fillText(b.title, b.x + colW / 2, 152, colW - 30);
      const qx = b.x + (colW - qrSize) / 2;
      if (!paintQr(g, b.url, qx, 195, qrSize)) {
        g.strokeStyle = '#999999';
        g.strokeRect(qx, 195, qrSize, qrSize);
        g.font = font(24);
        g.fillText('– im Panel –', b.x + colW / 2, 380);
      }
      let y = 605;
      g.fillStyle = '#111111';
      if (b.sub) {
        g.font = font(40, 800, true);
        g.fillText(b.sub, b.x + colW / 2, y);
        y += 52;
      }
      g.font = font(20, 400, true);
      for (const l of wrapLines(g, b.url || '', colW - 40).slice(0, 3)) {
        g.fillText(l, b.x + colW / 2, y);
        y += 26;
      }
      g.fillStyle = '#555555';
      g.font = font(20);
      g.fillText(b.note, b.x + colW / 2, Math.min(y + 4, 745), colW - 30);
      g.textAlign = 'left';
    }
    let y = 800;
    g.font = font(23);
    for (const [lang, text] of CARD_LINES) {
      g.fillStyle = '#111111';
      g.fillRect(60, y - 2, 52, 30);
      g.fillStyle = '#ffffff';
      g.font = font(20, 800);
      g.fillText(lang, 68, y + 2);
      g.fillStyle = '#111111';
      g.font = font(22);
      const lines = wrapLines(g, text, W - 120 - 70).slice(0, 2);
      for (const l of lines) {
        g.fillText(l, 128, y);
        y += 28;
      }
      y += 8;
    }
    return c;
  }

  function cardPng(data, opts) {
    const c = cardCanvas(data, opts);
    return c && typeof c.toDataURL === 'function' ? c.toDataURL('image/png') : '';
  }

  /** Opens the print page in a new window (same origin, no inline scripts – the buttons are wired from here). */
  function openCard(data, { win: target } = {}) {
    const w = target || (root && typeof root.open === 'function' ? root.open('', '_blank') : null);
    if (!w || !w.document) return null;
    const d = w.document;
    d.open();
    d.write(cardHtml(data));
    d.close();
    let model = { ...(data || {}) };
    const byId = (id) => d.getElementById(id);
    const print = byId('card-print');
    if (print) print.addEventListener('click', () => w.print());
    const size = byId('card-size');
    if (size) {
      size.addEventListener('change', () => {
        const s = size.value === 'a5' ? 'a5' : 'a6';
        model = { ...model, size: s };
        d.body.dataset.size = s;
        const page = byId('card-page');
        if (page) page.textContent = PAGE_CSS[s];
      });
    }
    const png = byId('card-png');
    if (png) {
      png.addEventListener('click', () => {
        const url = cardPng(model, { document: d });
        if (!url) return;
        const a = d.createElement('a');
        a.href = url;
        a.download = 'LiveFX-Einrichtungskarte.png';
        d.body.appendChild(a);
        a.click();
        a.remove();
      });
    }
    try {
      w.focus();
    } catch (_) {
      /* ignore */
    }
    return w;
  }

  return {
    TUNNEL_STATES,
    DEFAULT_TIMEOUT_MS,
    POLL_MS,
    QR_MARGIN,
    CARD_LINES,
    escapeHtml,
    cleanUrl,
    isLoopbackUrl,
    withOrigin,
    formatCode,
    parseTime,
    relTime,
    countdown,
    overlayLinks,
    normalizeSetup,
    fromConfig,
    tunnelPairingUrl,
    isFirstRun,
    serverLooksFresh,
    drawQr,
    pairViewHtml,
    createPairing,
    cardModel,
    cardHtml,
    cardCanvas,
    cardPng,
    openCard,
  };
});
