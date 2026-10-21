import type { Locale } from "../i18n";
import { Link } from "react-router-dom";

export interface PageProps {
  locale: Locale;
}

export function HelpPage(_props: PageProps) {
  return (
    <section className="info-page">
      <header className="info-page__header">
        <h1 className="info-page__title">Help</h1>
        <Link className="info-page__back" to="/">
          Back to broadcast
        </Link>
      </header>
      <div className="info-page__content">
        <article className="info-page__card">
          <h2>Controls</h2>
          <ul>
            <li><kbd>Space</kbd> — Play/Pause</li>
            <li>Transport bar — Speed, Camera (Broadcast/Tactical), Audience (Fan/Analyst)</li>
            <li>Top search — Filter the audit log</li>
          </ul>
        </article>
        <article className="info-page__card">
          <h2>Views</h2>
          <ul>
            <li><strong>Transmisión</strong> — Live 3D broadcast view</li>
            <li><strong>Panel de control</strong> — Events, insights, decisions, corrections, advanced metrics</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
