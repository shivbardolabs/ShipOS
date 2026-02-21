'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { currentUser, dashboardStats } from '@/lib/mock-data';
import { SearchInput } from '@/components/ui/input';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import {
  Bell,
  ChevronRight,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Breadcrumb builder                                                        */
/* -------------------------------------------------------------------------- */
const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  packages: 'Packages',
  'check-in': 'Check-In',
  'check-out': 'Check-Out',
  customers: 'Customers',
  mail: 'Mail',
  shipping: 'Shipping',
  'end-of-day': 'End of Day',
  compliance: 'CMRA Compliance',
  notifications: 'Notifications',
  reports: 'Reports',
  invoicing: 'Invoicing',
  settings: 'Settings',
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  return parts.map((part, i) => ({
    label: labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1),
    href: '/' + parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */
export function Header() {
  const crumbs = useBreadcrumbs();
  const [search, setSearch] = useState('');

  const notifCount = dashboardStats.notificationsSent;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-800 bg-surface-950/80 backdrop-blur-md px-6">
      {/* Left – Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-surface-600" />}
            <span
              className={cn(
                crumb.isLast
                  ? 'font-medium text-surface-200'
                  : 'text-surface-500 hover:text-surface-300 transition-colors'
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Right – search, notifications, user */}
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder="Search packages, customers…"
          className="hidden md:block w-64 lg:w-80"
          value={search}
          onSearch={setSearch}
        />

        {/* Notification bell */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </button>

        {/* User avatar + dropdown */}
        <DropdownMenu
          trigger={
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-violet text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-primary-500/40 transition-all">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
          }
          items={[
            {
              id: 'profile',
              label: 'Profile',
              icon: <User className="h-4 w-4" />,
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
            },
            {
              id: 'help',
              label: 'Help & Support',
              icon: <HelpCircle className="h-4 w-4" />,
            },
            'separator',
            {
              id: 'logout',
              label: 'Sign Out',
              icon: <LogOut className="h-4 w-4" />,
              danger: true,
            },
          ]}
        />
      </div>
    </header>
  );
}
