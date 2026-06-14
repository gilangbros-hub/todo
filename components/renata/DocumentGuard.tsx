'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRenata } from '@/lib/renata/context';

interface DocumentGuardProps {
  children: ReactNode;
}

/**
 * Guards results and insights pages by redirecting to Mission Control
 * when no active document is loaded.
 * Always allows access to /renata/mission-control and /renata/history.
 */
export function DocumentGuard({ children }: DocumentGuardProps) {
  const { activeDocument, isLoaded } = useRenata();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = pathname === '/renata/mission-control' || pathname === '/renata/history';

  useEffect(() => {
    if (isLoaded && !activeDocument && !isPublic) {
      router.replace('/renata/mission-control');
    }
  }, [isLoaded, activeDocument, isPublic, router]);

  if (isPublic || !isLoaded || activeDocument) {
    return <>{children}</>;
  }

  // Redirect is in progress — render nothing to avoid flash
  return null;
}
