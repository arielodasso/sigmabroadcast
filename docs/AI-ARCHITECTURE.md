# AI architecture

Sigma Broadcast uses AI as a **bounded decision layer** on top of a deterministic broadcast pipeline. The match, the evidence, the scheduling authority and the exported audit trail always come from deterministic code. AI adds ranking, audience selection, personalization and optional natural-language explanation — never invented facts.

## Design goals

- Run the full demo with no network, no keys and no paid service.
- Keep every AI decision explainable from features and evidence.
- Degrade to a deterministic path when a model or provider fails.
- Make the LLM optional and validate its output before it reaches the broadcast.
- Never let AI override the truth of an event.

## Pipeline

```text
MatchEngine (synthetic, seeded)
  -> InsightEngine (rule detectors + evidence)
  -> BroadcastAgent
       -> feature vector (25 features)
       -> on-device MLP: priority score + audience
       -> action: air / boost / hold / suppress
       -> MatchInsight.ai metadata + AgentDecision audit record
  -> BroadcastDirector (deterministic scheduling authority)
  -> OverlayLayer (evidence-backed graphics)
  -> JSON export (insights, decisions, narratives, status)
```

`advisory` is the default. The agent observes and recommends; the deterministic director schedules exactly as before. In `autonomous`, the agent's blended priority is submitted to the director and insights marked `suppress` are not submitted at all.

## On-device models

Two multi-layer perceptrons are trained offline and shipped as TypeScript constants:

| Model | Output | Use |
|---|---|---|
| `PRIORITY_MODEL` | probability 0..1 | ranking and action selection |
| `AUDIENCE_MODEL` | probability 0..1 | `analyst` when >= threshold, otherwise `fan` |

- Architecture: 25 inputs, 14 tanh hidden units, 1 sigmoid output.
- Training: `node scripts/train-models.mjs`.
- Output: `src/ai/model/weights.ts` (`FEATURE_NAMES`, weights, normalization, metadata).
- Seed: `20261023`; training is reproducible.
- Runtime: pure arithmetic, no ONNX, no WASM, no network.

The training labels are generated from the same broadcast rules plus controlled noise and bias terms. The agent learns a smooth ranking function; the rules remain the source of truth, which is why the blend is explicit (`60%` rule priority, `40%` model score).

### Features

| Group | Features |
|---|---|
| Rule | `rule_priority`, `evidence_count`, `has_validity`, `validity_urgency` |
| Event type | `is_goal`, `is_disallowed`, `is_shot`, `is_recovery`, `is_pressure`, `is_pass_sequence`, `is_invalidated` |
| Category | `cat_tactical`, `cat_performance`, `cat_match_event`, `cat_milestone` |
| Context | `home_involvement`, `away_involvement`, `score_closeness`, `period`, `match_progress`, `has_player_evidence` |
| Personalization | `followed_team`, `followed_player` |
| Ranking | `novelty`, `bias` |

Features are extracted in `src/ai/features.ts` and normalized with the training mean and standard deviation.

### Explanation by ablation

For each insight, `featureImpacts` re-runs the network with one normalized feature set to zero at a time and records the change in output. The top five contributions, the strongest feature and a short rationale are stored in `MatchInsight.ai`:

```ts
{
  score: 0.78,
  confidence: 0.56,
  priority: 92,
  audience: "analyst",
  model: "on-device-priority-mlp-v1",
  rationale: "score 0.78, confidence 0.56, rule_priority +0.21, ...",
  topFeature: "rule_priority",
  contributions: [{ feature: "rule_priority", value: 0.9, impact: 0.21 }]
}
```

## Agent contract

Every new insight produces one `AgentDecision`:

| Field | Meaning |
|---|---|
| `action` | `air`, `boost`, `hold`, `suppress` |
| `score` / `confidence` | model output and certainty |
| `topFeature` | strongest ablation signal |
| `reason` | deterministic audit string |
| `evidenceEventIds` | exact evidence used |
| `tools` | capabilities exercised |
| `mode` | `advisory` or `autonomous` |
| `applied` | whether the decision changed the broadcast |

Tools are deliberately narrow: `get_match_context`, `get_insight_evidence`, `score_priority`, `select_audience`, `get_follow_relevance`, `check_validity_window`. The agent cannot create events, edit evidence or bypass the director.

## Personalization

The operator can follow a club or a player from the control panel, or set it in the output URL:

```text
/output?team=team-northbridge&player=team-northbridge-p9
```

Personalization has only two effects:

1. `followed_team` / `followed_player` features raise the priority and force a `boost` action.
2. Overlays backed by followed evidence get a gold border and a personalization label.

No profile, account or historical user data is used.

## Optional LLM narration

The LLM is used only for two tasks: explaining one insight and summarizing the finished match.

```text
UI button -> BroadcastController -> AiNarrator -> provider
   Azure OpenAI | GitHub Models | Azure Functions proxy
-> JSON { text, evidenceEventIds }
-> grounding validation
-> accepted narrative or deterministic fallback
```

Grounding rules in `src/ai/narrator.ts`:

- Response must be strict JSON with `text` and a non-empty `evidenceEventIds`.
- Every returned ID must belong to the insight or recap evidence.
- Every number in the text must appear in the supplied evidence or statistics, or be a small ordinal (0..12).
- The prompt forbids invented players, teams, scores, minutes, statistics and IDs.
- Validation failure marks the narrative as fallback and records `AI response failed grounding validation`.

The LLM never changes scheduling, priority or evidence.

## Providers

| Mode | Configuration | Notes |
|---|---|---|
| `local` | none | default; on-device model only |
| `proxy` | `VITE_AI_PROXY_URL` | recommended for public demos; keys stay server-side |
| `azure-openai` | `VITE_AZURE_OPENAI_*` | direct browser call; the key is exposed to the client |
| `github-models` | `VITE_GITHUB_MODELS_TOKEN` | direct browser call; the token is exposed to the client |

For any public deployment use the Azure Functions proxy. Direct browser keys are acceptable only for a local demo.

## Telemetry

`@microsoft/applicationinsights-web` is initialized only when `VITE_APPINSIGHTS_CONNECTION_STRING` is present. The app tracks page views and four product events: `agent_mode`, `ai_explain`, `ai_recap` and `export_json`. Prompts, evidence payloads and narrative text are never sent to Application Insights.

## Failure behaviour

| Failure | Behaviour |
|---|---|
| No LLM configured | on-device explanation and deterministic recap |
| Provider timeout or error | fallback; `aiStatus.status = "fallback"`; error surfaced in the panel |
| Non-JSON or ungrounded response | rejected; fallback |
| No model file | build fails; `npm run models:train` regenerates it |
| No network | full demo still works |

## Reproduce

```bash
npm run models:train
npm test
npm run build
npm run demo:record
```

## Files

- `scripts/train-models.mjs` — training and weight export.
- `src/ai/features.ts` — feature extraction.
- `src/ai/model/inference.ts` — normalization, forward pass, ablation.
- `src/ai/model/weights.ts` — generated model artifacts.
- `src/ai/agent.ts` — bounded agent and decisions.
- `src/ai/narrator.ts` — prompts, grounding validation, fallback.
- `src/ai/config.ts` — provider selection.
- `src/ai/providers/` — Azure OpenAI, GitHub Models, proxy clients.
- `src/contracts/ai.ts` — Zod contracts for AI status, decisions and narratives.
- `api/` — Azure Functions proxy and health endpoint.
