'use client';

import { ReactNode, useState } from 'react';
import { oracleFontVariables } from '@/lib/oracle/fonts';
import { MaterialSymbolsLink } from '@/components/oracle/MaterialSymbolsLink';
import { OracleProvider } from '@/lib/oracle/context';
import { TopAppBar } from '@/components/oracle/TopAppBar';
import { SideNavBar } from '@/components/oracle/SideNavBar';
import { DocumentGuard } from '@/components/oracle/DocumentGuard';

interface OracleLayoutProps {
  children: ReactNode;
}

export default function OracleLayout({ children }: OracleLayoutProps) {
  const [sideNavOpen, setSideNavOpen] = useState(false);

  return (
    <div
      className={`${oracleFontVariables} min-h-screen flex flex-col bg-oracle-surface font-oracle-body text-oracle-text`}
    >
      <MaterialSymbolsLink />
      <OracleProvider>
        {/* TopAppBar — fixed 64px, handles its own pathname detection */}
        <TopAppBar onMenuToggle={() => setSideNavOpen((prev) => !prev)} />

        {/* Spacer for fixed TopAppBar */}
        <div className="h-16 shrink-0" />

        <div className="flex flex-1 overflow-hidden">
          {/* SideNavBar — fixed left, 256px on desktop; slide-out on mobile */}
          <SideNavBar isOpen={sideNavOpen} onClose={() => setSideNavOpen(false)} />

          {/* Main content area — offset for fixed SideNavBar on lg+ */}
          <main className="flex-1 lg:ml-64 overflow-y-auto">
            <DocumentGuard>
              {children}
            </DocumentGuard>
          </main>
        </div>
      </OracleProvider>
    </div>
  );
}
