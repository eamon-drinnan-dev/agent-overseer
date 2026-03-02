import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AgentSession, DeployAgentInput, ApproveRejectPlanInput } from '@sentinel/shared';

export function useAgentSessions(filters?: { ticketId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.ticketId) params.set('ticketId', filters.ticketId);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: ['agent-sessions', filters],
    queryFn: () => api.get<AgentSession[]>(`/agent-sessions${qs ? '?' + qs : ''}`),
    refetchInterval: 5000,
  });
}

export function useAgentSession(id: string | null) {
  return useQuery({
    queryKey: ['agent-sessions', id],
    queryFn: () => api.get<AgentSession>(`/agent-sessions/${id}`),
    enabled: !!id,
    refetchInterval: 3000,
  });
}

export function useTicketAgentSessions(ticketId: string) {
  return useQuery({
    queryKey: ['agent-sessions', 'ticket', ticketId],
    queryFn: () => api.get<AgentSession[]>(`/tickets/${ticketId}/agent-sessions`),
    enabled: !!ticketId,
    refetchInterval: 5000,
  });
}

export function useDeployAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeployAgentInput) =>
      api.post<AgentSession>('/agent-sessions/deploy', input),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      toast.success('Agent deployed');
      return session;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to deploy agent'),
  });
}

export function useApproveRejectPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...input }: ApproveRejectPlanInput & { sessionId: string }) =>
      api.post(`/agent-sessions/${sessionId}/action`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      toast.success(vars.action === 'approve' ? 'Plan approved' : 'Plan rejected');
    },
    onError: () => toast.error('Failed to process plan action'),
  });
}

export function useAbortSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/agent-sessions/${sessionId}/abort`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      toast.success('Session aborted');
    },
    onError: () => toast.error('Failed to abort session'),
  });
}

export function useDeployValidation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ticketId: string; model?: string; maxTurns?: number }) =>
      api.post<AgentSession>('/agent-sessions/validate', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Validation agent deployed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to deploy validation agent'),
  });
}

export function useAgentConfig() {
  return useQuery({
    queryKey: ['agent-config'],
    queryFn: () => api.get<{ configured: boolean; defaultModel: string; defaultMaxTurns: number }>('/config/agent'),
    staleTime: 60_000,
  });
}
