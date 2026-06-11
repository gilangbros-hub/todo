import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import config from '@/tailwind.config';

// ============================================================
// Property 12: Oracle theme does not override RPG tokens
// ============================================================

/**
 * **Validates: Requirements 14.3**
 *
 * For any existing RPG theme token key (rpg-dark, rpg-card, rpg-border,
 * font-pixel, font-retro, shadow-normal, etc.), the resolved Tailwind config
 * after Oracle theme extension SHALL produce the same value as before the
 * extension was added.
 */

// Known RPG color tokens and their expected values
const RPG_COLOR_TOKENS: Record<string, string> = {
  'rpg-dark': '#0d0d1a',
  'rpg-card': '#1a1a2e',
  'rpg-border': '#2a2a4a',
  'rpg-normal': '#6b7280',
  'rpg-rare': '#4a9eff',
  'rpg-epic': '#a78bfa',
  'rpg-legendary': '#f0c040',
};

// Known RPG font family tokens and their expected values
const RPG_FONT_TOKENS: Record<string, string[]> = {
  pixel: ['var(--font-pixel)', 'monospace'],
  retro: ['var(--font-retro)', 'monospace'],
};

// Known RPG box shadow tokens and their expected values
const RPG_SHADOW_TOKENS: Record<string, string> = {
  normal: '0 0 8px #6b7280',
  rare: '0 0 8px #4a9eff',
  epic: '0 0 8px #a78bfa',
  legendary: '0 0 8px #f0c040',
  overdue: '0 0 8px #ef4444',
};

describe('Feature: oracle-redesign, Property 12: Oracle theme does not override RPG tokens', () => {
  const resolvedColors = config.theme?.extend?.colors as Record<string, string>;
  const resolvedFonts = config.theme?.extend?.fontFamily as Record<string, string[]>;
  const resolvedShadows = config.theme?.extend?.boxShadow as Record<string, string>;

  it('all RPG color tokens retain their original values', () => {
    const rpgColorKeys = Object.keys(RPG_COLOR_TOKENS);

    fc.assert(
      fc.property(
        fc.constantFrom(...rpgColorKeys),
        (tokenKey) => {
          const expectedValue = RPG_COLOR_TOKENS[tokenKey];
          const actualValue = resolvedColors[tokenKey];
          expect(actualValue).toBe(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all RPG font family tokens retain their original values', () => {
    const rpgFontKeys = Object.keys(RPG_FONT_TOKENS);

    fc.assert(
      fc.property(
        fc.constantFrom(...rpgFontKeys),
        (tokenKey) => {
          const expectedValue = RPG_FONT_TOKENS[tokenKey];
          const actualValue = resolvedFonts[tokenKey];
          expect(actualValue).toEqual(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all RPG box shadow tokens retain their original values', () => {
    const rpgShadowKeys = Object.keys(RPG_SHADOW_TOKENS);

    fc.assert(
      fc.property(
        fc.constantFrom(...rpgShadowKeys),
        (tokenKey) => {
          const expectedValue = RPG_SHADOW_TOKENS[tokenKey];
          const actualValue = resolvedShadows[tokenKey];
          expect(actualValue).toBe(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('RPG tokens are not removed or missing from the config', () => {
    const allRpgTokenKeys = [
      ...Object.keys(RPG_COLOR_TOKENS),
      ...Object.keys(RPG_FONT_TOKENS).map(k => `font:${k}`),
      ...Object.keys(RPG_SHADOW_TOKENS).map(k => `shadow:${k}`),
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...allRpgTokenKeys),
        (compositeKey) => {
          if (compositeKey.startsWith('font:')) {
            const key = compositeKey.replace('font:', '');
            expect(resolvedFonts).toHaveProperty(key);
          } else if (compositeKey.startsWith('shadow:')) {
            const key = compositeKey.replace('shadow:', '');
            expect(resolvedShadows).toHaveProperty(key);
          } else {
            expect(resolvedColors).toHaveProperty(compositeKey);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
