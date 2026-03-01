import { create } from 'zustand';
import type { TicketCategory, Criticality } from '@sentinel/shared';

interface BoardFilters {
  epicId: string | null;
  category: TicketCategory | null;
  criticality: Criticality | null;
  searchQuery: string;
}

interface BoardState {
  filters: BoardFilters;
  setFilter: <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: BoardFilters = {
  epicId: null,
  category: null,
  criticality: null,
  searchQuery: '',
};

export const useBoardStore = create<BoardState>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
