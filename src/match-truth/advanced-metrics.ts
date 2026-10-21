import type { MatchEvent, Vector3 } from "../contracts";

/**
 * Advanced metrics (optional Challenge extension).
 *
 * Every number produced here is derived from the synthetic event log only —
 * positions, timestamps and payloads. No external data source is used.
 */

export const PITCH_HALF_LENGTH = 52.5;
export const PITCH_HALF_WIDTH = 34;

/** Long pass considered "maximally difficult" on the distance axis. */
export const PASS_DISTANCE_REFERENCE_M = 45;
/** A pass only counts as progressive when it advances at least this much. */
export const PROGRESSIVE_THRESHOLD_M = 0.5;
/** Window (ms) used to look for opponent pressure before a pass. */
export const PRESSURE_LOOKBACK_MS = 15_000;
/** Lower/upper bounds of the strike-speed model. */
export const MIN_STRIKE_SPEED_MS = 6;
export const MAX_STRIKE_SPEED_MS = 34;
/** Longest realistic time between the strike and the ball reaching its target. */
export const MAX_SHOT_FLIGHT_MS = 6_000;
export const MIN_SHOT_FLIGHT_MS = 200;

export interface PassMetrics {
  eventId: string;
  teamId: string;
  playerId?: string;
  /** Ground distance covered by the ball, in meters. */
  distanceM: number;
  /** Deterministic 0..1 difficulty score. */
  difficulty: number;
  /** True when the pass moves the ball towards the opponent goal. */
  progressive: boolean;
  /** True when the pass was played under opponent pressure. */
  underPressure: boolean;
  successful: boolean;
}

export interface ShotMetrics {
  eventId: string;
  teamId: string;
  playerId?: string;
  /** Distance between the strike point and the ball's final position. */
  distanceM: number;
  /** Distance between the strike point and the goal being attacked. */
  distanceToGoalM: number;
  /** Estimated strike speed in meters per second. */
  estimatedSpeedMs: number;
  /** Estimated strike speed in kilometers per hour. */
  estimatedSpeedKmh: number;
  onTarget: boolean;
  /** Deterministic 0..1 difficulty score. */
  difficulty: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Ground (planar) distance between two world positions, in meters. */
export function groundDistance(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Home team attacks towards +x, away team towards -x (documented in
 * `docs/coordinates-clock-events.md`). The home side is derived from the kickoff
 * so the metric stays reproducible without extra configuration.
 */
export function inferHomeTeamId(events: readonly MatchEvent[]): string | null {
  const kickoff = events.find((event) => event.type === "kickoff");
  if (kickoff?.teamId) return kickoff.teamId;
  const withTeam = events.find((event) => event.teamId);
  return withTeam?.teamId ?? null;
}

export function attackDirection(
  teamId: string | undefined,
  homeTeamId: string | null,
): number {
  if (!teamId || !homeTeamId) return 1;
  return teamId === homeTeamId ? 1 : -1;
}

function isOpponent(teamId: string | undefined, other: string | undefined): boolean {
  return Boolean(teamId && other && teamId !== other);
}

export function computePassMetrics(
  events: readonly MatchEvent[],
  homeTeamId: string | null = inferHomeTeamId(events),
): PassMetrics[] {
  const metrics: PassMetrics[] = [];

  for (const event of events) {
    if (event.type !== "pass") continue;
    if (event.status === "void") continue;
    if (!event.position || !event.targetPosition) continue;

    const distanceM = round(groundDistance(event.position, event.targetPosition));
    const direction = attackDirection(event.teamId, homeTeamId);
    const advance =
      (event.targetPosition.x - event.position.x) * direction;
    const progressive = advance >= PROGRESSIVE_THRESHOLD_M;

    const underPressure = events.some(
      (other) =>
        other.type === "pressure" &&
        isOpponent(other.teamId, event.teamId) &&
        other.occurredAtMs <= event.occurredAtMs &&
        event.occurredAtMs - other.occurredAtMs <= PRESSURE_LOOKBACK_MS,
    );

    const successful = event.payload["successful"] === true;
    const distanceFactor = clamp(distanceM / PASS_DISTANCE_REFERENCE_M, 0, 1);
    const difficulty = clamp(
      distanceFactor * 0.45 +
        (progressive ? 0.2 : 0) +
        (underPressure ? 0.2 : 0) +
        (successful ? 0.15 : 0),
      0,
      1,
    );

    metrics.push({
      eventId: event.id,
      teamId: event.teamId ?? "",
      ...(event.playerId ? { playerId: event.playerId } : {}),
      distanceM,
      difficulty: round(difficulty),
      progressive,
      underPressure,
      successful,
    });
  }

  return metrics;
}

export function computeShotMetrics(
  events: readonly MatchEvent[],
  homeTeamId: string | null = inferHomeTeamId(events),
): ShotMetrics[] {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const metrics: ShotMetrics[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index]!;
    if (event.type !== "shot") continue;
    if (event.status === "void") continue;
    if (!event.position || !event.targetPosition) continue;

    const distanceM = round(groundDistance(event.position, event.targetPosition));

    const direction = attackDirection(event.teamId, homeTeamId);
    const goal: Vector3 = {
      x: direction >= 0 ? PITCH_HALF_LENGTH : -PITCH_HALF_LENGTH,
      y: 0,
      z: 0,
    };
    const distanceToGoalM = round(groundDistance(event.position, goal));

    const next = ordered[index + 1];
    const rawWindow =
      next && next.occurredAtMs > event.occurredAtMs
        ? next.occurredAtMs - event.occurredAtMs
        : MAX_SHOT_FLIGHT_MS;
    const flightMs = clamp(rawWindow, MIN_SHOT_FLIGHT_MS, MAX_SHOT_FLIGHT_MS);
    const rawSpeed = distanceM / (flightMs / 1000);
    const estimatedSpeedMs = round(
      clamp(rawSpeed, MIN_STRIKE_SPEED_MS, MAX_STRIKE_SPEED_MS),
      2,
    );

    const onTarget = event.payload["onTarget"] === true;
    const proximity = 1 - clamp(distanceToGoalM / 60, 0, 1);
    const speedFactor = clamp((estimatedSpeedMs - 10) / 20, 0, 1);
    const difficulty = clamp(
      proximity * 0.4 + speedFactor * 0.35 + (onTarget ? 0.25 : 0),
      0,
      1,
    );

    metrics.push({
      eventId: event.id,
      teamId: event.teamId ?? "",
      ...(event.playerId ? { playerId: event.playerId } : {}),
      distanceM,
      distanceToGoalM,
      estimatedSpeedMs,
      estimatedSpeedKmh: round(estimatedSpeedMs * 3.6, 1),
      onTarget,
      difficulty: round(difficulty),
    });
  }

  return metrics;
}
