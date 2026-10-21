import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import type { AudienceMode } from "../contracts";
import { AuditStrip } from "../broadcast-ui/AuditStrip";
import { ControlPanel } from "../broadcast-ui/ControlPanel";
import { EditorialHero } from "../broadcast-ui/EditorialHero";
import { MatchRecap } from "../broadcast-ui/MatchRecap";
import { OverlayLayer } from "../broadcast-ui/OverlayLayer";
import { Scorebug } from "../broadcast-ui/Scorebug";
import { SiteFooter } from "../broadcast-ui/SiteFooter";
import { TopNav, type AppView } from "../broadcast-ui/TopNav";
import { TransportControls } from "../broadcast-ui/TransportControls";
import { t, type Locale } from "../i18n";
import type { CameraMode } from "../renderer3d/cameras";
import { Scene } from "../renderer3d/Scene";
import { AWAY_TEAM, HOME_TEAM } from "../simulation/roster";
import { BroadcastController, type BroadcastSnapshot } from "../state/broadcast-controller";
import { CoordinatesPage } from "../pages/CoordinatesPage";
import { HelpPage } from "../pages/HelpPage";
import { SpecificationPage } from "../pages/SpecificationPage";

const UI_REFRESH_MS = 200;

export function App() {
  const routerNavigate = useNavigate();
  const controllerRef = useRef<BroadcastController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new BroadcastController();
  }
  const controller = controllerRef.current;

  const [snapshot, setSnapshot] = useState<BroadcastSnapshot>(() =>
    controller.snapshot(),
  );
  const [cameraMode, setCameraMode] = useState<CameraMode>("broadcast");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [locale, setLocale] = useState<Locale>(controller.getLocale());
  const [view, setView] = useState<AppView>("broadcast");
  const [query, setQuery] = useState("");

  const lastUiRefresh = useRef(0);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const togglePlay = () => {
    if (controller.engine.getStatus() === "playing") {
      controller.engine.pause();
      setPlaying(false);
    } else if (controller.engine.getStatus() === "finished") {
      resetMatch();
    } else {
      controller.engine.play();
      setPlaying(true);
    }
  };

  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const resetMatch = () => {
    controller.reset();
    controller.setAudience(audience);
    setPlaying(false);
    setSpeed(1);
    setSnapshot(controller.snapshot());
  };

  const changeSpeed = (next: number) => {
    controller.engine.setSpeed(next);
    setSpeed(next);
  };

  const changeAudience = (next: AudienceMode) => {
    controller.setAudience(next);
    setAudience(next);
  };

  const changeLocale = (next: Locale) => {
    controller.setLocale(next);
    setLocale(next);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    // A query only has a visible effect on the audit log, so the panel is
    // revealed as soon as the user starts filtering.
    if (value.trim().length > 0) setView("audit");
  };

  const navigate = (target: string, nextView?: AppView) => {
    if (nextView) setView(nextView);
    if (target === "doc-spec") {
      routerNavigate("/specification");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === "doc-coordinates") {
      routerNavigate("/coordinates");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === "doc-help") {
      routerNavigate("/help");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    requestAnimationFrame(() => {
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const onAdvance = useMemo(() => {
    return (deltaWallMs: number) => {
      controller.advanceBy(deltaWallMs);
      const now = performance.now();
      if (now - lastUiRefresh.current >= UI_REFRESH_MS) {
        lastUiRefresh.current = now;
        setSnapshot(controller.snapshot());
      }
    };
  }, [controller]);

  const finished = snapshot.frame.match.status === "finished";

  return (
    <div className="app">
      <a className="skip-link" href="#broadcast-stage">
        {t(locale, "nav.skip")}
      </a>

      <TopNav
        locale={locale}
        onLocaleChange={changeLocale}
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={changeQuery}
        onNavigate={navigate}
      />

      <main className="app__main">
        <Routes>
          <Route
            path="/"
            element={
              view === "broadcast" ? (
                <>
                  <EditorialHero
                    match={snapshot.frame.match}
                    homeTeam={HOME_TEAM}
                    awayTeam={AWAY_TEAM}
                    locale={locale}
                    playing={playing}
                    onPrimaryAction={togglePlay}
                    onSecondaryAction={() => setView("audit")}
                  />

                  <section className="stage" id="broadcast-stage" aria-label={t(locale, "nav.broadcast")}>
                    <Scene
                      engine={controller.engine}
                      cameraMode={cameraMode}
                      onAdvance={onAdvance}
                    />
                    <div className="stage__ui">
                      <Scorebug
                        match={snapshot.frame.match}
                        homeTeam={HOME_TEAM}
                        awayTeam={AWAY_TEAM}
                        locale={locale}
                      />
                      <OverlayLayer
                        overlays={snapshot.activeOverlays}
                        insights={snapshot.insights}
                        events={snapshot.events}
                        audience={snapshot.audience}
                        locale={locale}
                      />
                    </div>
                    {!playing && !finished ? (
                      <button
                        className="stage__play"
                        onClick={togglePlay}
                        type="button"
                        aria-label={t(locale, "controls.playMatch")}
                      >
                        {t(locale, "controls.playMatch")}
                      </button>
                    ) : null}
                  </section>

                  <TransportControls
                    locale={locale}
                    playing={playing}
                    finished={finished}
                    speed={speed}
                    cameraMode={cameraMode}
                    audience={audience}
                    onTogglePlay={togglePlay}
                    onReset={resetMatch}
                    onSpeedChange={changeSpeed}
                    onCameraChange={setCameraMode}
                    onAudienceChange={changeAudience}
                  />

                  <AuditStrip snapshot={snapshot} locale={locale} />

                  <MatchRecap recap={snapshot.recap} locale={locale} />
                </>
              ) : (
                <ControlPanel snapshot={snapshot} locale={locale} query={query} />
              )
            }
          />
          <Route path="/specification" element={<SpecificationPage locale={locale} />} />
          <Route path="/coordinates" element={<CoordinatesPage locale={locale} />} />
          <Route path="/help" element={<HelpPage locale={locale} />} />
        </Routes>
      </main>

      <SiteFooter locale={locale} onNavigate={navigate} />
    </div>
  );
}
