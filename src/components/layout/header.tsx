'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { cn } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { CommandPalette } from '@/components/ui/command-palette';
import { OnlineStatus } from '@/components/ui/online-status';
import { NotificationPanel } from '@/components/layout/notification-panel';
import {
  ChevronRight,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { useTenant } from '@/components/tenant-provider';
import { RoleBadge, RoleStrip, roleConfig, type UserRole } from '@/components/ui/role-badge';

/* -------------------------------------------------------------------------- */
/*  Breadcrumb builder                                                        */
/* -------------------------------------------------------------------------- */
const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  admin: 'Master Admin',
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
  profile: 'Profile',
  reconciliation: 'Reconciliation',
  changelog: 'Changelog',
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
/*  Inline role pill — uses inline styles for guaranteed rendering            */
/* -------------------------------------------------------------------------- */
function HeaderRolePill({ role }: { role: UserRole }) {
  const cfg = roleConfig[role];
  const RoleIcon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: cfg.stripFrom,
        background: `${cfg.stripFrom}15`,
        border: `1.5px solid ${cfg.stripFrom}35`,
      }}
    >
      <RoleIcon style={{ height: 14, width: 14 }} />
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */
export function Header() {
  const crumbs = useBreadcrumbs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, isLoading } = useUser();
  const { localUser } = useTenant();

  // Derive initials from Auth0 user
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Global Cmd+K / Ctrl+K shortcut
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const role = localUser?.role as UserRole | undefined;
  const roleCfg = role ? roleConfig[role] : null;

  return (
    <>
      {/* Role color strip */}
      {role && (
        <div className="sticky top-0" style={{ zIndex: 21 }}>
          <RoleStrip role={role} />
        </div>
      )}

      <header
        className="sticky top-[3px] z-20 flex h-16 items-center justify-between px-6 layout-header"
      >
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

        {/* Right – search trigger, online status, notifications, user */}
        <div className="flex items-center gap-3">
          {/* Search trigger — opens command palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 w-64 lg:w-80 rounded-lg border bg-surface-900 px-3.5 py-2 text-sm text-surface-500 transition-colors hover:border-surface-600 hover:text-surface-400 cursor-pointer"
            style={{ borderColor: 'var(--color-surface-700)' }}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Search packages, customers…</span>
            <span
              className="flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium text-surface-600"
              style={{ borderColor: 'var(--color-surface-700)' }}
            >
              ⌘K
            </span>
          </button>

          {/* What's New — Changelog link */}
          <Link
            href="/dashboard/changelog"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 hover:bg-primary-100 hover:border-primary-300 transition-all duration-150"
          >
            <Sparkles className="h-3.5 w-3.5" />
            What&apos;s New
          </Link>

          {/* Online status */}
          <OnlineStatus />

          {/* Notification bell + dropdown panel */}
          <NotificationPanel />

          {/* Role badge — persistent indicator next to user */}
          {role && <HeaderRolePill role={role} />}

          {/* User avatar + dropdown */}
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-surface-800 animate-pulse" />
          ) : (
            <DropdownMenu
              trigger={
                <div className="relative">
                  {user?.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.picture}
                      alt={displayName}
                      className="h-9 w-9 rounded-full object-cover cursor-pointer hover:ring-2 transition-all"
                      style={roleCfg ? { boxShadow: `0 0 0 2px ${roleCfg.stripFrom}60` } : undefined}
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white cursor-pointer hover:ring-2 transition-all"
                      style={{
                        background: roleCfg
                          ? `linear-gradient(135deg, ${roleCfg.stripFrom}, ${roleCfg.stripTo})`
                          : 'linear-gradient(135deg, #6366f1, #818cf8)',
                      }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              }
              header={
                role ? (
                  <div className="px-3 py-2.5 border-b border-surface-700">
                    <p className="text-sm font-medium text-surface-200 truncate">{displayName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={role} size="xs" showIcon />
                      <span className="text-[11px] text-surface-500 truncate">{user?.email}</span>
                    </div>
                  </div>
                ) : undefined
              }
              items={[
                {
                  id: 'profile',
                  label: 'Profile',
                  icon: <User className="h-4 w-4" />,
                  onClick: () => { window.location.href = '/dashboard/profile'; },
                },
                {
                  id: 'settings',
                  label: 'Settings',
                  icon: <Settings className="h-4 w-4" />,
                  onClick: () => { window.location.href = '/dashboard/settings'; },
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
                  onClick: () => { window.location.href = '/api/auth/logout'; },
                },
              ]}
            />
          )}
        </div>
      </header>

      {/* Command Palette overlay */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
