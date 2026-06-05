import { Activity, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import MetricCard from './MetricCard';

interface TrainingMetricsProps {
  currentLoss: number;
  currentAccuracy: number;
  learningRate: number;
  epoch: number;
  isTraining: boolean;
}

/**
 * TrainingMetrics Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Displays key training metrics in a grid layout
 * - Color-coded metrics: cyan for loss, lime for accuracy, gold for learning rate
 * - Real-time updates with trend indicators
 */
export default function TrainingMetrics({
  currentLoss,
  currentAccuracy,
  learningRate,
  epoch,
  isTraining,
}: TrainingMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        title="Current Loss"
        value={currentLoss.toFixed(4)}
        color="cyan"
        trend={currentLoss < 0.5 ? 'down' : 'neutral'}
        icon={<TrendingDown className="w-4 h-4" />}
      />
      <MetricCard
        title="Accuracy"
        value={`${(currentAccuracy * 100).toFixed(1)}`}
        unit="%"
        color="lime"
        trend={currentAccuracy > 0.8 ? 'up' : 'neutral'}
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <MetricCard
        title="Learning Rate"
        value={learningRate.toExponential(2)}
        color="gold"
        icon={<Zap className="w-4 h-4" />}
      />
      <MetricCard
        title="Epoch"
        value={epoch}
        color="magenta"
        icon={
          isTraining && (
            <Activity className="w-4 h-4 animate-pulse text-accent" />
          )
        }
      />
    </div>
  );
}
