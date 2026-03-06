'use client';

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useUser } from '@auth0/nextjs-auth0/client';
import { useTenant } from '@/components/tenant-provider';
import { RoleBadge, RoleCard, type UserRole } from '@/components/ui/role-badge';
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const { localUser } = useTenant();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-surface-800 rounded" />
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-surface-800" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-surface-800 rounded" />
              <div className="h-4 w-56 bg-surface-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">My Profile</h1>
        <p className="text-sm text-surface-500 mt-1">
          Your account information from Auth0
        </p>
      </div>

      {/* Profile card */}
      <div className="glass-card p-8">
        {/* Avatar + name section */}
        <div className="flex items-center gap-6 mb-8 pb-8" style={{ borderBottom: '1px solid var(--color-surface-700)' }}>
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-50"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-400 text-2xl font-bold text-white ring-4 ring-primary-50">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-surface-100">
                {displayName}
              </h2>
              {localUser?.role && (
                <RoleBadge role={localUser.role as UserRole} size="sm" showIcon />
              )}
            </div>
            <p className="text-sm text-surface-500">{user.email}</p>
            {user.email_verified && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-status-success-50 text-status-success-700 border border-status-success-200">
                <Shield className="h-3 w-3" />
                Email verified
              </span>
            )}
          </div>
        </div>

        {/* Account details */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
              <User className="h-5 w-5 text-surface-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Full Name
              </p>
              <p className="text-sm text-surface-200 mt-0.5">
                {user.name || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
              <Mail className="h-5 w-5 text-surface-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Email Address
              </p>
              <p className="text-sm text-surface-200 mt-0.5">
                {user.email || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
              <Calendar className="h-5 w-5 text-surface-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Last Updated
              </p>
              <p className="text-sm text-surface-200 mt-0.5">
                {user.updated_at
                  ? new Date(user.updated_at as string).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800">
              <Shield className="h-5 w-5 text-surface-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Auth Provider
              </p>
              <p className="text-sm text-surface-200 mt-0.5">
                {user.sub?.startsWith('auth0|') ? 'Email / Password' :
                 user.sub?.startsWith('google-oauth2|') ? 'Google' :
                 user.sub?.startsWith('github|') ? 'GitHub' :
                 'Auth0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Permissions card */}
      {localUser?.role && (
        <RoleCard role={localUser.role as UserRole} />
      )}

      {/* Sign out section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-surface-200">Sign Out</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              End your session and return to the homepage
            </p>
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-status-error-600 hover:bg-status-error-50 border border-status-error-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
