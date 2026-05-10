# Product Overview

**Quest Board** is a gamified RPG-style to-do list web application. Users manage tasks ("quests") with RPG mechanics including XP rewards, leveling, streaks, and priority tiers styled as rarity levels (normal, rare, epic, legendary).

## Core Concepts

- **Quests**: Tasks with title, description, priority (rarity), deadline, status, and optional subtask trees (sequential or parallel branching)
- **Task Types**: User-defined categories with icon and color
- **PICs (Person In Charge)**: Assignable team members with avatar and RPG class
- **Player Stats**: XP, level, streak tracking per user
- **Overdue Detection**: Automatic status transition when deadlines pass

## Key Features

- Kanban board and folder views with filtering/sorting
- Real-time updates via Supabase subscriptions
- Subtask trees with sequential/parallel branching
- XP and streak gamification system
- User authentication (email/password via Supabase Auth)
- Master data management (types and PICs)
- RPG pixel-art visual theme with retro fonts
