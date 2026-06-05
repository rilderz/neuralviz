/**
 * Feature Engineering Module
 * 
 * Extracts 30-40 engineered features from OHLCV data
 * These features are the real edge - not raw price data
 */

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FeatureVector {
  // Price Action Features
  returns_1: number;
  returns_5: number;
  returns_15: number;
  volatility_20: number;
  high_low_range: number;
  close_open_range: number;
  
  // Momentum Indicators
  rsi_14: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  stochastic_k: number;
  stochastic_d: number;
  roc_12: number;
  
  // Trend Indicators
  sma_20: number;
  sma_50: number;
  sma_200: number;
  ema_12: number;
  ema_26: number;
  adx_14: number;
  sma_20_slope: number;
  sma_50_slope: number;
  
  // Volatility Indicators
  bb_upper: number;
  bb_lower: number;
  bb_width: number;
  bb_position: number;
  atr_14: number;
  historical_volatility: number;
  
  // Support/Resistance
  pivot_point: number;
  distance_to_pivot: number;
  recent_high: number;
  recent_low: number;
  distance_to_resistance: number;
  distance_to_support: number;
  
  // Volume Features
  volume_ratio: number;
  obv: number;
  
  // Price Position
  price_position_in_range: number;
  
  // Timestamp
  hour_of_day: number;
  day_of_week: number;
}

/**
 * Feature Engineering Engine
 */
export class FeatureEngineer {
  /**
   * Extract all features from OHLCV data
   */
  static extractFeatures(candles: OHLCV[], currentIndex: number): FeatureVector | null {
    if (currentIndex < 200) {
      // Need at least 200 candles for SMA200
      return null;
    }

    const current = candles[currentIndex];
    const recentCandles = candles.slice(Math.max(0, currentIndex - 200), currentIndex + 1);

    return {
      // Price Action Features
      returns_1: this.calculateReturns(candles, currentIndex, 1),
      returns_5: this.calculateReturns(candles, currentIndex, 5),
      returns_15: this.calculateReturns(candles, currentIndex, 15),
      volatility_20: this.calculateVolatility(candles, currentIndex, 20),
      high_low_range: (current.high - current.low) / current.close,
      close_open_range: (current.close - current.open) / current.close,

      // Momentum Indicators
      rsi_14: this.calculateRSI(candles, currentIndex, 14),
      macd: this.calculateMACD(candles, currentIndex).macd,
      macd_signal: this.calculateMACD(candles, currentIndex).signal,
      macd_histogram: this.calculateMACD(candles, currentIndex).histogram,
      stochastic_k: this.calculateStochastic(candles, currentIndex, 14).k,
      stochastic_d: this.calculateStochastic(candles, currentIndex, 14).d,
      roc_12: this.calculateROC(candles, currentIndex, 12),

      // Trend Indicators
      sma_20: this.calculateSMA(candles, currentIndex, 20),
      sma_50: this.calculateSMA(candles, currentIndex, 50),
      sma_200: this.calculateSMA(candles, currentIndex, 200),
      ema_12: this.calculateEMA(candles, currentIndex, 12),
      ema_26: this.calculateEMA(candles, currentIndex, 26),
      adx_14: this.calculateADX(candles, currentIndex, 14),
      sma_20_slope: this.calculateSlope(candles, currentIndex, 20),
      sma_50_slope: this.calculateSlope(candles, currentIndex, 50),

      // Volatility Indicators
      bb_upper: this.calculateBollingerBands(candles, currentIndex, 20).upper,
      bb_lower: this.calculateBollingerBands(candles, currentIndex, 20).lower,
      bb_width: this.calculateBollingerBands(candles, currentIndex, 20).width,
      bb_position: this.calculateBollingerBands(candles, currentIndex, 20).position,
      atr_14: this.calculateATR(candles, currentIndex, 14),
      historical_volatility: this.calculateHistoricalVolatility(candles, currentIndex, 20),

      // Support/Resistance
      pivot_point: this.calculatePivotPoint(candles, currentIndex),
      distance_to_pivot: this.calculateDistanceToPivot(candles, currentIndex),
      recent_high: this.calculateRecentHigh(candles, currentIndex, 20),
      recent_low: this.calculateRecentLow(candles, currentIndex, 20),
      distance_to_resistance: this.calculateDistanceToResistance(candles, currentIndex),
      distance_to_support: this.calculateDistanceToSupport(candles, currentIndex),

      // Volume Features
      volume_ratio: this.calculateVolumeRatio(candles, currentIndex, 20),
      obv: this.calculateOBV(candles, currentIndex),

      // Price Position
      price_position_in_range: this.calculatePricePositionInRange(candles, currentIndex, 20),

      // Timestamp
      hour_of_day: current.timestamp.getHours(),
      day_of_week: current.timestamp.getDay(),
    };
  }

  // ==================== PRICE ACTION ====================

  private static calculateReturns(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 0;
    const current = candles[index].close;
    const previous = candles[index - period].close;
    return Math.log(current / previous);
  }

  private static calculateVolatility(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 0;
    const returns = [];
    for (let i = index - period + 1; i <= index; i++) {
      returns.push(this.calculateReturns(candles, i, 1));
    }
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  // ==================== MOMENTUM ====================

  private static calculateRSI(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = index - period + 1; i <= index; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private static calculateMACD(candles: OHLCV[], index: number) {
    const ema12 = this.calculateEMA(candles, index, 12);
    const ema26 = this.calculateEMA(candles, index, 26);
    const macd = ema12 - ema26;

    // Signal line (9-period EMA of MACD)
    let signal = 0;
    if (index >= 26 + 9) {
      const macdValues = [];
      for (let i = index - 9 + 1; i <= index; i++) {
        const e12 = this.calculateEMA(candles, i, 12);
        const e26 = this.calculateEMA(candles, i, 26);
        macdValues.push(e12 - e26);
      }
      signal = this.calculateEMA(macdValues.map((v, i) => ({ close: v } as OHLCV)), macdValues.length - 1, 9);
    }

    return {
      macd,
      signal,
      histogram: macd - signal,
    };
  }

  private static calculateStochastic(candles: OHLCV[], index: number, period: number) {
    if (index < period) return { k: 50, d: 50 };

    const slice = candles.slice(index - period + 1, index + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));

    const k = ((candles[index].close - lowest) / (highest - lowest)) * 100;

    // D is 3-period SMA of K
    let d = k;
    if (index >= period + 2) {
      const kValues = [];
      for (let i = index - 2; i <= index; i++) {
        const s = candles.slice(i - period + 1, i + 1);
        const h = Math.max(...s.map(c => c.high));
        const l = Math.min(...s.map(c => c.low));
        kValues.push(((candles[i].close - l) / (h - l)) * 100);
      }
      d = kValues.reduce((a, b) => a + b) / 3;
    }

    return { k, d };
  }

  private static calculateROC(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 0;
    const current = candles[index].close;
    const previous = candles[index - period].close;
    return ((current - previous) / previous) * 100;
  }

  // ==================== TREND ====================

  private static calculateSMA(candles: OHLCV[], index: number, period: number): number {
    if (index < period - 1) return candles[index].close;
    const slice = candles.slice(index - period + 1, index + 1);
    return slice.reduce((sum, c) => sum + c.close, 0) / slice.length;
  }

  private static calculateEMA(candles: OHLCV[], index: number, period: number): number {
    if (index < period - 1) return candles[index].close;

    const k = 2 / (period + 1);
    let ema = candles[0].close;

    for (let i = 1; i <= index; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }

    return ema;
  }

  private static calculateADX(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 50;

    let upMoves = 0;
    let downMoves = 0;

    for (let i = index - period + 1; i <= index; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) upMoves += change;
      else downMoves += Math.abs(change);
    }

    const totalMoves = upMoves + downMoves;
    if (totalMoves === 0) return 50;

    return (upMoves / totalMoves) * 100;
  }

  private static calculateSlope(candles: OHLCV[], index: number, period: number): number {
    const sma = this.calculateSMA(candles, index, period);
    const smaPrev = this.calculateSMA(candles, Math.max(0, index - 1), period);
    return sma - smaPrev;
  }

  // ==================== VOLATILITY ====================

  private static calculateBollingerBands(candles: OHLCV[], index: number, period: number) {
    const sma = this.calculateSMA(candles, index, period);
    const slice = candles.slice(Math.max(0, index - period + 1), index + 1);
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - sma, 2), 0) / slice.length;
    const std = Math.sqrt(variance);

    const upper = sma + std * 2;
    const lower = sma - std * 2;
    const width = upper - lower;
    const position = (candles[index].close - lower) / width;

    return {
      upper,
      lower,
      width,
      position: Math.max(0, Math.min(1, position)),
    };
  }

  private static calculateATR(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 0;

    let trueRanges = 0;
    for (let i = index - period + 1; i <= index; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges += tr;
    }

    return trueRanges / period;
  }

  private static calculateHistoricalVolatility(candles: OHLCV[], index: number, period: number): number {
    return this.calculateVolatility(candles, index, period);
  }

  // ==================== SUPPORT/RESISTANCE ====================

  private static calculatePivotPoint(candles: OHLCV[], index: number): number {
    const current = candles[index];
    return (current.high + current.low + current.close) / 3;
  }

  private static calculateDistanceToPivot(candles: OHLCV[], index: number): number {
    const pivot = this.calculatePivotPoint(candles, index);
    return (candles[index].close - pivot) / candles[index].close;
  }

  private static calculateRecentHigh(candles: OHLCV[], index: number, period: number): number {
    const slice = candles.slice(Math.max(0, index - period + 1), index + 1);
    return Math.max(...slice.map(c => c.high));
  }

  private static calculateRecentLow(candles: OHLCV[], index: number, period: number): number {
    const slice = candles.slice(Math.max(0, index - period + 1), index + 1);
    return Math.min(...slice.map(c => c.low));
  }

  private static calculateDistanceToResistance(candles: OHLCV[], index: number): number {
    const high = this.calculateRecentHigh(candles, index, 20);
    return (high - candles[index].close) / candles[index].close;
  }

  private static calculateDistanceToSupport(candles: OHLCV[], index: number): number {
    const low = this.calculateRecentLow(candles, index, 20);
    return (candles[index].close - low) / candles[index].close;
  }

  // ==================== VOLUME ====================

  private static calculateVolumeRatio(candles: OHLCV[], index: number, period: number): number {
    if (index < period) return 1;

    const slice = candles.slice(index - period + 1, index + 1);
    const avgVolume = slice.reduce((sum, c) => sum + c.volume, 0) / slice.length;

    return candles[index].volume / avgVolume;
  }

  private static calculateOBV(candles: OHLCV[], index: number): number {
    let obv = 0;

    for (let i = 1; i <= index; i++) {
      if (candles[i].close > candles[i - 1].close) {
        obv += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        obv -= candles[i].volume;
      }
    }

    return obv;
  }

  // ==================== PRICE POSITION ====================

  private static calculatePricePositionInRange(candles: OHLCV[], index: number, period: number): number {
    const high = this.calculateRecentHigh(candles, index, period);
    const low = this.calculateRecentLow(candles, index, period);
    const range = high - low;

    if (range === 0) return 0.5;

    return (candles[index].close - low) / range;
  }
}
