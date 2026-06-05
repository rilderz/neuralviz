# NeuralViz - Neural Network Training Dashboard

An interactive, real-time dashboard for visualizing neural network training progress and analyzing model behavior. Built with React, TypeScript, and Recharts for researchers and ML engineers to debug and understand their models faster.

## Features

### Real-Time Monitoring
- **Live Loss Curves**: Track training and validation loss in real-time with smooth animations
- **Accuracy Tracking**: Monitor training and validation accuracy improvements across epochs
- **Live Metrics Display**: Current loss, accuracy, learning rate, and epoch information with color-coded indicators

### Advanced Visualizations
- **Layer Activation Heatmap**: Visualize neuron activations across all layers with a cyan-to-magenta color gradient representing activation magnitude
- **Gradient Flow Analysis**: Bar chart showing gradient magnitudes per layer to identify vanishing/exploding gradient problems
- **Multi-View Dashboard**: Switch between overview, curves, activations, and gradient analysis views

### Design Philosophy
The dashboard implements a **Scientific Minimalism with Neon Accents** design:
- **Dark charcoal background** (#0f0f1e) for minimal eye strain during long research sessions
- **Electric cyan** (#00f0ff), **magenta** (#ff00ff), and **lime green** (#00ff41) accents for visual hierarchy and real-time feedback
- **Monospace typography** (IBM Plex Mono) for technical credibility
- **Sharp borders and minimal ornamentation** to keep focus on data
- **Glowing neon effects** on hover for interactive feedback

## Architecture

### Components

| Component | Purpose |
|-----------|---------|
| `DashboardLayout` | Main layout with sidebar navigation and content area |
| `TrainingMetrics` | Displays key metrics in a 4-column grid |
| `LossCurve` | Line chart for training/validation loss |
| `AccuracyCurve` | Line chart for training/validation accuracy |
| `LayerActivationHeatmap` | Heatmap visualization of neuron activations |
| `GradientFlow` | Bar chart for gradient magnitude analysis |
| `ViewTabs` | Tab navigation between different views |
| `SidebarNav` | Navigation menu with active state indicators |
| `MetricCard` | Individual metric display with color coding |

### Data Generation

The `dataGenerator.ts` utility provides realistic simulated training data:
- **Exponential loss decay** with noise for realistic training progression
- **Sigmoid-like accuracy improvement** mirroring typical neural network learning curves
- **Layer activation simulation** with random neuron values
- **Gradient flow simulation** with vanishing gradient patterns

## Usage

### Starting the Dashboard

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

The dashboard will be available at `http://localhost:3000`.

### Training Controls

- **Start/Stop Button**: Toggle real-time training simulation
- **Epoch Counter**: Displays current epoch (0-100)
- **Live Indicator**: Shows when data is being updated in real-time
- **Status Display**: Current training status and loss value

### Viewing Data

1. **Overview Tab**: See all visualizations at once
2. **Curves Tab**: Focus on loss and accuracy curves
3. **Activations Tab**: Analyze layer activation patterns
4. **Gradients Tab**: Study gradient flow across layers

## Color Coding

| Color | Meaning | Used For |
|-------|---------|----------|
| Cyan (#00f0ff) | Primary/Active | Loss curves, active navigation, healthy gradients |
| Magenta (#ff00ff) | Secondary/Alert | Validation loss, potential gradient issues |
| Lime Green (#00ff41) | Success | Accuracy curves, positive metrics |
| Gold (#ffd700) | Tertiary | Validation accuracy, learning rate |
| Deep Pink (#ff1493) | Warning | Epoch counter, destructive actions |

## Real-Time Updates

The dashboard simulates real-time training with:
- **1-second update interval** for smooth animations
- **Realistic data progression** showing typical training dynamics
- **Live indicators** showing which metrics are being updated
- **Smooth transitions** using Recharts animations

## Responsive Design

- **Mobile-first approach** with collapsible sidebar on small screens
- **Adaptive grid layouts** that adjust from 1 to 2 columns based on screen size
- **Touch-friendly controls** with adequate spacing
- **Persistent navigation** on desktop, collapsible on mobile

## Technical Stack

- **React 19**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first styling with OKLCH color support
- **Recharts**: Composable charting library
- **Lucide React**: Icon library
- **Wouter**: Lightweight client-side routing

## Customization

### Adding New Metrics

Create a new component extending `MetricCard`:

```tsx
<MetricCard
  title="Custom Metric"
  value={value}
  unit="unit"
  color="cyan"
  icon={<Icon />}
/>
```

### Connecting Real Data

Replace the simulated data in `Home.tsx` with API calls:

```tsx
useEffect(() => {
  fetch('/api/training-data')
    .then(r => r.json())
    .then(data => setTrainingData(data));
}, []);
```

### Styling Customization

All colors are defined in `client/src/index.css` using CSS variables. Modify the `:root` block to change the theme globally.

## Performance Considerations

- **Recharts optimization**: Using `isAnimationActive={false}` for real-time updates
- **Efficient re-renders**: Memoized data transformations in components
- **Minimal DOM updates**: CSS variables for color changes without re-renders
- **Responsive charts**: Auto-scaling based on container size

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- WebSocket integration for real neural network training
- Export training data as CSV/JSON
- Custom layer visualization
- Comparison between multiple training runs
- Model architecture visualization
- Hyperparameter adjustment controls
- Training session history and replay

## License

MIT
