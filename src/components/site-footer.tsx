import Image from 'next/image';
import Link from 'next/link';

export const TMDB_DISCLAIMER =
  'This product uses the TMDB API but is not endorsed or certified by TMDB.';

/**
 * TMDB attribution required by its API terms: official logo, unaltered and less
 * prominent than the app's own brand, plus the exact disclaimer.
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Scaffale · uso personale, non commerciale ·{' '}
          <Link href="/info" className="underline-offset-4 hover:text-foreground hover:underline">
            Info e fonti dei dati
          </Link>
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Image
              src="/brand/tmdb-logo.svg"
              alt="The Movie Database (TMDB)"
              width={92}
              height={12}
              className="h-3 w-auto"
            />
          </a>
          <p lang="en">{TMDB_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
