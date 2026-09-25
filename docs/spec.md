# Progetto "Scaffale" — Tracker personale di film, serie TV e libri

> Nome provvisorio: sostituiscilo pure. Tutte le decisioni della sezione 12 sono modificabili prima di iniziare.

## 1. Ruolo e obiettivo

Sei un senior full-stack developer esperto di Next.js, TypeScript e Supabase. Il tuo compito è realizzare, **per fasi incrementali**, una web app personale per tenere traccia di:

- **film** visti e da vedere;
- **serie TV** viste, in corso e da vedere (nella fase 2 anche episodio per episodio);
- **libri** letti, in lettura e da leggere.

L'app è per uso personale e **non commerciale**. Il primo utente sono io, ma il modello dati deve essere multi-utente fin dall'inizio: ogni dato personale è legato a `user_id` e protetto da Row Level Security.

## 2. Come devi lavorare

1. **Una fase alla volta** (sezione 9). All'inizio di ogni fase presentami un piano breve: file da creare o modificare, migrazioni, dipendenze. Aspetta la mia conferma prima di scrivere codice.
2. **Non inventare API.** Per Next.js, `@supabase/ssr`, TMDB, Google Books e Open Library verifica sempre la documentazione ufficiale aggiornata: nomi dei campi, endpoint, pattern di autenticazione e convenzioni (per esempio middleware o proxy nelle versioni recenti di Next.js). Se hai un dubbio, dichiaralo.
3. **Usa le versioni stabili più recenti** delle librerie e indicale nel README. Non fissare versioni a memoria.
4. **Alla fine di ogni fase:**
   - fai passare `lint`, `typecheck` e i test;
   - aggiorna `README.md` e `.env.example`;
   - fai un commit con un messaggio convenzionale (`feat:`, `fix:`, `chore:`…).
5. **Se una richiesta è ambigua**, fai una sola domanda mirata e proponi un default.
6. **Lingue:** codice, nomi di variabili, tabelle e commit in **inglese**; interfaccia utente in **italiano**.

## 3. Stack tecnico

| Area          | Scelta                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Framework     | Next.js (App Router), TypeScript in modalità `strict`                                           |
| UI            | Tailwind CSS + shadcn/ui, icone lucide-react, dark mode inclusa                                 |
| Backend/DB    | Supabase: Postgres, Auth, RLS. Client con `@supabase/ssr`                                       |
| Validazione   | Zod su tutti gli input (form, query string, risposte API esterne)                               |
| Data fetching | Server Components + Server Actions; Route Handlers solo dove serve (ricerca, cron)              |
| Test          | Vitest per logica pura e adapter (con fixture JSON delle API); Playwright facoltativo in fase 3 |
| Hosting       | Vercel, con Vercel Cron                                                                         |
| Migrazioni    | Supabase CLI (`supabase/migrations`), niente modifiche manuali dalla dashboard                  |

## 4. API esterne

Tutte le chiamate alle API esterne avvengono **solo lato server**. Le chiavi stanno in variabili d'ambiente **senza** prefisso `NEXT_PUBLIC_`.

### 4.1 TMDB (film e serie) — fonte principale

- Autenticazione con il **Read Access Token v4** nell'header `Authorization: Bearer <token>`.
- Parametri di default: `language=it-IT` e `region=IT`. Se la trama italiana è vuota, ripiega su `en-US`.
- Ricerca: `/search/multi`, **scartando i risultati di tipo `person`**; in alternativa `/search/movie` e `/search/tv` quando c'è il filtro per tipo.
- Dettagli: `/movie/{id}` e `/tv/{id}`, con `append_to_response` per ridurre le chiamate.
- Immagini: ricava il base URL da `/configuration` oppure usa quello documentato (`https://image.tmdb.org/t/p/…`) con dimensioni adeguate (per esempio `w342` per le griglie e `w500` per il dettaglio).
- **Obblighi da rispettare** (verifica i termini aggiornati):
  - attribuzione nel footer con logo TMDB e disclaimer "This product uses the TMDB API but is not endorsed or certified by TMDB". Il logo deve essere meno prominente del brand dell'app e non va alterato;
  - i dati TMDB in cache non devono avere più di **6 mesi** (vedi il refresh in sezione 7);
  - gestisci le risposte **HTTP 429** con retry ed exponential backoff.

### 4.2 Google Books (libri) — fonte principale

- Endpoint `volumes`, con API key.
- Privilegia le edizioni italiane quando esistono, senza però escludere le altre.
- Forza `https` sulle thumbnail, che a volte arrivano in `http`.
- Estrai e salva l'ISBN-13 quando è disponibile.

### 4.3 Open Library (libri) — fallback

- Da usare per le copertine mancanti (`covers.openlibrary.org` tramite ISBN) e come ricerca di riserva se Google Books non restituisce risultati o supera la quota.

### 4.4 Architettura degli adapter

Crea un'interfaccia comune e un adapter per ciascuna fonte:

```ts
type MediaType = 'movie' | 'tv' | 'book';
type Source = 'tmdb' | 'google_books' | 'open_library';

interface NormalizedMedia {
  source: Source;
  externalId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
  genres?: string[];
  extra: Record<string, unknown>; // runtime, number_of_seasons, authors, page_count, isbn13…
}

interface MediaProvider {
  search(query: string, opts?: { type?: MediaType; page?: number }): Promise<NormalizedMedia[]>;
  getDetails(externalId: string, type: MediaType): Promise<NormalizedMedia>;
}
```

Regole per gli adapter:

- Valida con Zod le risposte grezze prima di normalizzarle.
- Mantieni la logica di mapping in funzioni pure, testate con fixture.
- Usa la cache di `fetch` di Next.js: `revalidate` lungo per i dettagli (per esempio 24 ore) e breve per la ricerca.
- Configura `next/image` con i `remotePatterns` per `image.tmdb.org`, `books.google.com` e `covers.openlibrary.org`.

## 5. Modello dati (punto di partenza)

Trasformalo in migrazioni Supabase. Aggiungi indici e trigger `updated_at` dove servono. Proponi eventuali miglioramenti **prima** di applicarli.

```sql
-- Enum
create type media_type as enum ('movie', 'tv', 'book');
create type media_source as enum ('tmdb', 'google_books', 'open_library');
create type entry_status as enum ('planned', 'in_progress', 'completed', 'dropped', 'on_hold');

-- Catalogo condiviso (snapshot minimo dei metadati esterni)
create table media_items (
  id uuid primary key default gen_random_uuid(),
  media_type media_type not null,
  source media_source not null,
  external_id text not null,
  title text not null,
  original_title text,
  year int,
  poster_url text,
  overview text,
  genres text[] default '{}',
  extra jsonb not null default '{}',
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

-- Dati personali dell'utente
create table user_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  status entry_status not null default 'planned',
  rating smallint check (rating between 1 and 10), -- mostrato come 0,5–5 stelle
  started_at date,
  finished_at date,
  times_completed int not null default 0,          -- rewatch / rilettura
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

-- Fase 2: avanzamento episodi delle serie
create table episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  season_number int not null,
  episode_number int not null,
  watched_at timestamptz not null default now(),
  unique (user_id, media_item_id, season_number, episode_number)
);
```

### Etichette di stato nell'interfaccia

| Stato         | Film                | Serie       | Libro       |
| ------------- | ------------------- | ----------- | ----------- |
| `planned`     | Da vedere           | Da vedere   | Da leggere  |
| `in_progress` | — (non disponibile) | In corso    | In lettura  |
| `completed`   | Visto               | Completata  | Letto       |
| `dropped`     | Abbandonato         | Abbandonata | Abbandonato |
| `on_hold`     | —                   | In pausa    | In pausa    |

### Sicurezza e RLS

- **`user_entries` ed `episode_progress`:** RLS attiva, con operazioni consentite solo quando `user_id = auth.uid()`.
- **`media_items`:** RLS attiva e `select` consentita agli utenti autenticati. `insert` e `update` avvengono **solo lato server** con la service role key, tramite upsert su (`source`, `external_id`) nel momento in cui aggiungo un titolo. La service role key non deve mai arrivare al client.
- **Grant della Data API:** verifica sulla documentazione Supabase se i progetti recenti richiedono `grant` espliciti per le tabelle esposte tramite l'API auto-generata, e includili nelle migrazioni se servono.

## 6. Funzionalità

### MVP (fasi 1–3)

1. **Autenticazione:** Supabase Auth con magic link via email. Dopo aver creato il mio account disabilito le registrazioni pubbliche. In più prevedi una allowlist opzionale (`ALLOWED_EMAILS`) controllata lato server.
2. **Ricerca unificata:** un unico campo con filtro Tutti / Film / Serie / Libri, debounce, risultati in griglia con poster, anno e tipo. Pulsante "Aggiungi" con scelta rapida dello stato. Se il titolo è già in libreria, mostra lo stato attuale.
3. **Libreria:** schede per tipo, filtri per stato, ordinamento per data di aggiunta, titolo, voto o anno, ricerca locale e vista a griglia o a lista.
4. **Pagina dettaglio:** metadati (per le serie: stagioni ed episodi; per i libri: autori e pagine), il mio stato, voto, date, conteggio rewatch o riletture, note ed eliminazione dalla libreria.
5. **Dashboard:** sezioni "In corso", "Da vedere/leggere" (ultimi aggiunti) e "Completati di recente", più statistiche base: completati per tipo e per anno.
6. **UX:** interfaccia responsive e mobile-first, dark mode, stati di caricamento con skeleton, empty state, messaggi di errore in italiano e aggiornamenti ottimistici sulle modifiche di stato.

### Fase 2 (dopo l'MVP)

- Tracciamento episodi delle serie: segnare un episodio, un'intera stagione o "fino a qui", con indicazione del prossimo episodio da vedere.
- Piattaforme streaming disponibili in Italia (watch providers di TMDB, rispettando l'attribuzione richiesta per quei dati).
- Tag e liste personalizzate.
- Export dei miei dati in JSON e CSV.
- Import da CSV, per esempio dagli export di Letterboxd e Goodreads, con anteprima e matching manuale dei titoli non riconosciuti.

### Fase 3 (facoltativa)

- PWA installabile.
- Diario con log di ogni visione o lettura (sostituisce `times_completed`).
- Test end-to-end con Playwright.

## 7. Job pianificati (Vercel Cron)

Proteggi entrambe le route con `CRON_SECRET` nell'header `Authorization`.

1. **Keep-alive:** il piano gratuito di Supabase mette in pausa i progetti dopo 7 giorni senza richieste. Crea una route `/api/cron/keepalive` che esegue una query leggera, schedulata almeno ogni 3 giorni.
2. **Refresh dei metadati:** una route `/api/cron/refresh` aggiorna a lotti i `media_items` con `last_synced_at` più vecchio di 5 mesi, così i dati restano sotto il limite di 6 mesi di TMDB. Deve rispettare i rate limit e registrare nei log gli errori senza bloccarsi.

## 8. Struttura suggerita

```
src/
  app/
    (auth)/login/
    (app)/dashboard/  library/  search/  item/[id]/
    api/search/  api/cron/keepalive/  api/cron/refresh/
  components/        # UI (shadcn in components/ui)
  lib/
    providers/       # tmdb.ts, google-books.ts, open-library.ts, types.ts
    supabase/        # client server/browser, admin (service role, server-only)
    validation/      # schemi Zod
    status-labels.ts
  actions/           # Server Actions (add, update, remove entry)
supabase/migrations/
tests/fixtures/      # JSON di esempio delle API
```

Proteggi il modulo admin di Supabase con `import 'server-only'`.

## 9. Fasi di lavoro e criteri di accettazione

| Fase | Contenuto                                                             | Fatto quando…                                                                         |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 0    | Setup repo, lint/format, shadcn, Supabase CLI, `.env.example`, README | `dev`, `lint` e `typecheck` passano; il README spiega il setup da zero                |
| 1    | Migrazioni, RLS, auth con magic link, layout protetto                 | Mi autentico; un altro utente non vede i miei dati (test RLS documentato)             |
| 2    | Adapter TMDB, Google Books e Open Library con test; ricerca unificata | La ricerca restituisce film, serie e libri normalizzati; i test degli adapter passano |
| 3    | Aggiunta in libreria, libreria, dettaglio, dashboard                  | Posso aggiungere, modificare ed eliminare titoli e vedere statistiche base            |
| 4    | Cron, attribuzione TMDB, rifinitura UI, deploy                        | Deploy su Vercel funzionante con dominio personalizzato e cron attivi                 |
| 5+   | Funzionalità di fase 2                                                | Una funzionalità alla volta, ciascuna con il suo piano                                |

## 10. Variabili d'ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # o publishable key, secondo la documentazione Supabase attuale
SUPABASE_SERVICE_ROLE_KEY=            # solo server
TMDB_READ_ACCESS_TOKEN=
GOOGLE_BOOKS_API_KEY=
CRON_SECRET=
ALLOWED_EMAILS=                       # facoltativo, separate da virgola
NEXT_PUBLIC_SITE_URL=
```

## 11. Deploy e dominio

- **Hosting:** Vercel, collegato al repository Git.
- **Dominio:** `media.damianofalso.com` (da confermare). Il DNS è su Cloudflare: record CNAME verso Vercel in modalità **DNS only** (proxy disattivato).
- **Supabase Auth:** aggiungi il dominio di produzione e gli URL di preview di Vercel tra i redirect URL consentiti.

## 12. Decisioni modificabili

- Nome dell'app: "Scaffale".
- Voto su scala 1–10, mostrato come mezze stelle.
- Login solo con magic link.
- Google Books come fonte principale dei libri, Open Library come fallback.
- Uso personale, con registrazioni chiuse.

## 13. Fuori ambito

- Funzionalità social: follower, feed, recensioni pubbliche.
- Qualsiasi uso commerciale o monetizzazione, perché cambierebbe i termini di utilizzo delle API.
- Scraping di siti terzi.

---

**Per iniziare:** leggi tutto il documento, poi rispondimi con:

1. eventuali dubbi o miglioramenti che proponi;
2. il piano dettagliato della **Fase 0**.

Non scrivere codice finché non ho confermato il piano.
