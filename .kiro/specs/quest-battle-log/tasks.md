# Implementation Plan: Quest Battle Log

## Overview

This plan implements an RPG combat-style activity feed ("Battle Log") on the task detail page. Players record progress updates as "moves" with a move type and note, each awarding 5 pending XP. Pending XP accumulates on the task and is awarded upon task completion. The implementation builds the database layer first, then the service layer, then UI components, and finally wires everything into the existing task detail page.

## Tasks

- [x] 1. Database schema and type definitions
  - [x] 1.1 Create Supabase migration for battle_log_moves table and tasks.pending_xp column
    - Create `supabase/migrations/004_battle_log_moves.sql`
    - Add `pending_xp INTEGER NOT NULL DEFAULT 0` column to `tasks` table
    - Create `battle_log_moves` table with columns: id (UUID PK), task_id (FK to tasks), user_id (FK to auth.users), move_type (TEXT with CHECK constraint), note (TEXT with length CHECK), pending_xp (INTEGER DEFAULT 5), created_at (TIMESTAMPTZ)
    - Add CHECK constraint for move_type IN ('attack', 'dodge', 'defense', 'use_item', 'magic', 'rest')
    - Add CHECK constraint for note: char_length > 0 AND char_length <= 300
    - Add ON DELETE CASCADE for task_id foreign key
    - Create index on `battle_log_moves(task_id)` for efficient retrieval
    - Enable Row Level Security on `battle_log_moves`
    - Create RLS policy: users can SELECT moves where user_id = auth.uid()
    - Create RLS policy: users can INSERT moves where user_id = auth.uid()
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 1.2 Add Battle Log type definitions to `lib/types.ts`
    - Add `MOVE_TYPES` const array: ['attack', 'dodge', 'defense', 'use_item', 'magic', 'rest']
    - Add `MoveType` type derived from MOVE_TYPES
    - Add `MOVE_TYPE_CONFIG` record mapping each MoveType to { emoji, label }
    - Add `PENDING_XP_PER_MOVE` constant (5)
    - Add `BattleLogMove` interface with id, task_id, user_id, move_type, note, pending_xp, created_at
    - Add `pending_xp` field to existing `Task` interface
    - _Requirements: 3.1, 3.3, 4.1_

- [x] 2. Validation and service layer
  - [x] 2.1 Add move note validation to `lib/validation.ts`
    - Implement `validateMoveNote(input: string): MoveNoteValidationResult`
    - Trim input before validation
    - Reject empty or whitespace-only strings with error "Move note cannot be empty"
    - Reject strings exceeding 300 characters after trim with error "Move note must not exceed 300 characters"
    - Return `{ valid: true }` for valid inputs
    - _Requirements: 1.3, 1.4_

  - [ ]* 2.2 Write property test for move note validation (Property 2)
    - **Property 2: Invalid notes are rejected**
    - Test with arbitrary whitespace-only strings → must return `{ valid: false }`
    - Test with arbitrary strings > 300 chars → must return `{ valid: false }`
    - Test with arbitrary strings 1–300 chars (non-whitespace) → must return `{ valid: true }`
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.3 Implement battle log service (`lib/services/battle-log.ts`)
    - Implement `createMove(input: CreateMoveInput): Promise<CreateMoveResult>` — validate note, insert into battle_log_moves, increment task pending_xp by 5, return new move and updated pending_xp
    - Implement `getMovesByTaskId(taskId: string): Promise<BattleLogMove[]>` — fetch all moves for a task ordered by created_at ascending
    - Implement `getPendingXp(taskId: string): Promise<number>` — read pending_xp from tasks table
    - Use existing Supabase client pattern from `lib/supabase/client.ts`
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 4.1_

  - [ ]* 2.4 Write property test for move creation output (Property 1)
    - **Property 1: Move creation preserves input data**
    - For any valid MoveType and any valid note (1–300 chars), verify the created move has matching move_type, note, and pending_xp = 5
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 1.1**

  - [ ]* 2.5 Write property test for move ordering (Property 3)
    - **Property 3: Moves are returned in chronological order**
    - For any array of BattleLogMove objects with random timestamps, verify getMovesByTaskId returns them sorted by created_at ascending
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 2.1**

  - [ ]* 2.6 Write property test for pending XP invariant (Property 5)
    - **Property 5: Pending XP invariant**
    - For any task with N moves, verify pending_xp = N × 5
    - For any initial pending_xp P, after adding a move verify new pending_xp = P + 5
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 2.4, 4.1**

- [x] 3. Checkpoint - Service layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement UI components
  - [x] 4.1 Implement MoveForm component (`components/MoveForm.tsx`)
    - Create client component with 'use client' directive
    - Render move type selector showing all 6 types with emoji and label from MOVE_TYPE_CONFIG
    - Default selection to 'attack' (Attack ⚔️)
    - Render note text input with 300-character limit and live character counter
    - Show inline validation error when note is empty or exceeds limit
    - Submit button triggers `onSubmit(moveType, note)` prop
    - Disable entire form when `disabled` prop is true (show "Quest Complete" message)
    - Style with pixel font (Press Start 2P) for labels, VT323 for input text
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3, 4.3, 6.1, 6.2_

  - [x] 4.2 Implement BattleLogEntry component (`components/BattleLogEntry.tsx`)
    - Display move_type emoji at visible size from MOVE_TYPE_CONFIG
    - Display move_type label text
    - Display note text in VT323 font
    - Display formatted timestamp (relative or absolute)
    - Style with RPG pixel-art theme, dark background card
    - _Requirements: 2.2, 3.3, 6.1, 6.2_

  - [x] 4.3 Implement XpGainAnimation component (`components/XpGainAnimation.tsx`)
    - Render "+5 XP" floating text with gold color and pixel font
    - Animate upward float with fade-out using CSS animation
    - Call `onComplete` callback when animation ends
    - Use Tailwind animation utilities or inline keyframes
    - _Requirements: 6.3_

  - [x] 4.4 Implement BattleLog container component (`components/BattleLog.tsx`)
    - Create client component that manages battle log state
    - Fetch moves on mount using `getMovesByTaskId(taskId)`
    - Display list of BattleLogEntry components for each move
    - Display empty state message when no moves exist ("No battle actions recorded yet")
    - Display pending XP total with label (e.g., "⚡ Pending XP: 25")
    - Render MoveForm (disabled when taskStatus === 'done')
    - On form submit: call `createMove`, append new move to local state (optimistic), trigger XpGainAnimation, call `onPendingXpChange`
    - Render in scrollable container (overflow-y-auto, max-height) when moves exceed visible area
    - When task is done, show pending XP as "XP Awarded" instead
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 4.3, 4.4, 6.4_

  - [ ]* 4.5 Write property test for rendered move entry (Property 4)
    - **Property 4: Rendered move entry contains all required information**
    - For any BattleLogMove, verify the rendered entry contains the correct emoji, label, note text, and timestamp
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 2.2, 3.3**

- [x] 5. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate with task detail page and completion flow
  - [x] 6.1 Integrate BattleLog into task detail page (`app/tasks/[id]/page.tsx`)
    - Import and render BattleLog component in the task detail page
    - Pass taskId, taskStatus, pendingXp, and onPendingXpChange props
    - Position battle log section below task details / subtask tree
    - Add section heading "⚔️ Battle Log" with pixel font styling
    - Ensure pending XP display updates when moves are added
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1_

  - [x] 6.2 Modify task completion flow to include pending XP
    - Update the existing `completeTask` / `handleComplete` logic in the task detail page
    - When calculating total XP on completion, add `task.pending_xp` to the base XP reward
    - Pass total XP (base + pending) to `awardXp()` in player-stats service
    - After completion, BattleLog should show pending XP as awarded and disable the form
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ]* 6.3 Write property test for task completion XP calculation (Property 6)
    - **Property 6: Task completion XP includes pending XP**
    - For any task with pending_xp = P and base XP reward = B, verify total XP awarded = B + P
    - Location: `__tests__/properties/battle-log.test.ts`
    - **Validates: Requirements 4.2**

- [x] 7. Final checkpoint - Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Next.js 14 App Router, Supabase, Tailwind CSS, and Vitest with fast-check
- All services follow the existing pattern in `lib/services/` — components never call Supabase directly
- The battle log integrates into the existing task detail page rather than creating a new route
- Migration numbering continues from existing: 004_battle_log_moves.sql

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "4.5"] },
    { "id": 6, "tasks": ["6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3"] }
  ]
}
```
