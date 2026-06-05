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

interface LossCurveProps {
  data: Array<{
    epoch: number;
    trainLoss: number;
    valLoss: number;
  }>;
  isTraining?: boolean;
}

/**
 * LossCurve Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Cyan line for training loss
 * - Magenta line for validation loss
 * - Dark background with minimal grid
 * - Real-time data updates
 */
export default function LossCurve({ data, isTraining = false }: LossCurveProps) {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
          Loss Curves
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
          <YAxis stroke="#a8a8d0" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #00f0ff',
              borderRadius: '2px',
            }}
            labelStyle={{ color: '#e8e8ff' }}
            formatter={(value: number) => value.toFixed(4)}
          />
          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="trainLoss"
            stroke="#00f0ff"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
            name="Train Loss"
          />
          <Line
            type="monotone"
            dataKey="valLoss"
            stroke="#ff00ff"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
            name="Val Loss"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
