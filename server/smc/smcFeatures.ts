/**
 * Smart Money Concepts (SMC) Feature Extraction
 * 
 * Professional institutional trading strategies:
 * 1. Liquidity - Where institutions accumulate/distribute
 * 2. Order Blocks - Support/resistance from institutional activity
 * 3. Liquidity Sweeps - Fake breakouts to trigger stops
 * 4. 3-Phase Market Moves - Accumulation → Markup → Distribution
 * 5. Smart Money Traps - False breakouts that reverse
 */

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCFeatures {
  // Liquidity Levels
  buyerLiquidity: number; // Unfilled buy orders below price
  sellerLiquidity: number; // Unfilled sell orders above price
  liquidityVoid: boolean; // Gap in liquidity

  // Order Blocks
  bullishOrderBlock: { price: number; strength: number } | null;
  bearishOrderBlock: { price: number; strength: number } | null;

  // Market Structure
  highestHigh: number;
  lowestLow: number;
  marketStructure: 'UPTREND' | 'DOWNTREND' | 'RANGE';

  // 3-Phase Move Detection
  phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'UNKNOWN';
  phaseStrength: number; // 0-1

  // Liquidity Sweep
  liquiditySweepDetected: boolean;
  sweepType: 'BULLISH' | 'BEARISH' | 'NONE';
  sweepStrength: number; // 0-1

  // Smart Money Trap
  trapDetected: boolean;
  trapType: 'BULL_TRAP' | 'BEAR_TRAP' | 'NONE';
  trapConfidence: number; // 0-1

  // Volume Analysis
  volumeProfile: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  volumeStrength: number; // 0-1
}

/**
 * Smart Money Concepts Analyzer
 */
export class SMCAnalyzer {
  /**
   * Extract SMC features from price data
   */
  static extractFeatures(candles: Candle[]): SMCFeatures | null {
    if (candles.length < 50) return null; // Need sufficient history

    const current = candles[candles.length - 1];
    const recent = candles.slice(-20); // Last 20 candles
    const medium = candles.slice(-50); // Last 50 candles

    return {
      // Liquidity Analysis
      buyerLiquidity: this.calculateBuyerLiquidity(recent),
      sellerLiquidity: this.calculateSellerLiquidity(recent),
      liquidityVoid: this.detectLiquidityVoid(recent),

      // Order Blocks
      bullishOrderBlock: this.findBullishOrderBlock(medium),
      bearishOrderBlock: this.findBearishOrderBlock(medium),

      // Market Structure
      highestHigh: Math.max(...medium.map(c => c.high)),
      lowestLow: Math.min(...medium.map(c => c.low)),
      marketStructure: this.analyzeMarketStructure(medium),

      // 3-Phase Move
      phase: this.detectPhase(medium),
      phaseStrength: this.calculatePhaseStrength(medium),

      // Liquidity Sweep
      liquiditySweepDetected: this.detectLiquiditySweep(recent),
      sweepType: this.determineSweepType(recent),
      sweepStrength: this.calculateSweepStrength(recent),

      // Smart Money Trap
      trapDetected: this.detectSmartMoneyTrap(recent),
      trapType: this.determineTrapType(recent),
      trapConfidence: this.calculateTrapConfidence(recent),

      // Volume Analysis
      volumeProfile: this.analyzeVolumeProfile(medium),
      volumeStrength: this.calculateVolumeStrength(medium),
    };
  }

  /**
   * Calculate buyer liquidity (unfilled buy orders below current price)
   * 
   * Smart money leaves buy orders below price to accumulate on dips
   */
  private static calculateBuyerLiquidity(candles: Candle[]): number {
    const current = candles[candles.length - 1];
    const lows = candles.map(c => c.low);
    const minLow = Math.min(...lows);

    // Count how many times price touched/rejected lows
    const touchCount = lows.filter(l => Math.abs(l - minLow) < minLow * 0.001).length;
    const rejectionStrength = touchCount / candles.length;

    return Math.min(1, rejectionStrength * 2);
  }

  /**
   * Calculate seller liquidity (unfilled sell orders above current price)
   */
  private static calculateSellerLiquidity(candles: Candle[]): number {
    const highs = candles.map(c => c.high);
    const maxHigh = Math.max(...highs);

    // Count how many times price touched/rejected highs
    const touchCount = highs.filter(h => Math.abs(h - maxHigh) < maxHigh * 0.001).length;
    const rejectionStrength = touchCount / candles.length;

    return Math.min(1, rejectionStrength * 2);
  }

  /**
   * Detect liquidity voids (gaps in price action)
   * 
   * Voids are areas where price jumped over without trading
   * Smart money uses these as targets
   */
  private static detectLiquidityVoid(candles: Candle[]): boolean {
    for (let i = 1; i < candles.length; i++) {
      const gap = Math.abs(candles[i].open - candles[i - 1].close) / candles[i - 1].close;
      if (gap > 0.005) { // 0.5% gap
        return true;
      }
    }
    return false;
  }

  /**
   * Find bullish order blocks (support zones from previous selling)
   * 
   * Order blocks form when price reverses sharply after a move
   * They represent institutional accumulation zones
   */
  private static findBullishOrderBlock(candles: Candle[]): { price: number; strength: number } | null {
    // Look for sharp reversals from down to up
    for (let i = 2; i < candles.length; i++) {
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const current = candles[i];

      // Downtrend followed by strong reversal
      if (prev2.close > prev1.close && prev1.close < current.close && current.close > prev2.close) {
        const blockPrice = prev1.low;
        const strength = (current.close - prev1.low) / (prev2.high - prev1.low);
        return {
          price: blockPrice,
          strength: Math.min(1, strength),
        };
      }
    }
    return null;
  }

  /**
   * Find bearish order blocks (resistance zones from previous buying)
   */
  private static findBearishOrderBlock(candles: Candle[]): { price: number; strength: number } | null {
    // Look for sharp reversals from up to down
    for (let i = 2; i < candles.length; i++) {
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const current = candles[i];

      // Uptrend followed by strong reversal
      if (prev2.close < prev1.close && prev1.close > current.close && current.close < prev2.close) {
        const blockPrice = prev1.high;
        const strength = (prev1.high - current.close) / (prev1.high - prev2.low);
        return {
          price: blockPrice,
          strength: Math.min(1, strength),
        };
      }
    }
    return null;
  }

  /**
   * Analyze market structure (uptrend, downtrend, range)
   * 
   * Uptrend: Higher Highs and Higher Lows (HH-HL)
   * Downtrend: Lower Highs and Lower Lows (LH-LL)
   * Range: Oscillating between support/resistance
   */
  private static analyzeMarketStructure(candles: Candle[]): 'UPTREND' | 'DOWNTREND' | 'RANGE' {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    let hhCount = 0; // Higher Highs
    let llCount = 0; // Lower Lows
    let lhCount = 0; // Lower Highs
    let hlCount = 0; // Higher Lows

    for (let i = 1; i < candles.length; i++) {
      if (highs[i] > highs[i - 1]) hhCount++;
      else lhCount++;

      if (lows[i] > lows[i - 1]) hlCount++;
      else llCount++;
    }

    if (hhCount > lhCount && hlCount > llCount) return 'UPTREND';
    if (lhCount > hhCount && llCount > hlCount) return 'DOWNTREND';
    return 'RANGE';
  }

  /**
   * Detect 3-phase market move
   * 
   * Phase 1 (Accumulation): Low volume, consolidation, smart money buying
   * Phase 2 (Markup): Volume increases, price rises sharply, breakout
   * Phase 3 (Distribution): Volume increases, price stalls, smart money selling
   */
  private static detectPhase(candles: Candle[]): 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'UNKNOWN' {
    const recent = candles.slice(-20);
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const volatility = this.calculateVolatility(recent);
    const trend = this.calculateTrend(recent);

    // Phase 1: Low volume, low volatility, consolidation
    if (volatility < 0.01 && recent.filter(c => c.volume < avgVolume * 0.8).length > 10) {
      return 'ACCUMULATION';
    }

    // Phase 2: High volume, high volatility, strong trend
    if (volatility > 0.02 && Math.abs(trend) > 0.01) {
      return 'MARKUP';
    }

    // Phase 3: High volume but price stalling
    if (volatility < 0.01 && recent.filter(c => c.volume > avgVolume * 1.2).length > 10) {
      return 'DISTRIBUTION';
    }

    return 'UNKNOWN';
  }

  /**
   * Calculate phase strength (0-1)
   */
  private static calculatePhaseStrength(candles: Candle[]): number {
    const volatility = this.calculateVolatility(candles);
    const trend = Math.abs(this.calculateTrend(candles));
    return Math.min(1, (volatility + trend) / 2);
  }

  /**
   * Detect liquidity sweeps (fake breakouts)
   * 
   * Price breaks above resistance/below support, then reverses
   * Smart money triggers stops, then moves in real direction
   */
  private static detectLiquiditySweep(candles: Candle[]): boolean {
    if (candles.length < 5) return false;

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const high20 = Math.max(...candles.slice(-20).map(c => c.high));
    const low20 = Math.min(...candles.slice(-20).map(c => c.low));

    // Bullish sweep: breaks above, then closes below
    if (current.high > high20 && current.close < prev.close) return true;

    // Bearish sweep: breaks below, then closes above
    if (current.low < low20 && current.close > prev.close) return true;

    return false;
  }

  /**
   * Determine sweep type
   */
  private static determineSweepType(candles: Candle[]): 'BULLISH' | 'BEARISH' | 'NONE' {
    if (candles.length < 5) return 'NONE';

    const current = candles[candles.length - 1];
    const high20 = Math.max(...candles.slice(-20).map(c => c.high));
    const low20 = Math.min(...candles.slice(-20).map(c => c.low));

    if (current.high > high20 && current.close < candles[candles.length - 2].close) {
      return 'BULLISH';
    }
    if (current.low < low20 && current.close > candles[candles.length - 2].close) {
      return 'BEARISH';
    }
    return 'NONE';
  }

  /**
   * Calculate sweep strength
   */
  private static calculateSweepStrength(candles: Candle[]): number {
    if (candles.length < 5) return 0;

    const current = candles[candles.length - 1];
    const high20 = Math.max(...candles.slice(-20).map(c => c.high));
    const low20 = Math.min(...candles.slice(-20).map(c => c.low));

    const bullishSweepDistance = current.high - high20;
    const bearishSweepDistance = low20 - current.low;
    const maxDistance = Math.max(bullishSweepDistance, bearishSweepDistance);

    return Math.min(1, maxDistance / (high20 - low20));
  }

  /**
   * Detect smart money traps
   * 
   * Bull trap: Price breaks up, triggers stops, reverses down
   * Bear trap: Price breaks down, triggers stops, reverses up
   */
  private static detectSmartMoneyTrap(candles: Candle[]): boolean {
    if (candles.length < 10) return false;

    const recent = candles.slice(-10);
    const opens = recent.map(c => c.open);
    const closes = recent.map(c => c.close);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);

    // Bull trap: new high, then closes near low
    const bullTrap = Math.max(...highs) === highs[highs.length - 1] && 
                     closes[closes.length - 1] < opens[opens.length - 1];

    // Bear trap: new low, then closes near high
    const bearTrap = Math.min(...lows) === lows[lows.length - 1] && 
                     closes[closes.length - 1] > opens[opens.length - 1];

    return bullTrap || bearTrap;
  }

  /**
   * Determine trap type
   */
  private static determineTrapType(candles: Candle[]): 'BULL_TRAP' | 'BEAR_TRAP' | 'NONE' {
    if (candles.length < 10) return 'NONE';

    const recent = candles.slice(-10);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const current = recent[recent.length - 1];

    if (Math.max(...highs) === current.high && current.close < current.open) {
      return 'BULL_TRAP';
    }
    if (Math.min(...lows) === current.low && current.close > current.open) {
      return 'BEAR_TRAP';
    }
    return 'NONE';
  }

  /**
   * Calculate trap confidence
   */
  private static calculateTrapConfidence(candles: Candle[]): number {
    if (candles.length < 10) return 0;

    const recent = candles.slice(-10);
    const current = recent[recent.length - 1];
    const prev = recent[recent.length - 2];

    // Confidence based on reversal strength
    const bullTrapReversal = (prev.high - current.close) / (prev.high - prev.low);
    const bearTrapReversal = (current.close - prev.low) / (prev.high - prev.low);

    return Math.min(1, Math.max(bullTrapReversal, bearTrapReversal));
  }

  /**
   * Analyze volume profile (accumulation vs distribution)
   */
  private static analyzeVolumeProfile(candles: Candle[]): 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' {
    const upVolume = candles
      .filter((c, i) => i === 0 || c.close >= c.open)
      .reduce((sum, c) => sum + c.volume, 0);

    const downVolume = candles
      .filter((c, i) => i === 0 || c.close < c.open)
      .reduce((sum, c) => sum + c.volume, 0);

    if (upVolume > downVolume * 1.5) return 'ACCUMULATION';
    if (downVolume > upVolume * 1.5) return 'DISTRIBUTION';
    return 'NEUTRAL';
  }

  /**
   * Calculate volume strength
   */
  private static calculateVolumeStrength(candles: Candle[]): number {
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const maxVolume = Math.max(...candles.map(c => c.volume));
    return Math.min(1, maxVolume / (avgVolume * 2));
  }

  /**
   * Helper: Calculate volatility
   */
  private static calculateVolatility(candles: Candle[]): number {
    const returns = candles.map((c, i) => 
      i === 0 ? 0 : (c.close - candles[i - 1].close) / candles[i - 1].close
    );
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Helper: Calculate trend
   */
  private static calculateTrend(candles: Candle[]): number {
    const closes = candles.map(c => c.close);
    const firstHalf = closes.slice(0, Math.floor(closes.length / 2));
    const secondHalf = closes.slice(Math.floor(closes.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
    return (avgSecond - avgFirst) / avgFirst;
  }

  /**
   * Convert features to array for ML model
   */
  static featuresToArray(features: SMCFeatures): number[] {
    return [
      features.buyerLiquidity,
      features.sellerLiquidity,
      features.liquidityVoid ? 1 : 0,
      features.bullishOrderBlock?.strength ?? 0,
      features.bearishOrderBlock?.strength ?? 0,
      features.marketStructure === 'UPTREND' ? 1 : features.marketStructure === 'DOWNTREND' ? -1 : 0,
      features.phaseStrength,
      features.liquiditySweepDetected ? 1 : 0,
      features.sweepStrength,
      features.trapDetected ? 1 : 0,
      features.trapConfidence,
      features.volumeStrength,
      features.volumeProfile === 'ACCUMULATION' ? 1 : features.volumeProfile === 'DISTRIBUTION' ? -1 : 0,
    ];
  }

  /**
   * Get feature names
   */
  static getFeatureNames(): string[] {
    return [
      'Buyer_Liquidity',
      'Seller_Liquidity',
      'Liquidity_Void',
      'Bullish_OrderBlock_Strength',
      'Bearish_OrderBlock_Strength',
      'Market_Structure',
      'Phase_Strength',
      'Liquidity_Sweep_Detected',
      'Sweep_Strength',
      'Trap_Detected',
      'Trap_Confidence',
      'Volume_Strength',
      'Volume_Profile',
    ];
  }
}
