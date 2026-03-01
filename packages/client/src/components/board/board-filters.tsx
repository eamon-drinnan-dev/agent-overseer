import { useBoardStore } from '@/stores/board.store';
import { useEpics } from '@/hooks/use-epics';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TICKET_CATEGORIES, CRITICALITIES } from '@sentinel/shared';
import type { TicketCategory, Criticality } from '@sentinel/shared';
import { X, Search } from 'lucide-react';

export function BoardFilters() {
  const { filters, setFilter, resetFilters } = useBoardStore();
  const { data: epics } = useEpics();

  const hasFilters = filters.epicId || filters.category || filters.criticality || filters.searchQuery;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.searchQuery}
          onChange={(e) => setFilter('searchQuery', e.target.value)}
          placeholder="Search tickets..."
          className="h-8 w-48 pl-8 text-sm"
        />
      </div>

      <Select
        value={filters.epicId ?? 'all'}
        onValueChange={(v) => setFilter('epicId', v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="All Epics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Epics</SelectItem>
          {epics?.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? 'all'}
        onValueChange={(v) => setFilter('category', v === 'all' ? null : v as TicketCategory)}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {TICKET_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.criticality ?? 'all'}
        onValueChange={(v) => setFilter('criticality', v === 'all' ? null : v as Criticality)}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All Criticality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Criticality</SelectItem>
          {CRITICALITIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8" onClick={resetFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
