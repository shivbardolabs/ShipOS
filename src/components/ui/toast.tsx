'use client';

/* ── TASTE: Minimal, non-blocking feedback ──
   Lightweight toast system. No external deps.
   Use: toast('Copied to clipboard')
        toast('Package checked in', 'success')
        toast('Connection lost', 'error')            */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastVariant, ReactNode> = {
  default: <Info className="h-4 w-4 text-primary-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-accent-emerald" />,
  error: <AlertTriangle className="h-4 w-4 text-accent-rose" />,
  warning: <AlertTriangle className="h-4 w-4 text-accent-amber" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — bottom-center */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg border',
                'animate-in fade-in slide-in-from-bottom-4 duration-200',
                'bg-surface-950 border-surface-700 text-surface-200',
              )}
              style={{ minWidth: 200, maxWidth: 400 }}
            >
              {icons[t.variant]}
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                data-compact="true"
                className="text-surface-500 hover:text-surface-300 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
