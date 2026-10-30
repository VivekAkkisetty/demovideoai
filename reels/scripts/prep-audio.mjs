// Usage: node scripts/prep-audio.mjs <voiceover.(mp4|mp3|wav|m4a)>
// Writes public/voiceover.mp3 and src/data/airplane-oxygen.timing.json (duration + pauses),
// which the composition uses to snap scene changes to the narration.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) throw new Error("pass the voiceover file path");
const mp3 = resolve(root, "public/voiceover.mp3");
mkdirSync(dirname(mp3), { recursive: true });
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "128k", mp3]);

const duration = parseFloat(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).toString(),
);
const log = spawnSync("ffmpeg", ["-i", mp3, "-af", "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"]).stderr.toString();
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const silences = starts.map((s, i) => ({ start: +s.toFixed(2), end: +(ends[i] ?? duration).toFixed(2) }));

const out = resolve(root, "src/data/airplane-oxygen.timing.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ duration: +duration.toFixed(3), silences }, null, 2) + "\n");
console.log(`duration ${duration.toFixed(2)}s, ${silences.length} pauses -> ${out}`);
