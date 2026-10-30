// World layout + choreography for "Switch ON chesthe light ela vastundi?"
// Everything time-dependent (train, orb, power state) is a pure function of t so frames render deterministically.
import * as THREE from 'three';
import { clamp01, seg, smooth, lerp, hash, makePath } from './lib.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- stations ----------
export const MINE = V(0, 0, 0);
export const BOILER = V(24, 0, -110);       // open-front boiler house
export const TURBINE_HALL = V(48, 0, -108);
export const STEPUP = V(62, 0, -108);
export const SUBSTATION = V(-28, 0, -235);
export const HOUSE = V(-6, 0, -298);
export const PADS = [{ x: 0, z: 0, r: 30 }, { x: 40, z: -118, r: 58 }, { x: -28, z: -235, r: 36 }, { x: -8, z: -292, r: 32 }];

export const ROUTE_PTS = [[0, 0], [8, -10], [22, -55], [28, -80], [32, -105], [62, -110], [64, -122], [60, -140], [48, -158], [30, -174], [10, -188], [-6, -200], [-20, -212], [-28, -232], [-24, -252], [-12, -282], [-6, -296]];
export function routeDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < ROUTE_PTS.length - 1; i++) {
    const [ax, az] = ROUTE_PTS[i], [bx, bz] = ROUTE_PTS[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const u = clamp01(((x - ax) * dx + (z - az) * dz) / l2);
    best = Math.min(best, Math.hypot(x - (ax + dx * u), z - (az + dz * u)));
  }
  return best;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => hash(a * 57.3 + b * 131.7);
  const u = smooth(xf), v = smooth(zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.15;
export function flatMask(x, z) {
  let d = routeDist(x, z) - 20;
  for (const p of PADS) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - p.r);
  return smooth(clamp01(d / 55));
}
export function heightAt(x, z) {
  const hills = (fbm(x * 0.012 + 3, z * 0.012 + 9) - 0.42) * 70 + Math.max(0, fbm(x * 0.006 - 5, z * 0.006 + 2) - 0.5) * 120;
  return Math.max(-3, hills) * flatMask(x, z);
}

// ---------- railway + train ----------
export const RAIL = new THREE.CatmullRomCurve3([V(6, 0.15, -2), V(8, 0.15, -10), V(14, 0.15, -30), V(22, 0.15, -55), V(28, 0.15, -80), V(30, 0.15, -98)]);
export const RAIL_LEN = RAIL.getLength();
export const sLoco = t => lerp(34, RAIL_LEN - 3, smooth(seg(t, 8.8, 12.9)));
export const railPoint = s => RAIL.getPointAt(clamp01(s / RAIL_LEN));
export const railTangent = s => RAIL.getTangentAt(clamp01(s / RAIL_LEN));

// ---------- pylons + wires ----------
export const PYL = [[64, -122], [60, -140], [48, -158], [30, -174], [10, -188], [-6, -200], [-20, -212]];
export const WEAK = 4;
export const ATT = [[-8, 16.5], [8, 16.5], [0, 30]];
export const PYL_DIR = PYL.map((p, i) => {
  const a = PYL[Math.max(i - 1, 0)], b = PYL[Math.min(i + 1, PYL.length - 1)];
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
});
export function attach(i, k) {
  const c = Math.cos(PYL_DIR[i]), s = Math.sin(PYL_DIR[i]);
  return V(PYL[i][0] + ATT[k][0] * c, ATT[k][1], PYL[i][1] - ATT[k][0] * s);
}
export const TR_TOP = [V(60, 9.5, -108), V(62, 9.5, -108), V(64, 9.5, -108)];
export const GANTRY = [V(-33, 15, -224), V(-28, 15, -224), V(-23, 15, -224)];
export const wireCurves = [0, 1, 2].map(k => {
  const pts = [TR_TOP[k]];
  for (let i = 0; i < PYL.length; i++) pts.push(attach(i, k));
  pts.push(GANTRY[k]);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    out.push(pts[i]);
    const mid = pts[i].clone().lerp(pts[i + 1], 0.5); mid.y -= 0.045 * pts[i].distanceTo(pts[i + 1]);
    out.push(mid);
  }
  out.push(pts[pts.length - 1]);
  return new THREE.CatmullRomCurve3(out);
});

// ---------- distribution ----------
export const DIST_POLES = [[-24, -252], [-20, -262], [-16, -272], [-12, -282]];
export const POLE_H = 11;

// ---------- orb choreography ----------
const locoTop = s => railPoint(s).add(V(0, 5.6, 0));
const lt0 = locoTop(sLoco(8.6)), lt1 = locoTop(sLoco(12.9));
const orbA = makePath([[4.8, 0, -3, 0], [5.6, 0, 8, 0], [6.8, 4, 10, -6], [7.8, 9, 9, -18], [8.6, lt0.x, lt0.y, lt0.z]], 3);
const orbC = makePath([[12.9, lt1.x, lt1.y, lt1.z], [13.8, 26, 9, -100], [14.4, 24, 5.5, -110.5], [15.4, 24, 5.5, -110.5], [15.9, 24, 15, -110], [16.9, 34, 13, -109], [17.6, 44, 6.5, -108], [18.8, 47, 5.5, -108], [20.4, 55, 5.5, -108], [21.3, 64, 10.8, -108]], 3);
const wire2 = wireCurves[2];
const orbE = makePath([[26.0, -23, 16.2, -224], [26.9, -34, 12, -230], [27.6, -38, 6.5, -232], [28.2, -38, 6.5, -232], [28.9, -20, 6.5, -232], [29.6, -20, 10, -242], [30.4, -24, 11.5, -252], [31.0, -20, 11.5, -262], [31.6, -16, 11.5, -272], [32.2, -12, 11, -282], [32.9, -12, 11, -282], [33.7, -8, 7, -290], [34.4, -6, 4.8, -297], [34.7, -6, 4.8, -298]], 3);
export function orbPos(t) {
  if (t < 8.6) return V(...orbA(Math.max(t, 4.8)));
  if (t < 12.9) return locoTop(sLoco(t));
  if (t < 21.35) return V(...orbC(t));
  if (t < 26.0) return wire2.getPointAt(smooth(seg(t, 21.5, 25.9))).add(V(0, 1.3, 0));
  return V(...orbE(Math.min(t, 34.7)));
}
export function orbScale(t) {
  if (t < 4.8 || t > 34.9) return 0;
  let s = Math.min(1, (t - 4.8) / 0.5); s = 1 + 2.70158 * Math.pow(s - 1, 3) + 1.70158 * Math.pow(s - 1, 2);
  let k = 1;
  k *= lerp(1, 0.85, smooth(seg(t, 14.0, 14.5)));
  k *= lerp(1, 1.4, smooth(seg(t, 17.4, 18.2)));
  k *= lerp(1, 1.15, smooth(seg(t, 20.2, 20.8)));
  k *= lerp(1, 0.55, smooth(seg(t, 27.4, 28.8)));
  k *= lerp(1, 0.8, smooth(seg(t, 31.5, 32.5)));
  k *= 1 - smooth(seg(t, 34.4, 34.8));
  return s * k;
}
export const EMBER = [1.0, 0.45, 0.15], ELECTRIC = [0.62, 0.92, 1.0], WARM = [1.0, 0.82, 0.48];
export function orbColor(t) {
  const a = smooth(seg(t, 17.2, 18.6)), b = smooth(seg(t, 28.2, 29.4));
  return [0, 1, 2].map(i => lerp(lerp(EMBER[i], ELECTRIC[i], a), WARM[i], b));
}

// ---------- power state (village + faults) ----------
export const CUT_T = 37.2, RESTORE_T = 40.2;
export function villageLit(t) {
  if (t < CUT_T) {
    const on = smooth(seg(t, 33.6, 35.2));
    const flick = t > 36.85 ? 0.5 + 0.5 * Math.sin(t * 90) : 1;
    return on * (t > 36.85 ? flick * (1 - smooth(seg(t, 37.05, CUT_T))) : 1);
  }
  return smooth(seg(t, RESTORE_T, RESTORE_T + 0.8));
}
export function bulbIntensity(t) {
  if (t < 4.2) return t > 1.5 ? 1 : 0;
  return villageLit(t) > 0 ? Math.max(villageLit(t), 0) : 0;
}
export const switchAngle = t => (t < 1.35 ? -0.38 : 0.38 * (1 - Math.exp(-(t - 1.35) * 30) * Math.cos((t - 1.35) * 60)));
export const turbineAngle = t => {
  const W = 26, h = 3.5, a = 17.0;
  if (t < a) return 0;
  if (t < a + h) { const u = (t - a) / h; return W * h * (u ** 3 - u ** 4 / 2); }
  return W * h * 0.5 + W * (t - a - h);
};
export const turbineW = t => 26 * smooth(seg(t, 17.0, 20.5));
