import type { BroadcastSnapshot } from "../state/broadcast-controller";
import { serializeBroadcastExport } from "./broadcast-export";

/**
 * Downloads the broadcast export as a JSON file.
 *
 * The function is browser-only: it is kept apart from the pure builder so the
 * document itself can be produced and verified in a plain Node process.
 */
export function downloadBroadcastExport(
  snapshot: BroadcastSnapshot,
  filename = "sigma-broadcast-export.json",
): void {
  const json = serializeBroadcastExport(snapshot);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
