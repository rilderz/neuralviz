import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AccuracyCurveProps {
  data: Array<{
    epoch: number;
    trainAccuracy: number;
    valAccuracy: number;
  }>;
  isTraining?: boolean;
}

/**
 * AccuracyCurve Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Lime green line for training accuracy
 * - Gold line for validation accuracy
 * - Dark background with minimal grid
 * - Real-time data updates
 */
export default function AccuracyCurve({ data, isTraining = false }: AccuracyCurveProps) {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
          Accuracy Curves
        </h2>
        {isTraining && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a4e"
            vertical={false}
          />
          <XAxis
            dataKey="epoch"
            stroke="#a8a8d0"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#a8a8d0"
            style={{ fontSize: '12px' }}
            domain={[0, 1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #00f0ff',
              borderRadius: '2px',
            }}
            labelStyle={{ color: '#e8e8ff' }}
            formatter={(value: number) => (value * 100).toFixed(2) + '%'}
          />
          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="trainAccuracy"
            stroke="#00ff41"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
            name="Train Accuracy"
          />
          <Line
            type="monotone"
            dataKey="valAccuracy"
            stroke="#ffd700"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
            name="Val Accuracy"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
