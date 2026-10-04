// Cat Me If You Can – Moderation: Prüfliste (Dubletten zusammenführen, Einsprüche, auffällige
// Fänge, Ortsvorschläge), Cafés/Partner anlegen, Spieler:innen (Rollen, Sperren), Katzen
// (Legende, Name, Status), KI-Status. Anmeldung mit ADMIN_TOKEN.

import { esc, catImg, fmtDateTime, fmtAgo, patternLabel, statusChip, severityChip } from './ui.js';
import { setLang } from './i18n.js';

const T = {
  de: {
    login: 'Anmelden', token: 'Admin-Token', logout: 'Abmelden', queue: 'Prüfliste', places: 'Cafés & Orte', players: 'Spieler:innen', cats: 'Katzen', ai: 'KI',
    dupes: 'Mögliche Dubletten', disputes: 'Einsprüche („nicht diese Katze“)', flagged: 'Auffällige Fänge', pending: 'Ortsvorschläge', empty: 'Nichts zu tun 🎉',
    mergeInto: '→ zusammenführen in diese', ownCat: 'Ist eine eigene Katze', split: 'Als neue Katze abtrennen', keep: 'Zuordnung behalten', reject: 'Ablehnen',
    ok: 'In Ordnung', approve: 'Freigeben', photo: 'Ganzes Foto', newPartner: 'Neues Partner-Café', name: 'Name', lat: 'Breite', lon: 'Länge', address: 'Adresse',
    hours: 'Öffnungszeiten', minCats: 'Katzen nötig', discount: 'Rabatt %', maxPerDay: 'Max. pro Tag (leer = unbegrenzt)', pin: 'PIN (6–12 Ziffern, leer = unverändert)',
    active: 'aktiv', save: 'Speichern', search: 'Suchen', role: 'Rolle', ban: 'Sperren', unban: 'Entsperren', legend: 'Legende', title: 'Titel', rename: 'Umbenennen',
    status: 'Status', merge: 'Zusammenführen in ID', reason: 'Grund', saved: 'Gespeichert ✓', error: 'Fehler', redemptions: 'Einlösungen', edit: 'Bearbeiten',
  },
  tr: {
    login: 'Giriş', token: 'Yönetici anahtarı', logout: 'Çıkış', queue: 'İnceleme', places: 'Kafeler & yerler', players: 'Oyuncular', cats: 'Kediler', ai: 'Yapay zekâ',
    dupes: 'Olası tekrar kayıtlar', disputes: 'İtirazlar („bu o kedi değil“)', flagged: 'Şüpheli yakalamalar', pending: 'Yer önerileri', empty: 'Yapılacak bir şey yok 🎉',
    mergeInto: '→ bununla birleştir', ownCat: 'Ayrı bir kedi', split: 'Yeni kedi olarak ayır', keep: 'Eşleşmeyi koru', reject: 'Reddet',
    ok: 'Tamam', approve: 'Onayla', photo: 'Tam fotoğraf', newPartner: 'Yeni partner kafe', name: 'İsim', lat: 'Enlem', lon: 'Boylam', address: 'Adres',
    hours: 'Çalışma saatleri', minCats: 'Gerekli kedi', discount: 'İndirim %', maxPerDay: 'Günlük en fazla (boş = sınırsız)', pin: 'PIN (6–12 rakam, boş = değişmez)',
    active: 'aktif', save: 'Kaydet', search: 'Ara', role: 'Rol', ban: 'Engelle', unban: 'Engeli kaldır', legend: 'Efsane', title: 'Unvan', rename: 'Yeniden adlandır',
    status: 'Durum', merge: 'Bu ID ile birleştir', reason: 'Sebep', saved: 'Kaydedildi ✓', error: 'Hata', redemptions: 'Kullanım', edit: 'Düzenle',
  },
  en: {
    login: 'Log in', token: 'Admin token', logout: 'Log out', queue: 'Review', places: 'Cafés & places', players: 'Players', cats: 'Cats', ai: 'AI',
    dupes: 'Possible duplicates', disputes: 'Disputes ("not this cat")', flagged: 'Flagged catches', pending: 'Place suggestions', empty: 'Nothing to do 🎉',
    mergeInto: '→ merge into this one', ownCat: 'Is a separate cat', split: 'Split off as new cat', keep: 'Keep match', reject: 'Reject',
    ok: 'Fine', approve: 'Approve', photo: 'Full photo', newPartner: 'New partner café', name: 'Name', lat: 'Latitude', lon: 'Longitude', address: 'Address',
    hours: 'Opening hours', minCats: 'Cats needed', discount: 'Discount %', maxPerDay: 'Max per day (empty = unlimited)', pin: 'PIN (6–12 digits, empty = unchanged)',
    active: 'active', save: 'Save', search: 'Search', role: 'Role', ban: 'Ban', unban: 'Unban', legend: 'Legend', title: 'Title', rename: 'Rename',
    status: 'Status', merge: 'Merge into ID', reason: 'Reason', saved: 'Saved ✓', error: 'Error', redemptions: 'Redemptions', edit: 'Edit',
  },
};
let lang = (() => {
  try {
    return localStorage.getItem('catme.lang') || 'de';
  } catch {
    return 'de';
  }
})();
if (!T[lang]) lang = 'de';
const t = (k) => T[lang][k] || T.de[k] || k;

const KEY = 'catme.admin.token';
let token = (() => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
let tab = 'queue';
const view = document.querySelector('#view');

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` },
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
    document.body.append(host);
  }
  host.append(el);
  setTimeout(() => el.remove(), 2600);
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
  el.innerHTML = Object.keys(T).map((l) => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}">${l.toUpperCase()}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    langs();
    render();
  };
}

function renderLogin(msg = '') {
  view.innerHTML = `<section class="card staff-card"><h1>🛡️ Moderation</h1><form data-f class="settings">
    <label>${esc(t('token'))}<input name="token" type="password" autocomplete="current-password" required></label>
    <button class="btn primary">${esc(t('login'))}</button>${msg ? `<p class="err">${esc(msg)}</p>` : ''}</form>
    <p class="small muted">ADMIN_TOKEN · data/admin-token.txt</p></section>`;
  view.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    token = e.target.token.value.trim();
    try {
      await api('GET', '/api/admin/queue');
      try {
        sessionStorage.setItem(KEY, token);
      } catch {
        /* egal */
      }
      render();
    } catch (err) {
      token = null;
      renderLogin(err.message);
    }
  });
}

function nav() {
  return `<div class="seg">${['queue', 'places', 'players', 'cats', 'ai'].map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
    <p class="right"><button class="link small" data-logout>${esc(t('logout'))}</button></p>`;
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
  return `<form class="settings place-form" data-place="${esc(p.id || '')}">
    <input type="hidden" name="type" value="${esc(p.type || 'partner')}">
    <label>${esc(t('name'))}<input name="name" value="${esc(p.name || '')}" required></label>
    <div class="row"><label>${esc(t('lat'))}<input name="lat" value="${esc(p.lat ?? '')}" required inputmode="decimal"></label><label>${esc(t('lon'))}<input name="lon" value="${esc(p.lon ?? '')}" required inputmode="decimal"></label></div>
    <label>${esc(t('address'))}<input name="address" value="${esc(p.address || '')}"></label>
    <label>${esc(t('hours'))}<input name="hours" value="${esc(p.hours || '')}"></label>
    ${(p.type || 'partner') === 'partner' ? `<div class="row"><label>${esc(t('minCats'))}<input name="minCats" type="number" min="1" max="200" value="${esc(r.minCats ?? 20)}"></label><label>${esc(t('discount'))}<input name="discountPct" type="number" min="1" max="100" value="${esc(r.discountPct ?? 20)}"></label></div>
    <label>${esc(t('maxPerDay'))}<input name="maxPerDay" type="number" min="1" value="${esc(r.maxPerDay ?? '')}"></label>
    <label>${esc(t('pin'))}<input name="pin" inputmode="numeric" pattern="[0-9]{6,12}" ${p.id ? '' : 'required'}></label>` : ''}
    <label class="check"><input type="checkbox" name="active" ${p.active === false ? '' : 'checked'}> ${esc(t('active'))}</label>
    <button class="btn primary">${esc(t('save'))}</button></form>`;
}

async function renderPlaces(body) {
  const places = await api('GET', '/api/admin/places');
  body.innerHTML = `<section class="card"><h2>➕ ${esc(t('newPartner'))}</h2>${placeForm()}</section>
    <section class="card"><h2>${esc(t('places'))} (${places.length})</h2>${places.map((p) => `
      <details class="review"><summary><b>${esc(p.name)}</b> · ${esc(p.type)} · ${esc(p.status)}${p.active === false ? ' · ⏸' : ''}${p.type === 'partner' ? ` · ${esc(p.reward ? `${p.reward.minCats}🐱 → ${p.reward.discountPct}%` : '')} · ${esc(t('redemptions'))}: ${p.redemptions || 0}` : ''}</summary>${placeForm(p)}</details>`).join('')}</section>`;
  body.onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      id: f.dataset.place || undefined, type: f.type.value, name: f.name.value, lat: Number(f.lat.value), lon: Number(f.lon.value),
      address: f.address.value, hours: f.hours.value, active: f.active.checked,
    };
    if (f.minCats) data.reward = { minCats: Number(f.minCats.value), discountPct: Number(f.discountPct.value), maxPerDay: f.maxPerDay.value ? Number(f.maxPerDay.value) : null };
    if (f.pin && f.pin.value) data.pin = f.pin.value;
    act(() => api('POST', '/api/admin/places', data));
  };
}

async function renderPlayers(body, qstr = '') {
  const list = await api('GET', `/api/admin/players?q=${encodeURIComponent(qstr)}`);
  body.innerHTML = `<form class="row" data-search><input name="q" value="${esc(qstr)}" placeholder="${esc(t('search'))}"><button class="btn">${esc(t('search'))}</button></form>
    <section class="card"><table class="tbl"><thead><tr><th>${esc(t('name'))}</th><th>XP</th><th>🐱</th><th>${esc(t('role'))}</th><th></th></tr></thead><tbody>${list.map((p) => `
      <tr><td>${esc(p.nickname)}${p.banned ? ' ⛔' : ''}</td><td class="num">${p.xp}</td><td class="num">${p.observations}</td>
      <td><select data-role="${esc(p.id)}">${['player', 'volunteer', 'admin'].map((r) => `<option ${r === p.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><button class="btn small ${p.banned ? '' : 'danger-soft'}" data-ban="${esc(p.id)}" data-v="${p.banned ? '0' : '1'}">${esc(p.banned ? t('unban') : t('ban'))}</button></td></tr>`).join('')}</tbody></table></section>`;
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
  body.innerHTML = `<form class="row" data-search><input name="q" value="${esc(qstr)}" placeholder="${esc(t('search'))}"><button class="btn">${esc(t('search'))}</button></form>
    ${res.items.map((c) => `<details class="card review"><summary>${miniCat(c)} ${statusChip(c.status)} ${c.latest ? severityChip(c.latest.health_severity) : ''}</summary>
      <form class="settings" data-cat="${esc(c.id)}">
        <div class="row"><label class="check"><input type="checkbox" name="legendary" ${c.legendary ? 'checked' : ''}> 🌟 ${esc(t('legend'))}</label><input name="title" value="${esc(c.title || '')}" placeholder="${esc(t('title'))}"></div>
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
  setLang(lang); // Beschriftungen aus ui.js (Fellmuster, „vor x Tagen“) in derselben Sprache
  if (!token) return renderLogin();
  view.innerHTML = `${nav()}<div data-body><p class="center pad">…</p></div>`;
  view.querySelector('.seg').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) {
      tab = b.dataset.tab;
      render();
    }
  };
  view.querySelector('[data-logout]').onclick = () => {
    token = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* egal */
    }
    render();
  };
  const body = view.querySelector('[data-body]');
  try {
    await ({ queue: renderQueue, places: renderPlaces, players: renderPlayers, cats: renderCats, ai: renderAi })[tab](body);
  } catch (e) {
    if (e.status === 403 || e.status === 401) {
      token = null;
      return renderLogin(e.message);
    }
    body.innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

langs();
render();
