/**
 * Shared footer for all public (unauthenticated) pages.
 */
export function PublicFooter() {
  return (
    <footer
      className="relative z-10 px-6 py-4"
      style={{ borderTop: "1px solid var(--color-surface-700)" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-surface-600">
        <span>ShipOS v0.1.0</span>
        <span>
          Built by <span className="text-surface-400">Bardo Labs</span>
        </span>
      </div>
    </footer>
  );
}
