/**
 * Price Streaming Service
 * 
 * Manages price data collection, caching, and distribution
 * Provides both real-time and historical price data
 */

import { PriceServer, PriceUpdate } from '../websocket/priceServer';

export interface PriceHistory {
  symbol: string;
  prices: PriceUpdate[];
  lastUpdate: number;
}

export interface PriceStats {
  symbol: string;
  current: number;
  high: number;
  low: number;
  open: number;
  change: number;
  changePercent: number;
  volume: number;
}

/**
 * Price Streaming Service
 */
export class PriceStreamingService {
  private priceServer: PriceServer | null = null;
  private priceHistory: Map<string, PriceHistory> = new Map();
  private priceStats: Map<string, PriceStats> = new Map();
  private maxHistorySize = 1000; // Keep last 1000 prices per symbol

  constructor(priceServer?: PriceServer) {
    this.priceServer = priceServer || null;
  }

  /**
   * Initialize the service with a price server
   */
  initialize(priceServer: PriceServer): void {
    this.priceServer = priceServer;
  }

  /**
   * Subscribe to price updates for symbols
   */
  subscribe(symbols: string[]): void {
    if (!this.priceServer) return;

    symbols.forEach((symbol) => {
      // Initialize history if not exists
      if (!this.priceHistory.has(symbol)) {
        this.priceHistory.set(symbol, {
          symbol,
          prices: [],
          lastUpdate: 0,
        });
      }

      // Initialize stats if not exists
      if (!this.priceStats.has(symbol)) {
        this.priceStats.set(symbol, {
          symbol,
          current: 0,
          high: 0,
          low: Infinity,
          open: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
        });
      }
    });
  }

  /**
   * Record a price update
   */
  recordPrice(price: PriceUpdate): void {
    const history = this.priceHistory.get(price.symbol);
    if (!history) return;

    // Add to history
    history.prices.push(price);
    history.lastUpdate = price.timestamp;

    // Maintain max history size
    if (history.prices.length > this.maxHistorySize) {
      history.prices.shift();
    }

    // Update stats
    this.updateStats(price);
  }

  /**
   * Update price statistics
   */
  private updateStats(price: PriceUpdate): void {
    const stats = this.priceStats.get(price.symbol);
    if (!stats) return;

    const prevPrice = stats.current || price.mid;
    stats.current = price.mid;

    // Update high/low
    if (price.mid > stats.high) stats.high = price.mid;
    if (price.mid < stats.low) stats.low = price.mid;

    // Set open price on first update
    if (stats.open === 0) stats.open = price.mid;

    // Calculate change
    stats.change = price.mid - prevPrice;
    stats.changePercent = (stats.change / prevPrice) * 100;

    // Update volume
    if (price.volume) stats.volume = price.volume;
  }

  /**
   * Get current price for a symbol
   */
  getCurrentPrice(symbol: string): PriceUpdate | null {
    const history = this.priceHistory.get(symbol);
    if (!history || history.prices.length === 0) return null;
    return history.prices[history.prices.length - 1];
  }

  /**
   * Get price statistics
   */
  getStats(symbol: string): PriceStats | null {
    return this.priceStats.get(symbol) || null;
  }

  /**
   * Get price history
   */
  getHistory(symbol: string, limit?: number): PriceUpdate[] {
    const history = this.priceHistory.get(symbol);
    if (!history) return [];

    if (limit && limit > 0) {
      return history.prices.slice(-limit);
    }
    return history.prices;
  }

  /**
   * Get OHLC (Open, High, Low, Close) data for a period
   */
  getOHLC(symbol: string, periodSize: number = 60): Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }> {
    const history = this.priceHistory.get(symbol);
    if (!history || history.prices.length === 0) return [];

    const ohlcData = [];
    let currentPeriod = [];

    for (const price of history.prices) {
      currentPeriod.push(price);

      if (currentPeriod.length >= periodSize) {
        const open = currentPeriod[0].mid;
        const close = currentPeriod[currentPeriod.length - 1].mid;
        const high = Math.max(...currentPeriod.map((p) => p.mid));
        const low = Math.min(...currentPeriod.map((p) => p.mid));

        ohlcData.push({
          timestamp: currentPeriod[0].timestamp,
          open,
          high,
          low,
          close,
        });

        currentPeriod = [];
      }
    }

    return ohlcData;
  }

  /**
   * Calculate technical indicators
   */
  calculateIndicators(symbol: string, period: number = 20): {
    sma: number;
    ema: number;
    rsi: number;
    macd: number;
    bollingerBands: { upper: number; middle: number; lower: number };
  } | null {
    const history = this.priceHistory.get(symbol);
    if (!history || history.prices.length < period) return null;

    const prices = history.prices.slice(-period).map((p) => p.mid);

    // Simple Moving Average
    const sma = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Exponential Moving Average
    const ema = this.calculateEMA(prices);

    // RSI
    const rsi = this.calculateRSI(prices);

    // MACD
    const macd = this.calculateMACD(prices);

    // Bollinger Bands
    const bollingerBands = this.calculateBollingerBands(prices);

    return {
      sma,
      ema,
      rsi,
      macd,
      bollingerBands,
    };
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(prices: number[]): number {
    const k = 2 / (prices.length + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < Math.min(period + 1, prices.length); i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 1);
    const rsi = 100 - 100 / (1 + rs);

    return Math.max(0, Math.min(100, rsi));
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]): number {
    const ema12 = this.calculateEMAWithPeriod(prices, 12);
    const ema26 = this.calculateEMAWithPeriod(prices, 26);
    return ema12 - ema26;
  }

  /**
   * Calculate EMA with specific period
   */
  private calculateEMAWithPeriod(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number; middle: number; lower: number } {
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / slice.length;
    const std = Math.sqrt(variance);

    return {
      upper: middle + std * stdDev,
      middle,
      lower: middle - std * stdDev,
    };
  }

  /**
   * Get all active symbols
   */
  getActiveSymbols(): string[] {
    return Array.from(this.priceHistory.keys());
  }

  /**
   * Clear history for a symbol
   */
  clearHistory(symbol: string): void {
    this.priceHistory.delete(symbol);
    this.priceStats.delete(symbol);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.priceHistory.clear();
    this.priceStats.clear();
  }
}

// Singleton instance
let serviceInstance: PriceStreamingService | null = null;

/**
 * Get or create the price streaming service
 */
export function getPriceStreamingService(): PriceStreamingService {
  if (!serviceInstance) {
    serviceInstance = new PriceStreamingService();
  }
  return serviceInstance;
}

/**
 * Initialize the price streaming service
 */
export function initializePriceStreamingService(priceServer: PriceServer): PriceStreamingService {
  if (!serviceInstance) {
    serviceInstance = new PriceStreamingService(priceServer);
  } else {
    serviceInstance.initialize(priceServer);
  }
  return serviceInstance;
}
