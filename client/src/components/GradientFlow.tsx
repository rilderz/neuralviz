import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GradientFlowProps {
  data: Array<{
    layer: string;
    gradientMagnitude: number;
  }>;
  isTraining?: boolean;
}

/**
 * GradientFlow Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Bar chart showing gradient magnitude per layer
 * - Color gradient from cyan (low) to magenta (high)
 * - Helps identify vanishing/exploding gradient problems
 * - Real-time updates
 */
export default function GradientFlow({ data, isTraining = false }: GradientFlowProps) {
  // Normalize data for color mapping
  const max = Math.max(...data.map((d) => d.gradientMagnitude), 1);

  const getBarColor = (value: number): string => {
    const normalized = value / max;
    if (normalized < 0.5) {
      const t = normalized * 2;
      return `rgb(0, ${Math.round(240 * (1 - t))}, 255)`;
    } else {
      const t = (normalized - 0.5) * 2;
      return `rgb(${Math.round(255 * t)}, 0, 255)`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
          Gradient Flow Analysis
        </h2>
        {isTraining && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a4e"
            vertical={false}
          />
          <XAxis
            dataKey="layer"
            stroke="#a8a8d0"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#a8a8d0" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #00f0ff',
              borderRadius: '2px',
            }}
            labelStyle={{ color: '#e8e8ff' }}
            formatter={(value: number) => value.toExponential(2)}
          />
          <Bar
            dataKey="gradientMagnitude"
            fill="#00f0ff"
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.gradientMagnitude)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Info */}
      <div className="pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
        <p>
          <span className="text-accent">Cyan bars</span>: Healthy gradient flow
        </p>
        <p>
          <span className="text-destructive">Magenta bars</span>: Potential exploding gradients
        </p>
      </div>
    </div>
  );
}
