import { describe, expect, it } from 'vitest';
import { edges, keyIntents, mergeIntents, noIntents, PAD, padIntents, shapeStick, type PadLike } from '../../src/input/bindings';
import { HOLD_MS, SLOP_PX, TAP_MS, Touchpad } from '../../src/input/Touchpad';
import { calibrateMapping, videoTransform } from '../../src/render/Layers';
import { sanitizeCal } from '../../src/app/Settings';

function pad(pressed: number[] = [], axes: number[] = [0, 0, 0, 0], values: Record<number, number> = {}): PadLike {
  return {
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: values[i] ?? (pressed.includes(i) ? 1 : 0) })),
    axes,
    mapping: 'standard',
  };
}

describe('gamepad bindings', () => {
  it('shooter: A / RT fire, X reload, Y / bumpers swap, Start pause, Back recenter', () => {
    expect(padIntents(pad([PAD.A]), 'shooter').fire).toBe(true);
    expect(padIntents(pad([], undefined, { [PAD.RT]: 0.6 }), 'shooter').fire).toBe(true);
    expect(padIntents(pad([], undefined, { [PAD.RT]: 0.2 }), 'shooter').fire).toBe(false);
    expect(padIntents(pad([PAD.X]), 'shooter').reload).toBe(true);
    for (const b of [PAD.Y, PAD.LB, PAD.RB]) expect(padIntents(pad([b]), 'shooter').swap).toBe(true);
    expect(padIntents(pad([PAD.START]), 'shooter').pause).toBe(true);
    expect(padIntents(pad([PAD.BACK]), 'shooter').recenter).toBe(true);
    expect(padIntents(pad([PAD.A]), 'shooter').jump).toBe(false);
  });

  it('runner: A / up jump, B / down duck, no shooting', () => {
    const it = padIntents(pad([PAD.A]), 'runner');
    expect(it.jump).toBe(true);
    expect(it.fire).toBe(false);
    expect(padIntents(pad([PAD.B]), 'runner').duck).toBe(true);
    expect(padIntents(pad([], [0, 0.9, 0, 0]), 'runner').duck).toBe(true);
    expect(padIntents(pad([], [0, -0.9, 0, 0]), 'runner').jump).toBe(true);
    expect(padIntents(pad([PAD.UP]), 'runner').jump).toBe(true);
  });

  it('sticks: radial dead zone, curved response, d-pad adds a constant push', () => {
    expect(shapeStick(0.1, 0.1)).toEqual({ x: 0, y: 0 });
    const half = shapeStick(0.6, 0);
    const full = shapeStick(1, 0);
    expect(full.x).toBeCloseTo(1);
    expect(half.x).toBeGreaterThan(0);
    expect(half.x).toBeLessThan(0.5); // squared curve: fine aim near the centre
    expect(padIntents(pad([], [0.05, 0.05, 0, 0]), 'shooter').aim).toEqual({ x: 0, y: 0 });
    expect(padIntents(pad([PAD.RIGHT]), 'shooter').aim.x).toBeGreaterThan(0);
    expect(padIntents(pad([PAD.UP]), 'shooter').aim.y).toBeLessThan(0);
    const aim = padIntents(pad([PAD.RIGHT], [1, 0, 0, 0]), 'shooter').aim;
    expect(aim.x).toBe(1); // clamped
  });

  it('edges report presses and releases once', () => {
    const a = noIntents();
    const b = { ...noIntents(), fire: true, swap: true };
    expect(edges(a, b)).toEqual({ pressed: ['fire', 'swap'], released: [] });
    expect(edges(b, b)).toEqual({ pressed: [], released: [] });
    expect(edges(b, a)).toEqual({ pressed: [], released: ['fire', 'swap'] });
  });
});

describe('keyboard bindings', () => {
  it('shooter keys: space fires, arrows aim, R reload, Q/E swap, Escape pauses', () => {
    expect(keyIntents(new Set(['Space']), 'shooter').fire).toBe(true);
    expect(keyIntents(new Set(['PageDown']), 'shooter').fire).toBe(true); // presenter remote
    expect(keyIntents(new Set(['KeyR']), 'shooter').reload).toBe(true);
    expect(keyIntents(new Set(['KeyE']), 'shooter').swap).toBe(true);
    expect(keyIntents(new Set(['Escape']), 'shooter').pause).toBe(true);
    const aim = keyIntents(new Set(['ArrowLeft', 'ArrowUp']), 'shooter').aim;
    expect(aim.x).toBeLessThan(0);
    expect(aim.y).toBeLessThan(0);
  });

  it('runner keys: space / up jump, down duck', () => {
    expect(keyIntents(new Set(['Space']), 'runner').jump).toBe(true);
    expect(keyIntents(new Set(['ArrowUp']), 'runner').jump).toBe(true);
    expect(keyIntents(new Set(['ArrowDown']), 'runner').duck).toBe(true);
    expect(keyIntents(new Set(['Space']), 'runner').fire).toBe(false);
  });

  it('merge ORs buttons and adds aim', () => {
    const m = mergeIntents({ ...noIntents(), fire: true, aim: { x: 0.8, y: 0 } }, { ...noIntents(), reload: true, aim: { x: 0.5, y: -0.2 } });
    expect(m.fire && m.reload).toBe(true);
    expect(m.aim).toEqual({ x: 1, y: -0.2 });
  });
});

describe('touchpad', () => {
  it('a quick tap fires once; a drag only moves the crosshair', () => {
    const tp = new Touchpad();
    expect(tp.down(1, 100, 100, 0)).toEqual([]);
    expect(tp.up(1, TAP_MS - 50)).toEqual([{ kind: 'tap' }]);
    tp.down(1, 100, 100, 1000);
    const mv = tp.move(1, 100 + SLOP_PX * 3, 100, 1050);
    expect(mv).toEqual([{ kind: 'move', dx: SLOP_PX * 3 * tp.gain, dy: 0 }]);
    expect(tp.up(1, 1100)).toEqual([]);
  });

  it('holding still turns into continuous fire until the finger lifts', () => {
    const tp = new Touchpad();
    tp.down(1, 50, 50, 0);
    expect(tp.tick(HOLD_MS - 10)).toEqual([]);
    expect(tp.tick(HOLD_MS + 5)).toEqual([{ kind: 'fireDown' }]);
    expect(tp.firing).toBe(true);
    // aiming while firing keeps firing
    expect(tp.move(1, 80, 50, HOLD_MS + 50)).toEqual([{ kind: 'move', dx: 30 * tp.gain, dy: 0 }]);
    expect(tp.up(1, HOLD_MS + 400)).toEqual([{ kind: 'fireUp' }]);
    expect(tp.firing).toBe(false);
  });

  it('a second finger fires while the first keeps aiming', () => {
    const tp = new Touchpad();
    tp.down(1, 0, 0, 0);
    tp.move(1, 40, 0, 20);
    expect(tp.down(2, 300, 300, 40)).toEqual([{ kind: 'fireDown' }]);
    expect(tp.move(1, 60, 10, 60)).toEqual([{ kind: 'move', dx: 20 * tp.gain, dy: 10 * tp.gain }]);
    expect(tp.move(2, 310, 300, 70)).toEqual([]); // the fire finger does not aim
    expect(tp.up(2, 100)).toEqual([{ kind: 'fireUp' }]);
    expect(tp.up(1, 120)).toEqual([]); // no tap after a drag
  });

  it('cancel releases a held trigger', () => {
    const tp = new Touchpad();
    tp.down(1, 0, 0, 0);
    tp.tick(HOLD_MS + 1);
    expect(tp.cancel()).toEqual([{ kind: 'fireUp' }]);
    expect(tp.cancel()).toEqual([]);
  });
});

describe('glasses calibration mapping', () => {
  const cover = { scale: 0.5, offX: -40, offY: 0 };
  it('null calibration keeps the cover mapping', () => {
    expect(calibrateMapping(cover, 800, 360, null)).toBe(cover);
    expect(videoTransform(null, 800, 360)).toBe('');
    expect(videoTransform(null, 800, 360, { x: 2, y: -1 })).toBe('translate(2.0px, -1.0px)');
  });

  it('zooms around the stage centre and shifts by fractions of the stage', () => {
    const m = calibrateMapping(cover, 800, 360, { k: 2, dx: 0.1, dy: -0.05 });
    expect(m.scale).toBeCloseTo(1);
    // video px → css: the stage centre stays fixed under pure zoom
    const pure = calibrateMapping(cover, 800, 360, { k: 2, dx: 0, dy: 0 });
    const vx = (400 - cover.offX) / cover.scale; // video x at the stage centre
    expect(vx * pure.scale + pure.offX).toBeCloseTo(400);
    expect(m.offX - pure.offX).toBeCloseTo(80);
    expect(m.offY - pure.offY).toBeCloseTo(-18);
  });

  it('the CSS video transform matches the canvas mapping', () => {
    // element scaled by k around its centre, then translated: x' = c + (x - c)·k + d
    const cal = { k: 1.5, dx: 0.02, dy: 0.1 };
    const tf = videoTransform(cal, 800, 360);
    expect(tf).toBe('translate(16.0px, 36.0px) scale(1.5000)');
    const m = calibrateMapping(cover, 800, 360, cal);
    const vx = 123;
    const cssCover = vx * cover.scale + cover.offX;
    expect(400 + (cssCover - 400) * 1.5 + 16).toBeCloseTo(vx * m.scale + m.offX);
  });

  it('stored calibrations are clamped', () => {
    expect(sanitizeCal({ k: 99, dx: -5, dy: Number.NaN })).toEqual({ k: 4, dx: -0.6, dy: 0 });
    expect(sanitizeCal(undefined)).toEqual({ k: 1, dx: 0, dy: 0 });
  });
});
