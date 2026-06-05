/**
 * Multi-Currency Trading System
 * 
 * Supports multiple forex pairs with individual LSTM models
 * and coordinated trading signals
 */

import { LSTMModel } from './lstmModel';
import { generateForexData } from './dataGenerator';

export interface CurrencyPair {
  symbol: string;
  basePrice: number;
  volatility: number;
  description: string;
}

export interface MultiCurrencySignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictedPrice: number;
  rsi: number;
  macd: number;
  timestamp: Date;
}

export interface PortfolioSignals {
  signals: MultiCurrencySignal[];
  timestamp: Date;
  recommendedAction: 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL' | 'SELL_STRONG';
}

/**
 * Supported forex pairs with realistic base prices
 */
export const FOREX_PAIRS: Record<string, CurrencyPair> = {
  'EUR/USD': {
    symbol: 'EUR/USD',
    basePrice: 1.0850,
    volatility: 0.008,
    description: 'Euro vs US Dollar',
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    basePrice: 1.2650,
    volatility: 0.009,
    description: 'British Pound vs US Dollar',
  },
  'USD/JPY': {
    symbol: 'USD/JPY',
    basePrice: 145.50,
    volatility: 0.007,
    description: 'US Dollar vs Japanese Yen',
  },
  'USD/CHF': {
    symbol: 'USD/CHF',
    basePrice: 0.8950,
    volatility: 0.008,
    description: 'US Dollar vs Swiss Franc',
  },
  'AUD/USD': {
    symbol: 'AUD/USD',
    basePrice: 0.6750,
    volatility: 0.009,
    description: 'Australian Dollar vs US Dollar',
  },
  'USD/CAD': {
    symbol: 'USD/CAD',
    basePrice: 1.3650,
    volatility: 0.008,
    description: 'US Dollar vs Canadian Dollar',
  },
  'NZD/USD': {
    symbol: 'NZD/USD',
    basePrice: 0.6150,
    volatility: 0.010,
    description: 'New Zealand Dollar vs US Dollar',
  },
  'EUR/GBP': {
    symbol: 'EUR/GBP',
    basePrice: 0.8580,
    volatility: 0.007,
    description: 'Euro vs British Pound',
  },
  'EUR/JPY': {
    symbol: 'EUR/JPY',
    basePrice: 157.50,
    volatility: 0.009,
    description: 'Euro vs Japanese Yen',
  },
  'GBP/JPY': {
    symbol: 'GBP/JPY',
    basePrice: 183.50,
    volatility: 0.010,
    description: 'British Pound vs Japanese Yen',
  },
};

/**
 * Multi-Currency Trading System
 */
export class MultiCurrencyTrader {
  private models: Map<string, LSTMModel> = new Map();
  private lastSignals: Map<string, MultiCurrencySignal> = new Map();
  private trainingProgress: Map<string, number> = new Map();

  /**
   * Get all supported currency pairs
   */
  static getSupportedPairs(): CurrencyPair[] {
    return Object.values(FOREX_PAIRS);
  }

  /**
   * Get specific currency pair info
   */
  static getPairInfo(symbol: string): CurrencyPair | null {
    return FOREX_PAIRS[symbol] || null;
  }

  /**
   * Train models for all currency pairs
   */
  async trainAllModels(epochs: number = 100, learningRate: number = 0.01): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const [symbol, pair] of Object.entries(FOREX_PAIRS)) {
      try {
        const model = new LSTMModel({
          inputSize: 10,
          hiddenSize: 64,
          outputSize: 1,
          learningRate,
          epochs,
          batchSize: 32,
        });

        // Generate historical data for this pair
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        const priceData = generateForexData(symbol, startDate, endDate, pair.basePrice, 1000);

      // Train the model with progress reporting
      this.trainingProgress.set(symbol, 0); // Start at 0
      const metrics = await model.train(priceData, (epoch, totalEpochs) => {
        const progress = Math.round((epoch / totalEpochs) * 100);
        this.trainingProgress.set(symbol, progress);
      });

      this.models.set(symbol, model);
      this.trainingProgress.set(symbol, 100); // Ensure 100% at end

        results.set(symbol, {
          success: true,
          symbol,
          metrics: {
            accuracy: metrics.accuracy,
            winRate: metrics.winRate,
            profitFactor: metrics.profitFactor,
          },
        });
      } catch (error) {
        results.set(symbol, {
          success: false,
          symbol,
          error: error instanceof Error ? error.message : 'Training failed',
        });
      }
    }

    return results;
  }

  /**
   * Train a specific currency pair model
   */
  async trainModel(symbol: string, epochs: number = 100, learningRate: number = 0.01): Promise<any> {
    const pair = FOREX_PAIRS[symbol];
    if (!pair) {
      return { success: false, error: `Currency pair ${symbol} not supported` };
    }

    try {
      const model = new LSTMModel({
        inputSize: 10,
        hiddenSize: 64,
        outputSize: 1,
        learningRate,
        epochs,
        batchSize: 32,
      });

      // Generate historical data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const priceData = generateForexData(symbol, startDate, endDate, pair.basePrice, 1000);

      // Train the model with progress reporting
      this.trainingProgress.set(symbol, 0); // Start at 0
      const metrics = await model.train(priceData, (epoch, totalEpochs) => {
        const progress = Math.round((epoch / totalEpochs) * 100);
        this.trainingProgress.set(symbol, progress);
      });

      this.models.set(symbol, model);
      this.trainingProgress.set(symbol, 100); // Ensure 100% at end

      return {
        success: true,
        symbol,
        metrics: {
          accuracy: metrics.accuracy,
          winRate: metrics.winRate,
          profitFactor: metrics.profitFactor,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Training failed',
      };
    }
  }

  /**
   * Generate signals for a specific currency pair
   */
  generateSignal(symbol: string): MultiCurrencySignal | null {
    const model = this.models.get(symbol);
    const pair = FOREX_PAIRS[symbol];

    if (!model || !pair) {
      return null;
    }

    // Generate current price data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const priceData = generateForexData(symbol, startDate, endDate, pair.basePrice, 100);

    // Get prediction
    const prediction = model.predict(priceData);

    // Calculate technical indicators
    const closes = priceData.map(p => p.close);
    const rsi = this.calculateRSI(closes);
    const macd = this.calculateMACD(closes);

    const signal: MultiCurrencySignal = {
      symbol,
      signal: prediction.signal,
      confidence: prediction.confidence,
      predictedPrice: prediction.predictedPrice,
      rsi,
      macd,
      timestamp: new Date(),
    };

    this.lastSignals.set(symbol, signal);
    return signal;
  }

  /**
   * Generate signals for all currency pairs
   */
  generateAllSignals(): PortfolioSignals {
    const signals: MultiCurrencySignal[] = [];

    for (const symbol of Object.keys(FOREX_PAIRS)) {
      const signal = this.generateSignal(symbol);
      if (signal) {
        signals.push(signal);
      }
    }

    // Determine portfolio action
    const buySignals = signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = signals.filter(s => s.signal === 'SELL').length;
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    let recommendedAction: 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL' | 'SELL_STRONG' = 'HOLD';

    if (buySignals > sellSignals) {
      recommendedAction = avgConfidence > 0.7 ? 'BUY_STRONG' : 'BUY';
    } else if (sellSignals > buySignals) {
      recommendedAction = avgConfidence > 0.7 ? 'SELL_STRONG' : 'SELL';
    }

    return {
      signals,
      timestamp: new Date(),
      recommendedAction,
    };
  }

  /**
   * Get last signal for a currency pair
   */
  getLastSignal(symbol: string): MultiCurrencySignal | null {
    return this.lastSignals.get(symbol) || null;
  }

  /**
   * Get all last signals
   */
  getAllLastSignals(): MultiCurrencySignal[] {
    return Array.from(this.lastSignals.values());
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50; // Neutral
    }

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]): number {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    return ema12 - ema26;
  }

  /**
   * Calculate EMA
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
   * Get training progress for a currency pair
   */
  getTrainingProgress(symbol: string): number {
    return this.trainingProgress.get(symbol) || 0;
  }

  /**
   * Get all training progress
   */
  getAllTrainingProgress(): Map<string, number> {
    return this.trainingProgress;
  }

  /**
   * Check if model is trained
   */
  isModelTrained(symbol: string): boolean {
    return this.models.has(symbol);
  }

  /**
   * Get trained models count
   */
  getTrainedModelsCount(): number {
    return this.models.size;
  }
}
