'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, History, Upload, HelpCircle, User, ChevronRight,
  FileText, Eye, Menu,
} from 'lucide-react';
import { CHAPTERS, ChapterSlug } from '@/lib/renata/types';
import { useRenata } from '@/lib/renata/context';

const ICON_MAP: Record<string, any> = {
  mission_control: Upload,
  results: BarChart3,
  history: History,
};

function getChapterFromPathname(pathname: string): ChapterSlug {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && segments[0] === 'renata') {
    const slug = segments[1] as ChapterSlug;
    if (CHAPTERS.some((ch) => ch.slug === slug)) return slug;
  }
  if (pathname.startsWith('/renata/insights')) return 'insights';
  return 'mission-control';
}

interface SideNavBarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

export function SideNavBar({ isOpen = false, onClose, collapsed = false }: SideNavBarProps) {
  const pathname = usePathname();
  const { activeDocument } = useRenata();
  const activeChapter = getChapterFromPathname(pathname);
  const hasDocument = !!activeDocument;
  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`fixed top-0 left-0 h-screen z-50 shrink-0 flex-col bg-sys-surface/80 backdrop-blur-2xl border-r border-sys-border shadow-sm transition-all duration-300 ease-in-out ${sidebarWidth} lg:flex lg:translate-x-0 ${isOpen ? 'flex translate-x-0' : 'hidden lg:flex -translate-x-full lg:translate-x-0'}`}>
        {/* Branding */}
        <div className={collapsed ? 'flex justify-center p-4' : 'flex items-center gap-3 p-5'}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sys-primary to-sys-secondary flex items-center justify-center shrink-0 shadow-sm">
            <BarChart3 size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-outfit font-extrabold text-lg text-sys-text tracking-tight truncate">Renata</h1>
              <p className="font-geist text-[10px] text-sys-muted font-bold uppercase tracking-wider">Analytica</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2" aria-label="Main navigation">
          <ul className="flex flex-col gap-1">
            {CHAPTERS.map((chapter) => {
              const isResults = chapter.slug === 'results';
              if (isResults && !hasDocument) return null;

              const Icon = ICON_MAP[chapter.slug] || BarChart3;
              const isActive = chapter.slug === activeChapter || (chapter.slug === 'insights' && pathname.startsWith('/renata/insights'));

              return (
                <li key={chapter.slug}>
                  <Link
                    href={`/renata/${chapter.slug}`}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl font-geist font-bold text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'} ${isActive ? 'bg-sys-primary-container/20 text-sys-primary shadow-sm' : 'text-sys-muted hover:text-sys-text hover:bg-sys-bg'}`}
                    title={collapsed ? chapter.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} className={isActive ? 'text-sys-primary' : 'text-sys-faint'} />
                    {!collapsed && <span>{chapter.label}</span>}
                  </Link>
                </li>
              );
            })}

            {/* No document state */}
            {!hasDocument && !collapsed && (
              <li>
                <div className="mt-4 mx-2 p-4 rounded-xl bg-sys-bg border border-sys-border border-dashed text-center space-y-2">
                  <Upload size={24} className="text-sys-faint mx-auto" />
                  <p className="font-geist text-xs text-sys-muted leading-relaxed">Upload a BRD to unlock results and history.</p>
                </div>
              </li>
            )}
          </ul>

          {/* Analysis section (document loaded) */}
          {hasDocument && (
            <ul className="flex flex-col gap-1 mt-4">
              {!collapsed && (
                <li className="px-3 py-1">
                  <p className="text-[10px] text-sys-faint uppercase tracking-widest font-geist font-bold">Analysis</p>
                </li>
              )}
              <li>
                <Link
                  href={`/renata/insights/${activeDocument?.id || '#'}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl font-geist font-bold text-sm transition-all duration-200 cursor-pointer ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'} ${pathname.startsWith('/renata/insights') ? 'bg-sys-primary-container/20 text-sys-primary shadow-sm' : 'text-sys-faint hover:text-sys-text hover:bg-sys-bg'}`}
                  title={collapsed ? 'Feature Detail' : undefined}
                >
                  <Eye size={20} className={pathname.startsWith('/renata/insights') ? 'text-sys-primary' : 'text-sys-faint'} />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Feature Detail</span>
                      <ChevronRight size={14} className="text-sys-faint" />
                    </div>
                  )}
                </Link>
              </li>
            </ul>
          )}
        </nav>

        {/* Profile */}
        <div className="mt-auto border-t border-sys-border">
          {collapsed ? (
            <div className="flex justify-center py-4">
              <div className="w-9 h-9 rounded-full bg-sys-bg border border-sys-border flex items-center justify-center">
                <User size={18} className="text-sys-primary" />
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sys-muted hover:text-sys-text hover:bg-sys-bg transition-all duration-300 rounded-xl font-geist text-xs font-bold">
                <HelpCircle size={16} className="text-sys-faint" />
                Help Center
              </Link>
              <div className="mt-1 flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-sys-bg border border-sys-border flex items-center justify-center shrink-0">
                  <User size={18} className="text-sys-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-geist font-bold text-sm text-sys-text truncate">Muhammad Gilang</span>
                  <span className="font-geist text-xs text-sys-muted truncate">IT Business Analyst</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
