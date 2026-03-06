/**
 * Application types — single source of truth.
 *
 * Entity types are derived from the Prisma schema (`@prisma/client`).
 * Only frontend-specific view models, union types, and computed shapes
 * are defined manually here.
 *
 * If a field is missing, add it to `prisma/schema.prisma`, run
 * `bunx prisma generate`, and it will appear here automatically.
 */

import type {
  User as PrismaUser,
  Customer as PrismaCustomer,
  Package as PrismaPackage,
  MailPiece as PrismaMailPiece,
  Shipment as PrismaShipment,
  Notification as PrismaNotification,
  AuditLog as PrismaAuditLog,
  CarrierRate as PrismaCarrierRate,
  MailboxRange as PrismaMailboxRange,
  MailboxSize as PrismaMailboxSize,
  CustomerDocument as PrismaCustomerDocument,
  MailboxAgreementTemplate as PrismaMailboxAgreementTemplate,
  CustomerAgreement as PrismaCustomerAgreement,
  LoyaltyProgram as PrismaLoyaltyProgram,
  LoyaltyTier as PrismaLoyaltyTier,
  LoyaltyAccount as PrismaLoyaltyAccount,
  LoyaltyTransaction as PrismaLoyaltyTransaction,
  LoyaltyReward as PrismaLoyaltyReward,
  Prisma,
} from '@prisma/client';

/* ========================================================================== */
/*  Utility: Serializable<T>                                                  */
/*                                                                            */
/*  Prisma types use `Date` for datetime fields, but data arriving from       */
/*  JSON API responses has them as `string`. This utility type makes every    */
/*  `Date` field accept both, so a single type works on the server (Date)     */
/*  and in the client (string from `fetch` → `res.json()`).                   */
/* ========================================================================== */

type Serializable<T> = {
  [K in keyof T]: T[K] extends Date
    ? Date | string
    : T[K] extends Date | null
      ? Date | string | null
      : T[K] extends Date | undefined
        ? Date | string | undefined
        : T[K] extends Date | null | undefined
          ? Date | string | null | undefined
          : T[K];
};

/* ========================================================================== */
/*  Prisma-derived entity types                                               */
/*                                                                            */
/*  These are the Prisma model types, wrapped in Serializable<> so datetime   */
/*  fields accept both Date and string. Optionally extended with computed /    */
/*  relation fields that API routes or UI components attach at runtime.        */
/* ========================================================================== */

/** User — Prisma model with serializable dates. */
export type User = Serializable<PrismaUser>;

/**
 * Customer — Prisma model + optional joined / computed fields.
 *
 * Some UI components reference fields that don't exist in the DB yet
 * (photoUrl, address). These are kept as optional extensions to avoid
 * breaking consumers until the schema catches up.
 */
export type Customer = Serializable<PrismaCustomer> & {
  /** People authorized to pick up mail/packages on behalf of this customer */
  authorizedPickupPersons?: AuthorizedPerson[];
  /** Computed join: number of packages */
  packageCount?: number;
  /** Computed join: number of mail pieces */
  mailCount?: number;
  // TODO: Add these to the Prisma schema or remove from the UI:
  /** URL to customer photo (not yet in DB schema) */
  photoUrl?: string;
  /** Generic address field (DB has homeAddress/businessAddress instead) */
  address?: string;
};

/**
 * Package — Prisma model + optional relation includes.
 */
export type Package = Serializable<PrismaPackage> & {
  /** Joined: customer record */
  customer?: Serializable<PrismaCustomer>;
  /** Joined: user who checked in */
  checkedInBy?: Serializable<PrismaUser>;
  /** Joined: user who checked out */
  checkedOutBy?: Serializable<PrismaUser>;
};

/**
 * MailPiece — Prisma model + optional customer relation.
 */
export type MailPiece = Serializable<PrismaMailPiece> & {
  /** Joined: customer record */
  customer?: Serializable<PrismaCustomer>;
  /** Inline mail code for quick sorting */
  mailCode?: string;
};

/**
 * Shipment — Prisma model + optional customer relation.
 */
export type Shipment = Serializable<PrismaShipment> & {
  /** Joined: customer record */
  customer?: Serializable<PrismaCustomer>;
};

/**
 * Notification — Prisma model + optional customer relation.
 */
export type Notification = Serializable<PrismaNotification> & {
  /** Joined: customer record */
  customer?: Serializable<PrismaCustomer>;
};

/**
 * AuditLogEntry — maps to Prisma `AuditLog` model + optional user relation.
 * Kept as `AuditLogEntry` for backward compatibility with existing imports.
 */
export type AuditLogEntry = Serializable<PrismaAuditLog> & {
  /** Joined: user who performed the action */
  user?: Serializable<PrismaUser>;
};

/** CarrierRate — Prisma model with serializable dates. */
export type CarrierRate = Serializable<PrismaCarrierRate>;

/** MailboxRange — Prisma model with serializable dates. */
export type MailboxRange = Serializable<PrismaMailboxRange>;

/** MailboxSize — BAR-424. Physical mailbox sizes (e.g. "Small Box", "Large Box"). */
export type MailboxSize = Serializable<PrismaMailboxSize>;

/** CustomerDocument — Prisma model. extractedData is a JSON string in the DB. */
export type CustomerDocument = Serializable<PrismaCustomerDocument> & {
  /** Parsed extraction result (JSON string in DB, parsed object in the UI) */
  extractedData?: ExtractedIdData | string | null;
};

/** MailboxAgreementTemplate — Prisma model with serializable dates. */
export type MailboxAgreementTemplate = Serializable<PrismaMailboxAgreementTemplate>;

/** CustomerAgreement — Prisma model with serializable dates. */
export type CustomerAgreement = Serializable<PrismaCustomerAgreement>;

/** LoyaltyProgram — Prisma model + optional tier/reward relations. */
export type LoyaltyProgram = Serializable<PrismaLoyaltyProgram> & {
  tiers?: Serializable<PrismaLoyaltyTier>[];
  rewards?: Serializable<PrismaLoyaltyReward>[];
};

/** LoyaltyTier — Prisma model with serializable dates. */
export type LoyaltyTier = Serializable<PrismaLoyaltyTier>;

/** LoyaltyAccount — Prisma model + optional relations. */
export type LoyaltyAccount = Serializable<PrismaLoyaltyAccount> & {
  customer?: Serializable<PrismaCustomer>;
  currentTier?: Serializable<PrismaLoyaltyTier>;
  transactions?: Serializable<PrismaLoyaltyTransaction>[];
};

/** LoyaltyTransaction — Prisma model with serializable dates. */
export type LoyaltyTransaction = Serializable<PrismaLoyaltyTransaction>;

/** LoyaltyReward — Prisma model with serializable dates. */
export type LoyaltyReward = Serializable<PrismaLoyaltyReward>;

/* ========================================================================== */
/*  Prisma "with relations" convenience types                                  */
/* ========================================================================== */

/** Customer with all nested relations loaded. */
export type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: {
    packages: true;
    mailPieces: true;
    shipments: true;
    notifications: true;
    loyaltyAccount: true;
  };
}>;

/** Package with customer and checked-in/out user. */
export type PackageWithRelations = Prisma.PackageGetPayload<{
  include: {
    customer: true;
    checkedInBy: true;
    checkedOutBy: true;
  };
}>;

/* ========================================================================== */
/*  String union types (narrow the Prisma `String` fields)                    */
/* ========================================================================== */

export type CarrierType =
  | 'amazon' | 'ups' | 'fedex' | 'usps' | 'dhl'
  | 'walmart' | 'target' | 'lasership' | 'temu' | 'ontrac' | 'other';

export type MailboxPlatform = 'physical' | 'anytime' | 'iPostal' | 'postscan';

export type BoxStatus = 'available' | 'rented' | 'held' | 'reserved';

export type IdCategory = 'primary' | 'secondary';

export type RecipientType =
  | 'additional_recipient'
  | 'authorized_individual'
  | 'minor_exception'
  | 'employee_exception';

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'expire' | 'bonus' | 'referral' | 'adjustment';

export type DiscrepancyType =
  | 'weight_overcharge'
  | 'service_mismatch'
  | 'duplicate_charge'
  | 'invalid_surcharge'
  | 'address_correction'
  | 'residential_surcharge'
  | 'late_delivery';

export type ReconciliationItemStatus =
  | 'matched' | 'overcharge' | 'late_delivery'
  | 'unmatched' | 'disputed' | 'resolved' | 'credited';

export type FeeCategory = 'storage' | 'overage' | 'receiving' | 'forwarding' | 'late_pickup' | 'other';

export type FeeStatus = 'accruing' | 'finalized' | 'invoiced' | 'paid' | 'waived';

export type PackageProgramType = 'pmb' | 'ups_ap' | 'fedex_hal' | 'kinek';

export type ConditionTag =
  | 'damaged' | 'open_resealed' | 'wet' | 'leaking'
  | 'oversized' | 'perishable' | 'fragile' | 'must_pickup_asap';

export type PutBackReason =
  | 'customer_not_present' | 'wrong_package' | 'id_mismatch'
  | 'customer_declined' | 'other';

export type VerificationStatus = 'unverified' | 'verified' | 'mismatch';

export type PaymentMethod =
  | 'manual_entry' | 'text2pay' | 'tap_to_glass' | 'nfc' | 'cash';

/* ========================================================================== */
/*  Frontend-only types (no corresponding Prisma model)                       */
/* ========================================================================== */

export interface AuthorizedPerson {
  id: string;
  name: string;
  phone?: string;
  relationship?: string;
}

export interface DashboardStats {
  packagesCheckedInToday: number;
  packagesReleasedToday: number;
  packagesHeld: number;
  activeCustomers: number;
  idExpiringSoon: number;
  shipmentsToday: number;
  revenueToday: number;
  notificationsSent: number;
}

export interface MailboxSlot {
  number: number;
  platform: string;
  status: BoxStatus;
  customerId?: string;
  customerName?: string;
  closedDate?: string | Date;
}

export interface AcceptableIdType {
  id: string;
  name: string;
  category: IdCategory;
  description: string;
  hasExpiration: boolean;
}

export interface ExtractedIdData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  idNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAuthority?: string;
}

export interface PS1583FormData {
  applicantName: string;
  dateOfBirth: string;
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  businessName?: string;
  businessAddress?: string;
  cmraName: string;
  cmraAddress: string;
  cmraCity: string;
  cmraState: string;
  cmraZip: string;
  pmbNumber: string;
  primaryIdType: string;
  primaryIdNumber: string;
  primaryIdIssuer: string;
  secondaryIdType: string;
  secondaryIdNumber: string;
  secondaryIdIssuer: string;
  signatureDate?: string;
  notarized: boolean;
  crdUploaded: boolean;
  crdUploadDate?: string;
  courtOrderedProtected: boolean;
  courtOrderUploaded: boolean;
  hasForwardingAddress: boolean;
  forwardingAddress?: string;
  forwardingCity?: string;
  forwardingState?: string;
  forwardingZip?: string;
  forwardingCountry?: string;
  cmraSignatureUrl?: string;
  cmraSignedBy?: string;
  /** BAR-421 §8b-8e: Applicant telephone & email */
  applicantPhone?: string;
  applicantEmail?: string;
  /** BAR-421 §9b-9g: Authorized Individual fields */
  authorizedIndividualName?: string;
  authorizedIndividualAddress?: string;
  authorizedIndividualCity?: string;
  authorizedIndividualState?: string;
  authorizedIndividualZip?: string;
  authorizedIndividualPhone?: string;
  authorizedIndividualEmail?: string;
  authorizedIndividualDob?: string;
  authorizedIndividualIdType?: string;
  authorizedIndividualIdNumber?: string;
}

/** BAR-421: Billing cycle options per BAR-230 spec */
export type BillingCycle = 'daily' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export interface PmbRecipientData {
  id?: string;
  type: RecipientType;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  primaryIdType?: string;
  primaryIdNumber?: string;
  primaryIdIssuer?: string;
  secondaryIdType?: string;
  secondaryIdNumber?: string;
  secondaryIdIssuer?: string;
  dateOfBirth?: string;
  form1583Status?: string;
  /** BAR-421: Employee flag — employees are exempt from separate PS1583 per Box 12 */
  isEmployee?: boolean;
}

export interface IdValidationResult {
  valid: boolean;
  isNonCompliant: boolean;
  reason?: string;
  suggestion?: string;
}

export interface OnboardingPayment {
  method: PaymentMethod;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference?: string;
  error?: string;
}

export interface PlanTierOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPct: number;
  includedMailItems: number;
  includedScans: number;
  freeStorageDays: number;
  includedForwarding: number;
  includedShredding: number;
  maxRecipients: number;
  maxPackagesPerMonth: number;
}

export interface LoyaltyDashboardStats {
  totalMembers: number;
  pointsIssuedThisMonth: number;
  redemptionsThisMonth: number;
  tierBreakdown: { tier: string; count: number; color: string }[];
  recentActivity: LoyaltyTransaction[];
  topCustomers: { name: string; points: number; tier: string }[];
}

/* -------------------------------------------------------------------------- */
/*  Shipping Reconciliation                                                   */
/* -------------------------------------------------------------------------- */

export interface ReconciliationItem {
  id: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  shipDate: string;
  deliveryDate?: string;
  guaranteedDate?: string;
  expectedCharge: number;
  billedCharge: number;
  difference: number;
  expectedWeight?: number;
  billedWeight?: number;
  discrepancyType?: DiscrepancyType;
  status: ReconciliationItemStatus;
  customerName?: string;
  destination?: string;
  surcharges?: { name: string; amount: number }[];
  notes?: string;
}

export interface ReconciliationRun {
  id: string;
  fileName: string;
  carrier: string;
  uploadedAt: string;
  recordsProcessed: number;
  matchedCount: number;
  discrepancyCount: number;
  lateDeliveryCount: number;
  unmatchedCount: number;
  totalBilled: number;
  totalExpected: number;
  totalOvercharge: number;
  potentialRefund: number;
  status: 'processing' | 'completed' | 'failed';
  items: ReconciliationItem[];
}

export interface ReconciliationStats {
  totalAudited: number;
  totalDiscrepancies: number;
  potentialRefunds: number;
  successRate: number;
  runsThisMonth: number;
  avgRefundPerRun: number;
}

/* -------------------------------------------------------------------------- */
/*  Customer Fee Tracking                                                     */
/* -------------------------------------------------------------------------- */

export interface CustomerFee {
  id: string;
  customerId: string;
  category: FeeCategory;
  description: string;
  amount: number;
  status: FeeStatus;
  linkedEntityId?: string;
  linkedEntityType?: 'package' | 'mail' | 'shipment';
  linkedEntityLabel?: string;
  accrualType: 'daily' | 'per_item' | 'one_time';
  dailyRate?: number;
  daysAccrued?: number;
  accrualStartDate: string;
  accrualEndDate?: string;
  createdAt: string;
}

export interface CustomerFeeSummary {
  customerId: string;
  month: string;
  totalOwed: number;
  storageFees: number;
  overageFees: number;
  receivingFees: number;
  forwardingFees: number;
  otherFees: number;
  paidAmount: number;
  waivedAmount: number;
  feeCount: number;
  fees: CustomerFee[];
}

/* -------------------------------------------------------------------------- */
/*  Package Management — Extended types                                       */
/* -------------------------------------------------------------------------- */

/** Extended package fields for the inventory system. */
export type InventoryPackage = Package & {
  /** Package program type (BAR-266) */
  programType: PackageProgramType;
  /** Kinek 7-digit number (BAR-266) */
  kinekNumber?: string;
  /** Recipient name for non-PMB packages (AP/HAL/Kinek) */
  recipientName?: string;
  /** Hold deadline for carrier program packages */
  holdDeadline?: string;
  /** Customer-facing condition notes (BAR-39) */
  customerNote?: string;
  /** Internal/staff-only notes (BAR-39) */
  internalNote?: string;
  /** Quick condition tags (BAR-39) */
  conditionTags?: ConditionTag[];
  /** Photo URLs for damage documentation (BAR-39) */
  conditionPhotos?: string[];
  /** Label verification status (BAR-246) */
  verificationStatus?: VerificationStatus;
  /** Put-back count */
  putBackCount?: number;
  /** Last put-back reason (BAR-187) */
  lastPutBackReason?: PutBackReason;
  [key: string]: unknown;
};

/** Carrier label reprint record (BAR-84). */
export interface CarrierLabelRecord {
  id: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  labelHtml: string;
  printedAt: string;
  shipmentId: string;
  customerName: string;
}
