import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Locale, SceneData } from "./types";
import { COLORS, FONT, MONO, pick, reveal, rise } from "./theme";

interface VisualProps {
  scene: SceneData;
  locale: Locale;
  durationInFrames: number;
}

const labelStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: COLORS.muted,
};

const sectionLabelStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COLORS.muted,
};

function ScreenCard({
  src,
  label,
  index,
  progress,
  objectFit = "contain",
  style,
  accent = COLORS.white,
}: {
  src: string;
  label: string;
  index: string;
  progress: number;
  objectFit?: "contain" | "cover";
  style?: CSSProperties;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 28}px)`,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...labelStyle, color: COLORS.white }}>{index}</span>
          <span
            style={{
              width: 28,
              height: 1,
              background: COLORS.lineStrong,
              display: "inline-block",
            }}
          />
          <span style={sectionLabelStyle}>{label}</span>
        </div>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 7,
            background: accent,
            display: "inline-block",
          }}
        />
      </div>
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          border: `1px solid ${COLORS.line}`,
          borderTop: `2px solid ${accent}`,
          background: "#0b0b0c",
          padding: 10,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

export function ImageVisual({ scene, durationInFrames }: VisualProps) {
  const frame = useCurrentFrame();
  const visual = scene.visual;
  const src = visual.src ?? "";
  const zoom = interpolate(frame, [0, durationInFrames], [1.018, 1.085], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (visual.panel) {
    const progress = reveal(frame, 0, 20);
    return (
      <AbsoluteFill style={{ padding: "244px 110px 238px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            opacity: progress,
            transform: `translateY(${(1 - progress) * 26}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={sectionLabelStyle}>PRODUCT SURFACE / CAPTURE</span>
            <span style={{ ...labelStyle, color: COLORS.white }}>
              {scene.id.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              border: `1px solid ${COLORS.line}`,
              borderTop: `2px solid ${COLORS.white}`,
              background: "#0b0b0c",
              padding: 12,
              position: "relative",
            }}
          >
            <Img
              src={staticFile(src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                transform: `scale(${1 + (zoom - 1) * 0.35})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: visual.fit ?? "cover",
          display: "block",
          transform: `scale(${zoom}) translateY(${drift}px)`,
          filter: "saturate(0.92) contrast(1.02)",
        }}
      />
    </AbsoluteFill>
  );
}

export function VideoVisual({ scene }: VisualProps) {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 360], [1.012, 1.052], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Video
        src={staticFile(scene.visual.src ?? "")}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: `scale(${zoom})`,
        }}
      />
    </AbsoluteFill>
  );
}

const DUO_COPY = {
  en: { surface: "PRODUCT SURFACE" },
  es: { surface: "SUPERFICIE DE PRODUCTO" },
} as const;

export function DuoVisual({ scene, locale }: VisualProps) {
  const frame = useCurrentFrame();
  const visual = scene.visual;
  const left = reveal(frame, 0, 20);
  const right = reveal(frame, 7, 20);
  const copy = DUO_COPY[locale];

  return (
    <AbsoluteFill
      style={{
        padding: "250px 110px 250px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.88fr) minmax(0, 1.12fr)",
        gap: 34,
        alignItems: "stretch",
      }}
    >
      <ScreenCard
        src={visual.left ?? ""}
        index="01"
        label={pick(visual.leftLabel, locale) || copy.surface}
        progress={left}
        objectFit="contain"
      />
      <ScreenCard
        src={visual.right ?? ""}
        index="02"
        label={pick(visual.rightLabel, locale) || copy.surface}
        progress={right}
        objectFit="contain"
      />
    </AbsoluteFill>
  );
}

const BROADCAST_COPY = {
  en: {
    director: "DIRECTOR",
    steps: ["PRIORITIZE", "SCHEDULE", "EXPIRE", "RESOLVE"],
    delay: "BROADCAST DELAY",
    stale: "DISCARDS STALE",
    air: "NOTHING STALE REACHES AIR",
  },
  es: {
    director: "DIRECTOR",
    steps: ["PRIORIZA", "PROGRAMA", "EXPIRA", "RESUELVE"],
    delay: "RETARDO DE TRANSMISIÓN",
    stale: "DESCARTA LO VENCIDO",
    air: "NADA VENCIDO LLEGA AL AIRE",
  },
} as const;

export function BroadcastVisual({ scene, locale }: VisualProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visual = scene.visual;
  const copy = BROADCAST_COPY[locale];
  const stageZoom = interpolate(frame, [0, 420], [1.02, 1.085], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const active = Math.min(
    3,
    Math.max(0, Math.floor((frame - 14) / Math.max(1, fps * 1.45))),
  );
  const panelIn = reveal(frame, 0, 18);
  const controlsIn = reveal(frame, 8, 18);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(visual.stage ?? "")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: `scale(${stageZoom})`,
          filter: "saturate(0.9) contrast(1.03)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 286,
          width: 380,
          border: `1px solid ${COLORS.line}`,
          background: "rgba(8,8,8,0.78)",
          padding: "20px 22px",
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 22}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <span style={sectionLabelStyle}>{copy.director}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.14em",
              color: COLORS.white,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: COLORS.white,
              }}
            />
            AIR
          </span>
        </div>
        {copy.steps.map((step, index) => {
          const on = index <= active;
          const current = index === active;
          return (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                height: 46,
                borderTop:
                  index === 0 ? "none" : "1px solid rgba(255,255,255,0.1)",
                opacity: on ? 1 : 0.28,
                transition: "opacity 160ms linear",
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: current ? COLORS.white : COLORS.muted2,
                  width: 20,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  width: current ? 24 : 10,
                  height: 1,
                  background: current ? COLORS.white : COLORS.line,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: current ? 600 : 400,
                  letterSpacing: "0.08em",
                  color: current ? COLORS.white : COLORS.muted,
                }}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          right: 110,
          top: 286,
          width: 420,
          textAlign: "right",
          opacity: panelIn,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            border: `1px solid ${COLORS.lineStrong}`,
            padding: "8px 12px",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: COLORS.white,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 7,
              background: COLORS.white,
            }}
          />
          {copy.stale}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 13,
            letterSpacing: "0.03em",
            color: COLORS.muted,
          }}
        >
          {copy.air}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          bottom: 246,
          opacity: controlsIn,
          transform: `translateY(${(1 - controlsIn) * 26}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={sectionLabelStyle}>{copy.delay}</span>
          <span style={{ ...labelStyle, color: COLORS.white }}>
            BROADCASTSYNC / 04s
          </span>
        </div>
        <div
          style={{
            height: 118,
            border: `1px solid ${COLORS.lineStrong}`,
            background: "#0b0b0c",
            padding: 8,
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile(visual.controls ?? "")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

const PERSONALIZATION_COPY = {
  en: {
    following: "FOLLOWING",
    club: "NORTHBRIDGE FC",
    player: "D. REYES · #10",
    board: "RELEVANCE + GOLD BORDER",
    tags: ["LOCAL PREFERENCE", "EXPLICIT", "SYNTHETIC"],
  },
  es: {
    following: "SIGUIENDO",
    club: "NORTHBRIDGE FC",
    player: "D. REYES · #10",
    board: "RELEVANCIA + BORDE DORADO",
    tags: ["PREFERENCIA LOCAL", "EXPLÍCITA", "SINTÉTICA"],
  },
} as const;

export function PersonalizationVisual({ scene, locale }: VisualProps) {
  const frame = useCurrentFrame();
  const visual = scene.visual;
  const copy = PERSONALIZATION_COPY[locale];
  const inProgress = reveal(frame, 0, 20);
  const sideProgress = reveal(frame, 8, 22);
  const pulse = 0.16 + Math.sin(frame / 16) * 0.06;

  return (
    <AbsoluteFill
      style={{
        padding: "250px 110px 250px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.28fr) minmax(0, 0.72fr)",
        gap: 46,
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: inProgress,
          transform: `translateY(${(1 - inProgress) * 26}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            color: COLORS.gold,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 8,
              background: COLORS.gold,
              display: "inline-block",
            }}
          />
          {copy.following} · {copy.club}
          <span style={{ color: COLORS.muted2 }}>/</span>
          <span style={{ color: COLORS.muted }}>{copy.player}</span>
        </div>

        <div
          style={{
            marginTop: 22,
            border: `1px solid ${COLORS.gold}`,
            boxShadow: `0 0 0 1px rgba(245,197,24,0.45), 0 0 64px rgba(245,197,24,${pulse})`,
            background: "#0b0b0c",
            padding: 14,
          }}
        >
          <Img
            src={staticFile(visual.overlay ?? "")}
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 24,
          }}
        >
          {copy.tags.map((tag) => (
            <span
              key={tag}
              style={{
                border: `1px solid rgba(245,197,24,0.34)`,
                color: COLORS.gold,
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.14em",
                padding: "7px 10px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          opacity: sideProgress,
          transform: `translateY(${(1 - sideProgress) * 24}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={sectionLabelStyle}>{copy.board}</span>
          <span style={{ ...labelStyle, color: COLORS.gold }}>AI</span>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            border: `1px solid ${COLORS.line}`,
            borderTop: `2px solid ${COLORS.gold}`,
            background: "#0b0b0c",
            padding: 10,
          }}
        >
          <Img
            src={staticFile(
              typeof visual.panel === "string" ? visual.panel : "",
            )}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

const DIAGRAM_COPY = {
  en: {
    separator: "SEPARATION OF CONCERNS",
    modules: [
      {
        title: "MATCHTRUTH",
        kicker: "FACTS",
        body: "Evidence-bound match state",
        tags: ["EVENT IDs", "DETERMINISTIC", "CORRECTIONS"],
      },
      {
        title: "BROADCASTSYNC",
        kicker: "DIRECTION",
        body: "Prioritizes, schedules, expires",
        tags: ["PRIORITY", "EXPIRY", "CONFLICTS"],
      },
      {
        title: "BROADCASTAGENT",
        kicker: "ATTENTION",
        body: "Bounded on-device models",
        tags: ["AIR", "BOOST", "HOLD", "SUPPRESS"],
      },
    ],
    core: "DETERMINISTIC CORE",
    coreTags: ["LOCAL-FIRST", "NO KEYS", "NO PAID SERVICES"],
    optional: "OPTIONAL INTEGRATIONS",
    optionalNote: "NOT REQUIRED FOR THE DEMO",
    integrations: ["AZURE OPENAI", "GITHUB MODELS", "AZURE FUNCTIONS", "APP INSIGHTS"],
  },
  es: {
    separator: "SEPARACIÓN DE RESPONSABILIDADES",
    modules: [
      {
        title: "MATCHTRUTH",
        kicker: "HECHOS",
        body: "Estado del partido atado a evidencia",
        tags: ["IDs DE EVENTO", "DETERMINISTA", "CORRECCIONES"],
      },
      {
        title: "BROADCASTSYNC",
        kicker: "DIRECCIÓN",
        body: "Prioriza, programa, expira",
        tags: ["PRIORIDAD", "VENCIMIENTO", "CONFLICTOS"],
      },
      {
        title: "BROADCASTAGENT",
        kicker: "ATENCIÓN",
        body: "Modelos locales acotados",
        tags: ["SALIR", "REFORZAR", "ESPERAR", "DESCARTAR"],
      },
    ],
    core: "NÚCLEO DETERMINISTA",
    coreTags: ["LOCAL-FIRST", "SIN CLAVES", "SIN SERVICIOS PAGOS"],
    optional: "INTEGRACIONES OPCIONALES",
    optionalNote: "NO SON REQUISITOS DE LA DEMO",
    integrations: ["AZURE OPENAI", "GITHUB MODELS", "AZURE FUNCTIONS", "APP INSIGHTS"],
  },
} as const;

interface DiagramModuleData {
  title: string;
  kicker: string;
  body: string;
  tags: readonly string[];
}

function DiagramModule({
  module,
  index,
  progress,
  active,
}: {
  module: DiagramModuleData;
  index: number;
  progress: number;
  active: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${active ? COLORS.lineStrong : COLORS.line}`,
        background: active ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.018)",
        padding: "22px 22px 20px",
        minHeight: 268,
        display: "flex",
        flexDirection: "column",
        opacity: progress,
        transform: `translateY(${(1 - progress) * 26}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 26,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            color: active ? COLORS.white : COLORS.muted2,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.18em",
            color: active ? COLORS.white : COLORS.muted,
          }}
        >
          {module.kicker}
        </span>
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1,
          color: COLORS.white,
        }}
      >
        {module.title}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 14,
          lineHeight: 1.45,
          color: COLORS.muted,
          minHeight: 40,
        }}
      >
        {module.body}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto" }}>
        {module.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: "0.1em",
              color: COLORS.muted,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "5px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiagramConnector({ frame, label }: { frame: number; label: string }) {
  const pulse = (frame % 54) / 54;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: 84,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 1,
          background: "rgba(255,255,255,0.26)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -3,
            left: `${pulse * 100}%`,
            width: 7,
            height: 7,
            borderRadius: 7,
            background: COLORS.white,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: "0.12em",
          color: COLORS.muted2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function DiagramVisual({ scene, locale }: VisualProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = DIAGRAM_COPY[locale];
  const starts = scene.sentences.map((sentence) => sentence.startMs);
  const absoluteMs = scene.startMs + (frame / fps) * 1000;
  const modulesIn = reveal(frame, 2, 22);
  const coreIn = reveal(frame, 10, 20);
  const optionalIn = reveal(
    frame,
    Math.max(0, ((starts[3] ?? scene.endMs) - scene.startMs) / 1000) * fps,
    18,
  );
  const focus = absoluteMs >= (starts[2] ?? Infinity) ? 2 : 1;

  return (
    <AbsoluteFill
      style={{
        padding: "252px 110px 252px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <span style={sectionLabelStyle}>{copy.separator}</span>
        <span style={{ ...labelStyle, color: COLORS.white }}>
          MATCHTRUTH / BROADCASTSYNC / AGENT
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 84px minmax(0,1fr) 84px minmax(0,1fr)",
          alignItems: "stretch",
        }}
      >
        <DiagramModule
          module={copy.modules[0]}
          index={0}
          progress={modulesIn}
          active={focus >= 1}
        />
        <DiagramConnector frame={frame} label="VALIDATED" />
        <DiagramModule
          module={copy.modules[1]}
          index={1}
          progress={reveal(frame, 7, 22)}
          active={focus >= 1}
        />
        <DiagramConnector frame={frame + 18} label="CONTEXT" />
        <DiagramModule
          module={copy.modules[2]}
          index={2}
          progress={reveal(frame, 12, 22)}
          active={focus >= 2}
        />
      </div>

      <div
        style={{
          marginTop: 30,
          border: `1px solid ${COLORS.line}`,
          borderLeft: `2px solid ${COLORS.white}`,
          padding: "15px 18px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: coreIn,
          transform: `translateY(${(1 - coreIn) * 18}px)`,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            color: COLORS.white,
            whiteSpace: "nowrap",
          }}
        >
          {copy.core}
        </span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: COLORS.line,
            display: "block",
          }}
        />
        {copy.coreTags.map((tag, index) => (
          <span
            key={tag}
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: focus >= 2 || index === 0 ? COLORS.white : COLORS.muted,
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: optionalIn,
          transform: `translateY(${(1 - optionalIn) * 14}px)`,
          border: "1px dashed rgba(255,255,255,0.2)",
          padding: "12px 16px",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.14em",
            color: COLORS.muted,
            whiteSpace: "nowrap",
          }}
        >
          {copy.optional}
        </span>
        <span style={{ color: COLORS.muted2, fontSize: 11 }}>·</span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: "0.1em",
            color: COLORS.muted2,
            whiteSpace: "nowrap",
          }}
        >
          {copy.optionalNote}
        </span>
        <span style={{ flex: 1 }} />
        {copy.integrations.map((integration) => (
          <span
            key={integration}
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: "0.1em",
              color: COLORS.muted,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "5px 7px",
              whiteSpace: "nowrap",
            }}
          >
            {integration}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

const TITLE_COPY = {
  en: {
    tagline: "A synthetic football match, intelligently broadcast.",
    tags: ["DETERMINISTIC", "EXPLAINABLE", "PERSONALIZABLE"],
  },
  es: {
    tagline: "Un partido sintético, transmitido con inteligencia.",
    tags: ["DETERMINISTA", "EXPLICABLE", "PERSONALIZABLE"],
  },
} as const;

export function TitleVisual({ scene, locale }: VisualProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = TITLE_COPY[locale];
  const lineOne = reveal(frame, 0, 18);
  const lineTwo = reveal(frame, 5, 20);
  const lineGrow = reveal(frame, 14, 24);
  const starts = scene.sentences.map((sentence) => sentence.startMs);
  const taglineDelay = Math.max(
    20,
    (((starts[1] ?? scene.startMs) - scene.startMs) / 1000) * fps,
  );
  const taglineIn = reveal(frame, taglineDelay, 20);
  const tagsIn = reveal(frame, taglineDelay + 10, 20);
  const sourceIn = reveal(frame, taglineDelay + 22, 18);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          right: 90,
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: FONT,
          fontSize: 760,
          lineHeight: 0.8,
          fontWeight: 700,
          color: "rgba(255,255,255,0.028)",
          userSelect: "none",
        }}
      >
        Σ
      </div>

      <AbsoluteFill
        style={{
          padding: "236px 118px 250px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 202,
              lineHeight: 0.82,
              fontWeight: 500,
              letterSpacing: "-0.045em",
              color: COLORS.white,
              ...rise(lineOne, 46),
            }}
          >
            SIGMA
          </div>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 202,
              lineHeight: 0.82,
              fontWeight: 500,
              letterSpacing: "-0.045em",
              color: COLORS.white,
              ...rise(lineTwo, 46),
            }}
          >
            BROADCAST
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            width: `${lineGrow * 100}%`,
            maxWidth: 1180,
            height: 1,
            background: "rgba(255,255,255,0.34)",
          }}
        />

        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            lineHeight: 1.25,
            color: COLORS.muted,
            maxWidth: 980,
            opacity: taglineIn,
            transform: `translateY(${(1 - taglineIn) * 18}px)`,
          }}
        >
          {copy.tagline}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 30,
            opacity: tagsIn,
            transform: `translateY(${(1 - tagsIn) * 16}px)`,
          }}
        >
          {copy.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: COLORS.white,
                border: `1px solid ${COLORS.lineStrong}`,
                padding: "9px 12px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: COLORS.muted2,
            opacity: sourceIn,
          }}
        >
          {pick(scene.source, locale).toUpperCase()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function SceneVisual(props: VisualProps): ReactNode {
  const type = props.scene.visual.type;
  switch (type) {
    case "video":
      return <VideoVisual {...props} />;
    case "duo":
      return <DuoVisual {...props} />;
    case "broadcast":
      return <BroadcastVisual {...props} />;
    case "personalization":
      return <PersonalizationVisual {...props} />;
    case "diagram":
      return <DiagramVisual {...props} />;
    case "title":
      return <TitleVisual {...props} />;
    case "image":
    default:
      return <ImageVisual {...props} />;
  }
}
