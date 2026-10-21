import { describe, expect, it } from "vitest";
import {
  matchSchema,
  playerSchema,
  teamSchema,
  type Match,
} from "../../src/contracts/match";

const baseMatch: Match = {
  id: "match-0001",
  seed: 42,
  homeTeamId: "team-northbridge",
  awayTeamId: "team-eastvale",
  status: "live",
  period: 1,
  clockMs: 1_234_000,
  score: { home: 1, away: 0 },
  eventSequence: 17,
};

describe("matchSchema", () => {
  it("accepts a valid live match", () => {
    expect(matchSchema.safeParse(baseMatch).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const result = matchSchema.safeParse({ ...baseMatch, status: "paused" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid period", () => {
    const result = matchSchema.safeParse({ ...baseMatch, period: 3 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative clock", () => {
    const result = matchSchema.safeParse({ ...baseMatch, clockMs: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative score", () => {
    const result = matchSchema.safeParse({
      ...baseMatch,
      score: { home: -1, away: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields", () => {
    const result = matchSchema.safeParse({ ...baseMatch, referee: "x" });
    expect(result.success).toBe(false);
  });
});

describe("teamSchema", () => {
  it("accepts a valid team", () => {
    const result = teamSchema.safeParse({
      id: "team-northbridge",
      name: "Northbridge FC",
      shortName: "NBR",
      color: "#1f6feb",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing shortName", () => {
    const result = teamSchema.safeParse({
      id: "team-northbridge",
      name: "Northbridge FC",
      color: "#1f6feb",
    });
    expect(result.success).toBe(false);
  });
});

describe("playerSchema", () => {
  it("accepts a valid player", () => {
    const result = playerSchema.safeParse({
      id: "p-001",
      teamId: "team-northbridge",
      name: "Alex Rivera",
      shirtNumber: 10,
      role: "MID",
      position: { x: -10, y: 0, z: 3 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects shirt number 0", () => {
    const result = playerSchema.safeParse({
      id: "p-001",
      teamId: "team-northbridge",
      name: "Alex Rivera",
      shirtNumber: 0,
      role: "MID",
      position: { x: -10, y: 0, z: 3 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown role", () => {
    const result = playerSchema.safeParse({
      id: "p-001",
      teamId: "team-northbridge",
      name: "Alex Rivera",
      shirtNumber: 10,
      role: "COACH",
      position: { x: -10, y: 0, z: 3 },
    });
    expect(result.success).toBe(false);
  });
});
