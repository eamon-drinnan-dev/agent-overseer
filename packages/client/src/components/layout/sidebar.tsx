import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProjectSelector } from '@/components/project-selector';
import {
  LayoutDashboard,
  Layers,
  Puzzle,
  Terminal,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Board', icon: LayoutDashboard },
  { to: '/epics', label: 'Epics', icon: Layers },
  { to: '/patterns', label: 'Patterns', icon: Puzzle },
  { to: '/agents', label: 'Agents', icon: Terminal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-lg font-semibold tracking-tight">Sentinel</h1>
      </div>
      <div className="border-b border-border p-3">
        <ProjectSelector />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
