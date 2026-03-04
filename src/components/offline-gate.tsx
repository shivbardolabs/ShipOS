'use client';

/**
 * BAR-204: Conditional wrapper that activates the OfflineProvider
 * only when the `offline_mode` feature flag is enabled.
 *
 * When the flag is off the children render without the service worker,
 * mutation queue, or offline banner — zero overhead.
 */

import { type ReactNode } from 'react';
import { useFlags } from '@/components/feature-flag-provider';
import { OfflineProvider } from '@/components/offline-provider';

export function OfflineGate({ children }: { children: ReactNode }) {
  const { isEnabled } = useFlags();

  if (isEnabled('offline_mode')) {
    return <OfflineProvider>{children}</OfflineProvider>;
  }

  return <>{children}</>;
}
