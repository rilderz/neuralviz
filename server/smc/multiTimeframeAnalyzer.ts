/**
 * Multi-Timeframe Analysis System
 * 
 * Uses 1-hour timeframe for trend confirmation
 * Uses 15-minute timeframe for precise entries
 * 
 * Professional approach: Confirm direction on higher TF, enter on lower TF
 */

import { SMCAnalyzer, SMCFeatures, Candle } from './smcFeatures';

export interface TimeframeAnalysis {
  timeframe: '1H' | '15M';
  features: SMCFeatures;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-1
  reason: string;
}

export interface MultiTimeframeSignal {
  // 1-Hour analysis (direction confirmation)
  hourlyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  hourlyStrength: number;
  hourlyReason: string;

  // 15-Minute analysis (entry confirmation)
  fifteenMinTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  fifteenMinStrength: number;
  fifteenMinReason: string;

  // Combined signal
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;

  // Alignment
  timeframesAligned: boolean;
  alignmentStrength: number; // How well 1H and 15M agree
}

/**
 * Multi-Timeframe Analyzer
 * 
 * Strategy:
 * 1. Analyze 1H for trend direction (BULLISH/BEARISH/NEUTRAL)
 * 2. Analyze 15M for entry confirmation
 * 3. Only trade when both timeframes align
 * 4. Use 1H support/resistance for stops
 * 5. Use 15M order blocks for precise entries
 */
export class MultiTimeframeAnalyzer {
  /**
   * Analyze both timeframes and generate combined signal
   */
  static analyze(
    hourlyCandles: Candle[],
    fifteenMinCandles: Candle[]
  ): MultiTimeframeSignal {
    // Validate data
    if (hourlyCandles.length < 50 || fifteenMinCandles.length < 50) {
      return this.createHoldSignal('Insufficient data for analysis', hourlyCandles, fifteenMinCandles);
    }

    // Analyze 1-hour timeframe (trend confirmation)
    const hourlyAnalysis = this.analyzeTimeframe(hourlyCandles, '1H');
    if (!hourlyAnalysis) {
      return this.createHoldSignal('1H analysis failed', hourlyCandles, fifteenMinCandles);
    }

    // Analyze 15-minute timeframe (entry confirmation)
    const fifteenMinAnalysis = this.analyzeTimeframe(fifteenMinCandles, '15M');
    if (!fifteenMinAnalysis) {
      return this.createHoldSignal('15M analysis failed', hourlyCandles, fifteenMinCandles);
    }

    // Check alignment between timeframes
    const aligned = hourlyAnalysis.trend === fifteenMinAnalysis.trend;
    const alignmentStrength = this.calculateAlignment(hourlyAnalysis, fifteenMinAnalysis);

    // Generate combined signal
    const signal = this.generateCombinedSignal(
      hourlyAnalysis,
      fifteenMinAnalysis,
      aligned,
      hourlyCandles,
      fifteenMinCandles
    );

    return {
      hourlyTrend: hourlyAnalysis.trend,
      hourlyStrength: hourlyAnalysis.strength,
      hourlyReason: hourlyAnalysis.reason,
      fifteenMinTrend: fifteenMinAnalysis.trend,
      fifteenMinStrength: fifteenMinAnalysis.strength,
      fifteenMinReason: fifteenMinAnalysis.reason,
      signal,
      confidence: aligned ? Math.min(1, hourlyAnalysis.strength * fifteenMinAnalysis.strength) : 0,
      entryPrice: fifteenMinCandles[fifteenMinCandles.length - 1].close,
      stopLoss: this.calculateStopLoss(signal, hourlyAnalysis, fifteenMinAnalysis, hourlyCandles, fifteenMinCandles),
      takeProfit: this.calculateTakeProfit(signal, hourlyAnalysis, fifteenMinAnalysis, hourlyCandles, fifteenMinCandles),
      riskReward: 0, // Calculated below
      timeframesAligned: aligned,
      alignmentStrength,
    };
  }

  /**
   * Analyze single timeframe
   */
  private static analyzeTimeframe(
    candles: Candle[],
    timeframe: '1H' | '15M'
  ): TimeframeAnalysis | null {
    const features = SMCAnalyzer.extractFeatures(candles);
    if (!features) return null;

    const trend = this.determineTrend(features);
    const strength = this.calculateTrendStrength(features);
    const reason = this.generateReason(features, timeframe);

    return {
      timeframe,
      features,
      trend,
      strength,
      reason,
    };
  }

  /**
   * Determine trend from SMC features
   */
  private static determineTrend(features: SMCFeatures): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    let bullishScore = 0;
    let bearishScore = 0;

    // Market structure
    if (features.marketStructure === 'UPTREND') bullishScore += 2;
    else if (features.marketStructure === 'DOWNTREND') bearishScore += 2;

    // Phase
    if (features.phase === 'ACCUMULATION') bullishScore += 1;
    else if (features.phase === 'DISTRIBUTION') bearishScore += 1;
    else if (features.phase === 'MARKUP') bullishScore += 1.5;

    // Volume profile
    if (features.volumeProfile === 'ACCUMULATION') bullishScore += 1;
    else if (features.volumeProfile === 'DISTRIBUTION') bearishScore += 1;

    // Order blocks
    if (features.bullishOrderBlock && features.bullishOrderBlock.strength > 0.5) bullishScore += 1;
    if (features.bearishOrderBlock && features.bearishOrderBlock.strength > 0.5) bearishScore += 1;

    // Liquidity
    if (features.buyerLiquidity > features.sellerLiquidity) bullishScore += 0.5;
    else if (features.sellerLiquidity > features.buyerLiquidity) bearishScore += 0.5;

    // Traps (reversal signals)
    if (features.trapType === 'BEAR_TRAP') bullishScore += 1.5;
    else if (features.trapType === 'BULL_TRAP') bearishScore += 1.5;

    if (bullishScore > bearishScore + 1) return 'BULLISH';
    if (bearishScore > bullishScore + 1) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Calculate trend strength (0-1)
   */
  private static calculateTrendStrength(features: SMCFeatures): number {
    let strength = 0;

    // Market structure strength
    if (features.marketStructure !== 'RANGE') strength += 0.3;

    // Phase strength
    strength += features.phaseStrength * 0.2;

    // Volume strength
    strength += features.volumeStrength * 0.2;

    // Order block strength
    const maxOrderBlockStrength = Math.max(
      features.bullishOrderBlock?.strength ?? 0,
      features.bearishOrderBlock?.strength ?? 0
    );
    strength += maxOrderBlockStrength * 0.15;

    // Trap confidence
    if (features.trapDetected) strength += features.trapConfidence * 0.15;

    return Math.min(1, strength);
  }

  /**
   * Generate reason for trend determination
   */
  private static generateReason(features: SMCFeatures, timeframe: '1H' | '15M'): string {
    const reasons: string[] = [];

    if (features.marketStructure === 'UPTREND') reasons.push('Uptrend structure');
    else if (features.marketStructure === 'DOWNTREND') reasons.push('Downtrend structure');

    if (features.phase === 'ACCUMULATION') reasons.push('Accumulation phase');
    else if (features.phase === 'MARKUP') reasons.push('Markup phase');
    else if (features.phase === 'DISTRIBUTION') reasons.push('Distribution phase');

    if (features.volumeProfile === 'ACCUMULATION') reasons.push('Accumulation volume');
    else if (features.volumeProfile === 'DISTRIBUTION') reasons.push('Distribution volume');

    if (features.bullishOrderBlock) reasons.push(`Bullish OB (${features.bullishOrderBlock.price.toFixed(4)})`);
    if (features.bearishOrderBlock) reasons.push(`Bearish OB (${features.bearishOrderBlock.price.toFixed(4)})`);

    if (features.trapDetected) {
      reasons.push(`${features.trapType === 'BULL_TRAP' ? 'Bull' : 'Bear'} trap`);
    }

    return reasons.join(' | ') || 'Mixed signals';
  }

  /**
   * Calculate alignment between 1H and 15M
   */
  private static calculateAlignment(hourly: TimeframeAnalysis, fifteenMin: TimeframeAnalysis): number {
    if (hourly.trend === fifteenMin.trend) {
      return Math.min(hourly.strength, fifteenMin.strength);
    }
    return 0;
  }

  /**
   * Generate combined signal from both timeframes
   * 
   * Rules:
   * 1. Only trade when 1H and 15M align
   * 2. Use 1H trend for direction
   * 3. Use 15M for entry timing
   * 4. Require minimum confidence on both timeframes
   */
  private static generateCombinedSignal(
    hourly: TimeframeAnalysis,
    fifteenMin: TimeframeAnalysis,
    aligned: boolean,
    hourlyCandles: Candle[],
    fifteenMinCandles: Candle[]
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Require alignment
    if (!aligned) return 'HOLD';

    // Require minimum strength on both timeframes
    if (hourly.strength < 0.4 || fifteenMin.strength < 0.4) return 'HOLD';

    // Generate signal based on aligned trend
    if (hourly.trend === 'BULLISH' && fifteenMin.trend === 'BULLISH') {
      // Additional confirmation: Check for liquidity sweep or order block on 15M
      if (fifteenMin.features.liquiditySweepDetected && fifteenMin.features.sweepType === 'BULLISH') {
        return 'BUY';
      }
      if (fifteenMin.features.bullishOrderBlock) {
        return 'BUY';
      }
      if (fifteenMin.features.trapType === 'BEAR_TRAP') {
        return 'BUY';
      }
      // Weak bullish alignment
      return 'HOLD';
    }

    if (hourly.trend === 'BEARISH' && fifteenMin.trend === 'BEARISH') {
      // Additional confirmation: Check for liquidity sweep or order block on 15M
      if (fifteenMin.features.liquiditySweepDetected && fifteenMin.features.sweepType === 'BEARISH') {
        return 'SELL';
      }
      if (fifteenMin.features.bearishOrderBlock) {
        return 'SELL';
      }
      if (fifteenMin.features.trapType === 'BULL_TRAP') {
        return 'SELL';
      }
      // Weak bearish alignment
      return 'HOLD';
    }

    return 'HOLD';
  }

  /**
   * Calculate stop loss using 1H support/resistance
   */
  private static calculateStopLoss(
    signal: 'BUY' | 'SELL' | 'HOLD',
    hourly: TimeframeAnalysis,
    fifteenMin: TimeframeAnalysis,
    hourlyCandles: Candle[],
    fifteenMinCandles: Candle[]
  ): number {
    const current15M = fifteenMinCandles[fifteenMinCandles.length - 1];

    if (signal === 'BUY') {
      // Stop below 1H order block or recent low
      if (hourly.features.bullishOrderBlock) {
        return hourly.features.bullishOrderBlock.price * 0.99;
      }
      // Stop below 1H lowest low (with buffer)
      return hourly.features.lowestLow * 0.98;
    } else if (signal === 'SELL') {
      // Stop above 1H order block or recent high
      if (hourly.features.bearishOrderBlock) {
        return hourly.features.bearishOrderBlock.price * 1.01;
      }
      // Stop above 1H highest high (with buffer)
      return hourly.features.highestHigh * 1.02;
    }

    return current15M.close;
  }

  /**
   * Calculate take profit using 1H liquidity levels
   */
  private static calculateTakeProfit(
    signal: 'BUY' | 'SELL' | 'HOLD',
    hourly: TimeframeAnalysis,
    fifteenMin: TimeframeAnalysis,
    hourlyCandles: Candle[],
    fifteenMinCandles: Candle[]
  ): number {
    const current15M = fifteenMinCandles[fifteenMinCandles.length - 1];

    if (signal === 'BUY') {
      // Target 1H resistance or liquidity void
      if (hourly.features.liquidityVoid) {
        return hourly.features.highestHigh * 1.02;
      }
      // Target next resistance
      return hourly.features.highestHigh * 1.015;
    } else if (signal === 'SELL') {
      // Target 1H support or liquidity void
      if (hourly.features.liquidityVoid) {
        return hourly.features.lowestLow * 0.98;
      }
      // Target next support
      return hourly.features.lowestLow * 0.985;
    }

    return current15M.close;
  }

  /**
   * Create hold signal
   */
  private static createHoldSignal(
    reason: string,
    hourlyCandles: Candle[],
    fifteenMinCandles: Candle[]
  ): MultiTimeframeSignal {
    const current15M = fifteenMinCandles[fifteenMinCandles.length - 1];
    return {
      hourlyTrend: 'NEUTRAL',
      hourlyStrength: 0,
      hourlyReason: reason,
      fifteenMinTrend: 'NEUTRAL',
      fifteenMinStrength: 0,
      fifteenMinReason: reason,
      signal: 'HOLD',
      confidence: 0,
      entryPrice: current15M.close,
      stopLoss: current15M.close,
      takeProfit: current15M.close,
      riskReward: 0,
      timeframesAligned: false,
      alignmentStrength: 0,
    };
  }

  /**
   * Get signal statistics
   */
  static getSignalQuality(signal: MultiTimeframeSignal): {
    isValid: boolean;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    if (!signal.timeframesAligned) {
      reasons.push('Timeframes not aligned');
      return { isValid: false, quality, reasons };
    }

    if (signal.confidence < 0.4) {
      reasons.push('Low confidence');
      return { isValid: false, quality, reasons };
    }

    if (signal.riskReward < 1.5) {
      reasons.push('Poor risk/reward');
      return { isValid: false, quality, reasons };
    }

    if (signal.confidence >= 0.7 && signal.riskReward >= 2) {
      quality = 'HIGH';
      reasons.push('Strong alignment, good risk/reward');
    } else if (signal.confidence >= 0.5 && signal.riskReward >= 1.5) {
      quality = 'MEDIUM';
      reasons.push('Moderate alignment, acceptable risk/reward');
    }

    return { isValid: signal.signal !== 'HOLD', quality, reasons };
  }
}
