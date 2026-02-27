'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Super Admin Navigation                                                    */
/* -------------------------------------------------------------------------- */
const navItems = [
  { label: 'Dashboard', href: '/dashboard/super-admin', icon: LayoutDashboard },
  { label: 'Client Provisioning', href: '/dashboard/super-admin/clients', icon: Building2 },
  { label: 'Super Admin Users', href: '/dashboard/super-admin/users', icon: Users },
  { label: 'Billing & Reporting', href: '/dashboard/super-admin/billing', icon: BarChart3 },
];

/* -------------------------------------------------------------------------- */
/*  Super Admin Layout                                                        */
/* -------------------------------------------------------------------------- */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock super admin session – in production, this would come from auth context
  const adminName = 'Shiven Ramji';

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-surface-800 bg-surface-900 transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 border-b border-surface-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-surface-100">Bardo Labs</p>
            <p className="text-[10px] font-medium tracking-wider text-surface-500 uppercase">
              Super Admin
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-surface-400 hover:text-surface-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard/super-admin'
                  ? pathname === '/dashboard/super-admin'
                  : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer – user info + logout */}
        <div className="border-t border-surface-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold">
              {adminName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-200 truncate">{adminName}</p>
              <p className="text-[10px] text-surface-500">Super Admin</p>
            </div>
            <Link
              href="/api/auth/logout"
              className="text-surface-500 hover:text-red-400 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-surface-800 bg-surface-900/80 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-surface-400 hover:text-surface-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">
              Super Admin Console
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-surface-500 hover:text-surface-300">
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
