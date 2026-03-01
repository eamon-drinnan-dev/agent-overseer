import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Epic, CreateEpicInput, UpdateEpicInput } from '@sentinel/shared';
import { useProjectStore } from '@/stores/project.store';

export function useEpics() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['epics', projectId],
    queryFn: () => api.get<Epic[]>(`/projects/${projectId}/epics`),
    enabled: !!projectId,
  });
}

export function useEpic(id: string) {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['epics', projectId, id],
    queryFn: () => api.get<Epic>(`/projects/${projectId}/epics/${id}`),
    enabled: !!projectId && !!id,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (input: Omit<CreateEpicInput, 'projectId'>) =>
      api.post<Epic>(`/projects/${projectId}/epics`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic created');
    },
    onError: () => toast.error('Failed to create epic'),
  });
}

export function useUpdateEpic() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEpicInput & { id: string }) =>
      api.patch<Epic>(`/projects/${projectId}/epics/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic updated');
    },
    onError: () => toast.error('Failed to update epic'),
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/epics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic deleted');
    },
    onError: () => toast.error('Failed to delete epic'),
  });
}
