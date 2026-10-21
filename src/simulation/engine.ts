import type {
  CorrectionEvent,
  Match,
  MatchEvent,
  MatchEventType,
  Player,
  Vector3,
} from "../contracts";
import { matchEventSchema } from "../contracts";
import { createRoster, TEAMS, type Roster } from "./roster";
import { mulberry32 } from "./rng";
import { DEMO_SCENARIO, type Scenario, type ScenarioBeat } from "./scenarios";

export interface EmittedBatch {
  events: readonly MatchEvent[];
  corrections: readonly CorrectionEvent[];
}

export type EngineStatus = "idle" | "playing" | "paused" | "finished";

export interface SimulationFrame {
  match: Match;
  players: readonly Player[];
  ball: Vector3;
  carrierId: string | null;
}

const MAX_SPEED = 16;
const MIN_SPEED = 0.25;

/**
 * Dead-time compression. Stretches of the timeline longer than the threshold
 * are fast-forwarded during playback, ramping up to the maximum factor, so a
 * quiet spell between events does not look like a frozen broadcast.
 */
const DEAD_TIME_THRESHOLD_MS = 20_000;
const DEAD_TIME_RAMP_MS = 120_000;
const DEAD_TIME_MAX_FACTOR = 20;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface RoleInfluence {
  push: number;
  pull: number;
  lateral: number;
}

function roleInfluence(role: Player["role"]): RoleInfluence {
  switch (role) {
    case "DEF":
      return { push: 0.5, pull: 0.86, lateral: 0.2 };
    case "MID":
      return { push: 0.34, pull: 0.7, lateral: 0.32 };
    case "FWD":
      return { push: 0.2, pull: 0.5, lateral: 0.44 };
    default:
      return { push: 0.3, pull: 0.6, lateral: 0.3 };
  }
}

function lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

export class MatchEngine {
  readonly scenario: Scenario;
  private readonly roster: Roster;
  private readonly beatTimeline: Array<{
    beat: ScenarioBeat;
    absoluteAtMs: number;
  }>;
  private readonly jitterPhases: Map<string, number>;

  private match: Match;
  private players: Player[];
  private ball: Vector3;
  private carrierId: string | null = null;
  private status: EngineStatus = "idle";
  private speed = 1;
  private simElapsedMs = 0;
  private beatIndex = 0;
  private events: MatchEvent[] = [];
  private corrections: CorrectionEvent[] = [];
  private eventByBeatKey = new Map<string, MatchEvent>();
  private lastBeat: ScenarioBeat | null = null;

  constructor(scenario: Scenario = DEMO_SCENARIO) {
    this.scenario = scenario;
    this.roster = createRoster();
    const random = mulberry32(scenario.seed);
    this.jitterPhases = new Map(
      this.roster.players.map((player) => [player.id, random()]),
    );
    this.beatTimeline = scenario.beats
      .map((beat) => ({ beat, absoluteAtMs: absoluteTime(scenario, beat) }))
      .sort((a, b) => a.absoluteAtMs - b.absoluteAtMs);
    this.match = {
      id: scenario.matchId,
      seed: scenario.seed,
      homeTeamId: TEAMS[0]!.id,
      awayTeamId: TEAMS[1]!.id,
      status: "scheduled",
      period: 1,
      clockMs: 0,
      score: { home: 0, away: 0 },
      eventSequence: 0,
    };
    this.players = this.roster.players.map((player) => ({
      ...player,
      position: { ...player.position },
    }));
    this.ball = { x: 0, y: 0.2, z: 0 };
  }

  play(): void {
    if (this.status === "finished") return;
    this.status = "playing";
    if (this.match.status === "scheduled") this.match.status = "live";
    else if (this.match.status === "halftime") this.match.status = "live";
  }

  pause(): void {
    if (this.status === "playing") this.status = "paused";
  }

  setSpeed(speed: number): void {
    this.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  getSimElapsedMs(): number {
    return this.simElapsedMs;
  }

  getSpeed(): number {
    return this.speed;
  }

  getEvents(): readonly MatchEvent[] {
    return this.events;
  }

  getCorrections(): readonly CorrectionEvent[] {
    return this.corrections;
  }

  getFrame(): SimulationFrame {
    return {
      match: { ...this.match, score: { ...this.match.score } },
      players: this.players.map((player) => ({
        ...player,
        position: { ...player.position },
      })),
      ball: { ...this.ball },
      carrierId: this.carrierId,
    };
  }

  reset(): void {
    this.status = "idle";
    this.speed = 1;
    this.simElapsedMs = 0;
    this.beatIndex = 0;
    this.events = [];
    this.corrections = [];
    this.eventByBeatKey.clear();
    this.lastBeat = null;
    this.carrierId = null;
    this.ball = { x: 0, y: 0.2, z: 0 };
    this.match = {
      ...this.match,
      status: "scheduled",
      period: 1,
      clockMs: 0,
      score: { home: 0, away: 0 },
      eventSequence: 0,
    };
    this.players = this.roster.players.map((player) => ({
      ...player,
      position: { ...player.position },
    }));
  }

  advanceBy(deltaWallMs: number): EmittedBatch {
    if (this.status !== "playing") return { events: [], corrections: [] };

    const previousElapsed = this.simElapsedMs;
    const simDelta = deltaWallMs * this.speed * this.deadTimeFactor();
    this.simElapsedMs += simDelta;

    const emittedEvents: MatchEvent[] = [];
    const emittedCorrections: CorrectionEvent[] = [];

    while (
      this.beatIndex < this.beatTimeline.length &&
      this.beatTimeline[this.beatIndex]!.absoluteAtMs <= this.simElapsedMs
    ) {
      const entry = this.beatTimeline[this.beatIndex]!;
      this.beatIndex += 1;
      const outcome = this.applyBeat(entry.beat, entry.absoluteAtMs);
      if (outcome.event) {
        emittedEvents.push(outcome.event);
        this.events.push(outcome.event);
      }
      if (outcome.correction) {
        emittedCorrections.push(outcome.correction);
        this.corrections.push(outcome.correction);
      }
    }

    this.updateClock(previousElapsed, this.simElapsedMs);
    this.updatePositions(this.simElapsedMs);

    return { events: emittedEvents, corrections: emittedCorrections };
  }

  /**
   * When the timeline has a long stretch with no upcoming event, match time is
   * compressed so the broadcast never sits on a static frame for minutes of
   * wall time. The factor depends only on simulated time, so event order and
   * every event clock stay identical regardless of playback speed.
   */
  private deadTimeFactor(): number {
    const next = this.beatTimeline[this.beatIndex];
    if (!next) return 1;
    const gap = next.absoluteAtMs - this.simElapsedMs;
    if (gap <= DEAD_TIME_THRESHOLD_MS) return 1;
    const excess = gap - DEAD_TIME_THRESHOLD_MS;
    return Math.min(DEAD_TIME_MAX_FACTOR, 1 + excess / DEAD_TIME_RAMP_MS);
  }

  private applyBeat(
    beat: ScenarioBeat,
    absoluteAtMs: number,
  ): { event?: MatchEvent; correction?: CorrectionEvent } {
    const period = beat.period;
    const clockMs = beat.atMs;

    this.match.eventSequence += 1;
    const sequence = this.match.eventSequence;
    const id = `${this.match.id}-e${sequence}`;

    let relatedEventId: string | undefined;
    if (beat.relatedBeatKey) {
      relatedEventId = this.eventByBeatKey.get(beat.relatedBeatKey)?.id;
    }

    const event: MatchEvent = {
      id,
      matchId: this.match.id,
      sequence,
      type: beat.type,
      period,
      clockMs,
      occurredAtMs: absoluteAtMs,
      teamId: beat.teamId,
      playerId: beat.playerId,
      ...(relatedEventId ? { relatedEventId } : {}),
      position: { ...this.ball },
      targetPosition: { ...beat.ballTo },
      payload: { ...beat.payload },
      status: "valid",
    };

    const parsed = matchEventSchema.safeParse(event);
    if (!parsed.success) {
      throw new Error(
        `Engine produced an invalid event for beat "${beat.key}": ${parsed.error.message}`,
      );
    }

    this.eventByBeatKey.set(beat.key, event);
    this.lastBeat = beat;
    this.carrierId = beat.playerId;

    let correction: CorrectionEvent | undefined;
    if (beat.type === "goal_disallowed" && relatedEventId) {
      const original = this.events.find((e) => e.id === relatedEventId);
      if (original && original.status === "valid") {
        original.status = "corrected";
      }
      this.match.eventSequence += 1;
      correction = {
        id: `${this.match.id}-c${this.match.eventSequence}`,
        matchId: this.match.id,
        sourceEventId: relatedEventId,
        sequence: this.match.eventSequence,
        clockMs,
        reason: String(beat.payload["reason"] ?? "correction"),
        replacementEventId: event.id,
      };
    }

    if (beat.type === "goal" && event.status === "valid") {
      if (beat.teamId === this.match.homeTeamId) this.match.score.home += 1;
      else this.match.score.away += 1;
    }

    if (beat.type === "period_end") {
      if (period === 1) this.match.status = "halftime";
      else this.match.status = "finished";
    } else if (beat.type === "goal_disallowed") {
      this.recomputeScore();
    }

    return { event, correction };
  }

  private recomputeScore(): void {
    let home = 0;
    let away = 0;
    for (const event of this.events) {
      if (event.type !== "goal" || event.status !== "valid") continue;
      if (event.teamId === this.match.homeTeamId) home += 1;
      else away += 1;
    }
    this.match.score = { home, away };
  }

  private updateClock(previousElapsed: number, currentElapsed: number): void {
    const periodDuration = this.scenario.periodDurationMs;
    const halftime = this.scenario.halftimeDurationMs;
    const p1End = periodDuration;
    const p2Start = periodDuration + halftime;
    const matchEnd = p2Start + periodDuration;

    if (currentElapsed >= matchEnd) {
      this.match.period = 2;
      this.match.clockMs = periodDuration;
      this.match.status = "finished";
      this.status = "finished";
      this.simElapsedMs = matchEnd;
      return;
    }

    if (currentElapsed >= p2Start) {
      this.match.period = 2;
      this.match.clockMs = currentElapsed - p2Start;
      if (previousElapsed < p2Start && this.match.status === "halftime") {
        this.match.status = "live";
      }
    } else if (currentElapsed >= p1End) {
      this.match.period = 1;
      this.match.clockMs = periodDuration;
      this.match.status = "halftime";
    } else {
      this.match.period = 1;
      this.match.clockMs = currentElapsed;
    }
  }

  private updatePositions(elapsedMs: number): void {
    const index = this.beatIndex;
    const previous =
      index > 0 ? this.beatTimeline[index - 1]! : null;
    const next = index < this.beatTimeline.length ? this.beatTimeline[index]! : null;

    let ballTarget = previous ? previous.beat.ballTo : { x: 0, y: 0.2, z: 0 };
    if (previous && next) {
      const span = next.absoluteAtMs - previous.absoluteAtMs;
      if (span > 0) {
        const t = Math.min(1, Math.max(0, (elapsedMs - previous.absoluteAtMs) / span));
        ballTarget = lerpVector(previous.beat.ballTo, next.beat.ballTo, t);
      }
    } else if (previous) {
      ballTarget = previous.beat.ballTo;
    }
    this.ball = { ...ballTarget };

    const ballX = this.ball.x;
    const ballZ = this.ball.z;
    const homeId = this.match.homeTeamId;

    for (const player of this.players) {
      const base = this.basePosition(player);
      const isHome = player.teamId === homeId;
      const isGk = player.role === "GK";

      if (isGk) {
        const goalX = isHome ? -50 : 50;
        const x = goalX + ballX * 0.04;
        const z = Math.min(7, Math.max(-7, ballZ * 0.12 + base.z * 0.05));
        player.position = { x: clamp(x, -52, 52), y: 0, z: clamp(z, -34, 34) };
        continue;
      }

      const { push, pull, lateral } = roleInfluence(player.role);
      const attackDir = isHome ? 1 : -1;

      const desiredX = base.x + ballX * push + attackDir * this.teamBias(elapsedMs, isHome);
      let z = base.z * pull + ballZ * lateral;
      const jitter = this.jitterFor(player.id, elapsedMs);

      let x = desiredX + jitter.x;
      z += jitter.z;

      x = clamp(x, -52, 52);
      z = clamp(z, -34, 34);
      player.position = { x, y: 0, z };
    }

    if (this.carrierId) {
      const carrier = this.players.find((p) => p.id === this.carrierId);
      if (carrier) {
        carrier.position = {
          x: lerp(carrier.position.x, this.ball.x, 0.85),
          y: 0,
          z: lerp(carrier.position.z, this.ball.z, 0.85),
        };
      }
    }

    this.applySeparation();
  }

  private teamBias(elapsedMs: number, isHome: boolean): number {
    const t = elapsedMs / 1000;
    const wave = Math.sin(t * 0.12 + (isHome ? 0 : Math.PI));
    return wave * 1.6;
  }

  private applySeparation(): void {
    const minDist = 4.6;
    const minDistSq = minDist * minDist;
    const iterations = 6;
    for (let step = 0; step < iterations; step += 1) {
      let moved = false;
      for (let i = 0; i < this.players.length; i += 1) {
        const a = this.players[i]!;
        for (let j = i + 1; j < this.players.length; j += 1) {
          const b = this.players[j]!;
          const dx = b.position.x - a.position.x;
          const dz = b.position.z - a.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq >= minDistSq) continue;
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / 2;
          const nx = dist > 0.0001 ? dx / dist : Math.cos(i * 2.3999);
          const nz = dist > 0.0001 ? dz / dist : Math.sin(i * 2.3999);
          a.position = {
            x: clamp(a.position.x - nx * overlap, -52, 52),
            y: 0,
            z: clamp(a.position.z - nz * overlap, -34, 34),
          };
          b.position = {
            x: clamp(b.position.x + nx * overlap, -52, 52),
            y: 0,
            z: clamp(b.position.z + nz * overlap, -34, 34),
          };
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  private basePosition(player: Player): Vector3 {
    const entry = [...this.roster.players].find((p) => p.id === player.id);
    return entry ? entry.position : player.position;
  }

  private jitterFor(playerId: string, elapsedMs: number): Vector3 {
    const phase = this.jitterPhases.get(playerId) ?? 0.5;
    const t = elapsedMs / 1000;
    return {
      x: Math.sin(t * 0.35 + phase * Math.PI * 2) * 1.6,
      y: 0,
      z: Math.cos(t * 0.28 + phase * Math.PI * 2) * 1.4,
    };
  }
}

function absoluteTime(scenario: Scenario, beat: ScenarioBeat): number {
  const period = beat.period;
  const offset =
    period === 1 ? 0 : scenario.periodDurationMs + scenario.halftimeDurationMs;
  return offset + beat.atMs;
}

export function createEngine(scenario: Scenario = DEMO_SCENARIO): MatchEngine {
  return new MatchEngine(scenario);
}
