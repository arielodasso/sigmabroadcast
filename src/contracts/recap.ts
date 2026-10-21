import { z } from "zod";

export const translationVarsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

export const recapOutcomeSchema = z.enum(["home_win", "away_win", "draw"]);

export const recapMomentKindSchema = z.enum([
  "goal",
  "goal_disallowed",
  "shot_on_target",
  "advanced_recovery",
]);

export const recapStatRowSchema = z.strictObject({
  id: z.string().min(1),
  labelKey: z.string().min(1),
  value: z.string(),
});

export const recapMomentSchema = z.strictObject({
  eventId: z.string().min(1),
  period: z.union([z.literal(1), z.literal(2)]),
  clockMs: z.number().min(0),
  kind: recapMomentKindSchema,
  titleKey: z.string().min(1),
  titleVars: translationVarsSchema,
  detailKey: z.string().min(1),
  detailVars: translationVarsSchema,
});

export const narrativeRecapSchema = z.strictObject({
  matchId: z.string().min(1),
  generatedAtMs: z.number().min(0),
  result: z.strictObject({
    home: z.number().int().min(0),
    away: z.number().int().min(0),
    outcome: recapOutcomeSchema,
  }),
  headlineKey: z.string().min(1),
  headlineVars: translationVarsSchema,
  sentences: z.array(
    z.strictObject({
      key: z.string().min(1),
      vars: translationVarsSchema,
    }),
  ),
  moments: z.array(recapMomentSchema),
  statistics: z.strictObject({
    home: z.array(recapStatRowSchema),
    away: z.array(recapStatRowSchema),
  }),
  evidenceEventIds: z.array(z.string()),
});

export type RecapOutcome = z.infer<typeof recapOutcomeSchema>;
export type RecapMomentKind = z.infer<typeof recapMomentKindSchema>;
export type RecapStatRow = z.infer<typeof recapStatRowSchema>;
export type RecapMoment = z.infer<typeof recapMomentSchema>;
export type NarrativeRecap = z.infer<typeof narrativeRecapSchema>;
