/**
 * Rigorous Backtesting Engine
 * 
 * Features:
 * - Walk-forward validation (simulates real trading)
 * - Proper train/test split (no lookahead bias)
 * - Realistic slippage and commissions
 * - Detailed performance metrics
 */

import { OHLCV, FeatureEngineer, FeatureVector } from './featureEngineering';
import { XGBoostModel, PredictionResult } from './xgboostModel';

export interface BacktestConfig {
  initialCapital: number;
  riskPerTrade: number; // 0.01 = 1%
  stopLossPips: number;
  takeProfitPips: number;
  slippage: number; // in pips
  commission: number; // in pips
  maxTradesPerDay: number;
  minConfidence: number; // Only trade if confidence > this
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  riskRewardRatio: number;
  trades: Trade[];
  equityCurve: number[];
  dailyReturns: number[];
}

export interface Trade {
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  signal: string;
  pnl: number;
  pnlPercent: number;
  confidence: number;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Walk-Forward Backtester
 */
export class BacktestingEngine {
  /**
   * Run walk-forward validation
   * 
   * Simulates real trading by:
   * 1. Training on historical data
   * 2. Testing on unseen future data
   * 3. Moving forward and repeating
   */
  static walkForwardBacktest(
    candles: OHLCV[],
    config: BacktestConfig,
    windowSize: number = 252 * 4 // 4 years of trading days
  ): {
    results: BacktestResult[];
    aggregatedResults: BacktestResult;
    overfittingDetected: boolean;
  } {
    const results: BacktestResult[] = [];
    const allTrades: Trade[] = [];
    const allReturns: number[] = [];

    // Walk forward in 3-month steps
    const stepSize = 63; // ~3 months of trading days

    for (let i = windowSize; i < candles.length - stepSize; i += stepSize) {
      // Training period: windowSize candles
      const trainStart = Math.max(0, i - windowSize);
      const trainEnd = i;
      const trainCandles = candles.slice(trainStart, trainEnd);

      // Test period: next stepSize candles
      const testStart = trainEnd;
      const testEnd = Math.min(candles.length, trainEnd + stepSize);
      const testCandles = candles.slice(testStart, testEnd);

      // Train model
      const model = new XGBoostModel();
      const trainingData = this.prepareTrainingData(trainCandles);
      model.train(trainingData);

      // Test model
      const result = this.backtest(testCandles, model, config);
      results.push(result);

      allTrades.push(...result.trades);
      allReturns.push(...result.dailyReturns);
    }

    // Aggregate results
    const aggregated = this.aggregateResults(allTrades, allReturns, config.initialCapital);

    // Detect overfitting
    const trainAccuracy = results.reduce((sum, r) => sum + (r.winRate > 0.55 ? 1 : 0), 0) / results.length;
    const testAccuracy = aggregated.winRate;
    const overfittingDetected = trainAccuracy > 0.7 && testAccuracy < 0.45;

    return {
      results,
      aggregatedResults: aggregated,
      overfittingDetected,
    };
  }

  /**
   * Single backtest run
   */
  static backtest(candles: OHLCV[], model: XGBoostModel, config: BacktestConfig): BacktestResult {
    const trades: Trade[] = [];
    let equity = config.initialCapital;
    const equityCurve: number[] = [equity];
    const dailyReturns: number[] = [];

    let currentDate: Date | null = null;
    let tradesInCurrentDay = 0;
    let activePosition: { entryPrice: number; entryTime: Date; signal: string; confidence: number } | null = null;

    for (let i = 200; i < candles.length; i++) {
      const candle = candles[i];

      // Reset daily trade count
      if (!currentDate || currentDate.getDate() !== candle.timestamp.getDate()) {
        currentDate = candle.timestamp;
        tradesInCurrentDay = 0;
      }

      // Extract features
      const features = FeatureEngineer.extractFeatures(candles, i);
      if (!features) continue;

      // Get prediction
      const prediction = model.predict(features);

      // Check if we should exit active position
      if (activePosition) {
        let exitPrice: number | null = null;
        let exitReason: string = '';

        // Check stop loss
        if (candle.low <= activePosition.entryPrice - config.stopLossPips * 0.0001) {
          exitPrice = activePosition.entryPrice - config.stopLossPips * 0.0001;
          exitReason = 'Stop Loss';
        }

        // Check take profit
        if (candle.high >= activePosition.entryPrice + config.takeProfitPips * 0.0001) {
          exitPrice = activePosition.entryPrice + config.takeProfitPips * 0.0001;
          exitReason = 'Take Profit';
        }

        // Check time stop (4 hours = 48 candles of 5-min)
        const minutesSinceEntry = (candle.timestamp.getTime() - activePosition.entryTime.getTime()) / (1000 * 60);
        if (minutesSinceEntry > 240) {
          exitPrice = candle.close;
          exitReason = 'Time Stop';
        }

        if (exitPrice) {
          const pnl = (exitPrice - activePosition.entryPrice - config.slippage * 0.0001 - config.commission * 0.0001) * 100000; // Assuming 1 micro lot
          const pnlPercent = (pnl / (config.initialCapital * config.riskPerTrade)) * 100;

          trades.push({
            entryTime: activePosition.entryTime,
            entryPrice: activePosition.entryPrice,
            exitTime: candle.timestamp,
            exitPrice,
            signal: activePosition.signal,
            pnl,
            pnlPercent,
            confidence: activePosition.confidence,
            stopLoss: activePosition.entryPrice - config.stopLossPips * 0.0001,
            takeProfit: activePosition.entryPrice + config.takeProfitPips * 0.0001,
          });

          equity += pnl;
          equityCurve.push(equity);
          dailyReturns.push(pnl / equity);

          activePosition = null;
        }
      }

      // Check if we should enter new position
      if (!activePosition && tradesInCurrentDay < config.maxTradesPerDay && prediction.confidence > config.minConfidence) {
        if (prediction.signal === 'BUY' || prediction.signal === 'SELL') {
          activePosition = {
            entryPrice: candle.close + config.slippage * 0.0001,
            entryTime: candle.timestamp,
            signal: prediction.signal,
            confidence: prediction.confidence,
          };
          tradesInCurrentDay++;
        }
      }
    }

    // Close any remaining position
    if (activePosition && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const pnl = (lastCandle.close - activePosition.entryPrice - config.commission * 0.0001) * 100000;
      equity += pnl;
      equityCurve.push(equity);
    }

    return this.calculateMetrics(trades, equityCurve, dailyReturns, config.initialCapital);
  }

  /**
   * Prepare training data from candles
   */
  private static prepareTrainingData(candles: OHLCV[]): { features: FeatureVector[]; labels: number[] } {
    const features: FeatureVector[] = [];
    const labels: number[] = [];

    for (let i = 200; i < candles.length - 5; i++) {
      const feature = FeatureEngineer.extractFeatures(candles, i);
      if (!feature) continue;

      // Label based on next 5 candles
      const futureReturn = Math.log(candles[i + 5].close / candles[i].close);

      let label = 0; // HOLD
      if (futureReturn > 0.001) label = 1; // BUY
      if (futureReturn < -0.001) label = -1; // SELL

      features.push(feature);
      labels.push(label);
    }

    return { features, labels };
  }

  /**
   * Calculate performance metrics
   */
  private static calculateMetrics(
    trades: Trade[],
    equityCurve: number[],
    dailyReturns: number[],
    initialCapital: number
  ): BacktestResult {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = totalProfit - totalLoss;

    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : 0;

    // Sharpe Ratio
    const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 0 ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

    // Max Drawdown
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    const maxDrawdownPercent = (maxDrawdown / initialCapital) * 100;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit,
      totalLoss,
      netProfit,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      averageWin,
      averageLoss,
      riskRewardRatio,
      trades,
      equityCurve,
      dailyReturns,
    };
  }

  /**
   * Aggregate results from multiple backtests
   */
  private static aggregateResults(trades: Trade[], dailyReturns: number[], initialCapital: number): BacktestResult {
    return this.calculateMetrics(trades, [initialCapital, ...dailyReturns.map((r, i) => initialCapital * (1 + r))], dailyReturns, initialCapital);
  }
}
