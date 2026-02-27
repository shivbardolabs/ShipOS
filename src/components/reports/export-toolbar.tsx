'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportFormats, type ExportFormat } from '@/lib/report-utils';
import { Download, Check } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ExportToolbarProps {
  /** Report name used for the generated filename */
  reportName: string;
  /** Callback when export is triggered — returns a promise for loading state */
  onExport?: (format: ExportFormat) => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function ExportToolbar({ reportName, onExport }: ExportToolbarProps) {
  const [exported, setExported] = useState<ExportFormat | null>(null);

  const handleExport = (format: ExportFormat) => {
    onExport?.(format);
    setExported(format);
    // Generate filename and simulate download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${reportName.replace(/\s+/g, '_')}_${timestamp}.${format}`;
    // In a real implementation, this would trigger a file download
    // For now we just show a confirmation
    void filename;
    setTimeout(() => setExported(null), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {exportFormats.map((fmt) => (
        <Button
          key={fmt.id}
          variant="secondary"
          size="sm"
          onClick={() => handleExport(fmt.id)}
          leftIcon={
            exported === fmt.id ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )
          }
        >
          {fmt.label}
        </Button>
      ))}
    </div>
  );
}
