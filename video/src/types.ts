export type Locale = "en" | "es";

export interface LocalizedText {
  en?: string;
  es?: string;
}

export interface SentenceTiming {
  file: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: LocalizedText;
}

export interface SceneVisual {
  type: string;
  src?: string;
  fit?: "cover" | "contain";
  panel?: boolean | string;
  stage?: string;
  controls?: string;
  overlay?: string;
  left?: string;
  right?: string;
  leftLabel?: LocalizedText;
  rightLabel?: LocalizedText;
}

export interface SceneData {
  id: string;
  startMs: number;
  endMs: number;
  visual: SceneVisual;
  badgeKind?: "real" | "illustration" | "closing" | string;
  badge?: LocalizedText;
  title: LocalizedText;
  source: LocalizedText;
  sentences: SentenceTiming[];
}

export interface VideoTimings {
  id: string;
  fps: number;
  width: number;
  height: number;
  spokenLocale: Locale;
  durationMs: number;
  durationInFrames: number;
  leadInMs?: number;
  tailMs?: number;
  scenes: SceneData[];
}
