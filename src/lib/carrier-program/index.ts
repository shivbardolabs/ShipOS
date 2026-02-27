/**
 * Carrier Program Module — FedEx HAL & UPS Access Point
 *
 * BAR-280: Program Enrollment & Configuration
 * BAR-281: Package Intake & Hold Inventory
 * BAR-282: Recipient Check-Out & ID Validation
 * BAR-283: Carrier Portal & API Integration
 */

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

export const CARRIER_PROGRAMS = {
  fedex_hal: {
    id: 'fedex_hal',
    name: 'FedEx HAL',
    fullName: 'FedEx Hold at Location',
    carrier: 'fedex',
    defaultHoldDays: 7,
    trackingPrefix: ['7489', '0201', '6129'],
    portalUrl: 'https://www.fedex.com/shipping/hal',
    color: '#4D148C',
    icon: 'fedex',
  },
  ups_access_point: {
    id: 'ups_access_point',
    name: 'UPS Access Point',
    fullName: 'UPS Access Point',
    carrier: 'ups',
    defaultHoldDays: 7,
    trackingPrefix: ['1Z', '1z'],
    portalUrl: 'https://www.ups.com/accesspoint',
    color: '#351C15',
    icon: 'ups',
  },
} as const;

export type CarrierProgramId = keyof typeof CARRIER_PROGRAMS;

export const PROGRAM_IDS = Object.keys(CARRIER_PROGRAMS) as CarrierProgramId[];

/* -------------------------------------------------------------------------- */
/*  ID Types                                                                  */
/* -------------------------------------------------------------------------- */

export const ACCEPTED_ID_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'state_id', label: 'State-Issued Photo ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'military_id', label: 'Military ID' },
  { value: 'other', label: 'Other Government Photo ID' },
] as const;

export type IdType = (typeof ACCEPTED_ID_TYPES)[number]['value'];

/* -------------------------------------------------------------------------- */
/*  Hold period utilities                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compute the hold deadline from intake date + configured hold period.
 */
export function computeHoldDeadline(
  intakeDate: Date,
  holdPeriodDays: number,
): Date {
  const deadline = new Date(intakeDate);
  deadline.setDate(deadline.getDate() + holdPeriodDays);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

/**
 * Compute days remaining before hold period expires.
 * Returns negative if overdue.
 */
export function daysRemaining(deadline: Date, now: Date = new Date()): number {
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / 86_400_000);
}

/**
 * Determine the aging status of a held package.
 */
export function holdStatus(
  deadline: Date,
  warningDaysBefore: number = 2,
  now: Date = new Date(),
): 'ok' | 'warning' | 'overdue' {
  const remaining = daysRemaining(deadline, now);
  if (remaining <= 0) return 'overdue';
  if (remaining <= warningDaysBefore) return 'warning';
  return 'ok';
}

/* -------------------------------------------------------------------------- */
/*  Tracking number detection                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Attempt to auto-detect carrier program from tracking number prefix.
 * Returns the program ID or null if no match.
 */
export function detectProgramFromTracking(
  trackingNumber: string,
): CarrierProgramId | null {
  const trimmed = trackingNumber.trim();
  for (const [programId, program] of Object.entries(CARRIER_PROGRAMS)) {
    for (const prefix of program.trackingPrefix) {
      if (trimmed.startsWith(prefix)) {
        return programId as CarrierProgramId;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Upload payload builder (BAR-283)                                          */
/* -------------------------------------------------------------------------- */

export interface CarrierUploadPayload {
  trackingNumber: string;
  recipientName: string;
  checkoutDateTime: string; // ISO 8601
  locationId: string;
  idVerified: boolean;
  idType: string;
  signatureBase64?: string;
}

/**
 * Build the carrier upload payload for a checkout event.
 */
export function buildUploadPayload(
  checkout: {
    trackingNumber: string;
    recipientName: string;
    checkedOutAt: Date | string;
    recipientIdType: string;
    recipientIdVerified: boolean;
    signatureData?: string | null;
  },
  locationId: string,
): CarrierUploadPayload {
  return {
    trackingNumber: checkout.trackingNumber,
    recipientName: checkout.recipientName,
    checkoutDateTime: new Date(checkout.checkedOutAt).toISOString(),
    locationId,
    idVerified: checkout.recipientIdVerified,
    idType: checkout.recipientIdType,
    signatureBase64: checkout.signatureData ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Reconciliation helpers                                                    */
/* -------------------------------------------------------------------------- */

export interface ReconciliationSummary {
  program: CarrierProgramId;
  period: { from: Date; to: Date };
  totalCheckedOut: number;
  uploadedCount: number;
  confirmedCount: number;
  failedCount: number;
  pendingCount: number;
  estimatedCompensation: number;
}
