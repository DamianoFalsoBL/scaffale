'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { addTitleToList } from '@/actions/lists';
import { ListPicker } from '@/components/list-picker';
import type { ListInfo } from '@/lib/library/lists';
import type { MediaType, Source } from '@/lib/providers/types';

/**
 * "Aggiungi a lista…" for a title not in the library yet: it's added as planned, put
 * in the list, and the page moves to its full detail.
 */
export function PreviewAddToList({
  lists,
  source,
  externalId,
  mediaType,
}: {
  lists: ListInfo[];
  source: Source;
  externalId: string;
  mediaType: MediaType;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(list: ListInfo, member: boolean) {
    if (!member) return;
    startTransition(async () => {
      const result = await addTitleToList({ listId: list.id, source, externalId, mediaType });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Aggiunto a “${list.name}” e alla libreria`);
      router.push(`/item/${result.data.mediaItemId}`);
    });
  }

  return <ListPicker lists={lists} selected={[]} onToggle={add} pending={pending} size="default" />;
}
