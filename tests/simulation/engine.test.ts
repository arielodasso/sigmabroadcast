import { describe, expect, it } from "vitest";
import { validateEventSequence } from "../../src/contracts/events";
import { MatchEngine } from "../../src/simulation/engine";
import { DEMO_SCENARIO } from "../../src/simulation/scenarios";

function runToCompletion(engine: MatchEngine): void {
  engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    const batch = engine.advanceBy(50);
    if (engine.getStatus() === "finished") break;
    void batch;
  }
}

function eventSignature(engine: MatchEngine): Array<[string, number, string]> {
  return engine.getEvents().map((e) => [e.type, e.clockMs, e.playerId ?? ""]);
}

describe("MatchEngine determinism", () => {
  it("produces the same event sequence for the same seed", () => {
    const a = new MatchEngine(DEMO_SCENARIO);
    const b = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(a);
    runToCompletion(b);
    expect(eventSignature(a)).toEqual(eventSignature(b));
    expect(a.getEvents().length).toBe(b.getEvents().length);
    expect(a.getEvents().length).toBeGreaterThan(10);
  });

  it("assigns strictly increasing sequence numbers", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    const sequences = engine.getEvents().map((e) => e.sequence);
    expect(validateEventSequence(engine.getEvents())).toEqual({ ok: true });
    expect(sequences[0]).toBe(1);
  });

  it("assigns deterministic ids derived from sequence", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    for (const event of engine.getEvents()) {
      expect(event.id).toBe(`${DEMO_SCENARIO.matchId}-e${event.sequence}`);
    }
  });

  it("every emitted event passes schema validation", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    for (const event of engine.getEvents()) {
      expect(event.status).not.toBe("void");
      expect(event.period === 1 || event.period === 2).toBe(true);
    }
    expect(engine.getEvents().length).toBe(DEMO_SCENARIO.beats.length);
  });

  it("keeps occurredAtMs monotonic across periods", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    let previous = -1;
    for (const event of engine.getEvents()) {
      expect(event.occurredAtMs).toBeGreaterThanOrEqual(previous);
      previous = event.occurredAtMs;
    }
  });
});

describe("MatchEngine clock and controls", () => {
  it("pause stops the logical clock", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    engine.advanceBy(10_000);
    const clock = engine.getFrame().match.clockMs;
    engine.pause();
    engine.advanceBy(10_000);
    expect(engine.getFrame().match.clockMs).toBe(clock);
    expect(engine.getStatus()).toBe("paused");
  });

  it("playback speed does not change results or event order", () => {
    const fast = new MatchEngine(DEMO_SCENARIO);
    const slow = new MatchEngine(DEMO_SCENARIO);
    fast.play();
    fast.setSpeed(8);
    slow.play();
    slow.setSpeed(1);
    for (let i = 0; i < 20_000; i += 1) {
      fast.advanceBy(50);
      slow.advanceBy(400);
      if (fast.getStatus() === "finished") break;
    }
    expect(eventSignature(fast)).toEqual(eventSignature(slow));
    expect(fast.getFrame().match.score).toEqual(slow.getFrame().match.score);
  });

  it("reset restores the initial state", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    expect(engine.getStatus()).toBe("finished");
    engine.reset();
    expect(engine.getStatus()).toBe("idle");
    const frame = engine.getFrame();
    expect(frame.match.clockMs).toBe(0);
    expect(frame.match.score).toEqual({ home: 0, away: 0 });
    expect(engine.getEvents()).toHaveLength(0);
  });

  it("does not advance while idle", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.advanceBy(60_000);
    expect(engine.getFrame().match.clockMs).toBe(0);
    expect(engine.getEvents()).toHaveLength(0);
  });
});

describe("MatchEngine demo scenario and correction", () => {  it("emits the goal and the disallowed-goal correction", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    const goal = engine.getEvents().find((e) => e.type === "goal");
    const disallowed = engine.getEvents().find((e) => e.type === "goal_disallowed");
    expect(goal).toBeDefined();
    expect(disallowed).toBeDefined();
    expect(disallowed?.relatedEventId).toBe(goal?.id);
    expect(goal?.status).toBe("corrected");

    const corrections = engine.getCorrections();
    expect(corrections).toHaveLength(1);
    expect(corrections[0]?.sourceEventId).toBe(goal?.id);
  });

  it("recomputes the score after the correction", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    let sawScoreOne = false;
    for (let i = 0; i < 200_000; i += 1) {
      engine.advanceBy(50);
      const { score } = engine.getFrame().match;
      if (score.home === 1) sawScoreOne = true;
    }
    expect(sawScoreOne).toBe(true);
    const finalScore = engine.getFrame().match.score;
    expect(finalScore.home).toBe(1);
    expect(finalScore.away).toBe(0);
  });

  it("finishes with status finished and period 2", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(engine);
    const frame = engine.getFrame();
    expect(frame.match.status).toBe("finished");
    expect(frame.match.period).toBe(2);
    expect(engine.getStatus()).toBe("finished");
  });

  it("produces the same corrections for the same seed", () => {
    const a = new MatchEngine(DEMO_SCENARIO);
    const b = new MatchEngine(DEMO_SCENARIO);
    runToCompletion(a);
    runToCompletion(b);
    expect(a.getCorrections()).toEqual(b.getCorrections());
  });
});

function minPairDistance(engine: MatchEngine): number {
  const players = engine.getFrame().players;
  let min = Infinity;
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i]!;
      const b = players[j]!;
      const dx = b.position.x - a.position.x;
      const dz = b.position.z - a.position.z;
      min = Math.min(min, Math.hypot(dx, dz));
    }
  }
  return min;
}

describe("MatchEngine player positioning", () => {
  it("keeps players spread out instead of clumping", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    let worstGap = Infinity;
    for (let i = 0; i < 4_000; i += 1) {
      engine.advanceBy(500);
      worstGap = Math.min(worstGap, minPairDistance(engine));
      if (engine.getStatus() === "finished") break;
    }
    expect(worstGap).toBeGreaterThan(2);
  });

  it("keeps both teams on opposite halves on average", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    for (let i = 0; i < 1_000; i += 1) {
      engine.advanceBy(1000);
    }
    const players = engine.getFrame().players;
    const homeId = engine.getFrame().match.homeTeamId;
    let homeSum = 0;
    let awaySum = 0;
    for (const player of players) {
      if (player.teamId === homeId) homeSum += player.position.x;
      else awaySum += player.position.x;
    }
    expect(homeSum).toBeLessThan(0);
    expect(awaySum).toBeGreaterThan(0);
  });

  it("keeps every player inside the pitch bounds", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    for (let i = 0; i < 4_000; i += 1) {
      engine.advanceBy(500);
      if (i % 10 !== 0) continue;
      for (const player of engine.getFrame().players) {
        expect(player.position.x).toBeGreaterThanOrEqual(-52);
        expect(player.position.x).toBeLessThanOrEqual(52);
        expect(player.position.z).toBeGreaterThanOrEqual(-34);
        expect(player.position.z).toBeLessThanOrEqual(34);
      }
      if (engine.getStatus() === "finished") break;
    }
  });
});
