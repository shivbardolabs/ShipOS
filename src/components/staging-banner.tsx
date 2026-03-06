"use client";

/**
 * Floating staging-environment banner + browser-tab prefix.
 *
 * Renders only when NEXT_PUBLIC_ENV === "staging".
 * - Persistent orange strip pinned to the bottom of the viewport
 * - Updates document.title with a [STG] prefix on mount
 */

import { useEffect } from "react";

export function StagingBanner() {
  const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";

  useEffect(() => {
    if (!isStaging) return;
    const original = document.title;
    if (!original.startsWith("[STG]")) {
      document.title = `[STG] ${original}`;
    }
    return () => {
      document.title = original;
    };
  }, [isStaging]);

  if (!isStaging) return null;

  return (
    <div
      role="status"
      aria-label="Staging environment"
      className="fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-status-warning-500 px-3 py-1.5 text-xs font-semibold tracking-wide text-white shadow-lg select-none print:hidden"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/80" />
      STAGING ENVIRONMENT
    </div>
  );
}
