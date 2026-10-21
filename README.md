# Sigma Broadcast

*A synthetic football match, intelligently broadcast.*

Sigma Broadcast turns synthetic football match events into a 3D broadcast experience with contextual, evidence-backed on-screen graphics. Built for the **Microsoft + Premier League — Inside the Game: Developer Hackathon**.

## Status

**Phase 5 — Preparación del hackathon**

Implemented:

- Repository and tooling (Vite + React + TypeScript strict + Vitest + Zod).
- Shared data contracts (`src/contracts/`): Match, Team, Player, MatchEvent, CorrectionEvent, MatchInsight, BroadcastOverlay, NarrativeRecap — all runtime-validated with Zod.
- Match Simulator: deterministic synthetic scenario with clock, pause, speed, reset and a goal-disallowed correction.
- 3D Renderer (Three.js): pitch, players, ball, broadcast and tactical cameras.
- MatchTruth: rule-based detectors, evidence-backed insights, validation/invalidation, derived statistics and advanced metrics (pass distance & difficulty, estimated shot speed).
- BroadcastSync: priority, scheduling, conflict resolution, expiry, correction withdrawal and an auditable decision log.
- Broadcast UI: editorial monochrome interface (Nike reference), scorebug, overlays, transport controls, intelligence strip, control panel and four-column footer.
- Narrative Recap generated automatically at full time, localised in English and Spanish.
- Lightweight i18n layer (`src/i18n/`) with English default, Spanish catalog, browser-language detection and runtime switching.
- Documentation of coordinates, clocks and events: `docs/coordinates-clock-events.md`.
- **Configurable broadcast delay** with expiry-aware scheduling and discard of stale information.
- **Machine-readable JSON export** with timecodes for every event, insight, overlay and decision.
- **Transparent output route** (`/output`) for OBS composition — bare graphics without editorial chrome, per-pestaña sync via BroadcastChannel.
- **Scenario variants by seed** — deterministic replays across 4 variants (demo, double-correction, no-correction, custom) with reproducible seeds.
- **Invariants test suite** — structural invariants verified across all scenario variants and seed matrices (149 tests total).
- Cross-tab synchronization between control room and output page.

## Requirements

- Node.js >= 20 (developed and verified on Node 22.19).
- npm >= 10.

No paid APIs, API keys or external services are required. Everything runs locally.

## Install and run

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript typecheck (no emit) |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project layout

```
SPEC.md                          # Single source of truth for the product
docs/
  coordinates-clock-events.md    # 3D coordinate convention, clocks, event rules, metrics
src/
  contracts/                     # Shared Zod schemas + inferred TypeScript types
  i18n/                          # Locale detection, translation engine, en/es catalogs
  simulation/                    # Deterministic engine, scenarios, roster
  match-truth/                   # Detectors, insight engine, stats, advanced metrics, narrative recap
  broadcast-sync/                # Director (priority, scheduling, conflicts) + corrections
  renderer3d/                    # Three.js scene, pitch, players, ball, cameras
  broadcast-ui/                  # TopNav, EditorialHero, Scorebug, overlays, strip, recap, panel, footer
  state/                         # BroadcastController (snapshot, locale, recap, reset)
  app/                           # App shell + design tokens
  main.tsx
tests/
  contracts/                     # Contract validation tests
  simulation/                    # Engine determinism and clock tests
  match-truth/                   # Insights, metrics and narrative recap tests
  broadcast-sync/                # Scheduling and conflict tests
  i18n/                          # Translation engine and catalog parity tests
  ui/                            # Application shell smoke tests
  integration/                   # End-to-end demo scenario and invariants
  export/                        # JSON export schema and serialization
  state/                         # Broadcast sync channel tests
```

## Principles (summary of SPEC.md §3)

Synthetic-only · Deterministic (fixed seed) · Single source of truth · Evidence-based insights · Deterministic authority · AI optional · Local-first · Graceful degradation · Traceability · No fabricated capabilities.

## License

MIT. Dependency licenses: React (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Zod (MIT).

## CI / GitHub Actions

This project uses GitHub Actions for continuous integration. The workflow runs on every push to `main`:

- **Typecheck** — `tsc --noEmit`
- **Build** — `vite build`
- **Tests** — `vitest run` (149 tests across 17 files)

The workflow does not deploy to any external service; it verifies that the local build is sound and all tests pass, in keeping with the project's local-first principles.

## Broadcast delay

The system supports a configurable broadcast delay (in milliseconds) that holds every graphic for the configured duration after the insight that justifies it was created. While a graphic waits, a correction can still invalidate it, and information that expires before it would reach air is discarded instead of being shown late.

- Default delay: 0 ms (no delay)
- Maximum supported delay: 60_000 ms (1 minute)
- Delay is clamped to `[0, 60000]` and rounded to the nearest integer
- Delay is persisted across `reset()` calls
- Expired or invalidated insights are discarded before reaching air

## JSON export

The system can serialize a complete broadcast snapshot to machine-readable JSON with timecodes, suitable for consumption by OBS or other broadcast tools.

- `buildBroadcastExport(snapshot)` — returns a validated `BroadcastExport` object
- `serializeBroadcastExport(snapshot)` — returns pretty-printed JSON string
- Export includes: schema version, generator, timestamp, match data, events, corrections, insights, overlays, decisions, stats, and narrative recap
- All timed artifacts carry both absolute and match clocks plus broadcast timecodes (e.g. `1H 08:42`)

## Transparent output (`/output`)

The `/output` route renders bare broadcast graphics on a transparent canvas, without editorial chrome, for use as an OBS (or any broadcast compositor) browser source.

- Renders only `Scorebug` and `OverlayLayer` — no header, no footer, no control panel
- `data-output="transparent"` HTML attribute on the root `div`
- Query parameters `?audience=fan|analyst` and `?locale=en|es` select audience mode and language
- Cross-tab sync via `BroadcastChannel` channel `"sigma-broadcast"` — the output tab shows the same match the operator is directing
- The main route (`/`) retains the full editorial interface

## Scenario variants by seed

The simulator supports 4 deterministic scenarios, each reproducible with a fixed seed:

| Variant | Seed | Description |
|---|---|---|
| `demo` | 19950320 | Default demonstration: goals, correction, invariant test |
| `double-correction` | 19950321 | Two corrections applied, tests invariant handling |
| `no-correction` | 19950322 | No corrections, all goals count |
| `custom` | configurable | Custom seed for arbitrary sequences |

All variants pass the invariants test suite, which verifies:
- No active overlay depends on an invalidated insight
- Overlays ended as `withdrawn` or `expired` are properly tracked
- Final score equals goals that were never disallowed
- Valid JSON export for every variant
- Exactly one goal disallowed in `demo` and `double-correction`, zero in `no-correction`
- Deterministic results for the same variant and seed

## Cross-tab synchronization

The output page can be opened in a separate browser tab to serve as an OBS source. `BroadcastChannel` synchronizes the snapshot between the control room tab and the output tab. If `BroadcastChannel` is not available (e.g., cross-origin), synchronization degrades gracefully to a no-op, and the output page runs its own local simulation.