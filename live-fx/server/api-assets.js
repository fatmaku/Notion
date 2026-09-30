// LiveFX – media uploads: list / upload / delete files under <dataDir>/assets. See docs/CONTRACTS.md §4.
// Files are served by server/static.js at /assets/<name>. Uploads are raw bodies (`body: file` in the
// browser, `--data-binary @file` with curl) with the original file name in the `x-filename` header.
'use strict';

const fs = require('fs');
const path = require('path');
const { readBody, HttpError, json } = require('./router');
const { requireAuth } = require('./auth');
require('../js/schema.js');

const Schema = globalThis.LiveFXSchema;
const { LIMITS, IMAGE_EXT, SOUND_EXT, isSafeName } = Schema;
const MAX_NAME = 100;

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

function typeOf(name) {
  const ext = extOf(name);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (SOUND_EXT.includes(ext)) return 'sound';
  return null;
}

/**
 * Turns an arbitrary client file name into a SAFE_NAME: basename only, lower-case, every char
 * outside [a-z0-9._-] becomes "-", repeats collapse, leading non-alphanumerics are dropped, and the
 * result is cut to MAX_NAME while keeping the extension. Returns null when nothing usable remains.
 */
function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  let name;
  try {
    name = decodeURIComponent(raw);
  } catch (_) {
    name = raw;
  }
  name = name.split(/[\\/]/).pop() || '';
  name = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-');
  name = name.replace(/^[^a-z0-9]+/, '');
  const ext = extOf(name);
  if (!ext || !typeOf(name)) return null;
  let base = name.slice(0, name.length - ext.length - 1).replace(/[-._]+$/, '');
  if (!base) base = 'file';
  const room = MAX_NAME - ext.length - 1;
  if (base.length > room) base = base.slice(0, room).replace(/[-._]+$/, '') || 'file';
  const out = `${base}.${ext}`;
  return isSafeName(out) ? out : null;
}

/** Sniffs the media family ('image' | 'sound') from magic bytes, or null when unknown. */
function sniff(buf) {
  if (!buf || buf.length < 4) return null;
  const b = buf;
  const tag = (off, len) => b.toString('latin1', off, off + len);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image', ext: 'png' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image', ext: 'jpeg' };
  if (tag(0, 4) === 'GIF8') return { type: 'image', ext: 'gif' };
  if (tag(0, 4) === 'RIFF' && b.length >= 12) {
    const fmt = tag(8, 4);
    if (fmt === 'WEBP') return { type: 'image', ext: 'webp' };
    if (fmt === 'WAVE') return { type: 'sound', ext: 'wav' };
    return null;
  }
  if (tag(0, 4) === 'OggS') return { type: 'sound', ext: 'ogg' };
  if (tag(0, 3) === 'ID3') return { type: 'sound', ext: 'mp3' };
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return { type: 'sound', ext: 'mp3' };
  return null;
}

/** True when the sniffed format is a plausible match for the file extension. */
function formatMatches(ext, sniffed) {
  const norm = ext === 'jpg' ? 'jpeg' : ext;
  return sniffed.ext === norm;
}

function assetsDir(ctx) {
  const dir = path.join(ctx.dataDir, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function describe(dir, name) {
  const st = fs.statSync(path.join(dir, name));
  return { name, url: `assets/${name}`, size: st.size, type: typeOf(name), mtime: Math.round(st.mtimeMs) };
}

function listAssets(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isFile() || !isSafeName(e.name) || !typeOf(e.name)) continue;
    try {
      out.push(describe(dir, e.name));
    } catch (_) {
      /* vanished between readdir and stat */
    }
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Appends -2, -3, … before the extension until the name is free. */
function uniqueName(dir, name) {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const ext = extOf(name);
  const base = name.slice(0, name.length - ext.length - 1);
  for (let n = 2; n < 10000; n++) {
    const room = MAX_NAME - ext.length - 1 - String(n).length - 1;
    const candidate = `${base.slice(0, room)}-${n}.${ext}`;
    if (!fs.existsSync(path.join(dir, candidate))) return candidate;
  }
  throw new HttpError(409, 'conflict', 'too many files with this name');
}

function register(router, appCtx) {
  router.route('GET', '/api/assets', (req, res, ctx) => {
    json(res, 200, { ok: true, assets: listAssets(assetsDir(ctx)) });
  });

  router.route(
    'POST',
    '/api/assets',
    requireAuth(async (req, res, ctx) => {
      const rawName = req.headers['x-filename'];
      if (typeof rawName !== 'string' || !rawName.trim()) throw new HttpError(400, 'bad_filename', 'Header x-filename fehlt');
      const name = sanitizeName(rawName);
      if (!name) throw new HttpError(400, 'bad_filename', `Dateiname ungültig – erlaubt: ${[...IMAGE_EXT, ...SOUND_EXT].join(', ')}`);
      const body = await readBody(req, { limit: LIMITS.assetBytes });
      const sniffed = sniff(body);
      const ext = extOf(name);
      if (!sniffed || !formatMatches(ext, sniffed)) {
        throw new HttpError(415, 'unsupported_type', 'Dateiinhalt passt nicht zur Endung (erlaubt: PNG, JPEG, GIF, WEBP, MP3, WAV, OGG)');
      }
      const dir = assetsDir(ctx);
      const finalName = uniqueName(dir, name);
      const tmp = path.join(dir, `.upload-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`);
      try {
        fs.writeFileSync(tmp, body);
        fs.renameSync(tmp, path.join(dir, finalName));
      } catch (e) {
        try {
          fs.unlinkSync(tmp);
        } catch (_) {
          /* already gone */
        }
        throw e;
      }
      json(res, 200, { ok: true, asset: describe(dir, finalName) });
    })
  );

  router.route(
    'DELETE',
    '/api/assets/:name',
    requireAuth((req, res, ctx) => {
      const name = ctx.params.name;
      if (!isSafeName(name) || !typeOf(name)) throw new HttpError(400, 'bad_filename', 'Dateiname ungültig');
      const file = path.join(assetsDir(ctx), name);
      try {
        fs.unlinkSync(file);
      } catch (e) {
        if (e.code === 'ENOENT') throw new HttpError(404, 'not_found', 'Datei nicht gefunden');
        throw e;
      }
      json(res, 200, { ok: true });
    })
  );
  void appCtx;
}

module.exports = { register, sanitizeName, sniff, listAssets };
