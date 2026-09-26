import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { BackLink } from '@/components/back-link';
import { ExpandableGrid } from '@/components/expandable-grid';
import { PersonAvatar } from '@/components/person-card';
import { ResultCard } from '@/components/result-card';
import { formatDate } from '@/lib/format';
import { markLibraryEntries } from '@/lib/library/matching';
import { getLibraryIndex } from '@/lib/library/queries';
import { getPerson, type CreditItem } from '@/lib/providers';
import { ProviderError } from '@/lib/providers/http';

const loadPerson = cache(async (rawId: string) => {
  if (!/^\d{1,10}$/.test(rawId)) return null;
  try {
    return await getPerson(Number(rawId));
  } catch (error) {
    if (error instanceof ProviderError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
});

export async function generateMetadata({ params }: PageProps<'/person/[id]'>): Promise<Metadata> {
  const person = await loadPerson((await params).id);
  return { title: person?.name ?? 'Persona non trovata' };
}

function lifeDates(birthday?: string, deathday?: string) {
  const born = formatDate(birthday);
  const died = formatDate(deathday);
  if (born && died) return `${born} – ${died}`;
  return born ? `Nato/a il ${born}` : undefined;
}

function CreditsSection({
  title,
  credits,
  index,
}: {
  title: string;
  credits: CreditItem[];
  index: Awaited<ReturnType<typeof getLibraryIndex>>;
}) {
  if (credits.length === 0) return null;
  const marked = markLibraryEntries(credits, index);

  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="border-b pb-2 text-xl font-semibold">
        {title}
        <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground tabular-nums">
          {credits.length}
        </span>
      </h2>
      <ExpandableGrid
        items={marked.map((media, i) => (
          <ResultCard
            key={`${media.mediaType}:${media.externalId}`}
            media={media}
            note={credits[i]?.role}
          />
        ))}
      />
    </section>
  );
}

export default async function PersonPage({ params }: PageProps<'/person/[id]'>) {
  const [person, index] = await Promise.all([loadPerson((await params).id), getLibraryIndex()]);
  if (!person) notFound();

  const facts = [
    person.department,
    lifeDates(person.birthday, person.deathday),
    person.placeOfBirth,
  ]
    .filter(Boolean)
    .join(' · ');
  // Show first what the person is known for.
  const sections = [
    { title: 'Regia', credits: person.directing },
    { title: 'Recitazione', credits: person.acting },
  ];
  if (person.department === 'Recitazione') sections.reverse();

  return (
    <div className="flex flex-col gap-8">
      <BackLink fallback="/search?type=person" label="Indietro" />

      <div className="grid gap-6 sm:grid-cols-[160px_1fr] md:grid-cols-[200px_1fr]">
        <PersonAvatar
          name={person.name}
          profileUrl={person.profileUrl}
          className="w-40 sm:w-full"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">{person.name}</h1>
          {facts && <p className="text-sm text-muted-foreground">{facts}</p>}
          {person.biography ? (
            <details className="group">
              <summary className="cursor-pointer list-none">
                <p className="line-clamp-6 leading-relaxed whitespace-pre-line group-open:line-clamp-none">
                  {person.biography}
                </p>
                <span className="mt-1 inline-block text-sm text-primary group-open:hidden">
                  Leggi tutto
                </span>
              </summary>
            </details>
          ) : (
            <p className="text-muted-foreground">Nessuna biografia disponibile.</p>
          )}
        </div>
      </div>

      {sections.map((section) => (
        <CreditsSection key={section.title} {...section} index={index} />
      ))}

      <p className="text-xs text-muted-foreground">Dati da TMDB.</p>
    </div>
  );
}
