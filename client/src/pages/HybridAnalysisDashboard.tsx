import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

export default function HybridAnalysisDashboard() {
  const [selectedPair, setSelectedPair] = useState<string>('EUR/USD');

  // Queries
  const { data: analysisData, isLoading: isAnalyzing } = trpc.analysis.analyzeHybrid.useQuery({
    symbol: selectedPair,
  });

  const { data: allAnalysesData } = trpc.analysis.analyzeAll.useQuery();
  const { data: explanationData } = trpc.analysis.getExplanation.useQuery({
    symbol: selectedPair,
  });

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY':
        return 'bg-accent text-black';
      case 'BUY':
        return 'bg-accent/70 text-black';
      case 'SELL':
        return 'bg-destructive/70 text-white';
      case 'STRONG_SELL':
        return 'bg-destructive text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.5) return '#00ff00';
    if (score > 0.2) return '#88ff00';
    if (score < -0.5) return '#ff0000';
    if (score < -0.2) return '#ff8800';
    return '#ffaa00';
  };

  // Prepare chart data for all analyses
  const chartData = allAnalysesData?.analyses?.map((a: any) => ({
    symbol: a.symbol,
    fundamental: a.fundamentalScore,
    technical: a.technicalScore,
    combined: a.combinedScore,
  })) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-accent">Hybrid Analysis Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Combine fundamental and technical analysis for comprehensive trading signals
          </p>
        </div>

        {/* Currency Pair Selector */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Select Currency Pair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'].map(
                (pair) => (
                  <Button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    variant={selectedPair === pair ? 'default' : 'outline'}
                    className={selectedPair === pair ? 'bg-accent text-black' : ''}
                  >
                    {pair}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Analysis */}
        {isAnalyzing ? (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent mr-2" />
              <span>Analyzing {selectedPair}...</span>
            </CardContent>
          </Card>
        ) : analysisData?.analysis ? (
          <>
            {/* Overall Recommendation */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Overall Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recommendation</p>
                    <p className={`text-2xl font-bold px-4 py-2 rounded inline-block ${getRecommendationColor(analysisData.analysis.recommendation)}`}>
                      {analysisData.analysis.recommendation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold text-accent">{(analysisData.analysis.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Combined Score</p>
                    <p className="text-2xl font-bold text-accent">{analysisData.analysis.combinedScore.toFixed(3)}</p>
                  </div>
                </div>

                {explanationData?.explanation && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-mono text-muted-foreground">{explanationData.explanation.reasoning}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fundamental vs Technical Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fundamental Analysis */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Fundamental Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Score</span>
                      <span className="font-mono text-accent">{analysisData.analysis.fundamental.score.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Recommendation</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getRecommendationColor(analysisData.analysis.fundamental.recommendation)}`}>
                        {analysisData.analysis.fundamental.recommendation}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-bold text-accent uppercase">Indicators</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GDP Growth</span>
                        <span className="font-mono text-accent">{analysisData.analysis.fundamental.gdpGrowth.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Inflation Rate</span>
                        <span className="font-mono text-accent">{analysisData.analysis.fundamental.inflationRate.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate</span>
                        <span className="font-mono text-accent">{analysisData.analysis.fundamental.interestRate.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">News Sentiment</span>
                        <span className="font-mono text-accent">{analysisData.analysis.fundamental.newsSentiment.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  {analysisData.analysis.fundamental.signals && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold text-accent uppercase mb-2">Key Signals</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {analysisData.analysis.fundamental.signals.slice(0, 3).map((signal: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-accent">•</span>
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Technical Analysis */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Technical Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Score</span>
                      <span className="font-mono text-accent">{analysisData.analysis.technical.score.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Recommendation</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getRecommendationColor(analysisData.analysis.technical.recommendation)}`}>
                        {analysisData.analysis.technical.recommendation}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-bold text-accent uppercase">Indicators</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSI</span>
                        <span className="font-mono text-accent">{analysisData.analysis.technical.indicators.rsi.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MACD</span>
                        <span className="font-mono text-accent">{analysisData.analysis.technical.indicators.macd.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ADX</span>
                        <span className="font-mono text-accent">{analysisData.analysis.technical.indicators.adx.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ATR</span>
                        <span className="font-mono text-accent">{analysisData.analysis.technical.indicators.atr.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>

                  {analysisData.analysis.technical.signals && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold text-accent uppercase mb-2">Key Signals</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {analysisData.analysis.technical.signals.slice(0, 3).map((signal: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-accent">•</span>
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* All Analyses Comparison */}
            {chartData.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>All Currency Pairs Analysis</CardTitle>
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
                      <Legend />
                      <Bar dataKey="fundamental" fill="#00ff00" name="Fundamental" />
                      <Bar dataKey="technical" fill="#00aaff" name="Technical" />
                      <Bar dataKey="combined" fill="#ff00ff" name="Combined" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Analysis Methodology */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Analysis Methodology</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-bold text-accent mb-2">Fundamental Analysis (40% weight)</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>GDP Growth - Economic expansion indicator</li>
                    <li>Inflation Rate - Price stability measure</li>
                    <li>Interest Rates - Monetary policy stance</li>
                    <li>Unemployment - Labor market health</li>
                    <li>Trade Balance - Export/import dynamics</li>
                    <li>News Sentiment - Market sentiment analysis</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-accent mb-2">Technical Analysis (60% weight)</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>RSI - Overbought/oversold conditions</li>
                    <li>MACD - Momentum and trend changes</li>
                    <li>Bollinger Bands - Volatility and price levels</li>
                    <li>Moving Averages - Trend direction</li>
                    <li>ADX - Trend strength</li>
                    <li>Stochastic - Price momentum</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
