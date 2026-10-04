// Cat Me If You Can – Teilen: zeichnet die Katzenkarte als Bild (1080 × 1350, Instagram-Format) und
// teilt sie über das Teilen-Menü des Handys (Web Share). Ohne Teilen-Menü wird das Bild gespeichert.

import { t, L, tx, isRtl } from './i18n.js';
import { PATTERNS, RARITY } from '../core/taxonomy.js';
import { catAvatarDataUrl } from './avatar.js';

const W = 1080;
const H = 1350;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Zeichnet die Karte und gibt einen PNG-Blob zurück. */
export async function renderShareImage(cat, analysis = {}) {
  const display = isRtl() ? 'Vazirmatn' : 'Unbounded';
  const body = isRtl() ? 'Vazirmatn' : 'Manrope';
  try {
    await Promise.all([document.fonts.load(`700 80px ${display}`), document.fonts.load(`600 40px ${body}`), document.fonts.load('700 40px Unbounded')]);
  } catch {
    /* Schrift fehlt → Systemschrift */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  // Nachthimmel über Kadıköy
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d2d55');
  g.addColorStop(1, '#14213d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(242,140,40,.18)';
  ctx.beginPath();
  ctx.arc(W * 0.85, 140, 260, 0, Math.PI * 2);
  ctx.fill();

  // Foto im Sucher
  const px = 110;
  const py = 120;
  const ps = W - 2 * px;
  const img = await loadImage(cat.photoUrl || catAvatarDataUrl(cat)).catch(() => loadImage(catAvatarDataUrl(cat)));
  ctx.save();
  roundRect(ctx, px, py, ps, ps, 48);
  ctx.clip();
  const s = Math.max(ps / img.width, ps / img.height);
  ctx.drawImage(img, px + (ps - img.width * s) / 2, py + (ps - img.height * s) / 2, img.width * s, img.height * s);
  ctx.restore();
  ctx.strokeStyle = '#fbf3e4';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  const k = 90;
  for (const [x, y, dx, dy] of [[px - 30, py - 30, 1, 1], [px + ps + 30, py - 30, -1, 1], [px - 30, py + ps + 30, 1, -1], [px + ps + 30, py + ps + 30, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * k);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * k, y);
    ctx.stroke();
  }

  // Name, Typ, Sterne
  ctx.textAlign = 'center';
  ctx.direction = isRtl() ? 'rtl' : 'ltr';
  ctx.fillStyle = '#fbf3e4';
  ctx.font = `700 92px ${display}, sans-serif`;
  const name = cat.name || t('card.unnamed');
  ctx.fillText(name.length > 16 ? `${name.slice(0, 15)}…` : name, W / 2, py + ps + 150);
  ctx.font = `600 40px ${body}, sans-serif`;
  ctx.fillStyle = '#f6d55c';
  const stars = '★'.repeat((RARITY[cat.rarity] || RARITY.common).stars);
  const type = L(PATTERNS, (cat.profile && cat.profile.pattern) || analysis.pattern || 'diger');
  ctx.fillText(`${stars}  ${type}${cat.districtName ? ` · ${cat.districtName}` : ''}`, W / 2, py + ps + 215);
  const flavor = tx(analysis.summary);
  if (flavor) {
    ctx.font = `500 34px ${body}, sans-serif`;
    ctx.fillStyle = 'rgba(251,243,228,.85)';
    ctx.fillText(flavor.length > 60 ? `${flavor.slice(0, 58)}…` : flavor, W / 2, py + ps + 272);
  }

  // Fußzeile: Logo + Name + Hashtag
  const logo = await loadImage('icons/logo.svg').catch(() => null);
  ctx.direction = 'ltr';
  if (logo) ctx.drawImage(logo, 110, H - 160, 96, 96);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbf3e4';
  ctx.font = '700 44px Unbounded, sans-serif';
  ctx.fillText('Cat Me If You Can', 228, H - 104);
  ctx.fillStyle = '#f28c28';
  ctx.font = '600 32px Manrope, sans-serif';
  ctx.fillText('#CatMeKadikoy', 228, H - 60);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

/** Teilen (Handy) oder als Datei speichern. Rückgabe: 'shared' | 'saved' | 'cancelled' */
export async function shareCat(cat, analysis) {
  const blob = await renderShareImage(cat, analysis);
  const fileName = `catmeifyoucan-${(cat.name || 'kedi').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  const text = t('share.text', { name: cat.name || t('card.unnamed') });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'Cat Me If You Can' });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'saved';
}
