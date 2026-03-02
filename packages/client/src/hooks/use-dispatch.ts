import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AgentSession, DispatchPlan } from '@sentinel/shared';

interface DispatchStatus {
  epicId: string;
  planSessionId: string;
  status: 'pending' | 'running' | 'paused' | 'complete' | 'failed';
  currentGroup: number;
  totalGroups: number;
  ticketStatuses: Array<{
    ticketId: string;
    title: string;
    groupIndex: number;
    sessionId: string | null;
    status: string;
  }>;
  failedTickets: string[];
}

interface PlanResult {
  plan: DispatchPlan;
  sessionId: string;
}

export function usePlanSprint(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { model?: string }) =>
      api.post<AgentSession>(`/epics/${epicId}/plan-sprint`, opts ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-plan', epicId] });
      toast.success('Planning agent deployed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to start planning'),
  });
}

export function useDispatchPlan(epicId: string) {
  return useQuery({
    queryKey: ['dispatch-plan', epicId],
    queryFn: () => api.get<PlanResult>(`/epics/${epicId}/plan`),
    enabled: !!epicId,
    retry: false,
  });
}

export function useStartDispatch(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/epics/${epicId}/dispatch`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-status', epicId] });
      toast.success('Dispatch started');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to start dispatch'),
  });
}

export function useDispatchStatus(epicId: string) {
  return useQuery({
    queryKey: ['dispatch-status', epicId],
    queryFn: () => api.get<DispatchStatus>(`/epics/${epicId}/dispatch-status`),
    enabled: !!epicId,
    refetchInterval: 3000,
    retry: false,
  });
}

export function useAbortDispatch(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/epics/${epicId}/dispatch-abort`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-status', epicId] });
      toast.success('Dispatch abort requested');
    },
    onError: () => toast.error('Failed to abort dispatch'),
  });
}
