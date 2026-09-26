# Scaffale

Tracker personale di film, serie TV e libri. Uso personale, non commerciale.

Stato: **Fase 4 completata**: online su https://scaffale.damianofalso.com. Fatti anche veste grafica, scheda dettagli, ricerca per persona, filtri/Esplora e webapp installabile con accesso tramite passkey. Specifica completa e fasi in [docs/spec.md](docs/spec.md); convenzioni e decisioni in [CLAUDE.md](CLAUDE.md).

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
| `CRON_SECRET`                          | solo server   | 4       | Almeno 16 caratteri; obbligatoria online      |
| `ALLOWED_EMAILS`                       | solo server   | 1       | Facoltativa, separate da virgola              |
| `NEXT_PUBLIC_SITE_URL`                 | client+server | 0       | Default `http://localhost:3000`               |
| `DNS_IPV4_FIRST`                       | solo server   | —       | Facoltativa, solo sviluppo locale: vedi sotto |

Le variabili vengono validate con Zod in `src/lib/validation/env.ts`. Le usi così:

- `publicEnv` da `@/lib/env`, sia nel client sia nel server;
- `serverEnv` da `@/lib/env.server`, protetto da `server-only`.

## Database e sicurezza

Lo schema sta in [supabase/migrations](supabase/migrations). Le migrazioni sono l'unica fonte di verità: niente modifiche manuali dalla dashboard.

| Tabella           | Contenuto                                                                 | Accesso (`authenticated`)                                        |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `media_items`     | Catalogo condiviso (snapshot dei metadati)                                | Solo lettura; scrive il server con la secret key                 |
| `user_entries`    | Stato, voto, date, note dell'utente                                       | CRUD sulle proprie righe (RLS)                                   |
| `season_progress` | Stagioni viste di una serie (per voce)                                    | CRUD sulle proprie righe (RLS), solo sulle proprie voci          |
| `lists`           | Liste personalizzate (nome unico per utente, senza distinguere maiuscole) | CRUD sulle proprie righe (RLS)                                   |
| `list_items`      | Titoli della libreria in ogni lista                                       | Inserimento ed eliminazione, solo con lista e voce proprie (RLS) |

- **RLS** attiva su tutte le tabelle; `anon` non ha nessun permesso.
- **Grant espliciti** nella migrazione: da ottobre 2026 Supabase non espone più le tabelle alla Data API in automatico.
- Vincoli a DB: voto 1–10, `finished_at >= started_at`, niente stato `in_progress`/`on_hold` per i film (trigger), ISBN-13 univoco tra fonti diverse.

### Test RLS

[supabase/tests/rls_isolation.sql](supabase/tests/rls_isolation.sql) crea due utenti di prova in una transazione e verifica che:

- l'utente B non legga, modifichi o cancelli le righe dell'utente A, né ne crei a suo nome;
- gli utenti non possano modificare `media_items`;
- `anon` non possa leggere nulla;
- un film non possa essere `in_progress`.

Lo script termina con `ROLLBACK`, quindi non lascia dati. Per eseguirlo, incollalo nel SQL editor della dashboard: se stampa `RLS isolation: all checks passed` è tutto ok, altrimenti l'errore dice quale controllo è fallito. Ultima esecuzione: 25/09/2026 (dopo la Fase 3), superato.

## Autenticazione

- Login con **email e password** (`/login`, `supabase.auth.signInWithPassword`). Niente email da ricevere: dal 26/09/2026 i magic link sono stati tolti, perché con l'SMTP integrato di Supabase erano limitati a pochi invii all'ora e andavano aperti nello stesso browser.
- La password **non è nel codice**: Supabase ne conserva solo l'hash. Per impostarla o cambiarla lancia nel terminale (dalla cartella del progetto):

  ```bash
  pnpm auth:set-password
  ```

  Lo script ([scripts/set-password.mjs](scripts/set-password.mjs)) chiede la password due volte senza mostrarla (minimo 12 caratteri, come `minimum_password_length` in `supabase/config.toml`) e la imposta con la secret key sull'account di `ALLOWED_EMAILS`.

- Errore unico "Email o password non corretti" per email sconosciute e password sbagliate; Supabase limita i tentativi di accesso per indirizzo IP.
- `src/proxy.ts` rinnova la sessione a ogni richiesta e manda a `/login` chi non è autenticato. Il layout `(app)` ricontrolla la sessione e applica `ALLOWED_EMAILS`.
- **Registrazioni chiuse** su Supabase (`[auth] enable_signup = false` in `supabase/config.toml`; attenzione: `[auth.email] enable_signup` deve restare `true`, altrimenti si spegne tutto il login con email, password compresa). Verifica: `POST /auth/v1/signup` con la publishable key risponde `422 signup_disabled`.
- Per aggiungere un altro utente: aggiungi l'email ad `ALLOWED_EMAILS`, crea l'account dalla dashboard di Supabase (Authentication → Add user) e imposta la password con lo script.

### Passkey

- **Accesso con Face ID, impronta o PIN** del dispositivo: pulsante "Entra con passkey" in `/login` (`supabase.auth.signInWithPasskey()`, nel browser perché WebAuthn non gira sul server). Dopo l'accesso la Server Action `finishPasskeySignIn` ricontrolla `ALLOWED_EMAILS` e, se l'email non è ammessa, chiude la sessione. La password resta valida come riserva.
- **Gestione** in `/profile` (link dal nome nell'header; icona sul telefono): elenco delle passkey (nome del gestore, data di aggiunta e ultimo accesso), "Aggiungi passkey su questo dispositivo" (`registerPasskey()`) ed eliminazione con conferma.
- **Solo su `scaffale.damianofalso.com`:** le passkey sono legate al relying party `rp_id` (`[auth.webauthn]` in `supabase/config.toml`, stesso valore di `PASSKEY_RP_ID` in `src/lib/auth/passkeys.ts`). Su localhost e sulle anteprime Vercel il pulsante non compare. **Cambiare `rp_id` invalida tutte le passkey registrate.**
- Funzione sperimentale di Supabase (`@supabase/supabase-js` ≥ 2.105; dalla 2.117 non serve più il flag `experimental.passkey`).
- **Attivazione sul progetto:** `supabase config diff` (CLI 2.117 e 2.118) non confronta `[auth.passkey]`/`[auth.webauthn]`, e `config push` senza terminale interattivo applica tutto senza chiedere. Le passkey vanno quindi attivate dalla Dashboard: Authentication → Passkeys → Enable Passkey authentication, con Display Name `Scaffale`, Relying Party ID `scaffale.damianofalso.com` e Origins `https://scaffale.damianofalso.com`. Verifica: `POST /auth/v1/passkeys/authentication/options` con la publishable key risponde `200` (con `passkey_disabled` sono ancora spente).

## Webapp installabile (PWA)

- **Manifest** in `src/app/manifest.ts` (servito come `/manifest.webmanifest`): nome Scaffale, `display: standalone`, avvio su `/dashboard`, colori carta, scorciatoie Cerca e Libreria. Icone PNG in `public/icons/` (192, 512 e 512 maskable) e `src/app/apple-icon.png` (180, per iPhone), ricavate dal logo di `src/app/icon.svg`. Su iPhone `appleWebApp` nei metadata del layout dà titolo e barra di stato.
- **Service worker** `public/sw.js`, registrato solo in produzione (`src/components/service-worker.tsx`): mette in cache soltanto `public/offline.html` e la mostra quando una navigazione fallisce senza rete. Pagine e dati arrivano sempre dalla rete, quindi niente contenuti vecchi; navigation preload attivo. Header dedicati in `next.config.ts`: `sw.js` senza cache e con CSP `default-src 'self'`.
- **Pagina offline** autonoma (CSS e logo inline, tema chiaro/scuro dal sistema), con "Riprova" e ricarica automatica quando torna la rete.
- Manifest, `sw.js` e `offline.html` sono pubblici nel proxy (`src/lib/auth/public-paths.ts`), perché il telefono li scarica anche senza sessione.
- **Installazione:** iPhone/iPad: Safari → Condividi → "Aggiungi alla schermata Home". Android: Chrome → menu ⋮ → "Installa app". Computer: icona di installazione nella barra degli indirizzi di Chrome/Edge. Le stesse istruzioni sono in `/profile`.
- Su iPhone l'app installata non condivide i cookie con Safari: la prima volta si entra di nuovo (con la passkey basta Face ID).
- Per provare il service worker in locale: `pnpm build`, poi `pnpm start --port 3001` (configurazione `next-prod` in `.claude/launch.json`).

## Libreria

- **Aggiunta dalla ricerca:** "Aggiungi" apre un menu con gli stati ammessi per il tipo (tabella della specifica, in `src/lib/status-labels.ts`; niente "In corso"/"In pausa" per i film). La Server Action `addToLibrary` riscarica i metadati dal provider lato server, salva la scheda in `media_items` con la secret key (riusando la scheda esistente con lo stesso ISBN-13 per i libri) e crea la voce in `user_entries` con il client dell'utente (RLS). I risultati già in libreria mostrano lo stato e portano al dettaglio.
- **Date automatiche:** "In corso" → inizio = oggi (se vuoto); "Visto/Letto/Completata" → fine = oggi (se vuota) e almeno 1 visione/lettura. Fuso orario Europe/Rome. Sempre modificabili.
- **`/library`:** schede Tutti/Film/Serie/Libri con conteggi, filtro per stato, ordinamento (aggiunti di recente, titolo, voto, anno), ricerca per titolo, titolo originale e autore (senza accenti), vista griglia o lista, tutto nell'URL. Cambio di stato direttamente dalla card, con aggiornamento ottimistico.
- **Anteprima `/title/[fonte]/[tipo]/[id]`:** dal pulsante "Dettagli" (o da poster e titolo) nei risultati di ricerca. Mostra la stessa scheda del dettaglio (componente `TitleDetails`) con i dati presi al momento dal provider (cache di 24 ore) e il pulsante "Aggiungi"; dopo l'aggiunta porta alla scheda completa. Se il titolo è già in libreria (stesso id o, per i libri, stesso ISBN) rimanda a `/item/[id]`; parametri non validi o titoli inesistenti danno 404.
- **Scheda ricca (film e serie):** sotto la scheda, caricate in streaming (`<Suspense>`) con una sola chiamata TMDB (`append_to_response` con crediti, `watch/providers` e `recommendations`, cache 24 ore): **Regia/Ideazione e cast** con foto, **Dove vederlo in Italia** (abbonamento, gratis, noleggio, acquisto, con l'attribuzione **JustWatch** richiesta da TMDB e il link alle offerte) e **Titoli simili**. Gli autori dei libri portano agli altri loro libri.
- **Persone:** filtro "Persone" nella ricerca e, in "Tutti", una riga con le prime 6 persone trovate. `/person/[id]` mostra biografia (in inglese se manca in italiano), date e filmografia divisa in **Regia** e **Recitazione** (senza interviste, talk show e filmati d'archivio), dalla più recente, con i titoli già in libreria segnati.
- **Filtri ed Esplora:** pulsante "Filtri" sotto la barra di ricerca con genere (elenco adatto al tipo scelto), anno da/a, voto minimo TMDB, piattaforma in Italia (Netflix, Prime Video, Disney+, Apple TV, NOW, Sky Go, Paramount+, RaiPlay, Mediaset Infinity, TIMvision) e ordinamento. Con la barra vuota parte **Esplora** (TMDB Discover su film e serie: più popolari, voto più alto, più recenti); con del testo i filtri restringono i risultati. Tutto finisce nell'URL e i filtri attivi compaiono come chip rimovibili.
- **Ricerca nella libreria per persona:** regia/ideazione e i 5 attori principali vengono salvati nella scheda del titolo, quindi "villeneuve" o "zendaya" trovano i titoli anche nella tua libreria.
- **Liste:** in Libreria una riga di chip filtra per lista ("Tutti i titoli" toglie il filtro; parametro `list` nell'URL, una lista sconosciuta mostra tutto). "Gestisci liste" (`/library/lists`) crea, rinomina ed elimina le liste; eliminare una lista non toglie i titoli dalla libreria. Nella scheda di un titolo la sezione "Liste" mostra quelle che lo contengono (con la × per toglierlo) e "Aggiungi a lista…" (anche "Nuova lista…", creata e spuntata subito). Nell'anteprima di un titolo non in libreria "Aggiungi a lista…" lo aggiunge prima come "Da vedere"/"Da leggere" e poi apre la sua scheda. Le liste contengono solo voci della libreria: togliere un titolo dalla libreria lo toglie da tutte. Azioni in `src/actions/lists.ts`, riepiloghi puri in `src/lib/library/lists.ts`.
- **Stagioni viste** (serie): nella scheda di una serie in libreria ogni stagione si segna vista o no con un tocco, e "Fino a qui" segna tutte quelle uscite fino a quella scelta. Contano solo le stagioni già uscite: quelle future compaiono come "In arrivo" o "Annunciata", la stagione 0 (speciali) è esclusa. Lo stato cambia da solo quando segni stagioni: dalla prima si passa a "In corso"; con tutte viste diventa "Completata" solo se la serie è conclusa o cancellata, altrimenti resta "In corso" in attesa della prossima. Le card mostrano "Stagione 3 di 5" per le serie in corso e "Nuova stagione" per una serie finita che ne riceve un'altra. Dati in `season_progress` (legata alla voce: togliere il titolo dalla libreria cancella anche le stagioni); logica pura in `src/lib/library/seasons.ts`.
- **`/item/[id]`** (id della scheda in `media_items`): metadati dalla scheda salvata (durata e tagline, stagioni ed episodi, autori, pagine, editore, ISBN), stato, voto a mezze stelle (salvato 1–10, usabile anche da tastiera), date, contatore visioni/letture, note, rimozione con conferma. La scheda condivisa resta nel catalogo.
- **`/dashboard`:** completati per tipo, "In corso", "Da vedere e da leggere", "Completati di recente", completati per anno.
- **Veste grafica "Carta e inchiostro":** fondo carta e testo inchiostro (versione scura in marrone caldo), titoli in Fraunces, accento ocra. Tipi: Film prugna, Serie TV verde, Libri blu inchiostro, controllati con il validatore di palette insieme all'accento (anche per daltonismo, chiaro e scuro); l'etichetta resta sempre scritta. Su telefono la navigazione è una barra in basso, come un'app.

## Ricerca e fonti esterne

Tutte le chiamate alle API esterne partono **solo dal server** (`src/lib/providers/`) e ogni risposta viene validata con Zod. Se un singolo risultato non rispetta lo schema viene scartato, senza far fallire la pagina.

| Fonte            | Uso                      | Dettagli                                                                                                                                                                                             |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TMDB**         | Film e serie             | `it-IT`, `region=IT` sui film; `/search/multi` senza persone; dettagli con `append_to_response=translations` per ripiegare sulla trama `en-US`; generi tradotti con `/genre/*/list` (cache 7 giorni) |
| **Google Books** | Libri (fonte principale) | Due ricerche in parallelo (`langRestrict=it` + senza filtro), prima le edizioni italiane, niente doppioni per id/ISBN; thumbnail in https; ISBN-13 (anche convertito da ISBN-10)                     |
| **Open Library** | Libri (riserva)          | Usata quando Google non trova nulla o fallisce (quota, 5xx, timeout); copertine per ISBN quando mancano                                                                                              |

- **Retry:** su 429 e 5xx fino a 2 nuovi tentativi, rispettando `Retry-After` (massimo 5 s) o con backoff esponenziale; timeout di 8 s.
- **Cache (fetch di Next):** 10 minuti per le ricerche, 24 ore per i dettagli.
- **`GET /api/search?q=&type=all|movie|tv|book|person&page=&genre=&from=&to=&rating=&provider=&sort=`:** richiede una sessione (401 altrimenti). In "Tutti" alterna film/serie e libri; se una fonte non risponde restituisce comunque l'altra, con `unavailable` valorizzato. Valori non validi dei filtri vengono ignorati (`src/lib/search-filters.ts`, cataloghi in `src/lib/catalogs.ts`).
- **Esplora (`q` vuoto):** `/discover/movie` e `/discover/tv` con genere (`with_genres`), date di uscita, `vote_average.gte`, piattaforma (`with_watch_providers` + `watch_region=IT`, abbonamento o gratis). Soglie di voti per evitare titoli sconosciuti: 10 (più recenti), 50 (serie popolari), 100 (voto minimo), 300 (voto più alto); le serie escludono news, soap e talk show. Solo film e serie: Google Books non ha un elenco per genere utilizzabile (con `subject:` ignora `langRestrict` e l'ordine è casuale), quindi per i libri serve un testo.
- **Filtri con del testo:** l'anno esatto va a TMDB (`primary_release_year` / `first_air_date_year`), il resto (intervallo di anni, genere, voto con almeno 10 voti) filtra i risultati; se una pagina resta vuota ne legge fino a 2 in più. Per i libri il genere diventa `subject:"…"` nella query. La piattaforma vale solo in Esplora; voto e piattaforma escludono i libri da "Tutti" (la pagina lo spiega).
- **Pagina `/search`:** debounce di 300 ms, filtri salvati nell'URL, "Carica altri". Le copertine usano `next/image` con `unoptimized`, perché i CDN servono già immagini ridimensionate.
- **Test:** `tests/fixtures/` contiene risposte **reali** (ridotte) registrate il 25/09/2026.

### Rete locale: TMDB e IPv6

Su alcune reti le connessioni **IPv6** verso CloudFront (la CDN di TMDB) vengono resettate durante l'handshake TLS: `curl -6` fallisce, `curl -4` funziona. Node prova prima IPv6 e non ripiega da solo. In quel caso metti `DNS_IPV4_FIRST=true` in `.env.local`: `src/instrumentation.ts` fa preferire IPv4 al server. Su Vercel non serve.

## Deploy (Vercel)

- **Produzione:** https://scaffale.damianofalso.com (alias: `scaffale-rho.vercel.app`). Progetto Vercel `scaffale` (scope `damianofalsobls-projects`, piano Hobby) collegato a GitHub `DamianoFalsoBL/scaffale`: ogni push su `main` va in produzione, gli altri branch creano un'anteprima (protetta dalla Vercel Authentication).
- **Region:** `fra1` (Francoforte), la stessa di Supabase `eu-central-1` (`regions` in [vercel.json](vercel.json)).
- **Variabili d'ambiente** (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAILS`, e come _Sensitive_ `SUPABASE_SECRET_KEY`, `TMDB_READ_ACCESS_TOKEN`, `GOOGLE_BOOKS_API_KEY`, `CRON_SECRET`; solo in Production `NEXT_PUBLIC_SITE_URL=https://scaffale.damianofalso.com`. Per aggiungerne o cambiarne una senza scriverne il valore nel terminale: `vercel env add NOME production --sensitive --force` e il valore da stdin.
- **Dominio:** su Cloudflare un record `CNAME scaffale → 7eea6669f682a33a.vercel-dns-017.com` in modalità **DNS only** (nuvoletta grigia); il certificato HTTPS lo emette Vercel.
- **Supabase Auth:** `site_url` è il dominio di produzione; i redirect ammessi sono produzione, `scaffale-rho.vercel.app`, le anteprime `scaffale-*-damianofalsobls-projects.vercel.app` e `localhost:3000` (`supabase/config.toml`, applicati con `config diff` + `config push`).
- `DNS_IPV4_FIRST` su Vercel non serve.

## Job pianificati (Vercel Cron)

Definiti in [vercel.json](vercel.json). Sul piano Hobby girano al massimo una volta al giorno, con una tolleranza di un'ora sull'orario. Entrambe le route rispondono 401 senza `Authorization: Bearer <CRON_SECRET>`; Vercel manda l'header da solo.

| Route                 | Quando (UTC) | Cosa fa                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/keepalive` | 03:00        | Query leggera su `media_items`: il piano free di Supabase mette in pausa i progetti dopo 7 giorni senza richieste                                                                                                                                                                                                                                              |
| `/api/cron/refresh`   | 04:00        | Riscarica fino a 25 schede sincronizzate più di 150 giorni fa (TMDB vieta dati più vecchi di 6 mesi), una alla volta con pause di 250 ms; lo spazio che resta va alle serie ancora in produzione (stato TMDB diverso da conclusa/cancellata) non aggiornate da 7 giorni, così le nuove stagioni arrivano. Gli errori finiscono nei log e non bloccano il resto |

Per provarli in locale (con `pnpm dev` avviato) basta una richiesta con l'header giusto, per esempio da Node, leggendo `CRON_SECRET` da `.env.local`.

## Sicurezza

- Solo l'account in `ALLOWED_EMAILS` può entrare: registrazioni chiuse su Supabase, allowlist al login e su ogni pagina, RLS sui dati.
- **Online l'app si rifiuta di partire** se mancano `ALLOWED_EMAILS`, `SUPABASE_SECRET_KEY` o `CRON_SECRET` (`assertDeployedServerEnv`, attivo quando è impostato `VERCEL`).
- Pagine pubbliche: solo `/login`, `/auth/*` e `/info`, che non contiene dati.
- Header di sicurezza su tutte le risposte (`X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) e `noindex` (meta tag e `X-Robots-Tag`).

## Script

| Comando                  | Descrizione                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `pnpm dev`               | Server di sviluppo (Turbopack)                                        |
| `pnpm build`             | Build di produzione                                                   |
| `pnpm start`             | Avvia la build di produzione                                          |
| `pnpm lint`              | ESLint (`pnpm lint:fix` per le correzioni automatiche)                |
| `pnpm typecheck`         | Genera i tipi delle route (`next typegen`) ed esegue `tsc --noEmit`   |
| `pnpm test`              | Vitest, una esecuzione (`pnpm test:watch` in watch mode)              |
| `pnpm format`            | Prettier in scrittura (`pnpm format:check` solo verifica)             |
| `pnpm db:new <nome>`     | Crea una nuova migrazione in `supabase/migrations`                    |
| `pnpm db:push`           | Applica le migrazioni al progetto collegato                           |
| `pnpm auth:set-password` | Imposta o cambia la password del tuo account (input nascosto)         |
| `pnpm db:types`          | Genera `src/lib/supabase/database.types.ts` dal DB collegato          |
| `pnpm e2e:user`          | Crea (o reimposta) l'account dei test end-to-end, solo in locale      |
| `pnpm test:e2e`          | Test end-to-end con Playwright sulla build di produzione (porta 3100) |

`next build` non esegue più il lint, quindi prima di un commit lancia: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`.

## Test end-to-end (Playwright)

Coprono i percorsi principali con un browser vero (Chromium): accesso e pagine private, file dell'app installabile e pagina offline, ricerca → aggiunta → libreria → rimozione, ricerca ritrovata dopo "Indietro", filtri ed Esplora, stagioni (stato automatico e "Fino a qui"), liste (creazione dall'anteprima, filtro in Libreria, rinomina ed eliminazione) e, su telefono simulato (Pixel 7), voci dei menu alte almeno 44 px.

1. Una volta sola: `pnpm exec playwright install chromium` (scarica il browser, circa 150 MB).
2. Una volta sola (o per cambiare password): `pnpm e2e:user`. Crea l'account `e2e@scaffale.test` con una password casuale, salva `E2E_EMAIL` ed `E2E_PASSWORD` in `.env.local` (mai stampata) e aggiunge l'email ad `ALLOWED_EMAILS` **solo in locale**: su Vercel `ALLOWED_EMAILS` resta il tuo, quindi quell'account non entra nel sito vero.
3. `pnpm test:e2e`: fa la build, la avvia sulla porta 3100 ed esegue i test uno alla volta (condividono l'account). Con `E2E_BASE_URL` usa un server già avviato.

Il database è quello cloud: prima e dopo ogni esecuzione la libreria e le liste dell'account di prova vengono cancellate (`e2e/support/test-user.ts`, che si rifiuta di agire se `E2E_EMAIL` coincide con il tuo indirizzo). Le API (TMDB, Google Books) sono quelle vere, quindi i test sono pochi e mirati; un titolo sparito o rinominato su TMDB può richiedere di aggiornarli.

## Struttura

```
src/
  proxy.ts           # Refresh della sessione + protezione delle route
  actions/           # Server Actions: auth (login con password, logout), library (aggiungi, modifica, rimuovi)
  app/
    (auth)/login/    # Pagina di login
    (app)/           # Area protetta: dashboard, library, item/[id], search
    api/search/      # Route della ricerca unificata
  components/        # Componenti dell'app (ThemeProvider, ThemeToggle…)
    ui/              # Componenti shadcn/ui (generati con `pnpm dlx shadcn@latest add …`)
  lib/
    env.ts           # Variabili pubbliche validate
    env.server.ts    # Variabili server validate (server-only)
    validation/      # Schemi Zod (+ test)
    providers/       # Adapter TMDB / Google Books / Open Library, client HTTP con retry, ricerca unificata
    auth/            # Allowlist e utente corrente (getCurrentUser)
    library/         # Modello, filtri/ordinamento/statistiche (puri, testati), query e salvataggio catalogo
    supabase/        # Client browser/server/admin, refresh sessione nel proxy, tipi generati
supabase/
  config.toml        # Config della CLI Supabase
  migrations/        # Migrazioni SQL: unica fonte di verità dello schema
  tests/             # Test SQL (isolamento RLS)
tests/fixtures/      # Risposte reali (ridotte) di TMDB, Google Books e Open Library
```

## Attribuzioni

Questo prodotto usa le API di TMDB. Come chiedono i termini, il **logo ufficiale TMDB** (`public/brand/tmdb-logo.svg`, non modificato e più piccolo del nome dell'app) e la frase "This product uses the TMDB API but is not endorsed or certified by TMDB" compaiono nel footer di ogni pagina e nella pagina pubblica [`/info`](src/app/info/page.tsx), che cita anche Google Books e Open Library.
