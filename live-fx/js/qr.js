// LiveFX – tiny QR code encoder (2.2): byte mode, error correction level M, versions 1–10 (up to 213 bytes),
// automatic mask selection, rendered to a <canvas> or an SVG string. No network, no dependencies – the
// phone link (with the secret token) never leaves the browser. UMD: `window.LiveFXQR` / `module.exports`.
//
//   LiveFXQR.encode('https://…')        → { version, size, modules: Uint8Array[size*size] (1 = dark), mask }
//   LiveFXQR.toCanvas(canvas, text, { scale, margin, dark, light })
//   LiveFXQR.toSvg(text, { scale, margin, dark, light })  → '<svg …>'
//
// Follows ISO/IEC 18004 (structure after Nayuki's reference description): data codewords → Reed-Solomon
// blocks (GF(256), 0x11D) → interleave → zigzag placement → 8 masks scored with the four penalty rules.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiveFXQR = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_VERSION = 10;
  // Level M: [total codewords, EC codewords per block, number of blocks] for versions 1..10.
  const EC_TABLE = [null, [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], [134, 24, 2], [172, 16, 4], [196, 18, 4], [242, 22, 4], [292, 22, 5], [346, 26, 5]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const EC_LEVEL_M = 0; // format bits of level M
  const PENALTY = [3, 3, 40, 10];

  // ---------- GF(256) / Reed-Solomon ----------
  function gfMul(a, b) {
    let r = 0;
    for (let i = 7; i >= 0; i--) {
      r = (r << 1) ^ ((r >>> 7) * 0x11d);
      r ^= ((b >>> i) & 1) * a;
    }
    return r & 0xff;
  }

  function rsGenerator(degree) {
    const result = new Array(degree - 1).fill(0);
    result.push(1);
    let rootPow = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], rootPow);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      rootPow = gfMul(rootPow, 2);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);
    for (const b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      divisor.forEach((coef, i) => {
        result[i] ^= gfMul(coef, factor);
      });
    }
    return result;
  }

  // ---------- data encoding ----------
  function utf8Bytes(text) {
    const s = String(text == null ? '' : text);
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s));
    const enc = unescape(encodeURIComponent(s));
    const out = [];
    for (let i = 0; i < enc.length; i++) out.push(enc.charCodeAt(i));
    return out;
  }

  function dataCapacityBytes(version) {
    const [total, ecPerBlock, blocks] = EC_TABLE[version];
    const dataCodewords = total - ecPerBlock * blocks;
    const countBits = version <= 9 ? 8 : 16;
    return Math.floor((dataCodewords * 8 - 4 - countBits) / 8);
  }

  function pickVersion(len) {
    for (let v = 1; v <= MAX_VERSION; v++) if (dataCapacityBytes(v) >= len) return v;
    throw new Error(`QR: Text zu lang (${len} Bytes, maximal ${dataCapacityBytes(MAX_VERSION)})`);
  }

  function makeCodewords(bytes, version) {
    const [total, ecPerBlock, blocks] = EC_TABLE[version];
    const dataCodewords = total - ecPerBlock * blocks;
    const bits = [];
    const push = (val, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    push(0b0100, 4); // byte mode
    push(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    const capacity = dataCodewords * 8;
    push(0, Math.min(4, capacity - bits.length)); // terminator
    while (bits.length % 8) bits.push(0);
    for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

    // Reed-Solomon blocks + interleaving
    const numShort = blocks - (total % blocks);
    const shortLen = Math.floor(total / blocks);
    const gen = rsGenerator(ecPerBlock);
    const out = [];
    let k = 0;
    for (let i = 0; i < blocks; i++) {
      const len = shortLen - ecPerBlock + (i < numShort ? 0 : 1);
      const dat = data.slice(k, k + len);
      k += len;
      const ecc = rsRemainder(dat, gen);
      if (i < numShort) dat.push(-1); // placeholder, skipped below
      out.push(dat.concat(ecc));
    }
    const result = [];
    for (let i = 0; i < out[0].length; i++) {
      for (let j = 0; j < blocks; j++) {
        if (i !== shortLen - ecPerBlock || j >= numShort) result.push(out[j][i]);
      }
    }
    return result;
  }

  // ---------- matrix ----------
  function bchFormat(mask) {
    const data = (EC_LEVEL_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function bchVersion(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | rem;
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0:
        return (r + c) % 2 === 0;
      case 1:
        return r % 2 === 0;
      case 2:
        return c % 3 === 0;
      case 3:
        return (r + c) % 3 === 0;
      case 4:
        return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5:
        return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6:
        return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default:
        return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function buildMatrix(codewords, version) {
    const size = version * 4 + 17;
    const modules = new Uint8Array(size * size);
    const isFunc = new Uint8Array(size * size);
    const set = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      modules[r * size + c] = dark ? 1 : 0;
      isFunc[r * size + c] = 1;
    };
    const finder = (r0, c0) => {
      for (let dr = -4; dr <= 4; dr++) {
        for (let dc = -4; dc <= 4; dc++) {
          const d = Math.max(Math.abs(dr), Math.abs(dc));
          set(r0 + dr, c0 + dc, d !== 2 && d !== 4);
        }
      }
    };
    finder(3, 3);
    finder(3, size - 4);
    finder(size - 4, 3);
    // timing
    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    // alignment
    const al = ALIGN[version];
    for (let i = 0; i < al.length; i++) {
      for (let j = 0; j < al.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(al[i] + dr, al[j] + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
    // format (placeholder – rewritten per mask) and version info
    const drawFormat = (mask) => {
      const bits = bchFormat(mask);
      const bit = (i) => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(i, 8, bit(i));
      set(7, 8, bit(6));
      set(8, 8, bit(7));
      set(8, 7, bit(8));
      for (let i = 9; i < 15; i++) set(8, 14 - i, bit(i));
      for (let i = 0; i < 8; i++) set(8, size - 1 - i, bit(i));
      for (let i = 8; i < 15; i++) set(size - 15 + i, 8, bit(i));
      set(size - 8, 8, true); // dark module
    };
    drawFormat(0);
    if (version >= 7) {
      const bits = bchVersion(version);
      for (let i = 0; i < 18; i++) {
        const b = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const c = Math.floor(i / 3);
        set(c, a, b);
        set(a, c, b);
      }
    }
    // data placement (zigzag, two columns at a time, right to left, skipping the timing column)
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          const upward = ((right + 1) & 2) === 0;
          const r = upward ? size - 1 - vert : vert;
          const idx = r * size + c;
          if (!isFunc[idx] && bitIdx < totalBits) {
            modules[idx] = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
        }
      }
    }
    return { size, modules, isFunc, drawFormat };
  }

  function applyMask(m, mask) {
    const { size, modules, isFunc } = m;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        if (!isFunc[idx] && maskBit(mask, r, c)) modules[idx] ^= 1;
      }
    }
  }

  function penalty(m) {
    const { size, modules } = m;
    const at = (r, c) => modules[r * size + c];
    let score = 0;
    // rule 1: runs of >= 5 equal modules in a row / column
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < size; i++) {
        let run = 0;
        let prev = -1;
        for (let j = 0; j <= size; j++) {
          const v = j < size ? (pass === 0 ? at(i, j) : at(j, i)) : -2;
          if (v === prev) run++;
          else {
            if (run >= 5) score += PENALTY[0] + run - 5;
            prev = v;
            run = 1;
          }
        }
      }
    }
    // rule 2: 2x2 blocks of the same colour
    for (let r = 0; r + 1 < size; r++) {
      for (let c = 0; c + 1 < size; c++) {
        const v = at(r, c);
        if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) score += PENALTY[1];
      }
    }
    // rule 3: finder-like 1:1:3:1:1 pattern with 4 light modules on either side (rows and columns)
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c + 11 <= size; c++) {
        let ok1 = true;
        let ok2 = true;
        let ok3 = true;
        let ok4 = true;
        for (let k = 0; k < 11 && (ok1 || ok2 || ok3 || ok4); k++) {
          const h = at(r, c + k);
          const v = at(c + k, r);
          if (h !== pat1[k]) ok1 = false;
          if (h !== pat2[k]) ok2 = false;
          if (v !== pat1[k]) ok3 = false;
          if (v !== pat2[k]) ok4 = false;
        }
        score += (ok1 + ok2 + ok3 + ok4) * PENALTY[2];
      }
    }
    // rule 4: deviation of the dark proportion from 50 % in 5 % steps
    let dark = 0;
    for (let i = 0; i < modules.length; i++) dark += modules[i];
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * PENALTY[3];
    return score;
  }

  function encode(text, opts = {}) {
    const bytes = utf8Bytes(text);
    const version = Number.isInteger(opts.version) && opts.version >= 1 && opts.version <= MAX_VERSION ? Math.max(opts.version, pickVersion(bytes.length)) : pickVersion(bytes.length);
    const codewords = makeCodewords(bytes, version);
    const m = buildMatrix(codewords, version);
    let best = null;
    const forced = Number.isInteger(opts.mask) && opts.mask >= 0 && opts.mask <= 7 ? opts.mask : -1;
    for (let mask = 0; mask < 8; mask++) {
      if (forced !== -1 && mask !== forced) continue;
      m.drawFormat(mask);
      applyMask(m, mask);
      const score = penalty(m);
      if (!best || score < best.score) best = { mask, score, modules: new Uint8Array(m.modules) };
      applyMask(m, mask); // undo (XOR)
    }
    return { version, size: m.size, modules: best.modules, mask: best.mask, penalty: best.score, bytes: bytes.length, ecLevel: 'M' };
  }

  function isDark(qr, r, c) {
    return r >= 0 && c >= 0 && r < qr.size && c < qr.size ? qr.modules[r * qr.size + c] === 1 : false;
  }

  function toCanvas(canvas, text, opts = {}) {
    const qr = typeof text === 'object' && text && text.modules ? text : encode(text, opts);
    const scale = Math.max(1, Math.floor(opts.scale || 6));
    const margin = Number.isFinite(opts.margin) ? Math.max(0, Math.floor(opts.margin)) : 4;
    const px = (qr.size + margin * 2) * scale;
    canvas.width = px;
    canvas.height = px;
    canvas.dataset.qrSize = String(qr.size);
    canvas.dataset.qrVersion = String(qr.version);
    const ctx = canvas.getContext('2d');
    if (!ctx) return qr;
    ctx.fillStyle = opts.light || '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = opts.dark || '#000000';
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (isDark(qr, r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
    return qr;
  }

  function toSvg(text, opts = {}) {
    const qr = typeof text === 'object' && text && text.modules ? text : encode(text, opts);
    const margin = Number.isFinite(opts.margin) ? Math.max(0, Math.floor(opts.margin)) : 4;
    const dim = qr.size + margin * 2;
    const scale = Math.max(1, Math.floor(opts.scale || 4));
    let d = '';
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (isDark(qr, r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
      }
    }
    const light = String(opts.light || '#ffffff').replace(/[^#a-zA-Z0-9(),.% ]/g, '');
    const dark = String(opts.dark || '#000000').replace(/[^#a-zA-Z0-9(),.% ]/g, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim * scale}" height="${dim * scale}" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="100%" height="100%" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  }

  /** Text rendering of the matrix (tests / terminal): '#' dark, '.' light, one row per line. */
  function toText(qr) {
    const q = typeof qr === 'string' ? encode(qr) : qr;
    const lines = [];
    for (let r = 0; r < q.size; r++) {
      let line = '';
      for (let c = 0; c < q.size; c++) line += isDark(q, r, c) ? '#' : '.';
      lines.push(line);
    }
    return lines.join('\n');
  }

  return { encode, toCanvas, toSvg, toText, isDark, dataCapacityBytes, MAX_VERSION, _internal: { gfMul, rsGenerator, rsRemainder, bchFormat, bchVersion, makeCodewords, penalty } };
});
