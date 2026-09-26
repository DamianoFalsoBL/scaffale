import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { TMDB_DISCLAIMER } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Info e fonti dei dati',
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-4 hover:text-muted-foreground"
    >
      {children}
    </a>
  );
}

// Public page (also reachable from the login screen): it holds no personal data.
export default function InfoPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Scaffale
      </Link>

      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Info e fonti dei dati</h1>
        <p className="leading-relaxed">
          Scaffale è un tracker personale di film, serie TV e libri: cosa ho visto, cosa sto
          leggendo, cosa voglio recuperare.
        </p>
        <p className="leading-relaxed">
          È un progetto privato e <strong>non commerciale</strong>: niente pubblicità, niente
          tracciamento.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Fonti dei dati</h2>

        <div className="space-y-3 rounded-lg border p-4">
          <Image
            src="/brand/tmdb-logo.svg"
            alt="The Movie Database (TMDB)"
            width={185}
            height={24}
            className="h-6 w-auto"
          />
          <p className="leading-relaxed">
            Titoli, trame, poster, generi, stagioni ed episodi di film e serie TV provengono da{' '}
            <ExternalLink href="https://www.themoviedb.org/">
              The Movie Database (TMDB)
            </ExternalLink>
            .
          </p>
          <p className="text-sm text-muted-foreground" lang="en">
            {TMDB_DISCLAIMER}
          </p>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <p className="leading-relaxed">
            I dati dei libri provengono da{' '}
            <ExternalLink href="https://books.google.com/">Google Books</ExternalLink> e, quando non
            sono disponibili, da{' '}
            <ExternalLink href="https://openlibrary.org/">Open Library</ExternalLink>, che fornisce
            anche parte delle copertine.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Ogni scheda indica la fonte da cui arrivano i suoi dati. Le informazioni vengono
          aggiornate periodicamente.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Dati personali</h2>
        <p className="leading-relaxed">
          Stati, voti, date e note sono salvati in un database Supabase nell’Unione Europea e sono
          visibili solo al proprietario dell’account. L’accesso avviene con un link via email, senza
          password.
        </p>
      </section>
    </main>
  );
}
