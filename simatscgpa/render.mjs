// Frame-accurate render of index.html: seek window.__timelines.root to each frame's time,
// screenshot, and pipe the frames into ffmpeg. Usage:
//   node simatscgpa/render.mjs [out.mp4] [--at 1.5,9,15]   (--at writes stills instead)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // globally installed
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30, DURATION = 24, W = 1920, H = 1080, WORKERS = 4;
const args = process.argv.slice(2);
const atIdx = args.indexOf('--at');
const url = pathToFileURL(path.join(here, 'index.html')).href;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(url);
  await page.waitForFunction(() => window.__timelines?.root && document.fonts.status === 'loaded');
  return page;
}
const seek = (page, t) => page.evaluate(t => { window.__timelines.root.seek(t, false); }, t);

const browser = await chromium.launch();
if (atIdx >= 0) {
  const page = await openPage(browser);
  fs.mkdirSync(path.join(here, 'stills'), { recursive: true });
  for (const t of args[atIdx + 1].split(',').map(Number)) {
    await seek(page, t);
    await page.screenshot({ path: path.join(here, 'stills', `t${t.toFixed(2)}.png`) });
  }
} else {
  const out = path.resolve(args[0] || path.join(here, 'out', 'simatscgpa-video.mp4'));
  const total = FPS * DURATION;
  const tmp = path.join(here, '.frames');
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  let done = 0;
  // Each worker renders an interleaved slice of frames to JPEG on disk.
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = await openPage(browser);
    for (let f = w; f < total; f += WORKERS) {
      await seek(page, f / FPS);
      await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
      if (++done % 60 === 0) process.stdout.write(`\r${done}/${total} frames`);
    }
  }));
  console.log(`\rrendered ${total} frames`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const audio = path.join(here, 'out', 'soundtrack.wav');
  const ff = ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg')];
  if (fs.existsSync(audio)) ff.push('-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
  await new Promise((res, rej) => spawn('ffmpeg', ff, { stdio: ['ignore', 'ignore', 'inherit'] }).on('exit', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('wrote', out);
}
await browser.close();
