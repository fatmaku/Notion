// LiveFX – "📱 Handy" card in the panel: builds the phone link `http://<LAN-IP>:<port>/m?token=<token>`
// from GET /api/config (`lanIps`, `port`, `token`, `secure`). `lanIps`/`port` may be missing on older
// servers → falls back to location.host. Loaded after panel.js; same-origin only (no-op under file://).
//
// 2.2: the link is also drawn as a QR code (js/qr.js, `#mobile-qr`, nothing leaves the browser) and the card
// gets the internet link: `POST /api/tunnel/start` (server/api-tunnel.js, Cloudflare quick tunnel) returns
// `phoneUrl` = `https://<words>.trycloudflare.com/m?token=…` – HTTPS, so the phone microphone works without a
// certificate. Status (idle | starting | online | error) is polled while starting and shown with a dot.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const urlEl = $('#mobile-url');
  const btn = $('#btn-copy-mobile');
  const altEl = $('#mobile-url-alt');
  const hint = $('#mobile-offline-hint');
  if (!urlEl || !btn) return;
  const online = /^https?:$/.test(location.protocol);
  const QR = window.LiveFXQR || null;
  const TUNNEL_POLL_MS = 2000;
  const TUNNEL_STATE_TEXT = {
    idle: 'aus',
    starting: 'startet … (beim ersten Mal Download von cloudflared, bis zu 1 Minute)',
    online: 'online – Link am Handy öffnen oder QR scannen',
    error: 'Fehler',
  };

  function build(cfg) {
    const scheme = cfg && cfg.secure ? 'https' : location.protocol === 'https:' ? 'https' : 'http';
    const port = cfg && Number.isFinite(Number(cfg.port)) && Number(cfg.port) > 0 ? Number(cfg.port) : location.port || (scheme === 'https' ? 443 : 80);
    const ips = cfg && Array.isArray(cfg.lanIps) ? cfg.lanIps.filter((ip) => typeof ip === 'string' && /^[0-9a-f.:]+$/i.test(ip)) : [];
    const hosts = ips.length ? ips.map((ip) => (ip.includes(':') ? `[${ip}]` : ip) + `:${port}`) : [location.host];
    const token = cfg && typeof cfg.token === 'string' ? cfg.token : '';
    return hosts.map((h) => `${scheme}://${h}/m?token=${encodeURIComponent(token)}`);
  }

  /** Draws `text` into the canvas `#<id>`; clears it (and the data-qr-* marks) when text is empty or QR is missing. */
  function drawQr(id, text) {
    const canvas = $(`#${id}`);
    if (!canvas) return null;
    if (!text || !QR || typeof QR.toCanvas !== 'function') {
      canvas.width = 0;
      canvas.height = 0;
      delete canvas.dataset.qrSize;
      delete canvas.dataset.qrVersion;
      return null;
    }
    try {
      return QR.toCanvas(canvas, text, { scale: 4, margin: 2 });
    } catch (_) {
      canvas.width = 0;
      canvas.height = 0;
      delete canvas.dataset.qrSize;
      return null;
    }
  }

  function render(links) {
    urlEl.textContent = links[0] || '';
    btn.disabled = !links[0];
    drawQr('mobile-qr', links[0] || '');
    if (altEl) {
      altEl.textContent = links.length > 1 ? `Weitere Adressen: ${links.slice(1).join('  ·  ')}` : '';
      altEl.hidden = links.length <= 1;
    }
  }

  async function copy(text, button, idle) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '✅ Kopiert';
    } catch (_) {
      const el = button === btn ? urlEl : $('#tunnel-url');
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      button.textContent = 'Markiert – Strg+C';
    }
    setTimeout(() => (button.textContent = idle), 2000);
  }

  btn.addEventListener('click', () => copy(urlEl.textContent, btn, '📋 Link kopieren'));

  // ---------- internet link (tunnel) ----------
  const tunnelBtn = $('#btn-tunnel');
  const tunnelCopy = $('#btn-copy-tunnel');
  const tunnelUrl = $('#tunnel-url');
  const tunnelState = $('#tunnel-state');
  const tunnelDot = $('#tunnel-dot');
  const tunnelBox = $('#tunnel-box');
  const tunnelQrWrap = $('#tunnel-qr-wrap');
  const tunnelManual = $('#tunnel-manual');
  let tunnel = { status: 'idle', url: null, phoneUrl: null, error: null };
  let tunnelBusy = false;
  let tunnelTimer = null;

  function renderTunnel() {
    if (!tunnelBtn) return;
    const s = tunnel.status || 'idle';
    const phoneUrl = s === 'online' && typeof tunnel.phoneUrl === 'string' ? tunnel.phoneUrl : '';
    if (tunnelUrl) tunnelUrl.textContent = phoneUrl;
    if (tunnelCopy) tunnelCopy.disabled = !phoneUrl;
    if (tunnelQrWrap) tunnelQrWrap.hidden = !phoneUrl;
    drawQr('tunnel-qr', phoneUrl);
    if (tunnelDot) {
      tunnelDot.classList.remove('on', 'warn', 'err');
      if (s === 'online') tunnelDot.classList.add('on');
      else if (s === 'starting') tunnelDot.classList.add('warn');
      else if (s === 'error') tunnelDot.classList.add('err');
    }
    if (tunnelState) tunnelState.textContent = s === 'error' ? `Fehler: ${tunnel.error || 'unbekannt'}` : TUNNEL_STATE_TEXT[s] || s;
    if (tunnelBox) tunnelBox.classList.toggle('online', s === 'online');
    tunnelBtn.disabled = tunnelBusy || !online || s === 'starting';
    tunnelBtn.textContent = s === 'online' ? '⏹ Internet-Link stoppen' : s === 'starting' ? '⏳ startet …' : '🌐 Internet-Link starten';
    if (tunnelManual && typeof tunnel.manualUrl === 'string' && /^https:\/\/github\.com\//.test(tunnel.manualUrl)) tunnelManual.href = tunnel.manualUrl;
    tunnelBtn.dataset.status = s;
  }

  async function tunnelRequest(method, path) {
    const r = await fetch(path, { method, cache: 'no-store' });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.ok) throw new Error((d && (d.message || d.error)) || `HTTP ${r.status}`);
    return d;
  }

  function schedulePoll() {
    clearTimeout(tunnelTimer);
    if (tunnel.status === 'starting') tunnelTimer = setTimeout(refreshTunnel, TUNNEL_POLL_MS);
  }

  async function refreshTunnel() {
    if (!online) return tunnel;
    try {
      tunnel = await tunnelRequest('GET', '/api/tunnel');
    } catch (e) {
      tunnel = { ...tunnel, status: tunnel.status === 'online' ? 'online' : 'idle' };
    }
    renderTunnel();
    schedulePoll();
    return tunnel;
  }

  async function startTunnel() {
    if (tunnelBusy) return tunnel;
    tunnelBusy = true;
    tunnel = { ...tunnel, status: 'starting', error: null };
    renderTunnel();
    try {
      tunnel = await tunnelRequest('POST', '/api/tunnel/start');
    } catch (e) {
      tunnel = { ...tunnel, status: 'error', error: e.message, url: null, phoneUrl: null };
    } finally {
      tunnelBusy = false;
    }
    renderTunnel();
    schedulePoll();
    return tunnel;
  }

  async function stopTunnel() {
    if (tunnelBusy) return tunnel;
    tunnelBusy = true;
    try {
      tunnel = await tunnelRequest('POST', '/api/tunnel/stop');
    } catch (e) {
      tunnel = { ...tunnel, status: 'error', error: e.message };
    } finally {
      tunnelBusy = false;
    }
    renderTunnel();
    return tunnel;
  }

  if (tunnelBtn) tunnelBtn.addEventListener('click', () => (tunnel.status === 'online' ? stopTunnel() : startTunnel()));
  if (tunnelCopy) tunnelCopy.addEventListener('click', () => copy(tunnelUrl ? tunnelUrl.textContent : '', tunnelCopy, '📋 Link kopieren'));

  async function load() {
    if (!online) {
      if (hint) hint.hidden = false;
      render([]);
      renderTunnel();
      return;
    }
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d && d.ok) {
        render(build(d));
        await refreshTunnel();
        return;
      }
    } catch (_) {
      /* server unreachable */
    }
    if (hint) hint.hidden = false;
    render([]);
    renderTunnel();
  }

  window.livefxMobileLink = {
    build,
    drawQr,
    tunnel: {
      get status() {
        return { ...tunnel };
      },
      start: startTunnel,
      stop: stopTunnel,
      refresh: refreshTunnel,
    },
    ready: load(),
  };
})();
