# Implementation Plan: Forfeit Quest

## Overview

This plan implements the Forfeit Quest feature — a permanent deletion mechanism for incorrectly-entered quests with an XP penalty. Implementation proceeds bottom-up: database migration (RPC function), service layer, UI components (button, dialog, toast), page integration, and real-time wiring. Each step builds on the previous, ending with full integration and testing.

## Tasks

- [x] 1. Create database migration and RPC function
  - [x] 1.1 Create the `forfeit_quest` RPC migration (`supabase/migrations/005_forfeit_quest.sql`)
    - Write a `CREATE OR REPLACE FUNCTION forfeit_quest(p_task_id UUID) RETURNS JSONB` in PL/pgSQL with `SECURITY DEFINER`
    - Fetch the task and validate: task exists, `user_id = auth.uid()`, `status != 'done'`, `parent_task_id IS NULL`
    - Return error JSONB (`{ "success": false, "error": "..." }`) for each validation failure case
    - Calculate penalty: `floor(xp_reward * 0.25)`
    - Fetch `player_stats` for `auth.uid()`, compute `new_xp = greatest(0, current_xp - penalty)`
    - Recalculate level from `new_xp` using iterative threshold subtraction (level N threshold = N × 100)
    - Update `player_stats` with `new_xp` and `new_level`
    - Delete the task (`DELETE FROM tasks WHERE id = p_task_id`) — cascades handle subtasks and battle_log_moves
    - Return success JSONB: `{ "success": true, "penalty_amount", "new_xp", "new_level", "previous_level" }`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.4, 3.1, 3.2, 3.3_

- [x] 2. Implement forfeit service layer
  - [x] 2.1 Create `lib/services/forfeit.ts` service module
    - Export `ForfeitResult` interface: `{ success: boolean; penaltyAmount: number; newXp: number; newLevel: number; previousLevel: number }`
    - Implement `forfeitQuest(taskId: string): Promise<ForfeitResult>` that calls `supabase.rpc('forfeit_quest', { p_task_id: taskId })`
    - Use the browser Supabase client from `@/lib/supabase/client`
    - Parse the JSONB response and throw descriptive `Error` on failure cases (not found, already completed, is subtask, connection error)
    - Implement 15-second timeout using `AbortController` — throw timeout error if exceeded
    - _Requirements: 1.2, 1.7, 2.4, 5.5_

  - [x] 2.2 Write property test: XP penalty calculation with zero floor (Property 3)
    - **Property 3: XP penalty calculation with zero floor**
    - Generate random `(xp_reward: nat, current_xp: nat)` pairs using `fc.nat()`
    - Assert result equals `Math.max(0, current_xp - Math.floor(xp_reward * 0.25))`
    - Assert result is never negative
    - File: `__tests__/properties/forfeit-quest.test.ts`
    - **Validates: Requirements 3.1, 3.2**

  - [x] 2.3 Write property test: Level recalculation consistency (Property 4)
    - **Property 4: Level recalculation consistency after XP decrease**
    - Generate random non-negative `total_xp` values using `fc.nat({ max: 100000 })`
    - Implement or import `calculateLevel` and assert: sum of thresholds for levels 1..L-1 ≤ total_xp, and sum of thresholds for levels 1..L > total_xp
    - File: `__tests__/properties/forfeit-quest.test.ts`
    - **Validates: Requirements 3.3**

- [x] 3. Implement UI components
  - [x] 3.1 Create `ForfeitButton` component (`components/ForfeitButton.tsx`)
    - Mark as `'use client'`
    - Props: `{ taskId: string; taskStatus: string; isSubtask: boolean; xpReward: number; onForfeit: () => void }`
    - Render a button with red rpg-border, muted red text, font-pixel, transparent background
    - Disable when `taskStatus === 'done'` or `isSubtask === true` — show tooltip explaining why
    - Apply red glow effect on hover/focus
    - Set `aria-label="Forfeit Quest"` for accessibility
    - Call `onForfeit()` on click when enabled
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.5_

  - [x] 3.2 Create `ForfeitConfirmDialog` component (`components/ForfeitConfirmDialog.tsx`)
    - Mark as `'use client'`
    - Props: `{ isOpen: boolean; taskTitle: string; penaltyAmount: number; onConfirm: () => Promise<void>; onCancel: () => void }`
    - Render modal overlay with `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
    - Display task title truncated to 50 chars with ellipsis, warning text about permanent deletion, and penalty in "-X XP" format
    - "Confirm Forfeit" button styled in red, "Cancel" button in neutral style
    - Implement focus trap and Escape key handler to close
    - Show loading indicator and disable both buttons during processing
    - Display error message on failure, re-enable buttons
    - Implement 15-second timeout: re-enable buttons and show timeout error
    - _Requirements: 1.1, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 3.3 Write property test: Title truncation (Property 5)
    - **Property 5: Title truncation preserves content within limit**
    - Generate random strings using `fc.string({ minLength: 0, maxLength: 200 })`
    - Assert: if length > 50, result is first 50 chars + "…"; if length ≤ 50, result is unchanged
    - File: `__tests__/properties/forfeit-quest.test.ts`
    - **Validates: Requirements 5.1**

  - [x] 3.4 Create `XpPenaltyToast` component (`components/XpPenaltyToast.tsx`)
    - Mark as `'use client'`
    - Props: `{ amount: number; onDismiss: () => void }`
    - Display "-X XP" in red pixel font with skull emoji
    - Auto-dismiss after 3 seconds via `setTimeout`, call `onDismiss()`
    - Mirror existing `XpToast` structure but with red color scheme
    - _Requirements: 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate forfeit flow into task detail page
  - [x] 5.1 Add forfeit UI to task detail page (`app/tasks/[id]/page.tsx`)
    - Import and render `ForfeitButton` below primary action buttons with 16px vertical spacing
    - Pass task status, isSubtask (check `parent_task_id !== null`), and xpReward from task data
    - Add state for dialog open/close and manage `ForfeitConfirmDialog` visibility
    - Calculate penalty amount (`Math.floor(xpReward * 0.25)`) for dialog display
    - On forfeit confirm: call `forfeitQuest(taskId)` from the service
    - On success: store penalty data in sessionStorage (`{ penaltyAmount, timestamp }` under key `'forfeit_penalty'`), then `router.push('/')`
    - On error: pass error to dialog for display
    - Hide forfeit button if task is a subtask (show message instead per requirement 2.3)
    - _Requirements: 1.1, 1.6, 1.7, 2.3, 4.1, 4.4, 5.6, 6.1_

  - [x] 5.2 Write property test: Forfeit eligibility (Property 1)
    - **Property 1: Forfeit eligibility is determined by status and parentage**
    - Generate random tasks with `fc.record({ status: fc.constantFrom('todo', 'in_progress', 'done', 'overdue'), parentTaskId: fc.option(fc.uuid()) })`
    - Assert eligibility is `true` iff `status !== 'done' && parentTaskId === null`
    - File: `__tests__/properties/forfeit-quest.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 5.3 Write property test: Server-side rejection for completed tasks (Property 2)
    - **Property 2: Server-side forfeit rejection for completed tasks**
    - Generate tasks with `status = 'done'` and random `xp_reward` values
    - Assert the forfeit eligibility check rejects them (returns false / throws error)
    - Assert task and player stats remain unchanged
    - File: `__tests__/properties/forfeit-quest.test.ts`
    - **Validates: Requirements 2.4**

- [x] 6. Integrate XP penalty toast on dashboard
  - [x] 6.1 Add forfeit penalty toast to dashboard (`app/page.tsx`)
    - On component mount, check sessionStorage for `'forfeit_penalty'` key
    - Validate timestamp is within 30 seconds to prevent stale toasts
    - If valid, render `XpPenaltyToast` with the penalty amount
    - Clear sessionStorage entry after displaying
    - Ensure toast remains visible for at least 3 seconds
    - _Requirements: 3.4, 6.5_

  - [x] 6.2 Verify real-time subscription handles forfeit DELETE events
    - Confirm existing real-time subscription in dashboard removes task cards on DELETE events
    - Ensure subtask cards are also removed when parent is deleted (cascade triggers individual DELETE events or re-fetch handles it)
    - If subscription is disconnected, verify re-fetch on reconnection removes forfeited tasks
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. Write unit tests
  - [x] 7.1 Write unit tests for forfeit components and service (`__tests__/unit/forfeit-quest.test.ts`)
    - Test ForfeitButton: renders enabled for eligible tasks, disabled for done/subtask, shows tooltip, has correct aria-label
    - Test ForfeitConfirmDialog: opens/closes correctly, shows truncated title, disables buttons during loading, shows error on failure, closes on Escape
    - Test XpPenaltyToast: displays correct format, auto-dismisses after 3 seconds
    - Test forfeitQuest service: handles success response, throws on error responses, handles timeout
    - Test dashboard toast: reads sessionStorage, ignores stale data, clears after display
    - _Requirements: 1.1, 1.6, 2.1, 2.2, 3.4, 4.5, 5.1, 5.3, 5.4, 5.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `forfeit_quest` RPC function handles all atomicity — no client-side transaction management needed
- Existing `ON DELETE CASCADE` constraints handle subtask and battle_log_moves cleanup automatically
- Real-time subscriptions already handle DELETE events; this feature leverages existing infrastructure

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "3.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.3"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```
