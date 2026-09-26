'use client';

import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { createList, updateList } from '@/actions/lists';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ListInfo } from '@/lib/library/lists';

/**
 * Create a list, or rename one when `list` is given. Controlled: the caller opens it
 * (from a menu item or a button) and gets the saved list back.
 */
export function ListDialog({
  open,
  onOpenChange,
  list,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: ListInfo;
  onSaved?: (list: ListInfo) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function submit(formData: FormData) {
    const values = {
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
    };
    startTransition(async () => {
      const result = list
        ? await updateList({ listId: list.id, ...values })
        : await createList(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(undefined);
      onOpenChange(false);
      onSaved?.(result.data);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(undefined);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <form action={submit} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{list ? 'Modifica lista' : 'Nuova lista'}</AlertDialogTitle>
            <AlertDialogDescription>
              Per esempio “Da vedere con Anna” o “Classici di fantascienza”.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="list-name">Nome</Label>
            <Input
              id="list-name"
              name="name"
              defaultValue={list?.name}
              maxLength={60}
              required
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? 'list-error' : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="list-description">Descrizione (facoltativa)</Label>
            <Textarea
              id="list-description"
              name="description"
              defaultValue={list?.description ?? ''}
              maxLength={280}
              rows={2}
            />
          </div>

          {error && (
            <p id="list-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Annulla</AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {list ? 'Salva' : 'Crea lista'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
