'use client';

import { ListPlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { deleteList } from '@/actions/lists';
import { ListDialog } from '@/components/list-dialog';
import { Poster } from '@/components/poster';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ListInfo, ListSummary } from '@/lib/library/lists';

function countLabel(count: number) {
  return count === 1 ? '1 titolo' : `${count} titoli`;
}

export function ListManager({ lists }: { lists: ListSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ListInfo>();
  const [pending, startTransition] = useTransition();

  function remove(list: ListSummary) {
    startTransition(async () => {
      const result = await deleteList(list.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Lista “${list.name}” eliminata`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-start" onClick={() => setCreating(true)}>
        <ListPlus aria-hidden />
        Nuova lista
      </Button>

      {lists.length === 0 ? (
        <p className="rounded-md border border-dashed bg-card px-6 py-12 text-center text-muted-foreground">
          Nessuna lista per ora. Creane una, poi aggiungi i titoli dalla loro scheda.
        </p>
      ) : (
        <ul
          className="divide-y rounded-md bg-card shadow-xs ring-1 ring-foreground/10"
          aria-busy={pending}
        >
          {lists.map((list) => (
            <li key={list.id} className="flex items-center gap-3 p-3">
              <Link
                href={`/library?list=${list.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex w-20 shrink-0 -space-x-6" aria-hidden>
                  {list.posters.length > 0 ? (
                    list.posters.map((poster, i) => (
                      <Poster
                        key={i}
                        src={poster.posterUrl ?? undefined}
                        alt=""
                        mediaType={poster.mediaType}
                        sizes="40px"
                        className="w-10 shadow-sm ring-2 ring-card"
                      />
                    ))
                  ) : (
                    <div className="aspect-2/3 w-10 rounded-sm border border-dashed" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{list.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[countLabel(list.count), list.description].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Modifica ${list.name}`}
                onClick={() => setEditing(list)}
              >
                <Pencil aria-hidden />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Elimina ${list.name}`}>
                    <Trash2 aria-hidden />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare “{list.name}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      I titoli restano nella libreria, con stato, voto e note: sparisce solo la
                      lista.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => remove(list)}>
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <ListDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(list) => {
          toast.success(`Lista “${list.name}” creata`);
          router.refresh();
        }}
      />
      <ListDialog
        key={editing?.id}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(undefined)}
        list={editing}
        onSaved={() => {
          toast.success('Lista aggiornata');
          router.refresh();
        }}
      />
    </div>
  );
}
