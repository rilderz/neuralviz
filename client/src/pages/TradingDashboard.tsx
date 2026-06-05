import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

export default function TradingDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const [isTraining, setIsTraining] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Fetch available symbols
  const { data: symbols } = trpc.trading.getAvailableSymbols.useQuery();

  // Fetch live signals
  const { data: signals, refetch: refetchSignals } = trpc.trading.getLiveSignals.useQuery(
    { symbol: selectedSymbol },
    { refetchInterval: 5000 }
  );

  // Fetch model metrics
  const { data: metrics } = trpc.trading.getModelMetrics.useQuery({ modelId: 1 });

  // Fetch trading history
  const { data: tradingHistory } = trpc.trading.getTradingHistory.useQuery({
    modelId: 1,
    limit: 20,
  });

  // Train model mutation
  const trainModel = trpc.trading.trainModel.useMutation({
    onSuccess: () => {
      setIsTraining(false);
    },
  });

  // Backtest mutation
  const runBacktest = trpc.trading.runBacktest.useMutation({
    onSuccess: () => {
      setIsBacktesting(false);
    },
  });

  const handleTrainModel = async () => {
    setIsTraining(true);
    await trainModel.mutateAsync({
      symbol: selectedSymbol,
      epochs: 100,
      learningRate: 0.001,
    });
  };

  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    await runBacktest.mutateAsync({
      modelId: 1,
      symbol: selectedSymbol,
      startDate,
      endDate,
      initialCapital: 20000,
    });
  };

  // Prepare equity curve data
  const equityCurveData = runBacktest.data?.result?.equityCurve?.map((value, index) => ({
    time: index,
    equity: value,
  })) || [];

  // Prepare trading history chart data
  const tradesChartData = tradingHistory?.map((trade, index) => ({
    trade: index + 1,
    profitLoss: trade.profitLoss,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-accent">AI Trading System</h1>
          <p className="text-muted-foreground">
            LSTM-based forex trading with real-time signals and backtesting
          </p>
        </div>

        {/* Symbol Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Symbols</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {symbols?.map((sym) => (
                <Button
                  key={sym.symbol}
                  variant={selectedSymbol === sym.symbol ? 'default' : 'outline'}
                  onClick={() => setSelectedSymbol(sym.symbol)}
                  className="text-sm"
                >
                  {sym.symbol}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Signals */}
        <Card className="border-accent">
          <CardHeader>
            <CardTitle className="text-accent">Live Trading Signal - {selectedSymbol}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold text-accent">
                  {signals?.currentPrice?.toFixed(6) || 'N/A'}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Signal</p>
                <p
                  className={`text-2xl font-bold ${
                    signals?.signal === 'BUY'
                      ? 'text-green-500'
                      : signals?.signal === 'SELL'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                >
                  {signals?.signal || 'HOLD'}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold text-accent">{signals?.confidence}%</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Predicted Price</p>
                <p className="text-2xl font-bold text-accent">
                  {signals?.predictedPrice || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Training & Backtesting */}
        <Card>
          <CardHeader>
            <CardTitle>Model Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="bg-accent text-accent-foreground hover:shadow-lg"
              >
                {isTraining ? 'Training...' : 'Train LSTM Model'}
              </Button>
              <Button
                onClick={handleRunBacktest}
                disabled={isBacktesting}
                className="bg-accent text-accent-foreground hover:shadow-lg"
              >
                {isBacktesting ? 'Backtesting...' : 'Run Backtest (1 Year)'}
              </Button>
            </div>

            {/* Training Results */}
            {trainModel.data && (
              <div className="mt-4 p-4 bg-card border border-border rounded-lg">
                <p className="text-sm font-mono text-accent">{trainModel.data.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Model Metrics</TabsTrigger>
            <TabsTrigger value="backtest">Backtest Results</TabsTrigger>
            <TabsTrigger value="trades">Trade History</TabsTrigger>
          </TabsList>

          {/* Model Metrics Tab */}
          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                      <p className="text-3xl font-bold text-accent">
                        {(metrics.accuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-3xl font-bold text-green-500">
                        {(metrics.winRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Profit Factor</p>
                      <p className="text-3xl font-bold text-accent">{metrics.profitFactor.toFixed(2)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total Trades</p>
                      <p className="text-3xl font-bold text-accent">{metrics.totalTrades}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Avg Win</p>
                      <p className="text-3xl font-bold text-green-500">${metrics.avgWin.toFixed(2)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Avg Loss</p>
                      <p className="text-3xl font-bold text-red-500">-${metrics.avgLoss.toFixed(2)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-3xl font-bold text-red-500">{metrics.maxDrawdown.toFixed(1)}%</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-3xl font-bold text-accent">{metrics.sharpeRatio.toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No metrics available. Train a model first.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backtest Results Tab */}
          <TabsContent value="backtest">
            <Card>
              <CardHeader>
                <CardTitle>Backtest Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {runBacktest.data?.result ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-card border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Trades</p>
                        <p className="text-2xl font-bold text-accent">
                          {runBacktest.data.result.totalTrades}
                        </p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="text-2xl font-bold text-green-500">
                          {runBacktest.data.result.winRate}%
                        </p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Return</p>
                        <p className="text-2xl font-bold text-accent">
                          {runBacktest.data.result.totalReturn}%
                        </p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Profit Factor</p>
                        <p className="text-2xl font-bold text-accent">
                          {runBacktest.data.result.profitFactor}
                        </p>
                      </div>
                    </div>

                    {/* Equity Curve Chart */}
                    {equityCurveData.length > 0 && (
                      <div className="mt-6 bg-card border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-accent mb-4">Equity Curve</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={equityCurveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="time" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00ffff' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="equity"
                              stroke="#00ffff"
                              dot={false}
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No backtest results. Run a backtest first.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade History Tab */}
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {tradesChartData.length > 0 ? (
                  <>
                    <div className="bg-card border border-border rounded-lg p-4 mb-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tradesChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="trade" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00ffff' }}
                          />
                          <Bar dataKey="profitLoss" fill="#00ffff" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Trade Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-mono">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 text-accent">Side</th>
                            <th className="text-left p-2 text-accent">Entry</th>
                            <th className="text-left p-2 text-accent">Exit</th>
                            <th className="text-left p-2 text-accent">P&L</th>
                            <th className="text-left p-2 text-accent">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tradingHistory?.slice(0, 10).map((trade, idx) => (
                            <tr key={idx} className="border-b border-border hover:bg-card/50">
                              <td className="p-2">
                                <span
                                  className={
                                    trade.side === 'BUY'
                                      ? 'text-green-500 font-bold'
                                      : 'text-red-500 font-bold'
                                  }
                                >
                                  {trade.side}
                                </span>
                              </td>
                              <td className="p-2">{trade.entryPrice.toFixed(6)}</td>
                              <td className="p-2">{trade.exitPrice?.toFixed(6) || 'N/A'}</td>
                              <td
                                className={`p-2 font-bold ${
                                  (trade.profitLoss || 0) > 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                ${trade.profitLoss?.toFixed(2) || 'N/A'}
                              </td>
                              <td
                                className={`p-2 ${
                                  (trade.profitLossPercent || 0) > 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                {trade.profitLossPercent?.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No trades yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
