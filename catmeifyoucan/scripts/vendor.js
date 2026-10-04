#!/usr/bin/env node
// Cat Me If You Can – Fremdbibliotheken nach public/vendor kopieren (nach `npm install`).
//   node scripts/vendor.js        Leaflet, QR-Erzeugung, QR-Scanner (liegen schon im Repo)
//   node scripts/vendor.js --ar   zusätzlich TensorFlow.js + COCO-SSD lokal (sonst lädt die App sie vom CDN)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const out = path.join(root, 'public', 'vendor');
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  ', path.relative(root, to));
}

const leaflet = pkgDir('leaflet');
copy(path.join(leaflet, 'dist', 'leaflet.js'), path.join(out, 'leaflet', 'leaflet.js'));
copy(path.join(leaflet, 'dist', 'leaflet.css'), path.join(out, 'leaflet', 'leaflet.css'));
for (const f of fs.readdirSync(path.join(leaflet, 'dist', 'images'))) copy(path.join(leaflet, 'dist', 'images', f), path.join(out, 'leaflet', 'images', f));
copy(path.join(pkgDir('qrcode-generator'), 'qrcode.js'), path.join(out, 'qrcode.js'));
copy(path.join(pkgDir('jsqr'), 'dist', 'jsQR.js'), path.join(out, 'jsQR.js'));

if (process.argv.includes('--ar')) {
  copy(path.join(pkgDir('@tensorflow/tfjs'), 'dist', 'tf.min.js'), path.join(out, 'ar', 'tf.min.js'));
  copy(path.join(pkgDir('@tensorflow-models/coco-ssd'), 'dist', 'coco-ssd.min.js'), path.join(out, 'ar', 'coco-ssd.min.js'));
  console.log('AR lokal: Der Server liefert TF.js/COCO-SSD jetzt selbst aus (Modellgewichte kommen weiter von storage.googleapis.com).');
}
