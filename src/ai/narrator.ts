import { z } from "zod";
import type {
  AiNarrative,
  Match,
  MatchEvent,
  MatchInsight,
  NarrativeRecap,
} from "../contracts";
import { t, type Locale } from "../i18n";
import { localizeInsight } from "../match-truth/insight-text";
import { localizeRecap } from "../match-truth/narrative";
import type { MatchStats } from "../match-truth/stats";
import type { AiConfig } from "./config";
import { hasLlmProvider } from "./config";
import { createProvider, type AiProvider as Provider } from "./providers";

const groundedResponseSchema = z
  .strictObject({
    text: z.string().min(1).max(900),
    evidenceEventIds: z.array(z.string().min(1)).min(1),
  });

const MAX_EVIDENCE = 12;

function collectNumbers(value: unknown, numbers: Set<string>, depth = 0): void {
  if (depth > 6) return;
  if (typeof value === "number" && Number.isFinite(value)) {
    numbers.add(String(value));
    numbers.add(value.toFixed(1));
    numbers.add(value.toFixed(2));
    numbers.add(String(Math.round(value)));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, numbers, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectNumbers(item, numbers, depth + 1);
    }
  }
}

function normalizeNumberToken(token: string): string {
  const value = Number(token.replace(",", "."));
  if (!Number.isFinite(value)) return token;
  return String(value);
}

function isGroundedText(
  text: string,
  allowedNumbers: ReadonlySet<string>,
): boolean {
  const tokens = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  return tokens.every((token) => {
    const normalized = normalizeNumberToken(token);
    if (allowedNumbers.has(normalized)) return true;
    const value = Number(normalized);
    return Number.isFinite(value) && Math.abs(value) <= 12;
  });
}

function evidencePayload(
  insight: MatchInsight,
  events: readonly MatchEvent[],
): MatchEvent[] {
  return insight.evidenceEventIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is MatchEvent => event !== undefined)
    .slice(0, MAX_EVIDENCE);
}

function statsSummary(stats: MatchStats, match: Match) {
  const summarize = (teamId: string) => {
    const team = stats.teams[teamId];
    return {
      teamId,
      possession: stats.possessionByTeam[teamId] ?? 0,
      passesAttempted: team?.passesAttempted ?? 0,
      passesCompleted: team?.passesCompleted ?? 0,
      shots: team?.shots ?? 0,
      shotsOnTarget: team?.shotsOnTarget ?? 0,
      goals: team?.goals ?? 0,
      progressivePasses: team?.progressivePasses ?? 0,
    };
  };
  return {
    score: match.score,
    period: match.period,
    clockMs: match.clockMs,
    home: summarize(match.homeTeamId),
    away: summarize(match.awayTeamId),
  };
}

function fallbackExplain(
  locale: Locale,
  insight: MatchInsight,
  events: readonly MatchEvent[],
  nowMs: number,
  model: string,
  degraded = false,
): AiNarrative {
  const localized = localizeInsight(locale, insight, events);
  const metadata = insight.ai;
  const text = metadata
    ? t(locale, "ai.explainModel", {
        score: metadata.score.toFixed(2),
        confidence: metadata.confidence.toFixed(2),
        feature: metadata.topFeature,
        evidence: insight.evidenceEventIds.length,
        explanation: localized.explanation,
      })
    : localized.explanation;
  return {
    id: `ai-explain-${insight.id}`,
    task: "explain",
    insightId: insight.id,
    text,
    evidenceEventIds: [...insight.evidenceEventIds],
    provider: metadata ? "on-device" : "deterministic-fallback",
    model,
    fallback: degraded || !metadata,
    generatedAtMs: nowMs,
  };
}

function fallbackRecap(
  locale: Locale,
  recap: NarrativeRecap,
  nowMs: number,
  model: string,
): AiNarrative {
  const localized = localizeRecap(locale, recap);
  const text = [localized.headline, ...localized.sentences].join(" ");
  return {
    id: "ai-recap",
    task: "recap",
    text,
    evidenceEventIds: recap.moments.map((moment) => moment.eventId),
    provider: "deterministic-fallback",
    model,
    fallback: true,
    generatedAtMs: nowMs,
  };
}

export class AiNarrator {
  private readonly provider: Provider | null;
  private readonly cache = new Map<string, AiNarrative>();
  private error?: string;
  private latency?: number;

  constructor(
    private readonly config: AiConfig,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.provider = createProvider(config);
  }

  get providerName(): Provider["name"] | null {
    return this.provider?.name ?? null;
  }

  get modelName(): string {
    return this.provider?.model ?? this.config.modelLabel;
  }

  get lastError(): string | undefined {
    return this.error;
  }

  get lastLatencyMs(): number | undefined {
    return this.latency;
  }

  get llmConfigured(): boolean {
    return hasLlmProvider(this.config);
  }

  reset(): void {
    this.cache.clear();
    this.error = undefined;
    this.latency = undefined;
  }

  private async request(
    messages: { role: "system" | "user"; content: string }[],
  ): Promise<string | null> {
    if (!this.provider) return null;
    try {
      const result = await this.provider.complete({
        messages,
        temperature: 0.2,
        maxTokens: 320,
        json: true,
      });
      this.latency = result.latencyMs;
      this.error = undefined;
      return result.text;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "AI provider request failed";
      return null;
    }
  }

  private parse(
    raw: string | null,
    allowedEventIds: ReadonlySet<string>,
    allowedNumbers: ReadonlySet<string>,
  ): { text: string; evidenceEventIds: string[] } | null {
    if (!raw) return null;
    try {
      const parsed = groundedResponseSchema.parse(JSON.parse(raw));
      if (!parsed.evidenceEventIds.every((id) => allowedEventIds.has(id))) {
        return null;
      }
      if (!isGroundedText(parsed.text, allowedNumbers)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async explain(
    insight: MatchInsight,
    events: readonly MatchEvent[],
    locale: Locale,
  ): Promise<AiNarrative> {
    const key = `explain:${locale}:${insight.id}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const evidence = evidencePayload(insight, events);
    const allowedIds = new Set(insight.evidenceEventIds);
    const numbers = new Set<string>([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ]);
    for (let i = 0; i <= 12; i += 1) numbers.add(String(i));
    collectNumbers(evidence, numbers);
    collectNumbers(insight.ai, numbers);
    collectNumbers(insight.priority, numbers);

    const system = t(locale, "ai.prompt.system");
    const user = t(locale, "ai.prompt.explain", {
      insight: JSON.stringify({
        id: insight.id,
        category: insight.category,
        priority: insight.priority,
        createdAtMs: insight.createdAtMs,
        validUntilMs: insight.validUntilMs,
        evidenceEventIds: insight.evidenceEventIds,
        ai: insight.ai,
      }),
      evidence: JSON.stringify(evidence),
      allowedEventIds: JSON.stringify([...allowedIds]),
    });

    const raw = await this.request([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = this.parse(raw, allowedIds, numbers);
    if (this.provider && !parsed) {
      this.error = "AI response failed grounding validation";
    }

    const narrative: AiNarrative = parsed
      ? {
          id: `ai-explain-${insight.id}`,
          task: "explain",
          insightId: insight.id,
          text: parsed.text,
          evidenceEventIds: parsed.evidenceEventIds,
          provider: this.providerName ?? "proxy",
          model: this.modelName,
          fallback: false,
          generatedAtMs: this.now(),
        }
      : fallbackExplain(
          locale,
          insight,
          events,
          this.now(),
          this.modelName,
          this.provider !== null,
        );

    this.cache.set(key, narrative);
    return narrative;
  }

  async recap(
    match: Match,
    events: readonly MatchEvent[],
    stats: MatchStats,
    recap: NarrativeRecap,
    locale: Locale,
  ): Promise<AiNarrative> {
    const key = `recap:${locale}:${match.id}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const evidence = recap.moments
      .map((moment) => events.find((event) => event.id === moment.eventId))
      .filter((event): event is MatchEvent => event !== undefined)
      .slice(0, MAX_EVIDENCE);
    const allowedIds = new Set(evidence.map((event) => event.id));
    const numbers = new Set<string>(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    for (let i = 0; i <= 12; i += 1) numbers.add(String(i));
    collectNumbers(evidence, numbers);
    collectNumbers(statsSummary(stats, match), numbers);
    collectNumbers(recap, numbers);

    const system = t(locale, "ai.prompt.system");
    const user = t(locale, "ai.prompt.recap", {
      match: JSON.stringify({
        id: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        score: match.score,
        period: match.period,
        clockMs: match.clockMs,
        status: match.status,
      }),
      stats: JSON.stringify(statsSummary(stats, match)),
      recap: JSON.stringify(recap),
      evidence: JSON.stringify(evidence),
      allowedEventIds: JSON.stringify([...allowedIds]),
    });

    const raw = await this.request([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = this.parse(raw, allowedIds, numbers);
    if (this.provider && !parsed) {
      this.error = "AI response failed grounding validation";
    }

    const narrative: AiNarrative = parsed
      ? {
          id: "ai-recap",
          task: "recap",
          text: parsed.text,
          evidenceEventIds: parsed.evidenceEventIds,
          provider: this.providerName ?? "proxy",
          model: this.modelName,
          fallback: false,
          generatedAtMs: this.now(),
        }
      : fallbackRecap(locale, recap, this.now(), this.modelName);

    this.cache.set(key, narrative);
    return narrative;
  }
}
