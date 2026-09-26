@AGENTS.md

# Scaffale — project conventions

Full spec: [docs/spec.md](docs/spec.md). Decisions that override the spec are listed below.

## Working rules

- Work one phase at a time (spec §9). Present a short plan and wait for confirmation before writing code.
- Never invent APIs: check official docs (bundled Next.js docs in `node_modules/next/dist/docs/`, Supabase, TMDB, Google Books, Open Library). State doubts explicitly.
- End of each phase: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` must pass; update `README.md` and `.env.example`; conventional commit.
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
- Library filtering/sorting/stats are pure functions in `src/lib/library/views.ts` over the whole library (fine for a personal library; move to SQL if it grows past a few thousand entries).
- Media type colors: violet (movie) / green (tv) / orange (book), validated with the dataviz palette validator; keep labels visible.
