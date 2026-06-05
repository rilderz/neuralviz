/**
 * Trade Executor
 * 
 * Executes trades based on AI signals with comprehensive risk management
 * Integrates LSTM predictions with Exness trading
 */

import { ExnessService } from '../brokers/exnessService';

export interface AISignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  predictedPrice: number;
  timestamp: number;
  indicators?: {
    rsi?: number;
    macd?: number;
    bollingerBands?: { upper: number; middle: number; lower: number };
  };
}

export interface TradeExecution {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  confidence: number;
  timestamp: number;
  ticket?: number;
  status: 'pending' | 'executed' | 'failed';
  error?: string;
}

export interface TradeExecutionConfig {
  minConfidence: number; // Minimum confidence to execute
  maxRiskPerTrade: number; // Percentage
  stopLossPoints: number; // Points for stop loss
  takeProfitRatio: number; // Risk/reward ratio
  maxDailyTrades: number;
  maxDrawdown: number;
  enableAutoClose: boolean;
}

/**
 * Trade Executor
 */
export class TradeExecutor {
  private exness: ExnessService;
  private config: TradeExecutionConfig;
  private executedTrades: TradeExecution[] = [];
  private dailyTradeCount: number = 0;
  private lastResetDate: Date = new Date();

  constructor(exnessService: ExnessService) {
    this.exness = exnessService;
    this.config = {
      minConfidence: 0.65,
      maxRiskPerTrade: 2,
      stopLossPoints: 50,
      takeProfitRatio: 1.5,
      maxDailyTrades: 20,
      maxDrawdown: 20,
      enableAutoClose: true,
    };
  }

  /**
   * Set execution configuration
   */
  setConfig(config: Partial<TradeExecutionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[TradeExecutor] Config updated:', this.config);
  }

  /**
   * Get execution configuration
   */
  getConfig(): TradeExecutionConfig {
    return this.config;
  }

  /**
   * Execute trade based on AI signal
   */
  async executeSignal(signal: AISignal): Promise<TradeExecution> {
    const execution: TradeExecution = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      action: signal.action as 'BUY' | 'SELL',
      volume: 0,
      entryPrice: 0,
      stopLoss: 0,
      confidence: signal.confidence,
      timestamp: Date.now(),
      status: 'pending',
    };

    try {
      // Validate signal
      if (!this.validateSignal(signal)) {
        execution.status = 'failed';
        execution.error = 'Signal validation failed';
        this.executedTrades.push(execution);
        return execution;
      }

      // Check daily trade limit
      if (!this.checkDailyTradeLimit()) {
        execution.status = 'failed';
        execution.error = `Daily trade limit (${this.config.maxDailyTrades}) reached`;
        this.executedTrades.push(execution);
        return execution;
      }

      // Check drawdown
      if (this.config.enableAutoClose) {
        const drawdownExceeded = await this.exness.checkDrawdownAndClose();
        if (drawdownExceeded) {
          execution.status = 'failed';
          execution.error = 'Maximum drawdown exceeded. All positions closed.';
          this.executedTrades.push(execution);
          return execution;
        }
      }

      // Execute trade
      let result;
      if (signal.action === 'BUY') {
        result = await this.exness.buyWithRiskManagement(
          signal.symbol,
          this.config.stopLossPoints,
          Math.round(this.config.stopLossPoints * this.config.takeProfitRatio)
        );
      } else if (signal.action === 'SELL') {
        result = await this.exness.sellWithRiskManagement(
          signal.symbol,
          this.config.stopLossPoints,
          Math.round(this.config.stopLossPoints * this.config.takeProfitRatio)
        );
      } else {
        execution.status = 'failed';
        execution.error = 'Invalid signal action';
        this.executedTrades.push(execution);
        return execution;
      }

      if (result.success) {
        execution.status = 'executed';
        execution.ticket = result.ticket;
        this.dailyTradeCount++;
        console.log(`[TradeExecutor] Trade executed: ${execution.id} (Ticket: ${result.ticket})`);
      } else {
        execution.status = 'failed';
        execution.error = result.error;
        console.error(`[TradeExecutor] Trade failed: ${result.error}`);
      }
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TradeExecutor] Execution error:', error);
    }

    this.executedTrades.push(execution);
    return execution;
  }

  /**
   * Validate AI signal
   */
  private validateSignal(signal: AISignal): boolean {
    // Check confidence level
    if (signal.confidence < this.config.minConfidence) {
      console.warn(
        `[TradeExecutor] Signal confidence (${signal.confidence}) below minimum (${this.config.minConfidence})`
      );
      return false;
    }

    // Check action
    if (!['BUY', 'SELL', 'HOLD'].includes(signal.action)) {
      console.warn(`[TradeExecutor] Invalid signal action: ${signal.action}`);
      return false;
    }

    // Skip HOLD signals
    if (signal.action === 'HOLD') {
      return false;
    }

    return true;
  }

  /**
   * Check daily trade limit
   */
  private checkDailyTradeLimit(): boolean {
    const today = new Date();
    if (today.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyTradeCount = 0;
      this.lastResetDate = today;
    }

    return this.dailyTradeCount < this.config.maxDailyTrades;
  }

  /**
   * Get executed trades
   */
  getExecutedTrades(limit?: number): TradeExecution[] {
    if (limit) {
      return this.executedTrades.slice(-limit);
    }
    return this.executedTrades;
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(): Promise<{
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    winRate: number;
    totalProfit: number;
    dailyTradeCount: number;
  }> {
    const successful = this.executedTrades.filter((t) => t.status === 'executed').length;
    const failed = this.executedTrades.filter((t) => t.status === 'failed').length;
    const total = this.executedTrades.length;

    // Get positions for profit calculation
    const positions = await this.exness.getPositions();
    const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);

    return {
      totalTrades: total,
      successfulTrades: successful,
      failedTrades: failed,
      winRate: total > 0 ? (successful / total) * 100 : 0,
      totalProfit,
      dailyTradeCount: this.dailyTradeCount,
    };
  }

  /**
   * Close all open positions
   */
  async closeAllPositions(): Promise<{ success: number; failed: number }> {
    return await this.exness.closeAllPositions();
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    account?: string;
    executedTrades: number;
    dailyTrades: number;
  } {
    const status = this.exness.getStatus();
    return {
      connected: status.connected,
      account: status.account,
      executedTrades: this.executedTrades.length,
      dailyTrades: this.dailyTradeCount,
    };
  }
}

// Singleton instance
let executorInstance: TradeExecutor | null = null;

/**
 * Get or create trade executor instance
 */
export function getTradeExecutor(exnessService: ExnessService): TradeExecutor {
  if (!executorInstance) {
    executorInstance = new TradeExecutor(exnessService);
  }
  return executorInstance;
}
