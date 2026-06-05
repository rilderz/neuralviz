/**
 * Custom Trading Environment for RL Agent
 * 
 * Gym-style environment that simulates trading with:
 * - Step-by-step market data
 * - Trade execution
 * - Reward calculation
 * - Risk management constraints
 */

export interface TradeState {
  rsi: number;
  ma50: number;
  ma200: number;
  priceChange: number;
  volatility: number;
  currentPosition: number; // 0 = no position, 1 = long, -1 = short
  balance: number;
  equity: number;
  drawdown: number;
  tradesCount: number;
  lastTradeProfit: number;
}

export interface TradeAction {
  action: 0 | 1 | 2; // 0=HOLD, 1=BUY, 2=SELL
  positionSize?: number; // 0-1 (fraction of balance)
}

export interface EnvironmentConfig {
  initialBalance: number;
  maxPositionSize: number; // Max % of balance per trade
  stopLossPercent: number;
  maxDailyTrades: number;
  transactionCost: number; // % per trade
  riskPenalty: number; // Penalty multiplier for drawdown
}

/**
 * Trading Environment
 * Simulates market and calculates rewards for RL agent
 */
export class TradingEnvironment {
  private config: EnvironmentConfig;
  private state: TradeState;
  private priceHistory: number[] = [];
  private positionEntry: number = 0;
  private maxEquity: number;
  private episodeReward: number = 0;
  private episodeTrades: number = 0;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.state = {
      rsi: 50,
      ma50: 100,
      ma200: 100,
      priceChange: 0,
      volatility: 0.01,
      currentPosition: 0,
      balance: config.initialBalance,
      equity: config.initialBalance,
      drawdown: 0,
      tradesCount: 0,
      lastTradeProfit: 0,
    };
    this.maxEquity = config.initialBalance;
  }

  /**
   * Reset environment for new episode
   */
  reset(): TradeState {
    this.state = {
      rsi: 50,
      ma50: 100,
      ma200: 100,
      priceChange: 0,
      volatility: 0.01,
      currentPosition: 0,
      balance: this.config.initialBalance,
      equity: this.config.initialBalance,
      drawdown: 0,
      tradesCount: 0,
      lastTradeProfit: 0,
    };
    this.priceHistory = [];
    this.positionEntry = 0;
    this.maxEquity = this.config.initialBalance;
    this.episodeReward = 0;
    this.episodeTrades = 0;

    return this.state;
  }

  /**
   * Execute one step in the environment
   */
  step(
    action: TradeAction,
    price: number,
    indicators: { rsi: number; ma50: number; ma200: number; volatility: number }
  ): {
    state: TradeState;
    reward: number;
    done: boolean;
    info: { profit: number; tradeExecuted: boolean };
  } {
    // Update state with new indicators
    this.state.rsi = indicators.rsi;
    this.state.ma50 = indicators.ma50;
    this.state.ma200 = indicators.ma200;
    this.state.volatility = indicators.volatility;

    // Calculate price change
    if (this.priceHistory.length > 0) {
      const lastPrice = this.priceHistory[this.priceHistory.length - 1];
      this.state.priceChange = (price - lastPrice) / lastPrice;
    }
    this.priceHistory.push(price);

    let reward = 0;
    let tradeExecuted = false;
    let profit = 0;

    // Check constraints
    const canTrade = this.episodeTrades < this.config.maxDailyTrades;
    const hasBalance = this.state.balance > 0;

    // Execute action
    if (action.action === 1 && canTrade && hasBalance && this.state.currentPosition === 0) {
      // BUY
      const positionSize = Math.min(
        action.positionSize || 0.1,
        this.config.maxPositionSize
      );
      const tradeAmount = this.state.balance * positionSize;

      if (tradeAmount > 0) {
        this.positionEntry = price;
        this.state.currentPosition = 1;
        this.state.balance -= tradeAmount * this.config.transactionCost;
        tradeExecuted = true;
        this.episodeTrades++;
      }
    } else if (action.action === 2 && this.state.currentPosition === 1) {
      // SELL (close long)
      const positionValue = this.state.balance / (1 - this.config.transactionCost);
      profit = (price - this.positionEntry) / this.positionEntry;
      const profitAmount = positionValue * profit;

      this.state.balance += positionValue + profitAmount;
      this.state.balance -= this.state.balance * this.config.transactionCost;
      this.state.lastTradeProfit = profit;
      this.state.currentPosition = 0;
      tradeExecuted = true;
      this.episodeTrades++;
    }

    // Update equity
    if (this.state.currentPosition === 1) {
      const positionValue = this.state.balance / (1 - this.config.transactionCost);
      const unrealizedProfit = (price - this.positionEntry) / this.positionEntry;
      this.state.equity = this.state.balance + positionValue * unrealizedProfit;
    } else {
      this.state.equity = this.state.balance;
    }

    // Calculate drawdown
    if (this.state.equity > this.maxEquity) {
      this.maxEquity = this.state.equity;
    }
    this.state.drawdown = (this.maxEquity - this.state.equity) / this.maxEquity;

    // Calculate reward
    reward = this.calculateReward(profit, tradeExecuted);
    this.episodeReward += reward;

    // Check if episode is done
    const done = this.state.balance <= 0 || this.state.drawdown > 0.2; // Stop if balance gone or 20% drawdown

    return {
      state: this.state,
      reward,
      done,
      info: { profit, tradeExecuted },
    };
  }

  /**
   * Calculate reward with risk penalty
   * 
   * Reward = profit - (risk_penalty * drawdown)
   * This forces agent to:
   * - Make profit
   * - Avoid big losses
   */
  private calculateReward(profit: number, tradeExecuted: boolean): number {
    if (!tradeExecuted) {
      // Small penalty for inaction to encourage trading
      return -0.001;
    }

    // Profit component
    const profitReward = profit * 100; // Scale profit

    // Risk penalty component
    const riskPenalty = this.config.riskPenalty * this.state.drawdown * 100;

    // Transaction cost penalty
    const costPenalty = this.config.transactionCost * 10;

    const totalReward = profitReward - riskPenalty - costPenalty;

    return totalReward;
  }

  /**
   * Get current state as array for neural network
   */
  getStateArray(): number[] {
    return [
      this.state.rsi / 100, // Normalize to 0-1
      this.state.ma50 / 200, // Normalize
      this.state.ma200 / 200, // Normalize
      this.state.priceChange,
      this.state.volatility,
      this.state.currentPosition,
      this.state.balance / this.config.initialBalance,
      this.state.drawdown,
      this.state.tradesCount / this.config.maxDailyTrades,
      this.state.lastTradeProfit,
    ];
  }

  /**
   * Get episode statistics
   */
  getEpisodeStats(): {
    totalReward: number;
    totalTrades: number;
    finalBalance: number;
    finalEquity: number;
    maxDrawdown: number;
    returnPercent: number;
  } {
    return {
      totalReward: this.episodeReward,
      totalTrades: this.episodeTrades,
      finalBalance: this.state.balance,
      finalEquity: this.state.equity,
      maxDrawdown: this.state.drawdown,
      returnPercent: ((this.state.equity - this.config.initialBalance) / this.config.initialBalance) * 100,
    };
  }

  /**
   * Get current state
   */
  getState(): TradeState {
    return this.state;
  }

  /**
   * Validate action against constraints
   */
  validateAction(action: TradeAction): boolean {
    // Check daily trade limit
    if (this.episodeTrades >= this.config.maxDailyTrades) {
      return false;
    }

    // Check balance
    if (this.state.balance <= 0) {
      return false;
    }

    // Check position size
    if (action.positionSize && action.positionSize > this.config.maxPositionSize) {
      return false;
    }

    // Check position state
    if (action.action === 1 && this.state.currentPosition !== 0) {
      return false; // Can't buy if already in position
    }

    if (action.action === 2 && this.state.currentPosition !== 1) {
      return false; // Can't sell if not in long position
    }

    return true;
  }
}

/**
 * Batch environment for training multiple episodes
 */
export class BatchTradingEnvironment {
  private environments: TradingEnvironment[] = [];
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig, batchSize: number = 8) {
    this.config = config;
    for (let i = 0; i < batchSize; i++) {
      this.environments.push(new TradingEnvironment(config));
    }
  }

  /**
   * Reset all environments
   */
  resetAll(): TradeState[] {
    return this.environments.map(env => env.reset());
  }

  /**
   * Step all environments
   */
  stepAll(
    actions: TradeAction[],
    prices: number[],
    indicators: Array<{ rsi: number; ma50: number; ma200: number; volatility: number }>
  ): Array<{
    state: TradeState;
    reward: number;
    done: boolean;
    info: { profit: number; tradeExecuted: boolean };
  }> {
    return this.environments.map((env, i) =>
      env.step(actions[i], prices[i], indicators[i])
    );
  }

  /**
   * Get all episode stats
   */
  getAllStats() {
    return this.environments.map(env => env.getEpisodeStats());
  }
}
