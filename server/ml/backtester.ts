/**
 * Backtesting Engine for Forex Trading
 * 
 * Simulates trading on historical data with proper risk management
 */

export interface BacktestConfig {
  initialCapital: number;
  riskPerTrade: number; // 1-2%
  stopLossPercent: number; // 2%
  commissionPercent: number; // 0.1%
  slippagePercent: number; // 0.05%
}

export interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeRecord {
  entryTime: Date;
  exitTime?: Date;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss: number;
  takeProfit?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  status: 'open' | 'closed';
  reason?: string;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalReturn: number; // Percentage
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  trades: TradeRecord[];
  equityCurve: number[];
}

/**
 * Backtester class
 */
export class Backtester {
  private config: BacktestConfig;
  private trades: TradeRecord[] = [];
  private equityCurve: number[] = [];
  private currentBalance: number;
  private openTrades: TradeRecord[] = [];

  constructor(config: BacktestConfig) {
    this.config = config;
    this.currentBalance = config.initialCapital;
    this.equityCurve.push(config.initialCapital);
  }

  /**
   * Calculate position size based on risk management
   */
  private calculatePositionSize(entryPrice: number, stopLoss: number): number {
    const riskAmount = this.currentBalance * (this.config.riskPerTrade / 100);
    const priceDistance = Math.abs(entryPrice - stopLoss);
    const quantity = riskAmount / priceDistance;
    return Math.floor(quantity * 100000) / 100000; // Limit precision
  }

  /**
   * Calculate take profit based on risk-reward ratio
   */
  private calculateTakeProfit(
    entryPrice: number,
    stopLoss: number,
    side: 'BUY' | 'SELL'
  ): number {
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = riskDistance * 1.5; // 1:1.5 risk-reward ratio

    if (side === 'BUY') {
      return entryPrice + rewardDistance;
    } else {
      return entryPrice - rewardDistance;
    }
  }

  /**
   * Execute a trade
   */
  executeTrade(
    signal: 'BUY' | 'SELL',
    price: number,
    timestamp: Date,
    volatility: number
  ): TradeRecord | null {
    // Apply slippage
    const slippage = price * (this.config.slippagePercent / 100);
    const executionPrice = signal === 'BUY' ? price + slippage : price - slippage;

    // Calculate stop loss (2% below entry for BUY, 2% above for SELL)
    const stopLoss =
      signal === 'BUY'
        ? executionPrice * (1 - this.config.stopLossPercent / 100)
        : executionPrice * (1 + this.config.stopLossPercent / 100);

    // Calculate position size
    const quantity = this.calculatePositionSize(executionPrice, stopLoss);

    // Check if we have enough capital
    const requiredMargin = executionPrice * quantity * 0.02; // 50:1 leverage
    if (requiredMargin > this.currentBalance) {
      return null;
    }

    const takeProfit = this.calculateTakeProfit(executionPrice, stopLoss, signal);

    const trade: TradeRecord = {
      entryTime: timestamp,
      side: signal,
      entryPrice: executionPrice,
      quantity,
      stopLoss,
      takeProfit,
      status: 'open',
    };

    this.openTrades.push(trade);
    return trade;
  }

  /**
   * Close a trade
   */
  closeTrade(
    trade: TradeRecord,
    exitPrice: number,
    timestamp: Date,
    reason: string
  ): void {
    // Apply slippage on exit
    const slippage = exitPrice * (this.config.slippagePercent / 100);
    const actualExitPrice = trade.side === 'BUY' ? exitPrice - slippage : exitPrice + slippage;

    const priceChange =
      trade.side === 'BUY'
        ? actualExitPrice - trade.entryPrice
        : trade.entryPrice - actualExitPrice;

    const profitLoss = priceChange * trade.quantity;
    const commission = (trade.entryPrice * trade.quantity + actualExitPrice * trade.quantity) *
      (this.config.commissionPercent / 100);

    const netProfitLoss = profitLoss - commission;
    const profitLossPercent = (netProfitLoss / (trade.entryPrice * trade.quantity)) * 100;

    trade.exitPrice = actualExitPrice;
    trade.exitTime = timestamp;
    trade.profitLoss = netProfitLoss;
    trade.profitLossPercent = profitLossPercent;
    trade.status = 'closed';
    trade.reason = reason;

    this.currentBalance += netProfitLoss;
    this.equityCurve.push(this.currentBalance);

    // Remove from open trades
    this.openTrades = this.openTrades.filter((t) => t !== trade);
    this.trades.push(trade);
  }

  /**
   * Process a price bar and check for trade exits
   */
  processPriceBar(bar: PriceBar): void {
    const openTradesSnapshot = [...this.openTrades];

    for (const trade of openTradesSnapshot) {
      let shouldClose = false;
      let reason = '';

      if (trade.side === 'BUY') {
        if (bar.low <= trade.stopLoss) {
          this.closeTrade(trade, trade.stopLoss, bar.timestamp, 'Stop Loss Hit');
          shouldClose = true;
        } else if (trade.takeProfit && bar.high >= trade.takeProfit) {
          this.closeTrade(trade, trade.takeProfit, bar.timestamp, 'Take Profit Hit');
          shouldClose = true;
        }
      } else {
        // SELL
        if (bar.high >= trade.stopLoss) {
          this.closeTrade(trade, trade.stopLoss, bar.timestamp, 'Stop Loss Hit');
          shouldClose = true;
        } else if (trade.takeProfit && bar.low <= trade.takeProfit) {
          this.closeTrade(trade, trade.takeProfit, bar.timestamp, 'Take Profit Hit');
          shouldClose = true;
        }
      }
    }
  }

  /**
   * Run backtest on historical data
   */
  backtest(
    priceData: PriceBar[],
    signals: Array<{ timestamp: Date; signal: 'BUY' | 'SELL' | 'HOLD' }>
  ): BacktestResult {
    for (let i = 0; i < priceData.length; i++) {
      const bar = priceData[i];
      const signal = signals[i];

      // Process existing trades
      this.processPriceBar(bar);

      // Execute new signal
      if (signal.signal !== 'HOLD' && this.openTrades.length === 0) {
        const volatility = (bar.high - bar.low) / bar.close;
        this.executeTrade(signal.signal, bar.close, bar.timestamp, volatility);
      }
    }

    // Close remaining open trades at last price
    const lastBar = priceData[priceData.length - 1];
    while (this.openTrades.length > 0) {
      const trade = this.openTrades[0];
      this.closeTrade(trade, lastBar.close, lastBar.timestamp, 'End of Backtest');
    }

    return this.generateReport();
  }

  /**
   * Generate backtest report
   */
  private generateReport(): BacktestResult {
    const winningTrades = this.trades.filter((t) => (t.profitLoss || 0) > 0);
    const losingTrades = this.trades.filter((t) => (t.profitLoss || 0) <= 0);

    const totalProfit = this.trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalReturn = ((this.currentBalance - this.config.initialCapital) /
      this.config.initialCapital) * 100;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = this.config.initialCapital;
    for (const equity of this.equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Sharpe Ratio
    const returns = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      returns.push((this.equityCurve[i] - this.equityCurve[i - 1]) / this.equityCurve[i - 1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252); // Annualized

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const grossLoss = Math.abs(
      losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0,
      totalProfit,
      totalReturn,
      maxDrawdown,
      sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
      profitFactor,
      trades: this.trades,
      equityCurve: this.equityCurve,
    };
  }
}
