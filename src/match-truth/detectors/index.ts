import type { MatchInsight } from "../../contracts";
import {
  ADVANCED_RECOVERY_WINDOW_MS,
  PASS_SEQUENCE_THRESHOLD,
  PRESSURE_MIN_INTENSITY,
  PRESSURE_WINDOW_MS,
  renderInsightText,
  resolveInsightVars,
  type InsightKey,
} from "../insight-text";
import type { Detector, DetectorContext } from "./types";

function insightId(ctx: DetectorContext, suffix: string): string {
  return `${ctx.matchId}-ins-${ctx.event.sequence}-${suffix}`;
}

/**
 * Every detector builds its text through the shared template layer so that
 * the same insight can be re-rendered in another language later on.
 */
function buildInsight(
  ctx: DetectorContext,
  key: InsightKey,
  suffix: string,
  category: MatchInsight["category"],
  priority: number,
  evidenceEventIds: string[],
  options: { validUntilMs?: number } = {},
): MatchInsight {
  const vars = resolveInsightVars(key, evidenceEventIds, ctx.events);
  const text = renderInsightText(key, vars, "en");
  return {
    id: insightId(ctx, suffix),
    matchId: ctx.matchId,
    category,
    headline: text.headline,
    explanation: text.explanation,
    priority,
    evidenceEventIds,
    createdAtMs: ctx.event.occurredAtMs,
    ...(options.validUntilMs !== undefined
      ? { validUntilMs: options.validUntilMs }
      : {}),
    status: "validated",
    audienceText: {
      analyst: text.analyst,
      fan: text.fan,
    },
  };
}

export const shotDetector: Detector = {
  id: "shot",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "shot") return null;
    const onTarget = event.payload["onTarget"] === true;
    if (!onTarget) return null;
    return buildInsight(ctx, "shot", "shot", "match_event", 75, [event.id], {
      validUntilMs: event.occurredAtMs + 30_000,
    });
  },
};

export const goalDetector: Detector = {
  id: "goal",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "goal" || !event.teamId) return null;
    return buildInsight(ctx, "goal", "goal", "match_event", 95, [event.id]);
  },
};

export const disallowedGoalDetector: Detector = {
  id: "disallowed_goal",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "goal_disallowed") return null;
    const evidence = [event.id];
    if (event.relatedEventId) evidence.push(event.relatedEventId);
    return buildInsight(
      ctx,
      "disallowed",
      "disallowed",
      "match_event",
      90,
      evidence,
    );
  },
};

export const advancedRecoveryDetector: Detector = {
  id: "advanced_recovery",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "ball_recovery") return null;
    if (event.payload["zone"] !== "advanced") return null;
    if (!event.teamId) return null;
    const team = event.teamId;
    const evidence = [event.id];
    const precedingPasses = ctx.events
      .filter(
        (e) =>
          e.type === "pass" &&
          e.teamId === team &&
          e.payload["successful"] === true &&
          e.occurredAtMs < event.occurredAtMs &&
          event.occurredAtMs - e.occurredAtMs <= ADVANCED_RECOVERY_WINDOW_MS,
      )
      .map((e) => e.id);
    evidence.push(...precedingPasses);
    return buildInsight(
      ctx,
      "advrec",
      "advrec",
      "tactical",
      55,
      evidence,
      { validUntilMs: event.occurredAtMs + 60_000 },
    );
  },
};

export const passSequenceDetector: Detector = {
  id: "pass_sequence",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "possession_change") return null;
    if (!event.teamId) return null;
    const team = event.teamId;
    const sequence: string[] = [];
    for (let i = ctx.events.length - 1; i >= 0; i -= 1) {
      const candidate = ctx.events[i]!;
      if (candidate.type !== "pass" || candidate.teamId !== team) break;
      if (candidate.payload["successful"] !== true) break;
      sequence.unshift(candidate.id);
    }
    if (sequence.length < PASS_SEQUENCE_THRESHOLD) return null;
    return buildInsight(
      ctx,
      "passseq",
      "passseq",
      "tactical",
      45,
      [...sequence, event.id],
      { validUntilMs: event.occurredAtMs + 45_000 },
    );
  },
};

export const pressureShiftDetector: Detector = {
  id: "pressure_shift",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "ball_recovery") return null;
    if (!event.teamId) return null;
    const pressingTeam = event.teamId;
    const pressures = ctx.events.filter(
      (e) =>
        e.type === "pressure" &&
        e.teamId === pressingTeam &&
        Number(e.payload["intensity"] ?? 0) >= PRESSURE_MIN_INTENSITY &&
        event.occurredAtMs - e.occurredAtMs <= PRESSURE_WINDOW_MS &&
        event.occurredAtMs - e.occurredAtMs >= 0,
    );
    if (pressures.length < 2) return null;
    const evidence = [event.id, ...pressures.map((e) => e.id)];
    return buildInsight(
      ctx,
      "press",
      "press",
      "tactical",
      50,
      evidence,
      { validUntilMs: event.occurredAtMs + 60_000 },
    );
  },
};

export const milestoneDetector: Detector = {
  id: "milestone",
  onEvent(ctx): MatchInsight | null {
    const { event } = ctx;
    if (event.type !== "goal" || !event.teamId) return null;
    const goalsBefore = ctx.events.filter(
      (e) => e.type === "goal" && e.occurredAtMs < event.occurredAtMs,
    ).length;
    if (goalsBefore > 0) return null;
    return buildInsight(
      ctx,
      "firstgoal",
      "firstgoal",
      "milestone",
      80,
      [event.id],
    );
  },
};

export const ALL_DETECTORS: readonly Detector[] = [
  goalDetector,
  disallowedGoalDetector,
  shotDetector,
  advancedRecoveryDetector,
  passSequenceDetector,
  pressureShiftDetector,
  milestoneDetector,
];
