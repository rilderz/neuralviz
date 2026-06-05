# Hybrid Analysis Guide - Fundamental + Technical Analysis

## Overview

The NeuralViz AI trading system now integrates both **fundamental analysis** and **technical analysis** to provide comprehensive trading signals. This hybrid approach combines:

- **Fundamental Analysis (40% weight)**: Long-term economic trends and macroeconomic factors
- **Technical Analysis (60% weight)**: Price action, momentum, and chart patterns

## Fundamental Analysis Components

### Economic Indicators

1. **GDP Growth** - Measures economic expansion
   - Higher growth supports currency strength
   - Lower growth pressures currency

2. **Inflation Rate** - Price stability measure
   - High inflation may trigger rate hikes
   - Low inflation supports dovish policy

3. **Interest Rates** - Monetary policy stance
   - Higher rates attract foreign capital
   - Lower rates reduce currency appeal

4. **Unemployment Rate** - Labor market health
   - Low unemployment supports economic strength
   - High unemployment indicates weakness

5. **Trade Balance** - Export/import dynamics
   - Trade surplus strengthens currency
   - Trade deficit weakens currency

### News Sentiment

- Real-time analysis of economic news
- Sentiment scoring from -1 (very negative) to +1 (very positive)
- Relevance weighting for market impact

## Technical Analysis Components

### Price-Based Indicators

1. **RSI (Relative Strength Index)**
   - Overbought > 70
   - Oversold < 30
   - Neutral: 30-70

2. **MACD (Moving Average Convergence Divergence)**
   - Positive MACD: Bullish momentum
   - Negative MACD: Bearish momentum
   - Crossovers indicate trend changes

3. **Bollinger Bands**
   - Upper band: Resistance
   - Lower band: Support
   - Position indicator: 0-1 scale

4. **Moving Averages**
   - SMA 20/50: Short-term trends
   - EMA 12/26: Responsive to recent price action
   - Golden Cross: SMA50 > SMA200 (bullish)

### Trend & Volatility Indicators

1. **ADX (Average Directional Index)**
   - ADX > 60: Very strong trend
   - ADX 25-60: Strong trend
   - ADX < 20: Weak trend/consolidation

2. **ATR (Average True Range)**
   - Measures volatility
   - Higher ATR: More volatile
   - Lower ATR: Less volatile

3. **Stochastic Oscillator**
   - K > 80: Overbought
   - K < 20: Oversold
   - K/D crossovers: Signal changes

## Hybrid Analysis Signals

### Signal Generation

The system combines scores from both analyses:

```
Combined Score = (Technical Score × 0.6) + (Fundamental Score × 0.4)
```

### Recommendation Levels

| Score | Recommendation |
|-------|-----------------|
| > 0.6 | STRONG BUY |
| 0.3 - 0.6 | BUY |
| -0.3 - 0.3 | HOLD |
| -0.6 - -0.3 | SELL |
| < -0.6 | STRONG SELL |

### Confidence Calculation

Confidence is based on:
- Agreement between fundamental and technical signals
- Magnitude of the combined score
- Range: 0% to 100%

Higher confidence indicates stronger convergence between both analysis types.

## Usage Examples

### Example 1: Strong Buy Signal

**Scenario**: EUR/USD shows:
- **Fundamental**: EU GDP growth accelerating, ECB hawkish signals (+0.65)
- **Technical**: Breakout above resistance, RSI 65, MACD positive (+0.70)
- **Combined Score**: 0.68 → **STRONG BUY**
- **Confidence**: 95%

**Action**: Enter long position with full position size

### Example 2: Conflicting Signals

**Scenario**: GBP/USD shows:
- **Fundamental**: UK inflation concerns, dovish BoE (-0.50)
- **Technical**: Strong uptrend, RSI 75, but at resistance (+0.55)
- **Combined Score**: 0.08 → **HOLD**
- **Confidence**: 45%

**Action**: Wait for clearer signal or reduce position size

### Example 3: Strong Sell Signal

**Scenario**: USD/JPY shows:
- **Fundamental**: US recession fears, Fed rate cuts expected (-0.70)
- **Technical**: Breakdown below support, RSI 25, MACD negative (-0.65)
- **Combined Score**: -0.67 → **STRONG SELL**
- **Confidence**: 92%

**Action**: Enter short position with full position size

## Best Practices

### 1. Convergence Confirmation
- Wait for both fundamental and technical signals to align
- Stronger signals when both point in same direction
- Be cautious with diverging signals

### 2. Timeframe Alignment
- Fundamental analysis: Medium to long-term (days to weeks)
- Technical analysis: Short to medium-term (hours to days)
- Use technical for entry timing, fundamental for direction

### 3. Risk Management
- Use confidence level to adjust position size
- Higher confidence → Larger position
- Lower confidence → Smaller position or wait

### 4. News Events
- Monitor economic calendar for major releases
- Fundamental scores update with new data
- Be ready for volatility spikes

### 5. Market Conditions
- Trending markets: Technical analysis more reliable
- Ranging markets: Fundamental analysis more important
- Volatile markets: Use wider stops

## API Endpoints

### Hybrid Analysis
```
POST /api/trpc/analysis.analyzeHybrid
Input: { symbol: "EUR/USD" }
Output: Complete hybrid analysis with scores and signals
```

### Fundamental Analysis Only
```
POST /api/trpc/analysis.analyzeFundamental
Input: { baseCurrency: "EUR", quoteCurrency: "USD" }
Output: Fundamental scores and economic indicators
```

### Technical Analysis Only
```
POST /api/trpc/analysis.analyzeTechnical
Input: { symbol: "EUR/USD" }
Output: Technical indicators and chart patterns
```

### Analyze All Pairs
```
POST /api/trpc/analysis.analyzeAll
Output: Analysis for all 10+ supported currency pairs
```

### Get Explanation
```
POST /api/trpc/analysis.getExplanation
Input: { symbol: "EUR/USD" }
Output: Detailed reasoning for the recommendation
```

## Supported Currency Pairs

- EUR/USD - Euro vs US Dollar
- GBP/USD - British Pound vs US Dollar
- USD/JPY - US Dollar vs Japanese Yen
- USD/CHF - US Dollar vs Swiss Franc
- AUD/USD - Australian Dollar vs US Dollar
- USD/CAD - US Dollar vs Canadian Dollar
- NZD/USD - New Zealand Dollar vs US Dollar
- EUR/GBP - Euro vs British Pound
- EUR/JPY - Euro vs Japanese Yen
- GBP/JPY - British Pound vs Japanese Yen

## Performance Metrics

Track these metrics to evaluate analysis effectiveness:

- **Win Rate**: % of trades that are profitable
- **Sharpe Ratio**: Risk-adjusted returns
- **Profit Factor**: Gross profit / Gross loss
- **Max Drawdown**: Largest peak-to-trough decline
- **Average Trade Duration**: Time in winning vs losing trades

## Continuous Improvement

The hybrid analysis system learns from:
1. Backtesting results
2. Live trading performance
3. Economic data updates
4. Market regime changes
5. Correlation shifts between pairs

Monitor these metrics and adjust weights/thresholds as needed.
