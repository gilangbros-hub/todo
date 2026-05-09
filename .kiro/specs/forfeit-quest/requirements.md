# Requirements Document

## Introduction

The Forfeit Quest feature allows users to permanently delete a quest (task) that was incorrectly entered. Themed as "forfeiting" a quest in the RPG context, this action removes the task and all associated data (subtasks, battle log moves) from the system. Forfeiting is an irreversible action intended for correcting mistakes, not for abandoning legitimate quests — completed quests cannot be forfeited, and an XP penalty discourages misuse.

## Glossary

- **Quest_Board**: The main application system responsible for managing quests, player progression, and the RPG-themed user interface
- **Task**: A quest item representing a unit of work with title, description, type, assignee, deadline, status, priority, and XP reward
- **Forfeit_Action**: The permanent deletion of a Task and all its associated data (subtasks, battle log moves, pending XP)
- **Confirmation_Dialog**: A modal overlay requiring explicit user confirmation before executing an irreversible Forfeit_Action
- **Player_Stats**: The persistent record of a player's XP, level, and streak data
- **Forfeit_Penalty**: An XP deduction applied to Player_Stats when a quest is forfeited, equal to 25 percent of the Task base xp_reward
- **Battle_Log_Move**: A progress entry recorded against a Task that accumulates pending XP

## Requirements

### Requirement 1: Forfeit Quest Action

**User Story:** As a user, I want to permanently delete a wrongly-entered quest, so that my quest board stays clean and accurate.

#### Acceptance Criteria

1. WHEN the user triggers the Forfeit_Action on a Task, THE Quest_Board SHALL display a Confirmation_Dialog before executing the deletion
2. WHEN the user confirms the Forfeit_Action in the Confirmation_Dialog, THE Quest_Board SHALL permanently delete the Task from the database
3. WHEN a Task is deleted via Forfeit_Action, THE Quest_Board SHALL cascade-delete all Subtasks associated with the forfeited Task at all nesting levels (not just direct children)
4. WHEN a Task is deleted via Forfeit_Action, THE Quest_Board SHALL cascade-delete all Battle_Log_Move records associated with the forfeited Task and all its Subtasks
5. WHEN a Task is deleted via Forfeit_Action, THE Quest_Board SHALL discard all pending XP accumulated on the forfeited Task and its Subtasks without awarding the pending XP to Player_Stats
6. IF the user cancels the Confirmation_Dialog, THEN THE Quest_Board SHALL close the dialog and leave the Task unchanged
7. IF the database deletion fails, THEN THE Quest_Board SHALL display an error message indicating the quest could not be forfeited and leave the Task unchanged

### Requirement 2: Forfeit Eligibility Rules

**User Story:** As a user, I want the system to prevent forfeiting completed quests, so that I cannot retroactively remove quests whose XP has already been awarded.

#### Acceptance Criteria

1. WHILE a Task has Status "done", THE Quest_Board SHALL disable the Forfeit_Action control and display a tooltip indicating completed quests cannot be forfeited
2. WHILE a Task has Status "todo", "in_progress", or "overdue", THE Quest_Board SHALL enable the Forfeit_Action control
3. IF a Task is a Subtask (has a non-null parent_task_id), THEN THE Quest_Board SHALL hide the Forfeit_Action control on the Subtask detail page and display a message indicating the subtask can only be forfeited from the parent Task detail page
4. IF a Forfeit_Action request is received for a Task with Status "done", THEN THE Quest_Board SHALL reject the request server-side, leave the Task unchanged, and display an error message indicating the quest cannot be forfeited because it is already completed
5. WHEN the user is viewing a Task detail page and the Task Status changes to "done" via a real-time update, THE Quest_Board SHALL disable the Forfeit_Action control within 2 seconds and display the tooltip indicating completed quests cannot be forfeited

### Requirement 3: Forfeit XP Penalty

**User Story:** As a user, I want a small XP penalty when forfeiting a quest, so that I am discouraged from creating quests carelessly.

#### Acceptance Criteria

1. WHEN the user confirms the Forfeit_Action, THE Quest_Board SHALL deduct a Forfeit_Penalty from Player_Stats total XP equal to 25 percent of the Task xp_reward field value, rounded down to the nearest integer, as an atomic operation together with the Task deletion
2. IF the Forfeit_Penalty would reduce Player_Stats total XP below zero, THEN THE Quest_Board SHALL set Player_Stats total XP to zero instead of allowing a negative value
3. WHEN the Forfeit_Penalty is applied, THE Quest_Board SHALL recalculate the player level from the new total XP using the leveling formula (level starts at 1, threshold for level N equals N multiplied by 100, iteratively subtract thresholds), allowing the level to decrease if the new total XP falls below the current level threshold
4. WHEN the Forfeit_Penalty is applied, THE Quest_Board SHALL display an XP_Toast notification showing the XP deduction amount in red pixel font with a "-X XP" format for a duration of 3 seconds
5. IF the Forfeit_Penalty causes the player level to decrease, THEN THE Quest_Board SHALL display the updated level in the Player_Stats sidebar within 2 seconds of the penalty being applied

### Requirement 4: Forfeit UI Placement and Presentation

**User Story:** As a user, I want the forfeit option to be accessible but not prominent, so that I can find it when needed without accidentally triggering it.

#### Acceptance Criteria

1. WHEN the user views a Task detail page at /tasks/[id], THE Quest_Board SHALL display a "Forfeit Quest" button positioned below the primary task action buttons (e.g., status change, edit) and visually separated from them by at least 16px of vertical spacing
2. THE Quest_Board SHALL style the "Forfeit Quest" button with a red border using the rpg-border token style, muted red text using the font-pixel typeface, and a transparent background to visually de-emphasize it relative to primary actions
3. WHEN the user hovers over or focuses the "Forfeit Quest" button, THE Quest_Board SHALL apply a visible red glow effect to the button border to indicate interactivity
4. THE Quest_Board SHALL NOT display a forfeit control on Task cards in the Kanban_View or Folder_View to prevent accidental deletion from the dashboard
5. THE Quest_Board SHALL render the "Forfeit Quest" button as a focusable element with an accessible label of "Forfeit Quest" so that keyboard and screen reader users can discover and activate it

### Requirement 5: Forfeit Confirmation Dialog

**User Story:** As a user, I want a clear confirmation step before forfeiting, so that I do not accidentally delete a quest.

#### Acceptance Criteria

1. WHEN the Confirmation_Dialog is displayed, THE Quest_Board SHALL show the Task title (truncated to 50 characters with ellipsis if longer), a warning message stating the action is permanent and all subtasks and battle log entries will be deleted, and the Forfeit_Penalty amount in "-X XP" format
2. THE Confirmation_Dialog SHALL require the user to click a "Confirm Forfeit" button styled in red to proceed with deletion
3. WHEN the user clicks the "Cancel" button or presses the Escape key, THE Quest_Board SHALL close the Confirmation_Dialog without modifying the Task or Player_Stats
4. WHILE the Forfeit_Action is being processed, THE Confirmation_Dialog SHALL disable both buttons and display a loading indicator to prevent double-submission
5. IF the Forfeit_Action processing does not complete within 15 seconds, THEN THE Quest_Board SHALL re-enable both buttons and display an error message indicating the operation timed out
6. WHEN the Forfeit_Action completes successfully, THE Quest_Board SHALL close the Confirmation_Dialog and navigate the user to the root dashboard path
7. IF the Forfeit_Action fails while the Confirmation_Dialog is open, THEN THE Quest_Board SHALL re-enable both buttons and display an error message indicating the quest could not be forfeited

### Requirement 6: Post-Forfeit Navigation and Real-Time Update

**User Story:** As a user, I want the quest board to immediately reflect the forfeited quest removal, so that I have confidence the action was successful.

#### Acceptance Criteria

1. WHEN a Task is successfully forfeited from the detail page, THE Quest_Board SHALL navigate the user to the root dashboard path (`/`) within 1 second of receiving the successful deletion response
2. WHEN a Task is deleted via Forfeit_Action, THE Quest_Board SHALL remove the Task card from Kanban_View and Folder_View within 2 seconds via the existing real-time subscription without requiring a page refresh
3. WHEN a Task that has Subtasks is forfeited, THE Quest_Board SHALL remove all associated Subtask cards from Kanban_View and Folder_View within 2 seconds via the existing real-time subscription, matching the same timing as the parent Task removal
4. IF the real-time subscription is disconnected when a Forfeit_Action completes, THEN THE Quest_Board SHALL remove the forfeited Task and its Subtasks from displayed views upon the next successful data re-fetch triggered by reconnection
5. WHEN the Quest_Board navigates to the dashboard after a successful Forfeit_Action, THE Quest_Board SHALL display the XP_Toast notification showing the Forfeit_Penalty deduction before or immediately after navigation completes, ensuring the toast remains visible for at least 3 seconds on the dashboard
