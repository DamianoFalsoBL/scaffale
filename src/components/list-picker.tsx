'use client';

import { ListPlus, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

import { ListDialog } from '@/components/list-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ListInfo } from '@/lib/library/lists';
import { cn } from '@/lib/utils';

/**
 * "Aggiungi a lista…": the user's lists with a check on those holding the title, plus
 * "Nuova lista…" (created and ticked at once). `onToggle` does the saving.
 */
export function ListPicker({
  lists,
  selected,
  onToggle,
  pending = false,
  size = 'sm',
  className,
}: {
  lists: ListInfo[];
  selected: readonly string[];
  onToggle: (list: ListInfo, member: boolean) => void;
  pending?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <>
      {/* Not modal: "Nuova lista…" opens a dialog, and a modal menu would leave the page inert. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn('self-start', className)}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ListPlus aria-hidden />}
            Aggiungi a lista
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          {lists.length > 0 && <DropdownMenuLabel>Le tue liste</DropdownMenuLabel>}
          {lists.map((list) => {
            const member = selected.includes(list.id);
            return (
              <DropdownMenuCheckboxItem
                key={list.id}
                checked={member}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onToggle(list, checked === true)}
              >
                <span className="truncate">{list.name}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
          {lists.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus aria-hidden />
            Nuova lista…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ListDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(list) => onToggle(list, true)}
      />
    </>
  );
}
