/**
 * MetaTrader 5 Integration Service
 * 
 * Provides integration with MetaTrader 5 terminal for trading with Exness and other brokers
 * Communicates via REST API wrapper or direct socket connection
 */

export interface MT5Credentials {
  login: string;
  password: string;
  server: string; // e.g., "Exness-MT5.4:443" or "Exness-MT5Real"
}

export interface MT5TradeRequest {
  action: 'DEAL_BUY' | 'DEAL_SELL' | 'DEAL_BUY_LIMIT' | 'DEAL_SELL_LIMIT' | 'DEAL_BUY_STOP' | 'DEAL_SELL_STOP';
  symbol: string;
  volume: number;
  price?: number;
  sl?: number; // Stop Loss
  tp?: number; // Take Profit
  comment?: string;
  deviation?: number; // Slippage in points
}

export interface MT5TradeResponse {
  success: boolean;
  ticket?: number;
  error?: string;
  errorCode?: number;
  message?: string;
}

export interface MT5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  profitPercent: number;
  openTime: number;
  comment?: string;
}

export interface MT5Account {
  login: number;
  name: string;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  marginFree: number;
  marginLevel: number;
  leverage: number;
}

/**
 * MetaTrader 5 Service
 * 
 * Communicates with MT5 terminal via REST API wrapper
 * Requires MT5 terminal running with API server enabled
 */
export class MetaTrader5Service {
  private apiUrl: string;
  private credentials: MT5Credentials | null = null;
  private isConnected: boolean = false;
  private sessionToken: string | null = null;

  constructor(apiUrl: string = 'http://localhost:8080') {
    this.apiUrl = apiUrl;
  }

  /**
   * Connect to MetaTrader 5 terminal
   */
  async connect(credentials: MT5Credentials): Promise<boolean> {
    try {
      this.credentials = credentials;

      const response = await fetch(`${this.apiUrl}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: credentials.login,
          password: credentials.password,
          server: credentials.server,
        }),
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionToken = data.token;
      this.isConnected = true;

      console.log('[MT5] Connected successfully');
      return true;
    } catch (error) {
      console.error('[MT5] Connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from MetaTrader 5
   */
  async disconnect(): Promise<void> {
    try {
      if (this.sessionToken) {
        await fetch(`${this.apiUrl}/api/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
        });
      }
      this.isConnected = false;
      this.sessionToken = null;
      console.log('[MT5] Disconnected');
    } catch (error) {
      console.error('[MT5] Disconnect error:', error);
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<MT5Account | null> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/account`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get account: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[MT5] Get account error:', error);
      return null;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<MT5Position[]> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/positions`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get positions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[MT5] Get positions error:', error);
      return [];
    }
  }

  /**
   * Get position by ticket
   */
  async getPosition(ticket: number): Promise<MT5Position | null> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/positions/${ticket}`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[MT5] Get position error:', error);
      return null;
    }
  }

  /**
   * Place a trade order
   */
  async trade(request: MT5TradeRequest): Promise<MT5TradeResponse> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Trade failed',
          errorCode: data.errorCode,
        };
      }

      return {
        success: true,
        ticket: data.ticket,
        message: 'Trade executed successfully',
      };
    } catch (error) {
      console.error('[MT5] Trade error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trade execution failed',
      };
    }
  }

  /**
   * Buy market order
   */
  async buy(
    symbol: string,
    volume: number,
    sl?: number,
    tp?: number,
    comment?: string
  ): Promise<MT5TradeResponse> {
    return this.trade({
      action: 'DEAL_BUY',
      symbol,
      volume,
      sl,
      tp,
      comment,
    });
  }

  /**
   * Sell market order
   */
  async sell(
    symbol: string,
    volume: number,
    sl?: number,
    tp?: number,
    comment?: string
  ): Promise<MT5TradeResponse> {
    return this.trade({
      action: 'DEAL_SELL',
      symbol,
      volume,
      sl,
      tp,
      comment,
    });
  }

  /**
   * Close position by ticket
   */
  async closePosition(ticket: number): Promise<MT5TradeResponse> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/positions/${ticket}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Close failed',
        };
      }

      return {
        success: true,
        message: 'Position closed successfully',
      };
    } catch (error) {
      console.error('[MT5] Close position error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Close failed',
      };
    }
  }

  /**
   * Modify position stop loss and take profit
   */
  async modifyPosition(
    ticket: number,
    sl?: number,
    tp?: number
  ): Promise<MT5TradeResponse> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/positions/${ticket}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({ sl, tp }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Modify failed',
        };
      }

      return {
        success: true,
        message: 'Position modified successfully',
      };
    } catch (error) {
      console.error('[MT5] Modify position error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Modify failed',
      };
    }
  }

  /**
   * Get symbol information
   */
  async getSymbolInfo(symbol: string): Promise<any> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/symbols/${symbol}`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[MT5] Get symbol info error:', error);
      return null;
    }
  }

  /**
   * Get symbol tick
   */
  async getSymbolTick(symbol: string): Promise<any> {
    if (!this.isConnected || !this.sessionToken) {
      throw new Error('Not connected to MT5');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/symbols/${symbol}/tick`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[MT5] Get symbol tick error:', error);
      return null;
    }
  }

  /**
   * Check if connected
   */
  isConnectedToMT5(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    server?: string;
    login?: string;
  } {
    return {
      connected: this.isConnected,
      server: this.credentials?.server,
      login: this.credentials?.login,
    };
  }
}

// Singleton instance
let mt5Instance: MetaTrader5Service | null = null;

/**
 * Get or create MT5 service instance
 */
export function getMetaTrader5Service(apiUrl?: string): MetaTrader5Service {
  if (!mt5Instance) {
    mt5Instance = new MetaTrader5Service(apiUrl);
  }
  return mt5Instance;
}
