import Link from 'next/link';

import { EntryStatusMenu } from '@/components/entry-status-menu';
import { MediaCard } from '@/components/media-card';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/star-rating';
import { formatAuthors, formatDate } from '@/lib/format';
import { parseExtra } from '@/lib/library/extra';
import { todayIso, type LibraryEntry } from '@/lib/library/model';
import { seasonNote, summarizeSeasons } from '@/lib/library/seasons';
import { MEDIA_TYPE_LABELS } from '@/lib/media-labels';

export function authorsOf(entry: LibraryEntry) {
  const authors = entry.item.extra.authors;
  return Array.isArray(authors) ? authors.filter((a): a is string => typeof a === 'string') : [];
}

/** "Stagione 3 di 5" / "Nuova stagione" for series, from the seasons marked as seen. */
export function entryNote(entry: LibraryEntry) {
  if (entry.item.mediaType !== 'tv') return undefined;
  const parsed = parseExtra('tv', entry.item.extra);
  if (parsed.mediaType !== 'tv') return undefined;
  return seasonNote(entry.status, summarizeSeasons(parsed.extra, entry.watchedSeasons, todayIso()));
}

export function entryHref(entry: LibraryEntry) {
  return `/item/${entry.item.id}`;
}

export function EntryCard({ entry, showType }: { entry: LibraryEntry; showType?: boolean }) {
  return (
    <MediaCard
      media={{ ...entry.item, authors: authorsOf(entry), note: entryNote(entry) }}
      href={entryHref(entry)}
      showType={showType}
    >
      <div className="flex flex-wrap items-center gap-2">
        <EntryStatusMenu
          entryId={entry.id}
          mediaType={entry.item.mediaType}
          status={entry.status}
          title={entry.item.title}
        />
        {entry.rating && <RatingStars rating={entry.rating} />}
      </div>
    </MediaCard>
  );
}

export function EntryGrid({ entries }: { entries: LibraryEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

export function EntryList({ entries }: { entries: LibraryEntry[] }) {
  return (
    <ul className="divide-y rounded-md bg-card shadow-xs ring-1 ring-foreground/10">
      {entries.map((entry) => {
        const meta = [
          MEDIA_TYPE_LABELS[entry.item.mediaType],
          entry.item.year,
          formatAuthors(authorsOf(entry)),
          entryNote(entry),
        ].filter(Boolean);
        const finished = formatDate(entry.finishedAt);

        return (
          <li key={entry.id} className="flex items-center gap-3 p-3">
            <Link href={entryHref(entry)} className="w-12 shrink-0" tabIndex={-1} aria-hidden>
              <Poster
                src={entry.item.posterUrl ?? undefined}
                alt=""
                mediaType={entry.item.mediaType}
                sizes="48px"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={entryHref(entry)}
                className="line-clamp-1 font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {entry.item.title}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{meta.join(' · ')}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <EntryStatusMenu
                  entryId={entry.id}
                  mediaType={entry.item.mediaType}
                  status={entry.status}
                  title={entry.item.title}
                />
                {entry.rating && <RatingStars rating={entry.rating} />}
                {finished && (
                  <span className="text-xs text-muted-foreground">Finito il {finished}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
