import { describe, expect, it } from 'vitest';
import { angleDiff, identity, invertAffine, lazyFollow, localQuad, multiply, overlaySize, panelInFront, poseYaw, rayOf, rayQuadHit, transformPoint, yawOf } from '../../src/xr/xrMath';

describe('xr math', () => {
  it('poseYaw / yawOf round-trip and forward direction', () => {
    for (const yaw of [0, 0.5, -1.2, 2.9]) {
      const m = poseYaw({ x: 1, y: 2, z: 3 }, yaw);
      expect(yawOf(m)).toBeCloseTo(yaw, 5);
    }
    // yaw 0 looks down -Z
    const p = panelInFront(identity(), 2, 0);
    expect(p.pos.x).toBeCloseTo(0);
    expect(p.pos.z).toBeCloseTo(-2);
    // turned 90° left (counter-clockwise from above) looks down -X
    const left = panelInFront(poseYaw({ x: 0, y: 1.6, z: 0 }, Math.PI / 2), 2, 0.1);
    expect(left.pos.x).toBeCloseTo(-2);
    expect(left.pos.y).toBeCloseTo(1.5);
    expect(left.pos.z).toBeCloseTo(0, 5);
  });

  it('invertAffine undoes rotation, scale and translation', () => {
    const m = multiply(poseYaw({ x: 0.3, y: -1, z: 4 }, 0.8), localQuad({ x: 0.1, y: 0.2, z: -1 }, 1.6, 0.9));
    const inv = invertAffine(m);
    const p = { x: 0.25, y: -0.4, z: 0 };
    const back = transformPoint(inv, transformPoint(m, p));
    expect(back.x).toBeCloseTo(p.x, 5);
    expect(back.y).toBeCloseTo(p.y, 5);
    expect(back.z).toBeCloseTo(p.z, 5);
    const id = multiply(m, inv);
    for (let i = 0; i < 16; i++) expect(id[i]).toBeCloseTo(i % 5 === 0 ? 1 : 0, 5);
  });

  it('a ray through the panel centre hits uv (0.5, 0.5); corners map to 0/1; misses are null', () => {
    const model = multiply(poseYaw({ x: 0, y: 1.5, z: -2 }, 0), localQuad({ x: 0, y: 0, z: 0 }, 1.6, 0.9));
    const hit = rayQuadHit({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, model);
    expect(hit).not.toBeNull();
    expect(hit!.u).toBeCloseTo(0.5);
    expect(hit!.v).toBeCloseTo(0.5);
    expect(hit!.dist).toBeCloseTo(2);
    // aim at the top-left area: u small, v small (v grows downwards)
    const tl = rayQuadHit({ x: -0.7, y: 1.5 + 0.4, z: 0 }, { x: 0, y: 0, z: -1 }, model)!;
    expect(tl.u).toBeCloseTo(0.5 - 0.7 / 1.6);
    expect(tl.v).toBeCloseTo(0.5 - 0.4 / 0.9);
    expect(rayQuadHit({ x: 3, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, model)).toBeNull();
    // pointing away
    expect(rayQuadHit({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: 1 }, model)).toBeNull();
  });

  it('rayOf reads the -Z ray of a controller pose', () => {
    const r = rayOf(poseYaw({ x: 1, y: 1, z: 1 }, Math.PI / 2));
    expect(r.origin).toEqual({ x: 1, y: 1, z: 1 });
    expect(r.dir.x).toBeCloseTo(-1);
    expect(r.dir.z).toBeCloseTo(0, 5);
  });

  it('angleDiff wraps around ±π', () => {
    expect(angleDiff(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2);
    expect(angleDiff(0.1, -0.1)).toBeCloseTo(0.2);
  });

  it('lazy follow ignores small glances but glides back after a long look away', () => {
    const panel = { pos: { x: 0, y: 1.5, z: -2 }, yaw: 0 };
    // a small glance (10°) never moves it
    let st = { awayFor: 0, moving: false };
    let pose = panel;
    for (let i = 0; i < 120; i++) ({ pose, ...st } = lazyFollow(pose, { pos: panel.pos, yaw: 0.17 }, 1 / 60, st));
    expect(pose.yaw).toBe(0);
    // a 60° turn: waits for the delay, then follows
    const target = { pos: { x: -1.7, y: 1.5, z: -1 }, yaw: Math.PI / 3 };
    st = { awayFor: 0, moving: false };
    pose = panel;
    for (let i = 0; i < 20; i++) ({ pose, ...st } = lazyFollow(pose, target, 1 / 60, st));
    expect(pose.yaw).toBe(0); // 0.33 s < delay
    for (let i = 0; i < 240; i++) ({ pose, ...st } = lazyFollow(pose, target, 1 / 60, st));
    expect(pose.yaw).toBeCloseTo(Math.PI / 3, 1);
    expect(st.moving).toBe(false);
  });

  it('overlay size follows the camera field of view', () => {
    // stage == video width: the quad is exactly the camera frame width at that distance
    const s = overlaySize(2, 90, 1280, 720, 1280);
    expect(s.w).toBeCloseTo(4);
    expect(s.h).toBeCloseTo(2.25);
    // video wider than the stage (object-fit: cover crops): the stage covers a smaller angle
    expect(overlaySize(2, 90, 1000, 720, 1280).w).toBeCloseTo(4 * (1000 / 1280));
    expect(overlaySize(2, 90, 1280, 720, 1280, 1.1).w).toBeCloseTo(4.4);
  });
});
