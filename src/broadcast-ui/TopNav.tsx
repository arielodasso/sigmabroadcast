import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "../i18n";
import { t } from "../i18n";
import { GlobeIcon, SearchIcon } from "./Icons";

export type AppView = "broadcast" | "audit";

export interface TopNavProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  view: AppView;
  onViewChange: (view: AppView) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onNavigate: (target: string, view?: AppView) => void;
}

export function TopNav({
  locale,
  onLocaleChange,
  view,
  onViewChange,
  query,
  onQueryChange,
  onNavigate,
}: TopNavProps) {
  return (
    <header className="topnav">
      <div className="topnav__utility">
        <span className="topnav__utility-note">
          {t(locale, "utility.synthetic")}
        </span>
        <nav className="topnav__utility-links" aria-label={t(locale, "utility.help")}>
          <a
            href="#control-panel"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("control-panel", "audit");
            }}
          >
            {t(locale, "utility.help")}
          </a>
          <a
            href="#docs"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("docs");
            }}
          >
            {t(locale, "utility.docs")}
          </a>
          <span className="topnav__utility-region">
            {t(locale, "utility.region")}: {t(locale, "utility.regionValue")}
          </span>
        </nav>
      </div>

      <div className="topnav__main">
        <div className="topnav__brand">
          <span className="topnav__wordmark">{t(locale, "nav.brand")}</span>
          <span className="topnav__tagline">{t(locale, "nav.brandTagline")}</span>
        </div>

        <nav className="topnav__tabs" aria-label={t(locale, "nav.menu")}>
          <button
            type="button"
            className={`topnav__tab ${view === "broadcast" ? "is-active" : ""}`}
            aria-current={view === "broadcast" ? "page" : undefined}
            onClick={() => onViewChange("broadcast")}
          >
            {t(locale, "nav.broadcast")}
          </button>
          <button
            type="button"
            className={`topnav__tab ${view === "audit" ? "is-active" : ""}`}
            aria-current={view === "audit" ? "page" : undefined}
            onClick={() => onViewChange("audit")}
          >
            {t(locale, "nav.audit")}
          </button>
        </nav>

        <div className="topnav__tools">
          <label className="topnav__search">
            <SearchIcon size={16} />
            <span className="visually-hidden">{t(locale, "nav.searchLabel")}</span>
            <input
              type="search"
              value={query}
              placeholder={t(locale, "nav.search")}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>

          <div
            className="topnav__locale"
            role="group"
            aria-label={t(locale, "nav.language")}
          >
            <GlobeIcon size={16} />
            {SUPPORTED_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={`topnav__locale-option ${
                  locale === code ? "is-active" : ""
                }`}
                aria-pressed={locale === code}
                onClick={() => onLocaleChange(code)}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
