'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { setListMembership } from '@/actions/lists';
import { ListPicker } from '@/components/list-picker';
import type { ListInfo } from '@/lib/library/lists';

/** The lists holding this title, each removable, plus "Aggiungi a lista…". */
export function EntryLists({
  entryId,
  lists,
  memberIds,
}: {
  entryId: string;
  lists: ListInfo[];
  memberIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(memberIds);
  // A list just created in the picker isn't in `lists` until the page refreshes.
  const [extra, setExtra] = useOptimistic<ListInfo[]>([]);
  const known = [...lists, ...extra.filter((list) => !lists.some((l) => l.id === list.id))];
  const members = known.filter((list) => optimistic.includes(list.id));

  function toggle(list: ListInfo, member: boolean) {
    startTransition(async () => {
      if (!lists.some((l) => l.id === list.id)) setExtra([...extra, list]);
      setOptimistic(member ? [...optimistic, list.id] : optimistic.filter((id) => id !== list.id));
      const result = await setListMembership({ listId: list.id, entryId, member });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(member ? `Aggiunto a “${list.name}”` : `Tolto da “${list.name}”`);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="lists-title">
      <h2 id="lists-title" className="text-lg font-semibold">
        Liste
      </h2>
      {members.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {members.map((list) => (
            <li
              key={list.id}
              className="flex items-center rounded-full border bg-card text-sm shadow-xs"
            >
              <Link
                href={`/library?list=${list.id}`}
                className="py-1.5 pl-3 hover:underline pointer-coarse:py-2.5"
              >
                {list.name}
              </Link>
              <button
                type="button"
                onClick={() => toggle(list, false)}
                disabled={pending}
                aria-label={`Togli da ${list.name}`}
                className="ml-1 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:p-2.5"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Non è in nessuna lista.</p>
      )}
      <ListPicker lists={known} selected={optimistic} onToggle={toggle} pending={pending} />
    </section>
  );
}
