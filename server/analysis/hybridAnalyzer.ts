/**
 * Hybrid Analysis Engine
 * 
 * Combines fundamental and technical analysis for comprehensive trading signals
 */

import { FundamentalAnalyzer, FundamentalScore } from './fundamentalAnalysis';
import { TechnicalAnalyzer, TechnicalIndicators, TechnicalScore } from './technicalAnalysis';

export interface HybridAnalysisResult {
  symbol: string;
  fundamentalScore: FundamentalScore;
  technicalScore: TechnicalScore;
  technicalIndicators: TechnicalIndicators;
  combinedScore: number; // -1 to 1
  confidence: number; // 0 to 1
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  reasoning: string;
  signals: {
    fundamental: string[];
    technical: string[];
  };
}

/**
 * Hybrid Analyzer - Combines Fundamental and Technical Analysis
 */
export class HybridAnalyzer {
  private fundamentalAnalyzer: FundamentalAnalyzer;
  private technicalAnalyzer: TechnicalAnalyzer;

  constructor() {
    this.fundamentalAnalyzer = new FundamentalAnalyzer();
    this.technicalAnalyzer = new TechnicalAnalyzer();
  }

  /**
   * Perform comprehensive hybrid analysis
   */
  analyze(
    symbol: string,
    baseCurrency: string,
    quoteCurrency: string,
    prices: number[]
  ): HybridAnalysisResult {
    // Get fundamental analysis
    const fundamentalScore = this.fundamentalAnalyzer.calculateFundamentalScore(
      baseCurrency,
      quoteCurrency
    );

    // Get technical analysis
    const technicalIndicators = this.technicalAnalyzer.calculateIndicators(prices);
    const technicalScore = this.technicalAnalyzer.calculateTechnicalScore(technicalIndicators);

    // Combine scores with weights
    // Technical analysis: 60% (more reactive to price action)
    // Fundamental analysis: 40% (longer-term trends)
    const combinedScore = technicalScore.overallScore * 0.6 + fundamentalScore.overallScore * 0.4;

    // Calculate confidence based on agreement between analyses
    const scoreAgreement = 1 - Math.abs(technicalScore.overallScore - fundamentalScore.overallScore);
    const confidence = (scoreAgreement + Math.abs(combinedScore)) / 2;

    // Generate recommendation
    let recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD';
    if (combinedScore > 0.6) recommendation = 'STRONG_BUY';
    else if (combinedScore > 0.3) recommendation = 'BUY';
    else if (combinedScore < -0.6) recommendation = 'STRONG_SELL';
    else if (combinedScore < -0.3) recommendation = 'SELL';

    // Generate signals
    const fundamentalSignals = this.generateFundamentalSignals(fundamentalScore);
    const technicalSignals = this.generateTechnicalSignals(technicalScore, technicalIndicators);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      fundamentalScore,
      technicalScore,
      combinedScore,
      fundamentalSignals,
      technicalSignals
    );

    return {
      symbol,
      fundamentalScore,
      technicalScore,
      technicalIndicators,
      combinedScore,
      confidence,
      recommendation,
      reasoning,
      signals: {
        fundamental: fundamentalSignals,
        technical: technicalSignals,
      },
    };
  }

  /**
   * Generate fundamental analysis signals
   */
  private generateFundamentalSignals(score: FundamentalScore): string[] {
    const signals: string[] = [];

    // GDP Growth signals
    if (score.gdpGrowth > 0.3) {
      signals.push('Strong GDP growth supports currency strength');
    } else if (score.gdpGrowth < -0.3) {
      signals.push('Weak GDP growth pressures currency');
    }

    // Inflation signals
    if (score.inflationRate > 0.3) {
      signals.push('Inflation concerns may trigger rate hikes');
    } else if (score.inflationRate < -0.3) {
      signals.push('Low inflation supports dovish policy');
    }

    // Interest rate signals
    if (score.interestRate > 0.3) {
      signals.push('Higher interest rates attract foreign capital');
    } else if (score.interestRate < -0.3) {
      signals.push('Lower interest rates reduce currency appeal');
    }

    // News sentiment signals
    if (score.newsSentiment > 0.4) {
      signals.push('Positive news sentiment supports bullish outlook');
    } else if (score.newsSentiment < -0.4) {
      signals.push('Negative news sentiment creates bearish pressure');
    }

    // Trade balance signals
    if (score.tradeBalance > 0.2) {
      signals.push('Trade surplus strengthens currency');
    } else if (score.tradeBalance < -0.2) {
      signals.push('Trade deficit weakens currency');
    }

    return signals.length > 0 ? signals : ['No significant fundamental signals'];
  }

  /**
   * Generate technical analysis signals
   */
  private generateTechnicalSignals(
    score: TechnicalScore,
    indicators: TechnicalIndicators
  ): string[] {
    const signals: string[] = [];

    // Trend signals
    if (score.trendStrength > 0.4) {
      signals.push('Strong uptrend in place (EMA12 > EMA26)');
    } else if (score.trendStrength < -0.4) {
      signals.push('Strong downtrend in place (EMA12 < EMA26)');
    }

    // Momentum signals
    if (indicators.rsi > 70) {
      signals.push('RSI overbought - potential pullback risk');
    } else if (indicators.rsi < 30) {
      signals.push('RSI oversold - potential bounce opportunity');
    }

    // MACD signals
    if (indicators.macd > 0) {
      signals.push('MACD positive - bullish momentum');
    } else if (indicators.macd < 0) {
      signals.push('MACD negative - bearish momentum');
    }

    // Bollinger Bands signals
    if (indicators.bollingerBands.position > 0.9) {
      signals.push('Price near upper Bollinger Band - overbought');
    } else if (indicators.bollingerBands.position < 0.1) {
      signals.push('Price near lower Bollinger Band - oversold');
    }

    // Stochastic signals
    if (indicators.stochastic.k > 80) {
      signals.push('Stochastic overbought - bearish signal');
    } else if (indicators.stochastic.k < 20) {
      signals.push('Stochastic oversold - bullish signal');
    }

    // ADX signals
    if (indicators.adx > 60) {
      signals.push('Very strong trend (ADX > 60)');
    } else if (indicators.adx < 20) {
      signals.push('Weak trend - consolidation phase');
    }

    return signals.length > 0 ? signals : ['No significant technical signals'];
  }

  /**
   * Generate comprehensive reasoning
   */
  private generateReasoning(
    fundamental: FundamentalScore,
    technical: TechnicalScore,
    combined: number,
    fundamentalSignals: string[],
    technicalSignals: string[]
  ): string {
    const parts: string[] = [];

    // Overall assessment
    if (combined > 0.6) {
      parts.push('STRONG BUY: Convergence of bullish fundamental and technical signals.');
    } else if (combined > 0.3) {
      parts.push('BUY: Positive signals from both fundamental and technical analysis.');
    } else if (combined < -0.6) {
      parts.push('STRONG SELL: Convergence of bearish fundamental and technical signals.');
    } else if (combined < -0.3) {
      parts.push('SELL: Negative signals from both fundamental and technical analysis.');
    } else {
      parts.push('HOLD: Mixed signals or lack of clear direction.');
    }

    // Fundamental assessment
    if (Math.abs(fundamental.overallScore) > 0.4) {
      parts.push(
        `Fundamentals are ${fundamental.overallScore > 0 ? 'bullish' : 'bearish'} (${Math.abs(fundamental.overallScore).toFixed(2)})`
      );
    }

    // Technical assessment
    if (Math.abs(technical.overallScore) > 0.4) {
      parts.push(
        `Technicals are ${technical.overallScore > 0 ? 'bullish' : 'bearish'} (${Math.abs(technical.overallScore).toFixed(2)})`
      );
    }

    // Key signals
    parts.push(`Key signals: ${[...fundamentalSignals.slice(0, 2), ...technicalSignals.slice(0, 2)].join('; ')}`);

    return parts.join(' ');
  }

  /**
   * Get fundamental analyzer
   */
  getFundamentalAnalyzer(): FundamentalAnalyzer {
    return this.fundamentalAnalyzer;
  }

  /**
   * Get technical analyzer
   */
  getTechnicalAnalyzer(): TechnicalAnalyzer {
    return this.technicalAnalyzer;
  }
}
