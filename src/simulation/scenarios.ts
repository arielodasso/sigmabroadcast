import type { MatchEventType, Vector3 } from "../contracts";
import { awayPlayerId, homePlayerId, HOME_TEAM, AWAY_TEAM } from "./roster";

export interface ScenarioBeat {
  key: string;
  atMs: number;
  period: 1 | 2;
  type: MatchEventType;
  teamId: string;
  playerId: string;
  ballTo: Vector3;
  payload: Record<string, unknown>;
  relatedBeatKey?: string;
}

export interface Scenario {
  id: string;
  matchId: string;
  seed: number;
  periodDurationMs: number;
  halftimeDurationMs: number;
  beats: readonly ScenarioBeat[];
}

const BALL_Y = 0.2;

/** Pitch limits used to keep generated ball positions inside the field. */
const HALF_LENGTH = 52.5;
const HALF_WIDTH = 34;
/** Goal mouth: the ball is placed on the goal line, near the centre. */
const GOAL_X = HALF_LENGTH - 0.5;

/** Deterministic pseudo random generator so the scenario never drifts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface TeamConfig {
  teamId: string;
  /** +1 when the team attacks towards +x, -1 otherwise. */
  dir: 1 | -1;
  passers: number[];
  shooters: number[];
  defenders: number[];
}

const HOME: TeamConfig = {
  teamId: HOME_TEAM.id,
  dir: 1,
  passers: [6, 8, 10, 11],
  shooters: [9, 10, 7],
  defenders: [2, 3, 4, 5],
};

const AWAY: TeamConfig = {
  teamId: AWAY_TEAM.id,
  dir: -1,
  passers: [6, 8, 10, 11],
  shooters: [9, 10, 7],
  defenders: [2, 3, 4, 5],
};

function playerId(team: TeamConfig, shirt: number): string {
  return team.teamId === HOME_TEAM.id ? homePlayerId(shirt) : awayPlayerId(shirt);
}

/**
 * Builds a dense, realistic possession-based timeline for one period.
 *
 * Each possession is a short passing sequence that moves the ball towards the
 * attacking goal, optionally ends in a shot on target and hands the ball over
 * to the opponent. Sequences are packed back to back so playback never sits on
 * a static frame for long.
 */
interface PossessionSpec {
  type: "possession";
  team: TeamConfig;
  /** Where this possession starts, expressed as a fraction of the pitch. */
  startX: number;
  passes: number;
  shot: boolean;
  onTarget?: boolean;
  goal?: boolean;
  /** Key to assign the goal beat so it can be referenced by a correction. */
  goalKey?: string;
}

interface GoalDisallowedSpec {
  type: "goal_disallowed";
  team: TeamConfig;
  reason: string;
  relatedGoalKey: string;
}

interface KickoffSpec {
  type: "kickoff";
  team: TeamConfig;
}

interface PeriodEndSpec {
  type: "period_end";
  team: TeamConfig;
}

type PeriodStep = PossessionSpec | GoalDisallowedSpec | KickoffSpec | PeriodEndSpec;

function startOfPeriod(team: TeamConfig): Vector3 {
  return { x: 0, y: BALL_Y, z: 0 };
}

/**
 * A correction never lands on the same instant as the goal it invalidates:
 * the referee review takes a fixed amount of time.
 */
const CORRECTION_DELAY_MS = 30_000;

function buildPeriodBeats(
  period: 1 | 2,
  random: () => number,
  periodEndMs: number,
  steps: readonly PeriodStep[],
  anchors: ReadonlyMap<string, number> = new Map(),
): ScenarioBeat[] {
  const drafts: Array<Omit<ScenarioBeat, "atMs">> = [];
  let keyIndex = 0;

  const nextKey = (prefix: string): string => {
    keyIndex += 1;
    return `p${period}-${prefix}-${keyIndex}`;
  };

  for (const step of Object.values(steps)) {
    if (step.type === "kickoff") {
      drafts.push({
        key: nextKey("kickoff"),
        period,
        type: "kickoff",
        teamId: step.team.teamId,
        playerId: playerId(step.team, step.team.passers[0]!),
        ballTo: startOfPeriod(step.team),
        payload: {},
      });
      continue;
    }

    if (step.type === "period_end") {
      // Handled separately below, always pinned to the end of the period.
      continue;
    }

    if (step.type === "goal_disallowed") {
      drafts.push({
        key: nextKey("disallowed"),
        period,
        type: "goal_disallowed",
        teamId: step.team.teamId,
        playerId: playerId(step.team, step.team.shooters[0]!),
        ballTo: startOfPeriod(step.team),
        payload: { reason: step.reason },
        relatedBeatKey: step.relatedGoalKey,
      });
      continue;
    }

    // Possession: a run of passes that carries the ball towards the goal.
    const { team } = step;
    let x = step.startX * HALF_LENGTH * team.dir;
    let z = clamp((random() - 0.5) * HALF_WIDTH * 1.2, -HALF_WIDTH + 4, HALF_WIDTH - 4);

    for (let pass = 0; pass < step.passes; pass += 1) {
      const passer = team.passers[(pass + keyIndex) % team.passers.length]!;
      const towardsGoal = clamp((pass + 1) / (step.passes + 1), 0, 1);
      const nextX = team.dir * HALF_LENGTH * (0.1 + towardsGoal * 0.72);
      const nextZ = clamp(
        z + (random() - 0.5) * 24,
        -HALF_WIDTH + 4,
        HALF_WIDTH - 4,
      );
      drafts.push({
        key: nextKey("pass"),
        period,
        type: "pass",
        teamId: team.teamId,
        playerId: playerId(team, passer),
        ballTo: { x: x, y: BALL_Y, z },
        payload: { successful: random() > 0.18 },
      });

      // The defending side presses the ball carrier on most passes. Two
      // pressers close the ball down together so a sustained-pressure window
      // always contains more than one pressure event.
      if (pass >= 1) {
        const other = team === HOME ? AWAY : HOME;
        for (let presser = 0; presser < 2; presser += 1) {
          const shirt = other.passers[(pass + keyIndex + presser) % other.passers.length]!;
          drafts.push({
            key: nextKey("pressure"),
            period,
            type: "pressure",
            teamId: other.teamId,
            playerId: playerId(other, shirt),
            ballTo: { x: x * 0.95 - presser, y: BALL_Y, z: z + 2 - presser },
            payload: { intensity: 0.72 + random() * 0.26 },
          });
        }
      }

      x = nextX;
      z = nextZ;
    }

    if (step.shot) {
      const shooter = team.shooters[keyIndex % team.shooters.length]!;
      const goalZ = clamp((random() - 0.5) * 8, -6, 6);
      drafts.push({
        key: nextKey("shot"),
        period,
        type: "shot",
        teamId: team.teamId,
        playerId: playerId(team, shooter),
        ballTo: { x: x, y: BALL_Y, z },
        payload: { onTarget: step.onTarget ?? true },
      });
      const landingX = step.onTarget === false ? x + team.dir * 6 : team.dir * GOAL_X;
      const landingZ = step.onTarget === false ? z + 8 : goalZ;
      if (step.goal) {
        drafts.push({
          key: step.goalKey ?? nextKey("goal"),
          period,
          type: "goal",
          teamId: team.teamId,
          playerId: playerId(team, shooter),
          ballTo: { x: team.dir * GOAL_X, y: BALL_Y, z: goalZ },
          payload: {},
        });
      } else {
        drafts.push({
          key: nextKey("stop"),
          period,
          type: "possession_change",
          teamId: team.teamId,
          playerId: playerId(team, shooter),
          ballTo: { x: landingX, y: BALL_Y, z: clamp(landingZ, -HALF_WIDTH + 2, HALF_WIDTH - 2) },
          payload: {},
        });
      }
    } else {
      // Won back by the defending side, sometimes high up the pitch.
      const other = team === HOME ? AWAY : HOME;
      const defender = other.defenders[keyIndex % other.defenders.length]!;
      const zone: "defensive" | "middle" | "advanced" =
        x * team.dir > HALF_LENGTH * 0.35 ? "advanced" : "middle";
      drafts.push({
        key: nextKey("recovery"),
        period,
        type: "ball_recovery",
        teamId: other.teamId,
        playerId: playerId(other, defender),
        ballTo: { x, y: BALL_Y, z },
        payload: { zone },
      });
      drafts.push({
        key: nextKey("possession"),
        period,
        type: "possession_change",
        teamId: other.teamId,
        playerId: playerId(other, defender),
        ballTo: { x: x * 0.85, y: BALL_Y, z },
        payload: {},
      });
    }
  }

  // Distribute the drafted beats evenly across the period, leaving a small
  // margin before `period_end` so every beat is emitted exactly once.
  const endTeam = steps[steps.length - 1];
  const buffered = periodEndMs - 5_000;
  const slot = buffered / (drafts.length + 1);
  const beats: ScenarioBeat[] = drafts.map((draft, index) => ({
    ...draft,
    atMs: Math.round(slot * (index + 1)),
  }));

  // Pin critical beats to known positions if anchors are provided.
  for (const beat of beats) {
    const pinned = anchors.get(beat.key);
    if (pinned !== undefined) beat.atMs = pinned;
  }

  // A correction is always scheduled a fixed time after the goal it
  // invalidates. Deriving it from the referenced beat keeps the relationship
  // stable no matter how many beats the generator produced.
  const beatByKey = new Map(beats.map((beat) => [beat.key, beat]));
  for (const beat of beats) {
    if (!beat.relatedBeatKey) continue;
    const target = beatByKey.get(beat.relatedBeatKey);
    if (!target) continue;
    beat.atMs = target.atMs + CORRECTION_DELAY_MS;
  }

  beats.push({
    key: nextKey("period-end"),
    atMs: periodEndMs,
    period,
    type: "period_end",
    teamId: endTeam && endTeam.type !== "period_end" ? endTeam.team.teamId : HOME.teamId,
    playerId: playerId(HOME, HOME.passers[0]!),
    ballTo: startOfPeriod(HOME),
    payload: {},
  });

  return beats.sort((a, b) => a.atMs - b.atMs);
}

function buildDemoScenario(): Scenario {
  return buildScenario({ variant: "demo", seed: 20261020 });
}

/**
 * Scenario variants.
 *
 * The `demo` variant is the deterministic demonstration scenario: a goal in
 * the first half that is later disallowed, and a goal in the second half that
 * stands. The remaining variants exist to exercise the pipeline against
 * different shapes of match, which is how the invariant tests prove that the
 * rules hold beyond the happy path.
 */
export type ScenarioVariantId =
  | "demo"
  | "no-correction"
  | "double-correction"
  | "high-score";

export interface ScenarioOptions {
  variant: ScenarioVariantId;
  seed: number;
}

interface VariantDefinition {
  id: ScenarioVariantId;
  scenarioId: string;
  matchId: string;
  /** Whether the first-half goal is later disallowed. */
  disallowFirstGoal: boolean;
  /** Whether the second-half goal is later disallowed. */
  disallowSecondGoal: boolean;
  /** Whether the first-half goal exists at all. */
  firstHalfGoal: boolean;
  /** Whether the second-half goal exists at all. */
  secondHalfGoal: boolean;
  /** Extra goals scored in the first half, always valid. */
  extraFirstHalfGoals: number;
}

const VARIANTS: Record<ScenarioVariantId, VariantDefinition> = {
  demo: {
    id: "demo",
    scenarioId: "scenario-demo-v2",
    matchId: "match-demo-0001",
    disallowFirstGoal: true,
    disallowSecondGoal: false,
    firstHalfGoal: true,
    secondHalfGoal: true,
    extraFirstHalfGoals: 0,
  },
  "no-correction": {
    id: "no-correction",
    scenarioId: "scenario-no-correction-v1",
    matchId: "match-nocorrection-0002",
    disallowFirstGoal: false,
    disallowSecondGoal: false,
    firstHalfGoal: true,
    secondHalfGoal: true,
    extraFirstHalfGoals: 0,
  },
  "double-correction": {
    id: "double-correction",
    scenarioId: "scenario-double-correction-v1",
    matchId: "match-doublecorrection-0003",
    disallowFirstGoal: true,
    disallowSecondGoal: true,
    firstHalfGoal: true,
    secondHalfGoal: true,
    extraFirstHalfGoals: 0,
  },
  "high-score": {
    id: "high-score",
    scenarioId: "scenario-high-score-v1",
    matchId: "match-highscore-0004",
    disallowFirstGoal: false,
    disallowSecondGoal: false,
    firstHalfGoal: true,
    secondHalfGoal: true,
    extraFirstHalfGoals: 2,
  },
};

/**
 * Builds a scenario from a variant and a seed.
 *
 * The seed only drives the pseudo-random placement of the synthetic events,
 * so two runs with the same seed always produce the same match.
 */
export function buildScenario(options: ScenarioOptions): Scenario {
  const variant = VARIANTS[options.variant];
  const random = mulberry32(options.seed);

  const firstHalf: PeriodStep[] = [
    { type: "kickoff", team: HOME },
    {
      type: "possession",
      team: HOME,
      startX: -0.1,
      passes: 4,
      shot: true,
      onTarget: true,
      ...(variant.firstHalfGoal ? { goal: true, goalKey: "p1-goal-1" } : {}),
    },
  ];
  if (variant.disallowFirstGoal) {
    firstHalf.push({
      type: "goal_disallowed",
      team: HOME,
      reason: "offside",
      relatedGoalKey: "p1-goal-1",
    });
  }
  firstHalf.push(
    { type: "kickoff", team: AWAY },
    { type: "possession", team: AWAY, startX: -0.2, passes: 3, shot: true, onTarget: false },
    { type: "possession", team: HOME, startX: -0.4, passes: 5, shot: false },
    { type: "possession", team: AWAY, startX: 0.1, passes: 4, shot: true, onTarget: true },
    { type: "possession", team: HOME, startX: -0.5, passes: 6, shot: true, onTarget: false },
    { type: "possession", team: AWAY, startX: 0.3, passes: 3, shot: false },
    { type: "possession", team: HOME, startX: -0.3, passes: 5, shot: true, onTarget: true },
    { type: "possession", team: AWAY, startX: 0.2, passes: 4, shot: false },
    { type: "possession", team: HOME, startX: -0.6, passes: 6, shot: true, onTarget: false },
    { type: "possession", team: AWAY, startX: 0.4, passes: 5, shot: false },
  );
  for (let extra = 0; extra < variant.extraFirstHalfGoals; extra += 1) {
    firstHalf.push({
      type: "possession",
      team: extra % 2 === 0 ? AWAY : HOME,
      startX: 0.2 + extra * 0.05,
      passes: 4,
      shot: true,
      onTarget: true,
      goal: true,
      goalKey: `p1-extra-goal-${extra + 1}`,
    });
  }
  firstHalf.push({ type: "period_end", team: HOME });

  const secondHalf: PeriodStep[] = [
    { type: "kickoff", team: AWAY },
    { type: "possession", team: AWAY, startX: 0.1, passes: 4, shot: true, onTarget: true },
    { type: "possession", team: HOME, startX: -0.3, passes: 5, shot: false },
    { type: "possession", team: AWAY, startX: 0.2, passes: 3, shot: false },
    {
      type: "possession",
      team: HOME,
      startX: -0.4,
      passes: 6,
      shot: true,
      onTarget: true,
      ...(variant.secondHalfGoal ? { goal: true, goalKey: "p2-goal-1" } : {}),
    },
  ];
  if (variant.disallowSecondGoal) {
    secondHalf.push({
      type: "goal_disallowed",
      team: HOME,
      reason: "offside",
      relatedGoalKey: "p2-goal-1",
    });
  }
  secondHalf.push(
    { type: "possession", team: AWAY, startX: 0.3, passes: 4, shot: false },
    { type: "possession", team: HOME, startX: -0.2, passes: 4, shot: true, onTarget: false },
    { type: "possession", team: AWAY, startX: 0.5, passes: 5, shot: true, onTarget: false },
    { type: "possession", team: HOME, startX: -0.5, passes: 5, shot: false },
    { type: "possession", team: AWAY, startX: 0.2, passes: 4, shot: false },
    { type: "possession", team: HOME, startX: -0.3, passes: 6, shot: true, onTarget: true },
    { type: "period_end", team: AWAY },
  );

  const periodDurationMs = 45 * 60_000;
  const halftimeDurationMs = 120_000;

  // `absoluteTime` in the engine adds the period offset to every beat's `atMs`,
  // so second-half beats must be generated relative to the start of period 2.
  const p1 = buildPeriodBeats(1, random, periodDurationMs, firstHalf, new Map([
    ["p1-goal-1", 120_000],
  ]));
  const p2 = buildPeriodBeats(2, random, periodDurationMs, secondHalf);

  if (variant.firstHalfGoal && !p1.some((beat) => beat.key === "p1-goal-1")) {
    throw new Error("scenario generator lost the reference goal beat");
  }

  return {
    id: variant.scenarioId,
    matchId: variant.matchId,
    seed: options.seed,
    periodDurationMs,
    halftimeDurationMs,
    beats: [...p1, ...p2],
  };
}

/** Every scenario variant, in a stable order. */
export const SCENARIO_VARIANTS: readonly ScenarioVariantId[] = [
  "demo",
  "no-correction",
  "double-correction",
  "high-score",
];

/** Seeds used by the robustness suite, one per variant. */
export const SCENARIO_SEEDS: readonly number[] = [20261020, 424242, 7, 99991];

export const DEMO_SCENARIO: Scenario = buildDemoScenario();

export function beatsForPeriod(
  scenario: Scenario,
  period: 1 | 2,
): readonly ScenarioBeat[] {
  return scenario.beats
    .filter((beatEntry) => beatEntry.period === period)
    .sort((a, b) => a.atMs - b.atMs);
}

export function absoluteBeatTime(
  scenario: Scenario,
  beatEntry: ScenarioBeat,
): number {
  const offset =
    beatEntry.period === 1
      ? 0
      : scenario.periodDurationMs + scenario.halftimeDurationMs;
  return offset + beatEntry.atMs;
}
