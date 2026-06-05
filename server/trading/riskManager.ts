/**
 * Strict External Risk Management Layer
 * 
 * CRITICAL: This layer OVERRIDES AI decisions
 * - AI can suggest trades, but risk manager decides if they execute
 * - Protects capital aggressively
 * - Never lets AI override hard limits
 */

export interface RiskConfig {
  accountSize: number;
  riskPerTrade: number; // 1-2% of account
  maxDailyLoss: number; // % of account
  maxDrawdown: number; // % of account
  maxTradesPerDay: number;
  maxConsecutiveLosses: number;
  minRiskRewardRatio: number; // e.g., 1.5:1
}

export interface AccountState {
  equity: number;
  dailyPnL: number;
  monthlyPnL: number;
  consecutiveLosses: number;
  tradesExecutedToday: number;
  maxEquity: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
}

export interface TradeRequest {
  symbol: string;
  signal: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  aiRecommendedSize: number;
}

export interface TradeApproval {
  approved: boolean;
  reason: string;
  adjustedSize: number;
  adjustedStopLoss: number;
  adjustedTakeProfit: number;
  riskAmount: number;
  rewardAmount: number;
}

/**
 * Risk Manager - External Control Layer
 */
export class RiskManager {
  private config: RiskConfig;
  private accountState: AccountState;

  constructor(config: RiskConfig) {
    this.config = config;
    this.accountState = {
      equity: config.accountSize,
      dailyPnL: 0,
      monthlyPnL: 0,
      consecutiveLosses: 0,
      tradesExecutedToday: 0,
      maxEquity: config.accountSize,
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
    };
  }

  /**
   * CRITICAL: Evaluate if AI trade should be executed
   * 
   * This is the gatekeeper - AI cannot override these rules
   */
  evaluateTradeRequest(request: TradeRequest): TradeApproval {
    // Rule 1: Daily trade limit
    if (this.accountState.tradesExecutedToday >= this.config.maxTradesPerDay) {
      return {
        approved: false,
        reason: `Daily trade limit (${this.config.maxTradesPerDay}) reached`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount: 0,
        rewardAmount: 0,
      };
    }

    // Rule 2: Consecutive loss limit
    if (this.accountState.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return {
        approved: false,
        reason: `Consecutive loss limit (${this.config.maxConsecutiveLosses}) reached - STOP TRADING`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount: 0,
        rewardAmount: 0,
      };
    }

    // Rule 3: Daily loss limit
    if (this.accountState.dailyPnL < -this.config.accountSize * this.config.maxDailyLoss) {
      return {
        approved: false,
        reason: `Daily loss limit (${this.config.maxDailyLoss * 100}%) exceeded - STOP TRADING TODAY`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount: 0,
        rewardAmount: 0,
      };
    }

    // Rule 4: Maximum drawdown
    if (this.accountState.currentDrawdownPercent > this.config.maxDrawdown) {
      return {
        approved: false,
        reason: `Maximum drawdown (${this.config.maxDrawdown * 100}%) exceeded - PAUSE TRADING`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount: 0,
        rewardAmount: 0,
      };
    }

    // Rule 5: Risk/Reward Ratio
    const riskAmount = Math.abs(request.entryPrice - request.stopLoss);
    const rewardAmount = Math.abs(request.takeProfit - request.entryPrice);
    
    // Guard against division by zero
    if (riskAmount === 0) {
      return {
        approved: false,
        reason: 'Invalid stop loss: entry price equals stop loss',
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount: 0,
        rewardAmount,
      };
    }
    
    const riskRewardRatio = rewardAmount / riskAmount;

    if (riskRewardRatio < this.config.minRiskRewardRatio) {
      return {
        approved: false,
        reason: `Risk/Reward ratio (${riskRewardRatio.toFixed(2)}) below minimum (${this.config.minRiskRewardRatio})`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount,
        rewardAmount,
      };
    }

    // Rule 6: Confidence threshold
    if (request.confidence < 0.60) {
      return {
        approved: false,
        reason: `AI confidence (${(request.confidence * 100).toFixed(1)}%) below minimum (60%)`,
        adjustedSize: 0,
        adjustedStopLoss: request.stopLoss,
        adjustedTakeProfit: request.takeProfit,
        riskAmount,
        rewardAmount,
      };
    }

    // Calculate position size based on risk management
    const maxRiskAmount = this.config.accountSize * this.config.riskPerTrade;
    const positionSize = maxRiskAmount / riskAmount;

    // Adjust stop loss if too wide
    let adjustedStopLoss = request.stopLoss;
    let adjustedTakeProfit = request.takeProfit;

    const maxStopLossPips = this.config.accountSize * 0.02 / positionSize; // Max 2% risk
    const actualStopLossPips = Math.abs(request.entryPrice - request.stopLoss);

    if (actualStopLossPips > maxStopLossPips) {
      adjustedStopLoss = request.entryPrice - (maxStopLossPips * (request.signal === 'BUY' ? 1 : -1));
      // Adjust take profit to maintain ratio
      adjustedTakeProfit = request.entryPrice + (maxStopLossPips * this.config.minRiskRewardRatio * (request.signal === 'BUY' ? 1 : -1));
    }

    // All checks passed
    return {
      approved: true,
      reason: 'Trade approved',
      adjustedSize: positionSize,
      adjustedStopLoss,
      adjustedTakeProfit,
      riskAmount: maxRiskAmount,
      rewardAmount: maxRiskAmount * this.config.minRiskRewardRatio,
    };
  }

  /**
   * Record trade execution
   */
  recordTradeExecution(signal: 'BUY' | 'SELL'): void {
    this.accountState.tradesExecutedToday++;
  }

  /**
   * Record trade result (win or loss)
   */
  recordTradeResult(pnl: number): void {
    this.accountState.equity += pnl;
    this.accountState.dailyPnL += pnl;
    this.accountState.monthlyPnL += pnl;

    if (pnl < 0) {
      this.accountState.consecutiveLosses++;
    } else {
      this.accountState.consecutiveLosses = 0;
    }

    // Update max equity and drawdown
    if (this.accountState.equity > this.accountState.maxEquity) {
      this.accountState.maxEquity = this.accountState.equity;
    }

    this.accountState.currentDrawdown = this.accountState.maxEquity - this.accountState.equity;
    this.accountState.currentDrawdownPercent = this.accountState.currentDrawdown / this.accountState.maxEquity;
  }

  /**
   * Reset daily counters (call at end of trading day)
   */
  resetDailyCounters(): void {
    this.accountState.dailyPnL = 0;
    this.accountState.tradesExecutedToday = 0;
  }

  /**
   * Reset monthly counters (call at end of month)
   */
  resetMonthlyCounters(): void {
    this.accountState.monthlyPnL = 0;
  }

  /**
   * Get current account state
   */
  getAccountState(): AccountState {
    return { ...this.accountState };
  }

  /**
   * Check if trading should be paused
   */
  shouldPauseTrading(): {
    paused: boolean;
    reason: string;
  } {
    // Pause if consecutive losses exceeded
    if (this.accountState.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return {
        paused: true,
        reason: `${this.config.maxConsecutiveLosses} consecutive losses - PAUSE TRADING`,
      };
    }

    // Pause if daily loss exceeded
    if (this.accountState.dailyPnL < -this.config.accountSize * this.config.maxDailyLoss) {
      return {
        paused: true,
        reason: `Daily loss limit exceeded - PAUSE TRADING TODAY`,
      };
    }

    // Pause if drawdown exceeded
    if (this.accountState.currentDrawdownPercent > this.config.maxDrawdown) {
      return {
        paused: true,
        reason: `Maximum drawdown exceeded - PAUSE TRADING`,
      };
    }

    return { paused: false, reason: '' };
  }

  /**
   * Get risk metrics
   */
  getRiskMetrics(): {
    riskOfRuin: number; // Probability of losing all capital
    expectedValue: number; // Expected profit per trade
    winRateNeeded: number; // Minimum win rate to be profitable
  } {
    // Simplified risk of ruin calculation
    const dailyRisk = this.config.riskPerTrade;
    const daysToRuin = Math.log(0.01) / Math.log(1 - dailyRisk);
    const riskOfRuin = 1 - Math.pow(1 - dailyRisk, daysToRuin);

    // Expected value (assuming 55% win rate, 2:1 ratio)
    const winRate = 0.55;
    const riskRewardRatio = this.config.minRiskRewardRatio;
    const expectedValue = winRate * riskRewardRatio - (1 - winRate);

    // Win rate needed to break even
    const winRateNeeded = 1 / (1 + riskRewardRatio);

    return {
      riskOfRuin: Math.max(0, Math.min(1, riskOfRuin)),
      expectedValue,
      winRateNeeded,
    };
  }
}
