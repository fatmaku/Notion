// LiveFX – "📱 Handy" card in the panel: builds the phone link `http://<LAN-IP>:<port>/m?token=<token>`
// from GET /api/config (`lanIps`, `port`, `token`, `secure`). `lanIps`/`port` may be missing on older
// servers → falls back to location.host. Loaded after panel.js; same-origin only (no-op under file://).
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const urlEl = $('#mobile-url');
  const btn = $('#btn-copy-mobile');
  const altEl = $('#mobile-url-alt');
  const hint = $('#mobile-offline-hint');
  if (!urlEl || !btn) return;
  const online = /^https?:$/.test(location.protocol);

  function build(cfg) {
    const scheme = cfg && cfg.secure ? 'https' : location.protocol === 'https:' ? 'https' : 'http';
    const port = cfg && Number.isFinite(Number(cfg.port)) && Number(cfg.port) > 0 ? Number(cfg.port) : location.port || (scheme === 'https' ? 443 : 80);
    const ips = cfg && Array.isArray(cfg.lanIps) ? cfg.lanIps.filter((ip) => typeof ip === 'string' && /^[0-9a-f.:]+$/i.test(ip)) : [];
    const hosts = ips.length ? ips.map((ip) => (ip.includes(':') ? `[${ip}]` : ip) + `:${port}`) : [location.host];
    const token = cfg && typeof cfg.token === 'string' ? cfg.token : '';
    return hosts.map((h) => `${scheme}://${h}/m?token=${encodeURIComponent(token)}`);
  }

  function render(links) {
    urlEl.textContent = links[0] || '';
    btn.disabled = !links[0];
    if (altEl) {
      altEl.textContent = links.length > 1 ? `Weitere Adressen: ${links.slice(1).join('  ·  ')}` : '';
      altEl.hidden = links.length <= 1;
    }
  }

  btn.addEventListener('click', async () => {
    const text = urlEl.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '✅ Kopiert';
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(urlEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = 'Markiert – Strg+C';
    }
    setTimeout(() => (btn.textContent = '📋 Link kopieren'), 2000);
  });

  async function load() {
    if (!online) {
      if (hint) hint.hidden = false;
      render([]);
      return;
    }
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d && d.ok) {
        render(build(d));
        return;
      }
    } catch (_) {
      /* server unreachable */
    }
    if (hint) hint.hidden = false;
    render([]);
  }

  window.livefxMobileLink = { build, ready: load() };
})();
