import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { PeerGroupWithMembers, CreatePeerGroupInput, UpdatePeerGroupInput } from '@sentinel/shared';
import { useProjectStore } from '@/stores/project.store';

export function usePeerGroups() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ['peer-groups', projectId],
    queryFn: () => api.get<PeerGroupWithMembers[]>(`/projects/${projectId}/peer-groups`),
    enabled: !!projectId,
  });
}

export function usePeerGroup(id: string | null) {
  return useQuery({
    queryKey: ['peer-group', id],
    queryFn: () => api.get<PeerGroupWithMembers>(`/peer-groups/${id}`),
    enabled: !!id,
  });
}

export function useCreatePeerGroup() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (input: Omit<CreatePeerGroupInput, 'projectId'>) =>
      api.post<PeerGroupWithMembers>(`/projects/${projectId}/peer-groups`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Peer group created');
    },
    onError: () => toast.error('Failed to create peer group'),
  });
}

export function useUpdatePeerGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePeerGroupInput & { id: string }) =>
      api.put<PeerGroupWithMembers>(`/peer-groups/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['peer-group'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Peer group updated');
    },
    onError: () => toast.error('Failed to update peer group'),
  });
}

export function useDeletePeerGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/peer-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Peer group deleted');
    },
    onError: () => toast.error('Failed to delete peer group'),
  });
}

export function useAddPeerGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, patternId }: { groupId: string; patternId: string }) =>
      api.post(`/peer-groups/${groupId}/members/${patternId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['peer-group'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });
}

export function useRemovePeerGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, patternId }: { groupId: string; patternId: string }) =>
      api.delete(`/peer-groups/${groupId}/members/${patternId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['peer-group'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });
}
