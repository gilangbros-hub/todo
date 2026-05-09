# Design Document: Quest Battle Log

## Overview

The Quest Battle Log adds an RPG combat-style activity feed to the task detail page. Players record progress updates as "moves" — each categorized by a move type (Attack, Dodge, Defense, Use Item, Magic, Rest) with a note and a fixed 5 XP reward. Moves accumulate pending XP on the task, which is awarded to the player's total XP upon task completion.

The feature integrates into the existing task detail page (`app/tasks/[id]/page.tsx`), leveraging the established services layer pattern, Supabase RLS for authorization, and the RPG pixel-art theme.

### Key Design Decisions

1. **Flat move table** — Moves are stored in a dedicated `battle_log_moves` table rather than embedded in the tasks table, keeping concerns separated and enabling efficient queries.
2. **Fixed XP per move** — Each move awards exactly 5 pending XP regardless of type, keeping the system simple and predictable.
3. **Pending XP on task** — A `pending_xp` column on the `tasks` table caches the accumulated total, avoiding repeated aggregation queries.
4. **Optimistic UI updates** — New moves are appended to the local state immediately after successful creation, avoiding full page reloads.
5. **Service layer pattern** — A new `battle-log.ts` service handles all data access, consistent with existing services (`tasks.ts`, `player-stats.ts`).

## Architecture

```mermaid
flowchart TD
    subgraph Client ["Task Detail Page (Client Component)"]
        BLForm[Move Input Form]
        BLList[Battle Log Feed]
        PendingXP[Pending XP Display]
    end

    subgraph Services ["lib/services/"]
        BLS[battle-log.ts]
        PS[player-stats.ts]
        TS[tasks.ts]
    end

    subgraph Database ["Supabase (PostgreSQL)"]
        MovesTable[battle_log_moves]
        TasksTable[tasks]
        StatsTable[player_stats]
    end

    BLForm -->|createMove| BLS
    BLList -->|getMoves| BLS
    PendingXP -->|reads pending_xp| TS

    BLS -->|INSERT move| MovesTable
    BLS -->|UPDATE pending_xp| TasksTable
    TS -->|completeTask + award pending XP| PS
    PS -->|UPDATE xp, level| StatsTable

    MovesTable -->|RLS: user_id = auth.uid()| MovesTable
    TasksTable -->|FK: task_id| MovesTable
```

### Data Flow: Adding a Move

1. Player selects a move type and enters note text
2. Client calls `createMove(taskId, moveType, note)`
3. Service validates input (non-empty, ≤300 chars)
4. Service inserts row into `battle_log_moves`
5. Service increments `pending_xp` on the task by 5
6. Client appends the new move to local state and shows "+5 XP" animation

### Data Flow: Completing a Task (with Pending XP)

1. Player clicks "Mark Quest as Done"
2. Existing `handleComplete` flow runs
3. XP calculation adds `task.pending_xp` to the base XP reward
4. Total XP (base + pending) is awarded via `awardXp()`
5. Task status set to "done", preventing further moves

## Components and Interfaces

### Service: `lib/services/battle-log.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { BattleLogMove, MoveType } from '@/lib/types';

export interface CreateMoveInput {
  taskId: string;
  moveType: MoveType;
  note: string;
}

export interface CreateMoveResult {
  move: BattleLogMove;
  newPendingXp: number;
}

/**
 * Create a new battle log move for a task.
 * Validates input, inserts the move, and increments task pending_xp.
 */
export async function createMove(input: CreateMoveInput): Promise<CreateMoveResult>;

/**
 * Retrieve all moves for a task, ordered by created_at ascending.
 */
export async function getMovesByTaskId(taskId: string): Promise<BattleLogMove[]>;

/**
 * Get the total pending XP for a task (from the tasks table cache).
 */
export async function getPendingXp(taskId: string): Promise<number>;
```

### Validation: `lib/validation.ts` (additions)

```typescript
export interface MoveNoteValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a battle log move note.
 * - Trims input
 * - Rejects empty/whitespace-only
 * - Rejects notes exceeding 300 characters
 */
export function validateMoveNote(input: string): MoveNoteValidationResult;
```

### UI Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `BattleLog` | `components/BattleLog.tsx` | Container: fetches moves, displays list + form |
| `BattleLogEntry` | `components/BattleLogEntry.tsx` | Single move display (emoji, type, note, timestamp) |
| `MoveForm` | `components/MoveForm.tsx` | Move type selector + note input + submit |
| `XpGainAnimation` | `components/XpGainAnimation.tsx` | "+5 XP" floating text animation on move creation |

### Component Props

```typescript
// BattleLog
interface BattleLogProps {
  taskId: string;
  taskStatus: Status;
  pendingXp: number;
  onPendingXpChange: (newTotal: number) => void;
}

// BattleLogEntry
interface BattleLogEntryProps {
  move: BattleLogMove;
}

// MoveForm
interface MoveFormProps {
  onSubmit: (moveType: MoveType, note: string) => Promise<void>;
  disabled: boolean;
}

// XpGainAnimation
interface XpGainAnimationProps {
  amount: number;
  onComplete: () => void;
}
```

## Data Models

### New Type Definitions (`lib/types.ts` additions)

```typescript
// --- Move Types ---
export const MOVE_TYPES = ['attack', 'dodge', 'defense', 'use_item', 'magic', 'rest'] as const;
export type MoveType = (typeof MOVE_TYPES)[number];

export const MOVE_TYPE_CONFIG: Record<MoveType, { emoji: string; label: string }> = {
  attack: { emoji: '⚔️', label: 'Attack' },
  dodge: { emoji: '💨', label: 'Dodge' },
  defense: { emoji: '🛡️', label: 'Defense' },
  use_item: { emoji: '🧪', label: 'Use Item' },
  magic: { emoji: '✨', label: 'Magic' },
  rest: { emoji: '💤', label: 'Rest' },
};

export const PENDING_XP_PER_MOVE = 5;

// --- Battle Log Move ---
export interface BattleLogMove {
  id: string;
  task_id: string;
  user_id: string;
  move_type: MoveType;
  note: string;
  pending_xp: number;
  created_at: string;
}
```

### Database Schema: `battle_log_moves` table

```sql
CREATE TABLE battle_log_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  move_type TEXT NOT NULL CHECK (move_type IN ('attack', 'dodge', 'defense', 'use_item', 'magic', 'rest')),
  note TEXT NOT NULL CHECK (char_length(note) > 0 AND char_length(note) <= 300),
  pending_xp INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient retrieval by task
CREATE INDEX idx_battle_log_moves_task_id ON battle_log_moves(task_id);

-- Row Level Security
ALTER TABLE battle_log_moves ENABLE ROW LEVEL SECURITY;

-- Users can only read moves for their own tasks
CREATE POLICY "Users can read own task moves"
  ON battle_log_moves FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert moves for their own tasks
CREATE POLICY "Users can insert own task moves"
  ON battle_log_moves FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

### Schema Modification: `tasks` table

```sql
-- Add pending_xp column to tasks table
ALTER TABLE tasks ADD COLUMN pending_xp INTEGER NOT NULL DEFAULT 0;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Move creation preserves input data

*For any* valid MoveType and any valid note string (non-empty, trimmed length 1–300), creating a move SHALL produce a BattleLogMove with the same move_type, the same note text, and pending_xp equal to exactly 5.

**Validates: Requirements 1.1**

### Property 2: Invalid notes are rejected

*For any* string that is empty, composed entirely of whitespace, or exceeds 300 characters after trimming, the validation function SHALL return `{ valid: false }` and the move SHALL NOT be created.

**Validates: Requirements 1.3, 1.4**

### Property 3: Moves are returned in chronological order

*For any* set of moves associated with a task, `getMovesByTaskId` SHALL return them sorted by `created_at` in ascending order — that is, for every consecutive pair of moves (a, b) in the result, `a.created_at <= b.created_at`.

**Validates: Requirements 2.1**

### Property 4: Rendered move entry contains all required information

*For any* BattleLogMove, the rendered entry SHALL contain the move_type's emoji (from MOVE_TYPE_CONFIG), the move_type's label, the note text, and a formatted timestamp derived from created_at.

**Validates: Requirements 2.2, 3.3**

### Property 5: Pending XP invariant

*For any* task with N moves, the task's pending_xp value SHALL equal N × PENDING_XP_PER_MOVE (5). Equivalently, after adding a move to a task with current pending_xp = P, the new pending_xp SHALL equal P + 5.

**Validates: Requirements 2.4, 4.1**

### Property 6: Task completion XP includes pending XP

*For any* task with pending_xp = P and base XP reward = B (calculated from priority, deadline, and subtask status), the total XP awarded upon task completion SHALL equal B + P.

**Validates: Requirements 4.2**

## Error Handling

| Scenario | Handler | User Feedback |
|----------|---------|---------------|
| Empty or whitespace-only note | `validateMoveNote` returns error | Inline error message below input, form not submitted |
| Note exceeds 300 characters | `validateMoveNote` returns error | Character counter turns red, inline error message |
| Supabase insert fails (network) | `createMove` throws | Toast notification: "Failed to record move. Try again." |
| Unauthenticated request | RLS rejects at DB level | Redirect to login page (handled by existing auth middleware) |
| Task already completed | UI disables form (`taskStatus === 'done'`) | Form visually disabled with "Quest Complete" message |
| Invalid move_type value | DB CHECK constraint rejects | Should never reach DB — validated client-side via TypeScript enum |
| Task not found (deleted) | `getMovesByTaskId` returns empty or FK error | Handled by existing task detail 404 flow |

### Validation Rules Summary

| Field | Rule | Error Message |
|-------|------|---------------|
| `note` | Non-empty after trim | "Move note cannot be empty" |
| `note` | ≤ 300 characters after trim | "Move note must not exceed 300 characters" |
| `move_type` | Must be one of MOVE_TYPES | (enforced by TypeScript + DB CHECK) |

## Testing Strategy

### Property-Based Tests (fast-check)

The feature is well-suited for property-based testing because it has pure validation logic, data transformation invariants, and clear input/output relationships.

**Library:** `fast-check` (already in project)
**Location:** `__tests__/properties/battle-log.test.ts`
**Configuration:** Minimum 100 iterations per property

Each property test will be tagged with:
```
// Feature: quest-battle-log, Property {N}: {property_text}
```

| Property | What it tests | Generator strategy |
|----------|---------------|-------------------|
| Property 1 | `createMove` output correctness | Random MoveType from MOVE_TYPES, random string 1–300 chars |
| Property 2 | `validateMoveNote` rejects invalid | Random whitespace strings + random strings > 300 chars |
| Property 3 | Move ordering | Random arrays of moves with random ISO timestamps |
| Property 4 | Rendered entry completeness | Random BattleLogMove objects |
| Property 5 | Pending XP accumulation | Random initial pending_xp (0–10000), verify +5 increment |
| Property 6 | Completion XP calculation | Random priority, deadline, pending_xp combinations |

### Unit Tests (Vitest)

**Location:** `__tests__/unit/battle-log.test.ts`

| Test | Type | What it verifies |
|------|------|-----------------|
| Default move type is Attack | Example | MoveForm renders with Attack pre-selected |
| All 6 move types displayed | Example | MoveForm shows all options with correct emojis |
| Empty state message | Example | BattleLog shows message when moves = [] |
| Form disabled when task done | Example | MoveForm disabled prop prevents submission |
| XP animation triggers on add | Example | XpGainAnimation renders after successful move |
| Scrollable container | Example | BattleLog applies overflow-y-auto when moves > threshold |
| Pending XP shown as awarded when done | Example | Display changes text when task status = done |

### Integration Tests

| Test | What it verifies |
|------|-----------------|
| RLS blocks cross-user read | User A cannot read User B's moves |
| RLS blocks cross-user insert | User A cannot insert moves on User B's tasks |
| Unauthenticated rejection | Anonymous client gets auth error |
| CASCADE delete | Deleting a task removes all its moves |
| Task completion awards pending XP | End-to-end: add moves → complete task → verify XP total |

### Migration Testing

The SQL migration should be tested by running it against a fresh Supabase instance and verifying:
- Table `battle_log_moves` exists with correct columns and constraints
- RLS policies are active
- `tasks.pending_xp` column exists with default 0
- CASCADE delete works correctly
