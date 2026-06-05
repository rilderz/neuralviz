/**
 * Data Generator Utilities
 * 
 * Generates realistic simulated neural network training data
 * for demonstration and testing purposes.
 */

export interface TrainingDataPoint {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
}

export interface LayerActivation {
  layerName: string;
  activations: number[];
}

export interface GradientData {
  layer: string;
  gradientMagnitude: number;
}

/**
 * Generate simulated training curves that show realistic learning progression
 */
export function generateTrainingData(epochs: number): TrainingDataPoint[] {
  const data: TrainingDataPoint[] = [];

  for (let i = 0; i < epochs; i++) {
    // Simulate exponential decay of loss with some noise
    const progress = i / epochs;
    const baseLoss = Math.exp(-progress * 3) * 2;
    const trainLoss = baseLoss + Math.random() * 0.05;
    const valLoss = baseLoss * 1.1 + Math.random() * 0.08;

    // Simulate sigmoid-like accuracy improvement
    const baseAccuracy = 1 / (1 + Math.exp(-5 * (progress - 0.3)));
    const trainAccuracy = Math.min(0.99, baseAccuracy + Math.random() * 0.02);
    const valAccuracy = Math.min(0.98, baseAccuracy - 0.01 + Math.random() * 0.02);

    data.push({
      epoch: i + 1,
      trainLoss: Math.max(0.01, trainLoss),
      valLoss: Math.max(0.01, valLoss),
      trainAccuracy: Math.max(0, Math.min(1, trainAccuracy)),
      valAccuracy: Math.max(0, Math.min(1, valAccuracy)),
    });
  }

  return data;
}

/**
 * Generate simulated layer activations
 */
export function generateLayerActivations(
  layerNames: string[] = ['Conv2D_1', 'Conv2D_2', 'Dense_1', 'Dense_2']
): LayerActivation[] {
  return layerNames.map((name) => ({
    layerName: name,
    activations: Array.from({ length: 32 }, () => Math.random() * 2 - 0.5),
  }));
}

/**
 * Generate simulated gradient magnitudes
 */
export function generateGradientFlow(
  layerNames: string[] = ['Conv2D_1', 'Conv2D_2', 'Dense_1', 'Dense_2']
): GradientData[] {
  return layerNames.map((layer, idx) => ({
    layer,
    // Earlier layers tend to have smaller gradients (vanishing gradient problem)
    gradientMagnitude: Math.exp(-idx * 0.3) * (0.001 + Math.random() * 0.01),
  }));
}

/**
 * Update training data point with new simulated values
 */
export function updateTrainingDataPoint(
  lastPoint: TrainingDataPoint,
  epoch: number
): TrainingDataPoint {
  const progress = epoch / 100; // Assume 100 total epochs
  const baseLoss = Math.exp(-progress * 3) * 2;
  const trainLoss = baseLoss + Math.random() * 0.05;
  const valLoss = baseLoss * 1.1 + Math.random() * 0.08;

  const baseAccuracy = 1 / (1 + Math.exp(-5 * (progress - 0.3)));
  const trainAccuracy = Math.min(0.99, baseAccuracy + Math.random() * 0.02);
  const valAccuracy = Math.min(0.98, baseAccuracy - 0.01 + Math.random() * 0.02);

  return {
    epoch,
    trainLoss: Math.max(0.01, trainLoss),
    valLoss: Math.max(0.01, valLoss),
    trainAccuracy: Math.max(0, Math.min(1, trainAccuracy)),
    valAccuracy: Math.max(0, Math.min(1, valAccuracy)),
  };
}

/**
 * Update layer activations with new simulated values
 */
export function updateLayerActivations(
  layers: LayerActivation[]
): LayerActivation[] {
  return layers.map((layer) => ({
    ...layer,
    activations: layer.activations.map(
      (val) => val * 0.9 + (Math.random() * 2 - 1) * 0.1
    ),
  }));
}

/**
 * Update gradient flow with new simulated values
 */
export function updateGradientFlow(data: GradientData[]): GradientData[] {
  return data.map((item) => ({
    ...item,
    gradientMagnitude: Math.max(
      1e-6,
      item.gradientMagnitude * (0.9 + Math.random() * 0.2)
    ),
  }));
}
