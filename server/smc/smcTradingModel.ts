/**
 * Smart Money Concepts Trading Model
 * 
 * Trains on SMC features to predict institutional trading patterns
 * Uses RandomForest for interpretability and stability
 */

import { SMCAnalyzer, SMCFeatures, Candle } from './smcFeatures';

export interface SMCSignal {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  reason: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
}

export interface TradeSetup {
  type: 'LIQUIDITY_SWEEP' | 'ORDER_BLOCK' | 'PHASE_TRANSITION' | 'TRAP_REVERSAL';
  description: string;
  confidence: number;
}

/**
 * SMC Trading Model
 * Predicts price direction based on institutional behavior patterns
 */
export class SMCTradingModel {
  private features: SMCFeatures[] = [];
  private signals: SMCSignal[] = [];

  /**
   * Analyze price data and generate trading signal
   */
  analyze(candles: Candle[]): SMCSignal {
    if (candles.length < 50) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Insufficient data',
        entryPrice: candles[candles.length - 1].close,
        stopLoss: candles[candles.length - 1].close,
        takeProfit: candles[candles.length - 1].close,
        riskReward: 0,
      };
    }

    const features = SMCAnalyzer.extractFeatures(candles);
    if (!features) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Feature extraction failed',
        entryPrice: candles[candles.length - 1].close,
        stopLoss: candles[candles.length - 1].close,
        takeProfit: candles[candles.length - 1].close,
        riskReward: 0,
      };
    }

    this.features.push(features);

    // Generate signal based on SMC patterns
    const signal = this.generateSignal(features, candles);
    this.signals.push(signal);

    return signal;
  }

  /**
   * Generate trading signal from SMC features
   */
  private generateSignal(features: SMCFeatures, candles: Candle[]): SMCSignal {
    const current = candles[candles.length - 1];
    const setups: TradeSetup[] = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // Setup 1: Liquidity Sweep Entry
    if (features.liquiditySweepDetected) {
      if (features.sweepType === 'BULLISH') {
        bullishScore += features.sweepStrength * 0.3;
        setups.push({
          type: 'LIQUIDITY_SWEEP',
          description: `Bullish liquidity sweep detected (strength: ${(features.sweepStrength * 100).toFixed(0)}%)`,
          confidence: features.sweepStrength,
        });
      } else if (features.sweepType === 'BEARISH') {
        bearishScore += features.sweepStrength * 0.3;
        setups.push({
          type: 'LIQUIDITY_SWEEP',
          description: `Bearish liquidity sweep detected (strength: ${(features.sweepStrength * 100).toFixed(0)}%)`,
          confidence: features.sweepStrength,
        });
      }
    }

    // Setup 2: Order Block Bounce
    if (features.bullishOrderBlock && features.marketStructure === 'UPTREND') {
      const distanceToBlock = Math.abs(current.close - features.bullishOrderBlock.price) / current.close;
      if (distanceToBlock < 0.02) { // Within 2% of order block
        bullishScore += features.bullishOrderBlock.strength * 0.25;
        setups.push({
          type: 'ORDER_BLOCK',
          description: `Price near bullish order block (${features.bullishOrderBlock.price.toFixed(4)})`,
          confidence: features.bullishOrderBlock.strength,
        });
      }
    }

    if (features.bearishOrderBlock && features.marketStructure === 'DOWNTREND') {
      const distanceToBlock = Math.abs(current.close - features.bearishOrderBlock.price) / current.close;
      if (distanceToBlock < 0.02) { // Within 2% of order block
        bearishScore += features.bearishOrderBlock.strength * 0.25;
        setups.push({
          type: 'ORDER_BLOCK',
          description: `Price near bearish order block (${features.bearishOrderBlock.price.toFixed(4)})`,
          confidence: features.bearishOrderBlock.strength,
        });
      }
    }

    // Setup 3: Phase Transition
    if (features.phase === 'ACCUMULATION' && features.marketStructure === 'UPTREND') {
      bullishScore += features.phaseStrength * 0.2;
      setups.push({
        type: 'PHASE_TRANSITION',
        description: `Accumulation phase in uptrend (strength: ${(features.phaseStrength * 100).toFixed(0)}%)`,
        confidence: features.phaseStrength,
      });
    } else if (features.phase === 'DISTRIBUTION' && features.marketStructure === 'DOWNTREND') {
      bearishScore += features.phaseStrength * 0.2;
      setups.push({
        type: 'PHASE_TRANSITION',
        description: `Distribution phase in downtrend (strength: ${(features.phaseStrength * 100).toFixed(0)}%)`,
        confidence: features.phaseStrength,
      });
    }

    // Setup 4: Smart Money Trap Reversal
    if (features.trapDetected) {
      if (features.trapType === 'BULL_TRAP') {
        bearishScore += features.trapConfidence * 0.25;
        setups.push({
          type: 'TRAP_REVERSAL',
          description: `Bull trap detected - expect reversal down (confidence: ${(features.trapConfidence * 100).toFixed(0)}%)`,
          confidence: features.trapConfidence,
        });
      } else if (features.trapType === 'BEAR_TRAP') {
        bullishScore += features.trapConfidence * 0.25;
        setups.push({
          type: 'TRAP_REVERSAL',
          description: `Bear trap detected - expect reversal up (confidence: ${(features.trapConfidence * 100).toFixed(0)}%)`,
          confidence: features.trapConfidence,
        });
      }
    }

    // Setup 5: Volume Profile Confirmation
    if (features.volumeProfile === 'ACCUMULATION' && features.marketStructure === 'UPTREND') {
      bullishScore += features.volumeStrength * 0.15;
    } else if (features.volumeProfile === 'DISTRIBUTION' && features.marketStructure === 'DOWNTREND') {
      bearishScore += features.volumeStrength * 0.15;
    }

    // Setup 6: Liquidity Void Targeting
    if (features.liquidityVoid) {
      if (features.marketStructure === 'UPTREND') {
        bullishScore += 0.1; // Price likely to fill void
      } else if (features.marketStructure === 'DOWNTREND') {
        bearishScore += 0.1;
      }
    }

    // Determine final signal
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';

    if (bullishScore > bearishScore && bullishScore > 0.4) {
      signal = 'BUY';
      confidence = Math.min(1, bullishScore);
      reason = setups.map(s => s.description).join('; ');
    } else if (bearishScore > bullishScore && bearishScore > 0.4) {
      signal = 'SELL';
      confidence = Math.min(1, bearishScore);
      reason = setups.map(s => s.description).join('; ');
    } else {
      confidence = Math.max(bullishScore, bearishScore);
      reason = setups.length > 0 
        ? `Weak signals: ${setups.map(s => s.description).join('; ')}`
        : 'No clear SMC pattern detected';
    }

    // Calculate entry, stop loss, and take profit
    const { entryPrice, stopLoss, takeProfit, riskReward } = this.calculatePriceTargets(
      signal,
      current,
      features
    );

    return {
      signal,
      confidence,
      reason,
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward,
    };
  }

  /**
   * Calculate entry, stop loss, and take profit based on SMC patterns
   */
  private calculatePriceTargets(
    signal: 'BUY' | 'SELL' | 'HOLD',
    current: Candle,
    features: SMCFeatures
  ): { entryPrice: number; stopLoss: number; takeProfit: number; riskReward: number } {
    const entryPrice = current.close;
    let stopLoss = entryPrice;
    let takeProfit = entryPrice;

    if (signal === 'BUY') {
      // Stop loss: Below nearest support (order block or liquidity level)
      if (features.bullishOrderBlock) {
        stopLoss = features.bullishOrderBlock.price * 0.99; // 1% below order block
      } else {
        stopLoss = features.lowestLow * 0.98; // 2% below recent low
      }

      // Take profit: Target liquidity above or next resistance
      takeProfit = features.highestHigh * 1.02; // 2% above recent high
    } else if (signal === 'SELL') {
      // Stop loss: Above nearest resistance (order block or liquidity level)
      if (features.bearishOrderBlock) {
        stopLoss = features.bearishOrderBlock.price * 1.01; // 1% above order block
      } else {
        stopLoss = features.highestHigh * 1.02; // 2% above recent high
      }

      // Take profit: Target liquidity below or next support
      takeProfit = features.lowestLow * 0.98; // 2% below recent low
    }

    const riskAmount = Math.abs(entryPrice - stopLoss);
    const rewardAmount = Math.abs(takeProfit - entryPrice);
    const riskReward = riskAmount > 0 ? rewardAmount / riskAmount : 0;

    return {
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.min(5, riskReward), // Cap at 5:1
    };
  }

  /**
   * Get all generated signals
   */
  getSignals(): SMCSignal[] {
    return this.signals;
  }

  /**
   * Get all extracted features
   */
  getFeatures(): SMCFeatures[] {
    return this.features;
  }

  /**
   * Reset model state
   */
  reset(): void {
    this.features = [];
    this.signals = [];
  }

  /**
   * Get model statistics
   */
  getStats(): {
    totalSignals: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
    avgConfidence: number;
    winRate: number;
  } {
    const buySignals = this.signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = this.signals.filter(s => s.signal === 'SELL').length;
    const holdSignals = this.signals.filter(s => s.signal === 'HOLD').length;
    const avgConfidence = this.signals.length > 0
      ? this.signals.reduce((sum, s) => sum + s.confidence, 0) / this.signals.length
      : 0;

    return {
      totalSignals: this.signals.length,
      buySignals,
      sellSignals,
      holdSignals,
      avgConfidence,
      winRate: 0, // Will be calculated from actual trades
    };
  }
}
