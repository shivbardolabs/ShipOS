// Core entity types matching the Prisma schema

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  avatar?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  businessName?: string;
  pmbNumber: string;
  platform: 'physical' | 'iPostal' | 'anytime' | 'postscan';
  status: 'active' | 'closed' | 'suspended';
  dateOpened: string;
  dateClosed?: string;
  renewalDate?: string;
  billingTerms?: string;
  notes?: string;
  idType?: 'drivers_license' | 'passport' | 'both';
  idExpiration?: string;
  passportExpiration?: string;
  form1583Status?: 'pending' | 'submitted' | 'approved' | 'expired';
  form1583Date?: string;
  notifyEmail: boolean;
  notifySms: boolean;
  // Computed/joined
  packageCount?: number;
  mailCount?: number;
}

export interface Package {
  id: string;
  trackingNumber?: string;
  carrier: string;
  senderName?: string;
  packageType: 'letter' | 'small' | 'medium' | 'large' | 'oversized';
  status: 'checked_in' | 'notified' | 'ready' | 'released' | 'returned';
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

export type CarrierType = 'amazon' | 'ups' | 'fedex' | 'usps' | 'dhl' | 'walmart' | 'target' | 'other';
