import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateDisplayName,
  validateRegistrationInput,
  validateLoginInput,
} from '../../lib/auth/validation';

describe('validateEmail', () => {
  it('returns null for a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('returns error for whitespace-only string', () => {
    expect(validateEmail('   ')).toBe('Email is required');
  });

  it('returns error for missing @', () => {
    expect(validateEmail('userexample.com')).toContain('valid email');
  });

  it('returns error for missing domain', () => {
    expect(validateEmail('user@')).toContain('valid email');
  });

  it('trims whitespace before validating', () => {
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('returns null for a password with 6+ characters', () => {
    expect(validatePassword('abc123')).toBeNull();
  });

  it('returns error for empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('returns error for password shorter than 6 characters', () => {
    expect(validatePassword('abc')).toContain('at least 6');
  });

  it('accepts exactly 6 characters', () => {
    expect(validatePassword('123456')).toBeNull();
  });
});

describe('validateConfirmPassword', () => {
  it('returns null when passwords match', () => {
    expect(validateConfirmPassword('pass123', 'pass123')).toBeNull();
  });

  it('returns error when passwords differ', () => {
    expect(validateConfirmPassword('pass123', 'pass456')).toContain('do not match');
  });
});

describe('validateDisplayName', () => {
  it('returns null for a valid display name', () => {
    expect(validateDisplayName('Alice')).toBeNull();
  });

  it('returns error for empty name', () => {
    expect(validateDisplayName('')).toBe('Display name is required');
  });

  it('returns error for whitespace-only name', () => {
    expect(validateDisplayName('   ')).toBe('Display name is required');
  });

  it('returns error when name exceeds 50 characters', () => {
    expect(validateDisplayName('a'.repeat(51))).toContain('50 characters');
  });

  it('accepts exactly 50 characters', () => {
    expect(validateDisplayName('a'.repeat(50))).toBeNull();
  });
});

describe('validateRegistrationInput', () => {
  const validInput = {
    email: 'user@example.com',
    password: 'secret123',
    confirmPassword: 'secret123',
  };

  it('returns valid for correct input', () => {
    const result = validateRegistrationInput(validInput);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('returns email error for missing email', () => {
    const result = validateRegistrationInput({ ...validInput, email: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('returns password error for short password', () => {
    const result = validateRegistrationInput({ ...validInput, password: 'ab', confirmPassword: 'ab' });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('returns confirmPassword error when passwords differ', () => {
    const result = validateRegistrationInput({ ...validInput, confirmPassword: 'other' });
    expect(result.valid).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('skips confirmPassword check when password itself is invalid', () => {
    const result = validateRegistrationInput({ ...validInput, password: 'a', confirmPassword: 'b' });
    expect(result.errors.password).toBeDefined();
    expect(result.errors.confirmPassword).toBeUndefined();
  });

  it('handles entirely missing fields', () => {
    const result = validateRegistrationInput({});
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});

describe('validateLoginInput', () => {
  it('returns valid for correct input', () => {
    const result = validateLoginInput({ email: 'a@b.com', password: 'secret' });
    expect(result.valid).toBe(true);
  });

  it('returns email error for missing email', () => {
    const result = validateLoginInput({ email: '', password: 'secret' });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('returns password error for missing password', () => {
    const result = validateLoginInput({ email: 'a@b.com', password: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('handles entirely missing fields', () => {
    const result = validateLoginInput({});
    expect(result.valid).toBe(false);
  });
});
