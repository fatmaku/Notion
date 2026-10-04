// Cat Me If You Can – Fotos speichern.
//
// Vom Handy kommen zwei JPEGs als Data-URL: das ganze Foto (für die KI-Analyse und die
// Moderation) und der Ausschnitt mit der Katze. Öffentlich ausgeliefert wird NUR der Ausschnitt
// (/photos/<id>_c.jpg) – auf dem ganzen Foto können Menschen, Hausnummern, Kennzeichen sein.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { HttpError } from './http.js';

const DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

/** Data-URL → {mime, data (base64), buf}. Prüft JPEG-Signatur und Größe. */
export function decodeJpegDataUrl(value, maxBytes, field) {
  if (typeof value !== 'string') throw new HttpError(400, 'image_missing', `${field}: JPEG als Data-URL erwartet`);
  const m = DATA_URL.exec(value);
  if (!m) throw new HttpError(400, 'image_invalid', `${field}: nur image/jpeg als Data-URL`);
  const buf = Buffer.from(m[1], 'base64');
  // Anfang (SOI) und Ende (EOI) prüfen – die App schickt immer per Canvas erzeugte JPEGs
  const hasEoi = buf.length > 4 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
  if (buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff || !hasEoi) throw new HttpError(400, 'image_invalid', `${field}: keine gültige JPEG-Datei`);
  if (buf.length > maxBytes) throw new HttpError(413, 'image_too_large', `${field}: höchstens ${Math.round(maxBytes / 1024)} KB`);
  return { mime: 'image/jpeg', data: m[1], buf };
}

export function createPhotoStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (id, kind) => path.join(dir, `${id}_${kind}.jpg`);
  return {
    dir,
    async save(images) {
      const id = crypto.randomBytes(10).toString('hex');
      const full = images && images.full;
      const crop = images && images.crop;
      if (!full || !full.buf) throw new HttpError(400, 'image_missing', 'Foto fehlt');
      await fs.promises.writeFile(file(id, 'f'), full.buf);
      // Öffentlich nur der Ausschnitt um die Katze – ohne Ausschnitt bleibt das Foto privat.
      if (!crop || !crop.buf) return { photoId: id, photoUrl: null };
      await fs.promises.writeFile(file(id, 'c'), crop.buf);
      return { photoId: id, photoUrl: `/photos/${id}_c.jpg` };
    },
    async remove(id) {
      if (!/^[0-9a-f]{20}$/.test(String(id))) return;
      for (const k of ['f', 'c']) await fs.promises.rm(file(id, k), { force: true });
    },
    /** Ausschnitt als base64 (für den KI-Vergleich mit Kandidaten). */
    async readCrop(id) {
      if (!/^[0-9a-f]{20}$/.test(String(id))) return null;
      try {
        return (await fs.promises.readFile(file(id, 'c'))).toString('base64');
      } catch {
        return null;
      }
    },
    fullPath(id) {
      return /^[0-9a-f]{20}$/.test(String(id)) ? file(id, 'f') : null;
    },
  };
}
