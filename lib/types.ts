// ============================================================
// RPG Quest Board — Core TypeScript Interfaces & Constants
// ============================================================

// --- Priority (Rarity Tiers) ---

export const PRIORITIES = ['normal', 'rare', 'epic', 'legendary'] as const;
export type Priority = (typeof PRIORITIES)[number];

// --- Status ---

export const STATUSES = ['todo', 'in_progress', 'done', 'overdue'] as const;
export type Status = (typeof STATUSES)[number];

// --- Branch Type ---

export const BRANCH_TYPES = ['sequential', 'parallel'] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

// --- Base XP Mapping ---

export const BASE_XP: Record<Priority, number> = {
  normal: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

// --- Interfaces ---

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type_id: string | null;
  pic_id: string | null;
  deadline: string | null;
  status: Status;
  priority: Priority;
  parent_task_id: string | null;
  branch_type: BranchType | null;
  branch_order: number | null;
  xp_reward: number;
  pending_xp: number;
  created_at: string;
  completed_at: string | null;
}

export interface TaskType {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface PIC {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  rpg_class: string;
  created_at: string;
}

export interface PlayerStats {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  streak: number;
  last_completed_date: string | null;
}

// ============================================================
// Battle Log — Move Types & Interfaces
// ============================================================

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

// --- XP Constants ---

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
