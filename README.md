# Postcards

A full-width main postcard followed by a borderless postcard gallery built with Next.js App Router, TypeScript, Tailwind CSS and SWR. The paper background and original Krea-upscaled postcard are preserved.

## Run locally

```sh
npm ci
npm run dev
```

The default sample collection contains 100 distinct records using the same Split Rock image. Infinite scrolling loads 40, 40, then 20 records and stops. A keyboard-accessible Load more button also works without IntersectionObserver. Place search is debounced, case-insensitive, and stored in `?q=` for shareable searches. All search terms must occur in the title or place, in any order. All samples use the real location, so Lake Harmony, Split Rock, Pocono Mountains, and Pennsylvania match; Paris does not.

## Validate

```sh
npm run lint
npm test
npm run build
```

If a restricted local environment prevents Turbopack from opening worker ports, use `npx next build --webpack` for local verification. Vercel uses the default Turbopack build.

## Prepared Postgres integration

The gallery uses sample data unless Postgres is explicitly enabled. Sharing uses Postgres whenever `DATABASE_URL` is set, independently of the gallery data source. Credentials stay on the server. Configured database errors are surfaced instead of silently returning sample results.

When ready:

1. Provision a **new development** Postgres database (such as Supabase) and connect it to this project.
2. Copy `.env.example` to `.env.local`, add the supplied `DATABASE_URL`, and run `npm run db:setup`. This creates the schema and seeds 100 sample records transactionally. The seed reserves IDs 1–100; do not apply it to an existing real collection.
3. Set `POSTCARDS_DATA_SOURCE=postgres` locally and in the desired Vercel environment. Keep `DATABASE_URL` server-only and redeploy.
4. Verify search and pagination against that database before promotion.

Schema: `db/schema.sql`. Seed: `db/seed.sql`. Setup command is intentionally separate from builds and requests. The current substring search is appropriate for this small collection; larger datasets should add an indexed place-search strategy. Image files live separately from the database; rows store image URLs and dimensions. Future external image hosts must be explicitly allowed in `next.config.ts`.

## API

`GET /api/postcards?q=Pennsylvania&cursor=0`

Returns `{ items, total, nextCursor }`. The page size is fixed server-side at 40. A null cursor marks the end. IDs provide stable ordering without duplicates. Queries are limited to 120 characters and cursors must be nonnegative safe integers.

## Shared postcard links

`POST /api/share` saves `{ id, message, address, stampId, stamps?, patternIndex? }` and returns `{ slug, path }`. Links use `/<slug>` on the same origin that saved the card. The first three message words (up to 24 characters) become a lowercase, accent-normalized slug. Empty or non-Latin messages use `card`. Collisions append one random letter or digit at a time: `wish-you-were`, `wish-you-were-k`, `wish-you-were-k7`. Atomic inserts prevent concurrent requests from overwriting a postcard. The saved message, recipient, stamps and background are immutable snapshots. Existing `/postcard?...#...` links still work.

Development without `DATABASE_URL` persists shares under ignored `.data/shared-postcards/`. Production requires persistent Postgres storage. For Supabase, use the **Transaction pooler** URL from the Connect dialog (port 6543); the driver disables prepared statements and limits each warm app instance to one connection.

1. Set server-only `DATABASE_URL` locally and in the deployment environment. For Supabase's private CA, also set `DATABASE_CA_CERT_BASE64` to the base64-encoded downloaded CA certificate. TLS verifies the certificate and hostname.
2. Run `npm run db:shares` once against that database. This creates only `shared_postcards`; it does not seed or change the gallery.
3. Deploy the app. The gallery may remain in sample mode.

Production never falls back to temporary files. If storage is unavailable, sharing shows an error instead of generating a broken link. Shared postcards are accessible to anyone who knows or guesses their short URL; their pages request no search indexing.

The migration enables row-level security and removes `anon`/`authenticated` table privileges, so Supabase's public Data API cannot list or modify postcards. The Next.js server accesses the table through its private database connection. Supabase's Free plan may pause after one week of inactivity.

Additional verification (creates and removes only uniquely marked test postcards):

```sh
npm run test:postgres # 150 colliding shares across six independent clients, reconnect/readback, access controls
npm run test:http     # requires npm run dev; 60 concurrent requests plus edge cases and invalid payloads
```

Set `POSTCARDS_TEST_ORIGIN` to test a different app origin; its database must match `.env.local` for snapshot verification and test cleanup.

## Social previews

The homepage and legacy `/postcard` links have a default vintage postcard preview. Short links use the selected postcard's artwork. Open Graph and Twitter metadata use absolute `https://postcards.page` URLs; handwritten messages and recipient addresses are excluded from preview metadata. `/api/og?card=ID&v=1` renders a cached 1200 × 630 PNG, preserves the artwork's proportions and crop, and loads its public source image from the production site.

The HTTP suite checks metadata in the document head for Facebook, Twitter, WhatsApp, and Slack crawlers, plus image content types, PNG dimensions, size, distinct artwork, and invalid IDs. Run just these checks with:

```sh
node --env-file-if-exists=.env.local --experimental-strip-types --test --test-name-pattern='social previews' tests/integration/sharing-http.test.mjs
```

## Image

`public/images/split-rock-postcard.png` is the supplied 516 × 655 postcard upscaled to 2064 × 2620 using Krea MCP and Topaz High Fidelity V2. The gallery uses responsive Next.js image optimization and lazy loading, with the first image preloaded. Hover scaling is restricted to precise pointing devices and disabled for reduced-motion preferences.
