import { create } from 'zustand';

interface AgentState {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  autoScroll: boolean;
  setAutoScroll: (enabled: boolean) => void;
  showToolCalls: boolean;
  setShowToolCalls: (show: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  autoScroll: true,
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  showToolCalls: false,
  setShowToolCalls: (show) => set({ showToolCalls: show }),
}));
