/**
 * XGBoost Trading Model
 * 
 * Simple, proven model for forex day trading
 * - NOT deep learning (prevents overfitting)
 * - Fast inference (critical for day trading)
 * - Interpretable (can debug why it makes decisions)
 */

import { FeatureVector } from './featureEngineering';

export interface TrainingData {
  features: FeatureVector[];
  labels: number[]; // -1 (SELL), 0 (HOLD), 1 (BUY)
}

export interface PredictionResult {
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence: number; // 0-1
  probabilities: {
    buy: number;
    hold: number;
    sell: number;
  };
  featureImportance: Map<string, number>;
}

/**
 * Simplified XGBoost-like Model
 * 
 * In production, you would use:
 * - Python XGBoost library
 * - TensorFlow/Keras
 * - LightGBM
 * 
 * For this demo, we use a simplified gradient boosting approach
 */
export class XGBoostModel {
  private trees: DecisionTree[] = [];
  private learningRate: number = 0.1;
  private nEstimators: number = 100;
  private maxDepth: number = 6;
  private featureImportance: Map<string, number> = new Map();
  private classWeights: Map<number, number> = new Map();

  constructor(config?: { learningRate?: number; nEstimators?: number; maxDepth?: number }) {
    this.learningRate = config?.learningRate || 0.1;
    this.nEstimators = config?.nEstimators || 100;
    this.maxDepth = config?.maxDepth || 6;
  }

  /**
   * Train model on historical data
   * 
   * IMPORTANT: Only train on training set, never on test set!
   */
  train(data: TrainingData): void {
    if (data.features.length < 100) {
      throw new Error('Need at least 100 training samples');
    }

    // Calculate class weights to handle imbalance
    this.calculateClassWeights(data.labels);

    // Initialize predictions
    let predictions = new Array(data.features.length).fill(0);

    // Gradient boosting iterations
    for (let iteration = 0; iteration < this.nEstimators; iteration++) {
      // Calculate residuals (errors)
      const residuals = data.labels.map((label, i) => label - predictions[i]);

      // Build decision tree on residuals
      const tree = new DecisionTree(this.maxDepth);
      tree.fit(data.features, residuals);
      this.trees.push(tree);

      // Update predictions
      const treePredictions = data.features.map((features, i) => tree.predict(features));
      predictions = predictions.map((pred, i) => pred + this.learningRate * treePredictions[i]);

      // Track feature importance
      this.updateFeatureImportance(tree);
    }
  }

  /**
   * Make prediction on new data
   */
  predict(features: FeatureVector): PredictionResult {
    if (this.trees.length === 0) {
      throw new Error('Model not trained yet');
    }

    // Get predictions from all trees
    let prediction = 0;
    for (const tree of this.trees) {
      prediction += this.learningRate * tree.predict(features);
    }

    // Convert to probabilities for 3-class problem
    const probabilities = this.softmax([prediction - 1, prediction, prediction + 1]);

    // Determine signal
    let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
    let confidence = probabilities[1]; // HOLD confidence

    if (probabilities[2] > probabilities[0] && probabilities[2] > probabilities[1]) {
      signal = 'BUY';
      confidence = probabilities[2];
    } else if (probabilities[0] > probabilities[1] && probabilities[0] > probabilities[2]) {
      signal = 'SELL';
      confidence = probabilities[0];
    }

    return {
      signal,
      confidence,
      probabilities: {
        sell: probabilities[0],
        hold: probabilities[1],
        buy: probabilities[2],
      },
      featureImportance: this.featureImportance,
    };
  }

  /**
   * Get model performance metrics
   */
  getMetrics(testFeatures: FeatureVector[], testLabels: number[]): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  } {
    const predictions = testFeatures.map(f => {
      const result = this.predict(f);
      return result.signal === 'BUY' ? 1 : result.signal === 'SELL' ? -1 : 0;
    });

    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] === testLabels[i]) correct++;

      if (testLabels[i] === 1) {
        if (predictions[i] === 1) truePositives++;
        else falseNegatives++;
      } else if (predictions[i] === 1) {
        falsePositives++;
      }
    }

    const accuracy = correct / predictions.length;
    const precision = truePositives / (truePositives + falsePositives || 1);
    const recall = truePositives / (truePositives + falseNegatives || 1);
    const f1Score = 2 * (precision * recall) / (precision + recall || 1);

    return { accuracy, precision, recall, f1Score };
  }

  /**
   * Validate model to detect overfitting
   */
  validateOverfitting(
    trainFeatures: FeatureVector[],
    trainLabels: number[],
    testFeatures: FeatureVector[],
    testLabels: number[]
  ): {
    trainAccuracy: number;
    testAccuracy: number;
    overfittingScore: number; // 0-1, higher = more overfitting
  } {
    const trainMetrics = this.getMetrics(trainFeatures, trainLabels);
    const testMetrics = this.getMetrics(testFeatures, testLabels);

    const overfittingScore = Math.max(0, trainMetrics.accuracy - testMetrics.accuracy);

    return {
      trainAccuracy: trainMetrics.accuracy,
      testAccuracy: testMetrics.accuracy,
      overfittingScore,
    };
  }

  // ==================== PRIVATE METHODS ====================

  private calculateClassWeights(labels: number[]): void {
    const counts = new Map<number, number>();
    labels.forEach(label => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const totalSamples = labels.length;
    const numClasses = counts.size;

    counts.forEach((count, label) => {
      this.classWeights.set(label, (totalSamples / (numClasses * count)) * 0.5);
    });
  }

  private updateFeatureImportance(tree: DecisionTree): void {
    const importance = tree.getFeatureImportance();
    importance.forEach((value, key) => {
      this.featureImportance.set(key, (this.featureImportance.get(key) || 0) + value);
    });
  }

  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exp = values.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b);
    return exp.map(e => e / sum);
  }
}

/**
 * Simple Decision Tree for Gradient Boosting
 */
class DecisionTree {
  private maxDepth: number;
  private root: TreeNode | null = null;

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth;
  }

  fit(features: FeatureVector[], targets: number[]): void {
    this.root = this.buildTree(features, targets, 0);
  }

  predict(features: FeatureVector): number {
    if (!this.root) return 0;
    return this.traverseTree(this.root, features);
  }

  getFeatureImportance(): Map<string, number> {
    const importance = new Map<string, number>();
    if (this.root) {
      this.calculateImportance(this.root, importance);
    }
    return importance;
  }

  // ==================== PRIVATE METHODS ====================

  private buildTree(features: FeatureVector[], targets: number[], depth: number): TreeNode {
    // Base cases
    if (targets.length < 5 || depth >= this.maxDepth) {
      const mean = targets.reduce((a, b) => a + b) / targets.length;
      return { isLeaf: true, value: mean };
    }

    // Find best split
    const bestSplit = this.findBestSplit(features, targets);

    if (!bestSplit) {
      const mean = targets.reduce((a, b) => a + b) / targets.length;
      return { isLeaf: true, value: mean };
    }

    // Split data
    const leftIndices = features
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => this.getFeatureValue(f, bestSplit.feature) <= bestSplit.threshold)
      .map(({ i }) => i);

    const rightIndices = features
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => this.getFeatureValue(f, bestSplit.feature) > bestSplit.threshold)
      .map(({ i }) => i);

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      const mean = targets.reduce((a, b) => a + b) / targets.length;
      return { isLeaf: true, value: mean };
    }

    // Recursively build subtrees
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftTargets = leftIndices.map(i => targets[i]);
    const rightFeatures = rightIndices.map(i => features[i]);
    const rightTargets = rightIndices.map(i => targets[i]);

    return {
      isLeaf: false,
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      left: this.buildTree(leftFeatures, leftTargets, depth + 1),
      right: this.buildTree(rightFeatures, rightTargets, depth + 1),
    };
  }

  private findBestSplit(features: FeatureVector[], targets: number[]): { feature: string; threshold: number } | null {
    let bestGain = 0;
    let bestSplit: { feature: string; threshold: number } | null = null;

    const featureNames = Object.keys(features[0]) as (keyof FeatureVector)[];

    for (const featureName of featureNames) {
      const values = features.map(f => f[featureName] as number).sort((a, b) => a - b);
      const uniqueValues = Array.from(new Set(values));

      const thresholds = uniqueValues.slice(0, Math.min(10, uniqueValues.length));
      for (const threshold of thresholds) {
        const leftTargets = targets.filter((_, i) => (features[i][featureName] as number) <= threshold);
        const rightTargets = targets.filter((_, i) => (features[i][featureName] as number) > threshold);

        if (leftTargets.length === 0 || rightTargets.length === 0) continue;

        const gain = this.calculateInformationGain(targets, leftTargets, rightTargets);

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { feature: featureName as string, threshold };
        }
      }
    }

    return bestSplit;
  }

  private calculateInformationGain(parent: number[], left: number[], right: number[]): number {
    const parentVariance = this.calculateVariance(parent);
    const leftVariance = this.calculateVariance(left);
    const rightVariance = this.calculateVariance(right);

    const leftWeight = left.length / parent.length;
    const rightWeight = right.length / parent.length;

    return parentVariance - leftWeight * leftVariance - rightWeight * rightVariance;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private traverseTree(node: TreeNode, features: FeatureVector): number {
    if (node.isLeaf) {
      return node.value || 0;
    }

    const featureValue = this.getFeatureValue(features, node.feature || '');

    if (featureValue <= (node.threshold || 0)) {
      return this.traverseTree(node.left!, features);
    } else {
      return this.traverseTree(node.right!, features);
    }
  }

  private getFeatureValue(features: FeatureVector, featureName: string): number {
    return (features[featureName as keyof FeatureVector] as number) || 0;
  }

  private calculateImportance(node: TreeNode, importance: Map<string, number>): void {
    if (node.isLeaf) return;

    const feature = node.feature || '';
    importance.set(feature, (importance.get(feature) || 0) + 1);

    if (node.left) this.calculateImportance(node.left, importance);
    if (node.right) this.calculateImportance(node.right, importance);
  }
}

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}
