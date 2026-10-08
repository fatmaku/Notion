import type { WeaponId } from '../../core/types';
import { WEAPONS } from '../weapons/configs';
import { T, WEAPON_TEXT } from '../../ui/i18n';

export type UnlockKind = 'weapon' | 'skin' | 'crosshair' | 'palette';

export interface UnlockItem {
  id: string;
  kind: UnlockKind;
  icon: string;
  name: string;
  desc: string;
  price: number;
  /** payload: weapon id, skin colours, crosshair style or palette colours */
  weapon?: WeaponId;
  skin?: { color: string; shade: string; cuff: string };
  crosshair?: 'classic' | 'dot' | 'brackets' | 'neon';
  palette?: string[];
}

// `name`/`desc` (and the weapon icons) are getters: the texts are read from `T` / `WEAPON_TEXT` at access
// time instead of being copied at import, so a language switch is picked up on the next render.
export const CATALOG: UnlockItem[] = [
  ...(Object.values(WEAPONS)
    .filter((w) => w.price > 0)
    .map((w) => ({ id: `weapon:${w.id}`, kind: 'weapon' as const, get icon() { return WEAPON_TEXT[w.id].icon; }, get name() { return WEAPON_TEXT[w.id].name; }, get desc() { return WEAPON_TEXT[w.id].desc; }, price: w.price, weapon: w.id })) as UnlockItem[]),
  { id: 'skin:default', kind: 'skin', icon: '✋', get name() { return T.itemSkinDefaultName; }, get desc() { return T.itemSkinDefaultDesc; }, price: 0, skin: { color: '#f2c9a8', shade: '#d9a684', cuff: '#2563eb' } },
  { id: 'skin:dark', kind: 'skin', icon: '🤚🏾', get name() { return T.itemSkinDarkName; }, get desc() { return T.itemSkinDarkDesc; }, price: 1000, skin: { color: '#8d5a3b', shade: '#6b4128', cuff: '#16a34a' } },
  { id: 'skin:glove', kind: 'skin', icon: '🧤', get name() { return T.itemSkinGloveName; }, get desc() { return T.itemSkinGloveDesc; }, price: 2000, skin: { color: '#dc2626', shade: '#991b1b', cuff: '#f8fafc' } },
  { id: 'skin:robot', kind: 'skin', icon: '🤖', get name() { return T.itemSkinRobotName; }, get desc() { return T.itemSkinRobotDesc; }, price: 3000, skin: { color: '#9ca3af', shade: '#4b5563', cuff: '#f59e0b' } },
  { id: 'skin:zombie', kind: 'skin', icon: '🧟', get name() { return T.itemSkinZombieName; }, get desc() { return T.itemSkinZombieDesc; }, price: 3500, skin: { color: '#84cc16', shade: '#4d7c0f', cuff: '#3f3f46' } },
  { id: 'cross:classic', kind: 'crosshair', icon: '🎯', get name() { return T.itemCrossClassicName; }, get desc() { return T.itemCrossClassicDesc; }, price: 0, crosshair: 'classic' },
  { id: 'cross:dot', kind: 'crosshair', icon: '•', get name() { return T.itemCrossDotName; }, get desc() { return T.itemCrossDotDesc; }, price: 1000, crosshair: 'dot' },
  { id: 'cross:brackets', kind: 'crosshair', icon: '⌜⌟', get name() { return T.itemCrossBracketsName; }, get desc() { return T.itemCrossBracketsDesc; }, price: 1500, crosshair: 'brackets' },
  { id: 'cross:neon', kind: 'crosshair', icon: '💠', get name() { return T.itemCrossNeonName; }, get desc() { return T.itemCrossNeonDesc; }, price: 2500, crosshair: 'neon' },
  { id: 'pal:pop', kind: 'palette', icon: '🎨', get name() { return T.itemPalPopName; }, get desc() { return T.itemPalPopDesc; }, price: 0, palette: ['#ff2d95', '#00e5ff', '#ffe600', '#7cff00', '#ff6a00', '#b84dff'] },
  { id: 'pal:pastel', kind: 'palette', icon: '🩷', get name() { return T.itemPalPastelName; }, get desc() { return T.itemPalPastelDesc; }, price: 1500, palette: ['#fbcfe8', '#bfdbfe', '#fde68a', '#bbf7d0', '#fed7aa', '#ddd6fe'] },
  { id: 'pal:gold', kind: 'palette', icon: '🥇', get name() { return T.itemPalGoldName; }, get desc() { return T.itemPalGoldDesc; }, price: 3000, palette: ['#ffd700', '#c0c0c0', '#e6be8a', '#f5f5dc', '#b8860b', '#d4af37'] },
  { id: 'pal:germany', kind: 'palette', icon: '🖤', get name() { return T.itemPalGermanyName; }, get desc() { return T.itemPalGermanyDesc; }, price: 2000, palette: ['#111111', '#dd0000', '#ffce00'] },
];

export const byId = (id: string): UnlockItem | undefined => CATALOG.find((i) => i.id === id);
