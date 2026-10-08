import type { App } from '../../app/App';
import { fmtScore, h, toast } from '../dom';
import { T, tf, locale } from '../i18n';
import type { Screen } from '../Router';

function offlineRow(app: App): { el: HTMLElement; dispose(): void } {
  const badge = h('span', { class: 'badge' }, '…');
  const btn = h('button', { class: 'btn secondary', style: 'min-height:40px;padding:8px 12px;font-size:14px;display:none' }) as HTMLButtonElement;
  const bar = h('div', { class: 'bar', style: 'display:none;flex:1 1 100%' }, h('i', { style: 'width:0%' }));
  const row = h('div', { class: 'row', style: 'align-items:center;gap:8px;margin-top:12px' }, badge, btn, bar);
  const render = () => {
    const o = app.offline;
    const net = app.online ? '' : ` · ${T.startNetOffline}`;
    bar.style.display = o.state === 'downloading' ? 'block' : 'none';
    btn.style.display = 'none';
    switch (o.state) {
      case 'ready':
        badge.className = 'badge ok';
        badge.textContent = app.androidBrowserTab ? `✓ ${T.startOfflineReadyInstall}` : `✓ ${T.offlineReady}${net}`;
        break;
      case 'missing':
      case 'error':
        if (app.iosBrowserTab) {
          // only the home-screen app keeps offline data on iPhone – see the install hint below
          badge.className = 'badge';
          badge.textContent = T.startOfflineHomeAppOnly;
          break;
        }
        badge.className = app.online ? 'badge warn' : 'badge bad';
        badge.textContent = app.online ? (o.state === 'error' ? T.offlineError : tf(T.startOfflineMissingSize, { label: o.missingLabel })) : T.offlineNoNet;
        if (app.online) {
          btn.style.display = 'inline-block';
          btn.textContent = `⬇️ ${T.offlineMissing} (${o.missingLabel})`;
        }
        break;
      case 'downloading':
        badge.className = 'badge warn';
        badge.textContent = `${T.offlineDownloading} ${tf(T.startPercent, { pct: Math.round(o.progress * 100) })}`;
        (bar.firstElementChild as HTMLElement).style.width = `${Math.round(o.progress * 100)}%`;
        break;
      case 'unsupported':
        badge.className = 'badge';
        badge.textContent = o.swBroken ? T.startOfflineNeedsCert : T.startOfflineNoHttps;
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
    h('div', {}, `⚠️ ${tf(T.startLastError, { date: new Date(last.at).toLocaleString(locale()), msg: last.message.slice(0, 140) })}`),
    h(
      'div',
      { class: 'row', style: 'margin-top:6px' },
      h('button', { class: 'btn secondary', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => void navigator.clipboard?.writeText(app.errors.asText()).then(() => toast(T.startErrorCopied)) }, T.startCopy),
      h('button', { class: 'btn ghost', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => { app.errors.clear(); el.remove(); } }, T.startHide),
    ),
  );
  return el;
}

function installHint(app: App): HTMLElement | null {
  if (app.iosBrowserTab) {
    return h(
      'div',
      { class: 'small', style: 'margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(56,189,248,0.12);color:#bae6fd' },
      `📲 ${T.startIosHintPre} `,
      h('b', {}, T.startIosShare),
      ' → ',
      h('b', {}, T.startIosAddHome),
      T.startIosHintPost,
    );
  }
  if (app.installPrompt) {
    const p = app.installPrompt;
    return h(
      'button',
      {
        class: 'btn block secondary',
        style: 'margin-top:12px',
        onclick: (e: Event) => {
          // Chrome allows prompt() only once per event – drop the button right away
          (e.currentTarget as HTMLElement).remove();
          app.installPrompt = null;
          p.prompt().catch(() => undefined);
        },
      },
      `📲 ${T.startInstallApp}`,
    );
  }
  if (app.androidBrowserTab) {
    return h(
      'div',
      { class: 'small', style: 'margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(56,189,248,0.12);color:#bae6fd' },
      `📲 ${T.startAndroidHintPre} `,
      h('b', {}, '⋮'),
      ' → ',
      h('b', {}, T.startAndroidInstall),
      ` ${T.startAndroidHintPost}`,
    );
  }
  return null;
}

export function StartScreen(app: App): Screen {
  const offline = offlineRow(app);
  const el = h(
    'div',
    { class: 'screen', 'data-screen': 'start' },
    h(
      'div',
      { class: 'card' },
      h('h1', { class: 'title' }, 'Window ', h('span', { class: 'accent' }, 'Blaster')),
      h('p', { class: 'subtitle' }, T.tagline),
      h(
        'div',
        { class: 'col' },
        h('button', { class: 'btn block', onclick: () => app.beginFlow('camera') }, `🎥 ${T.play}`),
        h('button', { class: 'btn block secondary', onclick: () => app.showChallenges() }, `📅 ${T.startChallenges}`),
        h('button', { class: 'btn block secondary', onclick: () => app.showPartySetup() }, `👥 ${T.startDuel}`),
        h('button', { class: 'btn block secondary', onclick: () => app.beginFlow('demo') }, `🕹️ ${T.demo}`),
        h('button', { class: 'btn block secondary', 'data-glasses': '1', onclick: () => app.showGlasses() }, `🕶️ ${app.xrSupport.headset ? T.startGlassesHeadset : T.startGlasses}${app.settings.data.glasses || (app.settings.data.headset && app.xrSupport.headset) ? ' ✓' : ''}`),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn secondary grow', onclick: () => app.showLeaderboard() }, `🏆 ${T.leaderboard}`),
          h('button', { class: 'btn secondary grow', onclick: () => app.showShop() }, `🎁 ${fmtScore(app.unlocks.balance)}`),
          h('button', { class: 'btn secondary grow', onclick: () => app.showStats() }, '📊'),
          h('button', { class: 'btn secondary grow', onclick: () => app.showSettings() }, `⚙️`),
        ),
      ),
      offline.el,
      installHint(app),
      errorCard(app),
      h('p', { class: 'footer' }, `v${__APP_VERSION__} · ${T.safetyPrivacy}`),
    ),
  );
  return { el, exit: () => offline.dispose() };
}
