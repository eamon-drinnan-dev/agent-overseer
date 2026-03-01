export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  startDate: string | null;
  endDate: string | null;
  goalMd: string;
  createdAt: string;
  updatedAt: string;
}
