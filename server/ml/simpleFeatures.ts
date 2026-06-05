/**
 * Simple Feature Engineering
 * 
 * KEEP IT SIMPLE - only stable features that don't break over time
 * 
 * Features:
 * - RSI (14) - momentum
 * - MA50 - short-term trend
 * - MA200 - long-term trend  
 * - Price returns - momentum
 * - Volatility - risk
 */

import { Candle } from '../data/dataLayer';

export interface SimpleFeatures {
  rsi14: number; // 0-100
  ma50: number;
  ma200: number;
  priceReturn1h: number; // % change
  priceReturn4h: number; // % change
  volatility20: number; // std dev of returns
  priceAboveMA50: boolean; // price > MA50
  priceAboveMA200: boolean; // price > MA200
  ma50AboveMA200: boolean; // MA50 > MA200 (uptrend)
}

/**
 * Simple Feature Engineer
 */
export class SimpleFeatureEngineer {
  /**
   * Extract features from candles
   * 
   * Returns null if not enough data
   */
  static extractFeatures(candles: Candle[]): SimpleFeatures | null {
    if (candles.length < 200) {
      return null; // Need at least 200 candles for MA200
    }

    const current = candles[candles.length - 1];
    const rsi14 = this.calculateRSI(candles, 14);
    const ma50 = this.calculateMA(candles, 50);
    const ma200 = this.calculateMA(candles, 200);
    const priceReturn1h = this.calculateReturn(candles, 1);
    const priceReturn4h = this.calculateReturn(candles, 4);
    const volatility20 = this.calculateVolatility(candles, 20);

    return {
      rsi14,
      ma50,
      ma200,
      priceReturn1h,
      priceReturn4h,
      volatility20,
      priceAboveMA50: current.close > ma50,
      priceAboveMA200: current.close > ma200,
      ma50AboveMA200: ma50 > ma200,
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * 
   * Range: 0-100
   * > 70: overbought
   * < 30: oversold
   */
  private static calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 50;

    const changes: number[] = [];
    for (let i = candles.length - period; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      changes.push(change);
    }

    const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;

    if (losses === 0) return 100;
    if (gains === 0) return 0;

    const rs = gains / losses;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Calculate Moving Average
   */
  private static calculateMA(candles: Candle[], period: number): number {
    if (candles.length < period) return candles[candles.length - 1].close;

    const sum = candles
      .slice(-period)
      .reduce((total, candle) => total + candle.close, 0);

    return sum / period;
  }

  /**
   * Calculate price return (% change)
   * 
   * @param candles - array of candles
   * @param periods - number of candles to look back
   * @returns % change as decimal (e.g., 0.01 = 1%)
   */
  private static calculateReturn(candles: Candle[], periods: number): number {
    if (candles.length < periods + 1) return 0;

    const current = candles[candles.length - 1].close;
    const previous = candles[candles.length - 1 - periods].close;

    return (current - previous) / previous;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   * 
   * Range: 0-1 (higher = more volatile)
   */
  private static calculateVolatility(candles: Candle[], period: number = 20): number {
    if (candles.length < period + 1) return 0;

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
   * Convert features to array for ML model
   */
  static featuresToArray(features: SimpleFeatures): number[] {
    return [
      features.rsi14,
      features.ma50,
      features.ma200,
      features.priceReturn1h * 100, // Convert to %
      features.priceReturn4h * 100,
      features.volatility20 * 100,
      features.priceAboveMA50 ? 1 : 0,
      features.priceAboveMA200 ? 1 : 0,
      features.ma50AboveMA200 ? 1 : 0,
    ];
  }

  /**
   * Get feature names (for debugging/analysis)
   */
  static getFeatureNames(): string[] {
    return [
      'RSI_14',
      'MA_50',
      'MA_200',
      'Return_1H_%',
      'Return_4H_%',
      'Volatility_20',
      'Price_Above_MA50',
      'Price_Above_MA200',
      'MA50_Above_MA200',
    ];
  }
}
