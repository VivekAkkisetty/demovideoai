import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, safeArea, typography } from "../../styles/theme";

export type TimedWord = { text: string; start: number; end: number };

type Props = {
  words: TimedWord[];
  /** Max words per on-screen phrase. */
  maxWords?: number;
  /** A silence longer than this (s) always starts a new phrase. */
  maxGap?: number;
  fontSize?: number;
  /** `pill` = rounded dark backdrop, `stroke` = high-contrast outlined text only. */
  variant?: "pill" | "stroke";
  activeColor?: string;
};

type Phrase = { words: TimedWord[]; start: number; end: number };

const chunk = (words: TimedWord[], maxWords: number, maxGap: number): Phrase[] => {
  const out: Phrase[] = [];
  let cur: TimedWord[] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (prev && w.start - prev.end > maxGap) flush();
    cur.push(w);
    if (cur.length >= maxWords || /[.!?]$/.test(w.text)) flush();
  });
  flush();
  return out;
};

/**
 * Word-by-word social-reel captions. Timing comes from JSON timestamps
 * ({ text, start, end } in seconds); works for any script (Telugu, English, mixed).
 * The active word scale-pops and highlights; spoken words stay white, upcoming dim.
 */
export const KineticSubtitles: React.FC<Props> = ({
  words,
  maxWords = 4,
  maxGap = 0.3,
  fontSize = 84,
  variant = "pill",
  activeColor = palette.accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const phrases = useMemo(() => chunk(words, maxWords, maxGap), [words, maxWords, maxGap]);

  const phrase = phrases.find((p) => t >= p.start - 0.12 && t < p.end + 0.3);
  if (!phrase) return null;

  const enter = spring({ frame: frame - Math.round((phrase.start - 0.12) * fps), fps, config: { damping: 14, stiffness: 180 } });
  const exit = interpolate(t, [phrase.end + 0.12, phrase.end + 0.3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stroke =
    variant === "stroke"
      ? { WebkitTextStroke: `${fontSize * 0.11}px ${palette.ink}`, paintOrder: "stroke fill" as const }
      : { textShadow: "0 4px 0 rgba(0,0,0,0.35)" };

  return (
    <div
      style={{
        position: "absolute",
        left: safeArea.side,
        right: safeArea.side,
        bottom: safeArea.bottom,
        display: "flex",
        justifyContent: "center",
        opacity: exit,
        transform: `translateY(${(1 - enter) * 40}px) scale(${0.9 + 0.1 * enter})`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${fontSize * 0.05}px ${fontSize * 0.36}px`,
          padding: variant === "pill" ? `${fontSize * 0.28}px ${fontSize * 0.5}px` : 0,
          borderRadius: fontSize * 0.7,
          background: variant === "pill" ? "rgba(14,16,32,0.78)" : "transparent",
          backdropFilter: variant === "pill" ? "blur(6px)" : undefined,
          fontFamily: typography.display,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.4,
          textAlign: "center",
        }}
      >
        {phrase.words.map((w, i) => {
          const startF = Math.round(w.start * fps);
          const spoken = t >= w.start;
          const active = spoken && (t < w.end || (i === phrase.words.length - 1 && t < phrase.end + 0.3));
          const pop = spring({ frame: frame - startF, fps, config: { damping: 9, stiffness: 260, mass: 0.6 } });
          const scale = spoken ? (active ? 0.92 + 0.2 * pop : 1) : 0.92;
          return (
            <span
              key={`${w.start}-${i}`}
              style={{
                display: "inline-block",
                color: active ? activeColor : "#FFFFFF",
                opacity: spoken ? 1 : 0.5,
                transform: `scale(${scale})`,
                ...stroke,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
