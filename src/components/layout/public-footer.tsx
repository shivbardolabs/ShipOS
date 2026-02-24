/**
 * Shared footer for all public (unauthenticated) pages.
 * Includes links to Terms of Service and Privacy Policy.
 */

import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer
      className="relative z-10 px-6 py-4"
      style={{ borderTop: "1px solid var(--color-surface-700)" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-surface-600">
        <span>ShipOS v0.1.0</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-surface-400 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-surface-400 transition-colors">
            Privacy
          </Link>
          <span>
            Built by <span className="text-surface-400">Bardo Labs</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
