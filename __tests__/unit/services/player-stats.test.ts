import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  getPlayerStats,
  initializePlayerStats,
  awardXp,
} from '@/lib/services/player-stats';

describe('player-stats service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain setup
    mockSelect.mockReturnValue({ limit: mockLimit, single: mockSingle });
    mockLimit.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
  });

  describe('getPlayerStats', () => {
    it('returns existing player stats when record exists', async () => {
      const existingStats = {
        id: 'stat-1',
        xp: 150,
        level: 2,
        streak: 3,
        last_completed_date: '2024-03-15',
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: existingStats, error: null }),
        }),
      });

      const result = await getPlayerStats();
      expect(result).toEqual(existingStats);
      expect(mockFrom).toHaveBeenCalledWith('player_stats');
    });

    it('initializes new stats when no record exists', async () => {
      const newStats = {
        id: 'stat-new',
        xp: 0,
        level: 1,
        streak: 0,
        last_completed_date: null,
      };

      // First call (getPlayerStats) returns no data (maybeSingle returns null without error)
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        })
        // Second call (initializePlayerStats)
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: newStats, error: null }),
            }),
          }),
        });

      const result = await getPlayerStats();
      expect(result).toEqual(newStats);
    });

    it('throws when query returns an error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      });

      await expect(getPlayerStats()).rejects.toThrow('Failed to fetch player stats: DB error');
    });
  });

  describe('initializePlayerStats', () => {
    it('creates a record with default values', async () => {
      const newStats = {
        id: 'stat-new',
        xp: 0,
        level: 1,
        streak: 0,
        last_completed_date: null,
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newStats, error: null }),
          }),
        }),
      });

      const result = await initializePlayerStats();
      expect(result).toEqual(newStats);
      expect(mockFrom).toHaveBeenCalledWith('player_stats');
    });

    it('throws when insert fails', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      });

      await expect(initializePlayerStats()).rejects.toThrow(
        'Failed to initialize player stats: DB error'
      );
    });
  });

  describe('awardXp', () => {
    it('awards XP and updates level correctly', async () => {
      const currentStats = {
        id: 'stat-1',
        xp: 80,
        level: 1,
        streak: 2,
        last_completed_date: new Date(Date.now() - 86400000)
          .toISOString()
          .split('T')[0], // yesterday
      };

      const updatedStats = {
        id: 'stat-1',
        xp: 130,
        level: 2,
        streak: 3,
        last_completed_date: new Date().toISOString().split('T')[0],
      };

      // getPlayerStats call
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: currentStats, error: null }),
          }),
        })
        // update call
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedStats, error: null }),
              }),
            }),
          }),
        });

      const result = await awardXp(50);
      expect(result.stats).toEqual(updatedStats);
      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(1);
    });

    it('does not level up when XP is below threshold', async () => {
      const currentStats = {
        id: 'stat-1',
        xp: 10,
        level: 1,
        streak: 1,
        last_completed_date: new Date().toISOString().split('T')[0], // today
      };

      const updatedStats = {
        id: 'stat-1',
        xp: 20,
        level: 1,
        streak: 1,
        last_completed_date: new Date().toISOString().split('T')[0],
      };

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: currentStats, error: null }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedStats, error: null }),
              }),
            }),
          }),
        });

      const result = await awardXp(10);
      expect(result.stats).toEqual(updatedStats);
      expect(result.leveledUp).toBe(false);
      expect(result.previousLevel).toBe(1);
    });

    it('throws when update fails', async () => {
      const currentStats = {
        id: 'stat-1',
        xp: 10,
        level: 1,
        streak: 0,
        last_completed_date: null,
      };

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: currentStats, error: null }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        });

      await expect(awardXp(10)).rejects.toThrow('Failed to award XP: Update failed');
    });
  });
});
