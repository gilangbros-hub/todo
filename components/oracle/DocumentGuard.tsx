'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOracle } from '@/lib/oracle/context';

interface DocumentGuardProps {
  children: ReactNode;
}

/**
 * Guards Oracle chapter pages by redirecting to the Gatehouse
 * when no active document is loaded and initial fetch is complete.
 * Always allows access to /oracle/gatehouse regardless of document state.
 */
export function DocumentGuard({ children }: DocumentGuardProps) {
  const { activeDocument, isLoaded } = useOracle();
  const pathname = usePathname();
  const router = useRouter();

  const isGatehouse = pathname === '/oracle/gatehouse';

  useEffect(() => {
    if (isLoaded && !activeDocument && !isGatehouse) {
      router.replace('/oracle/gatehouse');
    }
  }, [isLoaded, activeDocument, isGatehouse, router]);

  // Always render gatehouse, still-loading state, or when document exists
  if (isGatehouse || !isLoaded || activeDocument) {
    return <>{children}</>;
  }

  // Redirect is in progress — render nothing to avoid flash
  return null;
}
