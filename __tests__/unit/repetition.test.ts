import { describe, it, expect } from 'vitest';
import { RepetitionGuard } from '../../lib/brd/repetition';

describe('RepetitionGuard', () => {
  it('returns false for short, non-repetitive text', () => {
    const guard = new RepetitionGuard();
    expect(guard.push('Hello world, this is a normal sentence.')).toBe(false);
  });

  it('returns false when buffer has not reached checkEvery threshold', () => {
    const guard = new RepetitionGuard({ checkEvery: 200 });
    expect(guard.push('word '.repeat(10))).toBe(false);
  });

  it('detects consecutive identical-word runs', () => {
    const guard = new RepetitionGuard({ windowChars: 500, checkEvery: 1, minWords: 10, maxRunRepeat: 5 });
    const repeated = 'app '.repeat(100);
    expect(guard.push(repeated)).toBe(true);
  });

  it('detects low lexical diversity', () => {
    const guard = new RepetitionGuard({ windowChars: 500, checkEvery: 1, minWords: 10, uniqueRatio: 0.18 });
    // 3 unique words repeated many times → low diversity
    const text = 'process need process need process need process need process need process need process need process need process need process need process need process need ';
    expect(guard.push(text)).toBe(true);
  });

  it('detects short repeating patterns like to-to-to', () => {
    const guard = new RepetitionGuard({ windowChars: 500, checkEvery: 1 });
    const text = 'a '.repeat(10) + 'to-'.repeat(50);
    expect(guard.push(text)).toBe(true);
  });

  it('slides the window when buffer exceeds windowChars', () => {
    const guard = new RepetitionGuard({ windowChars: 100, checkEvery: 1 });
    // Push lots of unique text first
    guard.push('The quick brown fox jumps over the lazy dog. '.repeat(5));
    // Now push non-repetitive shorter text — should not trigger
    expect(guard.push('Another unique sentence with new words here today.')).toBe(false);
  });

  it('returns false for empty chunk', () => {
    const guard = new RepetitionGuard();
    expect(guard.push('')).toBe(false);
  });

  it('does not trigger on reasonably diverse text', () => {
    const guard = new RepetitionGuard({ windowChars: 500, checkEvery: 1, minWords: 10 });
    const diverse = 'The system shall provide user authentication with OAuth2 support and integrate with external identity providers for single sign-on capabilities across all modules.';
    expect(guard.push(diverse)).toBe(false);
  });

  it('respects custom maxRunRepeat threshold', () => {
    const guard = new RepetitionGuard({ windowChars: 500, checkEvery: 1, minWords: 10, maxRunRepeat: 20 });
    // 15 repeats — under threshold of 20
    const text = 'unique words at the start to fill the minimum word count requirement ' + 'app '.repeat(15) + 'end of text here';
    expect(guard.push(text)).toBe(false);
  });
});
