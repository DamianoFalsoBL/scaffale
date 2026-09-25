import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';

import { MediaTypeBadge } from '@/components/media-type-badge';
import { Poster } from '@/components/poster';
import { Badge } from '@/components/ui/badge';
import { formatAuthorName } from '@/lib/format';
import { formatRuntime, parseExtra, tvStatusLabel, type ParsedExtra } from '@/lib/library/extra';
import type { LibraryItem } from '@/lib/library/model';
import { getEntryByMediaItem } from '@/lib/library/queries';

import { EntryForm } from './entry-form';
import { RemoveEntryButton } from './remove-entry-button';

const loadEntry = cache(async (id: string) =>
  z.uuid().safeParse(id).success ? getEntryByMediaItem(id) : null,
);

export async function generateMetadata({ params }: PageProps<'/item/[id]'>): Promise<Metadata> {
  const entry = await loadEntry((await params).id);
  return { title: entry?.item.title ?? 'Titolo non trovato' };
}

const SOURCE_NAMES: Record<LibraryItem['source'], string> = {
  tmdb: 'TMDB',
  google_books: 'Google Books',
  open_library: 'Open Library',
};

function sourceUrl(item: LibraryItem) {
  switch (item.source) {
    case 'tmdb':
      return `https://www.themoviedb.org/${item.mediaType}/${item.externalId}`;
    case 'google_books':
      return `https://books.google.com/books?id=${encodeURIComponent(item.externalId)}`;
    case 'open_library':
      return `https://openlibrary.org/works/${item.externalId}`;
  }
}

function factsFor(item: LibraryItem, parsed: ParsedExtra): string[] {
  const facts: (string | number | null | undefined)[] = [item.year];

  switch (parsed.mediaType) {
    case 'movie':
      facts.push(formatRuntime(parsed.extra.runtime));
      break;
    case 'tv':
      facts.push(
        parsed.extra.numberOfSeasons &&
          `${parsed.extra.numberOfSeasons} ${parsed.extra.numberOfSeasons === 1 ? 'stagione' : 'stagioni'}`,
        parsed.extra.numberOfEpisodes && `${parsed.extra.numberOfEpisodes} episodi`,
        tvStatusLabel(parsed.extra.status),
      );
      break;
    case 'book':
      facts.push(
        parsed.extra.pageCount && `${parsed.extra.pageCount} pagine`,
        parsed.extra.publisher,
        item.isbn13 && `ISBN ${item.isbn13}`,
      );
      break;
  }
  return facts.filter((fact): fact is string | number => !!fact).map(String);
}

export default async function ItemPage({ params }: PageProps<'/item/[id]'>) {
  const entry = await loadEntry((await params).id);
  if (!entry) notFound();

  const { item } = entry;
  const parsed = parseExtra(item.mediaType, item.extra);
  const facts = factsFor(item, parsed);
  const seasons =
    parsed.mediaType === 'tv' ? parsed.extra.seasons.filter((s) => s.seasonNumber > 0) : [];

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Libreria
      </Link>

      <div className="grid gap-6 sm:grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
        <Poster
          src={item.posterUrl ?? undefined}
          alt={`Copertina di ${item.title}`}
          mediaType={item.mediaType}
          sizes="(min-width: 768px) 220px, (min-width: 640px) 180px, 60vw"
          className="w-48 sm:w-full"
        />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-2">
            <MediaTypeBadge mediaType={item.mediaType} />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h1>
            {parsed.mediaType === 'book' && parsed.extra.subtitle && (
              <p className="text-lg text-muted-foreground">{parsed.extra.subtitle}</p>
            )}
            {item.originalTitle && (
              <p className="text-sm text-muted-foreground">
                Titolo originale: {item.originalTitle}
              </p>
            )}
            {parsed.mediaType === 'book' && parsed.extra.authors.length > 0 && (
              <p className="font-medium">{parsed.extra.authors.map(formatAuthorName).join(', ')}</p>
            )}
            {facts.length > 0 && (
              <p className="text-sm text-muted-foreground">{facts.join(' · ')}</p>
            )}
          </div>

          {item.genres.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Generi">
              {item.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="outline">{genre}</Badge>
                </li>
              ))}
            </ul>
          )}

          {parsed.mediaType === 'movie' && parsed.extra.tagline && (
            <p className="text-muted-foreground italic">“{parsed.extra.tagline}”</p>
          )}

          {item.overview ? (
            <p className="leading-relaxed whitespace-pre-line">{item.overview}</p>
          ) : (
            <p className="text-muted-foreground">Nessuna trama disponibile.</p>
          )}

          {seasons.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">Stagioni</h2>
              <ul className="divide-y rounded-lg border text-sm">
                {seasons.map((season) => (
                  <li key={season.seasonNumber} className="flex justify-between gap-4 px-3 py-2">
                    <span>{season.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {season.episodeCount} episodi
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <a
            href={sourceUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
          >
            Dati da {SOURCE_NAMES[item.source]}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">I miei dati</h2>
        <EntryForm
          key={entry.updatedAt}
          entryId={entry.id}
          mediaType={item.mediaType}
          initial={{
            status: entry.status,
            rating: entry.rating,
            startedAt: entry.startedAt,
            finishedAt: entry.finishedAt,
            timesCompleted: entry.timesCompleted,
            notes: entry.notes,
          }}
        />
      </section>

      <div>
        <RemoveEntryButton entryId={entry.id} title={item.title} />
      </div>
    </div>
  );
}
