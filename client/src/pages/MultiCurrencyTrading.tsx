import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

export default function MultiCurrencyTrading() {
  const [isTraining, setIsTraining] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [trainingStarted, setTrainingStarted] = useState(false);

  // Queries with polling during training
  const { data: pairsData } = trpc.multiCurrency.getSupportedPairs.useQuery();
  const { data: signalsData, refetch: refetchSignals } = trpc.multiCurrency.generateAllSignals.useQuery();
  const { data: progressData, refetch: refetchProgress } = trpc.multiCurrency.getTrainingProgress.useQuery(
    undefined,
    { refetchInterval: isTraining ? 500 : false }
  );
  const { data: statsData, refetch: refetchStats } = trpc.multiCurrency.getModelStats.useQuery(
    undefined,
    { refetchInterval: isTraining ? 1000 : false }
  );
  const utils = trpc.useUtils();

  // Mutations
  const trainAllMutation = trpc.multiCurrency.trainAllModels.useMutation();
  const trainModelMutation = trpc.multiCurrency.trainModel.useMutation();

  // Handle train all
  const handleTrainAll = async () => {
    setIsTraining(true);
    try {
      const result = await trainAllMutation.mutateAsync({
        epochs: 100,
        learningRate: 0.01,
      });

      if (result.success) {
        alert(`Trained ${result.trained} models successfully!`);
        // Invalidate and refetch all queries
        await utils.multiCurrency.getTrainingProgress.invalidate();
        await utils.multiCurrency.getModelStats.invalidate();
        await refetchSignals();
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Training failed'}`);
    } finally {
      setIsTraining(false);
    }
  };

  // Handle train single
  const handleTrainSingle = async (symbol: string) => {
    try {
      const result = await trainModelMutation.mutateAsync({
        symbol,
        epochs: 100,
        learningRate: 0.01,
      });

      if (result.success) {
        alert(`Model for ${symbol} trained successfully!`);
        // Invalidate and refetch all queries
        await utils.multiCurrency.getTrainingProgress.invalidate();
        await utils.multiCurrency.getModelStats.invalidate();
        await refetchSignals();
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Training failed'}`);
    }
  };

  // Stop polling when training completes
  useEffect(() => {
    if (!isTraining) {
      // Final refresh when training stops
      refetchProgress();
      refetchStats();
    }
  }, [isTraining, refetchProgress, refetchStats]);

  // Prepare chart data
  const chartData = signalsData?.portfolio?.signals?.map(signal => ({
    symbol: signal.symbol,
    rsi: signal.rsi,
    confidence: signal.confidence * 100,
    signal: signal.signal === 'BUY' ? 1 : signal.signal === 'SELL' ? -1 : 0,
  })) || [];

  const signalColors = {
    BUY: '#00ff00',
    SELL: '#ff0000',
    HOLD: '#ffaa00',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-accent">Multi-Currency Trading</h1>
          <p className="text-sm text-muted-foreground">
            Trade 10+ forex pairs with AI signals
          </p>
        </div>

        {/* Stats */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Trained Models</p>
                <p className="text-2xl font-bold text-accent">{statsData.trainedModels}/{statsData.totalPairs}</p>
                <p className="text-xs text-muted-foreground mt-2">{statsData.trainingPercentage}% complete</p>
              </CardContent>
            </Card>

            {signalsData?.portfolio && (
              <>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Buy Signals</p>
                    <p className="text-2xl font-bold text-accent">{signalsData.portfolio.buySignals}</p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Sell Signals</p>
                    <p className="text-2xl font-bold text-destructive">{signalsData.portfolio.sellSignals}</p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Recommendation</p>
                    <p className="text-lg font-bold text-accent uppercase">{signalsData.portfolio.recommendedAction}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Training Controls */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Model Training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTrainAll}
              disabled={isTraining}
              className="w-full bg-accent text-accent-foreground hover:shadow-lg"
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Training All Models...
                </>
              ) : (
                'Train All Currency Pairs'
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              This will train LSTM models for all 10+ supported forex pairs. Takes 2-5 minutes.
            </p>
          </CardContent>
        </Card>

        {/* Signals Chart */}
        {chartData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Trading Signals Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="symbol" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00ff00' }}
                    labelStyle={{ color: '#00ff00' }}
                  />
                  <Bar dataKey="confidence" fill="#00ff00" name="Confidence %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Currency Pairs Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-accent">Currency Pairs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairsData?.pairs?.map((pair: any) => {
              const signal = signalsData?.portfolio?.signals?.find(s => s.symbol === pair.symbol);
              const isTrained = signal !== undefined;

              return (
                <Card
                  key={pair.symbol}
                  className={`border-border bg-card cursor-pointer transition-all ${
                    selectedPair === pair.symbol ? 'ring-2 ring-accent' : ''
                  }`}
                  onClick={() => setSelectedPair(pair.symbol)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="font-mono text-sm">{pair.symbol}</span>
                      {signal && (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            signal.signal === 'BUY'
                              ? 'bg-accent text-black'
                              : signal.signal === 'SELL'
                              ? 'bg-destructive text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {signal.signal}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{pair.description}</p>

                    {signal ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-mono text-accent">{signal.predictedPrice.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">RSI</span>
                            <span className="font-mono text-accent">{signal.rsi.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-mono text-accent">{(signal.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">MACD</span>
                            <span className="font-mono text-accent">{signal.macd.toFixed(6)}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleTrainSingle(pair.symbol)}
                          size="sm"
                          className="w-full bg-accent/20 text-accent hover:bg-accent/30"
                        >
                          Retrain
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleTrainSingle(pair.symbol)}
                        size="sm"
                        className="w-full bg-accent text-accent-foreground"
                      >
                        Train Model
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Signals Table */}
        {signalsData?.portfolio?.signals && signalsData.portfolio.signals.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>All Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground">Symbol</th>
                      <th className="text-left py-2 px-2 text-muted-foreground">Signal</th>
                      <th className="text-left py-2 px-2 text-muted-foreground">Confidence</th>
                      <th className="text-left py-2 px-2 text-muted-foreground">Price</th>
                      <th className="text-left py-2 px-2 text-muted-foreground">RSI</th>
                      <th className="text-left py-2 px-2 text-muted-foreground">MACD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalsData.portfolio.signals.map((signal: any) => (
                      <tr key={signal.symbol} className="border-b border-border hover:bg-background/50">
                        <td className="py-2 px-2 font-mono text-accent">{signal.symbol}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              signal.signal === 'BUY'
                                ? 'bg-accent text-black'
                                : signal.signal === 'SELL'
                                ? 'bg-destructive text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {signal.signal}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-accent">{(signal.confidence * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2 font-mono text-accent">{signal.predictedPrice.toFixed(6)}</td>
                        <td className="py-2 px-2 font-mono text-accent">{signal.rsi.toFixed(1)}</td>
                        <td className="py-2 px-2 font-mono text-accent">{signal.macd.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Supported Currency Pairs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>NeuralViz supports trading on 10+ forex pairs with individual LSTM models:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>EUR/USD - Euro vs US Dollar</li>
              <li>GBP/USD - British Pound vs US Dollar</li>
              <li>USD/JPY - US Dollar vs Japanese Yen</li>
              <li>USD/CHF - US Dollar vs Swiss Franc</li>
              <li>AUD/USD - Australian Dollar vs US Dollar</li>
              <li>USD/CAD - US Dollar vs Canadian Dollar</li>
              <li>NZD/USD - New Zealand Dollar vs US Dollar</li>
              <li>EUR/GBP - Euro vs British Pound</li>
              <li>EUR/JPY - Euro vs Japanese Yen</li>
              <li>GBP/JPY - British Pound vs Japanese Yen</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
