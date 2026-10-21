import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { createBroadcastSync, PUBLISH_INTERVAL_MS } from "../state/broadcast-sync-channel";
import { BroadcastOutputPage } from "../pages/BroadcastOutputPage";
import { CoordinatesPage } from "../pages/CoordinatesPage";
import { HelpPage } from "../pages/HelpPage";
import { SpecificationPage } from "../pages/SpecificationPage";

const UI_REFRESH_MS = 200;

/** Route that renders the bare, transparent broadcast graphics. */
const OUTPUT_ROUTE = "/output";

export function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const controllerRef = useRef<BroadcastController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new BroadcastController();
  }
  const controller = controllerRef.current;

  const syncRef = useRef<ReturnType<typeof createBroadcastSync> | null>(null);
  if (!syncRef.current) {
    syncRef.current = createBroadcastSync();
  }
  const sync = syncRef.current;

  const [snapshot, setSnapshot] = useState<BroadcastSnapshot>(() =>
    controller.snapshot(),
  );
  const [remoteSnapshot, setRemoteSnapshot] = useState<BroadcastSnapshot | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("broadcast");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [locale, setLocale] = useState<Locale>(controller.getLocale());
  const [view, setView] = useState<AppView>("broadcast");
  const [query, setQuery] = useState("");

  const isOutput = location.pathname === OUTPUT_ROUTE;
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("is-broadcast-output", isOutput);
    document.body.classList.toggle("is-broadcast-output", isOutput);
    return () => {
      document.documentElement.classList.remove("is-broadcast-output");
      document.body.classList.remove("is-broadcast-output");
    };
  }, [isOutput]);

  /**
   * The match clock lives in the application shell, not in the 3D scene, so
   * the control panel and the transparent output page show the same match as
   * the broadcast view.
   *
   * The control room publishes its snapshot to the other tabs; the output tab
   * renders that snapshot instead of its own simulation.
   */
  useEffect(() => {
    let animationId = 0;
    let lastTime = performance.now();
    let lastPublish = 0;
    let lastUi = 0;
    const loop = (time: number) => {
      animationId = requestAnimationFrame(loop);
      const deltaWallMs = Math.min(100, time - lastTime);
      lastTime = time;
      controller.advanceBy(deltaWallMs);
      if (time - lastPublish >= PUBLISH_INTERVAL_MS) {
        lastPublish = time;
        const current = controller.snapshot();
        if (!isOutput) sync.publish(current);
      }
      if (time - lastUi >= UI_REFRESH_MS) {
        lastUi = time;
        setSnapshot(controller.snapshot());
      }
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [controller, isOutput, sync]);

  /**
   * The output tab listens to the control room instead of directing its own
   * match. Until the first message arrives it falls back to its own
   * simulation, so a standalone output tab still works.
   */
  useEffect(() => {
    if (!isOutput) return;
    return sync.subscribe(setRemoteSnapshot);
  }, [isOutput, sync]);

  /**
   * A standalone output tab (opened without a control room) still has to show
   * a running match, so the local simulation starts itself.
   */
  useEffect(() => {
    if (!isOutput) return;
    controller.engine.play();
  }, [controller, isOutput]);

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

  const changeBroadcastDelay = (delayMs: number) => {
    controller.setBroadcastDelayMs(delayMs);
    setSnapshot(controller.snapshot());
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

  const finished = snapshot.frame.match.status === "finished";

  if (isOutput) {
    return (
      <BroadcastOutputPage
        snapshot={remoteSnapshot ?? snapshot}
        locale={locale}
        audience={audience}
      />
    );
  }

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
                    <Scene engine={controller.engine} cameraMode={cameraMode} />
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
                    broadcastDelayMs={snapshot.broadcastDelayMs}
                    onTogglePlay={togglePlay}
                    onReset={resetMatch}
                    onSpeedChange={changeSpeed}
                    onCameraChange={setCameraMode}
                    onAudienceChange={changeAudience}
                    onBroadcastDelayChange={changeBroadcastDelay}
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
