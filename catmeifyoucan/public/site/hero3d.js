// Cat Me If You Can – 3D-Szene der Startseite (three.js): Nacht über Kadıköy, ein Wollknäuel in
// Sarman-Orange, schwebende Katzenkarten und ein Kamera-Sucher, der eine Karte nach der anderen
// „einfängt“. Ruhige Bewegung, Parallaxe bei Zeiger und Scrollen.
// Leitplanken: ≤ 60 000 Dreiecke, devicePixelRatio ≤ 2, Pause außerhalb des Bildschirms und bei
// verstecktem Tab, reduced motion → ein einziges stilles Bild.

import * as THREE from '../vendor/three/three.module.min.js';
import { catAvatarSvg } from '../js/avatar.js';

const CREAM = new THREE.Color('#fbf3e4');
const SUN = new THREE.Color('#f6d55c');

const CATS = [
  { name: 'Tarçın', pattern: 'sarman', eye: 'green', no: 7, stars: 1 },
  { name: 'Fıstık', pattern: 'uc_renk', eye: 'copper', no: 23, stars: 3 },
  { name: 'Paşa', pattern: 'smokin', eye: 'yellow', no: 12, stars: 1, tipped: true },
  { name: 'Lokum', pattern: 'van', eye: 'blue', no: 31, stars: 4 },
  { name: 'Duman', pattern: 'tekir', eye: 'yellow', no: 4, stars: 1, tipped: true },
  { name: 'Pamuk', pattern: 'beyaz', eye: 'odd', no: 18, stars: 2 },
];

// Ankerpunkte der Karten um das Knäuel (Einheit: Knäuel-Radius). Querformat / Hochformat.
const ANCHORS = {
  wide: [
    [-1.95, 0.95, 0.7, 0.1], [2.05, 1.05, 0.2, -0.08], [1.95, -1.05, 0.8, 0.06],
    [-1.7, -1.2, 0.5, -0.1], [0.35, 2.0, -1.4, 0.04], [-0.2, -2.05, -1.3, -0.05],
  ],
  tall: [
    [-1.42, 0.78, 0.7, 0.1], [1.45, 0.8, 0.3, -0.08], [1.4, -0.82, 0.8, 0.07],
    [-1.38, -0.8, 0.5, -0.1], [0.62, 0.95, -1.5, 0.06], [-0.55, -0.95, -1.4, -0.05],
  ],
};
const LOCK_ORDER = [0, 2, 1, 3];

const CARD_W = 320;
const CARD_H = 420;
const CARD_PAD = 18;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function starPath(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

async function fontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  const timeout = new Promise((r) => setTimeout(r, 1500));
  try {
    await Promise.race([Promise.all([document.fonts.load('700 30px Unbounded'), document.fonts.load('800 18px Manrope')]), timeout]);
  } catch {
    /* Systemschrift */
  }
}

async function drawCard(cat) {
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const g = c.getContext('2d');
  const x = CARD_PAD;
  const y = CARD_PAD;
  const w = CARD_W - 2 * CARD_PAD;
  const h = CARD_H - 2 * CARD_PAD;
  g.save();
  g.shadowColor = 'rgba(4, 10, 24, 0.55)';
  g.shadowBlur = 22;
  g.shadowOffsetY = 8;
  roundRect(g, x, y, w, h, 26);
  g.fillStyle = '#fbf3e4';
  g.fill();
  g.restore();
  // Foto
  const svg = catAvatarSvg({ id: cat.name, name: cat.name, profile: { pattern: cat.pattern, eye_color: cat.eye, ear_tip: cat.tipped ? 'tipped' : 'none' } });
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const ax = x + 16;
  const ay = y + 16;
  const aw = w - 32;
  g.save();
  roundRect(g, ax, ay, aw, aw, 18);
  g.clip();
  g.drawImage(img, ax, ay, aw, aw);
  g.restore();
  // Name, Nummer, Sterne
  g.fillStyle = '#14213d';
  g.font = '700 29px Unbounded, Manrope, sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillText(cat.name, ax + 2, ay + aw + 44);
  g.fillStyle = '#5d6680';
  g.font = '800 18px Manrope, sans-serif';
  g.fillText(`#${String(cat.no).padStart(3, '0')}`, ax + 2, ay + aw + 74);
  for (let i = 0; i < 5; i++) {
    starPath(g, ax + aw - 10 - (4 - i) * 21, ay + aw + 68, 8.5);
    g.fillStyle = i < cat.stars ? '#f28c28' : '#e2d6bf';
    g.fill();
  }
  return c;
}

function drawFinder() {
  const s = 2;
  const c = document.createElement('canvas');
  c.width = CARD_W * s;
  c.height = CARD_H * s;
  const g = c.getContext('2d');
  g.scale(s, s);
  const x = CARD_PAD - 6;
  const y = CARD_PAD - 6;
  const w = CARD_W - 2 * x;
  const h = CARD_H - 2 * y;
  const L = 62;
  const r = 22;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const corner = (x0, y0, dx, dy) => {
    g.beginPath();
    g.moveTo(x0, y0 + dy * L);
    g.lineTo(x0, y0 + dy * r);
    g.quadraticCurveTo(x0, y0, x0 + dx * r, y0);
    g.lineTo(x0 + dx * L, y0);
    g.stroke();
  };
  corner(x, y, 1, 1);
  corner(x + w, y, -1, 1);
  corner(x, y + h, 1, -1);
  corner(x + w, y + h, -1, -1);
  // kleines Fadenkreuz
  g.lineWidth = 4;
  g.globalAlpha = 0.7;
  g.beginPath();
  g.moveTo(CARD_W / 2 - 12, CARD_H / 2);
  g.lineTo(CARD_W / 2 + 12, CARD_H / 2);
  g.moveTo(CARD_W / 2, CARD_H / 2 - 12);
  g.lineTo(CARD_W / 2, CARD_H / 2 + 12);
  g.stroke();
  return c;
}

function drawRing() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 128, 110, 0, Math.PI * 2);
  g.stroke();
  return c;
}

function drawGlow(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}

function drawFiber() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 32);
  g.strokeStyle = 'rgba(120, 52, 6, 0.38)';
  g.lineWidth = 5;
  for (let i = -2; i < 6; i++) {
    g.beginPath();
    g.moveTo(i * 16, 0);
    g.lineTo(i * 16 + 32, 32);
    g.stroke();
  }
  return c;
}

/** Ein Knäuel aus mehreren „Bändern“ paralleler Fäden um eine Kugel. */
function buildYarn(fiberTex) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 28),
    new THREE.MeshStandardMaterial({ color: '#b8571a', roughness: 0.95 }),
  );
  group.add(core);
  const tones = ['#f28c28', '#f59a3c', '#e57e1f', '#f7a54e'].map((c) => new THREE.Color(c));
  const mats = tones.map((color) => {
    const map = fiberTex.clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(70, 1);
    return new THREE.MeshStandardMaterial({ color, map, roughness: 0.82, metalness: 0 });
  });
  const rand = mulberry(7);
  const BANDS = 6;
  const PER = 4;
  for (let b = 0; b < BANDS; b++) {
    const axis = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    const tilt = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(axis).normalize();
    const phase = rand() * Math.PI * 2;
    for (let k = 0; k < PER; k++) {
      const ax = axis.clone().applyAxisAngle(tilt, (k - (PER - 1) / 2) * 0.085).normalize();
      const u = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
      const v = new THREE.Vector3().crossVectors(ax, u).normalize();
      const r = 1.035 + (b * PER + k) * 0.0022;
      const pts = [];
      const N = 72;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const p = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a)));
        p.add(ax.clone().multiplyScalar(0.12 * Math.sin(2 * a + phase)));
        pts.push(p.normalize().multiplyScalar(r));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.046, 6, true), mats[(b + k) % mats.length]);
      group.add(tube);
    }
  }
  return { group, mats };
}

function buildThread(mat) {
  const pts = [
    [0.5, -0.86, 0.3], [0.86, -1.18, 0.5], [1.25, -1.38, 0.42], [1.7, -1.3, 0.2],
    [2.2, -1.46, 0.3], [2.7, -1.82, 0.5], [3.3, -1.86, 0.2], [4.1, -2.2, 0.1], [5.4, -2.5, 0.0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 140, 0.04, 6, false), mat);
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/**
 * Startet die Szene. Gibt null zurück, wenn WebGL fehlt – dann bleibt das statische Bild.
 * @param {{canvas: HTMLCanvasElement, host: HTMLElement, reduced: boolean, onReady?: () => void, onLost?: () => void}} opts
 */
export async function startHero({ canvas, host, reduced, onReady, onLost, safeArea }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.HemisphereLight('#9db8ff', '#3a1c08', 1.15));
  const key = new THREE.DirectionalLight('#ffd7a3', 2.6);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#46d1cc', 2.2);
  rim.position.set(-5, -1.5, -3);
  scene.add(rim);
  const fill = new THREE.PointLight('#f28c28', 6, 9, 1.6);
  fill.position.set(-1.5, -1.8, 2.5);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);
  const rig = new THREE.Group(); // Knäuel + Karten (Position je nach Format)
  world.add(rig);

  // Wollknäuel
  const fiber = new THREE.CanvasTexture(drawFiber());
  fiber.colorSpace = THREE.SRGBColorSpace;
  const yarn = buildYarn(fiber);
  rig.add(yarn.group);
  const thread = buildThread(yarn.mats[0]);
  rig.add(thread);

  // Sterne
  const rand = mulberry(42);
  const starCount = 420;
  const pos = new Float32Array(starCount * 3);
  const col = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    pos[i * 3] = (rand() - 0.5) * 34;
    pos[i * 3 + 1] = (rand() - 0.35) * 18;
    pos[i * 3 + 2] = -6 - rand() * 14;
    const c = rand() < 0.2 ? SUN : CREAM;
    col.set([c.r, c.g, c.b], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const starMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
  const stars = new THREE.Points(starGeo, starMat);
  world.add(stars);

  // Weiche Lichter der Stadt (Bokeh)
  const glowO = new THREE.CanvasTexture(drawGlow('rgba(242,140,40,0.55)'));
  const glowT = new THREE.CanvasTexture(drawGlow('rgba(70,209,204,0.38)'));
  const glows = [];
  [[-4.5, -2.6, -4, 3.2, glowO], [4.8, 2.6, -6, 4.2, glowT], [1.5, -3.2, -3, 2.4, glowO], [-2.2, 3, -7, 3.6, glowT], [6, -1.5, -5, 2.6, glowO]].forEach(([x, y, z, s, map], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    sp.position.set(x, y, z);
    sp.scale.setScalar(s);
    sp.userData = { base: sp.position.clone(), phase: i * 1.7 };
    world.add(sp);
    glows.push(sp);
  });

  // Katzenkarten
  await fontsReady();
  const cardGeo = new THREE.PlaneGeometry(1, CARD_H / CARD_W);
  const cards = [];
  const canvases = await Promise.all(CATS.map((c) => drawCard(c).catch(() => null)));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  canvases.forEach((cv, i) => {
    if (!cv) return;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const m = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
    m.userData = { i, phase: i * 1.13, pop: 0 };
    rig.add(m);
    cards.push(m);
  });

  // Sucher + Ping-Ring
  const finderTex = new THREE.CanvasTexture(drawFinder());
  finderTex.colorSpace = THREE.SRGBColorSpace;
  const finder = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: finderTex, transparent: true, depthTest: false, depthWrite: false, color: CREAM.clone(), toneMapped: false }));
  finder.renderOrder = 10;
  scene.add(finder);
  const ringTex = new THREE.CanvasTexture(drawRing());
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthTest: false, depthWrite: false, color: SUN.clone(), opacity: 0, toneMapped: false }));
  ring.renderOrder = 11;
  scene.add(ring);

  // ---------------------------------------------------------------- Layout
  let layout = 'wide';
  let flipX = 1;
  let cardScale = 0.9;
  const lookAt = new THREE.Vector3();
  const camBase = new THREE.Vector3(0, 0, 10);

  function applyLayout(w, h) {
    const aspect = w / Math.max(1, h);
    camera.aspect = aspect;
    layout = aspect < 0.95 ? 'tall' : 'wide';
    camera.fov = layout === 'tall' ? 40 : 34;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camBase.z;
    const visW = visH * aspect;
    let s;
    if (layout === 'tall') {
      // Handy hochkant: in den freien Raum zwischen Kopfzeile und Text (der Text steht unten)
      const area = (safeArea && safeArea()) || { top: 72, bottom: h * 0.42 };
      const top = Math.max(0, area.top);
      const bottom = Math.max(top + 120, Math.min(h, area.bottom));
      const pxToUnits = visH / Math.max(1, h);
      s = Math.max(0.42, Math.min(0.8, (visW * 0.94) / 3.9, ((bottom - top) * pxToUnits) / 3.25));
      const midPx = (top + bottom) / 2;
      rig.position.set(0, visH / 2 - midPx * pxToUnits, 0);
    } else {
      s = Math.min(1.05, (visH * 0.82) / 5.2, (visW * 0.48) / 5.2);
      // gegenüber vom Text: rechts (bei Arabisch/Persisch links), nicht zu weit vom Text weg
      const flip = document.documentElement.dir === 'rtl' ? -1 : 1;
      const x = Math.min(visW * 0.24, 1.25 + visW * 0.12);
      rig.position.set(flip * x, -visH * 0.02, 0);
    }
    // Spiegeln (Karten + loser Faden), damit die Komposition immer vom Text weg zeigt
    flipX = layout === 'wide' && document.documentElement.dir === 'rtl' ? -1 : 1;
    thread.scale.x = flipX;
    rig.scale.setScalar(s);
    cardScale = layout === 'tall' ? 0.9 : 0.92;
    lookAt.set(0, 0, 0);
  }

  // ---------------------------------------------------------------- Zustand
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;
  let lockIdx = 0;
  let cycleT = 0;
  const CYCLE = 3.4;
  const prevPos = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const worldScale = new THREE.Vector3();
  let t = 0;
  let spin = 0;

  function placeCards(time) {
    const anchors = ANCHORS[layout];
    for (const m of cards) {
      const a = anchors[m.userData.i];
      const bob = Math.sin(time * 0.7 + m.userData.phase) * 0.08;
      m.position.set(a[0] * flipX, a[1] + bob, a[2]);
      const pop = m.userData.pop;
      m.scale.setScalar(cardScale * (1 + 0.08 * Math.sin(Math.min(1, pop) * Math.PI)));
      m.quaternion.copy(camera.quaternion);
      m.rotateZ(a[3] * flipX + Math.sin(time * 0.5 + m.userData.phase) * 0.04);
    }
  }

  function cardWorld(i, out) {
    const m = cards[i];
    if (!m) return out.set(0, 0, 0);
    return m.getWorldPosition(out);
  }

  function updateFinder(dt, frozen) {
    if (!cards.length) {
      finder.visible = false;
      ring.visible = false;
      return;
    }
    const order = LOCK_ORDER.filter((i) => i < cards.length);
    const curI = order[lockIdx % order.length];
    const prevI = order[(lockIdx - 1 + order.length) % order.length];
    if (!frozen) cycleT += dt;
    if (cycleT > CYCLE) {
      cycleT -= CYCLE;
      lockIdx++;
    }
    const k = frozen ? 1 : cycleT;
    const move = frozen ? 1 : easeInOut(Math.min(1, k / 0.9));
    cardWorld(prevI, prevPos);
    cardWorld(curI, tmp);
    tmp2.copy(prevPos).lerp(tmp, move);
    // ein Stück Richtung Kamera
    tmp.copy(camera.position).sub(tmp2).normalize().multiplyScalar(0.25);
    finder.position.copy(tmp2).add(tmp);
    finder.quaternion.copy(camera.quaternion);
    cards[curI].getWorldScale(worldScale);
    const lock = frozen ? 1 : ease((k - 0.9) / 0.3);
    const breathe = frozen ? 0 : Math.sin(Math.max(0, k - 1.2) * 2.2) * 0.012;
    const sc = worldScale.x * (1.32 - 0.24 * lock + breathe);
    finder.scale.set(sc, sc, sc);
    finder.material.color.copy(CREAM).lerp(SUN, lock);
    finder.material.opacity = 0.75 + 0.25 * lock;
    // Karte hüpft beim Einrasten
    for (const m of cards) m.userData.pop = 0;
    if (!frozen && k > 0.9 && k < 1.5) cards[curI].userData.pop = (k - 0.9) / 0.6;
    // Ping
    const pk = frozen ? 1 : (k - 0.95) / 0.8;
    if (pk > 0 && pk < 1) {
      ring.visible = true;
      ring.position.copy(finder.position);
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(worldScale.x * (1.0 + pk * 1.1));
      ring.material.opacity = 0.7 * (1 - pk);
    } else {
      ring.visible = false;
    }
  }

  function frame(dt) {
    t += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    camera.position.set(camBase.x + pointer.x * 0.45, camBase.y - pointer.y * 0.3 - scrollP * 0.6, camBase.z);
    camera.lookAt(lookAt.x, lookAt.y - scrollP * 0.3, lookAt.z);
    spin += dt * (0.22 + scrollP * 0.9);
    yarn.group.rotation.set(Math.sin(t * 0.27) * 0.18, spin, 0.18);
    thread.rotation.z = Math.sin(t * 0.6) * 0.035;
    world.position.y = scrollP * 1.4;
    world.rotation.y = Math.sin(t * 0.12) * 0.05;
    stars.rotation.y = t * 0.004;
    starMat.opacity = 0.7 + Math.sin(t * 0.8) * 0.12;
    for (const g of glows) {
      g.position.x = g.userData.base.x + Math.sin(t * 0.15 + g.userData.phase) * 0.4;
      g.position.y = g.userData.base.y + Math.cos(t * 0.12 + g.userData.phase) * 0.25;
    }
    rig.updateMatrixWorld();
    placeCards(t);
    rig.updateMatrixWorld();
    updateFinder(dt, false);
    renderer.render(scene, camera);
  }

  function still() {
    camera.position.copy(camBase);
    camera.lookAt(lookAt);
    yarn.group.rotation.set(0.12, 0.8, 0.18);
    rig.updateMatrixWorld();
    placeCards(0);
    rig.updateMatrixWorld();
    lockIdx = 0;
    updateFinder(0, true);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    applyLayout(w, h);
    if (reduced) still();
  }

  // ---------------------------------------------------------------- Lauf
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let running = false;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    frame(dt);
  };
  const start = () => {
    if (running || reduced || !onScreen || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  resize();

  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    if (onScreen) start();
    else stop();
  });
  io.observe(host);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onScroll = () => {
    const hgt = host.clientHeight || window.innerHeight;
    scrollP = Math.min(1, Math.max(0, window.scrollY / hgt));
  };
  if (!reduced) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    if (onLost) onLost();
  });

  if (reduced) still();
  else frame(0.016);
  if (onReady) onReady();
  start();

  const info = () => ({ triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, pixelRatio: renderer.getPixelRatio(), running, layout });
  return {
    info,
    /** Nach Sprachwechsel (Schreibrichtung) neu anordnen. */
    relayout: resize,
    destroy() {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      renderer.dispose();
    },
  };
}
