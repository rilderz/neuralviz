/**
 * Technical Analysis Module
 * 
 * Analyzes price patterns, technical indicators, and chart formations
 */

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: number; // 0 to 1, where 0 is at lower band, 1 is at upper band
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
  atr: number;
  adx: number;
  stochastic: {
    k: number;
    d: number;
  };
  obv: number;
}

export interface ChartPattern {
  name: string;
  confidence: number; // 0 to 1
  bullish: boolean;
  type: 'SUPPORT_RESISTANCE' | 'TREND' | 'REVERSAL' | 'CONTINUATION';
}

export interface TechnicalScore {
  trendStrength: number; // -1 to 1
  momentumScore: number; // -1 to 1
  volatilityScore: number; // 0 to 1
  patternScore: number; // -1 to 1
  overallScore: number; // -1 to 1
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

/**
 * Technical Analysis Engine
 */
export class TechnicalAnalyzer {
  /**
   * Calculate all technical indicators
   */
  calculateIndicators(prices: number[]): TechnicalIndicators {
    if (prices.length < 50) {
      throw new Error('Need at least 50 price points for technical analysis');
    }

    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const bollingerBands = this.calculateBollingerBands(prices);
    const movingAverages = this.calculateMovingAverages(prices);
    const atr = this.calculateATR(prices);
    const adx = this.calculateADX(prices);
    const stochastic = this.calculateStochastic(prices);
    const obv = this.calculateOBV(prices);

    return {
      rsi,
      macd,
      bollingerBands,
      movingAverages,
      atr,
      adx,
      stochastic,
      obv,
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: number[]): number {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    return ema12 - ema26;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): TechnicalIndicators['bollingerBands'] {
    const sma = this.calculateSMA(prices, period);
    const variance =
      prices.slice(-period).reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    const upper = sma + std * stdDev;
    const lower = sma - std * stdDev;
    const currentPrice = prices[prices.length - 1];
    const position = (currentPrice - lower) / (upper - lower);

    return {
      upper,
      middle: sma,
      lower,
      position: Math.max(0, Math.min(1, position)),
    };
  }

  /**
   * Calculate Moving Averages
   */
  private calculateMovingAverages(prices: number[]): TechnicalIndicators['movingAverages'] {
    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
    };
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / slice.length;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(prices: number[], period: number = 14): number {
    let trueRanges = 0;

    for (let i = Math.max(1, prices.length - period); i < prices.length; i++) {
      const high = prices[i];
      const low = prices[i - 1];
      const tr = Math.abs(high - low);
      trueRanges += tr;
    }

    return trueRanges / Math.min(period, prices.length - 1);
  }

  /**
   * Calculate ADX (Average Directional Index)
   */
  private calculateADX(prices: number[], period: number = 14): number {
    // Simplified ADX calculation
    let upMoves = 0;
    let downMoves = 0;

    for (let i = Math.max(1, prices.length - period); i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) upMoves += change;
      else downMoves += Math.abs(change);
    }

    const totalMoves = upMoves + downMoves;
    if (totalMoves === 0) return 50;

    return (upMoves / totalMoves) * 100;
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(prices: number[], period: number = 14): TechnicalIndicators['stochastic'] {
    const slice = prices.slice(-period);
    const lowest = Math.min(...slice);
    const highest = Math.max(...slice);
    const currentPrice = prices[prices.length - 1];

    const k = ((currentPrice - lowest) / (highest - lowest)) * 100;
    const d = this.calculateSMA(prices.slice(-3).map(() => k), 3);

    return { k, d };
  }

  /**
   * Calculate OBV (On-Balance Volume)
   */
  private calculateOBV(prices: number[]): number {
    let obv = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        obv += 1;
      } else if (prices[i] < prices[i - 1]) {
        obv -= 1;
      }
    }

    return obv;
  }

  /**
   * Detect chart patterns
   */
  detectPatterns(prices: number[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];

    // Detect support/resistance
    const supportResistance = this.detectSupportResistance(prices);
    if (supportResistance) patterns.push(supportResistance);

    // Detect trends
    const trend = this.detectTrend(prices);
    if (trend) patterns.push(trend);

    // Detect reversals
    const reversal = this.detectReversal(prices);
    if (reversal) patterns.push(reversal);

    return patterns;
  }

  /**
   * Detect support/resistance levels
   */
  private detectSupportResistance(prices: number[]): ChartPattern | null {
    const recentPrices = prices.slice(-20);
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);
    const current = prices[prices.length - 1];

    const distToMin = Math.abs(current - min) / min;
    const distToMax = Math.abs(current - max) / max;

    if (distToMin < 0.01) {
      return {
        name: 'Support Level',
        confidence: 0.8,
        bullish: true,
        type: 'SUPPORT_RESISTANCE',
      };
    }

    if (distToMax < 0.01) {
      return {
        name: 'Resistance Level',
        confidence: 0.8,
        bullish: false,
        type: 'SUPPORT_RESISTANCE',
      };
    }

    return null;
  }

  /**
   * Detect trend direction
   */
  private detectTrend(prices: number[]): ChartPattern | null {
    const recentPrices = prices.slice(-20);
    const firstHalf = recentPrices.slice(0, 10);
    const secondHalf = recentPrices.slice(10);

    const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const trendStrength = Math.abs(secondAvg - firstAvg) / firstAvg;

    if (trendStrength > 0.02) {
      return {
        name: secondAvg > firstAvg ? 'Uptrend' : 'Downtrend',
        confidence: Math.min(0.9, trendStrength * 10),
        bullish: secondAvg > firstAvg,
        type: 'TREND',
      };
    }

    return null;
  }

  /**
   * Detect reversal patterns
   */
  private detectReversal(prices: number[]): ChartPattern | null {
    const recentPrices = prices.slice(-5);

    // Check for hammer/inverted hammer
    if (recentPrices.length >= 3) {
      const lastThree = recentPrices.slice(-3);
      const isHammer =
        lastThree[1] < lastThree[0] && lastThree[2] > lastThree[0] && lastThree[2] > lastThree[1];
      const isInvertedHammer =
        lastThree[1] > lastThree[0] && lastThree[2] < lastThree[0] && lastThree[2] < lastThree[1];

      if (isHammer || isInvertedHammer) {
        return {
          name: isHammer ? 'Hammer' : 'Inverted Hammer',
          confidence: 0.7,
          bullish: isHammer,
          type: 'REVERSAL',
        };
      }
    }

    return null;
  }

  /**
   * Calculate overall technical score
   */
  calculateTechnicalScore(indicators: TechnicalIndicators): TechnicalScore {
    // Trend strength from moving averages
    const maDiff = indicators.movingAverages.ema12 - indicators.movingAverages.ema26;
    const trendStrength = Math.tanh(maDiff * 100) * 0.5;

    // Momentum from RSI and MACD
    const rsiMomentum = (indicators.rsi - 50) / 50;
    const macdMomentum = Math.tanh(indicators.macd * 100) * 0.5;
    const momentumScore = (rsiMomentum + macdMomentum) / 2;

    // Volatility from ATR and Bollinger Bands
    const volatilityScore = indicators.bollingerBands.position;

    // Pattern score from Stochastic
    const stochasticScore = (indicators.stochastic.k - 50) / 50;
    const patternScore = stochasticScore * 0.5;

    // Overall score
    const overallScore =
      trendStrength * 0.35 + momentumScore * 0.35 + patternScore * 0.2 + (volatilityScore - 0.5) * 0.1;

    // Generate recommendation
    let recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD';
    if (overallScore > 0.6) recommendation = 'STRONG_BUY';
    else if (overallScore > 0.3) recommendation = 'BUY';
    else if (overallScore < -0.6) recommendation = 'STRONG_SELL';
    else if (overallScore < -0.3) recommendation = 'SELL';

    return {
      trendStrength,
      momentumScore,
      volatilityScore,
      patternScore,
      overallScore,
      recommendation,
    };
  }
}
