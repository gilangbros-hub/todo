import { describe, it, expect } from 'vitest';
import { formatDeadlineCountdown } from '../../lib/formatting';

describe('formatDeadlineCountdown', () => {
  it('returns "OVERDUE" when deadline is in the past', () => {
    const deadline = '2024-01-01T00:00:00Z';
    const now = '2024-01-02T00:00:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('OVERDUE');
  });

  it('returns "OVERDUE" when deadline equals now', () => {
    const deadline = '2024-01-01T12:00:00Z';
    const now = '2024-01-01T12:00:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('OVERDUE');
  });

  it('returns "0d 1h" when deadline is 1 hour in the future', () => {
    const now = '2024-01-01T10:00:00Z';
    const deadline = '2024-01-01T11:00:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('0d 1h');
  });

  it('returns "1d 0h" when deadline is exactly 24 hours away', () => {
    const now = '2024-01-01T00:00:00Z';
    const deadline = '2024-01-02T00:00:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('1d 0h');
  });

  it('returns "2d 12h" when deadline is 2.5 days away', () => {
    const now = '2024-01-01T00:00:00Z';
    const deadline = '2024-01-03T12:00:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('2d 12h');
  });

  it('floors hours correctly (no rounding up)', () => {
    const now = '2024-01-01T00:00:00Z';
    // 1 day + 1 hour + 59 minutes = 1d 1h (59 min not rounded up)
    const deadline = '2024-01-02T01:59:00Z';
    expect(formatDeadlineCountdown(deadline, now)).toBe('1d 1h');
  });
});
