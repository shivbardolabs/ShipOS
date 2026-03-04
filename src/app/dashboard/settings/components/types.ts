/* Settings shared types */

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterEntry {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'offline';
  autoPrint: boolean;
  ipAddress?: string;
  port?: number;
  type?: string;
  paperSize?: string;
  dpi?: number;
}

export interface StorageLocationItem {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}
