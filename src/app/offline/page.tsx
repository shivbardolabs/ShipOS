/**
 * BAR-204: Offline fallback page
 * Shown when the user navigates to a page while offline and it's not cached.
 */

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">You&apos;re Offline</h1>
        <p className="text-surface-600 mb-6">
          ShipOS needs an internet connection for most features.
          Any changes you made while offline will sync automatically when you reconnect.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors"
          >
            Go Back
          </button>
        </div>
        <div className="mt-8 text-sm text-surface-400">
          <p>Cached pages may still be available.</p>
          <a href="/dashboard" className="text-brand-600 hover:underline">
            Try Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
