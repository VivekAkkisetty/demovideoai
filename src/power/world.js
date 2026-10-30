import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp01, seg, smooth, lerp, hash, easeOutBack } from './lib.js';
import * as L from './layout.js';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const bas = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
function put(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; parent.add(m); return m;
}
function strut(a, b, r, seg = 5) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z); return g;
}
const V = L.V;

export function buildWorld(scene) {
  const W = { stage: {} };
  const root = new THREE.Group(); scene.add(root);

  // ================= terrain =================
  {
    const g = new THREE.PlaneGeometry(760, 760, 130, 130); g.rotateX(-Math.PI / 2); g.translate(40, 0, -150);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    const grass = new THREE.Color(0x86AE8E), hill = new THREE.Color(0x4F8570), dirt = new THREE.Color(0xD9C9A3), coal = new THREE.Color(0x3F3A37), conc = new THREE.Color(0xCFC8B8), gravel = new THREE.Color(0xA29D94), lawn = new THREE.Color(0x9CC49A);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = L.heightAt(x, z); p.setY(i, h);
      c.copy(grass).lerp(hill, clamp01(h / 38 + (hash(i) - 0.5) * 0.15));
      const rd = L.routeDist(x, z);
      c.lerp(dirt, smooth(clamp01(1 - rd / 9)) * 0.85);
      const dm = Math.hypot(x, z); c.lerp(coal, smooth(clamp01((26 - dm) / 14)));
      const dp = Math.hypot(x - 40, z + 118); c.lerp(conc, smooth(clamp01((46 - dp) / 10)));
      const ds = Math.hypot(x + 28, z + 235); c.lerp(gravel, smooth(clamp01((24 - ds) / 8)));
      const dv = Math.hypot(x + 8, z + 292); c.lerp(lawn, smooth(clamp01((30 - dv) / 12)) * 0.7);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })); m.receiveShadow = true; root.add(m);
  }
  // trees
  {
    const spots = [];
    for (let i = 0; i < 2600 && spots.length < 190; i++) {
      const x = -190 + hash(i * 1.7) * 440, z = -350 + hash(i * 2.3 + 4) * 420;
      if (L.flatMask(x, z) < 0.5 || L.routeDist(x, z) < 24) continue;
      if (Math.hypot(x - 40, z + 118) < 62) continue;
      spots.push([x, z, 1.4 + hash(i * 5.1) * 1.8]);
    }
    const trunk = new THREE.InstancedMesh(cyl(0.25, 0.35, 1.6, 5), std(0x6D5240), spots.length);
    const c1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 3.2, 6), std(0x2E7D74, { flatShading: true }), spots.length);
    const c2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 2.6, 6), std(0x3E9A85, { flatShading: true }), spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, z, s], i) => {
      const y = L.heightAt(x, z);
      m.makeScale(s, s, s).setPosition(x, y + 0.8 * s, z); trunk.setMatrixAt(i, m);
      m.makeScale(s, s, s).setPosition(x, y + 2.9 * s, z); c1.setMatrixAt(i, m);
      m.makeScale(s, s, s).setPosition(x, y + 4.6 * s, z); c2.setMatrixAt(i, m);
    });
    [trunk, c1, c2].forEach(o => { o.castShadow = true; root.add(o); });
  }

  // ================= coal mine =================
  const mine = new THREE.Group(); root.add(mine);
  {
    put(mine, new THREE.CylinderGeometry(10.5, 12.5, 0.6, 28), std(0x57514C), 0, 0.15, 0);
    put(mine, new THREE.CylinderGeometry(8.2, 8.2, 0.4, 28), bas(0x050607), 0, 0.5, 0, { cast: false });
    const rimM = std(0x6B625B);
    put(mine, new THREE.TorusGeometry(9.2, 0.9, 6, 28), rimM, 0, 0.55, 0, { rx: Math.PI / 2 });
    // headframe (A-frame tower + wheel)
    const hf = new THREE.Group(); hf.position.set(-12, 0, 3); mine.add(hf);
    const hfM = std(0x3E5662, { metalness: 0.3, roughness: 0.6 });
    const legs = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(strut(V(sx * 4.5, 0, sz * 3), V(sx * 0.8, 22, sz * 0.9), 0.35));
    for (const y of [5, 10, 15]) { const w = lerp(4.5, 0.8, y / 22), w2 = lerp(3, 0.9, y / 22); legs.push(strut(V(-w, y, -w2), V(w, y, -w2), 0.18), strut(V(-w, y, w2), V(w, y, w2), 0.18), strut(V(-w, y, -w2), V(w, y + 5, -w2), 0.15), strut(V(w, y, w2), V(-w, y + 5, w2), 0.15)); }
    put(hf, mergeGeometries(legs), hfM);
    W.sheave = new THREE.Group(); W.sheave.position.set(0, 22.5, 0); hf.add(W.sheave);
    put(W.sheave, new THREE.TorusGeometry(3, 0.35, 6, 24), std(0xE8B84A, { metalness: 0.4 }), 0, 0, 0, { ry: Math.PI / 2 });
    for (let i = 0; i < 6; i++) put(W.sheave, cyl(0.12, 0.12, 6, 5), std(0xE8B84A), 0, 0, 0, { rx: (i / 6) * Math.PI });
    put(hf, strut(V(0, 22.5, 0), V(14, 0.6, -3), 0.08, 4).clone(), bas(0x11161A), 0, 0, 0, { cast: false });
    // coal heaps
    const coalM = std(0x1C1E22, { roughness: 0.55, flatShading: true });
    for (let i = 0; i < 9; i++) put(mine, new THREE.IcosahedronGeometry(2.2 + hash(i) * 2, 0), coalM, 13 + Math.cos(i * 1.7) * 5, 1.3, 8 + Math.sin(i * 2.3) * 5, { ry: i });
    // conveyor + hopper
    const bA = V(3.5, 1.2, -0.5), bB = V(8, 7.3, -10), belt = put(mine, box(2.2, 0.5, bA.distanceTo(bB)), std(0x2C3A44), (bA.x + bB.x) / 2, (bA.y + bB.y) / 2, (bA.z + bB.z) / 2);
    belt.lookAt(bB);
    W.beltA = V(3.5, 1.2, -0.5); W.beltB = V(8, 7.3, -10);
    put(mine, new THREE.CylinderGeometry(3.2, 1.0, 3.5, 4), std(0x4A5A62), 8, 8.9, -11.2, { ry: Math.PI / 4 });
    for (const [lx, lz] of [[5.5, -13], [10.5, -13], [5.5, -9], [10.5, -9]]) put(mine, cyl(0.25, 0.25, 8, 6), std(0x6C7D86), lx, 4, lz);
    // chunks riding the belt
    W.chunks = new THREE.InstancedMesh(box(0.5, 0.5, 0.5), std(0x14161A, { roughness: 0.4 }), 40); W.chunks.castShadow = true; mine.add(W.chunks);
  }

  // ================= railway + train =================
  {
    const slp = Math.floor(L.RAIL_LEN / 1.7);
    const sl = new THREE.InstancedMesh(box(4.6, 0.2, 0.5), std(0x5B4636), slp), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = V(1, 1, 1);
    for (let i = 0; i < slp; i++) {
      const u = i / (slp - 1), p = L.RAIL.getPointAt(u), t = L.RAIL.getTangentAt(u);
      q.setFromEuler(new THREE.Euler(0, Math.atan2(t.x, t.z), 0)); m.compose(V(p.x, 0.1, p.z), q, s1); sl.setMatrixAt(i, m);
    }
    sl.receiveShadow = true; root.add(sl);
    for (const off of [-1.15, 1.15]) {
      const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60, p = L.RAIL.getPointAt(u), t = L.RAIL.getTangentAt(u); pts.push(V(p.x + t.z * off, 0.32, p.z - t.x * off)); }
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.13, 4), std(0xB9C2C7, { metalness: 0.6, roughness: 0.4 })));
    }
  }
  W.train = new THREE.Group(); root.add(W.train);
  W.wheels = [];
  {
    const teal = std(0x1F5D6B, { roughness: 0.6 }), ember = std(0xE5572A), dark = std(0x23272B), brass = std(0xE8B84A, { metalness: 0.5, roughness: 0.4 });
    const loco = new THREE.Group(); W.train.add(loco); W.loco = loco;
    put(loco, box(3.4, 0.7, 8), dark, 0, 1.1, 0);
    put(loco, new THREE.CylinderGeometry(1.45, 1.45, 5.2, 18), teal, 0, 2.6, 1.2, { rx: Math.PI / 2 });
    put(loco, box(3.2, 3.4, 2.6), teal, 0, 3.1, -2.6);
    put(loco, box(3.5, 0.3, 3.0), ember, 0, 4.9, -2.6);
    put(loco, cyl(0.45, 0.7, 1.7, 10), dark, 0, 4.7, 3.2);
    put(loco, new THREE.CylinderGeometry(0.8, 0.45, 0.5, 10), brass, 0, 5.7, 3.2);
    put(loco, new THREE.SphereGeometry(0.55, 10, 8), brass, 0, 4.3, 0.4);
    put(loco, box(3.45, 0.18, 8.1), ember, 0, 1.55, 0);
    W.headlamp = put(loco, new THREE.SphereGeometry(0.4, 10, 8), bas(0xFFE9B0), 0, 2.5, 4.2, { cast: false });
    for (const [wz, r] of [[-2.6, 0.85], [-0.4, 0.85], [1.8, 0.85], [3.5, 0.6]]) for (const sx of [-1, 1]) {
      const w = put(loco, cyl(r, r, 0.35, 14), dark, sx * 1.75, r, wz, { rz: Math.PI / 2 }); W.wheels.push(w);
    }
    W.wagons = [];
    for (let k = 0; k < 3; k++) {
      const wg = new THREE.Group(); W.train.add(wg); W.wagons.push(wg);
      put(wg, box(3.3, 0.5, 7.4), dark, 0, 0.95, 0);
      for (const sx of [-1, 1]) put(wg, box(0.25, 2.2, 7.4), std(0x2F4651), sx * 1.52, 2.1, 0);
      put(wg, box(3.3, 2.2, 0.25), std(0x2F4651), 0, 2.1, 3.57); put(wg, box(3.3, 2.2, 0.25), std(0x2F4651), 0, 2.1, -3.57);
      wg.userData.heap = put(wg, new THREE.IcosahedronGeometry(1.9, 0), std(0x15171B, { roughness: 0.5, flatShading: true }), 0, 2.3, 0);
      wg.userData.heap.scale.set(1.2, 0.7, 2.0);
      for (const wz of [-2.4, 2.4]) for (const sx of [-1, 1]) W.wheels.push(put(wg, cyl(0.7, 0.7, 0.3, 12), dark, sx * 1.7, 0.7, wz, { rz: Math.PI / 2 }));
    }
  }

  // ================= power plant =================
  const plant = new THREE.Group(); root.add(plant);
  const concrete = std(0xD3CCBD), roofM = std(0x4D6571, { metalness: 0.2 });
  {
    // boiler house (open front toward +z)
    const b = new THREE.Group(); b.position.copy(L.BOILER); plant.add(b);
    put(b, box(18.6, 0.4, 14.6), std(0x6B7279), 0, 0.2, 0);
    put(b, box(18, 18, 0.5), concrete, 0, 9, -7);
    put(b, box(0.5, 18, 14), concrete, -9, 9, 0); put(b, box(0.5, 18, 14), concrete, 9, 9, 0);
    put(b, box(19, 0.6, 15), roofM, 0, 18.3, 0);
    for (const sx of [-9, 9]) put(b, box(0.8, 18, 0.8), std(0x6D7F88, { metalness: 0.3 }), sx, 9, 7);
    put(b, box(19, 0.8, 0.8), std(0x6D7F88), 0, 17.8, 7);
    // furnace
    put(b, box(9, 8, 7), std(0x2B3138, { roughness: 0.7 }), 0, 4.4, -2.5);
    W.furnaceGlow = put(b, box(6.6, 2.8, 0.2), bas(0xFF7A2F), 0, 3.6, 1.05, { cast: false });
    put(b, box(7.4, 3.6, 0.3), std(0x161A1F), 0, 3.6, 0.95);
    W.fireLight = new THREE.PointLight(0xFF7A2F, 0, 26, 2); W.fireLight.position.set(0, 3.6, 3); b.add(W.fireLight);
    // boiler drum + tubes
    put(b, cyl(2, 2, 11, 18), std(0x7E8C94, { metalness: 0.5, roughness: 0.45 }), 0, 14, -3, { rz: Math.PI / 2 });
    for (const x of [-3.5, -1.2, 1.2, 3.5]) put(b, cyl(0.42, 0.42, 6.4, 8), std(0xB87E4C, { metalness: 0.5 }), x, 11, -3);
    W.boilerWorld = b.position;
    // steam pipe drum -> turbine inlet
    const pm = std(0xC9D1D6, { metalness: 0.5, roughness: 0.35 });
    const pts = [V(29.5, 14, -113), V(36, 14, -113), V(41.5, 14, -113), V(41.5, 6, -113), V(41.5, 5, -108)];
    for (let i = 0; i < pts.length - 1; i++) put(plant, strut(pts[i], pts[i + 1], 0.55, 8), pm, 0, 0, 0);
    for (const p of pts) put(plant, new THREE.SphereGeometry(0.7, 10, 8), pm, p.x, p.y, p.z);
    // turbine hall
    const t = new THREE.Group(); t.position.copy(L.TURBINE_HALL); plant.add(t);
    put(t, box(26, 0.4, 14.6), std(0x6B7279), 0, 0.2, 0);
    put(t, box(26, 11, 0.5), concrete, 0, 5.5, -7);
    put(t, box(0.5, 11, 14), concrete, -13, 5.5, 0); put(t, box(0.5, 11, 14), concrete, 13, 5.5, 0);
    put(t, box(27, 0.6, 15), roofM, 0, 11.3, 0);
    for (const sx of [-13, 13]) put(t, box(0.8, 11, 0.8), std(0x6D7F88), sx, 5.5, 7);
    put(t, box(15, 1.2, 4.5), std(0x3A444B), 1, 0.9, -1);
    W.rotor = new THREE.Group(); W.rotor.position.set(-8, 4.5, -1); t.add(W.rotor);
    put(W.rotor, cyl(2.9, 2.9, 0.5, 20), std(0xAEBAC1, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; put(W.rotor, box(0.25, 1.7, 0.9), std(0xE8B84A, { metalness: 0.6, roughness: 0.3 }), 0, Math.sin(a) * 3.3, Math.cos(a) * 3.3, { rx: -a }); }
    put(t, cyl(2.4, 2.4, 8.5, 20), std(0x5D7480, { metalness: 0.5, roughness: 0.45 }), -3.2, 4.5, -1, { rz: Math.PI / 2 });
    put(t, cyl(2.7, 2.7, 6.8, 22), std(0x2F6F93, { metalness: 0.4, roughness: 0.5 }), 5.2, 4.5, -1, { rz: Math.PI / 2 });
    W.genBands = [];
    for (const x of [3, 5.2, 7.4]) { const m = bas(0x2A1608); W.genBands.push(m); put(t, cyl(2.78, 2.78, 0.45, 22), m, x, 4.5, -1, { rz: Math.PI / 2, cast: false }); }
    W.turbLight = new THREE.PointLight(0x9FE6FF, 0, 24, 2); W.turbLight.position.set(5, 6, 3); t.add(W.turbLight);
    // step-up transformer yard
    const s = new THREE.Group(); s.position.copy(L.STEPUP); plant.add(s);
    put(s, box(9, 0.3, 8), std(0x9A958C), 0, 0.15, 0);
    put(s, box(7, 6.5, 5), std(0x35505C, { metalness: 0.3 }), 0, 3.5, 0);
    for (let i = -3; i <= 3; i++) put(s, box(0.25, 5, 1.2), std(0x2A3D47), i * 0.95, 3.2, 3.1);
    for (const x of [-2, 0, 2]) { put(s, cyl(0.35, 0.5, 3, 10), std(0xE5DCCD, { roughness: 0.4 }), x, 8, 0); for (let r = 0; r < 4; r++) put(s, cyl(0.7, 0.7, 0.14, 12), std(0xE5DCCD), x, 7 + r * 0.7, 0); }
    W.stepupGlow = new THREE.PointLight(0x9FE6FF, 0, 26, 2); W.stepupGlow.position.set(0, 10, 2);
    // cooling towers
    const prof = [[9, 0], [8, 5], [6.8, 12], [6.4, 18], [7.2, 25], [7.7, 28]].map(([r, y]) => new THREE.Vector2(r, y));
    for (const [x, z] of [[20, -140], [42, -143]]) { const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), std(0xE9E0CF, { side: THREE.DoubleSide, roughness: 0.9 })); m.position.set(x, 0, z); m.castShadow = true; plant.add(m); }
    // chimney with red/white bands
    for (let i = 0; i < 6; i++) put(plant, cyl(2.4 - i * 0.18 - 0.0, 2.6 - i * 0.18 + 0.2, 7.5, 14), std(i % 2 ? 0xF4EEE3 : 0xD6452E), 4, 3.75 + i * 7.5, -124);
    // yard crane + coal pile + conveyor frame
    put(plant, new THREE.CylinderGeometry(4, 6, 3.2, 8), std(0x1B1D20, { flatShading: true }), 36, 1.6, -92);
  }

  // ================= pylons + wires =================
  {
    const parts = [], wBase = 3.6, wTop = 0.9, H = 22, levels = [0, 6, 12, 18, 22];
    const wAt = y => lerp(wBase, wTop, y / H);
    const corner = (sx, sz, y) => V(sx * wAt(y), y, sz * wAt(y));
    for (let li = 0; li < levels.length - 1; li++) {
      const y0 = levels[li], y1 = levels[li + 1];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(strut(corner(sx, sz, y0), corner(sx, sz, y1), 0.26));
      const sides = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
      for (const [[ax, az], [bx, bz]] of sides) {
        parts.push(strut(corner(ax, az, y0), corner(bx, bz, y1), 0.12, 4), strut(corner(bx, bz, y0), corner(ax, az, y1), 0.12, 4), strut(corner(ax, az, y1), corner(bx, bz, y1), 0.14, 4));
      }
    }
    parts.push(strut(V(0, 22, 0), V(0, 31, 0), 0.22));
    parts.push(strut(V(-8.4, 19, 0), V(8.4, 19, 0), 0.26), strut(V(-8.4, 19, 0), V(-1, 22, 0), 0.14, 4), strut(V(8.4, 19, 0), V(1, 22, 0), 0.14, 4));
    parts.push(strut(V(-1, 19, 0), V(-6, 22, 0), 0.1, 4), strut(V(1, 19, 0), V(6, 22, 0), 0.1, 4));
    for (const x of [-8, 8]) parts.push(strut(V(x, 19, 0), V(x, 16.8, 0), 0.22, 6));
    parts.push(strut(V(0, 30.4, 0), V(0, 30, 0), 0.22, 6));
    const geo = mergeGeometries(parts);
    const inst = new THREE.InstancedMesh(geo, std(0xA9BCC6, { metalness: 0.35, roughness: 0.5 }), L.PYL.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    L.PYL.forEach(([x, z], i) => { q.setFromEuler(new THREE.Euler(0, L.PYL_DIR[i], 0)); m.compose(V(x, 0, z), q, V(1, 1, 1)); inst.setMatrixAt(i, m); });
    inst.castShadow = true; root.add(inst);
    W.pylonBeacons = L.PYL.map(([x, z]) => { const mm = bas(0x6FE8FF); const s = put(root, new THREE.SphereGeometry(0.7, 10, 8), mm, x, 32.2, z, { cast: false }); return { m: mm, s }; });
    W.wireMat = bas(0x1B2A32);
    for (const c of L.wireCurves) root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.13, 4), W.wireMat));
    W.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), bas(0xFFFFFF), 3 * 9);
    W.pulses.material.color.setRGB(0.6, 1.8, 2.2); W.pulses.frustumCulled = false; root.add(W.pulses);
  }

  // ================= substation =================
  {
    const s = new THREE.Group(); s.position.copy(L.SUBSTATION); root.add(s);
    put(s, box(46, 0.4, 34), std(0xA7A298), 0, 0.2, 0);
    const posts = new THREE.InstancedMesh(cyl(0.16, 0.16, 2.6, 5), std(0x5C6A72), 100), m = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 24; i++) { m.setPosition(-23 + i * 2, 1.7, 17); posts.setMatrixAt(n++, m); m.setPosition(-23 + i * 2, 1.7, -17); posts.setMatrixAt(n++, m); }
    for (let i = 1; i < 17; i++) { m.setPosition(-23, 1.7, -17 + i * 2); posts.setMatrixAt(n++, m); m.setPosition(23, 1.7, -17 + i * 2); posts.setMatrixAt(n++, m); }
    posts.count = n; root.add(posts); posts.position.copy(L.SUBSTATION);
    put(s, box(46, 0.12, 0.12), std(0x5C6A72), 0, 2.8, 17); put(s, box(46, 0.12, 0.12), std(0x5C6A72), 0, 2.8, -17);
    for (const x of [-10, 8]) {
      const tr = new THREE.Group(); tr.position.set(x, 0, 3); s.add(tr);
      put(tr, box(8, 6.5, 5.5), std(0x3B6A78, { metalness: 0.3 }), 0, 3.7, 0);
      for (let i = -3; i <= 3; i++) put(tr, box(0.25, 5, 1.8), std(0x2C4F5B), i * 1.0, 3.4, 3.5);
      put(tr, cyl(1.1, 1.1, 5, 14), std(0x4A7E8D), 0, 8.1, -1.3, { rz: Math.PI / 2 });
      for (const bx of [-2.4, 0, 2.4]) { put(tr, cyl(0.38, 0.55, 3.4, 10), std(0xE9E0D2, { roughness: 0.35 }), bx, 8.6, 1.2); for (let r = 0; r < 5; r++) put(tr, cyl(0.78, 0.78, 0.13, 12), std(0xE9E0D2), bx, 7.4 + r * 0.6, 1.2); }
    }
    // gantry matches L.GANTRY (world -33..-23 at z -224 => local z +11)
    for (const gx of [-5.3, 4.7]) put(s, strut(V(gx - 0.8, 0, 11.6), V(gx, 15, 11), 0.3), std(0x7C919C, { metalness: 0.3 }), 0, 0, 0), put(s, strut(V(gx + 0.8, 0, 10.4), V(gx, 15, 11), 0.3), std(0x7C919C, { metalness: 0.3 }), 0, 0, 0);
    put(s, box(12, 0.5, 0.5), std(0x7C919C), -0.3, 15, 11);
    for (const gx of [-5, -0.3, 4.7]) put(s, cyl(0.2, 0.2, 2, 6), std(0xE5DCCD), gx, 14, 11);
    put(s, box(7, 3.6, 5), std(0xCFC8B8), 15, 1.9, -8);
    W.subLight = new THREE.PointLight(0x9FE6FF, 0, 34, 2); W.subLight.position.set(-10, 13, 4);
    W.arcGeo = new THREE.BufferGeometry(); W.arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(26 * 3), 3));
    W.arc = new THREE.Line(W.arcGeo, new THREE.LineBasicMaterial({ color: 0xBFF3FF, transparent: true, blending: THREE.AdditiveBlending })); W.arc.frustumCulled = false; root.add(W.arc);
    W.arcA = V(-12.4 + L.SUBSTATION.x, 10.2, 4.2 + L.SUBSTATION.z); W.arcB = V(-5 + L.SUBSTATION.x, 14.8, 11 + L.SUBSTATION.z);
  }

  // ================= distribution + village =================
  W.windowMat = bas(0x182028); W.lampMat = bas(0x182028);
  {
    const poles = [[-28, -244], ...L.DIST_POLES];
    const woodM = std(0x7C5A3C);
    poles.forEach(([x, z]) => { put(root, cyl(0.32, 0.4, L.POLE_H, 7), woodM, x, L.POLE_H / 2, z); put(root, box(4.4, 0.3, 0.3), woodM, x, L.POLE_H - 0.9, z); });
    const mk = k => { const pts = []; poles.forEach(([x, z], i) => { const p = V(x + (k - 1) * 1.7, L.POLE_H - 0.8, z); if (i) { const q = pts[pts.length - 1].clone().lerp(p, 0.5); q.y -= 0.7; pts.push(q); } pts.push(p); }); return new THREE.CatmullRomCurve3(pts); };
    W.distWireMat = bas(0x1B2A32);
    for (let k = 0; k < 3; k++) root.add(new THREE.Mesh(new THREE.TubeGeometry(mk(k), 80, 0.09, 4), W.distWireMat));
    const [tx, tz] = L.DIST_POLES[3];
    put(root, cyl(0.9, 0.9, 1.9, 14), std(0x8B979E, { metalness: 0.4 }), tx + 1.2, L.POLE_H - 2.6, tz);
    W.ptLight = new THREE.PointLight(0xFFD58A, 0, 18, 2); W.ptLight.position.set(tx + 1.2, L.POLE_H - 1, tz + 1);
    const svc = new THREE.CatmullRomCurve3([V(tx, L.POLE_H - 1.6, tz), V(tx + 3, L.POLE_H - 3, tz - 6), V(L.HOUSE.x + 3, 6.9, L.HOUSE.z + 5.5)]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(svc, 24, 0.08, 4), W.distWireMat));
    // street lamps + extra houses
    const lampH = L.HOUSE.clone();
    const lamps = [[-18, -270], [-10, -268], [-2, -286], [-14, -300]];
    lamps.forEach(([x, z]) => { put(root, cyl(0.12, 0.16, 5.4, 6), std(0x4A5A62), x, 2.7, z); put(root, new THREE.SphereGeometry(0.42, 8, 6), W.lampMat, x, 5.6, z, { cast: false }); });
    const houses = [[-22, -296, 0.2], [10, -294, -0.15], [-24, -312, 0], [12, -312, 0.1], [-6, -318, 0], [24, -302, 0.3]];
    const wallC = [0xE8D9BF, 0xD7E3DD, 0xF0DCC2, 0xD9D2E8, 0xE8D9BF, 0xDCE6D0];
    houses.forEach(([x, z, ry], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
      put(g, box(7, 4, 6), std(wallC[i]), 0, 2, 0);
      put(g, new THREE.CylinderGeometry(0.01, 4.8, 2.6, 4), std(0x3F7482), 0, 5.3, 0, { ry: Math.PI / 4 });
      put(g, box(1.6, 1.6, 0.12), W.windowMat, -1.8, 2.2, 3.05, { cast: false }); put(g, box(1.6, 1.6, 0.12), W.windowMat, 1.8, 2.2, 3.05, { cast: false });
    });
    // the hero house: open front so the camera sees inside
    const h = new THREE.Group(); h.position.copy(L.HOUSE); root.add(h);
    const wall = std(0xF0E4CB), floor = std(0xC8A97E), trim = std(0x3F7482);
    put(h, box(12, 0.4, 9), floor, 0, 0.2, 0);
    put(h, box(12, 6.6, 0.4), wall, 0, 3.5, -4.3);
    put(h, box(0.4, 6.6, 9), wall, -5.8, 3.5, 0); put(h, box(0.4, 6.6, 9), wall, 5.8, 3.5, 0);
    for (const sx of [-1, 1]) put(h, box(0.5, 0.9, 6), W.windowMat, sx * 5.62, 3.6, 0.6, { cast: false });
    const gable = [];
    for (const sx of [-1, 1]) put(h, box(7.6, 0.4, 9.8), trim, sx * 3.35, 8.2, 0, { rz: -sx * 0.45 });
    // switch plate + rocker (on the back wall, left)
    put(h, box(1.0, 1.5, 0.14), std(0xFFFFFF, { roughness: 0.4 }), -3.4, 2.3, -4.05);
    W.rocker = put(h, box(0.46, 0.7, 0.18), std(0xD0D6DB, { roughness: 0.35 }), -3.4, 2.3, -3.95, { cast: false });
    // picture frame, table + stools
    put(h, box(2.2, 1.6, 0.1), std(0xE8B84A), 2.6, 3.8, -4.05); put(h, box(1.9, 1.3, 0.1), std(0x5FA7A0), 2.6, 3.8, -4.0);
    put(h, box(3.6, 0.2, 1.8), std(0x9C6B3F), 2.2, 1.7, -2.2); for (const [lx, lz] of [[0.6, -2.9], [3.8, -2.9], [0.6, -1.5], [3.8, -1.5]]) put(h, box(0.2, 1.5, 0.2), std(0x7C5A3C), lx, 0.9, lz);
    for (const sx of [1.0, 3.4]) { put(h, cyl(0.55, 0.55, 0.2, 10), std(0xE5572A), sx, 1.1, -0.2); for (const dx of [-0.3, 0.3]) put(h, cyl(0.06, 0.06, 0.9, 5), std(0x7C5A3C), sx + dx, 0.65, -0.2 + dx); }
    // pendant bulb
    put(h, cyl(0.03, 0.03, 1.9, 4), std(0x222222), 0, 6.4, -1, { cast: false });
    W.bulbMat = bas(0xFFE2A0); W.bulb = put(h, new THREE.SphereGeometry(0.5, 16, 12), W.bulbMat, 0, 5.3, -1, { cast: false });
    put(h, new THREE.CylinderGeometry(0.2, 0.32, 0.5, 10), std(0x222222), 0, 5.8, -1, { cast: false });
    W.bulbHalo = put(h, new THREE.SphereGeometry(1.6, 14, 10), new THREE.MeshBasicMaterial({ color: 0xFFC46B, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 5.3, -1, { cast: false });
    W.bulbLight = new THREE.PointLight(0xFFD58A, 0, 26, 1.6); W.bulbLight.position.set(0, 5.1, -0.4); h.add(W.bulbLight);
    W.bulbPos = V(L.HOUSE.x, 5.3, L.HOUSE.z - 1);
  }

  // ================= beacons (outro "chain lit" beams) =================
  {
    const stations = [L.MINE.clone().setY(2), V(34, 2, -100), V(62, 2, -108), ...L.PYL.map(p => V(p[0], 2, p[1])), V(-28, 2, -235), V(-8, 2, -285), V(-6, 2, -298)];
    W.beaconIdx = stations.length;
    const mkMat = () => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uC: { value: new THREE.Color(0.5, 1.5, 2) }, uA: { value: 0 } },
      vertexShader: 'varying float vY; void main(){ vY=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 uC; uniform float uA; varying float vY; void main(){ float a=pow(vY,1.6)*uA; gl_FragColor=vec4(uC*a, a*0.9);} '
    });
    W.beacons = stations.map((p, i) => {
      const m = mkMat(); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.8, 70, 14, 1, true), m); mesh.position.set(p.x, 35, p.z); mesh.renderOrder = 5; root.add(mesh);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), bas(0xFFFFFF)); cap.position.set(p.x, 3, p.z); cap.material.color.setRGB(0.6, 1.8, 2.2); root.add(cap);
      return { m, mesh, cap, i };
    });
  }

  // ================= lights =================
  W.sun = new THREE.DirectionalLight(0xFFC38F, 2.6); W.sun.castShadow = true;
  W.sun.shadow.mapSize.set(2048, 2048); W.sun.shadow.bias = -0.0004; W.sun.shadow.normalBias = 0.6;
  const sc = W.sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 400;
  scene.add(W.sun, W.sun.target);
  W.hemi = new THREE.HemisphereLight(0x9BD4DA, 0x2D3E45, 0.85); scene.add(W.hemi);
  W.fill = new THREE.DirectionalLight(0x4FA3C7, 0.55); W.fill.position.set(80, 40, -60); scene.add(W.fill);

  // ================= per-frame =================
  const m4 = new THREE.Matrix4(), s1 = V(1, 1, 1), q0 = new THREE.Quaternion(), tmp = V(0, 0, 0);
  const mixc = (a, b, u) => new THREE.Color().copy(a).lerp(b, u);
  const OFF = new THREE.Color(0x182028), WIN_ON = new THREE.Color(1.0, 0.78, 0.38);
  W.update = function (t, focus) {
    // daylight: dark interior hook, back to dusk after the whip
    const amb = lerp(0.42, 1, smooth(seg(t, 3.3, 4.4)));
    W.hemi.intensity = 0.85 * amb; W.sun.intensity = 2.6 * amb; W.fill.intensity = 0.55 * amb;
    W.sun.position.set(focus.x - 60, focus.y + 70, focus.z + 55); W.sun.target.position.copy(focus);
    // train
    const sl = L.sLoco(t);
    const place = (g, s) => { const p = L.railPoint(s), tg = L.railTangent(s); g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(tg.x, tg.z); };
    place(W.loco, sl); W.wagons.forEach((w, k) => place(w, sl - 9 * (k + 1)));
    W.wheels.forEach(w => { w.rotation.x = sl * 1.1; });
    W.wagons.forEach((w, k) => { const fill = k === 1 ? smooth(seg(t, 5.2, 8.4)) : (k === 2 ? smooth(seg(t, 4.8, 7.6)) : smooth(seg(t, 5.6, 8.6))); w.userData.heap.scale.set(1.2, 0.2 + 0.8 * fill, 2.0); });
    W.headlamp.material.color.setRGB(1.6, 1.4, 0.9);
    // mine
    W.sheave.rotation.x = t * 1.6;
    { // chunks riding the belt (4.9-8.8)
      const act = t > 4.9 && t < 8.9;
      for (let i = 0; i < 40; i++) {
        const u = (t * 0.22 + i / 40) % 1;
        tmp.copy(W.beltA).lerp(W.beltB, u); tmp.y += 0.9; tmp.x += (hash(i) - 0.5) * 0.6;
        const s = act ? 1 : 0; m4.compose(tmp, q0, V(s, s, s)); W.chunks.setMatrixAt(i, m4);
      }
      W.chunks.instanceMatrix.needsUpdate = true;
    }
    // furnace + fire
    const fire = smooth(seg(t, 13.1, 13.7)) * (1 - 0.0);
    W.furnaceGlow.material.color.setRGB(1.0 + 0.9 * fire, 0.28 + 0.35 * fire, 0.06).multiplyScalar(0.6 + 1.8 * fire);
    W.fireLight.intensity = fire * (60 + 20 * Math.sin(t * 31) + 14 * Math.sin(t * 17));
    // turbine / generator
    W.rotor.rotation.x = L.turbineAngle(t);
    const tw = L.turbineW(t) / 26;
    W.genBands.forEach((m, i) => m.color.setRGB(0.2 + tw * 2.0, 0.1 + tw * 1.5, 0.05 + tw * 0.9).multiplyScalar(0.6 + tw * 1.6));
    W.turbLight.intensity = tw * 28; W.stepupGlow.intensity = smooth(seg(t, 20.3, 21.4)) * (1 - smooth(seg(t, 21.6, 22.6))) * 220 + 20 * tw;
    // grid energy
    const grid = smooth(seg(t, 21.6, 23.2));
    let en = grid; if (t > 36.85 && t < L.RESTORE_T + 0.2) en = grid * (t < L.CUT_T ? 0.6 : 0.12) + (t >= L.RESTORE_T ? smooth(seg(t, L.RESTORE_T, L.RESTORE_T + 0.8)) * 0.9 : 0);
    W.wireMat.color.copy(mixc(new THREE.Color(0x1B2A32), new THREE.Color(0.35, 1.2, 1.5), en));
    { let n = 0;
      for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) {
        const u = ((t * (0.045 + 0.003 * k) + i / 9) % 1), p = L.wireCurves[k].getPointAt(u);
        const s = en > 0.25 ? 1 : 0; m4.compose(p, q0, V(s, s, s)); W.pulses.setMatrixAt(n++, m4);
      }
      W.pulses.instanceMatrix.needsUpdate = true;
    }
    W.pylonBeacons.forEach((b, i) => {
      let c = new THREE.Color(0.2, 0.9, 1.2).multiplyScalar(0.3 + grid * 1.4);
      if (i === L.WEAK && t > 36.8 && t < 39.5) c = new THREE.Color(2.2, 0.15, 0.1).multiplyScalar(0.6 + 0.6 * Math.sin(t * 40));
      if (i > L.WEAK && t > L.CUT_T && t < 39.9) c = new THREE.Color(0.2, 0.05, 0.05);
      b.m.color.copy(c);
    });
    // substation arc
    { const a1 = t > 26.9 && t < 28.9 && (Math.sin(t * 47) > 0.2 || (t > 27.15 && t < 27.55));
      W.arc.visible = a1; const pos = W.arcGeo.attributes.position;
      for (let i = 0; i < 26; i++) { const u = i / 25; const j = (i === 0 || i === 25) ? 0 : 1.1; pos.setXYZ(i, lerp(W.arcA.x, W.arcB.x, u) + (hash(i + Math.floor(t * 30)) - 0.5) * j, lerp(W.arcA.y, W.arcB.y, u) + (hash(i * 3 + Math.floor(t * 30)) - 0.5) * j, lerp(W.arcA.z, W.arcB.z, u) + (hash(i * 7 + Math.floor(t * 30)) - 0.5) * j); }
      pos.needsUpdate = true;
      W.subLight.intensity = 0;
    }
    // village power
    const vl = L.villageLit(t);
    W.windowMat.color.copy(mixc(OFF, WIN_ON, vl)); W.lampMat.color.copy(mixc(OFF, new THREE.Color(1.6, 1.2, 0.6), vl));
    W.distWireMat.color.copy(mixc(new THREE.Color(0x1B2A32), new THREE.Color(0.9, 0.7, 0.35), vl * 0.8));
    W.ptLight.intensity = 0;
    const bi = L.bulbIntensity(t), flick = (t > 36.85 && t < L.CUT_T) ? 0.5 + 0.5 * Math.sin(t * 90) : 1;
    W.bulbMat.color.setRGB(1.0 + 0.7 * bi * flick, 0.82 + 0.4 * bi * flick, 0.5 + 0.15 * bi * flick).multiplyScalar((0.18 + 0.82 * bi) * (t < 4.2 ? 1 : 0.7));
    W.bulbHalo.material.opacity = (t < 4.2 ? 0.14 : 0.07) * bi * flick; W.bulbLight.intensity = (t < 4.2 ? 26 : 14) * bi * flick;
    W.rocker.rotation.x = L.switchAngle(t);
    // beacons
    const lit = smooth(seg(t, 35.8, 36.6)), WB = 3 + L.WEAK;
    W.beacons.forEach(b => {
      let on = lit, red = 0;
      if (t > 36.8) {
        if (b.i === WB) { on = lit * (t < 39.5 ? 0.55 + 0.45 * Math.sin(t * 40) : 1); }
        if (b.i > WB) { const rt = 39.6 + (b.i - WB - 1) * 0.1; on = lit * (t < L.CUT_T ? 1 : smooth(seg(t, rt, rt + 0.3))); }
      }
      const rr = (b.i === WB && t > 36.8 && t < 39.5) ? 1 : 0;
      b.m.uniforms.uA.value = on * 0.55; b.m.uniforms.uC.value.setRGB(rr ? 2.4 : 0.35, rr ? 0.2 : 1.4, rr ? 0.1 : 1.9);
      b.cap.material.color.setRGB(rr ? 2.6 : 0.6, rr ? 0.2 : 1.8, rr ? 0.1 : 2.2).multiplyScalar(on > 0.01 ? 1 : 0.05);
      b.mesh.visible = on > 0.01; b.cap.visible = on > 0.01;
    });
  };
  return W;
}
