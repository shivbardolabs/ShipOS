'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActivityLogProvider } from '@/components/activity-log-provider';
import { PrintQueueProvider } from '@/components/packages/print-queue-provider';
import { VoiceAssistant } from '@/components/voice-assistant';
import { AgreementGate } from '@/components/agreement-gate';
import { TenantStatusGate } from '@/components/tenant-status-gate';
import { OfflineGate } from '@/components/offline-gate';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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
                  <main className="flex-1 p-6">{children}</main>
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
