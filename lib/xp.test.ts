import { describe, it, expect } from 'vitest';
import { calculateXpReward, calculateLevel, shouldLevelUp } from './xp';

describe('calculateXpReward', () => {
  it('returns base XP for each priority when no deadline', () => {
    const now = '2024-01-15T12:00:00Z';
    expect(calculateXpReward('normal', null, now, false)).toBe(10);
    expect(calculateXpReward('rare', null, now, false)).toBe(25);
    expect(calculateXpReward('epic', null, now, false)).toBe(50);
    expect(calculateXpReward('legendary', null, now, false)).toBe(100);
  });

  it('applies +20% early bonus (floor) when completed before deadline', () => {
    const deadline = '2024-01-20T12:00:00Z';
    const completedAt = '2024-01-15T12:00:00Z';
    // normal: floor(10 * 1.2) = 12
    expect(calculateXpReward('normal', deadline, completedAt, false)).toBe(12);
    // rare: floor(25 * 1.2) = 30
    expect(calculateXpReward('rare', deadline, completedAt, false)).toBe(30);
    // epic: floor(50 * 1.2) = 60
    expect(calculateXpReward('epic', deadline, completedAt, false)).toBe(60);
    // legendary: floor(100 * 1.2) = 120
    expect(calculateXpReward('legendary', deadline, completedAt, false)).toBe(120);
  });

  it('applies -50% late penalty (floor) when completed after deadline', () => {
    const deadline = '2024-01-10T12:00:00Z';
    const completedAt = '2024-01-15T12:00:00Z';
    // normal: floor(10 * 0.5) = 5
    expect(calculateXpReward('normal', deadline, completedAt, false)).toBe(5);
    // rare: floor(25 * 0.5) = 12
    expect(calculateXpReward('rare', deadline, completedAt, false)).toBe(12);
    // epic: floor(50 * 0.5) = 25
    expect(calculateXpReward('epic', deadline, completedAt, false)).toBe(25);
    // legendary: floor(100 * 0.5) = 50
    expect(calculateXpReward('legendary', deadline, completedAt, false)).toBe(50);
  });

  it('returns base XP when completed exactly at deadline', () => {
    const deadline = '2024-01-15T12:00:00Z';
    const completedAt = '2024-01-15T12:00:00Z';
    expect(calculateXpReward('normal', deadline, completedAt, false)).toBe(10);
    expect(calculateXpReward('legendary', deadline, completedAt, false)).toBe(100);
  });

  it('halves XP (floor) for subtasks', () => {
    const now = '2024-01-15T12:00:00Z';
    // normal: floor(10 / 2) = 5
    expect(calculateXpReward('normal', null, now, true)).toBe(5);
    // rare: floor(25 / 2) = 12
    expect(calculateXpReward('rare', null, now, true)).toBe(12);
    // epic: floor(50 / 2) = 25
    expect(calculateXpReward('epic', null, now, true)).toBe(25);
    // legendary: floor(100 / 2) = 50
    expect(calculateXpReward('legendary', null, now, true)).toBe(50);
  });

  it('applies early bonus then halves for subtask', () => {
    const deadline = '2024-01-20T12:00:00Z';
    const completedAt = '2024-01-15T12:00:00Z';
    // rare: floor(floor(25 * 1.2) / 2) = floor(30 / 2) = 15
    expect(calculateXpReward('rare', deadline, completedAt, true)).toBe(15);
  });

  it('applies late penalty then halves for subtask', () => {
    const deadline = '2024-01-10T12:00:00Z';
    const completedAt = '2024-01-15T12:00:00Z';
    // rare: floor(floor(25 * 0.5) / 2) = floor(12 / 2) = 6
    expect(calculateXpReward('rare', deadline, completedAt, true)).toBe(6);
  });
});

describe('calculateLevel', () => {
  it('returns level 1 with 0 XP', () => {
    expect(calculateLevel(0)).toEqual({
      level: 1,
      xpInCurrentLevel: 0,
      xpForNextLevel: 100,
    });
  });

  it('returns level 1 with partial XP', () => {
    expect(calculateLevel(50)).toEqual({
      level: 1,
      xpInCurrentLevel: 50,
      xpForNextLevel: 100,
    });
  });

  it('returns level 2 at exactly 100 XP (threshold for level 1 = 100)', () => {
    expect(calculateLevel(100)).toEqual({
      level: 2,
      xpInCurrentLevel: 0,
      xpForNextLevel: 200,
    });
  });

  it('handles multi-level carry-over', () => {
    // Level 1 threshold: 100, Level 2 threshold: 200
    // 250 XP: subtract 100 (level 1→2), remaining 150; 150 < 200, so level 2
    expect(calculateLevel(250)).toEqual({
      level: 2,
      xpInCurrentLevel: 150,
      xpForNextLevel: 200,
    });
  });

  it('handles exact multi-level boundary', () => {
    // 100 (lvl1) + 200 (lvl2) = 300 → level 3, 0 remaining
    expect(calculateLevel(300)).toEqual({
      level: 3,
      xpInCurrentLevel: 0,
      xpForNextLevel: 300,
    });
  });

  it('handles large XP values', () => {
    // 100 + 200 + 300 + 400 = 1000 → level 5, 0 remaining
    expect(calculateLevel(1000)).toEqual({
      level: 5,
      xpInCurrentLevel: 0,
      xpForNextLevel: 500,
    });
  });

  it('handles XP just below a threshold', () => {
    expect(calculateLevel(99)).toEqual({
      level: 1,
      xpInCurrentLevel: 99,
      xpForNextLevel: 100,
    });
  });
});

describe('shouldLevelUp', () => {
  it('returns false when XP is below threshold', () => {
    expect(shouldLevelUp(1, 99)).toBe(false);
    expect(shouldLevelUp(2, 199)).toBe(false);
    expect(shouldLevelUp(5, 0)).toBe(false);
  });

  it('returns true when XP equals threshold', () => {
    expect(shouldLevelUp(1, 100)).toBe(true);
    expect(shouldLevelUp(2, 200)).toBe(true);
    expect(shouldLevelUp(3, 300)).toBe(true);
  });

  it('returns true when XP exceeds threshold', () => {
    expect(shouldLevelUp(1, 150)).toBe(true);
    expect(shouldLevelUp(2, 250)).toBe(true);
  });
});
