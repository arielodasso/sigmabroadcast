import type { CorrectionEvent, MatchInsight } from "../contracts";
import type { InsightEngine } from "../match-truth/insight-engine";
import type { BroadcastDirector } from "./director";

export interface CorrectionOutcome {
  correction: CorrectionEvent;
  invalidatedInsightIds: string[];
  withdrawnOverlayCount: number;
}

export function applyCorrection(
  correction: CorrectionEvent,
  truth: InsightEngine,
  director: BroadcastDirector,
  nowMs: number,
): CorrectionOutcome {
  const batch = truth.handleCorrections([correction]);
  for (const insight of batch.invalidated) {
    director.handleInsightInvalidated(insight.id, nowMs);
  }

  const invalidatedInsightIds = batch.invalidated.map((insight) => insight.id);

  const withdrawnOverlayCount = director.getOverlays().filter(
    (overlay) =>
      overlay.status === "withdrawn" &&
      invalidatedInsightIds.includes(overlay.insightId),
  ).length;

  return { correction, invalidatedInsightIds, withdrawnOverlayCount };
}

export type { MatchInsight };
