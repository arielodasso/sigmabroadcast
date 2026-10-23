import { z } from "zod";
import {
  agentActionSchema,
  agentModeSchema,
  aiNarrativeSchema,
  aiStatusSchema,
  personalizationSchema,
} from "./ai";
import { matchEventStatusSchema, matchEventTypeSchema } from "./events";
import {
  aiInsightMetadataSchema,
  audienceModeSchema,
  insightCategorySchema,
  insightStatusSchema,
} from "./insights";
import { matchStatusSchema, periodSchema, teamSchema } from "./match";
import { overlaySlotSchema, overlayStatusSchema } from "./overlays";
import { narrativeRecapSchema } from "./recap";

/**
 * Machine-readable broadcast export.
 *
 * The document is the contract between Sigma Broadcast and any downstream
 * consumer: a broadcast playout server, a data platform, a second rendering
 * path or an automated judge. Every timed element carries both the raw
 * millisecond value and a broadcast timecode so it can be placed on a feed
 * without re-deriving the clock.
 */

export const BROADCAST_EXPORT_SCHEMA_VERSION = "1.1.0";

/** A timecode such as `1H 08:42`, always paired with its raw value. */
export const timecodeSchema = z.strictObject({
  absoluteMs: z.number().min(0),
  period: periodSchema,
  clockMs: z.number().min(0),
  timecode: z.string().min(1),
});

export const exportTeamSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  color: z.string().min(1),
});

export const exportMatchSchema = z.strictObject({
  id: z.string().min(1),
  seed: z.number().int(),
  status: matchStatusSchema,
  period: periodSchema,
  clockMs: z.number().min(0),
  timecode: z.string().min(1),
  score: z.strictObject({
    home: z.number().int().min(0),
    away: z.number().int().min(0),
  }),
  homeTeam: exportTeamSchema,
  awayTeam: exportTeamSchema,
});

export const exportEventSchema = z.strictObject({
  id: z.string().min(1),
  sequence: z.number().int().min(1),
  type: matchEventTypeSchema,
  status: matchEventStatusSchema,
  period: periodSchema,
  clockMs: z.number().min(0),
  timecode: z.string().min(1),
  absoluteMs: z.number().min(0),
  teamId: z.string().min(1).optional(),
  playerId: z.string().min(1).optional(),
  relatedEventId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const exportCorrectionSchema = z.strictObject({
  id: z.string().min(1),
  sequence: z.number().int().min(1),
  reason: z.string().min(1),
  sourceEventId: z.string().min(1),
  replacementEventId: z.string().min(1).optional(),
  period: periodSchema,
  clockMs: z.number().min(0),
  timecode: z.string().min(1),
});

export const exportInsightSchema = z.strictObject({
  id: z.string().min(1),
  category: insightCategorySchema,
  status: insightStatusSchema,
  priority: z.number().min(0).max(100),
  headline: z.string().min(1),
  explanation: z.string().min(1),
  audienceText: z.strictObject({
    analyst: z.string().optional(),
    fan: z.string().optional(),
  }),
  evidenceEventIds: z.array(z.string().min(1)).min(1),
  createdAt: timecodeSchema,
  validUntil: timecodeSchema.optional(),
  ai: aiInsightMetadataSchema.optional(),
});

export const exportAgentDecisionSchema = z.strictObject({
  id: z.string().min(1),
  insightId: z.string().min(1),
  action: agentActionSchema,
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  topFeature: z.string().min(1),
  audience: audienceModeSchema,
  reason: z.string().min(1),
  evidenceEventIds: z.array(z.string().min(1)).min(1),
  model: z.string().min(1),
  mode: agentModeSchema,
  applied: z.boolean(),
  tools: z.array(z.string().min(1)),
  at: timecodeSchema,
});

export const exportAiBundleSchema = z.strictObject({
  status: aiStatusSchema,
  decisions: z.array(exportAgentDecisionSchema),
  narratives: z.array(aiNarrativeSchema),
});

export const exportPersonalizationSchema = personalizationSchema;

export const exportOverlaySchema = z.strictObject({
  id: z.string().min(1),
  insightId: z.string().min(1),
  slot: overlaySlotSchema,
  status: overlayStatusSchema,
  priority: z.number().min(0).max(100),
  version: z.number().int().min(0),
  scheduledAt: timecodeSchema.optional(),
  startedAt: timecodeSchema.optional(),
  expiresAt: timecodeSchema.optional(),
});

export const exportDecisionSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.string().min(1),
  overlayId: z.string().min(1),
  insightId: z.string().min(1),
  reason: z.string().min(1),
  at: timecodeSchema,
});

export const exportPassMetricSchema = z.strictObject({
  eventId: z.string().min(1),
  teamId: z.string().min(1),
  playerId: z.string().min(1).optional(),
  distanceM: z.number().min(0),
  difficulty: z.number().min(0).max(1),
  progressive: z.boolean(),
  underPressure: z.boolean(),
  successful: z.boolean(),
});

export const exportShotMetricSchema = z.strictObject({
  eventId: z.string().min(1),
  teamId: z.string().min(1),
  playerId: z.string().min(1).optional(),
  distanceM: z.number().min(0),
  distanceToGoalM: z.number().min(0),
  estimatedSpeedMs: z.number().min(0),
  estimatedSpeedKmh: z.number().min(0),
  onTarget: z.boolean(),
  difficulty: z.number().min(0).max(1),
});

export const exportTeamStatsSchema = z.strictObject({
  teamId: z.string().min(1),
  passesAttempted: z.number().int().min(0),
  passesCompleted: z.number().int().min(0),
  shots: z.number().int().min(0),
  shotsOnTarget: z.number().int().min(0),
  recoveries: z.strictObject({
    defensive: z.number().int().min(0),
    middle: z.number().int().min(0),
    advanced: z.number().int().min(0),
  }),
  possessionMs: z.number().min(0),
  goals: z.number().int().min(0),
  totalPassDistanceM: z.number().min(0),
  averagePassDistanceM: z.number().min(0),
  averagePassDifficulty: z.number().min(0).max(1),
  progressivePasses: z.number().int().min(0),
  shotSpeedSamples: z.number().int().min(0),
  averageShotSpeedKmh: z.number().min(0),
});

export const exportStatsSchema = z.strictObject({
  possessionByTeam: z.record(z.string(), z.number()),
  teams: z.record(z.string(), exportTeamStatsSchema),
  passMetrics: z.array(exportPassMetricSchema),
  shotMetrics: z.array(exportShotMetricSchema),
});

export const broadcastExportSchema = z.strictObject({
  schemaVersion: z.literal(BROADCAST_EXPORT_SCHEMA_VERSION),
  generator: z.literal("sigma-broadcast"),
  generatedAt: timecodeSchema,
  broadcastDelayMs: z.number().int().min(0),
  match: exportMatchSchema,
  events: z.array(exportEventSchema),
  corrections: z.array(exportCorrectionSchema),
  insights: z.array(exportInsightSchema),
  overlays: z.array(exportOverlaySchema),
  decisions: z.array(exportDecisionSchema),
  stats: exportStatsSchema,
  recap: narrativeRecapSchema.nullable(),
  personalization: exportPersonalizationSchema,
  ai: exportAiBundleSchema,
});

export type BroadcastExport = z.infer<typeof broadcastExportSchema>;
export type ExportAgentDecision = z.infer<typeof exportAgentDecisionSchema>;
export type ExportAiBundle = z.infer<typeof exportAiBundleSchema>;
export type ExportEvent = z.infer<typeof exportEventSchema>;
export type ExportInsight = z.infer<typeof exportInsightSchema>;
export type ExportOverlay = z.infer<typeof exportOverlaySchema>;
export type ExportDecision = z.infer<typeof exportDecisionSchema>;
export type ExportCorrection = z.infer<typeof exportCorrectionSchema>;
export type ExportStats = z.infer<typeof exportStatsSchema>;
export type ExportTimecode = z.infer<typeof timecodeSchema>;
