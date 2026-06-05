import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Layers,
  Play,
  Square,
  TrendingUp,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import SidebarNav from '@/components/SidebarNav';
import ViewTabs from '@/components/ViewTabs';
import TrainingMetrics from '@/components/TrainingMetrics';
import LossCurve from '@/components/LossCurve';
import AccuracyCurve from '@/components/AccuracyCurve';
import LayerActivationHeatmap from '@/components/LayerActivationHeatmap';
import GradientFlow from '@/components/GradientFlow';
import { Button } from '@/components/ui/button';
import {
  generateTrainingData,
  generateLayerActivations,
  generateGradientFlow,
  updateTrainingDataPoint,
  updateLayerActivations,
  updateGradientFlow,
  TrainingDataPoint,
  LayerActivation,
  GradientData,
} from '@/lib/dataGenerator';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

/**
 * Home Page - NeuralViz Dashboard
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Dark charcoal background with electric cyan/magenta/lime accents
 * - Asymmetric 3-column layout for visualizations
 * - Real-time data updates with smooth animations
 * - Monospace typography for technical credibility
 */
export default function Home() {
  // Authentication state
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [isTraining, setIsTraining] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [epoch, setEpoch] = useState(1);

  // Training data state
  const [trainingData, setTrainingData] = useState<TrainingDataPoint[]>([]);
  const [layerActivations, setLayerActivations] = useState<LayerActivation[]>([]);
  const [gradientFlow, setGradientFlow] = useState<GradientData[]>([]);

  // Initialize data
  useEffect(() => {
    setTrainingData(generateTrainingData(50));
    setLayerActivations(generateLayerActivations());
    setGradientFlow(generateGradientFlow());
  }, []);

  // Simulate real-time training updates
  useEffect(() => {
    if (!isTraining || trainingData.length === 0) return;

    const interval = setInterval(() => {
      setEpoch((prev) => {
        const nextEpoch = prev + 1;

        if (nextEpoch > 100) {
          setIsTraining(false);
          return prev;
        }

        // Update training data
        setTrainingData((prev) => {
          const lastPoint = prev[prev.length - 1];
          const newPoint = updateTrainingDataPoint(lastPoint, nextEpoch);
          return [...prev, newPoint];
        });

        // Update layer activations
        setLayerActivations((prev) => updateLayerActivations(prev));

        // Update gradient flow
        setGradientFlow((prev) => updateGradientFlow(prev));

        return nextEpoch;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTraining, trainingData.length]);

  const currentMetrics = trainingData[trainingData.length - 1] || {
    trainLoss: 0,
    valLoss: 0,
    trainAccuracy: 0,
    valAccuracy: 0,
  };

  const sidebarItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Activity className="w-4 h-4" />,
      active: activeView === 'overview',
      onClick: () => setActiveView('overview'),
    },
    {
      id: 'curves',
      label: 'Training Curves',
      icon: <TrendingUp className="w-4 h-4" />,
      active: activeView === 'curves',
      onClick: () => setActiveView('curves'),
    },
    {
      id: 'activations',
      label: 'Layer Activations',
      icon: <Layers className="w-4 h-4" />,
      active: activeView === 'activations',
      onClick: () => setActiveView('activations'),
    },
    {
      id: 'gradients',
      label: 'Gradient Analysis',
      icon: <BarChart3 className="w-4 h-4" />,
      active: activeView === 'gradients',
      onClick: () => setActiveView('gradients'),
    },
  ];

  return (
    <DashboardLayout
      sidebarContent={
        <div className="space-y-6">
          <SidebarNav items={sidebarItems} />

          {/* Training Controls */}
          <div className="border-t border-border pt-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Training Control
            </p>
            <button
              onClick={() => setIsTraining(!isTraining)}
              className={`
                w-full px-3 py-2 rounded-sm text-sm font-mono font-medium
                flex items-center justify-center gap-2
                transition-all duration-150 ease-out
                ${
                  isTraining
                    ? 'bg-destructive text-destructive-foreground hover:shadow-lg'
                    : 'bg-accent text-accent-foreground hover:shadow-lg'
                }
              `}
            >
              {isTraining ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
          </div>

          {/* Status Info */}
          <div className="border-t border-border pt-6 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-accent font-mono">
                {isTraining ? 'Training' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Epoch:</span>
              <span className="text-accent font-mono">{epoch}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loss:</span>
              <span className="text-accent font-mono">
                {currentMetrics.trainLoss.toFixed(4)}
              </span>
            </div>
          </div>

          {/* AI Trading System Link */}
          <div className="border-t border-border pt-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Advanced Features
            </p>
            <Button
              onClick={() => setLocation('/trading')}
              className="w-full bg-accent text-accent-foreground hover:shadow-lg gap-2"
            >
              <Zap className="w-4 h-4" />
              AI Trading System
            </Button>
            <Button
              onClick={() => setLocation('/multi-currency')}
              className="w-full bg-accent/80 text-accent-foreground hover:shadow-lg gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Multi-Currency Trading
            </Button>
            <Button
              onClick={() => setLocation('/analysis')}
              className="w-full bg-accent/60 text-accent-foreground hover:shadow-lg gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Hybrid Analysis
            </Button>
          </div>
        </div>
      }
    >
      {/* Main Content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-accent">NeuralViz</h1>
          <p className="text-sm text-muted-foreground">
            Real-time neural network training visualization and analysis
          </p>
        </div>

        {/* View Tabs */}
        <ViewTabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'curves', label: 'Curves' },
            { id: 'activations', label: 'Activations' },
            { id: 'gradients', label: 'Gradients' },
          ]}
          activeTab={activeView}
          onTabChange={setActiveView}
        />

        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Metrics */}
            <TrainingMetrics
              currentLoss={currentMetrics.trainLoss}
              currentAccuracy={currentMetrics.trainAccuracy}
              learningRate={0.001}
              epoch={epoch}
              isTraining={isTraining}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LossCurve data={trainingData} isTraining={isTraining} />
              <AccuracyCurve data={trainingData} isTraining={isTraining} />
            </div>

            {/* Heatmap */}
            <LayerActivationHeatmap
              layerActivations={layerActivations}
              isTraining={isTraining}
            />

            {/* Gradient Flow */}
            <GradientFlow data={gradientFlow} isTraining={isTraining} />
          </div>
        )}

        {/* Curves View */}
        {activeView === 'curves' && (
          <div className="space-y-6">
            <LossCurve data={trainingData} isTraining={isTraining} />
            <AccuracyCurve data={trainingData} isTraining={isTraining} />
          </div>
        )}

        {/* Activations View */}
        {activeView === 'activations' && (
          <div className="space-y-6">
            <LayerActivationHeatmap
              layerActivations={layerActivations}
              isTraining={isTraining}
            />
          </div>
        )}

        {/* Gradients View */}
        {activeView === 'gradients' && (
          <div className="space-y-6">
            <GradientFlow data={gradientFlow} isTraining={isTraining} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
