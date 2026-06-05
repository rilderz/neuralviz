import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { LSTMModel } from '../ml/lstmModel';
import { Backtester } from '../ml/backtester';
import { generateForexData, generateTrainingData } from '../ml/dataGenerator';

// Schema validation
const TrainModelSchema = z.object({
  symbol: z.string().min(1),
  epochs: z.number().min(10).max(1000),
  learningRate: z.number().min(0.0001).max(0.1),
});

const BacktestSchema = z.object({
  modelId: z.number(),
  symbol: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  initialCapital: z.number().min(1000),
});

const ExecuteTradeSchema = z.object({
  modelId: z.number(),
  symbol: z.string(),
  signal: z.enum(['BUY', 'SELL', 'HOLD']),
});

/**
 * Trading Router - handles all trading-related operations
 */
export const tradingRouter = router({
  /**
   * Train an LSTM model on historical data
   */
  trainModel: protectedProcedure
    .input(TrainModelSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Generate historical data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

        const priceData = generateForexData(input.symbol, startDate, endDate, 1.1, 1000);

        // Initialize and train model
        const model = new LSTMModel({
          inputSize: 10,
          hiddenSize: 64,
          outputSize: 1,
          learningRate: input.learningRate,
          epochs: input.epochs,
          batchSize: 32,
        });

        const metrics = await model.train(priceData);

        return {
          success: true,
          metrics: {
            trainLoss: metrics.trainLoss,
            valLoss: metrics.valLoss,
            accuracy: metrics.accuracy,
            winRate: metrics.winRate,
            profitFactor: metrics.profitFactor,
          },
          message: `Model trained successfully with ${metrics.accuracy.toFixed(2)}% accuracy`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Training failed',
        };
      }
    }),

  /**
   * Run backtest on a model
   */
  runBacktest: protectedProcedure
    .input(BacktestSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate historical data
        const priceData = generateForexData(
          input.symbol,
          input.startDate,
          input.endDate,
          1.1,
          500
        );

        // Initialize model
        const model = new LSTMModel({
          inputSize: 10,
          hiddenSize: 64,
          outputSize: 1,
          learningRate: 0.001,
          epochs: 50,
          batchSize: 32,
        });

        // Generate predictions
        const signals = priceData.map((bar) => ({
          timestamp: bar.timestamp,
          signal: model.predict([bar]).signal,
        }));

        // Run backtest
        const backtester = new Backtester({
          initialCapital: input.initialCapital,
          riskPerTrade: 1.5,
          stopLossPercent: 2,
          commissionPercent: 0.1,
          slippagePercent: 0.05,
        });

        const result = backtester.backtest(priceData, signals);

        return {
          success: true,
          result: {
            totalTrades: result.totalTrades,
            winningTrades: result.winningTrades,
            losingTrades: result.losingTrades,
            winRate: result.winRate.toFixed(2),
            totalProfit: result.totalProfit.toFixed(2),
            totalReturn: result.totalReturn.toFixed(2),
            maxDrawdown: result.maxDrawdown.toFixed(2),
            sharpeRatio: result.sharpeRatio.toFixed(2),
            profitFactor: result.profitFactor.toFixed(2),
            equityCurve: result.equityCurve,
            trades: result.trades.slice(0, 50), // Return first 50 trades
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Backtest failed',
        };
      }
    }),

  /**
   * Get live trading signals
   */
  getLiveSignals: protectedProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      try {
        // Generate recent price data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

        const priceData = generateForexData(input.symbol, startDate, endDate, 1.1, 100);

        // Initialize model
        const model = new LSTMModel({
          inputSize: 10,
          hiddenSize: 64,
          outputSize: 1,
          learningRate: 0.001,
          epochs: 50,
          batchSize: 32,
        });

        // Get latest prediction
        const lastBar = priceData[priceData.length - 1];
        const prediction = model.predict(priceData);

        return {
          symbol: input.symbol,
          currentPrice: lastBar.close,
          signal: prediction.signal,
          confidence: (prediction.confidence * 100).toFixed(2),
          predictedPrice: prediction.predictedPrice.toFixed(6),
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          symbol: input.symbol,
          signal: 'HOLD',
          error: error instanceof Error ? error.message : 'Failed to generate signals',
        };
      }
    }),

  /**
   * Get model performance metrics
   */
  getModelMetrics: protectedProcedure
    .input(z.object({ modelId: z.number() }))
    .query(async () => {
      // Simulated metrics - in production, fetch from database
      return {
        modelId: 1,
        symbol: 'EUR/USD',
        accuracy: 0.72,
        winRate: 0.62,
        profitFactor: 1.45,
        totalTrades: 245,
        avgWin: 125.5,
        avgLoss: 85.3,
        maxDrawdown: 8.5,
        sharpeRatio: 1.23,
        createdAt: new Date(),
      };
    }),

  /**
   * Get trading history
   */
  getTradingHistory: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      // Simulated trading history
      const trades = [];
      for (let i = 0; i < input.limit; i++) {
        trades.push({
          id: i + 1,
          symbol: 'EUR/USD',
          side: Math.random() > 0.5 ? 'BUY' : 'SELL',
          entryPrice: 1.1 + Math.random() * 0.01,
          exitPrice: 1.1 + Math.random() * 0.01,
          quantity: 10000,
          profitLoss: (Math.random() - 0.5) * 500,
          profitLossPercent: (Math.random() - 0.5) * 5,
          status: 'closed',
          entryTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          exitTime: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        });
      }
      return trades;
    }),

  /**
   * Get available symbols for trading
   */
  getAvailableSymbols: protectedProcedure.query(async () => {
    return [
      { symbol: 'EUR/USD', name: 'Euro / US Dollar', volatility: 'Medium' },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar', volatility: 'Medium-High' },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', volatility: 'Medium' },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', volatility: 'Low' },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', volatility: 'Medium-High' },
    ];
  }),
});
