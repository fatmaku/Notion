// Cat Me If You Can – Moderation: Einrichten (QR-Codes für Admin-Handys, Cafés, Freiwillige; Geräte),
// Prüfliste (Dubletten zusammenführen, Einsprüche, auffällige Fänge, Ortsvorschläge), Cafés/Partner
// anlegen, Spieler:innen (Rollen, Sperren), Katzen (Legende, Name, Status), KI-Status.
// Anmeldung: QR-Code (#setup=… im Fragment, Erweiterung qr-setup) oder ADMIN_TOKEN. Gespeichert wird nie
// der ADMIN_TOKEN, sondern eine eigene Sitzung je Gerät (in localStorage nur mit „Gerät merken“).

import { esc, catImg, fmtDateTime, fmtAgo, patternLabel, statusChip, severityChip } from './ui.js';
import { setLang } from './i18n.js';
import { cafeAdminInfo } from './views/cafe.js'; // Café-QR: Code und Zahlen je Café
import { takeFragmentCode } from './qr-kit.js';
import { renderSetupHub, wireLocation, openCafeQr, openOnPhone } from './admin-setup.js'; // Erweiterung qr-setup

// Code aus dem Fragment sofort lesen und aus der Adresszeile nehmen (nie in Verlauf, Lesezeichen, Logs)
const pairCode = takeFragmentCode('setup');

const T = {
  de: {
    login: 'Anmelden', token: 'Admin-Token', logout: 'Abmelden', setup: 'Einrichten', queue: 'Prüfliste', places: 'Cafés & Orte', players: 'Spieler:innen', cats: 'Katzen', ai: 'KI',
    dupes: 'Mögliche Dubletten', disputes: 'Einsprüche („nicht diese Katze“)', flagged: 'Auffällige Fänge', pending: 'Ortsvorschläge', empty: 'Nichts zu tun 🎉',
    mergeInto: '→ zusammenführen in diese', ownCat: 'Ist eine eigene Katze', split: 'Als neue Katze abtrennen', keep: 'Zuordnung behalten', reject: 'Ablehnen',
    ok: 'In Ordnung', approve: 'Freigeben', photo: 'Ganzes Foto', newPartner: 'Neues Partner-Café', name: 'Name', lat: 'Breite', lon: 'Länge', address: 'Adresse',
    hours: 'Öffnungszeiten', minCats: 'Katzen nötig', discount: 'Rabatt %', maxPerDay: 'Max. pro Tag (leer = unbegrenzt)', pin: 'PIN (6–12 Ziffern, leer = unverändert)',
    pinNew: 'PIN (freiwillig – leer lassen: das Café wählt sie selbst per QR-Code)',
    active: 'aktiv', save: 'Speichern', search: 'Suchen', role: 'Rolle', ban: 'Sperren', unban: 'Entsperren', legend: 'Legende', title: 'Titel', rename: 'Umbenennen',
    status: 'Status', merge: 'Zusammenführen in ID', reason: 'Grund', saved: 'Gespeichert ✓', error: 'Fehler', redemptions: 'Einlösungen', edit: 'Bearbeiten',
    // ── Erweiterung: qr-setup ──
    loginTitle: 'Moderation', brand: 'Moderation', loginLead: 'Am einfachsten: auf dem Server „bash deploy/qr.sh“ eingeben und den QR-Code mit dem Handy scannen.',
    loginOr: 'Oder mit dem Admin-Token:', remember: 'Dieses Gerät merken (30 Tage)', pairing: 'Verbinde mit dem Handy …',
    pairFail: 'Dieser QR-Code geht nicht mehr (abgelaufen oder schon benutzt). Neuen holen: bash deploy/qr.sh', badToken: 'Token falsch.',
    paired: 'Mit Handy verbunden', pairedLead: 'Dieses Gerät bleibt 30 Tage angemeldet. Abmelden: unten bei „Geräte“.',
    'hub.title': 'Mit dem Handy einrichten', 'hub.lead': 'Für alles gibt es einen QR-Code. Mit der Handykamera scannen – fertig.',
    'qr.make': 'QR-Code erstellen', 'qr.again': 'Neuer QR-Code', 'qr.copy': 'Link kopieren', 'qr.copied': 'Kopiert', 'qr.share': 'Teilen', 'qr.link': 'Link',
    'qr.left': 'Noch {t} gültig', 'qr.expired': 'Abgelaufen. Erstelle einen neuen QR-Code.', 'qr.used': 'Benutzt', 'qr.uses': '{n} von {max} benutzt',
    'qr.usedAdmin': 'Das Handy ist jetzt angemeldet.', 'qr.usedCafe': 'Das Café hat seine PIN gewählt und ist angemeldet.',
    'qr.alt': 'QR-Code zum Scannen', 'qr.secret': 'Der QR-Code ist wie ein Schlüssel. Zeig ihn nur der richtigen Person.',
    'cafe.title': 'Ein Café einrichten', 'cafe.lead': 'Café wählen. Dann den QR-Code mit dem Handy des Cafés scannen. Das Café wählt seine PIN selbst. 7 Tage gültig, einmal.',
    'cafe.pick': 'Café', 'cafe.noPin': 'noch keine PIN', 'cafe.none': 'Noch kein freigegebenes Café.', 'cafe.new': 'Neues Café anlegen', 'cafe.print': 'Tischkarten drucken',
    'cafe.shareText': 'So richtest du {name} bei Cat Me If You Can ein: Link öffnen und eine PIN wählen.', 'cafe.saved': 'Café gespeichert ✓ Jetzt den QR-Code mit dem Handy des Cafés scannen.',
    'cafe.setupQr': 'Einrichtungs-QR', 'cafe.pinMissing': 'noch keine PIN',
    'cafe.modalLead': 'Diesen QR-Code mit dem Handy des Cafés scannen. Das Café wählt seine PIN selbst. 7 Tage gültig, einmal.',
    'vol.title': 'Freiwillige einladen', 'vol.lead': 'Freiwillige scannen den QR-Code, wählen einen Spitznamen und sind dann Freiwillige. 7 Tage gültig.',
    'vol.uses': 'Für wie viele Personen?', 'vol.shareText': 'Hilf den Straßenkatzen von Kadıköy: Mit diesem Link wirst du Freiwillige:r bei Cat Me If You Can.',
    'adm.title': 'Weiteres Admin-Handy', 'adm.lead': 'Mit dem neuen Handy scannen. Die Moderation öffnet sich, schon angemeldet. 10 Minuten gültig, einmal.',
    'phone.title': 'Am Handy öffnen', 'phone.lead': 'Mit der Handykamera scannen. Die Moderation öffnet sich am Handy, schon angemeldet.',
    'codes.title': 'Offene QR-Codes', 'codes.none': 'Keine offenen QR-Codes.', 'codes.revoked': 'Ungültig gemacht.', revoke: 'Ungültig machen', until: 'bis {d}',
    p_admin: 'Admin-Handy', p_partner: 'Café', p_volunteer: 'Freiwillige',
    'dev.title': 'Geräte', 'dev.this': 'dieses Gerät', 'dev.viaQr': 'per QR-Code', 'dev.viaLogin': 'per Token', 'dev.last': 'zuletzt {t}', 'dev.logout': 'Abmelden',
    'dev.others': 'Alle anderen Geräte abmelden', 'dev.othersConfirm': 'Alle anderen Geräte abmelden?', 'dev.none': 'Noch keine Geräte.',
    'dev.master': 'Der Admin-Token (ADMIN_TOKEN) steht nicht in dieser Liste. Handy verloren? Token in deploy/.env ändern und neu starten – dann sind alle Geräte abgemeldet.',
    'loc.use': 'Meinen Standort nehmen', 'loc.searching': 'Suche Standort …', 'loc.acc': 'Genauigkeit ±{m} m', 'loc.weak': 'ungenau, am besten im Café am Fenster nochmal',
    'loc.fail': 'Kein Standort. Erlaube den Zugriff oder tippe die Zahlen ein.', 'loc.hint': 'Im Café stehen und tippen – Breite und Länge füllen sich.',
    'u.d': 'Tage', 'u.d1': 'Tag', 'u.h': 'Std', 'u.min': 'Min',
    sessionGone: 'Du bist abgemeldet. Bitte neu anmelden.', tooMany: 'Zu viele Versuche. Warte eine Minute.',
    'qr.revoked': 'Dieser QR-Code gilt nicht mehr.', more: 'Weitere {n} zeigen',
  },
  tr: {
    login: 'Giriş', token: 'Yönetici anahtarı', logout: 'Çıkış', setup: 'Kurulum', queue: 'İnceleme', places: 'Kafeler & yerler', players: 'Oyuncular', cats: 'Kediler', ai: 'Yapay zekâ',
    dupes: 'Olası tekrar kayıtlar', disputes: 'İtirazlar („bu o kedi değil“)', flagged: 'Şüpheli yakalamalar', pending: 'Yer önerileri', empty: 'Yapılacak bir şey yok 🎉',
    mergeInto: '→ bununla birleştir', ownCat: 'Ayrı bir kedi', split: 'Yeni kedi olarak ayır', keep: 'Eşleşmeyi koru', reject: 'Reddet',
    ok: 'Tamam', approve: 'Onayla', photo: 'Tam fotoğraf', newPartner: 'Yeni partner kafe', name: 'İsim', lat: 'Enlem', lon: 'Boylam', address: 'Adres',
    hours: 'Çalışma saatleri', minCats: 'Gerekli kedi', discount: 'İndirim %', maxPerDay: 'Günlük en fazla (boş = sınırsız)', pin: 'PIN (6–12 rakam, boş = değişmez)',
    pinNew: 'PIN (isteğe bağlı – boş bırak: kafe PIN\'ini QR kod ile kendisi seçer)',
    active: 'aktif', save: 'Kaydet', search: 'Ara', role: 'Rol', ban: 'Engelle', unban: 'Engeli kaldır', legend: 'Efsane', title: 'Unvan', rename: 'Yeniden adlandır',
    status: 'Durum', merge: 'Bu ID ile birleştir', reason: 'Sebep', saved: 'Kaydedildi ✓', error: 'Hata', redemptions: 'Kullanım', edit: 'Düzenle',
    // ── Erweiterung: qr-setup ──
    loginTitle: 'Yönetim', brand: 'Yönetim', loginLead: 'En kolayı: sunucuda „bash deploy/qr.sh“ yaz ve QR kodu telefonla okut.',
    loginOr: 'Ya da yönetici anahtarıyla:', remember: 'Bu cihazı hatırla (30 gün)', pairing: 'Telefon bağlanıyor…',
    pairFail: 'Bu QR kod artık çalışmıyor (süresi doldu ya da kullanıldı). Yenisi için: bash deploy/qr.sh', badToken: 'Anahtar yanlış.',
    paired: 'Telefon bağlandı', pairedLead: 'Bu cihaz 30 gün giriş yapılmış kalır. Çıkış için: aşağıda „Cihazlar“.',
    'hub.title': 'Telefonla kurulum', 'hub.lead': 'Her şey için bir QR kod var. Telefonun kamerasıyla okut, bu kadar.',
    'qr.make': 'QR kod oluştur', 'qr.again': 'Yeni QR kod', 'qr.copy': 'Bağlantıyı kopyala', 'qr.copied': 'Kopyalandı', 'qr.share': 'Paylaş', 'qr.link': 'Bağlantı',
    'qr.left': '{t} daha geçerli', 'qr.expired': 'Süresi doldu. Yeni bir QR kod oluştur.', 'qr.used': 'Kullanıldı', 'qr.uses': '{max} kişiden {n} kişi kullandı',
    'qr.usedAdmin': 'Telefon artık giriş yapmış durumda.', 'qr.usedCafe': 'Kafe PIN\'ini seçti ve giriş yaptı.',
    'qr.alt': 'Okutulacak QR kod', 'qr.secret': 'Bu QR kod bir anahtar gibidir. Sadece doğru kişiye göster.',
    'cafe.title': 'Bir kafeyi kur', 'cafe.lead': 'Kafeyi seç. Sonra QR kodu kafenin telefonuyla okut. Kafe PIN\'ini kendisi seçer. 7 gün geçerli, tek kullanım.',
    'cafe.pick': 'Kafe', 'cafe.noPin': 'henüz PIN yok', 'cafe.none': 'Henüz onaylı kafe yok.', 'cafe.new': 'Yeni kafe ekle', 'cafe.print': 'Masa kartı yazdır',
    'cafe.shareText': '{name} için Cat Me If You Can kurulumu: bağlantıyı aç ve bir PIN seç.', 'cafe.saved': 'Kafe kaydedildi ✓ Şimdi QR kodu kafenin telefonuyla okut.',
    'cafe.setupQr': 'Kurulum QR\'ı', 'cafe.pinMissing': 'henüz PIN yok',
    'cafe.modalLead': 'Bu QR kodu kafenin telefonuyla okut. Kafe PIN\'ini kendisi seçer. 7 gün geçerli, tek kullanım.',
    'vol.title': 'Gönüllü davet et', 'vol.lead': 'Gönüllüler QR kodu okutur, bir takma ad seçer ve gönüllü olur. 7 gün geçerli.',
    'vol.uses': 'Kaç kişi için?', 'vol.shareText': 'Kadıköy\'ün sokak kedilerine yardım et: Bu bağlantıyla Cat Me If You Can\'de gönüllü olursun.',
    'adm.title': 'Başka bir yönetici telefonu', 'adm.lead': 'Yeni telefonla okut. Yönetim sayfası giriş yapılmış açılır. 10 dakika geçerli, tek kullanım.',
    'phone.title': 'Telefonda aç', 'phone.lead': 'Telefonun kamerasıyla okut. Yönetim sayfası telefonda giriş yapılmış açılır.',
    'codes.title': 'Açık QR kodlar', 'codes.none': 'Açık QR kod yok.', 'codes.revoked': 'Geçersiz yapıldı.', revoke: 'Geçersiz yap', until: 'son: {d}',
    p_admin: 'Yönetici telefonu', p_partner: 'Kafe', p_volunteer: 'Gönüllü',
    'dev.title': 'Cihazlar', 'dev.this': 'bu cihaz', 'dev.viaQr': 'QR kod ile', 'dev.viaLogin': 'anahtar ile', 'dev.last': 'son kullanım {t}', 'dev.logout': 'Çıkış yap',
    'dev.others': 'Diğer bütün cihazlardan çıkış yap', 'dev.othersConfirm': 'Diğer bütün cihazlardan çıkılsın mı?', 'dev.none': 'Henüz cihaz yok.',
    'dev.master': 'Yönetici anahtarı (ADMIN_TOKEN) bu listede yok. Telefon mu kayboldu? deploy/.env içinde anahtarı değiştir ve yeniden başlat – bütün cihazlardan çıkılır.',
    'loc.use': 'Konumumu kullan', 'loc.searching': 'Konum aranıyor…', 'loc.acc': 'Doğruluk ±{m} m', 'loc.weak': 'kaba – kafenin içinde, pencere yanında tekrar dene',
    'loc.fail': 'Konum alınamadı. İzin ver ya da sayıları elle yaz.', 'loc.hint': 'Kafede dur ve dokun – enlem ve boylam kendiliğinden dolar.',
    'u.d': 'gün', 'u.d1': 'gün', 'u.h': 'sa', 'u.min': 'dk',
    sessionGone: 'Oturumun kapandı. Lütfen tekrar giriş yap.', tooMany: 'Çok fazla deneme. Bir dakika bekle.',
    'qr.revoked': 'Bu QR kod artık geçerli değil.', more: '{n} tane daha göster',
  },
  en: {
    login: 'Log in', token: 'Admin token', logout: 'Log out', setup: 'Setup', queue: 'Review', places: 'Cafés & places', players: 'Players', cats: 'Cats', ai: 'AI',
    dupes: 'Possible duplicates', disputes: 'Disputes ("not this cat")', flagged: 'Flagged catches', pending: 'Place suggestions', empty: 'Nothing to do 🎉',
    mergeInto: '→ merge into this one', ownCat: 'Is a separate cat', split: 'Split off as new cat', keep: 'Keep match', reject: 'Reject',
    ok: 'Fine', approve: 'Approve', photo: 'Full photo', newPartner: 'New partner café', name: 'Name', lat: 'Latitude', lon: 'Longitude', address: 'Address',
    hours: 'Opening hours', minCats: 'Cats needed', discount: 'Discount %', maxPerDay: 'Max per day (empty = unlimited)', pin: 'PIN (6–12 digits, empty = unchanged)',
    pinNew: 'PIN (optional – leave empty: the café picks it with the QR code)',
    active: 'active', save: 'Save', search: 'Search', role: 'Role', ban: 'Ban', unban: 'Unban', legend: 'Legend', title: 'Title', rename: 'Rename',
    status: 'Status', merge: 'Merge into ID', reason: 'Reason', saved: 'Saved ✓', error: 'Error', redemptions: 'Redemptions', edit: 'Edit',
    // ── Erweiterung: qr-setup ──
    loginTitle: 'Admin', brand: 'Admin', loginLead: 'Easiest: on the server, type "bash deploy/qr.sh" and scan the QR code with your phone.',
    loginOr: 'Or with the admin token:', remember: 'Remember this device (30 days)', pairing: 'Connecting your phone …',
    pairFail: 'This QR code does not work any more (expired or used). Get a new one: bash deploy/qr.sh', badToken: 'Wrong token.',
    paired: 'Phone connected', pairedLead: 'This device stays logged in for 30 days. To log out: see "Devices" below.',
    'hub.title': 'Set up with your phone', 'hub.lead': 'There is a QR code for everything. Scan it with the phone camera. That’s all.',
    'qr.make': 'Make QR code', 'qr.again': 'New QR code', 'qr.copy': 'Copy link', 'qr.copied': 'Copied', 'qr.share': 'Share', 'qr.link': 'Link',
    'qr.left': 'Valid for {t}', 'qr.expired': 'Expired. Make a new QR code.', 'qr.used': 'Used', 'qr.uses': '{n} of {max} used',
    'qr.usedAdmin': 'The phone is logged in now.', 'qr.usedCafe': 'The café picked its PIN and is logged in.',
    'qr.alt': 'QR code to scan', 'qr.secret': 'This QR code is like a key. Only show it to the right person.',
    'cafe.title': 'Set up a café', 'cafe.lead': 'Pick the café. Then scan the QR code with the café’s phone. The café picks its own PIN. Valid for 7 days, one use.',
    'cafe.pick': 'Café', 'cafe.noPin': 'no PIN yet', 'cafe.none': 'No approved café yet.', 'cafe.new': 'Add a new café', 'cafe.print': 'Print table cards',
    'cafe.shareText': 'Set up {name} for Cat Me If You Can: open the link and pick a PIN.', 'cafe.saved': 'Café saved ✓ Now scan the QR code with the café’s phone.',
    'cafe.setupQr': 'Setup QR', 'cafe.pinMissing': 'no PIN yet',
    'cafe.modalLead': 'Scan this QR code with the café’s phone. The café picks its own PIN. Valid for 7 days, one use.',
    'vol.title': 'Invite volunteers', 'vol.lead': 'Volunteers scan the QR code, pick a nickname and become volunteers. Valid for 7 days.',
    'vol.uses': 'For how many people?', 'vol.shareText': 'Help the street cats of Kadıköy: with this link you become a volunteer at Cat Me If You Can.',
    'adm.title': 'Add another admin phone', 'adm.lead': 'Scan with the new phone. The admin page opens, already logged in. Valid for 10 minutes, one use.',
    'phone.title': 'Open on phone', 'phone.lead': 'Scan with the phone camera. The admin page opens on the phone, already logged in.',
    'codes.title': 'Open QR codes', 'codes.none': 'No open QR codes.', 'codes.revoked': 'Cancelled.', revoke: 'Cancel', until: 'until {d}',
    p_admin: 'Admin phone', p_partner: 'Café', p_volunteer: 'Volunteers',
    'dev.title': 'Devices', 'dev.this': 'this device', 'dev.viaQr': 'with QR code', 'dev.viaLogin': 'with token', 'dev.last': 'last used {t}', 'dev.logout': 'Log out',
    'dev.others': 'Log out all other devices', 'dev.othersConfirm': 'Log out all other devices?', 'dev.none': 'No devices yet.',
    'dev.master': 'The admin token (ADMIN_TOKEN) is not in this list. Lost a phone? Change the token in deploy/.env and restart – then all devices are logged out.',
    'loc.use': 'Use my location', 'loc.searching': 'Finding location …', 'loc.acc': 'Accuracy ±{m} m', 'loc.weak': 'rough – try again inside the café, near a window',
    'loc.fail': 'No location. Allow access or type the numbers.', 'loc.hint': 'Stand in the café and tap – latitude and longitude fill in.',
    'u.d': 'days', 'u.d1': 'day', 'u.h': 'h', 'u.min': 'min',
    sessionGone: 'You are logged out. Please log in again.', tooMany: 'Too many tries. Wait one minute.',
    'qr.revoked': 'This QR code does not work any more.', more: 'Show {n} more',
  },
};
const LANGS = ['tr', 'en', 'de'];
/** Sprache: gemerkte Wahl (catme.lang), sonst Browser, sonst Englisch (BRAND.md §3). */
function detectLang() {
  try {
    const saved = localStorage.getItem('catme.lang');
    if (saved && T[saved]) return saved;
  } catch {
    /* kein Speicher */
  }
  for (const l of navigator.languages || [navigator.language || '']) {
    const c = String(l || '').slice(0, 2).toLowerCase();
    if (T[c]) return c;
  }
  return 'en';
}
let lang = detectLang();
const t = (k, v) => {
  const s = T[lang][k] ?? T.en[k] ?? k;
  return v ? s.replace(/\{(\w+)\}/g, (_, x) => (v[x] != null ? v[x] : '')) : s;
};

// Sitzung: localStorage (Gerät merken, 30 Tage) oder sessionStorage (nur dieser Tab, 12 Stunden).
// LEGACY_KEY: Dort lag früher der ADMIN_TOKEN selbst. Er wird beim Start gegen eine eigene Sitzung
// getauscht und gelöscht – danach steht der Master-Token nirgends mehr im Browser.
const LEGACY_KEY = 'catme.admin.token';
const KEY_TAB = 'catme.admin.tabSession';
const KEY_LOCAL = 'catme.admin.session';
const TAB_KEY = 'catme.admin.tab';
const safe = (fn, fb = null) => {
  try {
    return fn();
  } catch {
    return fb;
  }
};
let token = safe(() => localStorage.getItem(KEY_LOCAL)) || safe(() => sessionStorage.getItem(KEY_TAB));
const legacyToken = safe(() => sessionStorage.getItem(LEGACY_KEY));
safe(() => sessionStorage.removeItem(LEGACY_KEY));
function saveToken(tok, remember) {
  token = tok;
  safe(() => sessionStorage.removeItem(KEY_TAB));
  safe(() => sessionStorage.removeItem(LEGACY_KEY));
  safe(() => localStorage.removeItem(KEY_LOCAL));
  if (!tok) return;
  if (remember) safe(() => localStorage.setItem(KEY_LOCAL, tok));
  else safe(() => sessionStorage.setItem(KEY_TAB, tok));
}
const TABS = ['setup', 'queue', 'places', 'players', 'cats', 'ai'];
let tab = safe(() => sessionStorage.getItem(TAB_KEY));
if (!TABS.includes(tab)) tab = 'setup';
let pairedNow = false;
const view = document.querySelector('#view');
// Reiter kleben unter dem Kopf: dessen Höhe (mit Safe-Area) als CSS-Variable
const head = document.querySelector('.top');
if (head) {
  const setHead = () => document.documentElement.style.setProperty('--head-h', `${head.offsetHeight}px`);
  setHead();
  if ('ResizeObserver' in window) new ResizeObserver(setHead).observe(head);
}

async function api(method, path, body, tok = token) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'error'), { code: data.error, status: res.status });
  return data;
}

function flash(msg, bad = false) {
  const el = document.createElement('div');
  el.className = `toast ${bad ? 'error' : 'success'}`;
  el.textContent = msg;
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    document.body.append(host);
  }
  host.append(el);
  setTimeout(() => el.remove(), 3200);
}

async function act(fn) {
  try {
    await fn();
    flash(t('saved'));
    render();
  } catch (e) {
    flash(`${t('error')}: ${e.message}`, true);
  }
}

function langs() {
  const el = document.querySelector('[data-langs]');
  el.innerHTML = LANGS.map((l) => `<button type="button" data-lang="${l}" lang="${l}" class="${l === lang ? 'on' : ''}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    safe(() => localStorage.setItem('catme.lang', lang));
    langs();
    render();
  };
}

/** Gemeinsamer Kontext für admin-setup.js */
const ctx = {
  api: (...a) => api(...a),
  t: (...a) => t(...a),
  flash,
  consumePaired: () => {
    const p = pairedNow;
    pairedNow = false;
    return p;
  },
  loggedOut: () => {
    saveToken(null);
    render();
  },
  goNewCafe: () => {
    tab = 'places';
    safe(() => sessionStorage.setItem(TAB_KEY, tab));
    render().then(() => {
      const f = view.querySelector('form.place-form[data-place=""]');
      if (f) {
        f.scrollIntoView({ block: 'start' });
        f.name.focus({ preventScroll: true });
      }
    });
  },
};

/** Kopfzeile „Cat Me · Moderation“ in der gewählten Sprache (tr: Yönetim). */
function brandMark() {
  const mark = document.querySelector('.top .wordmark i');
  if (mark) mark.textContent = t('brand');
}

function renderLogin(msg = '', { busy = false } = {}) {
  document.body.classList.remove('signed-in');
  document.documentElement.lang = lang;
  brandMark();
  headerActions();
  view.innerHTML = `<section class="card staff-card login-card"><h1>🛡️ ${esc(t('loginTitle'))}</h1>
    ${busy ? `<p class="pairing" role="status">📱 ${esc(t('pairing'))}</p>` : ''}
    ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
    <p class="login-lead">📱 ${esc(t('loginLead'))}</p>
    <form data-f class="settings">
      <p class="muted small">${esc(t('loginOr'))}</p>
      <label>${esc(t('token'))}<input name="token" type="password" autocomplete="current-password" required></label>
      <label class="check"><input type="checkbox" name="remember"> ${esc(t('remember'))}</label>
      <button class="btn primary big">${esc(t('login'))}</button>
    </form>
    <p class="small muted">ADMIN_TOKEN · deploy/.env · data/admin-token.txt</p></section>`;
  view.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const master = f.token.value.trim();
    const btn = f.querySelector('button');
    btn.disabled = true;
    try {
      // eigene Sitzung für dieses Gerät – der Token selbst wird nirgends gespeichert
      const r = await api('POST', '/api/admin/sessions', { remember: f.remember.checked }, master);
      saveToken(r.token, f.remember.checked);
      render();
    } catch (err) {
      btn.disabled = false;
      renderLogin(err.status === 403 || err.status === 401 ? t('badToken') : err.status === 429 ? t('tooMany') : err.message);
    }
  });
}

async function pairWithCode(code) {
  renderLogin('', { busy: true });
  try {
    const r = await api('POST', '/api/setup/admin', { code }, null);
    const old = token;
    saveToken(r.token, true); // gekoppeltes Gerät: bleibt angemeldet (Abmelden unter „Geräte“)
    if (old && old !== r.token) api('POST', '/api/admin/logout', {}, old).catch(() => {}); // alte Sitzung dieses Geräts beenden
    pairedNow = true;
    tab = 'setup';
    render();
  } catch (e) {
    if (token && e.status !== 429) {
      render(); // schon angemeldet – der alte QR-Code ist egal
      return flash(t('pairFail'), true);
    }
    renderLogin(e.status === 429 ? t('tooMany') : t('pairFail'));
  }
}

function headerActions() {
  const host = document.querySelector('[data-head-actions]');
  if (!host) return;
  host.innerHTML = token ? `<button type="button" class="btn small head-phone" data-open-phone>📱 ${esc(t('phone.title'))}</button>` : '';
  const b = host.querySelector('[data-open-phone]');
  if (b) b.addEventListener('click', () => openOnPhone(ctx));
}

function nav() {
  return `<nav class="seg admin-tabs" aria-label="${esc(t('loginTitle'))}">${TABS.map((k) => `<button type="button" data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-current="${k === tab ? 'page' : 'false'}">${k === 'setup' ? '📱 ' : ''}${esc(t(k))}</button>`).join('')}</nav>`;
}

function miniCat(c) {
  return `<a class="mini" href="./#/cat/${esc(c.id)}" target="_blank">${catImg(c, { size: 'sm' })}<span><b>${esc(c.name || '—')}</b> <small class="muted">${esc(c.id)}</small><br>
    <small>${esc(patternLabel(c.profile && c.profile.pattern))} · ${esc(c.districtName || '')} · ${c.observationCount}× · ${esc(fmtAgo(c.lastSeenAt))}</small>
    <br><small>${esc((c.profile && c.profile.distinctive_marks) || '')}</small></span></a>`;
}

async function showFullPhoto(photoUrl) {
  const id = /\/photos\/([0-9a-f]{20})_c\.jpg/.exec(photoUrl || '');
  if (!id) return;
  const res = await fetch(`/api/admin/photos/${id[1]}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return flash(t('error'), true);
  const url = URL.createObjectURL(await res.blob());
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal pad"><button class="modal-x">✕</button><img src="${url}" alt="" style="width:100%;border-radius:12px"></div>`;
  w.onclick = () => {
    w.remove();
    URL.revokeObjectURL(url);
  };
  document.body.append(w);
}

async function renderQueue(body) {
  const q = await api('GET', '/api/admin/queue');
  const empty = !q.cats.length && !q.disputes.length && !q.flagged.length && !q.places.length;
  body.innerHTML = empty ? `<p class="center pad">${esc(t('empty'))}</p>` : `
    ${q.cats.length ? `<section class="card"><h2>${esc(t('dupes'))} (${q.cats.length})</h2>${q.cats.map((x) => `
      <div class="review">${miniCat(x.cat)}
        <div class="dupes">${x.possibleDuplicates.map((d) => `<div>${miniCat(d)}<button class="btn small" data-merge="${esc(x.cat.id)}" data-into="${esc(d.id)}">${esc(t('mergeInto'))}</button></div>`).join('')}</div>
        <button class="btn small" data-own="${esc(x.cat.id)}">${esc(t('ownCat'))}</button></div>`).join('')}</section>` : ''}
    ${q.disputes.length ? `<section class="card"><h2>${esc(t('disputes'))} (${q.disputes.length})</h2>${q.disputes.map((d) => d.observation ? `
      <div class="review"><div class="mini">${d.observation.photoUrl ? `<img class="catimg sm" src="${esc(d.observation.photoUrl)}" alt="">` : ''}<span><b>${esc(d.by || '')}</b>: ${esc(d.reason)}<br><small>${esc(fmtDateTime(d.observation.at))} · <a href="./#/cat/${esc(d.observation.catId)}" target="_blank">${esc(d.observation.catId)}</a></small></span></div>
        <div class="actions"><button class="btn small" data-split="${esc(d.observation.id)}">${esc(t('split'))}</button><button class="btn small" data-resolve="${esc(d.id)}">${esc(t('keep'))}</button><button class="btn small danger-soft" data-reject="${esc(d.observation.id)}">${esc(t('reject'))}</button>${d.observation.photoUrl ? `<button class="btn small ghost" data-photo="${esc(d.observation.photoUrl)}">${esc(t('photo'))}</button>` : ''}</div></div>` : '').join('')}</section>` : ''}
    ${q.flagged.length ? `<section class="card"><h2>${esc(t('flagged'))} (${q.flagged.length})</h2>${q.flagged.map((o) => `
      <div class="review"><div class="mini">${o.photoUrl ? `<img class="catimg sm" src="${esc(o.photoUrl)}" alt="">` : ''}<span><b>${esc(o.by || '')}</b> · ${esc(fmtDateTime(o.at))}<br><small class="warn">${esc((o.flags || []).join(', '))}</small> · <small>${esc(Number(o.lat).toFixed(5))}, ${esc(Number(o.lon).toFixed(5))}</small></span></div>
        <div class="actions"><button class="btn small" data-okobs="${esc(o.id)}">${esc(t('ok'))}</button><button class="btn small danger-soft" data-reject="${esc(o.id)}">${esc(t('reject'))}</button>${o.photoUrl ? `<button class="btn small ghost" data-photo="${esc(o.photoUrl)}">${esc(t('photo'))}</button>` : ''}</div></div>`).join('')}</section>` : ''}
    ${q.places.length ? `<section class="card"><h2>${esc(t('pending'))} (${q.places.length})</h2>${q.places.map((p) => `
      <div class="review"><span><b>${esc(p.name)}</b> · ${esc(p.type)} · ${esc(p.lat.toFixed(5))}, ${esc(p.lon.toFixed(5))}<br><small>${esc((p.description && p.description.tr) || '')}</small></span>
        <div class="actions"><button class="btn small" data-approve="${esc(p.id)}">${esc(t('approve'))}</button><button class="btn small danger-soft" data-decline="${esc(p.id)}">${esc(t('reject'))}</button></div></div>`).join('')}</section>` : ''}`;
  body.onclick = (e) => {
    const d = e.target.closest('button');
    if (!d) return;
    const ds = d.dataset;
    if (ds.merge) act(() => api('POST', `/api/admin/cats/${ds.merge}/merge`, { into: ds.into }));
    else if (ds.own) act(() => api('POST', `/api/admin/cats/${ds.own}/reviewed`, {}));
    else if (ds.split) act(() => api('POST', `/api/admin/observations/${ds.split}/split`, {}));
    else if (ds.resolve) act(() => api('POST', `/api/admin/disputes/${ds.resolve}/resolve`, { resolution: 'kept' }));
    else if (ds.reject) {
      const reason = prompt(t('reason'), '');
      if (reason !== null) act(() => api('POST', `/api/admin/observations/${ds.reject}/reject`, { reason }));
    } else if (ds.okobs) act(() => api('POST', `/api/admin/observations/${ds.okobs}/reviewed`, {}));
    else if (ds.approve) act(() => api('POST', `/api/admin/places/${ds.approve}/review`, { approve: true }));
    else if (ds.decline) act(() => api('POST', `/api/admin/places/${ds.decline}/review`, { approve: false }));
    else if (ds.photo) showFullPhoto(ds.photo);
  };
}

function placeForm(p = {}) {
  const r = p.reward || {};
  const isNew = !p.id;
  return `<form class="settings place-form" data-place="${esc(p.id || '')}">
    <input type="hidden" name="type" value="${esc(p.type || 'partner')}">
    <label>${esc(t('name'))}<input name="name" value="${esc(p.name || '')}" required autocomplete="organization"></label>
    <div class="loc-row">
      <button type="button" class="btn wide" data-locate>📍 ${esc(t('loc.use'))}</button>
      <p class="loc-out small muted" data-loc-out aria-live="polite">${isNew ? esc(t('loc.hint')) : ''}</p>
    </div>
    <div class="row wrap"><label>${esc(t('lat'))}<input name="lat" value="${esc(p.lat ?? '')}" required inputmode="decimal"></label><label>${esc(t('lon'))}<input name="lon" value="${esc(p.lon ?? '')}" required inputmode="decimal"></label></div>
    <label>${esc(t('address'))}<input name="address" value="${esc(p.address || '')}" autocomplete="street-address"></label>
    <label>${esc(t('hours'))}<input name="hours" value="${esc(p.hours || '')}"></label>
    ${(p.type || 'partner') === 'partner' ? `<div class="row wrap"><label>${esc(t('minCats'))}<input name="minCats" type="number" inputmode="numeric" min="1" max="200" value="${esc(r.minCats ?? 20)}"></label><label>${esc(t('discount'))}<input name="discountPct" type="number" inputmode="numeric" min="1" max="100" value="${esc(r.discountPct ?? 20)}"></label></div>
    <label>${esc(t('maxPerDay'))}<input name="maxPerDay" type="number" inputmode="numeric" min="1" value="${esc(r.maxPerDay ?? '')}"></label>
    <label>${esc(isNew ? t('pinNew') : t('pin'))}<input name="pin" inputmode="numeric" pattern="[0-9]{6,12}" autocomplete="off"></label>` : ''}
    <label class="check"><input type="checkbox" name="active" ${p.active === false ? '' : 'checked'}> ${esc(t('active'))}</label>
    <button class="btn primary big">${esc(t('save'))}</button></form>`;
}

async function renderPlaces(body) {
  const [places, refs] = await Promise.all([api('GET', '/api/admin/places'), api('GET', '/api/admin/cafe/referrals').catch(() => ({}))]);
  const live = (p) => p.type === 'partner' && p.status === 'approved' && p.active !== false;
  body.innerHTML = `<section class="card"><h2>➕ ${esc(t('newPartner'))}</h2>${placeForm()}</section>
    <section class="card"><h2>${esc(t('places'))} (${places.length})</h2>${places.map((p) => `
      <details class="review"><summary><b>${esc(p.name)}</b> · ${esc(p.type)} · ${esc(p.status)}${p.active === false ? ' · ⏸' : ''}${p.type === 'partner' ? ` · ${esc(p.reward ? `${p.reward.minCats}🐱 → ${p.reward.discountPct}%` : '')} · ${esc(t('redemptions'))}: ${p.redemptions || 0}${p.hasPin === false ? ` · <span class="warn">${esc(t('cafe.pinMissing'))}</span>` : ''}${cafeAdminInfo(refs[p.id])}` : ''}</summary>
        ${live(p) ? `<p><button type="button" class="btn wide" data-setup-qr="${esc(p.id)}">📱 ${esc(t('cafe.setupQr'))}</button></p>` : ''}${placeForm(p)}</details>`).join('')}</section>`;
  body.querySelectorAll('form.place-form').forEach((f) => wireLocation(f, ctx));
  body.onclick = (e) => {
    const b = e.target.closest('[data-setup-qr]');
    if (!b) return;
    const p = places.find((x) => x.id === b.dataset.setupQr);
    if (p) openCafeQr(ctx, p);
  };
  body.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      id: f.dataset.place || undefined, type: f.type.value, name: f.name.value, lat: Number(f.lat.value), lon: Number(f.lon.value),
      address: f.address.value, hours: f.hours.value, active: f.active.checked,
    };
    if (f.minCats) data.reward = { minCats: Number(f.minCats.value), discountPct: Number(f.discountPct.value), maxPerDay: f.maxPerDay.value ? Number(f.maxPerDay.value) : null };
    if (f.pin && f.pin.value) data.pin = f.pin.value;
    if (data.id) return act(() => api('POST', '/api/admin/places', data));
    // Neues Café: speichern und gleich den Einrichtungs-QR fürs Café-Handy zeigen
    try {
      const place = await api('POST', '/api/admin/places', data);
      flash(t('cafe.saved'));
      await render();
      if (live(place)) openCafeQr(ctx, place);
    } catch (err) {
      flash(`${t('error')}: ${err.message}`, true);
    }
  };
}

async function renderPlayers(body, qstr = '') {
  const list = await api('GET', `/api/admin/players?q=${encodeURIComponent(qstr)}`);
  body.innerHTML = `<form class="row" data-search><input name="q" value="${esc(qstr)}" placeholder="${esc(t('search'))}" type="search"><button class="btn">${esc(t('search'))}</button></form>
    <section class="card players-card"><ul class="plain-list players">${list.map((p) => `
      <li><span class="pl-name"><b>${esc(p.nickname)}</b>${p.banned ? ' ⛔' : ''}<br><small class="muted"><bdi dir="ltr">${p.xp} XP · ${p.observations} 🐱</bdi></small></span>
      <label class="pl-role"><span class="sr">${esc(t('role'))}</span><select data-role="${esc(p.id)}">${['player', 'volunteer', 'admin'].map((r) => `<option ${r === p.role ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <button class="btn small ${p.banned ? '' : 'danger-soft'}" data-ban="${esc(p.id)}" data-v="${p.banned ? '0' : '1'}">${esc(p.banned ? t('unban') : t('ban'))}</button></li>`).join('')}</ul></section>`;
  body.querySelector('[data-search]').onsubmit = (e) => {
    e.preventDefault();
    renderPlayers(body, e.target.q.value);
  };
  body.onchange = (e) => {
    const s = e.target.closest('[data-role]');
    if (s) act(() => api('POST', `/api/admin/players/${s.dataset.role}/role`, { role: s.value }));
  };
  body.onclick = (e) => {
    const b = e.target.closest('[data-ban]');
    if (b) act(() => api('POST', `/api/admin/players/${b.dataset.ban}/ban`, { banned: b.dataset.v === '1' }));
  };
}

async function renderCats(body, qstr = '') {
  const res = await fetch(`/api/cats?limit=60&sort=recent${qstr ? `&q=${encodeURIComponent(qstr)}` : ''}`).then((r) => r.json());
  body.innerHTML = `<form class="row" data-search><input name="q" value="${esc(qstr)}" placeholder="${esc(t('search'))}" type="search"><button class="btn">${esc(t('search'))}</button></form>
    ${res.items.map((c) => `<details class="card review"><summary>${miniCat(c)} ${statusChip(c.status)} ${c.latest ? severityChip(c.latest.health_severity) : ''}</summary>
      <form class="settings" data-cat="${esc(c.id)}">
        <div class="row wrap"><label class="check"><input type="checkbox" name="legendary" ${c.legendary ? 'checked' : ''}> 🌟 ${esc(t('legend'))}</label><input name="title" value="${esc(c.title || '')}" placeholder="${esc(t('title'))}"></div>
        <div class="row"><input name="name" value="${esc(c.name || '')}" placeholder="${esc(t('name'))}"><button class="btn small" data-do="rename">${esc(t('rename'))}</button></div>
        <div class="row"><select name="status">${['active', 'needs_help', 'in_care', 'adopted', 'deceased'].map((s) => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn small" data-do="status">${esc(t('status'))}</button></div>
        <div class="row"><input name="into" placeholder="c_…"><button class="btn small" data-do="merge">${esc(t('merge'))}</button></div>
        <button class="btn small" data-do="legend">🌟 ${esc(t('save'))}</button>
      </form></details>`).join('')}`;
  body.querySelector('[data-search]').onsubmit = (e) => {
    e.preventDefault();
    renderCats(body, e.target.q.value);
  };
  body.onclick = (e) => {
    const b = e.target.closest('[data-do]');
    if (!b) return;
    e.preventDefault();
    const f = b.closest('[data-cat]');
    const id = f.dataset.cat;
    const map = {
      rename: () => api('POST', `/api/admin/cats/${id}/rename`, { name: f.name.value }),
      status: () => api('POST', `/api/admin/cats/${id}/status`, { status: f.status.value, note: 'moderation' }),
      merge: () => api('POST', `/api/admin/cats/${id}/merge`, { into: f.into.value.trim() }),
      legend: () => api('POST', `/api/admin/cats/${id}/legend`, { legendary: f.legendary.checked, title: f.title.value }),
    };
    act(map[b.dataset.do]);
  };
}

async function renderAi(body) {
  const r = await api('GET', '/api/admin/ai');
  body.innerHTML = `<section class="card"><h2>🤖 ${esc(t('ai'))}</h2><p><b>${esc(r.info)}</b></p>${r.stats ? `<pre class="small">${esc(JSON.stringify(r.stats, null, 2))}</pre>` : ''}</section>`;
}

async function render() {
  setLang(lang, { persist: false }); // Beschriftungen aus ui.js (Fellmuster, „vor x Tagen“) in derselben Sprache
  document.documentElement.lang = lang;
  brandMark();
  if (!token) return renderLogin();
  document.body.classList.add('signed-in');
  headerActions();
  view.innerHTML = `${nav()}<div data-body><p class="center pad">…</p></div>
    <p class="right"><button type="button" class="btn ghost small" data-logout>${esc(t('logout'))}</button></p>`;
  view.querySelector('.admin-tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) {
      tab = b.dataset.tab;
      safe(() => sessionStorage.setItem(TAB_KEY, tab));
      render();
    }
  };
  view.querySelector('[data-logout]').onclick = async () => {
    await api('POST', '/api/admin/logout', {}).catch(() => {});
    saveToken(null);
    render();
  };
  const active = view.querySelector('.admin-tabs .on');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const body = view.querySelector('[data-body]');
  try {
    await ({ setup: (b) => renderSetupHub(b, ctx), queue: renderQueue, places: renderPlaces, players: renderPlayers, cats: renderCats, ai: renderAi })[tab](body);
  } catch (e) {
    if (e.status === 403 || e.status === 401) {
      saveToken(null);
      return renderLogin(t('sessionGone'));
    }
    body.innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

/** Früher gespeicherter ADMIN_TOKEN → eigene Sitzung für diesen Tab; der Token selbst ist schon gelöscht. */
async function migrateLegacy() {
  if (!legacyToken || token) return;
  try {
    const r = await api('POST', '/api/admin/sessions', { remember: false }, legacyToken);
    saveToken(r.token, false);
  } catch {
    /* Token ungültig → Anmeldung */
  }
}

langs();
migrateLegacy().then(() => (pairCode ? pairWithCode(pairCode) : render()));
