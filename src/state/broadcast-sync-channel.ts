import type { BroadcastSnapshot } from "./broadcast-controller";

/**
 * Cross-tab synchronisation between the control room and the transparent
 * broadcast output.
 *
 * The output page is opened in its own browser tab so it can be used as an
 * OBS (or any broadcast compositor) source. That tab must not run its own
 * simulation: it has to show the very same match the operator is directing.
 *
 * `BroadcastChannel` is used when the browser supports it, and the
 * synchronisation degrades to a no-op otherwise, leaving the output page
 * running on its own simulation.
 */

const CHANNEL_NAME = "sigma-broadcast";
const PUBLISH_INTERVAL_MS = 50;

export interface BroadcastSync {
  /** Sends the current snapshot to every other tab. */
  publish(snapshot: BroadcastSnapshot): void;
  /** Receives snapshots sent by other tabs. Returns an unsubscribe function. */
  subscribe(listener: (snapshot: BroadcastSnapshot) => void): () => void;
  /** Releases the channel. */
  close(): void;
}

interface SyncMessage {
  type: "snapshot";
  snapshot: BroadcastSnapshot;
}

function isSyncMessage(value: unknown): value is SyncMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SyncMessage>;
  return candidate.type === "snapshot" && typeof candidate.snapshot === "object";
}

export function createBroadcastSync(): BroadcastSync {
  if (typeof BroadcastChannel === "undefined") {
    return {
      publish: () => {},
      subscribe: () => () => {},
      close: () => {},
    };
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  const listeners = new Set<(snapshot: BroadcastSnapshot) => void>();

  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!isSyncMessage(event.data)) return;
    for (const listener of listeners) {
      listener(event.data.snapshot);
    }
  };

  return {
    publish(snapshot) {
      try {
        channel.postMessage({ type: "snapshot", snapshot } satisfies SyncMessage);
      } catch {
        // A snapshot that cannot be cloned is not worth breaking the
        // broadcast for.
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      listeners.clear();
      channel.close();
    },
  };
}

export { PUBLISH_INTERVAL_MS };
