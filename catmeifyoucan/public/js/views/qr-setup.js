// Cat Me If You Can – Spiel: Einladung als Freiwillige:r (app.html#invite=…) und „Auf dem Handy spielen“
// (QR-Code der Seite, nur auf breiten Bildschirmen). Erweiterung qr-setup; Texte: js/lang/*.js „qrs.*“.
//
// Der Code steht nur im Fragment. app.js nimmt ihn beim Start sofort aus der Adresszeile und legt ihn in
// sessionStorage (catme.invite) – so übersteht er das Onboarding. Eingelöst wird gleich nach der Anmeldung
// oder sofort, wenn schon ein Konto da ist.

import { t } from '../i18n.js';
import { esc, toast, errorText } from '../ui.js';
import { qrSvg, phoneUrl } from '../qr-kit.js';

export const INVITE_KEY = 'catme.invite';
const WIDE = '(min-width: 900px)';

export function pendingInvite() {
  try {
    return sessionStorage.getItem(INVITE_KEY) || globalThis.__catmeInvite || null;
  } catch {
    return globalThis.__catmeInvite || null;
  }
}

function clearInvite() {
  delete globalThis.__catmeInvite;
  try {
    sessionStorage.removeItem(INVITE_KEY);
  } catch {
    /* egal */
  }
}

/** Hinweis im Onboarding: „Du wurdest als Freiwillige:r eingeladen …“ */
export function inviteNote(root) {
  if (!root || !pendingInvite() || root.querySelector('[data-invite-note]')) return;
  const spot = root.querySelector('.onb-rules') || root.querySelector('.onb-form'); // gut sichtbar, wie der Café-Gruß
  if (!spot) return;
  const p = document.createElement('p');
  p.className = 'onb-cafe onb-invite';
  p.dataset.inviteNote = '';
  p.innerHTML = `<span class="onb-cafe-ic" aria-hidden="true">🧡</span><span><b>${esc(t('qrs.invite.note'))}</b></span>`;
  spot.before(p);
}

let running = null;
/** Offene Einladung einlösen (nach der Anmeldung oder beim Start mit Konto). */
export function redeemPendingInvite(app) {
  if (running) return running;
  const code = pendingInvite();
  if (!code || !app || !app.api || !app.api.hasToken()) return Promise.resolve(null);
  running = (async () => {
    if (typeof app.api.redeemInvite !== 'function') {
      clearInvite();
      toast(t('qrs.invite.demo'), { type: 'info', ms: 4500 });
      return null;
    }
    try {
      const r = await app.api.redeemInvite(code);
      clearInvite();
      if (r.player) app.setPlayer({ ...(app.player || {}), ...r.player });
      toast(r.changed ? t('qrs.invite.ok') : r.role === 'admin' ? t('qrs.invite.admin') : t('qrs.invite.already'), { type: 'success', ms: 5500 });
      if (/^#\/profile/.test(location.hash) && app.rerender) app.rerender(); // Rollen-Chip im Profil
      return r;
    } catch (e) {
      // Netz weg / zu viele Versuche → gleich (bzw. beim nächsten Start) nochmal; sonst ist der Code erledigt
      if (e.status === 429) {
        const wait = Math.min(120, Number(e.details && e.details.retryAfter) || 20);
        setTimeout(() => redeemPendingInvite(app), wait * 1000);
        return null;
      }
      if (e.code !== 'network') clearInvite();
      const bad = ['invalid_code', 'code_expired', 'code_used'].includes(e.code);
      toast(bad ? t('qrs.invite.bad') : errorText(e), { type: 'error', ms: 5500 });
      return null;
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * „Auf dem Handy spielen“: QR-Code dieser Seite (ohne Fragment und Query außer ?lang/?ref). Nur auf
 * breiten Bildschirmen – am Handy ist man schon am Handy. Der QR-Erzeuger lädt erst, wenn es passt.
 */
export function mountPhoneCard(el) {
  if (!el || typeof matchMedia !== 'function') return;
  const mq = matchMedia(WIDE);
  const draw = async () => {
    if (!mq.matches || el.dataset.drawn) return;
    el.dataset.drawn = '1';
    const url = phoneUrl(location.href);
    const svg = await qrSvg(url);
    if (!svg || !el.isConnected) return;
    el.innerHTML = `<div class="phone-qr" role="img" aria-label="${esc(t('qrs.phone.alt'))}">${svg}</div>
      <div><h3>📱 ${esc(t('qrs.phone.title'))}</h3><p class="muted small">${esc(t('qrs.phone.lead'))}</p><p class="small"><bdi dir="ltr">${esc(url.replace(/^https?:\/\//, ''))}</bdi></p></div>`;
  };
  draw();
  if (mq.addEventListener) mq.addEventListener('change', draw);
}
