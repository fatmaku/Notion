// Cat Me If You Can – Moderation: „Einrichten“ (Erweiterung qr-setup). Für alles ein QR-Code:
// weiteres Admin-Handy koppeln, Café-Handy einrichten, Freiwillige einladen; offene Codes; Geräte
// (Admin-Sitzungen) mit Abmelden; „Meinen Standort nehmen“ für neue Cafés; „Am Handy öffnen“.
// Texte kommen über ctx.t aus admin.js (tr/en/de). Codes reisen nur im Fragment (#setup= / #invite=).

import { esc, fmtDateTime, fmtAgo } from './ui.js';
import { qrSvg, copyText, canShare, shareLink, fmtLeft } from './qr-kit.js';

const POLL_MS = 5000;

/** Absoluter Link: CATME_PUBLIC_URL (vom Server) oder der Ordner dieser Seite. */
export function codeUrl(c) {
  if (c.url) return c.url;
  return new URL(String(c.path || '').replace(/^\//, ''), new URL('./', location.href)).href;
}

const units = (t) => ({ d: (n) => `${n} ${t(n === 1 ? 'u.d1' : 'u.d')}`, h: t('u.h'), min: t('u.min') });

/**
 * Eine QR-Karte: Knopf „QR-Code erstellen“ → großer QR-Code, Restzeit, Link kopieren, Teilen.
 * spec: { purpose, placeId?, maxUses?, shareTitle, shareText } · Rückgabe: Funktion zum Erstellen.
 */
export function mountQr(el, ctx, spec) {
  const { api, t } = ctx;
  let timer = null;
  let poll = null;
  let current = null;
  const stop = () => {
    clearInterval(timer);
    clearInterval(poll);
    timer = poll = null;
  };
  const alive = () => {
    if (el.isConnected) return true;
    stop();
    return false;
  };

  function idle(msg = '', cls = '') {
    stop();
    delete el.dataset.code;
    el.innerHTML = `${msg ? `<p class="qr-state ${cls}">${msg}</p>` : ''}<button type="button" class="btn primary big wide" data-qr-make>${esc(current ? t('qr.again') : t('qr.make'))}</button>`;
    el.querySelector('[data-qr-make]').addEventListener('click', make);
  }

  async function make() {
    const btn = el.querySelector('[data-qr-make]');
    if (btn) btn.disabled = true;
    stop(); // alte Abfrage/Restzeit dieser Karte beenden
    // Neuer Kopplungs-Code → der alte von dieser Karte (noch nicht benutzt) gilt nicht mehr
    if (current && current.purpose === 'admin' && el.dataset.code === current.id) api('DELETE', `/api/admin/setup-codes/${encodeURIComponent(current.id)}`).catch(() => {});
    let c;
    try {
      c = await api('POST', '/api/admin/setup-codes', { purpose: spec.purpose, placeId: spec.placeId ? spec.placeId() : undefined, maxUses: spec.maxUses ? spec.maxUses() : undefined });
    } catch (e) {
      if (alive()) idle(); // alter QR (evtl. schon ungültig) nicht stehen lassen – Knopf zum neuen Versuch
      ctx.flash(`${t('error')}: ${e.message}`, true);
      return;
    }
    current = c;
    const url = codeUrl(c);
    const svg = await qrSvg(url);
    if (!alive()) return;
    el.innerHTML = `
      <div class="qr-box" role="img" aria-label="${esc(t('qr.alt'))}">${svg}</div>
      <p class="qr-timer" data-qr-timer aria-live="off"></p>
      <p class="qr-uses small muted" data-qr-uses ${c.maxUses > 1 ? '' : 'hidden'}></p>
      <div class="qr-actions">
        <button type="button" class="btn" data-qr-copy>🔗 ${esc(t('qr.copy'))}</button>
        ${canShare() ? `<button type="button" class="btn" data-qr-share>📤 ${esc(t('qr.share'))}</button>` : ''}
      </div>
      <label class="qr-link-wrap"><span class="sr">${esc(t('qr.link'))}</span><input class="qr-link" data-qr-link readonly dir="ltr" value="${esc(url)}"></label>
      <p class="small muted">🔒 ${esc(t('qr.secret'))}</p>
      <button type="button" class="btn ghost wide" data-qr-make>↻ ${esc(t('qr.again'))}</button>`;
    el.dataset.code = c.id;
    const input = el.querySelector('[data-qr-link]');
    el.querySelector('[data-qr-copy]').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      const ok = await copyText(url, input);
      b.textContent = ok ? `✓ ${t('qr.copied')}` : `🔗 ${t('qr.copy')}`;
      setTimeout(() => b.isConnected && (b.textContent = `🔗 ${t('qr.copy')}`), 2200);
    });
    const sh = el.querySelector('[data-qr-share]');
    if (sh) sh.addEventListener('click', () => shareLink({ title: spec.shareTitle || 'Cat Me If You Can', text: spec.shareText || '', url }));
    el.querySelector('[data-qr-make]').addEventListener('click', make);
    const tEl = el.querySelector('[data-qr-timer]');
    const uEl = el.querySelector('[data-qr-uses]');
    const tick = () => {
      if (!alive()) return;
      const left = c.expiresAt - Date.now();
      if (left <= 0) return idle(`⌛ ${esc(t('qr.expired'))}`, 'bad');
      tEl.textContent = `⏱ ${t('qr.left', { t: fmtLeft(left, units(t)) })}`;
      uEl.textContent = t('qr.uses', { n: c.uses || 0, max: c.maxUses });
    };
    stop();
    tick();
    timer = setInterval(tick, 1000);
    poll = setInterval(async () => {
      if (!alive() || document.hidden) return;
      try {
        const st = await api('GET', `/api/admin/setup-codes/${encodeURIComponent(c.id)}`);
        if (!alive() || el.dataset.code !== c.id) return;
        c.uses = st.uses;
        if (st.state === 'used') idle(`✓ ${esc(t('qr.used'))}${spec.usedText ? `<br><small>${esc(spec.usedText)}</small>` : ''}`, 'ok');
        else if (st.state === 'revoked') idle(`✕ ${esc(t('qr.revoked'))}`, 'bad');
        else if (st.state === 'expired') idle(`⌛ ${esc(t('qr.expired'))}`, 'bad');
      } catch (e) {
        if (e.status === 404 && el.dataset.code === c.id) idle(`✕ ${esc(t('qr.revoked'))}`, 'bad');
        /* sonst: nächster Versuch */
      }
    }, POLL_MS);
  }

  el.qrRevoked = () => idle(`✕ ${esc(t('codes.revoked'))}`, 'bad'); // aus „Offene QR-Codes“ widerrufen
  idle();
  return make;
}

/** Modal mit einer QR-Karte (z. B. „Am Handy öffnen“ oder direkt nach dem Anlegen eines Cafés). */
export function openQrModal(ctx, { title, lead, spec, extra = '' }) {
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal pad qr-modal" role="dialog" aria-modal="true" aria-labelledby="qrm-title"><button type="button" class="modal-x" aria-label="✕">✕</button>
    <h2 id="qrm-title">${esc(title)}</h2>${lead ? `<p class="muted">${esc(lead)}</p>` : ''}<div data-qr></div>${extra}</div>`;
  const close = () => {
    w.remove();
    document.body.classList.remove('has-modal');
  };
  w.addEventListener('click', (e) => {
    if (e.target === w || e.target.closest('.modal-x')) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });
  document.body.append(w);
  document.body.classList.add('has-modal');
  const make = mountQr(w.querySelector('[data-qr]'), ctx, spec);
  make();
  w.querySelector('.modal-x').focus();
  return close;
}

/** „Am Handy öffnen“ (Desktop): Kopplungs-Code auf Abruf – nie der ADMIN_TOKEN. */
export function openOnPhone(ctx) {
  const { t } = ctx;
  openQrModal(ctx, { title: `📱 ${t('phone.title')}`, lead: t('phone.lead'), spec: { purpose: 'admin', usedText: t('qr.usedAdmin') } });
}

/** Café-Einrichtungs-QR in einem Modal (nach dem Anlegen oder aus der Liste). */
export function openCafeQr(ctx, place) {
  const { t } = ctx;
  openQrModal(ctx, {
    title: `☕ ${place.name}`,
    lead: t('cafe.modalLead'),
    spec: { purpose: 'partner', placeId: () => place.id, shareTitle: place.name, shareText: t('cafe.shareText', { name: place.name }), usedText: t('qr.usedCafe') },
    extra: `<p class="qr-more"><a class="btn wide" href="print.html?cafe=${encodeURIComponent(place.id)}" target="_blank" rel="noopener">🖨️ ${esc(t('cafe.print'))}</a></p>`,
  });
}

function purposeLabel(t, c) {
  if (c.purpose === 'partner') return `☕ ${c.placeName || t('p_partner')}`;
  if (c.purpose === 'volunteer') return `🧡 ${t('p_volunteer')} · ${t('qr.uses', { n: c.uses, max: c.maxUses })}`;
  return `🛡️ ${t('p_admin')}`;
}

/** Lange Listen am Handy: die ersten 5 zeigen, der Rest hinter „Weitere n zeigen“. */
const SHOW = 5;
function listHtml(items, row, cls, t) {
  const head = items.slice(0, SHOW).map(row).join('');
  const rest = items.slice(SHOW);
  return `<ul class="plain-list ${cls}">${head}</ul>${rest.length ? `<details class="more-list"><summary>${esc(t('more', { n: rest.length }))}</summary><ul class="plain-list ${cls}">${rest.map(row).join('')}</ul></details>` : ''}`;
}

async function renderCodes(box, ctx) {
  const { api, t } = ctx;
  let list = [];
  try {
    list = await api('GET', '/api/admin/setup-codes');
  } catch {
    /* egal */
  }
  const row = (c) => `
    <li><span><b>${esc(purposeLabel(t, c))}</b><br><small class="muted">${esc(t('until', { d: fmtDateTime(c.expiresAt) }))}${c.via === 'terminal' ? ' · ⌨️' : ''}</small></span>
      <button type="button" class="btn small danger-soft" data-revoke-code="${esc(c.id)}">${esc(t('revoke'))}</button></li>`;
  box.innerHTML = list.length ? listHtml(list, row, '', t) : `<p class="muted small">${esc(t('codes.none'))}</p>`;
  box.onclick = async (e) => {
    const b = e.target.closest('[data-revoke-code]');
    if (!b) return;
    b.disabled = true;
    try {
      await api('DELETE', `/api/admin/setup-codes/${encodeURIComponent(b.dataset.revokeCode)}`);
      document.querySelectorAll(`[data-code="${CSS.escape(b.dataset.revokeCode)}"]`).forEach((el) => el.qrRevoked && el.qrRevoked());
    } catch (err) {
      ctx.flash(`${t('error')}: ${err.message}`, true);
    }
    renderCodes(box, ctx);
  };
}

async function renderDevices(box, ctx) {
  const { api, t } = ctx;
  let r;
  try {
    r = await api('GET', '/api/admin/sessions');
  } catch (e) {
    box.innerHTML = `<p class="err">${esc(e.message)}</p>`;
    return;
  }
  const items = r.sessions;
  const row = (s) => `
    <li><span><b>${s.via === 'qr' ? '📱' : '💻'} ${esc(s.label)}</b>${s.current ? ` <span class="chip">${esc(t('dev.this'))}</span>` : ''}<br>
      <small class="muted">${esc(t(s.via === 'qr' ? 'dev.viaQr' : 'dev.viaLogin'))} · ${esc(t('dev.last', { t: fmtAgo(s.lastUsedAt) }))} · ${esc(t('until', { d: fmtDateTime(s.expiresAt) }))}</small></span>
      <button type="button" class="btn small danger-soft" data-revoke-dev="${esc(s.id)}" data-current="${s.current ? '1' : ''}">${esc(t('dev.logout'))}</button></li>`;
  // dieses Gerät zuerst
  const sorted = [...items.filter((s) => s.current), ...items.filter((s) => !s.current)];
  box.innerHTML = `${items.length ? listHtml(sorted, row, 'devices', t) : `<p class="muted small">${esc(t('dev.none'))}</p>`}
    ${items.some((s) => !s.current) ? `<button type="button" class="btn wide" data-revoke-others>${esc(t('dev.others'))}</button>` : ''}
    <p class="small muted">🔑 ${esc(t('dev.master'))}</p>`;
  box.onclick = async (e) => {
    const one = e.target.closest('[data-revoke-dev]');
    const others = e.target.closest('[data-revoke-others]');
    if (!one && !others) return;
    if (others && !confirm(t('dev.othersConfirm'))) return;
    try {
      if (one) {
        await api('DELETE', `/api/admin/sessions/${encodeURIComponent(one.dataset.revokeDev)}`);
        if (one.dataset.current) return ctx.loggedOut();
      } else {
        await api('POST', '/api/admin/sessions/revoke-others', {});
      }
      ctx.flash(t('saved'));
    } catch (err) {
      ctx.flash(`${t('error')}: ${err.message}`, true);
    }
    renderDevices(box, ctx);
  };
}

/** Tab „Einrichten“: drei QR-Karten, offene Codes, Geräte. */
export async function renderSetupHub(body, ctx) {
  const { api, t } = ctx;
  const places = await api('GET', '/api/admin/places').catch((e) => {
    if (e.status === 401 || e.status === 403) throw e; // abgemeldet → Anmeldung (render() in admin.js)
    return [];
  });
  const cafes = places.filter((p) => p.type === 'partner' && p.status === 'approved' && p.active !== false);
  const paired = ctx.consumePaired();
  body.innerHTML = `
    ${paired ? `<section class="card setup-ok" data-paired role="status"><b>✓ ${esc(t('paired'))}</b><br><span class="small">${esc(t('pairedLead'))}</span></section>` : ''}
    <section class="setup-intro"><h1>${esc(t('hub.title'))}</h1><p class="muted">${esc(t('hub.lead'))}</p></section>
    <section class="card setup-card" data-card="cafe">
      <h2>☕ ${esc(t('cafe.title'))}</h2>
      <p class="muted">${esc(t('cafe.lead'))}</p>
      ${cafes.length ? `<label class="field">${esc(t('cafe.pick'))}<select data-cafe-pick>${cafes.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.hasPin === false ? ` · ${esc(t('cafe.noPin'))}` : ''}</option>`).join('')}</select></label>
        <div data-qr-cafe></div>
        <p class="qr-more"><a class="btn wide" data-cafe-print href="print.html?cafe=${encodeURIComponent(cafes[0].id)}" target="_blank" rel="noopener">🖨️ ${esc(t('cafe.print'))}</a></p>` : `<p class="small">${esc(t('cafe.none'))}</p>`}
      <button type="button" class="btn wide" data-new-cafe>➕ ${esc(t('cafe.new'))}</button>
    </section>
    <section class="card setup-card" data-card="volunteer">
      <h2>🧡 ${esc(t('vol.title'))}</h2>
      <p class="muted">${esc(t('vol.lead'))}</p>
      <fieldset class="uses-pick"><legend>${esc(t('vol.uses'))}</legend>
        ${[1, 5, 20].map((n, i) => `<label><input type="radio" name="vol-uses" value="${n}" ${i === 0 ? 'checked' : ''}><span>${n}</span></label>`).join('')}
      </fieldset>
      <div data-qr-vol></div>
    </section>
    <section class="card setup-card" data-card="admin">
      <h2>🛡️ ${esc(t('adm.title'))}</h2>
      <p class="muted">${esc(t('adm.lead'))}</p>
      <div data-qr-admin></div>
    </section>
    <section class="card"><h2>🎟️ ${esc(t('codes.title'))}</h2><div data-codes></div></section>
    <section class="card" id="devices"><h2>📱 ${esc(t('dev.title'))}</h2><div data-devices></div></section>`;

  const pick = body.querySelector('[data-cafe-pick]');
  const cafeName = () => (cafes.find((p) => p.id === (pick && pick.value)) || {}).name || '';
  if (pick) {
    mountQr(body.querySelector('[data-qr-cafe]'), ctx, {
      purpose: 'partner', placeId: () => pick.value, shareTitle: 'Cat Me If You Can', get shareText() { return t('cafe.shareText', { name: cafeName() }); }, usedText: t('qr.usedCafe'),
    });
    pick.addEventListener('change', () => {
      body.querySelector('[data-cafe-print]').href = `print.html?cafe=${encodeURIComponent(pick.value)}`;
      mountQr(body.querySelector('[data-qr-cafe]'), ctx, { purpose: 'partner', placeId: () => pick.value, shareTitle: 'Cat Me If You Can', shareText: t('cafe.shareText', { name: cafeName() }), usedText: t('qr.usedCafe') });
    });
  }
  mountQr(body.querySelector('[data-qr-vol]'), ctx, {
    purpose: 'volunteer', maxUses: () => Number((body.querySelector('[name="vol-uses"]:checked') || {}).value || 1), shareTitle: 'Cat Me If You Can', shareText: t('vol.shareText'),
  });
  mountQr(body.querySelector('[data-qr-admin]'), ctx, { purpose: 'admin', usedText: t('qr.usedAdmin') });
  body.querySelector('[data-new-cafe]').addEventListener('click', () => ctx.goNewCafe());
  const codesBox = body.querySelector('[data-codes]');
  renderCodes(codesBox, ctx);
  body.addEventListener('click', (e) => {
    if (e.target.closest('[data-qr-make]')) setTimeout(() => renderCodes(codesBox, ctx), 400);
  });
  renderDevices(body.querySelector('[data-devices]'), ctx);
}

/**
 * „Meinen Standort nehmen“: GPS mit hoher Genauigkeit, bis zu 15 s – der beste Wert füllt Breite/Länge.
 * Zeigt die Genauigkeit live an (±m).
 */
export function wireLocation(form, ctx) {
  const btn = form.querySelector('[data-locate]');
  const out = form.querySelector('[data-loc-out]');
  if (!btn) return;
  if (!('geolocation' in navigator)) {
    btn.hidden = true;
    return;
  }
  const { t } = ctx;
  btn.addEventListener('click', () => {
    let best = null;
    btn.disabled = true;
    out.textContent = t('loc.searching');
    out.className = 'loc-out small';
    const finish = () => {
      navigator.geolocation.clearWatch(id);
      clearTimeout(timeout);
      btn.disabled = false;
      if (!best) return;
      const acc = Math.round(best.coords.accuracy);
      out.textContent = `${acc > 50 ? '⚠️ ' : '✓ '}${t('loc.acc', { m: acc })}${acc > 50 ? ` – ${t('loc.weak')}` : ''}`;
      out.className = `loc-out small ${acc > 50 ? 'warn' : 'ok'}`;
    };
    const id = navigator.geolocation.watchPosition((pos) => {
      if (!best || pos.coords.accuracy < best.coords.accuracy) {
        best = pos;
        form.lat.value = pos.coords.latitude.toFixed(6);
        form.lon.value = pos.coords.longitude.toFixed(6);
        out.textContent = `${t('loc.searching')} ${t('loc.acc', { m: Math.round(pos.coords.accuracy) })}`;
      }
      if (pos.coords.accuracy <= 20) finish();
    }, () => {
      navigator.geolocation.clearWatch(id);
      clearTimeout(timeout);
      btn.disabled = false;
      if (!best) {
        out.textContent = t('loc.fail');
        out.className = 'loc-out small err';
      } else finish();
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    const timeout = setTimeout(finish, 15000);
  });
}
