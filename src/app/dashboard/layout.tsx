'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActivityLogProvider } from '@/components/activity-log-provider';
import { PrintQueueProvider } from '@/components/packages/print-queue-provider';
import { VoiceAssistant } from '@/components/voice-assistant';
import { AgreementGate } from '@/components/agreement-gate';
import { TenantStatusGate } from '@/components/tenant-status-gate';
import { OfflineGate } from '@/components/offline-gate';

/**
 * BAR-348: Detect when a page is restored from the browser's back-forward
 * cache (BF cache) and validate the session. After logout, a BF-cached page
 * skips all server middleware, so we must check auth client-side.
 */
function useBackForwardCacheGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page restored from BF cache — validate session
        fetch('/api/auth/me', { credentials: 'include' })
          .then((res) => {
            if (!res.ok) {
              window.location.href = '/api/auth/login';
            }
          })
          .catch(() => {
            window.location.href = '/api/auth/login';
          });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useBackForwardCacheGuard();
  const isKiosk = pathname?.startsWith('/dashboard/kiosk');
  const isSuperAdmin = pathname?.startsWith('/dashboard/super-admin');

  /* Kiosk mode — full-screen, no sidebar or header */
  if (isKiosk) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  /* Super-admin / Platform Console — has its own layout with dedicated sidebar */
  if (isSuperAdmin) {
    return (
      <ActivityLogProvider>
        <div className="min-h-screen bg-surface-950">
          {children}
        </div>
      </ActivityLogProvider>
    );
  }

  return (
    <AgreementGate>
      <TenantStatusGate>
        <ActivityLogProvider>
          <PrintQueueProvider>
            <OfflineGate>
              <div className="min-h-screen bg-surface-950">
                <Sidebar />

                {/* Main content area – offset by sidebar width on desktop */}
                <div className="lg:pl-[260px] flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1 p-6 pb-24">{children}</main>
                </div>

                {/* Voice assistant — floating on all dashboard pages */}
                <VoiceAssistant />
              </div>
            </OfflineGate>
          </PrintQueueProvider>
        </ActivityLogProvider>
      </TenantStatusGate>
    </AgreementGate>
  );
}
