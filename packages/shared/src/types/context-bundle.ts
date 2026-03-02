export interface TokenEstimate {
  component: string;
  tokens: number;
  label: string;
}

export interface ContextBundleTier1 {
  claudeMdContent: string | null;
  claudeMdTokens: number;
}

export interface ContextBundleTier2 {
  ticketContent: string;
  ticketTokens: number;
  epicSummary: string | null;
  epicTokens: number;
  relatedPatterns: Array<{
    id: string;
    patternName: string;
    path: string;
    type: string;
    tags: string[];
    pinned: boolean;
    autoMatched: boolean;
  }>;
  patternsTokens: number;
  dependencies: Array<{
    id: string;
    title: string;
    status: string;
    summary: string;
  }>;
  dependenciesTokens: number;
  peerGroups: Array<{
    id: string;
    name: string;
    conventionSummary: string;
    exemplarPath: string | null;
    memberCount: number;
    memberPaths: string[];
  }>;
  peerGroupsTokens: number;
}

export interface ContextBundleTier3 {
  linkedFiles: string[];
}

export interface ContextBundle {
  ticketId: string;
  ticketTitle: string;
  projectId: string;
  tier1: ContextBundleTier1;
  tier2: ContextBundleTier2;
  tier3: ContextBundleTier3;
  tokenBreakdown: TokenEstimate[];
  totalTokens: number;
  budgetLimit: number;
  overBudget: boolean;
  generatedAt: string;
}
