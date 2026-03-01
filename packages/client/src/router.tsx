import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { BoardPage } from '@/pages/board.page';
import { EpicsListPage } from '@/pages/epics-list.page';
import { EpicPage } from '@/pages/epic.page';
import { TicketPage } from '@/pages/ticket.page';
import { PatternsPage } from '@/pages/patterns.page';
import { AgentTerminalPage } from '@/pages/agent-terminal.page';
import { SettingsPage } from '@/pages/settings.page';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <BoardPage /> },
      { path: '/epics', element: <EpicsListPage /> },
      { path: '/epics/:id', element: <EpicPage /> },
      { path: '/tickets/:id', element: <TicketPage /> },
      { path: '/patterns', element: <PatternsPage /> },
      { path: '/agents', element: <AgentTerminalPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
