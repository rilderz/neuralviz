import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TrendPullbackStrategy, MultiTimeframeTrendPullback } from "../strategies/trendPullbackStrategy";

const strategyRouter = router({
  // Get current signal for a currency pair
  getSignal: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        price: z.number(),
        ma200: z.number(),
        rsi: z.number(),
        previousRsi: z.number(),
      })
    )
    .query(({ input }) => {
      const strategy = new TrendPullbackStrategy();
      const signal = strategy.generateSignal({
        price: input.price,
        ma200: input.ma200,
        rsi: input.rsi,
        previousRsi: input.previousRsi,
        trend: input.price > input.ma200 ? "BULLISH" : "BEARISH",
        inPullback: false,
        lastRsiLow: 0,
        lastRsiHigh: 0,
      });

      return {
        symbol: input.symbol,
        signal,
        timestamp: new Date(),
      };
    }),

  // Get multi-timeframe signal
  getMultiTimeframeSignal: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        price1H: z.number(),
        ma2001H: z.number(),
        rsi1H: z.number(),
        previousRsi1H: z.number(),
        price15M: z.number(),
        ma20015M: z.number(),
        rsi15M: z.number(),
        previousRsi15M: z.number(),
      })
    )
    .query(({ input }) => {
      const mtStrategy = new MultiTimeframeTrendPullback();
      const signal = mtStrategy.generateSignal(
        {
          price: input.price1H,
          ma200: input.ma2001H,
          rsi: input.rsi1H,
          previousRsi: input.previousRsi1H,
          trend: input.price1H > input.ma2001H ? "BULLISH" : "BEARISH",
          inPullback: false,
          lastRsiLow: 0,
          lastRsiHigh: 0,
        },
        {
          price: input.price15M,
          ma200: input.ma20015M,
          rsi: input.rsi15M,
          previousRsi: input.previousRsi15M,
          trend: input.price15M > input.ma20015M ? "BULLISH" : "BEARISH",
          inPullback: false,
          lastRsiLow: 0,
          lastRsiHigh: 0,
        }
      );

      return {
        symbol: input.symbol,
        signal,
        timestamp: new Date(),
      };
    }),

  // Get strategy parameters
  getParameters: publicProcedure.query(() => {
    const strategy = new TrendPullbackStrategy();
    return strategy.getParameters();
  }),

  // Batch signal generation for multiple pairs
  getBatchSignals: publicProcedure
    .input(
      z.object({
        pairs: z.array(
          z.object({
            symbol: z.string(),
            price: z.number(),
            ma200: z.number(),
            rsi: z.number(),
            previousRsi: z.number(),
          })
        ),
      })
    )
    .query(({ input }) => {
      const strategy = new TrendPullbackStrategy();
      const signals = input.pairs.map((pair) => {
        const signal = strategy.generateSignal({
          price: pair.price,
          ma200: pair.ma200,
          rsi: pair.rsi,
          previousRsi: pair.previousRsi,
          trend: pair.price > pair.ma200 ? "BULLISH" : "BEARISH",
          inPullback: false,
          lastRsiLow: 0,
          lastRsiHigh: 0,
        });

        return {
          symbol: pair.symbol,
          signal,
        };
      });

      return {
        signals,
        timestamp: new Date(),
        totalSignals: signals.length,
        buySignals: signals.filter((s) => s.signal.action === "BUY").length,
        sellSignals: signals.filter((s) => s.signal.action === "SELL").length,
      };
    }),
});

export default strategyRouter;
