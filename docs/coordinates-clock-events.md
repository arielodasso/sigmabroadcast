# Sigma Broadcast — Coordinates, Clock & Events

*Complements SPEC.md §6 and §7. Written in English because SPEC mandates an English-first product; Spanish notes are marked.*

---

## 1. Coordinate system (3D world)

Documented convention (SPEC §6.2 requires a documented convention):

| Axis | Meaning | Range on pitch |
|---|---|---|
| `x` | Length of the pitch. Home goal at `x = -52.5`, away goal at `x = +52.5` | `[-52.5, 52.5]` |
| `y` | Height above the pitch surface | `>= 0` (0 = grass level) |
| `z` | Width of the pitch. Sidelines at `z = -34` / `z = +34` | `[-34, 34]` |

- Units are **meters**, matching real pitch dimensions (105 m × 68 m).
- Origin `(0, 0, 0)` is the **center spot** of the pitch.
- The home team attacks toward `+x` in period 1. Side switching at halftime is **not** simulated in the MVP (out of scope); both periods keep the same attack directions. *Decisión técnica pendiente de confirmar en Fase 1.*
- `position.y` is used for the ball height only in later phases; players stay at `y = 0` in the MVP.
- The Three.js scene maps these coordinates directly: no axis remapping inside the renderer. Any future remapping must be documented here.

### 1.1 Attack direction used by the advanced metrics

`src/match-truth/advanced-metrics.ts` derives the attacking side from the event log instead of assuming a constant:

- `inferHomeTeamId(events)` returns the `teamId` of the **first `kickoff`** event of the match; with the demo scenario that is the home team.
- `attackDirection(teamId, homeTeamId)` returns `+1` for the home team (attacks towards `+x`) and `-1` for the away team (attacks towards `-x`).
- A pass is **progressive** when it advances the ball by at least `PROGRESSIVE_THRESHOLD_M = 0.5 m` in the attacking direction of the team that played it.

## 2. Clocks

SPEC §7 mandates three separated clocks.

| Clock | Source | Owner | Used for |
|---|---|---|---|
| Match clock | `Match.clockMs` | Simulator | Rules state, display (`mm:ss` derived), event timestamps |
| Simulation clock | `MatchEvent.occurredAtMs` | Simulator | Logical emission time of events, ordering within the simulation run |
| Wall clock | `performance.now()` | Renderer | Interpolation of positions and animation only |

Rules:

- `clockMs` is the **elapsed time inside the current period** (0 → 45 min of simulated play per period; no stoppage time simulated in the MVP).
- `occurredAtMs` is the monotonic simulation time since the match run started, so events keep a global order across periods.
- Events and overlay scheduling depend **only** on simulated time (`clockMs` / `occurredAtMs`). Changing playback speed changes how fast simulated time advances relative to the wall clock, never the event order or results.
- Pausing freezes simulated time; wall-clock animation may decelerate to a stop but must not advance match state.

## 3. Events

### 3.1 Identity and ordering

- `sequence`: strictly increasing integer starting at 1 within a match run (SPEC §6.3).
- `id`: unique within a match run. Recommended deterministic format: `<matchId>-e<sequence>` so that a fixed seed reproduces identical ids.
- Corrections use the same sequence space and id format with a `c` marker: `<matchId>-c<sequence>`.

### 3.2 Status lifecycle

```
valid ──(goal_disallowed / correction)──▶ corrected
valid ──(voided by rules)───────────────▶ void
```

- Events are **never deleted**. A corrected event keeps its record; `Match.score` reflects only `valid` events.
- `goal_disallowed` must carry `relatedEventId` pointing to the original `goal` event (enforced by the Zod schema).

### 3.3 Payload schemas (per type)

SPEC §6.3 requires payload validation per event type via Zod. Phase 0 defines these minimal shapes (extensible in later phases):

| Type | Payload |
|---|---|
| `kickoff` | `{}` (empty) |
| `pass` | `{ successful: boolean }` |
| `ball_recovery` | `{ zone: "defensive" \| "middle" \| "advanced" }` |
| `pressure` | `{ intensity: number (0..1) }` |
| `shot` | `{ onTarget: boolean }` |
| `goal` | `{}` (empty) |
| `goal_disallowed` | `{ reason: string }` |
| `possession_change` | `{}` (empty) |
| `period_end` | `{}` (empty) |

Notes:

- `ball_recovery.zone` is relative to the **recovering team's attacking direction**: `advanced` = opponent half plus the attacking third naming used by MatchTruth detectors (defined in Phase 2).
- Empty payloads are valid and explicit; the schemas use `strictObject`, so unknown payload keys are rejected (contract safety).

### 3.4 Corrections (SPEC §6.6)

A correction (`CorrectionEvent` + a `goal_disallowed` match event) triggers this mandatory sequence:

1. Original goal event → status `corrected`.
2. Recalculate official score from `valid` events only.
3. Re-evaluate / invalidate dependent insights (MatchTruth).
4. Withdraw or update dependent overlays (BroadcastSync).
5. Correct any generated summaries.
6. Record the outcome in the control panel audit log.

### 3.5 Localisation (i18n)

*The interface is English by default and fully available in Spanish.*

- Every visible string lives in `src/i18n/catalog/en.ts` and `src/i18n/catalog/es.ts`. Both catalogs are mirrored one to one; a key missing in Spanish falls back to English, and a key missing everywhere renders as the key itself.
- `t(locale, key, vars)` interpolates `{placeholder}` tokens. Unresolved placeholders are kept visible instead of being blanked.
- The active locale is detected from the browser (`detectLocale()`), can be changed at runtime (`BroadcastController.setLocale`) and is exposed in the snapshot as `locale`.
- Insight texts are **not** duplicated per language at detection time. Detectors emit English text plus a stable insight id; `localizeInsight(locale, insight, events)` re-renders the same insight in any language by resolving the variables from the original evidence events.

## 4. Priority scale

- `priority` (insights and overlays): deterministic integer scale **0–100**.
  - 90–100: goals and corrections.
  - 70–89: shots, disallowed goals, milestones.
  - 40–69: tactical patterns with strong evidence (recoveries, pass sequences).
  - 0–39: informational / low-urgency insights.
- Exact thresholds per detector are defined in Phase 2; the scale itself is fixed here.

## 5. Advanced metrics

All values are derived from the synthetic event log only (positions, timestamps, payloads). No external data source is used and every number is reproducible from the fixed seed.

### 5.1 Pass metrics (`computePassMetrics`)

| Metric | Definition |
|---|---|
| `distanceM` | Planar (`x`,`z`) distance between `position` and `targetPosition`, in meters |
| `progressive` | The pass advances the ball by ≥ 0.5 m towards the attacking goal of the passing team |
| `underPressure` | An opponent `pressure` event occurred within the 15 s preceding the pass |
| `difficulty` | Deterministic 0..1 score: `0.45 × distanceFactor + 0.2 × progressive + 0.2 × underPressure + 0.15 × successful`, where `distanceFactor = min(distanceM / 45, 1)` |

### 5.2 Shot metrics (`computeShotMetrics`)

| Metric | Definition |
|---|---|
| `distanceM` | Planar distance between the strike point and the ball's final position |
| `distanceToGoalM` | Distance from the strike point to the goal being attacked (`x = ±52.5`, `z = 0`) |
| `estimatedSpeedMs` | `distanceM / flightWindow`, clamped to 6–34 m/s |
| `estimatedSpeedKmh` | `estimatedSpeedMs × 3.6` |
| `difficulty` | Deterministic 0..1 score combining proximity to goal, speed and being on target |

**The strike speed is an estimate, not a measurement.** The synthetic log has no ball telemetry, so the flight window is derived from the gap between the shot event and the next event in the sequence, clamped to `200–6000 ms`. Coarse demo timings therefore produce conservative speeds; the value is presented in the interface as an estimate.

### 5.3 Aggregated team statistics

`computeStats(events)` exposes, per team, the classic counters plus `totalPassDistanceM`, `averagePassDistanceM`, `averagePassDifficulty`, `progressivePasses`, `shotSpeedSamples` and `averageShotSpeedKmh`. These feed both the control panel and the narrative recap.

## 6. Phase 0 scope notes

- Contracts are defined in `src/contracts/` with Zod schemas as the runtime source of truth; TypeScript types are inferred from the schemas.
- All schemas use `strictObject`: unknown top-level fields are contract violations, not silent extras.
- The simulator, renderer, MatchTruth and BroadcastSync modules are implemented; new modules appear when their phase begins (SPEC §13).
