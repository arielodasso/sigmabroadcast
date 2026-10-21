import { describe, expect, it } from "vitest";
import { broadcastExportSchema } from "../../src/contracts";
import {
  absoluteToMatchClock,
  buildBroadcastExport,
  formatTimecode,
  serializeBroadcastExport,
} from "../../src/export";
import { BroadcastController } from "../../src/state/broadcast-controller";

const LAYOUT = { periodDurationMs: 45 * 60_000, halftimeDurationMs: 120_000 };

function runToEnd(controller: BroadcastController): void {
  controller.engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    controller.advanceBy(50);
    if (controller.engine.getStatus() === "finished") break;
  }
}

describe("broadcast timecodes", () => {
  it("formats a broadcast timecode", () => {
    expect(formatTimecode(1, 0)).toBe("1H 00:00");
    expect(formatTimecode(1, 120_000)).toBe("1H 02:00");
    expect(formatTimecode(1, 522_000)).toBe("1H 08:42");
    expect(formatTimecode(2, 2_640_000)).toBe("2H 44:00");
  });

  it("keeps the match clock frozen during the half-time interval", () => {
    const halftime = absoluteToMatchClock(LAYOUT.periodDurationMs + 60_000, LAYOUT);
    expect(halftime.period).toBe(1);
    expect(halftime.clockMs).toBe(LAYOUT.periodDurationMs);
    expect(halftime.timecode).toBe("1H 45:00");
  });

  it("restarts the match clock in the second period", () => {
    const second = absoluteToMatchClock(
      LAYOUT.periodDurationMs + LAYOUT.halftimeDurationMs + 1_000,
      LAYOUT,
    );
    expect(second.period).toBe(2);
    expect(second.clockMs).toBe(1_000);
    expect(second.timecode).toBe("2H 00:01");
  });
});

describe("broadcast export document", () => {
  it("validates against the published contract", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    const parsed = broadcastExportSchema.safeParse(document);
    expect(parsed.success).toBe(true);
    expect(document.schemaVersion).toBe("1.0.0");
    expect(document.generator).toBe("sigma-broadcast");
  });

  it("places the first-half goal at its broadcast timecode", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    const goal = document.events.find((event) => event.type === "goal");
    expect(goal).toBeDefined();
    expect(goal!.period).toBe(1);
    expect(goal!.timecode).toBe("1H 02:00");
  });

  it("times the correction shortly after the goal it invalidates", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    expect(document.corrections).toHaveLength(1);
    const correction = document.corrections[0]!;
    const goal = document.events.find((event) => event.type === "goal")!;
    expect(correction.timecode).toBe("1H 02:30");
    expect(correction.sourceEventId).toBe(goal.id);
    expect(correction.clockMs).toBe(150_000);
    expect(correction.clockMs - goal.clockMs).toBe(30_000);
  });

  it("uses second-period timecodes for second-period events", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    const secondPeriod = document.events.filter((event) => event.period === 2);
    expect(secondPeriod.length).toBeGreaterThan(0);
    for (const event of secondPeriod) {
      expect(event.timecode.startsWith("2H ")).toBe(true);
    }
  });

  it("carries the broadcast delay that was in force", () => {
    const controller = new BroadcastController();
    controller.setBroadcastDelayMs(20_000);
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    expect(document.broadcastDelayMs).toBe(20_000);
  });

  it("gives every overlay and decision a timecode", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    expect(document.overlays.length).toBeGreaterThan(0);
    for (const overlay of document.overlays) {
      if (overlay.status === "scheduled" || overlay.status === "active") {
        expect(overlay.scheduledAt?.timecode).toBeDefined();
      }
    }
    for (const decision of document.decisions) {
      expect(decision.at.timecode).toMatch(/^[12]H \d{2}:\d{2}$/);
    }
  });

  it("serialises to JSON that round-trips", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const json = serializeBroadcastExport(controller.snapshot());

    const parsed = broadcastExportSchema.safeParse(JSON.parse(json));
    expect(parsed.success).toBe(true);
  });

  it("is byte-identical across two runs of the same seed", () => {
    const a = new BroadcastController();
    const b = new BroadcastController();
    runToEnd(a);
    runToEnd(b);

    expect(serializeBroadcastExport(a.snapshot())).toBe(
      serializeBroadcastExport(b.snapshot()),
    );
  });
});
