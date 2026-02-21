// ── PostalMate Migration Types ───────────────────────────────────────────────

export interface MigrationAnalysis {
  sourceFile: string;
  databaseVersion: string;
  dateRange: { min: string; max: string };
  counts: {
    customers: number;
    shipToAddresses: number;
    shipments: number;
    packages: number;
    packageCheckins: number;
    products: number;
    transactions: number;
    lineItems: number;
    payments: number;
    mailboxes: number;
    carriers: number;
    departments: number;
  };
  carriers: Array<{ id: number; name: string; status: string }>;
  departments: Array<{ id: number; name: string }>;
}

export interface MigrationProgress {
  migrationId: string;
  status: 'pending' | 'analyzing' | 'migrating' | 'completed' | 'failed' | 'rolled_back';
  currentEntity: string;
  currentProgress: number;
  totalProgress: number;
  entities: {
    [key: string]: {
      total: number;
      migrated: number;
      skipped: number;
      errors: number;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    };
  };
  errors: MigrationError[];
  startedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface MigrationError {
  entity: string;
  sourceId: string;
  message: string;
  timestamp: string;
}

export interface MigrationConfig {
  includeCustomers: boolean;
  includeShipments: boolean;
  includePackages: boolean;
  includeProducts: boolean;
  includeTransactions: boolean;
  includeAddresses: boolean;
  conflictResolution: 'skip' | 'merge' | 'create_new';
}

// PostalMate source data types
export interface PMCustomer {
  CUSTOMERID: number;
  FIRSTNAME: string | null;
  LASTNAME: string | null;
  COMPANYNAME: string | null;
  VOICEPHONENO: string | null;
  EMAIL: string | null;
  ADDDATE: string | null;
  DELETED: number;
  FAXPHONENO: string | null;
  SOURCE: string | null;
  USERDEF1: string | null;
}

export interface PMShipTo {
  SHIPTOID: number;
  FIRSTNAME: string | null;
  LASTNAME: string | null;
  COMPANYNAME: string | null;
  CONTACT: string | null;
  ADDRESS1: string | null;
  ADDRESS2: string | null;
  ADDRESS3: string | null;
  ZIPCODE: string | null;
  ZIPPLUS: string | null;
  COUNTRYNAME: string | null;
  EMAIL: string | null;
  VOICEPHONENO: string | null;
  ISCOMMERCIAL: number;
  LASTCUSTREF: number | null;
  DELETED: number;
}

export interface PMShipment {
  SHIPMENTXNID: number;
  CUSTOMERREF: number | null;
  CARRIERREF: number | null;
  CARRIERNAME: string | null;
  SHIPTOFIRSTNAME: string | null;
  SHIPTOLASTNAME: string | null;
  SHIPTOCOMPANYNAME: string | null;
  SHIPTOADDRESS1: string | null;
  SHIPTOADDRESS2: string | null;
  ACTUALWEIGHT: number | null;
  SHIPMENTRETAIL: number | null;
  SHIPMENTWHOLESALE: number | null;
  TRANSACTIONDTG: string | null;
  VOIDED: number;
  TRACKINGNUMBER: string | null;
  DIMENSIONS: string | null;
  INSURANCEVALUE: number | null;
  PACKINGCOST: number | null;
  SERVICE: string | null;
}

export interface PMPackageReceive {
  PKGRECVXNID: number;
  CARRIERREF: number;
  CARRIERNAME: string | null;
  TRACKINGNUMBER: string | null;
  DTG: string;
  DTGCOMPLETE: string | null;
  STATUS: number;
  PKGTYPE: number;
  CUSTOMERREF: number;
  SENDER: string | null;
  NOTES: string | null;
}

export interface PMMailbox {
  MBDETAILID: number;
  MAILBOXNUMBER: number;
  CUSTOMERREF: number | null;
  STATUS: number;
  OPENDATE: string | null;
  NEXTDUEDATE: string | null;
  PERMONTHRATE: number | null;
  MONTHTERM: number | null;
}

// Carrier mapping from PostalMate to ShipOS
export const CARRIER_MAP: Record<string, string> = {
  'United Parcel Service': 'ups',
  'United States Postal Service': 'usps',
  'FedEx Express': 'fedex',
  'FedEx Ground': 'fedex',
  'FedEx Freight': 'fedex',
  'FedEx Freight Box': 'fedex',
  'DHL': 'dhl',
  'DHL eCommerce': 'dhl',
  'OnTrac': 'ontrac',
  'LSO': 'lso',
  'Spee-Dee Delivery': 'speedee',
  'SameDay Messenger': 'sameday',
  'Meest': 'meest',
  'Maersk Parcel': 'maersk',
  'GLS': 'gls',
  'UShip': 'uship',
};

// PostalMate mailbox status mapping
export const MB_STATUS_MAP: Record<number, string> = {
  0: 'available',
  1: 'active',    // Current
  2: 'active',    // Current and Forwarding
  3: 'suspended', // Past Due
  4: 'closed',    // Closed
  5: 'closed',    // Closed and Forwarding
  6: 'suspended', // Past Due and Forwarding
};

// Package type mapping
export const PKG_TYPE_MAP: Record<number, string> = {
  0: 'medium',
  1: 'letter',
  2: 'small',
  3: 'medium',
  4: 'large',
  5: 'oversized',
};

// Package receive status mapping
export const PKG_STATUS_MAP: Record<number, string> = {
  0: 'checked_in',
  1: 'notified',
  2: 'ready',
  3: 'released',
  4: 'returned',
};
