import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the services
vi.mock('@/lib/services/tasks', () => ({
  completeTask: vi.fn(),
}));

vi.mock('@/lib/services/player-stats', () => ({
  awardXp: vi.fn(),
}));

vi.mock('@/lib/xp', () => ({
  calculateXpReward: vi.fn(),
}));

// Mock React hooks to test the hook logic without a DOM
const mockSetState = vi.fn();
let stateValues: Record<string, unknown> = {};

vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const key = JSON.stringify(initial);
    if (!(key in stateValues)) {
      stateValues[key] = initial;
    }
    return [stateValues[key], (val: unknown) => {
      if (typeof val === 'function') {
        stateValues[key] = (val as (prev: unknown) => unknown)(stateValues[key]);
      } else {
        stateValues[key] = val;
      }
      mockSetState(val);
    }];
  },
  useCallback: (fn: unknown) => fn,
}));

import { completeTask } from '@/lib/services/tasks';
import { awardXp } from '@/lib/services/player-stats';
import { calculateXpReward } from '@/lib/xp';
import { useTaskCompletion } from '@/lib/hooks/useTaskCompletion';
import { Task } from '@/lib/types';

const mockCompleteTask = completeTask as ReturnType<typeof vi.fn>;
const mockAwardXp = awardXp as ReturnType<typeof vi.fn>;
const mockCalculateXpReward = calculateXpReward as ReturnType<typeof vi.fn>;

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Quest',
    description: null,
    type_id: null,
    pic_id: null,
    deadline: null,
    status: 'todo',
    priority: 'normal',
    parent_task_id: null,
    branch_type: null,
    branch_order: null,
    xp_reward: 10,
    created_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

describe('useTaskCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateValues = {};
  });

  describe('completeTaskWithRewards', () => {
    it('completes a task and awards XP without level-up', async () => {
      const onStatsUpdated = vi.fn();
      const completedAt = '2024-01-15T10:00:00Z';

      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        status: 'done',
        completed_at: completedAt,
      });
      mockCalculateXpReward.mockReturnValue(10);
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 10, level: 1, streak: 1, last_completed_date: '2024-01-15' },
        leveledUp: false,
        previousLevel: 1,
      });

      const { completeTaskWithRewards } = useTaskCompletion({ onStatsUpdated });
      const task = createMockTask();

      await completeTaskWithRewards(task);

      expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      expect(mockCalculateXpReward).toHaveBeenCalledWith('normal', null, completedAt, false);
      expect(mockAwardXp).toHaveBeenCalledWith(10);
      expect(onStatsUpdated).toHaveBeenCalled();
    });

    it('completes a task and triggers level-up overlay', async () => {
      const onStatsUpdated = vi.fn();
      const completedAt = '2024-01-15T10:00:00Z';

      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        status: 'done',
        completed_at: completedAt,
      });
      mockCalculateXpReward.mockReturnValue(100);
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 100, level: 2, streak: 1, last_completed_date: '2024-01-15' },
        leveledUp: true,
        previousLevel: 1,
      });

      const { completeTaskWithRewards } = useTaskCompletion({ onStatsUpdated });
      const task = createMockTask({ priority: 'legendary' });

      await completeTaskWithRewards(task);

      expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      expect(mockCalculateXpReward).toHaveBeenCalledWith('legendary', null, completedAt, false);
      expect(mockAwardXp).toHaveBeenCalledWith(100);
      expect(onStatsUpdated).toHaveBeenCalled();
    });

    it('does not complete a task that is already done (double-completion guard)', async () => {
      const { completeTaskWithRewards } = useTaskCompletion();
      const task = createMockTask({ status: 'done' });

      await completeTaskWithRewards(task);

      expect(mockCompleteTask).not.toHaveBeenCalled();
      expect(mockAwardXp).not.toHaveBeenCalled();
    });

    it('identifies subtasks correctly (parent_task_id is not null)', async () => {
      const completedAt = '2024-01-15T10:00:00Z';

      mockCompleteTask.mockResolvedValue({
        id: 'subtask-1',
        status: 'done',
        completed_at: completedAt,
      });
      mockCalculateXpReward.mockReturnValue(5);
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 5, level: 1, streak: 1, last_completed_date: '2024-01-15' },
        leveledUp: false,
        previousLevel: 1,
      });

      const { completeTaskWithRewards } = useTaskCompletion();
      const subtask = createMockTask({
        id: 'subtask-1',
        parent_task_id: 'parent-1',
      });

      await completeTaskWithRewards(subtask);

      expect(mockCalculateXpReward).toHaveBeenCalledWith('normal', null, completedAt, true);
    });

    it('passes deadline to XP calculation when present', async () => {
      const completedAt = '2024-01-10T10:00:00Z';
      const deadline = '2024-01-15T23:59:59Z';

      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        status: 'done',
        completed_at: completedAt,
      });
      mockCalculateXpReward.mockReturnValue(12); // 10 * 1.2 = 12 (early bonus)
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 12, level: 1, streak: 1, last_completed_date: '2024-01-10' },
        leveledUp: false,
        previousLevel: 1,
      });

      const { completeTaskWithRewards } = useTaskCompletion();
      const task = createMockTask({ deadline });

      await completeTaskWithRewards(task);

      expect(mockCalculateXpReward).toHaveBeenCalledWith('normal', deadline, completedAt, false);
    });

    it('uses fallback timestamp when completed_at is null', async () => {
      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        status: 'done',
        completed_at: null, // edge case: null completed_at
      });
      mockCalculateXpReward.mockReturnValue(10);
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 10, level: 1, streak: 1, last_completed_date: '2024-01-15' },
        leveledUp: false,
        previousLevel: 1,
      });

      const { completeTaskWithRewards } = useTaskCompletion();
      const task = createMockTask();

      await completeTaskWithRewards(task);

      // Should still call calculateXpReward with a valid timestamp (fallback to new Date())
      expect(mockCalculateXpReward).toHaveBeenCalled();
      const calledWith = mockCalculateXpReward.mock.calls[0];
      expect(calledWith[2]).toBeTruthy(); // completedAt should be a non-null string
    });

    it('works without onStatsUpdated callback', async () => {
      const completedAt = '2024-01-15T10:00:00Z';

      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        status: 'done',
        completed_at: completedAt,
      });
      mockCalculateXpReward.mockReturnValue(10);
      mockAwardXp.mockResolvedValue({
        stats: { id: 'stat-1', xp: 10, level: 1, streak: 1, last_completed_date: '2024-01-15' },
        leveledUp: false,
        previousLevel: 1,
      });

      // No options passed — should not throw
      const { completeTaskWithRewards } = useTaskCompletion();
      const task = createMockTask();

      await expect(completeTaskWithRewards(task)).resolves.toBeUndefined();
    });
  });

  describe('return values', () => {
    it('returns initial state with null xpToast and levelUp', () => {
      const result = useTaskCompletion();

      expect(result.xpToast).toBeNull();
      expect(result.levelUp).toBeNull();
      expect(result.isCompleting).toBe(false);
      expect(typeof result.completeTaskWithRewards).toBe('function');
      expect(typeof result.dismissXpToast).toBe('function');
      expect(typeof result.dismissLevelUp).toBe('function');
    });
  });
});
