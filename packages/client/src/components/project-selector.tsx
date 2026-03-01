import { useEffect, useState } from 'react';
import { useProjects, useCreateProject } from '@/hooks/use-projects';
import { useProjectStore } from '@/stores/project.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

export function ProjectSelector() {
  const { data: projects, isLoading } = useProjects();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const createProject = useCreateProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setName('');
      setRepoPath('');
    }
  }, [dialogOpen]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (!activeProjectId && projects?.length) {
      setActiveProjectId(projects[0]!.id);
    }
  }, [activeProjectId, projects, setActiveProjectId]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createProject.mutate(
      { name, repoPath },
      {
        onSuccess: (project) => {
          if (project) setActiveProjectId(project.id);
          setName('');
          setRepoPath('');
          setDialogOpen(false);
        },
      },
    );
  }

  if (isLoading) return null;

  // No projects yet — show create prompt
  if (!projects?.length) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </DialogTrigger>
        <CreateProjectDialog
          name={name}
          setName={setName}
          repoPath={repoPath}
          setRepoPath={setRepoPath}
          onSubmit={handleCreate}
          isPending={createProject.isPending}
        />
      </Dialog>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={activeProjectId ?? ''} onValueChange={setActiveProjectId}>
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <CreateProjectDialog
          name={name}
          setName={setName}
          repoPath={repoPath}
          setRepoPath={setRepoPath}
          onSubmit={handleCreate}
          isPending={createProject.isPending}
        />
      </Dialog>
    </div>
  );
}

function CreateProjectDialog({
  name,
  setName,
  repoPath,
  setRepoPath,
  onSubmit,
  isPending,
}: {
  name: string;
  setName: (v: string) => void;
  repoPath: string;
  setRepoPath: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Project</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Project"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repo-path">Repository Path</Label>
          <Input
            id="repo-path"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/path/to/repo"
            required
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </DialogContent>
  );
}
