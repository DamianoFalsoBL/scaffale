@AGENTS.md

# Scaffale — project conventions

Full spec: [docs/spec.md](docs/spec.md). Decisions that override the spec are listed below.

## Working rules

- Work one phase at a time (spec §9). Present a short plan and wait for confirmation before writing code.
- Never invent APIs: check official docs (bundled Next.js docs in `node_modules/next/dist/docs/`, Supabase, TMDB, Google Books, Open Library). State doubts explicitly.
- End of each phase: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` must pass; update `README.md` and `.env.example`; conventional commit.
- Languages: code, identifiers, DB objects and commits in English; UI copy in Italian.

## Decisions (override the spec)

- Package manager: pnpm 12 (installed via npm; corepack on Node 22.18 can't install pnpm 12).
- TypeScript 6.x until Next.js supports TypeScript 7 without `experimental.useTypeScriptCli`.
- Supabase keys: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (legacy anon/service_role are deprecated).
- Supabase: cloud project only (no local Docker stack). Migrations live in `supabase/migrations` and include explicit Data API `grant`s.
- Next.js 16: request interception lives in `src/proxy.ts` (not `middleware.ts`).
- Env access goes through `publicEnv` (`@/lib/env`) and `serverEnv` (`@/lib/env.server`), validated by `src/lib/validation/env.ts`.
- Vitest resolves `@/` via Vite 8's native `resolve.tsconfigPaths`.
