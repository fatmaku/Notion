import type { WeaponId } from '../core/types';
import { CATALOG, byId, type UnlockItem, type UnlockKind } from '../game/unlocks/catalog';
import type { Storage } from './Storage';

interface UnlockData {
  /** points earned in total */
  earned: number;
  /** points spent in the shop */
  spent: number;
  owned: string[];
  selected: Record<UnlockKind, string | null>;
}

/** Wallet + unlock state. Every round's score becomes spendable balance. */
export class Unlocks {
  private data: UnlockData;
  constructor(private readonly storage: Storage) {
    this.data = { earned: 0, spent: 0, owned: [], selected: { weapon: null, skin: 'skin:default', crosshair: 'cross:classic', palette: 'pal:pop' }, ...storage.get<Partial<UnlockData>>('unlocks.v1', {}) };
    for (const i of CATALOG) if (i.price === 0 && !this.data.owned.includes(i.id)) this.data.owned.push(i.id);
  }

  private save(): void {
    this.storage.set('unlocks.v1', this.data);
  }

  get balance(): number {
    return Math.max(0, this.data.earned - this.data.spent);
  }

  get earned(): number {
    return this.data.earned;
  }

  earn(points: number): void {
    if (points > 0) {
      this.data.earned += Math.round(points);
      this.save();
    }
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id);
  }

  weaponUnlocked(w: WeaponId): boolean {
    const item = CATALOG.find((i) => i.kind === 'weapon' && i.weapon === w);
    return !item || this.owns(item.id);
  }

  canAfford(id: string): boolean {
    const i = byId(id);
    return !!i && this.balance >= i.price;
  }

  buy(id: string): 'ok' | 'owned' | 'poor' | 'unknown' {
    const i = byId(id);
    if (!i) return 'unknown';
    if (this.owns(id)) return 'owned';
    if (this.balance < i.price) return 'poor';
    this.data.spent += i.price;
    this.data.owned.push(id);
    if (i.kind !== 'weapon') this.data.selected[i.kind] = id;
    this.save();
    return 'ok';
  }

  select(id: string): boolean {
    const i = byId(id);
    if (!i || !this.owns(id) || i.kind === 'weapon') return false;
    this.data.selected[i.kind] = id;
    this.save();
    return true;
  }

  selected(kind: UnlockKind): UnlockItem | undefined {
    const id = this.data.selected[kind];
    return id ? byId(id) : undefined;
  }

  /** Items that became affordable with the latest earnings. */
  newlyAffordable(before: number): UnlockItem[] {
    return CATALOG.filter((i) => !this.owns(i.id) && i.price > before && i.price <= this.balance);
  }

  nextGoal(): { item: UnlockItem; missing: number } | null {
    const cands = CATALOG.filter((i) => !this.owns(i.id) && i.price > this.balance).sort((a, b) => a.price - b.price);
    return cands.length ? { item: cands[0], missing: cands[0].price - this.balance } : null;
  }
}
