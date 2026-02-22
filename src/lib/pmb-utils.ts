/**
 * PMB (Private Mailbox) utilities
 * Handles box availability, range management, and 90-day hold logic
 */

import type { MailboxRange, MailboxSlot, MailboxPlatform, Customer } from './types';

/** Default mailbox ranges — configurable per store in Settings */
export const DEFAULT_MAILBOX_RANGES: MailboxRange[] = [
  { id: 'range_1', platform: 'physical', label: 'Store (Physical)', rangeStart: 1, rangeEnd: 550, isActive: true },
  { id: 'range_2', platform: 'anytime', label: 'Anytime Mailbox', rangeStart: 700, rangeEnd: 999, isActive: true },
  { id: 'range_3', platform: 'iPostal', label: 'iPostal1', rangeStart: 1000, rangeEnd: 1200, isActive: true },
  { id: 'range_4', platform: 'postscan', label: 'PostScan Mail', rangeStart: 2000, rangeEnd: 2999, isActive: true },
];

/** 90-day hold period for recently closed boxes (in ms) */
const HOLD_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Given a list of mailbox ranges and current customers,
 * compute all available PMB slots.
 */
export function getAvailableBoxes(
  ranges: MailboxRange[],
  customers: Customer[],
  platform?: MailboxPlatform
): MailboxSlot[] {
  const now = new Date();
  const activeRanges = platform
    ? ranges.filter((r) => r.isActive && r.platform === platform)
    : ranges.filter((r) => r.isActive);

  // Build a map of rented/held boxes
  const rentedMap = new Map<number, { customerId: string; customerName: string; status: 'rented' | 'held'; closedDate?: string }>();

  for (const customer of customers) {
    const boxNum = parsePmbNumber(customer.pmbNumber);
    if (boxNum === null) continue;

    if (customer.status === 'active' || customer.status === 'suspended') {
      rentedMap.set(boxNum, {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        status: 'rented',
      });
    } else if (customer.status === 'closed' && customer.dateClosed) {
      const closedDate = new Date(customer.dateClosed);
      const holdExpires = new Date(closedDate.getTime() + HOLD_PERIOD_MS);
      if (now < holdExpires) {
        rentedMap.set(boxNum, {
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          status: 'held',
          closedDate: customer.dateClosed,
        });
      }
    }
  }

  const slots: MailboxSlot[] = [];

  for (const range of activeRanges) {
    for (let num = range.rangeStart; num <= range.rangeEnd; num++) {
      const rented = rentedMap.get(num);
      slots.push({
        number: num,
        platform: range.platform,
        status: rented ? rented.status : 'available',
        customerId: rented?.customerId,
        customerName: rented?.customerName,
        closedDate: rented?.closedDate,
      });
    }
  }

  return slots;
}

/**
 * Get only available (unrented, not held) boxes, optionally filtered by platform
 */
export function getAvailableBoxNumbers(
  ranges: MailboxRange[],
  customers: Customer[],
  platform?: MailboxPlatform
): { number: number; platform: MailboxPlatform; label: string }[] {
  const slots = getAvailableBoxes(ranges, customers, platform);
  return slots
    .filter((s) => s.status === 'available')
    .map((s) => ({
      number: s.number,
      platform: s.platform,
      label: formatPmbNumber(s.number),
    }));
}

/**
 * Compute stats for each range (total, rented, available, held)
 */
export function getRangeStats(ranges: MailboxRange[], customers: Customer[]) {
  return ranges.filter((r) => r.isActive).map((range) => {
    const slots = getAvailableBoxes([range], customers);
    const total = slots.length;
    const rented = slots.filter((s) => s.status === 'rented').length;
    const held = slots.filter((s) => s.status === 'held').length;
    const available = total - rented - held;
    return { ...range, total, rented, held, available };
  });
}

/** Parse "PMB-0001" or "PMB 1" or just "1" → 1 */
export function parsePmbNumber(pmb: string): number | null {
  const match = pmb.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Format a box number as PMB string */
export function formatPmbNumber(num: number): string {
  return `PMB ${num}`;
}

/** Find which platform a box number belongs to */
export function getPlatformForBox(num: number, ranges: MailboxRange[]): MailboxPlatform | null {
  for (const range of ranges) {
    if (range.isActive && num >= range.rangeStart && num <= range.rangeEnd) {
      return range.platform;
    }
  }
  return null;
}

/** Validate that a box number is within a valid range and available */
export function validateBoxNumber(
  num: number,
  ranges: MailboxRange[],
  customers: Customer[]
): { valid: boolean; error?: string } {
  const platform = getPlatformForBox(num, ranges);
  if (!platform) return { valid: false, error: 'Box number is not within any configured range' };

  const slots = getAvailableBoxes(ranges, customers, platform);
  const slot = slots.find((s) => s.number === num);
  if (!slot) return { valid: false, error: 'Box not found' };

  if (slot.status === 'rented') {
    return { valid: false, error: `Box is currently rented to ${slot.customerName}` };
  }
  if (slot.status === 'held') {
    return { valid: false, error: 'Box is in 90-day hold period (recently closed)' };
  }

  return { valid: true };
}
