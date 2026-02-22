'use client';

import { type ReactNode } from 'react';
import { Navbar } from './navbar';
import { Footer } from './footer';

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col relative overflow-hidden">
      {/* Ambient background orbs */}
      <div
        className="pointer-events-none absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
        style={{ background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(100px)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20"
        style={{ background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(80px)' }}
      />

      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
