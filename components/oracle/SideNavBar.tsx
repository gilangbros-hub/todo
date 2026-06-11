'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHAPTERS, ChapterSlug } from '@/lib/oracle/types';
import { OracleIcon } from './OracleIcon';

/**
 * Derive the active chapter slug from the current pathname.
 */
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

interface SideNavBarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SideNavBar({ isOpen = false, onClose }: SideNavBarProps) {
  const pathname = usePathname();
  const activeChapter = getChapterFromPathname(pathname);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-64px)] z-50 w-64 shrink-0 flex-col bg-oracle-stone border-r border-oracle-border
          transition-transform duration-300 ease-in-out
          lg:flex lg:translate-x-0
          ${isOpen ? 'flex translate-x-0' : 'hidden lg:flex -translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header section — Avatar & user info */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="w-16 h-16 rounded-full border border-oracle-gold bg-oracle-container flex items-center justify-center">
            <OracleIcon name="person" size={32} className="text-oracle-gold" />
          </div>
          <span className="mt-3 font-oracle-display text-oracle-gold text-sm tracking-widest">
            ARCHIVIST
          </span>
          <span className="mt-1 font-oracle-mono text-oracle-label-mono text-oracle-muted uppercase">
            TACTICAL COMMAND
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Chapter navigation">
          <ul className="flex flex-col">
            {CHAPTERS.map((chapter) => {
              const isActive = chapter.slug === activeChapter;
              return (
                <li key={chapter.slug}>
                  <Link
                    href={`/oracle/${chapter.slug}`}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-4 py-3 font-oracle-mono text-oracle-label-mono uppercase transition-all cursor-pointer
                      ${
                        isActive
                          ? 'border-l-4 border-oracle-gold bg-oracle-panel text-oracle-gold font-bold'
                          : 'text-oracle-faint hover:text-oracle-gold hover:bg-oracle-container/30'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <OracleIcon name={chapter.icon} size={20} />
                    <span>{chapter.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section — TRANSCRIBE BRD button */}
        <div className="border-t border-oracle-border p-4 bg-oracle-stone">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 border border-oracle-gold text-oracle-gold font-oracle-mono uppercase px-4 py-2.5 hover:bg-oracle-gold/10 transition-colors cursor-pointer"
          >
            <OracleIcon name="draw" size={18} />
            <span>TRANSCRIBE BRD</span>
          </button>
        </div>
      </aside>
    </>
  );
}
