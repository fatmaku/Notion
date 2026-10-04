// Cat Me If You Can – Fangen: Kamera-Sucher mit AR-Rahmen, Standort, Wollknäuel-Wurf, Analyse.

import { t } from '../i18n.js';
import { esc, fmtNum, toast, errorText, modal, fmtUnit } from '../ui.js';
import { createCamera, captureFromFile, watchLocation, loadDetector } from '../camera.js';
import { findRegion, findDistrict, jitter } from '../../core/geo.js';
import { showCatchCard } from './card.js';

const AR_KEY = 'catme.ar';
export const arEnabled = () => {
  try {
    return localStorage.getItem(AR_KEY) !== '0';
  } catch {
    return true;
  }
};
export const setArEnabled = (v) => {
  try {
    localStorage.setItem(AR_KEY, v ? '1' : '0');
  } catch {
    /* egal */
  }
};

export async function renderCatch(view, app) {
  const cfg = app.config;
  const region = cfg.regions[0];
  view.innerHTML = `
    <div class="cam" data-state="idle">
      <video class="cam-video" playsinline muted autoplay></video>
      <canvas class="cam-overlay" aria-hidden="true"></canvas>
      <div class="cam-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="cam-top">
        <a href="#/" class="cam-btn" aria-label="${esc(t('common.back'))}">✕</a>
        <span class="chip glass" data-loc>📍 ${esc(t('catch.locating'))}</span>
        <span class="chip glass" data-ar>${arEnabled() ? '◎ AR' : esc(t('catch.noAr'))}</span>
      </div>
      <div class="cam-fallback" hidden>
        <p data-fbmsg>${esc(t('catch.noCamera'))}</p>
        <label class="btn primary big">📷 ${esc(t('catch.nativeCamera'))}<input type="file" accept="image/*" capture="environment" data-native hidden></label>
      </div>
      <div class="cam-bottom">
        <label class="cam-btn gallery" title="${esc(t('catch.galleryHint'))}">🖼️<span>${esc(t('catch.gallery'))}</span><input type="file" accept="image/*" data-gallery hidden></label>
        <button class="shutter" data-shoot aria-label="${esc(t('catch.shoot'))}"><span class="yarn" aria-hidden="true">🧶</span><b>${esc(t('catch.shoot'))}</b></button>
        <span class="cam-btn today-pill" data-today>…</span>
      </div>
      <div class="cam-busy" hidden><div class="spinner-cat" aria-hidden="true">🐱</div><p data-fun>${esc(t('catch.analyzing'))}</p></div>
    </div>`;
  const root = view.querySelector('.cam');
  const video = root.querySelector('.cam-video');
  const overlay = root.querySelector('.cam-overlay');
  const locChip = root.querySelector('[data-loc]');
  const arChip = root.querySelector('[data-ar]');
  const shoot = root.querySelector('[data-shoot]');
  const busy = root.querySelector('.cam-busy');
  const todayPill = root.querySelector('[data-today]');
  const cam = createCamera({ video, overlay });
  let pos = null;
  let simulated = false;
  let cooldownUntil = 0;
  let alive = true;

  app.api.me().then(({ today }) => {
    todayPill.textContent = `${fmtNum(today.count)}/${fmtNum(today.goal)}`;
  }).catch(() => {});

  // ---- Standort
  const stopLoc = watchLocation((p, err) => {
    if (!alive) return;
    if (!p) {
      if (app.api.isDemo) return simulate();
      locChip.textContent = `📍 ${t('err.location')}`;
      locChip.classList.add('bad');
      return;
    }
    if (app.api.isDemo && !findRegion(cfg.regions, p.lat, p.lon)) return simulate();
    pos = p;
    showLoc();
  });
  function simulate() {
    if (!simulated) {
      simulated = true;
      pos = { lat: 40.9842, lon: 29.0262, accuracy: 8, simulated: true };
    }
    showLoc();
  }
  function showLoc() {
    const d = findDistrict(region, pos.lat, pos.lon);
    const name = d ? `${d.name}${d.aka ? ` (${d.aka.split(' · ')[0]})` : ''}` : region.name;
    const weak = pos.accuracy > cfg.game.maxGpsAccuracyM;
    locChip.textContent = simulated ? `🎭 ${t('catch.simulated')} · ${name}` : weak ? `📍 ${name} · ${t('catch.gpsWeak', { m: Math.round(pos.accuracy) })}` : `📍 ${name} · ±${fmtUnit('meter', Math.round(pos.accuracy))}`;
    locChip.classList.toggle('bad', weak);
  }

  // ---- Kamera
  try {
    await cam.start();
    if (arEnabled()) {
      arChip.textContent = `◎ ${t('catch.searching')}`;
      cam.enableDetection(cfg.ar, (det) => {
        if (!alive) return;
        const hit = det && det.box && det.score >= 0.5;
        root.dataset.state = hit ? 'locked' : 'idle';
        arChip.textContent = hit ? `🐱 ${t('catch.found', { p: Math.round(det.score * 100) })}` : `◎ ${t('catch.searching')}`;
      }).then((ok) => {
        if (!ok && alive) arChip.textContent = t('catch.noAr');
      });
    }
  } catch (e) {
    root.querySelector('.cam-fallback').hidden = false;
    if (e && e.code === 'insecure') root.querySelector('[data-fbmsg]').textContent = `${t('catch.https')} ${t('catch.noCamera')}`;
    shoot.hidden = true;
    if (arEnabled()) loadDetector(cfg.ar); // für Dateiaufnahmen vorladen
  }

  // ---- Fangen
  function throwYarn() {
    const det = cam.detection && cam.detection.box ? cam.detection : null;
    const r = root.getBoundingClientRect();
    const from = shoot.getBoundingClientRect();
    let tx = r.width / 2;
    let ty = r.height * 0.42;
    if (det && video.videoWidth) {
      const s = Math.max(r.width / video.videoWidth, r.height / video.videoHeight);
      const ox = (r.width - video.videoWidth * s) / 2;
      const oy = (r.height - video.videoHeight * s) / 2;
      tx = ox + (det.box.x + det.box.w / 2) * video.videoWidth * s;
      ty = oy + (det.box.y + det.box.h / 2) * video.videoHeight * s;
    }
    const ball = document.createElement('div');
    ball.className = 'thrown';
    ball.textContent = '🧶';
    ball.style.left = `${from.left - r.left + from.width / 2}px`;
    ball.style.top = `${from.top - r.top}px`;
    ball.style.setProperty('--dx', `${tx - (from.left - r.left + from.width / 2)}px`);
    ball.style.setProperty('--dy', `${ty - (from.top - r.top)}px`);
    root.append(ball);
    const flash = document.createElement('div');
    flash.className = 'flash';
    root.append(flash);
    setTimeout(() => flash.remove(), 400);
    return ball;
  }

  async function submit(cap, source) {
    if (!pos) {
      toast(t('err.location'), { type: 'error' });
      return;
    }
    busy.hidden = false;
    const funKeys = ['catch.fun1', 'catch.fun2', 'catch.fun3', 'catch.fun4'];
    let k = 0;
    const funEl = busy.querySelector('[data-fun]');
    funEl.textContent = t('catch.analyzing');
    const funTimer = setInterval(() => {
      funEl.textContent = t(funKeys[k++ % funKeys.length]);
    }, 1600);
    try {
      let { lat, lon } = pos;
      if (pos.simulated) [lat, lon] = jitter(pos.lat, pos.lon, 25);
      const res = await app.api.catchCat({
        photo: cap.photo, crop: cap.crop, fingerprint: cap.fingerprint, detector: cap.detector,
        lat, lon, accuracy: pos.accuracy, capturedAt: cap.capturedAt || Date.now(), source, lang: app.lang(),
      });
      if (pos.simulated) pos = { ...pos, lat, lon };
      todayPill.textContent = `${fmtNum(res.today.count)}/${fmtNum(res.today.goal)}`;
      cooldownUntil = Date.now() + (app.config.game.catchCooldownSec || 20) * 1000;
      tickCooldown();
      app.refreshPlayer();
      showCatchCard(res, app);
    } catch (e) {
      if (e.code === 'cooldown' && e.details) {
        cooldownUntil = Date.now() + e.details.retryAfter * 1000;
        tickCooldown();
      }
      const big = ['no_cat', 'pet_cat', 'not_live_photo', 'outside_region', 'duplicate_photo'].includes(e.code);
      if (big) modal(`<div class="center pad"><div class="big-emoji">${e.code === 'pet_cat' ? '🏠' : e.code === 'outside_region' ? '🗺️' : '🤔'}</div><h2>${esc(errorText(e))}</h2><button class="btn primary" data-close>${esc(t('common.ok'))}</button></div>`);
      else toast(errorText(e), { type: 'error', ms: 4500 });
    } finally {
      clearInterval(funTimer);
      busy.hidden = true;
      root.querySelectorAll('.thrown').forEach((b) => b.remove());
    }
  }

  function tickCooldown() {
    const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (!alive) return;
    if (left > 0) {
      shoot.disabled = true;
      shoot.querySelector('b').textContent = fmtUnit('second', left);
      setTimeout(tickCooldown, 500);
    } else {
      shoot.disabled = false;
      shoot.querySelector('b').textContent = t('catch.shoot');
    }
  }

  shoot.addEventListener('click', async () => {
    if (shoot.disabled) return;
    if (!pos) return toast(t('err.location'), { type: 'error' });
    let cap;
    try {
      cap = cam.capture();
    } catch {
      return toast(t('err.generic'), { type: 'error' });
    }
    throwYarn();
    await new Promise((r) => setTimeout(r, 650));
    await submit({ ...cap, capturedAt: Date.now() }, 'camera');
  });

  async function fromFile(input, source) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const cap = await captureFromFile(file, arEnabled() ? cfg.ar : null);
      if (source === 'gallery') toast(t('catch.galleryHint'), { ms: 4000 });
      await submit(cap, source);
    } catch {
      toast(t('err.generic'), { type: 'error' });
    }
  }
  root.querySelector('[data-gallery]').addEventListener('change', (e) => fromFile(e.target, 'gallery'));
  root.querySelector('[data-native]').addEventListener('change', (e) => fromFile(e.target, 'camera'));

  return () => {
    alive = false;
    cam.stop();
    stopLoc();
  };
}
