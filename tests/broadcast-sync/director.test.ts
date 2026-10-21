import { describe, expect, it } from "vitest";
import type { MatchInsight } from "../../src/contracts";
import {
  applyCorrection,
  BroadcastDirector,
  durationFor,
  SLOT_BY_CATEGORY,
} from "../../src/broadcast-sync";
import { InsightEngine } from "../../src/match-truth/insight-engine";
import { MatchEngine } from "../../src/simulation/engine";
import { DEMO_SCENARIO } from "../../src/simulation/scenarios";

function makeInsight(overrides: Partial<MatchInsight> = {}): MatchInsight {
  return {
    id: "match-demo-0001-ins-1",
    matchId: "match-demo-0001",
    category: "tactical",
    headline: "Test insight",
    explanation: "Test",
    priority: 55,
    evidenceEventIds: ["match-demo-0001-e1"],
    createdAtMs: 0,
    status: "validated",
    audienceText: { analyst: "a", fan: "b" },
    ...overrides,
  };
}

describe("BroadcastDirector scheduling", () => {
  it("queues then schedules an insight and shows it after the delay", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const overlay = director.submit(makeInsight(), 0);
    expect(overlay).not.toBeNull();
    expect(overlay!.status).toBe("scheduled");
    expect(overlay!.scheduledAtMs).toBe(3_000);

    director.tick(2_999);
    expect(overlay!.status).toBe("scheduled");
    director.tick(3_000);
    expect(overlay!.status).toBe("active");
    expect(overlay!.startedAtMs).toBe(3_000);
  });

  it("expires an active overlay when its duration elapses", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const overlay = director.submit(makeInsight({ priority: 55 }), 0)!;
    const duration = durationFor(55);
    director.tick(3_000);
    expect(overlay.status).toBe("active");
    director.tick(3_000 + duration);
    expect(overlay.status).toBe("expired");
    expect(director.getActiveOverlays()).toHaveLength(0);
  });

  it("keeps only one active overlay per slot", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const first = director.submit(makeInsight({ priority: 55 }), 0)!;
    const duration = durationFor(55);
    director.tick(3_000);
    expect(first.status).toBe("active");

    const second = director.submit(
      makeInsight({ id: "ins-2", headline: "Second insight", priority: 60 }),
      4_000,
    )!;
    expect(second.status).toBe("queued");
    director.tick(5_000);
    expect(second.status).toBe("queued");
    expect(first.status).toBe("active");

    director.tick(3_000 + duration);
    expect(first.status).toBe("expired");
    director.tick(3_000 + duration + 3_000);
    expect(second.status).toBe("active");
  });

  it("preempts a lower-priority overlay in the same slot", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const first = director.submit(makeInsight({ priority: 50 }), 0)!;
    director.tick(3_000);
    expect(first.status).toBe("active");

    const second = director.submit(
      makeInsight({ id: "ins-2", headline: "Second insight", priority: 85 }),
      5_000,
    )!;
    expect(first.status).toBe("withdrawn");
    expect(second.status).toBe("scheduled");
    director.tick(8_000);
    expect(second.status).toBe("active");
    const preemption = director
      .getDecisions()
      .find((decision) => decision.kind === "preempted");
    expect(preemption).toBeDefined();
  });

  it("allows different slots to run concurrently", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const lower = director.submit(
      makeInsight({ id: "ins-lt", category: "match_event", priority: 75 }),
      0,
    )!;
    const side = director.submit(
      makeInsight({ id: "ins-sp", headline: "Side insight", category: "tactical", priority: 55 }),
      0,
    )!;
    expect(lower.slot).toBe("lower_third");
    expect(side.slot).toBe("side_panel");
    director.tick(3_000);
    expect(lower.status).toBe("active");
    expect(side.status).toBe("active");
  });

  it("does not create duplicate overlays for the same insight", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const insight = makeInsight();
    director.submit(insight, 0);
    expect(director.submit(insight, 1_000)).toBeNull();
    expect(director.getOverlays()).toHaveLength(1);
  });

  it("discards an equivalent overlay already on air", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.submit(makeInsight({ id: "ins-a", headline: "Goal" }), 0);
    const duplicate = director.submit(
      makeInsight({ id: "ins-b", headline: "Goal" }),
      1_000,
    );
    expect(duplicate).toBeNull();
    expect(
      director.getDecisions().some((decision) => decision.kind === "discarded"),
    ).toBe(true);
  });

  it("does not schedule an insight that is already invalidated", () => {
    const director = new BroadcastDirector("match-demo-0001");
    const overlay = director.submit(
      makeInsight({ status: "invalidated" }),
      0,
    );
    expect(overlay).toBeNull();
  });

  it("records an auditable decision history", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.submit(makeInsight(), 0);
    director.tick(3_000);
    director.tick(3_000 + durationFor(55));
    const kinds = director.getDecisions().map((decision) => decision.kind);
    expect(kinds).toContain("queued");
    expect(kinds).toContain("scheduled");
    expect(kinds).toContain("activated");
    expect(kinds).toContain("expired");
    for (const decision of director.getDecisions()) {
      expect(decision.id).toBeTruthy();
      expect(decision.reason).toBeTruthy();
    }
  });
});

describe("correction flow", () => {
  function runDemo(): MatchEngine {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    for (let i = 0; i < 200_000; i += 1) {
      engine.advanceBy(50);
      if (engine.getStatus() === "finished") break;
    }
    return engine;
  }

  it("withdraws overlays tied to invalidated insights after a correction", () => {
    const engine = runDemo();
    const truth = new InsightEngine(DEMO_SCENARIO.matchId);
    const director = new BroadcastDirector(DEMO_SCENARIO.matchId);

    for (const event of engine.getEvents()) truth.ingest(event);
    const batch = truth.detect();
    for (const insight of batch.created) {
      if (insight.headline === "Goal") director.submit(insight, insight.createdAtMs);
    }
    director.tick(170_000);
    const goalOverlay = director
      .getOverlays()
      .find((overlay) =>
        overlay.insightId.includes("ins") && overlay.status === "active",
      );
    expect(goalOverlay).toBeDefined();

    const correction = engine.getCorrections()[0]!;
    const outcome = applyCorrection(correction, truth, director, 170_000);
    expect(outcome.invalidatedInsightIds.length).toBeGreaterThan(0);
    expect(goalOverlay!.status).toBe("withdrawn");
    expect(
      director.getDecisions().some(
        (decision) =>
          decision.kind === "withdrawn" && decision.reason.includes("invalidated"),
      ),
    ).toBe(true);
  });

  it("slot mapping follows the documented rules", () => {
    expect(SLOT_BY_CATEGORY.match_event).toBe("lower_third");
    expect(SLOT_BY_CATEGORY.milestone).toBe("lower_third");
    expect(SLOT_BY_CATEGORY.tactical).toBe("side_panel");
    expect(SLOT_BY_CATEGORY.performance).toBe("side_panel");
  });
});
