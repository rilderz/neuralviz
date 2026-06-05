import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, XCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ExnessTrading() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [isConnecting, setIsConnecting] = useState(false);

  // tRPC mutations and queries
  const connectMutation = trpc.broker.connectExness.useMutation();
  const disconnectMutation = trpc.broker.disconnect.useMutation();
  const { data: accountData, refetch: refetchAccount } = trpc.broker.getAccount.useQuery();
  const { data: positionsData, refetch: refetchPositions } = trpc.broker.getPositions.useQuery();
  const { data: statsData, refetch: refetchStats } = trpc.broker.getTradeStats.useQuery();
  const { data: statusData } = trpc.broker.getStatus.useQuery();

  // Handle connection
  const handleConnect = async () => {
    if (!login || !password) {
      alert('Please enter login and password');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await connectMutation.mutateAsync({
        login,
        password,
        accountType,
      });

      if (result.success) {
        alert(result.message);
        refetchAccount();
        refetchPositions();
        refetchStats();
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Connection failed'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      const result = await disconnectMutation.mutateAsync();
      if (result.success) {
        alert(result.message);
        setLogin('');
        setPassword('');
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Disconnect failed'}`);
    }
  };

  const isConnected = statusData?.connected || false;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-accent">Exness Trading Integration</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Exness MetaTrader 5 account for real money trading
          </p>
        </div>

        {/* Connection Status */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="w-5 h-5 text-accent" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Disconnected
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Account:</span>{' '}
                  <span className="font-mono text-accent">{statusData?.account}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="font-mono text-accent">{statusData?.accountType}</span>
                </p>
              </div>
            ) : null}

            {!isConnected ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input
                    id="login"
                    type="text"
                    placeholder="Enter your Exness login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your Exness password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="real">Real (Live Trading)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-accent text-accent-foreground hover:shadow-lg"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect to Exness'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleDisconnect}
                className="w-full bg-destructive text-destructive-foreground hover:shadow-lg"
              >
                Disconnect
              </Button>
            )}
          </CardContent>
        </Card>

        {isConnected && (
          <>
            {/* Account Summary */}
            {accountData?.connected && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-mono text-accent">${accountData.balance?.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Equity</p>
                      <p className="text-lg font-mono text-accent">${accountData.equity?.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Profit/Loss</p>
                      <p className={`text-lg font-mono ${accountData.profit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        ${accountData.profit?.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Margin Level</p>
                      <p className="text-lg font-mono text-accent">{accountData.marginLevel?.toFixed(0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open Positions */}
            {positionsData?.success && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Open Positions ({positionsData.count})</CardTitle>
                </CardHeader>
                <CardContent>
                  {positionsData.positions && positionsData.positions.length > 0 ? (
                    <div className="space-y-3">
                      {positionsData.positions.map((position: any) => (
                        <div
                          key={position.ticket}
                          className="flex items-center justify-between p-3 border border-border rounded-sm bg-background"
                        >
                          <div className="flex items-center gap-3">
                            {position.type === 'BUY' ? (
                              <TrendingUp className="w-5 h-5 text-accent" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-destructive" />
                            )}
                            <div>
                              <p className="font-mono text-sm">{position.symbol}</p>
                              <p className="text-xs text-muted-foreground">
                                {position.type} {position.volume} lots @ {position.openPrice.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono text-sm ${position.profit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                              ${position.profit.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">{position.profitPercent.toFixed(2)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No open positions</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trade Statistics */}
            {statsData?.success && 'totalTrades' in statsData && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Trades</p>
                      <p className="text-lg font-mono text-accent">{statsData.totalTrades}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-mono text-accent">{statsData.winRate?.toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Profit</p>
                      <p className={`text-lg font-mono ${statsData?.totalProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        ${statsData?.totalProfit?.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Daily Trades</p>
                      <p className="text-lg font-mono text-accent">{statsData?.dailyTradeCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Information */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Demo Account Recommended</p>
                <p className="text-muted-foreground">
                  Start with a demo account to test the trading system before using real money.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Risk Management</p>
                <p className="text-muted-foreground">
                  The system uses 2% risk per trade with automatic stop-loss and maximum drawdown controls.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">MetaTrader 5 Required</p>
                <p className="text-muted-foreground">
                  You must have MetaTrader 5 running on your computer with the API server enabled.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
