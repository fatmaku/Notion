// Cat Me If You Can – QR-Code im Terminal (für server/setup-qr.js, deploy/kur.sh, deploy/qr.sh).
//
// Benutzt denselben QR-Erzeuger wie die Seiten (public/vendor/qrcode.js, qrcode-generator, MIT) – er
// liegt im Docker-Image, braucht also keine weitere Abhängigkeit. Gezeichnet wird mit Halbblöcken
// (▀ ▄ █): ein Zeichen = 1 Modul breit, 2 Module hoch – Terminalzellen sind etwa doppelt so hoch wie
// breit, die Module werden also fast quadratisch. Ruhezone: 4 Module rundherum (Norm).
//
// Zwei Arten:
//   ansi  (Standard) – feste Farben: schwarze Module auf hellweißem Grund (ESC[30;107m). Sieht auf
//         dunklen und hellen Terminals gleich aus, weil die Farben nicht vom Terminal-Thema abhängen.
//   plain (NO_COLOR / --plain) – ohne Farben: helle Module als █, dunkle als Leerzeichen. Auf einem
//         dunklen Terminal ist das ein normaler QR-Code; auf einem hellen ein invertierter, den die
//         meisten Kamera-Apps auch lesen. Mit invert: true umgekehrt.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(here, '..', 'public', 'vendor', 'qrcode.js');

let qrcodeLib = null;
/** qrcode-generator aus public/vendor laden (UMD-Skript, deshalb in einer eigenen vm-Umgebung). */
export function loadQrLib(file = VENDOR) {
  if (qrcodeLib) return qrcodeLib;
  const sandbox = {};
  vm.runInNewContext(`${fs.readFileSync(file, 'utf8')}\n;this.qrcode = qrcode;`, sandbox, { filename: 'qrcode.js' });
  if (typeof sandbox.qrcode !== 'function') throw new Error('public/vendor/qrcode.js: qrcode() fehlt');
  qrcodeLib = sandbox.qrcode;
  return qrcodeLib;
}

/** Modul-Matrix (true = dunkel) für einen Text. ECC M: kleiner als Q, für einen Bildschirm reicht das. */
export function qrMatrix(text, { ecc = 'M' } = {}) {
  const qrcode = loadQrLib();
  const qr = qrcode(0, ecc);
  qr.addData(String(text), 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const rows = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) row.push(qr.isDark(y, x));
    rows.push(row);
  }
  return rows;
}

export const ANSI_ON = '\x1b[30;107m';
export const ANSI_OFF = '\x1b[0m';

/**
 * Matrix → Zeilen für das Terminal.
 * @param {boolean[][]} matrix  true = dunkles Modul
 * @param {{mode?: 'ansi'|'plain', quiet?: number, invert?: boolean, indent?: string}} o
 */
export function renderTerminalQr(matrix, { mode = 'ansi', quiet = 4, invert = false, indent = '  ' } = {}) {
  const n = matrix.length;
  const size = n + 2 * quiet;
  const dark = (y, x) => {
    const yy = y - quiet;
    const xx = x - quiet;
    return yy >= 0 && xx >= 0 && yy < n && xx < n && matrix[yy][xx];
  };
  // „ink“ = das, was als Zeichen gemalt wird: ansi → dunkle Module (Vordergrund schwarz);
  // plain → helle Module (Vordergrund des Terminals, meist hell), invert → dunkle Module
  const ink = mode === 'ansi' ? (y, x) => y < size && dark(y, x) : (y, x) => y < size && (invert ? dark(y, x) : !dark(y, x));
  const lines = [];
  for (let y = 0; y < size; y += 2) {
    let s = '';
    for (let x = 0; x < size; x++) {
      const top = ink(y, x);
      const bottom = y + 1 < size ? ink(y + 1, x) : mode === 'ansi' ? false : !invert; // Rand unten = hell
      s += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    lines.push(mode === 'ansi' ? `${indent}${ANSI_ON}${s}${ANSI_OFF}` : `${indent}${s}`);
  }
  return lines;
}
