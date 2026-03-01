import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { ContextBundle } from '@sentinel/shared';

export function useContextBundle(projectId: string | null, ticketId: string) {
  return useQuery({
    queryKey: ['context-bundle', projectId, ticketId],
    queryFn: () =>
      api.get<ContextBundle>(
        `/projects/${projectId}/tickets/${ticketId}/context-bundle`,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useEstimateTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ticketId }: { projectId: string; ticketId: string }) =>
      api.post<{ totalTokens: number }>(
        `/projects/${projectId}/tickets/${ticketId}/estimate-tokens`,
        {},
      ),
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['context-bundle'] });
      toast.success('Token estimate updated');
    },
    onError: () => toast.error('Failed to estimate tokens'),
  });
}
