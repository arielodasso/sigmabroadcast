import type { NarrativeRecap } from "../contracts";
import { t, type Locale } from "../i18n";
import { localizeRecap } from "../match-truth/narrative";
import { formatClock } from "../utils/format";

export interface MatchRecapProps {
  recap: NarrativeRecap | null;
  locale: Locale;
}

export function MatchRecap({ recap, locale }: MatchRecapProps) {
  if (!recap) {
    return (
      <section className="recap" id="match-recap" aria-label={t(locale, "recap.title")}>
        <div className="recap__empty">
          <p className="recap__kicker">{t(locale, "recap.kicker")}</p>
          <h2 className="recap__title">{t(locale, "recap.title")}</h2>
          <p className="recap__empty-text">{t(locale, "recap.empty")}</p>
        </div>
      </section>
    );
  }

  const localized = localizeRecap(locale, recap);
  const rows = localized.statistics.home.map((row) => ({
    id: row.id,
    label: t(locale, row.labelKey),
    home: row.value,
    away:
      localized.statistics.away.find((candidate) => candidate.id === row.id)?.value ??
      "—",
  }));

  return (
    <section className="recap" id="match-recap" aria-label={t(locale, "recap.title")}>
      <div className="recap__header">
        <div>
          <p className="recap__kicker">{t(locale, "recap.kicker")}</p>
          <h2 className="recap__title">{t(locale, "recap.title")}</h2>
        </div>
        <p className="recap__generated">
          {t(locale, "recap.generated", { clock: formatClock(recap.generatedAtMs) })}
        </p>
      </div>

      <p className="recap__headline">{localized.headline}</p>

      <div className="recap__body">
        <div className="recap__narrative">
          {localized.sentences.map((sentence, index) => (
            <p className="recap__sentence" key={`${index}-${sentence}`}>
              {sentence}
            </p>
          ))}
        </div>

        <div className="recap__moments">
          <h3 className="recap__section-title">{t(locale, "recap.keyMoments")}</h3>
          {localized.moments.length === 0 ? (
            <p className="recap__muted">{t(locale, "panel.noneYet")}</p>
          ) : (
            <ol className="recap__moment-list">
              {localized.moments.map((moment) => (
                <li className={`recap__moment recap__moment--${moment.kind}`} key={moment.eventId}>
                  <span className="recap__moment-title">{moment.title}</span>
                  <span className="recap__moment-detail">{moment.detail}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="recap__statistics">
        <h3 className="recap__section-title">{t(locale, "recap.statistics")}</h3>
        <table className="recap__table">
          <thead>
            <tr>
              <th scope="col">{t(locale, "panel.home")}</th>
              <th scope="col">{t(locale, "stat.label")}</th>
              <th scope="col">{t(locale, "panel.away")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.home}</td>
                <th scope="row">{row.label}</th>
                <td>{row.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
