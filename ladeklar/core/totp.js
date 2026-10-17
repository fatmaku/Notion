// Time-based one-time passwords (RFC 6238 / RFC 4226: HMAC-SHA-1, 30 s steps, 6 digits) for the
// two-factor login of office and licensor accounts. Pure synchronous JavaScript, no dependencies,
// so the server and the browser demo verify codes the same way.

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_MS = 30 * 1000;

/** Bytes → base32 (RFC 4648, upper case, without padding). */
export function base32Encode(bytes) {
  let out = '', bits = 0, val = 0;
  for (const b of bytes) {
    val = ((val << 8) | b) & 0xffff; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

/** base32 → bytes (ignores case, spaces and padding). Returns null for invalid input. */
export function base32Decode(s) {
  const clean = String(s || '').toUpperCase().replace(/[\s=-]/g, '');
  const out = [];
  let bits = 0, val = 0;
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) return null;
    val = ((val << 5) | i) & 0xffff; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

/** SHA-1 of bytes → 20 bytes. */
export function sha1(msg) {
  const len = msg.length;
  const blocks = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(blocks);
  m.set(msg);
  m[len] = 0x80;
  const dv = new DataView(m.buffer);
  const bits = len * 8;
  dv.setUint32(blocks - 8, Math.floor(bits / 2 ** 32));
  dv.setUint32(blocks - 4, bits >>> 0);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const W = new Uint32Array(80);
  const rotl = (x, n) => (x << n) | (x >>> (32 - n));
  for (let o = 0; o < blocks; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 80; i++) W[i] = rotl(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f + e + k + W[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h));
  return out;
}

/** HMAC-SHA-1(key, msg) → 20 bytes. */
export function hmacSha1(key, msg) {
  let k = key.length > 64 ? sha1(key) : key;
  const pad = new Uint8Array(64); pad.set(k);
  const ipad = new Uint8Array(64 + msg.length), opad = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i++) { ipad[i] = pad[i] ^ 0x36; opad[i] = pad[i] ^ 0x5c; }
  ipad.set(msg, 64);
  opad.set(sha1(ipad), 64);
  return sha1(opad);
}

/** HOTP (RFC 4226) for a key and a counter → 6-digit string. */
export function hotp(key, counter) {
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(counter / 2 ** 32));
  dv.setUint32(4, counter >>> 0);
  const h = hmacSha1(key, msg);
  const o = h[19] & 15;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 1e6).padStart(6, '0');
}

/** The 6-digit code of a base32 secret at a time (ms). */
export function totp(secret, time = Date.now()) {
  const key = base32Decode(secret);
  if (!key || !key.length) return null;
  return hotp(key, Math.floor(time / STEP_MS));
}

/** The time step (counter) the code belongs to, within ±window steps of `time`, or null. */
export function matchStep(secret, code, time = Date.now(), window = 1) {
  const c = String(code ?? '').replace(/\s/g, '');
  const key = base32Decode(secret);
  if (!/^\d{6}$/.test(c) || !key || !key.length) return null;
  const now = Math.floor(time / STEP_MS);
  for (let d = -window; d <= window; d++) if (hotp(key, now + d) === c) return now + d;
  return null;
}

/** true when the code is valid for the secret at `time` (±1 step = ±30 s). */
export function verify(secret, code, time = Date.now()) { return matchStep(secret, code, time) != null; }
