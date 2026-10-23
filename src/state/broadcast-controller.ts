import type {
  AgentDecision,
  AgentMode,
  AiNarrative,
  AiStatus,
  AudienceMode,
  BroadcastOverlay,
  CorrectionEvent,
  MatchEvent,
  MatchInsight,
  NarrativeRecap,
  Personalization,
} from "../contracts";
import { narrativeRecapSchema } from "../contracts";
import { BroadcastAgent, type AgentAnnotation } from "../ai/agent";
import { readAiConfig } from "../ai/config";
import { PRIORITY_MODEL } from "../ai/model/weights";
import { AiNarrator } from "../ai/narrator";
import { applyCorrection, BroadcastDirector } from "../broadcast-sync";
import type { SchedulingDecision } from "../broadcast-sync";
import { DEFAULT_LOCALE, detectLocale, type Locale } from "../i18n";
import { InsightEngine } from "../match-truth/insight-engine";
import { buildNarrativeRecap } from "../match-truth/narrative";
import type { MatchStats } from "../match-truth/stats";
import { MatchEngine, type SimulationFrame } from "../simulation/engine";
import { DEMO_SCENARIO, type Scenario } from "../simulation/scenarios";

export interface BroadcastSnapshot {
  frame: SimulationFrame;
  engineStatus: string;
  speed: number;
  /** Configured broadcast delay, in milliseconds. */
  broadcastDelayMs: number;
  /** Absolute simulated time elapsed since kickoff, in milliseconds. */
  simElapsedMs: number;
  /** Length of a single period, in milliseconds. */
  periodDurationMs: number;
  /** Length of the half-time interval, in milliseconds. */
  halftimeDurationMs: number;
  events: readonly MatchEvent[];
  corrections: readonly CorrectionEvent[];
  insights: readonly MatchInsight[];
  overlays: readonly BroadcastOverlay[];
  activeOverlays: readonly BroadcastOverlay[];
  decisions: readonly SchedulingDecision[];
  stats: MatchStats;
  audience: AudienceMode;
  locale: Locale;
  recap: NarrativeRecap | null;
  aiStatus: AiStatus;
  agentDecisions: readonly AgentDecision[];
  aiNarratives: readonly AiNarrative[];
  personalization: Personalization;
}

export class BroadcastController {
  readonly engine: MatchEngine;
  readonly truth: InsightEngine;
  readonly director: BroadcastDirector;
  readonly agent: BroadcastAgent;
  private readonly narrator: AiNarrator;
  private audience: AudienceMode = "fan";
  private locale: Locale = DEFAULT_LOCALE;
  private recap: NarrativeRecap | null = null;
  private ingestedCount = 0;
  private correctionCount = 0;
  private readonly annotations = new Map<string, AgentAnnotation>();
  private agentDecisions: AgentDecision[] = [];
  private aiNarratives: AiNarrative[] = [];
  private personalization: Personalization = {};

  constructor(scenario: Scenario = DEMO_SCENARIO) {
    this.engine = new MatchEngine(scenario);
    this.truth = new InsightEngine(scenario.matchId);
    this.director = new BroadcastDirector(scenario.matchId);
    this.locale = detectLocale();
    this.agent = new BroadcastAgent("advisory");
    this.narrator = new AiNarrator(readAiConfig());
  }

  advanceBy(deltaWallMs: number): void {
    const batch = this.engine.advanceBy(deltaWallMs);
    const simNow = this.engine.getSimElapsedMs();

    const events = this.engine.getEvents();
    for (let i = this.ingestedCount; i < events.length; i += 1) {
      this.truth.ingest(events[i]!);
    }
    this.ingestedCount = events.length;

    const corrections = this.engine.getCorrections();
    for (let i = this.correctionCount; i < corrections.length; i += 1) {
      applyCorrection(corrections[i]!, this.truth, this.director, simNow);
    }
    this.correctionCount = corrections.length;

    if (batch.events.length > 0 || batch.corrections.length > 0) {
      const detected = this.truth.detect();
      if (detected.created.length > 0) {
        const result = this.agent.observe({
          match: this.engine.getFrame().match,
          events,
          insights: detected.created,
          stats: this.truth.getStats(),
          nowMs: simNow,
          periodDurationMs: this.engine.scenario.periodDurationMs,
          personalization: this.personalization,
          activeInsights: this.truth.getInsights(),
        });
        for (const annotation of result.annotations) {
          this.annotations.set(annotation.insightId, annotation);
          this.agentDecisions.push(annotation.decision);
          const insight = detected.created.find(
            (candidate) => candidate.id === annotation.insightId,
          );
          if (!insight) continue;
          if (
            this.agent.getMode() === "autonomous" &&
            annotation.decision.action === "suppress"
          ) {
            continue;
          }
          const enriched = this.agent.apply(insight, annotation);
          this.director.submit(enriched, enriched.createdAtMs);
        }
      }
      for (const insight of detected.invalidated) {
        this.director.handleInsightInvalidated(insight.id, simNow);
      }
    }

    const expired = this.truth.refreshValidity(simNow);
    for (const insight of expired) {
      this.director.handleInsightInvalidated(insight.id, simNow);
    }

    this.director.tick(simNow);

    this.refreshRecap();
  }

  /**
   * The narrative recap is produced once the match reaches full time and is
   * rebuilt only if the underlying match state changes afterwards.
   */
  private refreshRecap(): void {
    const frame = this.engine.getFrame();
    if (frame.match.status !== "finished") return;
    const recap = buildNarrativeRecap(
      frame.match,
      this.engine.getEvents(),
      this.truth.getStats(),
    );
    const parsed = narrativeRecapSchema.safeParse(recap);
    if (!parsed.success) return;
    if (
      this.recap &&
      this.recap.result.home === parsed.data.result.home &&
      this.recap.result.away === parsed.data.result.away &&
      this.recap.moments.length === parsed.data.moments.length
    ) {
      return;
    }
    this.recap = parsed.data;
  }

  setAudience(audience: AudienceMode): void {
    this.audience = audience;
  }

  getAudience(): AudienceMode {
    return this.audience;
  }

  /**
   * Sets the broadcast delay used by the director.
   *
   * The delay is a broadcast configuration, not match state, so it survives a
   * `reset()`.
   */
  setBroadcastDelayMs(delayMs: number): void {
    this.director.setBroadcastDelayMs(delayMs);
    this.director.replanPending(this.engine.getSimElapsedMs());
  }

  getBroadcastDelayMs(): number {
    return this.director.getBroadcastDelayMs();
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  setAgentMode(mode: AgentMode): void {
    this.agent.setMode(mode);
  }

  getAgentMode(): AgentMode {
    return this.agent.getMode();
  }

  setPersonalization(personalization: Personalization): void {
    this.personalization = { ...personalization };
  }

  getPersonalization(): Personalization {
    return this.personalization;
  }

  getRecap(): NarrativeRecap | null {
    return this.recap;
  }

  getAiNarratives(): readonly AiNarrative[] {
    return this.aiNarratives;
  }

  getAgentDecisions(): readonly AgentDecision[] {
    return this.agentDecisions;
  }

  enrichInsight(insight: MatchInsight): MatchInsight {
    const annotation = this.annotations.get(insight.id);
    return annotation ? this.agent.apply(insight, annotation) : insight;
  }

  async explainInsight(insightId: string): Promise<AiNarrative | null> {
    const insight = this.truth
      .getInsights()
      .find((candidate) => candidate.id === insightId);
    if (!insight) return null;
    const narrative = await this.narrator.explain(
      this.enrichInsight(insight),
      this.engine.getEvents(),
      this.locale,
    );
    this.upsertNarrative(narrative);
    return narrative;
  }

  async generateAiRecap(): Promise<AiNarrative | null> {
    if (!this.recap) return null;
    const narrative = await this.narrator.recap(
      this.engine.getFrame().match,
      this.engine.getEvents(),
      this.truth.getStats(),
      this.recap,
      this.locale,
    );
    this.upsertNarrative(narrative);
    return narrative;
  }

  private upsertNarrative(narrative: AiNarrative): void {
    const index = this.aiNarratives.findIndex(
      (candidate) => candidate.id === narrative.id,
    );
    if (index >= 0) {
      this.aiNarratives = this.aiNarratives.map((candidate, position) =>
        position === index ? narrative : candidate,
      );
      return;
    }
    this.aiNarratives = [...this.aiNarratives, narrative];
  }

  private buildAiStatus(): AiStatus {
    const llmConfigured = this.narrator.llmConfigured;
    const lastError = this.narrator.lastError;
    const lastLatencyMs = this.narrator.lastLatencyMs;
    return {
      enabled: true,
      mode: this.agent.getMode(),
      provider: this.narrator.providerName ?? "on-device",
      model: llmConfigured ? this.narrator.modelName : PRIORITY_MODEL.version,
      status: lastError ? "fallback" : "ready",
      llmConfigured,
      ...(lastLatencyMs !== undefined ? { lastLatencyMs } : {}),
      ...(lastError ? { lastError } : {}),
    };
  }

  /** Restart the match from the kickoff with every module in a clean state. */
  reset(): void {
    this.engine.reset();
    this.truth.reset();
    this.director.reset();
    this.agent.reset();
    this.annotations.clear();
    this.agentDecisions = [];
    this.aiNarratives = [];
    this.narrator.reset();
    this.ingestedCount = 0;
    this.correctionCount = 0;
    this.recap = null;
  }

  snapshot(): BroadcastSnapshot {
    return {
      frame: this.engine.getFrame(),
      engineStatus: this.engine.getStatus(),
      speed: this.engine.getSpeed(),
      broadcastDelayMs: this.director.getBroadcastDelayMs(),
      simElapsedMs: this.engine.getSimElapsedMs(),
      periodDurationMs: this.engine.scenario.periodDurationMs,
      halftimeDurationMs: this.engine.scenario.halftimeDurationMs,
      events: this.engine.getEvents(),
      corrections: this.engine.getCorrections(),
      insights: this.truth
        .getInsights()
        .map((insight) => this.enrichInsight(insight)),
      overlays: this.director.getOverlays(),
      activeOverlays: this.director.getActiveOverlays(),
      decisions: this.director.getDecisions(),
      stats: this.truth.getStats(),
      audience: this.audience,
      locale: this.locale,
      recap: this.recap,
      aiStatus: this.buildAiStatus(),
      agentDecisions: this.agentDecisions,
      aiNarratives: this.aiNarratives,
      personalization: this.personalization,
    };
  }
}
