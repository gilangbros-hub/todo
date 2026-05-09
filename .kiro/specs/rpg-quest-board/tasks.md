# Implementation Plan: RPG Quest Board

## Overview

This plan implements a full-stack gamified RPG-style to-do list application using Next.js 14 App Router, Supabase (PostgreSQL + real-time), and Tailwind CSS. Tasks are organized to build foundational layers first (database, types, utilities), then core features (CRUD, gamification), then UI components, and finally page-level integration and wiring.

## Tasks

- [x] 1. Set up project structure, dependencies, and database schema
  - [x] 1.1 Initialize Next.js 14 project with TypeScript, Tailwind CSS, Supabase client, and configure project structure
    - Create Next.js 14 app with App Router (`app/` directory)
    - Install dependencies: `@supabase/supabase-js`, `tailwindcss`, `postcss`, `autoprefixer`
    - Configure Tailwind with custom RPG theme colors (#0d0d1a, #1a1a2e, #2a2a4a), pixel borders, and fonts
    - Add Google Fonts: "Press Start 2P" and "VT323"
    - Create `lib/supabase.ts` with Supabase client initialization using environment variables
    - Create directory structure: `lib/`, `lib/services/`, `app/tasks/[id]/`, `app/master/types/`, `app/master/pics/`, `components/`, `__tests__/properties/`
    - _Requirements: 10.1, 10.2, 10.3, 12.1_

  - [x] 1.2 Create Supabase database migration with all tables, constraints, and indexes
    - Write SQL migration creating `types`, `pics`, `tasks`, and `player_stats` tables
    - Add CHECK constraints for `status` (todo, in_progress, done, overdue), `priority` (normal, rare, epic, legendary), and `branch_type` (sequential, parallel)
    - Add FOREIGN KEY constraints with ON DELETE RESTRICT for `type_id` and `pic_id`, ON DELETE CASCADE for `parent_task_id`
    - Add UNIQUE constraint on `types.name`
    - Create indexes on `tasks.status`, `tasks.priority`, `tasks.type_id`, `tasks.pic_id`, `tasks.parent_task_id`, `tasks.deadline`
    - Enable Supabase real-time publication for all four tables
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8_

  - [x] 1.3 Define TypeScript interfaces and type constants
    - Create `lib/types.ts` with `Task`, `TaskType`, `PIC`, `PlayerStats` interfaces matching the design
    - Define priority constants: `normal`, `rare`, `epic`, `legendary`
    - Define status constants: `todo`, `in_progress`, `done`, `overdue`
    - Define branch type constants: `sequential`, `parallel`
    - Define `BASE_XP` mapping: `{ normal: 10, rare: 25, epic: 50, legendary: 100 }`
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 2. Implement core utility modules (XP, streak, validation, formatting)
  - [x] 2.1 Implement XP calculation module (`lib/xp.ts`)
    - Implement `calculateXpReward(priority, deadline, completedAt, isSubtask)` returning XP with early bonus (+20% floor), late penalty (-50% floor), no-deadline base, and subtask half (floor)
    - Implement `calculateLevel(totalXp)` returning `{ level, xpInCurrentLevel, xpForNextLevel }` with iterative carry-over (threshold = level × 100)
    - Implement `shouldLevelUp(currentLevel, xpInCurrentLevel)` returning boolean
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2_

  - [x] 2.2 Write property tests for XP calculation (Properties 1, 2)
    - **Property 1: XP Calculation** — For any priority, deadline, completedAt, and subtask flag, verify base XP matches priority mapping, early bonus is +20% floor, late penalty is -50% floor, no-deadline returns base, subtask returns half floor
    - **Property 2: Level-Up with Carry-Over** — For any starting level ≥ 1 and XP ≥ 0, verify threshold is level × 100, remaining XP < final_level × 100, total consumed + remaining = input, final level ≥ starting level
    - **Validates: Requirements 2.10, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2**

  - [x] 2.3 Implement streak calculation module (`lib/streak.ts`)
    - Implement `updateStreak(currentStreak, lastCompletedDate, completionDate)` returning `{ newStreak, newLastCompletedDate }`
    - Increment streak by 1 when lastCompletedDate is the preceding UTC calendar day
    - Reset streak to 1 when lastCompletedDate is null or not the preceding day
    - No-op (same streak) when completionDate equals lastCompletedDate (same-day idempotence)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.4 Write property test for streak logic (Property 3)
    - **Property 3: Streak Update Logic** — For any streak ≥ 0, any lastCompletedDate, and any completionDate, verify increment on consecutive day, reset on gap, same-day idempotence
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 2.5 Implement validation module (`lib/validation.ts`)
    - Implement `validateTaskTitle(input)` — accept 3–100 chars, reject empty/whitespace-only/over-limit
    - Implement `validateName(input)` — accept 1–50 chars for Type and PIC names, reject empty/whitespace-only/over-limit
    - Implement `checkNestingDepth(taskId, tasks)` — traverse parent_task_id chain, allow depth < 3, reject at depth 3
    - _Requirements: 2.2, 3.8, 8.2, 8.3, 9.2, 9.6_

  - [x] 2.6 Write property tests for validation (Properties 10, 11)
    - **Property 10: Name Validation** — For any string, verify acceptance/rejection based on length and whitespace rules
    - **Property 11: Nesting Depth Validation** — For any task tree, verify allow at depth < 3, reject at depth 3, correct depth calculation
    - **Validates: Requirements 2.2, 3.8, 8.2, 8.3, 9.2, 9.6**

  - [x] 2.7 Implement filter, sort, and grouping modules (`lib/filters.ts`, `lib/grouping.ts`)
    - Implement `filterTasks(tasks, filters)` — AND logic across status, priority, type_id, pic_id filters
    - Implement `sortTasks(tasks, sortBy, sortOrder)` — sort by deadline/priority/created_at, default deadline ascending
    - Implement `groupByStatus(tasks)` — return four groups: todo, in_progress, done, overdue
    - Implement `groupByType(tasks, types)` — group by type_id, null type_id → "Unassigned"
    - _Requirements: 1.4, 1.5, 1.8, 1.9_

  - [x] 2.8 Write property tests for filter, sort, and grouping (Properties 5, 6, 7, 8)
    - **Property 5: Task Filter Logic** — Every returned task matches ALL criteria, no matching task excluded, result is subset
    - **Property 6: Task Sort Ordering** — Adjacent pairs correctly ordered, same elements in/out, default deadline ascending
    - **Property 7: Kanban Grouping** — Every task in exactly one group, group matches status, total count preserved
    - **Property 8: Folder Grouping** — Every task in exactly one group, null type_id → "Unassigned", total count preserved
    - **Validates: Requirements 1.4, 1.5, 1.8, 1.9**

  - [x] 2.9 Implement formatting and progress modules (`lib/formatting.ts`, `lib/progress.ts`)
    - Implement `formatDeadlineCountdown(deadline, now)` — return "Xd Xh" for future, "OVERDUE" for past
    - Implement `calculateSubtaskProgress(subtasks)` — return percentage (0 when empty, done/total × 100)
    - _Requirements: 1.6, 3.9_

  - [x] 2.10 Write property tests for formatting and progress (Properties 9, 12)
    - **Property 9: Deadline Countdown Formatting** — "Xd Xh" for future, "OVERDUE" for past, correct floor calculation
    - **Property 12: Subtask Progress Calculation** — 0 when empty, done/total × 100, 100 when all done, between 0–100
    - **Validates: Requirements 1.6, 3.9**

  - [x] 2.11 Implement overdue detection module (`lib/overdue.ts`)
    - Implement `detectOverdueTasks(tasks, now)` — return task IDs where deadline < now AND status NOT "done" AND status NOT "overdue"
    - Never mark tasks with no deadline
    - Never modify tasks already "done"
    - _Requirements: 7.1, 7.5_

  - [x] 2.12 Write property test for overdue detection (Property 4)
    - **Property 4: Overdue Detection** — Only marks tasks with past deadline and non-done/non-overdue status, never marks null deadline, never modifies done tasks, leaves future deadlines unchanged
    - **Validates: Requirements 7.1, 7.5**

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Supabase service layer
  - [x] 4.1 Implement task service (`lib/services/tasks.ts`)
    - Create `getTasks()` — fetch all tasks with type and pic relations
    - Create `getTaskById(id)` — fetch single task with subtasks
    - Create `createTask(data)` — insert task with calculated xp_reward based on priority
    - Create `updateTask(id, data)` — update task fields
    - Create `completeTask(id)` — set status to "done", set completed_at timestamp, guard against double-completion
    - Create `createSubtask(parentId, data)` — insert subtask with parent_task_id, validate nesting depth
    - Create `updateOverdueTasks(taskIds)` — batch update status to "overdue"
    - _Requirements: 2.10, 3.7, 4.1, 4.9, 7.1, 11.3, 11.5, 11.6_

  - [x] 4.2 Implement type service (`lib/services/types.ts`)
    - Create `getTypes()` — fetch all types ordered by created_at ascending
    - Create `createType(data)` — insert type with name uniqueness check
    - Create `updateType(id, data)` — update type with validation and uniqueness check
    - Create `deleteType(id)` — delete type only if no tasks reference it, return error with count otherwise
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 11.1_

  - [x] 4.3 Implement PIC service (`lib/services/pics.ts`)
    - Create `getPics()` — fetch all PICs sorted by created_at descending
    - Create `createPic(data)` — insert PIC with validation
    - Create `updatePic(id, data)` — update PIC with validation
    - Create `deletePic(id)` — delete PIC only if no tasks reference it, return error otherwise
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.2_

  - [x] 4.4 Implement player stats service (`lib/services/player-stats.ts`)
    - Create `getPlayerStats()` — fetch or initialize player stats record
    - Create `awardXp(amount)` — add XP, handle level-up with carry-over, update streak
    - Create `initializePlayerStats()` — create record with level 1, xp 0, streak 0
    - _Requirements: 4.8, 5.1, 5.2, 5.5, 6.1, 6.2, 6.3, 11.4_

  - [x] 4.5 Implement real-time service (`lib/services/realtime.ts`)
    - Create `subscribeToTasks(callback)` — subscribe to tasks table INSERT/UPDATE/DELETE
    - Create `subscribeToTypes(callback)` — subscribe to types table changes
    - Create `subscribeToPics(callback)` — subscribe to pics table changes
    - Create `subscribeToPlayerStats(callback)` — subscribe to player_stats changes
    - Handle connection status tracking (connected/disconnected)
    - Implement reconnection with full data re-fetch
    - _Requirements: 13.1, 13.2, 13.4, 13.5_

- [ ] 5. Checkpoint - Service layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement RPG-themed UI components
  - [ ] 6.1 Implement root layout and global styles (`app/layout.tsx`)
    - Configure "Press Start 2P" and "VT323" fonts with monospace fallback
    - Apply dark background (#0d0d1a), scanline overlay effect (2px transparent + 2px rgba(0,0,0,0.15))
    - Apply pixel text shadow (2px 2px 0px #000) to headers
    - Set `image-rendering: pixelated` globally for icons
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.9_

  - [ ] 6.2 Implement Sidebar component (`components/Sidebar.tsx`)
    - Display player level, XP progress bar (current XP / threshold for next level), streak count
    - Navigation links: Quest Board (/), Master Types (/master/types), Master PICs (/master/pics)
    - Active route highlighting
    - _Requirements: 1.2, 1.3, 5.4, 6.4_

  - [ ] 6.3 Implement QuestCard component (`components/QuestCard.tsx`)
    - Display title, type badge, PIC, deadline countdown, priority glow border, subtask count, XP reward
    - Priority border colors: Normal gray (#6b7280), Rare blue (#4a9eff), Epic purple (#a78bfa), Legendary gold (#f0c040)
    - Status badges: "[ TODO ]", "[ IN PROGRESS ]", "[ COMPLETE ]", "[ OVERDUE ]"
    - Hover effect: translateY(-4px) + increased glow, 0.1s ease transition
    - Overdue: red glow border + skull icon
    - _Requirements: 1.6, 7.2, 10.3, 10.6, 10.7, 10.8_

  - [ ] 6.4 Implement KanbanBoard and FolderView components
    - `components/KanbanBoard.tsx` — Four columns: TODO, IN PROGRESS, DONE, OVERDUE
    - `components/FolderView.tsx` — Groups by type, "Unassigned" for null type_id
    - `components/ViewToggle.tsx` — Switch between Kanban/Folder views
    - _Requirements: 1.4, 1.5, 1.7_

  - [ ] 6.5 Implement FilterBar and SortControl components
    - `components/FilterBar.tsx` — Filter by status, priority, type, PIC (AND logic)
    - `components/SortControl.tsx` — Sort by deadline, priority, created_at
    - _Requirements: 1.8, 1.9_

  - [ ] 6.6 Implement WizardModal component (`components/WizardModal.tsx`)
    - 5-step wizard: Name the Quest, Choose the Guild, Set Deadline, Assign Party Member, Review & Create
    - Step 1: Title (3–100 chars required), description (optional, max 500), priority selector (default Normal)
    - Step 2: Type selection (optional)
    - Step 3: Date picker (optional, today onward only)
    - Step 4: PIC selection (optional)
    - Step 5: Review summary + confirm
    - Back button preserves data, Next enabled only when valid, dismiss discards data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.11, 2.12, 2.13_

  - [ ] 6.7 Implement SubtaskTree component (`components/SubtaskTree.tsx`)
    - Recursive tree with pixel-art connecting lines
    - Sequential: numbered ordered list
    - Parallel: independent items
    - Branch type toggle (sequential/parallel)
    - Add subtask form (title required)
    - Max 3 levels nesting enforcement with error message
    - Progress bar showing completion percentage
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ] 6.8 Implement XP feedback components
    - `components/XpToast.tsx` — Slide-in from bottom-right, gold pixel font, fade out after 2.5s
    - `components/LevelUpOverlay.tsx` — Fullscreen dark overlay, pulsing text with new level, pixel confetti, 3s auto-dismiss
    - `components/ProgressBar.tsx` — XP progress bar with color
    - _Requirements: 4.7, 5.3, 5.4_

  - [ ] 6.9 Implement EmptyState and ConnectionStatus components
    - `components/EmptyState.tsx` — No-data placeholder with message and icon
    - `components/ConnectionStatus.tsx` — Real-time connection indicator (connected/disconnected)
    - _Requirements: 1.10, 13.4_

- [ ] 7. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement page routes and wire everything together
  - [ ] 8.1 Implement Dashboard page (`app/page.tsx`)
    - Fetch tasks, types, PICs on mount
    - Wire KanbanBoard/FolderView with ViewToggle
    - Wire FilterBar and SortControl
    - Integrate real-time subscriptions for live updates
    - Implement overdue detection timer (60s interval)
    - Handle task card click → navigate to /tasks/[id]
    - Display empty state when no tasks/no matches
    - Task creation button → open WizardModal
    - On task create success: close modal, bounce animation on new card
    - _Requirements: 1.1, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 7.1, 12.1, 12.6, 13.2_

  - [ ] 8.2 Implement Task Detail page (`app/tasks/[id]/page.tsx`)
    - Server component initial fetch + client hydration
    - Display full task details: title, description, type, PIC, deadline, status, priority, XP
    - Display SubtaskTree with add/complete functionality
    - Mark task as done: card flip animation, completion stamp, XP award, toast, level-up check
    - Handle not-found: error message + link back to dashboard
    - Double-completion guard: no-op if already done
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.7, 4.8, 4.9, 12.2, 12.7_

  - [ ] 8.3 Implement Task completion flow with XP, streak, and level-up
    - On task complete: calculate XP reward (with early/late/subtask modifiers)
    - Award XP to player stats, update streak
    - Check for level-up, show LevelUpOverlay if triggered
    - Show XpToast with awarded amount
    - Update sidebar stats in real-time
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.3, 6.1, 6.2, 6.3, 6.5_

  - [ ] 8.4 Implement Master Types page (`app/master/types/page.tsx`)
    - Display list of types with icon, name, color (ordered by created_at ascending)
    - Create type form with validation (name 1–50 chars, icon, hex color)
    - Edit type inline with same validation + uniqueness check
    - Delete type with in-use protection (show warning with task count)
    - Real-time subscription for type changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 8.5 Implement Master PICs page (`app/master/pics/page.tsx`)
    - Display list of PICs with name, avatar, RPG class (sorted by created_at descending)
    - Create PIC form with validation (name 1–50 chars, avatar, RPG class from predefined list)
    - Edit PIC with same validation
    - Delete PIC with confirmation prompt + in-use protection
    - Empty state when no PICs exist
    - Real-time subscription for PIC changes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 8.6 Implement 404 and master navigation pages
    - `app/not-found.tsx` — Not-found page with link back to dashboard
    - `app/master/page.tsx` — Navigation links to Types and PICs pages
    - _Requirements: 12.3, 12.4, 12.5, 12.8_

- [ ] 9. Implement real-time sync and animations
  - [ ] 9.1 Wire real-time subscriptions across all pages
    - Subscribe to tasks, types, pics, player_stats channels on page mount
    - Update React state on INSERT/UPDATE/DELETE events within 2 seconds
    - Handle task status change to "done": move card with 0.3s transition animation
    - Display ConnectionStatus indicator
    - Re-fetch all data on reconnection after disconnection
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 9.2 Implement CSS animations and transitions
    - Task card bounce entrance animation on creation
    - Card flip animation with completion stamp on task done
    - Subtask slide-in animation on add
    - XpToast slide-in and fade-out (2.5s)
    - LevelUpOverlay: dark overlay, pulsing text, pixel confetti (3s)
    - Hover lift transform (translateY(-4px)) with glow increase
    - Kanban card move transition (0.3s)
    - _Requirements: 2.12, 4.1, 4.7, 5.3, 10.6, 13.3_

- [ ] 10. Final checkpoint - Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript throughout with Next.js 14 App Router, Supabase, and Tailwind CSS
- All XP/level/streak calculations run client-side for responsive UX, then persist to Supabase
- Real-time subscriptions use Supabase channels for cross-tab sync
- Property-based tests use fast-check library with Vitest, minimum 100 iterations per property

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3", "2.5", "2.7", "2.9", "2.11"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.8", "6.9"] },
    { "id": 5, "tasks": ["6.6", "6.7"] },
    { "id": 6, "tasks": ["8.1", "8.4", "8.5", "8.6"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["9.1", "9.2"] }
  ]
}
```
