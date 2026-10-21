import { describe, expect, it } from "vitest";
import {
  broadcastOverlaySchema,
  type BroadcastOverlay,
} from "../../src/contracts/overlays";

const baseOverlay: BroadcastOverlay = {
  id: "overlay-0001",
  matchId: "match-0001",
  insightId: "insight-0001",
  priority: 55,
  status: "scheduled",
  scheduledAtMs: 1_510_000,
  startedAtMs: 1_512_000,
  expiresAtMs: 1_527_000,
  slot: "lower_third",
  version: 0,
};

describe("broadcastOverlaySchema", () => {
  it("accepts a valid scheduled overlay", () => {
    expect(broadcastOverlaySchema.safeParse(baseOverlay).success).toBe(true);
  });

  it("accepts a queued overlay without timestamps", () => {
    const result = broadcastOverlaySchema.safeParse({
      id: "overlay-0002",
      matchId: "match-0001",
      insightId: "insight-0002",
      priority: 80,
      status: "queued",
      slot: "side_panel",
      version: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown slot", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      slot: "ticker",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown overlay status", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      status: "playing",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative version", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      version: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a priority outside 0..100", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      priority: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional blockedBy reference", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      blockedBy: "overlay-0003",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown top-level fields", () => {
    const result = broadcastOverlaySchema.safeParse({
      ...baseOverlay,
      zIndex: 10,
    });
    expect(result.success).toBe(false);
  });
});
