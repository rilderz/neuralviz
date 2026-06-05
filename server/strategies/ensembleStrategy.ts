import { TrendPullbackStrategy, StrategyState, StrategySignal } from "./trendPullbackStrategy";

/**
 * Multi-Strategy Ensemble
 * Combines multiple strategies for more robust signals
 */
export class EnsembleStrategy {
  private trendPullback = new TrendPullbackStrategy();

  /**
   * Momentum Strategy - Buy on strong momentum, sell on reversal
   */
  private generateMomentumSignal(state: StrategyState): StrategySignal {
    const rsiStrength = state.rsi > 70 ? 1 : state.rsi < 30 ? -1 : 0;
    const priceStrength = state.price > state.ma200 ? 1 : -1;

    if (rsiStrength === 1 && priceStrength === 1) {
      return {
        action: "BUY",
        confidence: 0.7,
        reason: `Strong momentum: RSI ${state.rsi.toFixed(1)} above 70, price above MA200`,
        entryPrice: state.price,
        stopLoss: state.price * 0.97,
        takeProfit: state.price * 1.04,
      };
    } else if (rsiStrength === -1 && priceStrength === -1) {
      return {
        action: "SELL",
        confidence: 0.7,
        reason: `Strong momentum: RSI ${state.rsi.toFixed(1)} below 30, price below MA200`,
        entryPrice: state.price,
        stopLoss: state.price * 1.03,
        takeProfit: state.price * 0.96,
      };
    }

    return {
      action: "HOLD",
      confidence: 0,
      reason: "Momentum not strong enough",
    };
  }

  /**
   * Mean Reversion Strategy - Buy oversold, sell overbought
   */
  private generateMeanReversionSignal(state: StrategyState): StrategySignal {
    if (state.rsi < 25 && state.price < state.ma200 * 0.99) {
      return {
        action: "BUY",
        confidence: 0.65,
        reason: `Mean reversion: Deeply oversold (RSI ${state.rsi.toFixed(1)}), price well below MA200`,
        entryPrice: state.price,
        stopLoss: state.price * 0.96,
        takeProfit: state.price * 1.03,
      };
    } else if (state.rsi > 75 && state.price > state.ma200 * 1.01) {
      return {
        action: "SELL",
        confidence: 0.65,
        reason: `Mean reversion: Deeply overbought (RSI ${state.rsi.toFixed(1)}), price well above MA200`,
        entryPrice: state.price,
        stopLoss: state.price * 1.04,
        takeProfit: state.price * 0.97,
      };
    }

    return {
      action: "HOLD",
      confidence: 0,
      reason: "Not extreme enough for mean reversion",
    };
  }

  /**
   * Breakout Strategy - Trade breakouts above/below key levels
   */
  private generateBreakoutSignal(state: StrategyState): StrategySignal {
    const priceDeviation = Math.abs(state.price - state.ma200) / state.ma200;

    if (state.price > state.ma200 * 1.02 && state.rsi > 55 && priceDeviation > 0.015) {
      return {
        action: "BUY",
        confidence: 0.6,
        reason: `Breakout: Price ${(priceDeviation * 100).toFixed(2)}% above MA200, RSI ${state.rsi.toFixed(1)}`,
        entryPrice: state.price,
        stopLoss: state.price * 0.98,
        takeProfit: state.price * 1.05,
      };
    } else if (state.price < state.ma200 * 0.98 && state.rsi < 45 && priceDeviation > 0.015) {
      return {
        action: "SELL",
        confidence: 0.6,
        reason: `Breakout: Price ${(priceDeviation * 100).toFixed(2)}% below MA200, RSI ${state.rsi.toFixed(1)}`,
        entryPrice: state.price,
        stopLoss: state.price * 1.02,
        takeProfit: state.price * 0.95,
      };
    }

    return {
      action: "HOLD",
      confidence: 0,
      reason: "No clear breakout",
    };
  }

  /**
   * Generate ensemble signal with voting system
   */
  generateSignal(state: StrategyState): StrategySignal {
    // Get signals from all strategies
    const trendPullbackSignal = this.trendPullback.generateSignal(state);
    const momentumSignal = this.generateMomentumSignal(state);
    const meanReversionSignal = this.generateMeanReversionSignal(state);
    const breakoutSignal = this.generateBreakoutSignal(state);

    // Voting system
    const signals = [trendPullbackSignal, momentumSignal, meanReversionSignal, breakoutSignal];
    const buyVotes = signals.filter((s) => s.action === "BUY").length;
    const sellVotes = signals.filter((s) => s.action === "SELL").length;
    const holdVotes = signals.filter((s) => s.action === "HOLD").length;

    // Determine consensus
    if (buyVotes >= 2 && buyVotes > sellVotes) {
      const avgConfidence = signals
        .filter((s) => s.action === "BUY")
        .reduce((sum, s) => sum + s.confidence, 0) / buyVotes;

      return {
        action: "BUY",
        confidence: Math.min(0.95, avgConfidence + 0.1), // Boost confidence for consensus
        reason: `Ensemble consensus: ${buyVotes}/4 strategies voting BUY (Trend+Pullback, Momentum, Mean Reversion, Breakout)`,
        entryPrice: state.price,
        stopLoss: state.price * 0.98,
        takeProfit: state.price * 1.03,
      };
    } else if (sellVotes >= 2 && sellVotes > buyVotes) {
      const avgConfidence = signals
        .filter((s) => s.action === "SELL")
        .reduce((sum, s) => sum + s.confidence, 0) / sellVotes;

      return {
        action: "SELL",
        confidence: Math.min(0.95, avgConfidence + 0.1),
        reason: `Ensemble consensus: ${sellVotes}/4 strategies voting SELL (Trend+Pullback, Momentum, Mean Reversion, Breakout)`,
        entryPrice: state.price,
        stopLoss: state.price * 1.02,
        takeProfit: state.price * 0.97,
      };
    }

    // Weak signal if only 1 strategy agrees
    if (buyVotes === 1 && buyVotes > sellVotes) {
      return {
        action: "HOLD",
        confidence: 0.3,
        reason: `Weak BUY signal: Only ${buyVotes}/4 strategies voting BUY`,
      };
    } else if (sellVotes === 1 && sellVotes > buyVotes) {
      return {
        action: "HOLD",
        confidence: 0.3,
        reason: `Weak SELL signal: Only ${sellVotes}/4 strategies voting SELL`,
      };
    }

    return {
      action: "HOLD",
      confidence: 0,
      reason: `No consensus: ${buyVotes} BUY, ${sellVotes} SELL, ${holdVotes} HOLD votes`,
    };
  }

  /**
   * Get detailed strategy breakdown
   */
  getStrategyBreakdown(state: StrategyState): {
    trendPullback: StrategySignal;
    momentum: StrategySignal;
    meanReversion: StrategySignal;
    breakout: StrategySignal;
  } {
    return {
      trendPullback: this.trendPullback.generateSignal(state),
      momentum: this.generateMomentumSignal(state),
      meanReversion: this.generateMeanReversionSignal(state),
      breakout: this.generateBreakoutSignal(state),
    };
  }
}
