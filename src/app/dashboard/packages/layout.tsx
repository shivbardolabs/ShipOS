'use client';
/* eslint-disable */

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ListChecks,
  Bell,
  Clock,
  BarChart3,
  FileText,
  Settings,
  Undo2,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/* ── Tab Definitions ────────────────────────────────────────────────────── */

interface PackageTab {
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
  shortcut: string; // Keyboard shortcut
  shortcutLabel: string;
}

const PACKAGE_TABS: PackageTab[] = [
  {
    id: 'management',
    label: 'Management',
    icon: <Package className="h-3.5 w-3.5" />,
    href: '/dashboard/packages',
    shortcut: '1',
    shortcutLabel: '⌘1',
  },
  {
    id: 'check-out',
    label: 'Check Out',
    icon: <ArrowUpFromLine className="h-3.5 w-3.5" />,
    href: '/dashboard/packages/check-out',
    shortcut: '2',
    shortcutLabel: '⌘2',
  },
  {
    id: 'check-in',
    label: 'Check In',
    icon: <ArrowDownToLine className="h-3.5 w-3.5" />,
    href: '/dashboard/packages/check-in',
    shortcut: '3',
    shortcutLabel: '⌘3',
  },
  {
    id: 'smart-intake',
    label: 'Smart Intake',
    icon: <Zap className="h-3.5 w-3.5" />,
    href: '/dashboard/packages/smart-intake',
    shortcut: '4',
    shortcutLabel: '⌘4',
  },
  {
    id: 'pending-checkin',
    label: 'Pending Review',
    icon: <ListChecks className="h-3.5 w-3.5" />,
    href: '/dashboard/packages/pending-checkin',
    shortcut: '5',
    shortcutLabel: '⌘5',
  },
  {
    id: 'rts',
    label: 'Return to Sender',
    icon: <Undo2 className="h-3.5 w-3.5" />,
    href: '/dashboard/packages/rts',
    shortcut: '6',
    shortcutLabel: '⌘6',
  },
];

/* ── Tab Item ──────────────────────────────────────────────────────────── */

function TabItem({ tab, active, onClick }: { tab: PackageTab; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
        'hover:bg-surface-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
        active
          ? 'bg-surface-800/80 text-primary-400 shadow-sm'
          : 'text-surface-400 hover:text-surface-200'
      )}
      title={`${tab.label} (${tab.shortcutLabel})`}
    >
      <span className={cn(
        'transition-colors',
        active ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'
      )}>
        {tab.icon}
      </span>
      <span className="hidden sm:inline">{tab.label}</span>
      <span className={cn(
        'hidden lg:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded',
        active
          ? 'bg-primary-500/10 text-primary-400/70'
          : 'bg-surface-800/50 text-surface-600 group-hover:text-surface-400'
      )}>
        {tab.shortcutLabel}
      </span>
    </button>
  );
}

/* ── Layout Component ──────────────────────────────────────────────────── */

export default function PackagesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from pathname
  const activeTab = PACKAGE_TABS.find((tab) => {
    if (tab.href === '/dashboard/packages') {
      return pathname === '/dashboard/packages';
    }
    return pathname.startsWith(tab.href);
  })?.id || 'management';

  // Keyboard shortcuts (Cmd/Ctrl + number)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.metaKey && !e.ctrlKey) return;
    const tab = PACKAGE_TABS.find((t) => t.shortcut === e.key);
    if (tab) {
      e.preventDefault();
      router.push(tab.href);
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-4">
      {/* Tab Navigation Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-900/50 border border-surface-800/60 overflow-x-auto no-scrollbar">
        {PACKAGE_TABS.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => router.push(tab.href)}
          />
        ))}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
