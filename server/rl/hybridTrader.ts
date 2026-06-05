/**
 * Hybrid Trading System
 * 
 * Combines:
 * - Base model (SMC + technical indicators) for signal generation
 * - RL agent for position sizing and trade filtering
 * - Risk manager for hard constraints
 */

import { PPOAgent } from './ppoAgent';
import type { TradeState, TradeAction } from './tradingEnvironment';

export interface HybridSignal {
  baseSignal: 'BUY' | 'SELL' | 'HOLD';
  baseConfidence: number;
  rlAction: 0 | 1 | 2;
  rlPositionSize: number;
  finalSignal: 'BUY' | 'SELL' | 'HOLD';
  finalConfidence: number;
  reason: string;
}

export interface BaseModelOutput {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
}

/**
 * Hybrid Trader
 * 
 * Decision flow:
 * 1. Base model generates signal (SMC + technicals)
 * 2. RL agent evaluates if trade should be taken
 * 3. RL agent determines position size
 * 4. Risk manager applies hard constraints
 * 5. Final trade decision
 */
export class HybridTrader {
  private baseModel: BaseModelOutput | null = null;
  private rlAgent: PPOAgent;
  private state: TradeState;

  constructor(rlAgent: PPOAgent, initialState: TradeState) {
    this.rlAgent = rlAgent;
    this.state = initialState;
  }

  /**
   * Generate hybrid trading signal
   */
  generateSignal(
    baseSignal: BaseModelOutput,
    currentState: TradeState
  ): HybridSignal {
    this.baseModel = baseSignal;
    this.state = currentState;

    // Get RL agent decision
    const rlDecision = this.rlAgent.selectAction(currentState);

    // Combine decisions
    const hybrid = this.combineDecisions(baseSignal, rlDecision);

    return hybrid;
  }

  /**
   * Combine base model signal with RL decision
   */
  private combineDecisions(
    baseSignal: BaseModelOutput,
    rlDecision: TradeAction
  ): HybridSignal {
    let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let finalConfidence = 0;
    let reason = '';

    // RL action: 0=HOLD, 1=BUY, 2=SELL
    const rlSignal = rlDecision.action === 0 ? 'HOLD' : rlDecision.action === 1 ? 'BUY' : 'SELL';

    // Agreement logic
    if (baseSignal.signal === rlSignal && rlSignal !== 'HOLD') {
      // Both agree on BUY or SELL
      finalSignal = rlSignal as 'BUY' | 'SELL';
      finalConfidence = (baseSignal.confidence + 0.5) / 2; // Boost confidence
      reason = `Base model and RL agent agree on ${rlSignal}`;
    } else if (baseSignal.confidence > 0.7 && baseSignal.signal !== 'HOLD') {
      // Base model has high confidence, RL is neutral
      finalSignal = baseSignal.signal;
      finalConfidence = baseSignal.confidence * 0.8; // Slight discount
      reason = `Base model high confidence (${(baseSignal.confidence * 100).toFixed(0)}%), RL neutral`;
    } else if (rlSignal !== 'HOLD' && baseSignal.signal === 'HOLD') {
      // RL wants to trade, base model is neutral
      // Only take if RL confidence is high
      if (rlDecision.positionSize && rlDecision.positionSize > 0.05) {
        finalSignal = rlSignal as 'BUY' | 'SELL';
        finalConfidence = rlDecision.positionSize * 0.5; // Lower confidence
        reason = `RL agent initiated trade, base model neutral`;
      } else {
        finalSignal = 'HOLD';
        finalConfidence = 0;
        reason = `RL position size too small (${(rlDecision.positionSize || 0).toFixed(3)})`;
      }
    } else if (baseSignal.signal !== rlSignal && baseSignal.signal !== 'HOLD' && rlSignal !== 'HOLD') {
      // Disagreement on direction - don't trade
      finalSignal = 'HOLD';
      finalConfidence = 0;
      reason = `Base model and RL agent disagree: ${baseSignal.signal} vs ${rlSignal}`;
    } else {
      finalSignal = 'HOLD';
      finalConfidence = 0;
      reason = `No strong signal from either model`;
    }

    return {
      baseSignal: baseSignal.signal,
      baseConfidence: baseSignal.confidence,
      rlAction: rlDecision.action,
      rlPositionSize: rlDecision.positionSize || 0,
      finalSignal,
      finalConfidence,
      reason,
    };
  }

  /**
   * Store trade experience for RL learning
   */
  recordTrade(
    signal: HybridSignal,
    reward: number,
    newState: TradeState,
    done: boolean
  ): void {
    // Store in RL agent for training
    this.rlAgent.storeExperience(
      this.state,
      signal.rlAction,
      reward,
      done
    );

    this.state = newState;
  }

  /**
   * Train RL agent on collected experiences
   */
  trainRLAgent(): number {
    return this.rlAgent.train();
  }

  /**
   * Get current state
   */
  getState(): TradeState {
    return this.state;
  }
}

/**
 * Hybrid Trading Manager
 * 
 * Manages multiple hybrid traders for different currency pairs
 */
export class HybridTradingManager {
  private traders: Map<string, HybridTrader> = new Map();
  private baseModels: Map<string, BaseModelOutput> = new Map();

  /**
   * Initialize trader for a symbol
   */
  initializeTrader(symbol: string, rlAgent: PPOAgent, initialState: TradeState): void {
    const trader = new HybridTrader(rlAgent, initialState);
    this.traders.set(symbol, trader);
  }

  /**
   * Update base model signal for a symbol
   */
  updateBaseSignal(symbol: string, signal: BaseModelOutput): void {
    this.baseModels.set(symbol, signal);
  }

  /**
   * Generate hybrid signal for a symbol
   */
  generateSignal(symbol: string, state: TradeState): HybridSignal | null {
    const trader = this.traders.get(symbol);
    const baseSignal = this.baseModels.get(symbol);

    if (!trader || !baseSignal) {
      return null;
    }

    return trader.generateSignal(baseSignal, state);
  }

  /**
   * Record trade for learning
   */
  recordTrade(
    symbol: string,
    signal: HybridSignal,
    reward: number,
    newState: TradeState,
    done: boolean
  ): void {
    const trader = this.traders.get(symbol);
    if (trader) {
      trader.recordTrade(signal, reward, newState, done);
    }
  }

  /**
   * Train all RL agents
   */
  trainAllAgents(): Map<string, number> {
    const losses = new Map<string, number>();

    for (const [symbol, trader] of this.traders) {
      const loss = trader.trainRLAgent();
      losses.set(symbol, loss);
    }

    return losses;
  }

  /**
   * Get trader for a symbol
   */
  getTrader(symbol: string): HybridTrader | undefined {
    return this.traders.get(symbol);
  }
}
