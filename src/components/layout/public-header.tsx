import { ArrowRight, LogIn } from "lucide-react";

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

/**
 * Shared header for all public (unauthenticated) pages.
 * Keeps Pricing / Features / Support nav consistent everywhere.
 */
export function PublicHeader() {
  return (
    <header
      className="relative z-10 px-6 py-4"
      style={{ borderBottom: "1px solid var(--color-surface-700)" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shipos-logo-mark.svg"
            alt="ShipOS"
            width={40}
            height={40}
          />
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold text-surface-100">Ship</span>
              <span className="text-xl font-bold text-primary-500">OS</span>
            </div>
            <p className="text-xs text-surface-500">by Bardo Labs</p>
          </div>
        </a>

        {/* Nav links */}
        <div className="flex items-center gap-3">
          <a
            href="/features"
            className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
          >
            Features
          </a>
          <a
            href="/pricing"
            className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
          >
            Pricing
          </a>
          <a
            href="/support"
            className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors"
          >
            Support
          </a>
          <a
            href="/api/auth/login"
            className="px-4 py-2 text-surface-300 hover:text-surface-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </a>
          <a
            href="/api/auth/signup"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
          >
            Sign Up Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
