import { T } from '../ui/i18n';
import { PAD, type PadLike } from './bindings';

/**
 * Gamepad navigation for the HTML menus: d-pad / left stick move the focus between buttons,
 * A presses the focused one (hold buttons get a real press-and-hold), B goes back.
 */
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), a[href]';

export class MenuNav {
  private prev = { a: false, b: false, up: false, down: false, left: false, right: false };
  private repeatAt = 0;
  private holding: HTMLElement | null = null;
  /** a screen that reads the pad itself (glasses alignment) switches the menu navigation off */
  suspended = false;

  constructor(private readonly root: HTMLElement) {}

  private items(): HTMLElement[] {
    const list = Array.from(this.root.querySelectorAll<HTMLElement>(FOCUSABLE));
    return list.filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
  }

  /** Moves the focus by `step` (wraps around). */
  move(step: number): void {
    const list = this.items();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next = list[i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length];
    next.focus({ preventScroll: false });
    next.scrollIntoView?.({ block: 'nearest' });
  }

  /** Presses the focused element: click, or press-and-hold for `.hold` buttons. */
  press(down: boolean): void {
    const el = document.activeElement as HTMLElement | null;
    if (down) {
      if (!el || !this.root.contains(el)) {
        this.move(1);
        return;
      }
      if (el.classList.contains('hold')) {
        this.holding = el;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9001, isPrimary: true }));
      } else if (el instanceof HTMLInputElement && el.type === 'checkbox') el.click();
      else if (el instanceof HTMLInputElement && el.type === 'range') return;
      else el.click();
    } else if (this.holding) {
      this.holding.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9001, isPrimary: true }));
      this.holding = null;
    }
  }

  /** "Back": the visible button labelled Back (or marked data-back). */
  back(): void {
    const btns = this.items().filter((el) => el instanceof HTMLButtonElement && (el.dataset.back !== undefined || el.textContent?.trim() === T.back));
    btns[btns.length - 1]?.click();
  }

  /** Range inputs: left/right change the value. Returns true when consumed. */
  private nudgeRange(dir: number): boolean {
    const el = document.activeElement;
    if (!(el instanceof HTMLInputElement) || el.type !== 'range') return false;
    if (dir > 0) el.stepUp();
    else el.stepDown();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /** `active` = a menu is on screen; otherwise the pad state is only tracked. */
  update(gp: PadLike | null, now: number, active = true): void {
    if (!gp) return;
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const s = {
      a: b(PAD.A),
      b: b(PAD.B),
      up: b(PAD.UP) || ay < -0.6,
      down: b(PAD.DOWN) || ay > 0.6,
      left: b(PAD.LEFT) || ax < -0.6,
      right: b(PAD.RIGHT) || ax > 0.6,
    };
    const p = this.prev;
    // record first: a throwing click handler must not repeat every frame while A is held
    this.prev = s;
    if (this.suspended || !active) {
      // keep tracking the buttons, so a press consumed elsewhere (play, alignment) is not replayed later
      if (this.holding) this.press(false);
      return;
    }
    const dirNow = s.up || s.down || s.left || s.right;
    const fresh = (s.up && !p.up) || (s.down && !p.down) || (s.left && !p.left) || (s.right && !p.right);
    if (dirNow && (fresh || now >= this.repeatAt)) {
      this.repeatAt = now + (fresh ? 420 : 130);
      if (s.left || s.right) {
        if (!this.nudgeRange(s.right ? 1 : -1)) this.move(s.right ? 1 : -1);
      } else this.move(s.down ? 1 : -1);
    }
    if (s.a !== p.a) this.press(s.a);
    if (s.b && !p.b) this.back();
  }

  /** Lets go of a hold button pressed with A (screen change). */
  release(): void {
    if (this.holding) this.press(false);
  }
}
