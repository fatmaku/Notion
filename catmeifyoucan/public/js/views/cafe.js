// Cat Me If You Can – Café-QR: Karte „Dein QR-Code“ in der Café-Ansicht (partner.html) mit Link,
// Kopieren, QR als Bild, Zahlen und Knopf zur Druckvorlage; dazu kleine Helfer für print.js und die
// Moderation (admin.js). Texte: js/lang/*.js unter „Erweiterung: cafe“.

import { t } from '../i18n.js';
import { esc, fmtNum, isolate, pct } from '../ui.js';

let qrLib = null;
function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLib) {
    qrLib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/qrcode.js';
      s.onload = () => resolve(window.qrcode);
      s.onerror = reject;
      document.head.append(s);
    }).catch(() => null);
  }
  return qrLib;
}

/**
 * QR-Code als skalierbares SVG. Fehlerkorrektur Q (≈ 25 %) hält auch Flecken auf Tischkarten und
 * Stickern aus; margin = Ruhezone in Modulen (Norm: 4).
 */
export async function qrSvgFor(text, { ecc = 'Q', margin = 4 } = {}) {
  const qrcode = await loadQr();
  if (!qrcode) return '';
  const qr = qrcode(0, ecc);
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 1, margin, scalable: true });
}

/** Adresse der Startseite: CATME_PUBLIC_URL, sonst der Ordner dieser Seite (index.html liegt daneben). */
export function siteBase(publicUrl) {
  return publicUrl ? `${String(publicUrl).replace(/\/+$/, '')}/` : new URL('./', location.href).href;
}

/** Link im QR-Code: <Startseite>/?ref=<Code> – ohne Code die Startseite selbst. */
export function refLink(code, publicUrl) {
  const base = siteBase(publicUrl);
  return code ? `${base}?ref=${encodeURIComponent(code)}` : base;
}

export const shortLink = (url) => String(url).replace(/^https?:\/\//, '');

/** Adresse, die nur im eigenen Netz funktioniert (localhost, 127.x, 10.x, 192.168.x, 172.16–31.x, *.local). */
export function isLocalAddress(url) {
  let h;
  try {
    h = new URL(url).hostname;
  } catch {
    return false;
  }
  return h === 'localhost' || h.endsWith('.local') || h === '[::1]' || /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

/** Text in die Zwischenablage (auch ohne HTTPS: Rückfall über ein markiertes Eingabefeld). */
async function copyText(text, input) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Rückfall unten */
  }
  if (!input) return false;
  input.focus();
  input.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

/**
 * SVG → PNG-Datei (ca. 1024 px, weißer Rand) zum Speichern, z. B. für Instagram oder eigene Flyer.
 * Das SVG ist „scalable“ (nur viewBox) – ohne feste Größe würde der Browser es als 300 × 150 malen
 * und verzerren. Deshalb: ganze Pixel je Modul, feste Breite/Höhe, scharfe Kanten.
 */
async function savePng(svg, fileName) {
  const n = Number((/viewBox="0 0 (\d+) \d+"/.exec(svg) || [])[1]) || 41;
  const size = n * Math.max(8, Math.round(1024 / n));
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" shape-rendering="crispEdges" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function statRow(label, value, recent) {
  return `<li><span class="kit-stat-l">${esc(label)}${recent != null ? `<small>${esc(t('cafe.stats.recent', { n: recent }))}</small>` : ''}</span><b class="kit-stat-v">${esc(fmtNum(value))}</b></li>`;
}

/**
 * Karte „Dein QR-Code“ für die Café-Ansicht. api(method, path) ist der Abruf von partner.js (mit der
 * Café-Sitzung); die Zahlen kommen von GET /api/partner/stats.
 */
export async function renderCafeCard(el, { api }) {
  if (!el) return;
  el.innerHTML = `<h2>${esc(t('cafe.qr.title'))}</h2><p class="muted">…</p>`;
  let s;
  try {
    s = await api('GET', '/api/partner/stats');
  } catch {
    el.innerHTML = `<h2>${esc(t('cafe.qr.title'))}</h2><p class="err">${esc(t('err.generic'))}</p>`;
    return;
  }
  const link = refLink(s.refCode, s.publicUrl);
  el.innerHTML = `
    <h2>${esc(t('cafe.qr.title'))}</h2>
    <p class="muted">${esc(t('cafe.qr.lead'))}</p>
    <div class="kit-qr" data-kit-qr role="img" aria-label="${esc(t('cafe.qr.alt'))}"></div>
    <input class="kit-link" data-kit-link readonly dir="ltr" value="${esc(link)}" aria-label="${esc(t('cafe.qr.linkLabel'))}">
    <div class="kit-actions">
      <button type="button" class="btn" data-kit-copy>${esc(t('cafe.qr.copy'))}</button>
      <button type="button" class="btn" data-kit-save>${esc(t('cafe.qr.save'))}</button>
    </div>
    <a class="btn primary big wide" data-kit-print href="print.html?cafe=${encodeURIComponent(s.placeId)}">🖨️ ${esc(t('cafe.qr.print'))}</a>
    <h3 class="kit-h">${esc(t('cafe.stats.title'))}</h3>
    <ul class="kit-stats">
      ${statRow(t('cafe.stats.players'), s.players.total, s.players.recent)}
      ${statRow(t('cafe.stats.goal'), s.reachedGoal.total, s.reachedGoal.recent)}
      ${statRow(t('cafe.stats.redeemed'), s.redeemed.total, s.redeemed.recent)}
    </ul>
    ${s.players.total ? '' : `<p class="muted small">${esc(t('cafe.stats.empty'))}</p>`}`;

  const svg = await qrSvgFor(link);
  const box = el.querySelector('[data-kit-qr]');
  if (box) box.innerHTML = svg;
  const input = el.querySelector('[data-kit-link]');
  const copyBtn = el.querySelector('[data-kit-copy]');
  copyBtn.addEventListener('click', async () => {
    const ok = await copyText(link, input);
    copyBtn.textContent = ok ? `✓ ${t('cafe.qr.copied')}` : t('cafe.qr.copy');
    setTimeout(() => {
      if (copyBtn.isConnected) copyBtn.textContent = t('cafe.qr.copy');
    }, 2200);
  });
  el.querySelector('[data-kit-save]').addEventListener('click', () => {
    if (svg) savePng(svg, `catmeifyoucan-qr-${s.refCode || 'kadikoy'}.png`).catch(() => {});
  });
}

let welcome = null;
/**
 * Willkommen im Spiel (Onboarding in app.js): Wer über den QR-Code eines Cafés kam, sieht vor dem
 * Spitznamen „Willkommen von Café X“ und dessen Angebot. Einmal pro Seitenaufruf abgefragt; ohne
 * Café oder bei Fehlern passiert nichts. Nach einem Sprachwechsel wieder aufgerufen (neues HTML).
 */
export async function cafeWelcome(root, api) {
  if (!root || !api || typeof api.cafeWelcome !== 'function') return;
  welcome ||= api.cafeWelcome().then((r) => (r && r.cafe) || null).catch(() => null);
  const c = await welcome;
  const spot = root.querySelector('.onb-rules') || root.querySelector('.onb-form'); // direkt unter „20 = 20 %“
  if (!c || !spot || root.querySelector('[data-cafe-welcome]')) return;
  const p = document.createElement('p');
  p.className = 'onb-cafe';
  p.dataset.cafeWelcome = '';
  p.innerHTML = `<span class="onb-cafe-ic" aria-hidden="true">☕</span><span><b>${esc(t('cafe.welcome', { name: isolate(c.name) }))}</b><br>${esc(t('cafe.welcomeDeal', { n: c.minCats, pct: pct(c.discountPct) }))}</span>`;
  spot.before(p);
}

/** Zusatz für die Zeile eines Cafés in der Moderation: QR-Code und Zahlen (HTML, escaped). */
export function cafeAdminInfo(info) {
  if (!info || !info.refCode) return '';
  const print = info.live && info.placeId ? ` · <a href="print.html?cafe=${encodeURIComponent(info.placeId)}">🖨️ ${esc(t('cafe.admin.print'))}</a>` : '';
  return ` · QR <code dir="ltr">${esc(info.refCode)}</code> · ${esc(t('cafe.admin.players', { n: info.players.total, recent: info.players.recent }))} · ${esc(t('cafe.admin.goal', { n: info.reachedGoal.total }))}${print}`;
}
