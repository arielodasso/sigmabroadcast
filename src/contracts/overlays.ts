import { z } from "zod";
import { prioritySchema } from "./insights";

export const overlayStatusSchema = z.enum([
  "queued",
  "scheduled",
  "active",
  "expired",
  "withdrawn",
]);

export const overlaySlotSchema = z.enum([
  "scorebug",
  "lower_third",
  "side_panel",
]);

export const broadcastOverlaySchema = z.strictObject({
  id: z.string().min(1),
  matchId: z.string().min(1),
  insightId: z.string().min(1),
  priority: prioritySchema,
  status: overlayStatusSchema,
  scheduledAtMs: z.number().min(0).optional(),
  startedAtMs: z.number().min(0).optional(),
  expiresAtMs: z.number().min(0).optional(),
  slot: overlaySlotSchema,
  version: z.number().int().min(0),
  blockedBy: z.string().min(1).optional(),
});

export type OverlayStatus = z.infer<typeof overlayStatusSchema>;
export type OverlaySlot = z.infer<typeof overlaySlotSchema>;
export type BroadcastOverlay = z.infer<typeof broadcastOverlaySchema>;
