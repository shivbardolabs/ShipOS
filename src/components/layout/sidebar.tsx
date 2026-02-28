'use client';

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useTenant } from '@/components/tenant-provider';
import { useFlags } from '@/components/feature-flag-provider';
import { usePendingIntakeCount } from '@/hooks/use-pending-intake-count';
import { cn } from '@/lib/utils';
import {
  Package,
  PackagePlus,
  PackageCheck,
  LayoutDashboard,
  Users,
  Mail,
  MailOpen,
  Truck,
  Clock,
  Shield,
  ShieldCheck,
  Bell,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  Scale,
  LogOut,
  Award,
  Activity,
  Sparkles,
  ScanLine,
  UserPlus,
  CalendarClock,
  DollarSign,

  BookOpen,
  Printer,
  Palette,
  Receipt,
  Undo2,
  Crown,
  Tag,
  Building2,
  Wallet,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';
import { roleConfig, type UserRole } from '@/components/ui/role-badge';

/* -------------------------------------------------------------------------- */
/*  Navigation config                                                         */
/* -------------------------------------------------------------------------- */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Only show this nav item for specific roles */
  requiredRole?: string;
  /** Feature flag key — item hidden if flag is disabled */
  flagKey?: string;
  /** Badge key — shows a count badge sourced from useSidebarBadges() */
  badgeKey?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** Only show this entire section for specific roles */
  requiredRole?: string;
}

const navSections: NavSection[] = [
  {
    title: 'PLATFORM',
    requiredRole: 'superadmin',
    items: [
      { label: 'Platform Console', href: '/dashboard/super-admin', icon: ShieldCheck },
    ],
  },
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Package Mgmt', href: '/dashboard/packages', icon: Package, flagKey: 'package-management' },
      { label: 'Smart Intake', href: '/dashboard/packages/smart-intake', icon: Sparkles, flagKey: 'ai-smart-intake', badgeKey: 'pendingIntake' },
      { label: 'Pending Check-In', href: '/dashboard/packages/pending-checkin', icon: ClipboardCheck, flagKey: 'pending-checkin-queue', badgeKey: 'pendingIntake' },
      { label: 'Package Check-In', href: '/dashboard/packages/check-in', icon: PackagePlus, flagKey: 'package-check-in' },
      { label: 'Package Check-Out', href: '/dashboard/packages/check-out', icon: PackageCheck, flagKey: 'package-check-out' },
      { label: 'Return to Sender', href: '/dashboard/packages/rts', icon: Undo2, flagKey: 'rts_workflow' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Customers', href: '/dashboard/customers', icon: Users, flagKey: 'customer-management' },
      { label: 'AI Onboard', href: '/dashboard/customers/ai-onboard', icon: UserPlus, flagKey: 'ai-customer-onboarding' },
      { label: 'Mail', href: '/dashboard/mail', icon: Mail, flagKey: 'mail-management' },
      { label: 'AI Mail Sort', href: '/dashboard/mail/ai-sort', icon: MailOpen, flagKey: 'ai-mail-sort' },
      { label: 'Shipping', href: '/dashboard/shipping', icon: Truck, flagKey: 'shipping' },
      { label: 'Reprint Label', href: '/dashboard/shipping/reprint', icon: Printer, flagKey: 'shipping' },
      { label: 'Carrier Program', href: '/dashboard/carrier-program', icon: Truck, flagKey: 'carrier-program' },
      { label: 'Reconciliation', href: '/dashboard/reconciliation', icon: Scale, flagKey: 'reconciliation' },
      { label: 'AI Bill Audit', href: '/dashboard/reconciliation/ai-audit', icon: ScanLine, flagKey: 'ai-bill-audit' },
      { label: 'End of Day', href: '/dashboard/end-of-day', icon: Clock, flagKey: 'end-of-day' },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'CMRA Compliance', href: '/dashboard/compliance', icon: Shield, flagKey: 'cmra-compliance' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, flagKey: 'notifications' },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: 'Renewals', href: '/dashboard/renewals', icon: CalendarClock, flagKey: 'automated_renewals' },
      { label: 'Loyalty Program', href: '/dashboard/loyalty', icon: Award, flagKey: 'loyalty-program' },
      { label: 'Billing', href: '/dashboard/billing', icon: DollarSign, flagKey: 'billing_dashboard' },
      { label: 'Report Hub', href: '/dashboard/reports', icon: BarChart3, flagKey: 'reports' },
      { label: 'Charge Events', href: '/dashboard/charge-events', icon: Receipt, flagKey: 'charge_events' },
      { label: 'TOS Billing', href: '/dashboard/tos-billing', icon: Wallet, flagKey: 'tos_billing' },
      { label: 'Payment Methods', href: '/dashboard/tos-billing/payment-methods', icon: CreditCard, flagKey: 'tos_billing' },
      { label: 'Invoicing', href: '/dashboard/invoicing', icon: FileText, flagKey: 'invoicing' },
      { label: 'Activity Log', href: '/dashboard/activity-log', icon: Activity, flagKey: 'activity-log' },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Brand Kit', href: '/dashboard/settings/brandkit', icon: Palette },
      { label: 'PMB Plans', href: '/dashboard/settings/pmb-plans', icon: Crown, flagKey: 'pmb_plan_features' },
      { label: 'Promo Codes', href: '/dashboard/settings/promo-codes', icon: Tag, flagKey: 'pmb_plan_features' },
      { label: 'Franchise Pricing', href: '/dashboard/settings/franchise-pricing', icon: Building2, flagKey: 'pmb_plan_features' },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { label: 'Demo & Walkthrough', href: '/dashboard/demo', icon: BookOpen, flagKey: 'demo_mode' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Role Banner — full-width colored bar showing current role                 */
/* -------------------------------------------------------------------------- */
function RoleBanner({ role }: { role: UserRole }) {
  const cfg = roleConfig[role] ?? roleConfig.employee;
  const RoleIcon = cfg.icon;
  return (
    <div
      className="flex items-center justify-center gap-2 py-1.5"
      style={{ background: `linear-gradient(90deg, ${cfg.stripFrom}, ${cfg.stripTo})` }}
    >
      <RoleIcon style={{ height: 14, width: 14, color: '#fff' }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pending Badge — count indicator for nav items (BAR-337)                   */
/* -------------------------------------------------------------------------- */
function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  // Amber for low counts (1-9), red/rose for 10+
  const isUrgent = count >= 10;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none text-white animate-in fade-in duration-200"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
          : 'linear-gradient(135deg, #d97706, #f59e0b)',
        boxShadow: isUrgent
          ? '0 0 8px rgba(225, 29, 72, 0.4)'
          : '0 0 8px rgba(217, 119, 6, 0.3)',
      }}
    >
      {display}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */
export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useUser();
  const { tenant, localUser } = useTenant();
  const { isEnabled } = useFlags();

  // BAR-337: Pending intake count for sidebar badge
  const badgeEnabled = isEnabled('sidebar_pending_badge');
  const { count: pendingIntakeCount } = usePendingIntakeCount(30_000, badgeEnabled);

  // Map of badgeKey → count (extensible for future badges)
  const badgeCounts: Record<string, number> = {
    pendingIntake: badgeEnabled ? pendingIntakeCount : 0,
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/super-admin') return pathname.startsWith('/dashboard/super-admin');
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

  // Role-dependent styles (computed once, avoids inline lookups)
  const role = localUser?.role as UserRole | undefined;
  const roleCfg = role ? (roleConfig[role] ?? roleConfig.employee) : null;

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
          <p className="text-[10px] text-surface-500 mt-0.5 truncate">
            {tenant?.name || 'Postal Management'}
          </p>
        </div>
        {/* Mobile close */}
        <button
          className="lg:hidden text-surface-400 hover:text-surface-200"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav sections — TASTE: scrollable with hidden scrollbar */}
      <nav className="flex-1 overflow-y-auto scrollable px-3 py-4 space-y-6">
        {navSections
          .filter((section) => !section.requiredRole || role === section.requiredRole)
          .map((section) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.requiredRole || role === item.requiredRole) &&
                (!item.flagKey || isEnabled(item.flagKey))
            );
            if (visibleItems.length === 0) return null;

            // Special styling for the PLATFORM section (superadmin)
            const isPlatformSection = section.requiredRole === 'superadmin';

            return (
              <div key={section.title}>
                <p
                  className={cn(
                    'mb-2 px-2 text-[10px] font-bold uppercase tracking-widest',
                    isPlatformSection ? '' : 'text-surface-600'
                  )}
                  style={isPlatformSection ? { color: '#e11d48' } : undefined}
                >
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] ?? 0) : 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                          active
                            ? isPlatformSection ? 'pl-[10px]' : 'nav-active pl-[10px]'
                            : isPlatformSection
                            ? 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10'
                            : 'text-surface-400 hover:text-surface-200'
                        )}
                        style={
                          active && isPlatformSection
                            ? { borderLeft: '3px solid #e11d48', background: 'rgba(225, 29, 72, 0.1)', color: '#fb7185' }
                            : undefined
                        }
                      >
                        <item.icon
                          className={cn(
                            'h-[18px] w-[18px] flex-shrink-0',
                            active && !isPlatformSection && 'text-primary-600'
                          )}
                          style={isPlatformSection ? { color: '#e11d48' } : undefined}
                        />
                        <span className="truncate">{item.label}</span>
                        {badgeCount > 0 && <PendingBadge count={badgeCount} />}
                      </Link>
                    );
                  })}
                </div>
                {isPlatformSection && (
                  <div className="mt-3 mb-1 border-b" style={{ borderColor: 'rgba(225, 29, 72, 0.2)' }} />
                )}
              </div>
            );
          })}
      </nav>

      {/* User info at bottom */}
      <div className="border-t layout-border">
        {isLoading ? (
          <div className="px-4 py-4 flex items-center gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-surface-800" />
            <div className="flex-1">
              <div className="h-3.5 w-24 bg-surface-800 rounded" />
              <div className="h-3 w-16 bg-surface-800 rounded mt-1.5" />
            </div>
          </div>
        ) : user ? (
          <>
            {/* ── Role banner ── */}
            {role && <RoleBanner role={role} />}

            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Avatar with role-colored ring */}
                <div className="relative flex-shrink-0">
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.picture}
                      alt={displayName}
                      className="h-9 w-9 rounded-full object-cover"
                      style={roleCfg ? { boxShadow: `0 0 0 2.5px ${roleCfg.stripFrom}` } : undefined}
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        background: roleCfg
                          ? `linear-gradient(135deg, ${roleCfg.stripFrom}, ${roleCfg.stripTo})`
                          : 'linear-gradient(135deg, #6366f1, #818cf8)',
                        boxShadow: roleCfg
                          ? `0 0 0 2.5px ${roleCfg.stripFrom}40`
                          : undefined,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-surface-500 truncate mt-0.5">
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
            </div>
          </>
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
