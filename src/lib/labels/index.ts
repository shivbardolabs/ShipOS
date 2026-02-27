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
