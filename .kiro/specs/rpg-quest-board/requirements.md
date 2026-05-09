# Requirements Document

## Introduction

Quest Board is a full-stack gamified RPG-style to-do list application with a retro pixel/8-bit aesthetic. The application transforms mundane task management into an engaging RPG experience where tasks are quests, categories are guilds, assignees are party members, and completing work earns XP and levels. Built with Next.js 14, Supabase, and Tailwind CSS, deployed on Vercel.

## Glossary

- **Quest_Board**: The main application system responsible for managing quests (tasks), player progression, and the RPG-themed user interface
- **Task**: A quest item representing a unit of work with title, description, type, assignee, deadline, status, priority, and XP reward
- **Type**: A category or guild classification for grouping tasks (e.g., "Development", "Design")
- **PIC**: Person In Charge — a party member/assignee who can be assigned to tasks
- **Subtask**: A child task linked to a parent task via parent_task_id, forming a branching tree structure
- **Branch_Type**: The execution mode for subtasks — either sequential (ordered) or parallel (independent)
- **Priority**: The rarity tier of a task — Normal, Rare, Epic, or Legendary — determining visual styling and XP reward
- **Status**: The current state of a task — todo, in_progress, done, or overdue
- **XP**: Experience points earned by completing tasks, used for leveling up
- **Player_Stats**: The persistent record of a player's XP, level, and streak data
- **Streak**: A count of consecutive days where at least one task was completed
- **Wizard_Modal**: The multi-step task creation interface presented as an overlay dialog
- **Kanban_View**: A board layout displaying tasks in columns grouped by status
- **Folder_View**: A grouped layout displaying tasks organized by their Type
- **Scanline_Overlay**: A CRT-style visual effect applied as a repeating linear gradient over the background
- **XP_Toast**: A notification element that slides in to display earned XP after task completion

## Requirements

### Requirement 1: Quest Board Dashboard Display

**User Story:** As a user, I want to see all my quests organized on a dashboard, so that I can quickly understand my workload and priorities.

#### Acceptance Criteria

1. WHEN the user navigates to the root path, THE Quest_Board SHALL display a split-view layout with a left sidebar and a main content area, with Kanban_View as the default active view
2. THE Quest_Board SHALL display Player_Stats in the left sidebar including current level, total XP, XP progress to next level, and current Streak count
3. THE Quest_Board SHALL provide navigation links in the left sidebar to the Quest Board, Master Types, and Master PICs pages
4. WHILE Folder_View is active, THE Quest_Board SHALL group Task cards by their assigned Type, and display Tasks with no assigned Type under an "Unassigned" group
5. WHILE Kanban_View is active, THE Quest_Board SHALL display Task cards in four columns: TODO, IN PROGRESS, DONE, and OVERDUE
6. THE Quest_Board SHALL display each Task card with the title, Type badge, assigned PIC, deadline countdown in "Xd Xh" format (days and hours remaining, or "OVERDUE" if past deadline), Priority glow border, Subtask count, and XP reward
7. THE Quest_Board SHALL provide a toggle control to switch between Folder_View and Kanban_View
8. THE Quest_Board SHALL provide filter controls to filter tasks by Status, Priority, Type, and PIC, where multiple filters may be combined using AND logic
9. THE Quest_Board SHALL provide sort controls to sort tasks by deadline, priority, or creation date, with deadline ascending as the default sort order
10. IF no Tasks exist or no Tasks match the active filters, THEN THE Quest_Board SHALL display an empty state message indicating no quests are available

### Requirement 2: Task Creation via Multi-Step Wizard

**User Story:** As a user, I want to create new quests through a guided wizard, so that I can provide all necessary details in a structured and engaging flow.

#### Acceptance Criteria

1. WHEN the user initiates task creation, THE Quest_Board SHALL display the Wizard_Modal with five sequential steps: Name the Quest, Choose the Guild, Set Deadline, Assign Party Member, and Review & Create
2. WHEN on step 1, THE Wizard_Modal SHALL require the user to enter a task title between 3 and 100 characters and an optional description of up to 500 characters
3. WHEN on step 1, THE Wizard_Modal SHALL display a Priority selector with four options: Normal, Rare, Epic, and Legendary, with Normal selected by default
4. WHEN on step 2, THE Wizard_Modal SHALL display all available Types for selection, where selecting a Type is optional and the user may proceed without choosing one
5. WHEN on step 3, THE Wizard_Modal SHALL provide a date picker for setting the task deadline, where the deadline is optional and only dates from today onward are selectable
6. WHEN on step 4, THE Wizard_Modal SHALL display all available PICs for assignment, where assigning a PIC is optional and the user may proceed without choosing one
7. WHILE the Wizard_Modal is on any step after step 1, THE Wizard_Modal SHALL display a Back button that returns the user to the previous step while preserving all previously entered data
8. WHILE the Wizard_Modal is on any step before step 5, THE Wizard_Modal SHALL display a Next button that advances to the next step, enabled only when the current step's required fields are valid
9. WHEN on step 5, THE Wizard_Modal SHALL display a summary of all entered data for review before creation
10. WHEN the user confirms creation on step 5, THE Quest_Board SHALL persist the new Task to the database with status set to "todo" and XP reward calculated from the selected Priority
11. IF task persistence fails, THEN THE Quest_Board SHALL display an error message indicating the task could not be saved and keep the Wizard_Modal open on step 5 with all entered data preserved
12. WHEN a task is successfully created, THE Quest_Board SHALL close the Wizard_Modal and display the new Task card with a bounce entrance animation
13. IF the user closes or dismisses the Wizard_Modal before confirming creation on step 5, THEN THE Quest_Board SHALL discard all entered wizard data and close the modal without persisting any Task

### Requirement 3: Task Detail and Subtask Management

**User Story:** As a user, I want to view full task details and manage subtasks in a branching tree, so that I can break complex quests into smaller steps.

#### Acceptance Criteria

1. WHEN the user navigates to /tasks/[id], THE Quest_Board SHALL display the full Task details including title, description, Type, PIC, deadline, Status, Priority, and XP reward
2. IF the user navigates to /tasks/[id] and no Task with the given id exists, THEN THE Quest_Board SHALL display an error message indicating the task was not found and provide a navigation link back to the dashboard
3. WHEN the current Task has one or more Subtasks, THE Quest_Board SHALL display all Subtasks in a visual tree layout with pixel-art connecting lines, supporting a maximum nesting depth of 3 levels
4. WHEN the Task has Branch_Type set to "sequential", THE Quest_Board SHALL display Subtasks in a numbered ordered list indicating execution order
5. WHEN the Task has Branch_Type set to "parallel", THE Quest_Board SHALL display Subtasks as independent items that can be completed in any order
6. THE Quest_Board SHALL provide a toggle control to switch the parent Task Branch_Type between sequential and parallel, persisting the selected value to the database
7. WHEN the user adds a new Subtask, THE Quest_Board SHALL require at minimum a title, persist the Subtask with the parent_task_id set to the current Task, status set to "todo", and Priority defaulting to the parent Task Priority, and display the Subtask in the tree with a slide-in animation
8. IF the user attempts to add a Subtask that would exceed 3 levels of nesting depth, THEN THE Quest_Board SHALL prevent creation and display an error message indicating the maximum nesting depth has been reached
9. THE Quest_Board SHALL display a progress bar showing the percentage of completed Subtasks relative to total direct Subtasks, displaying 0% when no Subtasks exist

### Requirement 4: Task Completion and XP Reward

**User Story:** As a user, I want to earn XP when I complete quests, so that I feel rewarded and motivated to keep completing tasks.

#### Acceptance Criteria

1. WHEN the user marks a Task as done, THE Quest_Board SHALL update the Task Status to "done", set the completed_at timestamp, and trigger a card flip animation with a completion stamp overlay
2. WHEN a Task is completed, THE Quest_Board SHALL calculate XP reward as: 10 for Normal Priority, 25 for Rare Priority, 50 for Epic Priority, and 100 for Legendary Priority
3. WHEN a Task with a deadline is completed before its deadline, THE Quest_Board SHALL apply a 20 percent early completion bonus to the base XP reward, rounding down to the nearest integer
4. WHEN a Task with a deadline is completed after its deadline, THE Quest_Board SHALL apply a 50 percent late penalty reduction to the base XP reward, rounding down to the nearest integer
5. IF a Task has no deadline assigned, THEN THE Quest_Board SHALL award the base XP for the Priority without any early or late modifier
6. WHEN a Subtask is completed, THE Quest_Board SHALL award half of the XP that would be awarded for a standalone Task of the same Priority, rounding down to the nearest integer
7. WHEN XP is awarded, THE Quest_Board SHALL display an XP_Toast notification that slides in from the bottom-right corner showing the XP amount in gold pixel font and fades out after 2.5 seconds
8. WHEN XP is awarded, THE Quest_Board SHALL add the XP amount to the Player_Stats total XP
9. IF the user marks a Task as done that is already in "done" Status, THEN THE Quest_Board SHALL not award additional XP and shall not change the completed_at timestamp

### Requirement 5: Leveling System

**User Story:** As a user, I want to level up as I accumulate XP, so that I can track my long-term productivity progress.

#### Acceptance Criteria

1. THE Quest_Board SHALL calculate the XP required to advance from the current level to the next level as: current_level multiplied by 100, where the player starts at level 1 with 0 XP and the XP threshold resets each level (i.e., after leveling up, progress toward the next level starts from 0)
2. WHEN the Player_Stats total XP earned within the current level reaches or exceeds the threshold for the next level, THE Quest_Board SHALL increment the player level by one and carry over any excess XP beyond the threshold toward the subsequent level, repeating the level-up check until remaining XP is below the next threshold
3. WHEN a level up occurs, THE Quest_Board SHALL display a fullscreen level-up animation consisting of a dark overlay, pulsing congratulatory text showing the new level number, and pixel confetti effect lasting 3 seconds before automatically dismissing
4. THE Quest_Board SHALL display in the sidebar Player_Stats section the current level number and an XP progress bar representing XP earned within the current level relative to the XP required for the next level
5. IF the Player_Stats record does not yet exist when XP is first awarded, THEN THE Quest_Board SHALL initialize Player_Stats with level 1, 0 XP, and streak 0

### Requirement 6: Streak Tracking

**User Story:** As a user, I want my daily completion streak tracked, so that I am motivated to maintain consistent productivity.

#### Acceptance Criteria

1. WHEN the user completes at least one Task in a UTC calendar day and the last_completed_date in Player_Stats is the immediately preceding UTC calendar day, THE Quest_Board SHALL increment the Streak count by one and update last_completed_date to the current UTC date
2. WHEN the user completes at least one Task in a UTC calendar day and the last_completed_date in Player_Stats is null or is not the immediately preceding UTC calendar day, THE Quest_Board SHALL reset the Streak count to one and update last_completed_date to the current UTC date
3. IF the user completes additional Tasks on the same UTC calendar day after the Streak has already been incremented or reset for that day, THEN THE Quest_Board SHALL not modify the Streak count
4. THE Quest_Board SHALL display the current Streak count in the sidebar Player_Stats section
5. WHEN the user completes a Subtask, THE Quest_Board SHALL treat that completion as a qualifying Task completion for streak tracking purposes

### Requirement 7: Overdue Detection

**User Story:** As a user, I want overdue tasks to be visually flagged, so that I can immediately identify tasks that need urgent attention.

#### Acceptance Criteria

1. WHEN the Quest_Board is loaded or every 60 seconds while the application is open, THE Quest_Board SHALL check all Tasks with a deadline earlier than the current date-time and a Status that is not "done", and update their Status to "overdue"
2. WHILE a Task has Status "overdue", THE Quest_Board SHALL display the Task card with a red glow border and a skull icon indicator
3. WHILE a Task has Status "overdue" in Kanban_View, THE Quest_Board SHALL display the Task in the OVERDUE column
4. WHEN the user marks a Task with Status "overdue" as done, THE Quest_Board SHALL update the Task Status to "done" and apply the late completion XP penalty as defined in Requirement 4
5. IF a Task has no deadline assigned, THEN THE Quest_Board SHALL never transition that Task to "overdue" Status

### Requirement 8: Master Data — Type Management

**User Story:** As a user, I want to manage quest types (guilds), so that I can categorize my tasks in a way that makes sense for my workflow.

#### Acceptance Criteria

1. WHEN the user navigates to /master/types, THE Quest_Board SHALL display a list of all existing Types with their icon, name, and color, ordered by creation date ascending
2. WHEN the user submits a new Type with a name between 1 and 50 characters, a selected icon, and a valid hex color value, THE Quest_Board SHALL persist the Type to the database and display it in the list
3. IF the user submits a Type with an empty name or a name exceeding 50 characters, THEN THE Quest_Board SHALL reject the submission and display a validation error message indicating the name constraint
4. IF the user submits a Type with a name that already exists in the database, THEN THE Quest_Board SHALL reject the submission and display an error message indicating the name is already in use
5. WHEN the user edits an existing Type, THE Quest_Board SHALL update the Type name, icon, or color in the database, subject to the same name length and uniqueness constraints as creation
6. WHEN the user deletes a Type that is not assigned to any Task, THE Quest_Board SHALL remove the Type from the database and remove it from the displayed list
7. IF a Type is assigned to one or more Tasks, THEN THE Quest_Board SHALL prevent deletion and display a warning message indicating the Type is in use and the number of Tasks currently assigned to it

### Requirement 9: Master Data — PIC Management

**User Story:** As a user, I want to manage party members (PICs), so that I can assign quests to the right people.

#### Acceptance Criteria

1. WHEN the user navigates to /master/pics, THE Quest_Board SHALL display a list of all existing PICs with their name, avatar, and RPG class, sorted by creation date in descending order
2. WHEN the user creates a new PIC, THE Quest_Board SHALL persist the PIC with a name (1 to 50 characters), an avatar (a selected image or sprite identifier), and an RPG class selected from a predefined list to the database
3. WHEN the user edits an existing PIC, THE Quest_Board SHALL update the PIC name, avatar, or RPG class in the database using the same validation rules as creation
4. WHEN the user deletes a PIC, THE Quest_Board SHALL display a confirmation prompt before removing the PIC from the database
5. IF a PIC is assigned to one or more Tasks, THEN THE Quest_Board SHALL prevent deletion and display a warning message indicating the PIC is in use
6. IF the user submits a PIC form with a name that is empty or exceeds 50 characters, THEN THE Quest_Board SHALL reject the submission and display a validation error message indicating the name length requirement
7. WHEN no PICs exist in the database, THE Quest_Board SHALL display an empty state message indicating no party members have been created

### Requirement 10: RPG Visual Theme

**User Story:** As a user, I want the app to have a retro pixel RPG aesthetic, so that task management feels immersive and fun.

#### Acceptance Criteria

1. THE Quest_Board SHALL render all header and label text using the "Press Start 2P" font and all body text using the "VT323" font, with a monospace fallback font-family if the primary fonts fail to load
2. THE Quest_Board SHALL apply a dark background color (#0d0d1a) to the page body and lighter card backgrounds (#1a1a2e) to all card elements
3. THE Quest_Board SHALL render all card borders as 4px solid with a default border color of #2a2a4a and a maximum border-radius of 2px
4. THE Quest_Board SHALL apply a Scanline_Overlay effect to the main background using a repeating linear gradient of 2px transparent followed by 2px rgba(0,0,0,0.15)
5. THE Quest_Board SHALL apply a pixel text shadow (2px 2px 0px #000) to all header text elements
6. WHEN the user hovers over a Task card, THE Quest_Board SHALL apply a translateY(-4px) lift transform and increase the border glow box-shadow spread by 4px with a 0.1 second ease transition
7. THE Quest_Board SHALL display Task Priority as RPG rarity tiers with matching border glow colors: Normal as gray (#6b7280), Rare as blue (#4a9eff), Epic as purple (#a78bfa), and Legendary as gold (#f0c040)
8. THE Quest_Board SHALL display Task Status as RPG-style badges formatted as bracketed uppercase text with the following mappings: todo as "[ TODO ]", in_progress as "[ IN PROGRESS ]", done as "[ COMPLETE ]", and overdue as "[ OVERDUE ]"
9. THE Quest_Board SHALL apply `image-rendering: pixelated` to all icon and sprite elements

### Requirement 11: Database Schema and Persistence

**User Story:** As a user, I want my data persisted reliably, so that my quests, progress, and settings are preserved across sessions.

#### Acceptance Criteria

1. THE Quest_Board SHALL store Types in a "types" table with columns: id (primary key), name (max 50 characters, not null), icon (max 100 characters, not null), color (max 20 characters, not null), created_at (not null, defaults to current timestamp)
2. THE Quest_Board SHALL store PICs in a "pics" table with columns: id (primary key), name (max 50 characters, not null), avatar (max 255 characters, not null), rpg_class (max 30 characters, not null), created_at (not null, defaults to current timestamp)
3. THE Quest_Board SHALL store Tasks in a "tasks" table with columns: id (primary key), title (max 100 characters, not null), description (max 500 characters, nullable), type_id (foreign key to types, nullable), pic_id (foreign key to pics, nullable), deadline (nullable), status (not null, constrained to "todo", "in_progress", "done", "overdue"), priority (not null, constrained to "normal", "rare", "epic", "legendary"), parent_task_id (foreign key to tasks, nullable), branch_type (nullable, constrained to "sequential" or "parallel"), branch_order (nullable, integer starting from 1), xp_reward (not null, integer), created_at (not null, defaults to current timestamp), completed_at (nullable)
4. THE Quest_Board SHALL store Player_Stats in a "player_stats" table with columns: id (primary key), xp (integer, not null, default 0), level (integer, not null, default 1), streak (integer, not null, default 0), last_completed_date (date, nullable)
5. WHEN a Task is created, THE Quest_Board SHALL calculate and store the xp_reward as 10 for normal, 25 for rare, 50 for epic, or 100 for legendary Priority
6. WHEN a Task is completed, THE Quest_Board SHALL store the completion timestamp in the completed_at field
7. THE Quest_Board SHALL enforce foreign key constraints such that type_id references the types table, pic_id references the pics table, and parent_task_id references the tasks table, preventing assignment of non-existent references
8. IF a Type or PIC referenced by one or more Tasks is deleted, THEN THE Quest_Board SHALL reject the deletion and preserve the referencing Tasks unchanged

### Requirement 12: Application Routing and Navigation

**User Story:** As a user, I want clear navigation between app sections, so that I can easily move between the quest board, task details, and master data management.

#### Acceptance Criteria

1. THE Quest_Board SHALL serve the main dashboard at the root path "/"
2. THE Quest_Board SHALL serve individual task detail pages at "/tasks/[id]" where [id] is the Task identifier
3. THE Quest_Board SHALL serve the master data overview at "/master" displaying navigation links to the Type management page and the PIC management page
4. THE Quest_Board SHALL serve the Type management page at "/master/types"
5. THE Quest_Board SHALL serve the PIC management page at "/master/pics"
6. WHEN the user clicks a Task card on the dashboard, THE Quest_Board SHALL navigate to the corresponding task detail page without a full page reload
7. IF the user navigates to "/tasks/[id]" with an id that does not match any existing Task, THEN THE Quest_Board SHALL display a not-found message and provide a navigation link back to the dashboard
8. IF the user navigates to a path that does not match any defined route, THEN THE Quest_Board SHALL display a not-found page and provide a navigation link back to the dashboard

### Requirement 13: Real-Time Data Updates

**User Story:** As a user, I want the interface to reflect data changes in real time, so that I always see the current state without manual refreshing.

#### Acceptance Criteria

1. THE Quest_Board SHALL subscribe to Supabase real-time channels for the tasks, types, pics, and player_stats tables
2. WHEN a record is inserted, updated, or deleted in any subscribed table, THE Quest_Board SHALL update the displayed data within 2 seconds of receiving the real-time event without requiring a page refresh
3. WHEN a Task Status changes to "done" via real-time update, THE Quest_Board SHALL move the Task card to the DONE column in Kanban_View or to the completed group in Folder_View with a 0.3 second transition animation
4. IF the Supabase real-time connection is lost, THEN THE Quest_Board SHALL display a visible connection status indicator informing the user that live updates are unavailable
5. WHEN the Supabase real-time connection is re-established after a disconnection, THE Quest_Board SHALL re-fetch the current state of all subscribed tables to synchronize any changes missed during the disconnection
