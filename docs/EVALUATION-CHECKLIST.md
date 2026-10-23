# Evaluation checklist

This checklist maps the hackathon requirements to concrete, verifiable artifacts in the repository. Items marked **operator action** need a GitHub or Azure credential that is not stored in the repo.

## 1. Problem and relevance

| Requirement | Implementation | Verify |
|---|---|---|
| Real football broadcast problem | Live graphics must be fast, accurate, personalized and explainable; Sigma Broadcast directs a synthetic match end to end | `SPEC.md` §1, README |
| Premier League / Microsoft context | Broadcast-first UX, evidence-backed insights, club/player personalization, Microsoft + Azure stack | `docs/AI-ARCHITECTURE.md`, `docs/AZURE-DEPLOYMENT.md` |
| Clear value proposition | Deterministic truth + bounded AI ranking + auditable decisions + OBS-ready output | README, `docs/DEMO-SCRIPT.md` |

## 2. Working software

| Requirement | Status | Evidence |
|---|---|---|
| Runs locally without keys | Done | `npm install && npm run dev` |
| Deterministic demo | Done | `tests/integration/demo-scenario.test.ts` |
| 3D match + overlays | Done | `src/renderer3d/`, `src/broadcast-ui/` |
| Correction flow | Done | goal disallowed scenario, `tests/integration/` |
| JSON export | Done | `src/export/`, `tests/export/` |
| Transparent OBS source | Done | `/output` route |
| Automated tests | Done | `npm test` — 157 tests |
| Build and typecheck | Done | `npm run build` |
| Synthetic data disclosed | Done | `docs/SYNTHETIC-DATA.md`, README |

## 3. Meaningful AI

| Requirement | Status | Evidence |
|---|---|---|
| AI is part of the product, not a chatbot bolted on | Done | `src/ai/agent.ts` runs on every insight |
| Trained model, not only a prompt | Done | `scripts/train-models.mjs`, `src/ai/model/weights.ts` |
| Explainable decisions | Done | ablation contributions, rationale, top feature |
| Bounded agent with tools | Done | `AgentDecision.tools`, advisory/autonomous modes |
| Evidence grounding | Done | `src/ai/narrator.ts` validation, fallback |
| Personalization by club/player | Done | control panel selectors, `/output?team=&player=` |
| Optional LLM | Done | Azure OpenAI, GitHub Models, Azure Functions proxy |
| Graceful degradation | Done | on-device + deterministic fallback |
| AI audit trail | Done | `snapshot.agentDecisions`, export `ai.decisions` |

## 4. Microsoft and Azure

| Requirement | Status | Evidence |
|---|---|---|
| Microsoft technology in the product | Done | Application Insights SDK (`src/telemetry.ts`) |
| Azure service | Done | Azure Functions proxy (`api/`) |
| Azure OpenAI integration | Done | `src/ai/providers/azure.ts`, `api/functions/providers.ts` |
| GitHub Models alternative | Done | `src/ai/providers/github.ts` |
| Azure Static Web Apps config | Done | `staticwebapp.config.json` |
| Deployment workflow | Done | `.github/workflows/azure-static-web-apps.yml` |
| Public demo workflow | Done | `.github/workflows/pages.yml` |
| Live deployment | **Operator action** | Create the SWA resource and add `AZURE_STATIC_WEB_APPS_API_TOKEN` |
| Application Insights resource | **Operator action** | Add `VITE_APPINSIGHTS_CONNECTION_STRING` |

## 5. Demo and submission

| Requirement | Status | Evidence |
|---|---|---|
| Demo under two minutes | Recorded at ~70 seconds | `docs/DEMO-SCRIPT.md`, `npm run demo:record` |
| Public repository | Done | `https://github.com/arielodasso/sigmabroadcast` |
| Public demo URL | **Operator action** | Enable GitHub Pages or deploy the SWA workflow |
| English documentation | Done | README and `docs/` |
| Setup instructions | Done | README |
| Architecture explanation | Done | `docs/AI-ARCHITECTURE.md` |
| Evaluation mapping | Done | this file |

## 6. Technical execution

| Area | Evidence |
|---|---|
| Strict TypeScript | `tsconfig.json`, `npm run typecheck` |
| Runtime validation | Zod contracts in `src/contracts/` |
| Determinism | seeded engine, snapshot tests |
| Separation of concerns | simulation / truth / sync / AI / UI / export |
| Accessibility | skip link, focus states, reduced motion, ARIA labels |
| Internationalization | English and Spanish catalogs with parity tests |
| Performance | on-device MLP is a few thousand multiply-adds per insight |
| Security | no secrets in repo, proxy for public LLM use, no prompt logging |
| CI | `.github/workflows/ci.yml` |

## 7. Innovation and UX

- AI priority is blended with rule priority instead of replacing it.
- Every AI action is auditable and exportable.
- Personalization changes both ranking and graphics.
- Broadcast delay interacts with AI decisions: expired or invalidated insights are dropped before air.
- The same product supports an editorial control room and a bare OBS source.

## 8. Optional extras delivered

- [x] English and Spanish broadcast.
- [x] Fan and analyst modes over the same evidence.
- [x] Machine-readable JSON export with timecodes.
- [x] OBS-compatible output route.
- [x] Correction workflow with evidence invalidation.
- [x] Deterministic scenario variants and seed matrix.
- [x] Application Insights product telemetry.
- [x] Azure Functions AI proxy.
- [x] Automated demo recording.
- [ ] Live match data connector — synthetic data is intentional; see `docs/SYNTHETIC-DATA.md`.
- [ ] Mobile companion — out of scope.

## 9. Final pre-submission commands

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run demo:record
```

Expected: typecheck passes, 157 tests pass, production build succeeds, and `demo/sigma-broadcast-demo.mp4` is under two minutes (currently ~70 seconds).

## 10. Credentials checklist

- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub secrets.
- [ ] `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT` in the SWA configuration (server-side only).
- [ ] `VITE_AI_PROXY_URL=/api/ai` in the SWA build environment.
- [ ] `VITE_APPINSIGHTS_CONNECTION_STRING` in the SWA build environment.
- [ ] GitHub Pages enabled with "GitHub Actions" as the source.
- [ ] Demo video uploaded and URL added to the submission.
