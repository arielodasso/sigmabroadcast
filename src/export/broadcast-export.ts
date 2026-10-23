import {
  BROADCAST_EXPORT_SCHEMA_VERSION,
  broadcastExportSchema,
  type BroadcastExport,
  type ExportAgentDecision,
  type ExportCorrection,
  type ExportDecision,
  type ExportEvent,
  type ExportInsight,
  type ExportOverlay,
  type ExportTimecode,
} from "../contracts";
import { HOME_TEAM, AWAY_TEAM } from "../simulation/roster";
import type { BroadcastSnapshot } from "../state/broadcast-controller";
import { absoluteToMatchClock, type ClockLayout } from "./timecode";

function clockLayout(snapshot: BroadcastSnapshot): ClockLayout {
  return {
    periodDurationMs: snapshot.periodDurationMs,
    halftimeDurationMs: snapshot.halftimeDurationMs,
  };
}

function timecode(
  snapshot: BroadcastSnapshot,
  absoluteMs: number,
): ExportTimecode {
  const clock = absoluteToMatchClock(absoluteMs, clockLayout(snapshot));
  return {
    absoluteMs: Math.max(0, absoluteMs),
    period: clock.period,
    clockMs: clock.clockMs,
    timecode: clock.timecode,
  };
}

/**
 * Builds the machine-readable broadcast document from a live snapshot.
 *
 * The result is validated against `broadcastExportSchema` before it is
 * returned, so an invalid document can never reach a consumer.
 */
export function buildBroadcastExport(snapshot: BroadcastSnapshot): BroadcastExport {
  const layout = clockLayout(snapshot);

  const events: ExportEvent[] = snapshot.events.map((event) => ({
    id: event.id,
    sequence: event.sequence,
    type: event.type,
    status: event.status,
    period: event.period,
    clockMs: event.clockMs,
    timecode: `${event.period}H ${formatClockPart(event.clockMs)}`,
    absoluteMs: event.occurredAtMs,
    ...(event.teamId ? { teamId: event.teamId } : {}),
    ...(event.playerId ? { playerId: event.playerId } : {}),
    ...(event.relatedEventId ? { relatedEventId: event.relatedEventId } : {}),
    payload: event.payload,
  }));

  const eventById = new Map(snapshot.events.map((event) => [event.id, event]));

  const corrections: ExportCorrection[] = snapshot.corrections.map(
    (correction) => {
      const replacement = correction.replacementEventId
        ? eventById.get(correction.replacementEventId)
        : undefined;
      const source = eventById.get(correction.sourceEventId);
      const reference = replacement ?? source;
      const absoluteMs = reference?.occurredAtMs ?? correction.clockMs;
      const period = reference?.period ?? 1;
      const clock = absoluteToMatchClock(absoluteMs, layout);
      return {
        id: correction.id,
        sequence: correction.sequence,
        reason: correction.reason,
        sourceEventId: correction.sourceEventId,
        ...(correction.replacementEventId
          ? { replacementEventId: correction.replacementEventId }
          : {}),
        period,
        clockMs: reference?.clockMs ?? correction.clockMs,
        timecode: clock.timecode,
      };
    },
  );

  const insights: ExportInsight[] = snapshot.insights.map((insight) => ({
    id: insight.id,
    category: insight.category,
    status: insight.status,
    priority: insight.priority,
    headline: insight.headline,
    explanation: insight.explanation,
    audienceText: insight.audienceText,
    evidenceEventIds: [...insight.evidenceEventIds],
    createdAt: timecode(snapshot, insight.createdAtMs),
    ...(insight.validUntilMs !== undefined
      ? { validUntil: timecode(snapshot, insight.validUntilMs) }
      : {}),
    ...(insight.ai ? { ai: insight.ai } : {}),
  }));

  const overlays: ExportOverlay[] = snapshot.overlays.map((overlay) => ({
    id: overlay.id,
    insightId: overlay.insightId,
    slot: overlay.slot,
    status: overlay.status,
    priority: overlay.priority,
    version: overlay.version,
    ...(overlay.scheduledAtMs !== undefined
      ? { scheduledAt: timecode(snapshot, overlay.scheduledAtMs) }
      : {}),
    ...(overlay.startedAtMs !== undefined
      ? { startedAt: timecode(snapshot, overlay.startedAtMs) }
      : {}),
    ...(overlay.expiresAtMs !== undefined
      ? { expiresAt: timecode(snapshot, overlay.expiresAtMs) }
      : {}),
  }));

  const decisions: ExportDecision[] = snapshot.decisions.map((decision) => ({
    id: decision.id,
    kind: decision.kind,
    overlayId: decision.overlayId,
    insightId: decision.insightId,
    reason: decision.reason,
    at: timecode(snapshot, decision.atMs),
  }));

  const agentDecisions: ExportAgentDecision[] = snapshot.agentDecisions.map(
    (decision) => ({
      id: decision.id,
      insightId: decision.insightId,
      action: decision.action,
      score: decision.score,
      confidence: decision.confidence,
      topFeature: decision.topFeature,
      audience: decision.audience,
      reason: decision.reason,
      evidenceEventIds: [...decision.evidenceEventIds],
      model: decision.model,
      mode: decision.mode,
      applied: decision.applied,
      tools: [...decision.tools],
      at: timecode(snapshot, decision.atMs),
    }),
  );

  const document: BroadcastExport = {
    schemaVersion: BROADCAST_EXPORT_SCHEMA_VERSION,
    generator: "sigma-broadcast",
    generatedAt: timecode(snapshot, snapshot.simElapsedMs),
    broadcastDelayMs: snapshot.broadcastDelayMs,
    match: {
      id: snapshot.frame.match.id,
      seed: snapshot.frame.match.seed,
      status: snapshot.frame.match.status,
      period: snapshot.frame.match.period,
      clockMs: snapshot.frame.match.clockMs,
      timecode: `${snapshot.frame.match.period}H ${formatClockPart(snapshot.frame.match.clockMs)}`,
      score: { ...snapshot.frame.match.score },
      homeTeam: { ...HOME_TEAM },
      awayTeam: { ...AWAY_TEAM },
    },
    events,
    corrections,
    insights,
    overlays,
    decisions,
    stats: {
      possessionByTeam: { ...snapshot.stats.possessionByTeam },
      teams: Object.fromEntries(
        Object.entries(snapshot.stats.teams).map(([teamId, stats]) => [
          teamId,
          { ...stats, recoveries: { ...stats.recoveries } },
        ]),
      ),
      passMetrics: snapshot.stats.passMetrics.map((metric) => ({ ...metric })),
      shotMetrics: snapshot.stats.shotMetrics.map((metric) => ({ ...metric })),
    },
    recap: snapshot.recap,
    personalization: { ...snapshot.personalization },
    ai: {
      status: snapshot.aiStatus,
      decisions: agentDecisions,
      narratives: snapshot.aiNarratives.map((narrative) => ({
        ...narrative,
        evidenceEventIds: [...narrative.evidenceEventIds],
      })),
    },
  };

  const parsed = broadcastExportSchema.safeParse(document);
  if (!parsed.success) {
    throw new Error(
      `Broadcast export failed validation: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

/** Serialises the export document as pretty-printed JSON. */
export function serializeBroadcastExport(snapshot: BroadcastSnapshot): string {
  return JSON.stringify(buildBroadcastExport(snapshot), null, 2);
}

function formatClockPart(clockMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(clockMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
