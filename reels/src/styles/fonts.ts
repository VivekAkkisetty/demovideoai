import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/noto-sans-telugu/telugu-700.css";
import "@fontsource/noto-sans-telugu/telugu-800.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const FACES = [
  '800 64px "Poppins"',
  '700 64px "Poppins"',
  '800 64px "Noto Sans Telugu"',
  '700 64px "Noto Sans Telugu"',
];
// Telugu sample so the unicode-range subset is actually requested.
const SAMPLE = "అఆకక్షసముద్రం Aa";

/** Blocks rendering until bundled fonts are ready (needed before canvas-texture text). */
export const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading fonts"));

  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f, SAMPLE)))
      .catch(() => undefined)
      .then(() => setReady(true));
  }, []);

  // Release the lock in an effect so the `ready` render is committed before the frame is captured.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return ready;
};
