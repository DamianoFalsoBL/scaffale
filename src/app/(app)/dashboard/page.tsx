import { BookOpen, Film, Search, Tv } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EntryCard } from '@/components/library-views';
import { Button } from '@/components/ui/button';
import type { LibraryEntry } from '@/lib/library/model';
import { getLibrary } from '@/lib/library/queries';
import { buildDashboard, type DashboardData } from '@/lib/library/views';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const COMPLETED_TILES = [
  { type: 'movie', label: 'Film visti', icon: Film },
  { type: 'tv', label: 'Serie completate', icon: Tv },
  { type: 'book', label: 'Libri letti', icon: BookOpen },
] as const;

function Section({
  title,
  href,
  entries,
  empty,
}: {
  title: string;
  href: string;
  entries: LibraryEntry[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {entries.length > 0 && (
          <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
            Vedi tutti
          </Link>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        // Horizontal shelf; each card keeps the grid card width.
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          {entries.map((entry) => (
            <div key={entry.id} className="w-36 shrink-0 snap-start sm:w-40">
              <EntryCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CompletedByYear({ rows }: { rows: DashboardData['completedByYear'] }) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Completati per anno</h2>
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

export default async function DashboardPage() {
  const entries = await getLibrary();
  const dashboard = buildDashboard(entries);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="space-y-1">
            <p className="font-medium">Benvenuto su Scaffale</p>
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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <dl className="grid grid-cols-3 gap-3">
          {COMPLETED_TILES.map(({ type, label, icon: Icon }) => (
            <div key={type} className="flex flex-col gap-1 rounded-lg border p-3 sm:p-4">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">
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
        empty="Niente in corso. Metti una serie o un libro “In corso” per ritrovarlo qui."
      />
      <Section
        title="Da vedere e da leggere"
        href="/library?status=planned"
        entries={dashboard.planned}
        empty="La tua lista è vuota. Aggiungi titoli come “Da vedere” o “Da leggere”."
      />
      <Section
        title="Completati di recente"
        href="/library?status=completed"
        entries={dashboard.recentlyCompleted}
        empty="Quando finisci un titolo lo trovi qui."
      />

      {dashboard.completedByYear.length > 0 && <CompletedByYear rows={dashboard.completedByYear} />}
    </div>
  );
}
