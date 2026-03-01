import { Menu } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <span className="text-xs text-muted-foreground">Agentic Dev Hub</span>
    </header>
  );
}
