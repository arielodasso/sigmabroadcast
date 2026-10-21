import type { Match, Team } from "../contracts";
import { t, type Locale } from "../i18n";
import { formatClock } from "../utils/format";
import { ArrowRightIcon, PlayIcon } from "./Icons";

export interface EditorialHeroProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  locale: Locale;
  playing: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

function statusLabel(match: Match, locale: Locale): string {
  if (match.status === "finished") return t(locale, "scorebug.ft");
  if (match.status === "halftime") return t(locale, "scorebug.ht");
  if (match.status === "live") {
    return match.period === 1
      ? t(locale, "scorebug.firstHalf")
      : t(locale, "scorebug.secondHalf");
  }
  return t(locale, "scorebug.scheduled");
}

export function EditorialHero({
  match,
  homeTeam,
  awayTeam,
  locale,
  playing,
  onPrimaryAction,
  onSecondaryAction,
}: EditorialHeroProps) {
  return (
    <section className="hero" aria-label={t(locale, "hero.cardLabel")}>
      <div className="hero__content">
        <p className="hero__kicker">{t(locale, "hero.kicker")}</p>
        <h1 className="hero__title">{t(locale, "hero.title")}</h1>
        <p className="hero__subtitle">{t(locale, "hero.subtitle")}</p>
        <div className="hero__actions">
          <button className="btn btn--primary" type="button" onClick={onPrimaryAction}>
            <PlayIcon size={16} />
            <span>{t(locale, "hero.cta")}</span>
          </button>
          <button className="btn btn--ghost" type="button" onClick={onSecondaryAction}>
            <span>{t(locale, "hero.ctaAudit")}</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>

      <aside className="hero__card" aria-label={t(locale, "hero.cardLabel")}>
        <p className="hero__card-label">{t(locale, "hero.cardLabel")}</p>
        <div className="hero__card-teams">
          <span className="hero__card-team">{homeTeam.name}</span>
          <span className="hero__card-score">
            {match.score.home}–{match.score.away}
          </span>
          <span className="hero__card-team">{awayTeam.name}</span>
        </div>
        <dl className="hero__card-meta">
          <div>
            <dt>{t(locale, "hero.status")}</dt>
            <dd>{statusLabel(match, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "hero.clock")}</dt>
            <dd>{formatClock(match.clockMs)}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}
