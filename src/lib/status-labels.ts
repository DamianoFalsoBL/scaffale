import type { MediaType } from '@/lib/providers/types';
import type { Enums } from '@/lib/supabase/database.types';

export type EntryStatus = Enums<'entry_status'>;

/** Display order: the natural progression of a title. */
export const ENTRY_STATUSES = [
  'planned',
  'in_progress',
  'on_hold',
  'completed',
  'dropped',
] as const satisfies readonly EntryStatus[];

// From the spec's label table. Missing keys = status not available for that type.
const LABELS: Record<MediaType, Partial<Record<EntryStatus, string>>> = {
  movie: { planned: 'Da vedere', completed: 'Visto', dropped: 'Abbandonato' },
  tv: {
    planned: 'Da vedere',
    in_progress: 'In corso',
    on_hold: 'In pausa',
    completed: 'Completata',
    dropped: 'Abbandonata',
  },
  book: {
    planned: 'Da leggere',
    in_progress: 'In lettura',
    on_hold: 'In pausa',
    completed: 'Letto',
    dropped: 'Abbandonato',
  },
};

/** Labels for lists that mix media types (filters, dashboard). */
export const GENERIC_STATUS_LABELS: Record<EntryStatus, string> = {
  planned: 'Da vedere/leggere',
  in_progress: 'In corso',
  on_hold: 'In pausa',
  completed: 'Completati',
  dropped: 'Abbandonati',
};

export function allowedStatuses(type: MediaType): EntryStatus[] {
  return ENTRY_STATUSES.filter((status) => status in LABELS[type]);
}

export function isStatusAllowed(type: MediaType, status: EntryStatus) {
  return status in LABELS[type];
}

export function statusLabel(type: MediaType, status: EntryStatus) {
  return LABELS[type][status] ?? GENERIC_STATUS_LABELS[status];
}
