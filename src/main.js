import * as THREE from '/node_modules/three/build/three.module.js';

const W = 1080, H = 1920, FPS = 30, DUR = 45;
const COL = { teal: 0x0F3D3E, cream: 0xF4EBD9, saffron: 0xFF9933, gold: 0xE8B84A, lav: 0x8E7CC3 };

// ---------- helpers ----------
const clamp01 = x => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = u => u * u * (3 - 2 * u);
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
const easeOutBack = u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, u) => a + (b - a) * u;

// Hermite path through [t, ...values] keys; zero tangent at holds/ends.
function makePath(keys, dims) {
  const n = keys.length;
  const tan = keys.map((k, i) => {
    const m = new Array(dims).fill(0);
    if (i === 0 || i === n - 1) return m;
    const p = keys[i - 1], q = keys[i + 1];
    let hold = true;
    for (let d = 0; d < dims; d++) if (k[1 + d] !== p[1 + d] && k[1 + d] !== q[1 + d]) hold = false;
    const same = (a, b) => { for (let d = 0; d < dims; d++) if (a[1 + d] !== b[1 + d]) return false; return true; };
    if (same(k, p) || same(k, q)) return m;
    for (let d = 0; d < dims; d++) m[d] = (q[1 + d] - p[1 + d]) / (q[0] - p[0]);
    return m;
  });
  return t => {
    if (t <= keys[0][0]) return keys[0].slice(1);
    if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0; while (keys[i + 1][0] < t) i++;
    const a = keys[i], b = keys[i + 1], h = b[0] - a[0], s = (t - a[0]) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    const out = [];
    for (let d = 0; d < dims; d++) out.push(h00 * a[1 + d] + h10 * h * tan[i][d] + h01 * b[1 + d] + h11 * h * tan[i + 1][d]);
    return out;
  };
}

// ---------- renderer / scene ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);

stage.insertBefore(renderer.domElement, document.getElementById('vig'));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xD9BFA6, 90, 260);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 600);

scene.add(new THREE.HemisphereLight(0xFFF4E6, 0x86B5AD, 0.95));
const sun = new THREE.DirectionalLight(0xFFEAD2, 1.1); sun.position.set(-30, 40, 24); scene.add(sun);
const fill = new THREE.DirectionalLight(0x9CD8D0, 0.5); fill.position.set(30, 20, -20); scene.add(fill);

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const glow = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color();
const ID_Q = new THREE.Quaternion();
function setInst(mesh, i, x, y, z, sx, sy, sz, q = ID_Q) { tmpP.set(x, y, z); tmpS.set(sx, sy, sz); tmpM.compose(tmpP, q, tmpS); mesh.setMatrixAt(i, tmpM); }

// ---------- world layout ----------
const CITIZEN = new THREE.Vector3(-13, 0, 30);
const MINISTRY = new THREE.Vector3(-19, 0, 18);
const LOK = { x: -6, z: 2, R: 7.6 };
const RAJ = { x: 12, z: -14, R: 5.6 };
const TOWER = new THREE.Vector3(14, 0, -34);
const ISL = { cx: -2, cz: -4, rx: 34, rz: 52 };

const island = new THREE.Group(); scene.add(island);

// island body
{
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 56), mat(0xEADFC2));
  top.scale.set(ISL.rx, 1, ISL.rz); top.position.set(ISL.cx, -0.4, ISL.cz); island.add(top);
  const rock = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 9, 1), mat(0x5E4F4A, { flatShading: true }));
  rock.rotation.x = Math.PI; rock.scale.set(ISL.rx * 0.98, 30, ISL.rz * 0.98); rock.position.set(ISL.cx, -0.8 - 15, ISL.cz); island.add(rock);
  const rock2 = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 6, 1), mat(0x7A6860, { flatShading: true }));
  rock2.rotation.x = Math.PI; rock2.scale.set(14, 40, 20); rock2.position.set(ISL.cx + 6, -30, ISL.cz + 4); island.add(rock2);
  // sage garden patches
  for (let i = 0; i < 46; i++) {
    const a = hash(i * 3.1) * Math.PI * 2, r = Math.sqrt(hash(i * 5.3));
    const px = ISL.cx + Math.cos(a) * r * (ISL.rx - 4), pz = ISL.cz + Math.sin(a) * r * (ISL.rz - 5);
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + hash(i * 7.7) * 3.5, 14), mat(hash(i) > .5 ? 0xC4D6B4 : 0xD3DDBE));
    p.rotation.x = -Math.PI / 2; p.position.set(px, 0.02, pz); island.add(p);
  }
  // edge rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), mat(0x3B8C86));
  rim.rotation.x = Math.PI / 2; rim.scale.set(ISL.rx, ISL.rz, 1); rim.position.set(ISL.cx, 0.02, ISL.cz); island.add(rim);
}

// plazas
function plaza(cx, cz, R, c, rimC) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.9, R + 1.1, 0.24, 48), mat(c)); g.position.set(cx, 0.1, cz); island.add(g);
  const r = new THREE.Mesh(new THREE.TorusGeometry(R + 0.95, 0.12, 6, 64), mat(rimC)); r.rotation.x = Math.PI / 2; r.position.set(cx, 0.24, cz); island.add(r);
}
plaza(LOK.x, LOK.z, LOK.R, 0xFFFBF0, COL.teal);
plaza(RAJ.x, RAJ.z, RAJ.R, 0xF1EAFA, COL.lav);

// path (stepping stones) + route used by outro lanterns
const route = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-13, 0, 29), new THREE.Vector3(-11, 0, 21), new THREE.Vector3(-14, 0, 10), new THREE.Vector3(-15, 0, 0),
  new THREE.Vector3(-12, 0, -10), new THREE.Vector3(-2, 0, -14), new THREE.Vector3(5, 0, -18), new THREE.Vector3(8, 0, -24),
  new THREE.Vector3(12, 0, -30), new THREE.Vector3(14, 0, -33)
], false, 'catmullrom', 0.5);
const routeLen = route.getLength();
{
  const nStones = Math.floor(routeLen / 2.1);
  const st = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 10), mat(0xFFF1D6), nStones);
  for (let i = 0; i < nStones; i++) {
    const p = route.getPointAt(i / (nStones - 1));
    tmpQ.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); setInst(st, i, p.x, 0.05, p.z, 1, 1, 1, tmpQ);
  }
  island.add(st);
}
const routePts = []; for (let i = 0; i < 40; i++) routePts.push(route.getPointAt(i / 39));

// trees
{
  const spots = [];
  const near = (x, z) => {
    if (Math.hypot(x - LOK.x, z - LOK.z) < LOK.R + 3) return true;
    if (Math.hypot(x - RAJ.x, z - RAJ.z) < RAJ.R + 3) return true;
    if (Math.hypot(x - TOWER.x, z - TOWER.z) < 6) return true;
    if (Math.abs(x - MINISTRY.x) < 7 && Math.abs(z - MINISTRY.z) < 5) return true;
    if (Math.hypot(x - CITIZEN.x, z - CITIZEN.z) < 6) return true;
    for (let i = 0; i < routePts.length; i++) if (Math.hypot(x - routePts[i].x, z - routePts[i].z) < 3) return true;
    return false;
  };
  for (let i = 0; i < 400 && spots.length < 70; i++) {
    const a = hash(i * 1.9) * Math.PI * 2, r = Math.sqrt(hash(i * 2.9)) * 0.93;
    const x = ISL.cx + Math.cos(a) * r * ISL.rx, z = ISL.cz + Math.sin(a) * r * ISL.rz;
    if (!near(x, z)) spots.push([x, z, 0.8 + hash(i * 9.1) * 0.9]);
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 5), mat(0x7A5B48), spots.length);
  const c1 = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1.3, 6), mat(0x2E7D74, { flatShading: true }), spots.length);
  const c2 = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 1.1, 6), mat(0x3E9082, { flatShading: true }), spots.length);
  spots.forEach(([x, z, s], i) => { setInst(trunk, i, x, 0.4 * s, z, s, s, s); setInst(c1, i, x, 1.35 * s, z, s, s, s); setInst(c2, i, x, 2.15 * s, z, s, s, s); });
  island.add(trunk, c1, c2);
}

// clouds
const clouds = [];
for (let i = 0; i < 22; i++) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 + hash(i * 3 + k) * 2.2, 1), mat(0xFFEFE0, { flatShading: true, transparent: true, opacity: 0.92 }));
    s.position.set(k * 3 - 4, hash(i + k) * 0.8, hash(i * 2 + k) * 2); s.scale.y = 0.6; g.add(s);
  }
  const ang = hash(i * 4.3) * Math.PI * 2;
  g.position.set(ISL.cx + Math.cos(ang) * (46 + hash(i) * 30), -14 - hash(i * 6.1) * 22, ISL.cz + Math.sin(ang) * (70 + hash(i * 2.2) * 30));
  g.userData.x0 = g.position.x; g.userData.sp = 0.4 + hash(i * 8.8) * 0.5;
  clouds.push(g); island.add(g);
}

// ---------- figures (instanced chambers) ----------
const FIG_COLS = [0xF2A65A, 0x2F7F7A, 0xF4EBD9, 0x8E7CC3, 0xD98880, 0xE8B84A];
class Chamber {
  constructor(o) {
    Object.assign(this, o);
    const radii = []; for (let r = 1.1; r <= o.R - 0.5 + 1e-6; r += 0.6) radii.push(r);
    const wsum = radii.reduce((a, b) => a + b, 0);
    const counts = radii.map(r => Math.max(1, Math.round(o.count * r / wsum)));
    let diff = o.count - counts.reduce((a, b) => a + b, 0), k = counts.length - 1;
    while (diff !== 0) { counts[k] += Math.sign(diff); diff -= Math.sign(diff); k = (k - 1 + counts.length) % counts.length; }
    this.items = [];
    radii.forEach((r, ri) => { for (let j = 0; j < counts[ri]; j++) { const a = (j / counts[ri]) * Math.PI * 2 + ri * 0.37; const idx = this.items.length; this.items.push({ x: o.cx + Math.cos(a) * r, z: o.cz + Math.sin(a) * r, r, a, h: hash(idx + o.seed), h2: hash(idx * 1.7 + o.seed + 9) }); } });
    const n = this.items.length; if (n !== o.count) throw new Error('count mismatch ' + n);
    this.pillar = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.21, 0.3, 10), mat(o.pillarColor), n);
    this.body = new THREE.InstancedMesh(new THREE.ConeGeometry(0.15, 0.44, 6), mat(0xFFFFFF, { flatShading: true }), n);
    this.head = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 1), mat(0xF1DFC4), n);
    this.lan = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), basic(0xFFFFFF), n);
    this.halo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0xFFFFFF, 0.26), n);
    this.items.forEach((it, i) => {
      const pal = o.palette; const c = pal[Math.floor(it.h * pal.length)];
      this.body.setColorAt(i, tmpC.set(c)); this.lan.setColorAt(i, tmpC.set(o.lanternColor)); this.halo.setColorAt(i, tmpC.set(o.lanternColor));
      it.rise = it.h2 < o.riseFrac; it.rs = o.riseStart + it.h * o.riseSpread; it.rd = o.riseDur;
    });
    [this.pillar, this.body, this.head, this.lan, this.halo].forEach(m => { m.frustumCulled = false; island.add(m); });
  }
  update(t, mergeTarget, sinkT) {
    const o = this;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      let u = easeOutBack(seg(t, o.popStart + (it.r / o.R) * o.popSpread + it.h2 * 0.45, o.popStart + (it.r / o.R) * o.popSpread + it.h2 * 0.45 + 0.55));
      if (t < o.popStart) u = 0;
      const sink = sinkT ? 1 - smooth(seg(t, sinkT + Math.hypot(it.x - TOWER.x, it.z - TOWER.z) / 60 * 1.8 + it.h * 0.3, sinkT + Math.hypot(it.x - TOWER.x, it.z - TOWER.z) / 60 * 1.8 + it.h * 0.3 + 0.6)) : 1;
      const sc = Math.max(0, u) * sink;
      const q = tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -it.a);
      setInst(this.pillar, i, it.x, 0.15 * sc, it.z, sc, sc, sc);
      setInst(this.body, i, it.x, 0.52 * sc, it.z, sc, sc, sc, q);
      setInst(this.head, i, it.x, 0.82 * sc, it.z, sc, sc, sc);
      let lx = it.x + Math.cos(it.a + 1.1) * 0.2 * sc, ly = 0.55 * sc, lz = it.z + Math.sin(it.a + 1.1) * 0.2 * sc, ls = sc;
      if (it.rise && t > it.rs) {
        const p = seg(t, it.rs, it.rs + it.rd), e = smooth(p);
        if (p >= 1) ls = 0;
        else { lx = lerp(lx, mergeTarget.x, e); ly = lerp(ly, mergeTarget.y, e) + Math.sin(Math.PI * p) * 2.4; lz = lerp(lz, mergeTarget.z, e); ls = sc * (1 - 0.75 * e); }
      }
      setInst(this.lan, i, lx, ly, lz, ls, ls, ls); setInst(this.halo, i, lx, ly, lz, ls, ls, ls);
    }
    [this.pillar, this.body, this.head, this.lan, this.halo].forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
}
const lok = new Chamber({
  cx: LOK.x, cz: LOK.z, R: LOK.R, count: 543, seed: 1, pillarColor: 0xBFB6A3, palette: FIG_COLS, lanternColor: 0xFFC46B,
  popStart: 10.35, popSpread: 2.0, riseFrac: 0.72, riseStart: 13.7, riseSpread: 1.9, riseDur: 1.3
});
const raj = new THREE.Group(); // placeholder to keep names tidy
const rajya = new Chamber({
  cx: RAJ.x, cz: RAJ.z, R: RAJ.R, count: 245, seed: 50, pillarColor: 0xCFC4DD, palette: [0x8E7CC3, 0xB9A4F0, 0xF4EBD9, 0x6C5BA8, 0xD9A9C6, 0x2F7F7A], lanternColor: 0xC9B3FF,
  popStart: 19.9, popSpread: 1.4, riseFrac: 0.7, riseStart: 22.2, riseSpread: 1.6, riseDur: 1.2
});

// ---------- ministry + citizen + tower ----------
const ministry = new THREE.Group(); ministry.position.copy(MINISTRY); island.add(ministry);
const winMats = [];
{
  const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 4.4), mat(0xF4EBD9)); base.position.y = 1.6; ministry.add(base);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.4, 5.4), mat(0xD9CCB0)); plinth.position.y = 0.2; ministry.add(plinth);
  const shape = new THREE.Shape(); shape.moveTo(-3.9, 0); shape.lineTo(3.9, 0); shape.lineTo(0, 1.5); shape.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }), mat(0xE8D9BA)); ped.position.set(0, 3.2, 2.1); ministry.add(ped);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.2, 10), mat(0xFFFFFF)); c.position.set(-3 + i * 1.2, 1.6, 2.5); ministry.add(c); }
  for (let i = 0; i < 5; i++) { const m = basic(0x1C5C5B); winMats.push(m); const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), m); w.position.set(-2.4 + i * 1.2, 1.7, 2.22); ministry.add(w); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.gold, { roughness: 0.6 })); dome.position.set(0, 3.2, -0.2); ministry.add(dome);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.0, 6), mat(COL.gold)); spire.position.set(0, 5.2, -0.2); ministry.add(spire);
}
const citizen = new THREE.Group(); island.add(citizen);
{
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.44, 6), mat(0xF2A65A, { flatShading: true })); body.position.y = 0.22 + 0.1; citizen.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), mat(0xF1DFC4)); head.position.y = 0.58; citizen.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1, 6), mat(COL.teal)); hat.position.y = 0.68; citizen.add(hat);
  citizen.scale.setScalar(4.4); citizen.position.copy(CITIZEN);
}
const towerG = new THREE.Group(); towerG.position.copy(TOWER); island.add(towerG);
let ribbons = [];
{
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 1.0, 24), mat(0xF4EBD9)); ped.position.y = 0.5; towerG.add(ped);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.1, 6, 36), mat(COL.gold)); rim.rotation.x = Math.PI / 2; rim.position.y = 1.0; towerG.add(rim);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 5.6, 16), mat(0xCFC3A8)); col.position.y = 3.8; towerG.add(col);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.7, 0.5, 16), mat(COL.gold)); cap.position.y = 6.85; towerG.add(cap);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), mat(0xFFFFFF)); pole.position.y = 8.5; towerG.add(pole);
  [0xFF9933, 0xFFFFFF, 0x2E9E5B].forEach((c, i) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.36, 12, 1), basic(c, { side: THREE.DoubleSide })); r.position.set(0.95, 9.7 - i * 0.37, 0); towerG.add(r); ribbons.push(r);
  });
}

// ---------- bill lantern + scroll ----------
const bill = new THREE.Group(); scene.add(bill);
const lanCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic(0xFFC46B));
const lanH1 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), glow(0xFFC46B, 0.09));
const lanH2 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), glow(0xFFC46B, 0.04));
const lanLight = new THREE.PointLight(0xFFC46B, 0, 30, 2);
bill.add(lanCore, lanH1, lanH2, lanLight);
const scroll = new THREE.Group(); bill.add(scroll);
const paperTex = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = '#F7EED9'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = '#C9B38E'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const y = 28 + i * 15, len = 62 + ((i * 37) % 30); g.beginPath(); g.moveTo(22, y); g.lineTo(22 + len, y); g.stroke(); }
  g.fillStyle = '#FF9933'; g.beginPath(); g.arc(98, 168, 12, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshBasicMaterial({ map: paperTex, side: THREE.DoubleSide }));
const rodA = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.7, 10), mat(0xB07A3F)); rodA.rotation.z = Math.PI / 2;
const rodB = rodA.clone();
const paperGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glow(0xFFC46B, 0.0));
const stamp = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 28), basic(0xE8572A, { side: THREE.DoubleSide, transparent: true }));
const stampDot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), basic(0xE8572A, { side: THREE.DoubleSide, transparent: true }));
stamp.position.set(0.38, -0.28, 0.02); stampDot.position.copy(stamp.position);
scroll.add(paperGlow, paper, rodA, rodB, stamp, stampDot);

const billPos = makePath([
  [0, -16, 2.6, 30], [3.9, -16, 2.8, 30], [5.4, -15.2, 2.9, 30], [7.0, -15.2, 3.1, 30],
  [7.9, -17, 6.8, 24], [8.9, -19, 5.4, 19.6], [9.7, -19, 5.4, 19.6],
  [10.4, -14, 9, 12], [11.4, -6, 6.4, 2], [16.9, -6, 6.4, 2],
  [18.1, 3, 10, -6], [19.4, 12, 6.4, -14], [24.9, 12, 6.4, -14],
  [26.6, 13, 13, -24], [28.3, 14, 11.4, -34], [33.6, 14, 11.6, -34], [36.0, 14, 11.6, -34],
  [38.0, 26, 30, -90], [39.9, 34, 62, -200]
], 3);

const GOLD = new THREE.Color(0xF0B63A), WARM = new THREE.Color(0xFFC46B), LAV = new THREE.Color(0xB9A4F0);
function billColor(t) {
  const c = WARM.clone();
  c.lerp(GOLD, smooth(seg(t, 16.4, 17.0)));
  c.lerp(LAV, smooth(seg(t, 19.4, 21.8)));
  c.lerp(GOLD, smooth(seg(t, 24.5, 25.0)));
  return c;
}
function billScale(t) {
  let s = easeOutBack(seg(t, 4.9, 5.5));
  const lokM = smooth(seg(t, 13.8, 16.6)), lokPop = seg(t, 16.6, 17.4);
  const k1 = 1 + 0.3 * (t < 17 ? lokM : 1);
  let m = t < 16.6 ? k1 : 1.3 + 0.0 * lokPop;
  if (t >= 16.6 && t < 17.6) m = 1.3 + 0.18 * Math.sin(Math.PI * seg(t, 16.6, 17.6));
  const dip = smooth(seg(t, 19.6, 22.0)) * 0.3 - smooth(seg(t, 22.2, 24.9)) * 0.3; // review: shrink, then regrow
  m = m - dip;
  if (t >= 24.9 && t < 25.9) m += 0.16 * Math.sin(Math.PI * seg(t, 24.9, 25.9));
  const gone = 1 - smooth(seg(t, 33.4, 34.2));
  return s * m * gone;
}

// ---------- pen + signature ----------
const sigPts = [];
for (let i = 0; i <= 300; i++) { const s = i / 300; sigPts.push(new THREE.Vector3(TOWER.x + (s - 0.5) * 4.6 + 0.4 * Math.cos(s * 21), 14.4 + 0.62 * Math.sin(s * 21) * (0.45 + 0.55 * Math.sin(Math.PI * s)) + 0.35 * Math.sin(s * 5.5), TOWER.z + 0.3)); }
const sigCurve = new THREE.CatmullRomCurve3(sigPts);
const SIG_SEG = 300, SIG_RAD = 5;
const sigTube = new THREE.Mesh(new THREE.TubeGeometry(sigCurve, SIG_SEG, 0.075, SIG_RAD, false), basic(0xFFD36B));
const sigGlow = new THREE.Mesh(new THREE.TubeGeometry(sigCurve, SIG_SEG, 0.2, SIG_RAD, false), glow(0xFFB84A, 0.28));
scene.add(sigTube, sigGlow);
const pen = new THREE.Group();
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8), mat(0xFFFFFF)); b.position.y = 0.7; const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), basic(0xFFD36B)); tip.rotation.x = Math.PI; tip.position.y = 0.05; const g = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), glow(0xFFD36B, 0.5)); pen.add(b, tip, g); pen.rotation.z = -0.5; }
scene.add(pen);

// ---------- effects ----------
const ringGeo = new THREE.RingGeometry(0.9, 1, 72);
function makeRing(color) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; }
const rings = [
  { m: makeRing(0xFFC46B), p: new THREE.Vector3(MINISTRY.x, 0.3, MINISTRY.z + 1), t0: 8.8, d: 1.4, R: 9 },
  { m: makeRing(0xF0B63A), p: new THREE.Vector3(LOK.x, 0.35, LOK.z), t0: 16.6, d: 1.6, R: 13 },
  { m: makeRing(0xF0B63A), p: new THREE.Vector3(RAJ.x, 0.35, RAJ.z), t0: 24.9, d: 1.6, R: 10 },
  { m: makeRing(0xFFA21F), p: new THREE.Vector3(TOWER.x, 0.3, TOWER.z), t0: 31.2, d: 2.6, R: 62 },
  { m: makeRing(0xFFC247), p: new THREE.Vector3(TOWER.x, 0.4, TOWER.z), t0: 31.5, d: 2.2, R: 40 }
];

const waveMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0xFFC247, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
scene.add(waveMesh);
// ---------- skyline ----------
const winTex = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#9A8E7A' : '#FFE2A8'; g.fillRect(6 + x * 14, 8 + y * 15, 8, 9); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
const buildings = [];
{
  const blocked = (x, z) =>
    Math.hypot(x - LOK.x, z - LOK.z) < LOK.R + 2 || Math.hypot(x - RAJ.x, z - RAJ.z) < RAJ.R + 2 || Math.hypot(x - TOWER.x, z - TOWER.z) < 5.5 ||
    (Math.abs(x - MINISTRY.x) < 6.5 && Math.abs(z - MINISTRY.z) < 5) || Math.hypot(x - CITIZEN.x, z - CITIZEN.z) < 4 ||
    routePts.some(p => Math.hypot(x - p.x, z - p.z) < 2.2);
  for (let i = 0; i < 1200 && buildings.length < 105; i++) {
    const a = hash(i * 2.3 + 5) * Math.PI * 2, r = Math.sqrt(hash(i * 3.7 + 1)) * 0.9;
    const x = ISL.cx + Math.cos(a) * r * ISL.rx, z = ISL.cz + Math.sin(a) * r * ISL.rz;
    if (blocked(x, z)) continue;
    if (buildings.some(b => Math.abs(b.x - x) < (b.w + 1.8) / 2 + 0.3 && Math.abs(b.z - z) < (b.d + 1.8) / 2 + 0.3)) continue;
    const w = 1.7 + hash(i * 6.1) * 1.5, d = 1.7 + hash(i * 7.3) * 1.5, h = 1.8 + Math.pow(hash(i * 4.1), 2) * 6.8;
    buildings.push({ x, z, w, d, h, c: [0xFFF6E6, 0xB5DDD5, 0xD6CCF3, 0xFFD9B3, 0xF1E3BE][i % 5], dist: Math.hypot(x - TOWER.x, z - TOWER.z), r: hash(i * 8.3) });
  }
}
const skyline = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: 0xFFFFFF, map: winTex, emissiveMap: winTex, emissive: 0xFFC27A, emissiveIntensity: 0.4, roughness: 0.9 }), buildings.length);
buildings.forEach((b, i) => skyline.setColorAt(i, tmpC.set(b.c)));
skyline.frustumCulled = false; island.add(skyline);


// civic halls that replace the sinking pillars
const civics = [];
function civicHall(x, z, R, domeCol, t0) {
  const g = new THREE.Group(); g.position.set(x, 0.2, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, 1.6, 28), mat(0xFFF6E6)); base.position.y = 0.8; g.add(base);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.2, 8), mat(0xFFFFFF)); c.position.set(Math.cos(a) * R * 0.95, 2.7, Math.sin(a) * R * 0.95); g.add(c); }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.3, 28), mat(0xE9DFC2)); roof.position.y = 3.95; g.add(roof);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 0.72, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(domeCol, { roughness: 0.6 })); dome.position.y = 4.1; g.add(dome);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 6), mat(COL.gold)); sp.position.y = 4.1 + R * 0.72 + 0.5; g.add(sp);
  island.add(g); civics.push({ g, t0 });
}
civicHall(LOK.x, LOK.z, 4.6, COL.gold, 36.3);
civicHall(RAJ.x, RAJ.z, 3.4, 0xA894DB, 36.7);

// ---------- outro lantern trail ----------
const trailCore = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 8), basic(0xFFFFFF), routePts.length);
const trailHalo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.95, 10, 8), glow(0xFFFFFF, 0.3), routePts.length);
trailCore.frustumCulled = trailHalo.frustumCulled = false; island.add(trailCore, trailHalo);
const DIM = new THREE.Color(0x14595B), LIT = new THREE.Color(0xFFC46B);

// ---------- camera ----------
const camPos = makePath([
  [0, -16, 2.5, 37.5], [3.9, -16, 2.8, 36.3], [5.6, -14, 16, 50], [8.2, -17, 10, 33],
  [9.9, -8, 27, 36], [11.0, -6, 38, 32], [16.9, -6, 35, 29], [19.4, 12, 31, 9], [22.5, 12, 30, 8], [25.0, 12, 30, 8],
  [26.4, 13, 10, -10], [30.4, 14, 19, -9], [33.0, 14, 30, 2], [36.5, 6, 24, 30], [39.5, 0, 42, 52], [40.6, 0, 62, 58], [44.5, -2, 88, 58], [45.0, -2, 88, 58]
], 3);
const camLook = makePath([
  [0, -16, 2.5, 30], [3.9, -16, 2.5, 30], [5.6, -15, 1.5, 24], [8.2, -18, 2.5, 17],
  [9.9, -8, 1.5, 8], [11.0, -6, 1, 2], [16.9, -6, 1, 2], [19.4, 12, 1, -14], [25.0, 12, 1, -14],
  [26.4, 14, 6, -34], [30.4, 14, 10, -34], [33.0, 10, 0, -22], [36.5, 4, 8, -30], [39.5, 0, 2, -14], [40.6, -2, 0, -6], [44.5, -2, 0, -4], [45.0, -2, 0, -4]
], 3);

// ---------- DOM: labels, chips, subs ----------
const labelsEl = document.getElementById('labels');
function mkLabel(main, sub, subColor, anchor, t0, t1) {
  const el = document.createElement('div'); el.className = 'label';
  el.innerHTML = `<div class="main">${main}</div><div class="sub" style="color:${subColor}">${sub}</div>`;
  labelsEl.appendChild(el); return { el, anchor, t0, t1 };
}
const labels = [
  mkLabel('MINISTRY', 'drafts the bill', '#FFD9A8', new THREE.Vector3(MINISTRY.x, 6.6, MINISTRY.z), 5.9, 10.0),
  mkLabel('LOK SABHA', 'House of the People', '#FFD9A8', new THREE.Vector3(LOK.x, 2.6, LOK.z - LOK.R - 0.6), 10.5, 17.9),
  mkLabel('RAJYA SABHA', 'Council of States', '#DCCEFF', new THREE.Vector3(RAJ.x, 2.6, RAJ.z - RAJ.R - 0.6), 19.7, 26.4),
  mkLabel('PRESIDENT', 'gives assent', '#FFE7A8', new THREE.Vector3(TOWER.x, 16.4, TOWER.z), 26.8, 34.0)
];
const chipL = document.getElementById('chipL'), chipR = document.getElementById('chipR');
function chipAnim(el, t, t0, t1) {
  const a = easeOutBack(seg(t, t0, t0 + 0.4)) * (1 - smooth(seg(t, t1 - 0.3, t1)));
  el.style.opacity = clamp01(seg(t, t0, t0 + 0.15)) * (1 - smooth(seg(t, t1 - 0.3, t1)));
  el.style.transform = `translate(-50%,0) scale(${Math.max(a, 0)})`;
}
const subEl = document.getElementById('subline');
let timing = null, curChunk = -1, flat = [];
const bg1 = document.getElementById('bg1'), bg2 = document.getElementById('bg2');
const v3 = new THREE.Vector3();

// ---------- frame ----------
function update(t) {
  // background
  bg2.style.opacity = smooth(seg(t, 3.6, 5.3));
  // camera
  const cp = camPos(t), cl = camLook(t);
  camera.position.set(cp[0], cp[1], cp[2]); camera.lookAt(cl[0], cl[1], cl[2]); camera.updateMatrixWorld();
  // island rise-in
  island.visible = t > 3.5;
  island.position.y = -46 * (1 - easeOutCubic(seg(t, 3.6, 5.5)));
  clouds.forEach(c => { c.position.x = c.userData.x0 + t * c.userData.sp; });
  // chambers
  const bp = billPos(t); if (t < 5) bp[1] -= 0.9 * (1 - easeOutCubic(seg(t, 0, 1.8)));
  lok.update(t, { x: bp[0], y: bp[1] - island.position.y, z: bp[2] }, 34.7);
  rajya.update(t, { x: bp[0], y: bp[1] - island.position.y, z: bp[2] }, 34.7);
  // citizen whisper sway
  citizen.rotation.y = Math.PI * 0.5 * 0.9; citizen.rotation.z = 0.1 * Math.sin(t * 2.2) * seg(t, 4.8, 5.5);
  citizen.position.y = 0;
  // ministry windows
  const wl = smooth(seg(t, 8.5, 9.1));
  winMats.forEach((m, i) => m.color.set(0x1C5C5B).lerp(WARM, clamp01(wl * 1.6 - i * 0.12)));
  // bill
  const col = billColor(t), sc = billScale(t);
  bill.position.set(bp[0], bp[1] + Math.sin(t * 2.4) * 0.12, bp[2]);
  lanCore.material.color.copy(col); lanH1.material.color.copy(col); lanH2.material.color.copy(col); lanLight.color.copy(col);
  const pulse = 1 + 0.06 * Math.sin(t * 6);
  lanCore.scale.setScalar(sc * pulse); lanH1.scale.setScalar(sc * pulse); lanH2.scale.setScalar(sc * (1 + 0.1 * Math.sin(t * 4)));
  lanLight.intensity = 70 * sc;
  bill.quaternion.copy(camera.quaternion);
  // scroll: big in the hook, small under the lantern after
  const hook = 1 - smooth(seg(t, 3.7, 5.0));
  const docGrow = smooth(seg(t, 34.2, 35.0));
  const sS = lerp(0.42, 1.2, hook) * (1 + docGrow * 1.5);
  scroll.scale.setScalar(sS);
  scroll.position.set(0, lerp(-1.5 - 0.4 * (1 - docGrow), 0, hook) - docGrow * 0.3 + (hook > 0 ? 0 : 0), 0);
  const roll = smooth(seg(t, 0.5, 3.3));
  const ph = Math.max(0.05, 1.7 * roll); paper.scale.set(1, ph, 1); paper.position.y = 0;
  rodA.position.y = ph / 2; rodB.position.y = -ph / 2;
  scroll.visible = t < 40.2 && (t < 4.9 || sc > 0.01 || t > 34);
  paperGlow.material.opacity = 0.3 * hook * (0.7 + 0.3 * Math.sin(t * 3));
  const stampU = easeOutBack(seg(t, 34.7, 35.1));
  stamp.scale.setScalar(Math.max(stampU, 0.0001)); stampDot.scale.setScalar(Math.max(stampU, 0.0001));
  const stampVis = t > 34.7 ? 1 : 0; stamp.visible = stampDot.visible = !!stampVis;
  // signature + pen
  const sp = smooth(seg(t, 28.7, 31.0));
  sigTube.geometry.setDrawRange(0, Math.floor(sp * SIG_SEG) * SIG_RAD * 6); sigGlow.geometry.setDrawRange(0, Math.floor(sp * SIG_SEG) * SIG_RAD * 6);
  const fade = 1 - smooth(seg(t, 33.2, 34.0));
  sigTube.visible = sigGlow.visible = t > 28.7 && fade > 0.01;
  sigTube.material.transparent = true; sigTube.material.opacity = fade;
  const penP = sigCurve.getPoint(clamp01(sp));
  pen.position.set(penP.x + 0.28, penP.y + 0.05, penP.z); pen.visible = t > 28.4 && t < 31.6;
  pen.scale.setScalar(smooth(seg(t, 28.4, 28.8)) * (1 - smooth(seg(t, 31.1, 31.5))));
  // ribbons
  ribbons.forEach((r, i) => { const p = r.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k) + 0.85; p.setZ(k, Math.sin(t * 5 + x * 3 + i * 0.7) * 0.12 * x); } p.needsUpdate = true; });
  // rings
  rings.forEach(r => { const u = seg(t, r.t0, r.t0 + r.d); r.m.visible = u > 0 && u < 1; r.m.position.copy(r.p).setY(r.p.y + island.position.y * 0); const e = easeOutCubic(u); r.m.scale.setScalar(0.5 + r.R * e); r.m.material.opacity = 0.85 * (1 - u); });
  { const u = seg(t, 31.2, 33.8); waveMesh.visible = u > 0 && u < 1; waveMesh.position.set(TOWER.x, 2.4, TOWER.z); const e = easeOutCubic(u); waveMesh.scale.set(1 + 62 * e, 1, 1 + 62 * e); waveMesh.material.opacity = 0.42 * (1 - u); }
  // skyline
  buildings.forEach((b, i) => {
    const t0 = 35.0 + b.dist / 70 * 2.6 + b.r * 0.4;
    const u = Math.max(0, easeOutBack(seg(t, t0, t0 + 0.75)));
    setInst(skyline, i, b.x, 0, b.z, b.w, b.h * u, b.d);
  });
  skyline.instanceMatrix.needsUpdate = true;
  civics.forEach(c => { const u = Math.max(0.0001, easeOutBack(seg(t, c.t0, c.t0 + 0.8))); c.g.scale.setScalar(t < c.t0 ? 0.0001 : u); });
  // outro trail
  routePts.forEach((p, i) => {
    const t0 = 40.3 + (i / (routePts.length - 1)) * 3.5, u = easeOutBack(seg(t, t0, t0 + 0.4));
    const c = tmpC.copy(DIM).lerp(LIT, clamp01(u)); const s = t < 40.2 ? 0 : 0.5 + 0.5 * Math.max(u, 0);
    setInst(trailCore, i, p.x, 1.6, p.z, s, s, s); setInst(trailHalo, i, p.x, 1.6, p.z, s * clamp01(u), s * clamp01(u), s * clamp01(u));
    trailCore.setColorAt(i, c); trailHalo.setColorAt(i, c);
  });
  trailCore.instanceMatrix.needsUpdate = trailHalo.instanceMatrix.needsUpdate = true;
  if (trailCore.instanceColor) { trailCore.instanceColor.needsUpdate = true; trailHalo.instanceColor.needsUpdate = true; }
  // labels
  labels.forEach(l => {
    const a = smooth(seg(t, l.t0, l.t0 + 0.27)) * (1 - smooth(seg(t, l.t1 - 0.27, l.t1)));
    l.el.style.opacity = a;
    if (a > 0.001) {
      v3.copy(l.anchor); v3.y += island.position.y; v3.project(camera);
      let x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
      x = Math.min(Math.max(x, 260), 820); y = Math.min(Math.max(y, 330), 1380);
      l.el.style.left = x + 'px'; l.el.style.top = (y - 10 * (1 - a)) + 'px';
    }
  });
  chipAnim(chipL, t, 10.9, 17.9); chipAnim(chipR, t, 20.0, 26.3);
  // subtitles
  let idx = -1;
  for (let i = 0; i < flat.length; i++) if (t >= flat[i].show0 && t < flat[i].show1) { idx = i; break; }
  if (idx !== curChunk) {
    curChunk = idx;
    subEl.innerHTML = idx < 0 ? '' : flat[idx].words.map((w, k) => `<span class="w${w.key ? ' key' : ''}" data-k="${k}">${w.text}</span>`).join(' ');
  }
  if (idx >= 0) subEl.querySelectorAll('.w').forEach((s, k) => s.classList.toggle('on', t >= flat[idx].words[k].t0 - 0.03));
}

window.renderFrame = f => { update(f / FPS); renderer.render(scene, camera); };
window.__ready = (async () => {
  timing = await (await fetch('/build/timing.json')).json();
  timing.lines.forEach(l => l.chunks.forEach(c => flat.push(c)));
  // recompute show windows (python wrote show0/show1 on the in-memory copy only), so derive here too
  flat.sort((a, b) => a.t0 - b.t0);
  for (let k = 0; k < flat.length; k++) {
    const c = flat[k], nxt = k + 1 < flat.length ? flat[k + 1].t0 : DUR;
    c.show0 = c.t0 - 0.05; c.show1 = Math.min(c.t1 + 0.45, nxt - 0.02 > c.t1 ? nxt - 0.02 : c.t1 + 0.45);
  }
  await document.fonts.load('800 64px Poppins'); await document.fonts.load('600 29px Poppins'); await document.fonts.ready;
  return true;
})();
