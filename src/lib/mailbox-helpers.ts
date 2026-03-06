/**
 * BAR-424: Shared helpers for mailbox config
 *
 * Used by both size and range API routes for overlap detection and
 * active-mailbox safeguard checks.
 */
import prisma from '@/lib/prisma';

/* ── Types ────────────────────────────────────────────────────────────── */

export interface ActiveMailboxInfo {
  id: string;
  pmbNumber: string;
  firstName: string;
  lastName: string;
  status: string;
}

/* ── Overlap Detection ────────────────────────────────────────────────── */

/**
 * Check if a proposed range overlaps with any existing active range.
 * Optionally exclude a range ID (for update operations).
 */
export async function checkRangeOverlap(
  rangeStart: number,
  rangeEnd: number,
  excludeRangeId?: string,
): Promise<{ overlaps: boolean; conflictLabel?: string; conflictRange?: string }> {
  const allRanges = await prisma.mailboxRange.findMany({
    where: {
      isActive: true,
      ...(excludeRangeId ? { id: { not: excludeRangeId } } : {}),
    },
    include: { size: true },
  });

  for (const existing of allRanges) {
    if (rangeStart <= existing.rangeEnd && existing.rangeStart <= rangeEnd) {
      const label = existing.size
        ? `${existing.size.name} (${existing.rangeStart}–${existing.rangeEnd})`
        : `${existing.label} (${existing.rangeStart}–${existing.rangeEnd})`;
      return { overlaps: true, conflictLabel: label, conflictRange: `${existing.rangeStart}-${existing.rangeEnd}` };
    }
  }

  return { overlaps: false };
}

/* ── Active Mailbox Checks ────────────────────────────────────────────── */

/**
 * Find active mailboxes whose pmbNumber falls within any of a size's ranges.
 */
export async function getActiveMailboxesForSize(sizeId: string): Promise<ActiveMailboxInfo[]> {
  const ranges = await prisma.mailboxRange.findMany({
    where: { sizeId, isActive: true },
  });

  if (ranges.length === 0) return [];

  return getActiveMailboxesInRanges(ranges);
}

/**
 * Find active mailboxes whose pmbNumber falls within a specific range.
 */
export async function getActiveMailboxesForRange(
  rangeStart: number,
  rangeEnd: number,
): Promise<ActiveMailboxInfo[]> {
  return getActiveMailboxesInRanges([{ rangeStart, rangeEnd }]);
}

/**
 * Shared logic: find active physical-platform customers whose parsed PMB number
 * falls within any of the given ranges.
 */
async function getActiveMailboxesInRanges(
  ranges: Array<{ rangeStart: number; rangeEnd: number }>,
): Promise<ActiveMailboxInfo[]> {
  // Fetch all active physical customers
  const customers = await prisma.customer.findMany({
    where: {
      platform: 'physical',
      status: 'active',
    },
    select: {
      id: true,
      pmbNumber: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  // Filter to those whose PMB number falls in any of the given ranges
  const results: ActiveMailboxInfo[] = [];
  for (const customer of customers) {
    const num = parseInt(customer.pmbNumber, 10);
    if (isNaN(num)) continue;

    for (const range of ranges) {
      if (num >= range.rangeStart && num <= range.rangeEnd) {
        results.push({
          id: customer.id,
          pmbNumber: customer.pmbNumber,
          firstName: customer.firstName,
          lastName: customer.lastName,
          status: customer.status,
        });
        break; // Only include each customer once
      }
    }
  }

  return results;
}
