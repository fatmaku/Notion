// Sign-in: Ladeklar or the licensee's own branding (/t/CODE, subdomain), driver login with
// company code + phone + PIN (big keypad), office login with e-mail (+ 6-digit code with 2FA),
// invite links /i/<token> with PIN only. Server messages are shown through t() (C8).
import { icon, esc, langPicker } from './common.js';
import { t } from '../i18n.js';
import { routeNet } from '../routenet.js';

export const routes = [];
const WORDMARK = `<span class="wordmark"><svg class="mk" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#c8a45c"/><path d="M11 12v16h9" stroke="#0b1622" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m21 22 4 4 7-9" stroke="#0b1622" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>LADEKLAR</span>`;
export { WORDMARK };

export function render(app) {
  const b = app.ui.loginBrand, inv = app.ui.invite;
  const mode = inv ? 'invite' : app.ui.loginMode || 'driver';
  const pin = app.ui.pin || '';
  const err = app.ui.loginErr;
  const pinBoxes = `<div class="pin ${app.ui.pinShake ? 'err' : ''}" data-key="pin-${app.ui.pinShake || 0}" aria-label="PIN">${Array.from({ length: 6 }, (_, i) => `<i class="${i < pin.length ? 'f' : ''}">${i < pin.length ? '•' : ''}</i>`).join('')}</div>`;
  const keypad = `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-act="pinKey" data-k="${n}">${n}</button>`).join('')}<button type="button" class="fn" data-act="pinKey" data-k="clear">${t('Löschen')}</button><button type="button" data-act="pinKey" data-k="0">0</button><button type="button" class="fn" data-act="pinKey" data-k="back" aria-label="${t('Zurück')}">⌫</button></div>`;

  const hero = b
    ? `<div class="hero brandlogin">${b.logoUrl ? `<span class="logo-chip"><img src="${esc(b.logoUrl)}" alt="${esc(b.name)}"></span>` : `<span class="wordmark">${esc(b.name)}</span>`}
        <h1>${inv ? t('Hallo {name}!', { name: esc(inv.name) }) : esc(b.appName || b.name)}</h1>
        <p class="lead">${inv ? t('Ihre Firma {firma} hat Sie eingeladen. Geben Sie Ihre 6-stellige PIN ein – fertig.', { firma: esc(b.name) }) : t('Touren bestätigen, Lieferschein fotografieren, fertig. Die Disposition sieht alles sofort.')}</p></div>`
    : `<div class="hero">${WORDMARK}
        <h1>${t('Ein Tipp.')}<br><em>${t('Alles klar.')}</em></h1>
        <p class="lead">${t('Die White-Label-App für Speditionen: Fahrer bestätigen jede Tour mit einem Tipp, die Disposition sieht alles live – mit Lieferschein-Foto.')}</p>
        <div class="proof"><div><b>8</b>${t('Sprachen für Fahrer')}</div><div><b>10 Min.</b>${t('bis zur ersten Tour')}</div><div><b>0 €</b>${t('Hardware')}</div></div></div>`;

  let form = '';
  if (mode === 'invite') {
    form = `<form class="stack" style="--gap:16px" data-form="invite" autocomplete="off">
      <div class="stack" style="--gap:4px"><span class="eyebrow" style="color:var(--on-ink-2)">${t('Fahrer-Zugang')}</span><h3 style="color:#fff">${t('PIN eingeben')}</h3></div>
      ${pinBoxes}${keypad}
      ${err ? `<p class="small" style="color:#ffb4b4" role="alert">${esc(err)}</p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('log-out', 'flip')}${t('Anmelden')}</button>
      <p class="xs muted">${t('PIN vergessen? Ihre Disposition setzt sie in Sekunden zurück.')}</p></form>`;
  } else if (mode === 'driver') {
    form = `<form class="stack" style="--gap:14px" data-form="driver" autocomplete="on">
      ${app.ui.inviteGone ? `<div class="banner bad" role="alert">${icon('clock')}<span class="grow">${t('Einladung abgelaufen – bitte neue Einladung im Büro anfordern')}</span></div>` : ''}
      ${b ? `<input type="hidden" name="code" value="${esc(b.code)}">` : `<label class="field"><span>${t('Firmencode')}</span><input class="input" name="code" autocapitalize="characters" autocomplete="organization" placeholder="${esc(t('z. B. KAYA'))}" value="${esc(app.ui.code || '')}" required></label>`}
      <label class="field"><span>${t('Handynummer')}</span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0176 …" value="${esc(app.ui.phone || '')}" required></label>
      <div class="field"><span>${t('PIN (6 Ziffern)')}</span>${pinBoxes}</div>${keypad}
      ${err ? `<p class="small" style="color:#ffb4b4" role="alert">${esc(err)}</p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('truck')}${t('Los geht’s')}</button></form>`;
  } else {
    form = `<form class="stack" style="--gap:14px" data-form="office" autocomplete="on">
      <label class="field"><span>${t('E-Mail')}</span><input class="input" name="email" type="email" autocomplete="username" placeholder="name@firma.de" value="${esc(app.ui.email || '')}" required></label>
      <label class="field"><span>${t('Passwort')}</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
      ${app.ui.need2fa ? `<label class="field" data-key="otp"><span>${t('Code aus der Authenticator-App')}</span><input class="input mono" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" required></label>` : ''}
      ${err ? `<p class="small" style="color:#ffb4b4" role="alert">${esc(err)}</p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('building-2')}${t('Anmelden')}</button>
      <p class="xs muted">${t('Für Disposition, Unternehmens-Admins und den Lizenzgeber.')}</p></form>`;
  }

  const legal = app.opts.legalLinks || [['Impressum', '/legal/impressum'], ['Datenschutz', '/legal/datenschutz'], ['AGB', '/legal/agb']];
  return `<div class="login" data-key="login"><canvas class="net" data-keep data-key="net" aria-hidden="true"></canvas>
    <div class="login-in">${hero}
      <div class="panel-glass">
        ${mode === 'invite' ? '' : `<div class="seg" role="tablist"><button data-act="loginMode" data-m="driver" aria-pressed="${mode === 'driver'}">${icon('truck')}${t('Fahrer|login')}</button><button data-act="loginMode" data-m="office" aria-pressed="${mode === 'office'}">${icon('building-2')}${t('Büro / Disposition')}</button></div>`}
        ${form}
        <div class="divider" style="background:rgba(255,255,255,.1)"></div>
        ${langPicker(app)}
        <div class="legal-links">${legal.map(([l, h]) => `<a href="${esc(h)}" ${h.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${esc(t(l))}</a>`).join('')}${b ? `<span>powered by <b style="color:var(--brass-2);letter-spacing:.1em">LADEKLAR</b></span>` : ''}</div>
      </div></div></div>`;
}

export function mounted(app) {
  const c = app.root.querySelector('canvas.net');
  if (!c) { unmount(app); return; }
  if (app._netCanvas !== c) {
    unmount(app);
    app._netCanvas = c;
    app._net = routeNet(c, { accent: app.ui.loginBrand?.color ? '#ffffff' : '#e6cd92', trucks: 18, alpha: 0.9, labels: false });
    app._net.start();
    app._netResize = () => app._net?.resize();
    window.addEventListener('resize', app._netResize);
  }
}
export function unmount(app) { app._net?.stop(); app._net = null; app._netCanvas = null; if (app._netResize) window.removeEventListener('resize', app._netResize); }

function shake(app, msg) { app.ui.loginErr = msg; app.ui.pinShake = (app.ui.pinShake || 0) + 1; app.ui.pin = ''; app.render(); }

export const actions = {
  loginMode: (el, ev, app) => { app.ui.loginMode = el.dataset.m; app.ui.loginErr = ''; app.ui.need2fa = false; app.render(); },
  pinKey: (el, ev, app) => {
    const k = el.dataset.k; let p = app.ui.pin || '';
    if (k === 'back') p = p.slice(0, -1); else if (k === 'clear') p = ''; else if (p.length < 6) p += k;
    app.ui.pin = p; app.ui.loginErr = '';
    app.render();
    if (p.length === 6) app.root.querySelector('form[data-form="driver"], form[data-form="invite"]')?.requestSubmit();
  },
};

export const forms = {
  async driver(fd, form, app) {
    app.ui.code = fd.get('code'); app.ui.phone = fd.get('phone');
    if ((app.ui.pin || '').length !== 6) return shake(app, t('Bitte die 6-stellige PIN eingeben.'));
    try { const me = await app.api.driverLogin({ code: fd.get('code'), phone: fd.get('phone'), pin: app.ui.pin }); app.ui.pin = ''; app.ui.loginErr = ''; app.ui.inviteGone = false; unmount(app); app.setMe(me); }
    catch (e) { shake(app, t(e.message)); }
  },
  async invite(fd, form, app) {
    if ((app.ui.pin || '').length !== 6) return shake(app, t('Bitte die 6-stellige PIN eingeben.'));
    try { const me = await app.api.inviteLogin({ token: app.ui.invite.token, pin: app.ui.pin }); app.ui.pin = ''; app.ui.loginErr = ''; app.ui.invite = null; unmount(app); app.setMe(me); }
    catch (e) { shake(app, t(e.message)); }
  },
  async office(fd, form, app) {
    app.ui.email = fd.get('email');
    const code = app.ui.need2fa ? String(fd.get('code') || '').replace(/\s/g, '') : undefined;
    try { const me = await app.api.login({ email: fd.get('email'), password: fd.get('password'), ...(code ? { code } : {}) }); app.ui.loginErr = ''; app.ui.need2fa = false; unmount(app); app.setMe(me); }
    catch (e) {
      // C13: the password was right, the account wants the code from the authenticator app
      if (e.code === 'need_2fa') { app.ui.need2fa = true; app.render(); const c = form.querySelector('[name="code"]'); if (c) { c.value = ''; c.focus(); } }
      app.ui.loginErr = t(e.message); app.render();
    }
  },
};
