/**
 * Exness Broker Service
 * 
 * Specialized service for Exness MetaTrader 5 integration
 * Handles Exness-specific configurations and account management
 */

import { MetaTrader5Service, MT5Credentials, MT5TradeRequest, MT5TradeResponse } from './metatrader5Service';

export interface ExnessAccount {
  login: string;
  password: string;
  accountType: 'demo' | 'real';
  leverage: number;
  currency: string;
  description?: string;
}

export interface ExnessTradeConfig {
  maxPositions: number;
  maxVolume: number;
  minVolume: number;
  riskPerTrade: number; // Percentage of account
  maxDrawdown: number; // Percentage
  autoCloseOnDrawdown: boolean;
}

/**
 * Exness Service
 */
export class ExnessService {
  private mt5: MetaTrader5Service;
  private account: ExnessAccount | null = null;
  private tradeConfig: ExnessTradeConfig;

  // Exness server addresses
  private readonly EXNESS_SERVERS = {
    demo: 'Exness-MT5.4:443',
    real: 'Exness-MT5Real',
  };

  constructor(mt5Service?: MetaTrader5Service) {
    this.mt5 = mt5Service || new MetaTrader5Service();
    this.tradeConfig = {
      maxPositions: 10,
      maxVolume: 100,
      minVolume: 0.01,
      riskPerTrade: 2, // 2% of account
      maxDrawdown: 20, // 20% max drawdown
      autoCloseOnDrawdown: true,
    };
  }

  /**
   * Connect to Exness account
   */
  async connectAccount(account: ExnessAccount): Promise<boolean> {
    try {
      this.account = account;

      const credentials: MT5Credentials = {
        login: account.login,
        password: account.password,
        server: this.EXNESS_SERVERS[account.accountType],
      };

      const connected = await this.mt5.connect(credentials);

      if (connected) {
        console.log(`[Exness] Connected to ${account.accountType} account: ${account.login}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Exness] Connection error:', error);
      return false;
    }
  }

  /**
   * Disconnect from Exness
   */
  async disconnect(): Promise<void> {
    await this.mt5.disconnect();
    this.account = null;
    console.log('[Exness] Disconnected');
  }

  /**
   * Set trade configuration
   */
  setTradeConfig(config: Partial<ExnessTradeConfig>): void {
    this.tradeConfig = { ...this.tradeConfig, ...config };
    console.log('[Exness] Trade config updated:', this.tradeConfig);
  }

  /**
   * Get trade configuration
   */
  getTradeConfig(): ExnessTradeConfig {
    return this.tradeConfig;
  }

  /**
   * Calculate position size based on risk management
   */
  async calculatePositionSize(
    symbol: string,
    accountBalance: number,
    stopLossPoints: number
  ): Promise<number> {
    try {
      // Get symbol info for point value
      const symbolInfo = await this.mt5.getSymbolInfo(symbol);
      if (!symbolInfo) {
        throw new Error(`Symbol ${symbol} not found`);
      }

      // Risk amount
      const riskAmount = (accountBalance * this.tradeConfig.riskPerTrade) / 100;

      // Calculate position size
      const pointValue = symbolInfo.point || 0.0001;
      const positionSize = riskAmount / (stopLossPoints * pointValue);

      // Apply volume constraints
      const volume = Math.max(
        this.tradeConfig.minVolume,
        Math.min(positionSize, this.tradeConfig.maxVolume)
      );

      return Math.round(volume * 100) / 100; // Round to 2 decimals
    } catch (error) {
      console.error('[Exness] Position size calculation error:', error);
      return this.tradeConfig.minVolume;
    }
  }

  /**
   * Place a buy trade with risk management
   */
  async buyWithRiskManagement(
    symbol: string,
    stopLossPoints: number,
    takeProfitPoints?: number,
    customVolume?: number
  ): Promise<MT5TradeResponse> {
    if (!this.account) {
      throw new Error('Not connected to Exness account');
    }

    try {
      // Get current price
      const tick = await this.mt5.getSymbolTick(symbol);
      if (!tick) {
        throw new Error(`Cannot get price for ${symbol}`);
      }

      const entryPrice = tick.ask;
      const stopLoss = entryPrice - stopLossPoints * 0.0001;
      const takeProfit = takeProfitPoints
        ? entryPrice + takeProfitPoints * 0.0001
        : undefined;

      // Get account info for position sizing
      const account = await this.mt5.getAccount();
      if (!account) {
        throw new Error('Cannot get account information');
      }

      // Calculate position size
      const volume = customVolume || (await this.calculatePositionSize(
        symbol,
        account.balance,
        stopLossPoints
      ));

      // Check position limit
      const positions = await this.mt5.getPositions();
      if (positions.length >= this.tradeConfig.maxPositions) {
        throw new Error(`Maximum positions (${this.tradeConfig.maxPositions}) reached`);
      }

      // Place trade
      return await this.mt5.buy(symbol, volume, stopLoss, takeProfit, 'AI Trading System');
    } catch (error) {
      console.error('[Exness] Buy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Buy failed',
      };
    }
  }

  /**
   * Place a sell trade with risk management
   */
  async sellWithRiskManagement(
    symbol: string,
    stopLossPoints: number,
    takeProfitPoints?: number,
    customVolume?: number
  ): Promise<MT5TradeResponse> {
    if (!this.account) {
      throw new Error('Not connected to Exness account');
    }

    try {
      // Get current price
      const tick = await this.mt5.getSymbolTick(symbol);
      if (!tick) {
        throw new Error(`Cannot get price for ${symbol}`);
      }

      const entryPrice = tick.bid;
      const stopLoss = entryPrice + stopLossPoints * 0.0001;
      const takeProfit = takeProfitPoints
        ? entryPrice - takeProfitPoints * 0.0001
        : undefined;

      // Get account info for position sizing
      const account = await this.mt5.getAccount();
      if (!account) {
        throw new Error('Cannot get account information');
      }

      // Calculate position size
      const volume = customVolume || (await this.calculatePositionSize(
        symbol,
        account.balance,
        stopLossPoints
      ));

      // Check position limit
      const positions = await this.mt5.getPositions();
      if (positions.length >= this.tradeConfig.maxPositions) {
        throw new Error(`Maximum positions (${this.tradeConfig.maxPositions}) reached`);
      }

      // Place trade
      return await this.mt5.sell(symbol, volume, stopLoss, takeProfit, 'AI Trading System');
    } catch (error) {
      console.error('[Exness] Sell error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sell failed',
      };
    }
  }

  /**
   * Get account summary
   */
  async getAccountSummary(): Promise<any> {
    try {
      const account = await this.mt5.getAccount();
      const positions = await this.mt5.getPositions();

      if (!account) {
        throw new Error('Cannot get account information');
      }

      return {
        login: account.login,
        server: account.server,
        currency: account.currency,
        balance: account.balance,
        equity: account.equity,
        profit: account.profit,
        margin: account.margin,
        marginFree: account.marginFree,
        marginLevel: account.marginLevel,
        leverage: account.leverage,
        openPositions: positions.length,
        totalProfit: positions.reduce((sum, p) => sum + p.profit, 0),
      };
    } catch (error) {
      console.error('[Exness] Get account summary error:', error);
      return null;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<any[]> {
    try {
      return await this.mt5.getPositions();
    } catch (error) {
      console.error('[Exness] Get positions error:', error);
      return [];
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<{ success: number; failed: number }> {
    try {
      const positions = await this.mt5.getPositions();
      let success = 0;
      let failed = 0;

      for (const position of positions) {
        const result = await this.mt5.closePosition(position.ticket);
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      }

      console.log(`[Exness] Closed ${success} positions, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('[Exness] Close all positions error:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Check drawdown and close positions if exceeded
   */
  async checkDrawdownAndClose(): Promise<boolean> {
    try {
      const account = await this.mt5.getAccount();
      if (!account) {
        throw new Error('Cannot get account information');
      }

      const drawdown = ((account.balance - account.equity) / account.balance) * 100;

      if (drawdown > this.tradeConfig.maxDrawdown && this.tradeConfig.autoCloseOnDrawdown) {
        console.warn(`[Exness] Drawdown (${drawdown.toFixed(2)}%) exceeded limit. Closing all positions.`);
        await this.closeAllPositions();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Exness] Drawdown check error:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    account?: string;
    accountType?: string;
  } {
    return {
      connected: this.mt5.isConnectedToMT5(),
      account: this.account?.login,
      accountType: this.account?.accountType,
    };
  }
}

// Singleton instance
let exnessInstance: ExnessService | null = null;

/**
 * Get or create Exness service instance
 */
export function getExnessService(mt5Service?: MetaTrader5Service): ExnessService {
  if (!exnessInstance) {
    exnessInstance = new ExnessService(mt5Service);
  }
  return exnessInstance;
}
