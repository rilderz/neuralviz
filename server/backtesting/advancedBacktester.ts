import { TrendPullbackStrategy } from "../strategies/trendPullbackStrategy";

export interface BacktestCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma200: number;
  rsi: number;
}

export interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  direction: "BUY" | "SELL";
  pnl: number;
  pnlPercent: number;
  riskReward: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortino: number;
  calmarRatio: number;
  recoveryFactor: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  period: {
    start: number;
    end: number;
  };
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: Array<{ timestamp: number; equity: number }>;
  drawdownCurve: Array<{ timestamp: number; drawdown: number }>;
}

/**
 * Advanced Backtesting Engine
 */
export class AdvancedBacktester {
  private strategy = new TrendPullbackStrategy();
  private initialCapital = 10000;
  private riskPerTrade = 0.02; // 2% risk per trade
  private slippage = 0.0002; // 2 pips for forex
  private commission = 0.0001; // 0.01% commission

  /**
   * Run backtest on historical data
   */
  backtest(
    symbol: string,
    timeframe: string,
    candles: BacktestCandle[],
    initialCapital: number = 10000
  ): BacktestResult {
    this.initialCapital = initialCapital;

    const trades: BacktestTrade[] = [];
    let currentPosition: {
      entryTime: number;
      entryPrice: number;
      direction: "BUY" | "SELL";
      stopLoss: number;
      takeProfit: number;
      reason: string;
    } | null = null;

    let equity = initialCapital;
    const equityCurve: Array<{ timestamp: number; equity: number }> = [
      { timestamp: candles[0].timestamp, equity },
    ];

    // Process each candle
    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      const previousCandle = candles[i - 1];

      // Check if we should exit current position
      if (currentPosition) {
        let shouldExit = false;
        let exitPrice = candle.close;
        let exitReason = "";

        // Check stop loss
        if (currentPosition.direction === "BUY" && candle.low <= currentPosition.stopLoss) {
          shouldExit = true;
          exitPrice = currentPosition.stopLoss;
          exitReason = "Stop Loss Hit";
        } else if (
          currentPosition.direction === "SELL" &&
          candle.high >= currentPosition.stopLoss
        ) {
          shouldExit = true;
          exitPrice = currentPosition.stopLoss;
          exitReason = "Stop Loss Hit";
        }

        // Check take profit
        if (currentPosition.direction === "BUY" && candle.high >= currentPosition.takeProfit) {
          shouldExit = true;
          exitPrice = currentPosition.takeProfit;
          exitReason = "Take Profit Hit";
        } else if (
          currentPosition.direction === "SELL" &&
          candle.low <= currentPosition.takeProfit
        ) {
          shouldExit = true;
          exitPrice = currentPosition.takeProfit;
          exitReason = "Take Profit Hit";
        }

        if (shouldExit) {
          // Calculate P&L
          const pnl =
            currentPosition.direction === "BUY"
              ? (exitPrice - currentPosition.entryPrice) * 100 - this.commission * 100
              : (currentPosition.entryPrice - exitPrice) * 100 - this.commission * 100;

          const pnlPercent = (pnl / (currentPosition.entryPrice * 100)) * 100;
          const riskReward =
            Math.abs(
              (currentPosition.takeProfit - currentPosition.entryPrice) /
                (currentPosition.entryPrice - currentPosition.stopLoss)
            ) || 0;

          equity += pnl;

          trades.push({
            entryTime: currentPosition.entryTime,
            entryPrice: currentPosition.entryPrice,
            exitTime: candle.timestamp,
            exitPrice,
            direction: currentPosition.direction,
            pnl,
            pnlPercent,
            riskReward,
            stopLoss: currentPosition.stopLoss,
            takeProfit: currentPosition.takeProfit,
            reason: exitReason,
          });

          currentPosition = null;
        }
      }

      // Generate signal for entry
      const signal = this.strategy.generateSignal({
        price: candle.close,
        ma200: candle.ma200,
        rsi: candle.rsi,
        previousRsi: previousCandle.rsi,
        trend: candle.close > candle.ma200 ? "BULLISH" : "BEARISH",
        inPullback: false,
        lastRsiLow: 0,
        lastRsiHigh: 0,
      });

      // Enter new position if no current position and signal is strong
      if (!currentPosition && signal.action !== "HOLD" && signal.confidence > 0.6) {
        const entryPrice =
          signal.action === "BUY"
            ? candle.close * (1 + this.slippage)
            : candle.close * (1 - this.slippage);

        currentPosition = {
          entryTime: candle.timestamp,
          entryPrice,
          direction: signal.action,
          stopLoss: signal.stopLoss || entryPrice,
          takeProfit: signal.takeProfit || entryPrice,
          reason: signal.reason,
        };
      }

      equityCurve.push({ timestamp: candle.timestamp, equity });
    }

    // Close any remaining position at last candle
    if (currentPosition && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const pnl =
        currentPosition.direction === "BUY"
          ? (lastCandle.close - currentPosition.entryPrice) * 100 - this.commission * 100
          : (currentPosition.entryPrice - lastCandle.close) * 100 - this.commission * 100;

      equity += pnl;
      trades.push({
        entryTime: currentPosition.entryTime,
        entryPrice: currentPosition.entryPrice,
        exitTime: lastCandle.timestamp,
        exitPrice: lastCandle.close,
        direction: currentPosition.direction,
        pnl,
        pnlPercent: (pnl / (currentPosition.entryPrice * 100)) * 100,
        riskReward: 0,
        stopLoss: currentPosition.stopLoss,
        takeProfit: currentPosition.takeProfit,
        reason: "End of Data",
      });
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades, equityCurve, initialCapital);
    const drawdownCurve = this.calculateDrawdown(equityCurve);

    return {
      symbol,
      timeframe,
      period: {
        start: candles[0].timestamp,
        end: candles[candles.length - 1].timestamp,
      },
      trades,
      metrics,
      equityCurve,
      drawdownCurve,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(
    trades: BacktestTrade[],
    equityCurve: Array<{ timestamp: number; equity: number }>,
    initialCapital: number
  ): BacktestMetrics {
    const totalTrades = trades.length;
    const winTrades = trades.filter((t) => t.pnl > 0).length;
    const lossTrades = trades.filter((t) => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? winTrades / totalTrades : 0;

    const wins = trades.filter((t) => t.pnl > 0).map((t) => t.pnl);
    const losses = trades.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));

    const averageWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const profitFactor = averageLoss > 0 ? (averageWin * winTrades) / (averageLoss * lossTrades) : 0;

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);
    const sortino = this.calculateSortino(equityCurve);
    const calmarRatio = maxDrawdown !== 0 ? (totalPnL / initialCapital) / maxDrawdown : 0;
    const recoveryFactor = maxDrawdown !== 0 ? totalPnL / maxDrawdown : 0;

    return {
      totalTrades,
      winTrades,
      lossTrades,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      totalPnL,
      maxDrawdown,
      sharpeRatio,
      sortino,
      calmarRatio,
      recoveryFactor,
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(equityCurve: Array<{ timestamp: number; equity: number }>): number {
    let maxEquity = equityCurve[0].equity;
    let maxDrawdown = 0;

    for (const point of equityCurve) {
      if (point.equity > maxEquity) {
        maxEquity = point.equity;
      }
      const drawdown = (maxEquity - point.equity) / maxEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate drawdown curve
   */
  private calculateDrawdown(
    equityCurve: Array<{ timestamp: number; equity: number }>
  ): Array<{ timestamp: number; drawdown: number }> {
    let maxEquity = equityCurve[0].equity;
    const drawdownCurve: Array<{ timestamp: number; drawdown: number }> = [];

    for (const point of equityCurve) {
      if (point.equity > maxEquity) {
        maxEquity = point.equity;
      }
      const drawdown = (maxEquity - point.equity) / maxEquity;
      drawdownCurve.push({
        timestamp: point.timestamp,
        drawdown,
      });
    }

    return drawdownCurve;
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(
    equityCurve: Array<{ timestamp: number; equity: number }>
  ): number {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret =
        (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev !== 0 ? (meanReturn * 252) / stdDev : 0; // 252 trading days
  }

  /**
   * Calculate Sortino Ratio (downside deviation only)
   */
  private calculateSortino(
    equityCurve: Array<{ timestamp: number; equity: number }>
  ): number {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret =
        (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsidevariace = returns
      .filter((r) => r < 0)
      .reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
    const downsideStdDev = Math.sqrt(downsidevariace);

    return downsideStdDev !== 0 ? (meanReturn * 252) / downsideStdDev : 0;
  }
}
