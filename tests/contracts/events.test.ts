import { describe, expect, it } from "vitest";
import {
  correctionEventSchema,
  matchEventSchema,
  validateEventSequence,
  type MatchEvent,
  type MatchEventType,
} from "../../src/contracts/events";

const baseEvent: MatchEvent = {
  id: "match-0001-e1",
  matchId: "match-0001",
  sequence: 1,
  type: "kickoff",
  period: 1,
  clockMs: 0,
  occurredAtMs: 0,
  teamId: "team-northbridge",
  payload: {},
  status: "valid",
};

const payloadFixtures: Record<MatchEventType, unknown> = {
  kickoff: {},
  pass: { successful: true },
  ball_recovery: { zone: "advanced" },
  pressure: { intensity: 0.4 },
  shot: { onTarget: true },
  goal: {},
  goal_disallowed: { reason: "offside" },
  possession_change: {},
  period_end: {},
};

describe("matchEventSchema", () => {
  it("accepts a valid kickoff event", () => {
    expect(matchEventSchema.safeParse(baseEvent).success).toBe(true);
  });

  it("accepts every event type with its declared payload shape", () => {
    for (const [type, payload] of Object.entries(payloadFixtures)) {
      const result = matchEventSchema.safeParse({
        ...baseEvent,
        type,
        payload,
        ...(type === "goal_disallowed"
          ? { relatedEventId: "match-0001-e10" }
          : {}),
      });
      expect(result.success, `type ${type} should be valid`).toBe(true);
    }
  });

  it("rejects a payload that does not match the type schema", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      type: "pass",
      payload: { successful: "yes" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown payload keys", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      type: "shot",
      payload: { onTarget: true, xg: 0.3 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a pressure intensity outside 0..1", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      type: "pressure",
      payload: { intensity: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects goal_disallowed without relatedEventId", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      type: "goal_disallowed",
      payload: { reason: "offside" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts goal_disallowed referencing the original goal", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      id: "match-0001-e12",
      sequence: 12,
      type: "goal_disallowed",
      relatedEventId: "match-0001-e11",
      payload: { reason: "offside" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects sequence values below 1", () => {
    const result = matchEventSchema.safeParse({ ...baseEvent, sequence: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields", () => {
    const result = matchEventSchema.safeParse({ ...baseEvent, comment: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown event type", () => {
    const result = matchEventSchema.safeParse({
      ...baseEvent,
      type: "red_card",
    });
    expect(result.success).toBe(false);
  });
});

describe("correctionEventSchema", () => {
  it("accepts a valid correction", () => {
    const result = correctionEventSchema.safeParse({
      id: "match-0001-c13",
      matchId: "match-0001",
      sourceEventId: "match-0001-e11",
      sequence: 13,
      clockMs: 1_800_000,
      reason: "VAR offside: goal disallowed",
      replacementEventId: "match-0001-e12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a correction without a source event", () => {
    const result = correctionEventSchema.safeParse({
      id: "match-0001-c13",
      matchId: "match-0001",
      sourceEventId: "",
      sequence: 13,
      clockMs: 1_800_000,
      reason: "VAR offside: goal disallowed",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateEventSequence", () => {
  it("accepts a strictly increasing sequence", () => {
    expect(
      validateEventSequence([{ sequence: 1 }, { sequence: 2 }, { sequence: 5 }]),
    ).toEqual({ ok: true });
  });

  it("rejects a repeated sequence number", () => {
    expect(
      validateEventSequence([{ sequence: 1 }, { sequence: 1 }]),
    ).toEqual({ ok: false, offendingIndex: 1 });
  });

  it("rejects a decreasing sequence number", () => {
    expect(
      validateEventSequence([{ sequence: 3 }, { sequence: 2 }]),
    ).toEqual({ ok: false, offendingIndex: 1 });
  });

  it("accepts an empty log", () => {
    expect(validateEventSequence([])).toEqual({ ok: true });
  });
});
