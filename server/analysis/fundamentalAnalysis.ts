/**
 * Fundamental Analysis Module
 * 
 * Analyzes economic indicators, news sentiment, and macroeconomic factors
 * for forex trading decisions
 */

export interface EconomicIndicator {
  name: string;
  value: number;
  previousValue: number;
  forecast: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  country: string;
  timestamp: Date;
}

export interface NewsSentiment {
  headline: string;
  sentiment: number; // -1 to 1, where -1 is very negative, 1 is very positive
  relevance: number; // 0 to 1, relevance to forex market
  country: string;
  timestamp: Date;
}

export interface FundamentalScore {
  gdpGrowth: number;
  inflationRate: number;
  unemploymentRate: number;
  interestRate: number;
  tradeBalance: number;
  newsSentiment: number;
  overallScore: number; // -1 to 1
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

/**
 * Fundamental Analysis Engine
 */
export class FundamentalAnalyzer {
  private economicIndicators: Map<string, EconomicIndicator[]> = new Map();
  private newsSentiments: Map<string, NewsSentiment[]> = new Map();

  /**
   * Get simulated economic indicators for a country
   */
  getEconomicIndicators(country: string): EconomicIndicator[] {
    const indicators: EconomicIndicator[] = [
      {
        name: 'GDP Growth',
        value: 2.5 + Math.random() * 2,
        previousValue: 2.3,
        forecast: 2.4,
        impact: 'HIGH',
        country,
        timestamp: new Date(),
      },
      {
        name: 'Inflation Rate',
        value: 2.0 + Math.random() * 1.5,
        previousValue: 2.1,
        forecast: 2.0,
        impact: 'HIGH',
        country,
        timestamp: new Date(),
      },
      {
        name: 'Unemployment Rate',
        value: 3.5 + Math.random() * 1,
        previousValue: 3.6,
        forecast: 3.5,
        impact: 'MEDIUM',
        country,
        timestamp: new Date(),
      },
      {
        name: 'Interest Rate',
        value: 4.5 + Math.random() * 1.5,
        previousValue: 4.5,
        forecast: 4.75,
        impact: 'HIGH',
        country,
        timestamp: new Date(),
      },
      {
        name: 'Trade Balance',
        value: -50 + Math.random() * 100,
        previousValue: -45,
        forecast: -40,
        impact: 'MEDIUM',
        country,
        timestamp: new Date(),
      },
    ];

    this.economicIndicators.set(country, indicators);
    return indicators;
  }

  /**
   * Get simulated news sentiment for a country
   */
  getNewsSentiment(country: string): NewsSentiment[] {
    const sentiments: NewsSentiment[] = [
      {
        headline: `${country} Central Bank signals hawkish stance`,
        sentiment: 0.7 + Math.random() * 0.3,
        relevance: 0.95,
        country,
        timestamp: new Date(),
      },
      {
        headline: `${country} exports surge beyond expectations`,
        sentiment: 0.6 + Math.random() * 0.4,
        relevance: 0.85,
        country,
        timestamp: new Date(),
      },
      {
        headline: `${country} inflation pressures ease`,
        sentiment: 0.5 + Math.random() * 0.3,
        relevance: 0.9,
        country,
        timestamp: new Date(),
      },
      {
        headline: `${country} manufacturing activity weakens`,
        sentiment: -0.4 - Math.random() * 0.3,
        relevance: 0.8,
        country,
        timestamp: new Date(),
      },
      {
        headline: `${country} consumer confidence improves`,
        sentiment: 0.4 + Math.random() * 0.3,
        relevance: 0.75,
        country,
        timestamp: new Date(),
      },
    ];

    this.newsSentiments.set(country, sentiments);
    return sentiments;
  }

  /**
   * Calculate fundamental score for a currency pair
   */
  calculateFundamentalScore(baseCurrency: string, quoteCurrency: string): FundamentalScore {
    // Get indicators for both currencies
    const baseIndicators = this.getEconomicIndicators(baseCurrency);
    const quoteIndicators = this.getEconomicIndicators(quoteCurrency);

    // Get news sentiment
    const baseNews = this.getNewsSentiment(baseCurrency);
    const quoteNews = this.getNewsSentiment(quoteCurrency);

    // Calculate individual scores
    const gdpGrowthScore = this.scoreIndicator(
      baseIndicators[0].value,
      quoteIndicators[0].value,
      2.5,
      1
    );

    const inflationScore = this.scoreIndicator(
      quoteIndicators[1].value,
      baseIndicators[1].value,
      2.0,
      0.5
    );

    const unemploymentScore = this.scoreIndicator(
      quoteIndicators[2].value,
      baseIndicators[2].value,
      3.5,
      0.3
    );

    const interestRateScore = this.scoreIndicator(
      baseIndicators[3].value,
      quoteIndicators[3].value,
      4.5,
      1
    );

    const tradeBalanceScore = this.scoreIndicator(
      baseIndicators[4].value,
      quoteIndicators[4].value,
      0,
      0.5
    );

    // Calculate average news sentiment
    const baseNewsSentiment =
      baseNews.reduce((sum, n) => sum + n.sentiment * n.relevance, 0) / baseNews.length;
    const quoteNewsSentiment =
      quoteNews.reduce((sum, n) => sum + n.sentiment * n.relevance, 0) / quoteNews.length;
    const newsSentimentScore = (baseNewsSentiment - quoteNewsSentiment) / 2;

    // Weighted average
    const overallScore =
      gdpGrowthScore * 0.2 +
      inflationScore * 0.25 +
      unemploymentScore * 0.15 +
      interestRateScore * 0.25 +
      tradeBalanceScore * 0.1 +
      newsSentimentScore * 0.05;

    // Generate recommendation
    let recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD';
    if (overallScore > 0.6) recommendation = 'STRONG_BUY';
    else if (overallScore > 0.3) recommendation = 'BUY';
    else if (overallScore < -0.6) recommendation = 'STRONG_SELL';
    else if (overallScore < -0.3) recommendation = 'SELL';

    return {
      gdpGrowth: gdpGrowthScore,
      inflationRate: inflationScore,
      unemploymentRate: unemploymentScore,
      interestRate: interestRateScore,
      tradeBalance: tradeBalanceScore,
      newsSentiment: newsSentimentScore,
      overallScore,
      recommendation,
    };
  }

  /**
   * Score an indicator relative to a target
   */
  private scoreIndicator(
    baseValue: number,
    quoteValue: number,
    target: number,
    weight: number
  ): number {
    const baseDiff = baseValue - target;
    const quoteDiff = quoteValue - target;
    const diff = baseDiff - quoteDiff;
    return Math.tanh(diff / weight) * 0.5; // Normalize to -0.5 to 0.5
  }

  /**
   * Get all economic indicators
   */
  getAllIndicators(): Map<string, EconomicIndicator[]> {
    return this.economicIndicators;
  }

  /**
   * Get all news sentiments
   */
  getAllNewsSentiments(): Map<string, NewsSentiment[]> {
    return this.newsSentiments;
  }
}
