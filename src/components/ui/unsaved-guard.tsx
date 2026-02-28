'use client';

/* ── TASTE: Reassurance about loss ──
   Shows a persistent mini-bar when there are unsaved changes.
   Intercepts navigation with a gentle confirmation.
   Also provides an "auto-saved" indicator for reassurance. */

import { useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Save, CheckCircle2, AlertTriangle } from 'lucide-react';

interface UnsavedGuardProps {
  /** Whether the form has unsaved changes */
  hasChanges: boolean;
  /** Callback to save */
  onSave?: () => void | Promise<void>;
  /** Label for the save action */
  saveLabel?: string;
  /** Show auto-saved state */
  autoSaved?: boolean;
}

export function UnsavedGuard({
  hasChanges,
  onSave,
  saveLabel = 'Save',
  autoSaved = false,
}: UnsavedGuardProps) {
  const [saving, setSaving] = useState(false);

  /* Browser beforeunload — catch tab close / refresh */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      /* Modern browsers ignore custom text but still show prompt */
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const handleSave = useCallback(async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [onSave, saving]);

  if (!hasChanges && !autoSaved) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 flex items-center justify-center px-4 py-2.5 transition-all duration-200',
        hasChanges
          ? 'bg-amber-50 border-t border-amber-200 translate-y-0'
          : 'bg-emerald-50/80 border-t border-emerald-200 translate-y-0',
      )}
    >
      <div className="flex items-center gap-3 text-sm">
        {hasChanges ? (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800 font-medium">Unsaved changes</span>
            {onSave && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : saveLabel}
              </button>
            )}
          </>
        ) : autoSaved ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 font-medium">All changes saved</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
