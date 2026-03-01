import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { LinkedPattern } from '@sentinel/shared';

export function useTicketPatterns(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-patterns', ticketId],
    queryFn: () => api.get<LinkedPattern[]>(`/tickets/${ticketId}/patterns`),
    enabled: !!ticketId,
  });
}

export function usePinPattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, patternId }: { ticketId: string; patternId: string }) =>
      api.post(`/tickets/${ticketId}/patterns/${patternId}/pin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['context-bundle'] });
      toast.success('Pattern pinned');
    },
    onError: () => toast.error('Failed to pin pattern'),
  });
}

export function useUnpinPattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, patternId }: { ticketId: string; patternId: string }) =>
      api.delete(`/tickets/${ticketId}/patterns/${patternId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['context-bundle'] });
      toast.success('Pattern unpinned');
    },
    onError: () => toast.error('Failed to unpin pattern'),
  });
}

export function useAutoMatchPatterns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, projectId }: { ticketId: string; projectId: string }) =>
      api.post(`/tickets/${ticketId}/patterns/auto-match`, { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['context-bundle'] });
      toast.success('Auto-match complete');
    },
    onError: () => toast.error('Failed to auto-match patterns'),
  });
}
