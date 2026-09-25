import type { MediaProvider, SearchOptions, SearchPage } from './types';

/**
 * Google Books first; Open Library when Google finds nothing or fails
 * (daily quota exhausted, 5xx, timeout).
 */
export async function searchBooks(
  query: string,
  opts: SearchOptions,
  providers: { google?: MediaProvider; openLibrary: MediaProvider },
  onFallback: (reason: unknown) => void = () => {},
): Promise<SearchPage> {
  if (providers.google) {
    try {
      const page = await providers.google.search(query, opts);
      if (page.results.length > 0) {
        return page;
      }
      onFallback('no_results');
    } catch (error) {
      onFallback(error);
    }
  } else {
    onFallback('not_configured');
  }

  return providers.openLibrary.search(query, opts);
}
