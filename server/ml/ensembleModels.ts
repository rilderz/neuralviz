/**
 * Ensemble Model System
 * 
 * Instead of one model, use multiple specialized models:
 * 1. TREND_FOLLOWER - catches strong directional moves
 * 2. MEAN_REVERTER - profits from oversold/overbought
 * 3. BREAKOUT_TRADER - trades breakouts from consolidation
 * 
 * Combine decisions for more stable performance
 */

import { FeatureVector } from './featureEngineering';
import { XGBoostModel, PredictionResult } from './xgboostModel';

export type StrategyType = 'TREND_FOLLOWER' | 'MEAN_REVERTER' | 'BREAKOUT_TRADER';

export interface EnsembleSignal {
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  strategyVotes: Map<StrategyType, { signal: string; confidence: number }>;
  recommendedStrategy: StrategyType;
  agreementLevel: number; // 0-1, higher = more agreement
}

/**
 * Ensemble Model Manager
 */
export class EnsembleModels {
  private trendFollower: XGBoostModel;
  private meanReverter: XGBoostModel;
  private breakoutTrader: XGBoostModel;

  constructor() {
    // Initialize three specialized models
    this.trendFollower = new XGBoostModel({ maxDepth: 6, nEstimators: 100 });
    this.meanReverter = new XGBoostModel({ maxDepth: 5, nEstimators: 80 });
    this.breakoutTrader = new XGBoostModel({ maxDepth: 7, nEstimators: 120 });
  }

  /**
   * Train all models on different data subsets
   */
  trainEnsemble(
    allFeatures: FeatureVector[],
    allLabels: number[]
  ): {
    trendAccuracy: number;
    meanReversionAccuracy: number;
    breakoutAccuracy: number;
  } {
    // Split data by market condition
    const trendData = this.selectTrendingData(allFeatures, allLabels);
    const rangeData = this.selectRangingData(allFeatures, allLabels);
    const breakoutData = this.selectBreakoutData(allFeatures, allLabels);

    // Train each model on its specialty
    this.trendFollower.train(trendData);
    this.meanReverter.train(rangeData);
    this.breakoutTrader.train(breakoutData);

    // Calculate accuracies
    const trendAccuracy = this.trendFollower.getMetrics(trendData.features, trendData.labels).accuracy;
    const meanReversionAccuracy = this.meanReverter.getMetrics(rangeData.features, rangeData.labels).accuracy;
    const breakoutAccuracy = this.breakoutTrader.getMetrics(breakoutData.features, breakoutData.labels).accuracy;

    return {
      trendAccuracy,
      meanReversionAccuracy,
      breakoutAccuracy,
    };
  }

  /**
   * Get ensemble prediction combining all three models
   */
  predictEnsemble(features: FeatureVector): EnsembleSignal {
    // Get predictions from each model
    const trendPred = this.trendFollower.predict(features);
    const meanRevPred = this.meanReverter.predict(features);
    const breakoutPred = this.breakoutTrader.predict(features);

    // Vote on final signal
    const votes = new Map<StrategyType, { signal: string; confidence: number }>();
    votes.set('TREND_FOLLOWER', { signal: trendPred.signal, confidence: trendPred.confidence });
    votes.set('MEAN_REVERTER', { signal: meanRevPred.signal, confidence: meanRevPred.confidence });
    votes.set('BREAKOUT_TRADER', { signal: breakoutPred.signal, confidence: breakoutPred.confidence });

    // Combine signals
    const buyVotes = [
      trendPred.signal === 'BUY' ? trendPred.confidence : 0,
      meanRevPred.signal === 'BUY' ? meanRevPred.confidence : 0,
      breakoutPred.signal === 'BUY' ? breakoutPred.confidence : 0,
    ];

    const sellVotes = [
      trendPred.signal === 'SELL' ? trendPred.confidence : 0,
      meanRevPred.signal === 'SELL' ? meanRevPred.confidence : 0,
      breakoutPred.signal === 'SELL' ? breakoutPred.confidence : 0,
    ];

    // Use dynamic divisor to avoid NaN
    const validBuyVotes = buyVotes.filter(v => !isNaN(v) && v !== null && v !== undefined);
    const validSellVotes = sellVotes.filter(v => !isNaN(v) && v !== null && v !== undefined);
    
    const buyScore = validBuyVotes.length > 0 ? validBuyVotes.reduce((a, b) => a + b) / validBuyVotes.length : 0;
    const sellScore = validSellVotes.length > 0 ? validSellVotes.reduce((a, b) => a + b) / validSellVotes.length : 0;

    // Determine final signal
    let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
    let confidence = 0;
    let recommendedStrategy: StrategyType = 'TREND_FOLLOWER';

    if (buyScore > sellScore && buyScore > 0.4) {
      signal = 'BUY';
      confidence = buyScore;
      recommendedStrategy = this.getBestPerformingStrategy(votes, 'BUY');
    } else if (sellScore > buyScore && sellScore > 0.4) {
      signal = 'SELL';
      confidence = sellScore;
      recommendedStrategy = this.getBestPerformingStrategy(votes, 'SELL');
    }

    // Calculate agreement level
    const agreementLevel = this.calculateAgreement(votes, signal);

    return {
      signal,
      confidence,
      strategyVotes: votes,
      recommendedStrategy,
      agreementLevel,
    };
  }

  /**
   * Get individual model predictions (for debugging/analysis)
   */
  getIndividualPredictions(features: FeatureVector): {
    trendFollower: PredictionResult;
    meanReverter: PredictionResult;
    breakoutTrader: PredictionResult;
  } {
    return {
      trendFollower: this.trendFollower.predict(features),
      meanReverter: this.meanReverter.predict(features),
      breakoutTrader: this.breakoutTrader.predict(features),
    };
  }

  // ==================== PRIVATE METHODS ====================

  private selectTrendingData(
    features: FeatureVector[],
    labels: number[]
  ): { features: FeatureVector[]; labels: number[] } {
    // Select samples where trend is strong
    const selected: { features: FeatureVector; label: number }[] = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      // Strong trend indicators: high ADX, price far from moving averages
      const adx = f.adx_14 || 0;
      const distanceToSMA = Math.abs(f.sma_20 - f.sma_50) / f.sma_50;

      if (adx > 30 && distanceToSMA > 0.01) {
        selected.push({ features: f, label: labels[i] });
      }
    }

    return {
      features: selected.map(s => s.features),
      labels: selected.map(s => s.label),
    };
  }

  private selectRangingData(
    features: FeatureVector[],
    labels: number[]
  ): { features: FeatureVector[]; labels: number[] } {
    // Select samples where price is ranging
    const selected: { features: FeatureVector; label: number }[] = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      // Ranging indicators: low ADX, RSI near extremes
      const adx = f.adx_14 || 0;
      const rsi = f.rsi_14 || 50;

      if (adx < 25 && (rsi > 70 || rsi < 30)) {
        selected.push({ features: f, label: labels[i] });
      }
    }

    return {
      features: selected.map(s => s.features),
      labels: selected.map(s => s.label),
    };
  }

  private selectBreakoutData(
    features: FeatureVector[],
    labels: number[]
  ): { features: FeatureVector[]; labels: number[] } {
    // Select samples near support/resistance
    const selected: { features: FeatureVector; label: number }[] = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      // Breakout indicators: price near S/R, volatility increasing
      const distToResistance = f.distance_to_resistance || 0;
      const distToSupport = f.distance_to_support || 0;
      const volatility = f.volatility_20 || 0;

      if ((distToResistance < 0.01 || distToSupport < 0.01) && volatility > 0.015) {
        selected.push({ features: f, label: labels[i] });
      }
    }

    return {
      features: selected.map(s => s.features),
      labels: selected.map(s => s.label),
    };
  }

  private getBestPerformingStrategy(
    votes: Map<StrategyType, { signal: string; confidence: number }>,
    targetSignal: string
  ): StrategyType {
    let best: StrategyType = 'TREND_FOLLOWER';
    let bestConfidence = 0;

    votes.forEach((vote, strategy) => {
      if (vote.signal === targetSignal && vote.confidence > bestConfidence) {
        best = strategy;
        bestConfidence = vote.confidence;
      }
    });

    return best;
  }

  private calculateAgreement(votes: Map<StrategyType, { signal: string; confidence: number }>, finalSignal: string): number {
    let agreementCount = 0;

    votes.forEach(vote => {
      if (vote.signal === finalSignal) {
        agreementCount++;
      }
    });

    return agreementCount / votes.size;
  }
}

/**
 * Ensemble Strategy Selector
 * 
 * Chooses which ensemble strategy to use based on market conditions
 */
export class EnsembleStrategySelector {
  /**
   * Get recommended ensemble strategy based on market regime
   */
  static selectStrategy(
    regime: string,
    volatility: number,
    trendStrength: number
  ): {
    primaryStrategy: StrategyType;
    weight: number;
    fallbackStrategy: StrategyType;
  } {
    if (regime === 'TRENDING' && trendStrength > 40) {
      return {
        primaryStrategy: 'TREND_FOLLOWER',
        weight: 0.6,
        fallbackStrategy: 'BREAKOUT_TRADER',
      };
    } else if (regime === 'RANGING') {
      return {
        primaryStrategy: 'MEAN_REVERTER',
        weight: 0.7,
        fallbackStrategy: 'BREAKOUT_TRADER',
      };
    } else if (regime === 'VOLATILE' || volatility > 0.03) {
      return {
        primaryStrategy: 'BREAKOUT_TRADER',
        weight: 0.5,
        fallbackStrategy: 'TREND_FOLLOWER',
      };
    } else {
      // QUIET - use balanced approach
      return {
        primaryStrategy: 'TREND_FOLLOWER',
        weight: 0.33,
        fallbackStrategy: 'MEAN_REVERTER',
      };
    }
  }
}
