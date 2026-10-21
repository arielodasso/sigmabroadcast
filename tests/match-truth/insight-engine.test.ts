import { describe, expect, it } from "vitest";
import type { CorrectionEvent, MatchEvent } from "../../src/contracts";
import { InsightEngine } from "../../src/match-truth/insight-engine";
import { computeStats } from "../../src/match-truth/stats";
import { validateAll } from "../../src/match-truth/validation";
import { MatchEngine } from "../../src/simulation/engine";
import { DEMO_SCENARIO } from "../../src/simulation/scenarios";

function runDemo(): MatchEngine {
  const engine = new MatchEngine(DEMO_SCENARIO);
  engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    engine.advanceBy(50);
    if (engine.getStatus() === "finished") break;
  }
  return engine;
}

function fullInsights(engine: MatchEngine): InsightEngine {
  const truth = new InsightEngine(DEMO_SCENARIO.matchId);
  for (const event of engine.getEvents()) truth.ingest(event);
  truth.detect();
  return truth;
}

describe("computeStats", () => {
  it("computes passes, shots and recoveries from the demo match", () => {
    const engine = runDemo();
    const stats = computeStats(engine.getEvents());
    const home = stats.teams["team-northbridge"];
    expect(home).toBeDefined();
    expect(home!.passesAttempted).toBeGreaterThan(0);
    expect(home!.passesCompleted).toBeGreaterThan(0);
    expect(home!.shots).toBeGreaterThanOrEqual(3);
    expect(home!.recoveries.advanced).toBeGreaterThanOrEqual(1);
  });

  it("possession percentages are normalized and non-negative", () => {
    const engine = runDemo();
    const stats = computeStats(engine.getEvents());
    const total = Object.values(stats.possessionByTeam).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThanOrEqual(101);
    for (const value of Object.values(stats.possessionByTeam)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("ignores void events", () => {
    const base: MatchEvent = {
      id: "m-e1",
      matchId: "m",
      sequence: 1,
      type: "pass",
      period: 1,
      clockMs: 0,
      occurredAtMs: 0,
      teamId: "team-northbridge",
      payload: { successful: true },
      status: "void",
    };
    const stats = computeStats([base]);
    expect(stats.teams["team-northbridge"]?.passesAttempted ?? 0).toBe(0);
    expect(stats.possessionByTeam["team-northbridge"] ?? 0).toBe(0);
  });
});

describe("InsightEngine detectors", () => {
  it("creates a goal insight with real evidence", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const goalInsight = truth
      .getInsights()
      .find((insight) => insight.headline === "Goal");
    expect(goalInsight).toBeDefined();
    expect(goalInsight!.evidenceEventIds.length).toBeGreaterThan(0);
    const eventIds = new Set(engine.getEvents().map((e) => e.id));
    for (const id of goalInsight!.evidenceEventIds) {
      expect(eventIds.has(id)).toBe(true);
    }
  });

  it("creates an advanced-recovery tactical insight", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const recovery = truth
      .getInsights()
      .find((insight) => insight.headline === "Recovery in the final third");
    expect(recovery).toBeDefined();
    expect(recovery!.category).toBe("tactical");
  });

  it("creates a pressure-conversion insight backed by pressure events", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const pressure = truth
      .getInsights()
      .find((insight) => insight.headline === "Sustained pressure converted");
    expect(pressure).toBeDefined();
    const events = new Map(engine.getEvents().map((e) => [e.id, e]));
    const pressureEvidence = pressure!.evidenceEventIds.filter(
      (id) => events.get(id)?.type === "pressure",
    );
    expect(pressureEvidence.length).toBeGreaterThanOrEqual(2);
  });

  it("creates a disallowed-goal insight after the correction", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const disallowed = truth
      .getInsights()
      .find((insight) => insight.headline === "Goal disallowed");
    expect(disallowed).toBeDefined();
    expect(disallowed!.priority).toBe(90);
  });

  it("passes its own validation for every generated insight", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    expect(truth.getValidationIssues()).toEqual([]);
    expect(validateAll(truth.getInsights(), engine.getEvents())).toEqual([]);
    expect(truth.getInsights().length).toBeGreaterThan(3);
  });

  it("analyst and fan texts share the same factual basis", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    for (const insight of truth.getInsights()) {
      expect(insight.audienceText.analyst).toBeTruthy();
      expect(insight.audienceText.fan).toBeTruthy();
      expect(insight.evidenceEventIds.length).toBeGreaterThan(0);
    }
  });
});

describe("InsightEngine invalidation", () => {
  function correctionFor(goalId: string, replacementId: string): CorrectionEvent {
    return {
      id: "match-demo-0001-c99",
      matchId: "match-demo-0001",
      sourceEventId: goalId,
      sequence: 99,
      clockMs: 200_000,
      reason: "offside",
      replacementEventId: replacementId,
    };
  }

  it("invalidates insights that depend on a corrected event", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const goal = engine.getEvents().find((e) => e.type === "goal")!;
    const disallowed = engine
      .getEvents()
      .find((e) => e.type === "goal_disallowed")!;

    const before = truth
      .getInsights()
      .filter((i) => i.evidenceEventIds.includes(goal.id))
      .map((i) => i.id);
    expect(before.length).toBeGreaterThan(0);

    const batch = truth.handleCorrections([correctionFor(goal.id, disallowed.id)]);
    const invalidatedIds = new Set(batch.invalidated.map((i) => i.id));
    for (const id of before) {
      const insight = truth.getInsights().find((i) => i.id === id);
      const isCorrectionInsight = insight?.evidenceEventIds.includes(disallowed.id);
      if (isCorrectionInsight) continue;
      expect(invalidatedIds.has(id)).toBe(true);
      expect(insight?.status).toBe("invalidated");
    }
  });

  it("keeps the disallowed-goal insight valid after the correction", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const goal = engine.getEvents().find((e) => e.type === "goal")!;
    const disallowed = engine
      .getEvents()
      .find((e) => e.type === "goal_disallowed")!;
    truth.handleCorrections([correctionFor(goal.id, disallowed.id)]);
    const disallowedInsight = truth
      .getInsights()
      .find((i) => i.headline === "Goal disallowed");
    expect(disallowedInsight?.status).toBe("validated");
  });

  it("expires insights once their validUntilMs has passed", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const expired = truth.refreshValidity(2_000_000_000);
    expect(expired.length).toBeGreaterThan(0);
    for (const insight of expired) {
      expect(insight.status).toBe("invalidated");
      expect(insight.validUntilMs).toBeDefined();
    }
  });

  it("does not create duplicate insights on repeated detect() calls", () => {
    const engine = runDemo();
    const truth = fullInsights(engine);
    const first = truth.getInsights().length;
    truth.detect();
    truth.detect();
    expect(truth.getInsights().length).toBe(first);
  });
});
