import type { MatchEvent } from "../contracts";
import {
  computePassMetrics,
  computeShotMetrics,
  inferHomeTeamId,
  type PassMetrics,
  type ShotMetrics,
} from "./advanced-metrics";

export interface TeamStats {
  teamId: string;
  passesAttempted: number;
  passesCompleted: number;
  shots: number;
  shotsOnTarget: number;
  recoveries: { defensive: number; middle: number; advanced: number };
  possessionMs: number;
  /** Goals that are still valid in the current state of the match. */
  goals: number;
  /** Total ground distance covered by completed passes, in meters. */
  totalPassDistanceM: number;
  /** Average ground distance of a pass, in meters. */
  averagePassDistanceM: number;
  /** Average pass difficulty on the 0..1 scale. */
  averagePassDifficulty: number;
  /** Number of passes that advanced the ball towards the opponent goal. */
  progressivePasses: number;
  /** Number of shots with a usable speed estimate. */
  shotSpeedSamples: number;
  /** Average estimated strike speed, in kilometers per hour. */
  averageShotSpeedKmh: number;
}

export interface MatchStats {
  possessionByTeam: Record<string, number>;
  teams: Record<string, TeamStats>;
  /** Per-pass advanced metrics, in event order. */
  passMetrics: PassMetrics[];
  /** Per-shot advanced metrics, in event order. */
  shotMetrics: ShotMetrics[];
}

function emptyStats(teamId: string): TeamStats {
  return {
    teamId,
    passesAttempted: 0,
    passesCompleted: 0,
    shots: 0,
    shotsOnTarget: 0,
    recoveries: { defensive: 0, middle: 0, advanced: 0 },
    possessionMs: 0,
    goals: 0,
    totalPassDistanceM: 0,
    averagePassDistanceM: 0,
    averagePassDifficulty: 0,
    progressivePasses: 0,
    shotSpeedSamples: 0,
    averageShotSpeedKmh: 0,
  };
}

function possessionTeam(event: MatchEvent): string | null {
  if (event.type === "kickoff" || event.type === "possession_change") {
    return event.teamId ?? null;
  }
  if (event.type === "pass" || event.type === "shot") {
    return event.teamId ?? null;
  }
  return null;
}

export function computeStats(events: readonly MatchEvent[]): MatchStats {
  const teams = new Map<string, TeamStats>();
  const ensure = (teamId: string): TeamStats => {
    let stats = teams.get(teamId);
    if (!stats) {
      stats = emptyStats(teamId);
      teams.set(teamId, stats);
    }
    return stats;
  };

  for (const event of events) {
    if (event.status === "void") continue;
    if (event.teamId) ensure(event.teamId);

    if (event.type === "pass" && event.teamId) {
      const stats = ensure(event.teamId);
      stats.passesAttempted += 1;
      if (event.payload["successful"] === true) stats.passesCompleted += 1;
    } else if (event.type === "shot" && event.teamId) {
      const stats = ensure(event.teamId);
      stats.shots += 1;
      if (event.payload["onTarget"] === true) stats.shotsOnTarget += 1;
    } else if (event.type === "ball_recovery" && event.teamId) {
      const stats = ensure(event.teamId);
      const zone = event.payload["zone"];
      if (zone === "defensive" || zone === "middle" || zone === "advanced") {
        stats.recoveries[zone] += 1;
      }
    } else if (event.type === "goal" && event.teamId && event.status === "valid") {
      ensure(event.teamId).goals += 1;
    }
  }

  const valid = [...events]
    .filter((event) => event.status !== "void")
    .sort((a, b) => a.sequence - b.sequence);

  let holder: string | null = null;
  for (let i = 0; i < valid.length - 1; i += 1) {
    const current = valid[i]!;
    const next = valid[i + 1]!;
    const updatedHolder = possessionTeam(current);
    if (updatedHolder) holder = updatedHolder;
    if (!holder) continue;
    const span = Math.max(0, next.occurredAtMs - current.occurredAtMs);
    const stats = ensure(holder);
    stats.possessionMs += span;
  }

  const possessionByTeam: Record<string, number> = {};
  const total = [...teams.values()].reduce(
    (sum, stats) => sum + stats.possessionMs,
    0,
  );
  for (const stats of teams.values()) {
    possessionByTeam[stats.teamId] =
      total > 0 ? Math.round((stats.possessionMs / total) * 1000) / 10 : 0;
  }

  const homeTeamId = inferHomeTeamId(events);
  const passMetrics = computePassMetrics(events, homeTeamId);
  const shotMetrics = computeShotMetrics(events, homeTeamId);

  const distanceByTeam = new Map<string, { total: number; count: number }>();
  const difficultyByTeam = new Map<string, { total: number; count: number }>();
  for (const metric of passMetrics) {
    if (!metric.teamId) continue;
    const distance = distanceByTeam.get(metric.teamId) ?? { total: 0, count: 0 };
    distance.total += metric.distanceM;
    distance.count += 1;
    distanceByTeam.set(metric.teamId, distance);

    const difficulty = difficultyByTeam.get(metric.teamId) ?? {
      total: 0,
      count: 0,
    };
    difficulty.total += metric.difficulty;
    difficulty.count += 1;
    difficultyByTeam.set(metric.teamId, difficulty);

    const stats = ensure(metric.teamId);
    stats.totalPassDistanceM = Math.round(distance.total * 100) / 100;
    stats.averagePassDistanceM =
      distance.count > 0
        ? Math.round((distance.total / distance.count) * 100) / 100
        : 0;
    stats.averagePassDifficulty =
      difficulty.count > 0
        ? Math.round((difficulty.total / difficulty.count) * 100) / 100
        : 0;
    if (metric.progressive) stats.progressivePasses += 1;
  }

  const speedByTeam = new Map<string, { total: number; count: number }>();
  for (const metric of shotMetrics) {
    if (!metric.teamId) continue;
    const speed = speedByTeam.get(metric.teamId) ?? { total: 0, count: 0 };
    speed.total += metric.estimatedSpeedKmh;
    speed.count += 1;
    speedByTeam.set(metric.teamId, speed);

    const stats = ensure(metric.teamId);
    stats.shotSpeedSamples = speed.count;
    stats.averageShotSpeedKmh =
      speed.count > 0
        ? Math.round((speed.total / speed.count) * 10) / 10
        : 0;
  }

  const teamsRecord: Record<string, TeamStats> = {};
  for (const [teamId, stats] of teams) teamsRecord[teamId] = stats;

  return {
    possessionByTeam,
    teams: teamsRecord,
    passMetrics,
    shotMetrics,
  };
}
