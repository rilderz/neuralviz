/**
 * Market Regime Detector
 * 
 * Identifies current market condition:
 * - TRENDING (strong directional move)
 * - RANGING (consolidation, mean-reversion)
 * - VOLATILE (high uncertainty)
 * - QUIET (low activity)
 * 
 * Different strategies work better in different regimes
 */

import { OHLCV } from './featureEngineering';

export type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number; // 0-1
  trendStrength: number; // ADX-like, 0-100
  volatility: number; // 0-1
  rangeWidth: number; // % of price
  recommendedStrategy: string;
  riskAdjustment: number; // 1.0 = normal, 0.5 = reduce risk
}

/**
 * Regime Detection Engine
 */
export class RegimeDetector {
  /**
   * Detect current market regime
   */
  static analyzeRegime(candles: OHLCV[], lookbackPeriod: number = 100): RegimeAnalysis {
    if (candles.length < lookbackPeriod) {
      return {
        regime: 'QUIET',
        confidence: 0.5,
        trendStrength: 0,
        volatility: 0,
        rangeWidth: 0,
        recommendedStrategy: 'HOLD',
        riskAdjustment: 1.0,
      };
    }

    const recentCandles = candles.slice(-lookbackPeriod);

    // Calculate metrics
    const adx = this.calculateADX(recentCandles);
    const volatility = this.calculateVolatility(recentCandles);
    const rangeWidth = this.calculateRangeWidth(recentCandles);
    const trend = this.calculateTrend(recentCandles);

    // Determine regime
    let regime: MarketRegime;
    let confidence: number;
    let recommendedStrategy: string;
    let riskAdjustment: number;

    if (adx > 40 && volatility > 0.02) {
      // Strong trend with high volatility
      regime = 'TRENDING';
      confidence = Math.min(1, (adx - 40) / 30); // 40-70 → 0-1
      recommendedStrategy = trend > 0 ? 'TREND_FOLLOWING' : 'TREND_FOLLOWING_SHORT';
      riskAdjustment = 1.0; // Normal risk
    } else if (adx < 25 && volatility < 0.015) {
      // Weak trend, low volatility
      regime = 'RANGING';
      confidence = Math.min(1, (25 - adx) / 25); // 0-25 → 1-0
      recommendedStrategy = 'MEAN_REVERSION';
      riskAdjustment = 0.8; // Slightly reduce risk
    } else if (volatility > 0.03) {
      // High volatility
      regime = 'VOLATILE';
      confidence = Math.min(1, volatility / 0.05);
      recommendedStrategy = 'BREAKOUT';
      riskAdjustment = 0.5; // Reduce risk significantly
    } else {
      // Low activity
      regime = 'QUIET';
      confidence = 0.5;
      recommendedStrategy = 'HOLD';
      riskAdjustment = 0.3; // Minimal risk
    }

    return {
      regime,
      confidence,
      trendStrength: adx,
      volatility,
      rangeWidth,
      recommendedStrategy,
      riskAdjustment,
    };
  }

  /**
   * Calculate ADX (Average Directional Index) - trend strength
   * Range: 0-100
   * 0-25: weak trend
   * 25-40: moderate trend
   * 40-60: strong trend
   * 60+: very strong trend
   */
  private static calculateADX(candles: OHLCV[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    let upMoves = 0;
    let downMoves = 0;
    let trueRanges = 0;

    for (let i = candles.length - period; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      // True Range
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges += tr;

      // Directional Movement
      const upMove = high - candles[i - 1].high;
      const downMove = candles[i - 1].low - low;

      if (upMove > downMove && upMove > 0) {
        upMoves += upMove;
      } else if (downMove > upMove && downMove > 0) {
        downMoves += downMove;
      }
    }

    const atr = trueRanges / period;
    const diPlus = (upMoves / atr) * 100;
    const diMinus = (downMoves / atr) * 100;
    const di = Math.abs(diPlus - diMinus) / (diPlus + diMinus || 1);

    return di * 100;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   * Range: 0-1 (higher = more volatile)
   */
  private static calculateVolatility(candles: OHLCV[], period: number = 20): number {
    if (candles.length < period) return 0;

    const returns: number[] = [];
    for (let i = candles.length - period; i < candles.length; i++) {
      const ret = Math.log(candles[i].close / candles[i - 1].close);
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return Math.min(1, stdDev * 10); // Normalize to 0-1
  }

  /**
   * Calculate range width as % of price
   */
  private static calculateRangeWidth(candles: OHLCV[], period: number = 20): number {
    if (candles.length < period) return 0;

    const slice = candles.slice(-period);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const current = candles[candles.length - 1].close;

    return ((high - low) / current) * 100;
  }

  /**
   * Calculate trend direction
   * Returns: 1 (uptrend), -1 (downtrend), 0 (no clear trend)
   */
  private static calculateTrend(candles: OHLCV[], period: number = 50): number {
    if (candles.length < period) return 0;

    const sma = candles
      .slice(-period)
      .reduce((sum, c) => sum + c.close, 0) / period;

    const current = candles[candles.length - 1].close;

    if (current > sma * 1.01) return 1; // Uptrend
    if (current < sma * 0.99) return -1; // Downtrend
    return 0; // No clear trend
  }

  /**
   * Get strategy recommendation based on regime
   */
  static getStrategyRecommendation(regime: RegimeAnalysis): {
    strategy: string;
    parameters: Record<string, number>;
    riskMultiplier: number;
  } {
    switch (regime.regime) {
      case 'TRENDING':
        return {
          strategy: 'TREND_FOLLOWING',
          parameters: {
            stopLossPips: 50,
            takeProfitPips: 150, // 3:1 ratio in trending
            maxTradesPerDay: 10,
            minConfidence: 0.60,
          },
          riskMultiplier: 1.0,
        };

      case 'RANGING':
        return {
          strategy: 'MEAN_REVERSION',
          parameters: {
            stopLossPips: 40,
            takeProfitPips: 60, // 1.5:1 ratio in ranging
            maxTradesPerDay: 15, // More trades in ranging
            minConfidence: 0.65,
          },
          riskMultiplier: 0.8,
        };

      case 'VOLATILE':
        return {
          strategy: 'BREAKOUT',
          parameters: {
            stopLossPips: 60,
            takeProfitPips: 100, // 1.67:1 ratio
            maxTradesPerDay: 5, // Fewer trades in volatile
            minConfidence: 0.70,
          },
          riskMultiplier: 0.5,
        };

      case 'QUIET':
      default:
        return {
          strategy: 'HOLD',
          parameters: {
            stopLossPips: 30,
            takeProfitPips: 50,
            maxTradesPerDay: 0,
            minConfidence: 0.80,
          },
          riskMultiplier: 0.3,
        };
    }
  }

  /**
   * Detect regime changes (important for adaptation)
   */
  static detectRegimeChange(
    previousRegime: MarketRegime,
    currentRegime: MarketRegime
  ): { changed: boolean; severity: 'low' | 'medium' | 'high' } {
    if (previousRegime === currentRegime) {
      return { changed: false, severity: 'low' };
    }

    // Regime changes have different severity
    const severity: Record<string, 'low' | 'medium' | 'high'> = {
      'QUIET_RANGING': 'low',
      'QUIET_TRENDING': 'medium',
      'QUIET_VOLATILE': 'high',
      'RANGING_TRENDING': 'medium',
      'RANGING_VOLATILE': 'high',
      'TRENDING_VOLATILE': 'high',
      'VOLATILE_QUIET': 'high',
    };

    const key = `${previousRegime}_${currentRegime}`;
    const sev = severity[key] || 'medium';

    return { changed: true, severity: sev };
  }
}
