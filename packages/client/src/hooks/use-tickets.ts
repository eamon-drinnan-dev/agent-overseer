import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Ticket, CreateTicketInput, UpdateTicketInput } from '@sentinel/shared';

export function useTickets(filters?: { epicId?: string; status?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters?.epicId) params.set('epicId', filters.epicId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  const query = params.toString();

  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => api.get<Ticket[]>(`/tickets${query ? `?${query}` : ''}`),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => api.post<Ticket>('/tickets', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket created');
    },
    onError: () => toast.error('Failed to create ticket'),
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTicketInput & { id: string }) =>
      api.patch<Ticket>(`/tickets/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Failed to update ticket'),
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Ticket>(`/tickets/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: () => toast.error('Invalid status transition'),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket deleted');
    },
    onError: () => toast.error('Failed to delete ticket'),
  });
}
