// Minimal ZIP writer (store only, no compression) with ZIP64 for archives or files of 4 GiB and more
// and for more than 65,535 entries. Pure JavaScript on Uint8Array, so the server streams exports with
// it and the browser demo builds the same file.
//   const z = createZip((chunk) => res.write(chunk));
//   z.add('data.json', bytes, Date.now()); ...; z.end();
// write() is called synchronously and in order; the caller may wait for 'drain' between add() calls.
// Photos and PDFs are compressed already, so storing them costs almost nothing.
// options: crc (a faster crc32, e.g. zlib.crc32 on the server), offset (bytes already written before
// the archive in the same output, e.g. a self-extractor stub; offsets in the archive are absolute).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const toBytes = (data) => (typeof data === 'string' ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data));
const MAX32 = 0xffffffff, MAX16 = 0xffff;
const u64 = (v, at, n) => v.setBigUint64(at, BigInt(n), true);

// ZIP times and export file names in German time, whatever the server's or browser's time zone (tz-1)
let berlinFmt = null;
function berlinParts(ms) {
  berlinFmt = berlinFmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const p = {};
  for (const x of berlinFmt.formatToParts(ms)) p[x.type] = x.value;
  return p;
}
function dosTime(ms) {
  const p = berlinParts(ms || Date.now());
  const y = Math.max(1980, Number(p.year));
  return {
    time: (Number(p.hour) << 11) | (Number(p.minute) << 5) | (Number(p.second) >> 1),
    date: ((y - 1980) << 9) | (Number(p.month) << 5) | Number(p.day),
  };
}

/** write(chunk: Uint8Array) is called in order; returns { add(name, data, mtime), end() → total bytes }. */
export function createZip(write, { crc = crc32, offset: base = 0 } = {}) {
  const central = [];
  let offset = base;
  const out = (bytes) => { write(bytes); offset += bytes.length; };
  const names = new Set();
  return {
    add(name, data, mtime) {
      let n = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
      for (let i = 2; names.has(n); i++) n = String(name).replace(/(\.[^./]*)?$/, (ext) => `-${i}${ext || ''}`);
      names.add(n);
      const bytes = toBytes(data);
      const nameBytes = enc.encode(n);
      const sum = crc(bytes) >>> 0;
      const { time, date } = dosTime(mtime);
      const size = bytes.length, at = offset;
      const bigSize = size >= MAX32, z64 = bigSize || at >= MAX32;
      // ZIP64: the sizes move into the zip64 extra field (header id 1) when they do not fit 32 bits
      const h = new Uint8Array(30 + nameBytes.length + (bigSize ? 20 : 0));
      const v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, z64 ? 45 : 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, time, true); v.setUint16(12, date, true); v.setUint32(14, sum, true);
      v.setUint32(18, bigSize ? MAX32 : size, true); v.setUint32(22, bigSize ? MAX32 : size, true); v.setUint16(26, nameBytes.length, true); v.setUint16(28, bigSize ? 20 : 0, true);
      h.set(nameBytes, 30);
      if (bigSize) { const x = 30 + nameBytes.length; v.setUint16(x, 1, true); v.setUint16(x + 2, 16, true); u64(v, x + 4, size); u64(v, x + 12, size); }
      central.push({ nameBytes, crc: sum, size, time, date, at });
      out(h);
      out(bytes);
    },
    end() {
      const start = offset;
      for (const e of central) {
        const bigSize = e.size >= MAX32, bigAt = e.at >= MAX32;
        const xlen = (bigSize ? 16 : 0) + (bigAt ? 8 : 0), extra = xlen ? 4 + xlen : 0;
        const c = new Uint8Array(46 + e.nameBytes.length + extra);
        const v = new DataView(c.buffer);
        const ver = xlen ? 45 : 20;
        v.setUint32(0, 0x02014b50, true); v.setUint16(4, ver, true); v.setUint16(6, ver, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true);
        v.setUint16(12, e.time, true); v.setUint16(14, e.date, true); v.setUint32(16, e.crc, true);
        v.setUint32(20, bigSize ? MAX32 : e.size, true); v.setUint32(24, bigSize ? MAX32 : e.size, true);
        v.setUint16(28, e.nameBytes.length, true); v.setUint16(30, extra, true); v.setUint16(32, 0, true); v.setUint16(34, 0, true); v.setUint16(36, 0, true);
        v.setUint32(38, 0, true); v.setUint32(42, bigAt ? MAX32 : e.at, true);
        c.set(e.nameBytes, 46);
        if (xlen) {
          let x = 46 + e.nameBytes.length;
          v.setUint16(x, 1, true); v.setUint16(x + 2, xlen, true); x += 4;
          if (bigSize) { u64(v, x, e.size); u64(v, x + 8, e.size); x += 16; }
          if (bigAt) u64(v, x, e.at);
        }
        out(c);
      }
      const count = central.length, cdSize = offset - start;
      if (count >= MAX16 || cdSize >= MAX32 || start >= MAX32) {
        // ZIP64 end of central directory record + locator, then the classic record with escape values
        const recAt = offset;
        const r = new Uint8Array(56 + 20);
        const v = new DataView(r.buffer);
        v.setUint32(0, 0x06064b50, true); u64(v, 4, 44); v.setUint16(12, 45, true); v.setUint16(14, 45, true);
        v.setUint32(16, 0, true); v.setUint32(20, 0, true); u64(v, 24, count); u64(v, 32, count); u64(v, 40, cdSize); u64(v, 48, start);
        v.setUint32(56, 0x07064b50, true); v.setUint32(60, 0, true); u64(v, 64, recAt); v.setUint32(72, 1, true);
        out(r);
      }
      const eocd = new Uint8Array(22);
      const v = new DataView(eocd.buffer);
      v.setUint32(0, 0x06054b50, true); v.setUint16(8, Math.min(count, MAX16), true); v.setUint16(10, Math.min(count, MAX16), true);
      v.setUint32(12, Math.min(cdSize, MAX32), true); v.setUint32(16, Math.min(start, MAX32), true);
      out(eocd);
      return offset;
    },
  };
}

/** File name inside the export: dateien/<kind>/<date>_<id>.<ext> (ASCII only). */
export function exportFileName(f) {
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'image/svg+xml': 'svg' }[f.mime] || 'bin';
  const day = f.at ? (({ year, month, day: dd }) => `${year}-${month}-${dd}`)(berlinParts(f.at)) : 'datei';
  return `dateien/${f.kind || 'other'}/${day}_${String(f.id).replace(/[^\w-]/g, '')}.${ext}`;
}
