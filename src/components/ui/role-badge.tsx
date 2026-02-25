'use client';

import { Shield, ShieldCheck, UserCog, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Role Visual System                                                        */
/*  Superadmin → rose/red (platform owner)                                    */
/*  Admin  → purple/violet   (authority)                                      */
/*  Manager → amber/orange   (oversight)                                      */
/*  Employee → teal/blue     (operations)                                     */
/* -------------------------------------------------------------------------- */

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'employee';

interface RoleConfig {
  label: string;
  icon: React.ElementType;
  /** Light-mode + shared styles */
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  /** Dot / accent color */
  dot: string;
  /** Strip gradient */
  stripFrom: string;
  stripTo: string;
  /** Avatar ring */
  ring: string;
}

export const roleConfig: Record<UserRole, RoleConfig> = {
  superadmin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    badgeBg: 'bg-rose-50 dark:bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-200 dark:border-rose-500/25',
    dot: 'bg-rose-500',
    stripFrom: '#e11d48',
    stripTo: '#f43f5e',
    ring: 'ring-rose-400/40',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    badgeBg: 'bg-violet-50 dark:bg-violet-500/15',
    badgeText: 'text-violet-700 dark:text-violet-400',
    badgeBorder: 'border-violet-200 dark:border-violet-500/25',
    dot: 'bg-violet-500',
    stripFrom: '#7c3aed',
    stripTo: '#8b5cf6',
    ring: 'ring-violet-400/40',
  },
  manager: {
    label: 'Manager',
    icon: UserCog,
    badgeBg: 'bg-amber-50 dark:bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-200 dark:border-amber-500/25',
    dot: 'bg-amber-500',
    stripFrom: '#d97706',
    stripTo: '#f59e0b',
    ring: 'ring-amber-400/40',
  },
  employee: {
    label: 'Employee',
    icon: UserCheck,
    badgeBg: 'bg-teal-50 dark:bg-teal-500/15',
    badgeText: 'text-teal-700 dark:text-teal-400',
    badgeBorder: 'border-teal-200 dark:border-teal-500/25',
    dot: 'bg-teal-500',
    stripFrom: '#0891b2',
    stripTo: '#06b6d4',
    ring: 'ring-teal-400/40',
  },
};

/* -------------------------------------------------------------------------- */
/*  RoleBadge — inline pill with icon                                         */
/* -------------------------------------------------------------------------- */
interface RoleBadgeProps {
  role: UserRole;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = 'sm', showIcon = true, className }: RoleBadgeProps) {
  const cfg = roleConfig[role] ?? roleConfig.employee;
  const Icon = cfg.icon;

  const sizeClasses = {
    xs: 'px-1.5 py-0 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const iconSize = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wider border',
        cfg.badgeBg,
        cfg.badgeText,
        cfg.badgeBorder,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSize[size]} />}
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  RoleDot — tiny colored indicator                                          */
/* -------------------------------------------------------------------------- */
export function RoleDot({ role, className }: { role: UserRole; className?: string }) {
  const cfg = roleConfig[role] ?? roleConfig.employee;
  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', cfg.dot)} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', cfg.dot)} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  RoleStrip — thin gradient bar at top of page                              */
/* -------------------------------------------------------------------------- */
export function RoleStrip({ role }: { role: UserRole }) {
  const cfg = roleConfig[role] ?? roleConfig.employee;
  return (
    <div
      className="h-[3px] w-full flex-shrink-0"
      style={{
        background: `linear-gradient(90deg, ${cfg.stripFrom}, ${cfg.stripTo})`,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  RoleCard — full role display for profile page                             */
/* -------------------------------------------------------------------------- */
const permissionsByRole: Record<UserRole, string[]> = {
  superadmin: [
    'All admin permissions',
    'Master Admin panel — view all users across tenants',
    'View login sessions & activity for all users',
    'Cross-tenant user management',
    'Platform-level configuration',
    'System health monitoring',
  ],
  admin: [
    'Full system access',
    'Manage users & invite team',
    'Configure store settings',
    'View all reports & analytics',
    'Manage carrier rates & billing',
    'CMRA compliance management',
  ],
  manager: [
    'Package & mail management',
    'Customer management',
    'View reports & analytics',
    'Process shipments & invoices',
    'Notification management',
    'End-of-day operations',
  ],
  employee: [
    'Package check-in & check-out',
    'Mail receiving & sorting',
    'Customer lookup',
    'Basic shipping operations',
    'View assigned notifications',
  ],
};

export function RoleCard({ role }: { role: UserRole }) {
  const cfg = roleConfig[role] ?? roleConfig.employee;
  const Icon = cfg.icon;
  const perms = permissionsByRole[role] ?? permissionsByRole.employee;

  return (
    <div className="glass-card overflow-hidden">
      {/* Color strip at top */}
      <div
        className="h-1.5"
        style={{ background: `linear-gradient(90deg, ${cfg.stripFrom}, ${cfg.stripTo})` }}
      />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-5">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              cfg.badgeBg
            )}
          >
            <Icon className={cn('h-6 w-6', cfg.badgeText)} />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
              Current Role
            </p>
            <p className={cn('text-lg font-bold', cfg.badgeText)}>
              {cfg.label}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Permissions
          </p>
          {perms.map((perm) => (
            <div key={perm} className="flex items-center gap-2.5">
              <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} />
              <span className="text-sm text-surface-300">{perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
