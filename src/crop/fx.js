// Stateless GPU-point particle emitters: every particle is a pure function of (t, index),
// so any frame can be rendered in isolation (needed for parallel offline rendering).
import * as THREE from 'three';
import { clamp01, smooth, lerp, hash } from './lib.js';

const VS = `attribute float aAlpha; attribute float aSize; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uScale;
void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(-mv.z, 0.1); gl_Position = projectionMatrix * mv; }`;
const FS = `varying float vA; varying vec3 vC;
void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); a = a * a * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC, a); }`;

export class Emitter {
  constructor(scene, o) {
    this.o = Object.assign({ N: 60, life: 2, start: 0, end: 1e9, origin: [0, 0, 0], vel: [0, 1, 0], spread: 0.5, drift: [0, 0, 0], size: [1, 2], c0: 0xffffff, c1: 0xffffff, boost: 1, alpha: 0.5, additive: false, seed: 1, jitter: 0.5 }, o);
    const N = this.o.N;
    this.pos = new Float32Array(N * 3); this.a = new Float32Array(N); this.s = new Float32Array(N); this.c = new Float32Array(N * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.a, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.s, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(this.c, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      blending: this.o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(19))) } }
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
    this.c0 = new THREE.Color(this.o.c0), this.c1 = new THREE.Color(this.o.c1);
    this.rand = Array.from({ length: N }, (_, i) => [hash(i * 3.1 + this.o.seed), hash(i * 5.7 + this.o.seed + 2), hash(i * 7.3 + this.o.seed + 5), hash(i * 2.9 + this.o.seed + 9)]);
  }
  setScale(v) { this.mat.uniforms.uScale.value = v; }
  update(t) {
    const o = this.o, N = o.N;
    for (let i = 0; i < N; i++) {
      const ph = (((t / o.life + i / N) % 1) + 1) % 1, age = ph * o.life, tb = t - age, [r1, r2, r3, r4] = this.rand[i];
      if (tb < o.start || tb > o.end) { this.a[i] = 0; this.s[i] = 0; continue; }
      const org = typeof o.origin === 'function' ? o.origin(tb, i) : o.origin;
      const vel = typeof o.vel === 'function' ? o.vel(tb, i) : o.vel;
      const sp = o.spread * ph;
      this.pos[i * 3] = org[0] + vel[0] * age + (r1 - 0.5) * 2 * (o.jitter + sp) + o.drift[0] * age * age * 0.5;
      this.pos[i * 3 + 1] = org[1] + vel[1] * age + (r2 - 0.5) * 2 * (o.jitter * 0.4 + sp * 0.6) + o.drift[1] * age * age * 0.5;
      this.pos[i * 3 + 2] = org[2] + vel[2] * age + (r3 - 0.5) * 2 * (o.jitter + sp) + o.drift[2] * age * age * 0.5;
      const fade = smooth(clamp01(ph / 0.15)) * Math.pow(1 - ph, 1.25);
      const win = smooth(clamp01((tb - o.start) / 0.25)) * smooth(clamp01((o.end - tb) / 0.25 + 0.0001));
      this.a[i] = o.alpha * fade * (o.fadeWin === false ? 1 : win);
      this.s[i] = lerp(o.size[0], o.size[1], ph) * (0.7 + 0.6 * r4);
      const cc = o.color ? new THREE.Color().setRGB(...o.color(tb)).multiplyScalar(o.boost) : this.c0.clone().lerp(this.c1, ph).multiplyScalar(o.boost);
      this.c[i * 3] = cc.r; this.c[i * 3 + 1] = cc.g; this.c[i * 3 + 2] = cc.b;
    }
    const g = this.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aColor.needsUpdate = true;
  }
}
