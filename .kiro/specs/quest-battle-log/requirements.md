# Requirements Document

## Introduction

The Quest Battle Log feature adds an RPG combat-style activity feed to the task detail page. Instead of plain notes, users record progress updates as "moves" (Attack, Dodge, Defense, Use Item, Magic, etc.), each awarding a small amount of pending XP. The pending XP accumulates on the task and is awarded to the player when the task is marked as done. The battle log displays all moves in chronological order, creating an engaging narrative of the quest's progress.

## Glossary

- **Battle_Log**: The chronological activity feed displayed on the task detail page, composed of individual moves
- **Move**: A single entry in the Battle Log consisting of a move type, note text, timestamp, and pending XP reward
- **Move_Type**: A predefined category for a move, each with a unique emoji icon (e.g., Attack ⚔️, Dodge 💨, Defense 🛡️, Use Item 🧪, Magic ✨)
- **Pending_XP**: XP accumulated from moves on a task that has not yet been awarded to the player's total XP
- **Task_Detail_Page**: The page at `app/tasks/[id]/page.tsx` that displays full information about a single quest
- **Player**: The authenticated user interacting with the Quest Board application
- **Battle_Log_Service**: The service layer responsible for creating, retrieving, and managing battle log moves

## Requirements

### Requirement 1: Add a Move to the Battle Log

**User Story:** As a player, I want to add a move to a quest's battle log, so that I can track my progress in an engaging RPG combat style.

#### Acceptance Criteria

1. WHEN the Player selects a Move_Type and submits note text, THE Battle_Log_Service SHALL create a new Move with the selected Move_Type, note text, current timestamp, and a pending XP reward of 5 XP
2. WHEN the Player submits a Move, THE Battle_Log_Service SHALL associate the Move with the current task and the authenticated Player
3. IF the note text is empty, THEN THE Battle_Log_Service SHALL reject the Move and return a validation error
4. IF the note text exceeds 300 characters, THEN THE Battle_Log_Service SHALL reject the Move and return a validation error
5. WHEN a Move is successfully created, THE Task_Detail_Page SHALL append the new Move to the Battle_Log display without requiring a full page reload

### Requirement 2: Display the Battle Log

**User Story:** As a player, I want to see all moves for a quest displayed as a chronological battle log, so that I can review the quest's progress history.

#### Acceptance Criteria

1. WHEN the Task_Detail_Page loads, THE Battle_Log_Service SHALL retrieve all moves associated with the task ordered by timestamp ascending (oldest first)
2. THE Task_Detail_Page SHALL display each Move showing the Move_Type emoji, Move_Type name, note text, and formatted timestamp
3. WHILE the task has no moves, THE Task_Detail_Page SHALL display an empty state message indicating no battle actions have been recorded
4. THE Task_Detail_Page SHALL display the total Pending_XP accumulated from all moves on the task

### Requirement 3: Move Type Selection

**User Story:** As a player, I want to choose from predefined move types when adding a battle log entry, so that each update has a distinct RPG combat flavor.

#### Acceptance Criteria

1. THE Task_Detail_Page SHALL present the following Move_Types for selection: Attack (⚔️), Dodge (💨), Defense (🛡️), Use Item (🧪), Magic (✨), Rest (💤)
2. WHEN the Player has not selected a Move_Type, THE Task_Detail_Page SHALL default the selection to Attack (⚔️)
3. THE Task_Detail_Page SHALL display each Move_Type with its corresponding emoji icon and name

### Requirement 4: Pending XP Accumulation and Award

**User Story:** As a player, I want my battle log moves to accumulate pending XP that is awarded when I complete the quest, so that I am rewarded for documenting my progress.

#### Acceptance Criteria

1. WHEN a Move is created, THE Battle_Log_Service SHALL increment the task's Pending_XP total by 5 XP
2. WHEN the Player marks the task as done, THE Battle_Log_Service SHALL add the task's total Pending_XP to the XP awarded for task completion
3. WHILE the task status is "done", THE Task_Detail_Page SHALL display the Pending_XP as already awarded and prevent new moves from being added
4. THE Task_Detail_Page SHALL display the current Pending_XP total alongside the task's base XP reward

### Requirement 5: Battle Log Data Persistence

**User Story:** As a player, I want my battle log entries to be stored securely, so that only I can view and add moves to my own quests.

#### Acceptance Criteria

1. THE Battle_Log_Service SHALL store moves in a dedicated database table with columns for id, task_id, user_id, move_type, note, pending_xp, and created_at
2. THE Battle_Log_Service SHALL enforce Row Level Security so that a Player can only read and create moves for tasks owned by the Player
3. IF an unauthenticated request attempts to create or read moves, THEN THE Battle_Log_Service SHALL reject the request with an authorization error
4. WHEN a task is deleted, THE Battle_Log_Service SHALL cascade-delete all associated moves

### Requirement 6: Battle Log UI Styling

**User Story:** As a player, I want the battle log to match the RPG pixel-art theme of the application, so that the experience feels cohesive and immersive.

#### Acceptance Criteria

1. THE Task_Detail_Page SHALL render the Battle_Log section using the pixel font (Press Start 2P) for headings and the retro font (VT323) for move note text
2. THE Task_Detail_Page SHALL display each Move_Type emoji at a visible size alongside the move entry
3. WHEN a new Move is added, THE Task_Detail_Page SHALL display a brief XP gain animation (e.g., "+5 XP" floating text) to provide visual feedback
4. THE Task_Detail_Page SHALL render the Battle_Log in a scrollable container when the number of moves exceeds the visible area
