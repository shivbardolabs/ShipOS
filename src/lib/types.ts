// Core entity types matching the Prisma schema

export interface User {
  id: string;
  auth0Id?: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  avatar?: string;
  tenantId?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  businessName?: string;
  pmbNumber: string;
  platform: 'physical' | 'iPostal' | 'anytime' | 'postscan' | 'other';
  status: 'active' | 'closed' | 'suspended';
  dateOpened: string;
  dateClosed?: string;
  renewalDate?: string;
  billingTerms?: string;
  notes?: string;
  idType?: 'drivers_license' | 'passport' | 'both' | 'military_id' | 'other';
  proofOfAddress?: string;
  proofOfAddressType?: 'home_vehicle_insurance' | 'mortgage_deed_of_trust' | 'current_lease' | 'state_drivers_nondriver_id' | 'voter_id_card';
  proofOfAddressDateOfIssue?: string;
  proofOfAddressStatus?: 'pending' | 'submitted' | 'approved' | 'expired';
  idExpiration?: string;
  passportExpiration?: string;
  form1583Status?: 'pending' | 'submitted' | 'approved' | 'expired';
  form1583Date?: string;
  notifyEmail: boolean;
  notifySms: boolean;
  /** URL to customer photo (ID photo, headshot, etc.) */
  photoUrl?: string;
  /** Physical street address */
  address?: string;
  /** Preferred forwarding address for mail */
  forwardingAddress?: string;
  /** People authorized to pick up mail/packages on behalf of this customer */
  authorizedPickupPersons?: AuthorizedPerson[];
  // Computed/joined
  packageCount?: number;
  mailCount?: number;
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  phone?: string;
  relationship?: string;
}

export interface Package {
  id: string;
  trackingNumber?: string;
  carrier: string;
  senderName?: string;
  packageType: 'letter' | 'pack' | 'small' | 'medium' | 'large' | 'xlarge';
  status: 'checked_in' | 'notified' | 'ready' | 'released' | 'returned' | 'rts_initiated' | 'rts_labeled' | 'rts_completed';
  hazardous: boolean;
  perishable: boolean;
  notes?: string;
  condition?: string;
  storageFee: number;
  receivingFee: number;
  quotaFee: number;
  checkedInAt: string;
  notifiedAt?: string;
  releasedAt?: string;
  customerId: string;
  customer?: Customer;
  storageLocation?: string;  // Physical shelf/bin location
  releaseSignature?: string; // Base64 data URL of customer signature on release
  checkedInBy?: User;
  checkedOutBy?: User;
}

export interface MailPiece {
  id: string;
  type: 'letter' | 'magazine' | 'catalog' | 'legal' | 'other';
  sender?: string;
  status: 'received' | 'scanned' | 'notified' | 'held' | 'forwarded' | 'discarded';
  scanImage?: string;
  action?: 'hold' | 'forward' | 'discard' | 'open_scan';
  notes?: string;
  customerId: string;
  customer?: Customer;
  receivedAt: string;
  /** Unique code assigned by the digital mail platform after insert & upload */
  mailCode?: string;
}

export interface Shipment {
  id: string;
  carrier: string;
  service?: string;
  trackingNumber?: string;
  destination?: string;
  weight?: number;
  dimensions?: string;
  wholesaleCost: number;
  retailPrice: number;
  insuranceCost: number;
  packingCost: number;
  status: 'pending' | 'label_created' | 'shipped' | 'delivered' | 'returned';
  paymentStatus: 'unpaid' | 'paid' | 'invoiced';
  customerId: string;
  customer?: Customer;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  channel: 'email' | 'sms' | 'both';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  body?: string;
  customerId: string;
  customer?: Customer;
  /** Related entity (package, shipment, mail piece, etc.) */
  linkedEntityId?: string;
  linkedEntityType?: 'package' | 'shipment' | 'mail' | 'customer';
  /** Carrier name for shipment-related notifications */
  carrier?: string;
  /** Tracking number for shipment / package notifications */
  trackingNumber?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface CarrierRate {
  id: string;
  carrier: string;
  service: string;
  addOnName?: string;
  wholesaleRate: number;
  retailRate: number;
  marginType: 'markup' | 'margin';
  marginValue: number;
  isActive: boolean;
  lastUpdated: string;
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

export type CarrierType = 'amazon' | 'ups' | 'fedex' | 'usps' | 'dhl' | 'walmart' | 'target' | 'lasership' | 'temu' | 'ontrac' | 'other';

/* -------------------------------------------------------------------------- */
/*  PMB / Mailbox Management                                                  */
/* -------------------------------------------------------------------------- */

export type MailboxPlatform = 'physical' | 'anytime' | 'iPostal' | 'postscan';

export interface MailboxRange {
  id: string;
  platform: MailboxPlatform;
  label: string;
  rangeStart: number;
  rangeEnd: number;
  isActive: boolean;
}

export type BoxStatus = 'available' | 'rented' | 'held' | 'reserved';

export interface MailboxSlot {
  number: number;
  platform: MailboxPlatform;
  status: BoxStatus;
  customerId?: string;
  customerName?: string;
  closedDate?: string; // If recently closed, track 90-day hold
}

/* -------------------------------------------------------------------------- */
/*  USPS Acceptable ID Types                                                  */
/* -------------------------------------------------------------------------- */

export type IdCategory = 'primary' | 'secondary';

export interface AcceptableIdType {
  id: string;
  name: string;
  category: IdCategory;
  description: string;
  hasExpiration: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Customer Documents                                                        */
/* -------------------------------------------------------------------------- */

export interface CustomerDocument {
  id: string;
  customerId: string;
  type: 'primary_id' | 'secondary_id';
  idTypeName: string;
  fileName: string;
  fileUrl?: string;
  extractedData?: ExtractedIdData;
  uploadedAt: string;
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

/* -------------------------------------------------------------------------- */
/*  PS Form 1583 Data                                                         */
/* -------------------------------------------------------------------------- */

export interface PS1583FormData {
  // Applicant Info
  applicantName: string;
  dateOfBirth: string;
  // Address info
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  // Business info (optional)
  businessName?: string;
  businessAddress?: string;
  // CMRA info
  cmraName: string;
  cmraAddress: string;
  cmraCity: string;
  cmraState: string;
  cmraZip: string;
  pmbNumber: string;
  // IDs
  primaryIdType: string;
  primaryIdNumber: string;
  primaryIdIssuer: string;
  secondaryIdType: string;
  secondaryIdNumber: string;
  secondaryIdIssuer: string;
  // Status
  signatureDate?: string;
  notarized: boolean;
  crdUploaded: boolean;
  crdUploadDate?: string;
  // Court-ordered protected individual (PS1583 4k)
  courtOrderedProtected: boolean;
  courtOrderUploaded: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Mailbox Service Agreement                                                 */
/* -------------------------------------------------------------------------- */

export interface MailboxAgreementTemplate {
  id: string;
  name: string;
  content: string; // Rich text / template with placeholders
  isDefault: boolean;
  updatedAt: string;
}

export interface CustomerAgreement {
  id: string;
  customerId: string;
  templateId: string;
  signedAt?: string;
  signatureDataUrl?: string;
  status: 'draft' | 'sent' | 'signed' | 'expired';
}

/* -------------------------------------------------------------------------- */
/*  Loyalty Program                                                           */
/* -------------------------------------------------------------------------- */

export interface LoyaltyProgram {
  id: string;
  name: string;
  isActive: boolean;
  pointsPerDollar: number;
  currencyName: string;
  redemptionRate: number;
  referralEnabled: boolean;
  referrerBonusPoints: number;
  refereeBonusPoints: number;
  tiers?: LoyaltyTier[];
  rewards?: LoyaltyReward[];
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  earningMultiplier: number;
  shippingDiscount: number;
  freeHoldDays: number;
  benefits: string[];
  color: string;
  icon: string;
  sortOrder: number;
}

export interface LoyaltyAccount {
  id: string;
  currentPoints: number;
  lifetimePoints: number;
  referralCode: string;
  referredById: string | null;
  customerId: string;
  customer?: Customer;
  currentTierId: string | null;
  currentTier?: LoyaltyTier;
  transactions?: LoyaltyTransaction[];
  createdAt: string;
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'expire' | 'bonus' | 'referral' | 'adjustment';

export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  loyaltyAccountId: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: 'discount' | 'free_service' | 'upgrade' | 'credit' | 'custom';
  value: number;
  isActive: boolean;
  maxRedemptions: number | null;
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

export type DiscrepancyType =
  | 'weight_overcharge'
  | 'service_mismatch'
  | 'duplicate_charge'
  | 'invalid_surcharge'
  | 'address_correction'
  | 'residential_surcharge'
  | 'late_delivery';

export type ReconciliationItemStatus = 'matched' | 'overcharge' | 'late_delivery' | 'unmatched' | 'disputed' | 'resolved' | 'credited';

export interface ReconciliationItem {
  id: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  shipDate: string;
  deliveryDate?: string;
  guaranteedDate?: string;
  /** What ShipOS expected to be charged */
  expectedCharge: number;
  /** What the carrier actually billed */
  billedCharge: number;
  /** The difference (billedCharge - expectedCharge) */
  difference: number;
  expectedWeight?: number;
  billedWeight?: number;
  discrepancyType?: DiscrepancyType;
  status: ReconciliationItemStatus;
  /** Customer associated with this shipment */
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

export type FeeCategory = 'storage' | 'overage' | 'receiving' | 'forwarding' | 'late_pickup' | 'other';

export type FeeStatus = 'accruing' | 'finalized' | 'invoiced' | 'paid' | 'waived';

export interface CustomerFee {
  id: string;
  customerId: string;
  category: FeeCategory;
  description: string;
  amount: number;
  status: FeeStatus;
  /** The entity that triggered this fee (package, mail, etc.) */
  linkedEntityId?: string;
  linkedEntityType?: 'package' | 'mail' | 'shipment';
  linkedEntityLabel?: string;
  /** How this fee accrues (daily, per-item, one-time) */
  accrualType: 'daily' | 'per_item' | 'one_time';
  /** Daily rate if accruing daily */
  dailyRate?: number;
  /** Days accrued so far */
  daysAccrued?: number;
  accrualStartDate: string;
  accrualEndDate?: string;
  createdAt: string;
}

export interface CustomerFeeSummary {
  customerId: string;
  month: string; // e.g. '2026-02'
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
/*  Package Management — BAR-266/13/39/187/246/259                            */
/* -------------------------------------------------------------------------- */

/** Package program type for inventory categorization (BAR-266) */
export type PackageProgramType = 'pmb' | 'ups_ap' | 'fedex_hal' | 'kinek';

/** Condition quick-note tags (BAR-39) */
export type ConditionTag =
  | 'damaged'
  | 'open_resealed'
  | 'wet'
  | 'leaking'
  | 'oversized'
  | 'perishable'
  | 'fragile'
  | 'must_pickup_asap';

/** Put-back reason (BAR-187) */
export type PutBackReason =
  | 'customer_not_present'
  | 'wrong_package'
  | 'id_mismatch'
  | 'customer_declined'
  | 'other';

/** Label verification status (BAR-246) */
export type VerificationStatus = 'unverified' | 'verified' | 'mismatch';

/** Extended package fields for the inventory system */
export interface InventoryPackage extends Package {
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
}

/** Carrier label reprint record (BAR-84) */
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
