import fs from "node:fs";
import path from "node:path";

const FEATURE_NAMES = [
  "rule_priority",
  "evidence_count",
  "is_goal",
  "is_disallowed",
  "is_shot",
  "is_recovery",
  "is_pressure",
  "is_pass_sequence",
  "is_invalidated",
  "cat_tactical",
  "cat_performance",
  "cat_match_event",
  "cat_milestone",
  "has_validity",
  "validity_urgency",
  "followed_team",
  "followed_player",
  "home_involvement",
  "away_involvement",
  "score_closeness",
  "period",
  "match_progress",
  "has_player_evidence",
  "novelty",
  "bias",
];

const HIDDEN = 14;
const EPOCHS = 420;
const BATCH = 64;
const LEARNING_RATE = 0.012;
const L2 = 1e-4;
const SEED = 20261023;
const SAMPLES = 6000;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);
const normal = () => {
  const u = Math.max(rng(), 1e-9);
  const v = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const sigmoid = (x) => 1 / (1 + Math.exp(-Math.max(-60, Math.min(60, x))));
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round = (x) => Number(x.toFixed(6));

function oneHotCategory() {
  const r = rng();
  if (r < 0.38) return "tactical";
  if (r < 0.58) return "performance";
  if (r < 0.93) return "match_event";
  return "milestone";
}

function sample() {
  const category = oneHotCategory();
  const isGoal = rng() < 0.1 ? 1 : 0;
  const isDisallowed = rng() < 0.05 ? 1 : 0;
  const isShot = rng() < 0.18 ? 1 : 0;
  const isRecovery = rng() < 0.22 ? 1 : 0;
  const isPressure = rng() < 0.12 ? 1 : 0;
  const isPassSequence = rng() < 0.26 ? 1 : 0;
  const isInvalidated = rng() < 0.04 ? 1 : 0;
  const hasValidity = rng() < 0.52 ? 1 : 0;
  const followedTeam = rng() < 0.24 ? 1 : 0;
  const followedPlayer = rng() < 0.14 ? 1 : 0;
  const homeInvolvement = rng() < 0.5 ? 1 : 0;
  const awayInvolvement = homeInvolvement === 1 ? (rng() < 0.18 ? 1 : 0) : 1;
  const values = {
    rule_priority: clamp(rng() * 0.75 + 0.2, 0, 1),
    evidence_count: clamp(rng(), 0, 1),
    is_goal: isGoal,
    is_disallowed: isDisallowed,
    is_shot: isShot,
    is_recovery: isRecovery,
    is_pressure: isPressure,
    is_pass_sequence: isPassSequence,
    is_invalidated: isInvalidated,
    cat_tactical: category === "tactical" ? 1 : 0,
    cat_performance: category === "performance" ? 1 : 0,
    cat_match_event: category === "match_event" ? 1 : 0,
    cat_milestone: category === "milestone" ? 1 : 0,
    has_validity: hasValidity,
    validity_urgency: hasValidity === 1 ? clamp(rng(), 0, 1) : 0,
    followed_team: followedTeam,
    followed_player: followedPlayer,
    home_involvement: homeInvolvement,
    away_involvement: awayInvolvement,
    score_closeness: clamp(rng(), 0, 1),
    period: rng() < 0.5 ? 0 : 1,
    match_progress: clamp(rng(), 0, 1),
    has_player_evidence: rng() < 0.65 ? 1 : 0,
    novelty: clamp(rng(), 0, 1),
    bias: 1,
  };
  const priorityLogit =
    -2.4 +
    3.3 * values.is_goal +
    2.7 * values.is_disallowed +
    2.0 * values.is_shot +
    0.8 * values.is_recovery +
    0.7 * values.is_pressure +
    0.12 * values.is_pass_sequence +
    1.7 * values.rule_priority +
    0.95 * values.followed_team +
    0.8 * values.followed_player +
    0.55 * values.score_closeness +
    0.65 * values.validity_urgency +
    0.25 * values.novelty +
    -4.5 * values.is_invalidated;
  const priorityProbability = sigmoid(priorityLogit);
  const priorityLabel = rng() < priorityProbability ? 1 : 0;
  const audienceLogit =
    -0.7 +
    1.25 * values.cat_tactical +
    1.05 * values.cat_performance +
    0.55 * values.is_pressure +
    0.5 * values.is_pass_sequence +
    0.4 * values.is_recovery +
    0.35 * values.rule_priority -
    1.3 * values.is_goal -
    0.9 * values.is_shot -
    0.45 * values.followed_team -
    0.35 * values.followed_player;
  const audienceLabel = sigmoid(audienceLogit) >= 0.5 ? 1 : 0;
  const vector = FEATURE_NAMES.map((name) => values[name]);
  return { vector, priorityLabel, audienceLabel };
}

const dataset = Array.from({ length: SAMPLES }, sample);
const means = FEATURE_NAMES.map((_, index) => {
  const total = dataset.reduce((sum, item) => sum + item.vector[index], 0);
  return total / dataset.length;
});
const stds = FEATURE_NAMES.map((_, index) => {
  const total = dataset.reduce(
    (sum, item) => sum + (item.vector[index] - means[index]) ** 2,
    0,
  );
  return Math.sqrt(total / dataset.length) || 1;
});

function standardize(vector) {
  return vector.map((value, index) => (value - means[index]) / stds[index]);
}

const standardized = dataset.map((item) => ({
  x: standardize(item.vector),
  priority: item.priorityLabel,
  audience: item.audienceLabel,
}));

function initMatrix(rows, cols, scale) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => normal() * scale),
  );
}

function zeros(length) {
  return Array.from({ length }, () => 0);
}

function forward(x, model) {
  const hidden = model.hiddenWeights.map((row, index) => {
    let sum = model.hiddenBias[index];
    for (let i = 0; i < x.length; i += 1) sum += row[i] * x[i];
    return Math.tanh(sum);
  });
  let sum = model.outputBias;
  for (let i = 0; i < hidden.length; i += 1) {
    sum += model.outputWeights[i] * hidden[i];
  }
  return { hidden, output: sigmoid(sum) };
}

function train(labelsKey, version) {
  const input = FEATURE_NAMES.length;
  const model = {
    hiddenWeights: initMatrix(HIDDEN, input, Math.sqrt(2 / (input + HIDDEN))),
    hiddenBias: zeros(HIDDEN),
    outputWeights: Array.from({ length: HIDDEN }, () => normal() * Math.sqrt(1 / HIDDEN)),
    outputBias: 0,
  };
  const adam = {
    m: {
      hiddenWeights: initMatrix(HIDDEN, input, 0),
      hiddenBias: zeros(HIDDEN),
      outputWeights: zeros(HIDDEN),
      outputBias: 0,
    },
    v: {
      hiddenWeights: initMatrix(HIDDEN, input, 0),
      hiddenBias: zeros(HIDDEN),
      outputWeights: zeros(HIDDEN),
      outputBias: 0,
    },
  };
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  let step = 0;
  const order = Array.from({ length: standardized.length }, (_, index) => index);

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let offset = 0; offset < order.length; offset += BATCH) {
      const batch = order.slice(offset, offset + BATCH);
      const gradHiddenWeights = initMatrix(HIDDEN, input, 0);
      const gradHiddenBias = zeros(HIDDEN);
      const gradOutputWeights = zeros(HIDDEN);
      let gradOutputBias = 0;

      for (const index of batch) {
        const item = standardized[index];
        const { hidden, output } = forward(item.x, model);
        const label = item[labelsKey];
        const delta = output - label;
        for (let h = 0; h < HIDDEN; h += 1) {
          gradOutputWeights[h] += delta * hidden[h];
          const hiddenDelta = delta * model.outputWeights[h] * (1 - hidden[h] ** 2);
          gradHiddenBias[h] += hiddenDelta;
          for (let f = 0; f < input; f += 1) {
            gradHiddenWeights[h][f] += hiddenDelta * item.x[f];
          }
        }
        gradOutputBias += delta;
      }

      const scale = 1 / batch.length;
      step += 1;
      const lr = LEARNING_RATE * Math.sqrt(1 - beta2 ** step) / (1 - beta1 ** step);
      const update = (value, grad, m, v) => {
        const g = grad * scale + L2 * value;
        m = beta1 * m + (1 - beta1) * g;
        v = beta2 * v + (1 - beta2) * g * g;
        const next = value - lr * m / (Math.sqrt(v) + epsilon);
        return { next, m, v };
      };

      for (let h = 0; h < HIDDEN; h += 1) {
        for (let f = 0; f < input; f += 1) {
          const result = update(
            model.hiddenWeights[h][f],
            gradHiddenWeights[h][f],
            adam.m.hiddenWeights[h][f],
            adam.v.hiddenWeights[h][f],
          );
          model.hiddenWeights[h][f] = result.next;
          adam.m.hiddenWeights[h][f] = result.m;
          adam.v.hiddenWeights[h][f] = result.v;
        }
        const bias = update(
          model.hiddenBias[h],
          gradHiddenBias[h],
          adam.m.hiddenBias[h],
          adam.v.hiddenBias[h],
        );
        model.hiddenBias[h] = bias.next;
        adam.m.hiddenBias[h] = bias.m;
        adam.v.hiddenBias[h] = bias.v;
      }
      for (let h = 0; h < HIDDEN; h += 1) {
        const weight = update(
          model.outputWeights[h],
          gradOutputWeights[h],
          adam.m.outputWeights[h],
          adam.v.outputWeights[h],
        );
        model.outputWeights[h] = weight.next;
        adam.m.outputWeights[h] = weight.m;
        adam.v.outputWeights[h] = weight.v;
      }
      const bias = update(
        model.outputBias,
        gradOutputBias,
        adam.m.outputBias,
        adam.v.outputBias,
      );
      model.outputBias = bias.next;
      adam.m.outputBias = bias.m;
      adam.v.outputBias = bias.v;
    }
  }

  let correct = 0;
  for (const item of standardized) {
    const prediction = forward(item.x, model).output >= 0.5 ? 1 : 0;
    if (prediction === item[labelsKey]) correct += 1;
  }

  return {
    version,
    featureNames: FEATURE_NAMES,
    mean: means.map(round),
    std: stds.map(round),
    hiddenWeights: model.hiddenWeights.map((row) => row.map(round)),
    hiddenBias: model.hiddenBias.map(round),
    outputWeights: model.outputWeights.map(round),
    outputBias: round(model.outputBias),
    threshold: 0.5,
    metadata: {
      samples: SAMPLES,
      epochs: EPOCHS,
      hiddenUnits: HIDDEN,
      learningRate: LEARNING_RATE,
      seed: SEED,
      accuracy: round(correct / SAMPLES),
      trainedAt: "2026-10-23",
    },
  };
}

const priority = train("priority", "sigma-priority-mlp-v1");
const audience = train("audience", "sigma-audience-mlp-v1");

const target = path.resolve("src/ai/model/weights.ts");
fs.mkdirSync(path.dirname(target), { recursive: true });
const content = `export const FEATURE_NAMES = ${JSON.stringify(FEATURE_NAMES, null, 2)} as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export interface ModelWeights {
  version: string;
  featureNames: readonly FeatureName[];
  mean: readonly number[];
  std: readonly number[];
  hiddenWeights: readonly (readonly number[])[];
  hiddenBias: readonly number[];
  outputWeights: readonly number[];
  outputBias: number;
  threshold: number;
  metadata: {
    samples: number;
    epochs: number;
    hiddenUnits: number;
    learningRate: number;
    seed: number;
    accuracy: number;
    trainedAt: string;
  };
}

export const PRIORITY_MODEL: ModelWeights = {
  ...${JSON.stringify(priority, null, 2)},
  featureNames: FEATURE_NAMES,
};

export const AUDIENCE_MODEL: ModelWeights = {
  ...${JSON.stringify(audience, null, 2)},
  featureNames: FEATURE_NAMES,
};
`;
fs.writeFileSync(target, content, "utf8");
console.log(
  `priority accuracy ${priority.metadata.accuracy}, audience accuracy ${audience.metadata.accuracy}`,
);
console.log(`wrote ${target}`);
