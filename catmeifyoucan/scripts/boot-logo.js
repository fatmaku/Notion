#!/usr/bin/env node
// Cat Me If You Can – Lade-Logo in app.html aus icons/logo.svg erzeugen (Erweiterung perf).
// Das Logo steht dort als data:-URL: keine Anfrage, sofort sichtbar (wichtig auf schwachem Netz).
// Nach jeder Änderung an icons/logo.svg einmal laufen lassen:  node scripts/boot-logo.js
// test/perf.test.js prüft, dass beide gleich sind.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Kommentare, Titel und Leerraum raus – die Zeichnung bleibt gleich. */
export function bootLogoSvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/g, '')
    .replace(/ role="img" aria-labelledby="t"/, '')
    .replace(/>\s+</g, '><')
    .trim();
}

export function bootLogoDataUrl(svg) {
  const min = bootLogoSvg(svg);
  return `data:image/svg+xml,${min.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, '%22')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(pub, 'app.html');
  const html = fs.readFileSync(file, 'utf8');
  const url = bootLogoDataUrl(fs.readFileSync(path.join(pub, 'icons', 'logo.svg'), 'utf8'));
  const next = html.replace(/(<div class="boot"><img src=")[^"]*(")/, `$1${url}$2`);
  if (next === html) console.log('app.html ist schon aktuell');
  else {
    fs.writeFileSync(file, next);
    console.log('app.html: Lade-Logo erneuert');
  }
}
