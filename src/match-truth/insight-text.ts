import type { MatchEvent, MatchInsight } from "../contracts";
import { t, type Locale, type TranslationVars } from "../i18n";
import { TEAMS } from "../simulation/roster";

/**
 * Rule constants shared by the detectors and by the localisation layer.
 *
 * They live here so that the English text rendered by a detector and the text
 * rendered later for another locale always come from the same thresholds.
 */
export const PASS_SEQUENCE_THRESHOLD = 3;
export const PRESSURE_WINDOW_MS = 45_000;
export const PRESSURE_MIN_EVENTS = 2;
export const PRESSURE_MIN_INTENSITY = 0.7;
export const ADVANCED_RECOVERY_WINDOW_MS = 45_000;

/**
 * Stable identifier of a message family. The suffix of an insight id maps to
 * one of these keys, which lets any consumer re-render an insight in another
 * language from the original evidence.
 */
export const INSIGHT_KEYS = [
  "goal",
  "disallowed",
  "shot",
  "advrec",
  "passseq",
  "press",
  "firstgoal",
] as const;

export type InsightKey = (typeof INSIGHT_KEYS)[number];

const INSIGHT_KEY_BY_SUFFIX: Record<string, InsightKey> = {
  goal: "goal",
  disallowed: "disallowed",
  shot: "shot",
  advrec: "advrec",
  passseq: "passseq",
  press: "press",
  firstgoal: "firstgoal",
};

export const TEAM_NAMES: Record<string, string> = Object.fromEntries(
  TEAMS.map((team) => [team.id, team.name]),
);

export interface InsightVars extends TranslationVars {
  team: string;
  teamId: string;
  count: number;
  threshold: number;
  windowSeconds: number;
  avgIntensity: string;
  eventId: string;
  relatedEventId: string;
  reason: string;
  position: string;
  clockSeconds: number;
}

export interface InsightText {
  headline: string;
  explanation: string;
  analyst: string;
  fan: string;
}

export function resolveInsightKey(insight: MatchInsight): InsightKey | null {
  const suffix = insight.id.split("-").pop() ?? "";
  return INSIGHT_KEY_BY_SUFFIX[suffix] ?? null;
}

function evidenceEvents(
  evidenceEventIds: readonly string[],
  events: readonly MatchEvent[],
): MatchEvent[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const resolved: MatchEvent[] = [];
  for (const id of evidenceEventIds) {
    const event = byId.get(id);
    if (event) resolved.push(event);
  }
  return resolved;
}

function teamLabel(teamId: string | undefined, teamNames: Record<string, string>): string {
  if (!teamId) return "";
  return teamNames[teamId] ?? teamId;
}

/**
 * Derive every variable used by the insight templates from the insight
 * evidence. The result only depends on the event log, so the detector and the
 * localisation layer always agree.
 */
export function resolveInsightVars(
  key: InsightKey,
  evidenceEventIds: readonly string[],
  events: readonly MatchEvent[],
  teamNames: Record<string, string> = TEAM_NAMES,
): InsightVars {
  const evidence = evidenceEvents(evidenceEventIds, events);
  const primary =
    key === "passseq" ? evidence[evidence.length - 1] : evidence[0];
  const teamId = primary?.teamId ?? "";
  const team = teamLabel(teamId, teamNames);

  const vars: InsightVars = {
    team,
    teamId,
    count: Math.max(0, evidence.length - 1),
    threshold: PASS_SEQUENCE_THRESHOLD,
    windowSeconds: PRESSURE_WINDOW_MS / 1000,
    avgIntensity: "0.00",
    eventId: primary?.id ?? "",
    relatedEventId: primary?.relatedEventId ?? "",
    reason: String(primary?.payload["reason"] ?? "correction"),
    position: primary?.position
      ? `(${primary.position.x.toFixed(1)}, ${primary.position.z.toFixed(1)})`
      : "unknown coords",
    clockSeconds: Math.round((primary?.clockMs ?? 0) / 1000),
  };

  if (key === "press") {
    const intensities = evidence
      .slice(1)
      .filter((event) => event.type === "pressure")
      .map((event) => Number(event.payload["intensity"] ?? 0));
    if (intensities.length > 0) {
      const average =
        intensities.reduce((sum, value) => sum + value, 0) / intensities.length;
      vars.avgIntensity = average.toFixed(2);
    }
    vars.threshold = PRESSURE_MIN_INTENSITY;
  }

  return vars;
}

export function renderInsightText(
  key: InsightKey,
  vars: InsightVars,
  locale: Locale,
): InsightText {
  return {
    headline: t(locale, `insight.${key}.headline`, vars),
    explanation: t(locale, `insight.${key}.explanation`, vars),
    analyst: t(locale, `insight.${key}.analyst`, vars),
    fan: t(locale, `insight.${key}.fan`, vars),
  };
}

/**
 * Re-render an insight for a locale. Unknown insights fall back to the text
 * they were created with, so the interface always shows something valid.
 */
export function localizeInsight(
  locale: Locale,
  insight: MatchInsight,
  events: readonly MatchEvent[],
  teamNames: Record<string, string> = TEAM_NAMES,
): InsightText {
  const key = resolveInsightKey(insight);
  if (!key) {
    return {
      headline: insight.headline,
      explanation: insight.explanation,
      analyst: insight.audienceText.analyst ?? insight.explanation,
      fan: insight.audienceText.fan ?? insight.explanation,
    };
  }
  const vars = resolveInsightVars(
    key,
    insight.evidenceEventIds,
    events,
    teamNames,
  );
  return renderInsightText(key, vars, locale);
}
