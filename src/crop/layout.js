// World layout + choreography for "How the government knows what crop is in your field".
// Everything time-dependent is a pure function of t (frames render out of order).
import * as THREE from 'three';
import { clamp01, seg, smooth, lerp, hash } from './lib.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const bump = (t, a, b, c) => smooth(seg(t, a, b)) * (1 - smooth(seg(t, b, c)));

// ---------- fields ----------
export const PLOT_W = 24, PLOT_D = 20, PITCH_X = 26, PITCH_Z = 22, COLS = 12, ROWS = 22;
export const HERO = V(0, 0, 0);
export const TOWER = V(62, 0, -172);
export const BANK = V(-205, 0, 18);
export const plotCenter = (i, j) => [(i - 6) * PITCH_X, -(j - 3) * PITCH_Z];
export const CROPS = [
  { name: 'paddy', tile: 0x6FB04A, row: 0x8FD05C },
  { name: 'cotton', tile: 0x7A8F3A, row: 0xDAD9C4 },
  { name: 'chilli', tile: 0x5E8C3A, row: 0xD8402A },
  { name: 'maize', tile: 0x9DB84A, row: 0xE2C93C },
  { name: 'groundnut', tile: 0x3F7E3A, row: 0x5FB05A },
  { name: 'fallow', tile: 0xA67B4B, row: 0xB98B57 },
  { name: 'sugarcane', tile: 0x2F7A45, row: 0x4DAA62 },
];
export const plots = [];
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  const [x, z] = plotCenter(i, j);
  if (Math.hypot(x - TOWER.x, z - TOWER.z) < 52) continue;
  const hero = i === 6 && j === 3;
  plots.push({ i, j, x, z, hero, crop: hero ? 0 : Math.floor(hash(i * 7.3 + j * 13.1) * CROPS.length) % CROPS.length, d: Math.hypot(x, z) });
}

// ---------- terrain ----------
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, h = (a, b) => hash(a * 57.3 + b * 131.7), u = smooth(xf), v = smooth(zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.15;
export function flatMask(x, z) {
  const dx = Math.max(-172 - x, 0, x - 150), dz = Math.max(-430 - z, 0, z - 90);
  let d = Math.hypot(dx, dz);
  d = Math.min(d, Math.hypot(x - BANK.x, z - BANK.z) - 55, Math.hypot(x - TOWER.x, z - TOWER.z) - 60);
  return smooth(clamp01(d / 70));
}
export const heightAt = (x, z) => Math.max(-1, (fbm(x * 0.008 + 3, z * 0.008 + 9) - 0.42) * 120) * flatMask(x, z);

// ---------- survey wave (plots turn "surveyed") ----------
export const WAVE_T0 = 16.6;
export const surveyed = (p, t) => smooth(seg(t, WAVE_T0 + p.d / 62, WAVE_T0 + p.d / 62 + 0.6));
export const surveyDim = t => 1 - 0.65 * smooth(seg(t, 41.0, 43.0));

// ---------- registry tower ----------
export const SLABS = 12;
export const slabLit = (k, t) => {
  if (t < 13.3) return 0;
  const first = 0.9 * smooth(seg(t, 13.3, 13.7));            // the first slab takes the photo
  const wave = smooth(seg(t, 16.6 + k * 0.42, 17.1 + k * 0.42));
  return k === 8 ? Math.max(first, wave) : wave;   // the photo enters at slab 8 (mid-tower, facing the camera)
};

// ---------- photo packet ----------
export const PACKET = new THREE.CatmullRomCurve3([V(-1.0, 3.3, -0.6), V(-0.6, 9, -6), V(12, 26, -38), V(40, 44, -104), V(60, 47, -150), V(62, 45.4, -166)]);
export const packetU = t => smooth(seg(t, 8.9, 13.3));
export const packetScale = t => easeBack(seg(t, 8.2, 8.8)) * (1 - smooth(seg(t, 13.3, 13.65)));
function easeBack(u) { const c1 = 1.70158, c3 = c1 + 1; return u <= 0 ? 0 : u >= 1 ? 1 : 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
export const packetPos = t => PACKET.getPointAt(packetU(t));

// ---------- characters ----------
export function farmerPose(t) {
  const p = { x: 2.0, z: -2.5, ry: -0.2 + 0.1 * Math.sin(t * 0.6), hy: 0.2 * Math.sin(t * 0.7) };
  const w = bump(t, 5.6, 6.0, 6.9);                                     // hello wave
  p.rsz = -2.6 * w; p.rel = (-0.4 + 0.5 * Math.sin(t * 13)) * w; p.hy = (p.hy ?? 0) - 0.35 * w;
  const pt = bump(t, 7.3, 7.7, 8.9);                                     // proud point at the crop
  p.lsx = -1.25 * pt; p.lel = -0.15 * pt;
  const id = smooth(seg(t, 29.7, 30.3)) * (1 - smooth(seg(t, 36.4, 37.0))); // holds the Farmer ID
  p.rsx = -1.0 * id; p.rel = (p.rel ?? 0) - 1.5 * id; p.lsx = (p.lsx ?? 0) - 0.15 * id;
  return p;
}
export function enumPose(t) {
  const go = seg(t, 4.6, 6.4), moving = go > 0 && go < 1;
  const x = lerp(-20, -3.5, smooth(go));
  const ry = go < 1 ? Math.PI / 2 : lerp(Math.PI / 2, 0, smooth(seg(t, 6.2, 6.9)));
  const u = smooth(seg(t, 6.8, 7.2)) * (1 - smooth(seg(t, 8.9, 9.3)));   // raises the phone to photograph
  return { x, z: -3.5, ry: go >= 1 ? ry : Math.PI / 2, walk: moving ? 0.75 : 0, ph: t * 8.5, rsx: -1.35 * u, rel: -1.45 * u, lsx: -0.9 * u, lel: -1.2 * u, hp: 0.12 * u, hy: 0.15 * Math.sin(t * 1.1) * (1 - u) };
}
export function bankerPose(t) {
  const nod = bump(t, 28.3, 28.6, 29.0) * 0.25, shake = Math.sin((t - 26.8) * 14) * bump(t, 26.8, 27.1, 28.0) * 0.35;
  const point = bump(t, 25.0, 25.4, 26.4);
  return { x: BANK.x, z: BANK.z - 3.2, ry: 0, hp: nod, hy: shake, lsx: -0.45 - 0.5 * point, lel: -0.6, rsx: -0.5, rel: -0.7 - 0.4 * point };
}
export function womanPose(t) {
  const droop = bump(t, 26.7, 27.2, 28.1) * 0.22, relief = bump(t, 28.4, 28.9, 29.6);
  return { x: BANK.x - 0.5, z: BANK.z + 2.4, ry: Math.PI * 0.88, lean: droop, hp: 0.12 * droop - 0.1 * relief, hy: 0.1 * Math.sin(t * 1.3), lsx: -0.5, lel: -0.9, rsx: -0.5, rel: -0.9 };
}

// ---------- bank claim check ----------
export const checkT = { claim: 24.4, reg: 25.1, scan: [25.7, 26.6], cross: 26.8, fix: 27.9, tick: 28.4 };

// ---------- Farmer ID + schemes ----------
export const SCHEMES = ['kisan', 'insure', 'fert', 'kcc'];
export const idCardScale = t => 1 + 1.1 * smooth(seg(t, 30.6, 31.5)) - 0.0 * smooth(seg(t, 36.4, 37));
export const schemeIn = (k, t) => smooth(seg(t, 31.4 + k * 0.5, 32.2 + k * 0.5));
export const schemeOut = t => 1 - smooth(seg(t, 36.4, 37.0));

// ---------- the lock ----------
export const lockIn = t => smooth(seg(t, 37.6, 38.4)) * (1 - smooth(seg(t, 43.6, 44.6)));
