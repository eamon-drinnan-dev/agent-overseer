import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { TicketDependencyWithInfo, CreateTicketDependencyInput } from '@sentinel/shared';

export function useTicketDependencies(ticketId: string | null) {
  return useQuery({
    queryKey: ['ticket-dependencies', ticketId],
    queryFn: () => api.get<TicketDependencyWithInfo[]>(`/tickets/${ticketId}/dependencies`),
    enabled: !!ticketId,
  });
}

export function useCreateTicketDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...input }: CreateTicketDependencyInput & { ticketId: string }) =>
      api.post(`/tickets/${ticketId}/dependencies`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-dependencies', variables.ticketId] });
      toast.success('Dependency added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add dependency'),
  });
}

export function useDeleteTicketDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, depId }: { ticketId: string; depId: string }) =>
      api.delete(`/tickets/${ticketId}/dependencies/${depId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-dependencies', variables.ticketId] });
      toast.success('Dependency removed');
    },
    onError: () => toast.error('Failed to remove dependency'),
  });
}
