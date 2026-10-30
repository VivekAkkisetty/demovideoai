import timing from "../data/airplane-oxygen.timing.json";
import type { CameraKeyframe } from "../components/3d";
import type { TimedWord } from "../components/ui";
import aligned from "../data/airplane-oxygen.words.json";

export const FPS = 30;
export const AUDIO_SRC = "voiceover.mp3";
export const AUDIO_SECONDS: number = timing.duration;

/** Word-level timings from `npm run align:captions` (scripts/align-captions.py). */
export const WORDS: TimedWord[] = aligned.words;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N},]/gu, "").replace(/,+$/, "");
/** Start (s) of the nth spoken occurrence of a word; the scene cues below hang off the narration itself. */
const at = (word: string, nth = 0) => {
  const hit = WORDS.filter((w) => norm(w.text) === norm(word))[nth];
  if (!hit) throw new Error(`word "${word}" not found in captions`);
  return hit.start;
};
const endOf = (word: string, nth = 0) => WORDS.filter((w) => norm(w.text) === norm(word))[nth].end;

export const T = {
  hook: 0,
  myth: at("aa") - 0.1, // "...aa oxygen ekkadi nunchi vasthundho" -> camera heads for the ceiling
  tanks: at("tanks"), // "pedda oxygen tanks"
  strike: at("asalu"), // "plane lo asalu oxygen cylinders eh undavu!" -> red X
  reveal: at("Mee", 1) - 0.2, // "Mee seat paina unna panel lo..."
  generator: at("Dheenine"), // "Chemical Oxygen Generator"
  generatorEnd: endOf("antaru"),
  mechanism: at("Mask") - 0.3, // "Mask ni meeru kindhaki laaginappudu"
  chemicals: at("Sodium"),
  ignite: at("ignite"),
  reaction: at("chemical", 1) - 0.1, // "Aa chemical reaction valla 450 degree Celsius"
  heat: at("450"),
  flow: at("pure"), // "pure oxygen gas produce avtundi"
  minutes: at("15"), // "sarigga 15 minutes oxygen"
  outro: at("pilot"), // "Ee 15 minutes lo pilot flight ni safe altitude ki..."
  follow: at("follow"),
  altitudeWord: at("35,000"),
  end: AUDIO_SECONDS,
};
export const sec = (s: number) => Math.round(s * FPS);

// Mechanism beats (seconds)
export const MECH = {
  maskDrop: at("drop"),
  hatchOpen: at("drop") - 0.25,
  pullStart: at("laaginappudu"),
  pullEnd: at("laaginappudu") + 1.2,
  strike: at("release") + 0.25,
  glowStart: T.ignite,
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

