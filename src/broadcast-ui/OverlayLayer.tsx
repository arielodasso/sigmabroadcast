import type {
  AudienceMode,
  BroadcastOverlay,
  MatchEvent,
  MatchInsight,
} from "../contracts";
import { t, type Locale } from "../i18n";
import { localizeInsight } from "../match-truth/insight-text";

export interface OverlayLayerProps {
  overlays: readonly BroadcastOverlay[];
  insights: readonly MatchInsight[];
  events: readonly MatchEvent[];
  audience: AudienceMode;
  locale: Locale;
}

export function OverlayLayer({
  overlays,
  insights,
  events,
  audience,
  locale,
}: OverlayLayerProps) {
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));
  const active = overlays.filter((overlay) => overlay.status === "active");

  return (
    <div className="overlays" aria-label={t(locale, "overlay.label")}>
      {active.map((overlay) => {
        const insight = insightById.get(overlay.insightId);
        if (!insight) return null;
        const localized = localizeInsight(locale, insight, events);
        const text = localized[audience] ?? localized.explanation;
        return (
          <div
            key={overlay.id}
            className={`overlay overlay--${overlay.slot}`}
            data-overlay-id={overlay.id}
            data-version={overlay.version}
          >
            <div className="overlay__headline">
              {overlay.slot === "side_panel" ? (
                <span className="overlay__kicker">
                  {t(locale, "overlay.tactical")}
                </span>
              ) : null}
              {localized.headline}
            </div>
            <div className="overlay__text">{text}</div>
            <div className="overlay__meta">
              {t(locale, "overlay.priority")} {overlay.priority}
              {overlay.priority >= 90 ? ` · ${t(locale, "overlay.live")}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
