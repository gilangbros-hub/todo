# Implementation Plan: User Authentication

## Overview

This plan implements Supabase Auth integration into the RPG Quest Board, adding multi-user support with cookie-based sessions, RLS data isolation, middleware route protection, and three new RPG-themed auth pages. The implementation proceeds incrementally: Supabase client refactoring first, then auth infrastructure (validation, middleware, route handlers), followed by database migration, UI components, page assembly, and finally service layer updates to wire everything together.

## Tasks

- [x] 1. Supabase client refactoring and auth validation module
  - [x] 1.1 Create `lib/supabase/client.ts` browser client using `createBrowserClient` from `@supabase/ssr`
    - Install `@supabase/ssr` package
    - Create `lib/supabase/` directory
    - Implement `createClient()` function using `createBrowserClient` with env vars
    - _Requirements: 9.1, 9.4_

  - [x] 1.2 Create `lib/supabase/server.ts` server client factory using `createServerClient` from `@supabase/ssr`
    - Implement async `createClient()` that reads cookies from `next/headers`
    - Configure `getAll` and `setAll` cookie handlers
    - _Requirements: 9.2, 6.4, 6.5_

  - [x] 1.3 Create `lib/supabase/middleware.ts` middleware client with `updateSession` function
    - Implement `updateSession(request)` that creates a server client with request/response cookie bridging
    - Call `supabase.auth.getUser()` to validate session and refresh tokens
    - Return `{ user, supabaseResponse }` tuple
    - _Requirements: 9.3, 6.2_

  - [x] 1.4 Refactor `lib/supabase.ts` to re-export browser client for backward compatibility
    - Replace existing Proxy-based client with import from `lib/supabase/client`
    - Export `supabase` as `createClient()` result to maintain existing import paths
    - Verify all existing service layer imports (`lib/services/tasks.ts`, `lib/services/types.ts`, etc.) continue to work
    - _Requirements: 9.5_

  - [x] 1.5 Create `lib/auth/validation.ts` with pure validation functions
    - Implement `validateEmail`, `validatePassword`, `validateConfirmPassword`, `validateDisplayName`
    - Implement `validateRegistrationInput` and `validateLoginInput` composite validators
    - Export `ValidationResult` interface
    - _Requirements: 1.4, 1.5, 1.6, 8.7_

  - [x]* 1.6 Write property test for registration input validation (Property 1)
    - **Property 1: Registration input validation rejects all invalid inputs**
    - Use fast-check to generate arbitrary strings for email, password, confirmPassword
    - Assert that any input with invalid email format OR password < 6 chars OR mismatched passwords returns `{ valid: false }`
    - **Validates: Requirements 1.4, 1.5, 1.6**

  - [x]* 1.7 Write property test for auth route handler input validation (Property 5)
    - **Property 5: Auth route handler input validation**
    - Use fast-check to generate request bodies with missing/invalid fields
    - Assert that `validateRegistrationInput` and `validateLoginInput` reject all invalid inputs with appropriate error keys
    - **Validates: Requirements 8.1, 8.2, 8.7**

- [x] 2. Middleware and route protection
  - [x] 2.1 Create `middleware.ts` at project root with route protection logic
    - Define `PROTECTED_ROUTES` array (/, /tasks, /master, /account)
    - Define `AUTH_ROUTES` array (/login, /register)
    - Implement redirect logic: unauthenticated on protected → /login, authenticated on auth → /
    - Configure `matcher` to exclude static assets
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x]* 2.2 Write property test for route protection logic (Property 2)
    - **Property 2: Route protection enforces authentication on all protected paths**
    - Use fast-check to generate arbitrary path strings matching protected route patterns
    - Assert that paths matching protected routes without a session produce redirect to /login
    - Assert that auth routes with a valid session produce redirect to /
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 3. Auth API route handlers
  - [x] 3.1 Create `/api/auth/register/route.ts` POST handler
    - Parse JSON body, run `validateRegistrationInput`
    - Return 400 with errors if validation fails
    - Call `supabase.auth.signUp()` with trimmed email and password
    - On success, insert initial `player_stats` record (level 1, xp 0, streak 0)
    - Return generic error on failure (no account existence leak)
    - _Requirements: 8.1, 1.2, 1.3, 8.5, 8.7, 8.8_

  - [x] 3.2 Create `/api/auth/login/route.ts` POST handler
    - Parse JSON body, run `validateLoginInput`
    - Return 400 with errors if validation fails
    - Call `supabase.auth.signInWithPassword()`
    - Return 401 with generic "Invalid credentials. The realm rejects your entry." on failure
    - Return 200 with `{ success: true }` on success (cookies set automatically by SSR client)
    - _Requirements: 8.2, 2.2, 2.3, 8.5, 8.7, 8.8_

  - [x] 3.3 Create `/api/auth/logout/route.ts` POST handler
    - Call `supabase.auth.signOut()` to invalidate session
    - Return 200 with `{ success: true }`
    - _Requirements: 8.3, 6.3_

  - [x] 3.4 Create `/api/auth/profile/route.ts` PATCH handler
    - Parse JSON body, validate display name with `validateDisplayName`
    - Return 400 if validation fails
    - Call `supabase.auth.updateUser({ data: { display_name } })`
    - Return 500 with generic error on failure
    - Return 200 with `{ success: true }` on success
    - _Requirements: 8.4, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Database migration for user-scoped data
  - [x] 5.1 Create SQL migration file adding `user_id` columns and RLS policies
    - Add `user_id UUID NOT NULL REFERENCES auth.users(id)` to tasks, player_stats, types, pics tables
    - Add UNIQUE constraint on `player_stats.user_id`
    - Create indexes on `user_id` for all tables
    - Enable RLS on all tables
    - Create SELECT/INSERT/UPDATE/DELETE policies for tasks, types, pics (owner only)
    - Create SELECT/UPDATE policies for player_stats (owner only)
    - Set `DEFAULT auth.uid()` on user_id columns
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 5.2 Update TypeScript interfaces in `lib/types.ts` to include `user_id` field
    - Add `user_id: string` to Task, PlayerStats, TaskType, and PIC interfaces
    - _Requirements: 5.1_

- [x] 6. Auth UI components
  - [x] 6.1 Create `components/auth/AuthCard.tsx` — centered card container
    - Dark card background, pixel border (4px solid #2a2a4a), max-w-[480px]
    - Vertically and horizontally centered on page
    - Apply Scanline_Overlay effect
    - _Requirements: 7.4, 7.6_

  - [x] 6.2 Create `components/auth/AuthInput.tsx` — styled form input
    - Dark background (#1a1a2e), pixel borders (4px solid #2a2a4a, 2px border-radius)
    - VT323 font for input text
    - Label with VT323 font
    - Support type prop (text, email, password)
    - _Requirements: 7.1, 7.2_

  - [x] 6.3 Create `components/auth/AuthButton.tsx` — gold legendary button with loading state
    - Legendary gold (#f0c040) background, dark text (#0d0d1a), pixel borders
    - Gold glow box-shadow on hover
    - Loading state: disabled + spinner/indicator
    - Support variant prop for destructive (logout) styling
    - _Requirements: 7.3, 1.9, 2.4_

  - [x] 6.4 Create `components/auth/AuthError.tsx` — error message container
    - Red-tinted pixel-bordered container
    - Overdue red (#ef4444) border glow
    - Accepts message string prop
    - _Requirements: 7.5_

- [x] 7. Page components (register, login, account)
  - [x] 7.1 Create `app/register/page.tsx` with RegisterForm client component
    - Heading "Create Your Hero" in Press Start 2P font with pixel text shadow
    - Email, password, confirm password inputs using AuthInput
    - "Begin Adventure" submit button using AuthButton
    - Client-side validation before submit (email format, password length, password match)
    - POST to /api/auth/register, handle errors with AuthError
    - On success, redirect to "/"
    - Link to login: "Already a hero? Enter the Realm"
    - Loading state during submission
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 7.2 Create `app/login/page.tsx` with LoginForm client component
    - Heading "Enter the Realm" in Press Start 2P font with pixel text shadow
    - Email, password inputs using AuthInput
    - "Enter" submit button using AuthButton
    - POST to /api/auth/login, handle errors with AuthError
    - On success, redirect to "/"
    - Link to register: "New hero? Create Your Hero"
    - Loading state during submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.3 Create `app/account/page.tsx` with AccountPanel client component
    - Include Sidebar with "Hero Profile" as active route
    - Heading "Hero Profile" in Press Start 2P font
    - Display Hero's email (read-only)
    - Display name input with save functionality (PATCH /api/auth/profile)
    - Player_Stats panel showing level, XP, streak in RPG style
    - "Log Out" button that POSTs to /api/auth/logout and redirects to /login
    - Loading states for save and logout actions
    - Error display with AuthError
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Service layer updates and integration wiring
  - [x] 9.1 Update `lib/services/tasks.ts` to include `user_id` in insert operations
    - Ensure task creation passes `user_id` from authenticated session
    - RLS handles filtering on read, but explicit user_id on insert ensures correctness
    - _Requirements: 5.6_

  - [x] 9.2 Update `lib/services/types.ts` and `lib/services/pics.ts` to include `user_id` in insert operations
    - Same pattern as tasks: pass user_id on create operations
    - _Requirements: 5.6_

  - [x] 9.3 Update `lib/services/player-stats.ts` to work with user-scoped data
    - Ensure player stats queries work with RLS (no explicit user_id filter needed for reads due to RLS)
    - Verify update operations work correctly with RLS policies
    - _Requirements: 5.3_

  - [x] 9.4 Update Sidebar component to add "Hero Profile" navigation link to /account
    - Add account/profile link to sidebar navigation
    - Highlight as active when on /account route
    - _Requirements: 7.7_

  - [x]* 9.5 Write unit tests for auth validation functions
    - Test `validateEmail` with valid/invalid emails
    - Test `validatePassword` with boundary cases (5 chars, 6 chars)
    - Test `validateConfirmPassword` with matching/non-matching
    - Test `validateDisplayName` with empty, valid, and >50 char inputs
    - Test composite validators with various input combinations
    - _Requirements: 1.4, 1.5, 1.6, 8.7_

  - [x]* 9.6 Write unit tests for middleware route matching logic
    - Test protected routes redirect unauthenticated users to /login
    - Test auth routes redirect authenticated users to /
    - Test static assets are not intercepted
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `@supabase/ssr` package must be installed before implementing client refactoring (task 1.1)
- Database migration (task 5.1) should be run against the Supabase project before testing data isolation
- Existing service layer imports from `lib/supabase` will continue to work after task 1.4 refactoring

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.5"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.6", "1.7"] },
    { "id": 2, "tasks": ["1.4", "2.1", "5.2"] },
    { "id": 3, "tasks": ["2.2", "3.1", "3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 7, "tasks": ["9.5", "9.6"] }
  ]
}
```
