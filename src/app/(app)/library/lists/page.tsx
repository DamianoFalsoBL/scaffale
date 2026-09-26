import type { Metadata } from 'next';

import { BackLink } from '@/components/back-link';
import { summarizeLists } from '@/lib/library/lists';
import { getLibrary, getLists } from '@/lib/library/queries';

import { ListManager } from './list-manager';

export const metadata: Metadata = {
  title: 'Liste',
};

export default async function ListsPage() {
  const [entries, lists] = await Promise.all([getLibrary(), getLists()]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink fallback="/library" label="Libreria" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Liste</h1>
        <p className="text-muted-foreground">
          Raggruppa i titoli come vuoi. Un titolo può stare in più liste; eliminare una lista non
          toglie i titoli dalla libreria.
        </p>
      </div>
      <ListManager lists={summarizeLists(lists, entries)} />
    </div>
  );
}
