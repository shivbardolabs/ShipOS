'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { customers, packages } from '@/lib/mock-data';
import {
  Search,
  Users,
  Package,
  Zap,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Settings,
  BarChart3,
  Bell,
  Truck,
  Mail,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  UserPlus,
  MailOpen,
  ScanLine,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Fuzzy match — chars in order                                              */
/* -------------------------------------------------------------------------- */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive match bonus
      score += lastIdx === ti - 1 ? 10 : 5;
      // Start-of-word bonus
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-') score += 8;
      lastIdx = ti;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

/* -------------------------------------------------------------------------- */
/*  Search result types                                                       */
/* -------------------------------------------------------------------------- */
interface SearchResult {
  id: string;
  type: 'customer' | 'package' | 'action';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
  shortcut?: string;
}

/* -------------------------------------------------------------------------- */
/*  Actions (pages/features)                                                  */
/* -------------------------------------------------------------------------- */
const actions: SearchResult[] = [
  { id: 'act_dashboard', type: 'action', title: 'Dashboard', subtitle: 'Go to dashboard overview', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard', shortcut: '' },
  { id: 'act_smart_intake', type: 'action', title: 'Smart Intake', subtitle: 'AI-powered package check-in', icon: <Sparkles className="h-4 w-4" />, href: '/dashboard/packages/smart-intake', shortcut: '' },
  { id: 'act_checkin', type: 'action', title: 'Check In', subtitle: 'Check in a new package', icon: <ClipboardCheck className="h-4 w-4" />, href: '/dashboard/check-in', shortcut: '' },
  { id: 'act_checkout', type: 'action', title: 'Check Out', subtitle: 'Release packages to customers', icon: <Package className="h-4 w-4" />, href: '/dashboard/check-out', shortcut: '' },
  { id: 'act_packages', type: 'action', title: 'Packages', subtitle: 'View all packages', icon: <Package className="h-4 w-4" />, href: '/dashboard/packages', shortcut: '' },
  { id: 'act_customers', type: 'action', title: 'Customers', subtitle: 'Manage customer accounts', icon: <Users className="h-4 w-4" />, href: '/dashboard/customers', shortcut: '' },
  { id: 'act_mail', type: 'action', title: 'Mail', subtitle: 'Manage mail pieces', icon: <Mail className="h-4 w-4" />, href: '/dashboard/mail', shortcut: '' },
  { id: 'act_shipping', type: 'action', title: 'Shipping', subtitle: 'Create and manage shipments', icon: <Truck className="h-4 w-4" />, href: '/dashboard/shipping', shortcut: '' },
  { id: 'act_notifications', type: 'action', title: 'Notifications', subtitle: 'View notification history', icon: <Bell className="h-4 w-4" />, href: '/dashboard/notifications', shortcut: '' },
  { id: 'act_reports', type: 'action', title: 'Reports', subtitle: 'Revenue and operations reports', icon: <BarChart3 className="h-4 w-4" />, href: '/dashboard/reports', shortcut: '' },
  { id: 'act_compliance', type: 'action', title: 'CMRA Compliance', subtitle: 'Form 1583 and ID management', icon: <ShieldCheck className="h-4 w-4" />, href: '/dashboard/compliance', shortcut: '' },
  { id: 'act_invoicing', type: 'action', title: 'Invoicing', subtitle: 'Manage invoices and billing', icon: <FileText className="h-4 w-4" />, href: '/dashboard/invoicing', shortcut: '' },
  { id: 'act_eod', type: 'action', title: 'End of Day', subtitle: 'End-of-day reconciliation', icon: <ClipboardCheck className="h-4 w-4" />, href: '/dashboard/end-of-day', shortcut: '' },
  { id: 'act_ai_onboard', type: 'action', title: 'AI Onboard Customer', subtitle: 'Scan ID to create customer profile', icon: <UserPlus className="h-4 w-4" />, href: '/dashboard/customers/ai-onboard', shortcut: '' },
  { id: 'act_ai_mail_sort', type: 'action', title: 'AI Mail Sort', subtitle: 'Snap & route mail to mailboxes', icon: <MailOpen className="h-4 w-4" />, href: '/dashboard/mail/ai-sort', shortcut: '' },
  { id: 'act_ai_audit', type: 'action', title: 'AI Bill Audit', subtitle: 'Find carrier overcharges', icon: <ScanLine className="h-4 w-4" />, href: '/dashboard/reconciliation/ai-audit', shortcut: '' },
  { id: 'act_settings', type: 'action', title: 'Settings', subtitle: 'Store settings and configuration', icon: <Settings className="h-4 w-4" />, href: '/dashboard/settings', shortcut: '' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Build search results
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // Show quick actions when empty
      return actions.slice(0, 6);
    }

    const q = query.trim();
    const scored: { result: SearchResult; score: number }[] = [];

    // Search customers
    for (const c of customers) {
      const targets = [
        `${c.firstName} ${c.lastName}`,
        c.email || '',
        c.pmbNumber,
        c.businessName || '',
      ];

      let bestScore = 0;
      let matched = false;
      for (const t of targets) {
        if (!t) continue;
        const { match, score } = fuzzyMatch(q, t);
        if (match && score > bestScore) {
          bestScore = score;
          matched = true;
        }
      }

      if (matched) {
        scored.push({
          result: {
            id: c.id,
            type: 'customer',
            title: `${c.firstName} ${c.lastName}`,
            subtitle: `${c.pmbNumber}${c.businessName ? ` · ${c.businessName}` : ''} · ${c.packageCount ?? 0} packages`,
            icon: <Users className="h-4 w-4" />,
            href: `/dashboard/customers`,
          },
          score: bestScore,
        });
      }
    }

    // Search packages
    for (const p of packages) {
      const custName = p.customer
        ? `${p.customer.firstName} ${p.customer.lastName}`
        : '';
      const targets = [
        p.trackingNumber || '',
        custName,
        p.carrier,
        p.senderName || '',
      ];

      let bestScore = 0;
      let matched = false;
      for (const t of targets) {
        if (!t) continue;
        const { match, score } = fuzzyMatch(q, t);
        if (match && score > bestScore) {
          bestScore = score;
          matched = true;
        }
      }

      if (matched) {
        const statusLabel = p.status.replace(/_/g, ' ');
        scored.push({
          result: {
            id: p.id,
            type: 'package',
            title: p.trackingNumber || p.id,
            subtitle: `${custName}${p.senderName ? ` · from ${p.senderName}` : ''} · ${statusLabel}`,
            icon: <Package className="h-4 w-4" />,
            href: `/dashboard/packages`,
          },
          score: bestScore,
        });
      }
    }

    // Search actions
    for (const a of actions) {
      const targets = [a.title, a.subtitle];
      let bestScore = 0;
      let matched = false;
      for (const t of targets) {
        const { match, score } = fuzzyMatch(q, t);
        if (match && score > bestScore) {
          bestScore = score;
          matched = true;
        }
      }
      if (matched) {
        scored.push({ result: a, score: bestScore + 2 }); // small action boost
      }
    }

    // Sort by score descending, cap at 12
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((s) => s.result);
  }, [query]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: { type: string; label: string; icon: React.ReactNode; items: SearchResult[] }[] = [];
    const customerResults = results.filter((r) => r.type === 'customer');
    const packageResults = results.filter((r) => r.type === 'package');
    const actionResults = results.filter((r) => r.type === 'action');

    if (actionResults.length) {
      groups.push({
        type: 'action',
        label: query.trim() ? 'Actions' : 'Quick Actions',
        icon: <Zap className="h-3 w-3" />,
        items: actionResults,
      });
    }
    if (customerResults.length) {
      groups.push({
        type: 'customer',
        label: 'Customers',
        icon: <Users className="h-3 w-3" />,
        items: customerResults,
      });
    }
    if (packageResults.length) {
      groups.push({
        type: 'package',
        label: 'Packages',
        icon: <Package className="h-3 w-3" />,
        items: packageResults,
      });
    }
    return groups;
  }, [results, query]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Navigate to selected result
  const selectResult = useCallback(
    (result: SearchResult) => {
      onClose();
      if (result.href) {
        router.push(result.href);
      }
    },
    [onClose, router],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % Math.max(flatResults.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flatResults.length) % Math.max(flatResults.length, 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[activeIndex]) {
            selectResult(flatResults[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatResults, activeIndex, selectResult, onClose],
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-100/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette container */}
      <div
        className="relative w-full max-w-[560px] mx-4 overflow-hidden rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#e2e8f0',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.05)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#e2e8f0' }}>
          <Search className="h-5 w-5 text-surface-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, packages, actions…"
            className="flex-1 bg-transparent text-[15px] text-surface-100 placeholder:text-surface-500 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            className="flex h-6 items-center rounded border px-1.5 text-[11px] font-medium text-surface-500 transition-colors hover:text-surface-300"
            style={{ borderColor: '#cbd5e1' }}
          >
            ESC
          </button>
        </div>

        {/* Results — TASTE: no visible scrollbars */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto overscroll-contain py-2 scrollable">
          {flatResults.length === 0 && query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="h-8 w-8 text-surface-700 mb-3" />
              <p className="text-sm text-surface-400">
                No results for &quot;<span className="text-surface-200">{query}</span>&quot;
              </p>
              <p className="text-xs text-surface-600 mt-1">Try searching by name, PMB, tracking number, or page</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type}>
                {/* Group header */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                  <span className="text-surface-600">{group.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-600">
                    {group.label}
                  </span>
                </div>

                {/* Items */}
                {group.items.map((item) => {
                  const idx = flatIndex++;
                  const isActive = idx === activeIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => selectResult(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-primary-500/10'
                          : 'hover:bg-surface-800/50'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                          isActive
                            ? 'bg-primary-500/20 text-primary-600'
                            : 'bg-surface-800 text-surface-400'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-surface-100' : 'text-surface-300'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-surface-500 truncate">{item.subtitle}</p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <ArrowRight className="h-3.5 w-3.5 text-primary-600" />
                        </div>
                      )}
                      {item.shortcut && (
                        <span
                          className="flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono text-surface-500"
                          style={{ borderColor: '#e2e8f0' }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 text-[11px] text-surface-600 border-t"
          style={{ borderColor: '#e2e8f0' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              <span>Open</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono text-[10px]">ESC</span>
              <span>Close</span>
            </span>
          </div>
          <span className="text-surface-700">ShipOS</span>
        </div>
      </div>
    </div>
  );
}
