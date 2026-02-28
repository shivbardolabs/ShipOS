/**
 * PMB Service Quota tracking — consumption, reset, and overage detection.
 *
 * BAR-307: PMB Plan Features
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type QuotaServiceType =
  | 'mailItems'
  | 'scans'
  | 'storageDays'
  | 'forwarding'
  | 'shredding'
  | 'packages';

export interface QuotaStatus {
  service: QuotaServiceType;
  label: string;
  used: number;
  included: number;
  remaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  overageCount: number;
}

export interface QuotaSnapshot {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  services: QuotaStatus[];
  totalOverageCharge: number;
}

/* ── Quota Calculation ─────────────────────────────────────────────────────── */

const SERVICE_LABELS: Record<QuotaServiceType, string> = {
  mailItems: 'Mail Items',
  scans: 'Scan Pages',
  storageDays: 'Storage Days',
  forwarding: 'Forwarding',
  shredding: 'Shredding',
  packages: 'Packages',
};

/**
 * Calculate quota status for a single service.
 * When included = 0, treat as unlimited.
 */
export function calculateQuotaStatus(
  service: QuotaServiceType,
  used: number,
  included: number,
): QuotaStatus {
  const isUnlimited = included === 0;
  const remaining = isUnlimited ? Infinity : Math.max(0, included - used);
  const percentUsed = isUnlimited
    ? 0
    : included > 0
      ? Math.min(100, Math.round((used / included) * 100))
      : 0;
  const isOverLimit = !isUnlimited && used > included;
  const overageCount = isOverLimit ? used - included : 0;

  return {
    service,
    label: SERVICE_LABELS[service],
    used,
    included,
    remaining: isUnlimited ? -1 : remaining, // -1 = unlimited
    percentUsed,
    isOverLimit,
    overageCount,
  };
}

/**
 * Calculate overage charges for a quota snapshot.
 */
export function calculateOverageCharges(
  quotaStatuses: QuotaStatus[],
  overageRates: Record<string, number>,
): { service: string; overageCount: number; rate: number; charge: number }[] {
  return quotaStatuses
    .filter((s) => s.isOverLimit && s.overageCount > 0)
    .map((s) => {
      const rateKey = `overage${s.service.charAt(0).toUpperCase()}${s.service.slice(1)}Rate`;
      const rate = overageRates[rateKey] ?? 0;
      const charge = Math.round(s.overageCount * rate * 100) / 100;
      return {
        service: s.label,
        overageCount: s.overageCount,
        rate,
        charge,
      };
    });
}

/**
 * Build a full quota snapshot from usage record and plan tier data.
 */
export function buildQuotaSnapshot(
  usage: {
    period: string;
    periodStart: Date;
    periodEnd: Date;
    mailItemsUsed: number;
    scansUsed: number;
    storageDaysUsed: number;
    forwardingUsed: number;
    shreddingUsed: number;
    packagesReceived: number;
    mailItemsIncluded: number;
    scansIncluded: number;
    storageDaysIncluded: number;
    forwardingIncluded: number;
    shreddingIncluded: number;
    packagesIncluded: number;
    overageCharged: number;
  },
): QuotaSnapshot {
  const services: QuotaStatus[] = [
    calculateQuotaStatus('mailItems', usage.mailItemsUsed, usage.mailItemsIncluded),
    calculateQuotaStatus('scans', usage.scansUsed, usage.scansIncluded),
    calculateQuotaStatus('storageDays', usage.storageDaysUsed, usage.storageDaysIncluded),
    calculateQuotaStatus('forwarding', usage.forwardingUsed, usage.forwardingIncluded),
    calculateQuotaStatus('shredding', usage.shreddingUsed, usage.shreddingIncluded),
    calculateQuotaStatus('packages', usage.packagesReceived, usage.packagesIncluded),
  ];

  return {
    period: usage.period,
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
    services,
    totalOverageCharge: usage.overageCharged,
  };
}

/**
 * Get the current billing period string in "YYYY-MM" format.
 */
export function getCurrentPeriod(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if a quota alert threshold has been reached.
 */
export function shouldSendQuotaAlert(
  percentUsed: number,
  alertThreshold: number = 80,
  alreadySent: boolean = false,
): boolean {
  return percentUsed >= alertThreshold && !alreadySent;
}
