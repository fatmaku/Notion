// Company workspace (admin & dispatcher): live board, deliveries (present / future / past),
// drivers with PIN invites, the truck/trailer pool, reports, settings incl. own logo & colour.
import { icon, esc, pill, problemPill, plate, avatar, flag, stepper, routeTitle, goodsFacts, placeBlock, timeline, notesThread, docsGrid, sheet, emptyState, logoImg, licenseBanner, deliveryCompact, unassignedText, eventText, eventDetail, eventTone, EVENT_ICON, VEHICLE_ICON, vehicleTypeText, featureText, progressRatio } from './common.js';
import { t, tStatus, tStep, tProblem, LANG_NAMES } from '../i18n.js';
import { time, dateTime, dateTimeFull, dateFull, dayLabel, isoToday, addDays, lastMonths, monthLabel, ago, minutes, num, kg, euro, fileSize, phoneHref, window_, longDate, phone as fmtPhone } from '../format.js';
import { compressPhoto, processLogo, qrSvg } from '../media.js';
import { createZip, exportFileName } from '../../../core/zip.js';
import { toCsv } from '../../../core/csv.js';
import { statusText } from '../../../core/texts.js';
import { VEHICLE_TYPES, VEHICLE_FEATURES, PLANS, STORE_APP, monthlyPrice, routeLabel } from '../../../core/engine.js';

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
  // the driver filter on "Lieferungen" needs the drivers, too
  if (r === 'drivers' || (r === 'deliveries' && !app.data.drivers) || app.ui.sheet?.type === 'deliveryForm' || app.ui.sheet?.type === 'delivery') jobs.push(call('listUsers', { role: 'driver' }).then((x) => { app.data.drivers = x; }));
  if (r === 'vehicles' || app.ui.sheet?.type === 'deliveryForm' || app.ui.sheet?.type === 'delivery') jobs.push(call('listVehicles').then((x) => { app.data.vehicles = x; }));
  if (r === 'reports') jobs.push(call('reports', { month: app.ui.month || lastMonths(1)[0] }).then((x) => { app.data.reports = x; }));
  if (r === 'settings') {
    jobs.push(app.api.session().then((me) => { if (me) app.me = me; }));
    if (isAdmin(app)) {
      jobs.push(call('listUsers', { role: 'staff' }).then((x) => { app.data.staff = x; })); jobs.push(call('auditLog', { limit: 40 }).then((x) => { app.data.audit = x; }));
      if (section(app) === 'license') jobs.push(call('getTenantLicense').then((x) => { app.data.license = x; }));
    }
    if (section(app) === 'account') pushStatus(app);
  } else app.ui.apiKey = null; // a new API key is shown once only
  await Promise.all(jobs);
  await refreshSheetData(app);
  // C7: a password change ends all push subscriptions – renew silently while the browser still allows it
  if (app.me && app._pushFor !== app.me.user.id) { app._pushFor = app.me.user.id; app.api.push?.resubscribe?.().catch(() => {}); }
}
const section = (app) => app.ui.ssec || (isAdmin(app) ? 'brand' : 'account');
async function pushStatus(app) {
  const st = await app.api.push?.status?.().catch(() => 'off');
  if (st && st !== app.ui.pushState) { app.ui.pushState = st; app.invalidate(); }
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
    ${lic && list && active > lic.driverSeats ? overBanner(app, t('Mehr aktive Fahrer ({n}) als Ihr Tarif umfasst ({m}). Neue Fahrer gehen erst wieder, wenn Sie Fahrer sperren oder den Tarif wechseln.', { n: active, m: lic.driverSeats })) : ''}
    ${!list ? sk(260) : list.length ? `<div class="grid" style="--min:290px">${list.map((u, i) => `<article class="card pad stack" style="--gap:12px;animation:rise .45s ${i * 35}ms both;${u.active ? '' : 'opacity:.6'}" data-key="u-${esc(u.id)}">
      <div class="row">${avatar(u.name, 'lg')}<div class="grow"><h4 class="ellip">${esc(u.name)}</h4><div class="small muted">${esc(fmtPhone(u.phone))}</div></div>${flag(u.lang)}</div>
      <div class="row wrap" style="--gap:6px">${u.vehiclePlate ? plate(u.vehiclePlate) : `<span class="pill">${icon('truck')}${t('kein LKW')}</span>`}${u.trailerPlate ? plate(u.trailerPlate) : ''}${u.activeDeliveries ? `<span class="pill live info">${t('{n} Tour(en)', { n: u.activeDeliveries })}</span>` : ''}${u.licenseClass ? `<span class="pill">${icon('id-card')}${esc(u.licenseClass)}</span>` : ''}${u.active ? '' : `<span class="pill bad">${icon('lock')}${t('gesperrt')}</span>`}</div>
      <div class="row wrap" style="--gap:6px"><button class="btn btn-sm" data-act="resetPin" data-id="${esc(u.id)}">${icon('key-round')}${t('Neue PIN & Einladung')}</button><button class="btn btn-sm btn-ghost" data-act="editDriver" data-id="${esc(u.id)}">${icon('pencil')}${t('Bearbeiten')}</button><button class="btn btn-sm btn-ghost" data-act="toggleUser" data-id="${esc(u.id)}" data-on="${u.active ? '0' : '1'}">${icon(u.active ? 'lock' : 'refresh-cw')}${u.active ? t('Sperren') : t('Entsperren')}</button>${u.phone ? `<a class="btn btn-sm btn-ghost" href="${esc(phoneHref(u.phone))}" aria-label="${t('Anrufen')}">${icon('phone')}</a>` : ''}${isAdmin(app) ? `<button class="btn btn-sm btn-ghost" data-act="askDelete" data-id="${esc(u.id)}" aria-label="${t('Löschen')}" title="${t('Löschen')}">${icon('trash-2')}</button>` : ''}</div></article>`).join('')}</div>` : `<div class="card">${emptyState('users', t('Noch keine Fahrer'), t('Legen Sie den ersten Fahrer an – er bekommt eine PIN und einen Einladungslink.'), `<button class="btn btn-primary" data-act="newDriver">${icon('user-plus')}${t('Fahrer anlegen')}</button>`)}</div>`}`;
}

const overBanner = (app, text) => `<div class="banner bad">${icon('circle-alert')}<span class="grow">${esc(text)}</span>${isAdmin(app) ? `<button class="btn btn-sm" data-act="toLicense">${t('Tarif ansehen')}</button>` : ''}</div>`;

// ---------- vehicles ----------
function vehiclesPage(app) {
  const list = app.data.vehicles;
  const k = app.ui.vkind || 'all';
  const shown = (list || []).filter((v) => k === 'all' || v.kind === k);
  const max = app.me.license?.plan?.vehicles, count = (list || []).filter((v) => v.active !== false).length;
  return `<div class="page-h"><div><h1>${t('Fahrzeuge')}</h1><p class="lead">${t('Der Pool, aus dem Ihre Fahrer LKW und Auflieger wählen.')}</p></div><button class="btn btn-primary" data-act="newVehicle">${icon('plus')}${t('Fahrzeug anlegen')}</button></div>
    ${list && max != null && count > max ? overBanner(app, t('Mehr Fahrzeuge ({n}) als Ihr Tarif umfasst ({m}). Neue Fahrzeuge gehen erst wieder, wenn Sie welche entfernen oder den Tarif wechseln.', { n: count, m: max })) : ''}
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
  const months = lastMonths(24); // Berlin months, the current one first
  const m = app.ui.month || r?.month || months[0];
  const kpi = (cls, ic, v, l) => `<div class="kpi ${cls}" style="cursor:default"><span class="k-ic">${icon(ic)}</span><span class="k-v">${v}</span><span class="k-l">${l}</span></div>`;
  const wait = (n) => (n == null ? '–' : esc(minutes(n, t)));
  const custRows = (r?.byCustomer || []).map((x) => `<tr style="cursor:default"><td><b>${esc(x.customer || t('ohne Auftraggeber'))}</b></td><td class="num">${x.count}</td><td class="num">${wait(x.avgWaiting)}</td><td class="num">${x.problems}</td></tr>`).join('');
  const placeRows = (r?.byPlace || []).slice(0, 15).map((x) => `<tr style="cursor:default"><td><b>${esc(x.place || x.city)}</b>${x.place && x.city ? `<div class="xs muted">${esc(x.city)}</div>` : ''}</td><td>${x.side === 'pickup' ? `<span class="pill">${icon('arrow-up-from-line')}${t('Laden')}</span>` : `<span class="pill">${icon('arrow-down-to-line')}${t('Entladen')}</span>`}</td><td class="num">${x.count}</td><td class="num">${wait(x.avgWaiting)}${x.avgWaiting != null && x.measured < x.count ? `<div class="xs muted">${t('aus {n} Touren', { n: x.measured })}</div>` : ''}</td></tr>`).join('');
  return `<div class="page-h"><div><h1>${t('Berichte')}</h1><p class="lead">${t('Leistung, Pünktlichkeit, Standzeiten und Palettenkonto.')}</p></div><div class="row wrap">${r ? `<button class="btn" data-act="reportCsv">${icon('download')}CSV</button>` : ''}<select class="input" style="width:auto" data-input="month" aria-label="${t('Monat')}">${months.map((x) => `<option value="${x}" ${x === m ? 'selected' : ''}>${esc(monthLabel(x))}</option>`).join('')}</select></div></div>
    ${!r ? sk(220) : `<div class="kpis">${kpi('ok', 'circle-check-big', r.delivered, t('Zugestellt'))}${kpi('info', 'timer', r.onTimeRate == null ? '–' : r.onTimeRate + ' %', t('Pünktlich'))}${kpi('warn', 'hourglass', r.avgWaiting == null ? '–' : r.avgWaiting + ' min', t('Ø Standzeit je Tour'))}${kpi('', 'boxes', (r.palletsGiven - r.palletsTaken > 0 ? '−' : '') + Math.abs(r.palletsGiven - r.palletsTaken), t('Palettensaldo (offen)'))}</div>
      <section class="card"><div class="card-h"><h3>${t('Je Fahrer')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Fahrer')}</th><th class="num">${t('Zugestellt')}</th><th class="num">${t('Standzeit gesamt')}</th><th class="num">${t('Probleme')}</th></tr></thead><tbody>${r.byDriverHidden ? `<tr><td colspan="4" class="muted">${t('Auswertungen je Fahrer sind ausgeschaltet (Einstellungen → Abläufe).')}</td></tr>` : (r.byDriver || []).map((x) => `<tr style="cursor:default"><td><div class="row">${avatar(x.driverName)}<b>${esc(x.driverName)}</b></div></td><td class="num">${x.delivered}</td><td class="num">${esc(minutes(x.waiting, t))}</td><td class="num">${x.problems}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${t('Keine Daten in diesem Monat.')}</td></tr>`}</tbody></table></div></section>
      <section class="card"><div class="card-h"><h3>${t('Je Auftraggeber')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Auftraggeber')}</th><th class="num">${t('Zugestellt')}</th><th class="num">${t('Ø Standzeit je Tour')}</th><th class="num">${t('Probleme')}</th></tr></thead><tbody>${custRows || `<tr><td colspan="4" class="muted">${t('Keine Daten in diesem Monat.')}</td></tr>`}</tbody></table></div></section>
      <section class="card"><div class="card-h"><h3>${t('Je Lade- und Entladestelle')}</h3><span class="small muted">${t('längste Standzeit zuerst')}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Stelle')}</th><th>${t('Art')}</th><th class="num">${t('Touren')}</th><th class="num">${t('Ø Standzeit')}</th></tr></thead><tbody>${placeRows || `<tr><td colspan="4" class="muted">${t('Keine Daten in diesem Monat.')}</td></tr>`}</tbody></table></div></section>
      <div class="banner info">${icon('info')}<span class="grow">${t('Standzeiten entstehen aus den Tipps „Angekommen“ und „Aufgeladen/Abgeladen“ – die Grundlage für Standgeld-Rechnungen.')}</span></div>`}`;
}

// ---------- settings ----------
function settingsPage(app) {
  const tn = app.tenant();
  const sec = section(app);
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
      <label class="field"><span>${t('Lieferscheine aufbewahren (Jahre)')}</span><input class="input" type="number" min="1" max="10" step="1" name="retentionYears" value="${esc(s.retentionYears || 3)}" placeholder="${esc(s.retentionYears || 3)}"><span class="hint">${t('1 bis 10 Jahre. Danach werden abgeschlossene Lieferungen samt Fotos automatisch gelöscht. Leeres Feld = bisheriger Wert.')}</span></label>
      ${retentionConfirm(app)}
      <div class="full"><button class="btn btn-primary" type="submit">${icon('check')}${t('Speichern')}</button></div></form></section>`;
}
function retentionConfirm(app) {
  const c = app.ui.retention;
  if (!c) return '';
  return `<div class="banner bad full">${icon('triangle-alert')}<span class="grow">${c.years === 1 ? t('Aufbewahrung auf 1 Jahr senken?') : t('Aufbewahrung auf {n} Jahre senken?', { n: c.years })} ${c.count ? t('{k} abgeschlossene Lieferungen samt Lieferscheinen und Fotos werden innerhalb einer Stunde endgültig gelöscht.', { k: c.count }) : t('Ältere abgeschlossene Lieferungen werden ab dann automatisch gelöscht.')}</span>
    <button class="btn btn-sm" type="button" data-act="retentionCancel">${t('Abbrechen')}</button><button class="btn btn-sm btn-danger" type="button" data-act="retentionOk">${t('Ja, senken')}</button></div>`;
}
function teamSection(app) {
  const list = app.data.staff;
  const max = app.me.license?.plan?.staff == null ? null : app.me.license.plan.staff + 1, count = (list || []).filter((u) => u.active).length;
  return `${list && max != null && count > max ? overBanner(app, t('Mehr aktive Büro-Zugänge ({n}) als Ihr Tarif umfasst ({m}). Neue Zugänge gehen erst wieder, wenn Sie welche sperren oder den Tarif wechseln.', { n: count, m: max })) : ''}<section class="card"><div class="card-h"><h3>${t('Büro-Zugänge')}</h3><button class="btn btn-primary btn-sm" data-act="newStaff">${icon('user-plus')}${t('Disponent anlegen')}</button></div>
    <div class="list" style="margin-top:8px">${!list ? sk(100) : list.map((u) => `<div class="li" style="cursor:default">${avatar(u.name)}<div class="grow"><div class="t1">${esc(u.name)} ${u.id === app.me.user.id ? `<span class="pill">${t('Sie')}</span>` : ''}</div><div class="t2">${esc(u.email)} · ${u.role === 'admin' ? t('Admin') : t('Disponent')}${u.active ? '' : ' · ' + t('gesperrt')}</div></div><button class="btn btn-sm btn-ghost" data-act="editStaff" data-id="${esc(u.id)}" aria-label="${t('Bearbeiten')}" title="${t('Bearbeiten')}">${icon('pencil')}</button>${u.id !== app.me.user.id ? `<button class="btn btn-sm btn-ghost" data-act="resetPin" data-id="${esc(u.id)}">${icon('key-round')}${t('Neues Passwort')}</button><button class="btn btn-sm btn-ghost" data-act="toggleUser" data-id="${esc(u.id)}" data-on="${u.active ? '0' : '1'}" aria-label="${u.active ? t('Sperren') : t('Entsperren')}" title="${u.active ? t('Sperren') : t('Entsperren')}">${icon(u.active ? 'lock' : 'refresh-cw')}</button><button class="btn btn-sm btn-ghost" data-act="askDelete" data-id="${esc(u.id)}" aria-label="${t('Löschen')}" title="${t('Löschen')}">${icon('trash-2')}</button>` : ''}</div>`).join('')}</div></section>`;
}
function licenseSection(app) {
  const l = app.me.license, tn = app.tenant(), x = app.data.license || {};
  const plan = l.plan, p = PLANS[plan.id] || plan;
  const extra = p.extraDriver ? Math.max(0, x.extraDrivers ?? tn.extraDrivers ?? 0) : 0, store = !!(x.storeApp ?? tn.storeApp);
  const monthly = x.monthly ?? monthlyPrice({ plan: plan.id, extraDrivers: extra, storeApp: store });
  const yearly = (x.billing || tn.billing) === 'yearly';
  const items = [t('Grundpreis {p}', { p: euro(p.price) }), extra ? t('{n} zusätzliche Fahrer à {p}', { n: extra, p: euro(p.extraDriver) }) : '', store ? t('Store-App {p}', { p: euro(STORE_APP.monthly) }) : ''].filter(Boolean);
  const stateText = { trial: t('Testphase'), active: t('Aktiv'), suspended: t('Gesperrt'), expired: t('Abgelaufen'), cancelled: t('Gekündigt') }[l.state];
  // C9: storage of the plan
  const used = l.storageUsed ?? x.storageUsed, limit = l.storageLimit ?? x.storageLimit;
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  const storage = limit ? `<dt>${t('Speicher')}</dt><dd><div>${t('{u} von {l} belegt ({p} %)', { u: fileSize(used), l: fileSize(limit), p: pct })}</div><div class="bar ${pct >= 100 ? 'bad' : pct >= 80 ? 'warn' : ''}" style="margin-top:6px;--p:${Math.min(1, used / limit)}"><i></i></div>${pct >= 100 ? `<div class="small" style="color:var(--bad);margin-top:6px">${t('Der Speicher Ihres Tarifs ist voll. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.')}</div>` : pct >= 80 ? `<div class="small" style="color:var(--warn);margin-top:6px">${t('Der Speicher ist fast voll. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.')}</div>` : ''}</dd>` : '';
  // C15: seats in use against the plan (over the limit after a downgrade)
  const u = x.usage, lim = x.limits;
  const seat = (label, n, m) => (n == null ? '' : `<dt>${label}</dt><dd>${m == null ? t('{n} (unbegrenzt)', { n }) : t('{n} von {m}', { n, m })}${m != null && n > m ? ` <span class="pill bad">${t('über dem Tarif')}</span>` : ''}</dd>`);
  return `<section class="card pad stack"><div class="row between wrap"><div><span class="eyebrow">${t('Ihr Tarif')}</span><h2>Ladeklar ${esc(plan.name)}</h2></div><span class="pill ${l.state === 'active' ? 'ok' : l.state === 'trial' ? 'info' : 'bad'}">${esc(stateText)}</span></div>
    <dl class="kv"><dt>${t('Preis')}</dt><dd><b>${esc(euro(monthly))} ${t('netto / Monat')}</b><div class="small muted">${esc(items.join(' · '))}</div>${yearly ? `<div class="small">${t('Jährlich im Voraus: {p} netto (10 × Monatspreis)', { p: esc(euro(monthly * 10)) })}</div>` : ''}</dd>
      <dt>${t('Zahlweise')}</dt><dd>${yearly ? t('jährlich') : t('monatlich')}</dd>
      ${u && lim ? seat(t('Fahrer'), u.drivers, lim.drivers) + seat(t('Fahrzeuge'), u.vehicles, lim.vehicles) + seat(t('Büro-Zugänge'), u.staff, lim.staff) : `<dt>${t('Fahrer-Plätze')}</dt><dd>${l.driverSeats}</dd><dt>${t('Fahrzeuge')}</dt><dd>${plan.vehicles ?? t('unbegrenzt')}</dd>`}
      ${storage}
      ${l.trialEnd ? `<dt>${t('Test bis')}</dt><dd>${esc(dateFull(l.trialEnd))}</dd>` : ''}${l.licenseEnd ? `<dt>${t('Laufzeit bis')}</dt><dd>${esc(dateFull(l.licenseEnd))}</dd>` : ''}</dl>
    ${licenseRequests(app, tn, x, plan)}</section>
    <div class="plans">${Object.values(PLANS).map((q) => `<div class="plan ${q.id === plan.id ? 'hl' : ''}"><span class="eyebrow">${esc(q.name)}</span><div class="price">${q.price} €<small> / ${t('Monat')}</small></div><ul><li>${icon('check')}${t('{n} Fahrer inklusive', { n: q.drivers })}</li><li>${icon('check')}${q.vehicles ? t('{n} Fahrzeuge', { n: q.vehicles }) : t('Fahrzeuge unbegrenzt')}</li><li>${icon('check')}${t('{n} GB Speicher', { n: q.storageGB })}</li><li>${icon('check')}${t('Eigenes Logo & Farben')}</li>${q.api ? `<li>${icon('check')}${t('REST-API, eigene Domain')}</li>` : ''}</ul></div>`).join('')}</div>`;
}
/** C16: plan change and cancellation are requests to the licensor; pending ones are shown. */
function licenseRequests(app, tn, x, plan) {
  const l = app.me.license;
  const pr = x.planRequest ?? tn.planRequest, cr = x.cancelRequestedAt ?? tn.cancelRequestedAt;
  const pending = `${pr ? `<div class="banner info">${icon('send')}<span class="grow">${t('Tarifwunsch „{p}“ gesendet am {d}. Ihr Anbieter meldet sich.', { p: esc(PLANS[pr.plan]?.name || pr.plan), d: esc(dateFull(pr.at)) })}</span></div>` : ''}${cr ? `<div class="banner">${icon('send')}<span class="grow">${t('Kündigung gesendet am {d}. Ihr Anbieter bestätigt das Vertragsende. Bis dahin läuft alles weiter.', { d: esc(dateFull(cr)) })}</span></div>` : ''}`;
  if (l.state === 'cancelled') return pending;
  const mode = app.ui.licReq;
  if (mode === 'plan') {
    const pick = PLANS[app.ui.planPick] ? app.ui.planPick : Object.keys(PLANS).find((k) => k !== plan.id);
    const u = x.usage, q = PLANS[pick];
    const over = u && q ? [[t('Fahrer'), u.drivers, q.drivers], [t('Fahrzeuge'), u.vehicles, q.vehicles], [t('Büro-Zugänge'), u.staff, q.staff == null ? null : q.staff + 1]].filter(([, n, m]) => m != null && n > m) : [];
    return `${pending}<form data-form="planRequest" class="stack" style="--gap:10px"><label class="field"><span>${t('Gewünschter Tarif')}</span><select class="input" name="plan" data-input="planPick">${Object.values(PLANS).filter((k) => k.id !== plan.id).map((k) => `<option value="${k.id}" ${k.id === pick ? 'selected' : ''}>${esc(k.name)} · ${esc(euro(k.price))} ${t('netto / Monat')}</option>`).join('')}</select></label>
      ${over.length ? `<div class="banner bad">${icon('circle-alert')}<span class="grow">${t('Für diesen Tarif sind es zu viele: {list}. Vor dem Wechsel bitte sperren oder entfernen.', { list: esc(over.map(([lb, n, m]) => `${lb} ${n}/${m}`).join(', ')) })}</span></div>` : ''}
      <label class="field"><span>${t('Nachricht an Ihren Anbieter (optional)')}</span><textarea class="input" name="note" rows="2" maxlength="500"></textarea></label>
      <div class="row wrap"><button class="btn" type="button" data-act="licReq" data-k="">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit">${icon('send')}${t('Anfrage senden')}</button></div></form>`;
  }
  if (mode === 'cancel') {
    return `${pending}<form data-form="cancelRequest" class="stack" style="--gap:10px"><label class="field"><span>${t('Grund der Kündigung (optional)')}</span><textarea class="input" name="reason" rows="2" maxlength="500">${esc(app.ui.cancelReason || '')}</textarea></label>
      <div class="row wrap"><button class="btn" type="button" data-act="licReq" data-k="">${t('Abbrechen')}</button><button class="btn btn-danger" type="submit">${t('Weiter')}</button></div></form>`;
  }
  if (mode === 'cancelConfirm') {
    return `${pending}<div class="banner bad">${icon('triangle-alert')}<span class="grow">${t('Vertrag wirklich kündigen? Ihr Anbieter bestätigt die Kündigung und das Vertragsende. Danach können Sie Ihre Daten noch ansehen und exportieren, aber nichts mehr ändern.')}</span></div>
      <div class="row wrap"><button class="btn" data-act="licReq" data-k="">${t('Abbrechen')}</button><button class="btn btn-danger" data-act="cancelSend">${icon('send')}${t('Kündigung senden')}</button></div>`;
  }
  return `${pending}<div class="row wrap"><button class="btn" data-act="licReq" data-k="plan">${icon('layers')}${t('Tarif wechseln anfragen')}</button>${cr ? '' : `<button class="btn btn-ghost btn-danger" data-act="licReq" data-k="cancel">${icon('ban')}${t('Kündigen')}</button>`}</div>
    <p class="small muted">${t('Für weitere Fahrer-Plätze genügt eine kurze Nachricht an Ihren Anbieter.')}</p>`;
}
function dataSection(app, tn) {
  const sup = tn.supportAccessUntil && tn.supportAccessUntil > Date.now();
  const audit = app.data.audit || [];
  return `<section class="card pad stack"><h3>${icon('download')} ${t('Datenexport')}</h3><p class="small muted">${t('Alle Daten Ihres Unternehmens jederzeit mitnehmen – auch beim Anbieterwechsel (EU Data Act).')}</p>
    <div class="row wrap">${app.api.mode === 'demo' ? `<button class="btn btn-primary" data-act="exportZip">${icon('archive')}${t('Alles als ZIP (mit Lieferscheinen)')}</button><button class="btn" data-act="exportJson">${icon('file-down')}${t('Alles als JSON')}</button><button class="btn" data-act="exportCsv">${icon('file-down')}${t('Lieferungen als CSV')}</button>` : `<a class="btn btn-primary" href="${esc(app.api.exportUrl('zip'))}" download>${icon('archive')}${t('Alles als ZIP (mit Lieferscheinen)')}</a><a class="btn" href="${esc(app.api.exportUrl('json'))}" download>${icon('file-down')}${t('Alles als JSON')}</a><a class="btn" href="${esc(app.api.exportUrl('csv'))}" download>${icon('file-down')}${t('Lieferungen als CSV')}</a>`}</div>
    <p class="xs muted">${t('Das ZIP enthält alle Daten als JSON und CSV sowie jedes Foto, jeden Lieferschein, jede Unterschrift und Ihr Logo als Datei.')}</p></section>
    <section class="card pad stack"><h3>${icon('shield-check')} ${t('Support-Zugriff')}</h3><p class="small muted">${t('Der Anbieter sieht Ihre Lieferdaten nicht. Nur wenn Sie Hilfe brauchen, können Sie hier einen befristeten Zugriff freigeben – er wird protokolliert.')}</p>
      <div class="row wrap">${sup ? `<span class="pill warn">${icon('clock')}${t('freigegeben bis {d}', { d: esc(dateTime(tn.supportAccessUntil)) })}</span><button class="btn btn-sm" data-act="support" data-h="0">${t('Jetzt beenden')}</button>` : `<button class="btn btn-sm" data-act="support" data-h="24">${icon('handshake')}${t('Für 24 Stunden freigeben')}</button>`}</div></section>
    <section class="card"><div class="card-h"><h3>${icon('history')} ${t('Protokoll')}</h3></div><div class="list" style="margin-top:6px">${audit.slice(0, 25).map((e) => `<div class="li" style="cursor:default"><span class="xs muted mono" style="width:92px">${esc(dateTime(e.at))}</span><div class="grow"><div class="t1 small">${esc(e.action)}</div><div class="t2">${esc(e.actorName || '')}</div></div></div>`).join('') || `<p class="small muted" style="padding:12px 18px">${t('Noch keine Einträge.')}</p>`}</div></section>`;
}
function apiSection(app, tn) {
  const prem = app.me.license?.plan?.api;
  const key = app.ui.apiKey;
  return `<section class="card pad stack"><h3>${icon('link')} REST-API</h3><p class="small muted">${t('Lieferungen automatisch aus Ihrem TMS oder Ihrer Buchhaltung anlegen und abfragen.')}</p>
    ${prem ? `${key ? `<div class="secret"><span class="grow">${esc(key)}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(key)}">${icon('copy')}</button></div><p class="small" style="color:var(--warn)">${t('Der Schlüssel wird nur jetzt angezeigt.')}</p>` : tn.apiKeySet ? `<div class="secret"><span class="grow mono">lk_…${esc(tn.apiKeyHint || '')}</span></div><p class="small muted">${t('Ein Schlüssel ist aktiv. Gespeichert sind nur die letzten 4 Zeichen – den ganzen Schlüssel kann niemand mehr anzeigen. Verloren? Einfach einen neuen erzeugen, der alte gilt dann nicht mehr.')}</p>` : `<p class="small">${t('Noch kein Schlüssel.')}</p>`}<div><button class="btn" data-act="rotateKey">${icon('key-round')}${tn.apiKeySet ? t('Neuen Schlüssel erzeugen') : t('Schlüssel erzeugen')}</button></div>
      <pre class="card pad xs mono" style="overflow:auto;margin:0;white-space:pre">curl -H "Authorization: Bearer lk_…" ${esc(location.origin)}/api/v1/deliveries
curl -X POST -H "Authorization: Bearer lk_…" -H "Content-Type: application/json" \\
  -d '{"pickup":{"city":"Stuttgart","date":"${isoToday()}"},"dropoff":{"city":"Hamburg"}}' ${esc(location.origin)}/api/v1/deliveries</pre>` : `<div class="banner info">${icon('crown')}<span class="grow">${t('Die API ist im Tarif Premium enthalten.')}</span></div>`}</section>`;
}
function accountSection(app) {
  const push = app.api.push, ps = app.ui.pushState;
  return `<section class="card pad stack"><h3>${t('Mein Konto')}</h3><dl class="kv"><dt>${t('Name')}</dt><dd>${esc(app.me.user.name)}</dd><dt>${t('E-Mail')}</dt><dd>${esc(app.me.user.email || '')}</dd><dt>${t('Rolle')}</dt><dd>${isAdmin(app) ? t('Admin') : t('Disponent')}</dd></dl>
    <div class="field"><span>${t('Sprache')}</span><div class="seg wrap">${Object.entries(LANG_NAMES).map(([l, name]) => `<button data-act="lang" data-lang="${l}" aria-pressed="${app.lang === l}">${esc(name)}</button>`).join('')}</div></div></section>
    ${app.me.user.mustChangePassword ? `<div class="banner">${icon('key-round')}<span class="grow">${t('Bitte vergeben Sie jetzt ein eigenes Passwort.')}</span></div>` : ''}
    <section class="card pad"><form data-form="password" class="fgrid"><label class="field"><span>${t('Aktuelles Passwort')}</span><input class="input" type="password" name="current" autocomplete="current-password" required></label><label class="field"><span>${t('Neues Passwort (mind. 10 Zeichen)')}</span><input class="input" type="password" name="next" minlength="10" autocomplete="new-password" required></label><div class="full"><button class="btn btn-primary" type="submit">${icon('key-round')}${t('Passwort ändern')}</button></div></form></section>
    ${twoFactorSection(app)}
    ${push && push.supported() ? `<section class="card pad stack"><h3>${icon('bell-ring')} ${t('Mitteilungen')}</h3>
      <label class="switch"><input type="checkbox" data-input="pushToggle" ${ps === 'on' ? 'checked' : ''} ${ps === 'blocked' ? 'disabled' : ''}><span class="grow"><b>${t('Push-Mitteilungen in diesem Browser')}</b><small>${ps === 'blocked' ? t('Mitteilungen wurden im Browser blockiert') : t('Bestätigungen, Störungen und Notizen der Fahrer kommen als Push-Mitteilung – auch wenn der Browser geschlossen ist.')}</small></span></label></section>` : ''}
    <button class="btn btn-danger" data-act="logout" style="align-self:flex-start">${icon('log-out')}${t('Abmelden')}</button>`;
}
/** C13: two-factor login with an authenticator app (TOTP). */
function twoFactorSection(app) {
  const on = !!(app.me.user.twoFactor ?? app.me.twoFactor), su = app.ui.tfa;
  const head = `<div class="row between wrap"><h3>${icon('shield-check')} ${t('Zwei-Faktor-Anmeldung')}</h3><span class="pill ${on ? 'ok' : ''}">${on ? t('an') : t('aus')}</span></div>`;
  if (on) return `<section class="card pad stack">${head}<p class="small muted">${t('Beim Anmelden fragt die App zusätzlich nach dem 6-stelligen Code aus Ihrer Authenticator-App.')}</p>
    <form data-form="tfaOff" class="fgrid"><label class="field"><span>${t('Zum Ausschalten: aktuelles Passwort')}</span><input class="input" type="password" name="password" autocomplete="current-password" required></label><div class="full"><button class="btn" type="submit">${t('Ausschalten')}</button></div></form></section>`;
  if (su) return `<section class="card pad stack">${head}<div class="row wrap" style="--gap:18px;align-items:flex-start"><div class="qr">${qrSvg(su.otpauthUrl)}</div>
    <div class="stack grow" style="min-width:220px"><p class="small">${t('1. QR-Code mit einer Authenticator-App scannen (z. B. Google oder Microsoft Authenticator). Auf diesem Handy: Link antippen.')}</p><a class="btn btn-sm" href="${esc(su.otpauthUrl)}" style="align-self:flex-start">${icon('smartphone')}${t('In der Authenticator-App öffnen')}</a>
      <p class="small muted">${t('Oder den Schlüssel von Hand eingeben:')}</p><div class="secret small"><span class="grow mono" id="tfa-secret">${esc(su.secret.replace(/(.{4})(?=.)/g, '$1 '))}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(su.secret)}" aria-label="${t('Kopieren')}">${icon('copy')}</button></div>
      <form data-form="tfaOn" class="stack" style="--gap:8px"><label class="field"><span>${t('2. Den 6-stelligen Code aus der App eingeben')}</span><input class="input mono" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required></label>
        <div class="row wrap"><button class="btn" type="button" data-act="tfaCancel">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit">${icon('shield-check')}${t('Einschalten')}</button></div></form></div></div></section>`;
  return `<section class="card pad stack">${head}<p class="small muted">${t('Schützt Ihr Büro-Konto zusätzlich mit einem Code vom Handy – auch wenn jemand Ihr Passwort kennt.')}</p><div><button class="btn" data-act="tfaSetup">${icon('shield-check')}${t('Einrichten')}</button></div></section>`;
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
  if (s.type === 'deleteUser') return deleteUserSheet(app);
  if (s.type === 'cancel') return sheet({ key: 'cancel', title: t('Lieferung stornieren'), body: `<form id="cancelForm" data-form="cancel"><label class="field"><span>${t('Grund (geht an den Fahrer)')}</span><textarea class="input" name="reason" placeholder="${t('z. B. Kunde hat verschoben')}"></textarea></label></form>`, foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-danger" type="submit" form="cancelForm">${icon('ban')}${t('Stornieren')}</button>` });
  return '';
}

function deliverySheet(app) {
  const d = app.data.delivery;
  if (!d || d.id !== app.ui.sheet.id) return sheet({ title: t('Laden …'), body: sk(300), wide: true });
  const vs = app.data.vehicles || [];
  const done = ['delivered', 'cancelled'].includes(d.status);
  const lockedDriver = ['loaded', 'arrived_dropoff', 'unloaded', 'delivered', 'cancelled'].includes(d.status);
  const assign = done ? '' : `<form data-form="assign" class="stack" style="--gap:10px"><div class="fgrid" style="--cols:3">
      <label class="field"><span>${t('Fahrer')}</span><select class="input" name="driverId" ${lockedDriver ? 'disabled' : ''}><option value="">${S(app).driverTakesOpen ? t('— offen —') : t('— wartet auf Zuweisung —')}</option>${driverOptions(app, d.driverId, d.driverName)}</select></label>
      <label class="field"><span>${t('LKW')}</span><select class="input" name="vehicleId"><option value="">—</option>${vehicleOptions(vs, 'truck', d.vehicleId, d.vehiclePlate, (v) => v.plate)}</select></label>
      <label class="field"><span>${t('Auflieger')}</span><select class="input" name="trailerId"><option value="">—</option>${vehicleOptions(vs, 'trailer', d.trailerId, d.trailerPlate, (v) => v.plate)}</select></label></div>
      ${!d.driverId && d.status === 'open' && S(app).driverTakesOpen ? `<label class="check"><input type="checkbox" name="openForAll" ${d.openForAll ? 'checked' : ''}>${t('Offen für alle Fahrer (jeder kann übernehmen)')}</label>` : ''}
      <div><button class="btn btn-sm" type="submit">${icon('check')}${t('Zuweisung speichern')}</button></div></form>`;
  const officeStep = d.next && d.status !== 'open' && !done ? `<button class="btn" data-act="officeStep" data-id="${esc(d.id)}" data-step="${d.next}" title="${t('Wenn der Fahrer telefonisch meldet')}">${icon('circle-check-big')}${t('Für Fahrer setzen: {s}', { s: tStep(d.next) })}</button>` : '';
  return sheet({
    key: 'delivery', wide: true, title: routeTitle(d), sub: `<span class="mono">${esc(d.bookingNo)}</span>${d.customer ? ' · ' + esc(d.customer) : ''}${d.reference ? ' · Ref. ' + esc(d.reference) : ''}`,
    body: `<div class="row wrap">${pill(d.status)}${problemPill(d.problem)}${d.urgent ? `<span class="pill bad">${icon('zap')}${t('Eilig')}</span>` : ''}${d.driverName ? `<span class="pill">${icon('circle-user')}${esc(d.driverName)}</span>` : d.status === 'open' ? `<span class="pill warn">${icon('users')}${esc(unassignedText(d, app))}</span>` : ''}${plate(d.vehiclePlate)}${plate(d.trailerPlate)}${d.waitingMinutes != null ? `<span class="pill">${icon('hourglass')}${t('Standzeit')} ${esc(minutes(d.waitingMinutes, t))}</span>` : ''}</div>
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
        <div class="stack" style="--gap:14px"><div class="row between wrap"><div class="section-t">${t('Lieferschein & Fotos')}</div>${d.status === 'cancelled' ? '' : `<select class="input doc-kind" data-input="docKind" aria-label="${t('Dokumentart beim Hinzufügen')}">${DOC_KINDS().map(([k, l]) => `<option value="${k}" ${(app.ui.docKind || 'pod') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`}</div>${docsGrid(app, d, { removable: !done, add: d.status === 'cancelled' ? '' : `<label class="doc add">${icon('upload')}<span>${t('Hinzufügen')}</span><input class="sr" type="file" accept="image/*,application/pdf" multiple data-input="officeFile" data-id="${esc(d.id)}"></label>` })}
          <div class="section-t">${t('Notizen mit dem Fahrer')}</div>${notesThread(app, d)}
          <form data-form="note" data-id="${esc(d.id)}" class="row" style="--gap:8px"><input class="input" name="text" placeholder="${t('Nachricht an den Fahrer …')}" required><button class="btn btn-primary" type="submit" aria-label="${t('Senden')}">${icon('send')}</button></form>
          <div class="section-t">${t('Verlauf')}</div>${timeline(d)}</div></div>`,
    foot: `${!done ? `<button class="btn btn-danger btn-ghost" data-act="openSheet" data-type="cancel" data-id="${esc(d.id)}">${icon('ban')}${t('Stornieren')}</button>` : ''}<span class="grow"></span>${officeStep}<button class="btn" data-act="proof" data-id="${esc(d.id)}">${icon('receipt-text')}${t('Abliefernachweis')}</button><button class="btn" data-act="duplicate" data-id="${esc(d.id)}">${icon('copy')}${t('Wiederholen')}</button><button class="btn btn-primary" data-act="editDelivery" data-id="${esc(d.id)}">${icon('pencil')}${done ? t('Nachbearbeiten') : t('Bearbeiten')}</button>`,
  });
}

const DOC_KINDS = () => [['pod', t('Lieferschein')], ['cmr', 'CMR'], ['damage', t('Schaden')], ['load', t('Ladung')], ['other', t('Foto')]];
/** Active drivers; the current one stays visible (and is not sent again) even when locked or deleted. */
function driverOptions(app, id, name, withPlate = false) {
  const drivers = (app.data.drivers || []).filter((u) => u.active);
  const cur = id && !drivers.some((u) => u.id === id) ? `<option value="${esc(id)}" selected disabled>${esc(name || t('Fahrer'))} · ${t('gesperrt')}</option>` : '';
  return cur + drivers.map((u) => `<option value="${esc(u.id)}" ${id === u.id ? 'selected' : ''}>${esc(u.name)}${withPlate && u.vehiclePlate ? ' · ' + esc(u.vehiclePlate) : ''}</option>`).join('');
}
function vehicleOptions(vs, kind, id, plateText, label) {
  const list = vs.filter((v) => v.kind === kind);
  const cur = id && !list.some((v) => v.id === id) ? `<option value="${esc(id)}" selected disabled>${esc(plateText || '?')}</option>` : '';
  return cur + list.map((v) => `<option value="${esc(v.id)}" ${id === v.id ? 'selected' : ''}>${esc(label(v))}</option>`).join('');
}
/** A select left as it was (or disabled) keeps the stored value; only real changes are sent. */
function changedIds(fd, before, keys = ['driverId', 'vehicleId', 'trailerId']) {
  const out = {};
  for (const k of keys) {
    const v = fd.get(k);
    const next = v === null ? before[k] || null : v || null;
    if (next !== (before[k] || null)) out[k] = next;
  }
  return out;
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
  const vs = app.data.vehicles || [];
  const editing = !!f.id;
  if (editing && f.done) {
    // after delivery or cancellation only the bookkeeping fields may change (the route is evidence)
    return sheet({
      key: 'dform', title: t('Lieferung nachbearbeiten'), sub: `${esc(f.bookingNo)} · ${t('Nach dem Abschluss lassen sich nur Auftraggeber, Referenz und interne Notiz ändern.')}`,
      body: `<form id="dForm" data-form="delivery" class="stack" style="--gap:16px" autocomplete="off">
        <div class="fgrid"><label class="field"><span>${t('Auftraggeber')}</span><input class="input" name="customer" value="${esc(f.customer || '')}"></label><label class="field"><span>${t('Referenz des Kunden')}</span><input class="input" name="reference" value="${esc(f.reference || '')}"></label></div>
        <label class="field"><span>${t('Interne Notiz (sieht der Fahrer nicht)')}</span><textarea class="input" name="internalNote" rows="3">${esc(f.internalNote || '')}</textarea></label></form>`,
      foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary btn-lg" type="submit" form="dForm">${icon('check')}${t('Speichern')}</button>`,
    });
  }
  return sheet({
    key: 'dform', wide: true, title: editing ? t('Lieferung bearbeiten') : f.copyOf ? t('Lieferung wiederholen') : t('Neue Lieferung'), sub: editing ? esc(f.bookingNo) : t('Pflicht sind nur Lade-, Entladeort und Ladedatum – der Rest hilft dem Fahrer.'),
    body: `<form id="dForm" data-form="delivery" class="stack" style="--gap:16px" autocomplete="off">
      <div class="section-t">${icon('arrow-up-from-line')} ${t('Ladestelle')}</div>${placeFields('pickup', f.pickup, app)}
      <div class="section-t">${icon('arrow-down-to-line')} ${t('Entladestelle')}</div>${placeFields('dropoff', f.dropoff, app)}
      <div class="section-t">${icon('package')} ${t('Ware')}</div>
      <div class="fgrid" style="--cols:6"><label class="field span3"><span>${t('Beschreibung')}</span><input class="input" name="goods.text" value="${esc(f.goods?.text || '')}" placeholder="${t('z. B. Ersatzteile, 18 Paletten')}"></label>
        <label class="field"><span>${t('Paletten')}</span><input class="input" type="number" min="0" max="66" step="1" name="goods.pallets" value="${esc(f.goods?.pallets ?? '')}"></label>
        <label class="field span2"><span>${t('Gewicht (kg)')}</span><input class="input" type="number" min="0" max="60000" name="goods.weightKg" value="${esc(f.goods?.weightKg ?? '')}"></label>
        <label class="field span2"><span>${t('Temperatur')}</span><input class="input" name="goods.temp" value="${esc(f.goods?.temp || '')}" placeholder="+2…+8 °C"></label>
        <label class="check span2" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="goods.adr" ${f.goods?.adr ? 'checked' : ''}>${t('Gefahrgut (ADR)')}</label>
        <label class="check span2" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="urgent" ${f.urgent ? 'checked' : ''}>${t('Eilig')}</label></div>
      <div class="section-t">${icon('building-2')} ${t('Auftrag')}</div>
      <div class="fgrid"><label class="field"><span>${t('Auftraggeber')}</span><input class="input" name="customer" value="${esc(f.customer || '')}"></label><label class="field"><span>${t('Referenz des Kunden')}</span><input class="input" name="reference" value="${esc(f.reference || '')}"></label></div>
      <div class="section-t">${icon('users')} ${t('Fahrer & Fahrzeug')}</div>
      <div class="fgrid" style="--cols:3"><label class="field"><span>${t('Fahrer')}</span><select class="input" name="driverId" ${f.locked ? 'disabled' : ''}><option value="">${S(app).driverTakesOpen ? t('— offen für alle Fahrer —') : t('— wartet auf Zuweisung —')}</option>${driverOptions(app, f.driverId, f.driverName, true)}</select>${f.locked ? `<span class="hint">${t('Nach dem Beladen bleibt der Fahrer.')}</span>` : ''}</label>
        <label class="field"><span>${t('LKW (optional)')}</span><select class="input" name="vehicleId"><option value="">${t('Fahrer wählt selbst')}</option>${vehicleOptions(vs, 'truck', f.vehicleId, f.vehiclePlate, (v) => `${v.plate} · ${v.name || vehicleTypeText(v.type)}`)}</select></label>
        <label class="field"><span>${t('Auflieger (optional)')}</span><select class="input" name="trailerId"><option value="">—</option>${vehicleOptions(vs, 'trailer', f.trailerId, f.trailerPlate, (v) => `${v.plate} · ${vehicleTypeText(v.type)}`)}</select></label></div>
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
  const f = app.ui.form || {};
  const self = f.id && f.id === app.me.user.id;
  return sheet({
    key: 'stform', title: f.id ? t('Büro-Zugang bearbeiten') : t('Büro-Zugang anlegen'), sub: f.id ? (self ? t('Ihre eigene Rolle kann nur ein anderer Admin ändern.') : '') : t('Bekommt einen eigenen Büro-Zugang mit E-Mail und Passwort.'),
    body: `<form id="stForm" data-form="staff" class="fgrid"><label class="field full"><span>${t('Name')} *</span><input class="input" name="name" value="${esc(f.name || '')}" required></label><label class="field full"><span>${t('E-Mail')} *</span><input class="input" type="email" name="email" value="${esc(f.email || '')}" required></label>
      <label class="field"><span>${t('Rolle')}</span><select class="input" name="role" ${self ? 'disabled' : ''}><option value="dispatcher" ${f.role === 'admin' ? '' : 'selected'}>${t('Disponent')}</option><option value="admin" ${f.role === 'admin' ? 'selected' : ''}>${t('Admin')}</option></select></label><label class="field"><span>${t('Sprache')}</span><select class="input" name="lang">${Object.entries(LANG_NAMES).map(([k, v]) => `<option value="${k}" ${(f.lang || 'de') === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary" type="submit" form="stForm">${icon('check')}${f.id ? t('Speichern') : t('Anlegen')}</button>`,
  });
}
function deleteUserSheet(app) {
  const u = app.ui.del;
  if (!u) return '';
  const driver = u.role === 'driver';
  return sheet({
    key: 'deluser', title: t('{name} endgültig löschen?', { name: esc(u.name) }),
    body: `<div class="banner bad">${icon('trash-2')}<span class="grow">${t('Das lässt sich nicht rückgängig machen.')}</span></div>
      <ul class="small stack" style="--gap:6px;margin:0;padding-left:18px"><li>${driver ? t('Name, Handynummer, PIN und Mitteilungen werden gelöscht, die Anmeldung endet sofort.') : t('Name, E-Mail, Passwort und Mitteilungen werden gelöscht, die Anmeldung endet sofort.')}</li>
      <li>${t('Abgeschlossene Lieferungen bleiben für Ihre Unterlagen erhalten und zeigen „Gelöschter Nutzer“.')}</li>
      ${driver ? `<li>${t('Offene und bestätigte Aufträge gehen zurück an die Disposition. Eine schon beladene Tour bitte vorher abschließen oder stornieren.')}</li>` : ''}</ul>
      <p class="xs muted">${t('Nur sperren statt löschen? Dann bleibt der Zugang erhalten und lässt sich später wieder freigeben.')}</p>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-danger" data-act="confirmDelete" data-id="${esc(u.id)}">${icon('trash-2')}${t('Endgültig löschen')}</button>`,
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
        <label class="field"><span>${t('Nutzlast (kg)')}</span><input class="input" type="number" min="0" max="60000" name="payloadKg" value="${esc(f.payloadKg ?? '')}"></label>
        <label class="field"><span>${t('Palettenstellplätze')}</span><input class="input" type="number" min="0" max="66" step="1" name="pallets" value="${esc(f.pallets ?? '')}"></label>
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
    // C11: single-use invite link from the token; without one the company link still works
    const link = a.invite?.token ? app.api.inviteLink(a.invite.token) : app.api.tenantLink?.(tn.code) || '';
    const msg = t('Hallo {name}, hier ist dein Zugang zur App „{app}“: {link} – PIN: {pin}. Link öffnen, PIN eingeben, fertig. Login sonst mit Firmencode {code} und deiner Handynummer.', { name: a.user.name.split(' ')[0], app: tn.branding?.appName || tn.name, link, pin: a.pin, code: tn.code });
    return sheet({
      key: 'access', title: t('Zugang für {name}', { name: esc(a.user.name) }), sub: t('Die PIN wird nur jetzt angezeigt.'),
      body: `<div class="row wrap" style="--gap:18px;align-items:flex-start"><div class="qr">${qrSvg(link)}</div><div class="stack grow" style="min-width:220px"><span class="eyebrow">PIN</span><div class="secret"><span class="grow" id="pin-val">${esc(a.pin.replace(/(\d{3})(\d{3})/, '$1 $2'))}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(a.pin)}">${icon('copy')}</button></div>
        <dl class="kv"><dt>${t('Firmencode')}</dt><dd class="mono">${esc(tn.code)}</dd><dt>${t('Login')}</dt><dd>${esc(fmtPhone(a.user.phone))}</dd>${a.invite?.expiresAt ? `<dt>${t('Link gültig bis')}</dt><dd>${esc(dateFull(a.invite.expiresAt))}</dd>` : ''}</dl><p class="small muted">${t('QR-Code mit der Handy-Kamera scannen – oder Einladung schicken:')}</p>${a.invite?.token ? `<p class="xs muted">${t('Der Link gilt für eine Anmeldung. Abgelaufen oder benutzt? „Neue Einladung“ erzeugt Link und PIN neu.')}</p>` : ''}</div></div>
        <div class="card pad small" id="invite-text" style="background:var(--surface-2)">${esc(msg)}</div>`,
      foot: `<button class="btn btn-ghost" data-act="resetPin" data-id="${esc(a.user.id)}">${icon('refresh-cw')}${t('Neue Einladung')}</button><button class="btn" data-act="copy" data-from="#invite-text">${icon('copy')}${t('Text kopieren')}</button><a class="btn" href="https://wa.me/${esc((a.user.phone || '').replace(/[^\d]/g, ''))}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${icon('send')}WhatsApp</a><a class="btn" href="sms:${esc(a.user.phone)}?&body=${encodeURIComponent(msg)}">${icon('smartphone')}SMS</a><button class="btn btn-primary" data-act="close">${t('Fertig')}</button>`,
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
    body: !ns ? sk(200) : ns.length ? `<div class="list card">${ns.map((n) => `<button class="li ${n.read ? '' : 'unread'}" data-act="openNotification" data-id="${esc(n.deliveryId || '')}" data-key="n-${esc(n.id)}"><span class="avatar" style="${n.priority === 'high' ? 'background:var(--bad-bg);color:var(--bad)' : ''}">${icon(n.priority === 'high' ? 'triangle-alert' : n.type === 'delivered' ? 'file-check' : n.type === 'delivered_nopod' ? 'circle-check-big' : n.type === 'note' ? 'message-square-text' : 'bell')}</span><div class="grow"><div class="t1">${esc(n.title)}</div><div class="t2">${esc(n.body)}</div></div><span class="xs muted">${esc(ago(n.at, t))}</span></button>`).join('')}</div>` : emptyState('bell', t('Keine Mitteilungen')),
    foot: `<button class="btn" data-act="markRead">${icon('check')}${t('Alle gelesen')}</button>`,
  });
}

function proofSheet(app) {
  const d = app.data.delivery;
  if (!d) return sheet({ title: t('Laden …'), body: sk(300), wide: true });
  const tn = app.tenant();
  const pods = (d.docs || []).filter((x) => ['pod', 'cmr', 'damage'].includes(x.kind));
  const steps = (d.events || []).filter((e) => !e.undone && ['accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded', 'delivered', 'problem'].includes(e.type));
  const geoOk = (e) => Number.isFinite(e.geo?.lat) && Number.isFinite(e.geo?.lng);
  const geo = steps.some(geoOk);
  return sheet({
    key: 'proof', wide: true, title: t('Abliefernachweis'), sub: esc(d.bookingNo), back: 'backToDelivery',
    body: `<div class="proof-doc"><div class="row between" style="align-items:flex-start"><div><h1>${t('Abliefernachweis')}</h1><p>${t('Buchung')} <b>${esc(d.bookingNo)}</b> · ${t('erstellt')} ${esc(dateTimeFull(Date.now()))}</p></div>${logoImg(app, tn, 'tlogo" style="width:150px;height:60px')}</div>
      <table><tr><th>${t('Auftraggeber')}</th><td>${esc(d.customer || '–')}${d.reference ? ' · Ref. ' + esc(d.reference) : ''}</td></tr><tr><th>${t('Ladestelle')}</th><td>${esc([d.pickup.place, d.pickup.street, d.pickup.zip, d.pickup.city, d.pickup.country].filter(Boolean).join(', '))}</td></tr><tr><th>${t('Entladestelle')}</th><td>${esc([d.dropoff.place, d.dropoff.street, d.dropoff.zip, d.dropoff.city, d.dropoff.country].filter(Boolean).join(', '))}</td></tr>
        <tr><th>${t('Ware')}</th><td>${esc(d.goods?.text || '')}${d.goods?.pallets ? ' · ' + d.goods.pallets + ' Pal.' : ''}${d.goods?.weightKg ? ' · ' + esc(kg(d.goods.weightKg)) : ''}</td></tr><tr><th>${t('Fahrer / Fahrzeug')}</th><td>${esc(d.driverName || '–')} · ${esc(d.vehiclePlate || '')} ${esc(d.trailerPlate || '')}</td></tr><tr><th>${t('Status')}</th><td>${esc(tStatus(d.status))}${d.status === 'delivered' && d.deliveredAt ? ' · ' + esc(dateTimeFull(d.deliveredAt)) : ''}${d.receiver ? ' · ' + t('Empfangen von') + ' ' + esc(d.receiver) : ''}</td></tr>${d.waitingMinutes != null ? `<tr><th>${t('Standzeit')}</th><td>${esc(minutes(d.waitingMinutes, t))}</td></tr>` : ''}${d.palletExchange ? `<tr><th>${t('Palettentausch')}</th><td>${t('{g} abgegeben · {t} mitgenommen', { g: d.palletExchange.given, t: d.palletExchange.taken })}</td></tr>` : ''}</table>
      <h3 style="margin-top:14px">${t('Zeitstempel')}</h3><table>${steps.map((e) => `<tr><td style="width:150px">${esc(dateTimeFull(e.at))}</td><td>${esc(eventText(e))}${eventDetail(e) ? ' – ' + esc(eventDetail(e)) : ''}</td><td>${esc(e.byName || '')}</td>${geo ? `<td>${geoOk(e) ? `<a href="https://www.google.com/maps?q=${e.geo.lat.toFixed(6)},${e.geo.lng.toFixed(6)}" target="_blank" rel="noopener">${e.geo.lat.toFixed(5)}, ${e.geo.lng.toFixed(5)}</a>` : ''}</td>` : ''}</tr>`).join('')}</table>${geo ? `<p style="font-size:11px;color:#666">${t('Standort: nur im Moment des Tipps gespeichert, wenn der Fahrer zugestimmt hat.')}</p>` : ''}
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
  return { ...base, id: d.id, bookingNo: d.bookingNo, done: ['delivered', 'cancelled'].includes(d.status), locked: ['loaded', 'arrived_dropoff', 'unloaded'].includes(d.status), driverName: d.driverName, vehiclePlate: d.vehiclePlate, trailerPlate: d.trailerPlate };
}
let suggestTimer = 0;

async function download(app, filename, data) {
  const dl = await (window.claude?.use?.('downloads') ?? Promise.resolve(null)).catch(() => null);
  if (!dl) return app.toast({ title: t('Export bereit'), body: t('In der echten App lädt der Browser die Datei direkt herunter.'), plain: true, icon: 'file-down' });
  try { await dl.save({ filename, data }); app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); }
  catch (e) { if (e?.code !== 'declined') app.toast({ title: t('Download ist hier nicht möglich.'), plain: true, err: true, icon: 'circle-alert' }); }
}

const dataUrlBytes = (u) => {
  const i = u.indexOf(',');
  if (!u.startsWith('data:') || i < 0) return null;
  const raw = u.slice(i + 1);
  if (!u.slice(0, i).endsWith(';base64')) return new TextEncoder().encode(decodeURIComponent(raw));
  const bin = atob(raw); const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
};

// ---------- actions ----------
export const actions = {
  openSheet: (el, ev, app) => app.open({ type: el.dataset.type, id: el.dataset.id || app.ui.sheet?.id || null }),
  openDelivery: (el, ev, app) => app.open({ type: 'delivery', id: el.dataset.id }),
  dtab: (el, ev, app) => { app.ui.dfilter = { ...(app.ui.dfilter || {}), tab: el.dataset.tab }; app.data.deliveries = null; if (app.route.name !== 'deliveries') app.go('deliveries'); else { app.render(); app.load(); } },
  vkind: (el, ev, app) => { app.ui.vkind = el.dataset.k; app.render(); },
  toLicense: (el, ev, app) => { app.ui.ssec = 'license'; app.go('settings'); },
  ssec: (el, ev, app) => { app.ui.ssec = el.dataset.k; app.ui.apiKey = null; app.ui.licReq = null; app.ui.tfa = null; if (el.dataset.k === 'reports') return app.go('reports'); app.render(); app.load(); },
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
  newStaff: (el, ev, app) => { app.ui.form = {}; app.open({ type: 'staffForm' }); },
  editStaff: (el, ev, app) => { app.ui.form = { ...(app.data.staff || []).find((u) => u.id === el.dataset.id) }; app.open({ type: 'staffForm', id: el.dataset.id }); },
  askDelete: (el, ev, app) => {
    const u = [...(app.data.drivers || []), ...(app.data.staff || [])].find((x) => x.id === el.dataset.id);
    if (!u) return;
    app.ui.del = { id: u.id, name: u.name, role: u.role };
    app.open({ type: 'deleteUser', id: u.id });
  },
  async confirmDelete(el, ev, app) {
    const r = await app.call('deleteUser', { id: el.dataset.id }).catch(() => null);
    if (!r) return;
    app.toast({ title: t('Gelöscht – der Zugang ist beendet'), plain: true, icon: 'trash-2' });
    app.ui.del = null; app.close();
    app.data.drivers = null; app.data.staff = null; app.load();
  },
  async resetPin(el, ev, app) {
    const r = await app.call('resetSecret', { id: el.dataset.id }).catch(() => null);
    if (r) { app.ui.access = { role: r.user.role, user: r.user, pin: r.pin, password: r.password, invite: r.invite || null }; app.open({ type: 'access' }); }
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
  async exportZip(el, ev, app) {
    // demo: the same archive as the server's /api/export/all.zip
    const [data, ds] = await Promise.all([app.call('exportData', {}), app.call('listDeliveries', { tab: 'all', limit: 0 })]).catch(() => []);
    if (!data) return;
    const parts = [], missing = [];
    const zip = createZip((chunk) => parts.push(chunk));
    const files = data.files.map((f) => ({ ...f, path: exportFileName(f) }));
    for (const f of files) { const bytes = dataUrlBytes(app.fileUrl(f.id) || ''); if (bytes) zip.add(f.path, bytes, f.at); else missing.push(f.id); }
    const now0 = Date.now();
    zip.add('lieferungen.csv', deliveriesCsv(ds || []), now0);
    zip.add('daten.json', JSON.stringify({ ...data, files, missingFiles: missing }, null, 2), now0);
    zip.add('LIESMICH.txt', readmeText(data.company, now0), now0);
    zip.end();
    logExport(app, 'zip');
    return download(app, `ladeklar-export-${data.company.code}-${isoToday()}.zip`, new Blob(parts, { type: 'application/zip' }));
  },
  async exportJson(el, ev, app) { const data = await app.call('exportData', {}).catch(() => null); if (data) { logExport(app, 'json'); return download(app, `ladeklar-export-${isoToday()}.json`, JSON.stringify(data, null, 2)); } },
  async reportCsv(el, ev, app) {
    const r = app.data.reports;
    if (!r) return;
    const rows = [[t('Bericht'), r.month], [], [t('Zugestellt'), r.delivered], [t('Pünktlich') + ' %', r.onTimeRate ?? ''], [t('Ø Standzeit je Tour') + ' (min)', r.avgWaiting ?? ''], [t('Paletten abgegeben'), r.palletsGiven], [t('Paletten mitgenommen'), r.palletsTaken], [],
      [t('Auftraggeber'), t('Zugestellt'), t('Ø Standzeit je Tour') + ' (min)', t('Probleme')], ...r.byCustomer.map((x) => [x.customer || t('ohne Auftraggeber'), x.count, x.avgWaiting ?? '', x.problems]), [],
      [t('Stelle'), t('Stadt'), t('Art'), t('Touren'), t('Ø Standzeit') + ' (min)', t('gemessen')], ...r.byPlace.map((x) => [x.place, x.city, x.side === 'pickup' ? t('Laden') : t('Entladen'), x.count, x.avgWaiting ?? '', x.measured]),
      ...(!r.byDriverHidden && r.byDriver?.length ? [[], [t('Fahrer'), t('Zugestellt'), t('Standzeit gesamt') + ' (min)', t('Probleme')], ...r.byDriver.map((x) => [x.driverName, x.delivered, x.waiting, x.problems])] : [])];
    const text = '\ufeff' + toCsv(rows); // core/csv.js: formula cells are neutralised (CSV injection)
    const name = `bericht-${r.month}.csv`;
    logExport(app, 'report'); // C18: built in the browser, so the client logs it
    if (app.api.mode === 'demo') return download(app, name, text);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  async exportCsv(el, ev, app) {
    const ds = await app.call('listDeliveries', { tab: 'all', limit: 0 }).catch(() => null);
    if (!ds) return;
    logExport(app, 'csv');
    return download(app, `lieferungen-${isoToday()}.csv`, deliveriesCsv(ds));
  },
  // ---- two-factor login (C13) ----
  async tfaSetup(el, ev, app) { const r = await app.call('twoFactorSetup', {}).catch(() => null); if (r?.otpauthUrl) { app.ui.tfa = r; app.render(); } },
  tfaCancel: (el, ev, app) => { app.ui.tfa = null; app.render(); },
  // ---- licence requests to the provider (C16) ----
  licReq: (el, ev, app) => { app.ui.licReq = el.dataset.k || null; if (!app.ui.licReq) app.ui.cancelReason = ''; app.render(); },
  async cancelSend(el, ev, app) {
    const r = await app.call('requestCancellation', { reason: app.ui.cancelReason || '' }).catch(() => null);
    if (!r) return;
    app.ui.licReq = null; app.ui.cancelReason = '';
    app.me.tenant = { ...app.me.tenant, ...r };
    if (app.data.license) app.data.license = { ...app.data.license, ...r };
    app.toast({ title: t('Kündigung gesendet'), body: t('Ihr Anbieter bestätigt das Vertragsende.'), plain: true, icon: 'send' });
    app.render(); app.load();
  },
  // ---- retention: lowering it deletes old deliveries, so it is confirmed first ----
  retentionCancel: (el, ev, app) => { app.ui.retention = null; app.render(); },
  async retentionOk(el, ev, app) { const c = app.ui.retention; app.ui.retention = null; if (c) await saveFlow(app, c.settings); else app.render(); },
};
const logExport = (app, kind) => app.call('logExport', { kind }, { quiet: true }).catch(() => null);
async function saveFlow(app, settings) {
  const r = await app.call('updateCompany', { settings }).catch(() => null);
  if (r) { app.me.tenant = r; app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); }
  app.render();
}
const berlinStamp = (ms) => (ms ? new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : '');
/** The same table as the server's deliveries.csv and lieferungen.csv (German, "Zugestellt am" from deliveredAt). */
export function deliveriesCsv(ds) {
  const head = ['Buchungsnummer', 'Status', 'Auftraggeber', 'Referenz', 'Route', 'Ladeort', 'Ladedatum', 'Entladeort', 'Entladedatum', 'Fahrer', 'Kennzeichen', 'Auflieger', 'Ware', 'Paletten', 'Gewicht kg', 'Standzeit min', 'Empfänger', 'Lieferscheine', 'Zugestellt am'];
  const place = (p) => [p?.place, p?.street, p?.zip, p?.city].filter(Boolean).join(', ');
  return '\ufeff' + toCsv([head, ...ds.map((d) => [d.bookingNo, statusText('de', d.status), d.customer, d.reference, routeLabel(d), place(d.pickup), d.pickup?.date, place(d.dropoff), d.dropoff?.date, d.driverName, d.vehiclePlate, d.trailerPlate, d.goods?.text, d.goods?.pallets, d.goods?.weightKg, d.waitingMinutes, d.receiver, (d.docs || []).filter((x) => x.kind === 'pod').length, d.status === 'delivered' ? berlinStamp(d.deliveredAt || d.updatedAt) : ''])]);
}
export const readmeText = (c, ms = Date.now()) => `Ladeklar-Datenexport ${c.name} (${c.code}) vom ${berlinStamp(ms)}\r\n\r\ndaten.json      alle Daten (Firma, Nutzer ohne Passwörter, Fahrzeuge, Lieferungen mit Verlauf und Notizen, Protokoll)\r\nlieferungen.csv Lieferungen als Tabelle (Excel: Daten > Aus Text/CSV, Trennzeichen Semikolon)\r\ndateien/        Lieferscheine, Fotos, Unterschriften und Logo; die Zuordnung steht in daten.json unter files[].path\r\n`;

export const inputs = {
  driverFilter: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.dfilter = { ...(app.ui.dfilter || {}), driverId: el.value || undefined }; app.load(); },
  month: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.month = el.value; app.data.reports = null; app.render(); app.load(); },
  docKind: (el, ev, app) => { if (ev.type === 'change') app.ui.docKind = el.value; },
  planPick: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.planPick = el.value; app.render(); },
  // push on/off for this browser (off is remembered, so no silent re-subscribe then)
  async pushToggle(el, ev, app) {
    if (ev.type !== 'change') return;
    try {
      if (el.checked) { const r = await app.api.push.enable(); app.toast({ title: r === 'granted' ? t('Mitteilungen sind an') : t('Mitteilungen wurden im Browser blockiert'), plain: true, icon: 'bell' }); }
      else { await app.api.push.disable({ byUser: true }); app.toast({ title: t('Mitteilungen sind aus'), plain: true, icon: 'bell' }); }
    } catch (e) { app.error(e); }
    await pushStatus(app);
    app.render();
  },
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
    try { for (const f of el.files) { const blob = await compressPhoto(f, app.api.mode === 'demo' ? { max: 1100, quality: 0.6 } : {}); await app.api.upload(blob, { kind: app.ui.docKind || 'pod', deliveryId: el.dataset.id, name: f.name }); } } catch (e) { app.error(e); }
    el.value = ''; await refreshSheetData(app); app.render();
  },
};

export const forms = {
  search(fd, form, app) { app.ui.dfilter = { tab: 'all', q: String(fd.get('q') || '').trim() }; app.data.deliveries = null; app.go('deliveries'); },
  async delivery(fd, form, app) {
    const v = nested(fd);
    const f = app.ui.form || {};
    const payload = f.done ? { customer: v.customer, reference: v.reference, internalNote: v.internalNote } : { customer: v.customer, reference: v.reference, pickup: v.pickup, dropoff: v.dropoff, goods: { ...v.goods, adr: !!v.goods?.adr }, urgent: !!v.urgent, instructions: v.instructions, internalNote: v.internalNote };
    if (!f.done) {
      // editing details never touches the assignment unless a select was changed
      const ids = f.id ? changedIds(fd, f) : { driverId: v.driverId || null, vehicleId: v.vehicleId || null, trailerId: v.trailerId || null };
      Object.assign(payload, ids);
      // "offen für alle" only where drivers may take open jobs; otherwise it waits for the office
      if (!f.id || ('driverId' in ids && !ids.driverId)) payload.openForAll = !payload.driverId && !!S(app).driverTakesOpen;
    }
    const r = await app.call(f.id ? 'updateDelivery' : 'createDelivery', f.id ? { id: f.id, ...payload } : payload);
    if (!r) return;
    app.ui.form = null;
    const body = r.driverName ? t('{n} wurde benachrichtigt.', { n: r.driverName }) : r.status === 'open' && r.openForAll && S(app).driverTakesOpen ? t('Alle Fahrer sehen den Auftrag.') : r.status === 'open' ? t('Der Auftrag wartet, bis Sie ihn einem Fahrer zuteilen.') : '';
    app.toast({ title: f.id ? t('Gespeichert · {no}', { no: r.bookingNo }) : t('Angelegt · {no}', { no: r.bookingNo }), body, plain: true, icon: 'check' });
    app.open({ type: 'delivery', id: r.id });
    app.load();
  },
  async assign(fd, form, app) {
    const d = app.data.delivery;
    const payload = { id: d.id, ...changedIds(fd, d) };
    if (form.querySelector('[name=openForAll]')) payload.openForAll = fd.get('openForAll') === 'on';
    else if ('driverId' in payload && !payload.driverId) payload.openForAll = !!S(app).driverTakesOpen;
    if (!Object.keys(payload).some((k) => k !== 'id' && !(k === 'openForAll' && payload[k] === !!d.openForAll))) return app.toast({ title: t('Nichts geändert.'), plain: true, icon: 'check' });
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
    else { app.ui.access = { role: 'driver', user: r.user, pin: r.pin, invite: r.invite || null }; app.open({ type: 'access' }); }
    app.data.drivers = null; app.load();
  },
  async staff(fd, form, app) {
    const f = app.ui.form || {};
    const v = Object.fromEntries(fd.entries());
    if (f.id) {
      const r = await app.call('updateUser', { id: f.id, name: v.name, email: v.email, lang: v.lang, ...(v.role ? { role: v.role } : {}) });
      if (r) { app.close(); app.toast({ title: t('Gespeichert'), plain: true, icon: 'check' }); if (r.id === app.me.user.id) app.me.user = { ...app.me.user, name: r.name, email: r.email }; app.data.staff = null; app.load(); }
      return;
    }
    const r = await app.call('createUser', v);
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
    const settings = { bookingPrefix: fd.get('bookingPrefix') };
    // an empty field keeps the current retention (Number('') would be 0 → 1 year → deletion)
    const raw = String(fd.get('retentionYears') ?? '').trim();
    if (raw !== '') {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 10) { form.querySelector('[name=retentionYears]')?.classList.add('invalid'); return app.toast({ title: t('Bitte 1 bis 10 Jahre angeben – oder das Feld leer lassen.'), plain: true, err: true, icon: 'circle-alert' }); }
      if (n < (S(app).retentionYears || 3)) {
        const ds = await app.call('listDeliveries', { tab: 'done', limit: 0 }, { quiet: true }).catch(() => null);
        const limit = Date.now() - n * 365.25 * 864e5;
        app.ui.retention = { years: n, settings: { ...settings, retentionYears: n }, count: (ds || []).filter((d) => (d.deliveredAt || d.cancelledAt || d.updatedAt || 0) <= limit).length };
        return app.render();
      }
      settings.retentionYears = n;
    }
    app.ui.retention = null;
    await saveFlow(app, settings);
  },
  async tfaOn(fd, form, app) {
    const r = await app.call('twoFactorEnable', { code: String(fd.get('code') || '').replace(/\s/g, '') });
    if (r) { app.ui.tfa = null; app.me.user = { ...app.me.user, twoFactor: true }; app.me.twoFactor = true; app.toast({ title: t('Zwei-Faktor-Anmeldung ist an'), plain: true, icon: 'shield-check' }); app.render(); }
  },
  async tfaOff(fd, form, app) {
    const r = await app.call('twoFactorDisable', { password: fd.get('password') });
    if (r) { app.me.user = { ...app.me.user, twoFactor: false }; app.me.twoFactor = false; app.toast({ title: t('Zwei-Faktor-Anmeldung ist aus'), plain: true, icon: 'shield-check' }); app.render(); }
  },
  async planRequest(fd, form, app) {
    const r = await app.call('requestPlanChange', { plan: fd.get('plan'), note: fd.get('note') });
    if (!r) return;
    app.ui.licReq = null;
    app.me.tenant = { ...app.me.tenant, ...r };
    if (app.data.license) app.data.license = { ...app.data.license, ...r };
    app.toast({ title: t('Anfrage gesendet'), body: t('Ihr Anbieter meldet sich.'), plain: true, icon: 'send' });
    app.render(); app.load();
  },
  cancelRequest(fd, form, app) { app.ui.cancelReason = String(fd.get('reason') || ''); app.ui.licReq = 'cancelConfirm'; app.render(); },
  async password(fd, form, app) {
    const r = await app.call('changePassword', { current: fd.get('current'), next: fd.get('next') });
    if (r) { form.reset(); app.me.user.mustChangePassword = false; app.toast({ title: t('Passwort geändert'), plain: true, icon: 'key-round' }); app.render(); }
  },
};
