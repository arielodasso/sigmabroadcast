import { describe, expect, it } from "vitest";
import { localizeInsight, resolveInsightKey } from "../../src/match-truth/insight-text";
import { buildNarrativeRecap, localizeRecap } from "../../src/match-truth/narrative";
import { computeStats } from "../../src/match-truth/stats";
import { BroadcastController } from "../../src/state/broadcast-controller";
import { DEMO_SCENARIO } from "../../src/simulation/scenarios";
import { MatchEngine } from "../../src/simulation/engine";

function runToEnd(controller: BroadcastController): void {
  controller.engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    controller.advanceBy(50);
    if (controller.engine.getStatus() === "finished") break;
  }
}

describe("insight localisation", () => {
  it("maps insight ids to stable message keys", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const insights = controller.snapshot().insights;
    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(resolveInsightKey(insight)).not.toBeNull();
    }
  });

  it("renders the same insight in english and spanish", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const goal = snapshot.insights.find((insight) => insight.headline === "Goal");
    expect(goal).toBeDefined();

    const en = localizeInsight("en", goal!, snapshot.events);
    const es = localizeInsight("es", goal!, snapshot.events);

    expect(en.headline).toBe("Goal");
    expect(es.headline).toBe("Gol");
    expect(en.explanation).not.toBe(es.explanation);
    expect(en.analyst).toContain("event");
    expect(es.analyst).toContain("evento");
  });
});

describe("narrative recap", () => {
  it("is not produced before full time", () => {
    const controller = new BroadcastController();
    controller.engine.play();
    for (let i = 0; i < 100; i += 1) controller.advanceBy(50);
    expect(controller.getRecap()).toBeNull();
  });

  it("is produced automatically at full time", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const recap = controller.getRecap();

    expect(recap).not.toBeNull();
    expect(recap!.result).toEqual({ home: 1, away: 0, outcome: "home_win" });
    expect(recap!.sentences.length).toBeGreaterThan(2);
    expect(recap!.moments.length).toBeGreaterThan(0);
    expect(recap!.statistics.home.length).toBeGreaterThan(0);
    expect(recap!.statistics.away.length).toBeGreaterThan(0);
  });

  it("mentions the disallowed goal as a correction", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const recap = controller.getRecap()!;
    const correction = recap.sentences.find(
      (sentence) => sentence.key === "recap.sentence.correction",
    );
    expect(correction).toBeDefined();
    expect(correction!.vars.reason).toBe("offside");
  });

  it("lists the goals and the shots on target as key moments", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const recap = controller.getRecap()!;
    const kinds = recap.moments.map((moment) => moment.kind);
    expect(kinds).toContain("goal");
    expect(kinds).toContain("goal_disallowed");
    expect(kinds).toContain("shot_on_target");
  });

  it("renders in both languages without losing the score", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const recap = controller.getRecap()!;

    const en = localizeRecap("en", recap);
    const es = localizeRecap("es", recap);

    expect(en.headline).toContain("1–0");
    expect(es.headline).toContain("1–0");
    expect(en.sentences).toHaveLength(recap.sentences.length);
    expect(es.sentences).toHaveLength(recap.sentences.length);
    expect(es.sentences[0]).toContain("venció");
  });

  it("derives its statistics from the same event log as the match truth", () => {
    const engine = new MatchEngine(DEMO_SCENARIO);
    engine.play();
    for (let i = 0; i < 200_000; i += 1) {
      engine.advanceBy(50);
      if (engine.getStatus() === "finished") break;
    }

    const stats = computeStats(engine.getEvents());
    const recap = buildNarrativeRecap(engine.getFrame().match, engine.getEvents(), stats);
    const homeRows = recap.statistics.home;

    expect(homeRows.find((row) => row.id === "goals")?.value).toBe("1");
    expect(homeRows.find((row) => row.id === "avgPassDistance")?.value).toMatch(/m$/);
    expect(homeRows.find((row) => row.id === "avgShotSpeed")?.value).toMatch(/km\/h$/);
  });

  it("is cleared when the match is reset", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    expect(controller.getRecap()).not.toBeNull();

    controller.reset();

    expect(controller.getRecap()).toBeNull();
    expect(controller.snapshot().events).toHaveLength(0);
    expect(controller.snapshot().insights).toHaveLength(0);
    expect(controller.snapshot().frame.match.status).toBe("scheduled");
  });
});
