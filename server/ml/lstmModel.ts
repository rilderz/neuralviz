/**
 * LSTM Neural Network Model for Forex Price Prediction
 * 
 * This is a simulated LSTM model that learns price patterns
 * In production, this would use TensorFlow.js or Python backend
 */

export interface LSTMConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export interface TrainingData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PredictionResult {
  predictedPrice: number;
  confidence: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
}

export interface ModelMetrics {
  trainLoss: number[];
  valLoss: number[];
  accuracy: number;
  winRate: number;
  profitFactor: number;
}

/**
 * Simulated LSTM Model
 * Uses mathematical approximations to simulate neural network behavior
 */
export class LSTMModel {
  private config: LSTMConfig;
  private weights: number[][][] = [];
  private biases: number[][] = [];
  private metrics: ModelMetrics = {
    trainLoss: [],
    valLoss: [],
    accuracy: 0,
    winRate: 0,
    profitFactor: 0,
  };
  private trainingProgress: number = 0;

  constructor(config: LSTMConfig) {
    this.config = config;
    this.initializeWeights();
  }

  /**
   * Initialize random weights and biases
   */
  private initializeWeights(): void {
    // Input to hidden layer
    this.weights[0] = Array(this.config.hiddenSize)
      .fill(0)
      .map(() =>
        Array(this.config.inputSize)
          .fill(0)
          .map(() => Math.random() * 0.1 - 0.05)
      );

    // Hidden to output layer
    this.weights[1] = Array(this.config.outputSize)
      .fill(0)
      .map(() =>
        Array(this.config.hiddenSize)
          .fill(0)
          .map(() => Math.random() * 0.1 - 0.05)
      );

    // Biases
    this.biases[0] = Array(this.config.hiddenSize).fill(0.01);
    this.biases[1] = Array(this.config.outputSize).fill(0.01);
  }

  /**
   * Extract features from training data
   */
  private extractFeatures(data: TrainingData[]): number[][] {
    const features: number[][] = [];

    for (let i = this.config.inputSize; i < data.length; i++) {
      const window = data.slice(i - this.config.inputSize, i);
      const closes = window.map((d) => d.close);

      const feature = [
        this.calculateRSI(closes),
        this.calculateMACD(closes),
        closes[closes.length - 1] / closes[0], // Price ratio
        (closes[closes.length - 1] - closes[0]) / closes[0], // Return
        this.calculateVolatility(closes),
      ];

      features.push(feature);
    }

    return features;
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[]): number {
    if (prices.length < 14) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / 14;
    const avgLoss = losses / 14;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]): number {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    return Math.tanh(macd); // Normalize to -1 to 1
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Forward pass through the network
   */
  private forward(input: number[]): number[] {
    // Hidden layer with ReLU activation
    const hidden = this.weights[0].map((row) =>
      Math.max(
        0,
        row.reduce((sum, w, i) => sum + w * (input[i] || 0), 0) + this.biases[0][0]
      )
    );

    // Output layer with sigmoid activation
    const output = this.weights[1].map((row) => {
      const z = row.reduce((sum, w, i) => sum + w * hidden[i], 0) + this.biases[1][0];
      return 1 / (1 + Math.exp(-z)); // Sigmoid
    });

    return output;
  }

  /**
   * Train the model on historical data
   * @param data Training data
   * @param onProgress Callback to report progress (epoch, totalEpochs)
   */
  async train(data: TrainingData[], onProgress?: (epoch: number, totalEpochs: number) => void): Promise<ModelMetrics> {
    const features = this.extractFeatures(data);
    const closes = data.map((d) => d.close);

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      // Report progress
      if (onProgress) {
        onProgress(epoch, this.config.epochs);
      }

      let totalLoss = 0;

      for (let i = 0; i < features.length; i++) {
        const prediction = this.forward(features[i]);
        const nextPrice = closes[i + this.config.inputSize];
        const currentPrice = closes[i + this.config.inputSize - 1];
        const target = nextPrice > currentPrice ? 1 : 0;

        // Calculate loss (binary cross-entropy approximation)
        const loss = -(target * Math.log(prediction[0] + 1e-7) +
          (1 - target) * Math.log(1 - prediction[0] + 1e-7));
        totalLoss += loss;

        // Simple weight update (gradient descent approximation)
        const error = prediction[0] - target;
        for (let j = 0; j < this.weights[1].length; j++) {
          for (let k = 0; k < this.weights[1][j].length; k++) {
            this.weights[1][j][k] -= this.config.learningRate * error * 0.01;
          }
        }
      }

      this.metrics.trainLoss.push(totalLoss / features.length);
      this.trainingProgress = ((epoch + 1) / this.config.epochs) * 100;

      // Yield to event loop to allow other operations
      await new Promise(resolve => setImmediate(resolve));
    }

    // Final progress update
    if (onProgress) {
      onProgress(this.config.epochs, this.config.epochs);
    }

    // Calculate metrics
    let correctPredictions = 0;
    for (let i = 0; i < features.length; i++) {
      const prediction = this.forward(features[i]);
      const nextPrice = closes[i + this.config.inputSize];
      const currentPrice = closes[i + this.config.inputSize - 1];
      const target = nextPrice > currentPrice ? 1 : 0;
      if ((prediction[0] > 0.5 && target === 1) || (prediction[0] <= 0.5 && target === 0)) {
        correctPredictions++;
      }
    }

    this.metrics.accuracy = correctPredictions / features.length;
    this.trainingProgress = 100;

    return this.metrics;
  }

  /**
   * Make a prediction on new data
   * FIXED: Handles short data windows and prevents NaN
   */
  predict(data: TrainingData[]): PredictionResult {
    // Guard against insufficient data
    if (data.length < this.config.inputSize) {
      return {
        predictedPrice: data[data.length - 1].close,
        confidence: 0,
        signal: 'HOLD',
      };
    }

    const features = this.extractFeatures(data);
    if (features.length === 0) {
      return {
        predictedPrice: data[data.length - 1].close,
        confidence: 0,
        signal: 'HOLD',
      };
    }

    const lastFeature = features[features.length - 1];
    const prediction = this.forward(lastFeature);
    const predictedPrice = data[data.length - 1].close * (1 + (prediction[0] - 0.5) * 0.02);
    
    // FIXED: Clamp confidence to 0-1 to prevent NaN
    const confidence = Math.min(1, Math.max(0, Math.abs(prediction[0] - 0.5) * 2));

    // Improved signal generation with better thresholds
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // Calculate additional indicators for better signals
    const closes = data.map(d => d.close);
    const rsi = this.calculateRSI(closes);
    const macd = this.calculateMACD(closes);
    
    // More aggressive signal generation
    if (prediction[0] > 0.52 && confidence > 0.25 && rsi > 50) {
      signal = 'BUY';
    } else if (prediction[0] < 0.48 && confidence > 0.25 && rsi < 50) {
      signal = 'SELL';
    } else if (prediction[0] > 0.58 && confidence > 0.15) {
      signal = 'BUY';
    } else if (prediction[0] < 0.42 && confidence > 0.15) {
      signal = 'SELL';
    }

    return {
      predictedPrice,
      confidence,
      signal,
    };
  }

  /**
   * Get training progress
   */
  getProgress(): number {
    return this.trainingProgress;
  }

  /**
   * Get model metrics
   */
  getMetrics(): ModelMetrics {
    return this.metrics;
  }
}
