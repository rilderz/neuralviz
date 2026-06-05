/**
 * Broker Router
 * 
 * tRPC procedures for broker account management and trading
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getExnessService } from '../brokers/exnessService';
import { getTradeExecutor } from '../trading/tradeExecutor';

export const brokerRouter = router({
  /**
   * Connect to Exness account
   */
  connectExness: publicProcedure
    .input(
      z.object({
        login: z.string(),
        password: z.string(),
        accountType: z.enum(['demo', 'real']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const exness = getExnessService();
        const connected = await exness.connectAccount({
          login: input.login,
          password: input.password,
          accountType: input.accountType,
          leverage: 100,
          currency: 'USD',
        });

        if (connected) {
          return {
            success: true,
            message: `Connected to ${input.accountType} account: ${input.login}`,
          };
        }

        return {
          success: false,
          error: 'Failed to connect to Exness',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Connection error',
        };
      }
    }),

  /**
   * Disconnect from broker
   */
  disconnect: publicProcedure.mutation(async () => {
    try {
      const exness = getExnessService();
      await exness.disconnect();
      return { success: true, message: 'Disconnected from broker' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disconnect error',
      };
    }
  }),

  /**
   * Get account information
   */
  getAccount: publicProcedure.query(async () => {
    try {
      const exness = getExnessService();
      const status = exness.getStatus();

      if (!status.connected) {
        return {
          connected: false,
          error: 'Not connected to broker',
        };
      }

      const summary = await exness.getAccountSummary();
      return {
        connected: true,
        ...summary,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Failed to get account',
      };
    }
  }),

  /**
   * Get broker connection status
   */
  getStatus: publicProcedure.query(() => {
    const exness = getExnessService();
    return exness.getStatus();
  }),

  /**
   * Get open positions
   */
  getPositions: publicProcedure.query(async () => {
    try {
      const exness = getExnessService();
      const positions = await exness.getPositions();
      return {
        success: true,
        positions,
        count: positions.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get positions',
        positions: [],
      };
    }
  }),

  /**
   * Close all positions
   */
  closeAllPositions: publicProcedure.mutation(async () => {
    try {
      const exness = getExnessService();
      const result = await exness.closeAllPositions();
      return {
        success: true,
        closed: result.success,
        failed: result.failed,
        message: `Closed ${result.success} positions, ${result.failed} failed`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close positions',
      };
    }
  }),

  /**
   * Set trade configuration
   */
  setTradeConfig: publicProcedure
    .input(
      z.object({
        minConfidence: z.number().optional(),
        maxRiskPerTrade: z.number().optional(),
        stopLossPoints: z.number().optional(),
        takeProfitRatio: z.number().optional(),
        maxDailyTrades: z.number().optional(),
        maxDrawdown: z.number().optional(),
        enableAutoClose: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        const exness = getExnessService();
        exness.setTradeConfig(input);
        return {
          success: true,
          message: 'Trade configuration updated',
          config: exness.getTradeConfig(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set config',
        };
      }
    }),

  /**
   * Get trade configuration
   */
  getTradeConfig: publicProcedure.query(() => {
    try {
      const exness = getExnessService();
      return {
        success: true,
        config: exness.getTradeConfig(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config',
      };
    }
  }),

  /**
   * Execute AI signal
   */
  executeSignal: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        action: z.enum(['BUY', 'SELL', 'HOLD']),
        confidence: z.number().min(0).max(1),
        predictedPrice: z.number(),
        indicators: z.object({
          rsi: z.number().optional(),
          macd: z.number().optional(),
          bollingerBands: z.object({
            upper: z.number(),
            middle: z.number(),
            lower: z.number(),
          }).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const exness = getExnessService();
        const executor = getTradeExecutor(exness);

        const execution = await executor.executeSignal({
          symbol: input.symbol,
          action: input.action,
          confidence: input.confidence,
          predictedPrice: input.predictedPrice,
          timestamp: Date.now(),
          indicators: input.indicators,
        });

        return {
          success: execution.status === 'executed',
          execution,
          message: execution.status === 'executed' ? 'Trade executed' : `Trade ${execution.status}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute signal',
        };
      }
    }),

  /**
   * Get trade statistics
   */
  getTradeStats: publicProcedure.query(async () => {
    try {
      const exness = getExnessService();
      const executor = getTradeExecutor(exness);
      const stats = await executor.getTradeStats();
      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      };
    }
  }),

  /**
   * Get executed trades
   */
  getExecutedTrades: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => {
      try {
        const exness = getExnessService();
        const executor = getTradeExecutor(exness);
        const trades = executor.getExecutedTrades(input.limit);
        return {
          success: true,
          trades,
          count: trades.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get trades',
          trades: [],
        };
      }
    }),

  /**
   * Get executor status
   */
  getExecutorStatus: publicProcedure.query(() => {
    try {
      const exness = getExnessService();
      const executor = getTradeExecutor(exness);
      return {
        success: true,
        ...executor.getStatus(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      };
    }
  }),
});
