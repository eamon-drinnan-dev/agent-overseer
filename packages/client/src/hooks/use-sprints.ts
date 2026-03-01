import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Sprint, CreateSprintInput, UpdateSprintInput } from '@sentinel/shared';
import { useProjectStore } from '@/stores/project.store';

export function useSprints() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get<Sprint[]>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
  });
}

export function useSprint(id: string) {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['sprints', projectId, id],
    queryFn: () => api.get<Sprint>(`/projects/${projectId}/sprints/${id}`),
    enabled: !!projectId && !!id,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (input: Omit<CreateSprintInput, 'projectId'>) =>
      api.post<Sprint>(`/projects/${projectId}/sprints`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint created');
    },
    onError: () => toast.error('Failed to create sprint'),
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSprintInput & { id: string }) =>
      api.patch<Sprint>(`/projects/${projectId}/sprints/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint updated');
    },
    onError: () => toast.error('Failed to update sprint'),
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/sprints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint deleted');
    },
    onError: () => toast.error('Failed to delete sprint'),
  });
}
