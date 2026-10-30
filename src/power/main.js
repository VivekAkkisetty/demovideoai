import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp01, seg, smooth, easeOutBack, easeOutCubic, lerp, hash, makePath } from './lib.js';
import * as L from './layout.js';
import { buildWorld } from './world.js';
import { Emitter } from './fx.js';

const W = 1080, H = 1920, FPS = 30, DUR = 45;
const V = L.V;
const bump = (t, a, b, c) => smooth(seg(t, a, b)) * (1 - smooth(seg(t, b, c)));

// ---------- renderer / post ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
stage.insertBefore(renderer.domElement, stage.firstChild);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xC49E88, 260, 1300);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 4000);

// sky dome
const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vP; void main(){
    vec3 n = normalize(vP); float y = n.y;
    vec3 top = vec3(0.015,0.07,0.11), mid = vec3(0.10,0.30,0.37), hor = vec3(0.98,0.52,0.30), low = vec3(0.35,0.22,0.22);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.32, y)); c = mix(c, top, smoothstep(0.28, 0.95, y)); c = mix(c, low, 1.0 - smoothstep(-0.25, 0.0, y));
    vec3 sd = normalize(vec3(-0.62, 0.10, -0.78)); float g = max(dot(n, sd), 0.0);
    c += vec3(1.0,0.55,0.22) * (pow(g, 18.0) * 0.55 + pow(g, 220.0) * 2.0);
    gl_FragColor = vec4(c, 1.0); }`
}));
sky.renderOrder = -10; scene.add(sky);

const world = buildWorld(scene);

// ---------- energy orb ----------
const orb = new THREE.Group(); scene.add(orb);
const orbCore = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
const glowM = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
const orbH1 = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 14), glowM(0xffffff)), orbH2 = new THREE.Mesh(new THREE.SphereGeometry(3.8, 20, 14), glowM(0xffffff));
orbH2.material.opacity = 0.05;
const ringM = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const orbRing1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 6, 48), ringM()), orbRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.05, 6, 48), ringM());
const orbLight = new THREE.PointLight(0xffffff, 0, 60, 2);
orb.add(orbCore, orbH1, orbH2, orbRing1, orbRing2, orbLight);

// ---------- particles ----------
const em = [];
const E = o => { const e = new Emitter(scene, o); em.push(e); return e; };
const pipePts = [[29.5, 14, -113], [41.5, 14, -113], [41.5, 5, -108]];
E({ N: 70, life: 3.2, start: 4.4, end: 9.6, origin: [0, 1.5, 0], vel: [0.3, 1.3, 0.1], jitter: 7, spread: 3, size: [3, 9], c0: 0x8A7B68, c1: 0x4E463F, alpha: 0.32, seed: 3 });
E({ N: 120, life: 2.8, start: 4.5, end: 13.3, seed: 5, size: [1.4, 7], c0: 0x2C3136, c1: 0xBDBDBD, alpha: 0.5, jitter: 0.4, spread: 2.2, vel: [0.8, 2.6, 0.5],
  origin: tb => { const s = L.sLoco(tb), p = L.railPoint(s), tg = L.railTangent(s); return [p.x + tg.x * 3.2, 6.1, p.z + tg.z * 3.2]; } });
E({ N: 140, life: 7, start: 0, end: 1e9, origin: [20, 28, -140], vel: [0.9, 3.4, 0.6], jitter: 3, spread: 8, size: [5, 16], c0: 0xFFF3E6, c1: 0xE9D7C9, alpha: 0.24, seed: 7 });
E({ N: 140, life: 7, start: 0, end: 1e9, origin: [42, 28, -143], vel: [0.9, 3.4, 0.6], jitter: 3, spread: 8, size: [5, 16], c0: 0xFFF3E6, c1: 0xE9D7C9, alpha: 0.24, seed: 8 });
E({ N: 110, life: 8, start: 0, end: 1e9, origin: [4, 46, -124], vel: [1.5, 2.4, 0.9], jitter: 1.2, spread: 6, size: [3, 16], c0: 0x4B4E53, c1: 0x9C9C9E, alpha: 0.4, seed: 11 });
E({ N: 130, life: 0.9, start: 13.2, end: 21.6, origin: [24, 3.6, -106.8], vel: [0, 3.3, 0.7], jitter: 1.7, spread: 0.8, size: [2.2, 0.6], c0: 0xFFD27A, c1: 0xFF3A10, boost: 2.1, alpha: 0.9, additive: true, seed: 13 });
E({ N: 80, life: 1.3, start: 15.0, end: 21.3, seed: 17, vel: [0, 0.9, 0], jitter: 0.5, spread: 0.6, size: [1.1, 3.6], c0: 0xFFFFFF, c1: 0xDCE8EE, alpha: 0.45,
  origin: (tb, i) => { const f = hash(i * 1.3 + 4) * 2, a = f < 1 ? pipePts[0] : pipePts[1], b = f < 1 ? pipePts[1] : pipePts[2], u = f % 1; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } });
E({ N: 170, life: 0.95, start: 4.8, end: 34.7, seed: 19, size: [1.5, 0.3], boost: 1.2, alpha: 0.7, additive: true, jitter: 0.25, spread: 0.6, vel: [0, 0.6, 0],
  color: tb => L.orbColor(tb), origin: tb => { const p = L.orbPos(tb), s = Math.max(0, L.orbScale(tb)); return [p.x, p.y, p.z, s]; } });
E({ N: 90, life: 0.9, start: 20.8, end: 21.8, origin: [64, 10.5, -108], vel: [0, 7, 0], jitter: 0.5, spread: 6, size: [1.4, 0.2], c0: 0xDDF7FF, c1: 0x58C6FF, boost: 2.6, alpha: 1, additive: true, drift: [0, -10, 0], seed: 23 });
E({ N: 110, life: 0.8, start: 27.1, end: 27.8, origin: [-40.2, 11, -230.8], vel: [0, 6, 0], jitter: 0.6, spread: 9, size: [1.2, 0.2], c0: 0xFFFFFF, c1: 0x58C6FF, boost: 2.8, alpha: 1, additive: true, drift: [0, -16, 0], seed: 29 });
E({ N: 70, life: 0.8, start: 32.3, end: 32.9, origin: [-10.8, 9.2, -282], vel: [0, 4, 0], jitter: 0.4, spread: 5, size: [1.0, 0.2], c0: 0xFFE0A0, c1: 0xFF9A3C, boost: 2.4, alpha: 1, additive: true, drift: [0, -12, 0], seed: 31 });
E({ N: 100, life: 0.8, start: 36.85, end: 37.6, origin: [10, 29, -188], vel: [0, 5, 0], jitter: 0.6, spread: 8, size: [1.6, 0.2], c0: 0xFFB36A, c1: 0xFF2A10, boost: 2.6, alpha: 1, additive: true, drift: [0, -14, 0], seed: 37 });
E({ N: 120, life: 0.9, start: 39.5, end: 40.3, origin: [10, 29, -188], vel: [0, 6, 0], jitter: 0.6, spread: 10, size: [1.8, 0.2], c0: 0xDDF7FF, c1: 0x58C6FF, boost: 2.8, alpha: 1, additive: true, drift: [0, -10, 0], seed: 41 });
E({ N: 45, life: 4, start: 1.5, end: 3.8, origin: [-6, 3.2, -298], vel: [0.05, 0.12, 0.03], jitter: 3.2, spread: 0.8, size: [0.16, 0.1], c0: 0xFFE2A8, c1: 0xFFC46B, boost: 2.5, alpha: 0.9, additive: true, seed: 43 });
E({ N: 45, life: 4, start: 34.7, end: 36.8, origin: [-6, 3.2, -298], vel: [0.05, 0.12, 0.03], jitter: 3.2, spread: 0.8, size: [0.16, 0.1], c0: 0xFFE2A8, c1: 0xFFC46B, boost: 2.5, alpha: 0.9, additive: true, seed: 47 });
// the orb trail needs a 4th origin component (scale) -> patch update to modulate alpha
const trail = em.find(e => e.o.seed === 19);
const baseUpdate = trail.update.bind(trail);
trail.update = function (t) { baseUpdate(t); const o = this.o, N = o.N; for (let i = 0; i < N; i++) { const ph = (((t / o.life + i / N) % 1) + 1) % 1, tb = t - ph * o.life; this.a[i] *= Math.min(1, Math.max(0, L.orbScale(tb))); this.s[i] *= 1 + 0.6 * Math.max(0, L.orbScale(tb) - 1); } this.pts.geometry.attributes.aAlpha.needsUpdate = true; this.pts.geometry.attributes.aSize.needsUpdate = true; };

// ---------- post-processing ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.55, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAb: { value: 0 }, uBlur: { value: 0 }, uVig: { value: 0.38 }, uFlash: { value: 0 }, uGrain: { value: 0.035 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAb, uBlur, uVig, uFlash, uGrain; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 c = vUv - 0.5; vec3 col = vec3(0.0);
    for (int i = 0; i < 8; i++) { float k = float(i) / 7.0; vec2 uv = vUv - c * uBlur * k * 0.16; vec2 o = c * uAb * 0.03 * (0.4 + k);
      col += vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
    col /= 8.0;
    float v = smoothstep(0.95, 0.2, length(c * vec2(1.0, 0.72))); col *= mix(1.0 - uVig, 1.0, v);
    col = mix(col, col * vec3(1.05, 1.0, 0.95), 0.6);
    col = pow(col, vec3(0.96));
    col += uFlash + (h(vUv * vec2(1080.0, 1920.0) + uTime) - 0.5) * uGrain;
    gl_FragColor = vec4(col, 1.0); }`
});
composer.addPass(grade);

// ---------- camera ----------
const camPos = makePath([
  [0, -6.0, 2.8, -284], [1.4, -6.4, 2.8, -286], [2.6, -6.6, 3.2, -285], [3.5, -7.0, 4.0, -281],
  [3.95, -4, 70, -150], [4.5, -12, 10, 22], [6.5, -9, 8, 14], [8.6, 5, 9, 6],
  [9.6, 2, 9, -12], [10.8, 6, 10, -36], [11.8, 14, 10, -56], [12.9, 18, 8, -72],
  [13.6, 22, 9, -82], [14.8, 24, 9, -80], [16.2, 30, 10, -84], [17.2, 36, 8, -84], [19.8, 48, 8, -82], [20.8, 58, 11, -90], [21.4, 68, 16, -96],
  [22.4, 84, 34, -112], [23.6, 76, 40, -134], [24.8, 50, 38, -156], [25.8, 16, 34, -182], [26.4, -8, 22, -206],
  [27.4, -2, 28, -198], [28.8, 2, 26, -202], [29.6, -6, 20, -216],
  [30.6, -12, 12, -236], [32.0, -4, 10, -258], [33.2, 0, 8, -272], [34.0, -3, 5, -284], [34.8, -6, 4.2, -288], [36.0, -6, 4.2, -288.5],
  [36.6, -6, 5, -286], [37.2, -22, 66, -150], [38.4, -12, 60, -158], [39.6, 0, 66, -150], [40.6, 20, 150, -120],
  [41.5, 10, 250, -50], [44.5, 10, 390, 50], [45, 10, 390, 50]], 3);
const camLook = makePath([
  [0, -8.2, 2.6, -301], [1.4, -8.4, 2.6, -301], [2.6, -6.4, 3.6, -300], [3.5, -6.0, 4.4, -300],
  [3.95, 0, 0, -60], [4.5, 2, 3, -2], [6.5, 2, 5, -4], [8.6, 8, 3, -14],
  [9.6, 10, 3, -24], [10.8, 16, 3, -48], [11.8, 22, 3, -70], [12.9, 26, 5, -88],
  [13.6, 24, 7, -110], [14.8, 24, 8, -110], [16.2, 36, 6, -108], [17.2, 42, 5, -108], [19.8, 50, 5, -108], [20.8, 60, 8, -108], [21.4, 64, 10, -108],
  [22.4, 62, 18, -140], [23.6, 52, 20, -160], [24.8, 26, 18, -184], [25.8, -12, 12, -210], [26.4, -26, 8, -226],
  [27.4, -30, 6, -233], [28.8, -28, 5, -234], [29.6, -24, 5, -246],
  [30.6, -22, 8, -258], [32.0, -14, 9, -278], [33.2, -9, 7, -292], [34.0, -6, 5.2, -298], [34.8, -6, 4.8, -300], [36.0, -6, 4.8, -300],
  [36.6, -6, 4.8, -300], [37.2, 10, 18, -188], [38.4, 10, 20, -188], [39.6, 10, 15, -190], [40.6, 10, 0, -150],
  [41.5, 10, 0, -150], [44.5, 10, 0, -145], [45, 10, 0, -145]], 3);
const SHAKES = [[1.5, 0.35], [4.5, 0.9], [13.4, 0.6], [17.2, 0.3], [20.4, 0.8], [21.3, 0.5], [27.4, 1.3], [34.8, 0.6], [37.2, 1.1], [39.6, 0.7]];
const WHIPS = [[3.5, 3.9, 4.5, 1.0], [21.1, 21.5, 22.0, 0.45], [26.1, 26.4, 26.9, 0.3], [36.3, 36.7, 37.3, 0.75]];

// ---------- HUD ----------
const hud = document.getElementById('hud');
const ICON = {
  mine: '<path d="M4 20l7-7M9 5c4-2 8 0 10 4l-3 1-2-2-2 3-3-3z"/>',
  train: '<rect x="5" y="6" width="14" height="10" rx="2"/><path d="M5 12h14M8 20l1.5-4M16 20l-1.5-4M9 3h6"/>',
  plant: '<path d="M5 20V10h6v10M11 20V6h5v14M3 20h18M14 3c1 1 0 2 1 3"/>',
  grid: '<path d="M12 3l5 17H7zM8.5 11h7M10 7.5h4M3 8h5M16 8h5"/>',
  sub: '<rect x="5" y="7" width="14" height="12" rx="1"/><path d="M13 9l-3 4h3l-2 4M9 7V4M15 7V4"/>',
  home: '<path d="M4 12l8-8 8 8M6 10v10h12V10M10 20v-6h4v6"/>'
};
const NODES = [['MINE', 'mine', 'ember', 5.0], ['TRAIN', 'train', 'ember', 9.2], ['PLANT', 'plant', 'ember', 13.4], ['GRID', 'grid', '', 21.6], ['SUBSTATION', 'sub', '', 26.6], ['HOME', 'home', 'warm', 34.0]];
hud.innerHTML = '<div class="rail"><div class="fill" id="fill"></div></div>' + NODES.map((n, i) => {
  const x = 28 + (i / 5) * 844;
  return `<div class="node ${n[2]}" id="n${i}" style="left:${x}px"><svg viewBox="0 0 24 24">${ICON[n[1]]}</svg></div><div class="lab" style="left:${x}px">${n[0]}</div>`;
}).join('');
const fillEl = document.getElementById('fill');
const nodeEls = NODES.map((_, i) => document.getElementById('n' + i));

const callouts = document.getElementById('callouts'), linesSvg = document.getElementById('lines');
const EMB = '#FF8A4A', VOLT = '#7FE3FF', BULB = '#FFD58A', RED = '#FF5A4A';
const tagDefs = [
  { m: 'COAL MINE', s: 'coal is dug out', c: EMB, a: () => V(0, 15, 0), t0: 5.1, t1: 8.5, dx: 190, dy: -230 },
  { m: 'COAL TRAIN', s: 'rail to the power plant', c: EMB, a: t => L.railPoint(L.sLoco(t)).add(V(0, 7, 0)), t0: 9.3, t1: 12.8, dx: 210, dy: -250 },
  { m: 'BOILER', s: 'coal burns, water turns to steam', c: EMB, a: () => V(24, 14, -108), t0: 13.5, t1: 16.6, dx: 20, dy: -330 },
  { m: 'TURBINE + GENERATOR', s: 'steam spins, current is made', c: VOLT, a: () => V(48, 10, -108), t0: 17.1, t1: 20.8, dx: 10, dy: -330 },
  { m: 'TRANSMISSION', s: 'high voltage, long distance', c: VOLT, a: t => L.orbPos(t).add(V(0, 4, 0)), t0: 21.9, t1: 25.9, dx: 150, dy: -280 },
  { m: 'SUBSTATION', s: 'voltage steps down', c: VOLT, a: () => V(-30, 12, -232), t0: 26.6, t1: 30.2, dx: 170, dy: -300 },
  { m: 'TRANSFORMER', s: 'down to 230 V for homes', c: BULB, a: () => V(-10.8, 9, -282), t0: 31.0, t1: 33.8, dx: 190, dy: -260 },
  { m: 'YOUR HOME', s: 'switch ON', c: BULB, a: () => V(-6, 7.5, -298), t0: 34.2, t1: 36.4, dx: 170, dy: -280 },
  { m: 'ONE WEAK LINK', s: 'and the lights go out', c: RED, a: () => V(10, 31, -188), t0: 37.0, t1: 39.7, dx: 150, dy: -240 }
];
tagDefs.forEach(d => {
  const el = document.createElement('div'); el.className = 'tag'; el.style.setProperty('--c', d.c);
  el.innerHTML = `<div class="m">${d.m}</div><div class="s">${d.s}</div>`; callouts.appendChild(el); d.el = el;
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ln.setAttribute('stroke', d.c); ln.setAttribute('stroke-width', '3.5'); ln.setAttribute('fill', 'none'); ln.setAttribute('stroke-linecap', 'round'); linesSvg.appendChild(ln); d.ln = ln;
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '9'); dot.setAttribute('fill', d.c); linesSvg.appendChild(dot); d.dot = dot;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', d.c); ring.setAttribute('stroke-width', '3'); linesSvg.appendChild(ring); d.ring = ring;
});
const voltEl = document.getElementById('volt'), voltVal = document.getElementById('voltVal'), voltCap = document.getElementById('voltCap');
const VOLT_KEYS = [[20.0, 11e3, 'generator output'], [21.0, 11e3, 'generator output'], [22.4, 400e3, 'step-up'], [26.4, 400e3, 'transmission'], [28.8, 33e3, 'step-down'], [29.4, 33e3, 'distribution'], [31.8, 11e3, 'distribution'], [33.4, 230, 'your home']];
function voltAt(t) {
  let a = VOLT_KEYS[0];
  for (let i = 0; i < VOLT_KEYS.length - 1; i++) { if (t >= VOLT_KEYS[i][0]) a = VOLT_KEYS[i]; }
  const i = VOLT_KEYS.indexOf(a), b = VOLT_KEYS[Math.min(i + 1, VOLT_KEYS.length - 1)];
  const u = b === a ? 1 : smooth(seg(t, a[0], b[0]));
  const v = Math.pow(10, lerp(Math.log10(a[1]), Math.log10(b[1]), u));
  const cap = u > 0.5 && b !== a ? b[2] : a[2];
  return [v, cap];
}
const subEl = document.getElementById('subline'), flashEl = document.getElementById('flash'), speedEl = document.getElementById('speed'), speed2El = document.getElementById('speed2');
let flat = [], curChunk = -1;
const NODE_T = NODES.map(n => n[3]);

// ---------- frame ----------
const tv = new THREE.Vector3(), cp = new THREE.Vector3();
function update(t) {
  // camera
  const p = camPos(t), l = camLook(t);
  let sh = 0; for (const [te, a] of SHAKES) if (t > te) sh += a * Math.exp(-(t - te) * 7) * (t - te < 1.2 ? 1 : 0);
  const hand = 0.05 + 0.04 * (t > 4 ? 1 : 0);
  const jx = (Math.sin(t * 2.3) * hand + Math.sin(t * 37) * sh * 0.22), jy = (Math.cos(t * 1.9) * hand + Math.cos(t * 41) * sh * 0.22), jz = Math.sin(t * 1.3) * hand;
  camera.position.set(p[0] + jx, p[1] + jy, p[2] + jz); camera.lookAt(l[0], l[1], l[2]);
  let whip = 0; for (const [a, b, c, amp] of WHIPS) whip = Math.max(whip, bump(t, a, b, c) * amp);
  camera.fov = 38 + 9 * whip + 2.5 * sh; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  const scale = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); em.forEach(e => e.setScale(scale));

  world.update(t, V(l[0], l[1], l[2]));

  // orb
  const op = L.orbPos(t), os = Math.max(0, L.orbScale(t)), oc = L.orbColor(t);
  orb.position.copy(op); orb.visible = os > 0.001;
  const col = new THREE.Color(oc[0], oc[1], oc[2]);
  orbCore.material.color.copy(col).multiplyScalar(1.25); orbH1.material.color.copy(col).multiplyScalar(0.8); orbH2.material.color.copy(col);
  orbRing1.material.color.copy(col).multiplyScalar(1.2); orbRing2.material.color.copy(col).multiplyScalar(1.0);
  orbLight.color.copy(col); orbLight.intensity = 150 * os;
  const pulse = 1 + 0.07 * Math.sin(t * 8);
  orb.scale.setScalar(Math.max(os, 1e-4) * 1.15 * pulse);
  orbRing1.rotation.set(t * 2.2, t * 1.1, 0); orbRing2.rotation.set(1.2, t * -1.7, t * 0.9);
  orbRing1.visible = orbRing2.visible = L.orbColor(t)[2] > 0.5 || t > 17.5;

  em.forEach(e => e.update(t));

  // post
  let flash = 0.5 * bump(t, 1.5, 1.56, 1.9) + 0.35 * bump(t, 34.62, 34.7, 35.2) + 0.25 * bump(t, 20.45, 20.5, 20.9) + 0.45 * bump(t, 27.15, 27.2, 27.5) - 0.28 * bump(t, 37.15, 37.2, 37.6);
  grade.uniforms.uTime.value = t * 7.3; grade.uniforms.uBlur.value = whip; grade.uniforms.uAb.value = Math.min(1.2, whip * 1.3 + sh * 0.4);
  grade.uniforms.uFlash.value = flash * 0.55;
  bloom.strength = 0.6 + 0.5 * Math.max(0, flash) + 0.25 * whip;
  flashEl.style.opacity = Math.max(0, flash) * 0.0;
  speedEl.style.opacity = Math.min(1, whip * 0.55); speed2El.style.opacity = Math.min(1, whip * 0.4);
  speedEl.style.transform = `rotate(${t * 40}deg) scale(${1 + whip * 0.5})`; speed2El.style.transform = `rotate(${-t * 55}deg) scale(${1 + whip * 0.7})`;

  // tracker
  const hv = smooth(seg(t, 4.7, 5.2)) * (1 - smooth(seg(t, 35.8, 36.3)));
  hud.style.opacity = hv; hud.style.transform = `translateY(${(1 - hv) * -24}px)`;
  let prog = 0;
  if (t >= NODE_T[0]) { prog = 1; for (let i = 0; i < 5; i++) if (t < NODE_T[i + 1]) { prog = i + smooth(seg(t, NODE_T[i], NODE_T[i + 1])); break; } if (t >= NODE_T[5]) prog = 5; }
  fillEl.style.width = (prog / 5 * 100) + '%';
  nodeEls.forEach((el, i) => { const on = t >= NODE_T[i] - 0.1; el.classList.toggle('on', on); const pop = on ? 1 + 0.22 * Math.max(0, Math.exp(-(t - NODE_T[i]) * 6) * Math.cos((t - NODE_T[i]) * 14)) : 1; el.style.transform = `scale(${pop})`; });

  // callouts
  tagDefs.forEach(d => {
    const a = bump(t, d.t0, d.t0 + 0.35, d.t1 - 0.01) * (1 - smooth(seg(t, d.t1 - 0.3, d.t1))) + (t > d.t0 + 0.35 && t < d.t1 - 0.3 ? 1 - bump(t, d.t0, d.t0 + 0.35, d.t1 - 0.01) : 0);
    const vis = smooth(seg(t, d.t0, d.t0 + 0.3)) * (1 - smooth(seg(t, d.t1 - 0.3, d.t1)));
    d.el.style.opacity = vis; d.dot.style.opacity = vis; d.ln.style.opacity = vis; d.ring.style.opacity = vis * 0.8;
    if (vis > 0.002) {
      const a3 = d.a(t); tv.copy(a3); tv.project(camera);
      const ax = (tv.x * 0.5 + 0.5) * W, ay = (-tv.y * 0.5 + 0.5) * H;
      const px = Math.min(Math.max(ax + d.dx, 300), 780), py = Math.min(Math.max(ay + d.dy, 560), 1250);
      const pop = easeOutBack(seg(t, d.t0, d.t0 + 0.4));
      d.el.style.left = px + 'px'; d.el.style.top = (py + (1 - pop) * 30) + 'px'; d.el.style.transform = `translate(-50%,-100%) scale(${0.85 + 0.15 * pop})`;
      const ex = px, ey = py + (1 - pop) * 30;
      const grow = easeOutCubic(seg(t, d.t0 + 0.1, d.t0 + 0.55));
      const mx = lerp(ax, ex, 0.0), my = lerp(ay, ey, 0.0);
      const bendX = ax, bendY = ey + 8;
      const x2 = lerp(ax, ex, grow), y2 = lerp(ay, ey + 8, grow);
      d.ln.setAttribute('d', `M${ax},${ay} L${ax},${lerp(ay, bendY, grow)} ${grow > 0.99 ? `L${ex},${bendY}` : ''}`);
      d.dot.setAttribute('cx', ax); d.dot.setAttribute('cy', ay);
      d.ring.setAttribute('cx', ax); d.ring.setAttribute('cy', ay); d.ring.setAttribute('r', 14 + 22 * ((t * 1.4) % 1));
      d.ring.style.opacity = vis * 0.8 * (1 - ((t * 1.4) % 1));
    }
  });

  // voltage readout
  const vv = smooth(seg(t, 20.0, 20.4)) * (1 - smooth(seg(t, 35.8, 36.2)));
  voltEl.style.opacity = vv; voltEl.style.transform = `translateX(-50%) scale(${0.9 + 0.1 * vv})`;
  if (vv > 0.01) {
    const [v, cap] = voltAt(t);
    voltVal.textContent = v >= 1000 ? `${Math.round(v / 1000)} kV` : `${Math.round(v)} V`;
    voltCap.textContent = cap;
  }

  // subtitles (kinetic word pop)
  let idx = -1;
  for (let i = 0; i < flat.length; i++) if (t >= flat[i].show0 && t < flat[i].show1) { idx = i; break; }
  if (idx !== curChunk) { curChunk = idx; subEl.innerHTML = idx < 0 ? '' : flat[idx].words.map((w, k) => `<span class="w${w.key ? ' key' : ''}">${w.text}</span>`).join(' '); }
  if (idx >= 0) {
    const ch = flat[idx], fadeOut = 1 - smooth(seg(t, ch.show1 - 0.15, ch.show1));
    subEl.querySelectorAll('.w').forEach((s, k) => {
      const u = seg(t, ch.words[k].t0 - 0.06, ch.words[k].t0 + 0.16), e = easeOutBack(u);
      const key = ch.words[k].key ? 1 + 0.1 * Math.sin(Math.PI * seg(t, ch.words[k].t0, ch.words[k].t0 + 0.35)) : 1;
      s.style.opacity = (u > 0 ? 0.35 + 0.65 * smooth(seg(t, ch.words[k].t0 - 0.06, ch.words[k].t0 + 0.1)) : 0) * fadeOut;
      s.style.transform = `translateY(${(1 - e) * 22}px) scale(${(0.82 + 0.18 * e) * key})`;
      s.classList.toggle('on', t >= ch.words[k].t0 - 0.03);
    });
  }
}

window.__scene = scene; window.__sky = sky; window.__cam = camera;
window.__dbg = () => ({ p: camera.position.toArray().map(v => +v.toFixed(1)), fov: +camera.fov.toFixed(1), dir: camera.getWorldDirection(new THREE.Vector3()).toArray().map(v => +v.toFixed(2)) });
window.renderFrame = f => { update(f / FPS); composer.render(); };
window.__ready = (async () => {
  const timing = await (await fetch('/build/power/timing.json')).json();
  timing.lines.forEach(l => l.chunks.forEach(c => flat.push(c)));
  flat.sort((a, b) => a.t0 - b.t0);
  for (let k = 0; k < flat.length; k++) { const c = flat[k], nx = k + 1 < flat.length ? flat[k + 1].t0 : DUR; c.show0 = c.t0 - 0.08; c.show1 = Math.max(c.t1 + 0.25, Math.min(c.t1 + 0.5, nx - 0.03)); }
  await document.fonts.load('800 66px Poppins'); await document.fonts.load('600 26px Poppins'); await document.fonts.ready;
  return true;
})();
