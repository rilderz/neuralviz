import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
}

/**
 * DashboardLayout Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Dark charcoal background (#0f0f1e) for minimal eye strain
 * - Electric cyan (#00f0ff) accent for active navigation
 * - Asymmetric layout: narrow sidebar (200px) + main content area
 * - Monospace typography for technical credibility
 * - Glowing neon borders on hover/active states
 */
export default function DashboardLayout({ children, sidebarContent }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-mono">
      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-50 md:z-0
          w-64 md:w-52 h-screen
          bg-card border-r border-border
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          overflow-y-auto
          scanlines
        `}
      >
        <div className="p-4 space-y-8">
          {/* Logo/Title */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-accent">NeuralViz</h1>
            <p className="text-xs text-muted-foreground">Neural Network Monitor</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {sidebarContent}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 border-b border-border bg-card flex items-center px-4 md:px-6 scanlines">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-secondary rounded transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-accent" />
            ) : (
              <Menu className="w-5 h-5 text-accent" />
            )}
          </button>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground">
            Real-time Neural Network Training Monitor
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
