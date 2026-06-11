'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHAPTERS, ChapterSlug } from '@/lib/oracle/types';
import { OracleIcon } from './OracleIcon';

interface TopAppBarProps {
  activeChapter?: ChapterSlug;
  documentTitle?: string | null;
  onMenuToggle?: () => void;
}

/**
 * Derive the active chapter slug from the current pathname.
 */
function getChapterFromPathname(pathname: string): ChapterSlug {
  const segments = pathname.split('/').filter(Boolean);
  // pathname is /oracle/{slug} or /oracle/{slug}/...
  if (segments.length >= 2 && segments[0] === 'oracle') {
    const slug = segments[1] as ChapterSlug;
    if (CHAPTERS.some((ch) => ch.slug === slug)) {
      return slug;
    }
  }
  return 'gatehouse';
}

export function TopAppBar({ activeChapter: activeChapterProp, documentTitle, onMenuToggle }: TopAppBarProps) {
  const pathname = usePathname();
  const activeChapter = activeChapterProp ?? getChapterFromPathname(pathname);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-oracle-surface/80 backdrop-blur-md border-b border-oracle-border shadow-oracle-glow-sm">
      <div className="h-full flex items-center px-4 md:px-6 gap-4">
        {/* Mobile hamburger button */}
        <button
          type="button"
          className="lg:hidden text-oracle-gold hover:text-oracle-gold-fixed transition-colors cursor-pointer"
          aria-label="Open navigation menu"
          onClick={onMenuToggle}
        >
          <OracleIcon name="menu" size={24} />
        </button>

        {/* Brand section — hidden on mobile */}
        <div className="hidden md:flex items-center shrink-0">
          <span className="font-oracle-display text-oracle-headline-lg text-oracle-gold tracking-widest text-lg">
            THE ORACLE
          </span>
        </div>

        {/* Chapter Rail — center, scrollable */}
        <nav className="flex-1 min-w-0 overflow-x-auto scrollbar-hide" aria-label="Chapter navigation">
          <ul className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-1">
            {CHAPTERS.map((chapter) => {
              const isActive = chapter.slug === activeChapter;
              return (
                <li key={chapter.slug}>
                  <Link
                    href={`/oracle/${chapter.slug}`}
                    className={`
                      inline-flex items-center font-oracle-display text-[13px] uppercase transition-colors cursor-pointer
                      ${
                        isActive
                          ? 'text-oracle-gold-fixed bg-oracle-gold-container px-3 py-1 rounded-full shadow-oracle-glow'
                          : 'text-oracle-muted hover:text-oracle-gold px-2 py-1'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {chapter.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Document title (optional, shown when available) */}
        {documentTitle && (
          <span className="hidden lg:block text-oracle-muted text-oracle-label-sm truncate max-w-[200px]">
            {documentTitle}
          </span>
        )}

        {/* Actions section — right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="text-oracle-gold hover:text-oracle-gold-fixed transition-colors cursor-pointer"
            aria-label="Document library"
          >
            <OracleIcon name="menu_book" size={22} />
          </button>
          <button
            type="button"
            className="text-oracle-gold hover:text-oracle-gold-fixed transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <OracleIcon name="settings" size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
