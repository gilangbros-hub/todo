export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'A valid email address is required';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}

export function validateDisplayName(name: string): string | null {
  if (!name || name.trim().length === 0) return 'Display name is required';
  if (name.trim().length > 50) return 'Display name must be 50 characters or less';
  return null;
}

export function validateRegistrationInput(data: {
  email?: string;
  password?: string;
  confirmPassword?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const emailErr = validateEmail(data.email ?? '');
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(data.password ?? '');
  if (passErr) errors.password = passErr;
  if (!errors.password) {
    const confirmErr = validateConfirmPassword(data.password ?? '', data.confirmPassword ?? '');
    if (confirmErr) errors.confirmPassword = confirmErr;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLoginInput(data: {
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const emailErr = validateEmail(data.email ?? '');
  if (emailErr) errors.email = emailErr;
  if (!data.password) errors.password = 'Password is required';
  return { valid: Object.keys(errors).length === 0, errors };
}
