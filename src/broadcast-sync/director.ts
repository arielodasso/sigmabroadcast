import type { BroadcastOverlay, MatchInsight, OverlaySlot } from "../contracts";

export type DecisionKind =
  | "queued"
  | "scheduled"
  | "activated"
  | "expired"
  | "withdrawn"
  | "postponed"
  | "preempted"
  | "discarded"
  | "updated";

export interface SchedulingDecision {
  id: string;
  atMs: number;
  kind: DecisionKind;
  overlayId: string;
  insightId: string;
  reason: string;
}

export const SLOT_BY_CATEGORY: Record<MatchInsight["category"], OverlaySlot> = {
  match_event: "lower_third",
  milestone: "lower_third",
  tactical: "side_panel",
  performance: "side_panel",
};

const DURATION_BY_PRIORITY = { high: 36_000, medium: 28_000, low: 20_000 } as const;

export function durationFor(priority: number): number {
  if (priority >= 80) return DURATION_BY_PRIORITY.high;
  if (priority >= 50) return DURATION_BY_PRIORITY.medium;
  return DURATION_BY_PRIORITY.low;
}

const SHOW_DELAY_MS = 3_000;
const PREEMPT_MARGIN = 15;

export class BroadcastDirector {
  private readonly matchId: string;
  private overlays = new Map<string, BroadcastOverlay>();
  private decisionSeq = 0;
  private decisions: SchedulingDecision[] = [];
  private insightById = new Map<string, MatchInsight>();

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  submit(insight: MatchInsight, nowMs: number): BroadcastOverlay | null {
    if (this.insightById.has(insight.id)) return null;
    this.insightById.set(insight.id, insight);

    if (insight.status === "invalidated") {
      this.log(nowMs, "discarded", `insight-${insight.id}`, insight.id,
        "insight was invalidated before scheduling");
      return null;
    }

    const duplicate = [...this.overlays.values()].find(
      (overlay) => overlay.insightId === insight.id,
    );
    if (duplicate) return null;

    const equivalent = [...this.overlays.values()].find((overlay) => {
      const other = this.insightById.get(overlay.insightId);
      return (
        other &&
        other.headline === insight.headline &&
        (overlay.status === "active" || overlay.status === "scheduled")
      );
    });
    if (equivalent) {
      this.log(nowMs, "discarded", equivalent.id, insight.id,
        "equivalent overlay already on air");
      return null;
    }

    const overlay: BroadcastOverlay = {
      id: `${this.matchId}-ov${this.overlays.size + 1}`,
      matchId: this.matchId,
      insightId: insight.id,
      priority: insight.priority,
      status: "queued",
      slot: SLOT_BY_CATEGORY[insight.category],
      version: 0,
    };
    this.overlays.set(overlay.id, overlay);
    this.log(nowMs, "queued", overlay.id, insight.id,
      `priority ${insight.priority}, slot ${overlay.slot}`);
    this.trySchedule(overlay, nowMs + SHOW_DELAY_MS, nowMs);
    return overlay;
  }

  private trySchedule(
    overlay: BroadcastOverlay,
    readyAtMs: number,
    nowMs: number,
    logIfBlocked = false,
  ): void {
    if (overlay.status !== "queued") return;
    const insight = this.insightById.get(overlay.insightId);
    if (!insight || insight.status === "invalidated") {
      this.withdraw(overlay, nowMs, "insight invalidated");
      return;
    }

    const activeInSlot = [...this.overlays.values()].find(
      (candidate) =>
        candidate.slot === overlay.slot &&
        candidate.status === "active" &&
        candidate.id !== overlay.id,
    );

    if (activeInSlot) {
      const activePriority = activeInSlot.priority;
      if (overlay.priority >= activePriority + PREEMPT_MARGIN) {
        this.withdraw(activeInSlot, nowMs,
          `preempted by higher-priority overlay ${overlay.id}`);
        this.log(nowMs, "preempted", overlay.id, overlay.insightId,
          `priority ${overlay.priority} >= ${activePriority} + ${PREEMPT_MARGIN}`);
      } else {
        if (!overlay.blockedBy || overlay.blockedBy !== activeInSlot.id) {
          overlay.blockedBy = activeInSlot.id;
          this.log(nowMs, "postponed", overlay.id, overlay.insightId,
            `slot occupied by overlay ${activeInSlot.id} (priority ${activePriority})`);
        }
        return;
      }
    }

    const activeOrScheduledInSlot = [...this.overlays.values()].find(
      (candidate) =>
        candidate.slot === overlay.slot &&
        candidate.id !== overlay.id &&
        (candidate.status === "active" || candidate.status === "scheduled"),
    );
    if (activeOrScheduledInSlot) {
      if (!overlay.blockedBy || overlay.blockedBy !== activeOrScheduledInSlot.id) {
        overlay.blockedBy = activeOrScheduledInSlot.id;
        this.log(nowMs, "postponed", overlay.id, overlay.insightId,
          `slot queued behind ${activeOrScheduledInSlot.id}`);
      }
      return;
    }

    overlay.blockedBy = undefined;
    overlay.status = "scheduled";
    overlay.scheduledAtMs = readyAtMs;
    overlay.expiresAtMs = readyAtMs + durationFor(overlay.priority);
    overlay.version += 1;
    this.log(nowMs, "scheduled", overlay.id, overlay.insightId,
      `shows at ${readyAtMs}ms, expires at ${overlay.expiresAtMs}ms`);
  }

  tick(nowMs: number): void {
    for (const overlay of [...this.overlays.values()]) {
      if (overlay.status === "scheduled") {
        const insight = this.insightById.get(overlay.insightId);
        if (insight?.status === "invalidated") {
          this.withdraw(overlay, nowMs, "insight invalidated while scheduled");
          continue;
        }
        if (overlay.scheduledAtMs !== undefined && nowMs >= overlay.scheduledAtMs) {
          overlay.status = "active";
          overlay.startedAtMs = nowMs;
          this.log(nowMs, "activated", overlay.id, overlay.insightId,
            `on air in slot ${overlay.slot}`);
        }
      } else if (overlay.status === "active") {
        const insight = this.insightById.get(overlay.insightId);
        if (insight?.status === "invalidated") {
          this.withdraw(overlay, nowMs, "insight invalidated while active");
          continue;
        }
        if (overlay.expiresAtMs !== undefined && nowMs >= overlay.expiresAtMs) {
          overlay.status = "expired";
          this.log(nowMs, "expired", overlay.id, overlay.insightId,
            "duration reached");
        }
      }

      if (overlay.status === "queued") {
        const insight = this.insightById.get(overlay.insightId);
        if (insight?.status === "invalidated") {
          this.withdraw(overlay, nowMs, "insight invalidated while queued");
          continue;
        }
        this.trySchedule(overlay, nowMs + SHOW_DELAY_MS, nowMs, true);
      }
    }
  }

  handleInsightInvalidated(insightId: string, nowMs: number): void {
    for (const overlay of [...this.overlays.values()]) {
      if (overlay.insightId !== insightId) continue;
      if (overlay.status === "expired" || overlay.status === "withdrawn") continue;
      this.withdraw(overlay, nowMs, "insight invalidated by correction");
    }
  }

  private withdraw(overlay: BroadcastOverlay, nowMs: number, reason: string): void {
    overlay.status = "withdrawn";
    overlay.version += 1;
    this.log(nowMs, "withdrawn", overlay.id, overlay.insightId, reason);
  }

  private log(
    atMs: number,
    kind: DecisionKind,
    overlayId: string,
    insightId: string,
    reason: string,
  ): void {
    this.decisionSeq += 1;
    this.decisions.push({
      id: `${this.matchId}-d${this.decisionSeq}`,
      atMs,
      kind,
      overlayId,
      insightId,
      reason,
    });
  }

  getOverlays(): readonly BroadcastOverlay[] {
    return [...this.overlays.values()];
  }

  getActiveOverlays(): readonly BroadcastOverlay[] {
    return this.getOverlays().filter((overlay) => overlay.status === "active");
  }

  getDecisions(): readonly SchedulingDecision[] {
    return this.decisions;
  }

  /** Drop every overlay and decision so the director can start a new match. */
  reset(): void {
    this.overlays = new Map<string, BroadcastOverlay>();
    this.decisions = [];
    this.insightById = new Map<string, MatchInsight>();
    this.decisionSeq = 0;
  }
}
