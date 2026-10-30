import timing from "../data/airplane-oxygen.timing.json";
import type { CameraKeyframe } from "../components/3d";
import type { TimedWord } from "../components/ui";

export const FPS = 30;
export const AUDIO_SRC = "voiceover.mp3";
export const AUDIO_SECONDS: number = timing.duration;

/** Scene starts from the brief (seconds); each is pulled to the nearest narration pause within SNAP s. */
const BRIEF = { myth: 6, reveal: 14, mechanism: 23, reaction: 32, outro: 40 } as const;
const SNAP = 2;
const pauseEnds = timing.silences.filter((s) => s.start > 1).map((s) => s.end);
const snap = (t: number) => {
  const best = pauseEnds.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), Infinity);
  return Math.abs(best - t) <= SNAP ? best : t;
};

export const T = {
  hook: 0,
  myth: snap(BRIEF.myth),
  reveal: snap(BRIEF.reveal),
  mechanism: snap(BRIEF.mechanism),
  reaction: snap(BRIEF.reaction),
  outro: snap(BRIEF.outro),
  end: AUDIO_SECONDS,
};
export const sec = (s: number) => Math.round(s * FPS);

// Mechanism beats (seconds)
export const MECH = {
  hatchOpen: 0.9,
  maskDrop: 1.15,
  pullStart: T.mechanism + 0.9,
  pullEnd: T.mechanism + 2.1,
  strike: T.mechanism + 2.5,
  glowStart: T.mechanism + 2.7,
};

export const CAMERA: CameraKeyframe[] = [
  { frame: sec(0), position: [3, 2.4, 29], target: [0.2, 1.0, 0], fov: 30 },
  { frame: sec(T.myth), position: [2, 2.6, 26], target: [0, 1.5, 0], fov: 30 },
  { frame: sec(T.myth + 1.9), position: [-0.9, 4.1, 14.5], target: [-1.1, 3.4, 0], fov: 30 },
  { frame: sec(T.reveal), position: [-0.8, 4.0, 14], target: [-1.0, 3.4, 0], fov: 30 },
  { frame: sec(T.reveal + 1.6), position: [0.65, 3.75, 7.2], target: [0.3, 3.1, 0], fov: 30 },
  { frame: sec(T.mechanism - 0.9), position: [0.65, 3.75, 7.0], target: [0.3, 3.1, 0], fov: 30 },
  { frame: sec(T.mechanism + 0.7), position: [0.35, 3.3, 3.7], target: [0.3, 3.1, 0], fov: 30 },
  { frame: sec(T.reaction - 0.2), position: [0.35, 3.3, 3.7], target: [0.3, 3.1, 0], fov: 30 },
  { frame: sec(T.reaction + 2.0), position: [0.6, 2.35, 10], target: [0.3, 2.15, 0], fov: 30 },
  { frame: sec(T.outro), position: [0.6, 2.35, 10.5], target: [0.3, 2.15, 0], fov: 30 },
  { frame: sec(T.outro + 1.3), position: [4, 3.5, 36], target: [1, 1, 0], fov: 30 },
  { frame: sec(T.outro + 2.8), position: [8, 4, 90], target: [3, -1, 0], fov: 30 },
  { frame: sec(T.end), position: [14, 3, 175], target: [5, -5, 0], fov: 30 },
];

// ---- Captions: Tenglish narration transcript, spread over the speech windows of the audio ---
export const TRANSCRIPT: string[] = [
  "Flight 35,000 feet height lo unnappudu, sudden ga mee mundhu ee yellow oxygen masks drop aythe... aa oxygen ekkadi nunchi vasthundho meeku thelusa?",
  "Chala mandhi plane lo pedda oxygen tanks untayi anukuntaru. Kaani fact enti ante... plane lo asalu oxygen cylinders eh undavu!",
  "Mee seat paina unna panel lo oka chinna metal canister untundi. Dheenine 'Chemical Oxygen Generator' antaru.",
  "Mask ni meeru kindhaki laaginappudu, oka firing pin release ayyi, canister loni Sodium Chlorate and Iron ni ignite chesthundi.",
  "Aa chemical reaction valla 450 degree Celsius heat tho paatu pure oxygen gas produce avtundi. Idi meeku sarigga 15 minutes oxygen istundi.",
  "Ee 15 minutes lo pilot flight ni safe altitude ki theesukostharu! Inka ilanti engineering facts kosam, follow cheyyandi.",
];

/** Speech windows = gaps between detected pauses (leading/trailing silence excluded). */
const speechWindows = (() => {
  const inner = timing.silences.filter((x) => x.start > 0.5 && x.end < timing.duration - 0.05 && x.start < timing.duration - 1.2);
  const lead = timing.silences.find((x) => x.start < 0.1)?.end ?? 0;
  const tail = timing.silences.filter((x) => x.start >= timing.duration - 1.2).map((x) => x.start);
  const out: { a: number; b: number }[] = [];
  let a = lead;
  for (const g of inner) {
    out.push({ a, b: g.start });
    a = g.end;
  }
  out.push({ a, b: tail.length ? Math.min(...tail) : timing.duration });
  return out.filter((w) => w.b - w.a > 0.1);
})();

/** Which narration paragraphs sit in which speech windows (matches the pauses in the recording). */
const GROUPS: { paras: number[]; windows: number[] }[] = [
  { paras: [0], windows: [0] },
  { paras: [1], windows: [1] },
  { paras: [2, 3], windows: [2] },
  { paras: [4, 5], windows: [3, 4] },
];

const spread = (toks: string[], windows: { a: number; b: number }[]): TimedWord[] => {
  const wt = toks.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5);
  const total = wt.reduce((a, b) => a + b, 0);
  const speech = windows.reduce((n, w) => n + (w.b - w.a), 0);
  const at = (u: number) => {
    let rest = u;
    for (const w of windows) {
      if (rest <= w.b - w.a) return w.a + rest;
      rest -= w.b - w.a;
    }
    return windows[windows.length - 1].b;
  };
  let acc = 0;
  return toks.map((text, i) => {
    const start = at((acc / total) * speech);
    acc += wt[i];
    return { text, start: +start.toFixed(3), end: +at((acc / total) * speech).toFixed(3) };
  });
};

export const WORDS: TimedWord[] = GROUPS.flatMap((g) =>
  spread(
    g.paras.flatMap((p) => TRANSCRIPT[p].split(/\s+/)),
    g.windows.map((i) => speechWindows[i]),
  ),
);
