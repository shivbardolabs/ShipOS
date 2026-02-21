/**
 * Shared TypeScript types for ShipOS iOS app.
 * Mirrors the web application's data model.
 */

// ── Enums ──────────────────────────────────────────────────────────

export type PackageStatus = 'checked_in' | 'notified' | 'ready' | 'checked_out' | 'returned';

export type Carrier = 'ups' | 'fedex' | 'usps' | 'dhl' | 'amazon' | 'other';

export type CustomerSource = 'physical' | 'ipostal' | 'anytime_mailbox' | 'postscan';

export type NotificationType = 'email' | 'sms' | 'both';

export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'expired' | 'missing';

export type UserRole = 'admin' | 'manager' | 'employee';

// ── Core Models ────────────────────────────────────────────────────

export interface Package {
  id: string;
  trackingNumber: string;
  carrier: Carrier;
  status: PackageStatus;
  customerId: string;
  customerName: string;
  pmb: string;
  description?: string;
  notes?: string;
  checkedInAt: string;
  checkedInBy: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  notifiedAt?: string;
  labelImageUrl?: string;
  signatureUrl?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pmb: string;
  source: CustomerSource;
  notificationPreference: NotificationType;
  complianceStatus: ComplianceStatus;
  idExpirationDate?: string;
  form1583Status?: string;
  form1583Date?: string;
  packageCount: number;
  mailCount: number;
  createdAt: string;
}

export interface DashboardStats {
  packagesHeld: number;
  checkedInToday: number;
  checkedOutToday: number;
  pendingPickups: number;
  mailReceived: number;
  complianceAlerts: number;
  revenueToday: number;
  customersActive: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  relatedPackageId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
}

// ── API Response Types ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PackageCheckInRequest {
  trackingNumber: string;
  carrier: Carrier;
  customerId: string;
  description?: string;
  notes?: string;
  notify: boolean;
}

export interface PackageCheckOutRequest {
  packageId: string;
  signatureDataUrl?: string;
  notes?: string;
}
