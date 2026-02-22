'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { dashboardStats } from '@/lib/mock-data';
import {
  LayoutDashboard,
  PackagePlus,
  PackageCheck,
  Users,
  MoreHorizontal,
  X,
  Mail,
  Truck,
  Clock,
  Shield,
  Bell,
  BarChart3,
  FileText,
  Settings,
  Package,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Primary nav items (visible in bottom bar)                                 */
/* -------------------------------------------------------------------------- */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const primaryNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Check In', href: '/dashboard/packages/check-in', icon: PackagePlus },
  {
    label: 'Check Out',
    href: '/dashboard/packages/check-out',
    icon: PackageCheck,
    badge: dashboardStats.packagesHeld,
  },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
];

/* -------------------------------------------------------------------------- */
/*  Overflow/drawer items                                                     */
/* -------------------------------------------------------------------------- */
const overflowNav: NavItem[] = [
  { label: 'Package Mgmt', href: '/dashboard/packages', icon: Package },
  { label: 'Mail', href: '/dashboard/mail', icon: Mail },
  { label: 'Shipping', href: '/dashboard/shipping', icon: Truck },
  { label: 'End of Day', href: '/dashboard/end-of-day', icon: Clock },
  { label: 'Compliance', href: '/dashboard/compliance', icon: Shield },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Invoicing', href: '/dashboard/invoicing', icon: FileText },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

/* -------------------------------------------------------------------------- */
/*  BottomNav                                                                 */
/* -------------------------------------------------------------------------- */
export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  /* Is any overflow item active? */
  const moreActive = overflowNav.some((item) => isActive(item.href));

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-surface-100/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More Drawer — slides up from bottom */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-[70] lg:hidden transition-transform duration-300 ease-out',
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div
          className="mx-2 mb-[calc(64px+env(safe-area-inset-bottom,0px)+8px)] rounded-2xl overflow-hidden layout-drawer"
        >
          {/* Drawer header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--color-surface-700)' }}
          >
            <span className="text-sm font-semibold text-surface-200">
              More
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer items */}
          <div className="px-3 py-3 grid grid-cols-3 gap-2">
            {overflowNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 transition-all duration-150',
                    active
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar — hidden on lg+ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[55] lg:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex h-16 items-center justify-around layout-bottomnav">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 transition-colors duration-150',
                  active ? 'text-primary-600' : 'text-surface-500 active:text-surface-300'
                )}
              >
                {/* Active pill indicator */}
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary-500" />
                )}

                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" />
                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>

                <span className="text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 transition-colors duration-150',
              moreActive || drawerOpen
                ? 'text-primary-600'
                : 'text-surface-500 active:text-surface-300'
            )}
          >
            {(moreActive || drawerOpen) && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary-500" />
            )}
            <MoreHorizontal className="h-[22px] w-[22px]" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
