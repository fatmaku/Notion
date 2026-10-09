// Cat Me If You Can – Café-Ansicht für das Personal: anmelden (Café + PIN), Gutschein scannen
// (Kamera, QR) oder Code eintippen, prüfen, einlösen. Heute eingelöste Gutscheine.
// Erweiterung qr-setup: partner.html#setup=<Code> richtet das Handy des Cafés ein – PIN selbst wählen,
// angemeldet, danach Hinweis „Zum Startbildschirm“ und die Karte mit dem eigenen QR-Code.

import { esc } from './ui.js';
import { setLang } from './i18n.js';
import { renderCafeCard } from './views/cafe.js'; // Café-QR: Karte „Dein QR-Code“
import { takeFragmentCode, weakPin } from './qr-kit.js';

// Code sofort aus der Adresszeile nehmen; für ein Neuladen in diesem Tab merken (sessionStorage)
const SETUP_KEY = 'catme.partner.setup';
let setupCode = takeFragmentCode('setup');
try {
  if (setupCode) sessionStorage.setItem(SETUP_KEY, setupCode);
  else setupCode = sessionStorage.getItem(SETUP_KEY);
} catch {
  /* egal */
}
let justSetUp = false;
const LAST_KEY = 'catme.partner.last'; // zuletzt benutztes Café – in der Anmeldung vorausgewählt

const T = {
  tr: {
    title: 'Kupon doğrulama', cafe: 'Kafe', pin: 'PIN', login: 'Giriş', logout: 'Çıkış', scan: 'QR tara', stop: 'Durdur',
    code: 'Kupon kodu', check: 'Kontrol et', redeem: '✓ Kullan ({n})', valid: 'Geçerli', invalid: 'Geçersiz', today: 'Bugün kullanılanlar',
    none: 'Henüz yok.', cats: '{n} kedi bugün', needs: 'Gerekli: {n} kedi', total: 'Toplam: {n}', redeemed: 'Kullanıldı ✓',
    noScan: 'Bu tarayıcı QR okuyamıyor – kodu elle gir.', bad_login: 'Kafe veya PIN yanlış.', next: 'Sonraki kupon',
    r_bad_code: 'Kod biçimi yanlış.', r_not_found: 'Böyle bir kupon yok.', r_already_redeemed: 'Bu kupon zaten kullanılmış ({who}, {t}).',
    r_expired: 'Süresi dolmuş (sadece aynı gün geçerli).', r_wrong_region: 'Başka bir bölgenin kuponu.', r_not_enough_cats: 'Yeterli kedi yok: {n}/{min}.',
    r_player_banned: 'Bu hesap engellendi.', r_partner_daily_limit: 'Bugünkü kupon limitine ulaşıldı.', err: 'Hata – tekrar dene.',
    // ── Erweiterung: qr-setup ──
    setupTitle: 'Bu telefonu kur', setupLead: '{name} için bir PIN seç (6–12 rakam). Ekibin başka cihazlarda bu PIN ile girer.',
    newPin: 'Yeni PIN', pin2: 'PIN\'i tekrar yaz', setupGo: 'Kaydet ve başla', pinMismatch: 'İki PIN aynı değil.', pinRule: 'PIN 6–12 rakam olmalı.',
    setupBad: 'Bu kurulum QR\'ı artık çalışmıyor. Cat Me ekibinden yenisini iste.', setupDone: 'Hazır! Bu telefon kuruldu.',
    a2hsTitle: 'Ana ekrana ekle', a2hsLead: 'Böylece kafe ekranı tek dokunuşla açılır.', a2hsIos: 'iPhone: Paylaş ⬆️ → „Ana Ekrana Ekle“.',
    a2hsAndroid: 'Android: menü ⋮ → „Ana ekrana ekle“.', ok: 'Tamam', checking: 'Kontrol ediliyor…',
    pinWeak: 'Bu PIN çok kolay (ör. 123456). Başka bir PIN seç.', tooMany: 'Çok fazla deneme. Bir dakika bekle.',
  },
  de: {
    title: 'Gutschein prüfen', cafe: 'Café', pin: 'PIN', login: 'Anmelden', logout: 'Abmelden', scan: 'QR scannen', stop: 'Stopp',
    code: 'Gutschein-Code', check: 'Prüfen', redeem: '✓ Einlösen ({n})', valid: 'Gültig', invalid: 'Ungültig', today: 'Heute eingelöst',
    none: 'Noch keine.', cats: '{n} Katze heute|{n} Katzen heute', needs: 'Nötig: {n} Katze|Nötig: {n} Katzen', total: 'Gesamt: {n}', redeemed: 'Eingelöst ✓',
    noScan: 'Dieser Browser kann keine QR-Codes lesen – Code bitte eintippen.', bad_login: 'Café oder PIN falsch.', next: 'Nächster Gutschein',
    r_bad_code: 'Code-Format falsch.', r_not_found: 'Diesen Gutschein gibt es nicht.', r_already_redeemed: 'Schon eingelöst ({who}, {t}).',
    r_expired: 'Abgelaufen (gilt nur am selben Tag).', r_wrong_region: 'Gutschein aus einer anderen Region.', r_not_enough_cats: 'Zu wenige Katzen: {n}/{min}.',
    r_player_banned: 'Dieses Konto ist gesperrt.', r_partner_daily_limit: 'Tageslimit dieses Cafés erreicht.', err: 'Fehler – nochmal versuchen.',
    // ── Erweiterung: qr-setup ──
    setupTitle: 'Dieses Handy einrichten', setupLead: 'Wähle eine PIN für {name} (6–12 Ziffern). Dein Team meldet sich damit auf anderen Geräten an.',
    newPin: 'Neue PIN', pin2: 'PIN noch einmal', setupGo: 'Speichern und los', pinMismatch: 'Die beiden PINs sind nicht gleich.', pinRule: 'Die PIN hat 6–12 Ziffern.',
    setupBad: 'Dieser Einrichtungs-QR geht nicht mehr. Bitte beim Cat-Me-Team einen neuen holen.', setupDone: 'Fertig! Dieses Handy ist eingerichtet.',
    a2hsTitle: 'Zum Startbildschirm', a2hsLead: 'Dann öffnet sich die Café-Ansicht mit einem Tipp.', a2hsIos: 'iPhone: Teilen ⬆️ → „Zum Home-Bildschirm“.',
    a2hsAndroid: 'Android: Menü ⋮ → „Zum Startbildschirm hinzufügen“.', ok: 'OK', checking: 'Wird geprüft …',
    pinWeak: 'Diese PIN ist zu leicht (z. B. 123456). Wähle eine andere.', tooMany: 'Zu viele Versuche. Warte eine Minute.',
  },
  en: {
    title: 'Check voucher', cafe: 'Café', pin: 'PIN', login: 'Log in', logout: 'Log out', scan: 'Scan QR', stop: 'Stop',
    code: 'Voucher code', check: 'Check', redeem: '✓ Redeem ({n})', valid: 'Valid', invalid: 'Not valid', today: 'Redeemed today',
    none: 'None yet.', cats: '{n} cat today|{n} cats today', needs: 'Needs {n} cat|Needs {n} cats', total: 'Total: {n}', redeemed: 'Redeemed ✓',
    noScan: 'This browser can’t read QR codes – please type the code.', bad_login: 'Wrong café or PIN.', next: 'Next voucher',
    r_bad_code: 'Wrong code format.', r_not_found: 'No such voucher.', r_already_redeemed: 'Already redeemed ({who}, {t}).',
    r_expired: 'Expired (valid on the same day only).', r_wrong_region: 'Voucher from another region.', r_not_enough_cats: 'Not enough cats: {n}/{min}.',
    r_player_banned: 'This account is banned.', r_partner_daily_limit: 'Daily voucher limit reached.', err: 'Error – try again.',
    // ── Erweiterung: qr-setup ──
    setupTitle: 'Set up this phone', setupLead: 'Pick a PIN for {name} (6–12 digits). Your team uses it to log in on other devices.',
    newPin: 'New PIN', pin2: 'PIN again', setupGo: 'Save and start', pinMismatch: 'The two PINs are not the same.', pinRule: 'The PIN has 6–12 digits.',
    setupBad: 'This setup QR does not work any more. Ask the Cat Me team for a new one.', setupDone: 'Done! This phone is set up.',
    a2hsTitle: 'Add to home screen', a2hsLead: 'Then the café screen opens with one tap.', a2hsIos: 'iPhone: Share ⬆️ → "Add to Home Screen".',
    a2hsAndroid: 'Android: menu ⋮ → "Add to Home screen".', ok: 'OK', checking: 'Checking …',
    pinWeak: 'This PIN is too easy (like 123456). Pick another one.', tooMany: 'Too many tries. Wait one minute.',
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

function lastCafe() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
function rememberCafe(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* egal */
  }
}
function dropSetupCode() {
  setupCode = null;
  try {
    sessionStorage.removeItem(SETUP_KEY);
  } catch {
    /* egal */
  }
}

/** Einrichtung per QR: Café-Name zeigen, PIN zweimal, speichern → angemeldet. */
async function renderSetup() {
  view.innerHTML = `<section class="card staff-card"><p class="center pad" role="status">${esc(t('checking'))}</p></section>`;
  let info;
  try {
    info = await api('POST', '/api/setup/info', { code: setupCode, purpose: 'partner' });
  } catch (e) {
    if (e.status !== 429 && e.status) dropSetupCode();
    return renderLogin(e.status === 429 ? t('tooMany') : e.status ? t('setupBad') : t('err'));
  }
  view.innerHTML = `<section class="card staff-card setup-pin"><p class="kicker">📱 ${esc(t('setupTitle'))}</p><h1>☕ ${esc(info.cafe.name)}</h1>
    ${info.cafe.address ? `<p class="muted">${esc(info.cafe.address)}</p>` : ''}
    <p>${esc(t('setupLead', { name: info.cafe.name }))}</p>
    <form data-setup class="settings">
      <label>${esc(t('newPin'))}<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{6,12}" minlength="6" maxlength="12" required></label>
      <label>${esc(t('pin2'))}<input name="pin2" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{6,12}" minlength="6" maxlength="12" required></label>
      <button class="btn primary big">${esc(t('setupGo'))}</button>
      <p class="err" data-err hidden role="alert"></p>
    </form></section>`;
  const f = view.querySelector('[data-setup]');
  const err = f.querySelector('[data-err]');
  const show = (m) => {
    err.hidden = false;
    err.textContent = m;
  };
  f.pin.focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = f.pin.value.trim();
    if (!/^\d{6,12}$/.test(pin)) return show(t('pinRule'));
    if (weakPin(pin)) return show(t('pinWeak'));
    if (pin !== f.pin2.value.trim()) return show(t('pinMismatch'));
    const btn = f.querySelector('button');
    btn.disabled = true;
    try {
      const r = await api('POST', '/api/setup/partner', { code: setupCode, pin });
      dropSetupCode();
      token = r.token;
      try {
        sessionStorage.setItem(KEY, token);
      } catch {
        /* egal */
      }
      rememberCafe(r.partner.id);
      justSetUp = true;
      render();
    } catch (e2) {
      btn.disabled = false;
      if (e2.code === 'invalid_pin') return show(t('pinRule'));
      if (e2.code === 'weak_pin') return show(t('pinWeak'));
      if (e2.status === 429) return show(t('tooMany'));
      if (e2.code === 'network' || !e2.status) return show(t('err')); // Netz weg: Code behalten, nochmal versuchen
      dropSetupCode();
      renderLogin(t('setupBad'));
    }
  });
}

/** Nach der Einrichtung: „Fertig“ und wie man die Seite auf den Startbildschirm legt. */
function homeScreenHint() {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const tips = ios ? [t('a2hsIos')] : android ? [t('a2hsAndroid')] : [t('a2hsIos'), t('a2hsAndroid')];
  return `<section class="card a2hs" data-a2hs role="status"><h2>✓ ${esc(t('setupDone'))}</h2>
    <p><b>📲 ${esc(t('a2hsTitle'))}</b> – ${esc(t('a2hsLead'))}</p><ul>${tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <button type="button" class="btn small" data-a2hs-ok>${esc(t('ok'))}</button></section>`;
}

async function renderLogin(msg = '') {
  let partners = [];
  try {
    partners = await api('GET', '/api/partners');
  } catch {
    /* offline */
  }
  view.innerHTML = `<section class="card staff-card"><h1>☕ ${esc(t('title'))}</h1>
    <form data-f class="settings">
      <label>${esc(t('cafe'))}<select name="partnerId" required>${partners.map((p) => `<option value="${esc(p.id)}" ${p.id === lastCafe() ? 'selected' : ''}>${esc(p.name)}${p.address ? ` – ${esc(p.address)}` : ''}</option>`).join('')}</select></label>
      <label>${esc(t('pin'))}<input name="pin" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" required minlength="6" maxlength="12"></label>
      <button class="btn primary big">${esc(t('login'))}</button>
      <p class="err" data-err ${msg ? '' : 'hidden'}>${esc(msg)}</p>
    </form></section>`;
  view.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await api('POST', '/api/partner/login', { partnerId: f.partnerId.value, pin: f.pin.value });
      token = r.token;
      rememberCafe(f.partnerId.value);
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
  const hint = justSetUp ? homeScreenHint() : '';
  justSetUp = false;
  view.innerHTML = `${hint}
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
    </section>
    <section class="card cafe-kit" data-cafe-kit></section>`;
  renderCafeCard(view.querySelector('[data-cafe-kit]'), { api });
  const okBtn = view.querySelector('[data-a2hs-ok]');
  if (okBtn) okBtn.addEventListener('click', () => view.querySelector('[data-a2hs]').remove());
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
  setLang(lang, { persist: false }); // Wahl per Knopf speichert langs() selbst
  if (setupCode) return renderSetup(); // Erweiterung qr-setup: Einrichtung hat Vorrang (neues Café-Handy)
  return token ? renderDesk() : renderLogin();
}

langs();
render();
