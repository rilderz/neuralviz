/**
 * WebSocket Price Stream Hook
 * 
 * Manages WebSocket connection for real-time forex price updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';

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

export interface PriceStreamState {
  prices: Map<string, PriceUpdate>;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for managing WebSocket price stream
 */
export function usePriceStream(symbols: string[] = []) {
  const [state, setState] = useState<PriceStreamState>({
    prices: new Map(),
    isConnected: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws/prices`;

      console.log('[usePriceStream] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[usePriceStream] Connected');
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
        reconnectAttemptsRef.current = 0;

        // Subscribe to symbols
        if (symbols.length > 0) {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              symbols,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'price') {
            const price: PriceUpdate = message.data;
            setState((prev) => {
              const newPrices = new Map(prev.prices);
              newPrices.set(price.symbol, price);
              return {
                ...prev,
                prices: newPrices,
              };
            });
          }
        } catch (error) {
          console.error('[usePriceStream] Error parsing message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[usePriceStream] WebSocket error:', event);
        setState((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };

      ws.onclose = () => {
        console.log('[usePriceStream] Disconnected');
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(
            `[usePriceStream] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setState((prev) => ({
            ...prev,
            error: 'Failed to connect after multiple attempts',
          }));
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[usePriceStream] Connection error:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [symbols]);

  /**
   * Subscribe to additional symbols
   */
  const subscribe = useCallback((newSymbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          symbols: newSymbols,
        })
      );
    }
  }, []);

  /**
   * Unsubscribe from symbols
   */
  const unsubscribe = useCallback((removeSymbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'unsubscribe',
          symbols: removeSymbols,
        })
      );
    }
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({
      prices: new Map(),
      isConnected: false,
      error: null,
    });
  }, []);

  /**
   * Get price for a symbol
   */
  const getPrice = useCallback(
    (symbol: string): PriceUpdate | undefined => {
      return state.prices.get(symbol);
    },
    [state.prices]
  );

  /**
   * Get all prices
   */
  const getAllPrices = useCallback((): PriceUpdate[] => {
    return Array.from(state.prices.values());
  }, [state.prices]);

  // Connect on mount and when symbols change
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Subscribe to symbols when they change
  useEffect(() => {
    if (symbols.length > 0 && state.isConnected) {
      subscribe(symbols);
    }
  }, [symbols, state.isConnected, subscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    disconnect,
    getPrice,
    getAllPrices,
  };
}

/**
 * Hook for getting a single price
 */
export function usePrice(symbol: string) {
  const { prices, isConnected, error } = usePriceStream([symbol]);
  const price = prices.get(symbol);

  return {
    price,
    isConnected,
    error,
    bid: price?.bid,
    ask: price?.ask,
    mid: price?.mid,
    change: price?.change,
    changePercent: price?.changePercent,
  };
}

/**
 * Hook for getting multiple prices
 */
export function usePrices(symbols: string[]) {
  const { prices, isConnected, error, subscribe, unsubscribe } = usePriceStream(symbols);

  return {
    prices: Object.fromEntries(prices),
    isConnected,
    error,
    subscribe,
    unsubscribe,
  };
}
