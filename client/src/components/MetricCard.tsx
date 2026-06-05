import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  color?: 'cyan' | 'magenta' | 'lime' | 'gold';
}

/**
 * MetricCard Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Glowing neon border on hover
 * - Monospace font for metric values
 * - Color-coded by metric type (cyan=loss, magenta=accuracy, lime=success, gold=custom)
 * - Sharp corners and minimal styling
 */
export default function MetricCard({
  title,
  value,
  unit,
  trend,
  icon,
  color = 'cyan',
}: MetricCardProps) {
  const colorMap = {
    cyan: '#00f0ff',
    magenta: '#ff00ff',
    lime: '#00ff41',
    gold: '#ffd700',
  };

  const glowColor = colorMap[color];

  return (
    <div
      className="
        bg-card border border-border rounded-sm
        p-4 space-y-2
        transition-all duration-150 ease-out
        hover:border-accent hover:shadow-lg
        group
      "
      style={{
        '--glow-color': glowColor,
        '--hover-shadow': `0 0 20px ${glowColor}40`,
      } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: glowColor }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-xs text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>
        {icon && (
          <div className="text-muted-foreground group-hover:text-accent transition-colors">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {trend === 'up' && '↑ Increasing'}
            {trend === 'down' && '↓ Decreasing'}
            {trend === 'neutral' && '→ Stable'}
          </p>
        </div>
      )}
    </div>
  );
}
