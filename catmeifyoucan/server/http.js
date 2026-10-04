// Cat Me If You Can – minimaler HTTP-Unterbau: Router, JSON-Body, Antworten, Fehler, Sicherheits-Header.

import { GameError } from '../public/core/util.js';

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details || null;
  }
}

export function createRouter() {
  const routes = [];
  const add = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => {
        keys.push(k);
        return '/([^/]+)';
      }) + '/?$',
    );
    routes.push({ method, re, keys, handler });
  };
  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    patch: (p, h) => add('PATCH', p, h),
    delete: (p, h) => add('DELETE', p, h),
    match(method, pathname) {
      let pathMatched = false;
      for (const r of routes) {
        const m = r.re.exec(pathname);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
        const params = {};
        r.keys.forEach((k, i) => {
          try {
            params[k] = decodeURIComponent(m[i + 1]);
          } catch {
            params[k] = m[i + 1];
          }
        });
        return { handler: r.handler, params };
      }
      return pathMatched ? { methodNotAllowed: true } : null;
    },
  };
}

export function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (declared && declared > limitBytes) {
      reject(new HttpError(413, 'payload_too_large', `Höchstens ${Math.round(limitBytes / 1024)} KB`));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limitBytes) {
        done = true;
        reject(new HttpError(413, 'payload_too_large', `Höchstens ${Math.round(limitBytes / 1024)} KB`));
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!done) {
        done = true;
        resolve(Buffer.concat(chunks));
      }
    });
    req.on('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
  });
}

export async function readJson(req, limitBytes = 64 * 1024) {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) throw new HttpError(415, 'json_required', 'Content-Type: application/json erwartet');
  const buf = await readBody(req, limitBytes);
  if (!buf.length) return {};
  try {
    const v = JSON.parse(buf.toString('utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Ungültiges JSON');
  }
}

export function securityHeaders({ tileHost, arCdn }) {
  const csp = [
    "default-src 'self'",
    `script-src 'self'${arCdn ? ' https://cdn.jsdelivr.net' : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${tileHost ? ` ${tileHost}` : ''}`,
    "connect-src 'self' https://storage.googleapis.com https://tfhub.dev https://www.kaggle.com" + (arCdn ? ' https://cdn.jsdelivr.net' : ''),
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export function sendJson(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(data);
}

export function sendText(res, status, text, type = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(text);
}

/** Fehler → JSON-Antwort. GameError (Engine) und HttpError (Server) haben dieselbe Form. */
export function sendError(res, err, log) {
  if (err instanceof HttpError || err instanceof GameError) {
    const headers = {};
    if (err.details && err.details.retryAfter) headers['Retry-After'] = String(err.details.retryAfter);
    sendJson(res, err.status, { error: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) }, headers);
    return;
  }
  if (log) log('Fehler:', err && err.stack ? err.stack : err);
  sendJson(res, 500, { error: 'internal', message: 'Interner Fehler' });
}

/**
 * Client-IP. trustProxy = Anzahl vertrauenswürdiger Proxys vor dem Server (0 = keiner). Der linke
 * Teil von X-Forwarded-For stammt vom Client und ist fälschbar – gezählt wird deshalb von rechts:
 * bei einem Proxy (nginx) ist der letzte Eintrag die Adresse, die dieser Proxy gesehen hat.
 */
export function clientIp(req, trustProxy) {
  const hops = trustProxy === true ? 1 : Number(trustProxy) || 0;
  if (hops > 0) {
    const parts = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - hops)];
  }
  return req.socket.remoteAddress || 'unknown';
}
