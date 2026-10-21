import type { AudienceMode } from "../contracts";
import { t, type Locale } from "../i18n";
import { PauseIcon, PlayIcon, ReplayIcon } from "./Icons";

export const SPEEDS = [1, 2, 4, 8] as const;

/** Selectable broadcast delays, in milliseconds. */
export const BROADCAST_DELAYS = [0, 10_000, 20_000, 45_000] as const;

export interface TransportControlsProps {
  locale: Locale;
  playing: boolean;
  finished: boolean;
  speed: number;
  cameraMode: "broadcast" | "tactical";
  audience: AudienceMode;
  broadcastDelayMs: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onCameraChange: (mode: "broadcast" | "tactical") => void;
  onAudienceChange: (audience: AudienceMode) => void;
  onBroadcastDelayChange: (delayMs: number) => void;
}

export function TransportControls({
  locale,
  playing,
  finished,
  speed,
  cameraMode,
  audience,
  broadcastDelayMs,
  onTogglePlay,
  onReset,
  onSpeedChange,
  onCameraChange,
  onAudienceChange,
  onBroadcastDelayChange,
}: TransportControlsProps) {
  return (
    <div className="transport" role="group" aria-label={t(locale, "controls.group")}>
      <div className="transport__group">
        <button
          className="btn btn--primary"
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? t(locale, "controls.pause") : t(locale, "controls.play")}
        >
          {playing ? <PauseIcon size={16} /> : finished ? <ReplayIcon size={16} /> : <PlayIcon size={16} />}
          <span>
            {playing
              ? t(locale, "controls.pause")
              : finished
                ? t(locale, "controls.replay")
                : t(locale, "controls.play")}
          </span>
        </button>
        <button className="btn btn--ghost" type="button" onClick={onReset}>
          <ReplayIcon size={16} />
          <span>{t(locale, "controls.reset")}</span>
        </button>
      </div>

      <div className="transport__group" aria-label={t(locale, "controls.speed")}>
        <span className="transport__label">{t(locale, "controls.speed")}</span>
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${speed === value ? "is-active" : ""}`}
            aria-pressed={speed === value}
            onClick={() => onSpeedChange(value)}
          >
            {value}×
          </button>
        ))}
      </div>

      <div className="transport__group" aria-label={t(locale, "controls.delay")}>
        <span className="transport__label">{t(locale, "controls.delay")}</span>
        {BROADCAST_DELAYS.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${broadcastDelayMs === value ? "is-active" : ""}`}
            aria-pressed={broadcastDelayMs === value}
            onClick={() => onBroadcastDelayChange(value)}
          >
            {value === 0
              ? t(locale, "controls.delay.off")
              : `${Math.round(value / 1000)}s`}
          </button>
        ))}
      </div>

      <div className="transport__group" aria-label={t(locale, "controls.camera")}>
        <span className="transport__label">{t(locale, "controls.camera")}</span>
        <button
          type="button"
          className={`chip ${cameraMode === "broadcast" ? "is-active" : ""}`}
          aria-pressed={cameraMode === "broadcast"}
          onClick={() => onCameraChange("broadcast")}
        >
          {t(locale, "controls.camera.broadcast")}
        </button>
        <button
          type="button"
          className={`chip ${cameraMode === "tactical" ? "is-active" : ""}`}
          aria-pressed={cameraMode === "tactical"}
          onClick={() => onCameraChange("tactical")}
        >
          {t(locale, "controls.camera.tactical")}
        </button>
      </div>

      <div className="transport__group" aria-label={t(locale, "controls.audience")}>
        <span className="transport__label">{t(locale, "controls.audience")}</span>
        <button
          type="button"
          className={`chip ${audience === "fan" ? "is-active" : ""}`}
          aria-pressed={audience === "fan"}
          onClick={() => onAudienceChange("fan")}
        >
          {t(locale, "controls.audience.fan")}
        </button>
        <button
          type="button"
          className={`chip ${audience === "analyst" ? "is-active" : ""}`}
          aria-pressed={audience === "analyst"}
          onClick={() => onAudienceChange("analyst")}
        >
          {t(locale, "controls.audience.analyst")}
        </button>
      </div>
    </div>
  );
}
