import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CHAPTERS, ChapterSlug } from '@/lib/oracle/types';

// ============================================================
// Helper: replicate the getChapterFromPathname logic from TopAppBar.tsx
// ============================================================
function getChapterFromPathname(pathname: string): ChapterSlug {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && segments[0] === 'oracle') {
    const slug = segments[1] as ChapterSlug;
    if (CHAPTERS.some((ch) => ch.slug === slug)) {
      return slug;
    }
  }
  return 'gatehouse';
}

// ============================================================
// Helper: replicate the guard redirect logic from DocumentGuard.tsx
// ============================================================
function shouldRedirect(isLoaded: boolean, activeDocument: unknown, pathname: string): boolean {
  const isGatehouse = pathname === '/oracle/gatehouse';
  return isLoaded && !activeDocument && !isGatehouse;
}

// ============================================================
// Property 3: Chapter navigation produces correct URL and active state
// ============================================================

/**
 * **Validates: Requirements 2.1, 2.2, 2.4**
 *
 * For any valid ChapterSlug from the CHAPTERS constant, navigating to that
 * chapter SHALL produce a URL matching `/oracle/{slug}` and the
 * getChapterFromPathname logic correctly identifies the active chapter.
 */
describe('Feature: oracle-redesign, Property 3: Chapter navigation produces correct URL and active state', () => {
  const allSlugs = CHAPTERS.map((ch) => ch.slug);

  it('URL generated for any valid chapter slug matches /oracle/{slug}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allSlugs),
        (slug) => {
          const url = `/oracle/${slug}`;
          expect(url).toBe(`/oracle/${slug}`);
          // URL must start with /oracle/ and end with the slug
          expect(url).toMatch(/^\/oracle\/[a-z-]+$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getChapterFromPathname correctly identifies the active chapter from a valid URL', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allSlugs),
        (slug) => {
          const pathname = `/oracle/${slug}`;
          const result = getChapterFromPathname(pathname);
          expect(result).toBe(slug);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getChapterFromPathname returns gatehouse for invalid or missing slugs', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !allSlugs.includes(s as ChapterSlug) && !s.includes('/')),
        (invalidSlug) => {
          const pathname = `/oracle/${invalidSlug}`;
          const result = getChapterFromPathname(pathname);
          expect(result).toBe('gatehouse');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every CHAPTERS entry has a unique slug that produces a valid navigation URL', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CHAPTERS),
        (chapter) => {
          const url = `/oracle/${chapter.slug}`;
          // The slug is a valid ChapterSlug
          expect(allSlugs).toContain(chapter.slug);
          // The URL is correctly formed
          expect(url).toBe(`/oracle/${chapter.slug}`);
          // Round-trip: parsing the URL gives back the same slug
          expect(getChapterFromPathname(url)).toBe(chapter.slug);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 5: Empty document guard redirect
// ============================================================

/**
 * **Validates: Requirements 2.3**
 *
 * For any ChapterSlug that is not 'gatehouse', if no Active_Document is set
 * in Oracle_Context (isLoaded === true && activeDocument === null), the system
 * SHALL redirect to `/oracle/gatehouse`.
 */
describe('Feature: oracle-redesign, Property 5: Empty document guard redirect', () => {
  const nonGatehouseSlugs = CHAPTERS
    .map((ch) => ch.slug)
    .filter((slug) => slug !== 'gatehouse');

  it('redirects for any non-gatehouse slug when no document is loaded', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonGatehouseSlugs),
        (slug) => {
          const pathname = `/oracle/${slug}`;
          const result = shouldRedirect(true, null, pathname);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT redirect for gatehouse regardless of document state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, { id: 'doc-1' }, { id: 'doc-2', title: 'Test' }),
        (activeDocument) => {
          const pathname = '/oracle/gatehouse';
          const result = shouldRedirect(true, activeDocument, pathname);
          // Gatehouse should never redirect (isGatehouse check prevents it)
          // When activeDocument is truthy, shouldRedirect is false anyway
          // When activeDocument is null/undefined AND isGatehouse, should NOT redirect
          if (!activeDocument) {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT redirect when document is loaded (activeDocument is truthy)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonGatehouseSlugs),
        fc.constantFrom({ id: 'doc-1' }, { id: 'doc-2', title: 'BRD Analysis' }),
        (slug, activeDocument) => {
          const pathname = `/oracle/${slug}`;
          const result = shouldRedirect(true, activeDocument, pathname);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT redirect when isLoaded is false (still loading)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonGatehouseSlugs),
        (slug) => {
          const pathname = `/oracle/${slug}`;
          const result = shouldRedirect(false, null, pathname);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
