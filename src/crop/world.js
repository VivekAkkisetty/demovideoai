import * as THREE from 'three';
import { clamp01, seg, smooth, lerp, hash, easeOutBack } from './lib.js';
import * as L from './layout.js';
import { makeHuman, applyPose } from './human.js';

const V = L.V;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0, ...o });
const bas = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const addM = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function put(p, g, m, x = 0, y = 0, z = 0, o = {}) { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0); mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.recv !== false; p.add(mesh); return mesh; }
const CYAN = new THREE.Color(0.25, 0.9, 1.0);

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function buildWorld(scene) {
  const W = { anchors: {} };
  const root = new THREE.Group(); scene.add(root);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = V(1, 1, 1), tmp = V(0, 0, 0), tc = new THREE.Color();

  // ===== terrain =====
  {
    const g = new THREE.PlaneGeometry(1000, 1000, 130, 130); g.rotateX(-Math.PI / 2); g.translate(-30, 0, -170);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), grass = new THREE.Color(0x9ED36F), hill = new THREE.Color(0x6FAF5A), soil = new THREE.Color(0x9A6B3E), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = L.heightAt(x, z); p.setY(i, h);
      c.copy(grass).lerp(hill, clamp01(h / 40 + (hash(i) - 0.5) * 0.2));
      const inField = Math.max(-172 - x, 0, x - 150) === 0 && Math.max(-430 - z, 0, z - 90) === 0;
      if (inField) c.copy(soil).lerp(grass, 0.15 * hash(i * 3));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })); m.receiveShadow = true; root.add(m);
  }

  // ===== patchwork of plots =====
  const plots = L.plots, N = plots.length;
  W.tiles = new THREE.InstancedMesh(box(L.PLOT_W, 0.5, L.PLOT_D), std(0xffffff), N); W.tiles.receiveShadow = true; W.tiles.castShadow = false;
  const RPP = 9, others = plots.filter(p => !p.hero);
  W.rows = new THREE.InstancedMesh(box(L.PLOT_W - 3, 0.4, 0.55), std(0xffffff), others.length * RPP); W.rows.castShadow = false;
  let ri = 0;
  plots.forEach((p, k) => {
    const cr = L.CROPS[p.crop], jit = 0.88 + 0.24 * hash(k * 1.7);
    tc.set(cr.tile).multiplyScalar(jit); W.tiles.setColorAt(k, tc);
    m4.makeTranslation(p.x, 0.25, p.z); W.tiles.setMatrixAt(k, m4);
    if (p.hero) return;
    for (let r = 0; r < RPP; r++) {
      const z = p.z - L.PLOT_D / 2 + 1.6 + r * 2.15, hgt = p.crop === 5 ? 0.4 : p.crop === 3 || p.crop === 6 ? 0.8 : 0.6;
      m4.compose(V(p.x, 0.5 + hgt * 0.5 * 0.4, z), q.identity(), V(1, hgt / 0.4 * 0.6, 1)); W.rows.setMatrixAt(ri, m4);
      tc.set(cr.row).multiplyScalar(0.85 + 0.3 * hash(ri * 0.37)); W.rows.setColorAt(ri, tc); ri++;
    }
  });
  root.add(W.tiles, W.rows);
  // survey glow overlay (cyan wash that sweeps across the plots)
  W.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(L.PLOT_W, L.PLOT_D), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }), N);
  plots.forEach((p, k) => { q.setFromEuler(e.set(-Math.PI / 2, 0, 0)); m4.compose(V(p.x, 1.9, p.z), q, s1); W.glow.setMatrixAt(k, m4); W.glow.setColorAt(k, tc.setRGB(0, 0, 0)); });
  W.glow.frustumCulled = false; root.add(W.glow);
  // glowing plot borders (a thin frame per surveyed plot)
  W.frames = new THREE.InstancedMesh(box(L.PLOT_W + 0.4, 0.15, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }), N * 2);
  plots.forEach((p, k) => { for (let s = 0; s < 2; s++) { m4.makeTranslation(p.x, 2.0, p.z + (s ? 1 : -1) * L.PLOT_D / 2); W.frames.setMatrixAt(k * 2 + s, m4); W.frames.setColorAt(k * 2 + s, tc.setRGB(0, 0, 0)); } });
  W.frames.frustumCulled = false; root.add(W.frames);

  // ===== hero paddy plot: flooded, with real plants =====
  {
    put(root, box(L.PLOT_W - 0.6, 0.08, L.PLOT_D - 0.6), new THREE.MeshStandardMaterial({ color: 0x4F9FB8, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.5 }), 0, 0.53, 0, { cast: false });
    const COLS = 15, RW = 11, n = COLS * RW * 3;
    W.paddy = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 1.0, 4), std(0x86D653, { flatShading: true }), n); W.paddy.castShadow = true;
    W.paddyBase = [];
    for (let r = 0; r < RW; r++) for (let c = 0; c < COLS; c++) for (let k = 0; k < 3; k++) {
      const x = -10.6 + c * 1.5 + (hash(r * 31 + c) - 0.5) * 0.5, z = -8.6 + r * 1.7 + (hash(c * 17 + r) - 0.5) * 0.5;
      W.paddyBase.push([x + (k - 1) * 0.16, z + (hash(k * 5 + c + r) - 0.5) * 0.15, (hash(k + r * 3 + c) - 0.5) * 0.5, 0.8 + 0.4 * hash(c * 3 + r * 7 + k)]);
    }
    root.add(W.paddy);
    // bund, hut and well
    for (const [x, z, w, d] of [[0, -10.3, 24, 0.5], [0, 10.3, 24, 0.5], [-12.3, 0, 0.5, 21], [12.3, 0, 0.5, 21]]) put(root, box(w, 0.8, d), std(0x9A7448), x, 0.4, z, { recv: true });
    const hut = new THREE.Group(); hut.position.set(-19, 0, -13); root.add(hut);
    put(hut, box(5, 3, 4), std(0xE8D6B4), 0, 1.5, 0); put(hut, new THREE.ConeGeometry(4.2, 2.6, 4), std(0xC9A04F), 0, 4.2, 0, { ry: Math.PI / 4 }); put(hut, box(1.1, 1.8, 0.1), std(0x6B4A2B), 0, 0.9, 2.05);
    put(root, new THREE.CylinderGeometry(1.2, 1.3, 1.1, 12), std(0xC9C2B5), -15, 0.55, 12);
  }

  // ===== palms + clouds =====
  {
    const spots = []; for (let i = 0; i < 60 && spots.length < 34; i++) { const a = hash(i * 2.1) * 6.283, r = 140 + hash(i * 3.3) * 170; const x = Math.cos(a) * r * 1.2 - 10, z = Math.sin(a) * r * 1.6 - 150; if (Math.max(-172 - x, 0, x - 150) === 0 && Math.max(-430 - z, 0, z - 90) === 0) continue; if (Math.hypot(x - L.BANK.x, z - L.BANK.z) < 40) continue; spots.push([x, z]); }
    for (const [x, z] of [[-18, 14], [20, -16], [-24, -4], [26, 6], [-30, 20], [32, -18]]) spots.push([x, z]);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 12, 6), std(0x8B6B49), spots.length), leaf = new THREE.InstancedMesh(box(0.8, 0.12, 6.5), std(0x3E9B4A, { flatShading: true }), spots.length * 7);
    spots.forEach(([x, z], i) => {
      const y = L.heightAt(x, z), s = 0.9 + hash(i * 5.5) * 0.5;
      m4.compose(V(x, y + 6 * s, z), q.identity(), V(s, s, s)); trunk.setMatrixAt(i, m4);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.283 + i; q.setFromEuler(e.set(-0.5, a, 0, 'YXZ')); m4.compose(V(x + Math.sin(a) * 2.4 * s, y + 12 * s - 0.4, z + Math.cos(a) * 2.4 * s), q, V(s, s, s)); leaf.setMatrixAt(i * 7 + k, m4); }
    });
    trunk.castShadow = leaf.castShadow = true; root.add(trunk, leaf);
    W.clouds = [];
    for (let i = 0; i < 12; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) put(g, new THREE.IcosahedronGeometry(9 + hash(i * 4 + k) * 8, 1), std(0xffffff, { flatShading: true, transparent: true, opacity: 0.93 }), k * 11 - 16, hash(i + k) * 4, hash(i * 2 + k) * 8, { cast: false }).scale.y = 0.55; g.position.set(-300 + hash(i * 7.7) * 560, 70 + hash(i * 1.3) * 50, -720 + hash(i * 5.1) * 300); g.userData.x0 = g.position.x; g.userData.sp = 1.5 + hash(i) * 2; W.clouds.push(g); root.add(g); }
  }

  // ===== registry tower =====
  W.tower = new THREE.Group(); W.tower.position.copy(L.TOWER); root.add(W.tower);
  W.slabs = [];
  {
    put(W.tower, new THREE.CylinderGeometry(13, 15, 1.6, 6), std(0xB8BCC2), 0, 0.8, 0);
    for (let k = 0; k < L.SLABS; k++) {
      const m = new THREE.MeshStandardMaterial({ color: 0x7C93A3, roughness: 0.5, metalness: 0.35, emissive: 0x36E0FF, emissiveIntensity: 0 });
      const slab = put(W.tower, box(11, 4.3, 11), m, 0, 1.6 + k * 5.2 + 2.15, 0); W.slabs.push(m);
      put(W.tower, box(11.6, 0.35, 11.6), std(0x9EE8FF, { emissive: 0x36E0FF, emissiveIntensity: 0.15 }), 0, 1.6 + k * 5.2 + 4.55, 0, { cast: false });
    }
    put(W.tower, new THREE.CylinderGeometry(0.4, 0.6, 18, 6), std(0xD9DEE3), 0, 1.6 + L.SLABS * 5.2 + 9, 0);
    W.beacon = put(W.tower, new THREE.SphereGeometry(1.1, 10, 8), bas(0xffffff), 0, 1.6 + L.SLABS * 5.2 + 18.5, 0, { cast: false });
    W.holo = new THREE.Group(); W.holo.position.set(0, 1.6 + L.SLABS * 5.2 + 7, 0); W.tower.add(W.holo);
    for (let k = 0; k < 3; k++) put(W.holo, new THREE.TorusGeometry(12 + k * 2.4, 0.18, 6, 48), addM(0x36E0FF, 0.55 - k * 0.12), 0, k * 2.2, 0, { rx: Math.PI / 2, cast: false });
    W.topY = 1.6 + L.SLABS * 5.2;
  }

  // ===== pin (drops on the hero plot), GPS ring =====
  W.pin = new THREE.Group(); W.pin.scale.setScalar(2.4); root.add(W.pin);
  put(W.pin, new THREE.ConeGeometry(1.6, 4.4, 10), bas(0xffffff), 0, -2.2, 0, { rx: Math.PI, cast: false }); put(W.pin, new THREE.SphereGeometry(1.9, 14, 10), bas(0xffffff), 0, 1.4, 0, { cast: false });
  W.pin.children.forEach(c => c.material.color.setRGB(0.05, 0.85, 1.7));
  W.ripple = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), addM(0x36E0FF, 0.9)); W.ripple.rotation.x = -Math.PI / 2; root.add(W.ripple);
  W.gps = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), addM(0x7DF3FF, 0.9)); W.gps.rotation.x = -Math.PI / 2; root.add(W.gps);
  W.gpsBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 9, 12, 1, true), addM(0x36E0FF, 0.35)); root.add(W.gpsBeam);

  // ===== people =====
  const heroGroup = new THREE.Group(); heroGroup.position.y = 0.5; root.add(heroGroup);
  W.farmer = makeHuman({ skin: 0xA8714A, shirt: 0xF2EFE6, lungi: 0x3F5FA8, hairStyle: 'turban', turban: 0xFFFFFF, mustache: true, hair: 0x2A2420, scale: 1.3 }); heroGroup.add(W.farmer.root);
  W.enumr = makeHuman({ skin: 0xC28A62, shirt: 0x2F8BDB, pants: 0x2C3A4A, hairStyle: 'cap', cap: 0x1E56B5, lanyard: true, scale: 1.3 }); heroGroup.add(W.enumr.root);
  const phone = new THREE.Group(); W.enumr.armR.el.add(phone); phone.position.set(0, -0.31, 0.04);
  put(phone, box(0.085, 0.16, 0.014), std(0x1B1F24), 0, 0, 0); W.phoneScreen = put(phone, new THREE.PlaneGeometry(0.075, 0.145), bas(0x1C3A4A), 0, 0, -0.0085, { cast: false }); W.phoneScreen.rotation.y = Math.PI;
  put(phone, new THREE.CircleGeometry(0.012, 8), bas(0x050607), 0.025, 0.06, 0.0085, { cast: false });
  W.phoneAnchor = phone;
  const bankGroup = new THREE.Group(); bankGroup.position.y = 0; root.add(bankGroup);
  W.banker = makeHuman({ skin: 0xB57A55, shirt: 0xFFFFFF, pants: 0x233447, tie: 0x2F6FDB, glasses: true, hairStyle: 'short', scale: 1.3 }); bankGroup.add(W.banker.root);
  W.woman = makeHuman({ skin: 0xA66B46, shirt: 0xF0D060, saree: 0xC2306B, hairStyle: 'bun', hair: 0x14100D, scale: 1.2 }); bankGroup.add(W.woman.root);

  // ===== bank set =====
  {
    const b = new THREE.Group(); b.position.copy(L.BANK); root.add(b);
    put(b, box(24, 0.4, 16), std(0xEFE6D2), 0, 0.2, 0); put(b, box(24, 8, 0.5), std(0x2D6372, { emissive: 0x0E2A33, emissiveIntensity: 0.5 }), 0, 4.2, -7.5);
    put(b, box(0.5, 8, 15), std(0xE6EEF0), -12, 4.2, 0); put(b, box(0.5, 8, 15), std(0xE6EEF0), 12, 4.2, 0);
    for (const sx of [-1, 1]) put(b, box(14, 0.5, 17), std(0x2F7F86), sx * 5.9, 8.9, 0, { rz: -sx * 0.32 });
    put(b, box(10, 2.2, 0.35), std(0x1F5F6B), 0, 8.6, 7.7); W.bankSign = put(b, box(8.5, 1.4, 0.3), bas(0xFFB347), 0, 8.6, 7.95, { cast: false }); W.bankSign.material.color.setRGB(1.6, 1.0, 0.35);
    put(b, box(13, 1.3, 1.8), std(0x8A5A34), 0, 0.9, -1.2); put(b, box(13.4, 0.15, 2.1), std(0xC89A62), 0, 1.6, -1.2);
    W.bankScreen = put(b, box(0.1, 0.1, 0.1), bas(0x10343F), 0, 4.4, -7.2, { cast: false });
    for (let i = 0; i < 6; i++) put(b, box(1.1, 0.6, 1.1), std(0xE8E1D0), -4.8 + i * 1.9, 1.95, -1.2);
    // claim cards + verdict marks (floating)
    const mkCard = (c, ex) => { const g = new THREE.Group(); put(g, box(4.4, 2.8, 0.12), std(0x20303A, { emissive: c, emissiveIntensity: 0.35 }), 0, 0, 0, { cast: false }); for (let i = 0; i < 3; i++) put(g, box(2.6 - i * 0.5, 0.2, 0.05), bas(c), -0.4 - i * 0.2, 0.7 - i * 0.5, 0.09, { cast: false }); put(g, box(0.7, 0.7, 0.05), bas(c), 1.4, -0.6, 0.09, { cast: false }); b.add(g); return g; };
    W.claimCard = mkCard(0xFFB347); W.claimCard.position.set(-1.3, 5.6, 1.2); W.regCard = mkCard(0x36E0FF); W.regCard.position.set(1.3, 5.6, 1.2);
    W.cross = new THREE.Group(); for (const r of [Math.PI / 4, -Math.PI / 4]) put(W.cross, box(0.55, 3.1, 0.3), bas(0xFF4040), 0, 0, 0, { rz: r, cast: false }); W.cross.position.set(0, 3.9, 1.5); b.add(W.cross);
    W.tick = new THREE.Group(); put(W.tick, box(0.55, 1.3, 0.3), bas(0x2EE87A), -0.7, -0.35, 0, { rz: Math.PI / 4, cast: false }); put(W.tick, box(0.55, 2.6, 0.3), bas(0x2EE87A), 0.5, 0.15, 0, { rz: -Math.PI / 4, cast: false }); W.tick.position.set(0, 3.9, 1.5); b.add(W.tick);
    [W.cross, W.tick].forEach(g => g.children.forEach(c => c.material.color.multiplyScalar(1.6)));
    W.scan = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.6), addM(0x7DF3FF, 0.6)); W.scan.position.set(0, 5.6, 1.7); b.add(W.scan);
    W.bankG = b;
  }

  // ===== photo packet =====
  {
    const tex = canvasTex(256, 180, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#BFE6F5'); gr.addColorStop(0.42, '#E8F4D6'); gr.addColorStop(0.43, '#6FB04A'); gr.addColorStop(1, '#3E7E2E'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#A8E070'; g.lineWidth = 5; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * 24 - 20, h); g.lineTo(w / 2 + (i - 5.5) * 7, h * 0.43); g.stroke(); }
      g.fillStyle = '#36E0FF'; g.beginPath(); g.arc(w - 40, 40, 20, 0, 7); g.fill(); g.fillStyle = '#0A2A33'; g.beginPath(); g.arc(w - 40, 40, 8, 0, 7); g.fill();
    });
    W.packet = new THREE.Group(); put(W.packet, box(3.4, 2.5, 0.16), bas(0xE9FBFF), 0, 0, 0, { cast: false }); put(W.packet, new THREE.PlaneGeometry(3.0, 2.1), new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0.09, { cast: false });
    put(W.packet, new THREE.RingGeometry(1.9, 2.1, 4), addM(0x36E0FF, 0.9), 0, 0, 0.05, { cast: false, rz: Math.PI / 4 }); root.add(W.packet);
  }

  // ===== Farmer ID card + schemes =====
  {
    W.idCard = new THREE.Group(); root.add(W.idCard);
    const photo = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#CFE9F2'; g.fillRect(0, 0, w, h); g.fillStyle = '#B77B54'; g.beginPath(); g.arc(w / 2, h * 0.38, 24, 0, 7); g.fill(); g.fillStyle = '#F2EFE6'; g.beginPath(); g.ellipse(w / 2, h * 1.0, 46, 36, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(w / 2 - 26, h * 0.22, 52, 10); });
    put(W.idCard, box(3.4, 2.1, 0.1), std(0x0E5E66, { roughness: 0.4, metalness: 0.2 }), 0, 0, 0);
    for (const [c, y] of [[0xFF9933, 0.82], [0xFFFFFF, 0.72], [0x138808, 0.62]]) put(W.idCard, box(3.4, 0.1, 0.11), bas(c), 0, y, 0.01, { cast: false });
    put(W.idCard, new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: photo }), -0.95, -0.12, 0.06, { cast: false });
    put(W.idCard, box(0.5, 0.38, 0.04), std(0xE8B84A, { metalness: 0.7, roughness: 0.3, emissive: 0x6A4A10, emissiveIntensity: 0.4 }), 1.1, -0.45, 0.06, { cast: false });
    for (let i = 0; i < 3; i++) put(W.idCard, box(1.2 - i * 0.2, 0.12, 0.03), bas(0xCDEFF0), 0.7, 0.25 - i * 0.28, 0.06, { cast: false });
    W.icons = {};
    const gold = std(0xE8B84A, { metalness: 0.7, roughness: 0.3, emissive: 0x7A5A10, emissiveIntensity: 0.5 });
    const coin = new THREE.Group(); put(coin, new THREE.CylinderGeometry(0.62, 0.62, 0.14, 24), gold, 0, 0, 0, { rx: Math.PI / 2 }); put(coin, new THREE.TorusGeometry(0.46, 0.05, 6, 24), std(0xFFE08A, { emissive: 0xFFC84A, emissiveIntensity: 0.6 }), 0, 0, 0.09); W.icons.kisan = coin;
    const umb = new THREE.Group(); put(umb, new THREE.ConeGeometry(0.9, 0.55, 12), std(0x2F8BDB, { emissive: 0x1A4F8A, emissiveIntensity: 0.4 }), 0, 0.35, 0); put(umb, new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), std(0xDDDDDD), 0, -0.1, 0); put(umb, new THREE.TorusGeometry(0.1, 0.03, 6, 10, Math.PI), std(0xDDDDDD), 0.1, -0.6, 0, { rz: Math.PI }); W.icons.insure = umb;
    const bag = new THREE.Group(); put(bag, box(0.95, 1.2, 0.45), std(0x5FB05A, { emissive: 0x1E5A22, emissiveIntensity: 0.4 }), 0, 0, 0); put(bag, box(0.95, 0.2, 0.46), std(0xF4EFE0), 0, 0.3, 0); put(bag, box(0.5, 0.28, 0.47), std(0xFFFFFF), 0, -0.1, 0); W.icons.fert = bag;
    const kcc = new THREE.Group(); put(kcc, box(1.5, 0.95, 0.07), std(0xD8402A, { emissive: 0x6A1A10, emissiveIntensity: 0.4 }), 0, 0, 0); put(kcc, box(0.4, 0.3, 0.05), gold, -0.45, 0.1, 0.05); put(kcc, box(1.0, 0.1, 0.05), bas(0xFFE9D8), 0.1, -0.25, 0.05); W.icons.kcc = kcc;
    for (const k of L.SCHEMES) root.add(W.icons[k]);
    W.links = L.SCHEMES.map(() => { const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7DF3FF, transparent: true, blending: THREE.AdditiveBlending })); l.frustumCulled = false; root.add(l); return l; });
  }

  // ===== the lock =====
  {
    W.lock = new THREE.Group(); root.add(W.lock);
    const gold = std(0xFFC83A, { metalness: 0.5, roughness: 0.35, emissive: 0xB07A10, emissiveIntensity: 0.9 });
    put(W.lock, box(7, 5.6, 2.8), gold, 0, 0, 0); put(W.lock, new THREE.CylinderGeometry(0.7, 0.7, 0.4, 14), std(0x1A1208), 0, 0.4, 1.5, { rx: Math.PI / 2 }); put(W.lock, box(0.8, 1.8, 0.4), std(0x1A1208), 0, -0.7, 1.5);
    W.shackle = new THREE.Group(); W.shackle.position.set(2.2, 2.7, 0); W.lock.add(W.shackle);
    put(W.shackle, new THREE.TorusGeometry(2.2, 0.55, 8, 20, Math.PI), std(0xC7CBD1, { metalness: 0.85, roughness: 0.25 }), -2.2, 0, 0);
    put(W.shackle, new THREE.CylinderGeometry(0.55, 0.55, 1.2, 10), std(0xC7CBD1, { metalness: 0.85, roughness: 0.25 }), -4.4, -0.6, 0); put(W.shackle, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 10), std(0xC7CBD1, { metalness: 0.85, roughness: 0.25 }), 0, -0.35, 0);
    W.lockGlow = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), addM(0xFFB347, 0.0)); W.lock.add(W.lockGlow);
  }

  // ===== lights =====
  W.sun = new THREE.DirectionalLight(0xFFE2B8, 3.1); W.sun.castShadow = true; W.sun.shadow.mapSize.set(2048, 2048); W.sun.shadow.bias = -0.0004; W.sun.shadow.normalBias = 0.5;
  const sc = W.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 400; scene.add(W.sun, W.sun.target);
  W.hemi = new THREE.HemisphereLight(0xBFE3FF, 0x6A8A4A, 0.8); scene.add(W.hemi);
  W.fill = new THREE.DirectionalLight(0xFFD9A8, 0.5); W.fill.position.set(60, 40, -60); scene.add(W.fill);
  W.flash = new THREE.PointLight(0xFFFFFF, 0, 30, 2); root.add(W.flash);

  // ===== per frame =====
  const place = (h, pose, t, seed) => applyPose(h, pose, t, seed);
  W.update = function (t, focus, camera) {
    W.sun.position.set(focus.x - 70, focus.y + 90, focus.z + 80); W.sun.target.position.copy(focus);
    W.clouds.forEach(c => { c.position.x = c.userData.x0 + t * c.userData.sp; });
    // pin drop + ripple (0.7-2.8s)
    const pd = seg(t, 0.55, 1.35), bounce = pd < 1 ? lerp(60, 0, pd * pd) : Math.abs(Math.sin((t - 1.35) * 7)) * 2.4 * Math.exp(-(t - 1.35) * 2.4);
    W.pin.position.set(0, 4.4 + bounce, 0); W.pin.visible = t > 0.5 && t < 4.6; W.pin.scale.setScalar(2.4 * (1 - smooth(seg(t, 4.0, 4.6)) * 0.9));
    const rp = seg(t, 1.35, 3.2); W.ripple.visible = rp > 0 && rp < 1; W.ripple.position.set(0, 1.0, 0); W.ripple.scale.setScalar(1 + 40 * smooth(rp)); W.ripple.material.opacity = 0.9 * (1 - rp);
    // hero plants sway
    for (let i = 0; i < W.paddyBase.length; i++) {
      const [x, z, tilt, s] = W.paddyBase[i], sw = Math.sin(t * 1.6 + x * 0.7 + z * 0.4) * 0.1;
      q.setFromEuler(e.set(sw + tilt * 0.4, 0, tilt * 0.5 + sw * 0.6)); m4.compose(V(x, 0.5 + 0.5 * s, z), q, V(1, s, 1)); W.paddy.setMatrixAt(i, m4);
    }
    W.paddy.instanceMatrix.needsUpdate = true;
    // survey wave
    const dim = L.surveyDim(t);
    L.plots.forEach((p, k) => {
      const u = L.surveyed(p, t) * (p.hero && t > 12 ? 0.18 : 1), edge = Math.sin(Math.PI * clamp01((t - (L.WAVE_T0 + p.d / 62)) / 0.6)) * 0.9;
      W.glow.setColorAt(k, tc.setRGB(0.05 * u, 0.42 * u * dim, 0.5 * u * dim));
      for (let s = 0; s < 2; s++) W.frames.setColorAt(k * 2 + s, tc.setRGB((0.2 * u + 0.5 * edge) * dim, (1.0 * u + 0.8 * edge) * dim, (1.4 * u + 0.9 * edge) * dim));
    });
    // hero plot is surveyed first (the enumerator's plot, at 8.0)
    const heroK = L.plots.findIndex(p => p.hero), hu = smooth(seg(t, 8.0, 8.6));
    if (t < L.WAVE_T0) { W.glow.setColorAt(heroK, tc.setRGB(0.05 * hu, 0.42 * hu, 0.5 * hu)); for (let s = 0; s < 2; s++) W.frames.setColorAt(heroK * 2 + s, tc.setRGB(0.2 * hu, 1.0 * hu, 1.4 * hu)); }
    W.glow.instanceColor.needsUpdate = true; W.frames.instanceColor.needsUpdate = true;
    // people
    place(W.farmer, L.farmerPose(t), t, 0); place(W.enumr, L.enumPose(t), t, 1.3);
    const bp = L.bankerPose(t), wp = L.womanPose(t); place(W.banker, bp, t, 2.1); place(W.woman, wp, t, 3.4);
    // phone screen: blue idle -> white flash at shutter -> photo captured
    const shut = L.bump(t, 7.18, 7.2, 7.4), cap = smooth(seg(t, 7.4, 7.7));
    W.phoneScreen.material.color.setRGB(0.1 + 1.6 * shut + 0.1 * cap, 0.23 + 1.6 * shut + 0.7 * cap, 0.29 + 1.6 * shut + 0.8 * cap);
    W.flash.position.set(-3.5, 3.6, -1.5); W.flash.intensity = 120 * shut;
    // GPS ring at enumerator's feet
    const gp = seg(t, 7.3, 8.6); W.gps.visible = gp > 0 && gp < 1; W.gps.position.set(-3.5, 0.9, -3.5); W.gps.scale.setScalar(0.8 + 7 * smooth(gp)); W.gps.material.opacity = 0.9 * (1 - gp);
    W.gpsBeam.visible = gp > 0 && gp < 1; W.gpsBeam.position.set(-3.5, 5.2, -3.5); W.gpsBeam.material.opacity = 0.4 * (1 - gp);
    // packet
    const ps = L.packetScale(t), pp = L.packetPos(t); W.packet.visible = ps > 0.01; W.packet.position.copy(pp); W.packet.scale.setScalar(ps * (0.6 + 0.4 * smooth(seg(t, 8.8, 9.6))) * (1 + 0.8 * smooth(seg(t, 10.5, 13.0)))); W.packet.lookAt(camera.position);
    // tower
    W.slabs.forEach((m, k) => { m.emissiveIntensity = 2.2 * L.slabLit(k, t) * (t > 38 && t < 43.5 ? 0.6 + 0.4 * Math.sin(t * 6 + k) : 1); });
    W.holo.rotation.y = t * 0.7; W.holo.visible = t > 13.3; W.holo.scale.setScalar(0.6 + 0.4 * smooth(seg(t, 13.3, 14.4)));
    W.beacon.material.color.setRGB(1.2 + 1.6 * L.slabLit(8, t), 0.3 + 1.7 * L.slabLit(8, t), 0.2 + 1.8 * L.slabLit(8, t));
    // bank scene
    const ct = L.checkT, pop = u => easeOutBack(clamp01(u));
    W.claimCard.scale.setScalar(Math.max(1e-4, 0.42 * pop(seg(t, ct.claim, ct.claim + 0.5)))); W.regCard.scale.setScalar(Math.max(1e-4, 0.42 * pop(seg(t, ct.reg, ct.reg + 0.5))));
    W.claimCard.position.y = 5.6 + Math.sin(t * 1.4) * 0.1; W.regCard.position.y = 5.6 + Math.sin(t * 1.4 + 1) * 0.1;
    const sp = seg(t, ct.scan[0], ct.scan[1]); W.scan.visible = sp > 0 && sp < 1; W.scan.position.x = lerp(-2.4, 2.4, smooth(sp));
    const cr = L.bump(t, ct.cross, ct.cross + 0.15, ct.fix), tk = smooth(seg(t, ct.tick, ct.tick + 0.35)) * (1 - smooth(seg(t, 31.2, 31.8)));
    W.cross.scale.setScalar(Math.max(1e-4, 0.4 * pop(seg(t, ct.cross, ct.cross + 0.35)) * (1 - smooth(seg(t, ct.fix, ct.fix + 0.3))))); W.cross.rotation.z = Math.sin(t * 30) * 0.08 * cr;
    W.tick.scale.setScalar(Math.max(1e-4, 0.4 * pop(seg(t, ct.tick, ct.tick + 0.4)) * (1 - smooth(seg(t, 29.4, 29.8)))));
    W.claimCard.children[0].material.emissive.setRGB(...(t > ct.cross && t < ct.fix ? [1, 0.15, 0.1] : [1, 0.7, 0.28])); W.claimCard.children[0].material.emissiveIntensity = 0.35 + 0.5 * cr;
    W.bankScreen.material.color.setRGB(0.06, 0.2 + 0.12 * Math.sin(t * 2), 0.26);
    // Farmer ID + schemes
    const handP = V(0, 0, 0); W.farmer.armR.hand.getWorldPosition(handP);
    const idIn = smooth(seg(t, 29.6, 30.3)), idUp = smooth(seg(t, 30.6, 31.5)), idOut = 1 - smooth(seg(t, 36.4, 37.0));
    const big = V(3.7, 3.9, 1.3);
    W.idCard.visible = idIn > 0.01 && idOut > 0.01; W.idCard.position.copy(handP).lerp(big, idUp); W.idCard.position.y += 0.15 * Math.sin(t * 2) * idUp;
    W.idCard.scale.setScalar(Math.max(1e-4, (0.3 + 0.7 * idUp) * idIn * idOut)); W.idCard.lookAt(camera.position);
    const SLOT = [[-2.5, 1.6], [2.3, 1.8], [-2.5, -1.7], [2.3, -1.6]];
    L.SCHEMES.forEach((k, i) => {
      const u = L.schemeIn(i, t), out = L.schemeOut(t), r = lerp(4.2, 1, u), o = W.icons[k];
      o.visible = u > 0.01 && out > 0.01; o.position.set(W.idCard.position.x + SLOT[i][0] * r, W.idCard.position.y + SLOT[i][1] * r + 0.12 * Math.sin(t * 2.4 + i * 1.7), W.idCard.position.z + 0.3);
      o.scale.setScalar(Math.max(1e-4, (1.0 + 0.15 * Math.sin(t * 3 + i)) * u * out * 0.7)); o.rotation.set(0.3, t * 1.2 + i, 0);
      const ln = W.links[i], pos = ln.geometry.attributes.position; ln.visible = o.visible && u > 0.5;
      pos.setXYZ(0, W.idCard.position.x, W.idCard.position.y, W.idCard.position.z); pos.setXYZ(1, o.position.x, o.position.y, o.position.z); pos.needsUpdate = true; ln.material.opacity = smooth((u - 0.5) * 2);
    });
    // lock
    const li = L.lockIn(t); W.lock.visible = li > 0.01; W.lock.position.set(L.TOWER.x, W.topY + 32, L.TOWER.z + 2); W.lock.scale.setScalar(Math.max(1e-4, li * 0.8 * (1 + 0.05 * Math.sin(t * 3)))); W.lock.lookAt(camera.position);
    const sh = 1 - smooth(seg(t, 39.2, 39.5)); W.shackle.position.y = 2.7 + 1.5 * sh; W.shackle.rotation.z = -0.5 * sh;
    W.lockGlow.material.opacity = 0.18 * li * (0.5 + 0.5 * Math.sin(t * 5));
    root.updateMatrixWorld(true);
    // anchors for HTML labels
    const A = W.anchors; const wp3 = (o, dy = 0) => { const v = V(0, 0, 0); o.getWorldPosition(v); v.y += dy; return v; };
    A.enumHead = wp3(W.enumr.head, 0.5); A.phone = wp3(W.phoneAnchor, 0.4); A.tower = V(L.TOWER.x, W.topY + 14, L.TOWER.z); A.towerSlab = V(L.TOWER.x, 53, L.TOWER.z + 6); A.farmerHead = wp3(W.farmer.head, 0.6);
    A.claim = wp3(W.claimCard, 1.0); A.reg = wp3(W.regCard, 1.0); A.cross = wp3(W.cross, 2.4); A.bankSign = wp3(W.bankSign, 1.4);
    A.card = W.idCard.position.clone().add(V(0, 1.7 * W.idCard.scale.y, 0)); L.SCHEMES.forEach(k => { A[k] = W.icons[k].position.clone().add(V(0, 1.0, 0)); });
    A.lock = wp3(W.lock, 6.5); A.pin = V(0, 12, 0); A.hero = V(0, 4, 0);
  };
  return W;
}
