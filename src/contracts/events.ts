import { z } from "zod";
import { periodSchema, vector3Schema } from "./match";

export const matchEventTypeSchema = z.enum([
  "kickoff",
  "pass",
  "ball_recovery",
  "pressure",
  "shot",
  "goal",
  "goal_disallowed",
  "possession_change",
  "period_end",
]);

export const matchEventStatusSchema = z.enum([
  "valid",
  "corrected",
  "void",
]);

export const recoveryZoneSchema = z.enum([
  "defensive",
  "middle",
  "advanced",
]);

export const matchEventPayloadSchemas = {
  kickoff: z.strictObject({}),
  pass: z.strictObject({
    successful: z.boolean(),
  }),
  ball_recovery: z.strictObject({
    zone: recoveryZoneSchema,
  }),
  pressure: z.strictObject({
    intensity: z.number().min(0).max(1),
  }),
  shot: z.strictObject({
    onTarget: z.boolean(),
  }),
  goal: z.strictObject({}),
  goal_disallowed: z.strictObject({
    reason: z.string().min(1),
  }),
  possession_change: z.strictObject({}),
  period_end: z.strictObject({}),
} satisfies Record<z.infer<typeof matchEventTypeSchema>, z.ZodType>;

export type MatchEventPayloads = {
  [K in keyof typeof matchEventPayloadSchemas]: z.infer<
    (typeof matchEventPayloadSchemas)[K]
  >;
};

export const matchEventSchema = z
  .strictObject({
    id: z.string().min(1),
    matchId: z.string().min(1),
    sequence: z.number().int().min(1),
    type: matchEventTypeSchema,
    period: periodSchema,
    clockMs: z.number().min(0),
    occurredAtMs: z.number().min(0),
    teamId: z.string().min(1).optional(),
    playerId: z.string().min(1).optional(),
    relatedEventId: z.string().min(1).optional(),
    position: vector3Schema.optional(),
    targetPosition: vector3Schema.optional(),
    payload: z.record(z.string(), z.unknown()),
    status: matchEventStatusSchema,
  })
  .superRefine((event, ctx) => {
    const payloadSchema = matchEventPayloadSchemas[event.type];
    const result = payloadSchema.safeParse(event.payload);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: `payload does not match schema for "${event.type}": ${issue.message}`,
          path: ["payload", ...issue.path],
        });
      }
    }
    if (event.type === "goal_disallowed" && !event.relatedEventId) {
      ctx.addIssue({
        code: "custom",
        message: "goal_disallowed must reference the original goal in relatedEventId",
        path: ["relatedEventId"],
      });
    }
  });

export const correctionEventSchema = z.strictObject({
  id: z.string().min(1),
  matchId: z.string().min(1),
  sourceEventId: z.string().min(1),
  sequence: z.number().int().min(1),
  clockMs: z.number().min(0),
  reason: z.string().min(1),
  replacementEventId: z.string().min(1).optional(),
});

export type MatchEventType = z.infer<typeof matchEventTypeSchema>;
export type MatchEventStatus = z.infer<typeof matchEventStatusSchema>;
export type RecoveryZone = z.infer<typeof recoveryZoneSchema>;
export type MatchEvent = z.infer<typeof matchEventSchema>;
export type CorrectionEvent = z.infer<typeof correctionEventSchema>;

export function validateEventSequence(
  events: readonly Pick<MatchEvent, "sequence">[],
): { ok: true } | { ok: false; offendingIndex: number } {
  let previous = 0;
  for (let index = 0; index < events.length; index += 1) {
    const current = events[index]?.sequence ?? 0;
    if (current <= previous) {
      return { ok: false, offendingIndex: index };
    }
    previous = current;
  }
  return { ok: true };
}
