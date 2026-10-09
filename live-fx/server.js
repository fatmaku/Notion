#!/usr/bin/env node
// LiveFX server – composition root. Zero dependencies.
//
//   node server.js            -> http://127.0.0.1:8787  (2.3: also reachable in the WLAN – phones pair via QR code)
//   node server.js --open     -> same, and opens the panel in the default browser (the start/ launchers use it)
//   node server.js --local    -> only this PC (127.0.0.1), no phone access
//   node server.js --help     -> all options
//
// Serves the control panel + overlay, persists triggers and uploaded media under data/, relays
// effects from the panel (or external tools) to every overlay via Server-Sent Events, and hosts
// the optional smart (LLM) classifier. Route modules live in server/.
//
// Note: this file must stay parseable by old Node versions (no `??` / `?.`), so the version check below can
// print a German hint instead of a syntax error.
'use strict';

var NODE_MAJOR = Number(String(process.versions.node).split('.')[0]);
if (NODE_MAJOR < 20) {
  console.error('LiveFX braucht Node.js 20 oder neuer – installiert ist ' + process.version + '.');
  console.error('  Bitte die LTS-Version von https://nodejs.org/de/download installieren und LiveFX neu starten.');
  console.error('  Windows: winget install OpenJS.NodeJS.LTS   ·   macOS: brew install node   ·   Anleitung: docs/START.md');
  process.exit(1);
}

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const pkg = require('./package.json');

// ---------- command line ----------
const ARGS = process.argv.slice(2);
function argValue(name) {
  for (let i = 0; i < ARGS.length; i++) {
    if (ARGS[i] === name && ARGS[i + 1] !== undefined) return ARGS[i + 1];
    if (ARGS[i].startsWith(`${name}=`)) return ARGS[i].slice(name.length + 1);
  }
  return undefined;
}
const has = (flag) => ARGS.includes(flag);
if (has('--help') || has('-h')) {
  console.log(`LiveFX ${pkg.version} – node server.js [Optionen]

  --open         Panel nach dem Start im Browser öffnen
  --local        nur auf diesem PC erreichbar (127.0.0.1) – kein Handy-Zugriff
  --lan          im WLAN/LAN erreichbar (Standard; Handys koppeln per QR-Code)
  --port <n>     fester Port (Standard 8787)
  --no-qr        keinen QR-Code im Fenster zeigen

Umgebungsvariablen (für Fortgeschrittene): HOST, PORT, LIVEFX_DATA_DIR, LIVEFX_TOKEN, LIVEFX_TLS_CERT/KEY,
LIVEFX_NO_QR=1, LIVEFX_QR_ASCII=1, LIVEFX_QR_INVERT=1, LIVEFX_NO_BROWSER=1. Anleitung: docs/START.md`);
  process.exit(0);
}

const { Router, HttpError, json, error, safeUrl } = require('./server/router');
require('./js/triggers.js');
require('./js/schema.js');
require('./js/matcher.js');

const auth = require('./server/auth');
const stateMod = require('./server/state');
const sse = require('./server/sse');
const smartMod = require('./server/smart');
const pairingMod = require('./server/pairing');
const terminalQr = require('./server/terminal-qr');
const apiFire = require('./server/api-fire');
const apiTriggers = require('./server/api-triggers');
const apiAssets = require('./server/api-assets');
const apiGifs = require('./server/api-gifs');
const apiTranscript = require('./server/api-transcript');
const apiSmart = require('./server/api-smart');
const apiMobile = require('./server/api-mobile');
const apiChat = require('./server/api-chat');
const apiGift = require('./server/api-gift');
const apiTunnel = require('./server/api-tunnel');
const apiPairing = require('./server/api-pairing');
const staticFiles = require('./server/static');

const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.LIVEFX_DATA_DIR || path.join(ROOT, 'data'));
const DEFAULT_PORT = 8787;
// Bind address: --local / --lan win over HOST; default 2.3 = every interface (LAN), guarded by pairing (server/auth.js).
const HOST = has('--local') ? '127.0.0.1' : has('--lan') ? '0.0.0.0' : process.env.HOST || '0.0.0.0';
const PORT_ARG = argValue('--port');
const PORT_FIXED = PORT_ARG !== undefined || process.env.PORT !== undefined;
const SERVER_FILE = path.join(DATA_DIR, 'server.json'); // remembers a fallback port so OBS / phone links stay valid
const OPEN_BROWSER = has('--open') && !/^(1|true|yes)$/i.test(String(process.env.LIVEFX_NO_BROWSER || '')) && !process.env.CI;

const log = (...args) => console.log(new Date().toISOString(), ...args);

fs.mkdirSync(path.join(DATA_DIR, 'assets'), { recursive: true });

function readServerFile() {
  try {
    const d = JSON.parse(fs.readFileSync(SERVER_FILE, 'utf8'));
    return d && typeof d === 'object' ? d : {};
  } catch (_) {
    return {};
  }
}
function writeServerFile(patch) {
  try {
    const next = Object.assign(readServerFile(), patch);
    for (const k of Object.keys(next)) if (next[k] === null) delete next[k];
    fs.writeFileSync(SERVER_FILE, `${JSON.stringify(next, null, 2)}\n`);
  } catch (_) {
    /* best effort */
  }
}
function startPort() {
  if (PORT_ARG !== undefined) return Number(PORT_ARG);
  if (process.env.PORT !== undefined) return Number(process.env.PORT);
  const saved = Number(readServerFile().port);
  return Number.isInteger(saved) && saved > 1024 && saved < 65536 ? saved : DEFAULT_PORT;
}
const PORT = startPort();
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error(`Ungültiger Port: ${PORT_ARG !== undefined ? PORT_ARG : process.env.PORT} – eine Zahl zwischen 1024 und 65535 angeben, z. B. --port 8790`);
  process.exit(1);
}

/**
 * Optional TLS: both LIVEFX_TLS_CERT and LIVEFX_TLS_KEY must be set and readable (PEM). The phone's
 * microphone (getUserMedia / Web Speech) only works in a secure context, see docs/HANDY-HTTPS.md.
 * Returns null when TLS is not configured; exits with a German hint when the setup is half done.
 */
function loadTls() {
  const certPath = (process.env.LIVEFX_TLS_CERT || '').trim();
  const keyPath = (process.env.LIVEFX_TLS_KEY || '').trim();
  if (!certPath && !keyPath) return null;
  if (!certPath || !keyPath) {
    console.error('HTTPS-Konfiguration unvollständig: LIVEFX_TLS_CERT und LIVEFX_TLS_KEY müssen BEIDE gesetzt sein');
    console.error(`  LIVEFX_TLS_CERT=${certPath || '(fehlt)'}  LIVEFX_TLS_KEY=${keyPath || '(fehlt)'}`);
    console.error('  Anleitung: docs/HANDY-HTTPS.md (Zertifikat mit openssl erzeugen)');
    process.exit(1);
  }
  const read = (what, file) => {
    try {
      return fs.readFileSync(file);
    } catch (e) {
      console.error(`HTTPS-${what} nicht lesbar: ${file} (${e.message})`);
      console.error('  Anleitung: docs/HANDY-HTTPS.md (Zertifikat mit openssl erzeugen)');
      process.exit(1);
    }
    return null; // unreachable, keeps the linter's consistent-return happy
  };
  return { cert: read('Zertifikat (LIVEFX_TLS_CERT)', certPath), key: read('Schlüssel (LIVEFX_TLS_KEY)', keyPath) };
}
const tls = loadTls();

const config = { version: pkg.version, host: HOST, port: PORT, model: process.env.LIVEFX_MODEL || 'claude-opus-5-5', secure: !!tls, boundAddress: null };
const token = auth.loadOrCreateToken({ dataDir: DATA_DIR, log });
const state = stateMod.createState({ dataDir: DATA_DIR, defaults: globalThis.LiveFXDefaultTriggers, log });
const bus = sse.createSse({ state, log, version: pkg.version });
const smart = smartMod.createSmart({ log, model: config.model, getTriggers: () => state.getTriggers() });
const pairing = pairingMod.createPairing({ dataDir: DATA_DIR, log });
const appCtx = { bus, state, token, dataDir: DATA_DIR, rootDir: ROOT, config, smart, log, pairing, overlayKey: auth.overlayKeyFor(token), net: { defaultRouteIp: null } };
// Viewer triggers (2.0): chat connectors + gift tiers, settings in data/chat.json.
appCtx.chat = apiChat.createChat(appCtx);
// Panels learn about new / revoked phones live ("📱 Handy verbunden ✔").
pairing.onChange((e) => bus.broadcast({ type: 'pairing', ...e }, { audience: 'panel' }));

const router = new Router();
for (const mod of [auth, apiFire, apiTriggers, apiGifs, apiAssets, apiTranscript, apiSmart, apiMobile, apiChat, apiGift, apiTunnel, apiPairing, sse]) mod.register(router, appCtx);
router.route('GET', '/health', (req, res) => {
  // Devices that are not paired (WLAN, internet tunnel) only learn that LiveFX runs and which version.
  if (!auth.isLocal(req) && req.livefxAccess !== 'full') {
    json(res, 200, { ok: true, version: pkg.version });
    return;
  }
  const c = bus.counts();
  json(res, 200, { ok: true, version: pkg.version, overlays: c.overlays, panels: c.panels, devices: pairing.deviceCount, uptime: Math.round(process.uptime()) });
});
router.route('*', /^\/api\//, () => {
  throw new HttpError(404, 'not_found', 'unknown API route');
});
// index.html hands the legacy panel cookie (= token) to the browser on this PC only – never to the WLAN or the tunnel.
staticFiles.register({ route: (m, p, h) => router.route(m, p, (req, res, c) => h(req, res, auth.isLocal(req) ? c : { ...c, token: null })) }, appCtx);

function handleError(req, res, e) {
  const status = e instanceof HttpError ? e.status : 500;
  if (status >= 500) log('request failed:', req.method, req.url, e && e.stack ? e.stack : e);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  error(res, status, e instanceof HttpError ? e.code : 'internal', status >= 500 ? 'internal error' : e.message);
}

/** Removes the master token from a JSON answer (GET /api/config for paired phones / other PCs). */
function redactToken(res) {
  const writeHead = res.writeHead.bind(res);
  const end = res.end.bind(res);
  let head = null;
  res.writeHead = (status, headers) => {
    head = [status, headers];
    return res;
  };
  res.end = (body, ...rest) => {
    let out = body;
    try {
      const obj = JSON.parse(String(body));
      if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'token')) {
        delete obj.token;
        obj.tokenHidden = true; // the token is shown in the panel on the streaming PC only
        out = JSON.stringify(obj);
      }
    } catch (_) {
      /* not JSON */
    }
    if (head) {
      const h = { ...(head[1] || {}) };
      if (h['content-length'] !== undefined) h['content-length'] = Buffer.byteLength(out);
      writeHead(head[0], h);
    }
    return end(out, ...rest);
  };
}

function handler(req, res) {
  // DNS-rebinding guard for every route (reads included): only allowed Hosts, unless a valid Bearer is sent
  // (2.3: a rebound page can set any header on same-origin requests, so a mere Authorization header is not enough).
  const url = safeUrl(req);
  if (!url) {
    error(res, 400, 'bad_request', 'malformed URL or Host header');
    return;
  }
  if (!auth.hostAllowed(req) && !auth.bearerOk(req, token)) {
    error(res, 403, 'bad_host', 'Host-Header nicht erlaubt (LIVEFX_ALLOWED_HOSTS setzen)');
    return;
  }
  // 2.3: everything that is not this PC (WLAN devices, the internet tunnel) needs a paired-device cookie or a
  // Bearer – except the pairing page, public static files and /health (server/auth.js decide()).
  const access = auth.guard(req, res, appCtx);
  if (!access) return;
  req.livefxAccess = access.level;
  if (access.level !== 'local' && req.method === 'GET' && url.pathname === '/api/config') redactToken(res);
  router
    .dispatch(req, res, appCtx)
    .then((matched) => {
      if (!matched) error(res, 404, 'not_found', 'not found');
    })
    .catch((e) => handleError(req, res, e));
}
const server = tls ? https.createServer({ cert: tls.cert, key: tls.key }, handler) : http.createServer(handler);
server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.on('clientError', (e, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n');
  else socket.destroy();
});

// ---------- browser ----------
/** Opens `url` in the default browser (no dependency): Windows `start`, macOS `open`, Linux `xdg-open`. */
function openBrowser(url) {
  if (!/^https?:\/\/[0-9a-z.[\]:-]+(:\d+)?\/[\w./-]*$/i.test(url)) return; // our own panel URL only (no shell metacharacters)
  let cmd;
  let args;
  let opts = { stdio: 'ignore', detached: true, windowsHide: true };
  if (process.platform === 'win32') {
    cmd = 'cmd.exe';
    args = ['/d', '/s', '/c', `start "" "${url}"`];
    opts = { ...opts, windowsVerbatimArguments: true };
  } else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  try {
    const child = childProcess.spawn(cmd, args, opts);
    child.on('error', () => console.log(`  (Browser ließ sich nicht öffnen – bitte selbst ${url} aufrufen)`));
    child.unref();
  } catch (_) {
    console.log(`  (Browser ließ sich nicht öffnen – bitte selbst ${url} aufrufen)`);
  }
}

// ---------- port in use: LiveFX already running? ----------
/** Resolves the version string when a LiveFX answers /health on 127.0.0.1:<port>, else null. */
function probeLiveFx(port) {
  const tryOne = (mod, scheme) =>
    new Promise((resolve) => {
      const req = mod.get({ host: '127.0.0.1', port, path: '/health', timeout: 1500, rejectUnauthorized: false, headers: { host: `127.0.0.1:${port}` } }, (r) => {
        let body = '';
        r.setEncoding('utf8');
        r.on('data', (c) => {
          if (body.length < 4096) body += c;
        });
        r.on('end', () => {
          try {
            const d = JSON.parse(body);
            resolve(d && d.ok && typeof d.version === 'string' ? { version: d.version, scheme } : null);
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('timeout', () => req.destroy());
      req.on('error', () => resolve(null));
    });
  return tryOne(http, 'http').then((r) => r || tryOne(https, 'https'));
}

let port = PORT;
let portTries = 0;
server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE') {
    console.error('Server-Fehler:', e.message);
    if (e.code === 'EADDRNOTAVAIL') console.error(`  Die Adresse ${HOST} gibt es auf diesem PC nicht – ohne HOST starten (Standard: alle Netzwerke).`);
    process.exit(1);
  }
  probeLiveFx(port).then((running) => {
    if (running) {
      const url = `${running.scheme}://127.0.0.1:${port}/`;
      console.log(`LiveFX läuft schon (Version ${running.version}) – Panel: ${url}`);
      console.log('  Kein zweiter Start nötig. Zum Neustarten das andere LiveFX-Fenster schließen (oder dort Strg+C).');
      if (OPEN_BROWSER) openBrowser(url);
      setTimeout(() => process.exit(0), 300);
      return;
    }
    if (!PORT_FIXED && portTries < 20) {
      portTries++;
      console.log(`Port ${port} ist von einem anderen Programm belegt – versuche ${port + 1} …`);
      port += 1;
      setTimeout(() => server.listen(port, HOST), 50);
      return;
    }
    console.error(`Port ${port} ist schon belegt – anderen Port wählen: node server.js --port 8790`);
    process.exit(1);
  });
});
process.on('unhandledRejection', (e) => log('unhandled rejection:', e && e.stack ? e.stack : e));
process.on('uncaughtException', (e) => log('uncaught exception:', e && e.stack ? e.stack : e));
// Graceful shutdown on both signals: chat connectors close their sockets (no reconnect storm against
// Twitch / YouTube while we are going down), SSE clients are told goodbye, then the listener closes.
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    appCtx.chat.stop();
  } catch (e) {
    log('chat stop failed:', e.message);
  }
  try {
    pairing.flush();
  } catch (_) {
    /* best effort */
  }
  if (appCtx.tunnel) appCtx.tunnel.stop().catch(() => {});
  bus.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

smart.init().catch((e) => log('smart init failed:', e.message));

// ---------- start banner ----------
function printBanner(addr, base) {
  const lines = [];
  lines.push(`LiveFX läuft auf ${base}/`);
  lines.push(`  Control Panel:  ${base}/${OPEN_BROWSER ? '   (öffnet sich im Browser)' : ''}`);
  lines.push(`  OBS-Overlay:    ${base}/overlay.html   (hochkant: ${base}/overlay.html?layout=portrait)`);
  lines.push(`  Daten:          ${DATA_DIR}`);
  if (tls) lines.push('  HTTPS aktiv (LIVEFX_TLS_CERT/KEY) – Zertifikat auf dem Handy vertrauen, siehe docs/HANDY-HTTPS.md');
  if (port !== PORT) lines.push(`  Hinweis: Port ${PORT} war belegt, LiveFX nutzt jetzt ${port} – diese Adresse in Browser und OBS verwenden.`);
  else if (!PORT_FIXED && port !== DEFAULT_PORT) lines.push(`  Hinweis: LiveFX nutzt wie beim letzten Start Port ${port} (8787 war damals belegt) – passt zu den Adressen in OBS.`);
  const lan = apiPairing.lanState(appCtx);
  lines.push('');
  if (!lan.listening) {
    lines.push('  📱 Handy: aus – LiveFX ist nur auf diesem PC erreichbar (--local / HOST=127.0.0.1).');
    lines.push('     Fürs Handy normal starten (start/Start-LiveFX oder node server.js) und den QR-Code scannen.');
  } else if (!lan.best) {
    lines.push('  📱 Handy: kein WLAN/LAN gefunden. Unterwegs: im Panel „📱 Handy“ → „Internet-Link“.');
  } else {
    const code = pairing.create({ note: 'start' });
    const links = apiPairing.pairingLinks(appCtx, code);
    const opts = terminalQr.options({ env: process.env, stream: process.stdout });
    const showQr = opts.enabled && !has('--no-qr');
    lines.push(`  📱 Handy koppeln${showQr ? ' – QR-Code mit der Handy-Kamera scannen' : ''} (Handy im selben WLAN):`);
    if (showQr) {
      try {
        lines.push(terminalQr.render(links.lanUrl, { ...opts, indent: '    ' }));
      } catch (e) {
        lines.push(`    (QR-Code nicht darstellbar: ${e.message})`);
      }
    }
    const spaced = `${code.code.slice(0, 3)} ${code.code.slice(3)}`;
    lines.push(`  Oder am Handy ${links.manualUrl} öffnen und den Code ${spaced} eingeben (gültig 10 Minuten).`);
    lines.push('  Neuer QR-Code jederzeit im Panel unter „📱 Handy“. Anderes Netz? Im Panel auf ‚Internet-Link‘ klicken.');
    const others = lan.ips.slice(1).map((i) => i.address);
    if (others.length) lines.push(`  Weitere Adressen dieses PCs: ${others.join(', ')} (falls das Handy die erste nicht erreicht)`);
    lines.push(`  OBS auf einem anderen PC: ${(appCtx.config.secure ? 'https' : 'http')}://${lan.best}:${addr.port}/overlay.html?key=${appCtx.overlayKey}`);
    if (process.platform === 'win32') lines.push('  Windows-Firewall fragt? „Zugriff zulassen“ (private Netzwerke) klicken – sonst findet das Handy den PC nicht.');
  }
  lines.push('  Beenden: Strg+C (oder dieses Fenster schließen).');
  console.log(lines.join('\n'));
}

server.on('listening', async () => {
  const addr = server.address();
  config.port = addr.port; // the bound port (may differ from PORT after the fallback or with PORT=0)
  config.boundAddress = addr.address;
  if (!PORT_FIXED) {
    const keep = addr.port === DEFAULT_PORT ? undefined : addr.port;
    if (readServerFile().port !== keep) writeServerFile({ port: keep === undefined ? null : keep });
  }
  const shownHost = addr.address === '0.0.0.0' || addr.address === '::' || /^127\./.test(addr.address) ? '127.0.0.1' : addr.address;
  const base = `${tls ? 'https' : 'http'}://${shownHost}:${addr.port}`;
  const lanOn = apiPairing.lanState(appCtx).listening;
  if (lanOn) appCtx.net.defaultRouteIp = await apiPairing.detectDefaultRouteIp().catch(() => null);
  printBanner(addr, base);
  if (OPEN_BROWSER) openBrowser(`${base}/`);
});
server.listen(port, HOST);
