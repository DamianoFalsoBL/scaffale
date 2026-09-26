/**
 * The last search, so the "Cerca" tab and "Indietro" bring it back like a native app
 * (per tab/app session: sessionStorage). Browser only; every access is guarded.
 */
const KEY = 'scaffale:last-search';

export function rememberSearch(queryString: string) {
  try {
    sessionStorage.setItem(KEY, queryString);
  } catch {
    // Private mode or storage disabled: the tab just opens an empty search.
  }
}

export function lastSearchHref() {
  try {
    const queryString = sessionStorage.getItem(KEY);
    return queryString ? `/search?${queryString}` : '/search';
  } catch {
    return '/search';
  }
}
