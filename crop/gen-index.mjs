// Writes crop/index.html: root composition, HUD, callout tags, counters and timed captions (from script + timing).
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'src/crop/script.json'), 'utf8')).lines;
const timing = JSON.parse(fs.readFileSync(path.join(root, 'build/crop/timing.json'), 'utf8')).lines;
const DUR = 45, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CY = '#7DF3FF', AM = '#FFB347', RD = '#FF5A4A', GR = '#2EE87A', GD = '#FFD58A';
const TAGS = [
  ['enum', 'SURVEY TEAM', 'visits your field', CY, 'enumHead', 5.9, 8.0, 230, -200],
  ['photo', 'PHOTO + GPS', 'crop, plot and location', CY, 'phone', 7.6, 9.8, 240, -250],
  ['reg', 'REGISTRY', 'one record per plot', CY, 'towerSlab', 13.6, 16.3, -200, -120],
  ['claim', 'CLAIM: 10 ACRES', 'example loan form', AM, 'claim', 24.6, 27.4, -150, -40],
  ['rcard', 'REGISTRY: 4 ACRES', 'actually sown', CY, 'reg', 25.3, 27.7, 150, -40],
  ['bad', 'DOES NOT MATCH', 'loan on hold', RD, 'cross', 26.9, 28.0, 0, -150],
  ['good', 'MATCHES', 'loan can go ahead', GR, 'cross', 28.5, 29.7, 0, -150],
  ['lock', 'WHO SEES THIS DATA?', 'answer in the next reel', AM, 'lock', 38.3, 43.4, 0, -80],
];
const PILLS = [['PM-KISAN', 32.2, 300, 480], ['CROP INSURANCE', 32.7, 780, 480], ['FERTILISER SUBSIDY', 33.2, 300, 566], ['KCC LOAN', 33.7, 780, 566]];
const STEPS = [['SURVEY', 4.5], ['PHOTO + GPS', 7.3], ['REGISTRY', 13.3], ['USE', 22.6]];

// caption windows
const flat = []; timing.forEach((l, li) => l.chunks.forEach(c => flat.push({ ...c, li })));
flat.sort((a, b) => a.t0 - b.t0);
flat.forEach((c, k) => { const nxt = flat[k + 1], prv = flat[k - 1], first = !prv || prv.li !== c.li; c.s0 = first ? Math.max(0, +(c.t0 - 0.08).toFixed(3)) : +c.t0.toFixed(3); c.s1 = nxt && nxt.li === c.li ? +nxt.t0.toFixed(3) : +Math.min(DUR, Math.max(c.t1 + 0.25, Math.min(c.t1 + 0.5, nxt ? nxt.t0 - 0.1 : DUR))).toFixed(3); });
let capHtml = '', capJs = '';
flat.forEach((c, k) => {
  const words = c.words.map((w, i) => `<span class="w${w.key ? ' key' : ''}" id="w${k}_${i}">${esc(w.text)}</span>`).join(' ');
  capHtml += `\n    <div class="cap clip" id="cap${k}" data-start="${c.s0}" data-duration="${(c.s1 - c.s0).toFixed(3)}">${words}</div>`;
  c.words.forEach((w, i) => { capJs += `tl.fromTo("#w${k}_${i}", { opacity: 0, y: 26, scale: 0.82 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "back.out(2.2)" }, ${Math.max(0, w.t0 - 0.06).toFixed(3)});\n`; if (w.key) capJs += `tl.fromTo("#w${k}_${i}", { color: "#ffffff" }, { color: "#FF9933", duration: 0.12, ease: "none" }, ${w.t0.toFixed(3)});\n`; });
  capJs += `tl.to("#cap${k}", { opacity: 0, duration: 0.14 }, ${(c.s1 - 0.16).toFixed(3)});\n`;
});
// English line per script line
let enHtml = '';
script.forEach((s, li) => {
  const cs = flat.filter(c => c.li === li); const a = cs[0].s0, b = cs[cs.length - 1].s1;
  enHtml += `\n    <div class="en clip" id="en${li}" data-start="${a}" data-duration="${(b - a).toFixed(3)}">${esc(s.en)}</div>`;
  capJs += `tl.fromTo("#en${li}", { opacity: 0, y: 10 }, { opacity: 0.92, y: 0, duration: 0.25, ease: "power2.out" }, ${a});\ntl.to("#en${li}", { opacity: 0, duration: 0.14 }, ${(b - 0.16).toFixed(3)});\n`;
});

const tagHtml = TAGS.map(([id, m, s, c, a, t0, t1, dx, dy]) => `\n    <div class="tag" id="tag_${id}" data-anchor="${a}" data-t0="${t0}" data-t1="${t1}" data-dx="${dx}" data-dy="${dy}" style="--c:${c}"><div class="tagin" id="tagin_${id}"><div class="m">${m}</div>${s ? `<div class="s">${s}</div>` : ''}</div></div>`).join('');
const tagJs = TAGS.map(([id, , , , , t0, t1]) => `tl.fromTo("#tagin_${id}", { opacity: 0, y: 18, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.8)" }, ${t0});\ntl.to("#tagin_${id}", { opacity: 0, y: -10, duration: 0.25 }, ${(t1 - 0.28).toFixed(2)});`).join('\n');
const pillHtml = PILLS.map(([n, , x, y], i) => `\n  <div class="pill" id="pill${i}" style="left:${x}px;top:${y}px">${n}</div>`).join('');
const pillJs = PILLS.map(([, t], i) => `tl.fromTo("#pill${i}", { opacity: 0, y: 16, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});\ntl.to("#pill${i}", { opacity: 0, duration: 0.25 }, 36.1);`).join('\n');
const stepHtml = STEPS.map(([n], i) => `<div class="step" id="step${i}">${n}</div>`).join('');
const stepJs = STEPS.map(([, t], i) => `tl.to("#step${i}", { backgroundColor: "rgba(54,224,255,0.9)", color: "#06232B", scale: 1.06, duration: 0.25, ease: "back.out(2)" }, ${t});\ntl.to("#step${i}", { scale: 1, duration: 0.3 }, ${t + 0.25});`).join('\n');
const hasSfx = fs.existsSync(path.join(root, 'crop/assets/crop-sfx.wav'));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="lib/gsap.min.js"></script>
<style>
  @font-face { font-family: 'PoppinsLocal'; font-weight: 800; src: url('assets/fonts/poppins-800.woff2') format('woff2'); }
  @font-face { font-family: 'PoppinsLocal'; font-weight: 600; src: url('assets/fonts/poppins-600.woff2') format('woff2'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; background: #0d1f26; }
  #root { position: absolute; inset: 0; font-family: 'PoppinsLocal', 'Poppins', sans-serif; color: #fff; }
  #stage3d { position: absolute; inset: 0; }
  #gl { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
  #lines { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; pointer-events: none; }
  /* tracker (inside the 168px-1330px safe band) */
  #hud { position: absolute; left: 90px; top: 196px; width: 900px; display: flex; gap: 12px; }
  .step { flex: 1; text-align: center; padding: 12px 4px; border-radius: 30px; font-weight: 800; font-size: 25px; letter-spacing: .4px; background: rgba(8,32,40,.72); border: 2px solid rgba(125,243,255,.45); color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
  .tag { position: absolute; transform: translate(-50%, -100%); white-space: nowrap; }
  .tagin { padding: 12px 24px 12px 20px; border-radius: 16px; background: rgba(8,32,40,.80); border-left: 8px solid var(--c); box-shadow: 0 8px 26px rgba(0,0,0,.4); opacity: 0; }
  .tagin .m { font-weight: 800; font-size: 40px; line-height: 1.05; }
  .tagin .s { font-weight: 600; font-size: 25px; color: var(--c); filter: brightness(1.12); }
  .pill { position: absolute; transform: translateX(-50%); white-space: nowrap; padding: 10px 24px; border-radius: 28px; font-weight: 800; font-size: 31px; color: #3A2600; background: #FFD58A; border: 3px solid rgba(255,255,255,.7); box-shadow: 0 6px 18px rgba(0,0,0,.35); opacity: 0; }
  .big { position: absolute; left: 50%; top: 292px; transform: translateX(-50%); text-align: center; opacity: 0; }
  .big .n { font-weight: 800; font-size: 118px; line-height: 1; color: #7DF3FF; text-shadow: 0 0 28px rgba(125,243,255,.65), 0 4px 10px rgba(0,0,0,.5); -webkit-text-stroke: 6px rgba(6,30,38,.65); paint-order: stroke fill; }
  .big .l { margin-top: 2px; font-weight: 800; font-size: 34px; text-shadow: 0 3px 8px rgba(0,0,0,.7); -webkit-text-stroke: 5px rgba(6,30,38,.6); paint-order: stroke fill; }
  #idbig .n { color: #FFD58A; text-shadow: 0 0 28px rgba(255,213,138,.65), 0 4px 10px rgba(0,0,0,.5); }
  /* captions: bottom of the safe band */
  #caps { position: absolute; left: 70px; width: 940px; top: 1080px; height: 170px; display: flex; align-items: flex-end; justify-content: center; }
  .cap { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-weight: 800; font-size: 64px; line-height: 1.12; color: #fff; text-shadow: 0 4px 8px rgba(4,20,26,.6); -webkit-text-stroke: 10px rgba(5,24,30,.8); paint-order: stroke fill; }
  .cap .w { display: inline-block; opacity: 0; }
  .en { position: absolute; left: 100px; width: 880px; top: 1262px; text-align: center; font-weight: 600; font-size: 33px; line-height: 1.15; color: #E9F8FF; opacity: 0; text-shadow: 0 2px 6px rgba(4,20,26,.8); -webkit-text-stroke: 6px rgba(5,24,30,.7); paint-order: stroke fill; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="1080" data-height="1920">
  <canvas id="gl" class="clip" data-start="0" data-duration="${DUR}" width="1080" height="1920"></canvas>
  <svg id="lines" viewBox="0 0 1080 1920"></svg>
  <div id="hud">${stepHtml}</div>
  <div id="cnt" class="big"><div class="n"><span id="cntNum">0</span> <span style="font-size:60px">CRORE+</span></div><div class="l">plots surveyed in one season</div></div>
  ${pillHtml}
  <div id="idbig" class="big"><div class="n"><span id="idNum">0</span> <span style="font-size:60px">CRORE+</span></div><div class="l">Farmer IDs created</div></div>${tagHtml}
  <div id="caps">${capHtml}</div>${enHtml}
${hasSfx ? '  <audio id="sfx" src="assets/crop-sfx.wav" data-start="0" data-duration="' + DUR + '" data-volume="1"></audio>\n' : ''}</div>
<script src="lib/crop3d.js"></script>
<script>
  window.addEventListener("hf-seek", (e) => window.CROP.render(e.detail.time));
  const tl = gsap.timeline({ paused: true });
  tl.to({}, { duration: ${DUR} }, 0);
  tl.fromTo("#hud", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4 }, 4.2); tl.to("#hud", { opacity: 0, duration: 0.3 }, 36.2);
${stepJs}
  tl.fromTo("#cnt", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 16.6); tl.to("#cnt", { opacity: 0, duration: 0.3 }, 22.2);
  tl.fromTo("#idbig", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 31.8); tl.to("#idbig", { opacity: 0, duration: 0.3 }, 36.2);
${tagJs}
${pillJs}
${capJs}
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'crop/index.html'), html);
console.log('index.html written:', TAGS.length, 'tags,', flat.length, 'caption groups, sfx', hasSfx);
