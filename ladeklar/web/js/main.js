// Entry point for the real app (server mode): white-label tenant from the host or /t/CODE,
// invite links /i/<id>, push deep links ?d=<deliveryId>, service worker for offline + push.
import { createApp } from './app.js';
import { createHttpApi } from './api-http.js';

const api = createHttpApi();
const path = location.pathname;
const metaCode = document.querySelector('meta[name="lk-tenant"]')?.content || '';
const tCode = /^\/t\/([A-Za-z0-9]+)/.exec(path)?.[1];
const invite = /^\/i\/([\w-]+)/.exec(path)?.[1];
const deep = new URLSearchParams(location.search).get('d');

const app = createApp(document.getElementById('app'), {
  api,
  tenantCode: (metaCode || tCode || '').toUpperCase() || null,
  inviteId: invite || null,
  onSession: (me) => {
    if (!me) return;
    if (invite || tCode) history.replaceState(null, '', tCode ? `/t/${tCode}` : '/');
    if (deep) setTimeout(() => app.view().openDelivery?.(app, deep), 300);
  },
});
app.start();
window.ladeklar = app;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'open' && e.data.deliveryId) app.view().openDelivery?.(app, e.data.deliveryId);
  });
}
