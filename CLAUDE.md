@AGENTS.md

# Scaffale — project conventions

Full spec: [docs/spec.md](docs/spec.md). Decisions that override the spec are listed below.

## Working rules

- Work one phase at a time (spec §9). Present a short plan and wait for confirmation before writing code.
- Never invent APIs: check official docs (bundled Next.js docs in `node_modules/next/dist/docs/`, Supabase, TMDB, Google Books, Open Library). State doubts explicitly.
- End of each phase: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` must pass; update `README.md` and `.env.example`; conventional commit. Before merging to main also run `pnpm test:e2e` (Playwright, test account from `pnpm e2e:user`; never read or print `E2E_PASSWORD`).
- Languages: code, identifiers, DB objects and commits in English; UI copy in Italian.

## Decisions (override the spec)

- Production domain: `scaffale.damianofalso.com` (not media.damianofalso.com as in spec §11).

- Package manager: pnpm 12 (installed via npm; corepack on Node 22.18 can't install pnpm 12).
- TypeScript 6.x until Next.js supports TypeScript 7 without `experimental.useTypeScriptCli`.
- Supabase keys: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (legacy anon/service_role are deprecated).
- Supabase: cloud project only (no local Docker stack), project `scaffale`, ref `wacmcxumcgbpmquqiuos`, CLI linked.
- Migrations live in `supabase/migrations` and include explicit Data API `grant`s. When applied through the Supabase MCP (`apply_migration`), rename the local file to the version reported by `list_migrations` so `supabase db push` stays in sync. Regenerate `src/lib/supabase/database.types.ts` after every schema change.
- Auth config goes through `supabase/config.toml`: always run `supabase config diff` and review it before `supabase config push`. Sign-ups are closed with `[auth] enable_signup = false`; `[auth.email] enable_signup` must stay `true` (on hosted projects it switches the whole email provider off).
- Local network quirk: IPv6 to CloudFront (TMDB) is reset; `DNS_IPV4_FIRST=true` in `.env.local` (see `src/instrumentation.ts`). Scripts that call TMDB need `node --dns-result-order=ipv4first`.
- Auth is email + password (`signInWithPassword`); magic links were removed (built-in SMTP limits). The password is never in code or chat: the user sets it with `pnpm auth:set-password` (hidden prompt, min 12 chars).
- Protected pages live under `src/app/(app)`; use `getCurrentUser()` (`@/lib/auth/session`) in server code. It enforces `ALLOWED_EMAILS`.
- Next.js 16: request interception lives in `src/proxy.ts` (not `middleware.ts`).
- Env access goes through `publicEnv` (`@/lib/env`) and `serverEnv` (`@/lib/env.server`), validated by `src/lib/validation/env.ts`.
- Vitest resolves `@/` via Vite 8's native `resolve.tsconfigPaths`.
- Catalog writes (`media_items`) only through `upsertMediaItem` (`src/lib/library/queries.ts`, secret key); user data through the user's client so RLS applies. Metadata on add is always re-fetched server-side.
- Series progress is per season (`season_progress`, tied to `user_entries`; the spec's per-episode table was dropped). Only aired seasons ≥ 1 count; status moves on in `setSeasonsWatched` via `statusAfterWatching` (completed only if TMDB status is Ended/Canceled). The refresh cron also re-syncs running series weekly.
- Lists (`lists`, `list_items`) hold library entries only: adding a title from outside the library adds it as planned first (`addTitleToList`). They live inside Libreria (chips + `list` URL param, `/library/lists` to manage); counts and covers come from the library entries (`listIds` on each entry), not from SQL.
- Library filtering/sorting/stats are pure functions in `src/lib/library/views.ts` over the whole library (fine for a personal library; move to SQL if it grows past a few thousand entries).
- Visual style "Carta e inchiostro": paper/ink palette in `globals.css` (light + warm-brown dark), Fraunces for headings (`font-heading`, h1/h2 by default), Geist for body. Media type colors are theme tokens `--movie` (plum), `--tv` (green), `--book` (ink blue) with per-theme label colors, validated together with the ochre accent (`--primary`) using the dataviz palette validator; keep labels visible.
- Touch targets: on touch screens (`pointer-coarse:`) dropdown menu rows are at least 44px with larger text (`src/components/ui/dropdown-menu.tsx`); keep new tap targets at that size.
- Navigation: sticky header (desktop links) + fixed bottom tab bar on phones (`src/components/app-nav.tsx`); body gets bottom padding via `body:has([data-mobile-tabbar])`.
- Search filters: URL schema, Discover params and text-result matching are pure functions in `src/lib/search-filters.ts`; genre and platform catalogs (TMDB ids verified on the API) in `src/lib/catalogs.ts`. Esplora (empty query) is movies/series only via TMDB Discover.
- Passkeys (Supabase, experimental): sign-in and registration run in the browser client; `finishPasskeySignIn` re-checks `ALLOWED_EMAILS`. Relying party `scaffale.damianofalso.com` only (`PASSKEY_RP_ID` in `src/lib/auth/passkeys.ts` = `[auth.webauthn] rp_id`); never change it (it invalidates every passkey). The CLI's `config diff` doesn't cover `[auth.passkey]`/`[auth.webauthn]`: enable/change them in the Dashboard (Authentication → Passkeys); `config.toml` documents the values.
- PWA: `src/app/manifest.ts` + `public/sw.js` (offline page only, no page/data caching) registered in production. New public files that must load without a session go in `src/lib/auth/public-paths.ts`.
- Releases page (`/releases`): live TMDB Discover, one request per day and kind (movies filtered on the Italian release date, series on first air date + Italian flatrate availability), season premieres from the library's stored season dates; nothing stored. Logic in `src/lib/releases.ts`, fetching in `getReleases`.
- Library matching (`markLibraryEntries`) keys on source + media type + id: TMDB movies and series share ids.
- TMDB rich data (credits, watch providers, recommendations, people) comes live from the provider (`getTitleExtras`, `getPerson` in `src/lib/providers/index.ts`), never stored, except director/cast names in `media_items.extra` for library search. Watch provider data must always show the JustWatch attribution.
