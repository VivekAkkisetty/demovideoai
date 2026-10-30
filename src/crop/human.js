// Procedural low-poly humans with a jointed rig. Pose = a few numbers; everything is a pure function of time.
import * as THREE from 'three';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...o });
const add = (p, g, m, x = 0, y = 0, z = 0, o = {}) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); if (o.rx) mesh.rotation.x = o.rx; if (o.rz) mesh.rotation.z = o.rz; if (o.sx) mesh.scale.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx); mesh.castShadow = true; p.add(mesh); return mesh; };

/** o: skin, shirt, pants, hair, hairStyle('short'|'bun'|'turban'|'cap'|'none'), lungi, saree, tie, glasses, mustache, lanyard, scale */
export function makeHuman(o = {}) {
  const skin = std(o.skin ?? 0xB77B54), shirt = std(o.shirt ?? 0xF2F2EC), pants = std(o.pants ?? 0x35414D), hairM = std(o.hair ?? 0x1B1512), dark = std(0x16130F);
  const root = new THREE.Group(), pelvis = new THREE.Group(); pelvis.position.y = 0.95; root.add(pelvis);
  // torso + head
  const torso = new THREE.Group(); torso.position.y = 0.02; pelvis.add(torso);
  add(torso, new THREE.BoxGeometry(0.46, 0.6, 0.26), shirt, 0, 0.32, 0);
  add(pelvis, new THREE.BoxGeometry(0.42, 0.22, 0.25), o.lungi || o.saree ? std(o.lungi ?? o.saree) : pants, 0, -0.02, 0);
  if (o.tie) add(torso, new THREE.BoxGeometry(0.07, 0.34, 0.03), std(o.tie), 0, 0.36, 0.14);
  if (o.lanyard) { add(torso, new THREE.BoxGeometry(0.05, 0.34, 0.02), std(0xFF9933), 0, 0.38, 0.14); add(torso, new THREE.BoxGeometry(0.14, 0.18, 0.02), std(0xFFFFFF), 0, 0.14, 0.15); }
  const head = new THREE.Group(); head.position.set(0, 0.74, 0); torso.add(head);
  add(torso, new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), skin, 0, 0.66, 0);
  add(head, new THREE.SphereGeometry(0.19, 14, 12), skin, 0, 0.12, 0, { sy: 1.1, sz: 1.0, sx: 1 });
  for (const sx of [-1, 1]) { add(head, new THREE.SphereGeometry(0.022, 6, 6), dark, sx * 0.07, 0.15, 0.17); add(head, new THREE.SphereGeometry(0.035, 6, 6), skin, sx * 0.19, 0.12, 0); }
  add(head, new THREE.ConeGeometry(0.025, 0.06, 5), skin, 0, 0.1, 0.19, { rx: Math.PI / 2 });
  if (o.mustache) add(head, new THREE.BoxGeometry(0.12, 0.025, 0.03), hairM, 0, 0.04, 0.18);
  if (o.glasses) for (const sx of [-1, 1]) add(head, new THREE.TorusGeometry(0.045, 0.008, 5, 10), dark, sx * 0.07, 0.15, 0.185);
  const hs = o.hairStyle ?? 'short';
  if (hs === 'short') add(head, new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.14, -0.01);
  if (hs === 'bun') { add(head, new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM, 0, 0.14, -0.015); add(head, new THREE.SphereGeometry(0.09, 8, 8), hairM, 0, 0.27, -0.14); add(head, new THREE.SphereGeometry(0.025, 6, 6), std(0xE23A5B), 0, 0.22, 0.18); }
  if (hs === 'turban') { add(head, new THREE.TorusGeometry(0.2, 0.065, 8, 14), std(o.turban ?? 0xF4F1EA), 0, 0.26, 0, { rx: Math.PI / 2 }); add(head, new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), std(o.turban ?? 0xF4F1EA), 0, 0.27, 0); }
  if (hs === 'cap') { add(head, new THREE.SphereGeometry(0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), std(o.cap ?? 0x2D6CDF), 0, 0.15, 0); add(head, new THREE.BoxGeometry(0.2, 0.02, 0.14), std(o.cap ?? 0x2D6CDF), 0, 0.14, 0.2); }
  // arms
  const arm = sx => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.3, 0.55, 0); torso.add(sh);
    add(sh, new THREE.CylinderGeometry(0.06, 0.055, 0.3, 7), shirt, 0, -0.15, 0);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    add(el, new THREE.CylinderGeometry(0.05, 0.045, 0.28, 7), skin, 0, -0.14, 0);
    const hand = add(el, new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.3, 0);
    return { sh, el, hand };
  };
  const armL = arm(-1), armR = arm(1);
  // legs
  const leg = sx => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.12, -0.1, 0); pelvis.add(hip);
    add(hip, new THREE.CylinderGeometry(0.08, 0.07, 0.44, 7), o.lungi || o.saree ? skin : pants, 0, -0.22, 0);
    const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn);
    add(kn, new THREE.CylinderGeometry(0.065, 0.055, 0.42, 7), o.lungi || o.saree ? skin : pants, 0, -0.21, 0);
    add(kn, new THREE.BoxGeometry(0.11, 0.06, 0.22), dark, 0, -0.43, 0.04);
    return { hip, kn };
  };
  const legL = leg(-1), legR = leg(1);
  if (o.lungi || o.saree) add(pelvis, new THREE.CylinderGeometry(0.2, 0.3, 0.72, 10), std(o.lungi ?? o.saree), 0, -0.3, 0);
  if (o.saree) add(torso, new THREE.BoxGeometry(0.5, 0.1, 0.3), std(o.saree), 0.02, 0.58, 0.0);
  root.scale.setScalar(o.scale ?? 1);
  return { root, pelvis, torso, head, armL, armR, legL, legR };
}

const L = (a, b, u) => a + (b - a) * u;
const BASE = { x: 0, z: 0, ry: 0, bob: 0, lean: 0, hy: 0, hp: 0, walk: 0, ph: 0, lsx: 0, lsz: 0, lel: 0, rsx: 0, rsz: 0, rel: 0 };
/** pose: partial overrides of BASE. walk: stride amplitude, ph: stride phase (radians). */
export function applyPose(h, p, t, seed = 0) {
  const q = { ...BASE, ...p };
  const br = Math.sin(t * 2.2 + seed) * 0.012;
  h.root.position.set(q.x, 0, q.z); h.root.rotation.y = q.ry;
  h.pelvis.position.y = 0.95 + br + Math.abs(Math.sin(q.ph)) * 0.04 * q.walk + q.bob;
  h.torso.rotation.x = q.lean + 0.03 * Math.sin(t * 1.7 + seed); h.torso.rotation.z = Math.sin(q.ph) * 0.03 * q.walk;
  h.head.rotation.y = q.hy; h.head.rotation.x = q.hp - q.lean * 0.6;
  const s = Math.sin(q.ph) * q.walk;
  h.legL.hip.rotation.x = s * 0.7; h.legR.hip.rotation.x = -s * 0.7;
  h.legL.kn.rotation.x = Math.max(0, -s) * 0.9; h.legR.kn.rotation.x = Math.max(0, s) * 0.9;
  h.armL.sh.rotation.set(q.lsx - s * 0.5, 0, q.lsz + 0.06); h.armL.el.rotation.x = q.lel;
  h.armR.sh.rotation.set(q.rsx + s * 0.5, 0, q.rsz - 0.06); h.armR.el.rotation.x = q.rel;
}
/** blend two pose objects */
export const mixPose = (a, b, u) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = L(a[k] ?? BASE[k], b[k] ?? BASE[k], u); return o; };
