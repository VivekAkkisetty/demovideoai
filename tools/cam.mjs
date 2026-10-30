// Print camera position/direction at given times (debug aid): PAGE=src/power/index.html node tools/cam.mjs 40 42 44.6
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright'); const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
await new Promise(r => srv.once('listening', r));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(`http://127.0.0.1:${srv.address().port}/${process.env.PAGE}`); await pg.evaluate(() => window.__ready);
for (const t of process.argv.slice(2).map(Number)) { await pg.evaluate(f => window.renderFrame(f), Math.round(t * 30)); console.log(t, JSON.stringify(await pg.evaluate(() => window.__dbg()))); }
await b.close(); srv.close();
