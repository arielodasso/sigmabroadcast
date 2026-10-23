# Synthetic data statement

Sigma Broadcast uses a **fully synthetic football match**. No real match feed, broadcaster data, tracking data, player data or personal data is included.

## What is synthetic

- Two fictional clubs: **Northbridge FC** (`team-northbridge`, NBR) and **Harbor City FC** (`team-harbor`, HBR).
- Twenty-two fictional players with invented names, shirt numbers and roles.
- Every event: kick-off, passes, recoveries, pressures, shots, goals and the correction.
- Every statistic and insight is derived from those synthetic events.
- The AI training set is generated from the same rules with controlled noise and bias terms.
- Club crests, colours, typography and layout are original to this project.

No Premier League club, player, logo, footage, font or broadcast asset is reproduced.

## Why synthetic

- Deterministic: the same seed always produces the same match and the same graphics.
- Reproducible: reviewers can verify the full pipeline without a data licence.
- Safe: no personal data, no betting data, no rights-managed footage.
- Controllable: the scenario deliberately includes a goal that is later disallowed, so the correction path is always demonstrated.
- Honest: there is no implied live-data connector or official Premier League integration.

## Generation model

`src/simulation/` contains a seeded event engine:

- PRNG: `mulberry32`.
- Scenario variants: `demo`, `no-correction`, `double-correction`, `high-score`.
- The `demo` variant includes one disallowed goal; the correction lands 30 seconds after the goal and invalidates the original insight before it can be shown late.
- Match clock and event timestamps are deterministic.
- Scores are computed from goals that were never disallowed.

## AI training data

`scripts/train-models.mjs` builds a synthetic labelled dataset from broadcast features:

- Rule priority, evidence count, validity pressure.
- Event flags (goal, shot, recovery, pressure, pass sequence, invalidation).
- Category, involvement, score closeness, period, match progress, novelty and bias.
- Personalization flags for a followed club and player.

Labels are generated from deterministic broadcast heuristics plus noise. The model learns a smooth ranking, but the rules stay authoritative. This avoids presenting the model as an oracle trained on real editorial decisions.

## What is not claimed

- Not real match data.
- Not official Premier League data.
- Not a trained model on real broadcaster logs.
- Not a replacement for the deterministic evidence engine.
- Not a live betting or scouting product.

## Path to real data

The contracts in `src/contracts/` are the integration boundary. A real feed adapter would need to:

1. Map provider events into `MatchEvent` with stable IDs and timestamps.
2. Preserve source and evidence IDs end to end.
3. Replace the simulator as the event source without changing MatchTruth, BroadcastSync or the AI feature contract.
4. Add provider-specific latency, correction and replay handling.
5. Re-train or recalibrate the priority model on licensed editorial decisions.

The rest of the pipeline — evidence, scheduling, correction, export, AI audit — remains unchanged.

## Reproducibility

```bash
npm run models:train
npm test
```

The test suite asserts deterministic variants, correction invariants and a valid JSON export for every scenario.
