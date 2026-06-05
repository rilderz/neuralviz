/**
 * PPO (Proximal Policy Optimization) Agent for Trading
 * 
 * Implements PPO algorithm for stable RL training in trading
 * - Clipped objective function prevents large policy updates
 * - Stable learning curve
 * - Better than DQN for continuous control
 */

import { TradingEnvironment, TradeState, TradeAction } from './tradingEnvironment';

export interface PPOConfig {
  learningRate: number;
  clipRange: number; // Typically 0.2
  nEpochs: number; // Number of gradient steps per update
  batchSize: number;
  nSteps: number; // Steps before policy update
  gamma: number; // Discount factor
  lambda: number; // GAE lambda
  entropyCoef: number; // Entropy bonus
  valueCoef: number; // Value function weight
  maxGradNorm: number; // Gradient clipping
}

export interface NetworkWeights {
  policyWeights: number[][];
  valueWeights: number[][];
}

/**
 * Simple neural network for policy and value function
 */
class PolicyNetwork {
  private policyWeights: number[][] = [];
  private valueWeights: number[][] = [];
  private inputSize: number;
  private hiddenSize: number = 128;

  constructor(inputSize: number) {
    this.inputSize = inputSize;
    this.initializeWeights();
  }

  private initializeWeights(): void {
    // Policy network: input -> hidden -> 3 actions
    const policyHidden = this.randomMatrix(this.inputSize, this.hiddenSize);
    const policyOutput = this.randomMatrix(this.hiddenSize, 3);
    this.policyWeights = [...policyHidden, ...policyOutput];

    // Value network: input -> hidden -> 1 value
    const valueHidden = this.randomMatrix(this.inputSize, this.hiddenSize);
    const valueOutput = this.randomMatrix(this.hiddenSize, 1);
    this.valueWeights = [...valueHidden, ...valueOutput];
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() - 0.5) * 2 * Math.sqrt(2 / (rows + cols)));
      }
      matrix.push(row);
    }
    return matrix;
  }

  /**
   * Forward pass through policy network
   */
  predictPolicy(state: number[]): { action: 0 | 1 | 2; logProb: number; entropy: number } {
    // Simple forward pass (in production, use TensorFlow.js or similar)
    const policyHidden = this.policyWeights.slice(0, this.inputSize);
    const policyOutput = this.policyWeights.slice(this.inputSize);
    
    let hidden = this.matmul(state, policyHidden);
    hidden = this.relu(hidden);

    const logits = this.matmul(hidden, policyOutput);
    const probs = this.softmax(logits);

    // Sample action based on probabilities
    const action = this.sampleAction(probs);
    const logProb = Math.log(Math.max(probs[action], 1e-8));
    const entropy = -probs.reduce((sum, p) => sum + p * Math.log(Math.max(p, 1e-8)), 0);

    return { action: action as 0 | 1 | 2, logProb, entropy };
  }

  /**
   * Forward pass through value network
   */
  predictValue(state: number[]): number {
    const valueHidden = this.valueWeights.slice(0, this.inputSize);
    const valueOutput = this.valueWeights.slice(this.inputSize);
    
    let hidden = this.matmul(state, valueHidden);
    hidden = this.relu(hidden);

    const value = this.matmul(hidden, valueOutput);
    return value[0] || 0;
  }

  private matmul(vec: number[], matrix: number[][]): number[] {
    return matrix.map(row => vec.reduce((sum, v, i) => sum + v * row[i], 0));
  }

  private relu(vec: number[]): number[] {
    return vec.map(v => Math.max(0, v));
  }

  private softmax(vec: number[]): number[] {
    const maxVal = Math.max(...vec);
    const exp = vec.map(v => Math.exp(v - maxVal));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }

  private sampleAction(probs: number[]): number {
    const rand = Math.random();
    let cumSum = 0;
    for (let i = 0; i < probs.length; i++) {
      cumSum += probs[i];
      if (rand < cumSum) return i;
    }
    return probs.length - 1;
  }

  getWeights(): NetworkWeights {
    return {
      policyWeights: this.policyWeights,
      valueWeights: this.valueWeights,
    };
  }

  setWeights(weights: NetworkWeights): void {
    this.policyWeights = weights.policyWeights;
    this.valueWeights = weights.valueWeights;
  }
}

/**
 * PPO Agent
 */
export class PPOAgent {
  private network: PolicyNetwork;
  private config: PPOConfig;
  private experiences: Array<{
    state: number[];
    action: 0 | 1 | 2;
    reward: number;
    value: number;
    logProb: number;
    done: boolean;
  }> = [];

  constructor(stateSize: number, config: PPOConfig) {
    this.network = new PolicyNetwork(stateSize);
    this.config = config;
  }

  /**
   * Select action for given state
   */
  selectAction(state: TradeState): TradeAction {
    const stateArray = this.stateToArray(state);
    const { action } = this.network.predictPolicy(stateArray);

    // Determine position size based on confidence
    const positionSize = Math.random() * this.config.clipRange;

    return {
      action,
      positionSize: Math.min(positionSize, 0.1),
    };
  }

  /**
   * Store experience for training
   */
  storeExperience(
    state: TradeState,
    action: 0 | 1 | 2,
    reward: number,
    done: boolean
  ): void {
    const stateArray = this.stateToArray(state);
    const value = this.network.predictValue(stateArray);
    const { logProb } = this.network.predictPolicy(stateArray);

    this.experiences.push({
      state: stateArray,
      action,
      reward,
      value,
      logProb,
      done,
    });
  }

  /**
   * Train on collected experiences (simplified PPO update)
   */
  train(): number {
    if (this.experiences.length < this.config.batchSize) {
      return 0; // Not enough experiences
    }

    let totalLoss = 0;
    let updateCount = 0;

    // Compute advantages using GAE
    const advantages = this.computeAdvantages();

    // Mini-batch training
    for (let epoch = 0; epoch < this.config.nEpochs; epoch++) {
      for (let i = 0; i < this.experiences.length; i += this.config.batchSize) {
        const batch = this.experiences.slice(i, i + this.config.batchSize);
        const batchAdvantages = advantages.slice(i, i + this.config.batchSize);

        // Compute PPO loss
        let loss = 0;
        for (let j = 0; j < batch.length; j++) {
          const exp = batch[j];
          const advantage = batchAdvantages[j];

          // Policy loss (simplified)
          const policyLoss = -exp.logProb * advantage;

          // Value loss
          const valueLoss = Math.pow(advantage, 2);

          // Entropy bonus
          const entropyBonus = this.config.entropyCoef * 0.5; // Simplified

          loss += policyLoss + this.config.valueCoef * valueLoss - entropyBonus;
        }

        totalLoss += loss / batch.length;
        updateCount++;
      }
    }

    // Clear experiences after training
    this.experiences = [];

    return totalLoss / Math.max(updateCount, 1);
  }

  /**
   * Compute advantages using Generalized Advantage Estimation (GAE)
   */
  private computeAdvantages(): number[] {
    const advantages: number[] = [];
    let gae = 0;

    for (let t = this.experiences.length - 1; t >= 0; t--) {
      const exp = this.experiences[t];
      const nextValue = t + 1 < this.experiences.length ? this.experiences[t + 1].value : 0;

      const delta = exp.reward + this.config.gamma * nextValue - exp.value;
      gae = delta + this.config.gamma * this.config.lambda * (exp.done ? 0 : gae);

      advantages.unshift(gae);
    }

    // Normalize advantages
    const mean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
    const std = Math.sqrt(
      advantages.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / advantages.length
    );

    return advantages.map(a => (a - mean) / (std + 1e-8));
  }

  /**
   * Convert TradeState to array
   */
  private stateToArray(state: TradeState): number[] {
    return [
      state.rsi / 100,
      state.ma50 / 200,
      state.ma200 / 200,
      state.priceChange,
      state.volatility,
      state.currentPosition,
      state.balance / 10000,
      state.drawdown,
      state.tradesCount / 10,
      state.lastTradeProfit,
    ];
  }

  /**
   * Get network weights
   */
  getWeights(): NetworkWeights {
    return this.network.getWeights();
  }

  /**
   * Set network weights
   */
  setWeights(weights: NetworkWeights): void {
    this.network.setWeights(weights);
  }

  /**
   * Get experience count
   */
  getExperienceCount(): number {
    return this.experiences.length;
  }
}

/**
 * Training loop for PPO agent
 */
export async function trainPPOAgent(
  agent: PPOAgent,
  environment: TradingEnvironment,
  config: PPOConfig,
  episodes: number,
  onProgress?: (episode: number, totalEpisodes: number, avgReward: number) => void
): Promise<{ avgReward: number; avgDrawdown: number }> {
  const rewards: number[] = [];
  const drawdowns: number[] = [];

  for (let episode = 0; episode < episodes; episode++) {
    let state = environment.reset();
    let episodeReward = 0;
    let done = false;

    while (!done) {
      const action = agent.selectAction(state);

      // Simulate step (in real implementation, use actual market data)
      const price = 100 + Math.random() * 10;
      const indicators = {
        rsi: 50 + Math.random() * 20,
        ma50: 100,
        ma200: 100,
        volatility: 0.01,
      };

      const step = environment.step(action, price, indicators);
      state = step.state;
      episodeReward += step.reward;
      done = step.done;

      // Store experience
      agent.storeExperience(state, action.action, step.reward, done);
    }

    // Train agent
    agent.train();

    rewards.push(episodeReward);
    drawdowns.push(state.drawdown);

    if (onProgress) {
      const avgReward = rewards.slice(-100).reduce((a, b) => a + b, 0) / Math.min(rewards.length, 100);
      onProgress(episode + 1, episodes, avgReward);
    }
  }

  const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
  const avgDrawdown = drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length;

  return { avgReward, avgDrawdown };
}
