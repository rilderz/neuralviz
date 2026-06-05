/**
 * WebSocket Server for Real-Time Forex Price Streaming
 * 
 * Connects to multiple forex data providers and broadcasts
 * live price updates to connected clients
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface ClientSubscription {
  symbols: Set<string>;
  ws: WebSocket;
}

/**
 * Price Server - manages WebSocket connections and price streaming
 */
export class PriceServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, ClientSubscription> = new Map();
  private priceCache: Map<string, PriceUpdate> = new Map();
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private forexProviders: ForexDataProvider[] = [];

  constructor(httpServer: HTTPServer) {
    super();
    this.wss = new WebSocketServer({ server: httpServer, path: '/api/ws/prices' });
    this.initializeProviders();
    this.setupConnections();
  }

  /**
   * Initialize forex data providers
   */
  private initializeProviders(): void {
    // Primary: Alpha Vantage (free tier available)
    this.forexProviders.push(new AlphaVantageProvider());

    // Fallback: Finnhub
    this.forexProviders.push(new FinnhubProvider());

    // Fallback: Simulated data with realistic patterns
    this.forexProviders.push(new SimulatedProvider());
  }

  /**
   * Setup WebSocket connections
   */
  private setupConnections(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = this.generateClientId();
      const subscription: ClientSubscription = {
        symbols: new Set(),
        ws,
      };

      this.clients.set(clientId, subscription);
      console.log(`[PriceServer] Client connected: ${clientId}`);

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('[PriceServer] Invalid message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[PriceServer] Client disconnected: ${clientId}`);
      });

      // Handle errors
      ws.on('error', (error: any) => {
        console.error(`[PriceServer] Client error (${clientId}):`, error);
      });
    });
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(clientId: string, message: any): void {
    const subscription = this.clients.get(clientId);
    if (!subscription) return;

    if (message.type === 'subscribe') {
      const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
      symbols.forEach((symbol: string) => {
        subscription.symbols.add(symbol);
        this.startPriceStream(symbol);

        // Send cached price if available
        const cachedPrice = this.priceCache.get(symbol);
        if (cachedPrice) {
          subscription.ws.send(
            JSON.stringify({
              type: 'price',
              data: cachedPrice,
            })
          );
        }
      });
    } else if (message.type === 'unsubscribe') {
      const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
      symbols.forEach((symbol: string) => {
        subscription.symbols.delete(symbol);
      });
    }
  }

  /**
   * Start price streaming for a symbol
   */
  private startPriceStream(symbol: string): void {
    // Don't start duplicate streams
    if (this.priceIntervals.has(symbol)) return;

    // Update prices every 1 second
    const interval = setInterval(async () => {
      try {
        const price = await this.fetchPrice(symbol);
        if (price) {
          this.priceCache.set(symbol, price);
          this.broadcastPrice(symbol, price);
        }
      } catch (error) {
        console.error(`[PriceServer] Error fetching ${symbol}:`, error);
      }
    }, 1000);

    this.priceIntervals.set(symbol, interval);
  }

  /**
   * Fetch price from providers
   */
  private async fetchPrice(symbol: string): Promise<PriceUpdate | null> {
    for (const provider of this.forexProviders) {
      try {
        const price = await provider.getPrice(symbol);
        if (price) {
          return price;
        }
      } catch (error) {
        console.warn(`[PriceServer] Provider ${provider.name} failed for ${symbol}`);
        continue;
      }
    }
    return null;
  }

  /**
   * Broadcast price to all subscribed clients
   */
  private broadcastPrice(symbol: string, price: PriceUpdate): void {
    const message = JSON.stringify({
      type: 'price',
      data: price,
    });

    this.clients.forEach((subscription) => {
      if (subscription.symbols.has(symbol) && subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.send(message);
      }
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get price cache for a symbol
   */
  getPrice(symbol: string): PriceUpdate | undefined {
    return this.priceCache.get(symbol);
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    this.priceIntervals.forEach((interval) => clearInterval(interval));
    this.priceIntervals.clear();
    this.wss.close();
  }
}

/**
 * Abstract base class for forex data providers
 */
abstract class ForexDataProvider {
  abstract name: string;
  abstract getPrice(symbol: string): Promise<PriceUpdate | null>;

  protected parseSymbol(symbol: string): { base: string; quote: string } {
    const [base, quote] = symbol.split('/');
    return { base, quote };
  }
}

/**
 * Alpha Vantage Provider
 * Free tier: 5 requests per minute
 */
class AlphaVantageProvider extends ForexDataProvider {
  name = 'AlphaVantage';
  private apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  private lastRequestTime = 0;
  private requestInterval = 12000; // 5 requests per minute = 12 seconds per request

  async getPrice(symbol: string): Promise<PriceUpdate | null> {
    if (!this.apiKey) return null;

    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.requestInterval) {
      return null;
    }
    this.lastRequestTime = now;

    try {
      const { base, quote } = this.parseSymbol(symbol);
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${base}&to_currency=${quote}&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data['Realtime Currency Exchange Rate']) {
        const rate = data['Realtime Currency Exchange Rate'];
        const bid = parseFloat(rate['Bid Price']) || 0;
        const ask = parseFloat(rate['Ask Price']) || 0;
        const mid = (bid + ask) / 2;

        return {
          symbol,
          bid,
          ask,
          mid,
          timestamp: Date.now(),
          change: parseFloat(rate['5. Output Size']) || 0,
        };
      }
    } catch (error) {
      console.error('[AlphaVantage] Error:', error);
    }

    return null;
  }
}

/**
 * Finnhub Provider
 * Free tier: 60 requests per minute
 */
class FinnhubProvider extends ForexDataProvider {
  name = 'Finnhub';
  private apiKey = process.env.FINNHUB_API_KEY || '';

  async getPrice(symbol: string): Promise<PriceUpdate | null> {
    if (!this.apiKey) return null;

    try {
      const { base, quote } = this.parseSymbol(symbol);
      const forexSymbol = `${base}${quote}`;

      const url = `https://finnhub.io/api/forex/quote?symbol=${forexSymbol}&token=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.bid && data.ask) {
        return {
          symbol,
          bid: data.bid,
          ask: data.ask,
          mid: (data.bid + data.ask) / 2,
          timestamp: Date.now(),
          change: data.change || 0,
          changePercent: data.changePercent || 0,
        };
      }
    } catch (error) {
      console.error('[Finnhub] Error:', error);
    }

    return null;
  }
}

/**
 * Simulated Provider - Fallback with realistic price movements
 */
class SimulatedProvider extends ForexDataProvider {
  name = 'Simulated';
  private priceStates: Map<string, { price: number; trend: number }> = new Map();

  async getPrice(symbol: string): Promise<PriceUpdate | null> {
    let state = this.priceStates.get(symbol);

    if (!state) {
      // Initialize price based on symbol
      const basePrice = this.getBasePrice(symbol);
      state = {
        price: basePrice,
        trend: (Math.random() - 0.5) * 0.0002,
      };
      this.priceStates.set(symbol, state);
    }

    // Simulate price movement with mean reversion
    const randomWalk = (Math.random() - 0.5) * 0.0001;
    const meanReversion = (1.1 - state.price) * 0.00001;
    state.price += state.trend + randomWalk + meanReversion;

    // Update trend
    state.trend = state.trend * 0.95 + (Math.random() - 0.5) * 0.00001;

    const spread = state.price * 0.0001; // 0.01% spread
    const bid = state.price - spread / 2;
    const ask = state.price + spread / 2;

    return {
      symbol,
      bid,
      ask,
      mid: state.price,
      timestamp: Date.now(),
      volume: Math.floor(Math.random() * 1000000),
    };
  }

  private getBasePrice(symbol: string): number {
    const prices: { [key: string]: number } = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 150.25,
      'USD/CHF': 0.8950,
      'AUD/USD': 0.6750,
      'USD/CAD': 1.3650,
      'NZD/USD': 0.6150,
      'EUR/GBP': 0.8550,
    };
    return prices[symbol] || 1.1;
  }
}
