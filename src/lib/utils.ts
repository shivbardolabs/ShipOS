import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generatePMB(num: number): string {
  return `PMB-${String(num).padStart(4, "0")}`;
}

export function generateTrackingNumber(carrier: string): string {
  const prefix: Record<string, string> = {
    ups: "1Z",
    fedex: "7",
    usps: "94",
    dhl: "JD",
    amazon: "TBA",
  };
  const pfx = prefix[carrier.toLowerCase()] || "";
  const rand = Math.random().toString(36).substring(2, 14).toUpperCase();
  return `${pfx}${rand}`;
}

/**
 * Build a carrier tracking URL from carrier name + tracking number.
 * Returns null for unknown carriers.
 */
export function getCarrierTrackingUrl(
  carrier: string,
  trackingNumber: string
): string | null {
  const c = carrier.toLowerCase();
  const urls: Record<string, string> = {
    ups: `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`,
    dhl: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}`,
    amazon: `https://track.amazon.com/tracking/${encodeURIComponent(trackingNumber)}`,
  };
  return urls[c] ?? null;
}

/**
 * Map a notification type to the in-app route the user should land on.
 * Optionally takes the linked entity IDs to build deeper links.
 */
export function getNotificationTargetUrl(
  type: string,
  opts?: { customerId?: string; linkedEntityId?: string }
): string {
  const routes: Record<string, string> = {
    package_arrival: '/dashboard/packages',
    package_reminder: '/dashboard/packages',
    mail_received: '/dashboard/mail',
    id_expiring: opts?.customerId
      ? `/dashboard/customers/${opts.customerId}`
      : '/dashboard/customers',
    renewal_reminder: opts?.customerId
      ? `/dashboard/customers/${opts.customerId}`
      : '/dashboard/customers',
    shipment_update: opts?.customerId
      ? `/dashboard/customers/${opts.customerId}`
      : '/dashboard/notifications',
    welcome: opts?.customerId
      ? `/dashboard/customers/${opts.customerId}`
      : '/dashboard',
  };
  return routes[type] || '/dashboard/notifications';
}

/**
 * Human-friendly label for the notification delivery status.
 * "bounced" specifically means the notification email bounced,
 * NOT that the shipment or package bounced.
 */
export function getNotificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
    bounced: 'Email Bounced',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Package statuses
    checked_in: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    notified: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    ready: "bg-green-500/20 text-green-400 border-green-500/30",
    released: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    returned: "bg-red-500/20 text-red-400 border-red-500/30",
    // Customer statuses
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    // Shipment statuses
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    label_created: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    shipped: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    delivered: "bg-green-500/20 text-green-400 border-green-500/30",
    // Notification statuses
    sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    bounced: "bg-red-500/20 text-red-400 border-red-500/30",
    // Payment
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
    invoiced: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    // 1583 form
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    expired: "bg-red-500/20 text-red-400 border-red-500/30",
    // Reconciliation statuses
    matched: "bg-green-500/20 text-green-400 border-green-500/30",
    overcharge: "bg-red-500/20 text-red-400 border-red-500/30",
    late_delivery: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    unmatched: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    disputed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    credited: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}
