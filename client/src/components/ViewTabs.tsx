import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface ViewTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * ViewTabs Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Neon cyan (#00f0ff) for active tab indicator
 * - Sharp borders and minimal styling
 * - Snappy 150ms transitions for technical feel
 */
export default function ViewTabs({ tabs, activeTab, onTabChange }: ViewTabsProps) {
  return (
    <div className="flex gap-1 border-b border-border pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 text-sm font-mono font-medium
            border-b-2 transition-all duration-150 ease-out
            ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }
          `}
        >
          <span className="flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
