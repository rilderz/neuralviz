/**
 * Price Cache Service
 * 
 * Manages price caching and fallback mechanisms
 * Ensures data availability even when live feeds are unavailable
 */

import { PriceUpdate } from '../websocket/priceServer';

export interface CachedPrice {
  price: PriceUpdate;
  cachedAt: number;
  source: 'live' | 'cache' | 'fallback';
}

/**
 * Price Cache Service
 */
export class PriceCacheService {
  private cache: Map<string, CachedPrice> = new Map();
  private cacheExpiry = 60000; // 60 seconds
  private fallbackPrices: Map<string, PriceUpdate> = new Map();

  constructor() {
    this.initializeFallbackPrices();
  }

  /**
   * Initialize fallback prices for common forex pairs
   */
  private initializeFallbackPrices(): void {
    const fallbackData = [
      { symbol: 'EUR/USD', mid: 1.0850, bid: 1.0848, ask: 1.0852 },
      { symbol: 'GBP/USD', mid: 1.2650, bid: 1.2648, ask: 1.2652 },
      { symbol: 'USD/JPY', mid: 150.25, bid: 150.23, ask: 150.27 },
      { symbol: 'USD/CHF', mid: 0.8950, bid: 0.8948, ask: 0.8952 },
      { symbol: 'AUD/USD', mid: 0.6750, bid: 0.6748, ask: 0.6752 },
      { symbol: 'USD/CAD', mid: 1.3650, bid: 1.3648, ask: 1.3652 },
      { symbol: 'NZD/USD', mid: 0.6150, bid: 0.6148, ask: 0.6152 },
      { symbol: 'EUR/GBP', mid: 0.8550, bid: 0.8548, ask: 0.8552 },
    ];

    fallbackData.forEach((data) => {
      this.fallbackPrices.set(data.symbol, {
        symbol: data.symbol,
        bid: data.bid,
        ask: data.ask,
        mid: data.mid,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Set price in cache
   */
  setPrice(price: PriceUpdate): void {
    this.cache.set(price.symbol, {
      price,
      cachedAt: Date.now(),
      source: 'live',
    });
  }

  /**
   * Get price from cache or fallback
   */
  getPrice(symbol: string): CachedPrice | null {
    // Check live cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.cachedAt < this.cacheExpiry) {
      return cached;
    }

    // Check if cache is stale but still available
    if (cached) {
      return {
        ...cached,
        source: 'cache',
      };
    }

    // Fall back to default prices
    const fallback = this.fallbackPrices.get(symbol);
    if (fallback) {
      return {
        price: fallback,
        cachedAt: Date.now(),
        source: 'fallback',
      };
    }

    return null;
  }

  /**
   * Get all cached prices
   */
  getAllPrices(): Map<string, CachedPrice> {
    const result = new Map<string, CachedPrice>();

    // Add live/cached prices
    this.cache.forEach((cached, symbol) => {
      const source = Date.now() - cached.cachedAt < this.cacheExpiry ? 'live' : 'cache';
      result.set(symbol, {
        ...cached,
        source: source as 'live' | 'cache' | 'fallback',
      });
    });

    // Add fallback prices for symbols not in cache
    this.fallbackPrices.forEach((price, symbol) => {
      if (!result.has(symbol)) {
        result.set(symbol, {
          price,
          cachedAt: Date.now(),
          source: 'fallback',
        });
      }
    });

    return result;
  }

  /**
   * Clear cache for a symbol
   */
  clearPrice(symbol: string): void {
    this.cache.delete(symbol);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    liveCount: number;
    cachedCount: number;
    fallbackCount: number;
    totalSize: number;
  } {
    let liveCount = 0;
    let cachedCount = 0;

    this.cache.forEach((cached) => {
      if (Date.now() - cached.cachedAt < this.cacheExpiry) {
        liveCount++;
      } else {
        cachedCount++;
      }
    });

    const fallbackCount = this.fallbackPrices.size;

    return {
      liveCount,
      cachedCount,
      fallbackCount,
      totalSize: this.cache.size,
    };
  }

  /**
   * Update fallback prices (for manual updates)
   */
  updateFallbackPrice(symbol: string, price: Partial<PriceUpdate>): void {
    const existing = this.fallbackPrices.get(symbol);
    if (existing) {
      this.fallbackPrices.set(symbol, {
        ...existing,
        ...price,
        symbol,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Set cache expiry time
   */
  setCacheExpiry(ms: number): void {
    this.cacheExpiry = ms;
  }
}

// Singleton instance
let cacheInstance: PriceCacheService | null = null;

/**
 * Get or create the price cache service
 */
export function getPriceCacheService(): PriceCacheService {
  if (!cacheInstance) {
    cacheInstance = new PriceCacheService();
  }
  return cacheInstance;
}
