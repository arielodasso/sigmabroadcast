import type { MatchEvent, MatchInsight } from "../contracts";
import { matchInsightSchema } from "../contracts";

export interface ValidationIssue {
  insightId: string;
  message: string;
}

export function validateInsight(
  insight: MatchInsight,
  events: readonly MatchEvent[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const parsed = matchInsightSchema.safeParse(insight);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        insightId: insight.id,
        message: `schema: ${issue.message}`,
      });
    }
    return issues;
  }

  const eventIds = new Set(events.map((event) => event.id));
  if (insight.evidenceEventIds.length === 0) {
    issues.push({
      insightId: insight.id,
      message: "factual insight has no evidence events",
    });
  }
  for (const evidenceId of insight.evidenceEventIds) {
    if (!eventIds.has(evidenceId)) {
      issues.push({
        insightId: insight.id,
        message: `evidence ${evidenceId} does not exist in the event log`,
      });
    }
  }

  if (insight.priority < 0 || insight.priority > 100) {
    issues.push({
      insightId: insight.id,
      message: "priority outside 0..100",
    });
  }

  return issues;
}

export function validateAll(
  insights: readonly MatchInsight[],
  events: readonly MatchEvent[],
): ValidationIssue[] {
  return insights.flatMap((insight) => validateInsight(insight, events));
}
