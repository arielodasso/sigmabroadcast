import { z } from "zod";

export const insightCategorySchema = z.enum([
  "tactical",
  "performance",
  "match_event",
  "milestone",
]);

export const audienceModeSchema = z.enum(["analyst", "fan"]);

export const insightStatusSchema = z.enum([
  "candidate",
  "validated",
  "invalidated",
]);

export const prioritySchema = z.number().min(0).max(100);

export const audienceTextSchema = z.strictObject({
  analyst: z.string().optional(),
  fan: z.string().optional(),
});

export const aiContributionSchema = z.strictObject({
  feature: z.string().min(1),
  value: z.number(),
  impact: z.number(),
});

export const aiInsightMetadataSchema = z.strictObject({
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  priority: prioritySchema,
  audience: audienceModeSchema,
  model: z.string().min(1),
  rationale: z.string().min(1),
  topFeature: z.string().min(1),
  contributions: z.array(aiContributionSchema).max(8),
});

export const matchInsightSchema = z.strictObject({
  id: z.string().min(1),
  matchId: z.string().min(1),
  category: insightCategorySchema,
  headline: z.string().min(1),
  explanation: z.string().min(1),
  priority: prioritySchema,
  evidenceEventIds: z.array(z.string().min(1)).min(1),
  createdAtMs: z.number().min(0),
  validUntilMs: z.number().min(0).optional(),
  status: insightStatusSchema,
  audienceText: audienceTextSchema,
  ai: aiInsightMetadataSchema.optional(),
});

export type AiContribution = z.infer<typeof aiContributionSchema>;
export type AiInsightMetadata = z.infer<typeof aiInsightMetadataSchema>;
export type InsightCategory = z.infer<typeof insightCategorySchema>;
export type AudienceMode = z.infer<typeof audienceModeSchema>;
export type InsightStatus = z.infer<typeof insightStatusSchema>;
export type AudienceText = z.infer<typeof audienceTextSchema>;
export type MatchInsight = z.infer<typeof matchInsightSchema>;
