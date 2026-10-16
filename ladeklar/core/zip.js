// Minimal ZIP writer (store only, no compression, no ZIP64 – fine below 4 GB). Pure JavaScript on
// Uint8Array, so the server streams exports with it and the browser demo builds the same file.
//   const z = createZip((chunk) => res.write(chunk));
//   z.add('data.json', bytes, Date.now()); ...; z.end();
// Photos and PDFs are compressed already, so storing them costs almost nothing.

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

function dosTime(ms) {
  const d = new Date(ms || Date.now());
  const y = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** write(chunk: Uint8Array) is called in order; returns { add(name, data, mtime), end() → total bytes }. */
export function createZip(write) {
  const central = [];
  let offset = 0;
  const out = (bytes) => { write(bytes); offset += bytes.length; };
  const names = new Set();
  return {
    add(name, data, mtime) {
      let n = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
      for (let i = 2; names.has(n); i++) n = String(name).replace(/(\.[^./]*)?$/, (ext) => `-${i}${ext || ''}`);
      names.add(n);
      const bytes = toBytes(data);
      const nameBytes = enc.encode(n);
      const crc = crc32(bytes);
      const { time, date } = dosTime(mtime);
      const h = new Uint8Array(30 + nameBytes.length);
      const v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, time, true); v.setUint16(12, date, true); v.setUint32(14, crc, true);
      v.setUint32(18, bytes.length, true); v.setUint32(22, bytes.length, true); v.setUint16(26, nameBytes.length, true); v.setUint16(28, 0, true);
      h.set(nameBytes, 30);
      central.push({ nameBytes, crc, size: bytes.length, time, date, at: offset });
      out(h);
      out(bytes);
    },
    end() {
      const start = offset;
      for (const e of central) {
        const c = new Uint8Array(46 + e.nameBytes.length);
        const v = new DataView(c.buffer);
        v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true);
        v.setUint16(12, e.time, true); v.setUint16(14, e.date, true); v.setUint32(16, e.crc, true); v.setUint32(20, e.size, true); v.setUint32(24, e.size, true);
        v.setUint16(28, e.nameBytes.length, true); v.setUint16(30, 0, true); v.setUint16(32, 0, true); v.setUint16(34, 0, true); v.setUint16(36, 0, true);
        v.setUint32(38, 0, true); v.setUint32(42, e.at, true);
        c.set(e.nameBytes, 46);
        out(c);
      }
      const eocd = new Uint8Array(22);
      const v = new DataView(eocd.buffer);
      v.setUint32(0, 0x06054b50, true); v.setUint16(8, central.length, true); v.setUint16(10, central.length, true);
      v.setUint32(12, offset - start, true); v.setUint32(16, start, true);
      out(eocd);
      return offset;
    },
  };
}

/** File name inside the export: dateien/<kind>/<date>_<id>.<ext> (ASCII only). */
export function exportFileName(f) {
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'image/svg+xml': 'svg' }[f.mime] || 'bin';
  const day = f.at ? new Date(f.at).toISOString().slice(0, 10) : 'datei';
  return `dateien/${f.kind || 'other'}/${day}_${String(f.id).replace(/[^\w-]/g, '')}.${ext}`;
}
