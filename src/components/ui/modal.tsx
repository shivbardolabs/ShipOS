'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  /** Disable closing when clicking the overlay */
  persistent?: boolean;
}

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  persistent = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-0 backdrop:bg-transparent"
      onClose={onClose}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-surface-100/60 backdrop-blur-sm"
        onClick={persistent ? undefined : onClose}
      />

      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full rounded-xl border border-surface-700 bg-surface-900 shadow-2xl shadow-slate-200/40',
            sizeMap[size],
            'animate-in fade-in-0 zoom-in-95'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || true) && (
            <div className="flex items-start justify-between border-b border-surface-700 px-6 py-4">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-surface-100">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-surface-400">{description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                className="text-surface-400 hover:text-surface-200 -mr-1 -mt-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-surface-700 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

export type { ModalProps, ModalSize };
