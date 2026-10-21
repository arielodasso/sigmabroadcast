import type {
  AudienceMode,
  BroadcastOverlay,
  CorrectionEvent,
  MatchEvent,
  MatchInsight,
  NarrativeRecap,
} from "../contracts";
import { narrativeRecapSchema } from "../contracts";
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
}

export class BroadcastController {
  readonly engine: MatchEngine;
  readonly truth: InsightEngine;
  readonly director: BroadcastDirector;
  private audience: AudienceMode = "fan";
  private locale: Locale = DEFAULT_LOCALE;
  private recap: NarrativeRecap | null = null;
  private ingestedCount = 0;
  private correctionCount = 0;

  constructor(scenario: Scenario = DEMO_SCENARIO) {
    this.engine = new MatchEngine(scenario);
    this.truth = new InsightEngine(scenario.matchId);
    this.director = new BroadcastDirector(scenario.matchId);
    this.locale = detectLocale();
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
      for (const insight of detected.created) {
        this.director.submit(insight, insight.createdAtMs);
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

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  getRecap(): NarrativeRecap | null {
    return this.recap;
  }

  /** Restart the match from the kickoff with every module in a clean state. */
  reset(): void {
    this.engine.reset();
    this.truth.reset();
    this.director.reset();
    this.ingestedCount = 0;
    this.correctionCount = 0;
    this.recap = null;
  }

  snapshot(): BroadcastSnapshot {
    return {
      frame: this.engine.getFrame(),
      engineStatus: this.engine.getStatus(),
      speed: this.engine.getSpeed(),
      events: this.engine.getEvents(),
      corrections: this.engine.getCorrections(),
      insights: this.truth.getInsights(),
      overlays: this.director.getOverlays(),
      activeOverlays: this.director.getActiveOverlays(),
      decisions: this.director.getDecisions(),
      stats: this.truth.getStats(),
      audience: this.audience,
      locale: this.locale,
      recap: this.recap,
    };
  }
}
