---
inclusion: always
---

# Tech Stack & Development Guide

## Framework & Runtime

- **Next.js 14** (App Router) — React 18, TypeScript 5, strict mode
- **Supabase** — PostgreSQL database, Auth, real-time subscriptions, RLS
- **Tailwind CSS 3** — utility-first styling with custom RPG theme tokens
- **Vitest + fast-check** — unit tests and property-based testing

## Key Libraries

| Library | Purpose |
|---------|---------|
| `@supabase/ssr` | Server-side Supabase client (cookie-based auth) |
| `@supabase/supabase-js` | Client-side Supabase SDK |
| `fast-check` | Property-based testing |
| `next/font` | Google Fonts (Press Start 2P, VT323) via CSS variables |

## Commands

```bash
npm run dev        # Dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint (next/core-web-vitals)
npm run test       # Run tests once (vitest run)
npm run test:watch # Run tests in watch mode
```

## Architecture Patterns

### Server vs Client Components
- Server Components are the default. Only add `'use client'` when the component needs browser APIs, hooks, or event handlers.
- Data fetching happens in Server Components or API routes, never in client components directly.

### Supabase Client Usage
- **Server-side** (Server Components, API routes, middleware): use `createClient()` from `@/lib/supabase/server` — creates a per-request client with cookie-based auth.
- **Client-side** (browser): use `createClient()` from `@/lib/supabase/client` — creates a browser client via `createBrowserClient`.
- Never import the wrong client for the context. Server client uses `cookies()` from `next/headers`; browser client reads cookies automatically.

### Data Access Layer
- All Supabase queries go through service functions in `lib/services/`. Components never call Supabase directly.
- Service functions throw descriptive `Error` objects on failure — callers handle errors at the UI boundary.
- Use `.select()` after `.insert()` / `.update()` to return the mutated row.
- `user_id` is set by the database via `DEFAULT auth.uid()` — never pass it from the client.

### Auth & Middleware
- `middleware.ts` refreshes sessions via `updateSession()` and enforces route protection.
- Protected routes: `/`, `/tasks`, `/master`, `/account`. Unauthenticated users redirect to `/login`.
- Auth routes (`/login`, `/register`) redirect authenticated users to `/`.
- RLS policies on all tables enforce per-user data isolation at the database level.

## Code Style & Conventions

### TypeScript
- Strict mode enabled. No `any` unless absolutely unavoidable (document why).
- Use `@/*` path alias for all imports (maps to project root).
- Domain types and constants live in `lib/types.ts`. Use the exported `Priority`, `Status`, `BranchType` types and `PRIORITIES`, `STATUSES`, `BRANCH_TYPES` const arrays.
- Prefer `as const` arrays with derived union types over standalone enums.

### Input Validation & Security
- Validate and cap string inputs using `capString()` from `@/lib/security` before database writes.
- Title max: 100 chars. Description max: 500 chars. Reject empty titles.
- Validate nesting depth (max 3 levels) before creating subtasks via `checkNestingDepth()`.
- Never trust client input for `user_id`, `xp_reward`, or computed fields — derive server-side.

### Tailwind & Theming
- Custom colors: `rpg-dark`, `rpg-card`, `rpg-border`, `rpg-normal`, `rpg-rare`, `rpg-epic`, `rpg-legendary`.
- Custom fonts: `font-pixel` (Press Start 2P), `font-retro` (VT323) — loaded via CSS variables.
- Priority-based glow shadows: `shadow-normal`, `shadow-rare`, `shadow-epic`, `shadow-legendary`, `shadow-overdue`.
- Use theme tokens over raw hex values.

### Testing
- Unit tests in `__tests__/unit/`, property-based tests in `__tests__/properties/`.
- Vitest runs in Node environment with global APIs (`describe`, `it`, `expect` available without import).
- Use `@/` alias in test imports (same resolution as app code).
- Property-based tests use `fast-check` arbitraries to generate domain values (priorities, statuses, XP values).

## Configuration Summary

| Tool | Key Settings |
|------|-------------|
| TypeScript | `strict: true`, `moduleResolution: "bundler"`, `@/*` path alias |
| ESLint | Extends `next/core-web-vitals` |
| Tailwind | Scans `app/`, `components/`, `lib/` for class usage |
| Vitest | Node env, globals enabled, `@/` alias |
| PostCSS | Tailwind + Autoprefixer |
| Next.js | OWASP security headers, `poweredByHeader: false`, ESLint enforced on build |

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- Stored in `.env.local` (gitignored). Never commit secrets.

## Security Posture

- OWASP-aligned security headers in `next.config.mjs`: CSP, HSTS, X-Frame-Options DENY, nosniff, strict referrer.
- CSP whitelists Supabase origin for `connect-src` (HTTPS + WSS).
- `'unsafe-eval'` only in development; removed in production builds.
- Supabase RLS enforced on all tables — every query is scoped to `auth.uid()`.
- Middleware protects routes and refreshes auth sessions on every request.
- SQL migrations numbered sequentially in `supabase/migrations/`.
