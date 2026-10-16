// Licensor console: revenue, licensees and their licence state, seats, billing run, plans.
// Deliberately shows usage numbers only – never delivery content or driver names (AVV).
import { icon, esc, sheet, emptyState, avatar } from './common.js';
import { t } from '../i18n.js';
import { dateTime, euro, ago, num, isoToday } from '../format.js';
import { PLANS, STORE_APP } from '../../../core/engine.js';
import { WORDMARK } from './login.js';

export const routes = ['overview', 'tenants', 'billing', 'plans'];
export const defaultRoute = () => 'overview';
const PLAN_COLOR = { start: '#7b8ba1', flotte: '#e6cd92', premium: '#c8a45c' };
const STATE = () => ({ trial: [t('Test'), 'info'], active: [t('Aktiv'), 'ok'], suspended: [t('Gesperrt'), 'bad'], expired: [t('Abgelaufen'), 'warn'], cancelled: [t('Gekündigt'), ''] });

export async function load(app) {
  const r = app.route.name;
  const jobs = [app.api.call('platformStats').then((x) => { app.data.stats = x; }), app.api.call('listTenants').then((x) => { app.data.tenants = x; })];
  if (r === 'billing') jobs.push(app.api.call('billingRun', { month: app.ui.bmonth }).then((x) => { app.data.billing = x; }));
  await Promise.all(jobs);
  if (app.ui.sheet?.type === 'tenant') app.data.tenant = await app.api.call('getTenantLicense', { id: app.ui.sheet.id }).catch(() => null);
}
export async function refreshSheet(app) { if (app.ui.sheet?.type === 'tenant') { app.data.tenant = await app.api.call('getTenantLicense', { id: app.ui.sheet.id }).catch(() => null); app.invalidate(); } }
export const sheetOpened = refreshSheet;

export function render(app) {
  const r = app.route.name;
  const nav = [['overview', 'gauge', t('Übersicht')], ['tenants', 'building-2', t('Lizenznehmer')], ['billing', 'receipt-text', t('Abrechnung')], ['plans', 'layers', t('Tarife')]];
  return `<div class="shell" data-key="pshell">
    <aside class="rail"><div class="brandmark">${WORDMARK.replace('LADEKLAR</span>', '</span>')}<div><div class="title">LADEKLAR</div><div class="sub">${t('Lizenzgeber-Konsole')}</div></div></div>
      ${nav.map(([k, ic, l]) => `<button class="nav" data-act="go" data-to="${k}" aria-current="${r === k ? 'page' : 'false'}">${icon(ic)}${esc(l)}</button>`).join('')}
      <div class="foot"><div class="row">${avatar(app.me.user.name)}<div class="grow"><div class="ellip" style="font-weight:750">${esc(app.me.user.name)}</div><div class="xs" style="color:var(--on-ink-2)">${esc(app.me.user.email)}</div></div><button class="ibtn" data-act="openAccount" aria-label="${t('Mein Konto')}" title="${t('Mein Konto')}">${icon('key-round')}</button><button class="ibtn" data-act="logout" aria-label="${t('Abmelden')}">${icon('log-out')}</button></div></div></aside>
    <header class="topbar"><div class="brandmark">${WORDMARK}</div><span class="grow"></span><button class="btn btn-primary" data-act="newTenant">${icon('plus')}<span>${t('Lizenznehmer anlegen')}</span></button></header>
    <main class="main" data-key="pmain-${r}"><div class="page">${r === 'tenants' ? tenantsPage(app) : r === 'billing' ? billingPage(app) : r === 'plans' ? plansPage(app) : overviewPage(app)}</div></main>
    <nav class="tabbar">${nav.map(([k, ic, l]) => `<button data-act="go" data-to="${k}" aria-current="${r === k ? 'page' : 'false'}">${icon(ic)}${esc(l)}</button>`).join('')}<button data-act="openAccount">${icon('circle-user')}${t('Konto')}</button></nav>
    ${sheetView(app)}</div>`;
}
const sk = (h) => `<div class="sk" style="height:${h}px"></div>`;
const statePill = (s) => { const [l, c] = STATE()[s] || [s, '']; return `<span class="pill ${c}">${esc(l)}</span>`; };
const tlogo = (app, x) => `<span class="tlogo">${x.branding?.logoFileId ? `<img src="${esc(app.fileUrl(x.branding.logoFileId))}" alt="">` : esc(x.name.slice(0, 2))}</span>`;

function overviewPage(app) {
  const s = app.data.stats, ts = app.data.tenants;
  const head = `<div class="page-h"><div><span class="eyebrow">${t('Lizenzgeber')}</span><h1>${t('Ihr Geschäft auf einen Blick')}</h1></div><button class="btn btn-primary" data-act="newTenant">${icon('plus')}${t('Lizenznehmer anlegen')}</button></div>`;
  if (!s || !ts) return head + sk(200) + sk(260);
  const total = Object.values(s.byPlan).reduce((a, b) => a + b, 0) || 1;
  return `${head}
    <section class="mrr"><div><div class="lbl">${t('Monatlich wiederkehrender Umsatz (MRR, netto)')}</div><div class="big">${euro(s.mrr)}</div><div class="lbl">${t('ARR')} ${euro(s.arr)}</div></div>
      <div><div class="sm">${s.active}</div><div class="lbl">${t('aktive Lizenzen')}</div></div><div><div class="sm">${s.trial}</div><div class="lbl">${t('in der Testphase')}</div></div><div><div class="sm">${num(s.drivers)}</div><div class="lbl">${t('Fahrer auf der Plattform')}</div></div>
      <div style="grid-column:1/-1" class="stack"><div class="planbar">${Object.entries(s.byPlan).map(([k, n]) => `<i style="width:${(n / total) * 100}%;background:${PLAN_COLOR[k]}"></i>`).join('')}</div><div class="legend">${Object.entries(s.byPlan).map(([k, n]) => `<span style="--c:${PLAN_COLOR[k]}">${esc(PLANS[k].name)} · ${n}</span>`).join('')}<span style="--c:transparent">${t('{n} Lieferungen diesen Monat', { n: num(s.deliveriesMonth) })}</span></div></div></section>
    <div class="kpis">
      <div class="kpi info" style="cursor:default"><span class="k-ic">${icon('building-2')}</span><span class="k-v">${s.tenants}</span><span class="k-l">${t('Lizenznehmer gesamt')}</span></div>
      <div class="kpi ok" style="cursor:default"><span class="k-ic">${icon('package-check')}</span><span class="k-v">${num(s.deliveriesMonth)}</span><span class="k-l">${t('Lieferungen im Monat')}</span></div>
      <div class="kpi warn" style="cursor:default"><span class="k-ic">${icon('hourglass')}</span><span class="k-v">${s.trialEndingSoon.length}</span><span class="k-l">${t('Test endet in 7 Tagen')}</span></div>
      <div class="kpi bad" style="cursor:default"><span class="k-ic">${icon('lock')}</span><span class="k-v">${s.suspended}</span><span class="k-l">${t('gesperrt')}</span></div></div>
    ${s.trialEndingSoon.length ? `<section class="card"><div class="card-h"><h3>${icon('hourglass')} ${t('Jetzt nachfassen: Test endet bald')}</h3></div><div class="list" style="margin-top:6px">${s.trialEndingSoon.map((x) => `<button class="li" data-act="openTenant" data-id="${esc(x.id)}"><div class="grow"><div class="t1">${esc(x.name)}</div><div class="t2">${t('Test endet {d}', { d: esc(dateTime(x.trialEnd)) })}</div></div><span class="btn btn-sm">${t('Öffnen')}</span></button>`).join('')}</div></section>` : ''}
    <section class="card"><div class="card-h"><h3>${t('Neueste Lizenznehmer')}</h3><button class="btn btn-ghost btn-sm" data-act="go" data-to="tenants">${t('Alle')}</button></div><div class="list" style="margin-top:6px">${ts.slice(0, 5).map((x) => tenantRow(app, x)).join('')}</div></section>
    <div class="banner info">${icon('shield-check')}<span class="grow">${t('Datenschutz eingebaut: Sie sehen Nutzungszahlen Ihrer Kunden, aber keine Lieferungen, Lieferscheine oder Fahrerdaten (Auftragsverarbeitung nach Art. 28 DSGVO).')}</span></div>`;
}

function tenantRow(app, x) {
  const seats = x.usage.drivers / x.seats;
  return `<button class="li" data-act="openTenant" data-id="${esc(x.id)}" data-key="tr-${esc(x.id)}">${tlogo(app, x)}<div class="grow"><div class="t1 ellip">${esc(x.name)} <span class="mono xs muted">${esc(x.code)}</span></div><div class="t2">${esc(PLANS[x.plan]?.name)} · ${euro(x.monthly)}/${t('Monat')} · ${t('aktiv {a}', { a: x.usage.lastActivity ? ago(x.usage.lastActivity, t) : '–' })}</div></div>
    <div class="seats" title="${t('Fahrer-Plätze')}"><span class="xs muted tabular">${x.usage.drivers}/${x.seats}</span><div class="bar ${seats > 0.9 ? 'bad' : ''}" style="--p:${Math.min(1, seats)}"><i></i></div></div>${statePill(x.state)}</button>`;
}

function tenantsPage(app) {
  const ts = app.data.tenants;
  const f = app.ui.tfilter || 'all';
  const shown = (ts || []).filter((x) => f === 'all' || x.state === f);
  return `<div class="page-h"><div><h1>${t('Lizenznehmer')}</h1><p class="lead">${t('Tarif, Plätze, Laufzeit und Status je Kunde.')}</p></div><button class="btn btn-primary" data-act="newTenant">${icon('plus')}${t('Lizenznehmer anlegen')}</button></div>
    <div class="seg">${[['all', t('Alle')], ['active', t('Aktiv')], ['trial', t('Test')], ['suspended', t('Gesperrt')], ['expired', t('Abgelaufen')], ['cancelled', t('Gekündigt')]].map(([k, l]) => `<button data-act="tfilter" data-k="${k}" aria-pressed="${f === k}">${esc(l)}<span class="count">${(ts || []).filter((x) => k === 'all' || x.state === k).length}</span></button>`).join('')}</div>
    ${!ts ? sk(300) : `<section class="card tbl-wrap"><table class="tbl"><thead><tr><th>${t('Kunde')}</th><th>${t('Tarif')}</th><th>${t('Status')}</th><th>${t('Fahrer')}</th><th class="num">${t('Fahrzeuge')}</th><th class="num">${t('Lieferungen / Monat')}</th><th class="num">${t('Umsatz / Monat')}</th><th>${t('Letzte Aktivität')}</th></tr></thead><tbody>
      ${shown.map((x) => `<tr data-act="openTenant" data-id="${esc(x.id)}" data-key="tt-${esc(x.id)}"><td><div class="row">${tlogo(app, x)}<div><b>${esc(x.name)}</b><div class="xs muted mono">${esc(x.code)}</div></div></div></td><td>${esc(PLANS[x.plan]?.name)}${x.storeApp ? ` <span class="pill">${icon('store')}App</span>` : ''}${x.billing === 'yearly' ? ` <span class="pill">${t('jährlich')}</span>` : ''}</td><td>${statePill(x.state)}${x.state === 'trial' && x.trialEnd ? `<div class="xs muted">${t('bis {d}', { d: esc(new Date(x.trialEnd).toLocaleDateString('de-DE')) })}</div>` : ''}</td>
        <td><div class="seats"><span class="xs tabular">${x.usage.drivers}/${x.seats}</span><div class="bar" style="--p:${Math.min(1, x.usage.drivers / x.seats)}"><i></i></div></div></td><td class="num">${x.usage.vehicles}</td><td class="num">${num(x.usage.deliveriesMonth)}</td><td class="num">${euro(x.monthly)}</td><td class="small muted">${x.usage.lastActivity ? esc(ago(x.usage.lastActivity, t)) : '–'}</td></tr>`).join('') || `<tr><td colspan="8">${emptyState('building-2', t('Keine Lizenznehmer in dieser Ansicht'))}</td></tr>`}</tbody></table></section>`}`;
}

function billingPage(app) {
  const b = app.data.billing;
  // six months back and the next twelve – yearly payers appear in their renewal month only
  const months = Array.from({ length: 19 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 12 - i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const thisMonth = months[12];
  return `<div class="page-h"><div><h1>${t('Abrechnung')}</h1><p class="lead">${t('Rechnungsvorschau aller aktiven Lizenzen – netto, 19 % USt., brutto.')}</p></div><div class="row wrap"><select class="input" style="width:auto" data-input="bmonth">${months.map((m) => `<option value="${m}" ${(app.ui.bmonth || thisMonth) === m ? 'selected' : ''}>${new Date(m + '-15').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}${m === thisMonth ? ' · ' + t('aktuell') : ''}</option>`).join('')}</select>${app.api.mode === 'demo' ? '' : `<a class="btn" href="${esc(app.api.exportUrl('billing', '?month=' + (app.ui.bmonth || thisMonth)))}" download>${icon('download')}CSV</a>`}</div></div>
    ${!b ? sk(260) : `<div class="kpis"><div class="kpi dark" style="cursor:default"><span class="k-l">${t('Netto')}</span><span class="k-v">${euro(b.net)}</span></div><div class="kpi" style="cursor:default"><span class="k-l">${t('USt. 19 %')}</span><span class="k-v">${euro(b.gross - b.net)}</span></div><div class="kpi ok" style="cursor:default"><span class="k-l">${t('Brutto')}</span><span class="k-v">${euro(b.gross)}</span></div><div class="kpi" style="cursor:default"><span class="k-l">${t('Rechnungen')}</span><span class="k-v">${b.lines.length}</span></div></div>
    <section class="card tbl-wrap"><table class="tbl"><thead><tr><th>${t('Kunde')}</th><th>${t('Zeitraum')}</th><th>${t('Positionen')}</th><th class="num">${t('Netto')}</th><th class="num">${t('USt.')}</th><th class="num">${t('Brutto')}</th></tr></thead><tbody>${b.lines.map((l) => `<tr style="cursor:default"><td><b>${esc(l.name)}</b><div class="xs mono muted">${esc(l.code)}</div></td><td>${esc(l.period)}</td><td class="small">${l.items.map((i) => `${i.qty} × ${esc(i.text)} à ${euro(i.unit)}`).join('<br>')}${l.billing === 'yearly' ? `<br><span class="xs muted">${t('Jahreszahlung: 12 Monate zum Preis von 10')}</span>` : ''}</td><td class="num">${euro(l.net)}</td><td class="num">${euro(l.vat)}</td><td class="num"><b>${euro(l.gross)}</b></td></tr>`).join('') || `<tr><td colspan="6" class="muted">${t('Keine aktiven Lizenzen.')}</td></tr>`}</tbody></table></section>
    <div class="banner info">${icon('info')}<span class="grow">${t('Monatszahler erscheinen jeden Monat ab Beginn der bezahlten Lizenz, Jahreszahler einmal im Jahr im Verlängerungsmonat (12 Monate zum Preis von 10). Testphasen, gesperrte und gekündigte Kunden werden ab dem Monat der Änderung nicht berechnet. Die automatische Rechnungsstellung (SEPA, DATEV-Export) folgt in Version 1.2.')}</span></div>`}`;
}

function plansPage(app) {
  return `<div class="page-h"><div><h1>${t('Tarife')}</h1><p class="lead">${t('Netto zzgl. 19 % USt. · 30 Tage kostenlos testen · Jahreszahlung: 2 Monate geschenkt.')}</p></div></div>
    <div class="plans">${Object.values(PLANS).map((p) => `<div class="plan ${p.id === 'flotte' ? 'hl' : ''}">${p.id === 'flotte' ? `<span class="pill brand" style="align-self:flex-start">${t('Beliebt')}</span>` : ''}<span class="eyebrow">${esc(p.name)}</span><div class="price">${p.price} €<small> / ${t('Monat')}</small></div>
      <ul><li>${icon('check')}${t('{n} Fahrer inklusive', { n: p.drivers })}${p.extraDriver ? ` · ${t('jeder weitere {e} €', { e: p.extraDriver })}` : ''}</li><li>${icon('check')}${p.vehicles ? t('{n} Fahrzeuge', { n: p.vehicles }) : t('Fahrzeuge unbegrenzt')}</li><li>${icon('check')}${p.staff == null ? t('Disponenten unbegrenzt') : t('{n} Disponenten', { n: p.staff })}</li><li>${icon('check')}${t('Eigenes Logo, Farben, App-Name')}</li><li>${icon('check')}${t('{n} GB Lieferschein-Speicher', { n: p.storageGB })}</li>${p.domain !== 'none' ? `<li>${icon('check')}${p.domain === 'custom' ? t('Eigene Domain') : t('Eigene Subdomain')}</li>` : ''}${p.api ? `<li>${icon('check')}${t('REST-API · SLA 99,5 %')}</li>` : ''}</ul></div>`).join('')}
      <div class="plan"><span class="eyebrow">${t('Zusatz zu Premium')}</span><h3>${t('White-Label-App im Store')}</h3><div class="price">${num(STORE_APP.setup)} €<small> ${t('einmalig')}</small></div><p class="small muted">+ ${STORE_APP.monthly} € / ${t('Monat')} ${t('Store-Betrieb')}</p><ul><li>${icon('check')}${t('Eigene App im App Store und bei Google Play')}</li><li>${icon('check')}${t('Name und Symbol des Kunden')}</li><li>${icon('check')}${t('Push über APNs/FCM')}</li></ul></div></div>`;
}

// ---------- sheets ----------
function sheetView(app) {
  const s = app.ui.sheet;
  if (!s) return '';
  if (s.type === 'newTenant') return newTenantSheet(app);
  if (s.type === 'created') return createdSheet(app);
  if (s.type === 'tenant') return tenantSheet(app);
  if (s.type === 'account') return accountSheet(app);
  if (s.type === 'adminReset') return adminResetSheet(app);
  return '';
}
function newTenantSheet(app) {
  return sheet({
    key: 'nt', title: t('Lizenznehmer anlegen'), sub: t('Der Kunde bekommt sofort einen Admin-Zugang und kann sein Logo hochladen.'),
    body: `<form id="ntForm" data-form="tenant" class="stack"><div class="fgrid">
      <label class="field full"><span>${t('Firmenname')} *</span><input class="input" name="name" required placeholder="Muster Spedition GmbH" data-input="codeHint"></label>
      <label class="field"><span>${t('Firmencode (Login der Fahrer)')}</span><input class="input mono" name="code" placeholder="MUSTER" style="text-transform:uppercase" maxlength="12"></label>
      <label class="field"><span>${t('Präfix Buchungsnummer')}</span><input class="input mono" name="bookingPrefix" placeholder="MUS" maxlength="6" style="text-transform:uppercase"></label>
      <label class="field"><span>${t('Ansprechpartner')}</span><input class="input" name="contact"></label><label class="field"><span>${t('Telefon')}</span><input class="input" name="phone" type="tel"></label>
      <label class="field full"><span>${t('E-Mail für den Admin-Zugang')} *</span><input class="input" type="email" name="adminEmail" required></label>
      <label class="field full"><span>${t('Anschrift')}</span><input class="input" name="address"></label>
      <label class="field"><span>${t('Tarif')}</span><select class="input" name="plan">${Object.values(PLANS).map((p) => `<option value="${p.id}" ${p.id === 'flotte' ? 'selected' : ''}>${esc(p.name)} · ${p.price} €</option>`).join('')}</select></label>
      <label class="field"><span>${t('Testphase (Tage, 0 = sofort aktiv)')}</span><input class="input" type="number" name="trialDays" min="0" max="365" value="30"></label>
      <label class="field"><span>${t('Zahlweise')}</span><select class="input" name="billing"><option value="monthly">${t('monatlich')}</option><option value="yearly">${t('jährlich (2 Monate geschenkt)')}</option></select></label>
      <label class="field"><span>${t('Markenfarbe')}</span><input class="input" type="color" name="color" value="#1f6feb" style="padding:4px;height:44px"></label></div></form>`,
    foot: `<button class="btn" data-act="close">${t('Abbrechen')}</button><button class="btn btn-primary btn-lg" type="submit" form="ntForm">${icon('check')}${t('Anlegen')}</button>`,
  });
}
function createdSheet(app) {
  const c = app.ui.created;
  const link = app.api.tenantLink?.(c.tenant.code) || '';
  const mail = t('Willkommen bei Ladeklar! Ihr Zugang: {link} · E-Mail: {email} · Startpasswort: {pw}. Bitte beim ersten Login ein eigenes Passwort vergeben. Ihre Fahrer melden sich mit dem Firmencode {code} an.', { link, email: c.admin.email, pw: c.password, code: c.tenant.code });
  return sheet({
    key: 'created', title: t('{n} ist angelegt', { n: esc(c.tenant.name) }), sub: t('Das Startpasswort wird nur jetzt angezeigt.'),
    body: `<div class="banner ok">${icon('circle-check-big')}<span class="grow">${c.tenant.state === 'trial' ? t('Testphase läuft bis {d}.', { d: esc(dateTime(c.tenant.trialEnd)) }) : t('Lizenz ist aktiv.')}</span></div>
      <dl class="kv"><dt>${t('Firmencode')}</dt><dd class="mono">${esc(c.tenant.code)}</dd><dt>${t('Admin')}</dt><dd>${esc(c.admin.email)}</dd><dt>${t('Login-Seite')}</dt><dd>${esc(link)}</dd></dl>
      <div class="secret"><span class="grow">${esc(c.password)}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(c.password)}">${icon('copy')}</button></div>
      <div class="card pad small" id="welcome-text" style="background:var(--surface-2)">${esc(mail)}</div>`,
    foot: `<button class="btn" data-act="copy" data-from="#welcome-text">${icon('copy')}${t('Willkommenstext kopieren')}</button><a class="btn" href="mailto:${esc(c.admin.email)}?subject=${encodeURIComponent('Ihr Ladeklar-Zugang')}&body=${encodeURIComponent(mail)}">${icon('mail')}${t('Per E-Mail')}</a><button class="btn btn-primary" data-act="close">${t('Fertig')}</button>`,
  });
}
function accountSheet(app) {
  const u = app.me.user;
  return sheet({
    key: 'account', title: t('Mein Konto'), sub: esc(u.email),
    body: `<form id="pwForm" data-form="password" class="fgrid"><label class="field full"><span>${t('Aktuelles Passwort')}</span><input class="input" type="password" name="current" autocomplete="current-password" required></label><label class="field full"><span>${t('Neues Passwort (mind. 10 Zeichen)')}</span><input class="input" type="password" name="next" minlength="10" autocomplete="new-password" required></label></form>
      <p class="small muted">${t('Ein langes Passwort schützt alle Lizenznehmer. Teilen Sie den Zugang nicht.')}</p>`,
    foot: `<button class="btn btn-danger btn-ghost" data-act="logout">${icon('log-out')}${t('Abmelden')}</button><span class="grow"></span><button class="btn btn-primary" type="submit" form="pwForm">${icon('key-round')}${t('Passwort ändern')}</button>`,
  });
}
function adminResetSheet(app) {
  const r = app.ui.reset;
  if (!r) return '';
  return sheet({
    key: 'adminReset', title: t('Neues Startpasswort'), sub: t('Wird nur jetzt angezeigt. Der Admin muss es bei der nächsten Anmeldung ändern.'), back: 'backToTenant',
    body: `<dl class="kv"><dt>${t('Admin')}</dt><dd>${esc(r.user.name)} · ${esc(r.user.email)}</dd></dl><div class="secret"><span class="grow">${esc(r.password)}</span><button class="btn btn-sm" data-act="copy" data-copy="${esc(r.password)}">${icon('copy')}</button></div>
      <p class="small muted">${t('Bitte telefonisch oder auf einem zweiten Weg übermitteln, nicht in derselben E-Mail wie die Anmeldeadresse. Alle Sitzungen dieses Admins wurden beendet.')}</p>`,
    foot: `<button class="btn btn-primary" data-act="backToTenant">${t('Fertig')}</button>`,
  });
}
function tenantSheet(app) {
  const x = app.data.tenant;
  if (!x || x.id !== app.ui.sheet.id) return sheet({ title: t('Laden …'), body: sk(300) });
  const prem = x.plan === 'premium';
  const isoDay = (ms) => (ms ? new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }) : '');
  return sheet({
    key: 'tenant', title: esc(x.name), sub: `<span class="mono">${esc(x.code)}</span> · ${t('Kunde seit {d}', { d: esc(new Date(x.createdAt).toLocaleDateString('de-DE')) })}`,
    body: `<div class="row wrap">${tlogo(app, x)}${statePill(x.state)}<span class="pill brand">${esc(PLANS[x.plan].name)}</span><b class="grow" style="text-align:right">${euro(x.monthly)} / ${t('Monat')}</b></div>
      <div class="kpis"><div class="kpi" style="cursor:default"><span class="k-v">${x.usage.drivers}<span class="small muted">/${x.seats}</span></span><span class="k-l">${t('Fahrer')}</span></div><div class="kpi" style="cursor:default"><span class="k-v">${x.usage.vehicles}</span><span class="k-l">${t('Fahrzeuge')}</span></div><div class="kpi" style="cursor:default"><span class="k-v">${x.usage.deliveriesMonth}</span><span class="k-l">${t('Lieferungen / Monat')}</span></div><div class="kpi" style="cursor:default"><span class="k-v">${x.usage.staff}</span><span class="k-l">${t('Büro-Zugänge')}</span></div></div>
      <form id="licForm" data-form="license" class="stack"><div class="section-t">${t('Lizenz')}</div><div class="fgrid">
        <label class="field"><span>${t('Tarif')}</span><select class="input" name="plan" data-input="licPlan">${Object.values(PLANS).map((p) => `<option value="${p.id}" ${x.plan === p.id ? 'selected' : ''}>${esc(p.name)} · ${p.price} €</option>`).join('')}</select></label>
        <label class="field"><span>${t('Zusätzliche Fahrer')}</span><input class="input" type="number" min="0" name="extraDrivers" value="${x.extraDrivers}" ${x.plan === 'start' ? 'disabled' : ''}><span class="hint" data-hint="extra">${x.plan === 'start' ? t('Im Tarif Start nicht möglich – bitte auf Flotte wechseln.') : ''}</span></label>
        <label class="field"><span>${t('Zahlweise')}</span><select class="input" name="billing"><option value="monthly" ${x.billing === 'monthly' ? 'selected' : ''}>${t('monatlich')}</option><option value="yearly" ${x.billing === 'yearly' ? 'selected' : ''}>${t('jährlich')}</option></select></label>
        <label class="field"><span>${t('Laufzeit bis (leer = unbefristet)')}</span><input class="input" type="date" name="licenseEnd" value="${esc(isoDay(x.licenseEnd))}"></label>
        <label class="check full" style="padding-bottom:4px"><input type="checkbox" name="storeApp" ${x.storeApp ? 'checked' : ''} ${prem ? '' : 'disabled'}>${t('White-Label-App im Store')}<span class="xs muted" data-hint="store">${prem ? '' : ' · ' + t('nur mit Premium')}</span></label>
        <label class="field full"><span>${t('Eigene Domains (Premium, durch Komma getrennt)')}</span><input class="input mono" name="domains" value="${esc((x.domains || []).join(', '))}" placeholder="fahrer.kaya-logistik.de" ${prem ? '' : 'disabled'}><span class="hint">${t('DNS beim Kunden: CNAME auf app.ladeklar.de, dann im Caddyfile eintragen.')}</span></label>
        <label class="field full"><span>${t('Interne Notiz')}</span><textarea class="input" name="licenseNote" rows="2">${esc(x.licenseNote)}</textarea></label></div>
        <div><button class="btn btn-primary" type="submit">${icon('check')}${t('Lizenz speichern')}</button></div></form>
      <div class="section-t">${t('Status')}</div>
      <div class="row wrap">${x.state !== 'active' ? `<button class="btn btn-ok" data-act="setStatus" data-s="active">${icon('circle-check-big')}${t('Aktivieren')}</button>` : ''}${x.state === 'trial' || x.state === 'expired' ? `<button class="btn" data-act="extendTrial">${icon('hourglass')}${t('Test +14 Tage')}</button>` : ''}${x.state !== 'suspended' ? `<button class="btn btn-danger" data-act="setStatus" data-s="suspended">${icon('lock')}${t('Sperren')}</button>` : ''}${x.state !== 'cancelled' ? `<button class="btn btn-ghost" data-act="setStatus" data-s="cancelled">${icon('ban')}${t('Kündigen')}</button>` : ''}</div>
      <p class="small muted">${t('Gesperrt: Kunde kann Daten ansehen und exportieren, aber nichts ändern; Fahrer können sich nicht anmelden. Gekündigt: nur der Admin meldet sich noch an, um die Daten zu exportieren.')}</p>
      <div class="section-t">${t('Firma und Kontakt')}</div>
      <form id="coForm" data-form="company" class="stack"><div class="fgrid">
        <label class="field"><span>${t('Firmenname')}</span><input class="input" name="name" value="${esc(x.name)}" required></label><label class="field"><span>${t('Rechtlicher Name (Rechnung)')}</span><input class="input" name="legalName" value="${esc(x.legalName || '')}"></label>
        <label class="field"><span>${t('Ansprechpartner')}</span><input class="input" name="contact" value="${esc(x.contact || '')}"></label><label class="field"><span>${t('E-Mail (Rechnung, Kontakt)')}</span><input class="input" type="email" name="email" value="${esc(x.email || '')}"></label>
        <label class="field"><span>${t('Telefon')}</span><input class="input" type="tel" name="phone" value="${esc(x.phone || '')}"></label><label class="field"><span>${t('USt-IdNr.')}</span><input class="input" name="vatId" value="${esc(x.vatId || '')}"></label>
        <label class="field full"><span>${t('Anschrift')}</span><input class="input" name="address" value="${esc(x.address || '')}"></label></div>
        <div><button class="btn" type="submit">${icon('check')}${t('Firmendaten speichern')}</button></div></form>
      <div class="section-t">${t('Support')}</div>
      <div class="row wrap"><button class="btn" data-act="resetAdmin">${icon('key-round')}${t('Admin-Passwort zurücksetzen')}</button><span class="small muted">${t('Für den Fall, dass der Kunde sich ausgesperrt hat. Wird im Protokoll des Kunden vermerkt.')}</span></div>
      ${x.state === 'cancelled' ? `<section class="card pad stack danger-zone"><h4>${icon('trash-2')} ${t('Endgültig löschen')}</h4><p class="small">${t('Löscht alle Daten dieses Kunden: Lieferungen, Lieferscheine, Fotos, Fahrer, Fahrzeuge und Protokoll. Vorher muss der Kunde seine Daten exportiert haben oder auf den Export verzichtet haben (AVV).')}</p>
        <form id="delTenantForm" data-form="deleteTenant" class="row wrap"><label class="field grow" style="min-width:200px"><span>${t('Zur Bestätigung den Firmencode {c} eingeben', { c: esc(x.code) })}</span><input class="input mono" name="confirmCode" autocomplete="off" style="text-transform:uppercase" required></label><button class="btn btn-danger" type="submit" style="align-self:end">${icon('trash-2')}${t('Kunden endgültig löschen')}</button></form></section>` : ''}`,
  });
}

export const actions = {
  newTenant: (el, ev, app) => app.open({ type: 'newTenant' }),
  openAccount: (el, ev, app) => app.open({ type: 'account' }),
  backToTenant: (el, ev, app) => { app.ui.reset = null; app.open({ type: 'tenant', id: app.ui.lastTenant }); },
  async resetAdmin(el, ev, app) {
    const id = app.ui.sheet.id;
    const r = await app.call('resetTenantAdmin', { id }).catch(() => null);
    if (r) { app.ui.reset = r; app.ui.lastTenant = id; app.open({ type: 'adminReset', id }); }
  },
  openTenant: (el, ev, app) => app.open({ type: 'tenant', id: el.dataset.id }),
  tfilter: (el, ev, app) => { app.ui.tfilter = el.dataset.k; app.render(); },
  async setStatus(el, ev, app) { const r = await app.call('updateTenantLicense', { id: app.ui.sheet.id, status: el.dataset.s }).catch(() => null); if (r) { app.data.tenant = r; app.toast({ title: t('Status gespeichert'), plain: true, icon: 'check' }); app.load(); } },
  async extendTrial(el, ev, app) { const r = await app.call('updateTenantLicense', { id: app.ui.sheet.id, status: 'trial', extendTrialDays: 14 }).catch(() => null); if (r) { app.data.tenant = r; app.toast({ title: t('Testphase verlängert'), plain: true, icon: 'hourglass' }); app.load(); } },
};
export const inputs = {
  bmonth: (el, ev, app) => { if (ev.type !== 'change') return; app.ui.bmonth = el.value; app.data.billing = null; app.render(); app.load(); },
  licPlan(el, ev, app) {
    if (ev.type !== 'change') return;
    const f = el.form, plan = el.value;
    const store = f.querySelector('[name=storeApp]'), extra = f.querySelector('[name=extraDrivers]'), dom = f.querySelector('[name=domains]');
    store.disabled = plan !== 'premium'; if (store.disabled) store.checked = false;
    dom.disabled = plan !== 'premium';
    extra.disabled = plan === 'start'; if (extra.disabled) extra.value = 0;
    f.querySelector('[data-hint=store]').textContent = plan === 'premium' ? '' : ' · ' + t('nur mit Premium');
    f.querySelector('[data-hint=extra]').textContent = plan === 'start' ? t('Im Tarif Start nicht möglich – bitte auf Flotte wechseln.') : '';
  },
  codeHint: (el, ev, app) => { const f = el.form; const code = f.querySelector('[name=code]'); if (code && !code.dataset.touched) code.placeholder = el.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'MUSTER'; },
};
export const forms = {
  async tenant(fd, form, app) {
    const v = Object.fromEntries(fd.entries());
    if (!v.code) v.code = form.querySelector('[name=code]').placeholder;
    const r = await app.call('createTenant', { ...v, trialDays: Number(v.trialDays) });
    if (r) { app.ui.created = r; app.open({ type: 'created' }); app.load(); }
  },
  async license(fd, form, app) {
    const v = Object.fromEntries(fd.entries());
    const r = await app.call('updateTenantLicense', { id: app.ui.sheet.id, plan: v.plan, extraDrivers: Number(v.extraDrivers || 0), billing: v.billing, storeApp: v.storeApp === 'on', licenseEnd: v.licenseEnd || null, licenseNote: v.licenseNote, ...('domains' in v ? { domains: v.domains } : {}) });
    if (r) { app.data.tenant = r; app.toast({ title: t('Lizenz gespeichert · {e} / Monat', { e: euro(r.monthly) }), plain: true, icon: 'check' }); app.load(); }
  },
  async company(fd, form, app) {
    const v = Object.fromEntries(fd.entries());
    const r = await app.call('updateTenantLicense', { id: app.ui.sheet.id, name: v.name, legalName: v.legalName, contact: v.contact, email: v.email, phone: v.phone, vatId: v.vatId, address: v.address });
    if (r) { app.data.tenant = r; app.toast({ title: t('Firmendaten gespeichert'), plain: true, icon: 'check' }); app.load(); }
  },
  async deleteTenant(fd, form, app) {
    const id = app.ui.sheet.id;
    const r = await app.call('deleteTenant', { id, confirmCode: String(fd.get('confirmCode') || '').trim() });
    if (r) { app.close(); app.toast({ title: t('Kunde gelöscht – {u} Zugänge, {f} Dateien', { u: r.users ?? r.userIds?.length ?? 0, f: r.files ?? r.fileIds?.length ?? 0 }), plain: true, icon: 'trash-2' }); app.data.tenant = null; app.load(); }
  },
  async password(fd, form, app) {
    const r = await app.call('changePassword', { current: fd.get('current'), next: fd.get('next') });
    if (r) { form.reset(); app.close(); app.toast({ title: t('Passwort geändert'), plain: true, icon: 'key-round' }); }
  },
};
