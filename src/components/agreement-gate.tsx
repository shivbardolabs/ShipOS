'use client';

/**
 * Agreement Gate — Redirects users to /agree if they haven't accepted ToS
 *
 * Wraps dashboard content. On first login (agreedToTermsAt is null),
 * redirects the user to the /agree page. Once they accept, the timestamp
 * is set and they can access the dashboard normally.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTenant } from '@/components/tenant-provider';

export function AgreementGate({ children }: { children: React.ReactNode }) {
  const { localUser, loading } = useTenant();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading or if user isn't loaded yet
    if (loading || !localUser) return;

    // Skip for kiosk mode pages
    if (pathname?.startsWith('/dashboard/kiosk')) return;

    // If user hasn't agreed to terms, redirect to /agree
    if (!localUser.agreedToTermsAt) {
      router.replace('/agree');
    }
  }, [localUser, loading, router, pathname]);

  // While loading, render children (they'll have their own loading states)
  // If user hasn't agreed, the redirect will happen via useEffect
  return <>{children}</>;
}
