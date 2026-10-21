import type { Match, Team } from "../contracts";
import { t, type Locale } from "../i18n";
import { formatClock } from "../utils/format";

export { formatClock };

export interface ScorebugProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  locale: Locale;
}

export function Scorebug({ match, homeTeam, awayTeam, locale }: ScorebugProps) {
  const statusLabel =
    match.status === "finished"
      ? t(locale, "scorebug.ft")
      : match.status === "halftime"
        ? t(locale, "scorebug.ht")
        : match.status === "live"
          ? match.period === 1
            ? t(locale, "scorebug.firstHalf")
            : t(locale, "scorebug.secondHalf")
          : t(locale, "scorebug.scheduled");

  return (
    <div className="scorebug" aria-label={t(locale, "scorebug.label")}>
      <span className="scorebug__period">{statusLabel}</span>
      <span className="scorebug__clock">{formatClock(match.clockMs)}</span>
      <span className="scorebug__team">
        <span
          className="scorebug__dot"
          style={{ backgroundColor: homeTeam.color }}
        />
        {homeTeam.shortName}
      </span>
      <span className="scorebug__score">
        {match.score.home} – {match.score.away}
      </span>
      <span className="scorebug__team">
        {awayTeam.shortName}
        <span
          className="scorebug__dot"
          style={{ backgroundColor: awayTeam.color }}
        />
      </span>
    </div>
  );
}
