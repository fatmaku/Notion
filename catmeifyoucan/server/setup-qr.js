#!/usr/bin/env node
// Cat Me If You Can – Einrichtungs-QR im Terminal (Erweiterung qr-setup). Liegt unter server/, damit es
// im Docker-Image ist. Aufruf (deploy/kur.sh und deploy/qr.sh machen das per docker compose exec):
//
//   node server/setup-qr.js admin [--base https://domain]   Admin-Gerät koppeln (10 Minuten, einmal)
//   node server/setup-qr.js partner <placeId>               Café-Handy einrichten (7 Tage, einmal)
//   node server/setup-qr.js partner                         Cafés auflisten (ID, Name, PIN gesetzt?)
//   node server/setup-qr.js volunteer [n]                   Freiwillige einladen (7 Tage, n = 1–50)
//   Türkisch geht auch: yonetim · kafe · gonullu. Optionen: --plain (ohne Farben), --json, --base URL
//
// Bevorzugt fragt es die laufende App auf 127.0.0.1:$PORT mit dem ADMIN_TOKEN aus der Umgebung (oder
// $CATME_DATA/admin-token.txt). Nur wenn dort nichts läuft (Verbindung abgelehnt), schreibt es den Code
// direkt ins Journal ($CATME_DATA/journal.jsonl, nur anhängen – nichts wird überschrieben); die App
// liest ihn beim nächsten Start. Mit --online nie ins Journal (deploy/qr.sh, wenn der Container läuft:
// die App startet vielleicht gerade und verdichtet das Journal) – dann kurz warten und nochmal fragen.
// Im QR-Code steht nie der ADMIN_TOKEN, nur ein Einmal-Code; ausgegeben wird er auch nie.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { MemoryStore } from '../public/core/store.js';
import { createSetupStore, adminEpoch, LINK_PATHS, PURPOSES } from './setup-codes.js';
import { qrMatrix, renderTerminalQr } from './terminal-qr.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const ALIASES = { admin: 'admin', yonetim: 'admin', 'yönetim': 'admin', partner: 'partner', kafe: 'partner', cafe: 'partner', volunteer: 'volunteer', gonullu: 'volunteer', 'gönüllü': 'volunteer' };
const HINT = {
  admin: 'Telefonun kamerasıyla okutun: yönetim sayfası açılır, giriş yapılmış olur.',
  partner: 'Kafenin telefonuyla okutun: kafe kendi PIN kodunu seçer ve hemen kullanır.',
  volunteer: 'Gönüllü telefonuyla okutur: takma ad seçer ve gönüllü olur.',
};

export class CliError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.exitCode = code;
  }
}

const USAGE = `Kullanım:
  node server/setup-qr.js admin [--base https://alan-adi]   yönetim için QR (10 dakika, tek kullanım)
  node server/setup-qr.js kafe <kafe-id>                    kafe telefonu için QR (7 gün, tek kullanım)
  node server/setup-qr.js kafe                              kafelerin listesi
  node server/setup-qr.js gonullu [kişi]                    gönüllü daveti (7 gün, 1–50 kişi)
Seçenekler: --plain (renksiz) · --json · --base <adres>`;

export function parseArgs(argv) {
  const o = { purpose: null, placeId: null, maxUses: undefined, base: null, plain: false, json: false, invert: false, online: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') o.base = argv[++i] || '';
    else if (a.startsWith('--base=')) o.base = a.slice(7);
    else if (a === '--plain' || a === '--renksiz') o.plain = true;
    else if (a === '--invert') o.invert = true;
    else if (a === '--json') o.json = true;
    else if (a === '--online') o.online = true;
    else if (a === '-h' || a === '--help' || a === 'yardim' || a === 'yardım') throw new CliError(USAGE, 0);
    else if (a.startsWith('-')) throw new CliError(`Bilinmeyen seçenek: ${a}\n${USAGE}`, 2);
    else rest.push(a);
  }
  o.purpose = ALIASES[String(rest[0] || 'admin').toLowerCase()] || null;
  if (!o.purpose) throw new CliError(`Bilinmeyen seçim: ${rest[0]}\n${USAGE}`, 2);
  if (o.purpose === 'partner') {
    if (rest[1] && !/^[A-Za-z0-9_-]{1,64}$/.test(rest[1])) throw new CliError('Kafe numarası (ID) geçersiz.', 2);
    o.placeId = rest[1] || null;
  } else if (o.purpose === 'volunteer' && rest[1] !== undefined) {
    const n = Number(rest[1]);
    if (!Number.isInteger(n) || n < 1 || n > PURPOSES.volunteer.maxUses) throw new CliError('Kişi sayısı 1 ile 50 arasında olmalı.', 2);
    o.maxUses = n;
  }
  if (rest.length > 2) throw new CliError(`Fazla bilgi verildi.\n${USAGE}`, 2);
  if (o.base !== null) {
    let u;
    try {
      u = new URL(o.base);
    } catch {
      u = null;
    }
    if (!u || !/^https?:$/.test(u.protocol)) throw new CliError('--base bir adres olmalı, ör. https://kedi.ornek.com', 2);
    o.base = `${u.origin}${u.pathname}`.replace(/\/+$/, '');
  }
  return o;
}

const dataDir = (env) => path.resolve(env.CATME_DATA || path.join(ROOT, 'data'));

function adminToken(env) {
  if (env.ADMIN_TOKEN) return env.ADMIN_TOKEN;
  try {
    return fs.readFileSync(path.join(dataDir(env), 'admin-token.txt'), 'utf8').trim();
  } catch {
    return '';
  }
}

/** Anfrage an die laufende App auf 127.0.0.1. Verbindung abgelehnt → { down: true }. */
function callApp(env, method, pathname, body) {
  const port = Number(env.PORT) || 8790;
  const tls = !!(env.CATME_TLS_CERT && env.CATME_TLS_KEY);
  const lib = tls ? https : http;
  const data = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = lib.request({
      host: '127.0.0.1',
      port,
      path: pathname,
      method,
      rejectUnauthorized: false, // nur 127.0.0.1 (eigenes Zertifikat passt nicht zu dieser Adresse)
      headers: {
        Authorization: `Bearer ${adminToken(env)}`,
        'User-Agent': 'catme-setup-qr',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 8000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          /* kein JSON */
        }
        resolve({ status: res.statusCode, data: json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => (e.code === 'ECONNREFUSED' ? resolve({ down: true }) : reject(e)));
    req.end(data);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** --online: App startet vielleicht gerade (Container läuft, Port noch zu) → bis ~10 s nachfragen. */
async function callAppOnline(env, method, pathname, body, { tries = Math.max(1, Number(env.CATME_QR_RETRIES) || 20), waitMs = 500 } = {}) {
  for (let i = 0; ; i++) {
    const r = await callApp(env, method, pathname, body);
    if (!r.down) return r;
    if (i >= tries - 1) throw new CliError('Uygulama yanıt vermiyor. Birkaç saniye sonra tekrar deneyin: bash deploy/qr.sh');
    await sleep(waitMs);
  }
}

function apiError(r) {
  const code = r.data && r.data.error;
  if (r.status === 403 || r.status === 401) return new CliError('ADMIN_TOKEN kabul edilmedi. Uygulamanın kullandığı anahtarla çalıştırın (deploy/.env).');
  if (code === 'cafe_not_ready') return new CliError('Bu kafe bulunamadı ya da onaylı/aktif değil. Liste: node server/setup-qr.js kafe');
  if (code === 'rate_limited') return new CliError('Çok fazla deneme – bir dakika bekleyin.');
  return new CliError(`Sunucu hatası (${r.status}${code ? `, ${code}` : ''}).`);
}

// ---------------------------------------------------------------- App aus: direkt ins Journal

/** Snapshot + Journal nur lesen (nichts verdichten); neue Einträge werden ans Journal angehängt. */
function openStoreAppendOnly(dir) {
  const snap = path.join(dir, 'snapshot.json');
  const journal = path.join(dir, 'journal.jsonl');
  if (!fs.existsSync(snap) && !fs.existsSync(journal)) throw new CliError(`Veri klasörü boş ya da yok: ${dir} (CATME_DATA). Uygulama hiç başlamadı mı?`);
  const store = new MemoryStore();
  if (fs.existsSync(snap)) store.load(JSON.parse(fs.readFileSync(snap, 'utf8')));
  let text = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8') : '';
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      store.apply(JSON.parse(line));
    } catch {
      /* halbe Zeile */
    }
  }
  let needsNewline = text.length > 0 && !text.endsWith('\n'); // halbe letzte Zeile nicht verlängern
  text = null;
  store.onChange = (entry) => {
    fs.appendFileSync(journal, `${needsNewline ? '\n' : ''}${JSON.stringify(entry)}\n`);
    needsNewline = false;
  };
  return store;
}

const readyCafe = (p) => p && p.type === 'partner' && p.status === 'approved' && p.active !== false;

function cafesFromStore(store) {
  return store.places.all().filter(readyCafe).map((p) => ({ id: p.id, name: p.name, address: p.address || '', hasPin: !!p.pinHash }));
}

// ---------------------------------------------------------------- Ausgabe

function fmtUntil(ts) {
  try {
    return new Date(ts).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toISOString();
  }
}

function validity(c) {
  const mins = Math.round((c.expiresAt - c.createdAt) / 60000);
  const span = mins < 120 ? `${mins} dakika` : `${Math.round(mins / 1440)} gün`;
  const uses = c.maxUses > 1 ? `${c.maxUses} kişi kullanabilir` : 'tek kullanımlık';
  return `${span} geçerli · son: ${fmtUntil(c.expiresAt)} (İstanbul saati) · ${uses}`;
}

export function printCode(c, url, { plain = false, invert = false, out = process.stdout, localWarn = false, offline = false } = {}) {
  const lines = renderTerminalQr(qrMatrix(url), { mode: plain ? 'plain' : 'ansi', invert });
  const w = (s = '') => out.write(`${s}\n`);
  // Hinweis über dem QR (wird zuerst gelesen); kur.sh und qr.sh sagen ihn nicht noch einmal
  w();
  w(`  ▸ ${HINT[c.purpose]}`);
  if (c.placeName) w(`    Kafe: ${c.placeName}`);
  for (const l of lines) w(l);
  w();
  w(`  Bağlantı:  ${url}`);
  w(`  Süre:      ${validity(c)}`);
  if (localWarn) w('  ! Bu adres sadece bu sunucuda açılır. Telefon için: --base https://alan-adiniz');
  if (offline) w('  (Uygulama kapalıydı: kod veri klasörüne yazıldı, uygulama açılınca geçerli olur.)');
  w();
}

function printCafes(list, out = process.stdout) {
  const w = (s = '') => out.write(`${s}\n`);
  if (!list.length) {
    w('Onaylı ve aktif kafe yok. Önce yönetim sayfasında bir partner kafe ekleyin.');
    return;
  }
  w('Kafeler (kurulum QR\'ı için: kafe <ID>):');
  for (const c of list) w(`  ${c.id.padEnd(22)} ${c.name}${c.address ? ` – ${c.address}` : ''}${c.hasPin ? '' : '  (PIN henüz yok)'}`);
}

// ---------------------------------------------------------------- Ablauf

export async function run(argv, { env = process.env, out = process.stdout } = {}) {
  const o = parseArgs(argv);
  if (env.NO_COLOR) o.plain = true;
  const local = `http://127.0.0.1:${Number(env.PORT) || 8790}`;
  const publicBase = String(env.CATME_PUBLIC_URL || '').replace(/\/+$/, '');

  const ask = o.online ? callAppOnline : callApp;
  // Café ohne ID → Liste
  if (o.purpose === 'partner' && !o.placeId) {
    const r = await ask(env, 'GET', '/api/admin/places');
    let list;
    if (r.down) list = cafesFromStore(openStoreAppendOnly(dataDir(env)));
    else if (r.status !== 200) throw apiError(r);
    else list = r.data.filter((p) => p.type === 'partner' && p.status === 'approved' && p.active !== false).map((p) => ({ id: p.id, name: p.name, address: p.address, hasPin: p.hasPin !== false }));
    if (o.json) out.write(`${JSON.stringify(list)}\n`);
    else printCafes(list, out);
    return { list };
  }

  let created;
  let offline = false;
  const r = await ask(env, 'POST', '/api/admin/setup-codes', { purpose: o.purpose, placeId: o.placeId || undefined, maxUses: o.maxUses, via: 'terminal' });
  if (r.down) {
    // App läuft nicht → direkt ins Journal (nur anhängen); die App spielt es beim Start ein
    const store = openStoreAppendOnly(dataDir(env));
    let placeName = null;
    if (o.purpose === 'partner') {
      const p = store.places.get(o.placeId);
      if (!readyCafe(p)) throw new CliError('Bu kafe bulunamadı ya da onaylı/aktif değil. Liste: node server/setup-qr.js kafe');
      placeName = p.name;
    }
    // gehört dem ADMIN_TOKEN (wie bei der laufenden App) – ohne Token kein Code
    const epoch = adminEpoch(adminToken(env));
    if (!epoch) throw new CliError('ADMIN_TOKEN bulunamadı (ortam değişkeni ya da veri klasöründe admin-token.txt).');
    const setup = createSetupStore({ store, epoch });
    const { doc, code } = setup.create({ purpose: o.purpose, placeId: o.placeId, maxUses: o.maxUses, owner: 'master', createdBy: 'terminal', via: 'terminal' });
    if (o.purpose === 'partner') setup.revokeOthers(doc);
    created = { ...doc, placeName, code, path: `/${LINK_PATHS[o.purpose]}${code}`, url: null };
    delete created.codeHash;
    delete created.epoch;
    offline = true;
  } else if (r.status !== 201) {
    throw apiError(r);
  } else {
    created = r.data;
  }
  const base = o.base || (created.url ? null : publicBase) || null;
  const url = base ? `${base}${created.path}` : created.url || `${local}${created.path}`;
  const localWarn = !o.base && !created.url && !publicBase;
  if (o.json) {
    out.write(`${JSON.stringify({ purpose: created.purpose, url, expiresAt: created.expiresAt, maxUses: created.maxUses, placeId: created.placeId || null, placeName: created.placeName || null, offline })}\n`);
  } else {
    printCode(created, url, { plain: o.plain, invert: o.invert, out, localWarn, offline });
  }
  return { url, created, offline };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((e) => {
    if (e instanceof CliError) {
      (e.exitCode === 0 ? process.stdout : process.stderr).write(`${e.message}\n`);
      process.exit(e.exitCode);
    }
    process.stderr.write(`Hata: ${e && e.message ? e.message : e}\n`);
    process.exit(1);
  });
}
