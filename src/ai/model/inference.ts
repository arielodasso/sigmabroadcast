import {
  AUDIENCE_MODEL,
  PRIORITY_MODEL,
  type FeatureName,
  type ModelWeights,
} from "./weights";

export interface FeatureImpact {
  feature: string;
  value: number;
  impact: number;
}

export function sigmoid(value: number): number {
  const clamped = Math.max(-60, Math.min(60, value));
  return 1 / (1 + Math.exp(-clamped));
}

export function normalize(
  features: readonly number[],
  model: ModelWeights = PRIORITY_MODEL,
): number[] {
  return model.featureNames.map((_, index) => {
    const mean = model.mean[index] ?? 0;
    const std = model.std[index] ?? 1;
    return ((features[index] ?? 0) - mean) / (std === 0 ? 1 : std);
  });
}

export function predictNormalized(
  normalized: readonly number[],
  model: ModelWeights,
): number {
  const hidden = model.hiddenWeights.map((row, index) => {
    let sum = model.hiddenBias[index] ?? 0;
    for (let i = 0; i < normalized.length; i += 1) {
      sum += (row[i] ?? 0) * (normalized[i] ?? 0);
    }
    return Math.tanh(sum);
  });
  let output = model.outputBias;
  for (let i = 0; i < hidden.length; i += 1) {
    output += (model.outputWeights[i] ?? 0) * hidden[i]!;
  }
  return sigmoid(output);
}

export function predict(
  features: readonly number[],
  model: ModelWeights = PRIORITY_MODEL,
): number {
  return predictNormalized(normalize(features, model), model);
}

export function predictPriority(features: readonly number[]): number {
  return predict(features, PRIORITY_MODEL);
}

export function predictAudience(features: readonly number[]): "fan" | "analyst" {
  return predict(features, AUDIENCE_MODEL) >= AUDIENCE_MODEL.threshold
    ? "analyst"
    : "fan";
}

export function confidenceOf(probability: number): number {
  return Math.max(0, Math.min(1, Math.abs(probability - 0.5) * 2));
}

export function featureImpacts(
  features: readonly number[],
  model: ModelWeights = PRIORITY_MODEL,
  limit = 5,
): FeatureImpact[] {
  const normalized = normalize(features, model);
  const base = predictNormalized(normalized, model);
  const impacts: FeatureImpact[] = normalized.map((value, index) => {
    const altered = [...normalized];
    altered[index] = 0;
    const without = predictNormalized(altered, model);
    return {
      feature: model.featureNames[index] ?? `feature_${index}`,
      value,
      impact: base - without,
    };
  });
  return impacts
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, limit);
}

export function modelLabel(model: ModelWeights = PRIORITY_MODEL): string {
  return model.version;
}

export function featureIndex(name: FeatureName): number {
  return PRIORITY_MODEL.featureNames.indexOf(name);
}

export { AUDIENCE_MODEL, PRIORITY_MODEL };
export type { FeatureName, ModelWeights };
