// LiveFX – pairing routes (2.3) on top of server/pairing.js, plus the one-call setup info for the panel.
//
//   GET    /p                  pairing page for the phone (inline HTML, no file on disk). The QR link is
//                              `/p#<secret>` (fragment: never sent in a request line or logged); the page POSTs it.
//                              Without a fragment it shows the 6-digit code form. `?next=camera|panel` picks the page
//                              opened after pairing (default: the phone remote /mobile.html).
//   POST   /api/pair           { secret } | { code, name? }  → 200 { ok, device, redirect } + Set-Cookie livefx_dev
//                              (open, same-origin, 10 attempts/min per client address, see pairing.js for the global cap)
//   POST   /api/pairing        { next? } → { ok, pairing }  fresh code (auth)
//   GET    /api/devices        → { ok, devices: [{ id, name, via, createdAt, lastSeen, current }] }  (auth)
//   DELETE /api/devices/:id    → { ok, revoked }   (auth; the caller's own device also loses its cookie)
//   DELETE /api/devices?id=<id> → same as above;  DELETE /api/devices?all=1 → every device + open codes (auth)
//   GET    /api/setup          → everything the setup UI needs in one call (auth), see setupInfo()
//
// LAN addresses are ranked (rankLanAddresses): the interface of the default route first, then 192.168.x / 10.x,
// virtual adapters (WSL, Hyper-V, Docker, VirtualBox, VPN, Tailscale …) last – the QR code uses the best one.
'use strict';

const os = require('os');
const crypto = require('crypto');
const dgram = require('dgram');
const { json, readJson, HttpError } = require('./router');
const auth = require('./auth');
const { cookieHeader, clearCookieHeader } = require('./pairing');
const { createLimiter } = require('./api-mobile');

const PAIR_ATTEMPTS_PER_MIN = 10;
const NEXT_PAGES = { mobile: '/mobile.html', camera: '/camera.html', panel: '/' };
const VIRTUAL_IFACE_RE = /vEthernet|WSL|docker|^br-|^veth|virbr|VirtualBox|vboxnet|VMware|vmnet|Hyper-V|utun|^tun|^tap|tailscale|zerotier|^zt|^wg|Hamachi|ham\d|npcap|Loopback|Pseudo|Teredo|isatap/i;

// ---------- LAN addresses ----------

function ipv4Score(ip) {
  const p = ip.split('.').map(Number);
  if (p[0] === 192 && p[1] === 168) return 30;
  if (p[0] === 10) return 20;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return 5; // often Docker / WSL / Hyper-V
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return 0; // CGNAT / Tailscale
  return 10;
}

/**
 * Ranked IPv4 addresses other devices in the LAN can reach (no loopback, no link-local 169.254.x).
 * `ifaces` is os.networkInterfaces(); `defaultIp` the address of the default route (detectDefaultRouteIp()).
 */
function rankLanAddresses(ifaces, defaultIp = null) {
  const out = [];
  for (const [name, list] of Object.entries(ifaces || {})) {
    for (const a of list || []) {
      const v4 = a && (a.family === 'IPv4' || a.family === 4);
      if (!v4 || a.internal || !a.address || /^127\./.test(a.address) || /^169\.254\./.test(a.address)) continue;
      if (out.some((o) => o.address === a.address)) continue;
      let score = ipv4Score(a.address);
      if (VIRTUAL_IFACE_RE.test(name)) score -= 50;
      if (defaultIp && a.address === defaultIp) score += 100;
      out.push({ address: a.address, iface: name, score });
    }
  }
  return out.sort((x, y) => y.score - x.score).map(({ address, iface }) => ({ address, iface }));
}

/** IPv4 of the default route: a connected UDP socket picks the outgoing interface – no packet is sent. */
function detectDefaultRouteIp({ timeoutMs = 500 } = {}) {
  return new Promise((resolve) => {
    let done = false;
    let sock;
    const finish = (ip) => {
      if (done) return;
      done = true;
      try {
        sock.close();
      } catch (_) {
        /* closed */
      }
      resolve(ip);
    };
    try {
      sock = dgram.createSocket('udp4');
      sock.on('error', () => finish(null));
      sock.connect(53, '1.1.1.1', () => {
        try {
          finish(sock.address().address || null);
        } catch (_) {
          finish(null);
        }
      });
    } catch (_) {
      finish(null);
      return;
    }
    const t = setTimeout(() => finish(null), timeoutMs);
    if (typeof t.unref === 'function') t.unref();
  });
}

function isLoopbackHost(h) {
  return !h || h === 'localhost' || /^127\./.test(h) || h === '::1';
}

function hostPart(ip) {
  return ip.includes(':') ? `[${ip}]` : ip;
}

/** { listening, bind, ips[{address, iface}], best } from the bound address (0.0.0.0 / :: = every interface). */
function lanState(ctx) {
  const cfg = (ctx && ctx.config) || {};
  const bind = String(cfg.boundAddress || cfg.host || '127.0.0.1');
  if (isLoopbackHost(bind)) return { listening: false, bind, ips: [], best: null, reason: 'local_only' };
  let ips;
  if (bind === '0.0.0.0' || bind === '::' || bind === '') {
    let ifaces = {};
    try {
      ifaces = (ctx.networkInterfaces || os.networkInterfaces)() || {};
    } catch (_) {
      ifaces = {};
    }
    ips = rankLanAddresses(ifaces, (ctx.net && ctx.net.defaultRouteIp) || null);
  } else {
    ips = [{ address: bind, iface: '' }];
  }
  return { listening: true, bind, ips, best: ips[0] ? ips[0].address : null, reason: ips.length ? null : 'no_network' };
}

function baseUrls(ctx) {
  const cfg = (ctx && ctx.config) || {};
  const scheme = cfg.secure ? 'https' : 'http';
  const port = Number(cfg.port) || 8787;
  const lan = lanState(ctx);
  const local = `${scheme}://127.0.0.1:${port}`;
  const lanBases = lan.ips.map((i) => `${scheme}://${hostPart(i.address)}:${port}`);
  let tunnel = null;
  try {
    const s = ctx.tunnel && typeof ctx.tunnel.status === 'function' ? ctx.tunnel.status() : null;
    if (s && s.status === 'online' && typeof s.url === 'string' && /^https:\/\//.test(s.url)) tunnel = s.url.replace(/\/+$/, '');
  } catch (_) {
    tunnel = null;
  }
  return { scheme, port, lan, local, lanBases, lanBest: lanBases[0] || null, tunnel };
}

function nextKey(next) {
  return Object.prototype.hasOwnProperty.call(NEXT_PAGES, next) ? next : 'mobile';
}

/** Pairing links for a code: `<base>/p[?next=…]#<secret>` on the best LAN address and (when online) the tunnel. */
function pairingLinks(ctx, code, { next = 'mobile' } = {}) {
  const b = baseUrls(ctx);
  const n = nextKey(next);
  const q = n === 'mobile' ? '' : `?next=${n}`;
  const frag = code && code.secret ? `#${code.secret}` : '';
  const lanUrl = b.lanBest && frag ? `${b.lanBest}/p${q}${frag}` : null;
  const tunnelUrl = b.tunnel && frag ? `${b.tunnel}/p${q}${frag}` : null;
  const camQ = '?next=camera';
  return {
    url: tunnelUrl || lanUrl,
    lanUrl,
    tunnelUrl,
    cameraUrl: (b.tunnel || b.lanBest) && frag ? `${b.tunnel || b.lanBest}/p${camQ}${frag}` : null,
    manualUrl: b.tunnel || b.lanBest ? `${b.tunnel || b.lanBest}/p` : null,
    code: code ? code.code : null,
    expiresAt: code ? new Date(code.expiresAt).toISOString() : null,
    ttlMs: code ? code.ttlMs : null,
    via: tunnelUrl ? 'tunnel' : lanUrl ? 'lan' : null,
    reason: tunnelUrl || lanUrl ? null : b.lan.reason || 'local_only',
  };
}

/** Everything the setup assistant / Handy card needs (GET /api/setup). */
function setupInfo(ctx, req, { fresh = false } = {}) {
  const b = baseUrls(ctx);
  const code = fresh ? ctx.pairing.create() : ctx.pairing.current();
  const device = auth.isLocal(req) ? null : ctx.pairing.deviceFromRequest(req);
  const key = ctx.overlayKey || auth.overlayKeyFor(ctx.token);
  const tunnelStatus = ctx.tunnel && typeof ctx.tunnel.status === 'function' ? ctx.tunnel.status() : { status: 'idle', url: null, error: null };
  const online = tunnelStatus.status === 'online';
  const links = pairingLinks(ctx, code);
  return {
    ok: true,
    version: ctx.config.version,
    panelUrl: `${b.local}/`,
    lanUrls: b.lanBases.map((u) => `${u}/`),
    bestLanUrl: b.lanBest ? `${b.lanBest}/` : null,
    overlayUrls: {
      local: `${b.local}/overlay.html`,
      localPortrait: `${b.local}/overlay.html?layout=portrait`,
      lan: b.lanBest ? `${b.lanBest}/overlay.html?key=${key}` : null,
      lanPortrait: b.lanBest ? `${b.lanBest}/overlay.html?layout=portrait&key=${key}` : null,
      key,
    },
    cameraUrl: `${b.local}/camera.html`,
    tunnel: { state: tunnelStatus.status || 'idle', url: online ? tunnelStatus.url || null : null, error: tunnelStatus.error || null, pairingUrl: online ? links.tunnelUrl : null },
    pairing: links,
    devices: ctx.pairing.listDevices(device ? device.id : null),
    lan: { listening: b.lan.listening, bind: b.lan.bind, ips: b.lan.ips, port: b.port, reason: b.lan.reason },
    secure: !!ctx.config.secure,
  };
}

// ---------- pairing page ----------

function pairPage({ nonce, paired, next }) {
  const nextPath = NEXT_PAGES[nextKey(next)];
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0f1115">
<title>LiveFX – Handy koppeln</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px 16px; background: #0f1115; color: #e8eaf0; font: 16px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width: 100%; max-width: 420px; background: #171a21; border: 1px solid #262b36; border-radius: 18px; padding: 24px 20px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { margin: 0 0 18px; color: #9aa3b5; font-size: 14px; }
  .status { min-height: 26px; margin: 14px 0 0; font-weight: 600; }
  .status.ok { color: #4ade80; } .status.err { color: #f87171; } .status.busy { color: #fbbf24; }
  form { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  label { font-size: 14px; color: #9aa3b5; }
  input { width: 100%; font: 700 30px/1.2 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .35em; text-align: center; padding: 12px 8px; border-radius: 12px; border: 1px solid #333a48; background: #0f1115; color: #fff; }
  button, a.btn { display: block; width: 100%; text-align: center; font: 700 17px/1 system-ui, sans-serif; padding: 15px; border-radius: 12px; border: 0; background: #7c5cff; color: #fff; text-decoration: none; cursor: pointer; }
  button:disabled { opacity: .5; }
  ol { margin: 14px 0 0; padding-left: 20px; color: #c3c9d6; font-size: 14px; }
  .hidden { display: none !important; }
  .lang { margin-top: 16px; text-align: center; font-size: 13px; }
  .lang button { display: inline; width: auto; padding: 4px 8px; margin: 0 2px; background: none; color: #9aa3b5; font-size: 13px; text-decoration: underline; }
</style>
</head>
<body>
<main data-paired="${paired ? '1' : '0'}" data-next="${nextPath}">
  <h1 id="t-title">📱 Handy koppeln</h1>
  <p class="sub" id="t-sub">Einmal koppeln – danach öffnet sich die Fernbedienung direkt.</p>
  <div id="already" class="hidden">
    <p id="t-already">✔ Dieses Gerät ist schon gekoppelt.</p>
    <a class="btn" id="go" href="${nextPath}">Weiter</a>
  </div>
  <form id="form" class="hidden" autocomplete="off">
    <label for="code" id="t-label">6-stelligen Code aus dem Panel eingeben</label>
    <input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="000000" required>
    <button id="submit" type="submit">Koppeln</button>
  </form>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <ol id="help">
    <li id="t-h1">Am PC: LiveFX-Panel → „📱 Handy“ (oder der QR-Code im Startfenster).</li>
    <li id="t-h2">QR-Code mit der Handy-Kamera scannen – oder den Code hier eintippen.</li>
    <li id="t-h3">Handy und PC im selben WLAN (unterwegs: im Panel „Internet-Link“).</li>
  </ol>
  <div class="lang"><button type="button" data-lang="de">Deutsch</button>·<button type="button" data-lang="tr">Türkçe</button>·<button type="button" data-lang="en">English</button></div>
</main>
<script nonce="${nonce}">
(function () {
  'use strict';
  var T = {
    de: { title: '📱 Handy koppeln', sub: 'Einmal koppeln – danach öffnet sich die Fernbedienung direkt.', already: '✔ Dieses Gerät ist schon gekoppelt.', go: 'Weiter', label: '6-stelligen Code aus dem Panel eingeben', submit: 'Koppeln', h1: 'Am PC: LiveFX-Panel → „📱 Handy“ (oder der QR-Code im Startfenster).', h2: 'QR-Code mit der Handy-Kamera scannen – oder den Code hier eintippen.', h3: 'Handy und PC im selben WLAN (unterwegs: im Panel „Internet-Link“).', busy: 'Koppeln …', ok: '✔ Gekoppelt! Fernbedienung wird geöffnet …', invalid_code: 'Code falsch – bitte nochmal eintippen oder den QR-Code scannen.', expired: 'Code abgelaufen – im Panel einen neuen QR-Code anzeigen.', used: 'Dieser QR-Code wurde schon benutzt – im Panel einen neuen anzeigen.', locked: 'Zu viele Fehlversuche – im Panel einen neuen QR-Code anzeigen.', rate_limited: 'Zu viele Versuche – bitte eine Minute warten.', network: 'PC nicht erreichbar – gleiches WLAN? Läuft LiveFX noch?', other: 'Koppeln fehlgeschlagen.' },
    tr: { title: '📱 Telefonu eşleştir', sub: 'Bir kez eşleştir – sonra uzaktan kumanda doğrudan açılır.', already: '✔ Bu cihaz zaten eşleştirilmiş.', go: 'Devam', label: 'Paneldeki 6 haneli kodu gir', submit: 'Eşleştir', h1: 'PC’de: LiveFX paneli → „📱 Handy“ (ya da başlangıç penceresindeki QR kod).', h2: 'QR kodu telefon kamerasıyla tara – ya da kodu buraya yaz.', h3: 'Telefon ve PC aynı Wi‑Fi’de olmalı (dışarıdaysan: panelde „Internet-Link“).', busy: 'Eşleştiriliyor …', ok: '✔ Eşleştirildi! Kumanda açılıyor …', invalid_code: 'Kod yanlış – tekrar yaz ya da QR kodu tara.', expired: 'Kodun süresi doldu – panelde yeni bir QR kod göster.', used: 'Bu QR kod zaten kullanıldı – panelde yenisini göster.', locked: 'Çok fazla hatalı deneme – panelde yeni bir QR kod göster.', rate_limited: 'Çok fazla deneme – lütfen bir dakika bekle.', network: 'PC’ye ulaşılamıyor – aynı Wi‑Fi? LiveFX çalışıyor mu?', other: 'Eşleştirme başarısız.' },
    en: { title: '📱 Pair your phone', sub: 'Pair once – afterwards the remote opens directly.', already: '✔ This device is already paired.', go: 'Continue', label: 'Enter the 6-digit code from the panel', submit: 'Pair', h1: 'On the PC: LiveFX panel → “📱 Handy” (or the QR code in the start window).', h2: 'Scan the QR code with the phone camera – or type the code here.', h3: 'Phone and PC on the same Wi‑Fi (away from home: “Internet-Link” in the panel).', busy: 'Pairing …', ok: '✔ Paired! Opening the remote …', invalid_code: 'Wrong code – type it again or scan the QR code.', expired: 'Code expired – show a new QR code in the panel.', used: 'This QR code was already used – show a new one in the panel.', locked: 'Too many wrong attempts – show a new QR code in the panel.', rate_limited: 'Too many attempts – please wait a minute.', network: 'PC not reachable – same Wi‑Fi? Is LiveFX still running?', other: 'Pairing failed.' }
  };
  var $ = function (id) { return document.getElementById(id); };
  var main = document.querySelector('main');
  var nav = String(navigator.language || 'de').toLowerCase();
  var lang = nav.indexOf('tr') === 0 ? 'tr' : nav.indexOf('de') === 0 ? 'de' : nav.indexOf('en') === 0 ? 'en' : 'de';
  var lastKey = '';
  var lastCls = '';
  function apply() {
    var t = T[lang];
    document.documentElement.lang = lang;
    ['title', 'sub', 'already', 'label', 'h1', 'h2', 'h3'].forEach(function (k) { var el = $('t-' + k); if (el) el.textContent = t[k]; });
    $('go').textContent = t.go;
    $('submit').textContent = t.submit;
    document.title = 'LiveFX – ' + t.title.replace(/^\\S+\\s/, '');
    if (lastKey) say(lastKey, lastCls);
  }
  function say(key, cls) {
    lastKey = key;
    lastCls = cls || '';
    var el = $('status');
    el.textContent = key ? (T[lang][key] || T[lang].other) : '';
    el.className = 'status' + (cls ? ' ' + cls : '');
  }
  var params = new URLSearchParams(location.search);
  var next = params.get('next') || 'mobile';
  var secret = String(location.hash || '').replace(/^#/, '');
  if (secret) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* old browser */ }
  }
  function pair(body) {
    say('busy', 'busy');
    $('submit').disabled = true;
    body.next = next;
    return fetch('/api/pair', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (x.r.ok && x.d && x.d.ok) {
          say('ok', 'ok');
          setTimeout(function () { location.replace(x.d.redirect || main.getAttribute('data-next') || '/mobile.html'); }, 700);
          return;
        }
        $('submit').disabled = false;
        $('form').classList.remove('hidden');
        say(x.d && x.d.error ? x.d.error : 'other', 'err');
      })
      .catch(function () {
        $('submit').disabled = false;
        $('form').classList.remove('hidden');
        say('network', 'err');
      });
  }
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('submit').disabled) return;
    var code = String($('code').value || '').replace(/\\D/g, '');
    if (code.length !== 6) { say('invalid_code', 'err'); return; }
    pair({ code: code });
  });
  $('code').addEventListener('input', function () {
    var v = String($('code').value || '').replace(/\\D/g, '').slice(0, 6);
    if (v !== $('code').value) $('code').value = v;
    if (v.length === 6 && !$('submit').disabled) pair({ code: v });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); apply(); });
  });
  // The QR link opened while this page is already showing (same path, new #fragment) does not reload the page.
  window.addEventListener('hashchange', function () {
    var s = String(location.hash || '').replace(/^#/, '');
    if (!s) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* old browser */ }
    pair({ secret: s });
  });
  apply();
  if (secret) pair({ secret: secret });
  else if (main.getAttribute('data-paired') === '1') $('already').classList.remove('hidden');
  else { $('form').classList.remove('hidden'); try { $('code').focus(); } catch (e) { /* ignore */ } }
})();
</script>
</body>
</html>
`;
}

// ---------- routes ----------

function register(router, ctx) {
  if (!ctx.pairing) throw new Error('api-pairing: ctx.pairing fehlt (server/pairing.js createPairing)');
  const limiter = createLimiter({ max: PAIR_ATTEMPTS_PER_MIN, windowMs: 60 * 1000 });

  const page = (req, res, rctx) => {
    const nonce = crypto.randomBytes(12).toString('base64');
    const paired = !auth.isLocal(req) && !!ctx.pairing.deviceFromRequest(req);
    const body = pairPage({ nonce, paired, next: rctx.url.searchParams.get('next') || '' });
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  for (const m of ['GET', 'HEAD']) {
    router.route(m, '/p', page);
    router.route(m, '/p/', page);
  }

  router.route('POST', '/api/pair', async (req, res) => {
    if (!auth.sameOrigin(req)) throw new HttpError(403, 'cross_origin', 'Koppeln nur über die LiveFX-Seite /p');
    const addr = auth.clientAddress(req);
    if (limiter.blocked(addr)) {
      json(res, 429, { ok: false, error: 'rate_limited', message: 'Zu viele Versuche – bitte eine Minute warten.' });
      return;
    }
    limiter.fail(addr); // every attempt counts (10 per minute and address)
    const body = await readJson(req, 4096);
    const local = auth.isLocal(req);
    const existing = local ? null : ctx.pairing.deviceFromRequest(req);
    const r = ctx.pairing.redeem({
      secret: typeof body.secret === 'string' ? body.secret : undefined,
      code: typeof body.code === 'string' ? body.code : typeof body.code === 'number' ? String(body.code).padStart(6, '0') : undefined,
      name: typeof body.name === 'string' ? body.name : '',
      userAgent: String(req.headers['user-agent'] || ''),
      via: auth.viaTunnel(req) ? 'tunnel' : local ? 'local' : 'lan',
      existing,
    });
    if (!r.ok) {
      const messages = {
        invalid: 'Code falsch – den QR-Code im Panel scannen oder den 6-stelligen Code eintippen.',
        expired: 'Code abgelaufen – im Panel einen neuen QR-Code anzeigen.',
        used: 'Dieser Code wurde schon benutzt – im Panel einen neuen anzeigen.',
        locked: 'Zu viele Fehlversuche – im Panel einen neuen QR-Code anzeigen.',
      };
      json(res, r.reason === 'locked' ? 429 : 400, { ok: false, error: r.reason === 'invalid' ? 'invalid_code' : r.reason, message: messages[r.reason] || 'Koppeln fehlgeschlagen' });
      return;
    }
    const headers = {};
    if (r.cookieValue) headers['set-cookie'] = cookieHeader(r.cookieValue, { secure: !!ctx.config.secure || auth.viaTunnel(req) });
    const next = nextKey(typeof body.next === 'string' ? body.next : '');
    json(res, 200, { ok: true, device: r.device, again: !!r.again, redirect: NEXT_PAGES[next] }, headers);
  });

  router.route(
    'POST',
    '/api/pairing',
    auth.requireAuth(async (req, res) => {
      let next = 'mobile';
      if (String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        const body = await readJson(req, 4096).catch(() => ({}));
        next = nextKey(body && body.next);
      }
      json(res, 200, { ok: true, pairing: pairingLinks(ctx, ctx.pairing.create(), { next }) });
    })
  );

  router.route(
    'GET',
    '/api/devices',
    auth.requireAuth(async (req, res) => {
      const me = auth.isLocal(req) ? null : ctx.pairing.deviceFromRequest(req);
      json(res, 200, { ok: true, devices: ctx.pairing.listDevices(me ? me.id : null) });
    })
  );

  router.route(
    'DELETE',
    '/api/devices/:id',
    auth.requireAuth(async (req, res, rctx) => {
      const id = String(rctx.params.id || '');
      const me = auth.isLocal(req) ? null : ctx.pairing.deviceFromRequest(req);
      if (!ctx.pairing.revoke(id)) throw new HttpError(404, 'unknown_device', 'Gerät nicht gefunden');
      const headers = me && me.id === id ? { 'set-cookie': clearCookieHeader({ secure: !!ctx.config.secure || auth.viaTunnel(req) }) } : {};
      json(res, 200, { ok: true, revoked: id, devices: ctx.pairing.listDevices() }, headers);
    })
  );

  // `DELETE /api/devices?id=<id>` = one device (same as /api/devices/<id>); `?all=1` = every device + open codes.
  router.route(
    'DELETE',
    '/api/devices',
    auth.requireAuth(async (req, res, rctx) => {
      const id = rctx.url.searchParams.get('id');
      const me = auth.isLocal(req) ? null : ctx.pairing.deviceFromRequest(req);
      const clear = { 'set-cookie': clearCookieHeader({ secure: !!ctx.config.secure || auth.viaTunnel(req) }) };
      if (id) {
        if (!ctx.pairing.revoke(id)) throw new HttpError(404, 'unknown_device', 'Gerät nicht gefunden');
        json(res, 200, { ok: true, revoked: id, devices: ctx.pairing.listDevices() }, me && me.id === id ? clear : {});
        return;
      }
      if (rctx.url.searchParams.get('all') !== '1') throw new HttpError(400, 'invalid_request', 'Gerät angeben: /api/devices/<id> (oder ?all=1 für alle)');
      const n = ctx.pairing.revokeAll();
      json(res, 200, { ok: true, revoked: n, devices: [] }, me ? clear : {});
    })
  );

  router.route(
    'GET',
    '/api/setup',
    auth.requireAuth(async (req, res, rctx) => {
      json(res, 200, setupInfo(ctx, req, { fresh: rctx.url.searchParams.get('new') === '1' }));
    })
  );
}

module.exports = { register, rankLanAddresses, detectDefaultRouteIp, lanState, pairingLinks, setupInfo, pairPage, NEXT_PAGES, PAIR_ATTEMPTS_PER_MIN };
