# Security Posture

Defenses applied against the OWASP Top 10 (2021).

## A01: Broken Access Control

- **Row Level Security** enabled on every table in `supabase/migrations/002_security_hardening.sql`.
- Single-player model uses a permissive `anon` policy today, but RLS is on so introducing per-user ownership is a policy change, not a schema change.
- Privileges are explicitly granted to the `anon` role (not inherited from `public`).
- **`forfeit_quest` RPC** (`supabase/migrations/005_forfeit_quest.sql`) uses `SECURITY DEFINER` to perform atomic task deletion with XP penalty. The function independently validates ownership (`user_id = auth.uid()`), eligibility (status ≠ 'done', not a subtask), and floors XP at zero before deleting. Client-side eligibility gating is complemented by server-side enforcement to prevent bypass.

## A02: Cryptographic Failures

- `lib/supabase.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and rejects plain `http://` outside of localhost dev.
- Supabase client is configured with `persistSession: false` and `autoRefreshToken: false` so no auth tokens land in `localStorage` (reduces XSS token-theft blast radius).
- Only the public `anon` key is referenced. The service-role key must never be added to a `NEXT_PUBLIC_*` variable.

## A03: Injection / XSS

- **Hex-color whitelisting**: user-controlled `Type.color` flows into inline `style` props. `lib/security.ts` (`safeHexColor`) enforces a `^#[0-9a-fA-F]{3,6}$` whitelist at every render site (QuestCard, FolderView, WizardModal, TypesPage, TaskDetail).
- **DB-side CHECK constraints** in migration `002` reject non-hex colors, empty names, negative XP, and non-positive branch order.
- **Length caps** in service-layer inserts/updates (`lib/services/*.ts`) prevent oversized payloads before they reach the DB.
- **Identifier sanitization** (`sanitizeIdentifier`) strips control chars, angle brackets, quotes, and backticks from avatars.
- **UUID validation** on `/tasks/[id]` route param rejects malformed IDs before the DB query.
- React escapes text children by default; no uses of `dangerouslySetInnerHTML`, `eval`, or `innerHTML`.

## A04: Insecure Design

- All XP / level / streak logic is covered by property-based tests (fast-check, 100+ runs per property) validating invariants under arbitrary inputs.
- Subtask nesting is capped at 3 levels in both the UI (`SubtaskTree`) and service (`createSubtask`).
- **Forfeit quest** XP penalty calculation (`floor(xp_reward * 0.25)`) and level recalculation are covered by property-based tests ensuring the XP floor-at-zero invariant holds and level is consistent with the iterative threshold formula for any input.

## A05: Security Misconfiguration

- `next.config.mjs` sets strict security headers on every response:
  - `Content-Security-Policy` with `frame-ancestors 'none'`, `object-src 'none'`, scoped `connect-src` for Supabase only.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Strict-Transport-Security` with 2-year `max-age` and `preload`.
  - `Permissions-Policy` disables camera, microphone, geolocation, and FLoC cohorts.
- `poweredByHeader: false` removes the `X-Powered-By: Next.js` fingerprint.
- ESLint runs during build (`ignoreDuringBuilds: false`).

## A06: Vulnerable and Outdated Components

- `npm audit` findings:
  - `esbuild` (moderate): dev-server-only, does not ship to production.
  - `@next/eslint-plugin-next` (high via `glob`): lint-only, transitive in dev.
- Both are development-time advisories; neither affects the built artifact.

## A07: Identification and Authentication Failures

- Single-player model is intentional (no auth). If auth is introduced later:
  1. Replace the `anon_all_*` RLS policies with per-`auth.uid()` policies.
  2. Enable session persistence in `lib/supabase.ts` and use `@supabase/ssr`.
  3. Require session checks in page components before rendering task data.

## A08: Software and Data Integrity Failures

- All dependencies are pinned via `package-lock.json`. Install with `npm ci` in CI.
- No dynamic `require()` or remote code loading.

## A09: Security Logging and Monitoring Failures

- Service-layer errors return `{ data, error }` rather than throwing opaque strings, so UI can surface user-safe messages while dev consoles retain the full error.
- No secrets or PII are logged.

## A10: Server-Side Request Forgery

- Client only issues requests to the Supabase origin specified by `NEXT_PUBLIC_SUPABASE_URL`. CSP `connect-src` locks this down at the browser level.
- No user input flows into `fetch` URLs.

## Tests

- `__tests__/unit/security.test.ts` — 17 tests including fast-check property tests proving `safeHexColor` and `sanitizeIdentifier` never emit injection sentinels for arbitrary string input.
- Full suite: **179 tests across 17 files, all passing.**
