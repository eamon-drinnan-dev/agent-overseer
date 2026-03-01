import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PATTERN_TYPES } from '@sentinel/shared';
import type { PatternEntry, PatternType } from '@sentinel/shared';
import { X } from 'lucide-react';

interface PatternFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    path: string;
    type: string;
    patternName: string;
    tags: string[];
  }) => void;
  isPending: boolean;
  pattern?: PatternEntry;
}

export function PatternFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  pattern,
}: PatternFormProps) {
  const [patternName, setPatternName] = useState(pattern?.patternName ?? '');
  const [path, setPath] = useState(pattern?.path ?? '');
  const [type, setType] = useState<PatternType>((pattern?.type as PatternType) ?? 'component');
  const [tags, setTags] = useState<string[]>(pattern?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      setPatternName(pattern?.patternName ?? '');
      setPath(pattern?.path ?? '');
      setType((pattern?.type as PatternType) ?? 'component');
      setTags(pattern?.tags ?? []);
      setTagInput('');
    }
  }, [open, pattern]);

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ path, type, patternName, tags });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pattern ? 'Edit Pattern' : 'Create Pattern'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pattern-name">Pattern Name</Label>
            <Input
              id="pattern-name"
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="e.g. card-with-state"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pattern-path">File Path</Label>
            <Input
              id="pattern-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. src/components/ZoneCard/ZoneCard.tsx"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PatternType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pattern-tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="pattern-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag and press Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : pattern ? 'Update Pattern' : 'Create Pattern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
