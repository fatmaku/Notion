// App controller: one instance per screen (the demo runs two side by side). It owns the
// session, the current route, cached view data, sheets, toasts – and renders by morphing the
// root element, so live updates never steal focus or wipe what someone is typing.
import { morph } from './morph.js';
import { setLang, detectLang, rememberLang, t } from './i18n.js';
import { chime, buzz } from './media.js';
import * as login from './views/login.js';
import * as driver from './views/driver.js';
import * as staff from './views/staff.js';
import * as platform from './views/platform.js';
import * as password from './views/password.js';
import { toastsHtml, lightboxHtml } from './views/common.js';

const VIEWS = { login, driver, staff, platform, password };

function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.62 ? '#0b1622' : '#ffffff';
}

export function createApp(root, opts = {}) {
  const app = {
    api: opts.api, opts, root,
    me: null, route: { name: '', params: {} }, data: {}, ui: {}, toasts: [], flash: new Set(),
    lang: opts.lang || detectLang(), booting: true, online: true, queue: 0, pending: null,
  };
  let raf = 0, refreshTimer = 0, loadSeq = 0;

  app.kind = () => (!app.me ? 'login' : app.me.user.role === 'driver' ? 'driver' : app.me.user.mustChangePassword ? 'password' : app.me.user.role === 'platform' ? 'platform' : 'staff');
  app.view = () => VIEWS[app.kind()];
  app.role = () => app.me?.user?.role || null;
  app.tenant = () => app.me?.tenant || null;
  app.t = t;

  // ---------- rendering ----------
  app.render = () => {
    cancelAnimationFrame(raf); raf = 0;
    setLang(app.lang);
    const v = app.view();
    const color = app.kind() === 'platform' ? '#c8a45c' : app.tenant()?.branding?.color || app.ui.loginBrand?.color || null;
    root.classList.add('lk');
    root.classList.toggle('platform', app.kind() === 'platform' || (['login', 'password'].includes(app.kind()) && !color));
    root.classList.toggle('has-pill', !!opts.demoPill);
    if (color && app.kind() !== 'platform') { root.style.setProperty('--brand', color); root.style.setProperty('--brand-ink', inkFor(color)); }
    else { root.style.removeProperty('--brand'); root.style.removeProperty('--brand-ink'); }
    morph(root, v.render(app) + `<div class="toasts" data-key="toasts">${toastsHtml(app)}</div>` + lightboxHtml(app));
    v.mounted?.(app);
  };
  app.invalidate = () => { if (!raf) raf = requestAnimationFrame(app.render); };

  // ---------- navigation ----------
  app.go = (name, params = {}, { keepSheet = false } = {}) => {
    app.route = { name, params };
    if (!keepSheet) app.ui.sheet = null;
    const main = root.querySelector('.main, .drv-main');
    if (main) main.scrollTop = 0;
    app.load();
    app.render();
    opts.onRoute?.(app.route);
  };
  app.open = (sheet) => { app.ui.sheet = sheet; app.render(); app.view().sheetOpened?.(app, sheet); };
  app.close = () => { app.ui.sheet = null; app.ui.form = null; app.render(); };

  app.load = async () => {
    const v = app.view();
    if (!v.load || !app.me) return;
    const seq = ++loadSeq;
    try {
      await v.load(app);
    } catch (e) {
      if (e.code === 'unauthorized') return app.signedOut();
      if (e.code === 'password_change' && app.me) { app.me.user.mustChangePassword = true; return app.render(); }
      if (e.code !== 'network') app.error(e);
    }
    if (seq === loadSeq) app.invalidate();
  };
  app.refresh = (delay = 120) => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { app.load(); app.view().refreshSheet?.(app); }, delay); };

  // ---------- calls ----------
  app.call = async (method, args = {}, { quiet = false, queuedToast = true } = {}) => {
    try {
      const r = await app.api.call(method, args);
      if (r && r.queued && !quiet && queuedToast) app.toast({ title: t('Gespeichert – wird gesendet, sobald Netz da ist'), plain: true, icon: 'wifi-off' });
      return r ?? {};
    } catch (e) {
      if (e.code === 'unauthorized') { app.signedOut(); return null; }
      if (!quiet) app.error(e);
      throw e;
    }
  };
  app.try = async (fn) => { try { return await fn(); } catch { return null; } };
  // engine/server messages stay German and stable – the dictionaries translate them (C8)
  app.error = (e) => app.toast({ title: e?.message ? t(e.message) : t('Das hat nicht geklappt.'), plain: true, err: true, icon: 'circle-alert' });
  app.fileUrl = (id) => app.api.fileUrl(id, app.me?.user);

  // ---------- toasts ----------
  app.toast = ({ title, body = '', icon = 'bell', priority = 'normal', plain = false, err = false, logo = null, onClick = null, ms = 5200 }) => {
    const id = Math.random().toString(36).slice(2);
    const keep = root.clientWidth < 600 ? 1 : 3;
    app.toasts = [...app.toasts.filter((x) => !x.out).slice(-keep), { id, title, body, icon, priority, plain, err, logo, onClick }];
    app.invalidate();
    setTimeout(() => { const x = app.toasts.find((y) => y.id === id); if (x) { x.out = true; app.invalidate(); } }, ms);
    setTimeout(() => { app.toasts = app.toasts.filter((y) => y.id !== id); app.invalidate(); }, ms + 380);
  };

  // ---------- session ----------
  app.setMe = (me) => {
    app.me = me;
    if (app.api.online != null) app.online = app.api.online;
    if (app.api.queueSize != null) app.queue = app.api.queueSize;
    if (me?.user?.lang && !opts.lang) { app.lang = me.user.lang; }
    app.data = {};
    const v = app.view();
    app.route = { name: v.defaultRoute?.(app) || '', params: {} };
    if (opts.initialRoute && v.routes?.includes(opts.initialRoute.name)) { app.route = opts.initialRoute; opts.initialRoute = null; }
    app.load();
    app.render();
    opts.onSession?.(me);
  };
  app.signedOut = (msg = '') => {
    const u = app.me?.user, tn = app.me?.tenant;
    app.me = null; app.data = {};
    // a driver asked to sign in again (session ended) finds company code and phone filled in – not after "Abmelden"
    app.ui = { loginBrand: app.ui.loginBrand, ...(msg && u?.role === 'driver' ? { loginMode: 'driver', code: tn?.code || '', phone: u.phone || '' } : {}), loginErr: msg };
    app.render();
  };
  // ends the session here at once, also without network (the server is told as soon as possible)
  app.logout = async () => { await app.try(() => app.api.logout()); app.queue = 0; app.signedOut(); };
  app.setLang = (l) => {
    app.lang = l; rememberLang(l);
    if (app.me) app.call('updateProfile', { lang: l }, { quiet: true }).catch(() => {});
    app.render();
  };

  // ---------- live events ----------
  const off = app.api.on((e) => {
    // network and outbox state count before the session is known (cold start in a dead zone)
    if (e.type === 'online') { app.online = e.online; if (e.online && app.me) app.refresh(); app.invalidate(); return; }
    if (e.type === 'queue') { app.queue = e.size; app.invalidate(); return; }
    if (!app.me) return;
    if (e.type === 'change') {
      if (e.col === 'deliveries' && e.id) { app.flash.add(e.id); setTimeout(() => { app.flash.delete(e.id); }, 1800); }
      if (e.col === 'tenants' && app.kind() !== 'platform') app.api.session().then((me) => { if (me) { app.me = me; app.invalidate(); } }).catch(() => {});
      app.refresh();
    } else if (e.type === 'notify') {
      const n = e.notification;
      if (n.userId !== app.me.user.id) return;
      app.me.unread = (app.me.unread || 0) + 1;
      setLang(app.lang);
      const tn = app.tenant();
      app.toast({ title: n.title, body: n.body, priority: n.priority, icon: n.priority === 'high' ? 'triangle-alert' : app.kind() === 'driver' ? 'truck' : 'bell-ring', logo: tn?.branding?.logoFileId ? app.fileUrl(tn.branding.logoFileId) : null, onClick: n.deliveryId ? () => app.view().openDelivery?.(app, n.deliveryId) : null, ms: n.priority === 'high' ? 9000 : 6000 });
      if (!opts.muted) chime(n.priority === 'high');
      if (app.kind() === 'driver') buzz(n.priority === 'high' ? [120, 60, 120, 60, 200] : [60, 40, 60]);
      app.refresh(60);
    } else if (e.type === 'queue-error') {
      const what = app.view().queueLabel?.(app, e.item);
      app.toast({ title: what ? t('Nicht gesendet: {s}', { s: what }) : t('Ein gespeicherter Schritt wurde abgelehnt: {m}', { m: t(e.error.message) }), body: what ? t(e.error.message) : '', plain: true, err: true, icon: 'circle-alert', ms: 9000 });
      app.refresh();
    } else if (e.type === 'session') { app.me = { ...app.me, ...e.me }; app.refresh(); }
    else if (e.type === 'auth') app.signedOut(e.queued ? t('Bitte neu anmelden. Gespeicherte Schritte werden danach gesendet.') : t('Bitte anmelden.'));
  });

  // ---------- DOM events (delegation) ----------
  const actionsFor = () => ({ ...common, ...(app.view().actions || {}) });
  const common = {
    go: (el) => app.go(el.dataset.to, el.dataset.id ? { id: el.dataset.id } : {}),
    close: () => app.close(),
    lang: (el) => app.setLang(el.dataset.lang),
    logout: () => app.logout(),
    toast: (el) => { const x = app.toasts.find((y) => y.id === el.dataset.id); if (x?.onClick) x.onClick(); app.toasts = app.toasts.filter((y) => y.id !== el.dataset.id); app.invalidate(); },
    lightbox: (el) => { app.ui.lightbox = { src: el.dataset.src, title: el.dataset.title || '' }; app.render(); },
    lightboxClose: () => { app.ui.lightbox = null; app.render(); },
    copy: async (el) => {
      const txt = el.dataset.copy || root.querySelector(el.dataset.from)?.textContent || '';
      try { await navigator.clipboard.writeText(txt); app.toast({ title: t('Kopiert'), plain: true, icon: 'check', ms: 1800 }); }
      catch { const r = document.createRange(); const target = root.querySelector(el.dataset.from) || el; r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); app.toast({ title: t('Text markiert – bitte kopieren'), plain: true, icon: 'copy', ms: 2600 }); }
    },
  };
  const onClick = (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !root.contains(el)) {
      if (ev.target.classList?.contains('sheet-bg')) app.close();
      return;
    }
    if (el.tagName === 'A' && el.getAttribute('href') && !el.dataset.prevent) { /* real link */ } else ev.preventDefault();
    const fn = actionsFor()[el.dataset.act];
    if (fn) Promise.resolve(fn(el, ev, app)).catch((e) => e && !e.code && console.error(e));
  };
  const sending = new Set(); // forms in flight: a second tap must not send the same thing twice
  const onSubmit = (ev) => {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    const fn = (app.view().forms || {})[form.dataset.form];
    const key = form.dataset.form + ':' + (form.dataset.id || '');
    if (!fn || sending.has(key)) return;
    sending.add(key);
    const btn = form.querySelector('[type=submit]') || root.querySelector(`[form="${form.id}"][type=submit]`);
    btn?.classList.add('is-busy');
    Promise.resolve(fn(new FormData(form), form, app)).catch((e) => {
      if (e?.details?.fields) for (const f of e.details.fields) form.querySelector(`[name="${f}"]`)?.classList.add('invalid');
    }).finally(() => { sending.delete(key); btn?.classList.remove('is-busy'); });
  };
  const onInput = (ev) => {
    ev.target.classList?.remove('invalid');
    const el = ev.target.closest('[data-input]');
    if (!el) return;
    const fn = (app.view().inputs || {})[el.dataset.input];
    if (fn) fn(el, ev, app);
  };
  const onKey = (ev) => {
    const active = document.activeElement;
    if (active && active !== document.body && !root.contains(active)) return;
    if (ev.key === 'Escape') { if (app.ui.lightbox) { app.ui.lightbox = null; app.render(); } else if (app.ui.sheet) app.close(); }
  };
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  window.addEventListener('keydown', onKey);
  const tick = setInterval(() => { if (app.me && !document.hidden) app.invalidate(); }, 30000); // keeps "vor 3 Min." fresh

  app.destroy = () => { off(); clearInterval(tick); root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); root.removeEventListener('input', onInput); root.removeEventListener('change', onInput); window.removeEventListener('keydown', onKey); login.unmount?.(app); };

  // ---------- boot ----------
  app.start = async () => {
    setLang(app.lang);
    app.render();
    if (opts.tenantCode) { const b = await app.api.publicTenant(opts.tenantCode); if (b) app.ui.loginBrand = { ...b.branding, code: b.code, name: b.name, logoUrl: b.branding?.logoFileId ? app.api.fileUrl(b.branding.logoFileId) : null }; }
    if (opts.inviteId) {
      // invite link /i/<token> (C11): null = used or expired (notice + normal login); no network = normal login
      let i;
      try { i = await app.api.inviteInfo(opts.inviteId); } catch { i = undefined; }
      if (i) { app.ui.invite = { ...i, token: opts.inviteId }; app.ui.loginBrand = { ...i.tenant.branding, code: i.tenant.code, name: i.tenant.name, logoUrl: i.tenant.branding?.logoFileId ? app.api.fileUrl(i.tenant.branding.logoFileId) : null }; if (!opts.lang && i.lang) app.lang = i.lang; }
      else if (i === null) app.ui.inviteGone = true;
    }
    let me = null;
    try { me = await app.api.session(); } catch (e) { app.error(e); }
    app.booting = false;
    if (me) app.setMe(me); else app.render();
    return app;
  };
  return app;
}
