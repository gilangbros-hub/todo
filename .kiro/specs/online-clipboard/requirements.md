# Requirements Document

## Introduction

Online Clipboard is a feature for the Quest Board application that allows users to quickly save, organize, and share text snippets, links, and markdown content. It serves as a persistent scratch pad for capturing information while working on quests — notes, URLs, code fragments, or any text that needs to be accessible across devices or shared externally. The feature integrates with the existing RPG theme and follows the established data access patterns (service layer, RLS, input validation).

## Glossary

- **Clipboard**: The Online Clipboard system responsible for managing Clip records, providing CRUD operations, and enabling sharing
- **Clip**: A single saved text snippet with a title, content body, and optional metadata
- **Clip_List**: The page view displaying all Clips belonging to the authenticated user
- **Share_Link**: A unique, publicly accessible URL that allows unauthenticated viewers to read a single Clip without logging in
- **Share_Token**: A cryptographically random identifier embedded in a Share_Link that maps to a specific Clip

## Requirements

### Requirement 1: Clip Creation

**User Story:** As a user, I want to quickly save text snippets and links while working on quests, so that I can capture information without leaving the Quest Board.

#### Acceptance Criteria

1. WHEN the user submits a new Clip with a title between 1 and 100 characters and content between 1 and 10000 characters, THE Clipboard SHALL persist the Clip to the database with the authenticated user's identity and a created_at timestamp
2. WHEN the user submits a new Clip, THE Clipboard SHALL validate and cap the title using capString with a maximum of 100 characters and the content using capString with a maximum of 10000 characters, where whitespace-only input is treated as empty after trimming
3. IF the user submits a Clip with an empty title or empty content (including whitespace-only input that becomes empty after trimming), THEN THE Clipboard SHALL reject the submission and display a validation error message indicating both fields are required
4. IF Clip persistence fails, THEN THE Clipboard SHALL display an error message indicating the Clip could not be saved and preserve the user's entered data in the form
5. WHEN the Clip is successfully persisted, THE Clipboard SHALL display a confirmation indicator for at least 2 seconds, clear the form fields, and add the new Clip to the displayed Clip_List without requiring a full page reload

### Requirement 2: Clip Listing and Display

**User Story:** As a user, I want to see all my saved clips in one place, so that I can quickly find and access previously saved information.

#### Acceptance Criteria

1. WHEN the user navigates to the clipboard page, THE Clipboard SHALL display up to 50 Clips per page belonging to the authenticated user, ordered by created_at descending (newest first), with pagination controls to access older clips
2. THE Clipboard SHALL display each Clip in the Clip_List with its title, a truncated preview of the content (first 150 characters followed by "..." if truncated), and the created_at timestamp formatted as a relative time using the thresholds: under 60 seconds as "just now", under 60 minutes as "Xm ago", under 24 hours as "Xh ago", under 7 days as "Xd ago", and older as the date in "MMM D, YYYY" format
3. WHEN the user selects a Clip from the Clip_List, THE Clipboard SHALL display the full content of the Clip rendered as CommonMark markdown
4. IF no Clips exist for the authenticated user, THEN THE Clipboard SHALL display an empty state message indicating no clips have been saved
5. IF the Clipboard fails to retrieve Clips from the data source, THEN THE Clipboard SHALL display an error message indicating that clips could not be loaded and provide a retry action

### Requirement 3: Clip Editing

**User Story:** As a user, I want to edit my saved clips, so that I can update information as it changes.

#### Acceptance Criteria

1. WHEN the user edits an existing Clip and submits a title between 1 and 100 characters and content between 1 and 10000 characters, THE Clipboard SHALL update the Clip in the database, set an updated_at timestamp, and display a success confirmation to the user
2. THE Clipboard SHALL apply the same validation rules for editing as for creation: capString with maximum 100 characters for title and maximum 10000 characters for content, truncating input that exceeds the maximum length before persistence
3. IF the user submits an edit with an empty title or empty content, THEN THE Clipboard SHALL reject the update, preserve the existing Clip data unchanged, and display a validation error message indicating both fields are required
4. IF the user attempts to edit a Clip that does not exist or does not belong to them, THEN THE Clipboard SHALL reject the update and display an error message indicating the Clip was not found

### Requirement 4: Clip Deletion

**User Story:** As a user, I want to delete clips I no longer need, so that my clipboard stays organized and relevant.

#### Acceptance Criteria

1. WHEN the user initiates deletion of a Clip, THE Clipboard SHALL display a confirmation prompt that identifies the Clip being deleted and presents confirm and cancel actions
2. IF the user cancels the deletion confirmation, THEN THE Clipboard SHALL dismiss the prompt and leave the Clip unchanged in the Clip_List
3. WHEN the user confirms deletion, THE Clipboard SHALL remove the Clip from the database and remove it from the displayed Clip_List within 2 seconds
4. IF the deleted Clip had an active Share_Link, THEN THE Clipboard SHALL invalidate the Share_Link so that the Share_Token no longer resolves to any content
5. IF the deletion operation fails due to a system error, THEN THE Clipboard SHALL display an error message indicating the Clip was not deleted and retain the Clip in the Clip_List

### Requirement 5: Copy to System Clipboard

**User Story:** As a user, I want to copy clip content to my device clipboard with one click, so that I can quickly paste it into other applications.

#### Acceptance Criteria

1. WHEN the user clicks the copy button on a Clip, THE Clipboard SHALL copy the full plain-text content of the Clip to the device system clipboard using the Clipboard API
2. WHEN the copy action succeeds, THE Clipboard SHALL display a visible confirmation indicator (e.g., "Copied!") for 2 seconds, then return the button to its default state
3. IF the Clipboard API is unavailable or the copy action fails, THEN THE Clipboard SHALL display an error message indicating the content could not be copied for 5 seconds, and instruct the user to manually select the text and copy using keyboard shortcut
4. IF the user triggers the copy action while a confirmation indicator is already displayed, THEN THE Clipboard SHALL restart the 2-second confirmation timer from the beginning

### Requirement 6: External Sharing via Public Link

**User Story:** As a user, I want to share a clip via a public link, so that I can send quest information to people who do not have a Quest Board account.

#### Acceptance Criteria

1. WHEN the user enables sharing on a Clip that does not already have a Share_Token, THE Clipboard SHALL generate a Share_Token (a cryptographically random, URL-safe string between 22 and 64 characters) and persist it alongside the Clip record
2. IF the user enables sharing on a Clip that already has an active Share_Token, THEN THE Clipboard SHALL retain the existing Share_Token and display the current Share_Link without generating a new token
3. WHEN a Share_Token is generated or already exists, THE Clipboard SHALL construct a Share_Link in the format "/clipboard/share/[share_token]" and display it to the user with a copy-to-clipboard button
4. WHEN an unauthenticated visitor navigates to a valid Share_Link, THE Clipboard SHALL display the Clip title and full content with markdown rendering, without requiring authentication
5. IF a visitor navigates to a Share_Link with a Share_Token that does not match any Clip record in the database, THEN THE Clipboard SHALL display a not-found message indicating the shared clip is unavailable
6. WHEN the user disables sharing on a Clip, THE Clipboard SHALL remove the Share_Token from the database, immediately invalidating the previously generated Share_Link
7. IF Share_Token generation or persistence fails, THEN THE Clipboard SHALL display an error message indicating that sharing could not be enabled and leave the Clip's sharing state unchanged

### Requirement 7: Cross-Device Access

**User Story:** As a user, I want to access my clips from any device where I am logged in, so that I can copy-paste information between my phone and computer.

#### Acceptance Criteria

1. THE Clipboard SHALL associate all Clips with the authenticated user's identity via user_id, ensuring Clips are accessible from any device where the user is authenticated
2. THE Clipboard SHALL enforce Row Level Security policies on the clips table so that each user can only read, create, update, and delete their own Clips
3. WHEN a Clip is created, updated, or deleted on one device, THE Clipboard SHALL make the change available to other authenticated sessions of the same user within 5 seconds
4. IF a user attempts to access Clips without a valid authenticated session, THEN THE Clipboard SHALL reject the request and return no Clip data

### Requirement 8: Database Schema and Persistence

**User Story:** As a user, I want my clips reliably persisted, so that saved information is not lost between sessions.

#### Acceptance Criteria

1. THE Clipboard SHALL store Clips in a "clips" table with columns: id (UUID primary key, default gen_random_uuid()), user_id (UUID, not null, default auth.uid()), title (varchar 100, not null), content (text, not null), share_token (varchar 64, nullable, unique), created_at (timestamptz, not null, default now()), updated_at (timestamptz, nullable)
2. THE Clipboard SHALL create an index on the clips table for user_id to optimize per-user queries
3. THE Clipboard SHALL create a unique index on the clips table for share_token where share_token is not null, to enable efficient public link lookups
4. THE Clipboard SHALL enforce a CHECK constraint that title is not empty (char_length(title) > 0) and content is not empty (char_length(content) > 0)
5. THE Clipboard SHALL enforce Row Level Security on the clips table with policies that allow authenticated users to SELECT, INSERT, UPDATE, and DELETE only rows where user_id equals auth.uid()
6. THE Clipboard SHALL create a permissive SELECT policy for unauthenticated (anon) access on the clips table restricted to rows where share_token is not null, enabling public Share_Link access
7. WHEN a row in the clips table is updated, THE Clipboard SHALL automatically set the updated_at column to the current timestamp via a database trigger, so that the modification time is always recorded without relying on application logic
8. THE Clipboard SHALL enforce a CHECK constraint that content length does not exceed 50000 characters (char_length(content) <= 50000) to prevent unbounded storage consumption per clip

### Requirement 9: Clipboard Navigation and Routing

**User Story:** As a user, I want to access the clipboard from the main navigation, so that I can quickly switch between quests and my saved clips.

#### Acceptance Criteria

1. THE Clipboard SHALL be accessible at the route "/clipboard" as a protected page requiring authentication, returning a successful page render for authenticated users
2. THE Clipboard SHALL display a navigation link in the application sidebar labeled "Scroll Pouch" linking to "/clipboard", positioned among the existing navigation items
3. THE Clipboard SHALL serve the public share view at "/clipboard/share/[share_token]" as an unprotected route accessible without authentication
4. IF an unauthenticated user navigates to "/clipboard", THEN THE Clipboard SHALL redirect the user to the "/login" page
5. IF a user navigates to "/clipboard/share/[share_token]" with a share_token that does not match any existing shared clipboard entry, THEN THE Clipboard SHALL display an error message indicating the shared content was not found

### Requirement 10: Input Validation and Security

**User Story:** As a user, I want my clipboard data handled securely, so that malicious content cannot compromise the application.

#### Acceptance Criteria

1. THE Clipboard SHALL validate all user-provided string inputs on both create and update operations by applying capString from @/lib/security with a maximum of 100 characters for title and 10000 characters for content, silently truncating any input exceeding these limits before database writes
2. THE Clipboard SHALL render Clip content using a markdown renderer configured with raw HTML disabled, ensuring that no embedded HTML elements or script content is interpreted as markup or executed as code
3. WHEN the user enables sharing on a Clip, THE Clipboard SHALL generate a Share_Token using a cryptographically secure random source (e.g., crypto.randomUUID or equivalent) producing a token between 22 and 64 characters consisting only of URL-safe characters (letters, digits, hyphens, and underscores)
4. THE Clipboard SHALL enforce that the user_id column is set by the database default (auth.uid()) and never accept user_id from client input
5. IF a Clip content contains HTML tags or script elements, THEN THE Clipboard SHALL render them as escaped plain text within the markdown output, preventing XSS execution
