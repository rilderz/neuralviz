/**
 * Price Router
 * 
 * tRPC procedures for accessing real-time and cached price data
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getPriceCacheService } from '../services/priceCacheService';

export const priceRouter = router({
  /**
   * Get current price for a symbol
   */
  getPrice: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(({ input }) => {
      const cacheService = getPriceCacheService();
      const cached = cacheService.getPrice(input.symbol);

      if (!cached) {
        throw new Error(`Price not available for ${input.symbol}`);
      }

      return {
        symbol: cached.price.symbol,
        bid: cached.price.bid,
        ask: cached.price.ask,
        mid: cached.price.mid,
        timestamp: cached.price.timestamp,
        volume: cached.price.volume,
        change: cached.price.change,
        changePercent: cached.price.changePercent,
        source: cached.source,
        cachedAt: cached.cachedAt,
      };
    }),

  /**
   * Get prices for multiple symbols
   */
  getPrices: publicProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(({ input }) => {
      const cacheService = getPriceCacheService();
      const result: Record<string, any> = {};

      input.symbols.forEach((symbol) => {
        const cached = cacheService.getPrice(symbol);
        if (cached) {
          result[symbol] = {
            symbol: cached.price.symbol,
            bid: cached.price.bid,
            ask: cached.price.ask,
            mid: cached.price.mid,
            timestamp: cached.price.timestamp,
            volume: cached.price.volume,
            change: cached.price.change,
            changePercent: cached.price.changePercent,
            source: cached.source,
            cachedAt: cached.cachedAt,
          };
        }
      });

      return result;
    }),

  /**
   * Get all available prices
   */
  getAllPrices: publicProcedure.query(() => {
    const cacheService = getPriceCacheService();
    const allPrices = cacheService.getAllPrices();
    const result: Record<string, any> = {};

    allPrices.forEach((cached, symbol) => {
      result[symbol] = {
        symbol: cached.price.symbol,
        bid: cached.price.bid,
        ask: cached.price.ask,
        mid: cached.price.mid,
        timestamp: cached.price.timestamp,
        volume: cached.price.volume,
        change: cached.price.change,
        changePercent: cached.price.changePercent,
        source: cached.source,
        cachedAt: cached.cachedAt,
      };
    });

    return result;
  }),

  /**
   * Get cache statistics
   */
  getCacheStats: publicProcedure.query(() => {
    const cacheService = getPriceCacheService();
    return cacheService.getStats();
  }),

  /**
   * Get available forex symbols
   */
  getAvailableSymbols: publicProcedure.query(() => {
    return [
      { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
      { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
      { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
      { symbol: 'EUR/GBP', name: 'Euro / British Pound' },
    ];
  }),

  /**
   * Subscribe to price updates (returns initial price)
   */
  subscribe: publicProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(({ input }) => {
      const cacheService = getPriceCacheService();
      const prices: Record<string, any> = {};

      input.symbols.forEach((symbol) => {
        const cached = cacheService.getPrice(symbol);
        if (cached) {
          prices[symbol] = {
            symbol: cached.price.symbol,
            bid: cached.price.bid,
            ask: cached.price.ask,
            mid: cached.price.mid,
            timestamp: cached.price.timestamp,
            volume: cached.price.volume,
            change: cached.price.change,
            changePercent: cached.price.changePercent,
            source: cached.source,
          };
        }
      });

      return {
        message: 'Subscribed to price updates via WebSocket',
        subscribed: input.symbols,
        prices,
      };
    }),

  /**
   * Get price history (simulated - in production would query database)
   */
  getPriceHistory: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        limit: z.number().default(100),
      })
    )
    .query(({ input }) => {
      // In a production system, this would query historical price data from database
      // For now, return a message indicating WebSocket should be used for real-time data
      return {
        symbol: input.symbol,
        message: 'Use WebSocket connection for real-time price history',
        note: 'Historical data can be retrieved via /api/ws/prices WebSocket connection',
      };
    }),
});
