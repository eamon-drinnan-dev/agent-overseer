export interface PatternEntry {
  id: string;
  projectId: string;
  path: string;
  type: string;
  patternName: string;
  tags: string[];
  peerGroupId?: string | null;
  lastUpdated: string;
}
