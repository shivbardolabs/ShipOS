'use client';

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { cn } from '@/lib/utils';
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
  LogOut,
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
  const { user, isLoading } = useUser();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Derive initials from Auth0 user
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b layout-border">
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
                    <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-primary-600')} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t layout-border">
        {isLoading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-surface-800" />
            <div className="flex-1">
              <div className="h-3.5 w-24 bg-surface-800 rounded" />
              <div className="h-3 w-16 bg-surface-800 rounded mt-1.5" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={displayName}
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-400 text-xs font-bold text-white">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-surface-500 truncate">
                {user.email}
              </p>
            </div>
            <a
              href="/api/auth/logout"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:text-accent-rose hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-950 text-surface-300 hover:text-surface-100"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-100/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 lg:hidden layout-sidebar',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>

      {/* Sidebar – desktop */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col layout-sidebar"
      >
        {navContent}
      </aside>
    </>
  );
}
