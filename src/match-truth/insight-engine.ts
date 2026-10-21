import type {
  CorrectionEvent,
  MatchEvent,
  MatchInsight,
} from "../contracts";
import { ALL_DETECTORS } from "./detectors";
import type { DetectorContext } from "./detectors/types";
import { computeStats, type MatchStats } from "./stats";
import { validateInsight, type ValidationIssue } from "./validation";

export interface InsightBatch {
  created: readonly MatchInsight[];
  invalidated: readonly MatchInsight[];
}

export class InsightEngine {
  private readonly matchId: string;
  private events: MatchEvent[] = [];
  private insights: MatchInsight[] = [];
  private emittedIds = new Set<string>();
  private scannedEventCount = 0;
  private nowMs = 0;

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  ingest(event: MatchEvent): InsightBatch {
    this.events.push(event);
    this.nowMs = Math.max(this.nowMs, event.occurredAtMs);
    return { created: [], invalidated: [] };
  }

  detect(): InsightBatch {
    const created: MatchInsight[] = [];
    for (let i = this.scannedEventCount; i < this.events.length; i += 1) {
      const event = this.events[i]!;
      const ctx: DetectorContext = {
        events: this.events,
        event,
        matchId: this.matchId,
        nowMs: event.occurredAtMs,
      };
      for (const detector of ALL_DETECTORS) {
        const candidate = detector.onEvent(ctx);
        if (!candidate) continue;
        if (this.emittedIds.has(candidate.id)) continue;
        const issues: ValidationIssue[] = validateInsight(candidate, this.events);
        if (issues.length > 0) continue;
        this.emittedIds.add(candidate.id);
        this.insights.push(candidate);
        created.push(candidate);
      }
    }
    this.scannedEventCount = this.events.length;
    return { created, invalidated: [] };
  }

  handleCorrections(corrections: readonly CorrectionEvent[]): InsightBatch {
    const correctedEventIds = new Set(
      corrections.map((correction) => correction.sourceEventId),
    );
    const correctionEventIds = new Set(
      corrections.flatMap((correction) =>
        correction.replacementEventId ? [correction.replacementEventId] : [],
      ),
    );
    const invalidated: MatchInsight[] = [];
    for (const insight of this.insights) {
      if (insight.status !== "validated") continue;
      const dependsOnCorrectionItself = insight.evidenceEventIds.some((id) =>
        correctionEventIds.has(id),
      );
      if (dependsOnCorrectionItself) continue;
      const affected = insight.evidenceEventIds.some((id) =>
        correctedEventIds.has(id),
      );
      if (affected) {
        insight.status = "invalidated";
        invalidated.push(insight);
      }
    }
    return { created: [], invalidated };
  }

  expireStale(): MatchInsight[] {
    const invalidated: MatchInsight[] = [];
    for (const insight of this.insights) {
      if (insight.status !== "validated") continue;
      if (insight.validUntilMs !== undefined && this.nowMs > insight.validUntilMs) {
        insight.status = "invalidated";
        invalidated.push(insight);
      }
    }
    return invalidated;
  }

  refreshValidity(nowMs: number): MatchInsight[] {
    this.nowMs = Math.max(this.nowMs, nowMs);
    return this.expireStale();
  }

  getInsights(): readonly MatchInsight[] {
    return this.insights;
  }

  getStats(): MatchStats {
    return computeStats(this.events);
  }

  getEvents(): readonly MatchEvent[] {
    return this.events;
  }

  getValidationIssues(): ValidationIssue[] {
    return this.insights.flatMap((insight) =>
      validateInsight(insight, this.events),
    );
  }

  /** Clear every piece of state so the engine can replay a match from scratch. */
  reset(): void {
    this.events = [];
    this.insights = [];
    this.emittedIds = new Set<string>();
    this.scannedEventCount = 0;
    this.nowMs = 0;
  }
}
