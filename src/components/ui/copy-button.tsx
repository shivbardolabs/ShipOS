'use client';

/* ── TASTE: Copy paste from clipboard ──
   Click-to-copy any value with visual feedback.
   Works for tracking numbers, PMB IDs, emails, etc. */

import { useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  /** The text to write to the clipboard */
  value: string;
  /** Optional label shown next to icon */
  label?: string;
  /** Custom children replace default icon */
  children?: ReactNode;
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function CopyButton({
  value,
  label,
  children,
  className,
  size = 'sm',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* fallback for insecure contexts */
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [value]);

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-compact="true"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md transition-all duration-100 cursor-pointer select-none',
        size === 'sm' ? 'px-1.5 py-1 text-xs' : 'px-2 py-1.5 text-sm',
        copied
          ? 'text-accent-emerald bg-emerald-50'
          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800',
        className,
      )}
      title={copied ? 'Copied!' : `Copy ${label || value}`}
    >
      {children ?? (
        <>
          {copied ? (
            <Check className={iconSize} />
          ) : (
            <Copy className={iconSize} />
          )}
          {label && <span>{copied ? 'Copied' : label}</span>}
        </>
      )}
    </button>
  );
}

/** Inline copyable text — renders text + copy icon on hover */
export function Copyable({
  value,
  children,
  className,
}: {
  value: string;
  children?: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* noop */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <span
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1 cursor-pointer group',
        className,
      )}
      title={copied ? 'Copied!' : 'Click to copy'}
    >
      {children ?? value}
      {copied ? (
        <Check className="h-3 w-3 text-accent-emerald" />
      ) : (
        <Copy className="h-3 w-3 text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
      )}
    </span>
  );
}
