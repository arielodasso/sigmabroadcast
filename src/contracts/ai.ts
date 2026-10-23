import { z } from "zod";
import { audienceModeSchema } from "./insights";

export const agentModeSchema = z.enum(["advisory", "autonomous"]);

export const agentActionSchema = z.enum([
  "air",
  "boost",
  "hold",
  "suppress",
]);

export const aiProviderSchema = z.enum([
  "on-device",
  "azure-openai",
  "github-models",
  "proxy",
  "deterministic-fallback",
]);

export const aiHealthSchema = z.enum([
  "ready",
  "fallback",
  "disabled",
  "error",
]);

export const agentDecisionSchema = z.strictObject({
  id: z.string().min(1),
  atMs: z.number().min(0),
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
});

export const aiStatusSchema = z.strictObject({
  enabled: z.boolean(),
  mode: agentModeSchema,
  provider: aiProviderSchema,
  model: z.string().min(1),
  status: aiHealthSchema,
  llmConfigured: z.boolean(),
  lastLatencyMs: z.number().min(0).optional(),
  lastError: z.string().min(1).optional(),
});

export const aiNarrativeSchema = z.strictObject({
  id: z.string().min(1),
  task: z.enum(["explain", "recap"]),
  insightId: z.string().min(1).optional(),
  text: z.string().min(1),
  evidenceEventIds: z.array(z.string().min(1)).min(1),
  provider: aiProviderSchema,
  model: z.string().min(1),
  fallback: z.boolean(),
  generatedAtMs: z.number().min(0),
});

export const personalizationSchema = z.strictObject({
  followedTeamId: z.string().min(1).optional(),
  followedPlayerId: z.string().min(1).optional(),
});

export type AgentMode = z.infer<typeof agentModeSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiHealth = z.infer<typeof aiHealthSchema>;
export type AgentDecision = z.infer<typeof agentDecisionSchema>;
export type AiStatus = z.infer<typeof aiStatusSchema>;
export type AiNarrative = z.infer<typeof aiNarrativeSchema>;
export type Personalization = z.infer<typeof personalizationSchema>;
