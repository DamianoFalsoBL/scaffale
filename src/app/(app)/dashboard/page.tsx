import { BookOpen, Film, Search, Tv } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EntryCard } from '@/components/library-views';
import { Shelf } from '@/components/shelf';
import { Button } from '@/components/ui/button';
import { greeting } from '@/lib/format';
import type { LibraryEntry } from '@/lib/library/model';
import { getLibrary } from '@/lib/library/queries';
import { buildDashboard, type DashboardData } from '@/lib/library/views';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const COMPLETED_TILES = [
  { type: 'movie', label: 'Film visti', icon: Film, color: 'text-movie' },
  { type: 'tv', label: 'Serie completate', icon: Tv, color: 'text-tv' },
  { type: 'book', label: 'Libri letti', icon: BookOpen, color: 'text-book' },
] as const;

function Section({
  title,
  href,
  entries,
  total,
  empty,
  large,
}: {
  title: string;
  href: string;
  entries: LibraryEntry[];
  total: number;
  empty: string;
  large?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-label={title}>
        <h2 className="border-b pb-2 text-xl font-semibold">{title}</h2>
        <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      </section>
    );
  }

  return (
    <Shelf title={title} href={href} count={total}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={
            large ? 'w-40 shrink-0 snap-start sm:w-48' : 'w-36 shrink-0 snap-start sm:w-40'
          }
        >
          <EntryCard entry={entry} />
        </div>
      ))}
    </Shelf>
  );
}

function CompletedByYear({ rows }: { rows: DashboardData['completedByYear'] }) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b pb-2 text-xl font-semibold">Completati per anno</h2>
      <table className="w-full text-sm">
        <caption className="sr-only">Titoli completati per anno, divisi per tipo</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Anno</th>
            <th scope="col">Totale</th>
            <th scope="col">Dettaglio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const detail = [
              row.movie && `${row.movie} film`,
              row.tv && `${row.tv} serie`,
              row.book && `${row.book} ${row.book === 1 ? 'libro' : 'libri'}`,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <tr key={row.year} className="align-middle" title={detail}>
                <th scope="row" className="w-14 py-1.5 pr-3 text-left font-medium tabular-nums">
                  {row.year}
                </th>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 rounded-r bg-primary"
                      style={{ width: `${Math.max((row.total / max) * 100, 2)}%` }}
                      aria-hidden
                    />
                    <span className="font-medium tabular-nums">{row.total}</span>
                  </div>
                </td>
                <td className="hidden py-1.5 pl-3 text-right text-muted-foreground sm:table-cell">
                  {detail}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function summary({
  inProgress,
  onHold,
  planned,
}: {
  inProgress: number;
  onHold: number;
  planned: number;
}) {
  const parts = [
    inProgress > 0 && `${inProgress} ${inProgress === 1 ? 'titolo' : 'titoli'} in corso`,
    onHold > 0 && `${onHold} in pausa`,
    planned > 0 && `${planned} da recuperare`,
  ].filter((part): part is string => !!part);
  if (parts.length === 0) return 'Cosa guardi o leggi oggi?';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0];
  return `Hai ${list}.`;
}

export default async function DashboardPage() {
  const entries = await getLibrary();
  const dashboard = buildDashboard(entries);
  const counts = dashboard.totals;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">{greeting()}</h1>
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed bg-card px-6 py-16 text-center">
          <div className="space-y-1">
            <p className="font-heading text-xl font-medium">Benvenuto su Scaffale</p>
            <p className="text-sm text-muted-foreground">
              Inizia cercando un film, una serie o un libro da aggiungere alla tua libreria.
            </p>
          </div>
          <Button asChild>
            <Link href="/search">
              <Search aria-hidden />
              Cerca un titolo
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">{greeting()}</h1>
          <p className="text-muted-foreground">{summary(counts)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {COMPLETED_TILES.map(({ type, label, icon: Icon, color }) => (
            <div
              key={type}
              className="flex flex-col gap-1 rounded-md bg-card p-3 shadow-xs ring-1 ring-foreground/10 sm:p-4"
            >
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <Icon className={`size-4 shrink-0 ${color}`} aria-hidden />
                {label}
              </dt>
              <dd className="font-heading text-3xl font-semibold tabular-nums sm:text-4xl">
                {dashboard.completedByType[type]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Section
        title="In corso"
        href="/library?status=in_progress"
        entries={dashboard.inProgress}
        total={counts.inProgress}
        large
        empty="Niente in corso. Metti una serie o un libro “In corso” per ritrovarlo qui."
      />
      {/* Paused titles get their own shelf only when there are some. */}
      {dashboard.onHold.length > 0 && (
        <Section
          title="In pausa"
          href="/library?status=on_hold"
          entries={dashboard.onHold}
          total={counts.onHold}
          empty=""
        />
      )}
      <Section
        title="Da vedere e da leggere"
        href="/library?status=planned"
        entries={dashboard.planned}
        total={counts.planned}
        empty="La tua lista è vuota. Aggiungi titoli come “Da vedere” o “Da leggere”."
      />
      <Section
        title="Completati di recente"
        href="/library?status=completed"
        entries={dashboard.recentlyCompleted}
        total={counts.completed}
        empty="Quando finisci un titolo lo trovi qui."
      />

      {dashboard.completedByYear.length > 0 && <CompletedByYear rows={dashboard.completedByYear} />}
    </div>
  );
}
