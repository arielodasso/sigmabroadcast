import type { BroadcastSnapshot } from "../state/broadcast-controller";
import { t, type Locale } from "../i18n";
import { localizeInsight } from "../match-truth/insight-text";
import { BallIcon, CheckIcon, LayersIcon, SignalIcon } from "./Icons";

export interface AuditStripProps {
  snapshot: BroadcastSnapshot;
  locale: Locale;
}

export function AuditStrip({ snapshot, locale }: AuditStripProps) {
  const latest = [...snapshot.insights]
    .filter((insight) => insight.status === "validated")
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];

  const latestText = latest
    ? localizeInsight(locale, latest, snapshot.events)
    : null;

  const cells = [
    {
      id: "insights",
      icon: <LayersIcon size={16} />,
      label: t(locale, "strip.insights"),
      value: String(snapshot.insights.length),
    },
    {
      id: "onair",
      icon: <SignalIcon size={16} />,
      label: t(locale, "strip.onAir"),
      value: String(snapshot.activeOverlays.length),
    },
    {
      id: "decisions",
      icon: <CheckIcon size={16} />,
      label: t(locale, "strip.decisions"),
      value: String(snapshot.decisions.length),
    },
    {
      id: "corrections",
      icon: <BallIcon size={16} />,
      label: t(locale, "strip.corrections"),
      value: String(snapshot.corrections.length),
    },
    {
      id: "ai",
      icon: <LayersIcon size={16} />,
      label: t(locale, "ai.title"),
      value: `${snapshot.agentDecisions.length} · ${t(locale, `ai.mode.${snapshot.aiStatus.mode}`)}`,
    },
  ];

  return (
    <section className="strip" id="broadcast-strip" aria-label={t(locale, "strip.title")}>
      <div className="strip__cells">
        {cells.map((cell) => (
          <div className="strip__cell" key={cell.id}>
            <span className="strip__cell-icon">{cell.icon}</span>
            <span className="strip__cell-label">{cell.label}</span>
            <span className="strip__cell-value">{cell.value}</span>
          </div>
        ))}
      </div>

      <div className="strip__headline">
        <span className="strip__headline-label">{t(locale, "strip.insights")}</span>
        <span className="strip__headline-text">
          {latestText ? latestText.headline : t(locale, "panel.noneYet")}
        </span>
        {latestText ? (
          <span className="strip__headline-detail">{latestText.explanation}</span>
        ) : null}
      </div>
    </section>
  );
}
