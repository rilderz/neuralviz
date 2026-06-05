/**
 * Simple Data Layer
 * 
 * Handles OHLC data collection and storage
 * Timeframes: 1H, 4H (avoid noisy lower timeframes)
 * 
 * Data flow:
 * Fetch from API → Store in DB → Use for features
 */

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  timeframe: '1H' | '4H'; // Stable timeframes only
}

export interface DataLayerConfig {
  symbols: string[]; // EUR/USD, GBP/USD, USD/JPY
  timeframes: ('1H' | '4H')[];
  maxCandlesPerSymbol: number; // Keep last N candles
  updateIntervalMinutes: number; // How often to fetch new data
}

/**
 * Simple Data Layer
 * 
 * Responsibilities:
 * - Fetch OHLC data from reliable source
 * - Store in database
 * - Provide clean data for feature engineering
 */
export class DataLayer {
  private config: DataLayerConfig;
  private candles: Map<string, Candle[]> = new Map(); // symbol_timeframe -> candles

  constructor(config: DataLayerConfig) {
    this.config = config;
    this.initializeStorage();
  }

  /**
   * Initialize storage for each symbol/timeframe combination
   */
  private initializeStorage(): void {
    for (const symbol of this.config.symbols) {
      for (const timeframe of this.config.timeframes) {
        const key = `${symbol}_${timeframe}`;
        this.candles.set(key, []);
      }
    }
  }

  /**
   * Add new candle to storage
   * 
   * Automatically removes old candles if max reached
   */
  addCandle(candle: Candle): void {
    const key = `${candle.symbol}_${candle.timeframe}`;
    const candleList = this.candles.get(key) || [];

    // Remove duplicate if exists
    const existingIndex = candleList.findIndex(c => c.timestamp.getTime() === candle.timestamp.getTime());
    if (existingIndex >= 0) {
      candleList[existingIndex] = candle; // Update
    } else {
      candleList.push(candle);
    }

    // Keep only recent candles
    if (candleList.length > this.config.maxCandlesPerSymbol) {
      candleList.shift(); // Remove oldest
    }

    this.candles.set(key, candleList);
  }

  /**
   * Add multiple candles at once
   */
  addCandles(candles: Candle[]): void {
    for (const candle of candles) {
      this.addCandle(candle);
    }
  }

  /**
   * Get candles for a symbol/timeframe
   */
  getCandles(symbol: string, timeframe: '1H' | '4H'): Candle[] {
    const key = `${symbol}_${timeframe}`;
    return this.candles.get(key) || [];
  }

  /**
   * Get last N candles
   */
  getRecentCandles(symbol: string, timeframe: '1H' | '4H', count: number): Candle[] {
    const candles = this.getCandles(symbol, timeframe);
    return candles.slice(-count);
  }

  /**
   * Get candles in date range
   */
  getCandlesInRange(symbol: string, timeframe: '1H' | '4H', startDate: Date, endDate: Date): Candle[] {
    const candles = this.getCandles(symbol, timeframe);
    return candles.filter(c => c.timestamp >= startDate && c.timestamp <= endDate);
  }

  /**
   * Validate data quality
   * 
   * Checks for:
   * - Missing candles (gaps)
   * - Invalid OHLC values
   * - Outliers
   */
  validateData(symbol: string, timeframe: '1H' | '4H'): {
    valid: boolean;
    issues: string[];
  } {
    const candles = this.getCandles(symbol, timeframe);
    const issues: string[] = [];

    if (candles.length < 100) {
      issues.push(`Insufficient data: ${candles.length} candles (need at least 100)`);
    }

    // Check for gaps
    for (let i = 1; i < candles.length; i++) {
      const prevTime = candles[i - 1].timestamp.getTime();
      const currTime = candles[i].timestamp.getTime();
      const expectedGap = timeframe === '1H' ? 60 * 60 * 1000 : 4 * 60 * 60 * 1000;

      if (currTime - prevTime > expectedGap * 1.5) {
        issues.push(`Gap detected between ${new Date(prevTime)} and ${new Date(currTime)}`);
      }
    }

    // Check for invalid OHLC
    for (const candle of candles) {
      if (candle.high < candle.low) {
        issues.push(`Invalid OHLC: high < low at ${candle.timestamp}`);
      }
      if (candle.open < 0 || candle.close < 0) {
        issues.push(`Negative price at ${candle.timestamp}`);
      }
      if (candle.volume < 0) {
        issues.push(`Negative volume at ${candle.timestamp}`);
      }
    }

    // Check for outliers (price moves > 5% in one candle)
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const currClose = candles[i].close;
      const change = Math.abs((currClose - prevClose) / prevClose);

      if (change > 0.05) {
        issues.push(`Outlier detected: ${(change * 100).toFixed(2)}% move at ${candles[i].timestamp}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get data statistics
   */
  getDataStats(symbol: string, timeframe: '1H' | '4H'): {
    candleCount: number;
    oldestCandle: Date | null;
    newestCandle: Date | null;
    avgVolume: number;
    priceRange: { min: number; max: number };
  } {
    const candles = this.getCandles(symbol, timeframe);

    if (candles.length === 0) {
      return {
        candleCount: 0,
        oldestCandle: null,
        newestCandle: null,
        avgVolume: 0,
        priceRange: { min: 0, max: 0 },
      };
    }

    const volumes = candles.map(c => c.volume);
    const closes = candles.map(c => c.close);

    return {
      candleCount: candles.length,
      oldestCandle: candles[0].timestamp,
      newestCandle: candles[candles.length - 1].timestamp,
      avgVolume: volumes.reduce((a, b) => a + b) / volumes.length,
      priceRange: {
        min: Math.min(...closes),
        max: Math.max(...closes),
      },
    };
  }

  /**
   * Clear old data (for maintenance)
   */
  clearOldData(beforeDate: Date): void {
    this.candles.forEach((candles: Candle[], key: string) => {
      const filtered = candles.filter((c: Candle) => c.timestamp >= beforeDate);
      this.candles.set(key, filtered);
    });
  }

  /**
   * Export data for backup/analysis
   */
  exportData(): Record<string, Candle[]> {
    const exported: Record<string, Candle[]> = {};
    this.candles.forEach((candles: Candle[], key: string) => {
      exported[key] = [...candles];
    });
    return exported;
  }

  /**
   * Import data from backup
   */
  importData(data: Record<string, Candle[]>): void {
    Object.entries(data).forEach(([key, candles]: [string, Candle[]]) => {
      this.candles.set(key, candles.map((c: Candle) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      })));
    });
  }
}
