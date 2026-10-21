import { describe, expect, it } from "vitest";
import type { MatchInsight } from "../../src/contracts";
import { BroadcastDirector, MAX_BROADCAST_DELAY_MS } from "../../src/broadcast-sync";

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

describe("configurable broadcast delay", () => {
  it("defaults to no delay", () => {
    const director = new BroadcastDirector("match-demo-0001");
    expect(director.getBroadcastDelayMs()).toBe(0);
  });

  it("holds a graphic for the configured delay", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.setBroadcastDelayMs(20_000);
    const overlay = director.submit(makeInsight(), 0)!;

    expect(overlay.scheduledAtMs).toBe(20_000);
    director.tick(19_999);
    expect(overlay.status).toBe("scheduled");
    director.tick(20_000);
    expect(overlay.status).toBe("active");
    expect(overlay.startedAtMs).toBe(20_000);
  });

  it("clamps the delay to the supported maximum", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.setBroadcastDelayMs(999_999);
    expect(director.getBroadcastDelayMs()).toBe(MAX_BROADCAST_DELAY_MS);
    director.setBroadcastDelayMs(-5_000);
    expect(director.getBroadcastDelayMs()).toBe(0);
  });

  it("discards information that would reach air already out of date", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.setBroadcastDelayMs(45_000);
    const overlay = director.submit(
      makeInsight({ validUntilMs: 30_000 })!,
      0,
    )!;

    expect(overlay.status).toBe("withdrawn");
    expect(overlay.startedAtMs).toBeUndefined();
    const decisions = director.getDecisions();
    expect(decisions.some((decision) => decision.kind === "discarded")).toBe(true);
    expect(decisions.some((decision) => decision.kind === "activated")).toBe(false);
  });

  it("never airs a graphic whose insight was invalidated while it waited", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.setBroadcastDelayMs(30_000);
    const overlay = director.submit(makeInsight(), 0)!;
    expect(overlay.status).toBe("scheduled");

    director.handleInsightInvalidated("match-demo-0001-ins-1", 10_000);
    expect(overlay.status).toBe("withdrawn");

    director.tick(30_000);
    expect(overlay.status).toBe("withdrawn");
    expect(director.getActiveOverlays()).toHaveLength(0);
  });

  it("keeps the delay across a reset", () => {
    const director = new BroadcastDirector("match-demo-0001");
    director.setBroadcastDelayMs(10_000);
    director.reset();
    expect(director.getBroadcastDelayMs()).toBe(10_000);
  });
});
