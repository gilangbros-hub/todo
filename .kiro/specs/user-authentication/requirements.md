# Requirements Document

## Introduction

User Authentication adds identity and access control to the Quest Board application, transforming it from a single-player experience into a multi-user RPG platform. The feature introduces three new pages — "Create Your Hero" (registration), "Enter the Realm" (login), and "Hero Profile" (account management) — all styled with the existing retro pixel/8-bit RPG aesthetic. Authentication is powered by Supabase Auth using email and password credentials. Once authenticated, each player's quests, progress, and stats are scoped to their account via Row Level Security. Unauthenticated visitors are redirected to the login page.

## Glossary

- **Auth_System**: The authentication subsystem built on Supabase Auth responsible for user registration, login, session management, and route protection
- **Hero**: An authenticated user account in the Quest Board application
- **Session**: A Supabase Auth session containing access and refresh tokens that identifies the currently authenticated Hero
- **Register_Page**: The "Create Your Hero" page where new users create an account using email and password
- **Login_Page**: The "Enter the Realm" page where existing users authenticate with their credentials
- **Account_Page**: The "Hero Profile" page where authenticated users view and manage their profile information
- **Protected_Route**: Any application route that requires a valid Session to access, redirecting unauthenticated visitors to the Login_Page
- **Auth_Middleware**: Next.js middleware that intercepts requests to Protected_Routes and validates the Session before allowing access
- **Player_Stats**: The persistent record of a Hero's XP, level, and streak data, linked to the Hero via user_id
- **Quest_Board**: The main application system responsible for managing quests, player progression, and the RPG-themed user interface
- **RLS_Policy**: A Supabase Row Level Security policy that restricts database row access to the owning Hero

## Requirements

### Requirement 1: Hero Registration (Create Your Hero)

**User Story:** As a new visitor, I want to create an account with my email and password, so that I can begin my quest journey with a personal hero profile.

#### Acceptance Criteria

1. WHEN the user navigates to /register, THE Auth_System SHALL display the Register_Page with a heading "Create Your Hero", an email input field, a password input field, a confirm password input field, and a "Begin Adventure" submit button, all styled with the RPG pixel theme (pixel borders, dark card background, "Press Start 2P" heading font, "VT323" body font)
2. WHEN the user submits the registration form with a valid email address and a password of at least 6 characters that matches the confirm password field, THE Auth_System SHALL send the credentials to the /api/auth/register Route Handler, which creates a new user account in Supabase Auth and initializes a Player_Stats record with level 1, 0 XP, and streak 0 linked to the new user
3. IF the user submits the registration form with an email address that is already registered, THEN THE Auth_System SHALL display an error message indicating the email is already in use without revealing whether the account exists for security purposes
4. IF the user submits the registration form with a password shorter than 6 characters, THEN THE Auth_System SHALL display a validation error message indicating the minimum password length requirement
5. IF the user submits the registration form where the password and confirm password fields do not match, THEN THE Auth_System SHALL display a validation error message indicating the passwords do not match
6. IF the user submits the registration form with an invalid email format, THEN THE Auth_System SHALL display a validation error message indicating a valid email address is required
7. WHEN registration is successful, THE Auth_System SHALL automatically sign in the new Hero, create their Session, and redirect to the root dashboard path "/"
8. THE Register_Page SHALL display a link to the Login_Page with text "Already a hero? Enter the Realm" for users who already have an account
9. WHILE the registration request is being processed, THE Auth_System SHALL disable the submit button and display a loading indicator to prevent duplicate submissions

### Requirement 2: Hero Login (Enter the Realm)

**User Story:** As a returning hero, I want to sign in with my email and password, so that I can access my quests and continue my adventure.

#### Acceptance Criteria

1. WHEN the user navigates to /login, THE Auth_System SHALL display the Login_Page with a heading "Enter the Realm", an email input field, a password input field, and a "Enter" submit button, all styled with the RPG pixel theme (pixel borders, dark card background, "Press Start 2P" heading font, "VT323" body font)
2. WHEN the user submits the login form with valid credentials matching an existing account, THE Auth_System SHALL send the credentials to the /api/auth/login Route Handler, which creates a Session, sets secure cookies, and returns a success response prompting the client to redirect the Hero to the root dashboard path "/"
3. IF the user submits the login form with credentials that do not match any account, THEN THE Auth_System SHALL display a generic error message "Invalid credentials. The realm rejects your entry." without specifying whether the email or password was incorrect
4. WHILE the login request is being processed, THE Auth_System SHALL disable the submit button and display a loading indicator to prevent duplicate submissions
5. THE Login_Page SHALL display a link to the Register_Page with text "New hero? Create Your Hero" for users who need to create an account
6. WHEN an authenticated Hero navigates to /login, THE Auth_System SHALL redirect the Hero to the root dashboard path "/" instead of displaying the login form

### Requirement 3: Hero Profile (Account Page)

**User Story:** As an authenticated hero, I want to view and manage my profile, so that I can update my display name and see my account details.

#### Acceptance Criteria

1. WHEN an authenticated Hero navigates to /account, THE Auth_System SHALL display the Account_Page with a heading "Hero Profile", the Hero's email address, a display name field, and a "Save Changes" button, all styled with the RPG pixel theme
2. THE Account_Page SHALL display the Hero's current Player_Stats including level, total XP, and current streak in an RPG-styled stats panel
3. WHEN the Hero updates their display name and submits the form, THE Auth_System SHALL send the update to the /api/auth/profile Route Handler, which persists the updated display name to the user metadata in Supabase Auth
4. IF the display name update fails, THEN THE Auth_System SHALL display an error message indicating the profile could not be updated
5. THE Account_Page SHALL provide a "Log Out" button that, when clicked, sends a request to the /api/auth/logout Route Handler to terminate the current Session, clear all stored tokens, and redirect to the Login_Page
6. WHEN an unauthenticated user navigates to /account, THE Auth_System SHALL redirect the user to the Login_Page
7. WHILE the profile update request is being processed, THE Auth_System SHALL disable the save button and display a loading indicator to prevent duplicate submissions

### Requirement 4: Route Protection

**User Story:** As the system owner, I want only authenticated users to access the quest board and its features, so that each hero's data remains private and secure.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL intercept all requests to Protected_Routes (root "/", "/tasks/[id]", "/master", "/master/types", "/master/pics", "/account") and validate that a valid Session exists
2. IF a request to a Protected_Route does not include a valid Session, THEN THE Auth_Middleware SHALL redirect the user to "/login"
3. THE Auth_Middleware SHALL allow unauthenticated access to "/login" and "/register" without redirection
4. WHEN an authenticated Hero navigates to "/login" or "/register", THE Auth_System SHALL redirect the Hero to the root dashboard path "/"
5. WHEN a Session expires or becomes invalid during an active browser session, THE Auth_System SHALL redirect the Hero to the Login_Page on the next navigation or API request
6. THE Auth_System SHALL use Supabase server-side session validation in the Auth_Middleware to prevent token forgery

### Requirement 5: User-Scoped Data Isolation

**User Story:** As a hero, I want my quests and progress to be private to my account, so that other heroes cannot see or modify my data.

#### Acceptance Criteria

1. THE Auth_System SHALL add a user_id column (UUID, NOT NULL, referencing auth.users) to the tasks, player_stats, types, and pics tables
2. THE Auth_System SHALL create RLS_Policies on the tasks table that restrict SELECT, INSERT, UPDATE, and DELETE operations to rows where user_id matches the authenticated Hero's ID
3. THE Auth_System SHALL create RLS_Policies on the player_stats table that restrict SELECT and UPDATE operations to the row where user_id matches the authenticated Hero's ID
4. THE Auth_System SHALL create RLS_Policies on the types table that restrict SELECT, INSERT, UPDATE, and DELETE operations to rows where user_id matches the authenticated Hero's ID
5. THE Auth_System SHALL create RLS_Policies on the pics table that restrict SELECT, INSERT, UPDATE, and DELETE operations to rows where user_id matches the authenticated Hero's ID
6. WHEN a Hero creates a new Task, Type, or PIC, THE Auth_System SHALL automatically set the user_id field to the authenticated Hero's ID
7. THE Auth_System SHALL enable Row Level Security on all tables (tasks, player_stats, types, pics) in the Supabase database

### Requirement 6: Session Management

**User Story:** As a hero, I want my session to persist across page refreshes and browser tabs, so that I do not need to log in repeatedly.

#### Acceptance Criteria

1. THE Auth_System SHALL persist the Session using Supabase Auth's default cookie-based storage mechanism compatible with Next.js server-side rendering
2. WHEN the Hero's access token is nearing expiration, THE Auth_System SHALL automatically refresh the token using the refresh token without requiring user interaction
3. WHEN the Hero clicks "Log Out" on the Account_Page, THE Auth_System SHALL invalidate the current Session, clear all stored tokens, and redirect to the Login_Page
4. THE Auth_System SHALL use the Supabase SSR package (@supabase/ssr) to manage cookies for server-side and client-side session access in the Next.js App Router environment
5. WHEN the Auth_System creates a Supabase client for server components or middleware, THE Auth_System SHALL read the Session from request cookies to enable authenticated data fetching on the server

### Requirement 7: Authentication UI Integration with Existing Theme

**User Story:** As a hero, I want the authentication pages to feel like part of the RPG world, so that the login and registration experience is immersive and consistent.

#### Acceptance Criteria

1. THE Auth_System SHALL render all authentication page headings using the "Press Start 2P" font with a 2px pixel text shadow and all form labels and body text using the "VT323" font
2. THE Auth_System SHALL style all authentication form inputs with a dark background (#1a1a2e), pixel borders (4px solid #2a2a4a, 2px border-radius), and "VT323" font for input text
3. THE Auth_System SHALL style the primary submit buttons with the legendary gold color (#f0c040) background, dark text (#0d0d1a), pixel borders, and a gold glow box-shadow on hover
4. THE Auth_System SHALL center authentication forms vertically and horizontally on the page within an RPG-styled card container (dark card background, pixel border, maximum width of 480px)
5. THE Auth_System SHALL display error messages in a red-tinted pixel-bordered container with the overdue red color (#ef4444) border glow
6. THE Auth_System SHALL apply the Scanline_Overlay effect on authentication pages consistent with the rest of the application
7. THE Auth_System SHALL include the sidebar navigation on the Account_Page with a link to the Hero Profile highlighted as the active route

### Requirement 8: Server-Side Auth API Routes

**User Story:** As a developer, I want all authentication operations to be processed through server-side API routes, so that Supabase credentials and auth logic are never exposed to the browser.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a Next.js Route Handler at /api/auth/register that accepts POST requests with email, password, and confirm password fields, validates the input server-side, and calls Supabase Auth to create the user account
2. THE Auth_System SHALL provide a Next.js Route Handler at /api/auth/login that accepts POST requests with email and password fields, validates the input server-side, and calls Supabase Auth to sign in the user
3. THE Auth_System SHALL provide a Next.js Route Handler at /api/auth/logout that accepts POST requests, invalidates the current Session on the server, clears Session cookies, and returns a success response
4. THE Auth_System SHALL provide a Next.js Route Handler at /api/auth/profile that accepts PATCH requests with display name updates, validates the input server-side, and calls Supabase Auth to update user metadata
5. THE Auth_System SHALL perform all Supabase Auth operations exclusively on the server side within Route Handlers, ensuring the Supabase service role key or sensitive auth logic is never sent to or executed in the browser
6. WHEN a client-side form submits an authentication request, THE Auth_System SHALL send the request to the corresponding /api/auth/* Route Handler and handle the response (success redirect or error display) on the client
7. IF a Route Handler receives a request with missing or invalid fields, THEN THE Auth_System SHALL return a 400 status code with a descriptive error message without forwarding the request to Supabase
8. THE Auth_System SHALL set secure, httpOnly Session cookies in the Route Handler responses to establish the authenticated Session after successful login or registration

### Requirement 9: Supabase Client Refactoring

**User Story:** As a developer, I want the Supabase client setup to support authenticated sessions, so that all database operations respect the current user's identity.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a browser-side Supabase client (using createBrowserClient from @supabase/ssr) that automatically includes the Session cookies in all requests for data operations (tasks, types, pics, player_stats)
2. THE Auth_System SHALL provide a server-side Supabase client factory (using createServerClient from @supabase/ssr) that reads Session cookies from the Next.js request context for use in Server Components, Route Handlers, and auth API routes
3. THE Auth_System SHALL provide a middleware Supabase client factory that can read and refresh Session cookies within the Next.js middleware execution context
4. WHEN the browser-side Supabase client detects an auth state change (sign in, sign out, token refresh), THE Auth_System SHALL update the stored Session cookies accordingly
5. THE Auth_System SHALL replace the existing single Supabase client proxy in lib/supabase.ts with the new browser-side client while maintaining backward compatibility with existing service layer imports
