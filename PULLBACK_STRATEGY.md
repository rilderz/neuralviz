# Buy Pullbacks in Uptrend Strategy

## Strategy Definition

**ONE IDEA:** Buy pullbacks in uptrend (simple, proven, testable)

### Clear Rules (No Guessing)

#### Rule 1: Identify Uptrend
```
Trend = Price > MA200
Confirmation = Price > MA50 AND MA50 > MA200
```

#### Rule 2: Identify Pullback
```
Pullback = RSI < 40 (oversold in uptrend)
Duration = Pullback must last at least 2 candles
Depth = Price must retrace at least 2% from recent high
```

#### Rule 3: Entry Signal
```
BUY when:
1. Price > MA200 (uptrend confirmed)
2. RSI was < 40 (pullback occurred)
3. RSI crosses back above 40 (recovery signal)
4. Volume > 20-day average (confirmation)
```

#### Rule 4: Stop Loss
```
Stop Loss = 2% below entry price
Hard stop - NEVER move it lower
```

#### Rule 5: Take Profit
```
Take Profit = 3% above entry price
Risk/Reward = 1:1.5 (acceptable)
```

#### Rule 6: Time Filters
```
Only trade 1H and 15M timeframes
Avoid trading during news events
Max 5 trades per day (discipline)
```

---

## Backtesting Requirements

### Minimum Sample Size
- **100+ trades** on real historical data
- **At least 1 year** of price data
- **Multiple currency pairs** (EUR/USD, GBP/USD, USD/JPY)

### Realistic Costs
- **Spread:** 2 pips (typical for forex)
- **Slippage:** 1 pip (entry/exit)
- **Commission:** 0.01% per trade
- **Total cost per trade:** ~3 pips

### Success Metrics

#### Win Rate
- Target: 55-60% (realistic)
- Minimum acceptable: 50%

#### Profit Factor
- Formula: (Gross Profit) / (Gross Loss)
- Target: 1.5+ (for every $1 lost, make $1.50)
- Minimum acceptable: 1.2

#### Sharpe Ratio
- Target: 1.0+ (good risk-adjusted returns)
- Measures consistency

#### Maximum Drawdown
- Target: < 20% of starting capital
- Hard limit: 25%

#### Average Trade
- Win: +3% (take profit)
- Loss: -2% (stop loss)
- Expected value = (0.55 × 3%) - (0.45 × 2%) = +0.95% per trade

---

## Improvement Cycle

### Phase 1: Baseline Testing (Current)
- Test basic rules on historical data
- Measure win rate, profit factor, Sharpe
- Document all metrics

### Phase 2: Filter Bad Trades
- Add time filters (avoid certain hours)
- Add volume filters (require above-average volume)
- Add volatility filters (avoid extreme volatility)

### Phase 3: Optimize Entry
- Test RSI threshold (35, 40, 45)
- Test MA period (150, 200, 250)
- Test pullback depth (1%, 2%, 3%)

### Phase 4: Optimize Exit
- Test take profit levels (2%, 3%, 4%)
- Test trailing stops (instead of fixed TP)
- Test partial profit-taking

---

## Discipline Rules (CRITICAL)

### Live Trading Rules
1. **Never skip stop loss** - Always set it
2. **Never move stop loss lower** - Only close trade
3. **Never add to losing trades** - Accept loss
4. **Never revenge trade** - Wait for next setup
5. **Max 5 trades per day** - Enforce discipline
6. **Max 20% daily loss** - Stop trading for the day
7. **No strategy changes mid-month** - Test first

### Performance Monitoring
- Track every trade (entry, exit, reason, P&L)
- Weekly review (what worked, what didn't)
- Monthly review (overall performance)
- Quarterly review (strategy adjustments)

---

## Expected Results

### Conservative Estimate
- Win Rate: 55%
- Avg Win: +3%
- Avg Loss: -2%
- Expected Return: +0.95% per trade
- Trades per month: 60-80
- Monthly Return: 57-76%
- **Annual Return: 20-30%** (realistic)

### Risk Metrics
- Max Drawdown: 15-20%
- Sharpe Ratio: 1.0-1.5
- Profit Factor: 1.5-2.0

---

## Why This Works

1. **Simple** - Easy to understand and execute
2. **Proven** - Pullback trading is used by professionals
3. **Testable** - Clear rules, measurable results
4. **Disciplined** - Hard stops prevent catastrophic losses
5. **Realistic** - Doesn't expect 100% win rate or instant riches

---

## Why Most People Fail

1. **Change strategy too fast** - Test properly first
2. **Chase new indicators** - Stick to one strategy
3. **Don't test properly** - Need 100+ trades
4. **Expect quick profit** - Takes time to compound
5. **Ignore discipline** - Skip stops, add to losers, revenge trade
6. **Optimize too much** - Curve-fitting kills real performance

---

## Next Steps

1. ✅ Define strategy rules (DONE)
2. ⏳ Implement backtester with realistic costs
3. ⏳ Run 100+ trade backtest
4. ⏳ Measure edge (win rate, profit factor)
5. ⏳ Make slight improvements
6. ⏳ Create backtest dashboard
7. ⏳ Deploy to live trading (paper first)
