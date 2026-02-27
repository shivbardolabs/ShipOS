// Checkout module — barrel exports
export {
  calculateFees,
  buildLineItems,
  countDays,
  DEFAULT_FEE_CONFIG,
} from './fees';
export type {
  FeeConfig,
  PackageForFees,
  PackageFeeBreakdown,
  FeeCalculationResult,
  LineItem,
} from './fees';

export { renderReceipt, buildReceiptData } from './receipt';
export type { ReceiptData } from './receipt';
