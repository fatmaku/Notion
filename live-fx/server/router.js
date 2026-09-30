// LiveFX – tiny HTTP router + helpers shared by every server module. Zero dependencies.
'use strict';

class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

function json(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function error(res, status, code, message) {
  const headers = status === 413 ? { connection: 'close' } : {};
  json(res, status, { ok: false, error: code, message: message || code }, headers);
}

const HOST_RE = /^[a-z0-9._-]{1,253}(:\d{1,5})?$|^\[[0-9a-f:.]+\](:\d{1,5})?$/i;

/** Parses req.url against a validated Host header. Returns null instead of throwing. */
function safeUrl(req) {
  const host = req.headers.host || 'localhost';
  if (!HOST_RE.test(host)) return null;
  if (typeof req.url !== 'string' || req.url.length > 2048 || !req.url.startsWith('/')) return null;
  try {
    return new URL(req.url, `http://${host}`);
  } catch (_) {
    return null;
  }
}

/**
 * Reads the request body into a Buffer. Rejects with HttpError 413 when the limit is exceeded
 * (the error handler answers with `connection: close`, so the client never hangs), 408 when the
 * client stalls, 400 when the request is aborted.
 */
function readBody(req, { limit = 1e6, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) {
      req.pause();
      reject(new HttpError(413, 'payload_too_large', `body exceeds ${limit} bytes`));
      return;
    }
    const timer = setTimeout(() => finish(new HttpError(408, 'request_timeout', 'body not received in time')), timeoutMs);
    function finish(err, buf) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) {
        req.pause();
        reject(err);
      } else resolve(buf);
    }
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        finish(new HttpError(413, 'payload_too_large', `body exceeds ${limit} bytes`));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks)));
    req.on('error', (e) => finish(new HttpError(400, 'bad_request', e.message)));
    req.on('aborted', () => finish(new HttpError(400, 'aborted', 'request aborted')));
  });
}

async function readJson(req, limit = 1e6) {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (!ct.startsWith('application/json')) throw new HttpError(415, 'unsupported_media_type', 'content-type must be application/json');
  const buf = await readBody(req, { limit });
  let parsed;
  try {
    parsed = JSON.parse(buf.toString('utf8') || 'null');
  } catch (_) {
    throw new HttpError(400, 'bad_json', 'body is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'bad_json', 'body must be a JSON object');
  return parsed;
}

function compile(pattern) {
  if (pattern instanceof RegExp) return { re: pattern, keys: [] };
  const keys = [];
  const src = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { re: new RegExp(`^${src}$`), keys };
}

class Router {
  constructor() {
    this.routes = [];
  }

  route(method, pattern, handler) {
    const { re, keys } = compile(pattern);
    this.routes.push({ method: method.toUpperCase(), re, keys, handler });
    return this;
  }

  /** Returns true when a route handled the request. Handler errors propagate to the caller. */
  async dispatch(req, res, appCtx) {
    const url = safeUrl(req);
    if (!url) throw new HttpError(400, 'bad_request', 'malformed URL or Host header');
    const method = String(req.method || 'GET').toUpperCase();
    for (const r of this.routes) {
      if (r.method !== '*' && r.method !== method) continue;
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => {
        try {
          params[k] = decodeURIComponent(m[i + 1]);
        } catch (_) {
          throw new HttpError(400, 'bad_request', `malformed path parameter "${k}"`);
        }
      });
      await r.handler(req, res, { ...appCtx, url, params });
      return true;
    }
    return false;
  }
}

module.exports = { Router, HttpError, json, error, safeUrl, readBody, readJson };
