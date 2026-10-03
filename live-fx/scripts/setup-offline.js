#!/usr/bin/env node
// LiveFX – einmalige Einrichtung der Offline-Spracherkennung (Whisper im Browser).
//   node scripts/setup-offline.js [--model tiny|base] [--data <dir>] [--force]
// Step 1: fetch @huggingface/transformers from the npm registry (tarball) and copy dist/transformers.min.js
//         plus the ONNX runtime .wasm/.mjs files into <root>/vendor/.
// Step 2: download the quantised Whisper model files from huggingface.co into <data>/models/<repo>/.
// Zero dependencies (https + tar via child_process); idempotent: existing files are skipped.
// Exit codes: 0 ok, 1 download/extract error, 2 bad arguments.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REGISTRY_URL = 'https://registry.npmjs.org/@huggingface/transformers/latest';
const REPOS = {
  tiny: 'onnx-community/whisper-tiny',
  base: 'onnx-community/whisper-base',
};
const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

/** Files a whisper repo needs for `pipeline(..., {dtype:'q8'})`. */
function modelFiles(repo) {
  if (!repo || typeof repo !== 'string') throw new Error('modelFiles: repo fehlt');
  return MODEL_FILES.slice();
}

function fileUrl(repo, file) {
  return `https://huggingface.co/${repo}/resolve/main/${file}`;
}

function parseArgs(argv) {
  const o = { model: 'tiny', data: process.env.LIVEFX_DATA_DIR || path.join(ROOT, 'data'), force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') o.model = argv[++i];
    else if (a.startsWith('--model=')) o.model = a.slice(8);
    else if (a === '--data') o.data = argv[++i];
    else if (a.startsWith('--data=')) o.data = a.slice(7);
    else if (a === '--force') o.force = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else throw new Error(`Unbekanntes Argument: ${a}`);
  }
  if (!o.model || !REPOS[o.model]) throw new Error(`--model muss tiny oder base sein (nicht "${o.model}")`);
  if (!o.data) throw new Error('--data braucht einen Ordner');
  o.repo = REPOS[o.model];
  o.data = path.resolve(o.data);
  return o;
}

function usage() {
  return [
    'Verwendung: node scripts/setup-offline.js [--model tiny|base] [--data <ordner>] [--force]',
    '  --model  Whisper-Modell: tiny (≈ 40 MB, Standard) oder base (≈ 150 MB)',
    '  --data   Datenordner (Standard: data/ bzw. LIVEFX_DATA_DIR) – Modelle landen in <data>/models/',
    '  --force  vorhandene Dateien neu laden',
  ].join('\n');
}

function fmtMB(n) {
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** GET with redirects; `onData(bytes, total)` reports progress. Resolves with a Buffer or writes to `dest`. */
function download(url, { dest, onData, redirects = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'livefx-setup-offline' } }, (res) => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        if (redirects > 5) return reject(new Error(`Zu viele Weiterleitungen: ${url}`));
        const next = new URL(res.headers.location, url).toString();
        return resolve(download(next, { dest, onData, redirects: redirects + 1 }));
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${status} für ${url}`));
      }
      const total = Number(res.headers['content-length']) || 0;
      let got = 0;
      const chunks = [];
      const out = dest ? fs.createWriteStream(dest + '.part') : null;
      res.on('data', (c) => {
        got += c.length;
        if (out) out.write(c);
        else chunks.push(c);
        if (onData) onData(got, total);
      });
      res.on('error', reject);
      res.on('end', () => {
        if (!out) return resolve(Buffer.concat(chunks));
        out.end(() => {
          try {
            fs.renameSync(dest + '.part', dest);
            resolve(null);
          } catch (e) {
            reject(e);
          }
        });
      });
    });
    req.on('error', reject);
  });
}

function progressPrinter(label) {
  let last = 0;
  return (got, total) => {
    const t = Date.now();
    if (t - last < 500 && got !== total) return;
    last = t;
    const pct = total ? ` ${Math.round((got / total) * 100)} %` : '';
    process.stdout.write(`\r  ${label}: ${fmtMB(got)}${total ? ` / ${fmtMB(total)}` : ''}${pct}   `);
  };
}

async function downloadTo(url, dest, label, force) {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`  ${label}: vorhanden, übersprungen`);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await download(url, { dest, onData: progressPrinter(label) });
  process.stdout.write('\n');
  return true;
}

async function setupVendor(force) {
  const vendorDir = path.join(ROOT, 'vendor');
  const target = path.join(vendorDir, 'transformers.min.js');
  console.log('Schritt 1/2: transformers.js (Bibliothek) nach vendor/ …');
  if (!force && fs.existsSync(target)) {
    console.log('  vendor/transformers.min.js vorhanden, übersprungen (--force zum Neuladen)');
    return;
  }
  const meta = JSON.parse((await download(REGISTRY_URL)).toString('utf8'));
  const tarball = meta && meta.dist && meta.dist.tarball;
  if (!tarball) throw new Error('npm-Registry: keine Tarball-URL für @huggingface/transformers gefunden');
  console.log(`  Version ${meta.version} – lade ${tarball}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-offline-'));
  try {
    const tgz = path.join(tmp, 'transformers.tgz');
    await download(tarball, { dest: tgz, onData: progressPrinter('Paket') });
    process.stdout.write('\n');
    const r = spawnSync('tar', ['-xzf', tgz, '-C', tmp], { stdio: 'inherit' });
    if (r.error || r.status !== 0) throw new Error(`tar konnte das Paket nicht entpacken${r.error ? `: ${r.error.message}` : ''} (ist "tar" installiert?)`);
    const dist = path.join(tmp, 'package', 'dist');
    if (!fs.existsSync(path.join(dist, 'transformers.min.js'))) throw new Error('dist/transformers.min.js fehlt im Paket');
    fs.mkdirSync(vendorDir, { recursive: true });
    const files = fs.readdirSync(dist).filter((f) => f === 'transformers.min.js' || f.endsWith('.wasm') || f.endsWith('.mjs'));
    for (const f of files) {
      fs.copyFileSync(path.join(dist, f), path.join(vendorDir, f));
      console.log(`  kopiert: vendor/${f} (${fmtMB(fs.statSync(path.join(vendorDir, f)).size)})`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function setupModel(repo, dataDir, force) {
  console.log(`Schritt 2/2: Modell ${repo} nach ${path.join(dataDir, 'models', repo)} …`);
  for (const file of modelFiles(repo)) {
    await downloadTo(fileUrl(repo, file), path.join(dataDir, 'models', repo, file), file, force);
  }
}

async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(`Fehler: ${e.message}\n${usage()}`);
    return 2;
  }
  if (opts.help) {
    console.log(usage());
    return 0;
  }
  console.log(`LiveFX Offline-Erkennung einrichten (Modell: ${opts.model} → ${opts.repo})`);
  try {
    await setupVendor(opts.force);
    await setupModel(opts.repo, opts.data, opts.force);
  } catch (e) {
    console.error(`\nFehler: ${e.message}`);
    console.error('Braucht einmalig Internet. Einfach erneut starten – fertige Dateien werden übersprungen.');
    return 1;
  }
  console.log('\nFertig. Server starten (node server.js) und im Panel „Offline (Whisper, experimentell)“ wählen.');
  console.log('Details: docs/OFFLINE.md');
  return 0;
}

module.exports = { modelFiles, fileUrl, REPOS, MODEL_FILES, parseArgs, REGISTRY_URL };

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
