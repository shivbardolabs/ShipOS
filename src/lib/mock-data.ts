import type {
  User,
  Customer,
  Package,
  MailPiece,
  Shipment,
  Notification,
  AuditLogEntry,
  CarrierRate,
  DashboardStats,
  ReconciliationItem,
  ReconciliationRun,
  ReconciliationStats,
  DiscrepancyType,
  ReconciliationItemStatus,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyDashboardStats,
  CustomerFee,
  CustomerFeeSummary,
  FeeCategory,
  FeeStatus,
} from './types';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const today = new Date('2026-02-21');
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 86400000).toISOString();
const daysFromNow = (n: number) =>
  new Date(today.getTime() + n * 86400000).toISOString();
const hoursAgo = (n: number) =>
  new Date(today.getTime() - n * 3600000).toISOString();

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------
export const currentUser: User = {
  id: 'usr_001',
  name: 'Sarah Chen',
  email: 'sarah.chen@shipstation.com',
  role: 'admin',
  avatar: undefined,
};

// ---------------------------------------------------------------------------
// Customers (30)
// ---------------------------------------------------------------------------

export const customers: Customer[] = [
  { id: 'cust_001', firstName: 'James', lastName: 'Morrison', email: 'james.morrison@email.com', phone: '(555) 234-5001', businessName: 'Morrison Consulting LLC', pmbNumber: 'PMB-0001', platform: 'iPostal', status: 'active', dateOpened: daysAgo(420), renewalDate: daysFromNow(45), billingTerms: 'Monthly', idType: 'both', idExpiration: daysFromNow(180), passportExpiration: daysFromNow(400), form1583Status: 'approved', form1583Date: daysAgo(380), notifyEmail: true, notifySms: true, photoUrl: 'https://i.pravatar.cc/150?u=cust_001', packageCount: 12, mailCount: 34 },
  { id: 'cust_002', firstName: 'Linda', lastName: 'Nakamura', email: 'linda.nak@proton.me', phone: '(555) 234-5002', pmbNumber: 'PMB-0002', platform: 'iPostal', status: 'active', dateOpened: daysAgo(310), renewalDate: daysFromNow(55), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(12), form1583Status: 'approved', form1583Date: daysAgo(290), notifyEmail: true, notifySms: false, photoUrl: 'https://i.pravatar.cc/150?u=cust_002', packageCount: 5, mailCount: 18 },
  { id: 'cust_003', firstName: 'Robert', lastName: 'Singh', email: 'robert.s@gmail.com', phone: '(555) 234-5003', businessName: 'Singh Import/Export', pmbNumber: 'PMB-0003', platform: 'postscan', status: 'active', dateOpened: daysAgo(550), renewalDate: daysFromNow(10), billingTerms: 'Annual', idType: 'passport', idExpiration: daysFromNow(90), form1583Status: 'approved', form1583Date: daysAgo(500), notifyEmail: true, notifySms: true, photoUrl: 'https://i.pravatar.cc/150?u=cust_003', packageCount: 28, mailCount: 67 },
  { id: 'cust_004', firstName: 'Maria', lastName: 'Gonzalez', email: 'mgonzalez@outlook.com', phone: '(555) 234-5004', pmbNumber: 'PMB-0004', platform: 'anytime', status: 'active', dateOpened: daysAgo(200), renewalDate: daysFromNow(165), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(300), form1583Status: 'approved', form1583Date: daysAgo(180), notifyEmail: true, notifySms: true, photoUrl: 'https://i.pravatar.cc/150?u=cust_004', packageCount: 8, mailCount: 12 },
  { id: 'cust_005', firstName: 'David', lastName: 'Kim', email: 'dkim@techstartup.io', phone: '(555) 234-5005', businessName: 'TechStartup Inc', pmbNumber: 'PMB-0005', platform: 'postscan', status: 'active', dateOpened: daysAgo(150), renewalDate: daysFromNow(215), billingTerms: 'Monthly', idType: 'both', idExpiration: daysFromNow(5), passportExpiration: daysFromNow(600), form1583Status: 'submitted', form1583Date: daysAgo(10), notifyEmail: true, notifySms: false, photoUrl: 'https://i.pravatar.cc/150?u=cust_005', packageCount: 15, mailCount: 42 },
  { id: 'cust_006', firstName: 'Patricia', lastName: 'Williams', email: 'pat.w@yahoo.com', phone: '(555) 234-5006', pmbNumber: 'PMB-0006', platform: 'anytime', status: 'active', dateOpened: daysAgo(365), renewalDate: daysFromNow(0), billingTerms: 'Semiannual', idType: 'drivers_license', idExpiration: daysFromNow(450), form1583Status: 'approved', form1583Date: daysAgo(340), notifyEmail: true, notifySms: true, photoUrl: 'https://i.pravatar.cc/150?u=cust_006', packageCount: 3, mailCount: 89 },
  { id: 'cust_007', firstName: 'Michael', lastName: 'Brown', email: 'mbrown@proton.me', phone: '(555) 234-5007', businessName: 'Brown & Associates', pmbNumber: 'PMB-0007', platform: 'iPostal', status: 'active', dateOpened: daysAgo(280), renewalDate: daysFromNow(85), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysAgo(15), form1583Status: 'expired', form1583Date: daysAgo(400), notifyEmail: true, notifySms: false, photoUrl: 'https://i.pravatar.cc/150?u=cust_007', packageCount: 6, mailCount: 22 },
  { id: 'cust_008', firstName: 'Jennifer', lastName: 'Lee', email: 'jlee@fastmail.com', phone: '(555) 234-5008', pmbNumber: 'PMB-0008', platform: 'anytime', status: 'active', dateOpened: daysAgo(90), renewalDate: daysFromNow(275), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(700), form1583Status: 'approved', form1583Date: daysAgo(85), notifyEmail: false, notifySms: true, photoUrl: 'https://i.pravatar.cc/150?u=cust_008', packageCount: 2, mailCount: 5 },
  { id: 'cust_009', firstName: 'William', lastName: 'Davis', email: 'wdavis@email.com', phone: '(555) 234-5009', pmbNumber: 'PMB-0009', platform: 'other', status: 'closed', dateOpened: daysAgo(600), dateClosed: daysAgo(30), billingTerms: 'Custom', idType: 'drivers_license', idExpiration: daysAgo(60), form1583Status: 'expired', form1583Date: daysAgo(580), notifyEmail: true, notifySms: false, packageCount: 0, mailCount: 0 },
  { id: 'cust_010', firstName: 'Elizabeth', lastName: 'Martinez', email: 'emartinez@gmail.com', phone: '(555) 234-5010', businessName: 'Martinez Legal Services', pmbNumber: 'PMB-0010', platform: 'postscan', status: 'active', dateOpened: daysAgo(400), renewalDate: daysFromNow(30), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(200), passportExpiration: daysFromNow(350), form1583Status: 'approved', form1583Date: daysAgo(370), notifyEmail: true, notifySms: true, packageCount: 19, mailCount: 55 },
  { id: 'cust_011', firstName: 'Thomas', lastName: 'Anderson', email: 'tanderson@neo.io', phone: '(555) 234-5011', pmbNumber: 'PMB-0011', platform: 'iPostal', status: 'active', dateOpened: daysAgo(180), renewalDate: daysFromNow(185), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(120), form1583Status: 'approved', form1583Date: daysAgo(170), notifyEmail: true, notifySms: true, packageCount: 7, mailCount: 15 },
  { id: 'cust_012', firstName: 'Sarah', lastName: 'Taylor', email: 'staylor@outlook.com', phone: '(555) 234-5012', businessName: 'Taylor Designs', pmbNumber: 'PMB-0012', platform: 'iPostal', status: 'active', dateOpened: daysAgo(250), renewalDate: daysFromNow(115), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(30), form1583Status: 'approved', form1583Date: daysAgo(230), notifyEmail: true, notifySms: false, packageCount: 11, mailCount: 28 },
  { id: 'cust_013', firstName: 'Christopher', lastName: 'Jackson', email: 'cjackson@email.com', phone: '(555) 234-5013', pmbNumber: 'PMB-0013', platform: 'anytime', status: 'suspended', dateOpened: daysAgo(320), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(500), form1583Status: 'pending', notifyEmail: false, notifySms: false, packageCount: 1, mailCount: 3 },
  { id: 'cust_014', firstName: 'Jessica', lastName: 'White', email: 'jwhite@gmail.com', phone: '(555) 234-5014', businessName: 'White Photography', pmbNumber: 'PMB-0014', platform: 'postscan', status: 'active', dateOpened: daysAgo(500), renewalDate: daysFromNow(60), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(250), passportExpiration: daysFromNow(100), form1583Status: 'approved', form1583Date: daysAgo(460), notifyEmail: true, notifySms: true, packageCount: 22, mailCount: 47 },
  { id: 'cust_015', firstName: 'Daniel', lastName: 'Harris', email: 'dharris@proton.me', phone: '(555) 234-5015', pmbNumber: 'PMB-0015', platform: 'postscan', status: 'active', dateOpened: daysAgo(70), renewalDate: daysFromNow(295), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(400), form1583Status: 'approved', form1583Date: daysAgo(60), notifyEmail: true, notifySms: true, packageCount: 4, mailCount: 8 },
  { id: 'cust_016', firstName: 'Karen', lastName: 'Thompson', email: 'kthompson@fastmail.com', phone: '(555) 234-5016', pmbNumber: 'PMB-0016', platform: 'anytime', status: 'active', dateOpened: daysAgo(440), renewalDate: daysFromNow(25), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(150), form1583Status: 'approved', form1583Date: daysAgo(410), notifyEmail: true, notifySms: false, packageCount: 9, mailCount: 31 },
  { id: 'cust_017', firstName: 'Matthew', lastName: 'Garcia', email: 'mgarcia@yahoo.com', phone: '(555) 234-5017', businessName: 'Garcia Imports', pmbNumber: 'PMB-0017', platform: 'iPostal', status: 'active', dateOpened: daysAgo(190), renewalDate: daysFromNow(175), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(800), form1583Status: 'submitted', form1583Date: daysAgo(5), notifyEmail: true, notifySms: true, packageCount: 14, mailCount: 20 },
  { id: 'cust_018', firstName: 'Nancy', lastName: 'Robinson', email: 'nrobinson@email.com', phone: '(555) 234-5018', pmbNumber: 'PMB-0018', platform: 'anytime', status: 'closed', dateOpened: daysAgo(700), dateClosed: daysAgo(90), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysAgo(200), form1583Status: 'expired', form1583Date: daysAgo(680), notifyEmail: false, notifySms: false, packageCount: 0, mailCount: 0 },
  { id: 'cust_019', firstName: 'Anthony', lastName: 'Clark', email: 'aclark@gmail.com', phone: '(555) 234-5019', businessName: 'Clark Ventures', pmbNumber: 'PMB-0019', platform: 'iPostal', status: 'active', dateOpened: daysAgo(130), renewalDate: daysFromNow(235), billingTerms: 'Semiannual', idType: 'both', idExpiration: daysFromNow(100), passportExpiration: daysFromNow(300), form1583Status: 'approved', form1583Date: daysAgo(120), notifyEmail: true, notifySms: true, packageCount: 10, mailCount: 19 },
  { id: 'cust_020', firstName: 'Lisa', lastName: 'Lewis', email: 'llwis@proton.me', phone: '(555) 234-5020', pmbNumber: 'PMB-0020', platform: 'postscan', status: 'active', dateOpened: daysAgo(45), renewalDate: daysFromNow(320), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(500), form1583Status: 'approved', form1583Date: daysAgo(40), notifyEmail: true, notifySms: false, packageCount: 3, mailCount: 6 },
  { id: 'cust_021', firstName: 'Mark', lastName: 'Walker', email: 'mwalker@outlook.com', phone: '(555) 234-5021', businessName: 'Walker Tech Solutions', pmbNumber: 'PMB-0021', platform: 'other', status: 'active', dateOpened: daysAgo(350), renewalDate: daysFromNow(15), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(60), form1583Status: 'approved', form1583Date: daysAgo(330), notifyEmail: true, notifySms: true, packageCount: 16, mailCount: 44 },
  { id: 'cust_022', firstName: 'Amanda', lastName: 'Hall', email: 'ahall@yahoo.com', phone: '(555) 234-5022', pmbNumber: 'PMB-0022', platform: 'iPostal', status: 'active', dateOpened: daysAgo(210), renewalDate: daysFromNow(155), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(900), form1583Status: 'approved', form1583Date: daysAgo(200), notifyEmail: true, notifySms: true, packageCount: 6, mailCount: 14 },
  { id: 'cust_023', firstName: 'Steven', lastName: 'Allen', email: 'sallen@fastmail.com', phone: '(555) 234-5023', pmbNumber: 'PMB-0023', platform: 'anytime', status: 'active', dateOpened: daysAgo(160), renewalDate: daysFromNow(205), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(3), form1583Status: 'approved', form1583Date: daysAgo(150), notifyEmail: true, notifySms: false, packageCount: 5, mailCount: 9 },
  { id: 'cust_024', firstName: 'Donna', lastName: 'Young', email: 'dyoung@email.com', phone: '(555) 234-5024', businessName: 'Young Realty Group', pmbNumber: 'PMB-0024', platform: 'postscan', status: 'active', dateOpened: daysAgo(480), renewalDate: daysFromNow(50), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(350), passportExpiration: daysFromNow(200), form1583Status: 'approved', form1583Date: daysAgo(450), notifyEmail: true, notifySms: true, packageCount: 20, mailCount: 60 },
  { id: 'cust_025', firstName: 'Paul', lastName: 'King', email: 'pking@gmail.com', phone: '(555) 234-5025', pmbNumber: 'PMB-0025', platform: 'postscan', status: 'suspended', dateOpened: daysAgo(300), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysAgo(45), form1583Status: 'expired', form1583Date: daysAgo(400), notifyEmail: false, notifySms: false, packageCount: 2, mailCount: 0 },
  { id: 'cust_026', firstName: 'Emily', lastName: 'Wright', email: 'ewright@proton.me', phone: '(555) 234-5026', businessName: 'Wright & Reed Attorneys', pmbNumber: 'PMB-0026', platform: 'anytime', status: 'active', dateOpened: daysAgo(260), renewalDate: daysFromNow(105), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(220), form1583Status: 'approved', form1583Date: daysAgo(240), notifyEmail: true, notifySms: true, packageCount: 8, mailCount: 36 },
  { id: 'cust_027', firstName: 'Andrew', lastName: 'Lopez', email: 'alopez@outlook.com', phone: '(555) 234-5027', pmbNumber: 'PMB-0027', platform: 'iPostal', status: 'active', dateOpened: daysAgo(110), renewalDate: daysFromNow(255), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(650), form1583Status: 'approved', form1583Date: daysAgo(100), notifyEmail: true, notifySms: false, packageCount: 4, mailCount: 11 },
  { id: 'cust_028', firstName: 'Michelle', lastName: 'Hill', email: 'mhill@yahoo.com', phone: '(555) 234-5028', pmbNumber: 'PMB-0028', platform: 'anytime', status: 'active', dateOpened: daysAgo(80), renewalDate: daysFromNow(285), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(380), form1583Status: 'approved', form1583Date: daysAgo(75), notifyEmail: true, notifySms: true, packageCount: 3, mailCount: 7 },
  { id: 'cust_029', firstName: 'Kevin', lastName: 'Scott', email: 'kscott@fastmail.com', phone: '(555) 234-5029', businessName: 'Scott Digital Media', pmbNumber: 'PMB-0029', platform: 'iPostal', status: 'active', dateOpened: daysAgo(230), renewalDate: daysFromNow(135), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(170), passportExpiration: daysFromNow(500), form1583Status: 'approved', form1583Date: daysAgo(210), notifyEmail: true, notifySms: true, packageCount: 13, mailCount: 29 },
  { id: 'cust_030', firstName: 'Rachel', lastName: 'Green', email: 'rgreen@email.com', phone: '(555) 234-5030', pmbNumber: 'PMB-0030', platform: 'postscan', status: 'active', dateOpened: daysAgo(25), renewalDate: daysFromNow(340), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(600), form1583Status: 'pending', form1583Date: daysAgo(20), notifyEmail: true, notifySms: true, packageCount: 1, mailCount: 2 },
];

// ---------------------------------------------------------------------------
// Packages (60)
// ---------------------------------------------------------------------------
const carriers = ['amazon', 'ups', 'fedex', 'usps', 'dhl', 'ups', 'fedex', 'amazon', 'usps', 'ups'];
const packageTypes: Package['packageType'][] = ['letter', 'pack', 'small', 'medium', 'large', 'xlarge'];
const packageStatuses: Package['status'][] = ['checked_in', 'checked_in', 'notified', 'ready', 'released', 'released'];
const senders = ['Amazon.com', 'Best Buy', 'Apple Inc', 'Walmart', 'Target', 'Etsy Seller', 'Chewy', 'Wayfair', 'Home Depot', 'Nike', 'Nordstrom', 'Costco', 'Office Depot', 'Dell Technologies', 'Samsung Electronics', 'B&H Photo', 'Zappos', 'Adidas', 'REI Co-op', 'Staples'];

function makeTrackingNumber(carrier: string, i: number): string {
  const pad = String(i).padStart(8, '0');
  const map: Record<string, string> = {
    amazon: `TBA${pad}${i * 7}`,
    ups: `1Z999AA1${pad}`,
    fedex: `7489${pad}${i}`,
    usps: `9400111899${pad}`,
    dhl: `JD018600${pad}`,
  };
  return map[carrier] || `TRK${pad}`;
}

export const packages: Package[] = Array.from({ length: 60 }, (_, i) => {
  const idx = i;
  const status = packageStatuses[idx % packageStatuses.length];
  const carrier = carriers[idx % carriers.length];
  const custIdx = idx % 28; // distribute across first 28 active-ish customers
  const customerId = customers[custIdx].id;
  const checkedInDaysAgo = status === 'released' ? 3 + (idx % 10) : idx % 5;
  const pType = packageTypes[idx % packageTypes.length];

  return {
    id: `pkg_${String(idx + 1).padStart(3, '0')}`,
    trackingNumber: makeTrackingNumber(carrier, idx + 1000),
    carrier,
    senderName: senders[idx % senders.length],
    packageType: pType,
    status,
    hazardous: idx === 14 || idx === 38,
    perishable: idx === 7 || idx === 22 || idx === 45,
    notes: idx % 12 === 0 ? 'Fragile - handle with care' : idx % 17 === 0 ? 'Customer requested hold' : undefined,
    condition: idx === 3 ? 'Slight dent on corner' : idx === 28 ? 'Wet packaging' : undefined,
    storageFee: status === 'released' && checkedInDaysAgo > 5 ? 5.0 : 0,
    receivingFee: pType === 'xlarge' ? 7.5 : pType === 'large' ? 5.0 : 3.0,
    quotaFee: 0,
    checkedInAt: hoursAgo(checkedInDaysAgo * 24 + (idx % 8)),
    notifiedAt: status !== 'checked_in' ? hoursAgo(checkedInDaysAgo * 24 - 1) : undefined,
    releasedAt: status === 'released' ? daysAgo(checkedInDaysAgo - 2) : undefined,
    customerId,
    customer: customers[custIdx],
    checkedInBy: currentUser,
    checkedOutBy: status === 'released' ? currentUser : undefined,
  };
});

// ---------------------------------------------------------------------------
// Mail Pieces (25)
// ---------------------------------------------------------------------------
const mailTypes: MailPiece['type'][] = ['letter', 'letter', 'magazine', 'catalog', 'legal', 'other'];
const mailStatuses: MailPiece['status'][] = ['received', 'scanned', 'notified', 'held', 'forwarded', 'discarded'];
const mailSenders = ['IRS', 'State of California', 'Chase Bank', 'Wells Fargo', 'GEICO Insurance', 'AT&T', 'Verizon', 'Comcast', 'Time Magazine', 'Wall Street Journal', 'County Tax Assessor', 'Social Security Admin', 'DMV', 'Blue Cross', 'Fidelity Investments'];

/** Generate a deterministic mail code for mock data (format: ML-XXXXXX) */
function generateMailCode(index: number): string {
  const code = String(100000 + index * 7331).slice(-6);
  return `ML-${code}`;
}

export const mailPieces: MailPiece[] = Array.from({ length: 25 }, (_, i) => {
  const custIdx = i % 26;
  const status = mailStatuses[i % mailStatuses.length];
  return {
    id: `mail_${String(i + 1).padStart(3, '0')}`,
    type: mailTypes[i % mailTypes.length],
    sender: mailSenders[i % mailSenders.length],
    status,
    scanImage: status === 'scanned' || status === 'notified' ? `/scans/mail_${i + 1}.png` : undefined,
    action: status === 'held' ? 'hold' : status === 'forwarded' ? 'forward' : status === 'discarded' ? 'discard' : undefined,
    notes: i === 3 ? 'Certified mail - signature required' : i === 11 ? 'Looks time-sensitive' : undefined,
    customerId: customers[custIdx].id,
    customer: customers[custIdx],
    receivedAt: hoursAgo((i % 7) * 24 + i * 2),
    mailCode: generateMailCode(i + 1),
  };
});

// ---------------------------------------------------------------------------
// Shipments (20)
// ---------------------------------------------------------------------------
const shipmentCarriers = ['ups', 'fedex', 'usps', 'dhl', 'ups', 'fedex'];
const shipmentServices = ['Ground', 'Priority', '2-Day Air', 'Express', 'Economy', 'First Class', 'Priority Mail Express', 'Overnight', 'International Economy', 'Ground Advantage'];
const shipmentStatuses: Shipment['status'][] = ['pending', 'label_created', 'shipped', 'shipped', 'delivered', 'delivered'];
const paymentStatuses: Shipment['paymentStatus'][] = ['paid', 'paid', 'paid', 'invoiced', 'unpaid', 'paid'];
const destinations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'San Diego, CA', 'Dallas, TX', 'Miami, FL', 'Denver, CO', 'Seattle, WA', 'Portland, OR', 'Atlanta, GA', 'Boston, MA', 'London, UK', 'Toronto, Canada', 'Austin, TX', 'Nashville, TN', 'San Francisco, CA', 'Minneapolis, MN', 'Detroit, MI'];

export const shipments: Shipment[] = Array.from({ length: 20 }, (_, i) => {
  const carrier = shipmentCarriers[i % shipmentCarriers.length];
  const status = shipmentStatuses[i % shipmentStatuses.length];
  const wholesaleCost = parseFloat((8 + Math.random() * 45).toFixed(2));
  const margin = 1.3 + Math.random() * 0.4;
  const custIdx = (i * 3) % 28;

  return {
    id: `ship_${String(i + 1).padStart(3, '0')}`,
    carrier,
    service: shipmentServices[i % shipmentServices.length],
    trackingNumber: makeTrackingNumber(carrier, 5000 + i),
    destination: destinations[i],
    weight: parseFloat((0.5 + Math.random() * 30).toFixed(1)),
    dimensions: `${8 + (i % 20)}x${6 + (i % 15)}x${4 + (i % 10)}`,
    wholesaleCost,
    retailPrice: parseFloat((wholesaleCost * margin).toFixed(2)),
    insuranceCost: i % 4 === 0 ? parseFloat((2 + Math.random() * 8).toFixed(2)) : 0,
    packingCost: i % 3 === 0 ? parseFloat((3 + Math.random() * 12).toFixed(2)) : 0,
    status,
    paymentStatus: paymentStatuses[i % paymentStatuses.length],
    customerId: customers[custIdx].id,
    customer: customers[custIdx],
    shippedAt: status === 'shipped' || status === 'delivered' ? daysAgo(i % 5 + 1) : undefined,
    deliveredAt: status === 'delivered' ? daysAgo(i % 3) : undefined,
    createdAt: daysAgo(i % 8 + 1),
  };
});

// ---------------------------------------------------------------------------
// Notifications (40)
// ---------------------------------------------------------------------------
const notifTypes = ['package_arrival', 'package_arrival', 'package_reminder', 'mail_received', 'id_expiring', 'renewal_reminder', 'shipment_update', 'welcome'];
const notifChannels: Notification['channel'][] = ['email', 'sms', 'both', 'email', 'sms'];
const notifStatuses: Notification['status'][] = ['sent', 'delivered', 'delivered', 'delivered', 'pending', 'failed', 'bounced'];

export const notifications: Notification[] = Array.from({ length: 40 }, (_, i) => {
  const type = notifTypes[i % notifTypes.length];
  const status = notifStatuses[i % notifStatuses.length];
  const custIdx = i % 28;
  const cust = customers[custIdx];
  const subjectMap: Record<string, string> = {
    package_arrival: 'You have a new package!',
    package_reminder: 'Package pickup reminder',
    mail_received: 'New mail received at your PMB',
    id_expiring: 'Action required: Your ID is expiring soon',
    renewal_reminder: 'Mailbox renewal reminder',
    shipment_update: 'Shipment tracking update',
    welcome: 'Welcome to ShipOS!',
  };

  // Link each notification to a related entity so it can navigate on click
  let linkedEntityId: string | undefined;
  let linkedEntityType: Notification['linkedEntityType'];
  let carrier: string | undefined;
  let trackingNumber: string | undefined;

  switch (type) {
    case 'package_arrival':
    case 'package_reminder': {
      const pkg = packages[i % packages.length];
      linkedEntityId = pkg.id;
      linkedEntityType = 'package';
      carrier = pkg.carrier;
      trackingNumber = pkg.trackingNumber;
      break;
    }
    case 'shipment_update': {
      const ship = shipments[i % shipments.length];
      linkedEntityId = ship.id;
      linkedEntityType = 'shipment';
      carrier = ship.carrier;
      trackingNumber = ship.trackingNumber;
      break;
    }
    case 'mail_received': {
      const mail = mailPieces[i % mailPieces.length];
      linkedEntityId = mail.id;
      linkedEntityType = 'mail';
      break;
    }
    case 'id_expiring':
    case 'renewal_reminder':
    case 'welcome':
      linkedEntityId = cust.id;
      linkedEntityType = 'customer';
      break;
  }

  return {
    id: `notif_${String(i + 1).padStart(3, '0')}`,
    type,
    channel: notifChannels[i % notifChannels.length],
    status,
    subject: subjectMap[type] || 'Notification',
    body: `Notification body for ${type} sent to ${cust.firstName} ${cust.lastName}`,
    customerId: cust.id,
    customer: cust,
    linkedEntityId,
    linkedEntityType,
    carrier,
    trackingNumber,
    sentAt: status !== 'pending' ? hoursAgo(i * 3 + 1) : undefined,
    createdAt: hoursAgo(i * 3),
  };
});

// ---------------------------------------------------------------------------
// Audit Log (15)
// ---------------------------------------------------------------------------
const auditActions = [
  { action: 'package.check_in', entityType: 'package', detail: 'Checked in package from Amazon' },
  { action: 'package.release', entityType: 'package', detail: 'Released package to customer' },
  { action: 'customer.create', entityType: 'customer', detail: 'Created new customer account' },
  { action: 'customer.update', entityType: 'customer', detail: 'Updated customer contact info' },
  { action: 'shipment.create', entityType: 'shipment', detail: 'Created new outbound shipment' },
  { action: 'notification.send', entityType: 'notification', detail: 'Sent package arrival notification' },
  { action: 'mail.receive', entityType: 'mail', detail: 'Received and scanned mail piece' },
  { action: 'package.check_in', entityType: 'package', detail: 'Checked in FedEx package' },
  { action: 'customer.update', entityType: 'customer', detail: 'Updated form 1583 status' },
  { action: 'shipment.ship', entityType: 'shipment', detail: 'Marked shipment as shipped' },
  { action: 'package.release', entityType: 'package', detail: 'Released 3 packages to customer' },
  { action: 'notification.send', entityType: 'notification', detail: 'Sent ID expiration warning' },
  { action: 'customer.create', entityType: 'customer', detail: 'New iPostal customer registered' },
  { action: 'package.check_in', entityType: 'package', detail: 'Checked in UPS extra large package' },
  { action: 'mail.forward', entityType: 'mail', detail: 'Forwarded mail to customer address' },
];

export const auditLog: AuditLogEntry[] = auditActions.map((a, i) => ({
  id: `audit_${String(i + 1).padStart(3, '0')}`,
  action: a.action,
  entityType: a.entityType,
  entityId: `${a.entityType}_${String(i + 1).padStart(3, '0')}`,
  details: a.detail,
  userId: currentUser.id,
  user: currentUser,
  createdAt: hoursAgo(i * 2 + 1),
}));

// ---------------------------------------------------------------------------
// Carrier Rates (10)
// ---------------------------------------------------------------------------
export const carrierRates: CarrierRate[] = [
  { id: 'rate_001', carrier: 'ups', service: 'Ground', wholesaleRate: 8.50, retailRate: 12.99, marginType: 'markup', marginValue: 53, isActive: true, lastUpdated: daysAgo(5) },
  { id: 'rate_002', carrier: 'ups', service: '2-Day Air', wholesaleRate: 18.75, retailRate: 27.99, marginType: 'markup', marginValue: 49, isActive: true, lastUpdated: daysAgo(5) },
  { id: 'rate_003', carrier: 'ups', service: 'Next Day Air', wholesaleRate: 32.00, retailRate: 49.99, marginType: 'markup', marginValue: 56, isActive: true, lastUpdated: daysAgo(5) },
  { id: 'rate_004', carrier: 'fedex', service: 'Ground', wholesaleRate: 8.25, retailRate: 12.49, marginType: 'markup', marginValue: 51, isActive: true, lastUpdated: daysAgo(3) },
  { id: 'rate_005', carrier: 'fedex', service: 'Express', wholesaleRate: 22.50, retailRate: 34.99, marginType: 'markup', marginValue: 56, isActive: true, lastUpdated: daysAgo(3) },
  { id: 'rate_006', carrier: 'fedex', service: 'Overnight', wholesaleRate: 35.00, retailRate: 54.99, marginType: 'markup', marginValue: 57, isActive: true, lastUpdated: daysAgo(3) },
  { id: 'rate_007', carrier: 'usps', service: 'First Class', wholesaleRate: 4.50, retailRate: 6.99, marginType: 'markup', marginValue: 55, isActive: true, lastUpdated: daysAgo(7) },
  { id: 'rate_008', carrier: 'usps', service: 'Priority Mail', wholesaleRate: 9.00, retailRate: 13.99, marginType: 'markup', marginValue: 55, isActive: true, lastUpdated: daysAgo(7) },
  { id: 'rate_009', carrier: 'dhl', service: 'International Economy', wholesaleRate: 28.00, retailRate: 44.99, marginType: 'markup', marginValue: 61, isActive: true, lastUpdated: daysAgo(10) },
  { id: 'rate_010', carrier: 'dhl', service: 'International Express', wholesaleRate: 45.00, retailRate: 69.99, marginType: 'markup', marginValue: 56, isActive: false, lastUpdated: daysAgo(10) },
];

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export const dashboardStats: DashboardStats = {
  packagesCheckedInToday: 14,
  packagesReleasedToday: 9,
  packagesHeld: 37,
  activeCustomers: 26,
  idExpiringSoon: 4,
  shipmentsToday: 6,
  revenueToday: 847.50,
  notificationsSent: 23,
};

// ---------------------------------------------------------------------------
// Recent activity (latest 10 events)
// ---------------------------------------------------------------------------
export const recentActivity = [
  { id: 'act_01', type: 'package_checkin' as const, description: 'Package checked in for PMB-0003 from Amazon', time: hoursAgo(0.5), icon: 'package' as const },
  { id: 'act_02', type: 'notification' as const, description: 'Arrival notification sent to Linda Nakamura', time: hoursAgo(1), icon: 'bell' as const },
  { id: 'act_03', type: 'package_release' as const, description: '2 packages released to David Kim (PMB-0005)', time: hoursAgo(1.5), icon: 'check' as const },
  { id: 'act_04', type: 'shipment' as const, description: 'FedEx Express shipment created for PMB-0010', time: hoursAgo(2), icon: 'truck' as const },
  { id: 'act_05', type: 'mail' as const, description: 'Mail scanned and filed for PMB-0014', time: hoursAgo(2.5), icon: 'mail' as const },
  { id: 'act_06', type: 'customer' as const, description: 'New customer Rachel Green (PMB-0030) registered', time: hoursAgo(3), icon: 'user' as const },
  { id: 'act_07', type: 'package_checkin' as const, description: 'Oversized UPS package checked in for PMB-0001', time: hoursAgo(3.5), icon: 'package' as const },
  { id: 'act_08', type: 'alert' as const, description: 'ID expiring in 3 days for Steven Allen (PMB-0023)', time: hoursAgo(4), icon: 'alert' as const },
  { id: 'act_09', type: 'shipment' as const, description: 'DHL International shipment delivered - PMB-0019', time: hoursAgo(5), icon: 'truck' as const },
  { id: 'act_10', type: 'notification' as const, description: 'Renewal reminder sent to Patricia Williams', time: hoursAgo(6), icon: 'bell' as const },
];

// ---------------------------------------------------------------------------
// Shipping Reconciliation Data
// ---------------------------------------------------------------------------

// Carriers supported for reconciliation: ups, fedex, usps, dhl
const reconServices: Record<string, string[]> = {
  ups: ['Ground', '2nd Day Air', 'Next Day Air', '3 Day Select'],
  fedex: ['Ground', 'Express Saver', 'Overnight', '2Day'],
  usps: ['Priority Mail', 'Priority Mail Express', 'Ground Advantage', 'First Class'],
  dhl: ['International Economy', 'International Express'],
};
const reconDiscrepancies: DiscrepancyType[] = [
  'weight_overcharge', 'service_mismatch', 'duplicate_charge',
  'invalid_surcharge', 'address_correction', 'residential_surcharge', 'late_delivery',
];
const customerNames = [
  'James Morrison', 'Linda Nakamura', 'Robert Singh', 'Maria Gonzalez',
  'David Kim', 'Patricia Williams', 'Michael Brown', 'Jennifer Lee',
  'Thomas Anderson', 'Elizabeth Martinez', 'Sarah Taylor', 'Daniel Harris',
  'Karen Thompson', 'Matthew Garcia', 'Anthony Clark', 'Jessica White',
];

function makeReconItems(carrier: string, count: number, dateOffset: number): ReconciliationItem[] {
  const services = reconServices[carrier] || ['Standard'];
  return Array.from({ length: count }, (_, i) => {
    const isOvercharge = i % 5 < 2;
    const isLate = i % 7 === 3;
    const isUnmatched = i % 11 === 0;
    const isDuplicate = i % 13 === 0;

    const expectedCharge = parseFloat((8 + Math.random() * 52).toFixed(2));
    let billedCharge = expectedCharge;
    let discrepancyType: DiscrepancyType | undefined;
    let status: ReconciliationItemStatus = 'matched';

    if (isDuplicate) {
      billedCharge = expectedCharge * 2;
      discrepancyType = 'duplicate_charge';
      status = 'overcharge';
    } else if (isOvercharge) {
      const overchargeAmount = parseFloat((2 + Math.random() * 15).toFixed(2));
      billedCharge = expectedCharge + overchargeAmount;
      discrepancyType = reconDiscrepancies[Math.floor(Math.random() * 6)] as DiscrepancyType;
      status = 'overcharge';
    } else if (isLate) {
      discrepancyType = 'late_delivery';
      status = 'late_delivery';
    } else if (isUnmatched) {
      status = 'unmatched';
      billedCharge = parseFloat((12 + Math.random() * 40).toFixed(2));
    }

    if (i % 9 === 0 && status === 'overcharge') {
      status = 'disputed';
    }
    if (i % 15 === 0 && status === 'overcharge') {
      status = 'resolved';
    }

    const shipDay = dateOffset + Math.floor(i / 3);
    const service = services[i % services.length];
    const expectedWeight = parseFloat((1 + Math.random() * 25).toFixed(1));

    return {
      id: `recon_${carrier}_${dateOffset}_${String(i + 1).padStart(3, '0')}`,
      trackingNumber: makeTrackingNumber(carrier, 9000 + dateOffset * 100 + i),
      carrier,
      service,
      shipDate: daysAgo(shipDay),
      deliveryDate: daysAgo(shipDay - (isLate ? 0 : 2)),
      guaranteedDate: isLate ? daysAgo(shipDay - 1) : undefined,
      expectedCharge,
      billedCharge,
      difference: parseFloat((billedCharge - expectedCharge).toFixed(2)),
      expectedWeight,
      billedWeight: discrepancyType === 'weight_overcharge'
        ? parseFloat((expectedWeight + 2 + Math.random() * 5).toFixed(1))
        : expectedWeight,
      discrepancyType,
      status,
      customerName: customerNames[i % customerNames.length],
      destination: destinations[i % destinations.length],
      surcharges: discrepancyType === 'invalid_surcharge'
        ? [{ name: 'Delivery Area Surcharge', amount: 4.50 }, { name: 'Extended Area', amount: 3.75 }]
        : discrepancyType === 'residential_surcharge'
        ? [{ name: 'Residential Surcharge', amount: 5.80 }]
        : discrepancyType === 'address_correction'
        ? [{ name: 'Address Correction', amount: 17.00 }]
        : undefined,
    };
  });
}

const run1Items = makeReconItems('ups', 45, 14);
const run2Items = makeReconItems('fedex', 32, 7);
const run3Items = makeReconItems('ups', 50, 21);
const run4Items = makeReconItems('usps', 28, 10);

function summarizeRun(items: ReconciliationItem[]): Omit<ReconciliationRun, 'id' | 'fileName' | 'carrier' | 'uploadedAt' | 'status' | 'items'> {
  const matched = items.filter(i => i.status === 'matched').length;
  const discrepancies = items.filter(i => ['overcharge', 'disputed', 'resolved', 'credited'].includes(i.status)).length;
  const late = items.filter(i => i.status === 'late_delivery').length;
  const unmatched = items.filter(i => i.status === 'unmatched').length;
  const totalBilled = items.reduce((s, i) => s + i.billedCharge, 0);
  const totalExpected = items.reduce((s, i) => s + i.expectedCharge, 0);
  const totalOvercharge = items.filter(i => i.difference > 0).reduce((s, i) => s + i.difference, 0);
  const lateRefund = items.filter(i => i.status === 'late_delivery').reduce((s, i) => s + i.billedCharge, 0);
  return {
    recordsProcessed: items.length,
    matchedCount: matched,
    discrepancyCount: discrepancies,
    lateDeliveryCount: late,
    unmatchedCount: unmatched,
    totalBilled: parseFloat(totalBilled.toFixed(2)),
    totalExpected: parseFloat(totalExpected.toFixed(2)),
    totalOvercharge: parseFloat(totalOvercharge.toFixed(2)),
    potentialRefund: parseFloat((totalOvercharge + lateRefund).toFixed(2)),
  };
}

export const reconciliationRuns: ReconciliationRun[] = [
  { id: 'recon_run_001', fileName: 'UPS_Invoice_Feb_Wk2_2026.xlsx', carrier: 'ups', uploadedAt: daysAgo(1), status: 'completed', items: run1Items, ...summarizeRun(run1Items) },
  { id: 'recon_run_002', fileName: 'FedEx_Invoice_Feb_Wk1_2026.csv', carrier: 'fedex', uploadedAt: daysAgo(4), status: 'completed', items: run2Items, ...summarizeRun(run2Items) },
  { id: 'recon_run_003', fileName: 'UPS_Invoice_Jan_Wk4_2026.xlsx', carrier: 'ups', uploadedAt: daysAgo(8), status: 'completed', items: run3Items, ...summarizeRun(run3Items) },
  { id: 'recon_run_004', fileName: 'USPS_Statement_Feb_2026.csv', carrier: 'usps', uploadedAt: daysAgo(3), status: 'completed', items: run4Items, ...summarizeRun(run4Items) },
];

const allReconItems = [...run1Items, ...run2Items, ...run3Items, ...run4Items];
export const reconciliationStats: ReconciliationStats = {
  totalAudited: allReconItems.length,
  totalDiscrepancies: allReconItems.filter(i => ['overcharge', 'disputed', 'resolved', 'credited', 'late_delivery'].includes(i.status)).length,
  potentialRefunds: parseFloat(reconciliationRuns.reduce((s, r) => s + r.potentialRefund, 0).toFixed(2)),
  successRate: parseFloat((allReconItems.filter(i => i.status === 'matched').length / allReconItems.length * 100).toFixed(1)),
  runsThisMonth: reconciliationRuns.length,
  avgRefundPerRun: parseFloat((reconciliationRuns.reduce((s, r) => s + r.potentialRefund, 0) / reconciliationRuns.length).toFixed(2)),
};

// ---------------------------------------------------------------------------
// Loyalty Program
// ---------------------------------------------------------------------------

export const loyaltyTiers: LoyaltyTier[] = [
  {
    id: 'tier_bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    earningMultiplier: 1.0,
    shippingDiscount: 0,
    freeHoldDays: 0,
    benefits: ['Earn 1 pt / $1 spent', 'Welcome bonus (50 pts)', 'Monthly rewards digest'],
    color: '#CD7F32',
    icon: 'award',
    sortOrder: 0,
  },
  {
    id: 'tier_silver',
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1499,
    earningMultiplier: 1.25,
    shippingDiscount: 5,
    freeHoldDays: 30,
    benefits: ['1.25× earning rate', '5% shipping discount', '30-day free package hold', 'Priority notifications'],
    color: '#C0C0C0',
    icon: 'gem',
    sortOrder: 1,
  },
  {
    id: 'tier_gold',
    name: 'Gold',
    minPoints: 1500,
    maxPoints: null,
    earningMultiplier: 1.5,
    shippingDiscount: 10,
    freeHoldDays: 60,
    benefits: ['1.5× earning rate', '10% shipping discount', '60-day free package hold', 'Priority service', 'Free mail scanning', 'Exclusive member events'],
    color: '#FFD700',
    icon: 'crown',
    sortOrder: 2,
  },
];

export const loyaltyRewards: LoyaltyReward[] = [
  { id: 'rwd_001', name: '$5 Service Credit', description: 'Apply $5 credit toward any ShipOS service', pointsCost: 100, rewardType: 'credit', value: 5, isActive: true, maxRedemptions: null },
  { id: 'rwd_002', name: '$10 Shipping Discount', description: 'Get $10 off your next shipment', pointsCost: 180, rewardType: 'discount', value: 10, isActive: true, maxRedemptions: null },
  { id: 'rwd_003', name: 'Free Package Hold (30 days)', description: 'Waive storage fees for 30 days on one package', pointsCost: 150, rewardType: 'free_service', value: 15, isActive: true, maxRedemptions: null },
  { id: 'rwd_004', name: 'Free Mail Scan (10 pieces)', description: 'Complimentary scanning of up to 10 mail pieces', pointsCost: 80, rewardType: 'free_service', value: 8, isActive: true, maxRedemptions: null },
  { id: 'rwd_005', name: '$25 Shipping Credit', description: 'Major discount on a large shipment', pointsCost: 400, rewardType: 'credit', value: 25, isActive: true, maxRedemptions: null },
  { id: 'rwd_006', name: 'Free Notary Service', description: 'One complimentary notary session', pointsCost: 120, rewardType: 'free_service', value: 12, isActive: true, maxRedemptions: null },
];

export const loyaltyProgram: LoyaltyProgram = {
  id: 'prog_001',
  name: 'ShipOS Rewards',
  isActive: true,
  pointsPerDollar: 1,
  currencyName: 'points',
  redemptionRate: 0.05,
  referralEnabled: true,
  referrerBonusPoints: 200,
  refereeBonusPoints: 100,
  tiers: loyaltyTiers,
  rewards: loyaltyRewards,
};

// Generate loyalty accounts for active customers
const activeCustomers = customers.filter(c => c.status === 'active');

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getTierForPoints(pts: number): LoyaltyTier {
  for (let i = loyaltyTiers.length - 1; i >= 0; i--) {
    if (pts >= loyaltyTiers[i].minPoints) return loyaltyTiers[i];
  }
  return loyaltyTiers[0];
}

const txnTypes: LoyaltyTransaction['type'][] = ['earn', 'earn', 'earn', 'earn', 'earn', 'redeem', 'bonus', 'referral'];
const txnRefTypes = ['shipment', 'package', 'mailbox', 'invoice', 'shipment', 'reward', 'manual', 'referral'];
const txnDescs = [
  'Shipping — FedEx Express',
  'Package receiving fee',
  'Mailbox monthly renewal',
  'Invoice payment',
  'Shipping — USPS Priority',
  'Redeemed: $5 Service Credit',
  'Tier upgrade bonus',
  'Referral bonus — new customer',
];

export const loyaltyAccounts: LoyaltyAccount[] = activeCustomers.map((cust, i) => {
  // Vary points across customers
  const basePoints = [1820, 980, 2450, 340, 1200, 560, 420, 1650, 750, 2100, 280, 1380, 190, 890, 1050, 470, 2300, 620, 1500, 830, 350, 1120, 710, 1900, 260, 1700][i % 26];
  const redeemed = Math.floor(basePoints * 0.2);
  const currentPts = basePoints - redeemed;
  const tier = getTierForPoints(basePoints);

  const txnCount = 5 + (i % 8);
  let runningBalance = 0;
  const transactions: LoyaltyTransaction[] = Array.from({ length: txnCount }, (_, j) => {
    const type = txnTypes[j % txnTypes.length] as LoyaltyTransaction['type'];
    const pts = type === 'redeem' ? -(50 + (j * 10)) : (20 + (j * 15) + (i * 3));
    runningBalance += pts;
    if (runningBalance < 0) runningBalance = 0;
    return {
      id: `txn_${cust.id}_${j}`,
      type,
      points: pts,
      balanceAfter: Math.max(0, runningBalance),
      description: txnDescs[j % txnDescs.length],
      referenceType: txnRefTypes[j % txnRefTypes.length],
      referenceId: `ref_${j}`,
      loyaltyAccountId: `la_${cust.id}`,
      createdAt: daysAgo(txnCount - j + Math.floor(Math.random() * 3)),
    };
  });

  return {
    id: `la_${cust.id}`,
    currentPoints: currentPts,
    lifetimePoints: basePoints,
    referralCode: generateReferralCode(),
    referredById: i > 5 && i % 3 === 0 ? `la_${activeCustomers[i - 1].id}` : null,
    customerId: cust.id,
    customer: cust,
    currentTierId: tier.id,
    currentTier: tier,
    transactions,
    createdAt: cust.dateOpened,
  };
});

export const loyaltyDashboardStats: LoyaltyDashboardStats = {
  totalMembers: loyaltyAccounts.length,
  pointsIssuedThisMonth: loyaltyAccounts.reduce((s, a) =>
    s + a.transactions!.filter(t => t.type === 'earn' || t.type === 'bonus' || t.type === 'referral').reduce((ss, t) => ss + t.points, 0), 0),
  redemptionsThisMonth: loyaltyAccounts.reduce((s, a) =>
    s + a.transactions!.filter(t => t.type === 'redeem').length, 0),
  tierBreakdown: loyaltyTiers.map(tier => ({
    tier: tier.name,
    count: loyaltyAccounts.filter(a => a.currentTierId === tier.id).length,
    color: tier.color,
  })),
  recentActivity: loyaltyAccounts
    .flatMap(a => a.transactions!.map(t => ({ ...t, _custName: `${a.customer!.firstName} ${a.customer!.lastName}` })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15),
  topCustomers: loyaltyAccounts
    .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
    .slice(0, 10)
    .map(a => ({
      name: `${a.customer!.firstName} ${a.customer!.lastName}`,
      points: a.lifetimePoints,
      tier: a.currentTier!.name,
    })),
};

// ---------------------------------------------------------------------------
// Customer Fee Tracking
// ---------------------------------------------------------------------------

const feeCategories: FeeCategory[] = ['storage', 'overage', 'receiving', 'forwarding', 'late_pickup', 'other'];

// Build realistic fee entries for active customers
const feeDescriptions: Record<FeeCategory, string[]> = {
  storage: [
    'Package storage beyond 5-day free period',
    'Oversized package extended storage',
    'Long-term package hold (customer request)',
  ],
  overage: [
    'Monthly package allowance exceeded (10/mo plan)',
    'Mail scan allowance exceeded',
    'Additional mailbox slot usage',
  ],
  receiving: [
    'Oversized package receiving surcharge',
    'Hazardous material handling fee',
    'Multi-package delivery receiving',
  ],
  forwarding: [
    'Mail forwarding — Priority Mail',
    'Package consolidation & forward',
    'International mail forwarding',
  ],
  late_pickup: [
    'Package not picked up within 14-day window',
    'Return-to-sender processing fee',
  ],
  other: [
    'Notarization service fee',
    'Copy/print service',
    'Key replacement fee',
  ],
};

const feeAmounts: Record<FeeCategory, { min: number; max: number }> = {
  storage:     { min: 1.50, max: 25.00 },
  overage:     { min: 2.00, max: 15.00 },
  receiving:   { min: 3.00, max: 10.00 },
  forwarding:  { min: 5.00, max: 35.00 },
  late_pickup: { min: 5.00, max: 20.00 },
  other:       { min: 2.00, max: 25.00 },
};

// Generate fees for each active customer for current month (Feb 2026)
let feeId = 0;
function nextFeeId(): string {
  feeId += 1;
  return `fee_${String(feeId).padStart(4, '0')}`;
}

function roundTo(n: number, d: number): number {
  return Math.round(n * 10 ** d) / 10 ** d;
}

function randomBetween(min: number, max: number): number {
  return roundTo(min + Math.random() * (max - min), 2);
}

// Deterministic-ish fee generation using customer index as seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export const customerFees: CustomerFee[] = [];

const activeCustomerIds = customers
  .filter((c) => c.status === 'active')
  .map((c) => c.id);

activeCustomerIds.forEach((custId, custIdx) => {
  const seed = custIdx + 1;
  const numFees = Math.floor(seededRandom(seed) * 6) + 1; // 1–6 fees per customer

  for (let f = 0; f < numFees; f++) {
    const catSeed = seededRandom(seed * 100 + f);
    const category = feeCategories[Math.floor(catSeed * feeCategories.length)];
    const descs = feeDescriptions[category];
    const description = descs[Math.floor(seededRandom(seed * 200 + f) * descs.length)];
    const range = feeAmounts[category];

    const statusSeed = seededRandom(seed * 300 + f);
    let status: FeeStatus;
    if (statusSeed < 0.35) status = 'accruing';
    else if (statusSeed < 0.55) status = 'finalized';
    else if (statusSeed < 0.7) status = 'invoiced';
    else if (statusSeed < 0.9) status = 'paid';
    else status = 'waived';

    const isDaily = category === 'storage' || category === 'late_pickup';
    const daysAccrued = isDaily ? Math.floor(seededRandom(seed * 400 + f) * 20) + 1 : undefined;
    const dailyRate = isDaily ? roundTo(range.min + seededRandom(seed * 500 + f) * (range.max - range.min) * 0.15, 2) : undefined;
    const amount = isDaily && dailyRate && daysAccrued
      ? roundTo(dailyRate * daysAccrued, 2)
      : roundTo(range.min + seededRandom(seed * 600 + f) * (range.max - range.min), 2);

    // Link some fees to existing packages
    const custPackages = packages.filter((p) => p.customerId === custId);
    const linkedPkg = (category === 'storage' || category === 'receiving' || category === 'late_pickup') && custPackages.length > 0
      ? custPackages[Math.floor(seededRandom(seed * 700 + f) * custPackages.length)]
      : undefined;

    const dayOfMonth = Math.floor(seededRandom(seed * 800 + f) * 21) + 1; // Feb 1–21
    const dateStr = `2026-02-${String(dayOfMonth).padStart(2, '0')}T${String(8 + Math.floor(seededRandom(seed * 900 + f) * 10)).padStart(2, '0')}:${String(Math.floor(seededRandom(seed * 1000 + f) * 60)).padStart(2, '0')}:00.000Z`;

    customerFees.push({
      id: nextFeeId(),
      customerId: custId,
      category,
      description,
      amount,
      status,
      linkedEntityId: linkedPkg?.id,
      linkedEntityType: linkedPkg ? 'package' : undefined,
      linkedEntityLabel: linkedPkg ? `${linkedPkg.carrier.toUpperCase()} — ${linkedPkg.trackingNumber?.slice(-8) ?? 'N/A'}` : undefined,
      accrualType: isDaily ? 'daily' : category === 'overage' ? 'per_item' : 'one_time',
      dailyRate,
      daysAccrued,
      accrualStartDate: dateStr,
      accrualEndDate: status !== 'accruing' ? daysFromNow(0) : undefined,
      createdAt: dateStr,
    });
  }
});

// Build monthly summaries per customer
export function getCustomerFeeSummary(customerId: string, month = '2026-02'): CustomerFeeSummary {
  const fees = customerFees.filter(
    (f) => f.customerId === customerId && f.createdAt.startsWith(month)
  );
  const sumByCategory = (cat: FeeCategory) =>
    fees.filter((f) => f.category === cat && f.status !== 'waived' && f.status !== 'paid').reduce((s, f) => s + f.amount, 0);

  const paidAmount = fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const waivedAmount = fees.filter((f) => f.status === 'waived').reduce((s, f) => s + f.amount, 0);

  const storageFees = sumByCategory('storage');
  const overageFees = sumByCategory('overage');
  const receivingFees = sumByCategory('receiving');
  const forwardingFees = sumByCategory('forwarding');
  const otherFees = sumByCategory('late_pickup') + sumByCategory('other');

  return {
    customerId,
    month,
    totalOwed: roundTo(storageFees + overageFees + receivingFees + forwardingFees + otherFees, 2),
    storageFees: roundTo(storageFees, 2),
    overageFees: roundTo(overageFees, 2),
    receivingFees: roundTo(receivingFees, 2),
    forwardingFees: roundTo(forwardingFees, 2),
    otherFees: roundTo(otherFees, 2),
    paidAmount: roundTo(paidAmount, 2),
    waivedAmount: roundTo(waivedAmount, 2),
    feeCount: fees.length,
    fees: fees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}
