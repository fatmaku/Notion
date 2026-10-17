// Online demo shell: role launcher, split view (office + driver phone, live), demo toolbar,
// optional live sync between two devices. Runs the real app code with the in-browser engine.
import { createApp } from './app.js';
import { createDemoWorld, DEMO } from './api-local.js';
import { dbAvailable, startSync, newRoomCode } from './demo-sync.js';
import { icon } from './icons.js';
import { routeNet } from './routenet.js';
import { WORDMARK } from './views/login.js';
import { setLang, t, detectLang } from './i18n.js';

const world = createDemoWorld();
const root = document.getElementById('app');
const apps = [];
let net = null;
let syncState = null;
const LEGAL = [['Impressum', '#impressum'], ['Datenschutz', '#datenschutz'], ['AGB', '#agb']];

const U = () => world.demoUsers();
// the roles that need the sample company Kaya – the licensor can delete it in the console
const NEEDS = { driver: (u) => u.mehmet, office: (u) => u.admin, split: (u) => u.admin && u.drivers.length, platform: (u) => u.platform };
const MODES = ['split', 'driver', 'office', 'platform', 'login'];

function clear() { while (apps.length) apps.pop().destroy(); net?.stop(); net = null; root.className = ''; root.removeAttribute('style'); root.innerHTML = ''; }
function dropHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* sandboxed viewer */ } }
/** "Are you sure?" on the button itself: the second tap within 4 s confirms (no window.confirm in the artifact viewer). */
function armed(b, label) {
  if (b.dataset.armed) return true;
  const s = b.querySelector('span'), old = s?.textContent;
  b.dataset.armed = '1'; b.classList.add('armed'); if (s) s.textContent = label;
  setTimeout(() => { delete b.dataset.armed; b.classList.remove('armed'); if (s) s.textContent = old; }, 4000);
  return false;
}
/** Small notice at the top (e.g. the demo world was seeded again). */
function note(title, text = '') {
  const n = document.createElement('div');
  n.className = 'demo-note'; n.setAttribute('role', 'status');
  n.innerHTML = `${icon('refresh-cw')}<span><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</span>`;
  n.addEventListener('click', () => n.remove());
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 7000);
}

function readSess(pane) { try { return sessionStorage.getItem('lk.demo.' + pane); } catch { return null; } }
function remember(mode) { try { sessionStorage.setItem('lk.demo.mode', mode); } catch { /* */ } }
function recall() { try { return sessionStorage.getItem('lk.demo.mode'); } catch { return null; } }

// ---------- launcher ----------
function launcher() {
  clear(); remember('launcher');
  setLang(detectLang() === 'tr' ? 'tr' : 'de');
  const u = U();
  const wide = window.innerWidth >= 1000;
  const gone = !u.kaya;
  root.innerHTML = `<div class="lk platform" style="height:100%"><div class="login"><canvas class="net" aria-hidden="true"></canvas><div class="login-in">
    <div class="hero">${WORDMARK}<h1>Live-Demo.<br><em>Ein Tipp. Alles klar.</em></h1>
      <p class="lead">Probieren Sie Ladeklar aus jeder Rolle aus – mit echten Abläufen, Push-Mitteilungen und Lieferschein-Fotos. Alle Daten sind Beispiele und bleiben in Ihrem Browser.</p>
      <div class="proof"><div><b>3</b>Rollen</div><div><b>6</b>Lizenznehmer</div><div><b>8</b>Sprachen</div></div></div>
    <div class="panel-glass"><span class="eyebrow" style="color:var(--on-ink-2)">Demo starten als …</span>
      ${gone ? `<div class="banner warn" data-key="demo-gone">${icon('triangle-alert')}<span class="grow">${t('Die Beispielfirma Kaya Logistik wurde gelöscht. Mit „Demo zurücksetzen“ ist sie wieder da.')}</span><button class="btn btn-sm" data-go="reset" data-now="1">${icon('rotate-ccw')}<span>${t('Demo zurücksetzen')}</span></button></div>` : ''}
      <div class="roles">
        ${wide && NEEDS.split(u) ? `<button class="role feature" data-go="split"><span class="ri">${icon('columns-2')}</span><span><b>Büro + Fahrer-Handy nebeneinander</b><small>Empfohlen: Disposition links, Fahrer-App rechts – alles live.</small></span>${icon('chevron-right')}</button>` : ''}
        ${u.mehmet ? `<button class="role" data-go="driver"><span class="ri">${icon('truck')}</span><span><b>Fahrer · ${esc(u.mehmet?.name || 'Mehmet')}</b><small>Kaya Logistik · LKW wählen, Tour bestätigen, Lieferschein</small></span>${icon('chevron-right')}</button>` : ''}
        ${u.admin ? `<button class="role" data-go="office"><span class="ri">${icon('building-2')}</span><span><b>Unternehmen · ${esc(u.admin?.name || 'Ayşe Kaya')}</b><small>Live-Board, Lieferungen anlegen, Fahrer & LKW, eigenes Logo</small></span>${icon('chevron-right')}</button>` : ''}
        <button class="role" data-go="platform"><span class="ri">${icon('crown')}</span><span><b>Lizenzgeber · Sie</b><small>Lizenznehmer anlegen, Tarife, Umsatz, Abrechnung</small></span>${icon('chevron-right')}</button>
        <button class="role" data-go="login"><span class="ri">${icon('key-round')}</span><span><b>Anmeldeseite ausprobieren</b><small>Firmencode KAYA · Handy 0176 10000001 · PIN ${DEMO.pin}</small></span>${icon('chevron-right')}</button>
      </div>
      <div class="row wrap" style="--gap:8px"><button class="btn btn-ghost btn-sm" data-go="sync">${icon('smartphone')}Mit zweitem Gerät verbinden</button><button class="btn btn-ghost btn-sm" data-go="reset">${icon('rotate-ccw')}<span>Demo zurücksetzen</span></button></div>
      <details class="small" style="color:var(--on-ink-2)"><summary style="cursor:pointer">Zugangsdaten der Demo</summary><p style="margin-top:8px;line-height:1.7">Lizenzgeber: ${DEMO.platform.email} · ${DEMO.platform.password}<br>Unternehmen: ayse@kaya-logistik.de · ${DEMO.password}<br>Disponent: jonas@kaya-logistik.de · ${DEMO.password}<br>Fahrer: Firmencode KAYA · Handy 0176 1000 0001 … 0006 · PIN ${DEMO.pin}<br>Zweite Firma (anderes Logo): lars@nordlicht-spedition.de · ${DEMO.password}</p></details>
      <div class="legal-links">${LEGAL.map(([l, h]) => `<a href="${h}" data-legal="${h.slice(1)}">${l}</a>`).join('')}<span>${world.storageOk ? 'Daten bleiben lokal in Ihrem Browser.' : 'Speicher blockiert – Demo läuft nur bis zum Neuladen.'}</span></div>
    </div></div></div></div>`;
  const c = root.querySelector('canvas.net');
  net = routeNet(c, { accent: '#e6cd92', trucks: 20, alpha: 0.9 }); net.start();
  root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.go === 'reset' && !b.dataset.now && !armed(b, t('Wirklich zurücksetzen?'))) return; safe(() => start(b.dataset.go)); }));
  root.querySelectorAll('[data-legal]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); legal(a.dataset.legal); }));
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- modes ----------
function mount(el, paneId, userId, opts = {}) {
  const api = world.client(paneId);
  if (userId !== undefined) api.loginAs(userId);
  const app = createApp(el, { api, demoPill: opts.pill, muted: opts.muted, lang: opts.lang, legalLinks: LEGAL, tenantCode: opts.tenantCode || null, inviteId: opts.inviteId || null });
  apps.push(app);
  app.start();
  return app;
}

function start(mode, opts = {}) {
  if (mode === 'reset') return world.reset();
  if (mode === 'sync') return syncDialog();
  const u = U();
  // unknown mode, or the sample company was deleted: back to the launcher (it offers the reset)
  if (!MODES.includes(mode) || (NEEDS[mode] && !NEEDS[mode](u))) return launcher();
  clear(); remember(mode);
  if (mode === 'split') {
    root.innerHTML = `<div class="demo-split"><div class="pane office" id="pane-office"></div><div class="phone-col"><div class="phone-cap">${icon('smartphone')} Fahrer-Handy <select id="drv-pick">${u.drivers.map((d) => `<option value="${d.id}">${esc(d.name)} · ${d.lang.toUpperCase()}</option>`).join('')}</select></div><div class="phone"><div class="screen" id="pane-phone"></div></div><div class="phone-cap">Tippen Sie rechts – links sehen Sie es live.</div></div></div>`;
    const sel = root.querySelector('#drv-pick');
    const cur = readSess('phone');
    if (cur && u.drivers.some((d) => d.id === cur)) sel.value = cur;
    const officeUser = readSess('office');
    mount(root.querySelector('#pane-office'), 'office', officeUser && world.user(officeUser) && world.user(officeUser).role !== 'driver' ? undefined : u.admin.id, { pill: true });
    const phone = mount(root.querySelector('#pane-phone'), 'phone', sel.value, { muted: true });
    sel.addEventListener('change', async () => { phone.api.loginAs(sel.value); phone.setMe(await phone.api.session()); });
  } else {
    const el = document.createElement('div'); el.className = 'demo-main'; root.appendChild(el);
    const id = mode === 'driver' ? u.mehmet.id : mode === 'office' ? u.admin.id : mode === 'platform' ? u.platform.id : null;
    mount(el, 'main', mode === 'login' ? null : id, { pill: true, tenantCode: opts.tenantCode, inviteId: opts.inviteId });
  }
  pill(mode);
}

// The pill gets its own strip below the app (#app.demo-framed), so it never covers tab bar or sheets.
function pill(mode) {
  const p = document.createElement('div');
  p.className = 'demo-pill';
  const sync = syncState ? 'Live-Sync: ' + syncState.code : 'Zweites Gerät';
  p.innerHTML = `<span class="tag">DEMO</span><button data-a="roles" title="Rolle wechseln">${icon('users')}<span>Rolle wechseln</span></button>${mode === 'split' || mode === 'driver' ? `<button data-a="drive">${icon('octagon-x')}<span>Fahrt simulieren</span></button>` : ''}<button data-a="sync" class="mini" title="${esc(sync)}" aria-label="${esc(sync)}">${icon('smartphone')}<span>${esc(sync)}</span></button><button data-a="reset" class="mini" title="Zurücksetzen" aria-label="Zurücksetzen">${icon('rotate-ccw')}<span>Zurücksetzen</span></button>`;
  root.appendChild(p);
  root.classList.add('demo-framed');
  p.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'roles') launcher();
    if (b.dataset.a === 'reset' && armed(b, t('Wirklich zurücksetzen?'))) world.reset();
    if (b.dataset.a === 'sync') syncDialog();
    if (b.dataset.a === 'drive') {
      const on = !apps.some((a) => a.ui.locked);
      apps.filter((a) => a.kind() === 'driver').forEach((a) => { a.ui.locked = on; a.render(); });
      b.querySelector('span').textContent = on ? 'Fahrt beenden' : 'Fahrt simulieren';
    }
  });
}

// ---------- live sync dialog ----------
async function syncDialog() {
  const db = await dbAvailable();
  const box = document.createElement('div');
  box.className = 'lk';
  box.style.cssText = 'position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:rgba(4,9,15,.6);backdrop-filter:blur(4px);padding:16px;height:auto;min-height:0';
  const body = !db
    ? `<p>In dieser Ansicht ist kein gemeinsamer Speicher verfügbar. Öffnen Sie die Demo als angemeldete Person (Eigentümer oder Bearbeiter des Links), um zwei Geräte live zu verbinden.</p><p class="small muted">Tipp: Die geteilte Ansicht „Büro + Fahrer-Handy“ zeigt dasselbe auf einem Bildschirm.</p>`
    : syncState
      ? `<p>Verbunden mit Code <b class="mono" style="font-size:22px;letter-spacing:.2em">${syncState.code}</b>. Alles, was hier passiert, erscheint live auf dem anderen Gerät.</p>`
      : `<p>Verbinden Sie z. B. Ihr Handy (Fahrer) mit dem PC (Büro). Starten Sie hier und geben Sie den Code am zweiten Gerät ein.</p>
         <div class="row wrap"><button class="btn btn-primary" data-s="create">${icon('smartphone')}Live-Sync starten</button></div>
         <form class="row" data-s="joinform" style="--gap:8px"><input class="input mono" name="code" maxlength="6" placeholder="CODE" style="max-width:150px;text-transform:uppercase;letter-spacing:.2em"><button class="btn" type="submit">Beitreten</button></form>`;
  box.innerHTML = `<div class="card pad stack" style="max-width:460px;width:100%;--gap:14px"><div class="row between"><h3>${icon('smartphone')} Zweites Gerät verbinden</h3><button class="ibtn" data-s="x">${icon('x')}</button></div>${body}<p class="small muted" data-s="msg"></p></div>`;
  document.body.appendChild(box);
  const msg = box.querySelector('[data-s=msg]');
  const done = () => box.remove();
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-s]');
    if (e.target === box || b?.dataset.s === 'x') return done();
    if (b?.dataset.s === 'create') {
      const code = newRoomCode();
      msg.textContent = 'Daten werden übertragen …';
      try { syncState = await startSync(world, db, code, { create: true, onStatus: (s) => { if (s.state === 'live') msg.textContent = `Code ${code} – am zweiten Gerät unter „Zweites Gerät“ eingeben.`; } }); box.querySelector('.card').insertAdjacentHTML('afterbegin', `<div class="secret" style="justify-content:center;font-size:30px;letter-spacing:.3em">${code}</div>`); }
      catch (err) { msg.textContent = 'Fehler: ' + (err.message || err.code); }
    }
  });
  box.querySelector('[data-s=joinform]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = String(new FormData(e.target).get('code') || '').trim().toUpperCase();
    if (code.length !== 6) { msg.textContent = 'Bitte den 6-stelligen Code eingeben.'; return; }
    msg.textContent = 'Verbinde …';
    try { syncState = await startSync(world, db, code, { create: false }); done(); safe(() => start(recall() && recall() !== 'launcher' ? recall() : window.innerWidth < 700 ? 'driver' : 'office')); }
    catch (err) { msg.textContent = err.message || 'Verbindung fehlgeschlagen.'; }
  });
}

// ---------- legal pages (embedded) ----------
function legal(which) {
  const src = window.LADEKLAR_LEGAL?.[which] || '<p>Muster-Texte liegen im Projekt unter docs/recht.</p>';
  const box = document.createElement('div');
  box.className = 'lk';
  box.style.cssText = 'position:fixed;inset:0;z-index:100;overflow:auto;background:var(--bg);height:auto';
  box.innerHTML = `<div style="max-width:780px;margin:0 auto;padding:24px 16px 60px" class="stack"><div class="row between"><b class="eyebrow">Ladeklar · Muster</b><button class="btn" data-x>${icon('x')}Schließen</button></div><article class="legal-doc">${src}</article></div>`;
  document.body.appendChild(box);
  box.querySelector('[data-x]').addEventListener('click', () => box.remove());
}

// ---------- boot ----------
// Links made in the demo point to the demo: #t/CODE = login page of that company, #i/TOKEN = driver invite (C11)
function linkFromHash() {
  const m = /^#([ti])\/([\w-]+)$/.exec(location.hash || '');
  if (!m) return null;
  dropHash();
  return m[1] === 't' ? { tenantCode: m[2].toUpperCase() } : { inviteId: m[2] };
}
function boot() {
  const link = linkFromHash();
  if (link) return start('login', link);
  const last = recall();
  if (last && last !== 'launcher') start(last); else launcher();
}
// never leave a blank page: whatever breaks on start falls back to the launcher (with "Demo zurücksetzen")
function safe(fn) { try { fn(); } catch (e) { console.error(e); try { launcher(); } catch (e2) { console.error(e2); } } }
safe(boot);
if (world.refreshed) note(t('Demo wurde aufgefrischt'), t('Die Beispieldaten sind wieder auf dem Stand von heute.'));
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (['impressum', 'datenschutz', 'agb'].includes(h)) legal(h); else if (/^[ti]\//.test(h)) safe(boot); });
