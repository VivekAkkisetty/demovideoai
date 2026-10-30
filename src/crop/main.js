// Entry: builds the 3D scene once, then draws it as a pure function of timeline time.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp01, seg, smooth, easeOutBack, easeOutCubic, lerp, makePath } from './lib.js';
import * as L from './layout.js';
import { buildWorld } from './world.js';
import { Emitter } from './fx.js';

const W = 1080, H = 1920, V = L.V, bump = L.bump;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xD8E6EA, 420, 1500);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 4000);

const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vP; void main(){ vec3 n = normalize(vP); float y = n.y;
    vec3 top = vec3(0.18,0.46,0.86), mid = vec3(0.52,0.76,0.95), hor = vec3(1.0,0.90,0.72), low = vec3(0.62,0.74,0.6);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.3, y)); c = mix(c, top, smoothstep(0.25, 0.9, y)); c = mix(c, low, 1.0 - smoothstep(-0.2, 0.0, y));
    vec3 sd = normalize(vec3(-0.55, 0.22, -0.8)); float g = max(dot(n, sd), 0.0); c += vec3(1.0,0.85,0.55) * (pow(g, 14.0) * 0.35 + pow(g, 250.0) * 1.6);
    gl_FragColor = vec4(c, 1.0); }`
}));
sky.renderOrder = -10; scene.add(sky);

const world = buildWorld(scene);

// ---------- particles ----------
const em = []; const E = o => { const e = new Emitter(scene, o); em.push(e); return e; };
const arr = v => [v.x, v.y, v.z];
E({ N: 80, life: 5, start: 0, end: 12, origin: [0, 4, 0], vel: [0.1, 0.25, 0.1], jitter: 11, spread: 2, size: [0.28, 0.12], c0: 0xFFF2B8, c1: 0xFFD98A, boost: 1.6, alpha: 0.8, additive: true, seed: 2 });
E({ N: 150, life: 0.9, start: 8.8, end: 13.5, seed: 4, size: [1.6, 0.3], boost: 2.2, alpha: 0.8, additive: true, jitter: 0.5, spread: 1.2, vel: [0, 0.4, 0], c0: 0xBFF6FF, c1: 0x36E0FF, origin: tb => arr(L.packetPos(tb)) });
E({ N: 90, life: 4, start: 13.4, end: 45, origin: [62, 66, -172], vel: [0, 5, 0], jitter: 6, spread: 4, size: [0.9, 0.2], c0: 0xBFF6FF, c1: 0x36E0FF, boost: 2.2, alpha: 0.7, additive: true, seed: 6 });
E({ N: 80, life: 0.7, start: 7.15, end: 7.55, origin: [-3.6, 3.4, -1.9], vel: [0, 0.5, 2], jitter: 0.3, spread: 3, size: [0.7, 0.1], c0: 0xFFFFFF, c1: 0xBFF6FF, boost: 2.6, alpha: 1, additive: true, seed: 8 });
E({ N: 130, life: 1.1, start: 13.3, end: 14.1, origin: [62, 46, -164], vel: [0, 2, 0], jitter: 1, spread: 15, size: [2.2, 0.3], c0: 0xFFFFFF, c1: 0x36E0FF, boost: 2.6, alpha: 1, additive: true, seed: 10 });
E({ N: 90, life: 0.8, start: 26.8, end: 27.4, origin: [L.BANK.x, 5.2, L.BANK.z + 1.5], vel: [0, 3, 1], jitter: 0.5, spread: 5, size: [0.9, 0.1], c0: 0xFFB0A0, c1: 0xFF3A2A, boost: 2.6, alpha: 1, additive: true, drift: [0, -9, 0], seed: 12 });
E({ N: 110, life: 1.0, start: 28.4, end: 29.2, origin: [L.BANK.x, 5.2, L.BANK.z + 1.5], vel: [0, 3, 1], jitter: 0.5, spread: 6, size: [0.9, 0.1], c0: 0xC8FFD8, c1: 0x2EE87A, boost: 2.6, alpha: 1, additive: true, drift: [0, -6, 0], seed: 14 });
E({ N: 120, life: 1.2, start: 30.6, end: 31.8, origin: [2.4, 5.6, 1.6], vel: [0, 1, 0], jitter: 2, spread: 7, size: [0.7, 0.1], c0: 0xFFF2B8, c1: 0xFFC84A, boost: 2.4, alpha: 1, additive: true, drift: [0, -3, 0], seed: 16 });
E({ N: 90, life: 0.8, start: 39.3, end: 39.9, origin: [62, 92, -166], vel: [0, 3, 1], jitter: 0.5, spread: 6, size: [1.0, 0.1], c0: 0xFFF2B8, c1: 0xFFB347, boost: 2.6, alpha: 1, additive: true, drift: [0, -8, 0], seed: 18 });

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.55, 1.05); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAb: { value: 0 }, uBlur: { value: 0 }, uVig: { value: 0.28 }, uFlash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAb, uBlur, uVig, uFlash; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){ vec2 c = vUv - 0.5; vec3 col = vec3(0.0);
    for (int i = 0; i < 8; i++) { float k = float(i) / 7.0; vec2 uv = vUv - c * uBlur * k * 0.16; vec2 o = c * uAb * 0.03 * (0.4 + k);
      col += vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
    col /= 8.0; float v = smoothstep(0.95, 0.2, length(c * vec2(1.0, 0.72))); col *= mix(1.0 - uVig, 1.0, v);
    col = mix(col, col * vec3(1.04, 1.0, 0.95), 0.5); col += uFlash + (h(vUv * vec2(1080.0, 1920.0) + uTime) - 0.5) * 0.02;
    gl_FragColor = vec4(col, 1.0); }`
});
composer.addPass(grade);

// ---------- camera ----------
const camPos = makePath([
  [0, -10, 440, 236], [3.4, -8, 130, 74], [4.0, -10, 60, 40], [5.2, -12, 9.5, 17], [6.8, -9, 6.8, 12.5], [7.4, -6.6, 4.9, 8.6], [9.0, -2, 6, 13],
  [9.6, -4, 8, 16], [10.8, 12, 28, -6], [12.2, 22, 40, -52], [13.3, 34, 44, -92], [13.55, 34, 44, -92], [14.8, 100, 58, -112],
  [16.0, 120, 150, -80], [18.5, 60, 210, 60], [21.6, 10, 300, 170],
  [22.2, -140, 60, 90], [22.9, -203.4, 2.5, 28.5], [23.2, -203.4, 2.5, 28.5], [26.0, -203.7, 2.6, 28], [27.2, -204.2, 2.9, 26.5], [28.9, -203.9, 2.6, 28], [29.1, -203.9, 2.6, 28],
  [29.9, -1.6, 5.4, 14.6], [30.1, -1.6, 5.4, 14.6], [31.5, -2.0, 5.5, 14.8], [34.5, -1.4, 5.6, 14.4], [36.4, 0, 7, 20], [36.9, 0, 7, 20],
  [37.2, 10, 70, -110], [37.5, 10, 70, -110], [38.8, 22, 92, -108], [40.6, 38, 98, -124],
  [41.8, 60, 100, -130], [43, 100, 190, -40], [45, 40, 250, 60]], 3);
const camLook = makePath([
  [0, 4, 0, -100], [3.4, 0, 0, 0], [4.0, 0, 2, -1], [5.2, -2.0, 2.5, -3], [6.8, -2.6, 2.8, -3.3], [7.4, -3.5, 3.0, -3.5], [9.0, -2, 3.2, -2.5],
  [9.6, 8, 10, -24], [10.8, 24, 30, -70], [12.2, 50, 46, -140], [13.3, 60, 44, -166], [13.55, 60, 44, -166], [14.8, 62, 46, -172],
  [16.0, 40, 0, -180], [18.5, 0, 0, -150], [21.6, 0, 0, -130],
  [22.2, -205, 5, 10], [22.9, -205, 3.2, 17], [23.2, -205, 3.2, 17], [26.0, -205, 3.4, 17], [27.2, -205, 3.7, 17], [28.9, -205, 3.4, 17], [29.1, -205, 3.4, 17],
  [29.9, 3.2, 4.4, -0.3], [30.1, 3.2, 4.4, -0.3], [31.5, 3.2, 4.5, -0.3], [34.5, 3.2, 4.6, -0.3], [36.4, 2.5, 4.6, 0], [36.9, 2.5, 4.6, 0],
  [37.2, 62, 70, -170], [37.5, 62, 70, -170], [38.8, 62, 90, -166], [40.6, 62, 96, -166],
  [41.8, 62, 80, -170], [43, 50, 20, -160], [45, 45, 0, -140]], 3);
const SHAKES = [[7.2, 0.25], [13.4, 0.7], [16.6, 0.2], [22.0, 0.5], [26.8, 0.8], [28.4, 0.5], [30.7, 0.3], [39.4, 0.7]];
const WHIPS = [[3.5, 3.9, 4.6, 0.55], [9.2, 9.6, 10.2, 0.5], [15.7, 16.0, 16.6, 0.4], [21.8, 22.2, 22.9, 0.55], [28.9, 29.4, 29.9, 0.6], [36.8, 37.1, 37.6, 0.5], [41.7, 42.0, 42.6, 0.3]];

// ---------- DOM: tags + counters ----------
const tags = [...document.querySelectorAll('.tag')].map(el => ({ el, a: el.dataset.anchor, t0: +el.dataset.t0, t1: +el.dataset.t1, dx: +el.dataset.dx, dy: +el.dataset.dy, c: el.style.getPropertyValue('--c') || '#7DF3FF' }));
const svg = document.getElementById('lines');
tags.forEach(d => {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('stroke', d.c); p.setAttribute('stroke-width', '3.5'); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); svg.appendChild(p); d.p = p;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '8'); c.setAttribute('fill', d.c); svg.appendChild(c); d.dot = c;
});
const cntNum = document.getElementById('cntNum'), idNum = document.getElementById('idNum');
const tv = new THREE.Vector3(), BAND = [190, 1290];

function update(t) {
  const p = camPos(t), l = camLook(t);
  let sh = 0; for (const [te, a] of SHAKES) if (t > te) sh += a * Math.exp(-(t - te) * 7) * (t - te < 1.2 ? 1 : 0);
  const hand = 0.04 + (t > 4 ? 0.03 : 0);
  camera.position.set(p[0] + Math.sin(t * 2.3) * hand + Math.sin(t * 37) * sh * 0.2, p[1] + Math.cos(t * 1.9) * hand + Math.cos(t * 41) * sh * 0.2, p[2] + Math.sin(t * 1.3) * hand);
  camera.lookAt(l[0], l[1], l[2]);
  let whip = 0; for (const [a, b, c, amp] of WHIPS) whip = Math.max(whip, bump(t, a, b, c) * amp);
  camera.fov = 38 + 8 * whip + 2 * sh; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  const scale = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); em.forEach(e => { e.setScale(scale); e.update(t); });
  world.update(t, V(l[0], l[1], l[2]), camera);

  grade.uniforms.uTime.value = t * 7.3; grade.uniforms.uBlur.value = whip; grade.uniforms.uAb.value = Math.min(1, whip * 1.2 + sh * 0.4);
  const flash = 0.18 * bump(t, 7.17, 7.2, 7.45) + 0.12 * bump(t, 13.3, 13.35, 13.8) + 0.1 * bump(t, 28.4, 28.45, 28.9);
  grade.uniforms.uFlash.value = flash; bloom.strength = 0.45 + 0.8 * flash + 0.2 * whip;

  // tags
  for (const d of tags) {
    const vis = smooth(seg(t, d.t0, d.t0 + 0.3)) * (1 - smooth(seg(t, d.t1 - 0.3, d.t1)));
    d.p.style.opacity = d.dot.style.opacity = vis;
    if (vis < 0.01) continue;
    tv.copy(world.anchors[d.a]); tv.project(camera);
    const ax = (tv.x * 0.5 + 0.5) * W, ay = (-tv.y * 0.5 + 0.5) * H;
    const px = Math.min(Math.max(ax + d.dx, 270), 810), py = Math.min(Math.max(ay + d.dy, BAND[0] + 215), BAND[1] - 20);
    d.el.style.left = px + 'px'; d.el.style.top = py + 'px';
    const g = easeOutCubic(seg(t, d.t0 + 0.1, d.t0 + 0.55));
    d.p.setAttribute('d', `M${ax},${ay} L${ax},${lerp(ay, py + 6, g)} ${g > 0.99 ? `L${px},${py + 6}` : ''}`);
    d.dot.setAttribute('cx', ax); d.dot.setAttribute('cy', ay);
  }
  // counters
  cntNum.textContent = Math.round(30 * easeOutCubic(seg(t, 16.8, 21.6)));
  idNum.textContent = Math.round(10 * easeOutCubic(seg(t, 31.9, 34.4)));
}

window.CROP = { render(t) { update(t); composer.render(); } };
window.CROP.render(0);
