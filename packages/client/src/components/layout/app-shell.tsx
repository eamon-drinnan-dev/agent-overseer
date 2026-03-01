import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={cn('transition-all duration-200', sidebarOpen ? 'w-60' : 'w-0')}>
        {sidebarOpen && <Sidebar />}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
