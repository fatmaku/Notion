// Cat Me If You Can – Gutschein: Code + QR, laufende Uhr und tanzende Pfote (gegen Screenshots),
// heutige Katzen als Nachweis, Liste der Cafés mit ihrem Rabatt.

import { t } from '../i18n.js';
import { esc, catImg, fmtTime, toast, errorText, pct, confetti } from '../ui.js';

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

export async function qrSvg(text, cell = 6) {
  const qrcode = await loadQr();
  if (!qrcode) return '';
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

export async function renderVoucher(view, app) {
  const [{ today }, v0] = await Promise.all([app.api.me(), app.api.voucherToday()]);
  let v = v0;
  if (!v) {
    // Noch kein Gutschein möglich: Text zählt wie die Startseite bis zum Tagesziel (20)
    if (today.count < today.minCatsForVoucher) {
      const left = Math.max(0, today.goal - today.count);
      view.innerHTML = `<div class="empty"><div class="big-emoji">☕</div><h2>${esc(t('v.notYet'))}</h2><p>${esc(t('home.left', { n: left }))}</p><a class="btn primary" href="#/catch">📸 ${esc(t('nav.catch'))}</a></div>`;
      return;
    }
    try {
      v = await app.api.claimVoucher();
      confetti(view);
    } catch (e) {
      toast(errorText(e), { type: 'error' });
      return;
    }
  }
  const eligible = v.partners.filter((p) => p.eligible);
  const best = eligible.reduce((m, p) => Math.max(m, p.discountPct), 0) || 20;
  const state = v.redeemedAt ? 'redeemed' : v.expired ? 'expired' : 'valid';
  view.innerHTML = `
    <section class="voucher ${state}">
      <header><img src="icons/logo.svg" alt="" width="44" height="44"><div><b>Cat Me If You Can</b><small>${esc(t('v.title'))} · ${esc(v.day)}</small></div></header>
      <div class="v-discount">${esc(t('v.discount', { n: best }))}</div>
      <div class="v-qr" data-qr></div>
      <div class="v-code"><small>${esc(t('v.code'))}</small><b>${esc(v.code)}</b></div>
      <div class="v-live"><span class="paw" aria-hidden="true">🐾</span><b data-clock>--:--:--</b></div>
      <p class="v-state">${state === 'redeemed' ? `✓ ${esc(t('v.redeemed'))} · ${esc(v.redeemedBy || '')} · ${esc(fmtTime(v.redeemedAt))}` : state === 'expired' ? esc(t('v.expired')) : esc(t('v.validUntil', { t: '23:59' }))}</p>
      <p class="small">${esc(t('v.show'))}</p>
      <div class="v-cats"><small>${esc(t('v.cats', { n: v.catCount }))}</small><div class="strip">${today.cats.slice(0, 30).map((c) => catImg({ ...c, id: c.catId }, { size: 'xs' })).join('')}</div></div>
    </section>
    <section class="card"><h2>${esc(t('v.partners'))}</h2><ul class="cafes">${v.partners.map((p) => `
      <li class="${p.eligible ? '' : 'dim'}"><span class="cafe-ico">☕</span><span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.address)}</small></span>
      <span class="cafe-deal"><b>${esc(pct(p.discountPct))}</b><small>${esc(t('v.needs', { n: p.minCats }))}</small></span></li>`).join('')}</ul></section>
    ${app.api.isDemo && state === 'valid' ? `<p class="center"><button class="btn" data-demo-redeem>🧪 ${esc(t('v.demoRedeem'))}</button></p>` : ''}`;

  qrSvg(`CATME:${v.code}`).then((svg) => {
    const el = view.querySelector('[data-qr]');
    if (el) el.innerHTML = svg || '';
  });
  const clock = view.querySelector('[data-clock]');
  const tick = () => {
    if (!document.body.contains(clock)) return;
    clock.textContent = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
    setTimeout(tick, 1000);
  };
  tick();
  view.querySelector('[data-demo-redeem]')?.addEventListener('click', async () => {
    try {
      await app.api.demoRedeem(v.code);
      toast(t('v.redeemed'), { type: 'success' });
      renderVoucher(view, app);
    } catch (e) {
      toast(errorText(e), { type: 'error' });
    }
  });
}
