/**
 * Small, dependency-free 3D math for the WebXR panel (column-major 4×4 matrices like WebXR /
 * WebGL). Pure functions – unit-tested in tests/unit/xrMath.test.ts.
 */
export type Mat4 = Float32Array;
export interface V3 {
  x: number;
  y: number;
  z: number;
}

export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** out = a × b (column-major). */
export function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}

/** Rigid transform: rotation about +Y (yaw, radians, counter-clockwise seen from above), then translation; optional scale of the local x/y axes. */
export function poseYaw(pos: V3, yaw: number, sx = 1, sy = 1): Mat4 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const m = identity();
  m[0] = c * sx;
  m[2] = -s * sx;
  m[5] = sy;
  m[8] = s;
  m[10] = c;
  m[12] = pos.x;
  m[13] = pos.y;
  m[14] = pos.z;
  return m;
}

/** Translation + scale in a parent's local frame (for head-locked quads). */
export function localQuad(offset: V3, sx: number, sy: number): Mat4 {
  const m = identity();
  m[0] = sx;
  m[5] = sy;
  m[12] = offset.x;
  m[13] = offset.y;
  m[14] = offset.z;
  return m;
}

/** Inverse of a general 4×4 affine matrix (returns identity when singular). */
export function invertAffine(m: ArrayLike<number>): Mat4 {
  // upper 3×3 inverse via cofactors, then -R⁻¹·t
  const a = m[0], b = m[4], c = m[8];
  const d = m[1], e = m[5], f = m[9];
  const g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!det || !Number.isFinite(det)) return identity();
  const inv = 1 / det;
  const r00 = A * inv;
  const r01 = -(b * i - c * h) * inv;
  const r02 = (b * f - c * e) * inv;
  const r10 = B * inv;
  const r11 = (a * i - c * g) * inv;
  const r12 = -(a * f - c * d) * inv;
  const r20 = C * inv;
  const r21 = -(a * h - b * g) * inv;
  const r22 = (a * e - b * d) * inv;
  const tx = m[12], ty = m[13], tz = m[14];
  const o = identity();
  o[0] = r00; o[4] = r01; o[8] = r02;
  o[1] = r10; o[5] = r11; o[9] = r12;
  o[2] = r20; o[6] = r21; o[10] = r22;
  o[12] = -(r00 * tx + r01 * ty + r02 * tz);
  o[13] = -(r10 * tx + r11 * ty + r12 * tz);
  o[14] = -(r20 * tx + r21 * ty + r22 * tz);
  return o;
}

export function transformPoint(m: ArrayLike<number>, p: V3): V3 {
  return { x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12], y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13], z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14] };
}

export function transformDir(m: ArrayLike<number>, d: V3): V3 {
  return { x: m[0] * d.x + m[4] * d.y + m[8] * d.z, y: m[1] * d.x + m[5] * d.y + m[9] * d.z, z: m[2] * d.x + m[6] * d.y + m[10] * d.z };
}

/** Forward (-Z) direction of a pose matrix projected on the floor → yaw (0 = looking down -Z). */
export function yawOf(m: ArrayLike<number>): number {
  const fx = -m[8];
  const fz = -m[10];
  return Math.atan2(-fx, -fz);
}

/** Smallest signed difference a − b of two angles (radians, in −π..π). */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export interface PanelPose {
  pos: V3;
  yaw: number;
}

/** Panel placed `dist` metres in front of a head pose (gravity-aligned, facing the user). */
export function panelInFront(head: ArrayLike<number>, dist: number, drop = 0.1): PanelPose {
  const yaw = yawOf(head);
  return { pos: { x: head[12] - Math.sin(yaw) * dist, y: head[13] - drop, z: head[14] - Math.cos(yaw) * dist }, yaw };
}

/**
 * "Lazy follow": the panel stays put while you look around a little; once the view has turned
 * away by more than `threshold` for `delay` seconds (or the head moved far, e.g. tracking drift
 * in a vehicle), it glides back in front. Returns the new pose and timer state.
 */
export function lazyFollow(
  panel: PanelPose,
  target: PanelPose,
  dt: number,
  st: { awayFor: number; moving: boolean },
  threshold = (32 * Math.PI) / 180,
  delay = 0.6,
  maxDist = 0.9,
): { pose: PanelPose; awayFor: number; moving: boolean } {
  const dYaw = angleDiff(target.yaw, panel.yaw);
  const dPos = Math.hypot(target.pos.x - panel.pos.x, target.pos.y - panel.pos.y, target.pos.z - panel.pos.z);
  const away = Math.abs(dYaw) > threshold || dPos > maxDist;
  let awayFor = away ? st.awayFor + dt : 0;
  let moving = st.moving || awayFor >= delay;
  if (!moving) return { pose: panel, awayFor, moving };
  // ease towards the target; stop once close
  const k = 1 - Math.exp(-dt * 5);
  const pose: PanelPose = {
    yaw: panel.yaw + dYaw * k,
    pos: { x: panel.pos.x + (target.pos.x - panel.pos.x) * k, y: panel.pos.y + (target.pos.y - panel.pos.y) * k, z: panel.pos.z + (target.pos.z - panel.pos.z) * k },
  };
  if (Math.abs(angleDiff(target.yaw, pose.yaw)) < 0.02 && dPos < 0.02) {
    moving = false;
    awayFor = 0;
  }
  return { pose, awayFor, moving };
}

/**
 * Ray against a unit quad (local x, y in −0.5..0.5 at z = 0) transformed by `model`.
 * Returns the hit as panel UV (u right, v down, 0..1) plus the distance along the ray, or null.
 */
export function rayQuadHit(origin: V3, dir: V3, model: ArrayLike<number>): { u: number; v: number; dist: number } | null {
  const inv = invertAffine(model);
  const o = transformPoint(inv, origin);
  const d = transformDir(inv, dir);
  if (Math.abs(d.z) < 1e-9) return null;
  const t = -o.z / d.z;
  if (!(t > 0)) return null;
  const x = o.x + d.x * t;
  const y = o.y + d.y * t;
  if (x < -0.5 || x > 0.5 || y < -0.5 || y > 0.5) return null;
  // distance in world units (the local frame may be scaled)
  const wp = transformPoint(model, { x, y, z: 0 });
  return { u: x + 0.5, v: 0.5 - y, dist: Math.hypot(wp.x - origin.x, wp.y - origin.y, wp.z - origin.z) };
}

/** Origin and forward (-Z) direction of an XR pose matrix (e.g. a controller's target ray). */
export function rayOf(m: ArrayLike<number>): { origin: V3; dir: V3 } {
  const dir = transformDir(m, { x: 0, y: 0, z: -1 });
  const n = Math.hypot(dir.x, dir.y, dir.z) || 1;
  return { origin: { x: m[12], y: m[13], z: m[14] }, dir: { x: dir.x / n, y: dir.y / n, z: dir.z / n } };
}

/**
 * Size (metres) of a head-locked quad that shows the whole stage when the camera frame spans
 * `hfovDeg` horizontally: the camera image width covers 2·d·tan(hfov/2) at distance d.
 */
export function overlaySize(dist: number, hfovDeg: number, stageW: number, stageH: number, videoCssW: number, k = 1): { w: number; h: number } {
  const frameW = 2 * dist * Math.tan((hfovDeg * Math.PI) / 360) * k;
  const perCss = frameW / Math.max(1, videoCssW);
  return { w: stageW * perCss, h: stageH * perCss };
}
