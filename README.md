# Scaffale

Tracker personale di film, serie TV e libri. Uso personale, non commerciale.

Stato: **Fase 0** (setup del progetto). Specifica completa e fasi in [docs/spec.md](docs/spec.md); convenzioni e decisioni in [CLAUDE.md](CLAUDE.md).

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

### Versioni installate (Fase 0, settembre 2026)

| Pacchetto                          | Versione       |
| ---------------------------------- | -------------- |
| next / eslint-config-next          | 16.3.6         |
| react / react-dom                  | 19.3.0         |
| typescript                         | 6.0.3          |
| tailwindcss / @tailwindcss/postcss | 4.3.3          |
| shadcn / radix-ui                  | 4.21.0 / 1.6.7 |
| zod                                | 4.6.5          |
| lucide-react                       | 1.48.0         |
| next-themes                        | 0.4.6          |
| vitest / vite                      | 5.0.1 / 8.3.1  |
| eslint                             | 9.39.5         |
| prettier                           | 3.9.9          |
| supabase (CLI)                     | 2.117.0        |
| pnpm                               | 12.6.0         |

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

   In Fase 0 sono tutte facoltative: l'app parte anche con il file vuoto. La tabella sotto indica da quale fase servono.

4. **Progetto Supabase (cloud).** Serve dalla Fase 1.
   1. Crea un progetto su [supabase.com/dashboard](https://supabase.com/dashboard), con region UE (per esempio `eu-central-1`).
   2. Da _Project Settings → API Keys_ copia la **publishable key** (`sb_publishable_…`) e la **secret key** (`sb_secret_…`) in `.env.local`. Le chiavi legacy `anon` / `service_role` vanno in deprecazione e non le usiamo.
   3. Collega la CLI al progetto. Il project ref è nell'URL della dashboard.

      ```bash
      pnpm exec supabase login
      ```

      ```bash
      pnpm exec supabase link --project-ref <project-ref>
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
| `SUPABASE_SECRET_KEY`                  | solo server   | 1       | `sb_secret_…`, bypassa la RLS: mai nel client |
| `TMDB_READ_ACCESS_TOKEN`               | solo server   | 2       | Read Access Token v4                          |
| `GOOGLE_BOOKS_API_KEY`                 | solo server   | 2       |                                               |
| `CRON_SECRET`                          | solo server   | 4       | Almeno 16 caratteri                           |
| `ALLOWED_EMAILS`                       | solo server   | 1       | Facoltativa, separate da virgola              |
| `NEXT_PUBLIC_SITE_URL`                 | client+server | 0       | Default `http://localhost:3000`               |

Le variabili vengono validate con Zod in `src/lib/validation/env.ts`. Le usi così:

- `publicEnv` da `@/lib/env`, sia nel client sia nel server;
- `serverEnv` da `@/lib/env.server`, protetto da `server-only`.

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
  app/               # App Router (layout, pagine, route handler)
  components/        # Componenti dell'app (ThemeProvider, ThemeToggle…)
    ui/              # Componenti shadcn/ui (generati con `pnpm dlx shadcn@latest add …`)
  lib/
    env.ts           # Variabili pubbliche validate
    env.server.ts    # Variabili server validate (server-only)
    validation/      # Schemi Zod (+ test)
    providers/       # Adapter TMDB / Google Books / Open Library (Fase 2)
    supabase/        # Client Supabase server/browser/admin (Fase 1)
supabase/
  config.toml        # Config della CLI Supabase
  migrations/        # Migrazioni SQL: unica fonte di verità dello schema
tests/fixtures/      # Fixture JSON delle API esterne (Fase 2)
```

## Attribuzioni

Questo prodotto userà le API di TMDB (Fase 2); l'attribuzione nel footer verrà aggiunta nella Fase 4.
