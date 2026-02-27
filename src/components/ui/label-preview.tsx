'use client';

import { useState, useCallback } from 'react';
import { Button } from './button';
import { Printer, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LabelTemplate } from '@/lib/labels';
import { printLabel, getLabelDimensions } from '@/lib/labels';

/* -------------------------------------------------------------------------- */
/*  BAR-251 + BAR-29 — Label Preview & Print Component                        */
/* -------------------------------------------------------------------------- */

interface LabelPreviewProps {
  /** Which template to render */
  template: LabelTemplate;
  /** Template-specific data */
  data: Record<string, unknown>;
  /** Show preview inline (default: true) */
  showPreview?: boolean;
  className?: string;
}

export function LabelPreview({
  template,
  data,
  showPreview = true,
  className,
}: LabelPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimensions = getLabelDimensions(template);

  const generateLabel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, data }),
      });
      if (!res.ok) throw new Error('Failed to generate label');
      const result = await res.json();
      setHtml(result.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [template, data]);

  const handlePrint = useCallback(() => {
    if (html) {
      printLabel(html);
    }
  }, [html]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        {!html && (
          <Button
            variant="outline"
            size="sm"
            onClick={generateLabel}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            Preview Label
          </Button>
        )}
        {html && (
          <Button variant="default" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print Label
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {showPreview && html && (
        <div
          className="border border-surface-700 rounded-lg overflow-hidden bg-white"
          style={{ width: dimensions.width, maxWidth: '100%' }}
        >
          <iframe
            srcDoc={html}
            title="Label Preview"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              border: 'none',
              transform: 'scale(0.75)',
              transformOrigin: 'top left',
              maxWidth: '100%',
            }}
          />
        </div>
      )}
    </div>
  );
}
