import { Settings2 } from 'lucide-react';
import Link from 'next/link';

import type { ListSummary } from '@/lib/library/lists';
import { cn } from '@/lib/utils';
import { libraryHref, type LibraryParams } from '@/lib/validation/library';

const chip =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors pointer-coarse:h-10 pointer-coarse:px-4';

/** Lists as filter chips above the library ("Tutti i titoli" clears the filter). */
export function LibraryLists({ lists, params }: { lists: ListSummary[]; params: LibraryParams }) {
  const active = params.list;

  return (
    // Scrolls sideways on narrow phones instead of wrapping.
    <nav aria-label="Liste" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex items-center gap-2 pb-1">
        {lists.length > 0 && (
          <li>
            <Link
              href={libraryHref(params, { list: '' })}
              aria-current={!active ? 'page' : undefined}
              className={cn(
                chip,
                !active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-accent',
              )}
            >
              Tutti i titoli
            </Link>
          </li>
        )}
        {lists.map((list) => {
          const selected = list.id === active;
          return (
            <li key={list.id}>
              <Link
                href={libraryHref(params, { list: list.id })}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  chip,
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-accent',
                )}
              >
                {list.name}
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    selected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {list.count}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/library/lists"
            className={cn(chip, 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            <Settings2 className="size-4" aria-hidden />
            {lists.length > 0 ? 'Gestisci liste' : 'Crea una lista'}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
