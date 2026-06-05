/**
 * Analysis Router
 * 
 * tRPC procedures for fundamental, technical, and hybrid analysis
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { HybridAnalyzer } from '../analysis/hybridAnalyzer';
import { FundamentalAnalyzer } from '../analysis/fundamentalAnalysis';
import { TechnicalAnalyzer } from '../analysis/technicalAnalysis';
import { generateForexData } from '../ml/dataGenerator';
import { FOREX_PAIRS } from '../ml/multiCurrencyTrader';

// Global analyzers
let hybridAnalyzer: HybridAnalyzer | null = null;

function getHybridAnalyzer(): HybridAnalyzer {
  if (!hybridAnalyzer) {
    hybridAnalyzer = new HybridAnalyzer();
  }
  return hybridAnalyzer;
}

export const analysisRouter = router({
  /**
   * Perform hybrid analysis on a currency pair
   */
  analyzeHybrid: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const pair = FOREX_PAIRS[input.symbol];
        if (!pair) {
          return {
            success: false,
            error: `Currency pair ${input.symbol} not supported`,
          };
        }

        // Extract base and quote currencies
        const [baseCurrency, quoteCurrency] = input.symbol.split('/');

        // Generate price data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const priceData = generateForexData(input.symbol, startDate, endDate, pair.basePrice, 100);
        const prices = priceData.map(p => p.close);

        // Perform hybrid analysis
        const analyzer = getHybridAnalyzer();
        const result = analyzer.analyze(input.symbol, baseCurrency, quoteCurrency, prices);

        return {
          success: true,
          analysis: {
            symbol: result.symbol,
            recommendation: result.recommendation,
            combinedScore: result.combinedScore,
            confidence: result.confidence,
            reasoning: result.reasoning,
            fundamental: {
              score: result.fundamentalScore.overallScore,
              recommendation: result.fundamentalScore.recommendation,
              gdpGrowth: result.fundamentalScore.gdpGrowth,
              inflationRate: result.fundamentalScore.inflationRate,
              unemploymentRate: result.fundamentalScore.unemploymentRate,
              interestRate: result.fundamentalScore.interestRate,
              tradeBalance: result.fundamentalScore.tradeBalance,
              newsSentiment: result.fundamentalScore.newsSentiment,
              signals: result.signals.fundamental,
            },
            technical: {
              score: result.technicalScore.overallScore,
              recommendation: result.technicalScore.recommendation,
              trendStrength: result.technicalScore.trendStrength,
              momentumScore: result.technicalScore.momentumScore,
              volatilityScore: result.technicalScore.volatilityScore,
              patternScore: result.technicalScore.patternScore,
              signals: result.signals.technical,
              indicators: {
                rsi: result.technicalIndicators.rsi,
                macd: result.technicalIndicators.macd,
                atr: result.technicalIndicators.atr,
                adx: result.technicalIndicators.adx,
                bollingerBands: {
                  position: result.technicalIndicators.bollingerBands.position,
                },
                stochastic: {
                  k: result.technicalIndicators.stochastic.k,
                  d: result.technicalIndicators.stochastic.d,
                },
              },
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    }),

  /**
   * Get fundamental analysis only
   */
  analyzeFundamental: publicProcedure
    .input(
      z.object({
        baseCurrency: z.string(),
        quoteCurrency: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const analyzer = getHybridAnalyzer();
        const fundamentalAnalyzer = analyzer.getFundamentalAnalyzer();
        const score = fundamentalAnalyzer.calculateFundamentalScore(
          input.baseCurrency,
          input.quoteCurrency
        );

        return {
          success: true,
          fundamental: {
            score: score.overallScore,
            recommendation: score.recommendation,
            gdpGrowth: score.gdpGrowth,
            inflationRate: score.inflationRate,
            unemploymentRate: score.unemploymentRate,
            interestRate: score.interestRate,
            tradeBalance: score.tradeBalance,
            newsSentiment: score.newsSentiment,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Fundamental analysis failed',
        };
      }
    }),

  /**
   * Get technical analysis only
   */
  analyzeTechnical: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const pair = FOREX_PAIRS[input.symbol];
        if (!pair) {
          return {
            success: false,
            error: `Currency pair ${input.symbol} not supported`,
          };
        }

        // Generate price data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const priceData = generateForexData(input.symbol, startDate, endDate, pair.basePrice, 100);
        const prices = priceData.map(p => p.close);

        // Perform technical analysis
        const analyzer = getHybridAnalyzer();
        const technicalAnalyzer = analyzer.getTechnicalAnalyzer();
        const indicators = technicalAnalyzer.calculateIndicators(prices);
        const score = technicalAnalyzer.calculateTechnicalScore(indicators);

        return {
          success: true,
          technical: {
            score: score.overallScore,
            recommendation: score.recommendation,
            trendStrength: score.trendStrength,
            momentumScore: score.momentumScore,
            volatilityScore: score.volatilityScore,
            patternScore: score.patternScore,
            indicators: {
              rsi: indicators.rsi,
              macd: indicators.macd,
              atr: indicators.atr,
              adx: indicators.adx,
              bollingerBands: {
                upper: indicators.bollingerBands.upper,
                middle: indicators.bollingerBands.middle,
                lower: indicators.bollingerBands.lower,
                position: indicators.bollingerBands.position,
              },
              movingAverages: {
                sma20: indicators.movingAverages.sma20,
                sma50: indicators.movingAverages.sma50,
                ema12: indicators.movingAverages.ema12,
                ema26: indicators.movingAverages.ema26,
              },
              stochastic: {
                k: indicators.stochastic.k,
                d: indicators.stochastic.d,
              },
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Technical analysis failed',
        };
      }
    }),

  /**
   * Analyze all currency pairs
   */
  analyzeAll: publicProcedure.query(() => {
    try {
      const analyzer = getHybridAnalyzer();
      const results = [];

      for (const symbol of Object.keys(FOREX_PAIRS)) {
        const [baseCurrency, quoteCurrency] = symbol.split('/');
        const pair = FOREX_PAIRS[symbol];

        // Generate price data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const priceData = generateForexData(symbol, startDate, endDate, pair.basePrice, 100);
        const prices = priceData.map(p => p.close);

        // Perform analysis
        const analysis = analyzer.analyze(symbol, baseCurrency, quoteCurrency, prices);

        results.push({
          symbol,
          recommendation: analysis.recommendation,
          combinedScore: analysis.combinedScore,
          confidence: analysis.confidence,
          fundamentalScore: analysis.fundamentalScore.overallScore,
          technicalScore: analysis.technicalScore.overallScore,
        });
      }

      return {
        success: true,
        analyses: results,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }),

  /**
   * Get analysis explanation
   */
  getExplanation: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const pair = FOREX_PAIRS[input.symbol];
        if (!pair) {
          return {
            success: false,
            error: `Currency pair ${input.symbol} not supported`,
          };
        }

        // Extract currencies
        const [baseCurrency, quoteCurrency] = input.symbol.split('/');

        // Generate price data
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const priceData = generateForexData(input.symbol, startDate, endDate, pair.basePrice, 100);
        const prices = priceData.map(p => p.close);

        // Perform analysis
        const analyzer = getHybridAnalyzer();
        const analysis = analyzer.analyze(input.symbol, baseCurrency, quoteCurrency, prices);

        return {
          success: true,
          explanation: {
            symbol: input.symbol,
            recommendation: analysis.recommendation,
            reasoning: analysis.reasoning,
            confidence: analysis.confidence,
            fundamentalSignals: analysis.signals.fundamental,
            technicalSignals: analysis.signals.technical,
            fundamentalScore: analysis.fundamentalScore.overallScore,
            technicalScore: analysis.technicalScore.overallScore,
            combinedScore: analysis.combinedScore,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get explanation',
        };
      }
    }),
});
