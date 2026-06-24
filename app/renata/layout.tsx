'use client';

import { ReactNode } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import { RenataProvider, useRenata } from '@/lib/renata/context';
import { SideNavBar } from '@/components/renata/SideNavBar';
import { DocumentGuard } from '@/components/renata/DocumentGuard';

interface RenataLayoutProps {
  children: ReactNode;
}

function TopBar() {
  const { activeDocument } = useRenata();

  return (
    <header className="sticky top-0 z-30 h-14 bg-sys-surface/90 backdrop-blur-xl border-b border-sys-border flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm font-geist">
          <BarChart3 size={16} className="text-sys-primary" />
          <span className="text-sys-faint font-bold">Renata</span>
          {activeDocument && (
            <>
              <ChevronRight size={14} className="text-sys-faint" />
              <span className="text-sys-text font-bold truncate max-w-[200px]">{activeDocument.title}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sys-bg border border-sys-border">
          <span className="w-1.5 h-1.5 rounded-full bg-sys-success" />
          <span className="font-geist text-xs font-bold text-sys-muted">DeepSeek V4</span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-sys-primary-container/20 flex items-center justify-center">
          <BarChart3 size={16} className="text-sys-primary" />
        </div>
      </div>
    </header>
  );
}

export default function RenataLayout({ children }: RenataLayoutProps) {
  return (
    <div className="h-screen flex w-full bg-sys-bg overflow-hidden">
      <RenataProvider>
        <SideNavBar />
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-60">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-8 px-4 lg:px-6">
            <DocumentGuard>
              {children}
            </DocumentGuard>
          </main>
        </div>
      </RenataProvider>
    </div>
  );
}
