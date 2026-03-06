'use client';

/**
 * BAR-185 — Demo Mode Badge
 *
 * Renders a prominent "DEMO MODE" indicator on payment/billing screens
 * when the system is running in demo payment mode (PAYMENT_MODE=demo).
 *
 * Usage:
 *   <DemoModeBadge />                    — inline badge
 *   <DemoModeBadge variant="banner" />   — full-width banner
 */

import { AlertTriangle } from 'lucide-react';

/* ── Detect demo mode on the client ────────────────────────────────────────── */

function useIsDemoMode(): boolean {
  // NEXT_PUBLIC_ env vars are inlined at build time
  const explicit = process.env.NEXT_PUBLIC_PAYMENT_MODE?.toLowerCase();
  if (explicit === 'live') return false;
  if (explicit === 'demo') return true;
  // Default: demo mode (Stripe not configured)
  return true;
}

/* ── Badge Variants ─────────────────────────────────────────────────────────── */

interface DemoModeBadgeProps {
  /** "badge" = compact inline, "banner" = full-width info bar */
  variant?: 'badge' | 'banner';
  className?: string;
}

export function DemoModeBadge({ variant = 'badge', className = '' }: DemoModeBadgeProps) {
  const isDemo = useIsDemoMode();
  if (!isDemo) return null;

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200 ${className}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <span>
          <strong>DEMO MODE</strong> — Payments are simulated. No real charges will be processed.
          Use card <code className="rounded bg-amber-500/20 px-1 py-0.5 text-xs font-mono">0000 0000 0000 0000</code> for testing.
        </span>
      </div>
    );
  }

  // Inline badge variant
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300 ${className}`}
    >
      <AlertTriangle className="h-3 w-3" />
      Demo Mode
    </span>
  );
}
