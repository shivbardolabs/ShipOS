'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

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
      <div className="min-h-screen bg-[#08081A]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      {/* Main content area – offset by sidebar width on desktop */}
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
