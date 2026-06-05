/**
 * Rigorous Backtester for Pullback Strategy
 * Tests: "Buy Pullbacks in Uptrend"
 * Requirements: 100+ trades, realistic costs, clear metrics
 */

export interface PriceBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  exitReason: "TP" | "SL" | "TIME_LIMIT";
  profitLoss: number;
  profitLossPercent: number;
  riskReward: number;
  holdingTime: number; // minutes
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  expectedValue: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryFactor: number;
  profitableMonths: number;
  totalMonths: number;
}

export class PullbackBacktester {
  private readonly MA200_PERIOD = 200;
  private readonly MA50_PERIOD = 50;
  private readonly RSI_PERIOD = 14;
  private readonly RSI_OVERSOLD = 40;
  private readonly ENTRY_RSI = 40;
  private readonly STOP_LOSS_PERCENT = 0.02; // 2%
  private readonly TAKE_PROFIT_PERCENT = 0.03; // 3%
  private readonly SPREAD_PIPS = 2;
  private readonly SLIPPAGE_PIPS = 1;
  private readonly COMMISSION_PERCENT = 0.0001; // 0.01%
  private readonly MAX_TRADES_PER_DAY = 5;
  private readonly MAX_DAILY_LOSS_PERCENT = 0.2; // 20%

  /**
   * Calculate Simple Moving Average
   */
  private calculateMA(prices: number[], period: number): number[] {
    const ma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        rsi.push(NaN);
        continue;
      }

      const change = prices[i] - prices[i - 1];
      if (i < period) {
        if (change > 0) gains += change;
        else losses += Math.abs(change);

        if (i === period) {
          gains /= period;
          losses /= period;
        }
      } else {
        if (change > 0) {
          gains = (gains * (period - 1) + change) / period;
          losses = (losses * (period - 1)) / period;
        } else {
          gains = (gains * (period - 1)) / period;
          losses = (losses * (period - 1) + Math.abs(change)) / period;
        }
      }

      if (i < period) {
        rsi.push(NaN);
      } else {
        const rs = gains / (losses || 1);
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return rsi;
  }

  /**
   * Detect pullback entry signals
   */
  private detectSignals(
    bars: PriceBar[],
    ma200: number[],
    ma50: number[],
    rsi: number[]
  ): number[] {
    const signals: number[] = [];
    let inUptrend = false;
    let rsiWasOversold = false;

    for (let i = 0; i < bars.length; i++) {
      const price = bars[i].close;
      const ma200Val = ma200[i];
      const ma50Val = ma50[i];
      const rsiVal = rsi[i];

      if (isNaN(ma200Val) || isNaN(ma50Val) || isNaN(rsiVal)) {
        signals.push(0);
        continue;
      }

      // Check if in uptrend
      if (price > ma200Val && ma50Val > ma200Val) {
        inUptrend = true;
      } else {
        inUptrend = false;
        rsiWasOversold = false;
      }

      // Check for pullback (RSI < 40)
      if (inUptrend && rsiVal < this.RSI_OVERSOLD) {
        rsiWasOversold = true;
      }

      // Entry signal: RSI crosses above 40 after pullback
      if (inUptrend && rsiWasOversold && rsiVal > this.ENTRY_RSI) {
        signals.push(1); // BUY signal
        rsiWasOversold = false;
      } else {
        signals.push(0);
      }
    }

    return signals;
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(bars: PriceBar[]): Promise<{
    trades: BacktestTrade[];
    metrics: BacktestMetrics;
  }> {
    if (bars.length < this.MA200_PERIOD) {
      throw new Error(`Need at least ${this.MA200_PERIOD} bars for MA200`);
    }

    // Calculate indicators
    const closes = bars.map((b) => b.close);
    const ma200 = this.calculateMA(closes, this.MA200_PERIOD);
    const ma50 = this.calculateMA(closes, this.MA50_PERIOD);
    const rsi = this.calculateRSI(closes, this.RSI_PERIOD);

    // Detect signals
    const signals = this.detectSignals(bars, ma200, ma50, rsi);

    // Execute trades
    const trades: BacktestTrade[] = [];
    let i = 0;
    let dailyTrades = 0;
    let dailyLoss = 0;
    let currentDate = new Date(bars[0].timestamp).toDateString();

    while (i < bars.length) {
      // Check if new day
      const barDate = new Date(bars[i].timestamp).toDateString();
      if (barDate !== currentDate) {
        currentDate = barDate;
        dailyTrades = 0;
        dailyLoss = 0;
      }

      // Check for entry signal
      if (signals[i] === 1 && dailyTrades < this.MAX_TRADES_PER_DAY && dailyLoss > -this.MAX_DAILY_LOSS_PERCENT * 100) {
        const entryPrice = bars[i].close + (this.SPREAD_PIPS + this.SLIPPAGE_PIPS) * 0.0001;
        const stopLoss = entryPrice * (1 - this.STOP_LOSS_PERCENT);
        const takeProfit = entryPrice * (1 + this.TAKE_PROFIT_PERCENT);

        // Find exit
        let exitPrice = 0;
        let exitTime = 0;
        let exitReason: "TP" | "SL" | "TIME_LIMIT" = "TIME_LIMIT";
        let maxHoldingTime = 4 * 60; // 4 hours max

        for (let j = i + 1; j < bars.length && j < i + maxHoldingTime; j++) {
          const bar = bars[j];

          // Check for stop loss
          if (bar.low <= stopLoss) {
            exitPrice = stopLoss;
            exitTime = bar.timestamp;
            exitReason = "SL";
            break;
          }

          // Check for take profit
          if (bar.high >= takeProfit) {
            exitPrice = takeProfit;
            exitTime = bar.timestamp;
            exitReason = "TP";
            break;
          }

          // Time limit exit
          if (j === i + maxHoldingTime - 1) {
            exitPrice = bar.close;
            exitTime = bar.timestamp;
            exitReason = "TIME_LIMIT";
          }
        }

        if (exitPrice > 0) {
          // Calculate P&L
          const profitLoss = exitPrice - entryPrice;
          const profitLossPercent = (profitLoss / entryPrice) * 100;
          const riskReward = Math.abs(profitLossPercent) / this.STOP_LOSS_PERCENT / 100;

          const trade: BacktestTrade = {
            entryTime: bars[i].timestamp,
            entryPrice,
            exitTime,
            exitPrice,
            exitReason,
            profitLoss,
            profitLossPercent,
            riskReward,
            holdingTime: (exitTime - bars[i].timestamp) / 60000, // minutes
          };

          trades.push(trade);
          dailyTrades++;
          dailyLoss += profitLossPercent;

          i = bars.findIndex((b) => b.timestamp > exitTime);
          if (i === -1) break;
          continue;
        }
      }

      i++;
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades);

    return { trades, metrics };
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(trades: BacktestTrade[]): BacktestMetrics {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        grossProfit: 0,
        grossLoss: 0,
        netProfit: 0,
        avgWin: 0,
        avgLoss: 0,
        expectedValue: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        recoveryFactor: 0,
        profitableMonths: 0,
        totalMonths: 0,
      };
    }

    const winningTrades = trades.filter((t) => t.profitLoss > 0);
    const losingTrades = trades.filter((t) => t.profitLoss <= 0);

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));
    const netProfit = grossProfit - grossLoss;

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const expectedValue = winRate * avgWin - (1 - winRate) * avgLoss;

    // Sharpe Ratio (simplified)
    const returns = trades.map((t) => t.profitLossPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Max Drawdown
    let maxDrawdown = 0;
    let runningMax = 0;
    let runningPL = 0;

    for (const trade of trades) {
      runningPL += trade.profitLoss;
      runningMax = Math.max(runningMax, runningPL);
      const drawdown = runningMax - runningPL;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;

    // Count profitable months
    const monthMap = new Map<string, number>();
    for (const trade of trades) {
      const date = new Date(trade.exitTime);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const current = monthMap.get(monthKey) || 0;
      monthMap.set(monthKey, current + trade.profitLoss);
    }

    const profitableMonths = Array.from(monthMap.values()).filter((m) => m > 0).length;
    const totalMonths = monthMap.size;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      grossProfit,
      grossLoss,
      netProfit,
      avgWin,
      avgLoss,
      expectedValue,
      sharpeRatio,
      maxDrawdown,
      recoveryFactor,
      profitableMonths,
      totalMonths,
    };
  }
}
