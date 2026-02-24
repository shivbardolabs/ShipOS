'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActivityLogProvider } from '@/components/activity-log-provider';
import { VoiceAssistant } from '@/components/voice-assistant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isKiosk = pathname?.startsWith('/dashboard/kiosk');

  /* Kiosk mode — full-screen, no sidebar or header */
  if (isKiosk) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  return (
    <ActivityLogProvider>
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
    </ActivityLogProvider>
  );
}
