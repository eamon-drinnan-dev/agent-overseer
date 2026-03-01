import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { PatternEntry, CreatePatternInput, UpdatePatternInput } from '@sentinel/shared';
import { useProjectStore } from '@/stores/project.store';

export function usePatterns() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['patterns', projectId],
    queryFn: () => api.get<PatternEntry[]>(`/projects/${projectId}/patterns`),
    enabled: !!projectId,
  });
}

export function useCreatePattern() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (input: Omit<CreatePatternInput, 'projectId'>) =>
      api.post<PatternEntry>(`/projects/${projectId}/patterns`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Pattern created');
    },
    onError: () => toast.error('Failed to create pattern'),
  });
}

export function useUpdatePattern() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePatternInput & { id: string }) =>
      api.patch<PatternEntry>(`/projects/${projectId}/patterns/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Pattern updated');
    },
    onError: () => toast.error('Failed to update pattern'),
  });
}

export function useDeletePattern() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/patterns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Pattern deleted');
    },
    onError: () => toast.error('Failed to delete pattern'),
  });
}
