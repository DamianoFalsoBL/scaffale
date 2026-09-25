'use client';

import { Loader2, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { updateEntry } from '@/actions/library';
import { StatusDot } from '@/components/status-badge';
import { StarRatingInput } from '@/components/star-rating';
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
import { Textarea } from '@/components/ui/textarea';
import { applyStatusDefaults, todayIso } from '@/lib/library/model';
import type { MediaType } from '@/lib/providers/types';
import { allowedStatuses, statusLabel, type EntryStatus } from '@/lib/status-labels';

export interface EntryFormValues {
  status: EntryStatus;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  timesCompleted: number;
  notes: string | null;
}

const COMPLETIONS_LABEL: Record<MediaType, string> = {
  movie: 'Volte visto',
  tv: 'Volte vista',
  book: 'Volte letto',
};

function sameValues(a: EntryFormValues, b: EntryFormValues) {
  return (Object.keys(a) as (keyof EntryFormValues)[]).every(
    (key) => (a[key] ?? '') === (b[key] ?? ''),
  );
}

export function EntryForm({
  entryId,
  mediaType,
  initial,
}: {
  entryId: string;
  mediaType: MediaType;
  initial: EntryFormValues;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const dateError =
    values.startedAt && values.finishedAt && values.finishedAt < values.startedAt
      ? 'La data di fine non può precedere quella di inizio.'
      : undefined;
  const dirty = !sameValues(values, saved);

  function changeStatus(status: EntryStatus) {
    // Same defaults the server applies, so the dates appear before saving.
    setValues((current) => ({
      ...current,
      ...applyStatusDefaults({ ...current, status }, saved.status, todayIso()),
    }));
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (dateError) return;

    startTransition(async () => {
      const result = await updateEntry({ entryId, ...values });
      if (result.ok) {
        setSaved(result.data);
        setValues(result.data);
        toast.success('Modifiche salvate');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Stato</Label>
          <Select value={values.status} onValueChange={(v) => changeStatus(v as EntryStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses(mediaType).map((status) => (
                <SelectItem key={status} value={status}>
                  <StatusDot status={status} />
                  {statusLabel(mediaType, status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">Voto</span>
          <StarRatingInput value={values.rating} onChange={(rating) => set('rating', rating)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="startedAt">Iniziato il</Label>
          <Input
            id="startedAt"
            type="date"
            value={values.startedAt ?? ''}
            onChange={(event) => set('startedAt', event.target.value || null)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="finishedAt">Finito il</Label>
          <Input
            id="finishedAt"
            type="date"
            value={values.finishedAt ?? ''}
            min={values.startedAt ?? undefined}
            onChange={(event) => set('finishedAt', event.target.value || null)}
            aria-invalid={!!dateError}
            aria-describedby={dateError ? 'date-error' : undefined}
          />
          {dateError && (
            <p id="date-error" className="text-sm text-destructive" role="alert">
              {dateError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timesCompleted">{COMPLETIONS_LABEL[mediaType]}</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Diminuisci"
              disabled={values.timesCompleted <= 0}
              onClick={() => set('timesCompleted', Math.max(values.timesCompleted - 1, 0))}
            >
              <Minus />
            </Button>
            <Input
              id="timesCompleted"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              className="w-20 text-center tabular-nums"
              value={values.timesCompleted}
              onChange={(event) =>
                set('timesCompleted', Math.min(Math.max(Number(event.target.value) || 0, 0), 999))
              }
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Aumenta"
              onClick={() => set('timesCompleted', Math.min(values.timesCompleted + 1, 999))}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          rows={4}
          maxLength={5000}
          placeholder="Impressioni, citazioni, chi te l’ha consigliato…"
          value={values.notes ?? ''}
          onChange={(event) => set('notes', event.target.value || null)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!dirty || pending || !!dateError}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salva modifiche
        </Button>
        {dirty && !pending && (
          <Button type="button" variant="ghost" onClick={() => setValues(saved)}>
            Annulla modifiche
          </Button>
        )}
      </div>
    </form>
  );
}
