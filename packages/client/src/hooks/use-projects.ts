import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@sentinel/shared';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProjectInput & { id: string }) =>
      api.patch<Project>(`/projects/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated');
    },
    onError: () => toast.error('Failed to update project'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<Project>('/projects', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
  });
}
