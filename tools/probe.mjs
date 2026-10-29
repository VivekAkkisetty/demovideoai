// Render a list of times (seconds) to frames_test/ for visual review.
import { execFileSync } from 'node:child_process';
const times = process.argv.slice(2).map(Number);
for (const t of times) execFileSync('node', ['tools/render.mjs', String(Math.round(t * 30)), String(Math.round(t * 30) + 1), 'frames_test'], { stdio: 'inherit' });
