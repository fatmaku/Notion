// js/qr.js (2.2): the phone link is drawn as a QR code. The encoder is checked against an independent decoder
// written here (own GF(256) log tables, own function-pattern map, own mask formulas, own zigzag reader):
// finder / timing / dark module where ISO 18004 puts them, size per version, BCH-valid format bits, all
// Reed-Solomon syndromes zero, and the byte-mode payload decodes to the input – for every mask 0..7.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const QR = require('../js/qr.js');

// ---------- reference tables (ISO 18004, level M, versions 1..10) ----------
const EC_M = { 1: [26, 10, 1], 2: [44, 16, 1], 3: [70, 26, 1], 4: [100, 18, 2], 5: [134, 24, 2], 6: [172, 16, 4], 7: [196, 18, 4], 8: [242, 22, 4], 9: [292, 22, 5], 10: [346, 26, 5] };
const ALIGN_POS = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

// GF(256) with log / antilog tables (the encoder multiplies bitwise – a different implementation).
const EXP = new Array(512);
const LOG = new Array(256);
(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Evaluates the codeword polynomial (first codeword = highest power) at x. */
function polyEval(cw, x) {
  let y = 0;
  for (const c of cw) y = mul(y, x) ^ c;
  return y;
}

function at(qr, r, c) {
  return qr.modules[r * qr.size + c];
}

/** Function-module map built independently of the encoder. */
function functionMap(version) {
  const size = version * 4 + 17;
  const f = new Uint8Array(size * size);
  const mark = (r, c) => {
    if (r >= 0 && c >= 0 && r < size && c < size) f[r * size + c] = 1;
  };
  for (const [r0, c0] of [[0, 0], [0, size - 8], [size - 8, 0]]) for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) mark(r0 + r, c0 + c); // finders + separators
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  const al = ALIGN_POS[version];
  for (const r of al) {
    for (const c of al) {
      if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(r + dr, c + dc);
    }
  }
  for (let i = 0; i < 9; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, size - 1 - i);
    mark(size - 1 - i, 8);
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mark(i, size - 11 + j);
        mark(size - 11 + j, i);
      }
    }
  }
  return { size, f };
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Reads the 15 format bits (copy 1 around the top-left finder), returns { ecLevel, mask } after BCH check. */
function readFormat(qr) {
  const bits = [];
  for (let i = 0; i <= 5; i++) bits.push(at(qr, 8, i));
  bits.push(at(qr, 8, 7), at(qr, 8, 8), at(qr, 7, 8));
  for (let i = 5; i >= 0; i--) bits.push(at(qr, i, 8));
  // bits[0] is the MSB (bit 14): row 8 col 0..5, col 7, col 8, row 7 col 8, rows 5..0 col 8
  let v = 0;
  for (const b of bits) v = (v << 1) | b;
  v ^= 0x5412;
  // BCH(15,5) check: the 15-bit value must be divisible by the generator 0x537.
  let rem = v;
  for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  assert.strictEqual(rem, 0, 'format bits pass the BCH check');
  const data = v >>> 10;
  // second copy (bottom-left column + top-right row) must carry the same bits
  const copy = [];
  for (let i = 0; i < 7; i++) copy.push(at(qr, qr.size - 1 - i, 8));
  for (let i = 0; i < 8; i++) copy.push(at(qr, 8, qr.size - 8 + i));
  // copy order: bit14..bit8 down the column from the bottom, then bit7..bit0 along the row left to right
  let v2 = 0;
  for (const b of copy) v2 = (v2 << 1) | b;
  v2 ^= 0x5412;
  assert.strictEqual(v2, v, 'both format copies agree');
  return { ecLevel: data >>> 3, mask: data & 7 };
}

/** Full independent decode: structure checks, unmask, zigzag read, de-interleave, syndromes, byte mode. */
function decode(qr) {
  const { version, size } = qr;
  assert.strictEqual(size, version * 4 + 17, 'size per version');
  assert.strictEqual(qr.modules.length, size * size);
  // finder patterns (7x7 ring + 3x3 core) with light separators
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        assert.strictEqual(at(qr, r0 + r, c0 + c), ring || core ? 1 : 0, `finder at ${r0},${c0} module ${r},${c}`);
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    assert.strictEqual(at(qr, 7, i), 0, 'separator below top-left finder');
    assert.strictEqual(at(qr, i, 7), 0, 'separator right of top-left finder');
    assert.strictEqual(at(qr, 7, size - 1 - i), 0, 'separator below top-right finder');
    assert.strictEqual(at(qr, size - 8, i), 0, 'separator above bottom-left finder');
  }
  for (let i = 8; i < size - 8; i++) {
    assert.strictEqual(at(qr, 6, i), i % 2 === 0 ? 1 : 0, `timing row at ${i}`);
    assert.strictEqual(at(qr, i, 6), i % 2 === 0 ? 1 : 0, `timing column at ${i}`);
  }
  assert.strictEqual(at(qr, size - 8, 8), 1, 'dark module');
  const { ecLevel, mask } = readFormat(qr);
  assert.strictEqual(ecLevel, 0, 'level M');
  assert.strictEqual(mask, qr.mask, 'format info carries the chosen mask');

  // unmask + zigzag read
  const { f } = functionMap(version);
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let v = 0; v < size; v++) {
      const r = upward ? size - 1 - v : v;
      for (const c of [right, right - 1]) {
        if (f[r * size + c]) continue;
        bits.push(at(qr, r, c) ^ (MASKS[mask](r, c) ? 1 : 0));
      }
    }
  }
  const [total, ecPerBlock, blocks] = EC_M[version];
  assert.ok(bits.length >= total * 8, `enough data modules (${bits.length} >= ${total * 8})`);
  const cw = [];
  for (let i = 0; i + 8 <= total * 8; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // de-interleave: data codewords first (column-wise over the blocks), then EC codewords
  const numShort = blocks - (total % blocks);
  const shortLen = Math.floor(total / blocks) - ecPerBlock;
  const blockData = [];
  for (let b = 0; b < blocks; b++) blockData.push([]);
  let k = 0;
  for (let i = 0; i < shortLen + 1; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i === shortLen && b < numShort) continue;
      blockData[b].push(cw[k++]);
    }
  }
  const blockEc = [];
  for (let b = 0; b < blocks; b++) blockEc.push([]);
  for (let i = 0; i < ecPerBlock; i++) for (let b = 0; b < blocks; b++) blockEc[b].push(cw[k++]);
  assert.strictEqual(k, total, 'all codewords consumed');
  for (let b = 0; b < blocks; b++) {
    const full = blockData[b].concat(blockEc[b]);
    for (let i = 0; i < ecPerBlock; i++) assert.strictEqual(polyEval(full, EXP[i]), 0, `block ${b}: RS syndrome ${i} is zero`);
  }
  const data = [].concat(...blockData);

  // byte mode: 0100, count (8 or 16 bits), bytes, terminator, pad 0xEC 0x11
  const dbits = [];
  for (const c of data) for (let i = 7; i >= 0; i--) dbits.push((c >>> i) & 1);
  const take = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | dbits.shift();
    return v;
  };
  assert.strictEqual(take(4), 0b0100, 'byte mode');
  const len = take(version <= 9 ? 8 : 16);
  const bytes = [];
  for (let i = 0; i < len; i++) bytes.push(take(8));
  const used = 4 + (version <= 9 ? 8 : 16) + len * 8;
  const rest = data.length * 8 - used;
  if (rest >= 4) assert.strictEqual(take(4), 0, 'terminator');
  while (dbits.length % 8) assert.strictEqual(dbits.shift(), 0, 'bit padding');
  const pads = [];
  while (dbits.length >= 8) pads.push(take(8));
  pads.forEach((p, i) => assert.strictEqual(p, i % 2 === 0 ? 0xec : 0x11, `pad codeword ${i}`));
  return { text: Buffer.from(bytes).toString('utf8'), mask, version, dataCodewords: data.length };
}

test('version 1: short text decodes with the independent reader, every mask', () => {
  const text = 'HELLO WORLD';
  const auto = QR.encode(text);
  assert.strictEqual(auto.version, 1);
  assert.strictEqual(auto.size, 21);
  assert.strictEqual(decode(auto).text, text);
  for (let mask = 0; mask < 8; mask++) {
    const q = QR.encode(text, { mask });
    assert.strictEqual(q.mask, mask);
    const d = decode(q);
    assert.strictEqual(d.text, text, `mask ${mask}`);
    assert.strictEqual(d.dataCodewords, 16);
  }
});

test('phone links (http LAN + https tunnel with a 32-char token) decode byte for byte', () => {
  const lan = 'http://192.168.178.23:8787/m?token=0123456789abcdef0123456789abcdef';
  const q = QR.encode(lan);
  assert.ok(q.version >= 3 && q.version <= 5, `version ${q.version}`);
  assert.strictEqual(decode(q).text, lan);
  const tunnel = 'https://lazy-otter-brave-cat-9f.trycloudflare.com/m?token=0123456789abcdef0123456789abcdef';
  const t = QR.encode(tunnel);
  assert.ok(t.version >= 4 && t.version <= 6, `version ${t.version}`);
  assert.strictEqual(decode(t).text, tunnel);
  for (let mask = 0; mask < 8; mask++) assert.strictEqual(decode(QR.encode(tunnel, { mask })).text, tunnel, `tunnel mask ${mask}`);
});

test('every version 1..10 round-trips (alignment patterns, two / four / five RS blocks, version info from 7)', () => {
  for (let v = 1; v <= QR.MAX_VERSION; v++) {
    const cap = QR.dataCapacityBytes(v);
    const text = 'x'.repeat(cap - 3) + 'ÄÖÜ'.slice(0, 1); // UTF-8: Ä = 2 bytes -> cap - 1 bytes
    const q = QR.encode(text, { version: v });
    assert.strictEqual(q.version, v, `version ${v} honoured`);
    assert.strictEqual(q.size, v * 4 + 17);
    const d = decode(q);
    assert.strictEqual(d.text, text, `version ${v} payload`);
    if (v >= 2) {
      // centre of the last alignment pattern is dark, its ring light
      const p = ALIGN_POS[v][ALIGN_POS[v].length - 1];
      assert.strictEqual(at(q, p, p), 1, `alignment centre v${v}`);
      assert.strictEqual(at(q, p - 1, p), 0, `alignment inner ring v${v}`);
      assert.strictEqual(at(q, p - 2, p - 2), 1, `alignment outer ring v${v}`);
    }
  }
  assert.strictEqual(QR.dataCapacityBytes(1), 14);
  assert.strictEqual(QR.dataCapacityBytes(10), 213);
});

test('deterministic matrix, mask choice by penalty, unicode payload', () => {
  const a = QR.encode('https://example.org/m?token=abc');
  const b = QR.encode('https://example.org/m?token=abc');
  assert.deepStrictEqual(Array.from(a.modules), Array.from(b.modules));
  assert.strictEqual(a.mask, b.mask);
  let best = Infinity;
  for (let mask = 0; mask < 8; mask++) best = Math.min(best, QR.encode('https://example.org/m?token=abc', { mask }).penalty);
  assert.strictEqual(a.penalty, best, 'auto mask has the lowest penalty');
  const u = 'Grüße aus İstanbul 🎬';
  assert.strictEqual(decode(QR.encode(u)).text, u);
});

test('too long text throws a German error; svg / text renderers', () => {
  assert.throws(() => QR.encode('x'.repeat(214)), /zu lang/);
  const svg = QR.toSvg('hi', { scale: 2, margin: 1 });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 23 23" width="46" height="46"/);
  assert.match(svg, /<path d="M1 1h1v1h-1z/);
  assert.ok(!/<script/i.test(QR.toSvg('hi', { dark: '"><script>' })), 'colours are sanitised');
  const txt = QR.toText('hi');
  const rows = txt.split('\n');
  assert.strictEqual(rows.length, 21);
  assert.strictEqual(rows[0].slice(0, 7), '#######');
  assert.strictEqual(rows[1].slice(0, 7), '#.....#');
});

test('toCanvas draws scale×(size+2·margin) pixels and marks the canvas', () => {
  const calls = [];
  const canvas = {
    width: 0,
    height: 0,
    dataset: {},
    getContext: () => ({
      set fillStyle(v) {
        calls.push(['style', v]);
      },
      fillRect: (...a) => calls.push(['rect', ...a]),
    }),
  };
  const q = QR.toCanvas(canvas, 'hi', { scale: 3, margin: 2 });
  assert.strictEqual(q.size, 21);
  assert.strictEqual(canvas.width, (21 + 4) * 3);
  assert.strictEqual(canvas.height, canvas.width);
  assert.strictEqual(canvas.dataset.qrSize, '21');
  assert.strictEqual(canvas.dataset.qrVersion, '1');
  const dark = calls.filter((c) => c[0] === 'rect').length - 1; // minus the background
  let expected = 0;
  for (let i = 0; i < q.modules.length; i++) expected += q.modules[i];
  assert.strictEqual(dark, expected, 'one rect per dark module');
  assert.deepStrictEqual(calls[3], ['rect', 6, 6, 3, 3], 'first dark module (0,0) is drawn at margin×scale');
});
