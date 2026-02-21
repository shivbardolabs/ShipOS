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
  { id: 'cust_001', firstName: 'James', lastName: 'Morrison', email: 'james.morrison@email.com', phone: '(555) 234-5001', businessName: 'Morrison Consulting LLC', pmbNumber: 'PMB-0001', platform: 'physical', status: 'active', dateOpened: daysAgo(420), renewalDate: daysFromNow(45), billingTerms: 'Monthly', idType: 'both', idExpiration: daysFromNow(180), passportExpiration: daysFromNow(400), form1583Status: 'approved', form1583Date: daysAgo(380), notifyEmail: true, notifySms: true, packageCount: 12, mailCount: 34 },
  { id: 'cust_002', firstName: 'Linda', lastName: 'Nakamura', email: 'linda.nak@proton.me', phone: '(555) 234-5002', pmbNumber: 'PMB-0002', platform: 'iPostal', status: 'active', dateOpened: daysAgo(310), renewalDate: daysFromNow(55), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(12), form1583Status: 'approved', form1583Date: daysAgo(290), notifyEmail: true, notifySms: false, packageCount: 5, mailCount: 18 },
  { id: 'cust_003', firstName: 'Robert', lastName: 'Singh', email: 'robert.s@gmail.com', phone: '(555) 234-5003', businessName: 'Singh Import/Export', pmbNumber: 'PMB-0003', platform: 'physical', status: 'active', dateOpened: daysAgo(550), renewalDate: daysFromNow(10), billingTerms: 'Annual', idType: 'passport', idExpiration: daysFromNow(90), form1583Status: 'approved', form1583Date: daysAgo(500), notifyEmail: true, notifySms: true, packageCount: 28, mailCount: 67 },
  { id: 'cust_004', firstName: 'Maria', lastName: 'Gonzalez', email: 'mgonzalez@outlook.com', phone: '(555) 234-5004', pmbNumber: 'PMB-0004', platform: 'anytime', status: 'active', dateOpened: daysAgo(200), renewalDate: daysFromNow(165), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(300), form1583Status: 'approved', form1583Date: daysAgo(180), notifyEmail: true, notifySms: true, packageCount: 8, mailCount: 12 },
  { id: 'cust_005', firstName: 'David', lastName: 'Kim', email: 'dkim@techstartup.io', phone: '(555) 234-5005', businessName: 'TechStartup Inc', pmbNumber: 'PMB-0005', platform: 'postscan', status: 'active', dateOpened: daysAgo(150), renewalDate: daysFromNow(215), billingTerms: 'Monthly', idType: 'both', idExpiration: daysFromNow(5), passportExpiration: daysFromNow(600), form1583Status: 'submitted', form1583Date: daysAgo(10), notifyEmail: true, notifySms: false, packageCount: 15, mailCount: 42 },
  { id: 'cust_006', firstName: 'Patricia', lastName: 'Williams', email: 'pat.w@yahoo.com', phone: '(555) 234-5006', pmbNumber: 'PMB-0006', platform: 'physical', status: 'active', dateOpened: daysAgo(365), renewalDate: daysFromNow(0), billingTerms: 'Annual', idType: 'drivers_license', idExpiration: daysFromNow(450), form1583Status: 'approved', form1583Date: daysAgo(340), notifyEmail: true, notifySms: true, packageCount: 3, mailCount: 89 },
  { id: 'cust_007', firstName: 'Michael', lastName: 'Brown', email: 'mbrown@proton.me', phone: '(555) 234-5007', businessName: 'Brown & Associates', pmbNumber: 'PMB-0007', platform: 'iPostal', status: 'active', dateOpened: daysAgo(280), renewalDate: daysFromNow(85), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysAgo(15), form1583Status: 'expired', form1583Date: daysAgo(400), notifyEmail: true, notifySms: false, packageCount: 6, mailCount: 22 },
  { id: 'cust_008', firstName: 'Jennifer', lastName: 'Lee', email: 'jlee@fastmail.com', phone: '(555) 234-5008', pmbNumber: 'PMB-0008', platform: 'anytime', status: 'active', dateOpened: daysAgo(90), renewalDate: daysFromNow(275), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(700), form1583Status: 'approved', form1583Date: daysAgo(85), notifyEmail: false, notifySms: true, packageCount: 2, mailCount: 5 },
  { id: 'cust_009', firstName: 'William', lastName: 'Davis', email: 'wdavis@email.com', phone: '(555) 234-5009', pmbNumber: 'PMB-0009', platform: 'physical', status: 'closed', dateOpened: daysAgo(600), dateClosed: daysAgo(30), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysAgo(60), form1583Status: 'expired', form1583Date: daysAgo(580), notifyEmail: true, notifySms: false, packageCount: 0, mailCount: 0 },
  { id: 'cust_010', firstName: 'Elizabeth', lastName: 'Martinez', email: 'emartinez@gmail.com', phone: '(555) 234-5010', businessName: 'Martinez Legal Services', pmbNumber: 'PMB-0010', platform: 'postscan', status: 'active', dateOpened: daysAgo(400), renewalDate: daysFromNow(30), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(200), passportExpiration: daysFromNow(350), form1583Status: 'approved', form1583Date: daysAgo(370), notifyEmail: true, notifySms: true, packageCount: 19, mailCount: 55 },
  { id: 'cust_011', firstName: 'Thomas', lastName: 'Anderson', email: 'tanderson@neo.io', phone: '(555) 234-5011', pmbNumber: 'PMB-0011', platform: 'physical', status: 'active', dateOpened: daysAgo(180), renewalDate: daysFromNow(185), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(120), form1583Status: 'approved', form1583Date: daysAgo(170), notifyEmail: true, notifySms: true, packageCount: 7, mailCount: 15 },
  { id: 'cust_012', firstName: 'Sarah', lastName: 'Taylor', email: 'staylor@outlook.com', phone: '(555) 234-5012', businessName: 'Taylor Designs', pmbNumber: 'PMB-0012', platform: 'iPostal', status: 'active', dateOpened: daysAgo(250), renewalDate: daysFromNow(115), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(30), form1583Status: 'approved', form1583Date: daysAgo(230), notifyEmail: true, notifySms: false, packageCount: 11, mailCount: 28 },
  { id: 'cust_013', firstName: 'Christopher', lastName: 'Jackson', email: 'cjackson@email.com', phone: '(555) 234-5013', pmbNumber: 'PMB-0013', platform: 'anytime', status: 'suspended', dateOpened: daysAgo(320), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(500), form1583Status: 'pending', notifyEmail: false, notifySms: false, packageCount: 1, mailCount: 3 },
  { id: 'cust_014', firstName: 'Jessica', lastName: 'White', email: 'jwhite@gmail.com', phone: '(555) 234-5014', businessName: 'White Photography', pmbNumber: 'PMB-0014', platform: 'physical', status: 'active', dateOpened: daysAgo(500), renewalDate: daysFromNow(60), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(250), passportExpiration: daysFromNow(100), form1583Status: 'approved', form1583Date: daysAgo(460), notifyEmail: true, notifySms: true, packageCount: 22, mailCount: 47 },
  { id: 'cust_015', firstName: 'Daniel', lastName: 'Harris', email: 'dharris@proton.me', phone: '(555) 234-5015', pmbNumber: 'PMB-0015', platform: 'postscan', status: 'active', dateOpened: daysAgo(70), renewalDate: daysFromNow(295), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(400), form1583Status: 'approved', form1583Date: daysAgo(60), notifyEmail: true, notifySms: true, packageCount: 4, mailCount: 8 },
  { id: 'cust_016', firstName: 'Karen', lastName: 'Thompson', email: 'kthompson@fastmail.com', phone: '(555) 234-5016', pmbNumber: 'PMB-0016', platform: 'physical', status: 'active', dateOpened: daysAgo(440), renewalDate: daysFromNow(25), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(150), form1583Status: 'approved', form1583Date: daysAgo(410), notifyEmail: true, notifySms: false, packageCount: 9, mailCount: 31 },
  { id: 'cust_017', firstName: 'Matthew', lastName: 'Garcia', email: 'mgarcia@yahoo.com', phone: '(555) 234-5017', businessName: 'Garcia Imports', pmbNumber: 'PMB-0017', platform: 'iPostal', status: 'active', dateOpened: daysAgo(190), renewalDate: daysFromNow(175), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(800), form1583Status: 'submitted', form1583Date: daysAgo(5), notifyEmail: true, notifySms: true, packageCount: 14, mailCount: 20 },
  { id: 'cust_018', firstName: 'Nancy', lastName: 'Robinson', email: 'nrobinson@email.com', phone: '(555) 234-5018', pmbNumber: 'PMB-0018', platform: 'anytime', status: 'closed', dateOpened: daysAgo(700), dateClosed: daysAgo(90), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysAgo(200), form1583Status: 'expired', form1583Date: daysAgo(680), notifyEmail: false, notifySms: false, packageCount: 0, mailCount: 0 },
  { id: 'cust_019', firstName: 'Anthony', lastName: 'Clark', email: 'aclark@gmail.com', phone: '(555) 234-5019', businessName: 'Clark Ventures', pmbNumber: 'PMB-0019', platform: 'physical', status: 'active', dateOpened: daysAgo(130), renewalDate: daysFromNow(235), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(100), passportExpiration: daysFromNow(300), form1583Status: 'approved', form1583Date: daysAgo(120), notifyEmail: true, notifySms: true, packageCount: 10, mailCount: 19 },
  { id: 'cust_020', firstName: 'Lisa', lastName: 'Lewis', email: 'llwis@proton.me', phone: '(555) 234-5020', pmbNumber: 'PMB-0020', platform: 'postscan', status: 'active', dateOpened: daysAgo(45), renewalDate: daysFromNow(320), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(500), form1583Status: 'approved', form1583Date: daysAgo(40), notifyEmail: true, notifySms: false, packageCount: 3, mailCount: 6 },
  { id: 'cust_021', firstName: 'Mark', lastName: 'Walker', email: 'mwalker@outlook.com', phone: '(555) 234-5021', businessName: 'Walker Tech Solutions', pmbNumber: 'PMB-0021', platform: 'physical', status: 'active', dateOpened: daysAgo(350), renewalDate: daysFromNow(15), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(60), form1583Status: 'approved', form1583Date: daysAgo(330), notifyEmail: true, notifySms: true, packageCount: 16, mailCount: 44 },
  { id: 'cust_022', firstName: 'Amanda', lastName: 'Hall', email: 'ahall@yahoo.com', phone: '(555) 234-5022', pmbNumber: 'PMB-0022', platform: 'iPostal', status: 'active', dateOpened: daysAgo(210), renewalDate: daysFromNow(155), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(900), form1583Status: 'approved', form1583Date: daysAgo(200), notifyEmail: true, notifySms: true, packageCount: 6, mailCount: 14 },
  { id: 'cust_023', firstName: 'Steven', lastName: 'Allen', email: 'sallen@fastmail.com', phone: '(555) 234-5023', pmbNumber: 'PMB-0023', platform: 'anytime', status: 'active', dateOpened: daysAgo(160), renewalDate: daysFromNow(205), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(3), form1583Status: 'approved', form1583Date: daysAgo(150), notifyEmail: true, notifySms: false, packageCount: 5, mailCount: 9 },
  { id: 'cust_024', firstName: 'Donna', lastName: 'Young', email: 'dyoung@email.com', phone: '(555) 234-5024', businessName: 'Young Realty Group', pmbNumber: 'PMB-0024', platform: 'physical', status: 'active', dateOpened: daysAgo(480), renewalDate: daysFromNow(50), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(350), passportExpiration: daysFromNow(200), form1583Status: 'approved', form1583Date: daysAgo(450), notifyEmail: true, notifySms: true, packageCount: 20, mailCount: 60 },
  { id: 'cust_025', firstName: 'Paul', lastName: 'King', email: 'pking@gmail.com', phone: '(555) 234-5025', pmbNumber: 'PMB-0025', platform: 'postscan', status: 'suspended', dateOpened: daysAgo(300), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysAgo(45), form1583Status: 'expired', form1583Date: daysAgo(400), notifyEmail: false, notifySms: false, packageCount: 2, mailCount: 0 },
  { id: 'cust_026', firstName: 'Emily', lastName: 'Wright', email: 'ewright@proton.me', phone: '(555) 234-5026', businessName: 'Wright & Reed Attorneys', pmbNumber: 'PMB-0026', platform: 'physical', status: 'active', dateOpened: daysAgo(260), renewalDate: daysFromNow(105), billingTerms: 'Quarterly', idType: 'drivers_license', idExpiration: daysFromNow(220), form1583Status: 'approved', form1583Date: daysAgo(240), notifyEmail: true, notifySms: true, packageCount: 8, mailCount: 36 },
  { id: 'cust_027', firstName: 'Andrew', lastName: 'Lopez', email: 'alopez@outlook.com', phone: '(555) 234-5027', pmbNumber: 'PMB-0027', platform: 'iPostal', status: 'active', dateOpened: daysAgo(110), renewalDate: daysFromNow(255), billingTerms: 'Monthly', idType: 'passport', idExpiration: daysFromNow(650), form1583Status: 'approved', form1583Date: daysAgo(100), notifyEmail: true, notifySms: false, packageCount: 4, mailCount: 11 },
  { id: 'cust_028', firstName: 'Michelle', lastName: 'Hill', email: 'mhill@yahoo.com', phone: '(555) 234-5028', pmbNumber: 'PMB-0028', platform: 'anytime', status: 'active', dateOpened: daysAgo(80), renewalDate: daysFromNow(285), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(380), form1583Status: 'approved', form1583Date: daysAgo(75), notifyEmail: true, notifySms: true, packageCount: 3, mailCount: 7 },
  { id: 'cust_029', firstName: 'Kevin', lastName: 'Scott', email: 'kscott@fastmail.com', phone: '(555) 234-5029', businessName: 'Scott Digital Media', pmbNumber: 'PMB-0029', platform: 'physical', status: 'active', dateOpened: daysAgo(230), renewalDate: daysFromNow(135), billingTerms: 'Annual', idType: 'both', idExpiration: daysFromNow(170), passportExpiration: daysFromNow(500), form1583Status: 'approved', form1583Date: daysAgo(210), notifyEmail: true, notifySms: true, packageCount: 13, mailCount: 29 },
  { id: 'cust_030', firstName: 'Rachel', lastName: 'Green', email: 'rgreen@email.com', phone: '(555) 234-5030', pmbNumber: 'PMB-0030', platform: 'postscan', status: 'active', dateOpened: daysAgo(25), renewalDate: daysFromNow(340), billingTerms: 'Monthly', idType: 'drivers_license', idExpiration: daysFromNow(600), form1583Status: 'pending', form1583Date: daysAgo(20), notifyEmail: true, notifySms: true, packageCount: 1, mailCount: 2 },
];

// ---------------------------------------------------------------------------
// Packages (60)
// ---------------------------------------------------------------------------
const carriers = ['amazon', 'ups', 'fedex', 'usps', 'dhl', 'ups', 'fedex', 'amazon', 'usps', 'ups'];
const packageTypes: Package['packageType'][] = ['letter', 'small', 'medium', 'large', 'oversized'];
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
    receivingFee: pType === 'oversized' ? 7.5 : pType === 'large' ? 5.0 : 3.0,
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
  const subjectMap: Record<string, string> = {
    package_arrival: 'You have a new package!',
    package_reminder: 'Package pickup reminder',
    mail_received: 'New mail received at your PMB',
    id_expiring: 'Action required: Your ID is expiring soon',
    renewal_reminder: 'Mailbox renewal reminder',
    shipment_update: 'Shipment tracking update',
    welcome: 'Welcome to ShipOS!',
  };

  return {
    id: `notif_${String(i + 1).padStart(3, '0')}`,
    type,
    channel: notifChannels[i % notifChannels.length],
    status,
    subject: subjectMap[type] || 'Notification',
    body: `Notification body for ${type} sent to ${customers[custIdx].firstName} ${customers[custIdx].lastName}`,
    customerId: customers[custIdx].id,
    customer: customers[custIdx],
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
  { action: 'package.check_in', entityType: 'package', detail: 'Checked in UPS oversized package' },
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
