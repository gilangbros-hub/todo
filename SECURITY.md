# Security Posture

Defenses applied against the OWASP Top 10 (2021).

## A01: Broken Access Control

- **Row Level Security** enabled on every table in `supabase/migrations/002_security_hardening.sql`.
- Single-player model uses a permissive `anon` policy today, but RLS is on so introducing per-user ownership is a policy change, not a schema change.
- Privileges are explicitly granted to the `anon` role (not inherited from `public`).
- **Route protection**: `middleware.ts` enforces authentication on all protected routes: `/`, `/renata`, `/tasks`, `/master`, and `/account`. Unauthenticated requests to any of these paths are redirected to `/login`.
- **`forfeit_quest` RPC** (`supabase/migrations/005_forfeit_quest.sql`) uses `SECURITY DEFINER` to perform atomic task deletion with XP penalty. The function independently validates ownership (`user_id = auth.uid()`), eligibility (status ≠ 'done', not a subtask), and floors XP at zero before deleting. Client-side eligibility gating is complemented by server-side enforcement to prevent bypass.
- **Online Clipboard** tables (`clipboard_sessions`, `clipboard_entries` in `supabase/migrations/013_clipboard.sql`) use a single combined `FOR ALL` RLS policy per table, restricting all operations to rows where `user_id = auth.uid()`. Cascade deletion ensures entries are removed when their parent session is deleted.

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
- **BRD input capping**: The `/api/brd/analyze` route handler enforces a 300,000-character maximum on user-submitted text (reduced from 1,000,000 to stay within Vercel's 4.5 MB function payload limit — JSON-encoding 300K chars costs ~600 KB). The `/api/brd/stream` route handler enforces a 100,000-character maximum. Both routes validate minimum length (50 chars) before forwarding to the AI model (DeepSeek via OpenAI SDK). AI responses are parsed as JSON with strict schema validation (`validateAnalysisResponse`) — no raw AI output is rendered without validation. The streaming endpoint (`/api/brd/stream`) uses Server-Sent Events (SSE) and validates the model parameter against an allowlist before use.
- **Degenerate AI output guard**: The `/api/brd/stream` endpoint wraps each model stream in a `RepetitionGuard` (`lib/brd/repetition.ts`) that watches a sliding window of reasoning/content tokens for pathological repetition loops (consecutive identical-word runs, low lexical diversity, or short token cycling). On detection it aborts the in-flight request and retries once with stricter sampling (frequency/presence penalties + lower temperature), then surfaces a user-safe error if no usable output is produced. This bounds wasted compute against the 300s `maxDuration` and prevents degenerate model output from being persisted or rendered.
- **Mermaid diagram rendering**: The architecture diagram features (`components/MermaidDiagram.tsx` and the Oracle `components/oracle/ArchitectureCanvas.tsx`) render AI-generated Mermaid syntax to SVG via `mermaid.render()` and inject the result with `innerHTML`. The injected markup is SVG produced by the Mermaid library, not raw user/AI text. Before rendering, the AI-generated source is passed through `sanitizeMermaid` (`lib/brd/mermaid.ts`), which rebuilds the diagram from a parsed structure and strips delimiter/quote garbage, with a `stripAllShapes` fallback that reduces nodes to bare IDs. The diagram source itself originates from DeepSeek output derived from BRD text that has already been length-capped and schema-validated server-side. These are the only controlled uses of `innerHTML` in the app.
- React escapes text children by default; there are no uses of `dangerouslySetInnerHTML` or `eval`. The only `innerHTML` writes are the Mermaid-rendered SVG described above.

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

- Client only issues requests to the Supabase origin specified by `NEXT_PUBLIC_SUPABASE_URL`. CSP `connect-src` locks down browser-initiated requests.
- The `/api/brd/analyze` and `/api/brd/stream` route handlers send user-provided text to DeepSeek (`https://api.deepseek.com`) for analysis via the OpenAI SDK. The API key (`DEEPSEEK_API_KEY`) is server-side only and never exposed to the client. Input is capped at 100,000 characters and validated before forwarding. The streaming endpoint validates the requested model against an explicit allowlist (`ALLOWED_MODELS`).
- No user input flows into `fetch` URLs.

## Tests

- `__tests__/unit/security.test.ts` — 17 tests including fast-check property tests proving `safeHexColor` and `sanitizeIdentifier` never emit injection sentinels for arbitrary string input.
- Full suite: **179 tests across 17 files, all passing.**
