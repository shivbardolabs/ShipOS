'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { currentUser } from '@/lib/mock-data';
import {
  Package,
  PackagePlus,
  PackageCheck,
  LayoutDashboard,
  Users,
  Mail,
  Truck,
  Clock,
  Shield,
  Bell,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  Scale,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Navigation config                                                         */
/* -------------------------------------------------------------------------- */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Package Mgmt', href: '/dashboard/packages', icon: Package },
      { label: 'Package Check-In', href: '/dashboard/packages/check-in', icon: PackagePlus },
      { label: 'Package Check-Out', href: '/dashboard/packages/check-out', icon: PackageCheck },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Customers', href: '/dashboard/customers', icon: Users },
      { label: 'Mail', href: '/dashboard/mail', icon: Mail },
      { label: 'Shipping', href: '/dashboard/shipping', icon: Truck },
      { label: 'Reconciliation', href: '/dashboard/reconciliation', icon: Scale },
      { label: 'End of Day', href: '/dashboard/end-of-day', icon: Clock },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'CMRA Compliance', href: '/dashboard/compliance', icon: Shield },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
      { label: 'Invoicing', href: '/dashboard/invoicing', icon: FileText },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */
export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const roleColor =
    currentUser.role === 'admin'
      ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
      : currentUser.role === 'manager'
      ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/30'
      : 'bg-surface-600/20 text-surface-400 border-surface-600/40';

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(192, 198, 212, 0.07)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/shipos-logo-mark.svg"
          alt="ShipOS"
          width={36}
          height={36}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold text-surface-100 leading-none">Ship</span>
            <span className="text-base font-bold text-primary-500 leading-none">OS</span>
          </div>
          <p className="text-[10px] text-surface-500 mt-0.5">Postal Management</p>
        </div>
        {/* Mobile close */}
        <button
          className="lg:hidden text-surface-400 hover:text-surface-200"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-surface-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      active
                        ? 'nav-active pl-[10px]'
                        : 'text-surface-400 hover:text-surface-200'
                    )}
                    style={!active ? { } : undefined}
                  >
                    <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-primary-400')} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(192, 198, 212, 0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-400 text-xs font-bold text-white">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">
              {currentUser.name}
            </p>
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border',
                roleColor
              )}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border text-surface-300 hover:text-white"
        style={{ background: '#121330', borderColor: 'rgba(192, 198, 212, 0.07)' }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: '#0e0f26', borderRight: '1px solid rgba(192, 198, 212, 0.07)' }}
      >
        {navContent}
      </aside>

      {/* Sidebar – desktop */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col"
        style={{ background: '#0e0f26', borderRight: '1px solid rgba(192, 198, 212, 0.07)' }}
      >
        {navContent}
      </aside>
    </>
  );
}
