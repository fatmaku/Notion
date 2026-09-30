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
const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const { Router, HttpError, json, error } = require('./server/router');
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
const apiTranscript = require('./server/api-transcript');
const apiSmart = require('./server/api-smart');
const staticFiles = require('./server/static');

const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.LIVEFX_DATA_DIR || path.join(ROOT, 'data'));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT ?? 8787);

const log = (...args) => console.log(new Date().toISOString(), ...args);

fs.mkdirSync(path.join(DATA_DIR, 'assets'), { recursive: true });

const config = { version: pkg.version, host: HOST, port: PORT, model: process.env.LIVEFX_MODEL || 'claude-opus-5-5' };
const token = auth.loadOrCreateToken({ dataDir: DATA_DIR, log });
const state = stateMod.createState({ dataDir: DATA_DIR, defaults: globalThis.LiveFXDefaultTriggers, log });
const bus = sse.createSse({ state, log, version: pkg.version });
const smart = smartMod.createSmart({ log, model: config.model, getTriggers: () => state.getTriggers() });
const appCtx = { bus, state, token, dataDir: DATA_DIR, rootDir: ROOT, config, smart, log };

const router = new Router();
for (const mod of [auth, apiFire, apiTriggers, apiAssets, apiTranscript, apiSmart, sse]) mod.register(router, appCtx);
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

const server = http.createServer((req, res) => {
  router
    .dispatch(req, res, appCtx)
    .then((matched) => {
      if (!matched) error(res, 404, 'not_found', 'not found');
    })
    .catch((e) => handleError(req, res, e));
});
server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.on('clientError', (e, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n');
  else socket.destroy();
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} ist schon belegt – anderen Port wählen: PORT=8788 node server.js`);
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

server.listen(PORT, HOST, () => {
  const addr = server.address();
  const shownHost = addr.address === '0.0.0.0' || addr.address === '::' ? '127.0.0.1' : addr.address;
  const base = `http://${shownHost}:${addr.port}`;
  console.log(`LiveFX läuft auf ${base}/`);
  console.log(`  Control Panel:  ${base}/`);
  console.log(`  OBS-Overlay:    ${base}/overlay.html   (hochkant: ${base}/overlay.html?layout=portrait)`);
  console.log(`  Daten:          ${DATA_DIR}`);
  if (HOST === '127.0.0.1') console.log('  Nur lokal erreichbar. Für OBS auf einem anderen PC: HOST=0.0.0.0 node server.js');
});
