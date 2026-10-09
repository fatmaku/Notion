import type { App } from '../../app/App';
import { shareTargets, type ShareKind, type ShareTarget } from '../../app/shareTargets';
import { h, toast } from '../dom';
import { T } from '../i18n';
import { qrSvg } from '../qr';
import type { Screen } from '../Router';

const ICON: Record<ShareKind, string> = { online: '🌐', quest: '🥽', mac: '💻', here: '📶' };

/**
 * "📲 Auf anderes Gerät": QR codes that bring the game onto a second phone, a Quest headset or the
 * phone driving display glasses – the best address first (public copy, then the Mac launcher).
 */
export function SendScreen(app: App, onBack: () => void = () => app.showStart()): Screen {
  const tabs = h('div', { class: 'row send-tabs' });
  const body = h('div', { class: 'send-body' }, h('p', { class: 'muted', 'data-send': 'searching' }, T.sendSearching));
  let alive = true;

  const label = (k: ShareKind) => ({ online: T.sendTabOnline, quest: T.sendTabQuest, mac: T.sendTabMac, here: T.sendTabHere })[k];
  const hint = (k: ShareKind) => ({ online: T.sendHintOnline, quest: T.sendHintQuest, mac: T.sendHintMac, here: T.sendHintHere })[k];

  const show = (list: ShareTarget[], i: number) => {
    const t = list[i];
    tabs.replaceChildren(
      ...(list.length > 1
        ? list.map((x, j) =>
            h(
              'button',
              { class: `btn ${j === i ? '' : 'secondary'}`, 'data-send-tab': x.kind, style: 'min-height:40px;padding:8px 12px;font-size:14px', onclick: () => show(list, j) },
              `${ICON[x.kind]} ${label(x.kind)}`,
            ),
          )
        : []),
    );
    const qr = h('div', { class: 'qr-card', 'data-send-qr': t.kind });
    qr.append(qrSvg(t.url, `${label(t.kind)}: ${t.url}`));
    // no clipboard API over plain http (Mac setup pages): fall back to a prompt the user can copy from
    const copy = () =>
      navigator.clipboard ? navigator.clipboard.writeText(t.url).then(() => toast(T.sendCopied)).catch(() => window.prompt(T.sendCopy, t.url)) : window.prompt(T.sendCopy, t.url);
    const share = typeof navigator.share === 'function' ? h('button', { class: 'btn secondary grow', onclick: () => void navigator.share({ title: T.appName, url: t.url }).catch(() => undefined) }, `📤 ${T.sendShare}`) : null;
    // the code first (scan right away), the explanation below it
    body.replaceChildren(
      qr,
      h('div', { class: 'send-url', 'data-send-url': t.kind }, t.url),
      h('p', { class: 'small', style: 'margin:10px 0 0' }, hint(t.kind)),
      h('div', { class: 'row', style: 'margin-top:8px' }, share, h('button', { class: 'btn secondary grow', onclick: () => void copy() }, `📋 ${T.sendCopy}`)),
    );
  };

  void shareTargets().then((list) => {
    if (!alive) return;
    if (!list.length) {
      body.replaceChildren(h('p', { class: 'small', 'data-send': 'none' }, T.sendNone));
      return;
    }
    show(list, 0);
  });

  const el = h(
    'div',
    { class: 'screen', 'data-screen': 'send' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, `📲 ${T.sendTitle}`),
      h('p', { class: 'muted small' }, T.sendIntro),
      tabs,
      body,
      h('button', { class: 'btn block secondary', style: 'margin-top:14px', onclick: () => onBack() }, T.back),
    ),
  );
  return {
    el,
    exit: () => {
      alive = false;
    },
  };
}
