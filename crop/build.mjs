// Bundles the Three.js scene to lib/crop3d.js and (re)writes index.html from src/crop/script.json + timing.
import { build } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'crop');
fs.mkdirSync(path.join(out, 'lib'), { recursive: true }); fs.mkdirSync(path.join(out, 'assets/fonts'), { recursive: true });
await build({ entryPoints: [path.join(root, 'src/crop/main.js')], bundle: true, format: 'iife', outfile: path.join(out, 'lib/crop3d.js'), minify: false, target: 'es2020', alias: { three: path.join(root, 'node_modules/three/build/three.module.js'), 'three/addons': path.join(root, 'node_modules/three/examples/jsm') }, logLevel: 'warning' });
fs.copyFileSync(path.join(root, 'node_modules/gsap/dist/gsap.min.js'), path.join(out, 'lib/gsap.min.js'));
for (const w of [600, 800]) fs.copyFileSync(path.join(root, `node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`), path.join(out, `assets/fonts/poppins-${w}.woff2`));
console.log('bundled', (fs.statSync(path.join(out, 'lib/crop3d.js')).size / 1e6).toFixed(2), 'MB');
