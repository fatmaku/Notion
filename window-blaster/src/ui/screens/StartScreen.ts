import type { App } from '../../app/App';
import { fmtScore, h, toast } from '../dom';
import { T } from '../i18n/de';
import type { Screen } from '../Router';

function offlineRow(app: App): { el: HTMLElement; dispose(): void } {
  const badge = h('span', { class: 'badge' }, '…');
  const btn = h('button', { class: 'btn secondary', style: 'min-height:40px;padding:8px 12px;font-size:14px;display:none' }) as HTMLButtonElement;
  const bar = h('div', { class: 'bar', style: 'display:none;flex:1 1 100%' }, h('i', { style: 'width:0%' }));
  const row = h('div', { class: 'row', style: 'align-items:center;gap:8px;margin-top:12px' }, badge, btn, bar);
  const render = () => {
    const o = app.offline;
    const net = app.online ? '' : ' · offline';
    bar.style.display = o.state === 'downloading' ? 'block' : 'none';
    btn.style.display = 'none';
    switch (o.state) {
      case 'ready':
        badge.className = 'badge ok';
        badge.textContent = `✓ ${T.offlineReady}${net}`;
        break;
      case 'missing':
      case 'error':
        badge.className = app.online ? 'badge warn' : 'badge bad';
        badge.textContent = app.online ? (o.state === 'error' ? T.offlineError : `${o.missingLabel} für Offline-Betrieb fehlen`) : T.offlineNoNet;
        if (app.online) {
          btn.style.display = 'inline-block';
          btn.textContent = `⬇️ ${T.offlineMissing} (${o.missingLabel})`;
        }
        break;
      case 'downloading':
        badge.className = 'badge warn';
        badge.textContent = `${T.offlineDownloading} ${Math.round(o.progress * 100)} %`;
        (bar.firstElementChild as HTMLElement).style.width = `${Math.round(o.progress * 100)}%`;
        break;
      case 'unsupported':
        badge.className = 'badge';
        badge.textContent = 'Offline-Speicher hier nicht verfügbar (kein sicheres HTTPS)';
        break;
      default:
        badge.className = 'badge';
        badge.textContent = app.online ? T.online : T.offlineNow;
    }
    const pending = app.leaderboard.pending().length;
    if (pending) badge.textContent += ` · ${pending} ${T.pendingScores}`;
  };
  btn.onclick = () => void app.offline.prepare();
  const off1 = app.offline.events.on('change', render);
  const onNet = () => render();
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);
  render();
  return {
    el: row,
    dispose: () => {
      off1();
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    },
  };
}

function errorCard(app: App): HTMLElement | null {
  const last = app.errors.last;
  if (!last) return null;
  const el = h(
    'div',
    { class: 'small', style: 'margin-top:10px;padding:10px;border-radius:10px;background:rgba(239,68,68,0.12);color:#fca5a5' },
    h('div', {}, `⚠️ Letzter Fehler (${new Date(last.at).toLocaleString('de-DE')}): ${last.message.slice(0, 140)}`),
    h(
      'div',
      { class: 'row', style: 'margin-top:6px' },
      h('button', { class: 'btn secondary', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => void navigator.clipboard?.writeText(app.errors.asText()).then(() => toast('Fehlerbericht kopiert')) }, 'Kopieren'),
      h('button', { class: 'btn ghost', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => { app.errors.clear(); el.remove(); } }, 'Ausblenden'),
    ),
  );
  return el;
}

export function StartScreen(app: App): Screen {
  const offline = offlineRow(app);
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h1', { class: 'title' }, 'Window ', h('span', { class: 'accent' }, 'Blaster')),
      h('p', { class: 'subtitle' }, T.tagline),
      h(
        'div',
        { class: 'col' },
        h('button', { class: 'btn block', onclick: () => app.beginFlow('camera') }, `🎥 ${T.play}`),
        h('button', { class: 'btn block secondary', onclick: () => app.beginFlow('camera', true) }, `📅 Tages-Challenge · ${new Date().toLocaleDateString('de-DE')}`),
        h('button', { class: 'btn block secondary', onclick: () => app.beginFlow('demo') }, `🕹️ ${T.demo}`),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn secondary grow', onclick: () => app.showLeaderboard() }, `🏆 ${T.leaderboard}`),
          h('button', { class: 'btn secondary grow', onclick: () => app.showShop() }, `🎁 ${fmtScore(app.unlocks.balance)}`),
          h('button', { class: 'btn secondary grow', onclick: () => app.showSettings() }, `⚙️`),
        ),
      ),
      offline.el,
      errorCard(app),
      h('p', { class: 'footer' }, `v${__APP_VERSION__} · ${T.safetyPrivacy}`),
    ),
  );
  return { el, exit: () => offline.dispose() };
}
