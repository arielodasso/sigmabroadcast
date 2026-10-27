import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";
import type { Locale, LocalizedText } from "./types";

export const COLORS = {
  ink: "#080808",
  inkSoft: "#111111",
  paper: "#f4f4f4",
  white: "#ffffff",
  muted: "#a8a8aa",
  muted2: "#727276",
  line: "rgba(255, 255, 255, 0.16)",
  lineStrong: "rgba(255, 255, 255, 0.34)",
  gold: "#f5c518",
  goldSoft: "rgba(245, 197, 24, 0.16)",
} as const;

export const FONT =
  '"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, sans-serif';

export const MONO = '"Cascadia Code", Consolas, "SF Mono", monospace';

export function pick(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] ?? text.en ?? text.es ?? "";
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function reveal(
  frame: number,
  delay = 0,
  duration = 16,
  from = 0,
  to = 1,
): number {
  return interpolate(frame, [delay, delay + duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

export function sceneOpacity(
  frame: number,
  durationInFrames: number,
  inFrames = 10,
  outFrames = 10,
): number {
  const inOpacity =
    inFrames > 0
      ? interpolate(frame, [0, inFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  if (outFrames <= 0) return inOpacity;
  const outOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - outFrames), durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return Math.min(inOpacity, outOpacity);
}

export function rise(progress: number, distance = 20): CSSProperties {
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`,
  };
}

export function slideX(progress: number, distance = 32): CSSProperties {
  return {
    opacity: progress,
    transform: `translateX(${(1 - progress) * distance}px)`,
  };
}
