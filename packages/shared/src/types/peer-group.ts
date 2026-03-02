export interface PeerGroup {
  id: string;
  projectId: string;
  patternId: string | null;
  name: string;
  description: string;
  conventionSummary: string;
  lastUpdated: string;
}

export interface PeerGroupWithMembers extends PeerGroup {
  members: Array<{
    id: string;
    patternName: string;
    path: string;
    type: string;
  }>;
  memberCount: number;
}

export interface PeerGroupContextEntry {
  id: string;
  name: string;
  conventionSummary: string;
  exemplarPath: string | null;
  memberCount: number;
  memberPaths: string[];
}
