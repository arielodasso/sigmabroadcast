import { describe, expect, it } from "vitest";
import { createBroadcastSync } from "../../src/state/broadcast-sync-channel";
import { BroadcastController } from "../../src/state/broadcast-controller";

describe("cross-tab broadcast synchronisation", () => {
  it("delivers a snapshot to the other tabs", async () => {
    const controlRoom = createBroadcastSync();
    const outputTab = createBroadcastSync();

    const received: unknown[] = [];
    const unsubscribe = outputTab.subscribe((snapshot) => received.push(snapshot));

    const controller = new BroadcastController();
    controlRoom.publish(controller.snapshot());

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(
      (received[0] as { frame: { match: { id: string } } }).frame.match.id,
    ).toBe("match-demo-0001");

    unsubscribe();
    controlRoom.close();
    outputTab.close();
  });

  it("stops delivering after unsubscribing", async () => {
    const controlRoom = createBroadcastSync();
    const outputTab = createBroadcastSync();

    const received: unknown[] = [];
    const unsubscribe = outputTab.subscribe((snapshot) => received.push(snapshot));
    unsubscribe();

    const controller = new BroadcastController();
    controlRoom.publish(controller.snapshot());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(0);
    controlRoom.close();
    outputTab.close();
  });
});
