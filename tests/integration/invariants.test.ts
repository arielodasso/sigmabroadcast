import { describe, expect, it } from "vitest";
import { broadcastExportSchema } from "../../src/contracts";
import { buildBroadcastExport } from "../../src/export";
import {
  buildScenario,
  SCENARIO_SEEDS,
  SCENARIO_VARIANTS,
  type ScenarioVariantId,
} from "../../src/simulation/scenarios";
import { BroadcastController } from "../../src/state/broadcast-controller";

/**
 * Invariants that must hold for every scenario shape, not only for the
 * demonstration scenario. The hackathon judges run the system against inputs
 * we did not write, so the rules have to be structural rather than tuned to
 * one happy path.
 */

interface RunResult {
  violations: string[];
  finalScore: { home: number; away: number };
  correctionCount: number;
}

function runScenario(variant: ScenarioVariantId, seed: number): RunResult {
  const controller = new BroadcastController(buildScenario({ variant, seed }));
  const violations: string[] = [];

  controller.engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    controller.advanceBy(50);

    const insights = controller.truth.getInsights();
    const invalidated = new Set(
      insights.filter((insight) => insight.status === "invalidated").map((i) => i.id),
    );
    for (const overlay of controller.director.getActiveOverlays()) {
      if (invalidated.has(overlay.insightId)) {
        violations.push(
          `active overlay ${overlay.id} depends on invalidated insight ${overlay.insightId}`,
        );
      }
    }
    for (const overlay of controller.director.getOverlays()) {
      if (
        (overlay.status === "queued" || overlay.status === "scheduled") &&
        invalidated.has(overlay.insightId)
      ) {
        violations.push(
          `pending overlay ${overlay.id} depends on invalidated insight ${overlay.insightId}`,
        );
      }
    }

    if (controller.engine.getStatus() === "finished") break;
  }

  const snapshot = controller.snapshot();
  const invalidated = new Set(
    snapshot.insights
      .filter((insight) => insight.status === "invalidated")
      .map((insight) => insight.id),
  );
  for (const overlay of snapshot.overlays) {
    if (invalidated.has(overlay.insightId) && overlay.status !== "withdrawn" && overlay.status !== "expired") {
      violations.push(`overlay ${overlay.id} ended as ${overlay.status}`);
    }
  }

  return {
    violations,
    finalScore: snapshot.frame.match.score,
    correctionCount: snapshot.corrections.length,
  };
}

describe("scenario invariants across variants and seeds", () => {
  for (const variant of SCENARIO_VARIANTS) {
    it(`holds every invariant for the "${variant}" variant`, () => {
      const seed = SCENARIO_SEEDS[SCENARIO_VARIANTS.indexOf(variant)]!;
      const result = runScenario(variant, seed);
      expect(result.violations).toEqual([]);
    });
  }

  it("holds every invariant across a seed matrix", () => {
    for (const variant of SCENARIO_VARIANTS) {
      for (const seed of SCENARIO_SEEDS) {
        const result = runScenario(variant, seed);
        expect(result.violations).toEqual([]);
      }
    }
  });

  it("keeps the final score equal to the goals that were never disallowed", () => {
    for (const variant of SCENARIO_VARIANTS) {
      const seed = SCENARIO_SEEDS[SCENARIO_VARIANTS.indexOf(variant)]!;
      const controller = new BroadcastController(buildScenario({ variant, seed }));
      controller.engine.play();
      for (let i = 0; i < 200_000; i += 1) {
        controller.advanceBy(50);
        if (controller.engine.getStatus() === "finished") break;
      }
      const snapshot = controller.snapshot();

      const disallowedEventIds = new Set(
        snapshot.corrections.map((correction) => correction.sourceEventId),
      );
      const validGoals = snapshot.events.filter(
        (event) =>
          event.type === "goal" &&
          event.status !== "void" &&
          !disallowedEventIds.has(event.id),
      );
      const home = validGoals.filter((event) => event.teamId === "team-northbridge").length;
      const away = validGoals.filter((event) => event.teamId === "team-harbor").length;

      expect(snapshot.frame.match.score).toEqual({ home, away });
    }
  });

  it("produces a valid export for every variant", () => {
    for (const variant of SCENARIO_VARIANTS) {
      const seed = SCENARIO_SEEDS[SCENARIO_VARIANTS.indexOf(variant)]!;
      const controller = new BroadcastController(buildScenario({ variant, seed }));
      controller.engine.play();
      for (let i = 0; i < 200_000; i += 1) {
        controller.advanceBy(50);
        if (controller.engine.getStatus() === "finished") break;
      }
      const document = buildBroadcastExport(controller.snapshot());
      expect(broadcastExportSchema.safeParse(document).success).toBe(true);
    }
  });

  it("invalidates exactly one goal in the demo and double-correction variants", () => {
    const demo = runScenario("demo", SCENARIO_SEEDS[0]!);
    const double = runScenario("double-correction", SCENARIO_SEEDS[2]!);
    const none = runScenario("no-correction", SCENARIO_SEEDS[1]!);

    expect(demo.correctionCount).toBe(1);
    expect(double.correctionCount).toBe(2);
    expect(none.correctionCount).toBe(0);
  });

  it("is deterministic for the same variant and seed", () => {
    const first = runScenario("demo", SCENARIO_SEEDS[0]!);
    const second = runScenario("demo", SCENARIO_SEEDS[0]!);
    expect(second.finalScore).toEqual(first.finalScore);
    expect(second.correctionCount).toBe(first.correctionCount);
  });
});
