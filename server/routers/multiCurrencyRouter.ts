/**
 * Multi-Currency Trading Router
 * 
 * tRPC procedures for multi-currency trading with support for 10+ forex pairs
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { MultiCurrencyTrader, FOREX_PAIRS } from '../ml/multiCurrencyTrader';

// Global trader instance
let globalTrader: MultiCurrencyTrader | null = null;

function getTrader(): MultiCurrencyTrader {
  if (!globalTrader) {
    globalTrader = new MultiCurrencyTrader();
  }
  return globalTrader;
}

export const multiCurrencyRouter = router({
  /**
   * Get all supported currency pairs
   */
  getSupportedPairs: publicProcedure.query(() => {
    return {
      success: true,
      pairs: MultiCurrencyTrader.getSupportedPairs().map(pair => ({
        symbol: pair.symbol,
        description: pair.description,
        basePrice: pair.basePrice,
      })),
      count: Object.keys(FOREX_PAIRS).length,
    };
  }),

  /**
   * Get info for a specific currency pair
   */
  getPairInfo: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(({ input }) => {
      const pair = MultiCurrencyTrader.getPairInfo(input.symbol);
      if (!pair) {
        return { success: false, error: `Currency pair ${input.symbol} not found` };
      }
      return {
        success: true,
        pair: {
          symbol: pair.symbol,
          description: pair.description,
          basePrice: pair.basePrice,
          volatility: pair.volatility,
        },
      };
    }),

  /**
   * Train model for a specific currency pair
   */
  trainModel: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        epochs: z.number().min(10).max(500).optional(),
        learningRate: z.number().min(0.0001).max(0.1).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const trader = getTrader();
        const result = await trader.trainModel(
          input.symbol,
          input.epochs || 100,
          input.learningRate || 0.01
        );

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Training failed',
        };
      }
    }),

  /**
   * Train all currency pair models
   */
  trainAllModels: publicProcedure
    .input(
      z.object({
        epochs: z.number().min(10).max(500).optional(),
        learningRate: z.number().min(0.0001).max(0.1).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const trader = getTrader();
        const results = await trader.trainAllModels(input.epochs || 100, input.learningRate || 0.01);

        const successCount = Array.from(results.values()).filter((r: any) => r.success).length;
        const failedCount = results.size - successCount;

        return {
          success: true,
          trained: successCount,
          failed: failedCount,
          total: results.size,
          results: Array.from(results.values()),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Training failed',
        };
      }
    }),

  /**
   * Generate signal for a specific currency pair
   */
  generateSignal: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(({ input }) => {
      try {
        const trader = getTrader();
        const signal = trader.generateSignal(input.symbol);

        if (!signal) {
          return {
            success: false,
            error: `Model not trained for ${input.symbol}. Train the model first.`,
          };
        }

        return {
          success: true,
          signal: {
            symbol: signal.symbol,
            signal: signal.signal,
            confidence: signal.confidence,
            predictedPrice: signal.predictedPrice,
            rsi: signal.rsi,
            macd: signal.macd,
            timestamp: signal.timestamp.toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Signal generation failed',
        };
      }
    }),

  /**
   * Generate signals for all currency pairs
   */
  generateAllSignals: publicProcedure.query(() => {
    try {
      const trader = getTrader();
      const portfolio = trader.generateAllSignals();

      return {
        success: true,
        portfolio: {
          signals: portfolio.signals.map(s => ({
            symbol: s.symbol,
            signal: s.signal,
            confidence: s.confidence,
            predictedPrice: s.predictedPrice,
            rsi: s.rsi,
            macd: s.macd,
            timestamp: s.timestamp.toISOString(),
          })),
          recommendedAction: portfolio.recommendedAction,
          timestamp: portfolio.timestamp.toISOString(),
          totalSignals: portfolio.signals.length,
          buySignals: portfolio.signals.filter(s => s.signal === 'BUY').length,
          sellSignals: portfolio.signals.filter(s => s.signal === 'SELL').length,
          holdSignals: portfolio.signals.filter(s => s.signal === 'HOLD').length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signal generation failed',
      };
    }
  }),

  /**
   * Get last signal for a currency pair
   */
  getLastSignal: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(({ input }) => {
      try {
        const trader = getTrader();
        const signal = trader.getLastSignal(input.symbol);

        if (!signal) {
          return {
            success: false,
            error: `No signal available for ${input.symbol}`,
          };
        }

        return {
          success: true,
          signal: {
            symbol: signal.symbol,
            signal: signal.signal,
            confidence: signal.confidence,
            predictedPrice: signal.predictedPrice,
            rsi: signal.rsi,
            macd: signal.macd,
            timestamp: signal.timestamp.toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get signal',
        };
      }
    }),

  /**
   * Get all last signals
   */
  getAllLastSignals: publicProcedure.query(() => {
    try {
      const trader = getTrader();
      const signals = trader.getAllLastSignals();

      return {
        success: true,
        signals: signals.map(s => ({
          symbol: s.symbol,
          signal: s.signal,
          confidence: s.confidence,
          predictedPrice: s.predictedPrice,
          rsi: s.rsi,
          macd: s.macd,
          timestamp: s.timestamp.toISOString(),
        })),
        count: signals.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get signals',
      };
    }
  }),

  /**
   * Check if model is trained for a currency pair
   */
  isModelTrained: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(({ input }) => {
      const trader = getTrader();
      return {
        success: true,
        symbol: input.symbol,
        trained: trader.isModelTrained(input.symbol),
      };
    }),

  /**
   * Get training progress for all models
   */
  getTrainingProgress: publicProcedure.query(() => {
    const trader = getTrader();
    const progress = trader.getAllTrainingProgress();
    const trainedCount = trader.getTrainedModelsCount();

    return {
      success: true,
      trained: trainedCount,
      total: Object.keys(FOREX_PAIRS).length,
      progress: Object.fromEntries(progress),
    };
  }),

  /**
   * Get statistics for all trained models
   */
  getModelStats: publicProcedure.query(() => {
    const trader = getTrader();
    const trainedCount = trader.getTrainedModelsCount();
    const totalPairs = Object.keys(FOREX_PAIRS).length;

    return {
      success: true,
      trainedModels: trainedCount,
      totalPairs,
      trainingPercentage: Math.round((trainedCount / totalPairs) * 100),
      supportedPairs: Object.keys(FOREX_PAIRS),
    };
  }),
});
