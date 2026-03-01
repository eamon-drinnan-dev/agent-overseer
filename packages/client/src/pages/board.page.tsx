import { useState } from 'react';
import { BoardView } from '@/components/board/board-view';
import { useTickets, useCreateTicket } from '@/hooks/use-tickets';
import { useEpics } from '@/hooks/use-epics';
import { useProjectStore } from '@/stores/project.store';
import { TicketFormDialog } from '@/components/ticket-form';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function BoardPage() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: tickets, isLoading, isError } = useTickets();
  const { data: epics } = useEpics();
  const createTicket = useCreateTicket();
  const [createOpen, setCreateOpen] = useState(false);

  if (!projectId) {
    return <p className="text-muted-foreground">Select a project to view the board.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Board</h2>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={!epics?.length}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </div>
      {isError ? (
        <p className="text-destructive">Failed to load tickets. Please try again.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading tickets...</p>
      ) : (
        <BoardView tickets={tickets ?? []} epics={epics} />
      )}

      <TicketFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        epics={epics ?? []}
        isPending={createTicket.isPending}
        onSubmit={(data) => {
          createTicket.mutate(data, {
            onSuccess: () => setCreateOpen(false),
          });
        }}
      />
    </div>
  );
}
