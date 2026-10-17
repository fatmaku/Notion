// Web Push without dependencies: VAPID (RFC 8292) + message encryption aes128gcm (RFC 8291).
// Works with the push services of Chrome/Android (FCM), Safari/iOS (APNs web push) and Firefox.
import crypto from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const unb64u = (s) => Buffer.from(String(s), 'base64url');

/** Create a VAPID key pair: { publicKey (base64url, uncompressed point), privateKey (base64url d) } */
export function generateVapidKeys() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

function vapidKeyObject({ publicKey, privateKey }) {
  const pub = unb64u(publicKey);
  return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(unb64u(privateKey)), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
}

/** VAPID Authorization header value for a push endpoint. */
export function vapidAuth(endpoint, keys, subject, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject }));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), { key: vapidKeyObject(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${payload}.${b64u(sig)}, k=${keys.publicKey}`;
}

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/** Encrypt a payload for one subscription ({ keys: { p256dh, auth } }). */
export function encrypt(sub, plaintext, { salt = crypto.randomBytes(16), ecdh = null } = {}) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const authSecret = unb64u(sub.keys.auth);
  const as = ecdh || crypto.createECDH('prime256v1');
  if (!ecdh) as.generateKeys();
  const asPublic = as.getPublicKey();
  const shared = as.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, shared);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, body]);
}

/** Receiver side (used by tests and to verify the implementation). */
export function decrypt(uaEcdh, authSecretB64u, buf) {
  const salt = buf.subarray(0, 16);
  const idlen = buf[20];
  const asPublic = buf.subarray(21, 21 + idlen);
  const data = buf.subarray(21 + idlen);
  const uaPublic = uaEcdh.getPublicKey();
  const shared = uaEcdh.computeSecret(asPublic);
  const prkKey = hmac(unb64u(authSecretB64u), shared);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(data.subarray(data.length - 16));
  const out = Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]);
  let end = out.length - 1;
  while (end >= 0 && out[end] === 0) end--;
  if (out[end] !== 2) throw new Error('bad padding');
  return out.subarray(0, end).toString();
}

/**
 * Send one push message. Resolves { ok, status, gone } – gone=true means the subscription
 * expired (404/410) and should be deleted.
 */
export async function sendPush(sub, payload, { keys, subject, ttl = 24 * 3600, urgency = 'normal', fetchImpl = fetch } = {}) {
  const body = encrypt(sub, typeof payload === 'string' ? payload : JSON.stringify(payload));
  // no redirects (the endpoint host was checked against the push services) and no endless wait
  const res = await fetchImpl(sub.endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15e3),
    headers: {
      TTL: String(ttl), Urgency: urgency, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      Authorization: vapidAuth(sub.endpoint, keys, subject),
    },
    body,
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
}
