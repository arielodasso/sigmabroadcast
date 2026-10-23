# Sigma Broadcast

**A synthetic football match, intelligently broadcast.**

Sigma Broadcast turns deterministic match events into a 3D broadcast with evidence-backed graphics, a bounded AI directing agent, club/player personalization and an auditable JSON trail. Built for the **Microsoft + Premier League — Inside the Game: Developer Hackathon**.

The demo runs locally with no keys, no network and no paid services. Azure OpenAI, GitHub Models, Azure Functions and Application Insights are optional integrations.

## Why

Live graphics are fast but not always right, and they rarely explain themselves. Sigma Broadcast separates three concerns:

1. **Truth** — rule detectors produce insights backed by exact event IDs.
2. **Direction** — a deterministic director schedules graphics, resolves conflicts and withdraws anything invalidated by a correction.
3. **AI** — an on-device model ranks insights and a bounded agent recommends `air`, `boost`, `hold` or `suppress`. AI never creates facts.

Every AI decision keeps its evidence, top feature, confidence, model and reasoning.

## Features

- Deterministic synthetic match: goals, pressure, recoveries, shots and a goal disallowed by VAR-style correction.
- Three.js pitch, players, ball and broadcast/tactical cameras.
- Evidence-backed insights with validity windows and correction withdrawal.
- Configurable broadcast delay with expiry-aware scheduling.
- **On-device AI** — two trained MLPs score priority and audience for every insight.
- **Agentic direction** — advisory and autonomous modes, auditable decision log and action history.
- **Personalization** — follow a club or player from the panel or via `/output?team=&player=`.
- **Optional LLM narration** — grounded explanations and match recap via Azure OpenAI, GitHub Models or an Azure Functions proxy, with strict evidence validation and deterministic fallback.
- **Microsoft/Azure** — Application Insights telemetry, Azure Functions API, Static Web Apps deployment, GitHub Models alternative.
- Machine-readable JSON export with timecodes, AI decisions and narratives.
- Transparent `/output` route for OBS, synchronized across tabs.
- English and Spanish broadcast, fan and analyst modes.
- Automated 1080p demo recording.

## Quick start

Requirements: Node.js >= 20, npm >= 10.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Click **Play match**. The full AI pipeline runs on-device.

Optional LLM configuration:

```bash
cp .env.example .env.local
```

Use the Azure Functions proxy for any public deployment. Direct browser keys are exposed in the bundle.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript typecheck |
| `npm test` | Run the full Vitest suite |
| `npm run test:watch` | Watch mode |
| `npm run models:train` | Retrain the on-device models and rewrite `src/ai/model/weights.ts` |
| `npm run demo:record` | Record `demo/sigma-broadcast-demo.mp4` with Playwright + ffmpeg |

For `demo:record`, install the browser once and make sure `ffmpeg` is on `PATH`:

```bash
npx playwright install chromium
ffmpeg -version
```

The recorder uses dynamic speed: fast-forward through quiet spells and slow down whenever an overlay is on screen. The current capture is a 1080p MP4 of about 70 seconds. Set `DEMO_HEADED=1` to watch the browser while recording.

## AI layer

```text
events -> evidence insights -> 25 features -> MLP priority + audience
       -> agent action -> optional grounded LLM -> overlays + audit export
```

- **Model**: 25 → 14 tanh → 1 sigmoid, trained offline by `scripts/train-models.mjs`, exported as TypeScript weights.
- **Metrics** on the synthetic holdout: priority accuracy `0.784`, audience accuracy `0.998667`.
- **Explanation**: ablation over normalized features; the top five contributions and `topFeature` are stored on the insight.
- **Modes**: `advisory` keeps the deterministic director in control; `autonomous` applies a `60%` rule / `40%` model priority blend and can suppress weak or invalidated insights.
- **Grounding**: LLM output must be JSON, cite only allowed evidence IDs and contain only numbers present in the evidence. Invented facts are rejected and the deterministic fallback is used.

See [`docs/AI-ARCHITECTURE.md`](docs/AI-ARCHITECTURE.md).

## Microsoft and Azure

| Technology | Role |
|---|---|
| Azure Static Web Apps | Hosting and managed API |
| Azure Functions (Node.js v4) | `POST /api/ai` proxy and `GET /api/health` |
| Azure OpenAI | Optional grounded narration |
| GitHub Models | Optional alternative LLM provider |
| Application Insights | Product telemetry (no prompts or personal data) |
| GitHub Actions | CI, SWA deployment and public GitHub Pages demo |
| GitHub | Public repository and delivery |

See [`docs/AZURE-DEPLOYMENT.md`](docs/AZURE-DEPLOYMENT.md).

## Architecture

```text
src/
  contracts/          Zod schemas and shared types
  simulation/         Deterministic engine, roster, scenario variants
  match-truth/        Detectors, evidence, stats, advanced metrics, recap
  broadcast-sync/     Director, scheduling, conflicts, corrections
  ai/                 Features, models, agent, narrator, providers
  renderer3d/         Three.js scene and cameras
  broadcast-ui/       Scorebug, overlays, control panel, audit strip, recap
  state/              BroadcastController and cross-tab sync
  export/             Machine-readable broadcast export
  i18n/               English/Spanish catalogs and translation engine
  app/                Application shell and design tokens
  telemetry.ts        Optional Application Insights wrapper
api/                  Azure Functions proxy and health endpoint
tests/                Contracts, simulation, truth, sync, AI, UI, export, invariants
docs/                 AI, demo, data, deployment and evaluation documentation
```

## Demo

- `/` — editorial control room.
- `/output` — transparent OBS source. Query parameters: `audience=fan|analyst`, `locale=en|es`, `team=<id>`, `player=<id>`.
- `npm run demo:record` — records a dynamic-speed 1080p demo (about 70 seconds) and writes `demo/sigma-broadcast-demo.mp4`.
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — shot list and voiceover.

Deployment workflows are included. Add `AZURE_STATIC_WEB_APPS_API_TOKEN` for Azure Static Web Apps, or enable GitHub Pages to publish the static demo. Without LLM credentials the public demo runs fully on-device.

## Data

All clubs, players, events, statistics and training labels are synthetic. No real match feed, Premier League asset, player data or personal data is used. See [`docs/SYNTHETIC-DATA.md`](docs/SYNTHETIC-DATA.md).

## Testing

```bash
npm run typecheck
npm test
npm run build
```

The suite covers contracts, determinism, clock and simulation, detector evidence, correction invariants, scheduling, conflict resolution, cross-tab sync, AI agent actions, grounding validation, export schema and UI smoke paths. Current: **157 tests across 18 files**.

The integration invariants run across scenario variants and seed matrices and assert that no live overlay depends on an invalidated insight, the final score equals non-disallowed goals, and every export validates.

## Documentation

- [`SPEC.md`](SPEC.md) — product specification and implemented extensions.
- [`docs/AI-ARCHITECTURE.md`](docs/AI-ARCHITECTURE.md) — models, features, agent, grounding, providers.
- [`docs/EVALUATION-CHECKLIST.md`](docs/EVALUATION-CHECKLIST.md) — requirement-to-artifact mapping.
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — 90-second demo.
- [`docs/AZURE-DEPLOYMENT.md`](docs/AZURE-DEPLOYMENT.md) — SWA, Functions, App Insights, troubleshooting.
- [`docs/SYNTHETIC-DATA.md`](docs/SYNTHETIC-DATA.md) — data provenance and real-feed path.
- [`docs/coordinates-clock-events.md`](docs/coordinates-clock-events.md) — 3D coordinates, clocks, event rules.

## Principles

Synthetic-only · Deterministic · Evidence-based · Deterministic authority · AI optional and bounded · Local-first · Graceful degradation · Traceability · No fabricated capabilities.

## Limitations

- No live data connector; the simulator is intentional.
- No mobile companion.
- No authentication or multi-user operation.
- LLM quality depends on the configured provider; the on-device path is the demo baseline.
- Azure deployment requires operator credentials and is not performed by this repository.

## License

MIT. Dependency licenses: React (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Zod (MIT), Three.js (MIT), Playwright (Apache-2.0), Application Insights (MIT).
