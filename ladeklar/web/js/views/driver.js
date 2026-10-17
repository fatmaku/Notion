// Driver app: one big button – always the next step. Truck from the pool, confirm the booking,
// loaded, unloaded, delivery-note photo, done. Notes, problems, navigation and a call to the
// office are one tap away. Works offline, locks while driving, speaks eight languages.
import { icon, esc, pill, problemPill, plate, stepper, routeTitle, goodsFacts, placeBlock, timeline, notesThread, docsGrid, sheet, emptyState, logoImg, langPicker, PROBLEM_ICON, STEP_ICON, VEHICLE_ICON, vehicleTypeText, featureText } from './common.js';
import { t, tStep, tStatus, tProblem, problemCodes, noteShortcuts } from '../i18n.js';
import { time, longDate, dayLabel, mapsHref, phoneHref, dateTime, phone as fmtPhone } from '../format.js';
import { compressPhoto, signaturePad, rasterize } from '../media.js';
import { nextStep, progressOf } from '../../../core/engine.js';

export const routes = ['home', 'jobs', 'history', 'more'];
export const defaultRoute = () => 'home';

// ---------- data ----------
// Without network the transport answers driverHome/getDelivery from the phone's last copy.
export async function load(app) {
  const [home, hist] = await Promise.all([
    app.api.call('driverHome', {}),
    app.route.name === 'history' ? app.api.call('myHistory', {}).catch((e) => { if (e.code === 'network') return app.data.history; throw e; }) : Promise.resolve(app.data.history),
  ]);
  await overlayOutbox(app, home);
  app._nos = app._nos || new Map(); // booking numbers stay known for "not sent" notices, also of tours that left the list
  for (const d of [home?.current, ...(home?.mine || []), ...(home?.offered || [])]) if (d) app._nos.set(d.id, d.bookingNo);
  app.data.home = home;
  app.data.history = hist;
  if (home?.me && app.me) app.me.user = { ...app.me.user, ...home.me };
  app.ui.failed = (await app.api.failed?.().catch(() => null)) || [];
  await refreshSheetData(app);
  watchDriving(app);
  // C7: a PIN reset ends all push subscriptions – renew silently if the phone still allows it
  if (app.me && app._pushFor !== app.me.user.id) { app._pushFor = app.me.user.id; app.api.push?.resubscribe?.().catch(() => {}); }
  if (app.route.name === 'more') pushStatus(app);
}

// ---------- offline: what the phone knows without network ----------
// The last driverHome plus what still waits in the outbox: steps tapped in a dead zone are applied
// on top (also after the app was closed), photos show from the phone, so the driver can go on
// (loaded → unloaded → delivery note → done).
async function overlayOutbox(app, h) {
  const items = (await app.api.outbox?.().catch(() => [])) || [];
  const urls = (app._blobUrls = app._blobUrls || new Map()), docs = {};
  for (const x of items) {
    if (x.kind === 'call' && (x.method === 'acceptDelivery' || x.method === 'advanceDelivery')) applyLocalStep(app, h, x.args.id, x.method === 'acceptDelivery' ? 'accepted' : x.args.step, x.at);
    else if (x.kind === 'upload' && x.deliveryId && x.blob) {
      if (!urls.has(x.seq)) urls.set(x.seq, URL.createObjectURL(x.blob));
      (docs[x.deliveryId] = docs[x.deliveryId] || []).push({ fileId: 'local-' + x.seq, kind: x.fileKind, localUrl: urls.get(x.seq), queued: true, at: x.at, mime: x.blob.type });
    }
  }
  const live = new Set(items.map((x) => x.seq));
  for (const [seq, url] of urls) if (!live.has(seq)) { URL.revokeObjectURL(url); urls.delete(seq); }
  app._queuedSteps = items.filter((x) => x.kind === 'call' && x.args?.step).map((x) => ({ id: x.args.id, step: x.method === 'acceptDelivery' ? 'accepted' : x.args.step, at: x.at }));
  app.ui.localDocs = docs;
}
function withLocal(app, d) {
  const extra = app.ui.localDocs?.[d.id];
  return extra?.length ? { ...d, docs: [...(d.docs || []), ...extra] } : d;
}
function localJob(app, id) {
  const h = app.data.home;
  const d = h && [h.current, ...(h.mine || []), ...(h.offered || [])].find((x) => x && x.id === id);
  return d ? withLocal(app, d) : null;
}
function addLocalDoc(app, id, doc) {
  app.ui.localDocs = app.ui.localDocs || {};
  app.ui.localDocs[id] = [...(app.ui.localDocs[id] || []), doc];
}
function stepLocal(app, d, step, at, s) {
  if (!d || progressOf(d.status) >= progressOf(step)) return false; // the server has it already
  d.events = [...(d.events || []), { id: 'local-' + at, at, type: step, by: app.me.user.id, role: 'driver', from: d.status, local: true }];
  d.status = step;
  d.next = nextStep(d, s);
  if (step === 'accepted') d.driverId = app.me.user.id;
  return true;
}
function applyLocalStep(app, h, id, step, at = Date.now()) {
  if (!h || !app.me) return;
  let hit = false;
  for (const d of [h.current, ...h.mine, ...h.offered]) if (d && d.id === id && stepLocal(app, d, step, at, settings(app, h))) hit = true;
  if (!hit) return;
  const cur = h.mine.find((d) => d.id === id) || h.offered.find((d) => d.id === id);
  if (cur && step === 'accepted' && !h.mine.includes(cur)) { h.mine.unshift(cur); h.offered = h.offered.filter((d) => d !== cur); }
  if (step === 'delivered') { h.mine = h.mine.filter((d) => d.id !== id); h.doneToday = (h.doneToday || 0) + 1; }
  h.current = h.mine.find((d) => progressOf(d.status) >= 1) || null;
}

async function refreshSheetData(app) {
  const s = app.ui.sheet;
  if (!s) return;
  const offline = (e) => { if (e.code !== 'network') throw e; s.missing = true; return null; };
  s.missing = false;
  if (s.id && ['job', 'pod', 'note', 'problem', 'return', 'pallets'].includes(s.type)) {
    let fresh = null, err = null;
    try { fresh = await app.api.call('getDelivery', { id: s.id }); } catch (e) { err = e; }
    if (app.ui.sheet !== s) return;
    if (err?.code === 'not_found') { // e.g. the notification of a tour that now belongs to another driver
      app.ui.sheet = null; app.data.job = null;
      app.toast({ title: t('Dieser Auftrag ist nicht mehr für Sie.'), plain: true, icon: 'info' });
      return app.render();
    }
    if (fresh) for (const q of app._queuedSteps || []) if (q.id === fresh.id) stepLocal(app, fresh, q.step, q.at, settings(app));
    app.data.job = fresh ? withLocal(app, fresh) : localJob(app, s.id);
    if (!app.data.job) s.missing = true;
  }
  if (s.type === 'vehicle') app.data.vehicles = (await app.api.call('listVehicles', {}).catch(offline)) || app.data.vehicles;
  if (s.type === 'notifications') app.data.notes = (await app.api.call('listNotifications', {}).catch(offline)) || app.data.notes;
}
export async function refreshSheet(app) { await refreshSheetData(app); app.invalidate(); }
export async function sheetOpened(app) { await refreshSheetData(app); app.invalidate(); }
export function openDelivery(app, id) { app.open({ type: 'job', id }); }

// settings come with driverHome (cached), so rules like "signature required" hold offline too
const settings = (app, h = app.data.home) => h?.tenant?.settings || app.tenant()?.settings || {};
// time window in the driver's language (format.window_ has German words)
const win = (p) => (p?.from && p?.to ? `${p.from}–${p.to}` : p?.from ? t('ab {t}', { t: p.from }) : p?.to ? t('bis {t}', { t: p.to }) : '');
/** Drivers never see billing notices – only that the access is blocked (licence suspended, expired, ended). */
function accessBanner(app, h) {
  const st = h?.license || app.me?.license?.state;
  return ['suspended', 'expired', 'cancelled'].includes(st) ? `<div class="banner bad">${icon('lock')}<span class="grow">${t('Zugang gesperrt – bitte die Disposition anrufen.')}</span></div>` : '';
}
/** For the "not sent" toast and card: which step of which tour. */
export function queueLabel(app, x) {
  const no = (x?.id && localJob(app, x.id)?.bookingNo) || app._nos?.get(x?.id);
  const what = x.kind === 'upload' ? ({ pod: t('Lieferschein'), signature: t('Unterschrift') }[x.fileKind] || t('Foto'))
    : x.method === 'acceptDelivery' ? tStatus('accepted') : x.method === 'advanceDelivery' ? tStatus(x.step) : x.method === 'addNote' ? t('Notiz') : x.method === 'reportProblem' ? t('Problem') : x.method;
  return no ? `${what} · ${no}` : what;
}

// ---------- render ----------
export function render(app) {
  const h = app.data.home;
  const tn = h?.tenant || app.tenant();
  const me = h?.me || app.me.user;
  const r = app.route.name;
  const unread = app.me.unread || 0;
  const offerCount = (h?.offered?.length || 0) + (h?.mine?.filter((d) => d.status === 'open').length || 0);
  const first = (me.name || '').split(' ')[0];
  const undoOn = !app.ui.sheet && app.ui.undo && app.ui.undo.until > Date.now();
  return `<div class="drv ${undoOn ? 'has-undo' : ''}" data-key="drv">
    <header class="drv-top">
      <div class="bar1">${logoImg(app, tn)}<span class="grow"></span>
        <button class="ibtn" data-act="openSheet" data-type="notifications" aria-label="${t('Mitteilungen')}">${icon('bell')}${unread ? `<span class="dot">${unread > 9 ? '9+' : unread}</span>` : ''}</button></div>
      <div class="hi">${t('Hallo {name}', { name: esc(first) })}<small>${esc(longDate(Date.now()))}${h ? ' · ' + t('{n} heute erledigt', { n: h.doneToday }) : ''}</small></div>
      <div class="vrow">${vehicleButtons(app, h)}</div>
    </header>
    ${!app.online || app.queue ? `<div class="offline">${icon('wifi-off')}${app.online ? t('{n} Schritt(e) werden gesendet …', { n: app.queue }) : t('Offline – Ihre Schritte werden gespeichert und automatisch gesendet.')}</div>` : ''}
    <main class="drv-main" data-key="main-${r}">${accessBanner(app, h)}${failedCard(app)}${!h ? (app.online ? skeleton() : `<section class="card">${emptyState('wifi-off', t('Keine Verbindung.'), t('Die Touren erscheinen, sobald wieder Netz da ist.'))}</section>`) : r === 'jobs' ? jobsView(app, h) : r === 'history' ? historyView(app) : r === 'more' ? moreView(app, h) : homeView(app, h)}</main>
    <nav class="tabbar">${[['home', 'truck', t('Fahrt')], ['jobs', 'list-checks', t('Aufträge'), offerCount], ['history', 'history', t('Verlauf')], ['more', 'circle-user', t('Mehr')]].map(([k, ic, l, c]) => `<button data-act="go" data-to="${k}" aria-current="${r === k ? 'page' : 'false'}">${icon(ic)}${esc(l)}${c ? `<span class="dot">${c}</span>` : ''}</button>`).join('')}</nav>
    ${app.ui.sheet ? '' : undoBar(app)}${sheetView(app)}${successView(app)}${lockView(app)}
  </div>`;
}

function skeleton() { return `<div class="sk" style="height:320px;border-radius:26px"></div><div class="sk" style="height:96px"></div>`; }
const offlineBody = () => emptyState('wifi-off', t('Keine Verbindung.'), t('Ohne Netz gerade nicht verfügbar.'));
// queued steps the server refused for good: the driver sees what did not arrive and why
function failedCard(app) {
  const f = app.ui.failed || [];
  if (!f.length) return '';
  return `<section class="card pad stack" data-key="failed"><div class="row"><span class="avatar" style="color:var(--bad)">${icon('circle-alert')}</span><div class="grow"><h3>${t('Nicht gesendet')}</h3><p class="small muted">${t('Die Disposition hat das nicht bekommen. Bitte prüfen und bei Bedarf anrufen.')}</p></div></div>
    <ul class="small stack" style="--gap:6px;margin:0;padding-left:18px">${f.map((x) => `<li><b>${esc(queueLabel(app, x))}</b> · ${esc(time(x.at))}<br>${esc(t(x.message))}</li>`).join('')}</ul>
    <button class="btn" data-act="dismissFailed">${icon('check')}${t('Verstanden')}</button></section>`;
}

function vehicleButtons(app, h) {
  if (!h) return '';
  const s = settings(app);
  if (!s.driverPicksTruck && !h.vehicle) return '';
  const truck = h.vehicle ? `${icon(VEHICLE_ICON[h.vehicle.type] || 'truck')}${plate(h.vehicle.plate)}` : `${icon('truck')}${t('LKW wählen')}`;
  const trailer = h.trailer ? `${icon('container')}${plate(h.trailer.plate)}` : `${icon('plus')}${t('Auflieger')}`;
  return `<button class="vbtn" data-act="openSheet" data-type="vehicle" ${s.driverPicksTruck ? '' : 'disabled'}>${truck}</button>${h.vehicle ? `<button class="vbtn" data-act="openSheet" data-type="vehicle" ${s.driverPicksTruck ? '' : 'disabled'}>${trailer}</button>` : ''}`;
}

function homeView(app, h) {
  const s = settings(app);
  let out = '';
  if (s.driverPicksTruck && !h.vehicle) {
    out += `<section class="card pad stack" data-key="pick-truck"><div class="row"><span class="avatar">${icon('truck')}</span><div class="grow"><h3>${t('Welchen LKW fahren Sie heute?')}</h3><p class="small muted">${t('Einmal tippen – die Disposition sieht es sofort.')}</p></div></div>
      <button class="step-btn" data-act="openSheet" data-type="vehicle"><span class="si">${icon('truck')}</span><span><b>${t('LKW wählen')}</b><small>${t('aus dem Fuhrpark Ihrer Firma')}</small></span>${icon('chevron-right', 'go')}</button></section>`;
  }
  if (lockNeedsPermission(app) && !(s.geoOnStatus && h.me.geoConsent == null)) {
    out += `<section class="card pad stack" data-key="lock-consent"><div class="row"><span class="avatar">${icon('octagon-x')}</span><div class="grow"><h3>${t('Fahrsperre einschalten')}</h3></div></div>
      <p class="small">${t('Damit die Knöpfe während der Fahrt gesperrt sind, braucht die App die Standortfreigabe. Die Geschwindigkeit wird nur auf diesem Handy ausgewertet – Ihr Standort wird weder gespeichert noch gesendet.')}</p>
      <div class="row wrap"><button class="btn btn-primary" data-act="lockAllow">${icon('check')}${t('Standort freigeben')}</button><button class="btn" data-act="lockLater">${t('Später')}</button></div></section>`;
  }
  if (s.geoOnStatus && h.me.geoConsent == null) {
    out += `<section class="card pad stack" data-key="geo-consent"><div class="row"><span class="avatar">${icon('map-pin')}</span><div class="grow"><h3>${t('Standort beim Status-Tipp teilen?')}</h3></div></div>
      <p class="small">${t('Ihre Firma möchte bei „Aufgeladen“, „Abgeladen“ usw. den Standort dieses einen Moments speichern – als Nachweis. Keine Dauerortung. Freiwillig: Alles funktioniert auch ohne.')}</p>
      <div class="row wrap"><button class="btn btn-primary" data-act="geoConsent" data-v="1">${icon('check')}${t('Ja, teilen')}</button><button class="btn" data-act="geoConsent" data-v="0">${t('Nein, danke')}</button></div><p class="xs muted">${t('Jederzeit änderbar unter „Mehr“.')}</p></section>`;
  }
  const cur = h.current || h.mine.find((d) => d.status === 'open');
  if (cur) {
    const others = otherJobs(app, h, cur);
    out += others ? `<div class="drv-cols">${jobCard(app, cur, true)}<div class="stack">${others}</div></div>` : `<div class="drv-solo">${jobCard(app, cur, true)}</div>`;
  } else if (h.offered.length) {
    out += `<div class="stack"><div class="row between"><h3>${t('Freie Aufträge')}</h3><span class="pill brand">${h.offered.length}</span></div>${h.offered.map((d, i) => offerCard(app, d, i)).join('')}</div>`;
  } else {
    out += `<section class="card">${emptyState('circle-check-big', t('Keine offene Tour'), t('Sie bekommen eine Mitteilung, sobald ein neuer Auftrag für Sie da ist.'), h.tenant?.phone ? `<a class="btn" href="${esc(phoneHref(h.tenant.phone))}">${icon('phone')}${t('Disposition anrufen')}</a>` : '')}</section>`;
  }
  return out;
}

function otherJobs(app, h, cur) {
  const rest = h.mine.filter((d) => d.id !== cur.id);
  let out = '';
  if (rest.length) out += `<h4>${t('Weitere Touren')}</h4>${rest.map((d, i) => offerCard(app, d, i)).join('')}`;
  if (h.offered.length) out += `<h4>${t('Freie Aufträge')}</h4>${h.offered.slice(0, 3).map((d, i) => offerCard(app, d, i)).join('')}`;
  return out;
}

function jobCard(app, d, hero = false) {
  const s = settings(app);
  const next = d.next;
  const target = ['accepted', 'open', 'arrived_pickup'].includes(d.status) ? d.pickup : d.dropoff;
  const pods = (withLocal(app, d).docs || []).filter((x) => x.kind === 'pod').length;
  let btn = '';
  if (next) {
    const ic = next === 'delivered' ? (pods || !s.requirePod ? 'circle-check-big' : 'camera') : STEP_ICON[next];
    const label = next === 'delivered' && !pods && s.requirePod ? t('Lieferschein fotografieren') : tStep(next);
    const small = next === 'accepted' ? t('Sie übernehmen diese Tour') : next === 'delivered' ? (pods ? t('{n} Lieferschein-Foto(s) bereit', { n: pods }) : t('Danach bestätigen – fertig')) : esc(target?.place || target?.city || '');
    btn = `<button class="step-btn ${next === 'delivered' && (pods || !s.requirePod) ? 'ok' : ''} ${app.ui.locked && s.driveLock ? 'locked' : ''}" data-act="step" data-id="${esc(d.id)}" data-step="${next}" data-key="step-${esc(d.id)}-${next}"><span class="si">${icon(ic)}</span><span><b>${esc(label)}</b><small>${small}</small></span>${icon('chevron-right', 'go')}</button>`;
  }
  const callNo = target?.phone || app.data.home?.tenant?.phone;
  return `<article class="job ${app.flash.has(d.id) ? 'flash' : ''}" data-key="job-${esc(d.id)}">
    <div class="job-h">${pill(d.status)}${problemPill(d.problem)}<span class="grow"></span><span class="mono small muted">${esc(d.bookingNo)}</span></div>
    <div class="job-route"><div class="cities"><div class="city ${cityLen(d.pickup.city || d.pickup.place)}">${esc(d.pickup.city || d.pickup.place)}</div>
      <svg class="lane" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><circle cx="4" cy="11" r="4"/><path d="M10 11 H90"/><circle cx="96" cy="11" r="4"/></svg>
      <div class="city to ${cityLen(d.dropoff.city || d.dropoff.place)}">${esc(d.dropoff.city || d.dropoff.place)}</div></div>
      <div class="when"><div>${icon('arrow-up-from-line')} ${esc(dayLabel(d.pickup.date, t))} ${esc(win(d.pickup))}<br><span class="muted">${esc(d.pickup.place || '')}</span></div><div>${icon('arrow-down-to-line')} ${esc(dayLabel(d.dropoff.date || d.pickup.date, t))} ${esc(win(d.dropoff))}<br><span class="muted">${esc(d.dropoff.place || '')}</span></div></div></div>
    <div class="job-facts">${goodsFacts(d)}${d.goods?.text ? `<span class="fact">${icon('package')}${esc(d.goods.text)}</span>` : ''}</div>
    ${d.instructions ? `<div class="job-note">${icon('info')}<span>${esc(d.instructions)}</span></div>` : ''}
    ${d.problem ? `<div class="job-note" style="background:var(--bad-bg)">${icon('triangle-alert')}<span><b>${esc(tProblem(d.problem.code))}</b>${d.problem.note ? ' – ' + esc(d.problem.note) : ''} · ${t('Disposition ist informiert.')}</span></div>` : ''}
    ${d.status !== 'open' ? stepper(d) : ''}
    <div class="job-act">${btn}
      <div class="quick">
        <a href="${esc(mapsHref(target))}" target="_blank" rel="noopener">${icon('navigation')}${qLabel(t('Navi'))}</a>
        ${callNo ? `<a href="${esc(phoneHref(callNo))}">${icon('phone')}${qLabel(t('Anrufen'))}</a>` : `<button data-act="openSheet" data-type="job" data-id="${esc(d.id)}">${icon('phone')}${qLabel(t('Anrufen'))}</button>`}
        <button data-act="openSheet" data-type="note" data-id="${esc(d.id)}">${icon('message-square-text')}${qLabel(t('Notiz') + (d.notes?.length ? ` (${d.notes.length})` : ''))}</button>
        <button class="warn" data-act="openSheet" data-type="problem" data-id="${esc(d.id)}">${icon('triangle-alert')}${qLabel(t('Problem'))}</button>
      </div>
      <div class="row between"><button class="btn btn-ghost btn-sm" data-act="openSheet" data-type="job" data-id="${esc(d.id)}">${icon('file-text')}${t('Alle Details')}</button>${['accepted', 'arrived_pickup'].includes(d.status) ? `<button class="btn btn-ghost btn-sm" data-act="openSheet" data-type="return" data-id="${esc(d.id)}">${icon('undo-2')}${t('Zurückgeben')}</button>` : ''}</div>
    </div></article>`;
}

// quick-action label: wraps onto two lines in long languages (CSS), never cut off
const qLabel = (l) => `<span>${esc(l)}</span>`;
// long city names get a smaller size instead of breaking in the middle of the word (Ludwigsbu-rg)
const cityLen = (c) => { const n = Math.max(...String(c || '').split(/\s+/).map((w) => w.length)); return n > 13 ? 'xlong' : n > 9 ? 'long' : ''; };

function offerCard(app, d, i) {
  const mine = d.driverId === app.me.user.id;
  const isOpen = d.status === 'open';
  return `<div class="offer ${mine && isOpen ? 'mine' : ''} ${app.flash.has(d.id) ? 'flash' : ''}" style="--i:${i}" data-key="offer-${esc(d.id)}">
    <div class="row between">${mine && isOpen ? `<span class="pill brand">${icon('sparkles')}${t('Neu für Sie')}</span>` : pill(d.status)}<span class="mono small muted">${esc(d.bookingNo)}</span></div>
    <div class="route">${routeTitle(d)}</div>
    <div class="row wrap small" style="--gap:8px;font-weight:650">${icon('calendar')} ${esc(dayLabel(d.pickup.date, t))} ${esc(win(d.pickup))}${d.goods?.pallets ? ` · ${d.goods.pallets} ${t('Pal.')}` : ''}${d.goods?.adr ? ' · ADR' : ''}${d.goods?.temp ? ' · ' + esc(d.goods.temp) : ''}</div>
    ${isOpen ? `<div class="row" style="--gap:8px"><button class="btn btn-primary take grow" data-act="step" data-id="${esc(d.id)}" data-step="accepted">${icon('check')}${mine ? t('Buchung bestätigen') : t('Auftrag übernehmen')}</button><button class="btn take" data-act="openSheet" data-type="job" data-id="${esc(d.id)}" aria-label="${t('Details')}">${icon('eye')}</button></div>` : `<button class="btn" data-act="go" data-to="home">${icon('truck')}${t('Zur Fahrt')}</button>`}
  </div>`;
}

function jobsView(app, h) {
  const fresh = h.mine.filter((d) => d.status === 'open');
  const running = h.mine.filter((d) => d.status !== 'open');
  let out = `<div class="page-h"><h2>${t('Aufträge')}</h2></div>`;
  if (fresh.length) out += `<h4>${t('Neu für Sie – bitte bestätigen')}</h4>${fresh.map((d, i) => offerCard(app, d, i)).join('')}`;
  if (running.length) out += `<h4>${t('Meine Touren')}</h4>${running.map((d, i) => offerCard(app, d, i)).join('')}`;
  out += `<h4>${t('Freie Aufträge')}</h4>`;
  out += h.offered.length ? h.offered.map((d, i) => offerCard(app, d, i)).join('') : `<div class="card">${emptyState('list-checks', t('Gerade keine freien Aufträge'), settings(app).driverTakesOpen ? t('Neue Aufträge erscheinen hier – mit Mitteilung.') : t('Ihre Disposition teilt die Aufträge direkt zu.'))}</div>`;
  return out;
}

function historyView(app) {
  const list = app.data.history;
  if (!list) return skeleton();
  return `<div class="page-h"><h2>${t('Verlauf')}</h2><span class="muted small">${t('letzte 30 Tage')}</span></div>
    ${list.length ? `<div class="card list">${list.map((d) => `<button class="li" data-act="openSheet" data-type="job" data-id="${esc(d.id)}" data-key="h-${esc(d.id)}"><span class="avatar">${icon(d.status === 'delivered' ? 'circle-check-big' : 'ban')}</span><div class="grow"><div class="t1 ellip">${routeTitle(d)}</div><div class="t2">${esc(d.bookingNo)} · ${esc(dateTime(d.updatedAt))}${d.waitingMinutes != null ? ' · ' + t('Standzeit {n} Min.', { n: d.waitingMinutes }) : ''}</div></div>${pill(d.status)}</button>`).join('')}</div>` : `<div class="card">${emptyState('history', t('Noch keine abgeschlossenen Touren'))}</div>`}`;
}

function moreView(app, h) {
  const me = h.me;
  const push = app.api.push;
  return `<div class="page-h"><h2>${t('Mehr')}</h2></div>
    <section class="card pad stack"><div class="row"><span class="avatar lg">${esc((me.name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2))}</span><div class="grow"><h3>${esc(me.name)}</h3><p class="small muted">${esc(fmtPhone(me.phone))}${me.licenseClass ? ' · ' + t('Klasse {k}', { k: esc(me.licenseClass) }) : ''}</p></div></div>
      ${h.tenant?.phone ? `<a class="btn btn-primary btn-lg two-line" href="${esc(phoneHref(h.tenant.phone))}">${icon('phone')}<span><b>${t('Disposition anrufen')}</b><small>${esc(fmtPhone(h.tenant.phone))}</small></span></a>` : ''}</section>
    <section class="card pad stack"><h4>${icon('languages')} ${t('Sprache')}</h4>${langPicker(app, 'chips lang-chips')}</section>
    ${push && push.supported() ? `<section class="card pad stack"><h4>${icon('bell-ring')} ${t('Mitteilungen')}</h4>
      <label class="switch"><input type="checkbox" data-input="pushToggle" ${app.ui.pushState === 'on' ? 'checked' : ''} ${app.ui.pushState === 'blocked' ? 'disabled' : ''}><span class="grow"><b>${t('Push-Mitteilungen auf diesem Handy')}</b><small>${app.ui.pushState === 'blocked' ? t('Mitteilungen wurden im Browser blockiert') : t('Neue Aufträge und Änderungen kommen als Push-Mitteilung – auch wenn die App geschlossen ist.')}</small></span></label></section>` : ''}
    <section class="card pad stack"><h4>${icon('shield-check')} ${t('Sicherheit & Datenschutz')}</h4>
      <p class="small">${t('Bitte die App nur im Stand mit ausgeschaltetem Motor bedienen (§ 23 StVO). Während der Fahrt sperrt sie sich selbst.')}</p>
      ${settings(app).driveLock ? `<p class="small muted">${app.ui.lockPerm === 'denied' ? t('Die Fahrsperre ist aus, weil der Standort im Browser blockiert ist. Bitte in den Browser-Einstellungen erlauben.') : t('Für die Fahrsperre wertet die App die Geschwindigkeit nur auf diesem Handy aus. Der Standort wird dafür weder gespeichert noch gesendet.')}</p>` : ''}
      ${settings(app).geoOnStatus ? `<label class="switch"><input type="checkbox" data-input="geoToggle" ${me.geoConsent ? 'checked' : ''}><span class="grow"><b>${t('Standort beim Status-Tipp teilen')}</b><small>${t('Nur im Moment des Tipps, keine Dauerortung. Freiwillig.')}</small></span></label>` : `<p class="small muted">${t('Ihr Standort wird nicht gespeichert.')}</p>`}</section>
    ${app.queue ? `<div class="banner bad">${icon('wifi-off')}<span class="grow">${t('{n} Schritt(e) sind noch nicht gesendet. Bitte erst mit Netz abmelden.', { n: app.queue })}</span></div>` : ''}
    <button class="btn btn-danger btn-lg" data-act="${app.queue ? 'noop' : 'logout'}" ${app.queue ? 'disabled' : ''}>${icon('log-out')}${t('Abmelden')}</button>`;
}

// ---------- overlays ----------
function undoBar(app) {
  const u = app.ui.undo;
  if (!u || u.until < Date.now() || !app.online) return ''; // undo needs the server: only offered online
  const rest = Math.max(1, Math.round((u.until - Date.now()) / 1000));
  return `<div class="undo" data-key="undo-${esc(u.id)}-${u.until}"><svg class="ring" viewBox="0 0 24 24" style="--dur:${rest}s"><circle cx="12" cy="12" r="10"/></svg><span class="ellip">${esc(u.label)}</span><button data-act="undo" data-id="${esc(u.id)}">${icon('rotate-ccw')}${t('Rückgängig')}</button></div>`;
}
function successView(app) {
  const s = app.ui.success;
  if (!s) return '';
  return `<div class="success" data-key="success-${s.n}"><div class="burst"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></div>`;
}
function lockView(app) {
  if (!(app.ui.locked && settings(app).driveLock)) return '';
  return `<div class="lockcover" data-key="lock">${icon('octagon-x')}<h2>${t('Während der Fahrt gesperrt')}</h2><p style="max-width:30ch;opacity:.85;font-weight:600">${t('Bitte anhalten und den Motor ausschalten. Die Knöpfe sind wieder da, sobald der LKW steht (§ 23 StVO).')}</p></div>`;
}

// ---------- sheets ----------
function sheetView(app) {
  const s = app.ui.sheet;
  if (!s) return '';
  const d = app.data.job && app.data.job.id === s.id ? app.data.job : null;
  if (s.type === 'vehicle') return vehicleSheet(app);
  if (s.type === 'notifications') return notificationsSheet(app);
  if (!d) return sheet({ title: s.missing ? t('Keine Verbindung.') : t('Laden …'), body: s.missing ? offlineBody() : skeleton() });
  if (s.type === 'job') return jobSheet(app, d);
  if (s.type === 'pod') return podSheet(app, d);
  if (s.type === 'pallets') return palletsSheet(app, d);
  if (s.type === 'note') return noteSheet(app, d);
  if (s.type === 'problem') return problemSheet(app, d);
  if (s.type === 'return') return returnSheet(app, d);
  return '';
}

function vehicleSheet(app) {
  const vs = app.data.vehicles;
  if (!vs) return sheet({ title: t('Fahrzeug wählen'), body: app.ui.sheet?.missing ? offlineBody() : skeleton() });
  const tile = (v) => `<button class="tile" data-act="pickVehicle" data-id="${esc(v.id)}" data-kind="${v.kind}" aria-pressed="${v.mine}" ${v.available || v.mine ? '' : 'disabled'} data-key="v-${esc(v.id)}">
      ${icon(VEHICLE_ICON[v.type] || 'truck', 'big')}${plate(v.plate, 'lg')}<span class="tt">${esc(v.name || vehicleTypeText(v.type))}</span>
      <span class="xs muted">${v.status === 'workshop' ? icon('wrench') + ' ' + t('Werkstatt') : v.busy ? icon('circle-user') + ' ' + t('fährt {n}', { n: esc(v.driverName) }) : (v.features || []).map(featureText).join(' · ') || vehicleTypeText(v.type)}</span></button>`;
  const trucks = vs.filter((v) => v.kind === 'truck'), trailers = vs.filter((v) => v.kind === 'trailer');
  const hasTrailer = trailers.some((v) => v.mine);
  return sheet({
    title: t('Fahrzeug wählen'), sub: t('Belegte Fahrzeuge sind ausgegraut.'),
    body: `<div class="section-t">${icon('truck')} ${t('LKW / Zugmaschine')}</div><div class="tiles">${trucks.map(tile).join('')}</div>
      ${trailers.length ? `<div class="section-t">${icon('container')} ${t('Auflieger / Anhänger')}</div><div class="tiles"><button class="tile" data-act="pickVehicle" data-id="" data-kind="trailer" aria-pressed="${!hasTrailer}">${icon('ban', 'big')}<b>${t('Ohne Auflieger')}</b><span class="tt">${t('Solo fahren')}</span></button>${trailers.map(tile).join('')}</div>` : ''}`,
    foot: `<button class="btn btn-ghost" data-act="releaseVehicle">${icon('log-out')}${t('Fahrzeug abgeben')}</button><button class="btn btn-primary" data-act="close">${icon('check')}${t('Fertig')}</button>`,
  });
}

function jobSheet(app, d) {
  return sheet({
    title: `${routeTitle(d)}`, sub: `${esc(d.bookingNo)}${d.customer ? ' · ' + esc(d.customer) : ''}${d.reference ? ' · ' + t('Ref.') + ' ' + esc(d.reference) : ''}`,
    body: `<div class="row wrap">${pill(d.status)}${problemPill(d.problem)}${d.vehiclePlate ? plate(d.vehiclePlate) : ''}${d.trailerPlate ? plate(d.trailerPlate) : ''}</div>
      ${placeBlock(d.pickup, 'pickup')}<div class="place"><span class="line"></span></div>${placeBlock(d.dropoff, 'dropoff')}
      <div class="row wrap">${goodsFacts(d)}${d.goods?.text ? `<span class="fact">${icon('package')}${esc(d.goods.text)}</span>` : ''}</div>
      ${d.instructions ? `<div class="banner info">${icon('info')}<span class="grow">${esc(d.instructions)}</span></div>` : ''}
      <div class="section-t">${t('Dokumente')}</div>${docsGrid(app, d)}
      <div class="section-t">${t('Notizen')}</div>${notesThread(app, d)}
      <div class="section-t">${t('Verlauf')}</div>${timeline(d)}`,
    foot: d.status === 'open' ? `<button class="btn btn-primary btn-lg btn-block" data-act="step" data-id="${esc(d.id)}" data-step="accepted">${icon('check')}${d.driverId ? t('Buchung bestätigen') : t('Auftrag übernehmen')}</button>` : `<button class="btn" data-act="openSheet" data-type="note" data-id="${esc(d.id)}">${icon('message-square-text')}${t('Notiz')}</button><button class="btn btn-primary" data-act="close">${t('Schließen')}</button>`,
  });
}

function podSheet(app, d) {
  const s = settings(app);
  const pods = (d.docs || []).filter((x) => x.kind === 'pod');
  const busy = app.ui.uploading;
  const addTile = `<label class="doc add" data-key="pod-add">${icon(busy ? 'refresh-cw' : 'camera')}<span>${busy ? t('Wird hochgeladen …') : pods.length ? t('Weitere Seite') : t('Lieferschein fotografieren')}</span><input class="sr" type="file" accept="image/*,application/pdf" capture="environment" multiple data-input="podFile" data-id="${esc(d.id)}"></label>`;
  const needSig = signatureMissing(app, d);
  const ready = (pods.length || !s.requirePod) && !needSig;
  return sheet({
    key: 'pod', title: t('Abschluss'), sub: `${esc(d.bookingNo)} · ${routeTitle(d)}`,
    body: `<div class="section-t">1 · ${t('Lieferschein')}</div>${docsGrid(app, { ...d, docs: pods }, { removable: true, add: addTile })}
      ${app.api.mode === 'demo' ? `<button class="btn btn-sm" data-act="demoPod" data-id="${esc(d.id)}">${icon('sparkles')}${t('Demo: Beispiel-Lieferschein verwenden')}</button>` : ''}
      <div class="section-t">2 · ${t('Empfänger')}</div>
      <label class="field"><span>${t('Name des Empfängers')}${s.requireSignature ? '' : ' (' + t('optional') + ')'}</span><input class="input" id="pod-receiver" name="receiver" value="${esc(app.ui.receiver || d.receiver || '')}" placeholder="${t('z. B. Lager Süd, Herr Jensen')}"></label>
      ${s.requireSignature || app.ui.wantSig ? `<div class="field"><span>${t('Unterschrift')}</span><canvas class="sig" data-keep data-key="sig-${esc(d.id)}"></canvas><span class="hint">${t('Die Unterschrift wird nur als Empfangsnachweis für diese Lieferung gespeichert und an {firma} übermittelt.', { firma: esc(app.data.home?.tenant?.name || '') })}</span><button class="btn btn-ghost btn-sm" data-act="sigClear">${icon('rotate-ccw')}${t('Neu unterschreiben')}</button></div>` : `<button class="btn btn-ghost btn-sm" data-act="wantSig">${icon('signature')}${t('Unterschrift aufnehmen')}</button>`}`,
    foot: `<button class="step-btn ok" style="min-height:76px;${ready ? '' : 'opacity:.5'}" data-act="finish" data-id="${esc(d.id)}" ${ready ? '' : 'disabled'}><span class="si">${icon('circle-check-big')}</span><span><b>${tStep('delivered')}</b><small>${ready ? t('Lieferschein geht sofort ins Büro') : !(pods.length || !s.requirePod) ? t('Bitte zuerst den Lieferschein fotografieren') : t('Bitte den Empfänger unterschreiben lassen.')}</small></span></button>`,
  });
}

// "Unterschrift Pflicht": checked on the phone too, so a dead zone cannot skip it
function signatureMissing(app, d) {
  if (!settings(app).requireSignature || d.signatureFileId) return false;
  if ((d.docs || []).some((x) => x.kind === 'signature' && x.queued)) return false;
  return !app._sig || app._sig.isEmpty();
}

function palletsSheet(app, d) {
  const f = app.ui.form || { given: d.goods?.pallets || 0, taken: d.goods?.pallets || 0 };
  app.ui.form = f;
  const st = (k, l) => `<div class="field"><span>${l}</span><div class="stepper"><button data-act="palAdj" data-k="${k}" data-v="-1">−</button><output>${f[k]}</output><button data-act="palAdj" data-k="${k}" data-v="1">+</button></div></div>`;
  return sheet({
    key: 'pallets', title: t('Palettentausch'), sub: t('EUR-Paletten beim Abladen'),
    body: `${st('given', t('Abgegeben'))}${st('taken', t('Mitgenommen (leer)'))}<p class="small muted">${t('Ohne Tausch einfach beide Zahlen auf 0 setzen.')}</p>`,
    foot: `<button class="step-btn" data-act="commitStep" data-id="${esc(d.id)}" data-step="unloaded"><span class="si">${icon('arrow-down-to-line')}</span><span><b>${tStep('unloaded')}</b><small>${t('{g} abgegeben · {t} mitgenommen', { g: f.given, t: f.taken })}</small></span></button>`,
  });
}

function noteSheet(app, d) {
  return sheet({
    key: 'note', title: t('Notiz an die Disposition'), sub: `${esc(d.bookingNo)} · ${routeTitle(d)}`,
    body: `${notesThread(app, d)}<div class="chips">${noteShortcuts().map((x) => `<button class="chip" data-act="noteChip" data-text="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <form id="noteForm" data-form="note" data-id="${esc(d.id)}" class="stack"><textarea class="input" id="note-text" name="text" rows="3" placeholder="${t('Kurz schreiben …')}" required></textarea></form>`,
    foot: `<button class="btn btn-primary btn-lg btn-block" type="submit" form="noteForm">${icon('send')}${t('Senden')}</button>`,
  });
}

function problemSheet(app, d) {
  const f = app.ui.form || {};
  return sheet({
    key: 'problem', title: t('Problem melden'), sub: t('Die Disposition bekommt sofort eine dringende Mitteilung.'),
    body: `<div class="pgrid">${problemCodes().map((c) => `<button data-act="pickProblem" data-code="${c}" aria-pressed="${f.code === c}">${icon(PROBLEM_ICON[c])}${esc(tProblem(c))}</button>`).join('')}</div>
      <form id="problemForm" data-form="problem" data-id="${esc(d.id)}" class="stack"><textarea class="input" name="note" id="problem-note" rows="2" placeholder="${t('Was ist passiert? (optional)')}"></textarea>
      <label class="btn">${icon('camera')}${f.fileName ? esc(f.fileName) : t('Foto hinzufügen (optional)')}<input class="sr" type="file" accept="image/*" capture="environment" data-input="problemFile"></label></form>`,
    foot: `<button class="btn btn-danger btn-lg btn-block" type="submit" form="problemForm" ${f.code ? '' : 'disabled'}>${icon('triangle-alert')}${t('Jetzt melden')}</button>`,
  });
}

function returnSheet(app, d) {
  return sheet({
    key: 'return', title: t('Auftrag zurückgeben'), sub: `${esc(d.bookingNo)} · ${routeTitle(d)}`,
    body: `<p>${t('Die Disposition wird sofort informiert und vergibt die Tour neu.')}</p><form id="returnForm" data-form="return" data-id="${esc(d.id)}"><label class="field"><span>${t('Grund')}</span><textarea class="input" name="reason" required placeholder="${t('z. B. krank, LKW defekt, Lenkzeit erreicht')}"></textarea></label></form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-danger" type="submit" form="returnForm">${icon('undo-2')}${t('Zurückgeben')}</button>`,
  });
}

function notificationsSheet(app) {
  const ns = app.data.notes;
  return sheet({
    key: 'notifications', title: t('Mitteilungen'),
    body: !ns ? (app.ui.sheet?.missing ? offlineBody() : skeleton()) : ns.length ? `<div class="list card">${ns.map((n) => `<button class="li ${n.read ? '' : 'unread'}" data-act="openNotification" data-id="${esc(n.deliveryId || '')}"><span class="avatar">${icon(n.priority === 'high' ? 'triangle-alert' : 'bell')}</span><div class="grow"><div class="t1">${esc(n.title)}</div><div class="t2">${esc(n.body)} · ${esc(dateTime(n.at))}</div></div></button>`).join('')}</div>` : emptyState('bell', t('Keine Mitteilungen')),
    foot: `<button class="btn" data-act="markRead">${icon('check')}${t('Alle gelesen')}</button>`,
  });
}

export function mounted(app) {
  const c = app.root.querySelector('canvas.sig');
  if (c && app._sigCanvas !== c) { app._sig?.destroy(); app._sigCanvas = c; app._sig = signaturePad(c, { onChange: () => app.invalidate() }); }
  if (!c && app._sig) { app._sig.destroy(); app._sig = null; app._sigCanvas = null; }
}

// ---------- driving lock (§ 23 StVO) ----------
// The speed comes from the phone's location, evaluated on the phone only – never stored or sent.
// Independent of "store the position at a status change": the lock needs the permission, not consent
// to storage, so the driver is asked once with an explanation (card on the start screen).
const LOCK_OK = 'lk.lockOk';
function watchDriving(app) {
  if (!settings(app).driveLock || !navigator.geolocation || app.api.mode === 'demo') return stopWatch(app); // office switched it off: unlock now
  if (app._watching || app._lockPermAsked) return;
  app._lockPermAsked = true;
  // without the Permissions API (older iPhones) a former "allow" is remembered, else the card asks after a tap
  const fallback = () => {
    let ok = false;
    try { ok = localStorage.getItem(LOCK_OK) === '1'; } catch { /* storage blocked */ }
    if (ok) startWatch(app); else if (app.ui.lockPerm !== 'prompt') { app.ui.lockPerm = 'prompt'; app.invalidate(); }
  };
  if (!navigator.permissions?.query) return fallback();
  navigator.permissions.query({ name: 'geolocation' }).then((r) => {
    const upd = () => { const was = app.ui.lockPerm; app.ui.lockPerm = r.state; if (r.state === 'granted') startWatch(app); if (was !== r.state) app.invalidate(); };
    r.onchange = upd; upd();
  }).catch(fallback);
}
function stopWatch(app) {
  if (app._geoWatch != null) navigator.geolocation?.clearWatch(app._geoWatch);
  app._geoWatch = null; app._watching = false; app._lockPermAsked = false;
  if (app.ui.locked) { app.ui.locked = false; app.invalidate(); }
}
function startWatch(app) {
  if (app._watching || !settings(app).driveLock) return;
  app._watching = true;
  let fast = 0, slowSince = 0;
  app._geoWatch = navigator.geolocation.watchPosition((p) => {
    if (!settings(app).driveLock) return stopWatch(app);
    const v = p.coords.speed; // m/s
    if (v == null) return;
    if (v > 2.3) { fast++; slowSince = 0; if (fast >= 2 && !app.ui.locked) { app.ui.locked = true; app.render(); } }
    else if (v < 0.9) { fast = 0; if (!slowSince) slowSince = Date.now(); if (app.ui.locked && Date.now() - slowSince > 5000) { app.ui.locked = false; app.render(); } }
  }, (err) => { if (err?.code === 1) { stopWatch(app); app._lockPermAsked = true; app.ui.lockPerm = 'denied'; try { localStorage.removeItem(LOCK_OK); } catch { /* */ } app.invalidate(); } }, { enableHighAccuracy: true, maximumAge: 5000 });
}
const LOCK_LATER = 'lk.lockLater';
function lockNeedsPermission(app) {
  if (!settings(app).driveLock || app.api.mode === 'demo' || app.ui.lockPerm !== 'prompt') return false;
  try { if (Number(localStorage.getItem(LOCK_LATER) || 0) > Date.now()) return false; } catch { /* storage blocked */ }
  return true;
}
function position(app) {
  if (!settings(app).geoOnStatus || !app.data.home?.me?.geoConsent || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((r) => navigator.geolocation.getCurrentPosition((p) => r({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }), () => r(undefined), { timeout: 5000, maximumAge: 60000 }));
}

// ---------- actions ----------
let successN = 0;
// one tap = one call: a second tap while the first is on its way is ignored (no duplicate step)
const busy = new Set();
async function once(key, fn) {
  if (busy.has(key)) return;
  busy.add(key);
  try { return await fn(); } finally { busy.delete(key); }
}
async function doStep(app, id, step, extra = {}) {
  const at = Date.now(); // the tap, not the moment the position is known or the server hears it (C2)
  const geo = await position(app);
  const method = step === 'accepted' ? 'acceptDelivery' : 'advanceDelivery';
  const r = await app.call(method, { id, step, geo, at, ...extra }, { queuedToast: false });
  if (!r) return;
  const queued = r.queued;
  app.ui.sheet = null; app.ui.form = null;
  app.ui.success = { n: ++successN, title: tStatus(step), body: queued ? t('Gespeichert – wird gesendet, sobald Netz da ist') : t('Disposition ist informiert · {t}', { t: time(Date.now()) }) };
  // undo needs the server (2-minute window from the server's time stamp) – not offered for queued steps
  if (!queued) app.ui.undo = { id, until: Date.now() + 120000, label: `${tStatus(step)} · ${time(Date.now())}` };
  else { applyLocalStep(app, app.data.home, id, step, at); if (app.ui.undo?.id === id) app.ui.undo = null; }
  app.render();
  setTimeout(() => { app.ui.success = null; app.render(); }, 1500);
  setTimeout(() => { if (app.ui.undo && app.ui.undo.until <= Date.now() + 50) { app.ui.undo = null; app.render(); } }, 120100);
  if (step === 'accepted' && app.route.name !== 'home') app.go('home');
  app.load();
}

async function upload(app, file, opts) {
  const blob = await compressPhoto(file, app.api.mode === 'demo' ? { max: 1100, quality: 0.6 } : {});
  return app.api.upload(blob, { name: file.name || 'foto.jpg', ...opts });
}

export const actions = {
  noop: () => {},
  lockAllow(el, ev, app) {
    // the browser shows its own question (after this tap); the lock starts once allowed
    navigator.geolocation?.getCurrentPosition(() => {
      app.ui.lockPerm = 'granted';
      try { localStorage.setItem(LOCK_OK, '1'); } catch { /* storage blocked */ }
      startWatch(app); app.render();
    }, (err) => { if (err?.code === 1) app.ui.lockPerm = 'denied'; app.render(); }, { timeout: 15000 });
  },
  dismissFailed: async (el, ev, app) => { await app.api.clearFailed?.(); app.ui.failed = []; app.render(); },
  lockLater(el, ev, app) { try { localStorage.setItem(LOCK_LATER, String(Date.now() + 7 * 864e5)); } catch { /* storage blocked */ } app.ui.lockPerm = 'later'; app.render(); },
  async geoConsent(el, ev, app) {
    const v = el.dataset.v === '1';
    if (v && navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 8000 });
    await app.call('updateProfile', { geoConsent: v }).catch(() => null);
    app.load();
  },
  openSheet: (el, ev, app) => { app.ui.form = null; app.open({ type: el.dataset.type, id: el.dataset.id || null }); },
  async step(el, ev, app) {
    const { id, step } = el.dataset;
    const s = settings(app);
    if (app.ui.locked && s.driveLock) return;
    if (step === 'delivered') return app.open({ type: 'pod', id });
    if (step === 'unloaded' && s.palletExchange) { app.ui.form = null; return app.open({ type: 'pallets', id }); }
    await once('step:' + id, async () => {
      el.classList.add('is-busy');
      await doStep(app, id, step).catch(() => {});
      el.classList.remove('is-busy');
    });
  },
  commitStep: (el, ev, app) => once('step:' + el.dataset.id, () => doStep(app, el.dataset.id, el.dataset.step, el.dataset.step === 'unloaded' && app.ui.form ? { palletExchange: { given: app.ui.form.given, taken: app.ui.form.taken } } : {}).catch(() => {})),
  palAdj: (el, ev, app) => { const f = app.ui.form; f[el.dataset.k] = Math.max(0, Math.min(99, f[el.dataset.k] + Number(el.dataset.v))); app.render(); },
  undo: (el, ev, app) => once('undo:' + el.dataset.id, async () => {
    // only with network: an undo that is not confirmed by the server is never reported as done
    const noNet = () => app.toast({ title: t('Rückgängig geht nur mit Netz.'), plain: true, err: true, icon: 'wifi-off' });
    if (!app.online) return noNet();
    let r = null;
    try { r = await app.call('undoStep', { id: el.dataset.id }, { quiet: true }); } catch (e) {
      if (e.code === 'network') return noNet();
      if (e.code !== 'unauthorized') app.error(e);
    }
    app.ui.undo = null;
    if (r?.status) app.toast({ title: t('Rückgängig gemacht – wieder „{s}“', { s: tStatus(r.status) }), plain: true, icon: 'rotate-ccw' });
    app.load();
  }),
  async pickVehicle(el, ev, app) {
    const kind = el.dataset.kind, id = el.dataset.id || null;
    const r = await app.call('selectVehicle', kind === 'truck' ? { vehicleId: id } : { trailerId: id }).catch(() => null);
    if (r) { app.toast({ title: t('Fahrzeug gespeichert'), plain: true, icon: 'check', ms: 1800 }); await refreshSheetData(app); app.load(); }
  },
  async releaseVehicle(el, ev, app) { await app.call('releaseVehicle', {}).catch(() => null); app.close(); app.load(); },
  noteChip: (el, ev, app) => { const ta = app.root.querySelector('#note-text'); if (ta) { ta.value = (ta.value ? ta.value + ' ' : '') + el.dataset.text; ta.focus(); } },
  pickProblem: (el, ev, app) => { app.ui.form = { ...(app.ui.form || {}), code: el.dataset.code }; app.render(); },
  wantSig: (el, ev, app) => { app.ui.receiver = app.root.querySelector('#pod-receiver')?.value || ''; app.ui.wantSig = true; app.render(); },
  sigClear: (el, ev, app) => app._sig?.clear(),
  async demoPod(el, ev, app) {
    const d = app.data.job;
    const { podSvg } = await import('../../../core/seed.js');
    const src = podSvg({ no: d.bookingNo, customer: d.customer, from: `${d.pickup.place || ''}, ${d.pickup.city}`, to: `${d.dropoff.place || ''}, ${d.dropoff.city}`, goods: d.goods?.text, pallets: d.goods?.pallets, date: new Date().toLocaleDateString('de-DE'), receiver: app.root.querySelector('#pod-receiver')?.value || '', tilt: -2 });
    app.ui.uploading = true; app.render();
    try { const blob = await rasterize(src, { width: 900, quality: 0.62 }); await app.api.upload(blob, { kind: 'pod', deliveryId: d.id, name: 'Lieferschein.jpg' }); } catch (e) { app.error(e); }
    app.ui.uploading = false; await refreshSheetData(app); app.render();
  },
  async removeDoc(el, ev, app) { await app.call('removeDoc', { id: el.dataset.id, fileId: el.dataset.file }).catch(() => null); await refreshSheetData(app); app.render(); },
  finish: (el, ev, app) => once('step:' + app.data.job?.id, async () => {
    const d = app.data.job;
    if (!d) return;
    if (signatureMissing(app, d)) return app.error({ message: 'Bitte den Empfänger unterschreiben lassen.' });
    const receiver = app.root.querySelector('#pod-receiver')?.value || '';
    let signatureFileId;
    try {
      // uploaded to the delivery, so it is queued with the step in a dead zone and found by the server
      if (app._sig && !app._sig.isEmpty()) { const b = await app._sig.toBlob(); const f = await app.api.upload(b, { kind: 'signature', deliveryId: d.id, name: 'unterschrift.png' }); if (!f.queued) signatureFileId = f.id; }
    } catch (e) { return app.error(e); }
    app.ui.receiver = ''; app.ui.wantSig = false;
    await doStep(app, d.id, 'delivered', { receiver, signatureFileId }).catch(() => {});
  }),
  async openNotification(el, ev, app) { if (el.dataset.id) app.open({ type: 'job', id: el.dataset.id }); },
  async markRead(el, ev, app) { await app.call('markNotificationsRead', {}).catch(() => null); app.me.unread = 0; await refreshSheetData(app); app.render(); },
};
async function pushStatus(app) {
  const st = await app.api.push?.status?.().catch(() => 'off');
  if (st && st !== app.ui.pushState) { app.ui.pushState = st; app.invalidate(); }
}

export const inputs = {
  async geoToggle(el, ev, app) { if (ev.type !== 'change') return; await app.call('updateProfile', { geoConsent: el.checked }).catch(() => null); app.load(); },
  // in-app switch: push on/off for this phone (off is remembered, no silent re-subscribe then)
  async pushToggle(el, ev, app) {
    if (ev.type !== 'change') return;
    try {
      if (el.checked) { const r = await app.api.push.enable(); app.toast({ title: r === 'granted' ? t('Mitteilungen sind an') : t('Mitteilungen wurden im Browser blockiert'), plain: true, icon: 'bell' }); }
      else { await app.api.push.disable({ byUser: true }); app.toast({ title: t('Mitteilungen sind aus'), plain: true, icon: 'bell' }); }
    } catch (e) { app.error(e); }
    await pushStatus(app);
    app.render();
  },
  async podFile(el, ev, app) {
    if (ev.type !== 'change' || !el.files?.length) return;
    app.ui.receiver = app.root.querySelector('#pod-receiver')?.value || app.ui.receiver;
    app.ui.uploading = true; app.render();
    try {
      for (const f of el.files) {
        const r = await upload(app, f, { kind: 'pod', deliveryId: el.dataset.id });
        if (r?.queued) addLocalDoc(app, el.dataset.id, { fileId: r.id, kind: 'pod', localUrl: r.localUrl, queued: true, at: Date.now(), mime: 'image/jpeg' });
      }
    } catch (e) { app.error(e); }
    app.ui.uploading = false; el.value = '';
    await refreshSheetData(app); app.render();
  },
  problemFile(el, ev, app) { if (ev.type !== 'change' || !el.files?.length) return; app.ui.form = { ...(app.ui.form || {}), file: el.files[0], fileName: el.files[0].name }; app.render(); },
};

export const forms = {
  async note(fd, form, app) {
    const id = form.dataset.id;
    const r = await app.call('addNote', { id, text: fd.get('text') });
    if (r) { form.reset(); app.toast({ title: t('Notiz gesendet'), plain: true, icon: 'send', ms: 1800 }); await refreshSheetData(app); app.render(); }
  },
  async problem(fd, form, app) {
    const id = form.dataset.id; const f = app.ui.form || {};
    let fileId, photo = false;
    // the photo belongs to the delivery – in a dead zone it waits in the outbox, before the report
    if (f.file) { const up = await upload(app, f.file, { kind: 'damage', deliveryId: id }).catch((e) => { app.error(e); return null; }); if (up?.queued) photo = true; else fileId = up?.id; }
    const at = Date.now();
    const r = await app.call('reportProblem', { id, code: f.code, note: fd.get('note'), fileId, photo, at, geo: await position(app) });
    if (r) { app.ui.form = null; app.close(); app.toast({ title: t('Problem gemeldet – die Disposition ist informiert'), plain: true, icon: 'triangle-alert' }); app.load(); }
  },
  async return(fd, form, app) {
    const r = await app.call('returnDelivery', { id: form.dataset.id, reason: fd.get('reason') });
    if (r) { app.close(); app.toast({ title: t('Zurückgegeben'), plain: true, icon: 'undo-2' }); app.load(); }
  },
};
