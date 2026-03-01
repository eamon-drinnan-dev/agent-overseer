export interface Project {
  id: string;
  name: string;
  repoPath: string;
  claudeMdPath: string | null;
  createdAt: string;
  updatedAt: string;
}
