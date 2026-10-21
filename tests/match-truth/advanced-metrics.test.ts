import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../src/contracts";
import {
  computePassMetrics,
  computeShotMetrics,
  groundDistance,
  inferHomeTeamId,
  MAX_STRIKE_SPEED_MS,
  MIN_STRIKE_SPEED_MS,
} from "../../src/match-truth/advanced-metrics";

const HOME = "team-north";
const AWAY = "team-south";

function event(
  overrides: Partial<MatchEvent> & Pick<MatchEvent, "id" | "sequence" | "type">,
): MatchEvent {
  return {
    matchId: "match-test-0001",
    period: 1,
    clockMs: overrides.occurredAtMs ?? 0,
    occurredAtMs: 0,
    payload: {},
    status: "valid",
    ...overrides,
  } as MatchEvent;
}

describe("advanced metrics", () => {
  it("measures ground distance between two positions", () => {
    expect(
      groundDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 }),
    ).toBe(5);
  });

  it("infers the home team from the kickoff", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({ id: "e2", sequence: 2, type: "pass", teamId: AWAY }),
    ];
    expect(inferHomeTeamId(events)).toBe(HOME);
  });

  it("grades progressive passes higher than backward ones", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({
        id: "e2",
        sequence: 2,
        type: "pass",
        teamId: HOME,
        occurredAtMs: 1_000,
        position: { x: 0, y: 0, z: 0 },
        targetPosition: { x: 30, y: 0, z: 0 },
        payload: { successful: true },
      }),
      event({
        id: "e3",
        sequence: 3,
        type: "pass",
        teamId: HOME,
        occurredAtMs: 2_000,
        position: { x: 0, y: 0, z: 0 },
        targetPosition: { x: -30, y: 0, z: 0 },
        payload: { successful: true },
      }),
    ];

    const metrics = computePassMetrics(events, HOME);
    expect(metrics).toHaveLength(2);
    expect(metrics[0]!.distanceM).toBe(30);
    expect(metrics[0]!.progressive).toBe(true);
    expect(metrics[1]!.progressive).toBe(false);
    expect(metrics[0]!.difficulty).toBeGreaterThan(metrics[1]!.difficulty);
  });

  it("treats the away team as attacking towards -x", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({
        id: "e2",
        sequence: 2,
        type: "pass",
        teamId: AWAY,
        occurredAtMs: 1_000,
        position: { x: 0, y: 0, z: 0 },
        targetPosition: { x: -30, y: 0, z: 0 },
        payload: { successful: true },
      }),
    ];

    const metrics = computePassMetrics(events, HOME);
    expect(metrics[0]!.progressive).toBe(true);
  });

  it("flags passes played under opponent pressure", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({
        id: "e2",
        sequence: 2,
        type: "pressure",
        teamId: AWAY,
        occurredAtMs: 1_000,
        payload: { intensity: 0.9 },
      }),
      event({
        id: "e3",
        sequence: 3,
        type: "pass",
        teamId: HOME,
        occurredAtMs: 2_000,
        position: { x: 0, y: 0, z: 0 },
        targetPosition: { x: 10, y: 0, z: 0 },
        payload: { successful: true },
      }),
    ];

    const metrics = computePassMetrics(events, HOME);
    expect(metrics[0]!.underPressure).toBe(true);
  });

  it("estimates shot speed inside the physical bounds", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({
        id: "e2",
        sequence: 2,
        type: "shot",
        teamId: HOME,
        occurredAtMs: 10_000,
        position: { x: 30, y: 0, z: 0 },
        targetPosition: { x: 50, y: 0, z: 0 },
        payload: { onTarget: true },
      }),
      event({
        id: "e3",
        sequence: 3,
        type: "goal",
        teamId: HOME,
        occurredAtMs: 12_000,
      }),
    ];

    const metrics = computeShotMetrics(events, HOME);
    expect(metrics).toHaveLength(1);
    const shot = metrics[0]!;
    expect(shot.distanceM).toBe(20);
    expect(shot.estimatedSpeedMs).toBeGreaterThanOrEqual(MIN_STRIKE_SPEED_MS);
    expect(shot.estimatedSpeedMs).toBeLessThanOrEqual(MAX_STRIKE_SPEED_MS);
    expect(shot.estimatedSpeedKmh).toBeCloseTo(shot.estimatedSpeedMs * 3.6, 1);
    expect(shot.distanceToGoalM).toBeCloseTo(52.5 - 30, 1);
    expect(shot.onTarget).toBe(true);
  });

  it("ignores voided events", () => {
    const events = [
      event({ id: "e1", sequence: 1, type: "kickoff", teamId: HOME }),
      event({
        id: "e2",
        sequence: 2,
        type: "shot",
        teamId: HOME,
        status: "void",
        occurredAtMs: 1_000,
        position: { x: 30, y: 0, z: 0 },
        targetPosition: { x: 50, y: 0, z: 0 },
        payload: { onTarget: true },
      }),
    ];
    expect(computeShotMetrics(events, HOME)).toHaveLength(0);
  });
});
