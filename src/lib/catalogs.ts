import type { MediaType } from '@/lib/providers/types';

/**
 * Our own genre list, mapped to TMDB genre ids (movie and tv lists differ) and to a
 * Google Books subject. Ids verified on /genre/movie/list and /genre/tv/list (it-IT).
 */
export const GENRES = [
  { slug: 'azione', label: 'Azione', movie: [28], tv: [10759] },
  { slug: 'avventura', label: 'Avventura', movie: [12], tv: [10759] },
  { slug: 'animazione', label: 'Animazione', movie: [16], tv: [16] },
  { slug: 'biografia', label: 'Biografie', movie: [], tv: [], book: 'biography' },
  { slug: 'commedia', label: 'Commedia', movie: [35], tv: [35], book: 'humor' },
  { slug: 'crime', label: 'Crime', movie: [80], tv: [80], book: 'crime' },
  { slug: 'documentario', label: 'Documentario', movie: [99], tv: [99] },
  { slug: 'dramma', label: 'Dramma', movie: [18], tv: [18] },
  { slug: 'famiglia', label: 'Famiglia', movie: [10751], tv: [10751] },
  {
    slug: 'fantascienza',
    label: 'Fantascienza',
    movie: [878],
    tv: [10765],
    book: 'science fiction',
  },
  { slug: 'fantasy', label: 'Fantasy', movie: [14], tv: [10765], book: 'fantasy' },
  { slug: 'guerra', label: 'Guerra', movie: [10752], tv: [10768] },
  { slug: 'horror', label: 'Horror', movie: [27], tv: [], book: 'horror' },
  { slug: 'mistero', label: 'Mistero e gialli', movie: [9648], tv: [9648], book: 'mystery' },
  { slug: 'musica', label: 'Musica', movie: [10402], tv: [] },
  { slug: 'reality', label: 'Reality', movie: [], tv: [10764] },
  { slug: 'romantico', label: 'Romantico', movie: [10749], tv: [], book: 'romance' },
  { slug: 'storia', label: 'Storia', movie: [36], tv: [], book: 'history' },
  { slug: 'thriller', label: 'Thriller', movie: [53], tv: [], book: 'thriller' },
  { slug: 'western', label: 'Western', movie: [37], tv: [37], book: 'western' },
] as const satisfies readonly {
  slug: string;
  label: string;
  movie: readonly number[];
  tv: readonly number[];
  book?: string;
}[];

export type Genre = (typeof GENRES)[number];
export type GenreSlug = Genre['slug'];
export const GENRE_SLUGS = GENRES.map((genre) => genre.slug) as [GenreSlug, ...GenreSlug[]];

export function findGenre(slug: string | undefined): Genre | undefined {
  return GENRES.find((genre) => genre.slug === slug);
}

export function genreTmdbIds(genre: Genre, type: 'movie' | 'tv'): readonly number[] {
  return genre[type];
}

export function genreBookSubject(genre: Genre): string | undefined {
  return 'book' in genre ? genre.book : undefined;
}

/** Genres that make sense for a search filter ("all" = movies or series). */
export function genresFor(type: MediaType | 'all' | 'person'): Genre[] {
  switch (type) {
    case 'movie':
    case 'tv':
      return GENRES.filter((genre) => genre[type].length > 0);
    case 'book':
      return GENRES.filter((genre) => genreBookSubject(genre));
    case 'all':
      return GENRES.filter((genre) => genre.movie.length + genre.tv.length > 0);
    case 'person':
      return [];
  }
}

/**
 * Main streaming services in Italy, with TMDB provider ids verified on
 * /watch/providers/{movie,tv}?watch_region=IT. `aliases`: the same subscription sold
 * another way (with ads, through an Amazon/Apple channel); used when matching a title's
 * availability, while Discover filters on the main id.
 */
export const WATCH_PROVIDERS = [
  { slug: 'netflix', label: 'Netflix', id: 8, aliases: [] },
  { slug: 'prime', label: 'Prime Video', id: 119, aliases: [2100] },
  { slug: 'disney', label: 'Disney+', id: 337, aliases: [] },
  { slug: 'apple', label: 'Apple TV', id: 350, aliases: [2243] },
  { slug: 'now', label: 'NOW', id: 39, aliases: [] },
  { slug: 'sky', label: 'Sky Go', id: 29, aliases: [] },
  { slug: 'paramount', label: 'Paramount+', id: 531, aliases: [582, 1853] },
  { slug: 'raiplay', label: 'RaiPlay', id: 222, aliases: [] },
  { slug: 'infinity', label: 'Mediaset Infinity', id: 359, aliases: [110] },
  { slug: 'timvision', label: 'TIMvision', id: 109, aliases: [] },
] as const satisfies readonly {
  slug: string;
  label: string;
  id: number;
  aliases: readonly number[];
}[];

export type WatchProviderSlug = (typeof WATCH_PROVIDERS)[number]['slug'];
export const WATCH_PROVIDER_SLUGS = WATCH_PROVIDERS.map((p) => p.slug) as [
  WatchProviderSlug,
  ...WatchProviderSlug[],
];

export function findWatchProvider(slug: string | undefined) {
  return WATCH_PROVIDERS.find((provider) => provider.slug === slug);
}

/** Every TMDB provider id that counts as this service. */
export function watchProviderIds(slug: WatchProviderSlug): ReadonlySet<number> {
  const provider = findWatchProvider(slug);
  return new Set(provider ? [provider.id, ...provider.aliases] : []);
}
