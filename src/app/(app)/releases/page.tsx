import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EntryStatusMenu } from '@/components/entry-status-menu';
import { entryHref } from '@/components/library-views';
import { MediaCard } from '@/components/media-card';
import { ResultCard } from '@/components/result-card';
import { Button } from '@/components/ui/button';
import { libraryIndexOf, markLibraryEntries } from '@/lib/library/matching';
import { todayIso } from '@/lib/library/model';
import { getLibrary } from '@/lib/library/queries';
import { getReleases } from '@/lib/providers';
import {
  addDays,
  formatDay,
  formatWeek,
  groupReleases,
  kindsFor,
  parseReleasesParams,
  RELEASE_KIND_LABELS,
  RELEASE_TYPE_LABELS,
  RELEASE_TYPES,
  releasesHref,
  seasonPremieres,
  weekDays,
  weekStart,
  type ReleaseDay,
  type SeasonPremiere,
} from '@/lib/releases';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Uscite',
};

const chip =
  'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors pointer-coarse:h-10 pointer-coarse:px-4';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

function PremiereCard({ premiere }: { premiere: SeasonPremiere }) {
  const { entry, seasonNumber } = premiere;
  return (
    <MediaCard
      media={{ ...entry.item, note: `Stagione ${seasonNumber} · tua serie` }}
      href={entryHref(entry)}
    >
      <EntryStatusMenu
        entryId={entry.id}
        mediaType={entry.item.mediaType}
        status={entry.status}
        title={entry.item.title}
      />
    </MediaCard>
  );
}

function DaySection({
  day,
  isToday,
  marked,
}: {
  day: ReleaseDay;
  isToday: boolean;
  marked: Map<string, ReturnType<typeof markLibraryEntries>[number]>;
}) {
  const empty = day.premieres.length === 0 && day.titles.length === 0;
  const headingId = `day-${day.day}`;

  return (
    <section
      id={isToday ? 'oggi' : undefined}
      aria-labelledby={headingId}
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <h2 id={headingId} className="flex items-baseline gap-2 border-b pb-2 text-xl font-semibold">
        {formatDay(day.day)}
        {isToday && (
          <span className="rounded-full bg-primary px-2 py-0.5 font-sans text-xs font-medium text-primary-foreground">
            Oggi
          </span>
        )}
        {!empty && (
          <span className="ml-auto font-sans text-sm font-normal text-muted-foreground tabular-nums">
            {day.premieres.length + day.titles.length}
          </span>
        )}
      </h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">Nessuna uscita.</p>
      ) : (
        <div className={GRID}>
          {day.premieres.map((premiere) => (
            <PremiereCard
              key={`${premiere.entry.id}:${premiere.seasonNumber}`}
              premiere={premiere}
            />
          ))}
          {day.titles.map(({ kind, media }) => {
            const key = `${media.source}:${media.mediaType}:${media.externalId}`;
            return (
              <ResultCard
                key={key}
                media={marked.get(key) ?? media}
                note={RELEASE_KIND_LABELS[kind]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function ReleasesPage({ searchParams }: PageProps<'/releases'>) {
  const today = todayIso();
  const params = parseReleasesParams(await searchParams, today);
  const days = weekDays(params.week);
  const isCurrentWeek = params.week === weekStart(today);

  const [library, { batches, incomplete }] = await Promise.all([
    getLibrary(),
    getReleases(days, kindsFor(params.type)),
  ]);

  const premieres = params.type === 'movie' ? [] : seasonPremieres(library, days);
  const grouped = groupReleases(days, batches, premieres);
  const index = libraryIndexOf(library);
  const marked = new Map(
    markLibraryEntries(
      grouped.flatMap((day) => day.titles.map((title) => title.media)),
      index,
    ).map((media) => [`${media.source}:${media.mediaType}:${media.externalId}`, media]),
  );

  const prev = releasesHref({ ...params, week: addDays(params.week, -7) }, today);
  const next = releasesHref({ ...params, week: addDays(params.week, 7) }, today);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Uscite</h1>
            <p className="text-muted-foreground">Settimana {formatWeek(params.week)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon" aria-label="Settimana precedente">
              <Link href={prev}>
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={isCurrentWeek ? '#oggi' : releasesHref({ ...params, week: today }, today)}
              >
                Oggi
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Settimana successiva">
              <Link href={next}>
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <nav aria-label="Tipo">
          <ul className="flex items-center gap-2">
            {RELEASE_TYPES.map((type) => {
              const selected = type === params.type;
              return (
                <li key={type}>
                  <Link
                    href={releasesHref({ ...params, type }, today)}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      chip,
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-accent',
                    )}
                  >
                    {RELEASE_TYPE_LABELS[type]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {incomplete && (
          <p role="status" className="text-sm text-muted-foreground">
            Alcune uscite non sono disponibili ora: riprova più tardi.
          </p>
        )}
      </header>

      {grouped.map((day) => (
        <DaySection
          key={day.day}
          day={day}
          isToday={isCurrentWeek && day.day === today}
          marked={marked}
        />
      ))}

      <p className="text-xs text-muted-foreground">
        Dati da TMDB. Film: data di uscita in Italia (cinema o digitale). Serie: primo episodio,
        solo quelle disponibili in abbonamento su una piattaforma italiana. Le nuove stagioni sono
        quelle delle serie nella tua libreria.
      </p>
    </div>
  );
}
