import type {
  AudienceMode,
  BroadcastOverlay,
  MatchEvent,
  MatchInsight,
  Personalization,
} from "../contracts";
import { t, type Locale } from "../i18n";
import { localizeInsight } from "../match-truth/insight-text";

export interface OverlayLayerProps {
  overlays: readonly BroadcastOverlay[];
  insights: readonly MatchInsight[];
  events: readonly MatchEvent[];
  audience: AudienceMode;
  locale: Locale;
  personalization?: Personalization;
}

export function OverlayLayer({
  overlays,
  insights,
  events,
  audience,
  locale,
  personalization = {},
}: OverlayLayerProps) {
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const active = overlays.filter((overlay) => overlay.status === "active");

  const isFollowed = (insight: MatchInsight): boolean =>
    insight.evidenceEventIds.some((id) => {
      const event = eventById.get(id);
      if (!event) return false;
      if (
        personalization.followedTeamId &&
        event.teamId === personalization.followedTeamId
      ) {
        return true;
      }
      return Boolean(
        personalization.followedPlayerId &&
          event.playerId === personalization.followedPlayerId,
      );
    });

  return (
    <div className="overlays" aria-label={t(locale, "overlay.label")}>
      {active.map((overlay) => {
        const insight = insightById.get(overlay.insightId);
        if (!insight) return null;
        const localized = localizeInsight(locale, insight, events);
        const text = localized[audience] ?? localized.explanation;
        const followed = isFollowed(insight);
        return (
          <div
            key={overlay.id}
            className={`overlay overlay--${overlay.slot}${followed ? " overlay--followed" : ""}`}
            data-overlay-id={overlay.id}
            data-version={overlay.version}
            data-followed={followed ? "true" : "false"}
          >
            <div className="overlay__headline">
              {overlay.slot === "side_panel" ? (
                <span className="overlay__kicker">
                  {t(locale, "overlay.tactical")}
                </span>
              ) : null}
              {localized.headline}
              {followed ? (
                <span className="overlay__followed">
                  {t(locale, "ai.personalization")}
                </span>
              ) : null}
            </div>
            <div className="overlay__text">{text}</div>
            <div className="overlay__meta">
              {t(locale, "overlay.priority")} {overlay.priority}
              {overlay.priority >= 90 ? ` · ${t(locale, "overlay.live")}` : ""}
              {insight.ai
                ? ` · AI ${insight.ai.score.toFixed(2)} (${insight.ai.topFeature})`
                : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
