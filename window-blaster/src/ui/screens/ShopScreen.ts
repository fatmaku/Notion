import type { App } from '../../app/App';
import { CATALOG, type UnlockItem, type UnlockKind } from '../../game/unlocks/catalog';
import { fmtScore, h, toast } from '../dom';
import { SHOP, T } from '../i18n/de';
import type { Screen } from '../Router';

const KIND_TITLE: Record<UnlockKind, string> = { weapon: '🔫 Waffen & Wurfsachen', skin: '✋ Hand-Skins (Runner)', crosshair: '🎯 Fadenkreuze', palette: '🎨 Farbpaletten' };

/** Spend accumulated points on weapons, skins, crosshairs and paint palettes. */
export function ShopScreen(app: App, onBack: () => void): Screen {
  const u = app.unlocks;
  const wallet = h('div', { class: 'wallet' });
  const goal = h('p', { class: 'muted small' });
  const grids = h('div', {});
  let confirmId: string | null = null;

  const render = () => {
    wallet.textContent = `💰 ${fmtScore(u.balance)} ${SHOP.balance}`;
    const g = u.nextGoal();
    goal.textContent = g ? `Noch ${fmtScore(g.missing)} Punkte bis ${g.item.icon} ${g.item.name}` : 'Alles freigeschaltet – Respekt!';
    grids.replaceChildren(
      ...(['weapon', 'skin', 'crosshair', 'palette'] as UnlockKind[]).map((kind) =>
        h(
          'div',
          { style: 'margin-top:14px' },
          h('h2', { class: 'small muted', style: 'margin-bottom:8px' }, KIND_TITLE[kind]),
          h('div', { class: 'shop-grid' }, ...CATALOG.filter((i) => i.kind === kind).map((i) => card(i))),
        ),
      ),
    );
  };

  const card = (i: UnlockItem) => {
    const owned = u.owns(i.id);
    const sel = i.kind !== 'weapon' && u.selected(i.kind)?.id === i.id;
    const afford = u.canAfford(i.id);
    let action: HTMLElement;
    if (owned) {
      action = i.kind === 'weapon' ? h('span', { class: 'badge ok' }, `✓ ${SHOP.owned}`) : sel ? h('span', { class: 'badge ok' }, `✓ ${SHOP.selected}`) : h('button', { class: 'btn secondary', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => { u.select(i.id); app.applyUnlocks(); render(); } }, SHOP.select);
    } else if (confirmId === i.id) {
      action = h('button', { class: 'btn', style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => {
        const r = u.buy(i.id);
        confirmId = null;
        if (r === 'ok') {
          app.sfx.unlock();
          app.sfx.play('mission');
          toast(`${i.icon} ${i.name} freigeschaltet!`);
          app.applyUnlocks();
        } else toast(SHOP.notEnough);
        render();
      } }, `Ja, für ${fmtScore(i.price)}`);
    } else {
      action = h('button', { class: `btn ${afford ? '' : 'secondary'}`, disabled: !afford, style: 'min-height:34px;padding:4px 10px;font-size:13px', onclick: () => { confirmId = i.id; render(); } }, `${afford ? '🔓' : '🔒'} ${fmtScore(i.price)}`);
    }
    const preview = i.palette ? h('div', { class: 'row', style: 'gap:4px;margin:6px 0' }, ...i.palette.map((c) => h('span', { style: `display:inline-block;width:16px;height:16px;border-radius:50%;background:${c}` }))) : null;
    return h('div', { class: `choice${owned ? '' : ' locked'}${sel ? ' selected' : ''}`, style: 'cursor:default' }, h('div', { class: 'icon' }, i.icon), h('div', { class: 'name' }, i.name), h('div', { class: 'desc' }, i.desc), preview, h('div', { style: 'margin-top:8px' }, action));
  };

  render();
  const el = h(
    'div',
    { class: 'screen' },
    h('div', { class: 'card', style: 'width:min(720px,100%)' }, h('div', { class: 'row', style: 'justify-content:space-between;align-items:center' }, h('h2', {}, `🎁 ${SHOP.title}`), wallet), h('p', { class: 'muted small' }, SHOP.hint), goal, grids, h('button', { class: 'btn block secondary', style: 'margin-top:14px', onclick: onBack }, T.back)),
  );
  return { el };
}
