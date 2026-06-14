import { describe, it, expect } from 'vitest';
import {
  safeHexColor,
  validateHexColor,
  capString,
  sanitizeIdentifier,
  isUuid,
} from '../../lib/security';

describe('safeHexColor', () => {
  it('accepts valid 3-digit hex', () => {
    expect(safeHexColor('#abc')).toBe('#abc');
  });

  it('accepts valid 6-digit hex', () => {
    expect(safeHexColor('#AABBCC')).toBe('#AABBCC');
  });

  it('trims whitespace around valid hex', () => {
    expect(safeHexColor('  #fff  ')).toBe('#fff');
  });

  it('rejects rgb() syntax and returns fallback', () => {
    expect(safeHexColor('rgb(0,0,0)')).toBe('#6b7280');
  });

  it('rejects CSS keywords', () => {
    expect(safeHexColor('red')).toBe('#6b7280');
  });

  it('rejects url() injection attempts', () => {
    expect(safeHexColor('url(evil)')).toBe('#6b7280');
  });

  it('returns fallback for null', () => {
    expect(safeHexColor(null)).toBe('#6b7280');
  });

  it('returns fallback for undefined', () => {
    expect(safeHexColor(undefined)).toBe('#6b7280');
  });

  it('returns custom fallback when provided', () => {
    expect(safeHexColor('bad', '#000')).toBe('#000');
  });

  it('rejects 4-digit hex strings', () => {
    expect(safeHexColor('#abcd')).toBe('#6b7280');
  });

  it('rejects hex without hash prefix', () => {
    expect(safeHexColor('AABBCC')).toBe('#6b7280');
  });
});

describe('validateHexColor', () => {
  it('returns valid for proper hex color', () => {
    expect(validateHexColor('#4a9eff')).toEqual({ valid: true });
  });

  it('returns error for empty string', () => {
    const result = validateHexColor('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for non-hex string', () => {
    const result = validateHexColor('not-a-color');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hex');
  });

  it('returns error for non-string input', () => {
    const result = validateHexColor(42 as unknown as string);
    expect(result.valid).toBe(false);
  });
});

describe('capString', () => {
  it('returns the string unchanged when under maxLength', () => {
    expect(capString('hello', 10)).toBe('hello');
  });

  it('truncates string exceeding maxLength', () => {
    expect(capString('hello world', 5)).toBe('hello');
  });

  it('trims whitespace', () => {
    expect(capString('  hi  ', 10)).toBe('hi');
  });

  it('returns empty string for null', () => {
    expect(capString(null, 10)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(capString(undefined, 10)).toBe('');
  });

  it('handles exact maxLength', () => {
    expect(capString('abcde', 5)).toBe('abcde');
  });
});

describe('sanitizeIdentifier', () => {
  it('passes through clean identifiers', () => {
    expect(sanitizeIdentifier('hello')).toBe('hello');
  });

  it('strips angle brackets', () => {
    expect(sanitizeIdentifier('<script>alert</script>')).toBe('scriptalert/script');
  });

  it('strips quotes and backticks', () => {
    expect(sanitizeIdentifier('"hello\'world`')).toBe('helloworld');
  });

  it('strips control characters', () => {
    expect(sanitizeIdentifier('a\x00b\x1Fc')).toBe('abc');
  });

  it('respects maxLength', () => {
    expect(sanitizeIdentifier('a'.repeat(200), 10)).toBe('a'.repeat(10));
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeIdentifier(123 as unknown as string)).toBe('');
  });
});

describe('isUuid', () => {
  it('accepts a valid UUID v4', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects a string missing dashes', () => {
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isUuid('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isUuid(42)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it('rejects a UUID with extra characters', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
  });
});
