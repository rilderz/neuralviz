import { useMemo } from 'react';

interface LayerActivationHeatmapProps {
  layerActivations: Array<{
    layerName: string;
    activations: number[];
  }>;
  isTraining?: boolean;
}

/**
 * LayerActivationHeatmap Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Heatmap visualization using cyan-to-magenta gradient
 * - Each row represents a layer, each column represents a neuron
 * - Color intensity represents activation magnitude
 * - Minimal borders and sharp styling
 */
export default function LayerActivationHeatmap({
  layerActivations,
  isTraining = false,
}: LayerActivationHeatmapProps) {
  // Normalize activations for color mapping
  const normalizedData = useMemo(() => {
    return layerActivations.map((layer) => {
      const max = Math.max(...layer.activations);
      const min = Math.min(...layer.activations);
      const range = max - min || 1;

      return {
        ...layer,
        normalized: layer.activations.map((val) => (val - min) / range),
      };
    });
  }, [layerActivations]);

  // Map normalized value (0-1) to color
  const getColor = (value: number): string => {
    // Gradient from dark (0) to cyan (0.5) to magenta (1)
    if (value < 0.5) {
      const t = value * 2; // 0 to 1
      const r = Math.round(0 + t * 255); // 0 to 255
      const g = Math.round(240 + t * (0 - 240)); // 240 to 0
      const b = Math.round(255); // 255
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (value - 0.5) * 2; // 0 to 1
      const r = Math.round(255); // 255
      const g = Math.round(0); // 0
      const b = Math.round(255 + t * (0 - 255)); // 255 to 0
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
          Layer Activations
        </h2>
        {isTraining && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="space-y-2 overflow-x-auto">
        {normalizedData.map((layer) => (
          <div key={layer.layerName} className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono">
              {layer.layerName}
            </p>
            <div className="flex gap-0.5 h-8">
              {layer.normalized.map((value, idx) => (
                <div
                  key={idx}
                  className="flex-1 min-w-[2px] border border-border/50 transition-colors duration-300"
                  style={{
                    backgroundColor: getColor(value),
                  }}
                  title={`Neuron ${idx}: ${value.toFixed(3)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Color Legend */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 border border-border" style={{ backgroundColor: '#0f0f1e' }} />
            <div className="w-4 h-4 border border-border" style={{ backgroundColor: '#00f0ff' }} />
            <div className="w-4 h-4 border border-border" style={{ backgroundColor: '#ff00ff' }} />
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
