import { ReactNode } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarNavProps {
  items: NavItem[];
}

/**
 * SidebarNav Component
 * 
 * Design: Scientific Minimalism with Neon Accents
 * - Cyan (#00f0ff) highlight for active items
 * - Minimal styling with sharp borders
 * - Snappy hover effects with 150ms transitions
 */
export default function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`
            w-full px-3 py-2 rounded-sm text-sm font-mono
            flex items-center gap-2
            transition-all duration-150 ease-out
            ${
              item.active
                ? 'bg-secondary text-accent border-l-2 border-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }
          `}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
