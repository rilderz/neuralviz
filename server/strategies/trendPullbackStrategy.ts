/**
 * Trend + Pullback Continuation Strategy
 * 
 * Simple, proven approach:
 * 1. Detect trend using MA200
 * 2. Wait for pullback (RSI oversold/overbought)
 * 3. Enter on RSI recovery
 * 
 * Works well in trending markets
 * Avoids counter-trend trades
 */

export interface StrategyState {
  price: number;
  ma200: number;
  rsi: number;
  previousRsi: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  inPullback: boolean;
  lastRsiLow: number;
  lastRsiHigh: number;
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * Trend + Pullback Strategy
 */
export class TrendPullbackStrategy {
  private rsiOversoldThreshold = 40;
  private rsiOverboughtThreshold = 60;
  private rsiRecoveryThreshold = 50;

  /**
   * Detect current trend
   */
  private detectTrend(price: number, ma200: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const deviation = Math.abs(price - ma200) / ma200;

    if (price > ma200 && deviation > 0.005) {
      return 'BULLISH';
    } else if (price < ma200 && deviation > 0.005) {
      return 'BEARISH';
    }
    return 'NEUTRAL';
  }

  /**
   * Detect pullback condition
   */
  private detectPullback(
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    rsi: number
  ): boolean {
    if (trend === 'BULLISH') {
      // In uptrend, pullback = RSI below 40-50
      return rsi < this.rsiOversoldThreshold;
    } else if (trend === 'BEARISH') {
      // In downtrend, pullback = RSI above 50-60
      return rsi > this.rsiOverboughtThreshold;
    }
    return false;
  }

  /**
   * Detect RSI recovery (entry signal)
   */
  private detectRsiRecovery(
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    rsi: number,
    previousRsi: number
  ): boolean {
    if (trend === 'BULLISH') {
      // RSI crosses above 50 from below
      return previousRsi < this.rsiRecoveryThreshold && rsi >= this.rsiRecoveryThreshold;
    } else if (trend === 'BEARISH') {
      // RSI crosses below 50 from above
      return previousRsi > this.rsiRecoveryThreshold && rsi <= this.rsiRecoveryThreshold;
    }
    return false;
  }

  /**
   * Generate trading signal
   */
  generateSignal(state: StrategyState): StrategySignal {
    // Step 1: Detect trend
    const trend = this.detectTrend(state.price, state.ma200);

    // Step 2: Check for pullback
    const inPullback = this.detectPullback(trend, state.rsi);

    // Step 3: Check for RSI recovery (entry signal)
    const rsiRecovery = this.detectRsiRecovery(trend, state.rsi, state.previousRsi);

    // Generate signal
    if (trend === 'NEUTRAL') {
      return {
        action: 'HOLD',
        confidence: 0,
        reason: 'Price near MA200, trend unclear',
      };
    }

    if (!inPullback) {
      return {
        action: 'HOLD',
        confidence: 0,
        reason: `${trend} trend detected but no pullback yet (RSI: ${state.rsi.toFixed(1)})`,
      };
    }

    if (rsiRecovery) {
      if (trend === 'BULLISH') {
        const confidence = this.calculateConfidence(state, 'BUY');
        return {
          action: 'BUY',
          confidence,
          reason: `Bullish trend + RSI recovery from oversold (${state.rsi.toFixed(1)})`,
          entryPrice: state.price,
          stopLoss: state.price * 0.98, // 2% below entry
          takeProfit: state.price * 1.03, // 3% above entry (1.5:1 RR)
        };
      } else {
        const confidence = this.calculateConfidence(state, 'SELL');
        return {
          action: 'SELL',
          confidence,
          reason: `Bearish trend + RSI recovery from overbought (${state.rsi.toFixed(1)})`,
          entryPrice: state.price,
          stopLoss: state.price * 1.02, // 2% above entry
          takeProfit: state.price * 0.97, // 3% below entry (1.5:1 RR)
        };
      }
    }

    // Pullback detected but RSI not yet recovered
    return {
      action: 'HOLD',
      confidence: 0,
      reason: `${trend} trend + pullback detected, waiting for RSI recovery (${state.rsi.toFixed(1)})`,
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(state: StrategyState, action: 'BUY' | 'SELL'): number {
    let confidence = 0.5; // Base confidence

    if (action === 'BUY') {
      // Boost confidence if:
      // - Price well above MA200
      const priceDeviation = (state.price - state.ma200) / state.ma200;
      if (priceDeviation > 0.01) confidence += 0.15;

      // - RSI just crossed above 50 (strong recovery)
      if (state.rsi > 50 && state.rsi < 55) confidence += 0.2;

      // - RSI was deeply oversold (strong bounce)
      if (state.previousRsi < 30) confidence += 0.15;
    } else {
      // SELL confidence
      const priceDeviation = (state.ma200 - state.price) / state.ma200;
      if (priceDeviation > 0.01) confidence += 0.15;

      if (state.rsi < 50 && state.rsi > 45) confidence += 0.2;

      if (state.previousRsi > 70) confidence += 0.15;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Get strategy parameters
   */
  getParameters() {
    return {
      rsiOversoldThreshold: this.rsiOversoldThreshold,
      rsiOverboughtThreshold: this.rsiOverboughtThreshold,
      rsiRecoveryThreshold: this.rsiRecoveryThreshold,
      description: 'Trend + Pullback Continuation Strategy',
    };
  }
}

/**
 * Multi-timeframe Trend + Pullback Strategy
 * Uses 1H for trend confirmation, 15M for entries
 */
export class MultiTimeframeTrendPullback {
  private strategy1H = new TrendPullbackStrategy();
  private strategy15M = new TrendPullbackStrategy();

  /**
   * Generate signal with multi-timeframe confirmation
   */
  generateSignal(
    state1H: StrategyState,
    state15M: StrategyState
  ): StrategySignal {
    // Get signals from both timeframes
    const signal1H = this.strategy1H.generateSignal(state1H);
    const signal15M = this.strategy15M.generateSignal(state15M);

    // 1H must show trend (not HOLD)
    if (signal1H.action === 'HOLD') {
      return {
        action: 'HOLD',
        confidence: 0,
        reason: `1H timeframe shows no clear trend (${signal1H.reason})`,
      };
    }

    // 15M must confirm the same direction
    if (signal15M.action !== signal1H.action && signal15M.action !== 'HOLD') {
      return {
        action: 'HOLD',
        confidence: 0,
        reason: `Timeframe disagreement: 1H ${signal1H.action} vs 15M ${signal15M.action}`,
      };
    }

    // If 1H shows trend and 15M confirms or is neutral, take the trade
    if (signal15M.action === signal1H.action) {
      // Both timeframes agree - highest confidence
      return {
        action: signal1H.action,
        confidence: Math.min(0.95, (signal1H.confidence + signal15M.confidence) / 2 + 0.15),
        reason: `Multi-timeframe confirmation: 1H ${signal1H.reason} + 15M ${signal15M.reason}`,
        entryPrice: state15M.price,
        stopLoss: signal1H.stopLoss,
        takeProfit: signal1H.takeProfit,
      };
    } else if (signal15M.action === 'HOLD' && signal1H.confidence > 0.6) {
      // 1H strong signal, 15M neutral - take it
      return {
        action: signal1H.action,
        confidence: signal1H.confidence * 0.85,
        reason: `1H strong signal (${signal1H.confidence.toFixed(2)}), 15M neutral`,
        entryPrice: state15M.price,
        stopLoss: signal1H.stopLoss,
        takeProfit: signal1H.takeProfit,
      };
    }

    return {
      action: 'HOLD',
      confidence: 0,
      reason: `Waiting for multi-timeframe alignment`,
    };
  }
}
