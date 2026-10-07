// Cat Me If You Can – Café-Ansicht für das Personal: anmelden (Café + PIN), Gutschein scannen
// (Kamera, QR) oder Code eintippen, prüfen, einlösen. Heute eingelöste Gutscheine.

import { esc } from './ui.js';
import { setLang } from './i18n.js';

const T = {
  tr: {
    title: 'Kupon doğrulama', cafe: 'Kafe', pin: 'PIN', login: 'Giriş', logout: 'Çıkış', scan: 'QR tara', stop: 'Durdur',
    code: 'Kupon kodu', check: 'Kontrol et', redeem: '✓ Kullan ({n})', valid: 'Geçerli', invalid: 'Geçersiz', today: 'Bugün kullanılanlar',
    none: 'Henüz yok.', cats: '{n} kedi bugün', needs: 'Gerekli: {n} kedi', total: 'Toplam: {n}', redeemed: 'Kullanıldı ✓',
    noScan: 'Bu tarayıcı QR okuyamıyor – kodu elle gir.', bad_login: 'Kafe veya PIN yanlış.', next: 'Sonraki kupon',
    r_bad_code: 'Kod biçimi yanlış.', r_not_found: 'Böyle bir kupon yok.', r_already_redeemed: 'Bu kupon zaten kullanılmış ({who}, {t}).',
    r_expired: 'Süresi dolmuş (sadece aynı gün geçerli).', r_wrong_region: 'Başka bir bölgenin kuponu.', r_not_enough_cats: 'Yeterli kedi yok: {n}/{min}.',
    r_player_banned: 'Bu hesap engellendi.', r_partner_daily_limit: 'Bugünkü kupon limitine ulaşıldı.', err: 'Hata – tekrar dene.',
  },
  de: {
    title: 'Gutschein prüfen', cafe: 'Café', pin: 'PIN', login: 'Anmelden', logout: 'Abmelden', scan: 'QR scannen', stop: 'Stopp',
    code: 'Gutschein-Code', check: 'Prüfen', redeem: '✓ Einlösen ({n})', valid: 'Gültig', invalid: 'Ungültig', today: 'Heute eingelöst',
    none: 'Noch keine.', cats: '{n} Katze heute|{n} Katzen heute', needs: 'Nötig: {n} Katze|Nötig: {n} Katzen', total: 'Gesamt: {n}', redeemed: 'Eingelöst ✓',
    noScan: 'Dieser Browser kann keine QR-Codes lesen – Code bitte eintippen.', bad_login: 'Café oder PIN falsch.', next: 'Nächster Gutschein',
    r_bad_code: 'Code-Format falsch.', r_not_found: 'Diesen Gutschein gibt es nicht.', r_already_redeemed: 'Schon eingelöst ({who}, {t}).',
    r_expired: 'Abgelaufen (gilt nur am selben Tag).', r_wrong_region: 'Gutschein aus einer anderen Region.', r_not_enough_cats: 'Zu wenige Katzen: {n}/{min}.',
    r_player_banned: 'Dieses Konto ist gesperrt.', r_partner_daily_limit: 'Tageslimit dieses Cafés erreicht.', err: 'Fehler – nochmal versuchen.',
  },
  en: {
    title: 'Check voucher', cafe: 'Café', pin: 'PIN', login: 'Log in', logout: 'Log out', scan: 'Scan QR', stop: 'Stop',
    code: 'Voucher code', check: 'Check', redeem: '✓ Redeem ({n})', valid: 'Valid', invalid: 'Not valid', today: 'Redeemed today',
    none: 'None yet.', cats: '{n} cat today|{n} cats today', needs: 'Needs {n} cat|Needs {n} cats', total: 'Total: {n}', redeemed: 'Redeemed ✓',
    noScan: 'This browser can’t read QR codes – please type the code.', bad_login: 'Wrong café or PIN.', next: 'Next voucher',
    r_bad_code: 'Wrong code format.', r_not_found: 'No such voucher.', r_already_redeemed: 'Already redeemed ({who}, {t}).',
    r_expired: 'Expired (valid on the same day only).', r_wrong_region: 'Voucher from another region.', r_not_enough_cats: 'Not enough cats: {n}/{min}.',
    r_player_banned: 'This account is banned.', r_partner_daily_limit: 'Daily voucher limit reached.', err: 'Error – try again.',
  },
};
let lang = (() => {
  try {
    return localStorage.getItem('catme.lang') || (navigator.language || 'tr').slice(0, 2);
  } catch {
    return 'tr';
  }
})();
if (!T[lang]) lang = 'en'; // Café-Seite gibt es auf tr/en/de – sonst Englisch (BRAND.md §3)
const t = (k, v) => {
  let s = T[lang][k] || T.tr[k] || k;
  if (s.includes('|') && v && v.n != null) s = s.split('|')[Number(v.n) === 1 ? 0 : 1];
  return s.replace(/\{(\w+)\}/g, (_, x) => (v && v[x] != null ? v[x] : ''));
};
const pctTxt = (n) => (lang === 'tr' ? `%${n}` : lang === 'de' ? `${n} %` : `${n}%`);
const time = (ts) => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

const KEY = 'catme.partner.token';
let token = (() => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
const view = document.querySelector('#view');

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'error'), { code: data.error, status: res.status, details: data.details });
  return data;
}

function langs() {
  const el = document.querySelector('[data-langs]');
  el.innerHTML = Object.keys(T).map((l) => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}">${l.toUpperCase()}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    try {
      localStorage.setItem('catme.lang', lang);
    } catch {
      /* egal */
    }
    langs();
    render();
  };
}

async function renderLogin() {
  let partners = [];
  try {
    partners = await api('GET', '/api/partners');
  } catch {
    /* offline */
  }
  view.innerHTML = `<section class="card staff-card"><h1>☕ ${esc(t('title'))}</h1>
    <form data-f class="settings">
      <label>${esc(t('cafe'))}<select name="partnerId" required>${partners.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.address ? ` – ${esc(p.address)}` : ''}</option>`).join('')}</select></label>
      <label>${esc(t('pin'))}<input name="pin" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" required minlength="6" maxlength="12"></label>
      <button class="btn primary big">${esc(t('login'))}</button>
      <p class="err" data-err hidden></p>
    </form></section>`;
  view.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await api('POST', '/api/partner/login', { partnerId: f.partnerId.value, pin: f.pin.value });
      token = r.token;
      try {
        sessionStorage.setItem(KEY, token);
      } catch {
        /* egal */
      }
      render();
    } catch (err) {
      const el = view.querySelector('[data-err]');
      el.hidden = false;
      el.textContent = err.code === 'bad_login' ? t('bad_login') : err.message;
    }
  });
}

let scanStop = null;
async function startScan(onCode) {
  const box = view.querySelector('[data-scan]');
  const video = box.querySelector('video');
  const hasDetector = 'BarcodeDetector' in window;
  let jsQR = null;
  if (!hasDetector) {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'vendor/jsQR.js';
      s.onload = resolve;
      s.onerror = resolve;
      document.head.append(s);
    });
    jsQR = window.jsQR || null;
    if (!jsQR) {
      alert(t('noScan'));
      return;
    }
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch {
    alert(t('noScan'));
    return;
  }
  video.srcObject = stream;
  await video.play();
  box.hidden = false;
  const detector = hasDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let running = true;
  scanStop = () => {
    running = false;
    stream.getTracks().forEach((tr) => tr.stop());
    box.hidden = true;
    scanStop = null;
  };
  const tick = async () => {
    if (!running) return;
    try {
      let text = null;
      if (detector) {
        const codes = await detector.detect(video);
        if (codes[0]) text = codes[0].rawValue;
      } else if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (r) text = r.data;
      }
      if (text) {
        scanStop();
        onCode(text);
        return;
      }
    } catch {
      /* nächster Frame */
    }
    setTimeout(tick, 250);
  };
  tick();
}

function reasonText(r) {
  if (!r.reason) return '';
  return t(`r_${r.reason}`, { who: r.redeemedBy || '', t: r.redeemedAt ? time(r.redeemedAt) : '', n: r.catCount, min: r.minCats });
}

function resultHtml(r) {
  return `<div class="result ${r.valid ? 'ok' : r.redeemed ? 'done' : 'bad'}">
    <div class="result-big">${r.redeemed ? esc(t('redeemed')) : r.valid ? `✓ ${esc(t('valid'))}` : `✕ ${esc(t('invalid'))}`}</div>
    ${r.code ? `<div class="result-code">${esc(r.code)}</div>` : ''}
    ${r.nickname ? `<p><b>${esc(r.nickname)}</b> · ${esc(t('cats', { n: r.catCount }))} · ${esc(t('needs', { n: r.minCats }))}</p>` : ''}
    ${r.valid || r.redeemed ? `<div class="result-pct">${esc(pctTxt(r.discountPct))}</div>` : ''}
    ${!r.valid && !r.redeemed ? `<p class="result-why">${esc(reasonText(r))}</p>` : ''}
    ${r.cats && r.cats.length ? `<div class="strip">${r.cats.map((c) => (c.photoUrl ? `<img class="catimg xs" src="${esc(c.photoUrl)}" alt="">` : '<span class="catdot">🐱</span>')).join('')}</div>` : ''}
    ${r.valid ? `<button class="btn primary big" data-redeem="${esc(r.code)}">${esc(t('redeem', { n: pctTxt(r.discountPct) }))}</button>` : ''}
    <button class="btn" data-next>${esc(t('next'))}</button>
  </div>`;
}

async function renderDesk() {
  let me;
  try {
    me = await api('GET', '/api/partner/me');
  } catch (e) {
    token = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* egal */
    }
    return renderLogin();
  }
  view.innerHTML = `
    <section class="card staff-card">
      <header><h1>☕ ${esc(me.partner.name)}</h1><button class="link" data-logout>${esc(t('logout'))}</button></header>
      <p class="muted">${esc(t('needs', { n: me.partner.reward.minCats }))} → <b>${esc(pctTxt(me.partner.reward.discountPct))}</b></p>
      <div class="scan" data-scan hidden><video playsinline muted></video><button class="btn" data-stop>${esc(t('stop'))}</button></div>
      <button class="btn primary big wide" data-start>📷 ${esc(t('scan'))}</button>
      <form data-f class="row codeform"><input name="code" placeholder="CAT-XXXX-XXXX" autocapitalize="characters" autocomplete="off" aria-label="${esc(t('code'))}"><button class="btn">${esc(t('check'))}</button></form>
      <div data-result></div>
    </section>
    <section class="card"><h2>${esc(t('today'))} <small class="muted">${esc(t('total', { n: me.redemptions.totalAllTime }))}</small></h2>
      <ul class="cafes">${me.redemptions.items.map((r) => `<li><span class="cafe-ico">✓</span><span><b>${esc(r.code)}</b><br><small class="muted">${esc(r.nickname)} · ${esc(t('cats', { n: r.catCount }))}</small></span><span class="cafe-deal"><b>${esc(pctTxt(r.discountPct))}</b><small>${esc(time(r.at))}</small></span></li>`).join('') || `<li class="muted">${esc(t('none'))}</li>`}</ul>
    </section>`;
  const out = view.querySelector('[data-result]');
  const check = async (code) => {
    try {
      const r = await api('POST', '/api/partner/check', { code });
      out.innerHTML = resultHtml(r);
      if (navigator.vibrate) navigator.vibrate(r.valid ? 80 : [60, 60, 60]);
    } catch (e) {
      out.innerHTML = `<p class="err">${esc(e.message || t('err'))}</p>`;
    }
  };
  view.querySelector('[data-f]').addEventListener('submit', (e) => {
    e.preventDefault();
    check(e.target.code.value);
  });
  view.querySelector('[data-start]').addEventListener('click', () => startScan(check));
  view.querySelector('[data-stop]').addEventListener('click', () => scanStop && scanStop());
  view.querySelector('[data-logout]').addEventListener('click', async () => {
    await api('POST', '/api/partner/logout').catch(() => {});
    token = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* egal */
    }
    render();
  });
  out.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-redeem]');
    if (b) {
      b.disabled = true;
      try {
        const r = await api('POST', '/api/partner/redeem', { code: b.dataset.redeem });
        out.innerHTML = resultHtml(r);
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(renderDesk, 2500);
      } catch (err) {
        out.innerHTML = resultHtml({ valid: false, ...(err.details || {}), reason: err.code });
      }
    }
    if (e.target.closest('[data-next]')) {
      out.innerHTML = '';
      view.querySelector('[data-f]').code.value = '';
    }
  });
}

function render() {
  if (scanStop) scanStop();
  setLang(lang);
  return token ? renderDesk() : renderLogin();
}

langs();
render();
