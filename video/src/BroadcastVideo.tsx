import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  Locale,
  SceneData,
  SentenceTiming,
  VideoTimings,
} from "./types";
import {
  COLORS,
  FONT,
  MONO,
  clamp,
  pick,
  reveal,
  sceneOpacity,
} from "./theme";
import { SceneVisual } from "./visuals";

const TRANSITION_FRAMES = 8;

function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

function BackgroundTexture() {
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 18% -8%, #1c1c1e 0%, #0a0a0a 48%, #050505 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.055,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
}

function Scrim({ subtle = false }: { subtle?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, rgba(6,6,6,${subtle ? 0.55 : 0.82}) 0%, rgba(6,6,6,0.12) 24%, rgba(6,6,6,0) 46%, rgba(6,6,6,0.5) 73%, rgba(6,6,6,0.94) 100%)`,
      }}
    />
  );
}

function SigmaGlyph({ size = 42 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `1px solid ${COLORS.lineStrong}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: size * 0.56,
        fontWeight: 700,
        lineHeight: 1,
        color: COLORS.white,
        flexShrink: 0,
      }}
    >
      Σ
    </div>
  );
}

const CHROME_COPY = {
  en: { tagline: "SYNTHETIC FOOTBALL INTELLIGENCE" },
  es: { tagline: "INTELIGENCIA PARA FÚTBOL SINTÉTICO" },
} as const;

function Chrome({
  timings,
  locale,
  leadInFrames,
}: {
  timings: VideoTimings;
  locale: Locale;
  leadInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const progress = clamp(timeMs / timings.durationMs);
  const inProgress = reveal(frame, leadInFrames + TRANSITION_FRAMES, 8);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.16)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: COLORS.white,
          }}
        />
        {timings.scenes.map((scene) => (
          <div
            key={scene.id}
            style={{
              position: "absolute",
              left: `${(scene.startMs / timings.durationMs) * 100}%`,
              top: 0,
              width: 1,
              height: 7,
              background: "rgba(255,255,255,0.55)",
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: 30,
          left: 72,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: inProgress,
        }}
      >
        <SigmaGlyph size={30} />
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              lineHeight: 1.1,
              color: COLORS.white,
            }}
          >
            SIGMA BROADCAST
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: "0.15em",
              color: COLORS.muted2,
            }}
          >
            {CHROME_COPY[locale].tagline}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 34,
          right: 72,
          textAlign: "right",
          opacity: inProgress,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            color: COLORS.white,
          }}
        >
          {timings.id} / {locale.toUpperCase()}
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: "0.13em",
            color: COLORS.muted2,
          }}
        >
          SYNTHETIC DATA · {timings.fps} FPS
        </div>
      </div>
    </AbsoluteFill>
  );
}

const INTRO_COPY = {
  en: {
    tagline: "A synthetic football match, intelligently broadcast.",
    meta: "PRODUCT FILM",
  },
  es: {
    tagline: "Un partido sintético, transmitido con inteligencia.",
    meta: "FILM DE PRODUCTO",
  },
} as const;

function Intro({
  locale,
  durationInFrames,
}: {
  locale: Locale;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const copy = INTRO_COPY[locale];
  const opacity = Math.min(
    reveal(frame, 0, 6),
    interpolate(
      frame,
      [Math.max(0, durationInFrames - 5), durationInFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  const mark = reveal(frame, 0, 7);
  const words = reveal(frame, 3, 8);

  return (
    <AbsoluteFill
      style={{
        opacity,
        zIndex: 40,
        background: COLORS.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: mark,
          transform: `translateY(${(1 - mark) * 14}px)`,
        }}
      >
        <SigmaGlyph size={64} />
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: COLORS.white,
              lineHeight: 1,
            }}
          >
            SIGMA BROADCAST
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: COLORS.muted,
              opacity: words,
            }}
          >
            {copy.meta}
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: FONT,
          fontSize: 17,
          letterSpacing: "0.01em",
          color: COLORS.muted,
          opacity: words,
        }}
      >
        {copy.tagline}
      </div>
    </AbsoluteFill>
  );
}

const KIND_COPY = {
  real: { en: "REAL PRODUCT", es: "PRODUCTO REAL" },
  illustration: { en: "ILLUSTRATIVE", es: "ILUSTRATIVO" },
  closing: { en: "CLOSING", es: "CIERRE" },
} as const;

function BadgePill({ scene, locale }: { scene: SceneData; locale: Locale }) {
  const label = pick(scene.badge, locale);
  const kind =
    KIND_COPY[(scene.badgeKind as keyof typeof KIND_COPY) ?? "real"] ??
    KIND_COPY.real;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          border: `1px solid ${COLORS.lineStrong}`,
          background: "rgba(8,8,8,0.55)",
          padding: "9px 13px",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: COLORS.white,
          maxWidth: 380,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: COLORS.white,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: "0.16em",
          color: COLORS.muted2,
        }}
      >
        {kind[locale]}
      </span>
    </div>
  );
}

function SceneHeader({
  scene,
  locale,
  index,
  total,
}: {
  scene: SceneData;
  locale: Locale;
  index: number;
  total: number;
}) {
  const frame = useCurrentFrame();
  const titleIn = reveal(frame, 2, 14);
  const sourceIn = reveal(frame, 7, 14);

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        top: 106,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 40,
      }}
    >
      <div style={{ minWidth: 0, maxWidth: 1320 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            color: COLORS.muted,
            opacity: sourceIn,
          }}
        >
          <span style={{ color: COLORS.white }}>
            SCENE {String(index + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
          <span style={{ width: 26, height: 1, background: COLORS.lineStrong }} />
          <span>{pick(scene.source, locale).toUpperCase()}</span>
        </div>

        <div
          style={{
            marginTop: 14,
            fontFamily: FONT,
            fontSize: 48,
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: "-0.025em",
            textTransform: "uppercase",
            color: COLORS.white,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 20}px)`,
          }}
        >
          {pick(scene.title, locale)}
        </div>
      </div>
      <div style={{ opacity: sourceIn }}>
        <BadgePill scene={scene} locale={locale} />
      </div>
    </div>
  );
}

function TitleStamp({
  scene,
  locale,
  index,
  total,
}: {
  scene: SceneData;
  locale: Locale;
  index: number;
  total: number;
}) {
  const frame = useCurrentFrame();
  const progress = reveal(frame, 4, 16);
  return (
    <div
      style={{
        position: "absolute",
        left: 118,
        right: 118,
        top: 106,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.16em",
        color: COLORS.muted,
        opacity: progress,
      }}
    >
      <span>
        SCENE {String(index + 1).padStart(2, "0")} /{" "}
        {String(total).padStart(2, "0")} ·{" "}
        {KIND_COPY[(scene.badgeKind as keyof typeof KIND_COPY) ?? "closing"][
          locale
        ]}
      </span>
      <span
        style={{
          maxWidth: 620,
          textAlign: "right",
          lineHeight: 1.4,
        }}
      >
        {pick(scene.source, locale).toUpperCase()}
      </span>
    </div>
  );
}

function activeSentence(
  sentences: SentenceTiming[],
  timeMs: number,
): SentenceTiming | undefined {
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const sentence = sentences[index];
    if (timeMs >= sentence.startMs && timeMs <= sentence.endMs + 320) {
      return sentence;
    }
  }
  return undefined;
}

function CaptionBar({
  scene,
  locale,
  accent,
  index,
  total,
}: {
  scene: SceneData;
  locale: Locale;
  accent: string;
  index: number;
  total: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = scene.startMs + (frame / fps) * 1000;
  const sentence = activeSentence(scene.sentences, timeMs);

  if (!sentence) return null;

  const text = pick(sentence.text, locale);
  if (!text) return null;

  const localStart = ((sentence.startMs - scene.startMs) / 1000) * fps;
  const inProgress = Math.min(1, reveal(frame - localStart, 0, 7));
  const sentenceProgress = clamp(
    (timeMs - sentence.startMs) / Math.max(1, sentence.endMs - sentence.startMs),
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 52,
        background: "rgba(7,7,7,0.9)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderLeft: `3px solid ${accent}`,
        padding: "17px 24px 20px",
        display: "flex",
        gap: 26,
        alignItems: "flex-start",
        opacity: inProgress,
        transform: `translateY(${(1 - inProgress) * 10}px)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 96,
          flexShrink: 0,
          paddingTop: 3,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.15em",
            color: accent,
          }}
        >
          NARRATION
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.12em",
            color: COLORS.muted2,
          }}
        >
          {locale.toUpperCase()} · {String(index + 1).padStart(2, "0")}/
          {String(total).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: FONT,
          fontSize: 31,
          lineHeight: 1.32,
          fontWeight: 400,
          letterSpacing: "-0.008em",
          color: COLORS.white,
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: `${sentenceProgress * 100}%`,
          background: accent,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

function SceneView({
  scene,
  locale,
  durationInFrames,
  index,
  total,
  isLast,
  inFrames,
}: {
  scene: SceneData;
  locale: Locale;
  durationInFrames: number;
  index: number;
  total: number;
  isLast: boolean;
  inFrames: number;
}) {
  const frame = useCurrentFrame();
  const isTitle = scene.visual.type === "title";
  const opacity = sceneOpacity(
    frame,
    durationInFrames,
    inFrames,
    isLast ? 14 : 0,
  );
  const accent =
    scene.visual.type === "personalization" ? COLORS.gold : COLORS.white;

  return (
    <AbsoluteFill style={{ opacity }}>
      <SceneVisual
        scene={scene}
        locale={locale}
        durationInFrames={durationInFrames}
      />
      <Scrim subtle={isTitle} />
      {isTitle ? (
        <TitleStamp
          scene={scene}
          locale={locale}
          index={index}
          total={total}
        />
      ) : (
        <SceneHeader
          scene={scene}
          locale={locale}
          index={index}
          total={total}
        />
      )}
      <CaptionBar
        scene={scene}
        locale={locale}
        accent={accent}
        index={index}
        total={total}
      />
    </AbsoluteFill>
  );
}

export function BroadcastVideo({ timings }: { timings: VideoTimings }) {
  const { fps } = useVideoConfig();
  const total = timings.durationInFrames;
  const leadInFrames = msToFrames(timings.leadInMs ?? 0, fps);
  const lastIndex = timings.scenes.length - 1;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <BackgroundTexture />

      {timings.scenes.map((scene, index) => {
        const from = msToFrames(scene.startMs, fps);
        const end =
          index === lastIndex
            ? total
            : msToFrames(scene.endMs, fps) + TRANSITION_FRAMES;
        const duration = Math.max(1, end - from);
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={duration}
            name={`scene-${scene.id}`}
          >
            <SceneView
              scene={scene}
              locale={timings.spokenLocale}
              durationInFrames={duration}
              index={index}
              total={timings.scenes.length}
              isLast={index === lastIndex}
              inFrames={index === 0 ? 0 : TRANSITION_FRAMES}
            />
          </Sequence>
        );
      })}

      {timings.scenes.flatMap((scene) =>
        scene.sentences.map((sentence, index) => {
          const from = msToFrames(sentence.startMs, fps);
          const duration = Math.max(
            1,
            msToFrames(sentence.endMs, fps) - from,
          );
          return (
            <Sequence
              key={`${scene.id}-audio-${index}`}
              from={from}
              durationInFrames={duration}
              name={`audio-${scene.id}-${index}`}
            >
              <Audio src={staticFile(sentence.file)} />
            </Sequence>
          );
        }),
      )}

      {leadInFrames > 0 ? (
        <Sequence
          from={0}
          durationInFrames={leadInFrames + TRANSITION_FRAMES}
          name="intro"
        >
          <Intro
            locale={timings.spokenLocale}
            durationInFrames={leadInFrames + TRANSITION_FRAMES}
          />
        </Sequence>
      ) : null}

      <Chrome
        timings={timings}
        locale={timings.spokenLocale}
        leadInFrames={leadInFrames}
      />
    </AbsoluteFill>
  );
}

export const sceneStyle: CSSProperties = {
  fontFamily: FONT,
};
