import type {
  Match,
  MatchEvent,
  MatchInsight,
} from "../contracts";
import type { MatchStats } from "../match-truth/stats";
import { PRIORITY_MODEL, type FeatureName } from "./model/weights";

export interface FeatureInput {
  insight: MatchInsight;
  events: readonly MatchEvent[];
  match: Match;
  stats: MatchStats;
  periodDurationMs: number;
  followedTeamId?: string;
  followedPlayerId?: string;
  activeInsights?: readonly MatchInsight[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function primaryTeamId(events: readonly MatchEvent[]): string | undefined {
  return events.find((event) => event.teamId)?.teamId;
}

export function extractFeatureRecord(
  input: FeatureInput,
): Record<FeatureName, number> {
  const {
    insight,
    events,
    match,
    periodDurationMs,
    followedTeamId,
    followedPlayerId,
    activeInsights = [],
  } = input;

  const evidence = insight.evidenceEventIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is MatchEvent => event !== undefined);

  const types = new Set(evidence.map((event) => event.type));
  const evidenceTeams = new Set(
    evidence.flatMap((event) => (event.teamId ? [event.teamId] : [])),
  );
  const evidencePlayers = new Set(
    evidence.flatMap((event) => (event.playerId ? [event.playerId] : [])),
  );
  const team = primaryTeamId(evidence);
  const similarActive = activeInsights.some(
    (other) =>
      other.id !== insight.id &&
      other.category === insight.category &&
      primaryTeamId(
        other.evidenceEventIds
          .map((id) => events.find((event) => event.id === id))
          .filter((event): event is MatchEvent => event !== undefined),
      ) === team,
  );

  const validityUrgency =
    insight.validUntilMs === undefined
      ? 0
      : clamp(
          1 - (insight.validUntilMs - insight.createdAtMs) / 60_000,
          0,
          1,
        );

  return {
    rule_priority: insight.priority / 100,
    evidence_count: Math.min(1, insight.evidenceEventIds.length / 5),
    is_goal: types.has("goal") ? 1 : 0,
    is_disallowed: types.has("goal_disallowed") ? 1 : 0,
    is_shot: types.has("shot") ? 1 : 0,
    is_recovery: types.has("ball_recovery") ? 1 : 0,
    is_pressure: types.has("pressure") ? 1 : 0,
    is_pass_sequence:
      insight.id.endsWith("-passseq") ||
      evidence.filter((event) => event.type === "pass").length >= 3
        ? 1
        : 0,
    is_invalidated: insight.status === "invalidated" ? 1 : 0,
    cat_tactical: insight.category === "tactical" ? 1 : 0,
    cat_performance: insight.category === "performance" ? 1 : 0,
    cat_match_event: insight.category === "match_event" ? 1 : 0,
    cat_milestone: insight.category === "milestone" ? 1 : 0,
    has_validity: insight.validUntilMs === undefined ? 0 : 1,
    validity_urgency: validityUrgency,
    followed_team:
      followedTeamId !== undefined && evidenceTeams.has(followedTeamId) ? 1 : 0,
    followed_player:
      followedPlayerId !== undefined && evidencePlayers.has(followedPlayerId)
        ? 1
        : 0,
    home_involvement: evidenceTeams.has(match.homeTeamId) ? 1 : 0,
    away_involvement: evidenceTeams.has(match.awayTeamId) ? 1 : 0,
    score_closeness: 1 - Math.min(1, Math.abs(match.score.home - match.score.away) / 3),
    period: match.period === 2 ? 1 : 0,
    match_progress:
      periodDurationMs > 0
        ? clamp(match.clockMs / periodDurationMs, 0, 1)
        : 0,
    has_player_evidence: evidencePlayers.size > 0 ? 1 : 0,
    novelty: similarActive ? 0 : 1,
    bias: 1,
  };
}

export function toFeatureVector(record: Record<FeatureName, number>): number[] {
  return PRIORITY_MODEL.featureNames.map((name) => record[name]);
}

export function extractFeatures(input: FeatureInput): number[] {
  return toFeatureVector(extractFeatureRecord(input));
}

export function featureNames(): readonly FeatureName[] {
  return PRIORITY_MODEL.featureNames;
}
