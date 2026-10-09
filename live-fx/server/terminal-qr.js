// LiveFX – QR code in the terminal (2.3): the start window shows the phone pairing link as a QR code, drawn with
// the panel's own encoder (js/qr.js, UMD) – no dependency, nothing leaves the PC.
//
//   render(text, { mode: 'unicode' | 'ascii', color, invert, margin, indent }) → multi-line string
//   options({ env, stream, platform, release })                          → { enabled, mode, color, invert }
//   parse(block, { mode, invert })                                         → { size, modules } (tests / diagnostics)
//
// unicode: two modules per character cell with the half blocks ▀ ▄ █ and spaces (a 33-module code is 17 lines).
// ascii:   "##" / "  " per module and one line per module row – for the legacy Windows console (before Windows 10)
//          and LIVEFX_QR_ASCII=1.
// Dark terminals: with colour (a TTY without NO_COLOR) every line is printed black on white, so the code is correct
// on any theme. Without colour the glyphs draw the LIGHT modules (light text on a dark background = a normal QR);
// LIVEFX_QR_INVERT=1 flips that for light terminals. Quiet zone: 2 modules. LIVEFX_NO_QR=1 turns the QR off.
'use strict';

const os = require('os');
const QR = require('../js/qr.js');

const ESC = '\u001b[';
const COLOR_ON = `${ESC}30m${ESC}47m${ESC}107m`; // black on white (107 = bright white; 47 is the fallback)
const COLOR_OFF = `${ESC}0m`;
const HALF = { both: '█', top: '▀', bottom: '▄', none: ' ' };

function isLegacyWindowsConsole(platform = process.platform, release = os.release()) {
  if (platform !== 'win32') return false;
  const major = Number(String(release || '').split('.')[0]);
  return Number.isFinite(major) && major < 10;
}

/** Decides how to print: enabled (LIVEFX_NO_QR), mode (ascii on legacy consoles / LIVEFX_QR_ASCII), colour, polarity. */
function options({ env = process.env, stream = process.stdout, platform = process.platform, release = os.release() } = {}) {
  const on = (v) => /^(1|true|yes|on)$/i.test(String(v || '').trim());
  const enabled = !on(env.LIVEFX_NO_QR);
  const mode = on(env.LIVEFX_QR_ASCII) || isLegacyWindowsConsole(platform, release) || env.TERM === 'dumb' ? 'ascii' : 'unicode';
  const color = !!(stream && stream.isTTY) && !('NO_COLOR' in env) && env.TERM !== 'dumb';
  return { enabled, mode, color, invert: on(env.LIVEFX_QR_INVERT) };
}

/**
 * Module grid with the quiet zone: true = dark. Rows outside the code (and the odd extra row of the
 * half-block layout) are light.
 */
function grid(qr, margin) {
  const dim = qr.size + margin * 2;
  return (r, c) => {
    const rr = r - margin;
    const cc = c - margin;
    return r < dim && c < dim && rr >= 0 && cc >= 0 && rr < qr.size && cc < qr.size && qr.modules[rr * qr.size + cc] === 1;
  };
}

/**
 * Renders `text` (or an encoded matrix) as terminal lines. `color` wraps every line in black-on-white; without
 * colour the glyphs mark light modules unless `invert` (glyph = dark module, for light terminals).
 */
function render(text, opts = {}) {
  const qr = typeof text === 'object' && text && text.modules ? text : QR.encode(String(text));
  const mode = opts.mode === 'ascii' ? 'ascii' : 'unicode';
  const margin = Number.isInteger(opts.margin) && opts.margin >= 0 ? opts.margin : 2;
  const color = !!opts.color;
  // glyphDark: the drawn glyph is a dark module (colour mode: black foreground on white) – else it is a light one.
  const glyphDark = color ? true : !!opts.invert;
  const indent = typeof opts.indent === 'string' ? opts.indent : '';
  const dark = grid(qr, margin);
  const dim = qr.size + margin * 2;
  const ink = (r, c) => (glyphDark ? dark(r, c) : !dark(r, c));
  const lines = [];
  if (mode === 'ascii') {
    for (let r = 0; r < dim; r++) {
      let line = '';
      for (let c = 0; c < dim; c++) line += ink(r, c) ? '##' : '  ';
      lines.push(line);
    }
  } else {
    for (let r = 0; r < dim; r += 2) {
      let line = '';
      for (let c = 0; c < dim; c++) {
        const top = ink(r, c);
        // the row below the last one is quiet zone: light (ink only when glyphs draw light modules)
        const bottom = r + 1 < dim ? ink(r + 1, c) : !glyphDark;
        line += top && bottom ? HALF.both : top ? HALF.top : bottom ? HALF.bottom : HALF.none;
      }
      lines.push(line);
    }
  }
  return lines.map((l) => (color ? `${indent}${COLOR_ON}${l}${COLOR_OFF}` : `${indent}${l}`)).join('\n');
}

/**
 * Reads a rendered block back into a module matrix (quiet zone stripped): `{ size, modules }` with 1 = dark.
 * Colour codes are ignored; `mode`, `color`/`invert`, `margin` and `indent` must match the rendering.
 */
function parse(block, { mode = 'unicode', color = false, invert = false, margin = 2, indent = '' } = {}) {
  const glyphDark = color ? true : !!invert;
  // eslint-disable-next-line no-control-regex
  const lines = String(block).replace(/\u001b\[[0-9;]*m/g, '').split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const cells = [];
  for (const raw of lines) {
    const l = raw.startsWith(indent) ? raw.slice(indent.length) : raw;
    if (mode === 'ascii') {
      const row = [];
      for (let i = 0; i < l.length; i += 2) row.push(l.slice(i, i + 2) === '##');
      cells.push(row);
    } else {
      const chars = Array.from(l);
      cells.push(chars.map((ch) => ch === HALF.both || ch === HALF.top));
      cells.push(chars.map((ch) => ch === HALF.both || ch === HALF.bottom));
    }
  }
  const dim = Math.max(...cells.map((r) => r.length));
  const size = dim - margin * 2;
  const modules = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) {
    const row = cells[r + margin] || [];
    for (let c = 0; c < size; c++) {
      const ink = !!row[c + margin];
      modules[r * size + c] = (glyphDark ? ink : !ink) ? 1 : 0;
    }
  }
  return { size, modules };
}

module.exports = { render, parse, options, isLegacyWindowsConsole, COLOR_ON, COLOR_OFF };
