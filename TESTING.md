# Sharing verification

Verified on September 22, 2026 against the free Supabase `postcards` project and the local Next.js app.

| Check | Result |
| --- | --- |
| `npm test` | 18 tests passed |
| `npm run test:postgres` | 2 tests passed against Supabase |
| `npm run test:http` | 4 tests passed against the running app and Supabase |
| `npm run build -- --webpack` | Passed, including TypeScript validation |
| ESLint on new storage, API, page, scripts, and tests | Passed |
| `git diff --check` | Passed |

The database suite created 150 colliding shares across six independent connections, verified uniqueness and refusal to overwrite, then reconnected and compared every saved payload. The HTTP suite created another 60 concurrent shares and verified unique links and exact database readback. Both suites remove their uniquely identified test records.

Other coverage includes multiple collision retries, reserved routes, accents, emoji, non-Latin and empty messages, maximum field sizes and stamp counts, malformed JSON and UTF-8, streamed byte limits, invalid coordinates and IDs, missing links, and Supabase table access restrictions. Database testing caught and fixed double-encoded JSON payloads; request validation now also rejects NUL and unpaired surrogate characters that PostgreSQL JSONB cannot store.

Browser checks confirmed composition, sharing, the mailbox animation, message/address/stamp rendering, and creating a second share after editing while preserving the original. A separate production server with an unreachable database confirmed that failed saves preserve the draft, display an error, re-enable the button, and produce no share link.

Full-project lint still reports three existing errors: render-time ref access and a state update in an effect in `postcard-viewer.tsx`, and render-time ref access in `welcome-photo.tsx`. There are also two existing warnings. These do not occur in the new storage/API code.

Supabase schema and private access controls are applied. Local credentials and Vercel production secrets are configured. App changes have not been deployed by this verification run.
