import { describe, expect, it } from "vitest";
import { BroadcastController } from "../../src/state/broadcast-controller";

function runToEnd(controller: BroadcastController): void {
  controller.engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    controller.advanceBy(50);
    if (controller.engine.getStatus() === "finished") break;
  }
}

describe("end-to-end demo scenario (SPEC §11)", () => {
  it("runs the full flow: events → insights → overlays → correction → final score", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();

    expect(snapshot.events.length).toBeGreaterThan(15);
    expect(snapshot.frame.match.status).toBe("finished");

    const goalInsight = snapshot.insights.find((i) => i.headline === "Goal");
    expect(goalInsight).toBeDefined();
    expect(goalInsight!.status).toBe("invalidated");

    const disallowedInsight = snapshot.insights.find(
      (i) => i.headline === "Goal disallowed",
    );
    expect(disallowedInsight).toBeDefined();
    expect(disallowedInsight!.status).toBe("validated");

    expect(snapshot.corrections).toHaveLength(1);
    expect(snapshot.frame.match.score).toEqual({ home: 1, away: 0 });
  });

  it("shows an overlay on air during the match and withdraws invalidated ones", () => {
    const controller = new BroadcastController();
    controller.engine.play();

    let sawActiveOverlay = false;
    let sawActiveAfterInvalidation = false;

    for (let i = 0; i < 200_000; i += 1) {
      controller.advanceBy(50);
      const active = controller.director.getActiveOverlays();
      const corrections = controller.engine.getCorrections().length;
      if (active.length > 0) {
        sawActiveOverlay = true;
        if (corrections > 0) {
          const insights = controller.truth.getInsights();
          const stillValid = active.every((overlay) => {
            const insight = insights.find((i) => i.id === overlay.insightId);
            return insight?.status !== "invalidated";
          });
          if (stillValid) sawActiveAfterInvalidation = true;
        }
      }
      if (controller.engine.getStatus() === "finished") break;
    }

    expect(sawActiveOverlay).toBe(true);
    expect(sawActiveAfterInvalidation).toBe(true);

    const final = controller.snapshot();
    const anyInvalidatedStillActive = final.activeOverlays.some((overlay) => {
      const insight = final.insights.find((i) => i.id === overlay.insightId);
      return insight?.status === "invalidated";
    });
    expect(anyInvalidatedStillActive).toBe(false);
  });

  it("records an auditable scheduling history", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const kinds = new Set(snapshot.decisions.map((decision) => decision.kind));
    expect(kinds.has("queued")).toBe(true);
    expect(kinds.has("scheduled")).toBe(true);
    expect(kinds.has("activated")).toBe(true);
    expect(kinds.has("withdrawn") || kinds.has("expired")).toBe(true);

    const goalInsight = snapshot.insights.find((i) => i.headline === "Goal");
    expect(goalInsight?.status).toBe("invalidated");
    const invalidatedOverlay = snapshot.overlays.find(
      (overlay) => overlay.insightId === goalInsight?.id,
    );
    expect(["withdrawn", "expired"]).toContain(invalidatedOverlay?.status);
  });

  it("never leaves an invalidated insight's overlay active", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const invalidatedIds = new Set(
      snapshot.insights
        .filter((insight) => insight.status === "invalidated")
        .map((insight) => insight.id),
    );
    for (const overlay of snapshot.overlays) {
      if (invalidatedIds.has(overlay.insightId)) {
        expect(overlay.status).not.toBe("active");
        expect(overlay.status).not.toBe("scheduled");
        expect(overlay.status).not.toBe("queued");
      }
    }
  });

  it("produces identical results on two runs with the same seed", () => {
    const a = new BroadcastController();
    const b = new BroadcastController();
    runToEnd(a);
    runToEnd(b);
    const snapA = a.snapshot();
    const snapB = b.snapshot();

    expect(snapA.events.map((e) => [e.type, e.sequence, e.clockMs])).toEqual(
      snapB.events.map((e) => [e.type, e.sequence, e.clockMs]),
    );
    expect(snapA.insights.map((i) => i.id)).toEqual(snapB.insights.map((i) => i.id));
    expect(snapA.frame.match.score).toEqual(snapB.frame.match.score);
    expect(snapA.decisions.map((d) => [d.kind, d.overlayId])).toEqual(
      snapB.decisions.map((d) => [d.kind, d.overlayId]),
    );
  });

  it("fan and analyst modes expose different texts over the same evidence", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const withBothTexts = snapshot.insights.filter(
      (i) => i.audienceText.fan && i.audienceText.analyst,
    );
    expect(withBothTexts.length).toBeGreaterThan(0);
    const differs = withBothTexts.some(
      (i) => i.audienceText.fan !== i.audienceText.analyst,
    );
    expect(differs).toBe(true);
  });

  it("pause during the run freezes clock and emits no new events", () => {
    const controller = new BroadcastController();
    controller.engine.play();
    for (let i = 0; i < 500; i += 1) controller.advanceBy(50);
    const before = controller.snapshot();
    controller.engine.pause();
    for (let i = 0; i < 500; i += 1) controller.advanceBy(50);
    const after = controller.snapshot();
    expect(after.frame.match.clockMs).toBe(before.frame.match.clockMs);
    expect(after.events.length).toBe(before.events.length);
    expect(after.insights.length).toBe(before.insights.length);
  });
});
