import { z } from "zod";

export const matchStatusSchema = z.enum([
  "scheduled",
  "live",
  "halftime",
  "finished",
]);

export const periodSchema = z.union([z.literal(1), z.literal(2)]);

export const vector3Schema = z.strictObject({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const scoreSchema = z.strictObject({
  home: z.number().int().min(0),
  away: z.number().int().min(0),
});

export const matchSchema = z.strictObject({
  id: z.string().min(1),
  seed: z.number().int(),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  status: matchStatusSchema,
  period: periodSchema,
  clockMs: z.number().min(0),
  score: scoreSchema,
  eventSequence: z.number().int().min(0),
});

export const teamSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  color: z.string().min(1),
});

export const playerRoleSchema = z.enum(["GK", "DEF", "MID", "FWD"]);

export const playerSchema = z.strictObject({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  shirtNumber: z.number().int().min(1).max(99),
  role: playerRoleSchema,
  position: vector3Schema,
});

export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type Period = z.infer<typeof periodSchema>;
export type Vector3 = z.infer<typeof vector3Schema>;
export type Score = z.infer<typeof scoreSchema>;
export type Match = z.infer<typeof matchSchema>;
export type Team = z.infer<typeof teamSchema>;
export type PlayerRole = z.infer<typeof playerRoleSchema>;
export type Player = z.infer<typeof playerSchema>;
