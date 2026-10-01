import type { WeaponId } from '../../core/types';
import { WEAPONS } from '../weapons/configs';
import { WEAPON_TEXT } from '../../ui/i18n/de';

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

export const CATALOG: UnlockItem[] = [
  ...(Object.values(WEAPONS)
    .filter((w) => w.price > 0)
    .map((w) => ({ id: `weapon:${w.id}`, kind: 'weapon' as const, icon: WEAPON_TEXT[w.id].icon, name: WEAPON_TEXT[w.id].name, desc: WEAPON_TEXT[w.id].desc, price: w.price, weapon: w.id })) as UnlockItem[]),
  { id: 'skin:default', kind: 'skin', icon: '✋', name: 'Hand (hell)', desc: 'Die Standard-Hand.', price: 0, skin: { color: '#f2c9a8', shade: '#d9a684', cuff: '#2563eb' } },
  { id: 'skin:dark', kind: 'skin', icon: '🤚🏾', name: 'Hand (dunkel)', desc: 'Andere Hautfarbe, gleiche Sprungkraft.', price: 1000, skin: { color: '#8d5a3b', shade: '#6b4128', cuff: '#16a34a' } },
  { id: 'skin:glove', kind: 'skin', icon: '🧤', name: 'Roter Handschuh', desc: 'Wärmt im Winter.', price: 2000, skin: { color: '#dc2626', shade: '#991b1b', cuff: '#f8fafc' } },
  { id: 'skin:robot', kind: 'skin', icon: '🤖', name: 'Roboterhand', desc: 'Chrom, Nieten, Zukunft.', price: 3000, skin: { color: '#9ca3af', shade: '#4b5563', cuff: '#f59e0b' } },
  { id: 'skin:zombie', kind: 'skin', icon: '🧟', name: 'Zombiehand', desc: 'Läuft trotzdem erstaunlich flott.', price: 3500, skin: { color: '#84cc16', shade: '#4d7c0f', cuff: '#3f3f46' } },
  { id: 'cross:classic', kind: 'crosshair', icon: '🎯', name: 'Klassisch', desc: 'Kreis mit Strichen.', price: 0, crosshair: 'classic' },
  { id: 'cross:dot', kind: 'crosshair', icon: '•', name: 'Punkt', desc: 'Minimalistisch.', price: 1000, crosshair: 'dot' },
  { id: 'cross:brackets', kind: 'crosshair', icon: '⌜⌟', name: 'Klammern', desc: 'Wie im Kampfjet.', price: 1500, crosshair: 'brackets' },
  { id: 'cross:neon', kind: 'crosshair', icon: '💠', name: 'Neon', desc: 'Leuchtet türkis.', price: 2500, crosshair: 'neon' },
  { id: 'pal:pop', kind: 'palette', icon: '🎨', name: 'Pop-Farben', desc: 'Pink, Türkis, Gelb, Grün.', price: 0, palette: ['#ff2d95', '#00e5ff', '#ffe600', '#7cff00', '#ff6a00', '#b84dff'] },
  { id: 'pal:pastel', kind: 'palette', icon: '🩷', name: 'Pastell', desc: 'Sanfte Töne.', price: 1500, palette: ['#fbcfe8', '#bfdbfe', '#fde68a', '#bbf7d0', '#fed7aa', '#ddd6fe'] },
  { id: 'pal:gold', kind: 'palette', icon: '🥇', name: 'Gold & Silber', desc: 'Edel lackiert.', price: 3000, palette: ['#ffd700', '#c0c0c0', '#e6be8a', '#f5f5dc', '#b8860b', '#d4af37'] },
  { id: 'pal:germany', kind: 'palette', icon: '🖤', name: 'Schwarz-Rot-Gold', desc: 'Für Fans.', price: 2000, palette: ['#111111', '#dd0000', '#ffce00'] },
];

export const byId = (id: string): UnlockItem | undefined => CATALOG.find((i) => i.id === id);
