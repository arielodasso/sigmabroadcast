import { t, type Locale } from "../i18n";
import { ArrowRightIcon } from "./Icons";
import type { AppView } from "./TopNav";

export interface FooterLink {
  label: string;
  target: string;
  view?: AppView;
}

export interface SiteFooterProps {
  locale: Locale;
  onNavigate: (target: string, view?: AppView) => void;
}

export function SiteFooter({ locale, onNavigate }: SiteFooterProps) {
  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t(locale, "nav.broadcast"),
      links: [
        { label: t(locale, "hero.cta"), target: "broadcast-stage" },
        { label: t(locale, "strip.title"), target: "broadcast-strip" },
        { label: t(locale, "overlay.label"), target: "broadcast-stage" },
      ],
    },
    {
      title: t(locale, "nav.audit"),
      links: [
        { label: t(locale, "panel.title"), target: "control-panel", view: "audit" },
        { label: t(locale, "panel.advanced"), target: "control-panel", view: "audit" },
        { label: t(locale, "panel.events"), target: "control-panel", view: "audit" },
      ],
    },
    {
      title: t(locale, "recap.title"),
      links: [
        { label: t(locale, "recap.keyMoments"), target: "match-recap" },
        { label: t(locale, "recap.statistics"), target: "match-recap" },
        { label: t(locale, "stat.events"), target: "broadcast-strip" },
      ],
    },
    {
      title: t(locale, "utility.docs"),
      links: [
        { label: "Specification", target: "doc-spec" },
        { label: "Coordinates & clock", target: "doc-coordinates" },
        { label: t(locale, "utility.help"), target: "doc-help" },
      ],
    },
  ];

  return (
    <footer className="footer" id="docs">
      <div className="footer__brand">
        <span className="footer__wordmark">{t(locale, "nav.brand")}</span>
        <p className="footer__tagline">{t(locale, "nav.brandTagline")}</p>
        <p className="footer__note">{t(locale, "utility.synthetic")}</p>
      </div>

      <div className="footer__columns">
        {columns.map((column) => (
          <div className="footer__column" key={column.title}>
            <h2 className="footer__column-title">{column.title}</h2>
            <ul className="footer__list">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <a
                    className="footer__link"
                    href={`#${link.target}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(link.target, link.view);
                    }}
                  >
                    {link.label}
                    <ArrowRightIcon size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer__docs">
        <article className="footer__doc" id="doc-spec">
          <h3 className="footer__doc-title">Specification</h3>
          <p className="footer__doc-text">
            The full technical contract — coordinate system, clock model, event
            schema, insight rules and overlay scheduling — lives in{" "}
            <code>SPEC.md</code> at the root of the repository.
          </p>
        </article>
        <article className="footer__doc" id="doc-coordinates">
          <h3 className="footer__doc-title">Coordinates &amp; clock</h3>
          <p className="footer__doc-text">
            Pitch coordinates, attack direction and the event clock are
            documented in <code>docs/coordinates-clock-events.md</code>. Home
            attacks toward +x, away toward −x.
          </p>
        </article>
        <article className="footer__doc" id="doc-help">
          <h3 className="footer__doc-title">{t(locale, "utility.help")}</h3>
          <p className="footer__doc-text">
            Use <kbd>Space</kbd> to play or pause, the transport bar for speed,
            camera and audience, and the top search to filter the audit log.
          </p>
        </article>
      </div>
    </footer>
  );
}
