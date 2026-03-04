/* Check-in shared types and constants */

import { Hash, Phone, User } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface SearchCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
  pmbNumber: string;
  platform: string;
  status: string;
  notifyEmail: boolean;
  notifySms: boolean;
  photoUrl?: string | null;
  activePackageCount?: number;
}

export interface DuplicatePackage {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  checkedInAt: string;
  customerName: string;
  customerPmb: string;
}

/* -------------------------------------------------------------------------- */
/*  BAR-324: Unified search — auto-detect search category                     */
/* -------------------------------------------------------------------------- */
export type SearchCategory = 'pmb' | 'phone' | 'name_company';

export const SEARCH_CATEGORY_META: Record<SearchCategory, { label: string; icon: typeof Hash; color: string }> = {
  pmb:          { label: 'PMB #',          icon: Hash,  color: 'text-primary-400 bg-primary-500/10 border-primary-500/30' },
  phone:        { label: 'Phone',          icon: Phone, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  name_company: { label: 'Name / Company', icon: User,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

/**
 * Auto-detect the search category from user input.
 */
export function detectSearchCategory(input: string): SearchCategory {
  const trimmed = input.trim();
  if (!trimmed) return 'name_company';

  // PMB pattern: "PMB-0003", "PMB 12", "0003", "123", etc.
  if (/^PMB[-\s]?\d*/i.test(trimmed) || /^\d+$/.test(trimmed)) {
    return 'pmb';
  }

  // Phone pattern: strip non-digits, check length
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  const isPhoneFormatted = /^[\d\s\-\(\)\+\.]+$/.test(trimmed);
  if (digitsOnly.length >= 10 || (isPhoneFormatted && digitsOnly.length >= 7)) {
    return 'phone';
  }

  return 'name_company';
}

/* -------------------------------------------------------------------------- */
/*  Step Config                                                               */
/* -------------------------------------------------------------------------- */
export const STEPS = [
  { id: 1, label: 'Identify Customer' },
  { id: 2, label: 'Carrier & Sender' },
  { id: 3, label: 'Package Details' },
  { id: 4, label: 'Confirm & Notify' },
];

/* -------------------------------------------------------------------------- */
/*  Carrier Config                                                            */
/* -------------------------------------------------------------------------- */
export const carrierOptions = [
  { id: 'amazon', label: 'Amazon', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20', active: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30' },
  { id: 'ups', label: 'UPS', color: 'border-amber-700/40 bg-amber-900/20 text-amber-500 hover:bg-amber-900/30', active: 'border-amber-600 bg-amber-900/30 ring-1 ring-amber-500/30' },
  { id: 'fedex', label: 'FedEx', color: 'border-indigo-300/40 bg-indigo-50 text-indigo-600 hover:bg-indigo-100', active: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-500/30' },
  { id: 'usps', label: 'USPS', color: 'border-blue-500/40 bg-blue-50 text-blue-600 hover:bg-blue-100', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-500/30' },
  { id: 'dhl', label: 'DHL', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20', active: 'border-yellow-500 bg-yellow-500/20 ring-1 ring-yellow-500/30' },
  { id: 'lasership', label: 'LaserShip', color: 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20', active: 'border-green-500 bg-green-500/20 ring-1 ring-green-500/30' },
  { id: 'temu', label: 'Temu', color: 'border-orange-600/40 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20', active: 'border-orange-600 bg-orange-600/20 ring-1 ring-orange-600/30' },
  { id: 'ontrac', label: 'OnTrac', color: 'border-blue-600/40 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20', active: 'border-blue-600 bg-blue-600/20 ring-1 ring-blue-600/30' },
  { id: 'walmart', label: 'Walmart', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', active: 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/30' },
  { id: 'target', label: 'Target', color: 'border-red-500/40 bg-red-50 text-red-600 hover:bg-red-100', active: 'border-red-500 bg-red-100 ring-1 ring-red-500/30' },
  { id: 'other', label: 'Other', color: 'border-surface-600/40 bg-surface-700/20 text-surface-400 hover:bg-surface-700/30', active: 'border-surface-500 bg-surface-700/30 ring-1 ring-surface-500/30' },
];

export const carrierSenderMap: Record<string, string> = {
  amazon: 'Amazon.com',
  ups: '',
  fedex: '',
  usps: '',
  dhl: '',
  lasership: '',
  temu: 'Temu.com',
  ontrac: '',
  walmart: 'Walmart Inc',
  target: 'Target Corporation',
  other: '' };

/* -------------------------------------------------------------------------- */
/*  Package type config                                                       */
/* -------------------------------------------------------------------------- */
export const packageTypeOptions = [
  { id: 'letter', label: 'Letter', icon: '✉️', desc: 'Envelope / Flat' },
  { id: 'pack', label: 'Pack', icon: '📨', desc: 'Bubble mailer / Soft pack' },
  { id: 'small', label: 'Small', icon: '📦', desc: 'Up to 2 lbs' },
  { id: 'medium', label: 'Medium', icon: '📦', desc: 'Up to 8 lbs' },
  { id: 'large', label: 'Large', icon: '📦', desc: 'Up to 15 lbs' },
  { id: 'xlarge', label: 'Extra Large', icon: '🏗️', desc: '20+ lbs / Bulky' },
];

/* -------------------------------------------------------------------------- */
/*  Package Program Types (BAR-266)                                           */
/* -------------------------------------------------------------------------- */
export type PackageProgram = 'pmb' | 'ups_ap' | 'fedex_hal' | 'kinek' | 'amazon';

export const packageProgramOptions: {
  id: PackageProgram;
  label: string;
  icon: string;
  desc: string;
  color: string;
  activeColor: string;
}[] = [
  {
    id: 'pmb',
    label: 'PMB',
    icon: '📬',
    desc: 'Private Mailbox customer',
    color: 'border-primary-500/40 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20',
    activeColor: 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500/30',
  },
  {
    id: 'ups_ap',
    label: 'UPS AP',
    icon: '📦',
    desc: 'UPS Access Point',
    color: 'border-amber-700/40 bg-amber-900/20 text-amber-500 hover:bg-amber-900/30',
    activeColor: 'border-amber-600 bg-amber-900/30 ring-1 ring-amber-500/30',
  },
  {
    id: 'fedex_hal',
    label: 'FedEx HAL',
    icon: '📦',
    desc: 'FedEx Hold At Location',
    color: 'border-indigo-300/40 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    activeColor: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-500/30',
  },
  {
    id: 'kinek',
    label: 'KINEK',
    icon: '📦',
    desc: 'KINEK network',
    color: 'border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20',
    activeColor: 'border-teal-500 bg-teal-500/20 ring-1 ring-teal-500/30',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    icon: '📦',
    desc: 'Amazon packages',
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
    activeColor: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30',
  },
];
