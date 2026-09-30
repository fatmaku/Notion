#!/usr/bin/env node
// LiveFX server – composition root. Zero dependencies.
//
//   node server.js            -> http://127.0.0.1:8787
//
// Serves the control panel + overlay, persists triggers and uploaded media under data/, relays
// effects from the panel (or external tools) to every overlay via Server-Sent Events, and hosts
// the optional smart (LLM) classifier. Route modules live in server/.
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const { Router, HttpError, json, error, safeUrl } = require('./server/router');
require('./js/triggers.js');
require('./js/schema.js');
require('./js/matcher.js');

const auth = require('./server/auth');
const stateMod = require('./server/state');
const sse = require('./server/sse');
const smartMod = require('./server/smart');
const apiFire = require('./server/api-fire');
const apiTriggers = require('./server/api-triggers');
const apiAssets = require('./server/api-assets');
const apiGifs = require('./server/api-gifs');
const apiTranscript = require('./server/api-transcript');
const apiSmart = require('./server/api-smart');
const apiMobile = require('./server/api-mobile');
const staticFiles = require('./server/static');

const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.LIVEFX_DATA_DIR || path.join(ROOT, 'data'));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT ?? 8787);

const log = (...args) => console.log(new Date().toISOString(), ...args);

fs.mkdirSync(path.join(DATA_DIR, 'assets'), { recursive: true });

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

const config = { version: pkg.version, host: HOST, port: PORT, model: process.env.LIVEFX_MODEL || 'claude-opus-5-5', secure: !!tls };
const token = auth.loadOrCreateToken({ dataDir: DATA_DIR, log });
const state = stateMod.createState({ dataDir: DATA_DIR, defaults: globalThis.LiveFXDefaultTriggers, log });
const bus = sse.createSse({ state, log, version: pkg.version });
const smart = smartMod.createSmart({ log, model: config.model, getTriggers: () => state.getTriggers() });
const appCtx = { bus, state, token, dataDir: DATA_DIR, rootDir: ROOT, config, smart, log };

const router = new Router();
for (const mod of [auth, apiFire, apiTriggers, apiGifs, apiAssets, apiTranscript, apiSmart, apiMobile, sse]) mod.register(router, appCtx);
router.route('GET', '/health', (req, res) => {
  const c = bus.counts();
  json(res, 200, { ok: true, version: pkg.version, overlays: c.overlays, panels: c.panels, uptime: Math.round(process.uptime()) });
});
router.route('*', /^\/api\//, () => {
  throw new HttpError(404, 'not_found', 'unknown API route');
});
staticFiles.register(router, appCtx);

function handleError(req, res, e) {
  const status = e instanceof HttpError ? e.status : 500;
  if (status >= 500) log('request failed:', req.method, req.url, e && e.stack ? e.stack : e);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  error(res, status, e instanceof HttpError ? e.code : 'internal', status >= 500 ? 'internal error' : e.message);
}

function handler(req, res) {
  // DNS-rebinding guard for every route (reads included): only allowed Hosts, unless a Bearer is sent.
  if (!safeUrl(req)) {
    error(res, 400, 'bad_request', 'malformed URL or Host header');
    return;
  }
  if (!auth.hostAllowed(req) && !req.headers.authorization) {
    error(res, 403, 'bad_host', 'Host-Header nicht erlaubt (LIVEFX_ALLOWED_HOSTS setzen)');
    return;
  }
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
// When the default port is taken (another app on 8787), walk up to the next free one.
const PORT_FIXED = process.env.PORT !== undefined;
let port = PORT;
let portTries = 0;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && !PORT_FIXED && portTries < 20) {
    portTries++;
    console.log(`Port ${port} ist belegt (anderes Programm) – versuche ${port + 1} …`);
    port += 1;
    setTimeout(() => server.listen(port, HOST), 50);
    return;
  }
  if (e.code === 'EADDRINUSE') console.error(`Port ${port} ist schon belegt – anderen Port wählen: PORT=8790 node server.js`);
  else console.error('Server-Fehler:', e.message);
  process.exit(1);
});
process.on('unhandledRejection', (e) => log('unhandled rejection:', e && e.stack ? e.stack : e));
process.on('uncaughtException', (e) => log('uncaught exception:', e && e.stack ? e.stack : e));
process.on('SIGINT', () => {
  bus.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
});
process.on('SIGTERM', () => process.exit(0));

smart.init().catch((e) => log('smart init failed:', e.message));

server.on('listening', () => {
  const addr = server.address();
  const shownHost = addr.address === '0.0.0.0' || addr.address === '::' ? '127.0.0.1' : addr.address;
  const base = `${tls ? 'https' : 'http'}://${shownHost}:${addr.port}`;
  config.port = addr.port; // the bound port (may differ from PORT after the fallback or with PORT=0)
  console.log(`LiveFX läuft auf ${base}/`);
  console.log(`  Control Panel:  ${base}/`);
  console.log(`  OBS-Overlay:    ${base}/overlay.html   (hochkant: ${base}/overlay.html?layout=portrait)`);
  console.log(`  Daten:          ${DATA_DIR}`);
  console.log(`  Handy:          ${base}/m?token=…   (Link steht in der Karte „Handy“ im Panel)`);
  if (tls) console.log('  HTTPS aktiv (LIVEFX_TLS_CERT/KEY) – Zertifikat auf dem Handy vertrauen, siehe docs/HANDY-HTTPS.md');
  if (HOST === '127.0.0.1') console.log('  Nur lokal erreichbar. Für OBS/Handy auf einem anderen Gerät: HOST=0.0.0.0 node server.js');
  if (port !== PORT) console.log(`  Hinweis: Port ${PORT} war belegt, LiveFX nutzt jetzt ${port} – diese Adresse in Browser und OBS verwenden.`);
});
server.listen(port, HOST);
