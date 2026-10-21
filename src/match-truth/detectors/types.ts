import type { MatchEvent, MatchInsight } from "../../contracts";

export interface DetectorContext {
  events: readonly MatchEvent[];
  event: MatchEvent;
  matchId: string;
  nowMs: number;
}

export interface Detector {
  id: string;
  onEvent(context: DetectorContext): MatchInsight | null;
}
