import type { Criticality, EpicStatus } from '../enums.js';

export interface Epic {
  id: string;
  title: string;
  descriptionMd: string;
  criticality: Criticality;
  status: EpicStatus;
  projectId: string;
  sprintId: string | null;
  progressPct: number;
  filePath: string | null;
  createdAt: string;
  updatedAt: string;
}
