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

/**
 * Upper bound for the configurable broadcast delay. A live broadcaster never
 * holds a graphic longer than a minute before it becomes worthless, so the
 * setting is clamped to keep the demo usable.
 */
export const MAX_BROADCAST_DELAY_MS = 60_000;

export class BroadcastDirector {
  private readonly matchId: string;
  private overlays = new Map<string, BroadcastOverlay>();
  private decisionSeq = 0;
  private decisions: SchedulingDecision[] = [];
  private insightById = new Map<string, MatchInsight>();
  private broadcastDelayMs = 0;

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  /**
   * Configurable broadcast delay.
   *
   * A delay of `n` milliseconds holds every graphic for `n` milliseconds after
   * the insight that justifies it was created. While a graphic waits, a
   * correction can still invalidate it, and information that expires before it
   * would reach air is discarded instead of being shown late.
   */
  setBroadcastDelayMs(delayMs: number): void {
    const next = Math.min(
      MAX_BROADCAST_DELAY_MS,
      Math.max(0, Math.round(delayMs)),
    );
    if (next === this.broadcastDelayMs) return;
    this.broadcastDelayMs = next;
  }

  getBroadcastDelayMs(): number {
    return this.broadcastDelayMs;
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
    this.trySchedule(overlay, this.readyAtFor(insight, nowMs), nowMs);
    return overlay;
  }

  /**
   * The earliest moment an overlay may reach air.
   *
   * It is the later of the fixed airtime cushion and the configured broadcast
   * delay measured from the moment the insight was created.
   */
  private readyAtFor(insight: MatchInsight, nowMs: number): number {
    return Math.max(
      nowMs + SHOW_DELAY_MS,
      insight.createdAtMs + this.broadcastDelayMs,
    );
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

    // Information that is already out of date when it would reach air is
    // discarded: a graphic that arrives late and stale is worse than no
    // graphic at all.
    if (
      insight.validUntilMs !== undefined &&
      insight.validUntilMs <= readyAtMs
    ) {
      this.discard(overlay, nowMs,
        `insight expired at ${insight.validUntilMs}ms, before airtime ${readyAtMs}ms`);
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
        if (
          insight &&
          insight.validUntilMs !== undefined &&
          insight.validUntilMs <= nowMs
        ) {
          this.discard(overlay, nowMs,
            `insight expired at ${insight.validUntilMs}ms, not aired in time`);
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
        if (!insight) continue;
        this.trySchedule(overlay, this.readyAtFor(insight, nowMs), nowMs, true);
      }
    }
  }

  /**
   * Re-plans every pending overlay after the broadcast delay changed.
   *
   * Overlays that are already on air are left untouched: a delay governs what
   * reaches the screen, not what is already there.
   */
  replanPending(nowMs: number): void {
    for (const overlay of [...this.overlays.values()]) {
      if (overlay.status !== "queued" && overlay.status !== "scheduled") continue;
      const insight = this.insightById.get(overlay.insightId);
      if (!insight || insight.status === "invalidated") {
        this.withdraw(overlay, nowMs, "insight invalidated while re-planning");
        continue;
      }
      const readyAtMs = this.readyAtFor(insight, nowMs);
      if (
        insight.validUntilMs !== undefined &&
        insight.validUntilMs <= readyAtMs
      ) {
        this.discard(overlay, nowMs,
          `insight expired at ${insight.validUntilMs}ms, before airtime ${readyAtMs}ms`);
        continue;
      }
      overlay.blockedBy = undefined;
      overlay.status = "queued";
      overlay.scheduledAtMs = undefined;
      overlay.expiresAtMs = undefined;
      overlay.version += 1;
      this.log(nowMs, "updated", overlay.id, overlay.insightId,
        `re-planned with broadcast delay ${this.broadcastDelayMs}ms`);
      this.trySchedule(overlay, readyAtMs, nowMs);
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

  /**
   * Drops an overlay that never reached air because its justification was no
   * longer current. The overlay is kept in the history for audit purposes.
   */
  private discard(overlay: BroadcastOverlay, nowMs: number, reason: string): void {
    overlay.status = "withdrawn";
    overlay.version += 1;
    this.log(nowMs, "discarded", overlay.id, overlay.insightId, reason);
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
