# Sigma Broadcast

*A synthetic football match, intelligently broadcast.*

Sigma Broadcast turns synthetic football match events into a 3D broadcast experience with contextual, evidence-backed on-screen graphics. Built for the **Microsoft + Premier League — Inside the Game: Developer Hackathon**.

## Status

**Phase 4 — Integrated experience, plus the §17 extensions**

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
- Automated tests: 12 files, 115 tests (contracts, simulation, MatchTruth, BroadcastSync, i18n, metrics, narrative recap and end-to-end integration).

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
  integration/                   # End-to-end demo scenario
```

## Principles (summary of SPEC.md §3)

Synthetic-only · Deterministic (fixed seed) · Single source of truth · Evidence-based insights · Deterministic authority · AI optional · Local-first · Graceful degradation · Traceability · No fabricated capabilities.

## License

MIT. Dependency licenses: React (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Zod (MIT).
