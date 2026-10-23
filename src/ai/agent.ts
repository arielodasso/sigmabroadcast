import type {
  AgentDecision,
  AgentMode,
  AiInsightMetadata,
  Match,
  MatchEvent,
  MatchInsight,
  Personalization,
} from "../contracts";
import type { MatchStats } from "../match-truth/stats";
import { extractFeatures } from "./features";
import {
  PRIORITY_MODEL,
  confidenceOf,
  featureImpacts,
  predictPriority,
  predictAudience,
} from "./model/inference";

export interface AgentContext {
  match: Match;
  events: readonly MatchEvent[];
  insights: readonly MatchInsight[];
  stats: MatchStats;
  nowMs: number;
  periodDurationMs: number;
  personalization: Personalization;
  activeInsights?: readonly MatchInsight[];
}

export interface AgentAnnotation {
  insightId: string;
  metadata: AiInsightMetadata;
  decision: AgentDecision;
}

export interface AgentResult {
  annotations: AgentAnnotation[];
}

const AIR_THRESHOLD = 0.6;
const BOOST_THRESHOLD = 0.5;

function priorityFromScore(rulePriority: number, score: number): number {
  const blended = rulePriority * 0.6 + score * 100 * 0.4;
  return Math.round(Math.min(100, Math.max(0, blended)));
}

function actionFor(
  insight: MatchInsight,
  score: number,
  followed: boolean,
): AgentDecision["action"] {
  if (insight.status === "invalidated") return "suppress";
  if (followed) return "boost";
  if (score >= AIR_THRESHOLD) return "air";
  if (score >= BOOST_THRESHOLD) return "boost";
  return "hold";
}

export class BroadcastAgent {
  private mode: AgentMode;
  private readonly seen = new Set<string>();

  constructor(mode: AgentMode = "advisory") {
    this.mode = mode;
  }

  getMode(): AgentMode {
    return this.mode;
  }

  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  reset(): void {
    this.seen.clear();
  }

  shouldAir(decision: AgentDecision): boolean {
    return (
      this.mode === "autonomous" &&
      (decision.action === "air" || decision.action === "boost")
    );
  }

  apply(insight: MatchInsight, annotation: AgentAnnotation): MatchInsight {
    if (this.mode !== "autonomous") {
      return { ...insight, ai: annotation.metadata };
    }
    return {
      ...insight,
      priority: annotation.metadata.priority,
      ai: annotation.metadata,
    };
  }

  observe(context: AgentContext): AgentResult {
    const personalization = context.personalization;
    const annotations: AgentAnnotation[] = [];

    for (const insight of context.insights) {
      if (this.seen.has(insight.id)) continue;
      this.seen.add(insight.id);

      const vector = extractFeatures({
        insight,
        events: context.events,
        match: context.match,
        stats: context.stats,
        periodDurationMs: context.periodDurationMs,
        ...(personalization.followedTeamId
          ? { followedTeamId: personalization.followedTeamId }
          : {}),
        ...(personalization.followedPlayerId
          ? { followedPlayerId: personalization.followedPlayerId }
          : {}),
        ...(context.activeInsights
          ? { activeInsights: context.activeInsights }
          : {}),
      });

      const probability = predictPriority(vector);
      const confidence = confidenceOf(probability);
      const audience = predictAudience(vector);
      const priority = priorityFromScore(insight.priority, probability);
      const impacts = featureImpacts(vector, PRIORITY_MODEL, 5);
      const topFeature = impacts[0]?.feature ?? "bias";
      const followed =
        vector[PRIORITY_MODEL.featureNames.indexOf("followed_team")] === 1 ||
        vector[PRIORITY_MODEL.featureNames.indexOf("followed_player")] === 1;
      const action = actionFor(insight, probability, followed);
      const applied = this.mode === "autonomous";

      const tools = [
        "get_match_context",
        "get_insight_evidence",
        "score_priority",
        "select_audience",
      ];
      if (followed) tools.push("get_follow_relevance");
      if (insight.validUntilMs !== undefined) tools.push("check_validity_window");

      const impactText =
        impacts[0] === undefined
          ? "model prior"
          : `${topFeature} ${impacts[0].impact >= 0 ? "+" : ""}${impacts[0].impact.toFixed(2)}`;
      const reason = `score ${probability.toFixed(2)}, confidence ${confidence.toFixed(2)}, ${impactText}, ${insight.evidenceEventIds.length} evidence events, category ${insight.category}`;

      const metadata: AiInsightMetadata = {
        score: Number(probability.toFixed(4)),
        confidence: Number(confidence.toFixed(4)),
        priority,
        audience,
        model: PRIORITY_MODEL.version,
        rationale: reason,
        topFeature,
        contributions: impacts.map((impact) => ({
          feature: impact.feature,
          value: Number(impact.value.toFixed(4)),
          impact: Number(impact.impact.toFixed(4)),
        })),
      };

      const decision: AgentDecision = {
        id: `${insight.id}-agent`,
        atMs: context.nowMs,
        insightId: insight.id,
        action,
        score: metadata.score,
        confidence: metadata.confidence,
        topFeature,
        audience,
        reason,
        evidenceEventIds: [...insight.evidenceEventIds],
        model: PRIORITY_MODEL.version,
        mode: this.mode,
        applied,
        tools,
      };

      annotations.push({
        insightId: insight.id,
        metadata,
        decision,
      });
    }

    return { annotations };
  }
}
