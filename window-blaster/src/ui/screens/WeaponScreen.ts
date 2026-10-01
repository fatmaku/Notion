import type { App } from '../../app/App';
import type { WeaponId } from '../../core/types';
import { WEAPONS } from '../../game/weapons/configs';
import { fmtScore, h, toast } from '../dom';
import { T, WEAPON_TEXT } from '../i18n/de';
import type { Screen } from '../Router';

export function WeaponScreen(app: App): Screen {
  let picked: WeaponId[] = [...new Set(app.session.weapons)].filter((w) => app.unlocks.weaponUnlocked(w));
  if (!picked.length) picked = ['smg'];
  const grid = h('div', { class: 'choice-grid' });
  const next = h('button', { class: 'btn grow' }, T.next) as HTMLButtonElement;
  const bar = (label: string, v: number) =>
    h('div', { class: 'small muted', style: 'margin-top:6px' }, label, h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(v * 100)}%` })));
  const render = () => {
    grid.replaceChildren(
      ...(Object.keys(WEAPONS) as WeaponId[]).map((k) => {
        const w = WEAPONS[k];
        const idx = picked.indexOf(k);
        const locked = !app.unlocks.weaponUnlocked(k);
        return h(
          'button',
          {
            class: `choice${idx >= 0 ? ' selected' : ''}${locked ? ' locked' : ''}`,
            onclick: () => {
              if (locked) {
                toast(`🔒 ${WEAPON_TEXT[k].name}: im Shop für ${fmtScore(w.price)} Punkte freischalten`, 2500);
                return;
              }
              if (idx >= 0) picked.splice(idx, 1);
              else {
                picked.push(k);
                if (picked.length > 2) picked.shift();
              }
              render();
            },
          },
          h('div', { class: 'icon' }, WEAPON_TEXT[k].icon, idx >= 0 ? h('span', { class: 'badge ok', style: 'margin-left:8px' }, `Slot ${idx + 1}`) : locked ? h('span', { class: 'badge', style: 'margin-left:8px' }, `🔒 ${fmtScore(w.price)}`) : null),
          h('div', { class: 'name' }, WEAPON_TEXT[k].name),
          h('div', { class: 'desc' }, WEAPON_TEXT[k].desc),
          bar('Schaden', w.ui.damage),
          bar('Feuerrate', w.ui.rate),
          bar('Fläche', w.ui.area),
        );
      }),
    );
    next.disabled = picked.length === 0;
  };
  render();
  next.onclick = () => {
    const a = picked[0];
    const b = picked[1] ?? picked[0];
    app.session.weapons = [a, b];
    app.afterWeapons();
  };
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, T.weaponTitle),
      h('p', { class: 'muted small' }, T.weaponHint),
      grid,
      h('div', { class: 'row', style: 'margin-top:16px' }, h('button', { class: 'btn secondary', onclick: () => app.showModeScreen() }, T.back), h('button', { class: 'btn secondary', onclick: () => app.showShop(() => app.afterMode()) }, '🎁'), next),
    ),
  );
  return { el };
}
