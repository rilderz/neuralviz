# NeuralViz Trading Strategy - Production Grade

## 1. STRATEGY DEFINITION

### Trading Style: Day Trading + Scalping
- **Timeframe**: 5-minute and 15-minute candles
- **Markets**: Forex (EUR/USD, GBP/USD, USD/JPY)
- **Session**: London/New York overlap (high liquidity)
- **Holding Period**: 15 minutes to 4 hours

### Core Approach
**Simple, Proven Model**: XGBoost classifier
- NOT deep learning (overfitting risk)
- NOT overly complex (harder to debug)
- Proven in production trading systems
- Fast inference (critical for day trading)

---

## 2. DATA REQUIREMENTS

### Historical Data Needed
- **Minimum**: 2 years of OHLCV data (5-min and 15-min candles)
- **Quality**: No gaps, accurate timestamps, verified against multiple sources
- **Frequency**: Every 5 minutes (intraday)
- **Volume**: Essential for liquidity filtering

### Data Validation Checklist
- [ ] No missing candles
- [ ] No duplicate timestamps
- [ ] Volume > 0 for all candles
- [ ] High >= Low, Close within High/Low range
- [ ] Spread reasonable (not data errors)

### Sources
- Alpha Vantage (free tier: limited)
- Finnhub (good for forex)
- OANDA (broker data, most reliable)
- Exness (if connected)

---

## 3. FEATURE ENGINEERING (THE REAL EDGE)

### Price Action Features
```
1. Returns (log returns over 1, 5, 15 candles)
2. Volatility (rolling std dev, 20-period)
3. High-Low range (% of close)
4. Close-Open range (% of close)
```

### Momentum Indicators
```
1. RSI (14-period)
2. MACD (12, 26, 9)
3. Stochastic %K, %D (14-period)
4. Rate of Change (12-period)
```

### Trend Indicators
```
1. SMA (20, 50, 200 period)
2. EMA (12, 26 period)
3. ADX (14-period) - trend strength
4. Slope of moving averages
```

### Volatility Indicators
```
1. Bollinger Bands (20-period, 2 std dev)
2. ATR (14-period)
3. Historical volatility (20-period)
4. Bollinger Band width
```

### Support/Resistance
```
1. Pivot points (daily)
2. Recent swing highs/lows
3. Distance to nearest support/resistance
4. Bounce probability from S/R
```

### Volume Features
```
1. Volume (raw)
2. Volume SMA (20-period)
3. Volume ratio (current / SMA)
4. On-Balance Volume (OBV)
```

**Total Features**: ~30-40 engineered features

---

## 4. MODEL ARCHITECTURE

### Model: XGBoost Classifier
```
Input: 30-40 features
Output: 3 classes (BUY=1, HOLD=0, SELL=-1)
Hyperparameters:
  - max_depth: 6-8 (prevent overfitting)
  - learning_rate: 0.05-0.1
  - n_estimators: 100-200
  - subsample: 0.8 (random sampling)
  - colsample_bytree: 0.8
```

### Why XGBoost?
✅ Fast training and inference
✅ Handles non-linear relationships
✅ Built-in feature importance
✅ Resistant to overfitting (with proper tuning)
✅ Works well with mixed feature types
❌ NOT a black box (interpretable)

### Prediction Output
- **Confidence Score**: 0-1 (probability of predicted class)
- **Only trade if confidence > 0.65**
- **Ignore signals with confidence 0.45-0.55** (uncertain)

---

## 5. DATA SPLIT STRATEGY

### Training/Testing Split (CRITICAL)
```
Timeline: 2 years of data

Year 1 (Jan-Dec):     TRAINING
Year 1 Q4 + Year 2 Q1: VALIDATION
Year 2 (Feb-Dec):     TEST (unseen)
```

### Walk-Forward Validation
```
Week 1-48: Train on weeks 1-40, Test on weeks 41-48
Week 2-49: Train on weeks 2-41, Test on weeks 42-49
... repeat monthly
```

**Why Walk-Forward?**
- Simulates real trading (always trading on unseen data)
- Catches overfitting early
- Adapts to market regime changes
- More realistic performance estimate

---

## 6. RISK MANAGEMENT (MOST IMPORTANT)

### Position Sizing
```
Risk per trade: 1-2% of account
Stop loss: 50 pips (0.5%)
Position size = Account * Risk% / Stop Loss (pips)

Example:
Account: $20,000
Risk: 1% = $200
Stop loss: 50 pips
Position: $200 / 50 = 4 micro lots
```

### Entry Rules
```
1. Signal from model (confidence > 0.65)
2. Price NOT at daily high/low (avoid reversal risk)
3. Volume > 20-period average
4. No major news events in next 30 minutes
5. Max 5 trades per hour (avoid overtrading)
```

### Exit Rules
```
1. Stop Loss: 50 pips below entry
2. Take Profit: 100 pips above entry (2:1 ratio)
3. Time Stop: Close after 4 hours (if no TP/SL hit)
4. Trailing Stop: After 30 pips profit, move SL to breakeven
```

### Daily Limits
```
1. Max 10 trades per day
2. Max 3 consecutive losses (stop trading)
3. Max 5% daily drawdown (stop trading)
4. Max 2% loss per trade
```

### Account Protection
```
1. Max 20% monthly drawdown (pause trading)
2. Max 50% annual drawdown (review strategy)
3. Weekly P&L review
4. Monthly strategy audit
```

---

## 7. AVOIDING OVERFITTING

### Red Flags
```
❌ 95% accuracy in backtest, 50% in live trading
❌ Model performs great on training, poor on test
❌ Too many features (>50)
❌ Too deep model (XGBoost depth > 10)
❌ Testing on same data used for training
```

### Prevention
```
✅ Use walk-forward validation
✅ Limit features to 30-40
✅ Limit model complexity
✅ Test on completely unseen data
✅ Monitor live performance vs backtest
✅ Retrain model monthly
```

---

## 8. PERFORMANCE METRICS

### Key Metrics to Track
```
1. Win Rate: % of profitable trades (target: 55-60%)
2. Profit Factor: Gross Profit / Gross Loss (target: 1.5+)
3. Sharpe Ratio: Risk-adjusted returns (target: 1.0+)
4. Max Drawdown: Peak-to-trough decline (target: <15%)
5. Average Trade Duration: Time in market
6. Average Win/Loss: Profit per winning/losing trade
7. Risk/Reward Ratio: Avg Win / Avg Loss (target: 2:1)
```

### Acceptable Performance
```
Win Rate:        55-65%
Profit Factor:   1.5-3.0
Sharpe Ratio:    1.0-2.0
Max Drawdown:    10-20%
Monthly Return:  3-8%
```

---

## 9. EXECUTION CHECKLIST

### Before Going Live
- [ ] Backtest on 2+ years of data
- [ ] Walk-forward validation passed
- [ ] Paper trade for 2 weeks (track metrics)
- [ ] Live trade with 1 micro lot first
- [ ] Monitor daily for 2 weeks
- [ ] Scale up to 2-3 micro lots
- [ ] Document all trades and reasons

### During Live Trading
- [ ] Check model predictions before market open
- [ ] Monitor first 30 minutes (highest volatility)
- [ ] Track actual vs predicted performance
- [ ] Adjust stops if needed (never move against you)
- [ ] Close all trades before end of day (day trading)
- [ ] Log all trades for analysis

### Weekly Review
- [ ] Win rate vs target
- [ ] Profit factor vs target
- [ ] Drawdown vs limit
- [ ] Feature importance changes
- [ ] Market regime changes
- [ ] Adjust strategy if needed

### Monthly Review
- [ ] Retrain model on latest data
- [ ] Walk-forward validation on new data
- [ ] Update feature engineering if needed
- [ ] Compare live vs backtest performance
- [ ] Adjust hyperparameters if needed
- [ ] Document lessons learned

---

## 10. REALISTIC EXPECTATIONS

### Monthly Returns (Conservative)
```
Good month:  3-5% return
Average:     2-3% return
Bad month:   -1% to +1% return
```

### Annual Returns
```
Conservative: 20-30% (with compounding)
Realistic:    15-25%
Target:       25%+
```

### Drawdown
```
Expected:     10-15% max drawdown
Acceptable:   <20%
Unacceptable: >30%
```

### Win Rate
```
Target:       55-60%
Minimum:      50%
Unacceptable: <45%
```

---

## 11. WHAT CAN GO WRONG

### Market Changes
- Strategy works great, then stops working
- Market regime changes (trending → ranging)
- Correlations break down
- Volatility spikes unexpectedly

### Model Issues
- Overfitting (looks good, fails live)
- Data quality problems (gaps, errors)
- Features become irrelevant
- Model drift over time

### Execution Issues
- Slippage (actual price different from expected)
- Commissions eating profits
- Latency (delays in execution)
- Broker issues (requotes, rejections)

### Behavioral Issues
- Overtrading (ignoring rules)
- Revenge trading (after losses)
- Not following stop losses
- Changing strategy mid-trade

---

## 12. MONITORING & ADAPTATION

### Daily Checks
```
1. Model confidence scores
2. Trade win/loss ratio
3. Drawdown vs limit
4. Feature importance changes
```

### Weekly Checks
```
1. Performance vs backtest
2. Market regime (trending/ranging)
3. Volatility levels
4. News impact on trades
```

### Monthly Checks
```
1. Retrain model
2. Walk-forward validation
3. Feature engineering review
4. Hyperparameter tuning
5. Strategy audit
```

### Quarterly Checks
```
1. Full strategy review
2. Market environment analysis
3. Competitor/market changes
4. Risk management audit
5. Plan adjustments
```

---

## SUMMARY

**This is NOT "set and forget" AI.**

✅ Clear strategy (day trading, 5-15min, forex)
✅ Good data (2+ years, validated)
✅ Smart features (30-40 engineered features)
✅ Simple model (XGBoost, not deep learning)
✅ Rigorous testing (walk-forward validation)
✅ Strict risk management (1-2% per trade)
✅ Paper trading first (2 weeks minimum)
✅ Continuous monitoring (daily/weekly/monthly)
✅ Realistic expectations (20-30% annual)

**This approach has the best chance of success.**
