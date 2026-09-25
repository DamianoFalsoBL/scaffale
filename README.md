# Scaffale

Tracker personale di film, serie TV e libri. Uso personale, non commerciale.

Stato: **Fase 2** (adapter TMDB / Google Books / Open Library e ricerca unificata). Specifica completa e fasi in [docs/spec.md](docs/spec.md); convenzioni e decisioni in [CLAUDE.md](CLAUDE.md).

## Stack

| Area          | Scelta                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| Framework     | Next.js (App Router, Turbopack), TypeScript `strict`                       |
| UI            | Tailwind CSS v4, shadcn/ui (Radix, preset Nova), lucide-react, next-themes |
| Backend/DB    | Supabase (Postgres, Auth, RLS) — progetto cloud                            |
| Validazione   | Zod                                                                        |
| Test          | Vitest (solo test runner: l'app è Next.js, non Vite)                       |
| Lint / format | ESLint (flat config di `eslint-config-next`) + Prettier                    |
| Hosting       | Vercel (Fase 4)                                                            |

### Versioni installate (settembre 2026)

| Pacchetto                          | Versione         |
| ---------------------------------- | ---------------- |
| next / eslint-config-next          | 16.3.6           |
| @supabase/ssr / supabase-js        | 0.12.7 / 2.117.1 |
| react / react-dom                  | 19.3.0           |
| typescript                         | 6.0.3            |
| tailwindcss / @tailwindcss/postcss | 4.3.3            |
| shadcn / radix-ui                  | 4.21.0 / 1.6.7   |
| zod                                | 4.6.5            |
| lucide-react                       | 1.48.0           |
| next-themes                        | 0.4.6            |
| vitest / vite                      | 5.0.1 / 8.3.1    |
| eslint                             | 9.39.5           |
| prettier                           | 3.9.9            |
| supabase (CLI)                     | 2.117.0          |
| pnpm                               | 12.6.0           |

Note sulle versioni:

- **TypeScript 6**, non 7: Next.js 16.3 supporta TypeScript 7 solo con il flag `experimental.useTypeScriptCli`. Passeremo alla 7 quando il supporto sarà stabile.
- **ESLint 9**: è la versione scelta dal template di `create-next-app` 16.3.
- pnpm 12 applica una policy di supply chain che evita le release pubblicate da pochissimo. Per questo alcune versioni sono una patch indietro rispetto a `latest`.

## Requisiti

- Node.js **≥ 22.12** (richiesto da Vitest 5; Next.js chiede ≥ 20.9)
- pnpm 12 (vedi `packageManager` in `package.json`)
- Un account [Supabase](https://supabase.com) (piano gratuito)

## Setup da zero

1. **pnpm.** Il corepack incluso in Node 22 non riesce ancora a installare pnpm 12, che è distribuito come binario nativo. Installalo con npm:

   ```bash
   npm install -g pnpm@12
   ```

2. **Dipendenze**

   ```bash
   pnpm install
   ```

3. **Variabili d'ambiente**

   ```bash
   cp .env.example .env.local
   ```

   Dalla Fase 1 servono almeno URL e publishable key di Supabase. La tabella sotto indica da quale fase serve ogni variabile.

4. **Progetto Supabase (cloud).** Il progetto attuale è `scaffale` (ref `wacmcxumcgbpmquqiuos`, region `eu-central-1`, piano free). Per ricrearlo da zero:
   1. Crea un progetto su [supabase.com/dashboard](https://supabase.com/dashboard), con region UE (per esempio `eu-central-1`).
   2. Da _Project Settings → API Keys_ copia la **publishable key** (`sb_publishable_…`) e la **secret key** (`sb_secret_…`) in `.env.local`. Le chiavi legacy `anon` / `service_role` vanno in deprecazione e non le usiamo.
   3. Collega la CLI al progetto. Il project ref è nell'URL della dashboard.

      ```bash
      pnpm exec supabase login
      ```

      ```bash
      pnpm exec supabase link --project-ref <project-ref>
      ```

   4. Applica le migrazioni e la configurazione Auth (redirect URL). Prima di `config push` controlla sempre il diff.

      ```bash
      pnpm db:push
      ```

      ```bash
      pnpm exec supabase config diff
      ```

      ```bash
      pnpm exec supabase config push
      ```

5. **Avvio**

   ```bash
   pnpm dev
   ```

   Poi apri <http://localhost:3000>.

## Variabili d'ambiente

| Variabile                              | Dove          | Da fase | Note                                          |
| -------------------------------------- | ------------- | ------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | client+server | 1       | URL del progetto Supabase                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client+server | 1       | `sb_publishable_…`                            |
| `SUPABASE_SECRET_KEY`                  | solo server   | 3       | `sb_secret_…`, bypassa la RLS: mai nel client |
| `TMDB_READ_ACCESS_TOKEN`               | solo server   | 2       | Read Access Token v4                          |
| `GOOGLE_BOOKS_API_KEY`                 | solo server   | 2       |                                               |
| `CRON_SECRET`                          | solo server   | 4       | Almeno 16 caratteri                           |
| `ALLOWED_EMAILS`                       | solo server   | 1       | Facoltativa, separate da virgola              |
| `NEXT_PUBLIC_SITE_URL`                 | client+server | 0       | Default `http://localhost:3000`               |
| `DNS_IPV4_FIRST`                       | solo server   | —       | Facoltativa, solo sviluppo locale: vedi sotto |

Le variabili vengono validate con Zod in `src/lib/validation/env.ts`. Le usi così:

- `publicEnv` da `@/lib/env`, sia nel client sia nel server;
- `serverEnv` da `@/lib/env.server`, protetto da `server-only`.

## Database e sicurezza

Lo schema sta in [supabase/migrations](supabase/migrations). Le migrazioni sono l'unica fonte di verità: niente modifiche manuali dalla dashboard.

| Tabella            | Contenuto                                  | Accesso (`authenticated`)                        |
| ------------------ | ------------------------------------------ | ------------------------------------------------ |
| `media_items`      | Catalogo condiviso (snapshot dei metadati) | Solo lettura; scrive il server con la secret key |
| `user_entries`     | Stato, voto, date, note dell'utente        | CRUD sulle proprie righe (RLS)                   |
| `episode_progress` | Episodi visti (Fase 2)                     | CRUD sulle proprie righe (RLS)                   |

- **RLS** attiva su tutte le tabelle; `anon` non ha nessun permesso.
- **Grant espliciti** nella migrazione: da ottobre 2026 Supabase non espone più le tabelle alla Data API in automatico.
- Vincoli a DB: voto 1–10, `finished_at >= started_at`, niente stato `in_progress`/`on_hold` per i film (trigger), ISBN-13 univoco tra fonti diverse.

### Test RLS

[supabase/tests/rls_isolation.sql](supabase/tests/rls_isolation.sql) crea due utenti di prova in una transazione e verifica che:

- l'utente B non legga, modifichi o cancelli le righe dell'utente A, né ne crei a suo nome;
- gli utenti non possano modificare `media_items`;
- `anon` non possa leggere nulla;
- un film non possa essere `in_progress`.

Lo script termina con `ROLLBACK`, quindi non lascia dati. Per eseguirlo, incollalo nel SQL editor della dashboard: se stampa `RLS isolation: all checks passed` è tutto ok, altrimenti l'errore dice quale controllo è fallito. Ultima esecuzione: 25/09/2026, superato.

## Autenticazione

- Login solo con **magic link** (`/login`). Il link porta a `/auth/confirm`, che crea la sessione e rimanda a `/dashboard`.
- `src/proxy.ts` rinnova la sessione a ogni richiesta e manda a `/login` chi non è autenticato. Il layout `(app)` ricontrolla la sessione e applica `ALLOWED_EMAILS`.
- Il form risponde sempre "controlla la tua email", anche per indirizzi non autorizzati, così non rivela quali account esistono.
- **Registrazioni chiuse** su Supabase (`[auth] enable_signup = false` in `supabase/config.toml`; attenzione: `[auth.email] enable_signup` deve restare `true`, altrimenti si spegne tutto il login via email), attive dal 25/09/2026 dopo la creazione del primo account. Verifica: una chiamata diretta a `POST /auth/v1/signup` con la publishable key risponde `422 signup_disabled`.
- Per aggiungere un altro utente: aggiungi l'email ad `ALLOWED_EMAILS`, riapri temporaneamente le registrazioni (`[auth] enable_signup = true`, diff + push), fai il primo accesso e poi richiudile.
- Sul piano free con l'SMTP integrato di Supabase:
  - i template email non si possono personalizzare, quindi l'email è in inglese;
  - il link usa il flusso PKCE (`?code=`) e va aperto **nello stesso browser** in cui l'hai richiesto (per esempio non nel browser integrato di Claude se Gmail apre i link in Chrome). Se succede, la pagina di login lo spiega;
  - l'SMTP integrato invia solo agli indirizzi dei membri dell'organizzazione Supabase, con pochi invii all'ora.

  Con un SMTP personalizzato (valutazione in Fase 4) si potrà usare un template con `token_hash`, già supportato da `/auth/confirm`, che funziona su qualsiasi dispositivo.

## Ricerca e fonti esterne

Tutte le chiamate alle API esterne partono **solo dal server** (`src/lib/providers/`) e ogni risposta viene validata con Zod. Se un singolo risultato non rispetta lo schema viene scartato, senza far fallire la pagina.

| Fonte            | Uso                      | Dettagli                                                                                                                                                                                             |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TMDB**         | Film e serie             | `it-IT`, `region=IT` sui film; `/search/multi` senza persone; dettagli con `append_to_response=translations` per ripiegare sulla trama `en-US`; generi tradotti con `/genre/*/list` (cache 7 giorni) |
| **Google Books** | Libri (fonte principale) | Due ricerche in parallelo (`langRestrict=it` + senza filtro), prima le edizioni italiane, niente doppioni per id/ISBN; thumbnail in https; ISBN-13 (anche convertito da ISBN-10)                     |
| **Open Library** | Libri (riserva)          | Usata quando Google non trova nulla o fallisce (quota, 5xx, timeout); copertine per ISBN quando mancano                                                                                              |

- **Retry:** su 429 e 5xx fino a 2 nuovi tentativi, rispettando `Retry-After` (massimo 5 s) o con backoff esponenziale; timeout di 8 s.
- **Cache (fetch di Next):** 10 minuti per le ricerche, 24 ore per i dettagli.
- **`GET /api/search?q=&type=all|movie|tv|book&page=`:** richiede una sessione (401 altrimenti). In "Tutti" alterna film/serie e libri; se una fonte non risponde restituisce comunque l'altra, con `unavailable` valorizzato.
- **Pagina `/search`:** debounce di 300 ms, filtri salvati nell'URL, "Carica altri". Le copertine usano `next/image` con `unoptimized`, perché i CDN servono già immagini ridimensionate.
- **Test:** `tests/fixtures/` contiene risposte **reali** (ridotte) registrate il 25/09/2026.

### Rete locale: TMDB e IPv6

Su alcune reti le connessioni **IPv6** verso CloudFront (la CDN di TMDB) vengono resettate durante l'handshake TLS: `curl -6` fallisce, `curl -4` funziona. Node prova prima IPv6 e non ripiega da solo. In quel caso metti `DNS_IPV4_FIRST=true` in `.env.local`: `src/instrumentation.ts` fa preferire IPv4 al server. Su Vercel non serve.

## Script

| Comando              | Descrizione                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `pnpm dev`           | Server di sviluppo (Turbopack)                                      |
| `pnpm build`         | Build di produzione                                                 |
| `pnpm start`         | Avvia la build di produzione                                        |
| `pnpm lint`          | ESLint (`pnpm lint:fix` per le correzioni automatiche)              |
| `pnpm typecheck`     | Genera i tipi delle route (`next typegen`) ed esegue `tsc --noEmit` |
| `pnpm test`          | Vitest, una esecuzione (`pnpm test:watch` in watch mode)            |
| `pnpm format`        | Prettier in scrittura (`pnpm format:check` solo verifica)           |
| `pnpm db:new <nome>` | Crea una nuova migrazione in `supabase/migrations`                  |
| `pnpm db:push`       | Applica le migrazioni al progetto collegato                         |
| `pnpm db:types`      | Genera `src/lib/supabase/database.types.ts` dal DB collegato        |

`next build` non esegue più il lint, quindi prima di un commit lancia: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`.

## Struttura

```
src/
  proxy.ts           # Refresh della sessione + protezione delle route
  actions/           # Server Actions (auth: login con magic link, logout)
  app/
    (auth)/login/    # Pagina di login
    (app)/           # Area protetta: layout con header, dashboard, ricerca (/search)
    api/search/      # Route della ricerca unificata
    auth/confirm/    # Route di atterraggio del magic link
  components/        # Componenti dell'app (ThemeProvider, ThemeToggle…)
    ui/              # Componenti shadcn/ui (generati con `pnpm dlx shadcn@latest add …`)
  lib/
    env.ts           # Variabili pubbliche validate
    env.server.ts    # Variabili server validate (server-only)
    validation/      # Schemi Zod (+ test)
    providers/       # Adapter TMDB / Google Books / Open Library, client HTTP con retry, ricerca unificata
    auth/            # Allowlist e utente corrente (getCurrentUser)
    supabase/        # Client browser/server/admin, refresh sessione nel proxy, tipi generati
supabase/
  config.toml        # Config della CLI Supabase
  migrations/        # Migrazioni SQL: unica fonte di verità dello schema
  tests/             # Test SQL (isolamento RLS)
tests/fixtures/      # Risposte reali (ridotte) di TMDB, Google Books e Open Library
```

## Attribuzioni

Questo prodotto usa le API di TMDB. L'attribuzione richiesta dai termini (logo TMDB e "This product uses the TMDB API but is not endorsed or certified by TMDB") verrà aggiunta nel footer e in una pagina `/info` nella Fase 4, prima del deploy.
