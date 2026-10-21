import { describe, expect, it } from "vitest";
import { matchInsightSchema, type MatchInsight } from "../../src/contracts/insights";

const baseInsight: MatchInsight = {
  id: "insight-0001",
  matchId: "match-0001",
  category: "tactical",
  headline: "High press recovery in advanced zone",
  explanation:
    "Northbridge recovered the ball twice in the opponent half within 45 seconds.",
  priority: 55,
  evidenceEventIds: ["match-0001-e7", "match-0001-e9"],
  createdAtMs: 1_500_000,
  status: "validated",
  audienceText: {
    analyst: "2 recoveries in final third, 45s window, xT +0.08.",
    fan: "Northbridge are winning the ball back high up the pitch!",
  },
};

describe("matchInsightSchema", () => {
  it("accepts a valid insight with both audience texts", () => {
    expect(matchInsightSchema.safeParse(baseInsight).success).toBe(true);
  });

  it("accepts an insight with only one audience text", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      audienceText: { fan: "Northbridge are pressing high!" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an insight with no evidence events", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      evidenceEventIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a priority outside 0..100", () => {
    const high = matchInsightSchema.safeParse({ ...baseInsight, priority: 101 });
    const low = matchInsightSchema.safeParse({ ...baseInsight, priority: -1 });
    expect(high.success).toBe(false);
    expect(low.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      category: "rumor",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown insight status", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown audience modes", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      audienceText: { coach: "press higher" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative validUntilMs", () => {
    const result = matchInsightSchema.safeParse({
      ...baseInsight,
      validUntilMs: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields", () => {
    const result = matchInsightSchema.safeParse({ ...baseInsight, model: "gpt" });
    expect(result.success).toBe(false);
  });
});
