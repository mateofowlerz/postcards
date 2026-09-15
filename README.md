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

No database has been provisioned or connected. Sample mode never contacts a database. The server-only repository switches to Neon Postgres when explicitly enabled, with parameterized search and cursor pagination. Credentials stay on the server. Configured database errors are surfaced instead of silently returning sample results.

When ready:

1. Provision a **new development** Neon Postgres database through Vercel Marketplace and connect it to this project.
2. Copy `.env.example` to `.env.local`, add the supplied `DATABASE_URL`, and run `npm run db:setup`. This creates the schema and seeds 100 sample records transactionally. The seed reserves IDs 1–100; do not apply it to an existing real collection.
3. Set `POSTCARDS_DATA_SOURCE=postgres` locally and in the desired Vercel environment. Keep `DATABASE_URL` server-only and redeploy.
4. Verify search and pagination against that database before promotion.

Schema: `db/schema.sql`. Seed: `db/seed.sql`. Setup command is intentionally separate from builds and requests. The current substring search is appropriate for this small collection; larger datasets should add an indexed place-search strategy. Image files live separately from the database; rows store image URLs and dimensions. Future external image hosts must be explicitly allowed in `next.config.ts`.

## API

`GET /api/postcards?q=Pennsylvania&cursor=0`

Returns `{ items, total, nextCursor }`. The page size is fixed server-side at 40. A null cursor marks the end. IDs provide stable ordering without duplicates. Queries are limited to 120 characters and cursors must be nonnegative safe integers. No write API is exposed.

## Image

`public/images/split-rock-postcard.png` is the supplied 516 × 655 postcard upscaled to 2064 × 2620 using Krea MCP and Topaz High Fidelity V2. The gallery uses responsive Next.js image optimization and lazy loading, with the first image preloaded. Hover scaling is restricted to precise pointing devices and disabled for reduced-motion preferences.
