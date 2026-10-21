import type { Locale } from "../i18n";
import { Link } from "react-router-dom";

export interface PageProps {
  locale: Locale;
}

export function CoordinatesPage(_props: PageProps) {
  return (
    <section className="info-page">
      <header className="info-page__header">
        <h1 className="info-page__title">Coordinates & clock</h1>
        <Link className="info-page__back" to="/">
          Back to broadcast
        </Link>
      </header>
      <div className="info-page__content">
        <article className="info-page__card">
          <h2>Coordinate system</h2>
          <p>Pitch uses world coordinates in meters.</p>
          <ul>
            <li><strong>Home team</strong> attacks toward <strong>+x</strong></li>
            <li><strong>Away team</strong> attacks toward <strong>-x</strong></li>
            <li><strong>Goal line</strong> at x = ±52.5</li>
            <li><strong>Touchline</strong> at z = ±34</li>
            <li><strong>Ball/player Y</strong> near ground (0–0.2)</li>
          </ul>
        </article>
        <article className="info-page__card">
          <h2>Clock model</h2>
          <ul>
            <li><strong>Match clock</strong> — time shown (minutes:seconds) derived from clockMs</li>
            <li><strong>Simulation clock</strong> — logical time for events/decisions</li>
            <li><strong>Wall clock</strong> — real browser time for animation only</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
