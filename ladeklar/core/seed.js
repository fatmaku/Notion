// Demo world for the online demo and `npm run dev`: a licensor, six licensees in different
// licence states, and one richly filled company (Kaya Logistik) with drivers, a truck/trailer
// pool, past, running and planned deliveries, delivery-note photos and notifications.
// Everything is created through engine.call() with a travelling clock, so the data is exactly
// what the real app would have produced.

import { berlinDate } from './engine.js';

export const DEMO = {
  platform: { email: 'inhaber@ladeklar.de', password: 'Ladeklar-Demo-2026', name: 'Lizenzgeber (Sie)' },
  password: 'Demo-Passwort-2026',
  pin: '123456',
};

// ---------- logos (SVG data URLs) ----------
const svgUrl = (svg) => 'data:image/svg+xml;base64,' + (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg).toString('base64'));

export const LOGOS = {
  kaya: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96"><rect x="4" y="8" width="80" height="80" rx="20" fill="#0E7C7B"/><path d="M27 26v44M27 50l24-24M35 46l18 24" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="64" cy="66" r="6" fill="#F4C95D"/><text x="102" y="56" font-family="Archivo, Arial Black, sans-serif" font-weight="800" font-size="44" letter-spacing="2" fill="#0B2A33">KAYA</text><text x="104" y="82" font-family="Manrope, Arial, sans-serif" font-weight="700" font-size="17" letter-spacing="7.5" fill="#0E7C7B">LOGISTIK</text></svg>`),
  nord: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 96"><rect x="4" y="8" width="80" height="80" rx="40" fill="#13315C"/><path d="M18 60c14-26 30-26 44-8 6 8 12 8 18 0" stroke="#5EEAD4" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M18 44c14-22 30-22 44-6 6 6 12 6 18-2" stroke="#93C5FD" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><text x="100" y="58" font-family="Archivo, Arial Black, sans-serif" font-weight="800" font-size="40" letter-spacing="1" fill="#13315C">NORDLICHT</text><text x="102" y="82" font-family="Manrope, Arial, sans-serif" font-weight="600" font-size="16" letter-spacing="6" fill="#2563EB">SPEDITION · HAMBURG</text></svg>`),
  mono: (txt, bg, fg = '#fff') => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${bg}"/><text x="48" y="61" text-anchor="middle" font-family="Archivo, Arial Black, sans-serif" font-weight="800" font-size="40" fill="${fg}">${txt}</text></svg>`),
};

/** A photographed-looking delivery note (Lieferschein) as SVG, used for demo PODs. */
export function podSvg({ no, customer, from, to, goods, pallets, date, receiver, tilt = -2.2 }) {
  const rows = [
    ['Pos.', 'Artikel / Beschreibung', 'Menge'],
    ['1', goods || 'Stückgut', `${pallets || 1} Pal.`],
    ['2', 'EUR-Paletten (Tausch)', `${pallets || 1}`],
    ['3', 'Packstücke lt. Liste', `${(pallets || 1) * 24}`],
  ];
  const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6470"/><stop offset="1" stop-color="#3a414b"/></linearGradient>
<filter id="s" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-opacity=".45"/></filter></defs>
<rect width="800" height="1000" fill="url(#t)"/>
<g transform="rotate(${tilt} 400 500)" filter="url(#s)">
<rect x="90" y="70" width="620" height="860" fill="#fbfaf6"/>
<rect x="90" y="70" width="620" height="860" fill="none" stroke="#e6e2d8"/>
<text x="130" y="140" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="#1d232b">LIEFERSCHEIN</text>
<text x="130" y="172" font-family="Arial, sans-serif" font-size="16" fill="#5b6470">Nr. ${esc(no)} · ${esc(date)}</text>
<text x="670" y="140" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="#1d232b">${esc(customer || 'Versender')}</text>
<line x1="130" y1="200" x2="670" y2="200" stroke="#1d232b" stroke-width="2"/>
<text x="130" y="236" font-family="Arial, sans-serif" font-size="15" fill="#5b6470">Versandort</text><text x="130" y="262" font-family="Arial, sans-serif" font-size="20" fill="#1d232b">${esc(from)}</text>
<text x="420" y="236" font-family="Arial, sans-serif" font-size="15" fill="#5b6470">Empfänger</text><text x="420" y="262" font-family="Arial, sans-serif" font-size="20" fill="#1d232b">${esc(to)}</text>
${rows.map((r, i) => `<g font-family="Arial, sans-serif" font-size="17" fill="${i ? '#1d232b' : '#5b6470'}"><text x="130" y="${330 + i * 46}">${esc(r[0])}</text><text x="190" y="${330 + i * 46}">${esc(r[1])}</text><text x="670" y="${330 + i * 46}" text-anchor="end">${esc(r[2])}</text></g><line x1="130" y1="${343 + i * 46}" x2="670" y2="${343 + i * 46}" stroke="#d9d4c7"/>`).join('')}
<text x="130" y="640" font-family="Arial, sans-serif" font-size="15" fill="#5b6470">Ware vollständig und unbeschädigt erhalten</text>
<path d="M150 735c20-30 40-28 46 2s22 20 34-10 26-20 30 6 18 14 40-18 30-6 44 10" stroke="#1f3fa8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<line x1="130" y1="760" x2="400" y2="760" stroke="#1d232b"/><text x="130" y="784" font-family="Arial, sans-serif" font-size="14" fill="#5b6470">Unterschrift Empfänger · ${esc(receiver || '')}</text>
<g transform="rotate(-12 560 730)"><rect x="470" y="680" width="190" height="96" rx="10" fill="none" stroke="#c0392b" stroke-width="5" opacity=".75"/><text x="565" y="722" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#c0392b" opacity=".75">ERHALTEN</text><text x="565" y="755" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#c0392b" opacity=".75">${esc(date)}</text></g>
<text x="130" y="890" font-family="Arial, sans-serif" font-size="12" fill="#9aa1aa">Bitte Rückseite beachten · Es gelten die ADSp 2017</text>
</g></svg>`);
}

// ---------- time helpers ----------
function berlinMs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess))) p[x.type] = x.value;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return guess - (wall - guess);
}
const addDays = (dateStr, n) => { const [y, m, d] = dateStr.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

/**
 * @param {{engine, store, clock:{set(ms), reset()}, realNow?: number}} ctx
 */
export function seedDemo({ engine, store, clock, realNow = Date.now() }) {
  const today = berlinDate(realNow);
  const day = (n) => addDays(today, n);
  const set = (ms) => clock.set(Math.min(ms, realNow));
  set(realNow - 60 * 864e5);

  const platform = engine.setupPlatform(DEMO.platform);
  const P = (m, a) => engine.call(platform, m, a);
  const attachSvg = (actor, kind, dataUrl, extra = {}) => {
    const f = engine.call(actor, 'createFile', { kind, mime: 'image/png', size: Math.round(dataUrl.length * 0.75), name: kind + '.svg', ...extra });
    store.put('files', { ...store.get('files', f.id), mime: 'image/svg+xml', data: dataUrl, synthetic: true });
    return f;
  };

  // ---------- licensees for the licensor console ----------
  const mkTenant = (o) => {
    const r = P('createTenant', { adminPassword: DEMO.password, ...o });
    const admin = engine.auth.login({ email: r.admin.email, password: DEMO.password });
    return { ...r, admin };
  };
  const mkDrivers = (admin, list) => list.map(([name, phone, lang, extra = {}]) => engine.call(admin, 'createUser', { role: 'driver', name, phone, lang, pin: DEMO.pin, ...extra }).user);

  set(realNow - 58 * 864e5);
  const kaya = mkTenant({ name: 'Kaya Logistik', legalName: 'Kaya Logistik GmbH', code: 'KAYA', plan: 'flotte', extraDrivers: 0, trialDays: 0, adminEmail: 'ayse@kaya-logistik.de', contact: 'Ayşe Kaya', phone: '+49 711 4006 200', address: 'Hafenbahnstraße 24, 70329 Stuttgart', color: '#0e7c7b', appName: 'Kaya Fahrer', bookingPrefix: 'KAY' });
  const A = kaya.admin;
  const kayaLogo = attachSvg(A, 'logo', LOGOS.kaya);
  engine.call(A, 'updateCompany', { branding: { logoFileId: kayaLogo.id, color: '#0e7c7b', appName: 'Kaya Fahrer' }, settings: { driverPicksTruck: true, driverTakesOpen: true, requirePod: true, trackArrival: true, palletExchange: true, geoOnStatus: false, driveLock: true } });
  const jonas = engine.call(A, 'createUser', { role: 'dispatcher', name: 'Jonas Weber', email: 'jonas@kaya-logistik.de', password: DEMO.password, lang: 'de' }).user;

  set(realNow - 18 * 864e5);
  const nord = mkTenant({ name: 'Nordlicht Spedition', legalName: 'Nordlicht Spedition e.K.', code: 'NORD', plan: 'start', trialDays: 30, adminEmail: 'lars@nordlicht-spedition.de', contact: 'Lars Petersen', phone: '+49 40 3008 77', address: 'Waltershofer Damm 3, 21129 Hamburg', color: '#13315c', appName: 'Nordlicht Touren', bookingPrefix: 'NLS' });
  const nordLogo = attachSvg(nord.admin, 'logo', LOGOS.nord);
  engine.call(nord.admin, 'updateCompany', { branding: { logoFileId: nordLogo.id, color: '#2563eb' } });

  const others = [
    { name: 'Bauer Baustoff-Transporte', code: 'BAUER', plan: 'start', trialDays: 0, adminEmail: 'info@bauer-baustoff.de', contact: 'Thomas Bauer', color: '#b45309', mono: ['BB', '#b45309'], drivers: 3, ago: 140 },
    { name: 'Rhein-Main Kurier', code: 'RMK', plan: 'premium', trialDays: 0, storeApp: true, billing: 'yearly', extraDrivers: 0, adminEmail: 'it@rhein-main-kurier.de', contact: 'Sabine Hoffmann', color: '#7c2d12', mono: ['RM', '#7c2d12'], drivers: 26, ago: 300 },
    { name: 'Elbe Frisch Kühllogistik', code: 'ELBE', plan: 'flotte', trialDays: 0, adminEmail: 'buchhaltung@elbe-frisch.de', contact: 'Jan Meyer', color: '#0369a1', mono: ['EF', '#0369a1'], drivers: 8, ago: 210, suspend: true },
    { name: 'Alpen Express', code: 'ALPEN', plan: 'flotte', trialDays: 30, adminEmail: 'disposition@alpen-express.de', contact: 'Maria Huber', color: '#15803d', mono: ['AE', '#15803d'], drivers: 5, ago: 27 },
  ];
  const firstNames = ['Lukas', 'Jan', 'Tomasz', 'Marek', 'Ionuț', 'Mihai', 'Emre', 'Can', 'Oleh', 'Ivan', 'Stefan', 'Kai', 'Niko', 'Paul', 'Jakub', 'Radu', 'Burak', 'Serhii', 'Ali', 'Max', 'Tim', 'Ole', 'Ben', 'Eric', 'Leon', 'Finn'];
  for (const o of others) {
    set(realNow - o.ago * 864e5);
    const r = mkTenant({ ...o, phone: '+49 69 000 000' });
    const logo = attachSvg(r.admin, 'logo', LOGOS.mono(o.mono[0], o.mono[1]));
    engine.call(r.admin, 'updateCompany', { branding: { logoFileId: logo.id } });
    if (o.drivers > 40) engine.call(platform, 'updateTenantLicense', { id: r.tenant.id, extraDrivers: o.drivers - 40 });
    for (let i = 0; i < o.drivers; i++) engine.call(r.admin, 'createUser', { role: 'driver', name: `${firstNames[i % firstNames.length]} ${String.fromCharCode(65 + (i % 26))}.`, phone: `+49 151 ${String(4000000 + i * 37 + o.ago).padStart(7, '0')}`, pin: DEMO.pin });
    for (let i = 0; i < Math.min(o.drivers, 6); i++) engine.call(r.admin, 'createVehicle', { kind: 'truck', plate: `${o.code.slice(0, 2)}-${o.code.slice(2, 3) || 'X'}${o.code.slice(3, 4) || 'K'} ${100 + i}` });
    if (o.suspend) engine.call(platform, 'updateTenantLicense', { id: r.tenant.id, status: 'suspended', licenseNote: 'Zahlungsverzug seit 2 Monaten – Mahnung 2 versendet' });
  }
  // Alpen's trial ends in three days
  const alpen = store.find('tenants', { code: 'ALPEN' })[0];
  store.put('tenants', { ...alpen, trialEnd: realNow + 3 * 864e5 });

  // ---------- Kaya: team, drivers, pool ----------
  set(realNow - 56 * 864e5);
  const [mehmet, piotr, andrei, sven, olena, dmitri] = mkDrivers(A, [
    ['Mehmet Yılmaz', '+49 176 1000 0001', 'tr', { licenseClass: 'CE', personalNo: '1001' }],
    ['Piotr Nowak', '+49 176 1000 0002', 'pl', { licenseClass: 'CE', personalNo: '1002' }],
    ['Andrei Popescu', '+49 176 1000 0003', 'ro', { licenseClass: 'CE', personalNo: '1003' }],
    ['Sven Krause', '+49 176 1000 0004', 'de', { licenseClass: 'CE', personalNo: '1004' }],
    ['Olena Bondarenko', '+49 176 1000 0005', 'uk', { licenseClass: 'C, CE', personalNo: '1005' }],
    ['Dmitri Volkov', '+49 176 1000 0006', 'ru', { licenseClass: 'CE', personalNo: '1006' }],
  ]);
  const V = (o) => engine.call(A, 'createVehicle', o);
  const t1 = V({ kind: 'truck', plate: 'S-KL 2041', type: 'sattelzug', name: 'MAN TGX 18.510', payloadKg: 25000, pallets: 34, features: ['adr'], huDue: day(160), spDue: day(70) });
  const t2 = V({ kind: 'truck', plate: 'S-KL 2042', type: 'sattelzug', name: 'Mercedes Actros 1848', payloadKg: 25000, pallets: 34, huDue: day(21), spDue: day(110) });
  const t3 = V({ kind: 'truck', plate: 'S-KL 2043', type: 'sattelzug', name: 'Volvo FH 500', payloadKg: 25000, pallets: 34, huDue: day(240) });
  const t4 = V({ kind: 'truck', plate: 'S-KL 318', type: 'kuehlkoffer', name: 'DAF XF Kühlkoffer 12 t', payloadKg: 5800, pallets: 18, features: ['kuehlung', 'ladebordwand'], huDue: day(300) });
  const t5 = V({ kind: 'truck', plate: 'S-KL 77', type: 'transporter', name: 'Sprinter 3,5 t', payloadKg: 1100, pallets: 4, features: ['ladebordwand'], huDue: day(400) });
  const t6 = V({ kind: 'truck', plate: 'S-KL 2044', type: 'sattelzug', name: 'Scania R 450', payloadKg: 25000, pallets: 34, status: 'workshop', note: 'Werkstatt bis Freitag (Bremsen)', huDue: day(90) });
  const r1 = V({ kind: 'trailer', plate: 'S-KL 9001', type: 'plane', name: 'Krone Profi Liner', pallets: 34, features: [] });
  const r2 = V({ kind: 'trailer', plate: 'S-KL 9002', type: 'kuehl', name: 'Schmitz Cargobull S.KO Cool', pallets: 33, features: ['kuehlung'], spDue: day(-3) });
  const r3 = V({ kind: 'trailer', plate: 'S-KL 9003', type: 'plane', name: 'Kögel Mega', pallets: 34 });
  const r4 = V({ kind: 'trailer', plate: 'S-KL 9004', type: 'container', name: 'Container-Chassis 40 ft', pallets: 0 });
  void t3; void t6; void r3; void r4; void jonas;

  const login = (u) => engine.auth.actor(u.id);
  const drv = { mehmet: login(mehmet), piotr: login(piotr), andrei: login(andrei), sven: login(sven), olena: login(olena), dmitri: login(dmitri) };

  // ---------- deliveries ----------
  const places = {
    bosch: { place: 'Bosch Werk Feuerbach', street: 'Wernerstraße 1', zip: '70469', city: 'Stuttgart', contact: 'Wareneingang Tor 4', phone: '+49 711 811 0' },
    hhPort: { place: 'HHLA Container Terminal Burchardkai', street: 'Bei St. Annen 1', zip: '20457', city: 'Hamburg', contact: 'Gate B', phone: '+49 40 3088 0' },
    lbg: { place: 'Porsche Logistikzentrum', street: 'Schwieberdinger Str. 140', zip: '71636', city: 'Ludwigsburg', contact: 'Herr Maier', phone: '+49 7141 30 0' },
    muc: { place: 'Großmarkthalle München', street: 'Schäftlarnstraße 10', zip: '81371', city: 'München', contact: 'Halle 3', phone: '+49 89 233 0' },
    hn: { place: 'Lidl Zentrallager', street: 'Rötelstraße 30', zip: '74172', city: 'Neckarsulm', contact: 'Rampe 12', phone: '+49 7132 30 0' },
    koeln: { place: 'REWE Logistik West', street: 'Domstraße 20', zip: '50668', city: 'Köln', contact: 'Disposition Eingang', phone: '+49 221 149 0' },
    es: { place: 'Festo SE', street: 'Ruiter Straße 82', zip: '73734', city: 'Esslingen', contact: 'Versand', phone: '+49 711 347 0' },
    fra: { place: 'Fraport Cargo City Süd', street: 'Gebäude 579', zip: '60549', city: 'Frankfurt am Main', contact: 'Halle 5', phone: '+49 69 690 0' },
    sifi: { place: 'Mercedes-Benz Werk Sindelfingen', street: 'Béla-Barényi-Straße 1', zip: '71063', city: 'Sindelfingen', contact: 'Tor 7', phone: '+49 7031 90 0' },
    lej: { place: 'BMW Werk Leipzig', street: 'BMW Allee 1', zip: '04349', city: 'Leipzig', contact: 'Logistik Nord', phone: '+49 341 445 0' },
    bb: { place: 'IBM Lager Böblingen', street: 'Schönaicher Str. 220', zip: '71032', city: 'Böblingen', contact: 'Herr Schulz', phone: '+49 7031 16 0' },
    nue: { place: 'Hafen Nürnberg', street: 'Hamburger Str. 60', zip: '90451', city: 'Nürnberg', contact: 'Lager 2', phone: '+49 911 6400 0' },
    hb: { place: 'BLG Autoterminal', street: 'Senator-Borttscheller-Str. 1', zip: '27568', city: 'Bremerhaven', contact: 'Gate 2', phone: '+49 471 9450 0' },
    rt: { place: 'Bosch Reutlingen', street: 'Tübinger Str. 123', zip: '72762', city: 'Reutlingen', contact: 'Versand Halle 2', phone: '+49 7121 35 0' },
    do: { place: 'Dortmunder Hafen', street: 'Speicherstraße 23', zip: '44147', city: 'Dortmund', contact: 'Kai 3', phone: '+49 231 9839 0' },
    ulm: { place: 'Liebherr Ulm', street: 'Industriestraße 5', zip: '89081', city: 'Ulm', contact: 'Werkstor', phone: '+49 731 9440 0' },
    wien: { place: 'Hafen Wien Freudenau', street: 'Seitenhafenstraße 15', zip: '1020', city: 'Wien', country: 'AT', contact: 'Terminal', phone: '+43 1 72716 0' },
  };
  const D = (o) => engine.call(A, 'createDelivery', o);
  const go = (actor, d, step, extra) => engine.call(actor, 'advanceDelivery', { id: d.id, step, ...extra });
  const pod = (actor, d, receiver, dateStr) => {
    const dd = engine.call(A, 'getDelivery', { id: d.id });
    attachSvg(actor, 'pod', podSvg({ no: dd.bookingNo, customer: dd.customer, from: `${dd.pickup.place}, ${dd.pickup.city}`, to: `${dd.dropoff.place}, ${dd.dropoff.city}`, goods: dd.goods?.text, pallets: dd.goods?.pallets, date: dateStr.split('-').reverse().join('.'), receiver, tilt: -3 + Math.random() * 5 }), { deliveryId: d.id, name: 'Lieferschein.jpg' });
  };

  // past, completed tours (Vergangenheit)
  const past = [
    [-6, drv.mehmet, t1, r1, 'Bosch', places.bosch, places.hhPort, 'Ersatzteile, Kartonware', 33, 18400, 'P. Jensen'],
    [-5, drv.piotr, t2, r3, 'Porsche AG', places.lbg, places.muc, 'Karosserieteile', 26, 9800, 'K. Huber'],
    [-4, drv.andrei, t4, null, 'Lidl', places.hn, places.koeln, 'Molkereiprodukte +2…+6 °C', 18, 5200, 'S. Wagner'],
    [-3, drv.sven, t3, r3, 'Festo', places.es, places.fra, 'Pneumatik-Komponenten', 22, 7600, 'L. Becker'],
    [-2, drv.mehmet, t1, r1, 'Mercedes-Benz', places.sifi, places.lej, 'Motorenteile (ADR 9)', 30, 16300, 'T. Schulz'],
    [-1, drv.olena, t2, r2, 'REWE', places.koeln, places.hn, 'Obst & Gemüse, gekühlt', 33, 12100, 'A. Klein'],
    [-1, drv.dmitri, t3, r3, 'Liebherr', places.ulm, places.do, 'Hydraulikzylinder', 12, 14800, 'M. Fischer'],
  ];
  const waitPick = [25, 58, 40, 95, 30, 72, 44], waitDrop = [35, 20, 110, 28, 64, 31, 52];
  const hm = (base, add) => { const [hh, mm] = base.split(':').map(Number); const t = hh * 60 + mm + add; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  for (const [i, [off, dr, truck, trailer, customer, from, to, goods, pallets, kg, receiver]] of past.entries()) {
    const date = day(off);
    set(berlinMs(addDays(date, -1), '15:10'));
    const d = D({ customer, reference: `PO-${4500000 + Math.floor(Math.random() * 99999)}`, pickup: { ...from, date, from: '06:00', to: '08:00' }, dropoff: { ...to, date: off === -6 || off === -2 ? addDays(date, 1) : date, from: '12:00', to: '18:00' }, goods: { text: goods, pallets, weightKg: kg, adr: /ADR/.test(goods), temp: /°C/.test(goods) ? '+2…+6 °C' : '' }, driverId: dr.id });
    set(berlinMs(addDays(date, -1), '17:40'));
    engine.call(dr, 'selectVehicle', { vehicleId: truck.id, trailerId: trailer ? trailer.id : null });
    engine.call(dr, 'acceptDelivery', { id: d.id });
    set(berlinMs(date, '06:05')); go(dr, d, 'arrived_pickup');
    set(berlinMs(date, hm('06:05', waitPick[i]))); go(dr, d, 'loaded');
    const dropDate = off === -6 || off === -2 ? addDays(date, 1) : date;
    const arr = hm('12:40', i * 9);
    set(berlinMs(dropDate, arr)); go(dr, d, 'arrived_dropoff');
    set(berlinMs(dropDate, hm(arr, waitDrop[i]))); go(dr, d, 'unloaded', { palletExchange: { given: pallets, taken: Math.max(0, pallets - (off % 3 === 0 ? 2 : 0)) } });
    set(berlinMs(dropDate, hm(arr, waitDrop[i] + 3))); pod(dr, d, receiver, dropDate);
    set(berlinMs(dropDate, hm(arr, waitDrop[i] + 5))); go(dr, d, 'delivered', { receiver });
    engine.call(dr, 'releaseVehicle', {});
  }

  // a cancelled one
  set(berlinMs(day(-2), '09:00'));
  const canc = D({ customer: 'Bosch', pickup: { ...places.rt, date: day(-1) }, dropoff: { ...places.hb, date: day(0) }, goods: { text: 'Steuergeräte', pallets: 8 } });
  set(berlinMs(day(-2), '11:20'));
  engine.call(A, 'cancelDelivery', { id: canc.id, reason: 'Kunde hat den Auftrag verschoben.' });

  // ---------- today: live tours (Gegenwart) ----------
  const h = (hoursAgo) => realNow - hoursAgo * 3600e3;
  // 1) Mehmet: Stuttgart → Hamburg, loaded and on the way
  set(h(20));
  const live1 = D({ customer: 'Bosch', reference: 'PO-4519921', pickup: { ...places.bosch, date: day(0), from: '05:30', to: '07:00' }, dropoff: { ...places.hhPort, date: day(0), from: '15:00', to: '20:00' }, goods: { text: 'Ersatzteile, Gitterboxen', pallets: 30, weightKg: 17800 }, driverId: mehmet.id, instructions: 'Gate B anmelden, Container-Nr. MSCU 418273-5. Ladungssicherung mit Antirutschmatten.' });
  set(h(9.4)); engine.call(drv.mehmet, 'selectVehicle', { vehicleId: t1.id, trailerId: r1.id });
  set(h(9.3)); engine.call(drv.mehmet, 'acceptDelivery', { id: live1.id });
  set(h(8.6)); go(drv.mehmet, live1, 'arrived_pickup');
  set(h(7.9)); go(drv.mehmet, live1, 'loaded');
  set(h(3.2)); engine.call(drv.mehmet, 'addNote', { id: live1.id, text: 'Pause Raststätte Göttingen, 45 Min. Weiter um 13 Uhr.' });

  // 2) Olena: Esslingen → Frankfurt, loaded, with a delay problem
  set(h(19));
  const live2 = D({ customer: 'Festo', reference: 'SO-77120', pickup: { ...places.es, date: day(0), from: '07:00', to: '08:30' }, dropoff: { ...places.fra, date: day(0), from: '11:00', to: '13:00' }, goods: { text: 'Luftfracht-Sendung, 14 Colli', pallets: 14, weightKg: 4100 }, driverId: olena.id, urgent: true, instructions: 'Luftfracht! Zeitfenster Cargo City unbedingt einhalten.' });
  set(h(6.5)); engine.call(drv.olena, 'selectVehicle', { vehicleId: t2.id, trailerId: r3.id });
  set(h(6.4)); engine.call(drv.olena, 'acceptDelivery', { id: live2.id });
  set(h(5.6)); go(drv.olena, live2, 'arrived_pickup');
  set(h(5.1)); go(drv.olena, live2, 'loaded');
  set(h(0.6)); engine.call(drv.olena, 'reportProblem', { id: live2.id, code: 'delay', note: 'A5 Vollsperrung bei Darmstadt, ca. 40 Min. später.' });

  // 3) Andrei: Neckarsulm → Köln, unloaded, the delivery note is still missing
  set(h(21));
  const live3 = D({ customer: 'Lidl', reference: 'LS-2026-88113', pickup: { ...places.hn, date: day(0), from: '04:00', to: '05:00' }, dropoff: { ...places.koeln, date: day(0), from: '09:00', to: '11:00' }, goods: { text: 'Molkereiprodukte, gekühlt', pallets: 18, weightKg: 7200, temp: '+2…+6 °C' }, driverId: andrei.id });
  set(h(10.2)); engine.call(drv.andrei, 'selectVehicle', { vehicleId: t4.id });
  set(h(10.1)); engine.call(drv.andrei, 'acceptDelivery', { id: live3.id });
  set(h(9.7)); go(drv.andrei, live3, 'arrived_pickup');
  set(h(9.2)); go(drv.andrei, live3, 'loaded');
  set(h(4.9)); go(drv.andrei, live3, 'arrived_dropoff');
  set(h(3.4)); go(drv.andrei, live3, 'unloaded', { palletExchange: { given: 18, taken: 18 } });

  // 3b) Sven: a short morning tour, already delivered today
  set(h(22));
  const live0 = D({ customer: 'Bosch', reference: 'PO-4519870', pickup: { ...places.bosch, date: day(0), from: '05:00', to: '06:00' }, dropoff: { ...places.es, date: day(0), from: '07:00', to: '09:00' }, goods: { text: 'Musterteile, Express', pallets: 6, weightKg: 1800 }, driverId: sven.id });
  set(h(8.9)); engine.call(drv.sven, 'selectVehicle', { vehicleId: t5.id });
  set(h(8.8)); engine.call(drv.sven, 'acceptDelivery', { id: live0.id });
  set(h(8.5)); go(drv.sven, live0, 'arrived_pickup');
  set(h(8.1)); go(drv.sven, live0, 'loaded');
  set(h(7.3)); go(drv.sven, live0, 'arrived_dropoff');
  set(h(6.9)); go(drv.sven, live0, 'unloaded', { palletExchange: { given: 6, taken: 6 } });
  set(h(6.85)); pod(drv.sven, live0, 'K. Lehmann', day(0));
  set(h(6.8)); go(drv.sven, live0, 'delivered', { receiver: 'K. Lehmann' });
  engine.call(drv.sven, 'releaseVehicle', {});

  // 4) Piotr: Ludwigsburg → München, confirmed, not loaded yet
  set(h(20));
  const live4 = D({ customer: 'Porsche AG', reference: 'PAG-55012', pickup: { ...places.lbg, date: day(0), from: '13:00', to: '15:00' }, dropoff: { ...places.muc, date: day(1), from: '06:00', to: '09:00' }, goods: { text: 'Karosserieteile in Gestellen', pallets: 24, weightKg: 8800 }, driverId: piotr.id });
  set(h(2.1)); engine.call(drv.piotr, 'selectVehicle', { vehicleId: t3.id });
  set(h(2.0)); engine.call(drv.piotr, 'acceptDelivery', { id: live4.id });

  // 5) open for everyone, today: Sindelfingen → Leipzig
  set(h(1.4));
  D({ customer: 'Mercedes-Benz', reference: 'MB-JIT-3381', pickup: { ...places.sifi, date: day(0), from: '16:00', to: '18:00' }, dropoff: { ...places.lej, date: day(1), from: '06:00', to: '08:00' }, goods: { text: 'Motorenteile JIT', pallets: 28, weightKg: 15400 }, openForAll: true });
  // 6) assigned to Sven, waiting for his confirmation
  set(h(0.9));
  D({ customer: 'IBM', reference: 'IBM-77-201', pickup: { ...places.bb, date: day(0), from: '14:00', to: '16:00' }, dropoff: { ...places.nue, date: day(0), from: '19:00', to: '21:00' }, goods: { text: 'Server-Racks, stoßempfindlich', pallets: 10, weightKg: 3900 }, driverId: sven.id, instructions: 'Nicht stapeln! Kippindikatoren prüfen.' });

  // ---------- planned (Zukunft) ----------
  set(h(0.7));
  D({ customer: 'Bosch', reference: 'PO-4520107', pickup: { ...places.rt, date: day(1), from: '06:00', to: '07:00' }, dropoff: { ...places.hb, date: day(2), from: '08:00', to: '12:00' }, goods: { text: 'Steuergeräte, Export', pallets: 20, weightKg: 6400 }, driverId: dmitri.id });
  D({ customer: 'Liebherr', reference: 'LH-0091', pickup: { ...places.ulm, date: day(3), from: '07:00', to: '09:00' }, dropoff: { ...places.wien, date: day(4), from: '08:00', to: '14:00' }, goods: { text: 'Baumaschinen-Ersatzteile', pallets: 16, weightKg: 11200 }, openForAll: true, instructions: 'Grenzüberschreitend: CMR-Frachtbrief mitführen.' });
  D({ customer: 'REWE', reference: 'RW-88412', pickup: { ...places.koeln, date: day(2), from: '05:00', to: '06:00' }, dropoff: { ...places.hn, date: day(2), from: '12:00', to: '14:00' }, goods: { text: 'Leergut / Paletten-Rückführung', pallets: 33, weightKg: 3000 }, openForAll: true });

  // Nordlicht gets a little activity too
  set(h(30));
  const [lars1] = mkDrivers(nord.admin, [['Henrik Jansen', '+49 160 2000 0001', 'de'], ['Kasia Wiśniewska', '+49 160 2000 0002', 'pl']]);
  const nv = engine.call(nord.admin, 'createVehicle', { kind: 'truck', plate: 'HH-NL 401', type: 'sattelzug' });
  engine.call(nord.admin, 'createVehicle', { kind: 'trailer', plate: 'HH-NL 901', type: 'plane' });
  const nd = engine.call(nord.admin, 'createDelivery', { customer: 'Tchibo', pickup: { place: 'Tchibo Lager', city: 'Hamburg', date: day(0) }, dropoff: { city: 'Bremen', date: day(0) }, goods: { text: 'Kaffee, 22 Paletten', pallets: 22 }, driverId: lars1.id });
  set(h(2.5)); engine.call(engine.auth.actor(lars1.id), 'selectVehicle', { vehicleId: nv.id });
  set(h(2.4)); engine.call(engine.auth.actor(lars1.id), 'acceptDelivery', { id: nd.id });
  set(h(1.1)); engine.call(engine.auth.actor(lars1.id), 'advanceDelivery', { id: nd.id, step: 'loaded' });

  // older notifications count as read, today's stay fresh
  for (const n of store.find('notifications', {})) if (n.at < realNow - 4 * 3600e3) store.put('notifications', { ...n, read: true });

  clock.reset();
  return {
    platform: { id: platform.id, email: DEMO.platform.email },
    tenants: { kaya: kaya.tenant.id, nord: nord.tenant.id },
    users: { admin: A.id, dispatcher: jonas.id, mehmet: mehmet.id, piotr: piotr.id, andrei: andrei.id, sven: sven.id, olena: olena.id, dmitri: dmitri.id, nordAdmin: nord.admin.id },
  };
}
