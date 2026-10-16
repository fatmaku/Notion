// Company workspace (admin & dispatcher): live board, deliveries (present / future / past),
// drivers with PIN invites, the truck/trailer pool, reports, settings incl. own logo & colour.
import { icon, esc, pill, problemPill, plate, avatar, flag, stepper, routeTitle, goodsFacts, placeBlock, timeline, notesThread, docsGrid, sheet, emptyState, logoImg, licenseBanner, deliveryCompact, eventText, eventDetail, eventTone, EVENT_ICON, VEHICLE_ICON, vehicleTypeText, featureText, progressRatio } from './common.js';
import { t, tStatus, tStep, tProblem, LANG_NAMES } from '../i18n.js';
import { time, dateTime, dayLabel, isoToday, addDays, ago, minutes, num, kg, phoneHref, window_, longDate } from '../format.js';
import { compressPhoto, processLogo, qrSvg } from '../media.js';
import { VEHICLE_TYPES, VEHICLE_FEATURES, PLANS } from '../../../core/engine.js';

export const routes = ['live', 'deliveries', 'drivers', 'vehicles', 'reports', 'settings'];
export const defaultRoute = () => 'live';
const isAdmin = (app) => app.role() === 'admin';
const S = (app) => app.tenant()?.settings || {};

// ---------- data ----------
export async function load(app) {
  const r = app.route.name;
  const call = (m, a = {}) => app.api.call(m, a);
  const jobs = [call('dashboard').then((x) => { app.data.dash = x; })];
  if (r === 'deliveries') { const f = app.ui.dfilter || (app.ui.dfilter = { tab: 'live', q: '' }); jobs.push(call('listDeliveries', f).then((x) => { app.data.deliveries = x; })); }
  if (r === 'drivers' || app.ui.sheet?.type === 'deliveryForm' || app.ui.sheet?.type === 'delivery') jobs.push(call('listUsers', { role: 'driver' }).then((x) => { app.data.drivers = x; }));
  if (r === 'vehicles' || app.ui.sheet?.type === 'deliveryForm' || app.ui.sheet?.type === 'delivery') jobs.push(call('listVehicles').then((x) => { app.data.vehicles = x; }));
  if (r === 'reports') jobs.push(call('reports', { month: app.ui.month }).then((x) => { app.data.reports = x; }));
  if (r === 'settings') {
    jobs.push(app.api.session().then((me) => { if (me) app.me = me; }));
    if (isAdmin(app)) { jobs.push(call('listUsers', { role: 'staff' }).then((x) => { app.data.staff = x; })); jobs.push(call('auditLog', { limit: 40 }).then((x) => { app.data.audit = x; })); }
  }
  await Promise.all(jobs);
  await refreshSheetData(app);
}
async function refreshSheetData(app) {
  const s = app.ui.sheet;
  if (!s) return;
  if ((s.type === 'delivery' || s.type === 'proof') && s.id) app.data.delivery = await app.api.call('getDelivery', { id: s.id }).catch(() => null);
  if (s.type === 'notifications') app.data.notes = await app.api.call('listNotifications', {});
  if (['deliveryForm', 'delivery'].includes(s.type)) {
    if (!app.data.drivers) app.data.drivers = await app.api.call('listUsers', { role: 'driver' });
    if (!app.data.vehicles) app.data.vehicles = await app.api.call('listVehicles');
  }
}
export async function refreshSheet(app) { await refreshSheetData(app); app.invalidate(); }
export async function sheetOpened(app) { await refreshSheetData(app); app.invalidate(); }
export function openDelivery(app, id) { app.open({ type: 'delivery', id }); }

// ---------- shell ----------
export function render(app) {
  const r = app.route.name, tn = app.tenant(), c = app.data.dash?.counts || {};
  const due = app.data.dash?.vehicles?.due?.length || 0;
  const nav = [
    ['live', 'layout-dashboard', t('Live'), c.active ? `<span class="count">${c.active}</span>` : ''],
    ['deliveries', 'package', t('Lieferungen'), c.problems ? `<span class="count bad">${c.problems}</span>` : c.open ? `<span class="count">${c.open}</span>` : ''],
    ['drivers', 'users', t('Fahrer'), ''],
    ['vehicles', 'truck', t('Fahrzeuge'), due ? `<span class="count bad">${due}</span>` : ''],
    ['reports', 'chart-column', t('Berichte'), ''],
    ['settings', 'settings', t('Einstellungen'), ''],
  ];
  const unread = app.me.unread || 0;
  return `<div class="shell" data-key="shell">
    <aside class="rail"><div class="brandmark">${logoImg(app, tn)}<div style="min-width:0"><div class="title ellip">${esc(tn.branding?.appName || tn.name)}</div><div class="sub">${esc(isAdmin(app) ? t('Admin') : t('Disposition'))}</div></div></div>
      ${nav.map(([k, ic, l, cnt]) => `<button class="nav" data-act="go" data-to="${k}" aria-current="${r === k ? 'page' : 'false'}">${icon(ic)}${esc(l)}${cnt}</button>`).join('')}
      <div class="foot"><div class="row">${avatar(app.me.user.name)}<div class="grow"><div class="ellip" style="font-weight:750">${esc(app.me.user.name)}</div><div class="xs" style="color:var(--on-ink-2)">${esc(app.me.user.email || '')}</div></div><button class="ibtn" data-act="logout" aria-label="${t('Abmelden')}">${icon('log-out')}</button></div>
      <div class="powered">powered by <b>LADEKLAR</b></div></div></aside>
    <header class="topbar"><div class="brandmark">${logoImg(app, tn)}<div style="min-width:0"><div class="title ellip">${esc(tn.branding?.appName || tn.name)}</div><div class="sub">${esc(navTitle(r))}</div></div></div>
      <form class="search" data-form="search" role="search">${icon('search')}<input name="q" placeholder="${t('Buchungsnummer, Ort, Fahrer, Kennzeichen …')}" value="${esc(app.ui.dfilter?.q || '')}" aria-label="${t('Suchen')}"></form>
      <span class="grow"></span>
      <button class="btn btn-primary" data-act="newDelivery">${icon('plus')}<span>${t('Neue Lieferung')}</span></button>
      <button class="ibtn" data-act="openSheet" data-type="notifications" aria-label="${t('Mitteilungen')}">${icon('bell')}${unread ? `<span class="dot">${unread > 9 ? '9+' : unread}</span>` : ''}</button></header>
    <main class="main" data-key="main-${r}"><div class="page">${licenseBanner(app)}${page(app, r)}</div></main>
    <nav class="tabbar">${[['live', 'layout-dashboard', t('Live')], ['deliveries', 'package', t('Lieferungen')], ['drivers', 'users', t('Fahrer')], ['vehicles', 'truck', t('Fahrzeuge')], ['settings', 'settings', t('Mehr')]].map(([k, ic, l]) => `<button data-act="go" data-to="${k}" aria-current="${r === k || (k === 'settings' && r === 'reports') ? 'page' : 'false'}">${icon(ic)}${esc(l)}</button>`).join('')}</nav>
    ${sheetView(app)}</div>`;
}
const navTitle = (r) => ({ live: t('Live-Übersicht'), deliveries: t('Lieferungen'), drivers: t('Fahrer'), vehicles: t('Fahrzeuge'), reports: t('Berichte'), settings: t('Einstellungen') }[r] || '');
const sk = (h = 120) => `<div class="sk" style="height:${h}px"></div>`;

function page(app, r) {
  if (r === 'deliveries') return deliveriesPage(app);
  if (r === 'drivers') return driversPage(app);
  if (r === 'vehicles') return vehiclesPage(app);
  if (r === 'reports') return reportsPage(app);
  if (r === 'settings') return settingsPage(app);
  return livePage(app);
}

// ---------- live board ----------
function livePage(app) {
  const d = app.data.dash;
  const push = app.api.push;
  const head = `<div class="page-h"><div><span class="pill live info">${t('Live')}</span><h1 style="margin-top:8px">${greeting(esc(app.me.user.name.split(' ')[0]))}</h1><p class="lead">${esc(longDate(Date.now()))}</p></div>
    <div class="row wrap"><button class="btn" data-act="go" data-to="deliveries">${icon('list-checks')}${t('Alle Lieferungen')}</button><button class="btn btn-primary" data-act="newDelivery">${icon('plus')}${t('Neue Lieferung')}</button></div></div>`;
  if (!d) return head + `<div class="kpis">${sk(118)}${sk(118)}${sk(118)}${sk(118)}</div>${sk(280)}`;
  const k = (cls, ic, v, l, tab) => `<button class="kpi ${cls}" data-act="dtab" data-tab="${tab}"><span class="k-ic">${icon(ic)}</span><span class="k-v">${v}</span><span class="k-l">${l}</span></button>`;
  const pushCard = push && push.supported() && push.state() === 'default' ? `<div class="banner info">${icon('bell-ring')}<span class="grow">${t('Push-Mitteilungen einschalten – dann sehen Sie jeden Status sofort, auch bei geschlossenem Browser.')}</span><button class="btn btn-sm" data-act="pushOn">${t('Einschalten')}</button></div>` : '';
  return `${head}${pushCard}
    <div class="kpis">${k('warn', 'circle-dot', d.counts.open, t('Offen'), 'open')}${k('info', 'truck', d.counts.active, t('Unterwegs'), 'live')}${k('ok', 'circle-check-big', d.counts.deliveredToday, t('Heute zugestellt'), 'done')}${k(`bad ${d.counts.problems ? 'hot' : ''}`, 'triangle-alert', d.counts.problems, t('Störungen'), 'problems')}</div>
    <div style="display:grid;gap:18px;grid-template-columns:minmax(0,1fr)" class="live-grid">
      <style>@container lk (min-width:1100px){.live-grid{grid-template-columns:minmax(0,1.6fr) minmax(320px,1fr)!important}}</style>
      <div class="stack" style="--gap:14px">
        <div class="row between"><h3>${t('Aktive Touren')} <span class="muted">${d.active.length}</span></h3></div>
        ${d.active.length ? `<div class="tours">${d.active.map((x, i) => deliveryCompact(x, app, i)).join('')}</div>` : `<div class="card">${emptyState('truck', t('Gerade ist keine Tour unterwegs'), t('Sobald ein Fahrer eine Buchung bestätigt, erscheint sie hier – live.'))}</div>`}
        ${d.openToday.length ? `<div class="row between"><h3>${t('Heute offen')} <span class="muted">${d.openToday.length}</span></h3></div><div class="tours">${d.openToday.map((x, i) => deliveryCompact(x, app, i)).join('')}</div>` : ''}
      </div>
      <div class="stack" style="--gap:14px">
        <section class="card"><div class="card-h"><h3>${icon('zap')} ${t('Live-Ticker')}</h3><span class="pill live ok">${t('live')}</span></div>
          <div class="feed">${d.feed.length ? d.feed.slice(0, 14).map((e) => `<div class="fe" data-key="fe-${esc(e.id)}"><time>${time(e.at)}</time><span class="fi ${eventTone(e.type)}">${icon(EVENT_ICON[e.type] || 'circle-dot')}</span><div style="min-width:0"><b>${esc(eventText(e))}</b><p class="ellip">${esc(e.byName || '')} · <button class="btn-ghost" style="border:0;background:none;padding:0;font:inherit;color:var(--brand);cursor:pointer" data-act="openDelivery" data-id="${esc(e.deliveryId)}">${esc(e.route)}</button>${eventDetail(e) ? ' · ' + esc(eventDetail(e)) : ''}</p></div></div>`).join('') : `<p class="small muted" style="padding:10px 18px">${t('Noch keine Meldungen heute.')}</p>`}</div></section>
        <section class="card pad stack"><div class="row between"><h3>${icon('truck')} ${t('Fuhrpark')}</h3><button class="btn btn-ghost btn-sm" data-act="go" data-to="vehicles">${t('Alle')}</button></div>
          <div class="row wrap" style="--gap:18px"><div><div class="k-v display" style="font-size:var(--fs-xl)">${d.vehicles.inUse}/${d.vehicles.total}</div><div class="small muted">${t('im Einsatz')}</div></div><div><div class="display" style="font-size:var(--fs-xl)">${d.drivers.onTour}/${d.drivers.total}</div><div class="small muted">${t('Fahrer auf Tour')}</div></div><div><div class="display" style="font-size:var(--fs-xl)">${d.vehicles.workshop}</div><div class="small muted">${t('Werkstatt')}</div></div></div>
          ${d.vehicles.due.map((v) => `<div class="banner ${v.due.some((x) => x.overdue) ? 'bad' : ''}">${icon('calendar-clock')}<span class="grow">${plate(v.plate)} ${v.due.map((x) => `${x.kind === 'huDue' ? 'HU' : 'SP'} ${x.overdue ? t('überfällig seit') : t('fällig am')} ${esc(x.date.split('-').reverse().join('.'))}`).join(' · ')}</span></div>`).join('')}</section>
      </div></div>`;
}
const greeting = (name) => { const h = Number(new Intl.DateTimeFormat('de-DE', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' }).format(Date.now())); return h < 11 ? t('Guten Morgen, {name}', { name }) : h < 17 ? t('Guten Tag, {name}', { name }) : t('Guten Abend, {name}', { name }); };

// ---------- deliveries ----------
function deliveriesPage(app) {
  const f = app.ui.dfilter || { tab: 'live', q: '' };
  const c = app.data.dash?.counts || {};
  const tabs = [['live', t('Live'), c.active + (app.data.dash?.openToday?.length || 0)], ['planned', t('Geplant'), c.planned], ['open', t('Offen'), c.open], ['problems', t('Störungen'), c.problems], ['done', t('Erledigt'), null], ['all', t('Alle'), null]];
  const list = app.data.deliveries;
  const drivers = app.data.drivers || [];
  let body;
  if (!list) body = sk(300);
  else if (!list.length) body = `<div class="card">${emptyState('package', f.q ? t('Nichts gefunden für „{q}“', { q: f.q }) : t('Keine Lieferungen in dieser Ansicht'), '', `<button class="btn btn-primary" data-act="newDelivery">${icon('plus')}${t('Neue Lieferung')}</button>`)}</div>`;
  else if (['done', 'all'].includes(f.tab)) body = `<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>${t('Buchung')}</th><th>${t('Route')}</th><th>${t('Laden')}</th><th>${t('Fahrer')}</th><th>${t('Fahrzeug')}</th><th>${t('Status')}</th><th class="num">${t('Standzeit')}</th><th>${t('Lieferschein')}</th></tr></thead><tbody>${list.map((d) => `<tr data-act="openDelivery" data-id="${esc(d.id)}" data-key="r-${esc(d.id)}"><td class="mono">${esc(d.bookingNo)}</td><td><b>${routeTitle(d)}</b><div class="xs muted">${esc(d.customer || '')}</div></td><td>${esc(dayLabel(d.pickup.date, t))}</td><td>${esc(d.driverName || '–')}</td><td>${plate(d.vehiclePlate)}</td><td>${pill(d.status)}</td><td class="num">${d.waitingMinutes != null ? esc(minutes(d.waitingMinutes, t)) : '–'}</td><td>${(d.docs || []).some((x) => x.kind === 'pod') ? `<span class="pill ok">${icon('file-check')}${t('da')}</span>` : d.status === 'delivered' ? '' : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  else body = `<div class="tours two">${list.map((d, i) => deliveryCompact(d, app, i)).join('')}</div>`;
  return `<div class="page-h"><div><h1>${t('Lieferungen')}</h1><p class="lead">${t('Gegenwart, Zukunft und Vergangenheit – alles an einem Ort.')}</p></div><div class="row wrap">${app.api.exportUrl ? `<a class="btn" href="${esc(app.api.exportUrl('csv'))}" ${app.api.mode === 'demo' ? 'data-act="exportCsv" data-prevent="1"' : 'download'}>${icon('download')}CSV</a>` : ''}<button class="btn btn-primary" data-act="newDelivery">${icon('plus')}${t('Neue Lieferung')}</button></div></div>
    <div class="row wrap between"><div class="seg">${tabs.map(([k, l, n]) => `<button data-act="dtab" data-tab="${k}" aria-pressed="${f.tab === k}">${esc(l)}${n ? `<span class="count">${n}</span>` : ''}</button>`).join('')}</div>
      <div class="row wrap"><form data-form="search" class="row" style="--gap:6px"><input class="input" name="q" style="min-height:40px;width:min(280px,60vw)" placeholder="${t('Suchen …')}" value="${esc(f.q || '')}"></form>
      <select class="input" style="min-height:40px;width:auto" data-input="driverFilter" aria-label="${t('Fahrer')}"><option value="">${t('Alle Fahrer')}</option>${drivers.map((u) => `<option value="${esc(u.id)}" ${f.driverId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div></div>
    ${body}`;
}

// ---------- drivers ----------
function driversPage(app) {
  const list = app.data.drivers;
  const lic = app.me.license;
  const active = (list || []).filter((u) => u.active).length;
  return `<div class="page-h"><div><h1>${t('Fahrer')}</h1><p class="lead">${t('Jeder Fahrer bekommt einen eigenen Zugang mit PIN – per Link, QR-Code oder WhatsApp.')}</p></div><button class="btn btn-primary" data-act="newDriver">${icon('user-plus')}${t('Fahrer anlegen')}</button></div>
    ${lic ? `<div class="card pad row wrap"><div class="grow"><b>${t('{n} von {m} Fahrer-Plätzen belegt', { n: active, m: lic.driverSeats })}</b><div class="bar" style="margin-top:8px;--p:${Math.min(1, active / lic.driverSeats)}"><i></i></div></div><span class="pill brand">${esc(lic.plan.name)}</span></div>` : ''}
    ${!list ? sk(260) : list.length ? `<div class="grid" style="--min:290px">${list.map((u, i) => `<article class="card pad stack" style="--gap:12px;animation:rise .45s ${i * 35}ms both;${u.active ? '' : 'opacity:.6'}" data-key="u-${esc(u.id)}">
      <div class="row">${avatar(u.name, 'lg')}<div class="grow"><h4 class="ellip">${esc(u.name)}</h4><div class="small muted">${esc(u.phone || '')}</div></div>${flag(u.lang)}</div>
      <div class="row wrap" style="--gap:6px">${u.vehiclePlate ? plate(u.vehiclePlate) : `<span class="pill">${icon('truck')}${t('kein LKW')}</span>`}${u.trailerPlate ? plate(u.trailerPlate) : ''}${u.activeDeliveries ? `<span class="pill live info">${t('{n} Tour(en)', { n: u.activeDeliveries })}</span>` : ''}${u.licenseClass ? `<span class="pill">${icon('id-card')}${esc(u.licenseClass)}</span>` : ''}${u.active ? '' : `<span class="pill bad">${icon('lock')}${t('gesperrt')}</span>`}</div>
      <div class="row wrap" style="--gap:6px"><button class="btn btn-sm" data-act="resetPin" data-id="${esc(u.id)}">${icon('key-round')}${t('Neue PIN & Einladung')}</button><button class="btn btn-sm btn-ghost" data-act="editDriver" data-id="${esc(u.id)}">${icon('pencil')}${t('Bearbeiten')}</button><button class="btn btn-sm btn-ghost" data-act="toggleUser" data-id="${esc(u.id)}" data-on="${u.active ? '0' : '1'}">${icon(u.active ? 'lock' : 'refresh-cw')}${u.active ? t('Sperren') : t('Entsperren')}</button>${u.phone ? `<a class="btn btn-sm btn-ghost" href="${esc(phoneHref(u.phone))}">${icon('phone')}</a>` : ''}</div></article>`).join('')}</div>` : `<div class="card">${emptyState('users', t('Noch keine Fahrer'), t('Legen Sie den ersten Fahrer an – er bekommt eine PIN und einen Einladungslink.'), `<button class="btn btn-primary" data-act="newDriver">${icon('user-plus')}${t('Fahrer anlegen')}</button>`)}</div>`}`;
}

// ---------- vehicles ----------
function vehiclesPage(app) {
  const list = app.data.vehicles;
  const k = app.ui.vkind || 'all';
  const shown = (list || []).filter((v) => k === 'all' || v.kind === k);
  return `<div class="page-h"><div><h1>${t('Fahrzeuge')}</h1><p class="lead">${t('Der Pool, aus dem Ihre Fahrer LKW und Auflieger wählen.')}</p></div><button class="btn btn-primary" data-act="newVehicle">${icon('plus')}${t('Fahrzeug anlegen')}</button></div>
    <div class="seg">${[['all', t('Alle')], ['truck', t('LKW / Zugmaschinen')], ['trailer', t('Auflieger / Anhänger')]].map(([kk, l]) => `<button data-act="vkind" data-k="${kk}" aria-pressed="${k === kk}">${esc(l)}</button>`).join('')}</div>
    ${!list ? sk(240) : shown.length ? `<div class="grid" style="--min:270px">${shown.map((v, i) => `<article class="card pad stack" style="--gap:12px;animation:rise .45s ${i * 30}ms both" data-key="v-${esc(v.id)}">
      <div class="row between">${plate(v.plate, 'lg')}<span class="avatar">${icon(VEHICLE_ICON[v.type] || 'truck')}</span></div>
      <div><h4>${esc(v.name || vehicleTypeText(v.type))}</h4><div class="small muted">${esc(vehicleTypeText(v.type))}${v.payloadKg ? ' · ' + esc(kg(v.payloadKg)) : ''}${v.pallets ? ' · ' + v.pallets + ' ' + t('Stellplätze') : ''}</div></div>
      <div class="row wrap" style="--gap:6px">${v.status === 'workshop' ? `<span class="pill warn">${icon('wrench')}${t('Werkstatt')}</span>` : v.busy ? `<span class="pill live info">${t('fährt: {n}', { n: esc(v.driverName) })}</span>` : `<span class="pill ok">${icon('check')}${t('frei')}</span>`}${(v.features || []).map((f) => `<span class="pill">${esc(featureText(f))}</span>`).join('')}</div>
      ${v.due.map((x) => `<div class="banner ${x.overdue ? 'bad' : ''}">${icon('calendar-clock')}<span class="grow">${x.kind === 'huDue' ? t('Hauptuntersuchung (HU)') : t('Sicherheitsprüfung (SP)')} ${x.overdue ? t('überfällig seit') : t('fällig am')} ${esc(x.date.split('-').reverse().join('.'))}</span></div>`).join('')}
      ${v.note ? `<p class="small muted">${esc(v.note)}</p>` : ''}
      <div class="row wrap" style="--gap:6px"><button class="btn btn-sm" data-act="editVehicle" data-id="${esc(v.id)}">${icon('pencil')}${t('Bearbeiten')}</button>${v.busy ? `<button class="btn btn-sm btn-ghost" data-act="releaseVehicle" data-id="${esc(v.id)}">${icon('log-out')}${t('Freigeben')}</button>` : ''}<button class="btn btn-sm btn-ghost" data-act="workshop" data-id="${esc(v.id)}" data-on="${v.status === 'workshop' ? '0' : '1'}">${icon('wrench')}${v.status === 'workshop' ? t('Zurück in Betrieb') : t('In die Werkstatt')}</button></div></article>`).join('')}</div>` : `<div class="card">${emptyState('truck', t('Noch keine Fahrzeuge'), t('Legen Sie Ihre LKW und Auflieger an – die Fahrer wählen daraus.'), `<button class="btn btn-primary" data-act="newVehicle">${icon('plus')}${t('Fahrzeug anlegen')}</button>`)}</div>`}`;
}

// ---------- reports ----------
function reportsPage(app) {
  const r = app.data.reports;
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  const m = app.ui.month || months[0];
  const kpi = (cls, ic, v, l) => `<div class="kpi ${cls}" style="cursor:default"><span class="k-ic">${icon(ic)}</span><span class="k-v">${v}</span><span class="k-l">${l}</span></div>`;
  return `<div class="page-h"><div><h1>${t('Berichte')}</h1><p class="lead">${t('Leistung, Pünktlichkeit, Standzeiten und Palettenkonto.')}</p></div><select class="input" style="width:auto" data-input="month">${months.map((x) => `<option value="${x}" ${x === m ? 'selected' : ''}>${new Date(x + '-15').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</option>`).join('')}</select></div>
    ${!r ? sk(220) : `<div class="kpis">${kpi('ok', 'circle-check-big', r.delivered, t('Zugestellt'))}${kpi('info', 'timer', r.onTimeRate == null ? '–' : r.onTimeRate + ' %', t('Pünktlich'))}${kpi('warn', 'hourglass', r.avgWaiting == null ? '–' : r.avgWaiting + ' min', t('Ø Standzeit je Tour'))}${kpi('', 'boxes', (r.palletsGiven - r.palletsTaken > 0 ? '−' : '') + Math.abs(r.palletsGiven - r.palletsTaken), t('Palettensaldo (offen)'))}</div>
      <section class="card"><div class="card-h"><h3>${t('Je Fahrer')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Fahrer')}</th><th class="num">${t('Zugestellt')}</th><th class="num">${t('Standzeit gesamt')}</th><th class="num">${t('Probleme')}</th></tr></thead><tbody>${r.byDriverHidden ? `<tr><td colspan="4" class="muted">${t('Auswertungen je Fahrer sind ausgeschaltet (Einstellungen → Abläufe).')}</td></tr>` : ''}${r.byDriver.map((x) => `<tr style="cursor:default"><td><div class="row">${avatar(x.driverName)}<b>${esc(x.driverName)}</b></div></td><td class="num">${x.delivered}</td><td class="num">${esc(minutes(x.waiting, t))}</td><td class="num">${x.problems}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${t('Keine Daten in diesem Monat.')}</td></tr>`}</tbody></table></div></section>
      <div class="banner info">${icon('info')}<span class="grow">${t('Standzeiten entstehen aus den Tipps „Angekommen“ und „Aufgeladen/Abgeladen“ – die Grundlage für Standgeld-Rechnungen.')}</span></div>`}`;
}

// ---------- settings ----------
function settingsPage(app) {
  const tn = app.tenant();
  const sec = app.ui.ssec || (isAdmin(app) ? 'brand' : 'account');
  const tabs = isAdmin(app) ? [['brand', t('Firma & Marke')], ['flow', t('Abläufe')], ['team', t('Team')], ['license', t('Lizenz')], ['data', t('Daten & Datenschutz')], ['api', 'API'], ['account', t('Mein Konto')], ['reports', t('Berichte')]] : [['account', t('Mein Konto')], ['reports', t('Berichte')]];
  let body = '';
  if (sec === 'reports') { app.go('reports'); return ''; }
  if (sec === 'brand') body = brandSection(app, tn);
  else if (sec === 'flow') body = flowSection(app, tn);
  else if (sec === 'team') body = teamSection(app);
  else if (sec === 'license') body = licenseSection(app);
  else if (sec === 'data') body = dataSection(app, tn);
  else if (sec === 'api') body = apiSection(app, tn);
  else body = accountSection(app);
  return `<div class="page-h"><div><h1>${t('Einstellungen')}</h1><p class="lead">${esc(tn.name)} · ${t('Firmencode')} <b class="mono">${esc(tn.code)}</b></p></div></div>
    <div class="seg">${tabs.map(([k, l]) => `<button data-act="ssec" data-k="${k}" aria-pressed="${sec === k}">${esc(l)}</button>`).join('')}</div>${body}`;
}

const PRESETS = ['#0e7c7b', '#1f6feb', '#13315c', '#7c2d12', '#b45309', '#15803d', '#be123c', '#334155', '#0891b2', '#6d28d9'];
function brandSection(app, tn) {
  const b = tn.branding || {};
  const color = app.ui.previewColor || b.color;
  return `<div style="display:grid;gap:18px;grid-template-columns:minmax(0,1fr)" class="brand-grid"><style>@container lk (min-width:980px){.brand-grid{grid-template-columns:minmax(0,1fr) 260px!important}}</style>
    <section class="card pad stack" style="--gap:16px"><h3>${t('Logo, Farbe und App-Name')}</h3><p class="small muted">${t('So erscheint die App bei Ihren Fahrern: Login, Startbildschirm, Handy-Symbol und Mitteilungen tragen Ihr Logo.')}</p>
      <div class="row wrap" style="--gap:14px">${logoImg(app, tn, 'tlogo" style="width:120px;height:64px')}<label class="btn">${icon('upload')}${t('Logo hochladen')}<input class="sr" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-input="logoFile"></label>${b.logoFileId ? `<button class="btn btn-ghost" data-act="removeLogo">${icon('trash-2')}${t('Entfernen')}</button>` : ''}</div>
      <form data-form="brand" class="stack">
        <label class="field"><span>${t('App-Name (unter dem Handy-Symbol)')}</span><input class="input" name="appName" maxlength="40" value="${esc(b.appName || tn.name)}"></label>
        <div class="field"><span>${t('Markenfarbe')}</span><div class="colors">${PRESETS.map((c) => `<button type="button" style="background:${c}" data-act="pickColor" data-c="${c}" aria-pressed="${color === c}" aria-label="${c}"></button>`).join('')}<input type="color" name="color" value="${esc(color)}" data-input="colorPick" style="width:44px;height:36px;border:0;background:none"></div></div>
        <div class="fgrid"><label class="field"><span>${t('Firmenname')}</span><input class="input" name="name" value="${esc(tn.name)}"></label><label class="field"><span>${t('Telefon Disposition (für Fahrer)')}</span><input class="input" name="phone" value="${esc(tn.phone || '')}"></label>
        <label class="field full"><span>${t('Anschrift')}</span><input class="input" name="address" value="${esc(tn.address || '')}"></label></div>
        <div><button class="btn btn-primary" type="submit">${icon('check')}${t('Speichern')}</button></div></form></section>
    <div class="stack" style="align-items:center"><span class="eyebrow">${t('Vorschau Fahrer-App')}</span><div class="preview-phone" style="--brand:${esc(color)}"><div class="scr"><div class="ph-top"><span class="logo-chip" style="height:30px">${b.logoFileId ? `<img src="${esc(app.fileUrl(b.logoFileId))}" alt="">` : esc(tn.name)}</span><div style="font:800 15px var(--f-display);margin-top:10px">${t('Hallo Mehmet')}</div><div style="font-size:11px;opacity:.7">${esc(b.appName || tn.name)}</div></div>
      <div style="margin:10px;padding:12px;border-radius:14px;background:var(--surface);border:1px solid var(--line)"><div style="font:850 16px var(--f-display)">Stuttgart → Hamburg</div><div class="xs muted">KAY-2610-0042</div></div>
      <div class="ph-btn">${icon('arrow-up-from-line')} ${tStep('loaded')}</div><div class="quick" style="margin:0 10px;grid-template-columns:repeat(4,1fr)">${['navigation', 'phone', 'message-square-text', 'triangle-alert'].map((x) => `<button style="padding:8px 0">${icon(x)}</button>`).join('')}</div></div></div>
      <p class="xs muted" style="text-align:center;max-width:26ch">${t('Fahrer installieren die App über Ihren Link: {l}', { l: esc(app.api.tenantLink?.(tn.code) || '') })}</p></div></div>`;
}

const FLOW = [
  ['driverPicksTruck', 'truck', 'Fahrer wählen ihr Fahrzeug selbst', 'LKW und Auflieger aus dem Pool. Aus: Die Disposition teilt zu.'],
  ['driverTakesOpen', 'users', 'Fahrer dürfen offene Aufträge übernehmen', 'Aufträge „offen für alle“ erscheinen bei allen Fahrern zum Übernehmen.'],
  ['requirePod', 'camera', 'Lieferschein-Foto ist Pflicht', 'Abschließen geht erst, wenn der Lieferschein fotografiert ist.'],
  ['requireSignature', 'signature', 'Unterschrift des Empfängers verlangen', 'Der Empfänger unterschreibt auf dem Display.'],
  ['trackArrival', 'map-pin', 'Ankunft an Lade- und Entladestelle erfassen', 'Zwei zusätzliche Tipps – ergibt die Standzeit (Grundlage für Standgeld).'],
  ['palletExchange', 'boxes', 'Palettentausch beim Abladen abfragen', 'Abgegebene und mitgenommene EUR-Paletten – für Ihr Palettenkonto.'],
  ['driveLock', 'octagon-x', 'Fahrsperre während der Fahrt', 'Ab ca. 8 km/h werden die Knöpfe verdeckt (§ 23 StVO). Der Standort wird dafür nur auf dem Gerät ausgewertet, nie gespeichert.'],
  ['geoOnStatus', 'map-pin', 'Standort beim Statuswechsel speichern', 'Nur im Moment eines Tipps und nur, wenn der Fahrer zustimmt. Keine Dauerortung, Löschung nach 90 Tagen. Vorher Datenschutzhinweise ausgeben und ggf. Betriebsrat beteiligen.'],
  ['reportsByDriver', 'chart-column', 'Auswertungen je Fahrer anzeigen', 'Lieferungen, Standzeiten und Probleme je Fahrer. Mit Betriebsrat nur auf Grundlage einer Betriebsvereinbarung (§ 87 BetrVG).'],
];
function flowSection(app, tn) {
  const s = tn.settings || {};
  return `<section class="card pad"><h3>${t('Abläufe')}</h3><p class="small muted" style="margin:4px 0 6px">${t('Änderungen gelten sofort für alle Fahrer.')}</p>
    ${FLOW.map(([k, ic, l, d]) => `<label class="switch"><input type="checkbox" data-input="setting" data-k="${k}" ${s[k] ? 'checked' : ''}><span class="grow"><b>${icon(ic)} ${esc(t(l))}</b><small>${esc(t(d))}</small></span></label>`).join('')}</section>
    <section class="card pad"><form data-form="flowExtra" class="fgrid"><label class="field"><span>${t('Präfix der Buchungsnummer')}</span><input class="input mono" name="bookingPrefix" maxlength="6" value="${esc(s.bookingPrefix || '')}"><span class="hint">${t('Beispiel: {p}-2610-0042', { p: esc(s.bookingPrefix || 'KAY') })}</span></label>
      <label class="field"><span>${t('Lieferscheine aufbewahren (Jahre)')}</span><input class="input" type="number" min="1" max="10" name="retentionYears" value="${esc(s.retentionYears || 3)}"><span class="hint">${t('Danach werden abgeschlossene Lieferungen samt Fotos automatisch gelöscht.')}</span></label>
      <div class="full"><button class="btn btn-primary" type="submit">${icon('check')}${t('Speichern')}</button></div></form></section>`;
}
function teamSection(app) {
  const list = app.data.staff;
  return `<section class="card"><div class="card-h"><h3>${t('Büro-Zugänge')}</h3><button class="btn btn-primary btn-sm" data-act="newStaff">${icon('user-plus')}${t('Disponent anlegen')}</button></div>
    <div class="list" style="margin-top:8px">${!list ? sk(100) : list.map((u) => `<div class="li" style="cursor:default">${avatar(u.name)}<div class="grow"><div class="t1">${esc(u.name)} ${u.id === app.me.user.id ? `<span class="pill">${t('Sie')}</span>` : ''}</div><div class="t2">${esc(u.email)} · ${u.role === 'admin' ? t('Admin') : t('Disponent')}${u.active ? '' : ' · ' + t('gesperrt')}</div></div>${u.id !== app.me.user.id ? `<button class="btn btn-sm btn-ghost" data-act="resetPin" data-id="${esc(u.id)}">${icon('key-round')}${t('Neues Passwort')}</button><button class="btn btn-sm btn-ghost" data-act="toggleUser" data-id="${esc(u.id)}" data-on="${u.active ? '0' : '1'}">${icon(u.active ? 'lock' : 'refresh-cw')}</button>` : ''}</div>`).join('')}</div></section>`;
}
function licenseSection(app) {
  const l = app.me.license;
  const stateText = { trial: t('Testphase'), active: t('Aktiv'), suspended: t('Gesperrt'), expired: t('Abgelaufen'), cancelled: t('Gekündigt') }[l.state];
  return `<section class="card pad stack"><div class="row between wrap"><div><span class="eyebrow">${t('Ihr Tarif')}</span><h2>Ladeklar ${esc(l.plan.name)}</h2></div><span class="pill ${l.state === 'active' ? 'ok' : l.state === 'trial' ? 'info' : 'bad'}">${esc(stateText)}</span></div>
    <dl class="kv"><dt>${t('Preis')}</dt><dd>${l.plan.price} € ${t('netto / Monat')}</dd><dt>${t('Fahrer-Plätze')}</dt><dd>${l.driverSeats}</dd><dt>${t('Fahrzeuge')}</dt><dd>${l.plan.vehicles ?? t('unbegrenzt')}</dd>${l.trialEnd ? `<dt>${t('Test bis')}</dt><dd>${esc(dateTime(l.trialEnd))}</dd>` : ''}${l.licenseEnd ? `<dt>${t('Laufzeit bis')}</dt><dd>${esc(dateTime(l.licenseEnd))}</dd>` : ''}</dl>
    <p class="small muted">${t('Für einen Tarifwechsel oder weitere Fahrer-Plätze genügt eine kurze Nachricht an Ihren Anbieter.')}</p></section>
    <div class="plans">${Object.values(PLANS).map((p) => `<div class="plan ${p.id === l.plan.id ? 'hl' : ''}"><span class="eyebrow">${esc(p.name)}</span><div class="price">${p.price} €<small> / ${t('Monat')}</small></div><ul><li>${icon('check')}${t('{n} Fahrer inklusive', { n: p.drivers })}</li><li>${icon('check')}${p.vehicles ? t('{n} Fahrzeuge', { n: p.vehicles }) : t('Fahrzeuge unbegrenzt')}</li><li>${icon('check')}${t('Eigenes Logo & Farben')}</li>${p.api ? `<li>${icon('check')}${t('REST-API, eigene Domain')}</li>` : ''}</ul></div>`).join('')}</div>`;
}
function dataSection(app, tn) {
  const sup = tn.supportAccessUntil && tn.supportAccessUntil > Date.now();
  const audit = app.data.audit || [];
  return `<section class="card pad stack"><h3>${icon('download')} ${t('Datenexport')}</h3><p class="small muted">${t('Alle Daten Ihres Unternehmens jederzeit mitnehmen – auch beim Anbieterwechsel (EU Data Act).')}</p>
    <div class="row wrap">${app.api.mode === 'demo' ? `<button class="btn" data-act="exportJson">${icon('file-down')}${t('Alles als JSON')}</button><button class="btn" data-act="exportCsv">${icon('file-down')}${t('Lieferungen als CSV')}</button>` : `<a class="btn" href="${esc(app.api.exportUrl('json'))}" download>${icon('file-down')}${t('Alles als JSON')}</a><a class="btn" href="${esc(app.api.exportUrl('csv'))}" download>${icon('file-down')}${t('Lieferungen als CSV')}</a>`}</div></section>
    <section class="card pad stack"><h3>${icon('shield-check')} ${t('Support-Zugriff')}</h3><p class="small muted">${t('Der Anbieter sieht Ihre Lieferdaten nicht. Nur wenn Sie Hilfe brauchen, können Sie hier einen befristeten Zugriff freigeben – er wird protokolliert.')}</p>
      <div class="row wrap">${sup ? `<span class="pill warn">${icon('clock')}${t('freigegeben bis {d}', { d: esc(dateTime(tn.supportAccessUntil)) })}</span><button class="btn btn-sm" data-act="support" data-h="0">${t('Jetzt beenden')}</button>` : `<button class="btn btn-sm" data-act="support" data-h="24">${icon('handshake')}${t('Für 24 Stunden freigeben')}</button>`}</div></section>
    <section class="card"><div class="card-h"><h3>${icon('history')} ${t('Protokoll')}</h3></div><div class="list" style="margin-top:6px">${audit.slice(0, 25).map((e) => `<div class="li" style="cursor:default"><span class="xs muted mono" style="width:92px">${esc(dateTime(e.at))}</span><div class="grow"><div class="t1 small">${esc(e.action)}</div><div class="t2">${esc(e.actorName || '')}</div></div></div>`).join('') || `<p class="small muted" style="padding:12px 18px">${t('Noch keine Einträge.')}</p>`}</div></section>`;
}
function apiSection(app, tn) {
  const prem = app.me.license?.plan?.api;
  const key = app.ui.apiKey;
  return `<section class="card pad stack"><h3>${icon('link')} REST-API</h3><p class="small muted">${t('Lieferungen automatisch aus Ihrem TMS oder Ihrer Buchhaltung anlegen und abfragen.')}</p>
    ${prem ? `${key ? `<div class="secret"><span class="grow">${esc(key)}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(key)}">${icon('copy')}</button></div><p class="small" style="color:var(--warn)">${t('Der Schlüssel wird nur jetzt angezeigt.')}</p>` : `<p class="small">${tn.apiKeySet ? t('Ein Schlüssel ist aktiv.') : t('Noch kein Schlüssel.')}</p>`}<div><button class="btn" data-act="rotateKey">${icon('key-round')}${tn.apiKeySet ? t('Neuen Schlüssel erzeugen') : t('Schlüssel erzeugen')}</button></div>
      <pre class="card pad xs mono" style="overflow:auto;margin:0;white-space:pre">curl -H "Authorization: Bearer lk_…" ${esc(location.origin)}/api/v1/deliveries
curl -X POST -H "Authorization: Bearer lk_…" -H "Content-Type: application/json" \\
  -d '{"pickup":{"city":"Stuttgart","date":"${isoToday()}"},"dropoff":{"city":"Hamburg"}}' ${esc(location.origin)}/api/v1/deliveries</pre>` : `<div class="banner info">${icon('crown')}<span class="grow">${t('Die API ist im Tarif Premium enthalten.')}</span></div>`}</section>`;
}
function accountSection(app) {
  return `<section class="card pad stack"><h3>${t('Mein Konto')}</h3><dl class="kv"><dt>${t('Name')}</dt><dd>${esc(app.me.user.name)}</dd><dt>${t('E-Mail')}</dt><dd>${esc(app.me.user.email || '')}</dd><dt>${t('Rolle')}</dt><dd>${isAdmin(app) ? t('Admin') : t('Disponent')}</dd></dl>
    <div class="field"><span>${t('Sprache')}</span><div class="seg">${['de', 'en', 'tr'].map((l) => `<button data-act="lang" data-lang="${l}" aria-pressed="${app.lang === l}">${LANG_NAMES[l]}</button>`).join('')}</div></div></section>
    ${app.me.user.mustChangePassword ? `<div class="banner">${icon('key-round')}<span class="grow">${t('Bitte vergeben Sie jetzt ein eigenes Passwort.')}</span></div>` : ''}
    <section class="card pad"><form data-form="password" class="fgrid"><label class="field"><span>${t('Aktuelles Passwort')}</span><input class="input" type="password" name="current" autocomplete="current-password" required></label><label class="field"><span>${t('Neues Passwort (mind. 10 Zeichen)')}</span><input class="input" type="password" name="next" minlength="10" autocomplete="new-password" required></label><div class="full"><button class="btn btn-primary" type="submit">${icon('key-round')}${t('Passwort ändern')}</button></div></form></section>
    <button class="btn btn-danger" data-act="logout" style="align-self:flex-start">${icon('log-out')}${t('Abmelden')}</button>`;
}

// ---------- sheets ----------
function sheetView(app) {
  const s = app.ui.sheet;
  if (!s) return '';
  if (s.type === 'delivery') return deliverySheet(app);
  if (s.type === 'deliveryForm') return deliveryFormSheet(app);
  if (s.type === 'driverForm') return driverFormSheet(app);
  if (s.type === 'staffForm') return staffFormSheet(app);
  if (s.type === 'vehicleForm') return vehicleFormSheet(app);
  if (s.type === 'access') return accessSheet(app);
  if (s.type === 'notifications') return notificationsSheet(app);
  if (s.type === 'proof') return proofSheet(app);
  if (s.type === 'cancel') return sheet({ key: 'cancel', title: t('Lieferung stornieren'), body: `<form id="cancelForm" data-form="cancel"><label class="field"><span>${t('Grund (geht an den Fahrer)')}</span><textarea class="input" name="reason" placeholder="${t('z. B. Kunde hat verschoben')}"></textarea></label></form>`, foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-danger" type="submit" form="cancelForm">${icon('ban')}${t('Stornieren')}</button>` });
  return '';
}

function deliverySheet(app) {
  const d = app.data.delivery;
  if (!d || d.id !== app.ui.sheet.id) return sheet({ title: t('Laden …'), body: sk(300), wide: true });
  const drivers = (app.data.drivers || []).filter((u) => u.active);
  const vs = app.data.vehicles || [];
  const done = ['delivered', 'cancelled'].includes(d.status);
  const lockedDriver = ['loaded', 'arrived_dropoff', 'unloaded', 'delivered', 'cancelled'].includes(d.status);
  const assign = done ? '' : `<form data-form="assign" class="stack" style="--gap:10px"><div class="fgrid" style="--cols:3">
      <label class="field"><span>${t('Fahrer')}</span><select class="input" name="driverId" ${lockedDriver ? 'disabled' : ''}><option value="">${t('— offen —')}</option>${drivers.map((u) => `<option value="${esc(u.id)}" ${d.driverId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
      <label class="field"><span>${t('LKW')}</span><select class="input" name="vehicleId"><option value="">—</option>${vs.filter((v) => v.kind === 'truck').map((v) => `<option value="${esc(v.id)}" ${d.vehicleId === v.id ? 'selected' : ''}>${esc(v.plate)}</option>`).join('')}</select></label>
      <label class="field"><span>${t('Auflieger')}</span><select class="input" name="trailerId"><option value="">—</option>${vs.filter((v) => v.kind === 'trailer').map((v) => `<option value="${esc(v.id)}" ${d.trailerId === v.id ? 'selected' : ''}>${esc(v.plate)}</option>`).join('')}</select></label></div>
      ${!d.driverId && d.status === 'open' ? `<label class="check"><input type="checkbox" name="openForAll" ${d.openForAll ? 'checked' : ''}>${t('Offen für alle Fahrer (jeder kann übernehmen)')}</label>` : ''}
      <div><button class="btn btn-sm" type="submit">${icon('check')}${t('Zuweisung speichern')}</button></div></form>`;
  const officeStep = d.next && d.status !== 'open' && !done ? `<button class="btn" data-act="officeStep" data-id="${esc(d.id)}" data-step="${d.next}" title="${t('Wenn der Fahrer telefonisch meldet')}">${icon('circle-check-big')}${t('Für Fahrer setzen: {s}', { s: tStep(d.next) })}</button>` : '';
  return sheet({
    key: 'delivery', wide: true, title: routeTitle(d), sub: `<span class="mono">${esc(d.bookingNo)}</span>${d.customer ? ' · ' + esc(d.customer) : ''}${d.reference ? ' · Ref. ' + esc(d.reference) : ''}`,
    body: `<div class="row wrap">${pill(d.status)}${problemPill(d.problem)}${d.urgent ? `<span class="pill bad">${icon('zap')}${t('Eilig')}</span>` : ''}${d.driverName ? `<span class="pill">${icon('circle-user')}${esc(d.driverName)}</span>` : d.openForAll ? `<span class="pill warn">${icon('users')}${t('offen für alle Fahrer')}</span>` : ''}${plate(d.vehiclePlate)}${plate(d.trailerPlate)}${d.waitingMinutes != null ? `<span class="pill">${icon('hourglass')}${t('Standzeit')} ${esc(minutes(d.waitingMinutes, t))}</span>` : ''}</div>
      ${d.problem ? `<div class="banner bad">${icon('triangle-alert')}<span class="grow"><b>${esc(tProblem(d.problem.code))}</b>${d.problem.note ? ' – ' + esc(d.problem.note) : ''} · ${esc(ago(d.problem.at, t))}</span><button class="btn btn-sm" data-act="resolve" data-id="${esc(d.id)}">${icon('shield-check')}${t('Erledigt')}</button></div>` : ''}
      ${d.status !== 'open' && d.status !== 'cancelled' ? `<div class="card pad">${stepper(d)}</div>` : ''}
      <div style="display:grid;gap:18px;grid-template-columns:minmax(0,1fr)" class="dgrid"><style>@container lk (min-width:1100px){.dgrid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}</style>
        <div class="stack" style="--gap:14px">${placeBlock(d.pickup, 'pickup')}<div class="place"><span class="line"></span></div>${placeBlock(d.dropoff, 'dropoff')}
          <div class="row wrap">${goodsFacts(d)}${d.goods?.text ? `<span class="fact">${icon('package')}${esc(d.goods.text)}</span>` : ''}</div>
          ${d.instructions ? `<div class="banner info">${icon('info')}<span class="grow">${esc(d.instructions)}</span></div>` : ''}
          ${d.internalNote ? `<div class="banner">${icon('lock')}<span class="grow">${t('Intern')}: ${esc(d.internalNote)}</span></div>` : ''}
          ${d.palletExchange ? `<div class="banner ok">${icon('boxes')}<span class="grow">${t('Paletten: {g} abgegeben, {t} mitgenommen', { g: d.palletExchange.given, t: d.palletExchange.taken })}</span></div>` : ''}
          ${d.receiver ? `<p class="small">${t('Empfangen von')}: <b>${esc(d.receiver)}</b></p>` : ''}
          ${assign ? `<div class="section-t">${t('Zuweisung')}</div>${assign}` : ''}
        </div>
        <div class="stack" style="--gap:14px"><div class="section-t">${t('Lieferschein & Fotos')}</div>${docsGrid(app, d, { removable: !done, add: d.status === 'cancelled' ? '' : `<label class="doc add">${icon('upload')}<span>${t('Hinzufügen')}</span><input class="sr" type="file" accept="image/*,application/pdf" multiple data-input="officeFile" data-id="${esc(d.id)}"></label>` })}
          <div class="section-t">${t('Notizen mit dem Fahrer')}</div>${notesThread(app, d)}
          <form data-form="note" data-id="${esc(d.id)}" class="row" style="--gap:8px"><input class="input" name="text" placeholder="${t('Nachricht an den Fahrer …')}" required><button class="btn btn-primary" type="submit" aria-label="${t('Senden')}">${icon('send')}</button></form>
          <div class="section-t">${t('Verlauf')}</div>${timeline(d)}</div></div>`,
    foot: `${!done ? `<button class="btn btn-danger btn-ghost" data-act="openSheet" data-type="cancel" data-id="${esc(d.id)}">${icon('ban')}${t('Stornieren')}</button>` : ''}<span class="grow"></span>${officeStep}<button class="btn" data-act="proof" data-id="${esc(d.id)}">${icon('receipt-text')}${t('Abliefernachweis')}</button><button class="btn" data-act="duplicate" data-id="${esc(d.id)}">${icon('copy')}${t('Wiederholen')}</button>${!done || true ? `<button class="btn btn-primary" data-act="editDelivery" data-id="${esc(d.id)}">${icon('pencil')}${t('Bearbeiten')}</button>` : ''}`,
  });
}

function placeFields(side, p = {}, app) {
  const sug = app.ui.suggest?.side === side ? app.ui.suggest : null;
  const menu = (field) => (sug && sug.field === field && sug.list.length ? `<div class="menu">${sug.list.map((x, i) => `<button type="button" data-act="usePlace" data-side="${side}" data-i="${i}">${esc(x.place || x.city)}<small>${esc([x.street, x.zip, x.city].filter(Boolean).join(', '))} · ${t('{n}× genutzt', { n: x.count })}</small></button>`).join('')}</div>` : '');
  const today = isoToday();
  return `<div class="fgrid" style="--cols:6">
    <label class="field span3 suggest"><span>${t('Ort / Firma')}</span><input class="input" name="${side}.place" value="${esc(p.place || '')}" autocomplete="off" data-input="placeSuggest" data-side="${side}" placeholder="${side === 'pickup' ? t('z. B. Bosch Werk Feuerbach') : t('z. B. HHLA Terminal')}">${menu('place')}</label>
    <label class="field span3 suggest"><span>${t('Stadt')} *</span><input class="input" name="${side}.city" value="${esc(p.city || '')}" required autocomplete="off" data-input="placeSuggest" data-side="${side}" placeholder="${side === 'pickup' ? 'Stuttgart' : 'Hamburg'}">${menu('city')}</label>
    <label class="field span3"><span>${t('Straße')}</span><input class="input" name="${side}.street" value="${esc(p.street || '')}"></label>
    <label class="field"><span>${t('PLZ')}</span><input class="input" name="${side}.zip" value="${esc(p.zip || '')}" inputmode="numeric"></label>
    <label class="field span2"><span>${t('Land')}</span><select class="input" name="${side}.country">${['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'PL', 'CZ', 'IT', 'DK', 'LU', 'ES', 'RO', 'HU'].map((c) => `<option ${(p.country || 'DE') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field span2"><span>${t('Datum')}${side === 'pickup' ? ' *' : ''}</span><input class="input" type="date" name="${side}.date" value="${esc(p.date || (side === 'pickup' ? today : ''))}" ${side === 'pickup' ? 'required' : ''}></label>
    <label class="field"><span>${t('von')}</span><input class="input" type="time" name="${side}.from" value="${esc(p.from || '')}"></label>
    <label class="field"><span>${t('bis')}</span><input class="input" type="time" name="${side}.to" value="${esc(p.to || '')}"></label>
    <label class="field span2"><span>${t('Ansprechpartner')}</span><input class="input" name="${side}.contact" value="${esc(p.contact || '')}"></label>
    <label class="field span3"><span>${t('Telefon vor Ort')}</span><input class="input" type="tel" name="${side}.phone" value="${esc(p.phone || '')}"></label></div>`;
}

function deliveryFormSheet(app) {
  const f = app.ui.form || {};
  const drivers = (app.data.drivers || []).filter((u) => u.active);
  const vs = app.data.vehicles || [];
  const editing = !!f.id;
  return sheet({
    key: 'dform', wide: true, title: editing ? t('Lieferung bearbeiten') : f.copyOf ? t('Lieferung wiederholen') : t('Neue Lieferung'), sub: editing ? esc(f.bookingNo) : t('Pflicht sind nur Lade-, Entladeort und Ladedatum – der Rest hilft dem Fahrer.'),
    body: `<form id="dForm" data-form="delivery" class="stack" style="--gap:16px" autocomplete="off">
      <div class="section-t">${icon('arrow-up-from-line')} ${t('Ladestelle')}</div>${placeFields('pickup', f.pickup, app)}
      <div class="section-t">${icon('arrow-down-to-line')} ${t('Entladestelle')}</div>${placeFields('dropoff', f.dropoff, app)}
      <div class="section-t">${icon('package')} ${t('Ware')}</div>
      <div class="fgrid" style="--cols:6"><label class="field span3"><span>${t('Beschreibung')}</span><input class="input" name="goods.text" value="${esc(f.goods?.text || '')}" placeholder="${t('z. B. Ersatzteile, 18 Paletten')}"></label>
        <label class="field"><span>${t('Paletten')}</span><input class="input" type="number" min="0" max="99" name="goods.pallets" value="${esc(f.goods?.pallets ?? '')}"></label>
        <label class="field span2"><span>${t('Gewicht (kg)')}</span><input class="input" type="number" min="0" name="goods.weightKg" value="${esc(f.goods?.weightKg ?? '')}"></label>
        <label class="field span2"><span>${t('Temperatur')}</span><input class="input" name="goods.temp" value="${esc(f.goods?.temp || '')}" placeholder="+2…+8 °C"></label>
        <label class="check span2" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="goods.adr" ${f.goods?.adr ? 'checked' : ''}>${t('Gefahrgut (ADR)')}</label>
        <label class="check span2" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="urgent" ${f.urgent ? 'checked' : ''}>${t('Eilig')}</label></div>
      <div class="section-t">${icon('building-2')} ${t('Auftrag')}</div>
      <div class="fgrid"><label class="field"><span>${t('Auftraggeber')}</span><input class="input" name="customer" value="${esc(f.customer || '')}"></label><label class="field"><span>${t('Referenz des Kunden')}</span><input class="input" name="reference" value="${esc(f.reference || '')}"></label></div>
      <div class="section-t">${icon('users')} ${t('Fahrer & Fahrzeug')}</div>
      <div class="fgrid" style="--cols:3"><label class="field"><span>${t('Fahrer')}</span><select class="input" name="driverId"><option value="">${t('— offen für alle Fahrer —')}</option>${drivers.map((u) => `<option value="${esc(u.id)}" ${f.driverId === u.id ? 'selected' : ''}>${esc(u.name)}${u.vehiclePlate ? ' · ' + esc(u.vehiclePlate) : ''}</option>`).join('')}</select></label>
        <label class="field"><span>${t('LKW (optional)')}</span><select class="input" name="vehicleId"><option value="">${t('Fahrer wählt selbst')}</option>${vs.filter((v) => v.kind === 'truck').map((v) => `<option value="${esc(v.id)}" ${f.vehicleId === v.id ? 'selected' : ''}>${esc(v.plate)} · ${esc(v.name || vehicleTypeText(v.type))}</option>`).join('')}</select></label>
        <label class="field"><span>${t('Auflieger (optional)')}</span><select class="input" name="trailerId"><option value="">—</option>${vs.filter((v) => v.kind === 'trailer').map((v) => `<option value="${esc(v.id)}" ${f.trailerId === v.id ? 'selected' : ''}>${esc(v.plate)} · ${esc(vehicleTypeText(v.type))}</option>`).join('')}</select></label></div>
      <label class="field"><span>${t('Hinweise für den Fahrer')}</span><textarea class="input" name="instructions" rows="2" placeholder="${t('z. B. Gate B anmelden, Ladungssicherung, Rampe 12')}">${esc(f.instructions || '')}</textarea></label>
      <label class="field"><span>${t('Interne Notiz (sieht der Fahrer nicht)')}</span><textarea class="input" name="internalNote" rows="2">${esc(f.internalNote || '')}</textarea></label>
    </form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary btn-lg" type="submit" form="dForm">${icon('check')}${editing ? t('Speichern') : t('Lieferung anlegen')}</button>`,
  });
}

function driverFormSheet(app) {
  const f = app.ui.form || {};
  return sheet({
    key: 'drvform', title: f.id ? t('Fahrer bearbeiten') : t('Fahrer anlegen'), sub: f.id ? '' : t('Der Fahrer meldet sich mit Handynummer und PIN an.'),
    body: `<form id="drvForm" data-form="driver" class="fgrid">
      <label class="field full"><span>${t('Name')} *</span><input class="input" name="name" value="${esc(f.name || '')}" required autocomplete="off"></label>
      <label class="field"><span>${t('Handynummer')} *</span><input class="input" name="phone" type="tel" value="${esc(f.phone || '')}" required placeholder="0176 …"></label>
      <label class="field"><span>${t('Sprache der App')}</span><select class="input" name="lang">${Object.entries(LANG_NAMES).map(([k, v]) => `<option value="${k}" ${(f.lang || 'de') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>${t('Führerscheinklasse')}</span><input class="input" name="licenseClass" value="${esc(f.licenseClass || '')}" placeholder="CE"></label>
      <label class="field"><span>${t('Personalnummer')}</span><input class="input" name="personalNo" value="${esc(f.personalNo || '')}"></label>
      <label class="field full"><span>${t('Notiz')}</span><input class="input" name="note" value="${esc(f.note || '')}"></label></form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit" form="drvForm">${icon('check')}${f.id ? t('Speichern') : t('Anlegen & PIN erzeugen')}</button>`,
  });
}
function staffFormSheet(app) {
  return sheet({
    key: 'stform', title: t('Disponent anlegen'), sub: t('Bekommt einen eigenen Büro-Zugang mit E-Mail und Passwort.'),
    body: `<form id="stForm" data-form="staff" class="fgrid"><label class="field full"><span>${t('Name')} *</span><input class="input" name="name" required></label><label class="field full"><span>${t('E-Mail')} *</span><input class="input" type="email" name="email" required></label>
      <label class="field"><span>${t('Rolle')}</span><select class="input" name="role"><option value="dispatcher">${t('Disponent')}</option><option value="admin">${t('Admin')}</option></select></label><label class="field"><span>${t('Sprache')}</span><select class="input" name="lang">${['de', 'en', 'tr'].map((k) => `<option value="${k}">${LANG_NAMES[k]}</option>`).join('')}</select></label></form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit" form="stForm">${icon('check')}${t('Anlegen')}</button>`,
  });
}
function vehicleFormSheet(app) {
  const f = app.ui.form || { kind: 'truck', features: [] };
  const kind = f.kind || 'truck';
  return sheet({
    key: 'vform', title: f.id ? t('Fahrzeug bearbeiten') : t('Fahrzeug anlegen'),
    body: `<form id="vForm" data-form="vehicle" class="stack">
      ${f.id ? '' : `<div class="seg">${[['truck', t('LKW / Zugmaschine')], ['trailer', t('Auflieger / Anhänger')]].map(([k, l]) => `<button type="button" data-act="vformKind" data-k="${k}" aria-pressed="${kind === k}">${icon(k === 'truck' ? 'truck' : 'container')}${esc(l)}</button>`).join('')}</div>`}
      <div class="fgrid"><label class="field"><span>${t('Kennzeichen')} *</span><input class="input mono" name="plate" value="${esc(f.plate || '')}" required placeholder="S-KL 2041" style="text-transform:uppercase"></label>
        <label class="field"><span>${t('Art')}</span><select class="input" name="type">${VEHICLE_TYPES[kind].map((ty) => `<option value="${ty}" ${f.type === ty ? 'selected' : ''}>${esc(vehicleTypeText(ty))}</option>`).join('')}</select></label>
        <label class="field full"><span>${t('Bezeichnung')}</span><input class="input" name="name" value="${esc(f.name || '')}" placeholder="${kind === 'truck' ? 'MAN TGX 18.510' : 'Krone Profi Liner'}"></label>
        <label class="field"><span>${t('Nutzlast (kg)')}</span><input class="input" type="number" name="payloadKg" value="${esc(f.payloadKg ?? '')}"></label>
        <label class="field"><span>${t('Palettenstellplätze')}</span><input class="input" type="number" name="pallets" value="${esc(f.pallets ?? '')}"></label>
        <label class="field"><span>${t('Nächste HU')}</span><input class="input" type="date" name="huDue" value="${esc(f.huDue || '')}"></label>
        <label class="field"><span>${t('Nächste SP')}</span><input class="input" type="date" name="spDue" value="${esc(f.spDue || '')}"></label></div>
      <div class="field"><span>${t('Ausstattung')}</span><div class="chips">${VEHICLE_FEATURES.map((x) => `<label class="check chip"><input type="checkbox" name="features" value="${x}" ${(f.features || []).includes(x) ? 'checked' : ''}>${esc(featureText(x))}</label>`).join('')}</div></div>
      <label class="field"><span>${t('Notiz')}</span><input class="input" name="note" value="${esc(f.note || '')}"></label></form>`,
    foot: `${f.id ? `<button class="btn btn-danger btn-ghost" data-act="deleteVehicle" data-id="${esc(f.id)}">${icon('trash-2')}${t('Entfernen')}</button>` : ''}<span class="grow"></span><button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit" form="vForm">${icon('check')}${t('Speichern')}</button>`,
  });
}

function accessSheet(app) {
  const a = app.ui.access;
  const tn = app.tenant();
  if (a.role === 'driver') {
    const link = app.api.inviteLink(a.user.id);
    const msg = t('Hallo {name}, hier ist dein Zugang zur App „{app}“: {link} – PIN: {pin}. Link öffnen, PIN eingeben, fertig. Login sonst mit Firmencode {code} und deiner Handynummer.', { name: a.user.name.split(' ')[0], app: tn.branding?.appName || tn.name, link, pin: a.pin, code: tn.code });
    return sheet({
      key: 'access', title: t('Zugang für {name}', { name: esc(a.user.name) }), sub: t('Die PIN wird nur jetzt angezeigt.'),
      body: `<div class="row wrap" style="--gap:18px;align-items:flex-start"><div class="qr">${qrSvg(link)}</div><div class="stack grow" style="min-width:220px"><span class="eyebrow">PIN</span><div class="secret"><span class="grow" id="pin-val">${esc(a.pin.replace(/(\d{3})(\d{3})/, '$1 $2'))}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(a.pin)}">${icon('copy')}</button></div>
        <dl class="kv"><dt>${t('Firmencode')}</dt><dd class="mono">${esc(tn.code)}</dd><dt>${t('Login')}</dt><dd>${esc(a.user.phone)}</dd></dl><p class="small muted">${t('QR-Code mit der Handy-Kamera scannen – oder Einladung schicken:')}</p></div></div>
        <div class="card pad small" id="invite-text" style="background:var(--surface-2)">${esc(msg)}</div>`,
      foot: `<button class="btn" data-act="copy" data-from="#invite-text">${icon('copy')}${t('Text kopieren')}</button><a class="btn" href="https://wa.me/${esc((a.user.phone || '').replace(/[^\d]/g, ''))}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${icon('send')}WhatsApp</a><a class="btn" href="sms:${esc(a.user.phone)}?&body=${encodeURIComponent(msg)}">${icon('smartphone')}SMS</a><button class="btn btn-primary" data-act="close">${t('Fertig')}</button>`,
    });
  }
  return sheet({
    key: 'access', title: t('Zugang für {name}', { name: esc(a.user.name) }), sub: t('Das Startpasswort wird nur jetzt angezeigt. Beim ersten Login wird ein eigenes vergeben.'),
    body: `<dl class="kv"><dt>${t('E-Mail')}</dt><dd>${esc(a.user.email)}</dd></dl><div class="secret"><span class="grow">${esc(a.password)}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(a.password)}">${icon('copy')}</button></div>`,
    foot: `<button class="btn btn-primary" data-act="close">${t('Fertig')}</button>`,
  });
}

function notificationsSheet(app) {
  const ns = app.data.notes;
  return sheet({
    key: 'notifications', title: t('Mitteilungen'),
    body: !ns ? sk(200) : ns.length ? `<div class="list card">${ns.map((n) => `<button class="li ${n.read ? '' : 'unread'}" data-act="openNotification" data-id="${esc(n.deliveryId || '')}" data-key="n-${esc(n.id)}"><span class="avatar" style="${n.priority === 'high' ? 'background:var(--bad-bg);color:var(--bad)' : ''}">${icon(n.priority === 'high' ? 'triangle-alert' : n.type === 'delivered' ? 'file-check' : n.type === 'note' ? 'message-square-text' : 'bell')}</span><div class="grow"><div class="t1">${esc(n.title)}</div><div class="t2">${esc(n.body)}</div></div><span class="xs muted">${esc(ago(n.at, t))}</span></button>`).join('')}</div>` : emptyState('bell', t('Keine Mitteilungen')),
    foot: `<button class="btn" data-act="markRead">${icon('check')}${t('Alle gelesen')}</button>`,
  });
}

function proofSheet(app) {
  const d = app.data.delivery;
  if (!d) return sheet({ title: t('Laden …'), body: sk(300), wide: true });
  const tn = app.tenant();
  const pods = (d.docs || []).filter((x) => ['pod', 'cmr', 'damage'].includes(x.kind));
  return sheet({
    key: 'proof', wide: true, title: t('Abliefernachweis'), sub: esc(d.bookingNo), back: 'backToDelivery',
    body: `<div class="proof-doc"><div class="row between" style="align-items:flex-start"><div><h1>${t('Abliefernachweis')}</h1><p>${t('Buchung')} <b>${esc(d.bookingNo)}</b> · ${t('erstellt')} ${esc(dateTime(Date.now()))}</p></div>${logoImg(app, tn, 'tlogo" style="width:150px;height:60px')}</div>
      <table><tr><th>${t('Auftraggeber')}</th><td>${esc(d.customer || '–')}${d.reference ? ' · Ref. ' + esc(d.reference) : ''}</td></tr><tr><th>${t('Ladestelle')}</th><td>${esc([d.pickup.place, d.pickup.street, d.pickup.zip, d.pickup.city, d.pickup.country].filter(Boolean).join(', '))}</td></tr><tr><th>${t('Entladestelle')}</th><td>${esc([d.dropoff.place, d.dropoff.street, d.dropoff.zip, d.dropoff.city, d.dropoff.country].filter(Boolean).join(', '))}</td></tr>
        <tr><th>${t('Ware')}</th><td>${esc(d.goods?.text || '')}${d.goods?.pallets ? ' · ' + d.goods.pallets + ' Pal.' : ''}${d.goods?.weightKg ? ' · ' + esc(kg(d.goods.weightKg)) : ''}</td></tr><tr><th>${t('Fahrer / Fahrzeug')}</th><td>${esc(d.driverName || '–')} · ${esc(d.vehiclePlate || '')} ${esc(d.trailerPlate || '')}</td></tr><tr><th>${t('Status')}</th><td>${esc(tStatus(d.status))}${d.receiver ? ' · ' + t('Empfangen von') + ' ' + esc(d.receiver) : ''}</td></tr>${d.waitingMinutes != null ? `<tr><th>${t('Standzeit')}</th><td>${esc(minutes(d.waitingMinutes, t))}</td></tr>` : ''}${d.palletExchange ? `<tr><th>${t('Palettentausch')}</th><td>${t('{g} abgegeben · {t} mitgenommen', { g: d.palletExchange.given, t: d.palletExchange.taken })}</td></tr>` : ''}</table>
      <h3 style="margin-top:14px">${t('Zeitstempel')}</h3><table>${(d.events || []).filter((e) => !e.undone && ['accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded', 'delivered', 'problem'].includes(e.type)).map((e) => `<tr><td style="width:130px">${esc(dateTime(e.at))}</td><td>${esc(eventText(e))}${eventDetail(e) ? ' – ' + esc(eventDetail(e)) : ''}</td><td>${esc(e.byName || '')}</td></tr>`).join('')}</table>
      ${pods.length || d.signatureFileId ? `<h3 style="margin-top:14px">${t('Lieferschein & Fotos')}</h3><div class="imgs">${pods.map((x) => `<img src="${esc(app.fileUrl(x.fileId))}" alt="">`).join('')}${d.signatureFileId ? `<img src="${esc(app.fileUrl(d.signatureFileId))}" alt="" style="background:#fff;border:1px solid #ddd">` : ''}</div>` : ''}
      <p style="margin-top:14px;font-size:11px;color:#666">${t('Erstellt mit Ladeklar. Zeitstempel in deutscher Zeit (Europe/Berlin).')}</p></div>`,
    foot: app.api.mode === 'demo' ? `<span class="small muted">${t('In der echten App: Drucken oder als PDF speichern.')}</span>` : `<button class="btn btn-primary" data-act="print">${icon('printer')}${t('Drucken / PDF')}</button>`,
  });
}

// ---------- form helpers ----------
function nested(fd) {
  const out = {};
  for (const [k, v] of fd.entries()) {
    const parts = k.split('.');
    let o = out;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
    const last = parts[parts.length - 1];
    if (last === 'features') (o.features = o.features || []).push(v); else o[last] = v;
  }
  return out;
}
function fromDelivery(d, copy = false) {
  const today = isoToday();
  const base = { pickup: { ...d.pickup }, dropoff: { ...d.dropoff }, goods: { ...d.goods }, customer: d.customer, reference: copy ? '' : d.reference, instructions: d.instructions, internalNote: d.internalNote, urgent: d.urgent, driverId: copy ? d.driverId : d.driverId, vehicleId: d.vehicleId, trailerId: d.trailerId };
  if (copy) {
    const shift = d.dropoff?.date && d.pickup?.date ? Math.round((Date.parse(d.dropoff.date) - Date.parse(d.pickup.date)) / 864e5) : 0;
    base.pickup.date = today; base.dropoff.date = d.dropoff?.date ? addDays(today, shift) : '';
    base.copyOf = d.id; base.driverId = ''; base.vehicleId = ''; base.trailerId = '';
    return base;
  }
  return { ...base, id: d.id, bookingNo: d.bookingNo };
}
let suggestTimer = 0;

async function download(app, filename, text) {
  const dl = await (window.claude?.use?.('downloads') ?? Promise.resolve(null)).catch(() => null);
  if (!dl) return app.toast({ title: t('Export bereit'), body: t('In der echten App lädt der Browser die Datei direkt herunter.'), plain: true, icon: 'file-down' });
  try { await dl.save({ filename, data: text }); app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); }
  catch (e) { if (e?.code !== 'declined') app.toast({ title: t('Download ist hier nicht möglich.'), plain: true, err: true, icon: 'circle-alert' }); }
}

// ---------- actions ----------
export const actions = {
  openSheet: (el, ev, app) => app.open({ type: el.dataset.type, id: el.dataset.id || app.ui.sheet?.id || null }),
  openDelivery: (el, ev, app) => app.open({ type: 'delivery', id: el.dataset.id }),
  dtab: (el, ev, app) => { app.ui.dfilter = { ...(app.ui.dfilter || {}), tab: el.dataset.tab }; app.data.deliveries = null; if (app.route.name !== 'deliveries') app.go('deliveries'); else { app.render(); app.load(); } },
  vkind: (el, ev, app) => { app.ui.vkind = el.dataset.k; app.render(); },
  ssec: (el, ev, app) => { app.ui.ssec = el.dataset.k; if (el.dataset.k === 'reports') return app.go('reports'); app.render(); },
  newDelivery: (el, ev, app) => { app.ui.form = {}; app.ui.suggest = null; app.open({ type: 'deliveryForm' }); },
  editDelivery: (el, ev, app) => { app.ui.form = fromDelivery(app.data.delivery); app.open({ type: 'deliveryForm', id: el.dataset.id }); },
  duplicate: (el, ev, app) => { app.ui.form = fromDelivery(app.data.delivery, true); app.open({ type: 'deliveryForm' }); },
  proof: (el, ev, app) => app.open({ type: 'proof', id: el.dataset.id }),
  backToDelivery: (el, ev, app) => app.open({ type: 'delivery', id: app.ui.sheet.id }),
  print: () => window.print(),
  usePlace(el, ev, app) {
    const side = el.dataset.side, p = app.ui.suggest.list[Number(el.dataset.i)];
    const form = app.root.querySelector('#dForm');
    for (const k of ['place', 'street', 'zip', 'city', 'country', 'contact', 'phone']) { const inp = form.querySelector(`[name="${side}.${k}"]`); if (inp && p[k]) inp.value = p[k]; }
    app.ui.suggest = null; app.render();
  },
  async resolve(el, ev, app) { await app.call('resolveProblem', { id: el.dataset.id }).catch(() => null); app.refresh(0); },
  async officeStep(el, ev, app) {
    const step = el.dataset.step;
    if (step === 'delivered' && !(app.data.delivery.docs || []).some((x) => x.kind === 'pod') && S(app).requirePod) return app.toast({ title: t('Bitte zuerst den Lieferschein hinzufügen (Foto/PDF).'), plain: true, err: true, icon: 'camera' });
    const r = await app.call('advanceDelivery', { id: el.dataset.id, step }).catch(() => null);
    if (r) { app.toast({ title: t('Gesetzt: {s}', { s: tStatus(step) }), plain: true, icon: 'check' }); app.refresh(0); }
  },
  newDriver: (el, ev, app) => { app.ui.form = {}; app.open({ type: 'driverForm' }); },
  editDriver: (el, ev, app) => { app.ui.form = (app.data.drivers || []).find((u) => u.id === el.dataset.id); app.open({ type: 'driverForm', id: el.dataset.id }); },
  newStaff: (el, ev, app) => app.open({ type: 'staffForm' }),
  async resetPin(el, ev, app) {
    const r = await app.call('resetSecret', { id: el.dataset.id }).catch(() => null);
    if (r) { app.ui.access = { role: r.user.role, user: r.user, pin: r.pin, password: r.password }; app.open({ type: 'access' }); }
  },
  async toggleUser(el, ev, app) { const r = await app.call('setUserActive', { id: el.dataset.id, active: el.dataset.on === '1' }).catch(() => null); if (r) { app.toast({ title: r.active ? t('Entsperrt') : t('Gesperrt – die Sitzung ist beendet'), plain: true, icon: r.active ? 'refresh-cw' : 'lock' }); app.load(); } },
  newVehicle: (el, ev, app) => { app.ui.form = { kind: 'truck', features: [] }; app.open({ type: 'vehicleForm' }); },
  editVehicle: (el, ev, app) => { app.ui.form = { ...(app.data.vehicles || []).find((v) => v.id === el.dataset.id) }; app.open({ type: 'vehicleForm', id: el.dataset.id }); },
  vformKind: (el, ev, app) => { app.ui.form = { ...(app.ui.form || {}), kind: el.dataset.k, type: undefined }; app.render(); },
  async deleteVehicle(el, ev, app) { const r = await app.call('deleteVehicle', { id: el.dataset.id }).catch(() => null); if (r) { app.close(); app.load(); } },
  async releaseVehicle(el, ev, app) { await app.call('releaseVehicle', { id: el.dataset.id }).catch(() => null); app.load(); },
  async workshop(el, ev, app) { await app.call('updateVehicle', { id: el.dataset.id, status: el.dataset.on === '1' ? 'workshop' : 'ok' }).catch(() => null); app.load(); },
  pickColor: (el, ev, app) => { app.ui.previewColor = el.dataset.c; const inp = app.root.querySelector('input[name=color]'); if (inp) inp.value = el.dataset.c; app.render(); },
  async removeLogo(el, ev, app) { const r = await app.call('updateCompany', { branding: { logoFileId: null, iconFileId: null } }).catch(() => null); if (r) { app.me.tenant = r; app.render(); } },
  async support(el, ev, app) { const r = await app.call('grantSupportAccess', { hours: Number(el.dataset.h) }).catch(() => null); if (r) { app.me.tenant.supportAccessUntil = r.supportAccessUntil; app.render(); } },
  async rotateKey(el, ev, app) { const r = await app.call('rotateApiKey', {}).catch(() => null); if (r) { app.ui.apiKey = r.apiKey; app.me.tenant.apiKeySet = true; app.render(); } },
  async markRead(el, ev, app) { await app.call('markNotificationsRead', {}).catch(() => null); app.me.unread = 0; await refreshSheetData(app); app.render(); },
  openNotification: (el, ev, app) => { if (el.dataset.id) app.open({ type: 'delivery', id: el.dataset.id }); },
  async removeDoc(el, ev, app) { await app.call('removeDoc', { id: el.dataset.id, fileId: el.dataset.file }).catch(() => null); await refreshSheetData(app); app.render(); },
  async pushOn(el, ev, app) { try { const r = await app.api.push.enable(); app.toast({ title: r === 'granted' ? t('Mitteilungen sind an') : t('Mitteilungen wurden im Browser blockiert'), plain: true, icon: 'bell' }); app.render(); } catch (e) { app.error(e); } },
  async exportJson(el, ev, app) { const data = await app.call('exportData', {}).catch(() => null); if (data) download(app, `ladeklar-export-${isoToday()}.json`, JSON.stringify(data, null, 2)); },
  async exportCsv(el, ev, app) {
    const ds = await app.call('listDeliveries', { tab: 'all', limit: 1000 }).catch(() => null);
    if (!ds) return;
    const rows = [['Buchungsnummer', 'Status', 'Auftraggeber', 'Route', 'Ladedatum', 'Fahrer', 'Kennzeichen', 'Standzeit min'], ...ds.map((d) => [d.bookingNo, tStatus(d.status), d.customer || '', d.route, d.pickup.date, d.driverName || '', d.vehiclePlate || '', d.waitingMinutes ?? ''])];
    download(app, `lieferungen-${isoToday()}.csv`, '﻿' + rows.map((r) => r.map((x) => (/[;"\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : x)).join(';')).join('\r\n'));
  },
};

export const inputs = {
  driverFilter: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.dfilter = { ...(app.ui.dfilter || {}), driverId: el.value || undefined }; app.load(); },
  month: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.month = el.value; app.data.reports = null; app.render(); app.load(); },
  placeSuggest(el, ev, app) {
    if (ev.type !== 'input') return;
    clearTimeout(suggestTimer);
    const q = el.value.trim();
    if (q.length < 2) { if (app.ui.suggest) { app.ui.suggest = null; app.render(); } return; }
    suggestTimer = setTimeout(async () => {
      const list = await app.api.call('places', { q }).catch(() => []);
      app.ui.suggest = { side: el.dataset.side, field: el.name.split('.')[1], list };
      app.render();
    }, 160);
  },
  async setting(el, ev, app) {
    if (ev.type !== 'change') return;
    const r = await app.call('updateCompany', { settings: { [el.dataset.k]: el.checked } }).catch(() => null);
    if (r) { app.me.tenant = r; app.toast({ title: t('Gespeichert – gilt sofort für alle Fahrer'), plain: true, icon: 'check', ms: 2000 }); app.render(); }
  },
  colorPick: (el, ev, app) => { app.ui.previewColor = el.value; app.invalidate(); },
  async logoFile(el, ev, app) {
    if (ev.type !== 'change' || !el.files?.[0]) return;
    try {
      const { logo, icon: ic } = await processLogo(el.files[0], app.ui.previewColor || app.tenant().branding?.color);
      const fl = await app.api.upload(logo, { kind: 'logo', name: 'logo.png' });
      const fi = await app.api.upload(ic, { kind: 'icon', name: 'icon-512.png' });
      const r = await app.call('updateCompany', { branding: { logoFileId: fl.id, iconFileId: fi.id } });
      if (r) { app.me.tenant = r; app.toast({ title: t('Logo gespeichert – Ihre Fahrer sehen es sofort'), plain: true, icon: 'check' }); app.render(); }
    } catch (e) { app.error(e); }
    el.value = '';
  },
  async officeFile(el, ev, app) {
    if (ev.type !== 'change' || !el.files?.length) return;
    try { for (const f of el.files) { const blob = await compressPhoto(f, app.api.mode === 'demo' ? { max: 1100, quality: 0.6 } : {}); await app.api.upload(blob, { kind: 'pod', deliveryId: el.dataset.id, name: f.name }); } } catch (e) { app.error(e); }
    el.value = ''; await refreshSheetData(app); app.render();
  },
};

export const forms = {
  search(fd, form, app) { app.ui.dfilter = { tab: 'all', q: String(fd.get('q') || '').trim() }; app.data.deliveries = null; app.go('deliveries'); },
  async delivery(fd, form, app) {
    const v = nested(fd);
    const f = app.ui.form || {};
    const payload = { customer: v.customer, reference: v.reference, pickup: v.pickup, dropoff: v.dropoff, goods: { ...v.goods, adr: !!v.goods?.adr }, urgent: !!v.urgent, instructions: v.instructions, internalNote: v.internalNote, driverId: v.driverId || null, vehicleId: v.vehicleId || null, trailerId: v.trailerId || null };
    if (!payload.driverId) payload.openForAll = true;
    const r = await app.call(f.id ? 'updateDelivery' : 'createDelivery', f.id ? { id: f.id, ...payload } : payload);
    if (!r) return;
    app.ui.form = null;
    app.toast({ title: f.id ? t('Gespeichert · {no}', { no: r.bookingNo }) : t('Angelegt · {no}', { no: r.bookingNo }), body: r.driverName ? t('{n} wurde benachrichtigt.', { n: r.driverName }) : t('Alle Fahrer sehen den Auftrag.'), plain: true, icon: 'check' });
    app.open({ type: 'delivery', id: r.id });
    app.load();
  },
  async assign(fd, form, app) {
    const d = app.data.delivery;
    const payload = { id: d.id, vehicleId: fd.get('vehicleId') || null, trailerId: fd.get('trailerId') || null };
    if (form.querySelector('[name=driverId]:not([disabled])')) payload.driverId = fd.get('driverId') || null;
    if (form.querySelector('[name=openForAll]')) payload.openForAll = fd.get('openForAll') === 'on';
    const r = await app.call('updateDelivery', payload);
    if (r) { app.toast({ title: t('Zuweisung gespeichert'), plain: true, icon: 'check' }); app.data.delivery = await app.api.call('getDelivery', { id: d.id }); app.render(); app.load(); }
  },
  async note(fd, form, app) {
    const r = await app.call('addNote', { id: form.dataset.id, text: fd.get('text') });
    if (r) { form.reset(); app.data.delivery = await app.api.call('getDelivery', { id: form.dataset.id }); app.render(); }
  },
  async cancel(fd, form, app) {
    const id = app.ui.sheet.id;
    const r = await app.call('cancelDelivery', { id, reason: fd.get('reason') });
    if (r) { app.toast({ title: t('Storniert · {no}', { no: r.bookingNo }), plain: true, icon: 'ban' }); app.open({ type: 'delivery', id }); app.load(); }
  },
  async driver(fd, form, app) {
    const f = app.ui.form || {};
    const v = Object.fromEntries(fd.entries());
    const r = await app.call(f.id ? 'updateUser' : 'createUser', f.id ? { id: f.id, ...v } : { role: 'driver', ...v });
    if (!r) return;
    if (f.id) { app.close(); app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); }
    else { app.ui.access = { role: 'driver', user: r.user, pin: r.pin }; app.open({ type: 'access' }); }
    app.data.drivers = null; app.load();
  },
  async staff(fd, form, app) {
    const r = await app.call('createUser', Object.fromEntries(fd.entries()));
    if (r) { app.ui.access = { role: r.user.role, user: r.user, password: r.password }; app.open({ type: 'access' }); app.load(); }
  },
  async vehicle(fd, form, app) {
    const f = app.ui.form || {};
    const v = nested(fd);
    v.features = v.features || [];
    const r = await app.call(f.id ? 'updateVehicle' : 'createVehicle', f.id ? { id: f.id, ...v } : { kind: f.kind || 'truck', ...v });
    if (r) { app.close(); app.toast({ title: t('Fahrzeug gespeichert · {p}', { p: r.plate }), plain: true, icon: 'truck' }); app.data.vehicles = null; app.load(); }
  },
  async brand(fd, form, app) {
    const v = Object.fromEntries(fd.entries());
    const r = await app.call('updateCompany', { name: v.name, phone: v.phone, address: v.address, branding: { appName: v.appName, color: app.ui.previewColor || v.color } });
    if (r) { app.me.tenant = r; app.ui.previewColor = null; app.toast({ title: t('Gespeichert – Ihre Fahrer sehen die neue Marke sofort'), plain: true, icon: 'palette' }); app.render(); }
  },
  async flowExtra(fd, form, app) {
    const r = await app.call('updateCompany', { settings: { bookingPrefix: fd.get('bookingPrefix'), retentionYears: Number(fd.get('retentionYears')) } });
    if (r) { app.me.tenant = r; app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); app.render(); }
  },
  async password(fd, form, app) {
    const r = await app.call('changePassword', { current: fd.get('current'), next: fd.get('next') });
    if (r) { form.reset(); app.me.user.mustChangePassword = false; app.toast({ title: t('Passwort geändert'), plain: true, icon: 'key-round' }); app.render(); }
  },
};
