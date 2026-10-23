import type {
  AgentMode,
  AudienceMode,
  MatchEvent,
  Personalization,
} from "../contracts";
import { downloadBroadcastExport } from "../export";
import { hasKey, t, type Locale } from "../i18n";
import { localizeInsight } from "../match-truth/insight-text";
import { TEAMS, createRoster } from "../simulation/roster";
import type { BroadcastSnapshot } from "../state/broadcast-controller";
import { trackEvent, trackException } from "../telemetry";
import { formatClock } from "../utils/format";

const ROSTER = createRoster();

function reasonLabel(reason: string, locale: Locale): string {
  const key = `event.reason.${reason}`;
  return hasKey(locale, key) ? t(locale, key) : reason;
}

function zoneLabel(zone: string, locale: Locale): string {
  const key = `event.zone.${zone}`;
  return t(locale, key) === key ? zone : t(locale, key);
}

function eventLabel(event: MatchEvent, locale: Locale): string {
  const player = event.playerId?.split("-").pop() ?? "";
  switch (event.type) {
    case "goal":
      return `${t(locale, "event.goal")} #${player}`;
    case "goal_disallowed":
      return t(locale, "event.goal_disallowed", {
        reason: reasonLabel(String(event.payload["reason"] ?? ""), locale),
      });
    case "shot":
      return t(locale, "event.shot", {
        result: t(
          locale,
          event.payload["onTarget"] === true
            ? "event.shot.onTarget"
            : "event.shot.offTarget",
        ),
        player,
      });
    case "ball_recovery":
      return t(locale, "event.ball_recovery", {
        zone: zoneLabel(String(event.payload["zone"] ?? ""), locale),
        player,
      });
    case "pressure":
      return t(locale, "event.pressure", {
        intensity: Number(event.payload["intensity"] ?? 0).toFixed(2),
        player,
      });
    case "pass":
      return t(locale, "event.pass", {
        result: t(
          locale,
          event.payload["successful"] === true
            ? "event.pass.completed"
            : "event.pass.lost",
        ),
        player,
      });
    case "possession_change":
      return t(locale, "event.possession_change");
    case "kickoff":
      return t(locale, "event.kickoff");
    case "period_end":
      return t(locale, "event.period_end");
    default:
      return event.type;
  }
}

export interface ControlPanelProps {
  snapshot: BroadcastSnapshot;
  locale: Locale;
  query?: string;
  explainingId?: string | null;
  recapBusy?: boolean;
  onAgentModeChange?: (mode: AgentMode) => void;
  onPersonalizationChange?: (personalization: Personalization) => void;
  onExplain?: (insightId: string) => void;
  onAiRecap?: () => void;
}

function teamName(teamId: string): string {
  return TEAMS.find((team) => team.id === teamId)?.name ?? teamId;
}

function playerName(playerId: string): string {
  return ROSTER.players.find((player) => player.id === playerId)?.name ?? playerId;
}

export function ControlPanel({
  snapshot,
  locale,
  query = "",
  explainingId = null,
  recapBusy = false,
  onAgentModeChange,
  onPersonalizationChange,
  onExplain,
  onAiRecap,
}: ControlPanelProps) {
  const needle = query.trim().toLowerCase();
  const matches = (text: string): boolean =>
    needle.length === 0 || text.toLowerCase().includes(needle);

  const ai = snapshot.aiStatus;
  const personalization = snapshot.personalization;
  const playerOptions = ROSTER.players.filter(
    (player) =>
      !personalization.followedTeamId ||
      player.teamId === personalization.followedTeamId,
  );
  const latestNarratives = [...snapshot.aiNarratives].sort(
    (a, b) => b.generatedAtMs - a.generatedAtMs,
  );

  const changeTeam = (teamId: string) => {
    const next: Personalization = {};
    if (teamId) next.followedTeamId = teamId;
    if (personalization.followedPlayerId) {
      const player = ROSTER.players.find(
        (candidate) => candidate.id === personalization.followedPlayerId,
      );
      if (!teamId || player?.teamId === teamId) {
        next.followedPlayerId = personalization.followedPlayerId;
      }
    }
    onPersonalizationChange?.(next);
  };

  const changePlayer = (playerId: string) => {
    const next: Personalization = {};
    if (personalization.followedTeamId) {
      next.followedTeamId = personalization.followedTeamId;
    }
    if (playerId) next.followedPlayerId = playerId;
    onPersonalizationChange?.(next);
  };

  const recentEvents = [...snapshot.events]
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 40)
    .filter((event) => matches(eventLabel(event, locale)));

  const insights = [...snapshot.insights]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .filter((insight) => {
      const localized = localizeInsight(locale, insight, snapshot.events);
      return (
        matches(localized.headline) ||
        matches(localized.explanation) ||
        matches(insight.id)
      );
    });

  const teamIds = Object.keys(snapshot.stats.teams);
  const homeId = teamIds[0] ?? "";
  const awayId = teamIds[1] ?? "";

  const hardestPasses = [...snapshot.stats.passMetrics]
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 8);
  const fastestShots = [...snapshot.stats.shotMetrics]
    .sort((a, b) => b.estimatedSpeedKmh - a.estimatedSpeedKmh)
    .slice(0, 6);

  return (
    <section className="panel" id="control-panel" aria-label={t(locale, "panel.title")}>
      <header className="panel__header">
        <h2 className="panel__title">{t(locale, "panel.title")}</h2>
        <p className="panel__lede">{t(locale, "panel.lede")}</p>
        <div className="panel__actions">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              try {
                downloadBroadcastExport(snapshot);
                trackEvent("export_json", {
                  insights: snapshot.insights.length,
                  decisions: snapshot.agentDecisions.length,
                });
              } catch (error) {
                trackException(error);
              }
            }}
          >
            <span>{t(locale, "panel.exportJson")}</span>
          </button>
          <a
            className="btn btn--ghost"
            href="/output"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{t(locale, "panel.outputSource")}</span>
          </a>
        </div>
      </header>

      <div className="panel__grid">
        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.modules")}</h3>
          <ul className="panel__status-list">
            <li>
              {t(locale, "panel.simulator")}: <strong>{snapshot.engineStatus}</strong>
            </li>
            <li>
              {t(locale, "panel.truth")}:{" "}
              <strong>{snapshot.insights.length} insights</strong>
            </li>
            <li>
              {t(locale, "panel.sync")}:{" "}
              <strong>{snapshot.activeOverlays.length} active</strong>
            </li>
            <li>
              {t(locale, "panel.validation")}: <strong>0</strong>
            </li>
          </ul>
        </article>

        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.matchState")}</h3>
          <ul className="panel__status-list">
            <li>
              {t(locale, "panel.status")}:{" "}
              <strong>{snapshot.frame.match.status}</strong>
            </li>
            <li>
              {t(locale, "panel.clock")}:{" "}
              <strong>{formatClock(snapshot.frame.match.clockMs)}</strong>
            </li>
            <li>
              {t(locale, "panel.score")}:{" "}
              <strong>
                {snapshot.frame.match.score.home}–{snapshot.frame.match.score.away}
              </strong>
            </li>
            <li>
              {t(locale, "panel.period")}:{" "}
              <strong>P{snapshot.frame.match.period}</strong>
            </li>
            <li>
              {t(locale, "panel.broadcastDelay")}:{" "}
              <strong>
                {snapshot.broadcastDelayMs === 0
                  ? t(locale, "controls.delay.off")
                  : `${Math.round(snapshot.broadcastDelayMs / 1000)}s`}
              </strong>
            </li>
          </ul>
        </article>

        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.possession")}</h3>
          <ul className="panel__status-list">
            {teamIds.map((teamId) => (
              <li key={teamId}>
                {teamId.replace("team-", "")}:{" "}
                <strong>
                  {snapshot.stats.possessionByTeam[teamId] ?? 0}%
                </strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.advanced")}</h3>
          <ul className="panel__status-list">
            {teamIds.map((teamId) => {
              const stats = snapshot.stats.teams[teamId];
              if (!stats) return null;
              return (
                <li key={teamId}>
                  {teamId.replace("team-", "")}:{" "}
                  <strong>
                    {stats.averagePassDistanceM.toFixed(1)} m ·{" "}
                    {stats.averagePassDifficulty.toFixed(2)} ·{" "}
                    {stats.averageShotSpeedKmh.toFixed(1)} km/h
                  </strong>
                </li>
              );
            })}
            <li>
              {t(locale, "stat.progressivePasses")}:{" "}
              <strong>
                {snapshot.stats.teams[homeId]?.progressivePasses ?? 0} /{" "}
                {snapshot.stats.teams[awayId]?.progressivePasses ?? 0}
              </strong>
            </li>
          </ul>
        </article>

        <article className="panel__module panel__module--ai">
          <h3 className="panel__module-title">{t(locale, "ai.title")}</h3>
          <p className="panel__muted">{t(locale, "ai.subtitle")}</p>
          <div className="ai-modes" role="group" aria-label={t(locale, "ai.mode")}>
            {(["advisory", "autonomous"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`btn btn--chip${ai.mode === mode ? " is-active" : ""}`}
                aria-pressed={ai.mode === mode}
                onClick={() => onAgentModeChange?.(mode)}
              >
                {t(locale, `ai.mode.${mode}`)}
              </button>
            ))}
          </div>
          <p className="panel__muted">
            {t(
              locale,
              ai.mode === "autonomous"
                ? "ai.mode.autonomousHint"
                : "ai.mode.advisoryHint",
            )}
          </p>
          <ul className="panel__status-list">
            <li>
              {t(locale, "ai.provider")}:{" "}
              <strong>{t(locale, `ai.provider.${ai.provider}`)}</strong>
            </li>
            <li>
              {t(locale, "ai.model")}: <strong>{ai.model}</strong>
            </li>
            <li>
              {t(locale, "ai.status")}:{" "}
              <strong>{t(locale, `ai.status.${ai.status}`)}</strong>
            </li>
            <li>
              {t(locale, "ai.llm")}:{" "}
              <strong>
                {t(
                  locale,
                  ai.llmConfigured ? "ai.llm.configured" : "ai.llm.notConfigured",
                )}
              </strong>
            </li>
            {ai.lastLatencyMs !== undefined ? (
              <li>{t(locale, "ai.latency", { ms: ai.lastLatencyMs })}</li>
            ) : null}
          </ul>
          <div className="ai-follow">
            <label className="panel__field">
              <span>{t(locale, "ai.followTeam")}</span>
              <select
                value={personalization.followedTeamId ?? ""}
                onChange={(event) => changeTeam(event.target.value)}
              >
                <option value="">{t(locale, "ai.followNone")}</option>
                {TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel__field">
              <span>{t(locale, "ai.followPlayer")}</span>
              <select
                value={personalization.followedPlayerId ?? ""}
                onChange={(event) => changePlayer(event.target.value)}
              >
                <option value="">{t(locale, "ai.followNone")}</option>
                {playerOptions.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · {teamName(player.teamId)}
                  </option>
                ))}
              </select>
            </label>
            <p className="panel__muted">{t(locale, "ai.followHint")}</p>
            {personalization.followedPlayerId ? (
              <p className="panel__muted">
                {t(locale, "ai.followPlayer")}:{" "}
                <strong>{playerName(personalization.followedPlayerId)}</strong>
              </p>
            ) : null}
          </div>
        </article>

        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.overlays")}</h3>
          <ul className="panel__status-list">
            {snapshot.overlays.length === 0 ? (
              <li>{t(locale, "panel.noneYet")}</li>
            ) : null}
            {[...snapshot.overlays]
              .sort((a, b) => Number(a.status) - Number(b.status))
              .map((overlay) => (
                <li key={overlay.id}>
                  {overlay.id.split("-").pop()} · {overlay.slot} ·{" "}
                  <strong>{overlay.status}</strong> {t(locale, "panel.version")}
                  {overlay.version}
                </li>
              ))}
          </ul>
        </article>

        <article className="panel__module">
          <h3 className="panel__module-title">{t(locale, "panel.corrections")}</h3>
          <ul className="panel__status-list">
            {snapshot.corrections.length === 0 ? (
              <li>{t(locale, "panel.none")}</li>
            ) : null}
            {snapshot.corrections.map((correction) => (
              <li key={correction.id}>
                {correction.sourceEventId} → {correction.replacementEventId}:{" "}
                {reasonLabel(correction.reason, locale)}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="panel__columns">
        <div className="panel__column">
          <h3 className="panel__module-title">
            {t(locale, "panel.events")} ({snapshot.events.length})
          </h3>
          {recentEvents.length === 0 ? (
            <p className="panel__muted">{t(locale, "panel.noResults")}</p>
          ) : (
            <ol className="panel__log">
              {recentEvents.map((event) => (
                <li
                  key={event.id}
                  className={`panel__log-item panel__log-item--${event.type}`}
                >
                  <span className="panel__log-time">
                    P{event.period} {formatClock(event.clockMs)}
                  </span>
                  <span className="panel__log-label">{eventLabel(event, locale)}</span>
                  <span
                    className={`panel__log-status panel__log-status--${event.status}`}
                  >
                    {event.status}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="panel__column">
          <h3 className="panel__module-title">
            {t(locale, "panel.insights")} ({snapshot.insights.length})
          </h3>
          {insights.length === 0 ? (
            <p className="panel__muted">{t(locale, "panel.noResults")}</p>
          ) : (
            <ol className="panel__log">
              {insights.map((insight) => {
                const localized = localizeInsight(
                  locale,
                  insight,
                  snapshot.events,
                );
                return (
                  <li key={insight.id} className="panel__log-item">
                    <span className="panel__log-time">p{insight.priority}</span>
                    <span className="panel__log-label">
                      {localized.headline}
                      <span className="panel__evidence">
                        {" "}
                        [{insight.evidenceEventIds.length}{" "}
                        {t(locale, "panel.evidence")}]
                      </span>
                    </span>
                    <span
                      className={`panel__log-status panel__log-status--${insight.status}`}
                    >
                      {insight.status}
                    </span>
                    {onExplain ? (
                      <button
                        className="btn btn--tiny"
                        type="button"
                        disabled={explainingId === insight.id}
                        onClick={() => onExplain(insight.id)}
                      >
                        {explainingId === insight.id
                          ? "…"
                          : t(locale, "ai.explain")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="panel__column">
          <h3 className="panel__module-title">
            {t(locale, "panel.passMetrics")} ({snapshot.stats.passMetrics.length})
          </h3>
          {hardestPasses.length === 0 ? (
            <p className="panel__muted">{t(locale, "panel.noneYet")}</p>
          ) : (
            <ol className="panel__log">
              {hardestPasses.map((metric) => (
                <li className="panel__log-item" key={metric.eventId}>
                  <span className="panel__log-time">
                    {metric.teamId.replace("team-", "")}
                  </span>
                  <span className="panel__log-label">
                    {metric.distanceM.toFixed(1)} m ·{" "}
                    {t(locale, "panel.difficulty")}{" "}
                    {metric.difficulty.toFixed(2)}
                    {metric.progressive
                      ? ` · ${t(locale, "stat.progressive")}`
                      : ""}
                    {metric.underPressure
                      ? ` · ${t(locale, "stat.underPressure")}`
                      : ""}
                  </span>
                  <span className="panel__log-status">
                    {metric.successful
                      ? t(locale, "event.pass.completed")
                      : t(locale, "event.pass.lost")}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <h3 className="panel__module-title">
            {t(locale, "panel.shotMetrics")} ({snapshot.stats.shotMetrics.length})
          </h3>
          {fastestShots.length === 0 ? (
            <p className="panel__muted">{t(locale, "panel.noneYet")}</p>
          ) : (
            <ol className="panel__log">
              {fastestShots.map((metric) => (
                <li className="panel__log-item" key={metric.eventId}>
                  <span className="panel__log-time">
                    {metric.teamId.replace("team-", "")}
                  </span>
                  <span className="panel__log-label">
                    {metric.estimatedSpeedKmh.toFixed(1)} km/h ·{" "}
                    {metric.distanceToGoalM.toFixed(1)} m
                  </span>
                  <span className="panel__log-status">
                    {metric.onTarget
                      ? t(locale, "event.shot.onTarget")
                      : t(locale, "event.shot.offTarget")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="panel__column">
          <h3 className="panel__module-title">
            {t(locale, "panel.decisions")} ({snapshot.decisions.length})
          </h3>
          <ol className="panel__log">
            {[...snapshot.decisions]
              .slice(-40)
              .reverse()
              .map((decision) => (
                <li key={decision.id} className="panel__log-item">
                  <span className="panel__log-time">{decision.kind}</span>
                  <span className="panel__log-label">{decision.reason}</span>
                </li>
              ))}
          </ol>

          <h3 className="panel__module-title">
            {t(locale, "ai.decisions")} ({snapshot.agentDecisions.length})
          </h3>
          {snapshot.agentDecisions.length === 0 ? (
            <p className="panel__muted">{t(locale, "ai.noDecisions")}</p>
          ) : (
            <ol className="panel__log">
              {[...snapshot.agentDecisions]
                .slice(-12)
                .reverse()
                .map((decision) => {
                  const insight = snapshot.insights.find(
                    (candidate) => candidate.id === decision.insightId,
                  );
                  const headline = insight
                    ? localizeInsight(locale, insight, snapshot.events).headline
                    : decision.insightId;
                  return (
                    <li key={decision.id} className="panel__log-item">
                      <span className={`ai-decision ai-decision--${decision.action}`}>
                        {t(locale, `ai.action.${decision.action}`)}
                      </span>
                      <span className="panel__log-label">
                        {headline}
                        <span className="panel__evidence">
                          {" "}
                          {decision.score.toFixed(2)} ·{" "}
                          {t(locale, "ai.confidence")}{" "}
                          {decision.confidence.toFixed(2)} · {decision.topFeature}
                        </span>
                      </span>
                      <span className="panel__log-status">
                        {decision.applied ? "✓" : "·"}
                      </span>
                    </li>
                  );
                })}
            </ol>
          )}

          <h3 className="panel__module-title">{t(locale, "ai.recap")}</h3>
          <button
            className="btn btn--ghost"
            type="button"
            disabled={!snapshot.recap || recapBusy}
            onClick={() => onAiRecap?.()}
          >
            {recapBusy ? "…" : t(locale, "ai.recap")}
          </button>
          {latestNarratives.length === 0 ? (
            <p className="panel__muted">{t(locale, "ai.noDecisions")}</p>
          ) : (
            <ol className="panel__log">
              {latestNarratives.slice(0, 6).map((narrative) => (
                <li key={narrative.id} className="panel__log-item">
                  <span className="panel__log-time">
                    {narrative.fallback ? t(locale, "ai.fallback") : narrative.provider}
                  </span>
                  <span className="panel__log-label">{narrative.text}</span>
                  <span className="panel__log-status">
                    {t(locale, "ai.evidence", {
                      count: narrative.evidenceEventIds.length,
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <h3 className="panel__module-title">
            {t(locale, "panel.insightDetail")}
          </h3>
          <ul className="panel__status-list">
            {[...snapshot.insights]
              .filter((insight) => insight.status === "invalidated")
              .slice(0, 5)
              .map((insight) => (
                <li key={insight.id}>
                  {localizeInsight(locale, insight, snapshot.events).headline}:{" "}
                  {insight.status}, {t(locale, "panel.evidence")}{" "}
                  {insight.evidenceEventIds.join(", ")}
                </li>
              ))}
            {snapshot.insights.filter((insight) => insight.status === "invalidated")
              .length === 0 ? (
              <li>{t(locale, "panel.noInvalidated")}</li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}

export type { AudienceMode };
