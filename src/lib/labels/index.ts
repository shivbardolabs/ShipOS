/**
 * BAR-251: Package Label Generation & Printing Service
 *
 * Shared label service — generates, previews, and provides print-ready HTML
 * for all label types across ShipOS workflows.
 */

export {
  renderPackageLabel,
  renderRTSLabel,
  renderContactLabel,
  renderSignatureTag,
} from './templates';

export type {
  PackageLabelData,
  RTSLabelData,
  ContactLabelData,
  SignatureTagData,
} from './templates';

export type LabelTemplate = 'package' | 'rts' | 'contact' | 'signature';

/**
 * Get the print dimensions for a given label template.
 * Used by the print preview and printer drivers.
 */
export function getLabelDimensions(template: LabelTemplate): {
  width: string;
  height: string;
} {
  switch (template) {
    case 'package':
    case 'rts':
    case 'contact':
      return { width: '4in', height: '6in' };
    case 'signature':
      return { width: '4in', height: '2in' };
    default:
      return { width: '4in', height: '6in' };
  }
}

/**
 * Open a print preview window with the rendered label HTML.
 * Works in browser context — triggers the native print dialog.
 */
export function printLabel(html: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to render, then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/**
 * BAR-386: Record label print(s) against the default printer's roll counter.
 *
 * Best-effort tracking — fires and forgets so it never blocks the print flow.
 * If no default printer is configured, silently skips.
 *
 * @param count Number of labels printed (default 1)
 * @param printerId Optional specific printer ID (uses default if omitted)
 * @returns The API response with updated roll status, or null
 */
export async function recordLabelPrint(
  count: number = 1,
  printerId?: string
): Promise<{ remaining: number; isLow: boolean } | null> {
  try {
    // If no specific printer, find the default
    let resolvedPrinterId = printerId;
    if (!resolvedPrinterId) {
      const res = await fetch('/api/settings/printer');
      if (!res.ok) return null;
      const data = await res.json();
      const printers = data.printers || [];
      const defaultPrinter =
        printers.find((p: { isDefault: boolean }) => p.isDefault) ||
        printers[0];
      if (!defaultPrinter) return null;
      resolvedPrinterId = defaultPrinter.id;
    }

    const res = await fetch('/api/settings/printer/roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: resolvedPrinterId,
        action: 'increment',
        count,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
