import type { Locale } from "../i18n";
import { Link } from "react-router-dom";

export interface PageProps {
  locale: Locale;
}

export function SpecificationPage(_props: PageProps) {
  return (
    <section className="info-page">
      <header className="info-page__header">
        <h1 className="info-page__title">Specification</h1>
        <Link className="info-page__back" to="/">
          Back to broadcast
        </Link>
      </header>
      <div className="info-page__content">
        <p className="info-page__lead">
          Sigma Broadcast — technical contract covering coordinate system, clock
          model, event schema, insight rules and overlay scheduling.
        </p>
        <article className="info-page__card">
          <h2>Core</h2>
          <ul>
            <li>Deterministic synthetic match simulation</li>
            <li>Evidence-based insights via MatchTruth</li>
            <li>Broadcast direction via BroadcastSync</li>
            <li>3D rendering with Three.js</li>
            <li>i18n (English/Spanish), narrative recap, advanced metrics</li>
          </ul>
        </article>
        <article className="info-page__card">
          <h2>Contracts</h2>
          <p>
            Match, Team, Player, MatchEvent, MatchInsight, BroadcastOverlay and
            CorrectionEvent are defined in <code>src/contracts/</code>.
          </p>
        </article>
      </div>
    </section>
  );
}
