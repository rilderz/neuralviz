/**
 * Simulated Forex Price Data Generator
 * 
 * Generates realistic price movements using Brownian motion
 * and market microstructure patterns
 */

export interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generate realistic forex price data
 */
export function generateForexData(
  symbol: string,
  startDate: Date,
  endDate: Date,
  basePrice: number = 1.1,
  barCount: number = 1000
): PriceBar[] {
  const data: PriceBar[] = [];
  const timeStep = (endDate.getTime() - startDate.getTime()) / barCount;

  let price = basePrice;
  const drift = 0.0001; // Slight upward drift
  const volatility = 0.008; // 0.8% daily volatility

  for (let i = 0; i < barCount; i++) {
    const timestamp = new Date(startDate.getTime() + i * timeStep);

    // Generate OHLC using geometric Brownian motion
    const randomWalk1 = (Math.random() - 0.5) * 2;
    const randomWalk2 = (Math.random() - 0.5) * 2;
    const randomWalk3 = (Math.random() - 0.5) * 2;
    const randomWalk4 = (Math.random() - 0.5) * 2;

    // Calculate price movements
    const openPrice = price;
    const closePrice = price * (1 + drift + volatility * randomWalk1);
    const highPrice = Math.max(openPrice, closePrice) * (1 + Math.abs(volatility * randomWalk2));
    const lowPrice = Math.min(openPrice, closePrice) * (1 - Math.abs(volatility * randomWalk3));

    // Add some mean reversion
    if (i > 0 && i % 20 === 0) {
      price = basePrice + (Math.random() - 0.5) * 0.02;
    } else {
      price = closePrice;
    }

    // Generate volume with some patterns
    const baseVolume = 1000000;
    const volumeMultiplier = 0.5 + Math.random() * 1.5;
    const volume = Math.floor(baseVolume * volumeMultiplier);

    data.push({
      timestamp,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      volume,
    });
  }

  return data;
}

/**
 * Generate training data with labels
 */
export function generateTrainingData(
  priceData: PriceBar[],
  lookbackPeriod: number = 20
): Array<{ features: number[]; label: number }> {
  const trainingData: Array<{ features: number[]; label: number }> = [];

  for (let i = lookbackPeriod; i < priceData.length - 1; i++) {
    const window = priceData.slice(i - lookbackPeriod, i);
    const nextBar = priceData[i + 1];

    // Extract features
    const features = extractFeatures(window);

    // Label: 1 if price goes up, 0 if down
    const label = nextBar.close > priceData[i].close ? 1 : 0;

    trainingData.push({ features, label });
  }

  return trainingData;
}

/**
 * Extract technical indicators as features
 */
export function extractFeatures(window: PriceBar[]): number[] {
  const closes = window.map((b) => b.close);
  const highs = window.map((b) => b.high);
  const lows = window.map((b) => b.low);
  const volumes = window.map((b) => b.volume);

  const features: number[] = [];

  // 1. Simple Moving Average
  const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
  features.push(closes[closes.length - 1] / sma);

  // 2. Exponential Moving Average
  const ema = calculateEMA(closes, 12);
  features.push(closes[closes.length - 1] / ema);

  // 3. RSI (Relative Strength Index)
  const rsi = calculateRSI(closes, 14);
  features.push(rsi / 100);

  // 4. MACD (Moving Average Convergence Divergence)
  const macd = calculateMACD(closes);
  features.push(macd);

  // 5. Bollinger Bands
  const { upper, lower, middle } = calculateBollingerBands(closes, 20, 2);
  features.push((closes[closes.length - 1] - lower) / (upper - lower));

  // 6. ATR (Average True Range)
  const atr = calculateATR(window, 14);
  features.push(atr / closes[closes.length - 1]);

  // 7. Volume trend
  const volumeMA = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  features.push(volumes[volumes.length - 1] / volumeMA);

  // 8. Price momentum
  const momentum = (closes[closes.length - 1] - closes[0]) / closes[0];
  features.push(momentum);

  // 9. Volatility
  const volatility = calculateVolatility(closes);
  features.push(volatility);

  // 10. High-Low range
  const range = (Math.max(...closes) - Math.min(...closes)) / Math.max(...closes);
  features.push(range);

  return features;
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = data[0];

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(data: number[], period: number = 14): number {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < Math.min(period + 1, data.length); i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - 100 / (1 + rs);

  return Math.max(0, Math.min(100, rsi));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(data: number[]): number {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12 - ema26;
  return Math.tanh(macd / data[data.length - 1]); // Normalize
}

/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(
  data: number[],
  period: number,
  stdDev: number
): { upper: number; lower: number; middle: number } {
  const slice = data.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / slice.length;
  const std = Math.sqrt(variance);

  return {
    upper: middle + std * stdDev,
    lower: middle - std * stdDev,
    middle,
  };
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(bars: PriceBar[], period: number): number {
  const trueRanges: number[] = [];

  for (let i = 1; i < Math.min(period + 1, bars.length); i++) {
    const tr1 = bars[i].high - bars[i].low;
    const tr2 = Math.abs(bars[i].high - bars[i - 1].close);
    const tr3 = Math.abs(bars[i].low - bars[i - 1].close);
    const tr = Math.max(tr1, tr2, tr3);
    trueRanges.push(tr);
  }

  return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
}

/**
 * Calculate Volatility (Standard Deviation of Returns)
 */
function calculateVolatility(data: number[]): number {
  const returns: number[] = [];

  for (let i = 1; i < data.length; i++) {
    returns.push((data[i] - data[i - 1]) / data[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;

  return Math.sqrt(variance);
}
