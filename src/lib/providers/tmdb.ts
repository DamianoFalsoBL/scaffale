import { z } from 'zod';

import { fetchJson, nonEmpty, parseItems, yearFromDate, type FetchLike } from './http';
import {
  EMPTY_PAGE,
  type MediaProvider,
  type MediaType,
  type NormalizedMedia,
  type SearchPage,
} from './types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const LANGUAGE = 'it-IT';
const REGION = 'IT';

const SEARCH_REVALIDATE = 600;
const DETAILS_REVALIDATE = 86_400;
const GENRES_REVALIDATE = 604_800;

export type PosterSize = 'w342' | 'w500';

export function tmdbPosterUrl(path: string | null | undefined, size: PosterSize) {
  return path ? `${IMAGE_BASE}/${size}${path}` : undefined;
}

// --- Raw schemas -----------------------------------------------------------

const posterPath = z.string().nullish();
const optionalText = z.string().nullish();
const genreIds = z.array(z.number().int()).optional();

export const tmdbMovieResultSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  original_title: optionalText,
  release_date: optionalText,
  poster_path: posterPath,
  overview: optionalText,
  genre_ids: genreIds,
});

export const tmdbTvResultSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  original_name: optionalText,
  first_air_date: optionalText,
  poster_path: posterPath,
  overview: optionalText,
  genre_ids: genreIds,
});

const multiResultSchema = z.discriminatedUnion('media_type', [
  tmdbMovieResultSchema.extend({ media_type: z.literal('movie') }),
  tmdbTvResultSchema.extend({ media_type: z.literal('tv') }),
]);

const searchResponseSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  results: z.array(z.unknown()),
});

const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
});

const translationsSchema = z
  .object({
    translations: z.array(
      z.object({
        iso_639_1: z.string(),
        iso_3166_1: z.string(),
        data: z.object({ overview: optionalText }).loose(),
      }),
    ),
  })
  .optional();

const detailsBase = {
  id: z.number().int(),
  poster_path: posterPath,
  overview: optionalText,
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  translations: translationsSchema,
};

const personRef = {
  id: z.number().int(),
  name: z.string().min(1),
  profile_path: z.string().nullish(),
};

const castMemberSchema = z.object({
  ...personRef,
  character: optionalText,
  order: z.number().int().optional(),
});
const crewMemberSchema = z.object({ ...personRef, job: z.string() });
const aggregateCastSchema = z.object({
  ...personRef,
  roles: z
    .array(z.object({ character: optionalText, episode_count: z.number().int().optional() }))
    .optional(),
  total_episode_count: z.number().int().optional(),
});

// Credits parse item by item (see parseItems): one odd entry must not hide the others.
const movieCreditsSchema = z
  .object({ cast: z.array(z.unknown()).default([]), crew: z.array(z.unknown()).default([]) })
  .optional();
const aggregateCreditsSchema = z.object({ cast: z.array(z.unknown()).default([]) }).optional();
const createdBySchema = z.array(z.unknown()).optional();

export const tmdbMovieDetailsSchema = z.object({
  ...detailsBase,
  title: z.string().min(1),
  original_title: optionalText,
  release_date: optionalText,
  runtime: z.number().int().nullish(),
  tagline: optionalText,
  credits: movieCreditsSchema,
});

export const tmdbTvDetailsSchema = z.object({
  ...detailsBase,
  created_by: createdBySchema,
  aggregate_credits: aggregateCreditsSchema,
  name: z.string().min(1),
  original_name: optionalText,
  first_air_date: optionalText,
  last_air_date: optionalText,
  status: optionalText,
  number_of_seasons: z.number().int().nullish(),
  number_of_episodes: z.number().int().nullish(),
  episode_run_time: z.array(z.number().int()).optional(),
  seasons: z
    .array(
      z.object({
        season_number: z.number().int(),
        episode_count: z.number().int(),
        name: z.string(),
        air_date: optionalText,
      }),
    )
    .optional(),
});

export type TmdbMovieResult = z.infer<typeof tmdbMovieResultSchema>;
export type TmdbTvResult = z.infer<typeof tmdbTvResultSchema>;
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
export type TmdbTvDetails = z.infer<typeof tmdbTvDetailsSchema>;
export type GenreNames = ReadonlyMap<number, string>;

/** Names kept in the catalog snapshot so the library can be searched by person. */
interface PeopleNames {
  directors: string[];
  cast: string[];
}

export interface TmdbMovieExtra extends PeopleNames {
  runtime?: number;
  tagline?: string;
}

export interface TmdbSeason {
  seasonNumber: number;
  episodeCount: number;
  name: string;
  airDate?: string;
}

export interface TmdbTvExtra extends PeopleNames {
  status?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRuntime?: number;
  lastAirDate?: string;
  seasons: TmdbSeason[];
}

// --- Pure mappers ----------------------------------------------------------

function namesFor(ids: readonly number[] | undefined, genreNames: GenreNames) {
  return (ids ?? []).flatMap((id) => {
    const name = genreNames.get(id);
    return name ? [name] : [];
  });
}

/** An original title equal to the localized one adds nothing. */
function distinct(original: string | null | undefined, title: string) {
  const value = nonEmpty(original);
  return value && value !== title ? value : undefined;
}

export function mapTmdbMovieResult(item: TmdbMovieResult, genreNames: GenreNames): NormalizedMedia {
  return {
    source: 'tmdb',
    externalId: String(item.id),
    mediaType: 'movie',
    title: item.title,
    originalTitle: distinct(item.original_title, item.title),
    year: yearFromDate(item.release_date),
    posterUrl: tmdbPosterUrl(item.poster_path, 'w342'),
    overview: nonEmpty(item.overview),
    genres: namesFor(item.genre_ids, genreNames),
    extra: {},
  };
}

export function mapTmdbTvResult(item: TmdbTvResult, genreNames: GenreNames): NormalizedMedia {
  return {
    source: 'tmdb',
    externalId: String(item.id),
    mediaType: 'tv',
    title: item.name,
    originalTitle: distinct(item.original_name, item.name),
    year: yearFromDate(item.first_air_date),
    posterUrl: tmdbPosterUrl(item.poster_path, 'w342'),
    overview: nonEmpty(item.overview),
    genres: namesFor(item.genre_ids, genreNames),
    extra: {},
  };
}

/** Italian overview, or the English one when TMDB has no Italian translation. */
export function pickOverview(details: TmdbMovieDetails | TmdbTvDetails): string | undefined {
  const english = details.translations?.translations.find(
    (t) => t.iso_639_1 === 'en' && t.iso_3166_1 === 'US',
  );
  return nonEmpty(details.overview) ?? nonEmpty(english?.data.overview);
}

const SNAPSHOT_CAST_SIZE = 5;

function movieDirectors(credits: TmdbMovieDetails['credits']) {
  return parseItems(credits?.crew ?? [], crewMemberSchema).filter((m) => m.job === 'Director');
}

function movieCast(credits: TmdbMovieDetails['credits']) {
  return parseItems(credits?.cast ?? [], castMemberSchema).sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
}

const uniqueNames = (people: readonly { name: string }[]) => [
  ...new Set(people.map((p) => p.name)),
];

export function mapTmdbMovieDetails(details: TmdbMovieDetails): NormalizedMedia {
  const extra: TmdbMovieExtra = {
    runtime: details.runtime || undefined,
    tagline: nonEmpty(details.tagline),
    directors: uniqueNames(movieDirectors(details.credits)),
    cast: uniqueNames(movieCast(details.credits).slice(0, SNAPSHOT_CAST_SIZE)),
  };

  return {
    source: 'tmdb',
    externalId: String(details.id),
    mediaType: 'movie',
    title: details.title,
    originalTitle: distinct(details.original_title, details.title),
    year: yearFromDate(details.release_date),
    posterUrl: tmdbPosterUrl(details.poster_path, 'w500'),
    overview: pickOverview(details),
    genres: details.genres?.map((genre) => genre.name) ?? [],
    extra: { ...extra },
  };
}

export function mapTmdbTvDetails(details: TmdbTvDetails): NormalizedMedia {
  const extra: TmdbTvExtra = {
    directors: uniqueNames(parseItems(details.created_by ?? [], z.object(personRef))),
    cast: uniqueNames(
      parseItems(details.aggregate_credits?.cast ?? [], aggregateCastSchema).slice(
        0,
        SNAPSHOT_CAST_SIZE,
      ),
    ),
    status: nonEmpty(details.status),
    numberOfSeasons: details.number_of_seasons ?? undefined,
    numberOfEpisodes: details.number_of_episodes ?? undefined,
    episodeRuntime: details.episode_run_time?.[0],
    lastAirDate: nonEmpty(details.last_air_date),
    seasons: (details.seasons ?? []).map((season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
      name: season.name,
      airDate: nonEmpty(season.air_date),
    })),
  };

  return {
    source: 'tmdb',
    externalId: String(details.id),
    mediaType: 'tv',
    title: details.name,
    originalTitle: distinct(details.original_name, details.name),
    year: yearFromDate(details.first_air_date),
    posterUrl: tmdbPosterUrl(details.poster_path, 'w500'),
    overview: pickOverview(details),
    genres: details.genres?.map((genre) => genre.name) ?? [],
    extra: { ...extra },
  };
}

// --- Rich details: credits, where to watch, recommendations --------------------

export interface PersonCredit {
  id: number;
  name: string;
  role?: string;
  profileUrl?: string;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoUrl?: string;
}

/** Availability in one country, from JustWatch through TMDB (attribution required). */
export interface WatchProviders {
  link?: string;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  free: WatchProvider[];
}

export interface TitleExtras {
  directors: PersonCredit[];
  cast: PersonCredit[];
  providers: WatchProviders | null;
  recommendations: NormalizedMedia[];
}

export function tmdbProfileUrl(path: string | null | undefined) {
  return path ? `${IMAGE_BASE}/w185${path}` : undefined;
}

export function tmdbLogoUrl(path: string | null | undefined) {
  return path ? `${IMAGE_BASE}/w92${path}` : undefined;
}

const providerSchema = z.object({
  provider_id: z.number().int(),
  provider_name: z.string().min(1),
  logo_path: z.string().nullish(),
  display_priority: z.number().int().optional(),
});

const countryProvidersSchema = z.object({
  link: optionalText,
  flatrate: z.array(z.unknown()).optional(),
  rent: z.array(z.unknown()).optional(),
  buy: z.array(z.unknown()).optional(),
  free: z.array(z.unknown()).optional(),
  ads: z.array(z.unknown()).optional(),
});

export const tmdbRichSchema = z.object({
  credits: movieCreditsSchema,
  aggregate_credits: aggregateCreditsSchema,
  created_by: createdBySchema,
  'watch/providers': z.object({ results: z.record(z.string(), z.unknown()) }).optional(),
  recommendations: z.object({ results: z.array(z.unknown()) }).optional(),
});

export type TmdbRich = z.infer<typeof tmdbRichSchema>;

const RICH_CAST_SIZE = 12;
const RECOMMENDATIONS_SIZE = 12;

function uniqueById<T extends { id: number }>(items: readonly T[]) {
  const seen = new Set<number>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

export function mapWatchProviders(
  raw: TmdbRich['watch/providers'],
  country = REGION,
): WatchProviders | null {
  const entry = countryProvidersSchema.safeParse(raw?.results[country]);
  if (!entry.success) return null;

  const list = (items: unknown[] | undefined) =>
    parseItems(items ?? [], providerSchema)
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
      .map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: tmdbLogoUrl(p.logo_path),
      }));

  const providers: WatchProviders = {
    link: nonEmpty(entry.data.link),
    flatrate: list(entry.data.flatrate),
    rent: list(entry.data.rent),
    buy: list(entry.data.buy),
    free: uniqueById([...list(entry.data.free), ...list(entry.data.ads)]),
  };
  const available =
    providers.flatrate.length +
    providers.rent.length +
    providers.buy.length +
    providers.free.length;
  return available > 0 ? providers : null;
}

export function mapTitleExtras(
  raw: TmdbRich,
  type: 'movie' | 'tv',
  genreNames: GenreNames,
): TitleExtras {
  const directors: PersonCredit[] =
    type === 'movie'
      ? movieDirectors(raw.credits).map((p) => ({
          id: p.id,
          name: p.name,
          role: 'Regia',
          profileUrl: tmdbProfileUrl(p.profile_path),
        }))
      : parseItems(raw.created_by ?? [], z.object(personRef)).map((p) => ({
          id: p.id,
          name: p.name,
          role: 'Ideazione',
          profileUrl: tmdbProfileUrl(p.profile_path),
        }));

  const cast: PersonCredit[] =
    type === 'movie'
      ? movieCast(raw.credits).map((p) => ({
          id: p.id,
          name: p.name,
          role: nonEmpty(p.character),
          profileUrl: tmdbProfileUrl(p.profile_path),
        }))
      : parseItems(raw.aggregate_credits?.cast ?? [], aggregateCastSchema).map((p) => ({
          id: p.id,
          name: p.name,
          role: nonEmpty(p.roles?.[0]?.character),
          profileUrl: tmdbProfileUrl(p.profile_path),
        }));

  const recommendationItems = raw.recommendations?.results ?? [];
  const recommendations =
    type === 'movie'
      ? parseItems(recommendationItems, tmdbMovieResultSchema).map((item) =>
          mapTmdbMovieResult(item, genreNames),
        )
      : parseItems(recommendationItems, tmdbTvResultSchema).map((item) =>
          mapTmdbTvResult(item, genreNames),
        );

  return {
    directors: uniqueById(directors),
    cast: uniqueById(cast).slice(0, RICH_CAST_SIZE),
    providers: mapWatchProviders(raw['watch/providers']),
    recommendations: recommendations.slice(0, RECOMMENDATIONS_SIZE),
  };
}

// --- People ----------------------------------------------------------------

export interface PersonSummary {
  id: number;
  name: string;
  profileUrl?: string;
  department?: string;
  knownFor: string[];
}

/** A title in someone's filmography, with their role (character or job). */
export type CreditItem = NormalizedMedia & { role?: string };

export interface PersonDetails {
  id: number;
  name: string;
  profileUrl?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  department?: string;
  directing: CreditItem[];
  acting: CreditItem[];
}

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Recitazione',
  Directing: 'Regia',
  Writing: 'Sceneggiatura',
  Production: 'Produzione',
  Sound: 'Musica e suono',
  Camera: 'Fotografia',
  Editing: 'Montaggio',
  Creator: 'Ideazione',
};

export function departmentLabel(department: string | null | undefined) {
  const value = nonEmpty(department);
  return value ? (DEPARTMENT_LABELS[value] ?? value) : undefined;
}

const personSearchResultSchema = z.object({
  ...personRef,
  known_for_department: optionalText,
  known_for: z.array(z.object({ title: optionalText, name: optionalText })).optional(),
});

export function mapPersonSummary(person: z.infer<typeof personSearchResultSchema>): PersonSummary {
  return {
    id: person.id,
    name: person.name,
    profileUrl: tmdbProfileUrl(person.profile_path),
    department: departmentLabel(person.known_for_department),
    knownFor: (person.known_for ?? [])
      .map((work) => nonEmpty(work.title) ?? nonEmpty(work.name))
      .filter((title): title is string => !!title)
      .slice(0, 3),
  };
}

const creditRole = { character: optionalText, job: optionalText };
const personCreditSchema = z.discriminatedUnion('media_type', [
  tmdbMovieResultSchema.extend({ media_type: z.literal('movie'), ...creditRole }),
  tmdbTvResultSchema.extend({ media_type: z.literal('tv'), ...creditRole }),
]);

export const tmdbPersonSchema = z.object({
  ...personRef,
  biography: optionalText,
  birthday: optionalText,
  deathday: optionalText,
  place_of_birth: optionalText,
  known_for_department: optionalText,
  combined_credits: z.object({
    cast: z.array(z.unknown()).default([]),
    crew: z.array(z.unknown()).default([]),
  }),
  translations: z
    .object({
      translations: z.array(
        z.object({
          iso_639_1: z.string(),
          iso_3166_1: z.string(),
          data: z.object({ biography: optionalText }).loose(),
        }),
      ),
    })
    .optional(),
});

export type TmdbPerson = z.infer<typeof tmdbPersonSchema>;

// Interviews, talk shows, news and archive footage are appearances, not roles.
const SELF_ROLE =
  /^(self|himself|herself|themselves|s[eé] stess[oa]|lui stesso|lei stessa)\b|archive footage/i;
const TALK_AND_NEWS_GENRES = new Set([10767, 10763]);
const DIRECTING_JOBS: Record<string, string> = { Director: 'Regia', Creator: 'Ideazione' };

/** Newest first; one entry per title, joining multiple roles. */
function mergeCredits(items: readonly CreditItem[]): CreditItem[] {
  const byKey = new Map<string, CreditItem>();
  for (const item of items) {
    const key = `${item.mediaType}:${item.externalId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
    } else if (item.role && !existing.role?.includes(item.role)) {
      byKey.set(key, { ...existing, role: [existing.role, item.role].filter(Boolean).join(', ') });
    }
  }
  return [...byKey.values()].sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
}

export function mapPerson(raw: TmdbPerson, genreNames: GenreNames): PersonDetails {
  const toItem = (credit: z.infer<typeof personCreditSchema>, role?: string): CreditItem => ({
    ...(credit.media_type === 'movie'
      ? mapTmdbMovieResult(credit, genreNames)
      : mapTmdbTvResult(credit, genreNames)),
    role,
  });

  const acting = parseItems(raw.combined_credits.cast, personCreditSchema)
    .filter(
      (credit) =>
        !SELF_ROLE.test(credit.character?.trim() ?? '') &&
        !(credit.genre_ids ?? []).some((id) => TALK_AND_NEWS_GENRES.has(id)),
    )
    .map((credit) => toItem(credit, nonEmpty(credit.character)));

  const directing = parseItems(raw.combined_credits.crew, personCreditSchema)
    .filter((credit) => credit.job && credit.job in DIRECTING_JOBS)
    .map((credit) => toItem(credit, DIRECTING_JOBS[credit.job!]));

  const english = raw.translations?.translations.find((t) => t.iso_639_1 === 'en');

  return {
    id: raw.id,
    name: raw.name,
    profileUrl: tmdbProfileUrl(raw.profile_path),
    biography: nonEmpty(raw.biography) ?? nonEmpty(english?.data.biography),
    birthday: nonEmpty(raw.birthday),
    deathday: nonEmpty(raw.deathday),
    placeOfBirth: nonEmpty(raw.place_of_birth),
    department: departmentLabel(raw.known_for_department),
    directing: mergeCredits(directing),
    acting: mergeCredits(acting),
  };
}

// --- Provider --------------------------------------------------------------

export function createTmdbProvider({
  accessToken,
  fetchImpl,
}: {
  accessToken: string;
  fetchImpl?: FetchLike;
}) {
  const request = <T>(
    path: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
    revalidate: number,
  ) =>
    fetchJson(`${API_BASE}${path}?${new URLSearchParams({ language: LANGUAGE, ...params })}`, {
      source: 'tmdb',
      schema,
      revalidate,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      fetchImpl,
    });

  async function genreNames(): Promise<GenreNames> {
    const [movie, tv] = await Promise.all([
      request('/genre/movie/list', {}, genreListSchema, GENRES_REVALIDATE),
      request('/genre/tv/list', {}, genreListSchema, GENRES_REVALIDATE),
    ]);
    return new Map([...movie.genres, ...tv.genres].map((genre) => [genre.id, genre.name]));
  }

  async function searchEndpoint(query: string, type: MediaType | undefined, page: number) {
    const params = { query, page: String(page), include_adult: 'false' };

    if (type === 'movie') {
      return request(
        '/search/movie',
        { ...params, region: REGION },
        searchResponseSchema,
        SEARCH_REVALIDATE,
      );
    }
    if (type === 'tv') {
      return request('/search/tv', params, searchResponseSchema, SEARCH_REVALIDATE);
    }
    return request('/search/multi', params, searchResponseSchema, SEARCH_REVALIDATE);
  }

  const provider = {
    async search(query, { type, page = 1 } = {}): Promise<SearchPage> {
      if (type === 'book') {
        return EMPTY_PAGE(page);
      }

      const [data, genres] = await Promise.all([searchEndpoint(query, type, page), genreNames()]);

      let results: NormalizedMedia[];
      if (type === 'movie') {
        results = parseItems(data.results, tmdbMovieResultSchema).map((item) =>
          mapTmdbMovieResult(item, genres),
        );
      } else if (type === 'tv') {
        results = parseItems(data.results, tmdbTvResultSchema).map((item) =>
          mapTmdbTvResult(item, genres),
        );
      } else {
        // People (media_type "person") fail the union and are dropped here.
        results = parseItems(data.results, multiResultSchema).map((item) =>
          item.media_type === 'movie'
            ? mapTmdbMovieResult(item, genres)
            : mapTmdbTvResult(item, genres),
        );
      }

      return { results, page, hasMore: data.page < data.total_pages };
    },

    async getDetails(externalId, type) {
      if (!/^\d+$/.test(externalId)) {
        throw new Error(`Invalid TMDB id: ${externalId}`);
      }

      // Translations carry the English overview used when the Italian one is missing;
      // credits give the director/cast names kept in the catalog snapshot.
      if (type === 'movie') {
        return mapTmdbMovieDetails(
          await request(
            `/movie/${externalId}`,
            { append_to_response: 'translations,credits' },
            tmdbMovieDetailsSchema,
            DETAILS_REVALIDATE,
          ),
        );
      }
      if (type === 'tv') {
        return mapTmdbTvDetails(
          await request(
            `/tv/${externalId}`,
            { append_to_response: 'translations,aggregate_credits' },
            tmdbTvDetailsSchema,
            DETAILS_REVALIDATE,
          ),
        );
      }
      throw new Error(`TMDB has no ${type} details`);
    },
  } satisfies MediaProvider;

  return {
    ...provider,

    /** Cast, directors, where to watch in Italy and recommendations (one request). */
    async getExtras(externalId: string, type: 'movie' | 'tv'): Promise<TitleExtras> {
      if (!/^\d+$/.test(externalId)) {
        throw new Error(`Invalid TMDB id: ${externalId}`);
      }
      const credits = type === 'movie' ? 'credits' : 'aggregate_credits';
      const [raw, genres] = await Promise.all([
        request(
          `/${type}/${externalId}`,
          { append_to_response: `${credits},watch/providers,recommendations` },
          tmdbRichSchema,
          DETAILS_REVALIDATE,
        ),
        genreNames(),
      ]);
      return mapTitleExtras(raw, type, genres);
    },

    async searchPeople(query: string, page = 1) {
      const data = await request(
        '/search/person',
        { query, page: String(page), include_adult: 'false' },
        searchResponseSchema,
        SEARCH_REVALIDATE,
      );
      return {
        people: parseItems(data.results, personSearchResultSchema).map(mapPersonSummary),
        page,
        hasMore: data.page < data.total_pages,
      };
    },

    async getPerson(id: number): Promise<PersonDetails> {
      const [raw, genres] = await Promise.all([
        request(
          `/person/${id}`,
          { append_to_response: 'combined_credits,translations' },
          tmdbPersonSchema,
          DETAILS_REVALIDATE,
        ),
        genreNames(),
      ]);
      return mapPerson(raw, genres);
    },
  };
}
