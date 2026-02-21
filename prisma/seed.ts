import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrackingNumber(carrier: string): string {
  const prefix: Record<string, string> = {
    ups: "1Z",
    fedex: "7489",
    usps: "9400",
    dhl: "JD01",
    amazon: "TBA",
    walmart: "WM",
    target: "TGT",
  };
  const pfx = prefix[carrier] || "";
  const digits = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return `${pfx}${digits}`;
}

async function main() {
  console.log("🌱 Seeding ShipOS database...\n");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mailPiece.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.package.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.carrierRate.deleteMany();
  await prisma.dropoffSetting.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.endOfDayRecord.deleteMany();

  // ── Users ─────────────────────────────────────────────────────────────
  console.log("👤 Creating users...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Marcus Rivera",
        email: "marcus@shipos.com",
        password: "hashed_admin_password_placeholder",
        role: "admin",
        avatar: null,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Chen",
        email: "sarah@shipos.com",
        password: "hashed_manager_password_placeholder",
        role: "manager",
        avatar: null,
      },
    }),
    prisma.user.create({
      data: {
        name: "David Park",
        email: "david@shipos.com",
        password: "hashed_employee_password_placeholder",
        role: "employee",
        avatar: null,
      },
    }),
  ]);
  console.log(`   ✅ Created ${users.length} users`);

  // ── Customers ─────────────────────────────────────────────────────────
  console.log("👥 Creating customers...");
  const customerData = [
    // Active physical customers
    {
      firstName: "James",
      lastName: "Morrison",
      email: "james.morrison@gmail.com",
      phone: "555-0101",
      pmbNumber: "PMB-1001",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2027-08-15"),
      form1583Status: "approved",
      form1583Date: new Date("2024-01-15"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-06-01"),
      billingTerms: "monthly",
    },
    {
      firstName: "Patricia",
      lastName: "Nguyen",
      email: "p.nguyen@outlook.com",
      phone: "555-0102",
      pmbNumber: "PMB-1002",
      platform: "physical",
      status: "active",
      businessName: "Nguyen Consulting LLC",
      idType: "both",
      idExpiration: new Date("2026-03-20"),
      passportExpiration: new Date("2028-11-30"),
      form1583Status: "approved",
      form1583Date: new Date("2023-11-20"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-05-15"),
      billingTerms: "quarterly",
    },
    {
      firstName: "Robert",
      lastName: "Johnson",
      email: "rjohnson@proton.me",
      phone: "555-0103",
      pmbNumber: "PMB-1003",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2026-12-01"),
      form1583Status: "approved",
      form1583Date: new Date("2024-06-10"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-09-01"),
      billingTerms: "annual",
    },
    {
      firstName: "Maria",
      lastName: "Gonzalez",
      email: "maria.g@yahoo.com",
      phone: "555-0104",
      pmbNumber: "PMB-1004",
      platform: "physical",
      status: "active",
      businessName: "MG Design Studio",
      idType: "passport",
      idExpiration: null,
      passportExpiration: new Date("2029-04-15"),
      form1583Status: "approved",
      form1583Date: new Date("2024-02-28"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-08-01"),
      billingTerms: "monthly",
    },
    {
      firstName: "William",
      lastName: "Chang",
      email: "will.chang@icloud.com",
      phone: "555-0105",
      pmbNumber: "PMB-1005",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2027-02-28"),
      form1583Status: "approved",
      form1583Date: new Date("2023-09-05"),
      notifyEmail: false,
      notifySms: true,
      renewalDate: new Date("2026-03-15"),
      billingTerms: "monthly",
    },
    // iPostal customers
    {
      firstName: "Emily",
      lastName: "Taylor",
      email: "emily.t@gmail.com",
      phone: "555-0106",
      pmbNumber: "PMB-2001",
      platform: "iPostal",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2028-01-10"),
      form1583Status: "approved",
      form1583Date: new Date("2024-04-12"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-04-12"),
      billingTerms: "monthly",
    },
    {
      firstName: "Michael",
      lastName: "Brown",
      email: "m.brown@hotmail.com",
      phone: "555-0107",
      pmbNumber: "PMB-2002",
      platform: "iPostal",
      status: "active",
      businessName: "Brown & Associates",
      idType: "both",
      idExpiration: new Date("2026-09-15"),
      passportExpiration: new Date("2030-06-20"),
      form1583Status: "approved",
      form1583Date: new Date("2024-07-01"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-07-01"),
      billingTerms: "monthly",
    },
    {
      firstName: "Jessica",
      lastName: "Davis",
      email: "jess.davis@gmail.com",
      phone: "555-0108",
      pmbNumber: "PMB-2003",
      platform: "iPostal",
      status: "active",
      idType: "passport",
      passportExpiration: new Date("2027-11-05"),
      form1583Status: "submitted",
      form1583Date: new Date("2025-01-15"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2027-01-15"),
      billingTerms: "annual",
    },
    // Anytime Mailbox customers
    {
      firstName: "Daniel",
      lastName: "Wilson",
      email: "dan.wilson@gmail.com",
      phone: "555-0109",
      pmbNumber: "PMB-3001",
      platform: "anytime",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2027-05-20"),
      form1583Status: "approved",
      form1583Date: new Date("2023-12-01"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-12-01"),
      billingTerms: "quarterly",
    },
    {
      firstName: "Amanda",
      lastName: "Martinez",
      email: "a.martinez@outlook.com",
      phone: "555-0110",
      pmbNumber: "PMB-3002",
      platform: "anytime",
      status: "active",
      businessName: "Martinez Legal Services",
      idType: "drivers_license",
      idExpiration: new Date("2028-03-10"),
      form1583Status: "approved",
      form1583Date: new Date("2024-03-15"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-03-15"),
      billingTerms: "monthly",
    },
    // PostScan customers
    {
      firstName: "Christopher",
      lastName: "Lee",
      email: "c.lee@pm.me",
      phone: "555-0111",
      pmbNumber: "PMB-4001",
      platform: "postscan",
      status: "active",
      idType: "both",
      idExpiration: new Date("2027-07-25"),
      passportExpiration: new Date("2029-01-15"),
      form1583Status: "approved",
      form1583Date: new Date("2024-08-20"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-08-20"),
      billingTerms: "monthly",
    },
    {
      firstName: "Ashley",
      lastName: "Thomas",
      email: "ashley.t@gmail.com",
      phone: "555-0112",
      pmbNumber: "PMB-4002",
      platform: "postscan",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2026-06-30"),
      form1583Status: "approved",
      form1583Date: new Date("2024-05-10"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-05-10"),
      billingTerms: "quarterly",
    },
    // Customers with expiring IDs (for compliance alerts)
    {
      firstName: "Kevin",
      lastName: "Anderson",
      email: "kevin.a@gmail.com",
      phone: "555-0113",
      pmbNumber: "PMB-1006",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2026-03-15"), // Expiring soon!
      form1583Status: "approved",
      form1583Date: new Date("2023-05-20"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-05-20"),
      billingTerms: "monthly",
    },
    {
      firstName: "Stephanie",
      lastName: "White",
      email: "steph.white@yahoo.com",
      phone: "555-0114",
      pmbNumber: "PMB-1007",
      platform: "physical",
      status: "active",
      idType: "passport",
      passportExpiration: new Date("2026-04-01"), // Expiring soon!
      form1583Status: "expired",
      form1583Date: new Date("2022-04-01"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-04-01"),
      billingTerms: "monthly",
      notes: "Needs to renew 1583 form - passport expiring",
    },
    // Suspended customer
    {
      firstName: "Brandon",
      lastName: "Clark",
      email: "b.clark@gmail.com",
      phone: "555-0115",
      pmbNumber: "PMB-1008",
      platform: "physical",
      status: "suspended",
      idType: "drivers_license",
      idExpiration: new Date("2027-10-10"),
      form1583Status: "approved",
      form1583Date: new Date("2024-01-10"),
      notifyEmail: false,
      notifySms: false,
      notes: "Suspended for non-payment since Jan 2026",
    },
    // Closed customers
    {
      firstName: "Rachel",
      lastName: "Harris",
      email: "r.harris@outlook.com",
      phone: "555-0116",
      pmbNumber: "PMB-1009",
      platform: "physical",
      status: "closed",
      dateClosed: new Date("2025-12-31"),
      idType: "drivers_license",
      idExpiration: new Date("2027-04-15"),
      form1583Status: "approved",
      form1583Date: new Date("2023-06-15"),
      notifyEmail: false,
      notifySms: false,
    },
    {
      firstName: "Jason",
      lastName: "Lewis",
      email: "jason.lewis@proton.me",
      phone: "555-0117",
      pmbNumber: "PMB-1010",
      platform: "physical",
      status: "closed",
      dateClosed: new Date("2025-11-15"),
      idType: "both",
      idExpiration: new Date("2028-02-20"),
      passportExpiration: new Date("2030-08-10"),
      form1583Status: "approved",
      form1583Date: new Date("2024-02-01"),
      notifyEmail: false,
      notifySms: false,
    },
    // More active customers
    {
      firstName: "Nicole",
      lastName: "Robinson",
      email: "nicole.r@gmail.com",
      phone: "555-0118",
      pmbNumber: "PMB-1011",
      platform: "physical",
      status: "active",
      businessName: "Robinson Photography",
      idType: "drivers_license",
      idExpiration: new Date("2028-06-15"),
      form1583Status: "approved",
      form1583Date: new Date("2024-09-10"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-09-10"),
      billingTerms: "monthly",
    },
    {
      firstName: "Tyler",
      lastName: "Walker",
      email: "t.walker@fastmail.com",
      phone: "555-0119",
      pmbNumber: "PMB-1012",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2029-01-20"),
      form1583Status: "approved",
      form1583Date: new Date("2024-10-05"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-10-05"),
      billingTerms: "annual",
    },
    {
      firstName: "Lauren",
      lastName: "Hall",
      email: "lauren.hall@gmail.com",
      phone: "555-0120",
      pmbNumber: "PMB-2004",
      platform: "iPostal",
      status: "active",
      businessName: "Hall Digital Marketing",
      idType: "drivers_license",
      idExpiration: new Date("2027-12-01"),
      form1583Status: "approved",
      form1583Date: new Date("2024-06-20"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-06-20"),
      billingTerms: "monthly",
    },
    {
      firstName: "Andrew",
      lastName: "Young",
      email: "a.young@yahoo.com",
      phone: "555-0121",
      pmbNumber: "PMB-3003",
      platform: "anytime",
      status: "active",
      idType: "passport",
      passportExpiration: new Date("2031-03-15"),
      form1583Status: "approved",
      form1583Date: new Date("2024-11-01"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-11-01"),
      billingTerms: "quarterly",
    },
    {
      firstName: "Megan",
      lastName: "King",
      email: "megan.k@icloud.com",
      phone: "555-0122",
      pmbNumber: "PMB-1013",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2027-09-10"),
      form1583Status: "pending",
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-07-15"),
      billingTerms: "monthly",
      notes: "New customer - waiting for 1583 approval",
    },
    {
      firstName: "Joshua",
      lastName: "Wright",
      email: "josh.wright@gmail.com",
      phone: "555-0123",
      pmbNumber: "PMB-4003",
      platform: "postscan",
      status: "active",
      businessName: "Wright Engineering Co",
      idType: "both",
      idExpiration: new Date("2028-04-20"),
      passportExpiration: new Date("2030-10-01"),
      form1583Status: "approved",
      form1583Date: new Date("2024-07-15"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-07-15"),
      billingTerms: "monthly",
    },
    {
      firstName: "Samantha",
      lastName: "Lopez",
      email: "sam.lopez@outlook.com",
      phone: "555-0124",
      pmbNumber: "PMB-1014",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2028-08-30"),
      form1583Status: "approved",
      form1583Date: new Date("2024-12-01"),
      notifyEmail: true,
      notifySms: false,
      renewalDate: new Date("2026-12-01"),
      billingTerms: "monthly",
    },
    {
      firstName: "Ryan",
      lastName: "Scott",
      email: "ryan.scott@pm.me",
      phone: "555-0125",
      pmbNumber: "PMB-2005",
      platform: "iPostal",
      status: "active",
      businessName: "Scott Ventures LLC",
      idType: "drivers_license",
      idExpiration: new Date("2029-05-15"),
      form1583Status: "approved",
      form1583Date: new Date("2025-01-10"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2027-01-10"),
      billingTerms: "annual",
    },
    {
      firstName: "Olivia",
      lastName: "Green",
      email: "olivia.green@gmail.com",
      phone: "555-0126",
      pmbNumber: "PMB-1015",
      platform: "physical",
      status: "active",
      idType: "drivers_license",
      idExpiration: new Date("2026-02-28"), // Expiring very soon!
      form1583Status: "approved",
      form1583Date: new Date("2023-02-28"),
      notifyEmail: true,
      notifySms: true,
      renewalDate: new Date("2026-02-28"),
      billingTerms: "monthly",
      notes: "URGENT: ID expiring this month",
    },
  ];

  const customers = await Promise.all(
    customerData.map((data) => prisma.customer.create({ data }))
  );
  console.log(`   ✅ Created ${customers.length} customers`);

  // ── Packages ──────────────────────────────────────────────────────────
  console.log("📦 Creating packages...");
  const carriers = [
    "amazon",
    "ups",
    "fedex",
    "usps",
    "dhl",
    "walmart",
    "target",
    "other",
  ];
  const packageTypes = ["letter", "small", "medium", "large", "oversized"];
  const packageStatuses = [
    "checked_in",
    "checked_in",
    "checked_in",
    "notified",
    "notified",
    "ready",
    "released",
    "released",
    "released",
    "returned",
  ];
  const conditions = [null, null, null, "good", "damaged", "wet", null];

  const activeCustomers = customers.filter(
    (c) => c.status === "active" || c.status === "suspended"
  );

  const packageData = [];
  for (let i = 0; i < 55; i++) {
    const carrier = randomElement(carriers);
    const status = randomElement(packageStatuses);
    const checkedInAt = randomDate(new Date("2026-01-01"), new Date());

    packageData.push({
      trackingNumber: Math.random() > 0.1 ? generateTrackingNumber(carrier) : null,
      carrier,
      senderName:
        Math.random() > 0.3
          ? randomElement([
              "Amazon.com",
              "Apple Inc",
              "Best Buy",
              "Chewy.com",
              "eBay Seller",
              "Etsy Shop",
              "Home Depot",
              "IKEA",
              "Nike",
              "Samsung",
              "Shopify Store",
              "Target.com",
              "Walmart",
              "Wayfair",
              "Zara",
            ])
          : null,
      packageType: randomElement(packageTypes),
      status,
      hazardous: Math.random() < 0.02,
      perishable: Math.random() < 0.05,
      notes:
        Math.random() > 0.8
          ? randomElement([
              "Fragile - handle with care",
              "Customer requested hold",
              "Large box - stored in back",
              "Signature required on release",
              "Second delivery attempt",
            ])
          : null,
      condition: randomElement(conditions),
      storageFee:
        status === "checked_in" && Math.random() > 0.7
          ? parseFloat((Math.random() * 5).toFixed(2))
          : 0,
      receivingFee: parseFloat((Math.random() * 3).toFixed(2)),
      quotaFee: Math.random() > 0.8 ? parseFloat((Math.random() * 2).toFixed(2)) : 0,
      checkedInAt,
      notifiedAt:
        ["notified", "ready", "released", "returned"].includes(status)
          ? new Date(checkedInAt.getTime() + 1000 * 60 * 30)
          : null,
      releasedAt:
        ["released", "returned"].includes(status)
          ? new Date(
              checkedInAt.getTime() + 1000 * 60 * 60 * (Math.random() * 72 + 1)
            )
          : null,
      customerId: randomElement(activeCustomers).id,
      checkedInById: randomElement(users).id,
      checkedOutById: ["released", "returned"].includes(status)
        ? randomElement(users).id
        : null,
    });
  }

  const packages = await Promise.all(
    packageData.map((data) => prisma.package.create({ data }))
  );
  console.log(`   ✅ Created ${packages.length} packages`);

  // ── Mail Pieces ───────────────────────────────────────────────────────
  console.log("✉️  Creating mail pieces...");
  const mailTypes = ["letter", "magazine", "catalog", "legal", "other"];
  const mailStatuses = [
    "received",
    "received",
    "scanned",
    "notified",
    "held",
    "forwarded",
    "discarded",
  ];
  const mailActions = [null, "hold", "forward", "discard", "open_scan"];
  const senders = [
    "IRS",
    "State Tax Board",
    "Bank of America",
    "Chase Bank",
    "Geico Insurance",
    "AT&T",
    "Verizon",
    "City of Sacramento",
    "DMV",
    "Social Security Admin",
    "Medicare",
    "Stanford University",
    "Amazon",
    "American Express",
    "Fidelity Investments",
    null,
  ];

  const mailData = [];
  for (let i = 0; i < 25; i++) {
    const status = randomElement(mailStatuses);
    const receivedAt = randomDate(new Date("2026-01-15"), new Date());

    mailData.push({
      type: randomElement(mailTypes),
      sender: randomElement(senders),
      status,
      scanImage: status === "scanned" ? `/scans/mail_${i + 1}.jpg` : null,
      action: ["held", "forwarded", "discarded"].includes(status)
        ? randomElement(mailActions.filter(Boolean))
        : null,
      notes:
        Math.random() > 0.85
          ? randomElement([
              "Certified mail - signature obtained",
              "Customer requested scan",
              "Forward to home address",
              "Looks like junk mail",
            ])
          : null,
      customerId: randomElement(activeCustomers).id,
      receivedAt,
      actionAt: ["held", "forwarded", "discarded"].includes(status)
        ? new Date(receivedAt.getTime() + 1000 * 60 * 60 * 24)
        : null,
    });
  }

  const mailPieces = await Promise.all(
    mailData.map((data) => prisma.mailPiece.create({ data }))
  );
  console.log(`   ✅ Created ${mailPieces.length} mail pieces`);

  // ── Shipments ─────────────────────────────────────────────────────────
  console.log("🚚 Creating shipments...");
  const shipmentCarriers = ["ups", "fedex", "usps", "dhl"];
  const services: Record<string, string[]> = {
    ups: ["Ground", "2nd Day Air", "Next Day Air", "3 Day Select"],
    fedex: [
      "Ground",
      "Express Saver",
      "2Day",
      "Priority Overnight",
      "Standard Overnight",
    ],
    usps: [
      "Priority Mail",
      "Priority Mail Express",
      "First Class",
      "Media Mail",
      "Ground Advantage",
    ],
    dhl: ["Express Worldwide", "Express 12:00", "Economy Select"],
  };
  const shipmentStatuses = [
    "pending",
    "label_created",
    "shipped",
    "shipped",
    "delivered",
    "delivered",
    "delivered",
  ];
  const paymentStatuses = ["unpaid", "paid", "paid", "paid", "invoiced"];
  const destinations = [
    "New York, NY 10001",
    "Los Angeles, CA 90001",
    "Chicago, IL 60601",
    "Houston, TX 77001",
    "Phoenix, AZ 85001",
    "Philadelphia, PA 19101",
    "San Antonio, TX 78201",
    "San Diego, CA 92101",
    "Dallas, TX 75201",
    "Miami, FL 33101",
    "Portland, OR 97201",
    "Denver, CO 80201",
    "Seattle, WA 98101",
    "Boston, MA 02101",
    "Nashville, TN 37201",
    "London, UK EC1A 1BB",
    "Toronto, ON M5H 2N2",
  ];

  const shipmentData = [];
  for (let i = 0; i < 18; i++) {
    const carrier = randomElement(shipmentCarriers);
    const service = randomElement(services[carrier]);
    const status = randomElement(shipmentStatuses);
    const wholesale = parseFloat((Math.random() * 40 + 5).toFixed(2));
    const markup = 1.2 + Math.random() * 0.4;

    shipmentData.push({
      carrier,
      service,
      trackingNumber:
        status !== "pending" ? generateTrackingNumber(carrier) : null,
      destination: randomElement(destinations),
      weight: parseFloat((Math.random() * 50 + 0.5).toFixed(1)),
      dimensions: `${Math.floor(Math.random() * 24 + 6)}x${Math.floor(Math.random() * 18 + 4)}x${Math.floor(Math.random() * 12 + 2)}`,
      wholesaleCost: wholesale,
      retailPrice: parseFloat((wholesale * markup).toFixed(2)),
      insuranceCost:
        Math.random() > 0.6
          ? parseFloat((Math.random() * 10 + 1).toFixed(2))
          : 0,
      packingCost:
        Math.random() > 0.5
          ? parseFloat((Math.random() * 8 + 2).toFixed(2))
          : 0,
      status,
      paymentStatus: randomElement(paymentStatuses),
      customerId: randomElement(activeCustomers).id,
      shippedAt:
        ["shipped", "delivered"].includes(status)
          ? randomDate(new Date("2026-01-15"), new Date())
          : null,
      deliveredAt:
        status === "delivered"
          ? randomDate(new Date("2026-02-01"), new Date())
          : null,
    });
  }

  const shipments = await Promise.all(
    shipmentData.map((data) => prisma.shipment.create({ data }))
  );
  console.log(`   ✅ Created ${shipments.length} shipments`);

  // ── Notifications ─────────────────────────────────────────────────────
  console.log("🔔 Creating notifications...");
  const notifTypes = [
    "package_checkin",
    "package_checkin",
    "package_checkin",
    "package_reminder",
    "id_expiration",
    "mail_received",
    "custom",
  ];
  const notifChannels = ["email", "sms", "both"];
  const notifStatuses = [
    "pending",
    "sent",
    "sent",
    "delivered",
    "delivered",
    "delivered",
    "failed",
    "bounced",
  ];

  const notificationData = [];
  for (let i = 0; i < 35; i++) {
    const type = randomElement(notifTypes);
    const status = randomElement(notifStatuses);
    const createdAt = randomDate(new Date("2026-01-01"), new Date());

    const subjects: Record<string, string> = {
      package_checkin: "📦 New package received at your PMB",
      package_reminder: "⏰ Package pickup reminder",
      id_expiration: "⚠️ Your ID is expiring soon",
      mail_received: "✉️ New mail received",
      custom: "ShipOS Notification",
    };

    notificationData.push({
      type,
      channel: randomElement(notifChannels),
      status,
      subject: subjects[type],
      body: `Notification for ${type.replace(/_/g, " ")}. Please check your ShipOS account for details.`,
      customerId: randomElement(activeCustomers).id,
      sentAt: ["sent", "delivered", "bounced"].includes(status)
        ? new Date(createdAt.getTime() + 1000 * 60 * 2)
        : null,
      deliveredAt:
        status === "delivered"
          ? new Date(createdAt.getTime() + 1000 * 60 * 5)
          : null,
      createdAt,
    });
  }

  const notifications = await Promise.all(
    notificationData.map((data) => prisma.notification.create({ data }))
  );
  console.log(`   ✅ Created ${notifications.length} notifications`);

  // ── Audit Logs ────────────────────────────────────────────────────────
  console.log("📋 Creating audit logs...");
  const auditActions = [
    "package_checkin",
    "package_release",
    "customer_update",
    "customer_create",
    "shipment_create",
    "shipment_update",
    "mail_received",
    "notification_sent",
    "settings_update",
    "user_login",
  ];

  const auditData = [];
  for (let i = 0; i < 15; i++) {
    const action = randomElement(auditActions);
    const entityType = action.split("_")[0];
    let entityId: string;

    if (entityType === "package" && packages.length > 0) {
      entityId = randomElement(packages).id;
    } else if (entityType === "customer" && customers.length > 0) {
      entityId = randomElement(activeCustomers).id;
    } else if (entityType === "shipment" && shipments.length > 0) {
      entityId = randomElement(shipments).id;
    } else {
      entityId = `entity_${i}`;
    }

    auditData.push({
      action,
      entityType,
      entityId,
      details: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        changes:
          action.includes("update")
            ? { field: "status", from: "active", to: "updated" }
            : null,
      }),
      userId: randomElement(users).id,
      createdAt: randomDate(new Date("2026-01-01"), new Date()),
    });
  }

  const auditLogs = await Promise.all(
    auditData.map((data) => prisma.auditLog.create({ data }))
  );
  console.log(`   ✅ Created ${auditLogs.length} audit logs`);

  // ── Carrier Rates ─────────────────────────────────────────────────────
  console.log("💰 Creating carrier rates...");
  const carrierRateData = [
    // UPS Rates
    {
      carrier: "UPS",
      service: "Ground",
      wholesaleRate: 8.5,
      retailRate: 12.75,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "UPS",
      service: "2nd Day Air",
      wholesaleRate: 15.25,
      retailRate: 22.88,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "UPS",
      service: "Next Day Air",
      wholesaleRate: 28.5,
      retailRate: 42.75,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "UPS",
      service: "3 Day Select",
      wholesaleRate: 11.75,
      retailRate: 17.63,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    // FedEx Rates
    {
      carrier: "FedEx",
      service: "Ground",
      wholesaleRate: 8.25,
      retailRate: 12.38,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "FedEx",
      service: "Express Saver",
      wholesaleRate: 14.0,
      retailRate: 21.0,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "FedEx",
      service: "2Day",
      wholesaleRate: 18.5,
      retailRate: 27.75,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "FedEx",
      service: "Priority Overnight",
      wholesaleRate: 32.0,
      retailRate: 48.0,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    // USPS Rates
    {
      carrier: "USPS",
      service: "Priority Mail",
      wholesaleRate: 7.5,
      retailRate: 10.5,
      marginType: "markup",
      marginValue: 40,
      isActive: true,
    },
    {
      carrier: "USPS",
      service: "Priority Mail Express",
      wholesaleRate: 22.0,
      retailRate: 30.8,
      marginType: "markup",
      marginValue: 40,
      isActive: true,
    },
    {
      carrier: "USPS",
      service: "First Class",
      wholesaleRate: 4.5,
      retailRate: 6.3,
      marginType: "markup",
      marginValue: 40,
      isActive: true,
    },
    {
      carrier: "USPS",
      service: "Ground Advantage",
      wholesaleRate: 5.75,
      retailRate: 8.05,
      marginType: "markup",
      marginValue: 40,
      isActive: true,
    },
    // DHL Rates
    {
      carrier: "DHL",
      service: "Express Worldwide",
      wholesaleRate: 35.0,
      retailRate: 52.5,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
    {
      carrier: "DHL",
      service: "Economy Select",
      wholesaleRate: 18.0,
      retailRate: 27.0,
      marginType: "markup",
      marginValue: 50,
      isActive: true,
    },
  ];

  const carrierRates = await Promise.all(
    carrierRateData.map((data) => prisma.carrierRate.create({ data }))
  );
  console.log(`   ✅ Created ${carrierRates.length} carrier rates`);

  // ── Dropoff Settings ──────────────────────────────────────────────────
  console.log("📍 Creating dropoff settings...");
  const dropoffData = [
    {
      carrier: "UPS",
      isEnabled: true,
      compensationAmount: 1.25,
      retailCharge: 2.0,
      department: "Shipping",
    },
    {
      carrier: "FedEx",
      isEnabled: true,
      compensationAmount: 1.0,
      retailCharge: 1.75,
      department: "Shipping",
    },
    {
      carrier: "USPS",
      isEnabled: true,
      compensationAmount: 0.75,
      retailCharge: 1.5,
      department: "Shipping",
    },
    {
      carrier: "DHL",
      isEnabled: false,
      compensationAmount: 1.5,
      retailCharge: 2.5,
      department: "International",
    },
    {
      carrier: "Amazon",
      isEnabled: true,
      compensationAmount: 0.5,
      retailCharge: 0,
      department: "Returns",
    },
  ];

  const dropoffSettings = await Promise.all(
    dropoffData.map((data) => prisma.dropoffSetting.create({ data }))
  );
  console.log(`   ✅ Created ${dropoffSettings.length} dropoff settings`);

  // ── Invoices ──────────────────────────────────────────────────────────
  console.log("🧾 Creating invoices...");
  const invoiceData = [];
  for (let i = 1; i <= 8; i++) {
    const types = ["shipping", "storage", "service"];
    const statuses = ["draft", "sent", "paid", "paid", "paid", "overdue"];
    const status = randomElement(statuses);
    const amount = parseFloat((Math.random() * 200 + 10).toFixed(2));

    invoiceData.push({
      invoiceNumber: `INV-2026-${String(i).padStart(4, "0")}`,
      customerId: randomElement(activeCustomers).id,
      type: randomElement(types),
      amount,
      tax: parseFloat((amount * 0.0875).toFixed(2)),
      status,
      dueDate: randomDate(new Date("2026-02-01"), new Date("2026-04-01")),
      paidAt:
        status === "paid"
          ? randomDate(new Date("2026-02-01"), new Date())
          : null,
      items: JSON.stringify([
        {
          description: `${randomElement(types)} service`,
          quantity: 1,
          unitPrice: amount,
        },
      ]),
    });
  }

  const invoices = await Promise.all(
    invoiceData.map((data) => prisma.invoice.create({ data }))
  );
  console.log(`   ✅ Created ${invoices.length} invoices`);

  // ── End of Day Records ────────────────────────────────────────────────
  console.log("📊 Creating end-of-day records...");
  const eodData = [];
  const eodCarriers = ["UPS", "FedEx", "USPS", "DHL"];
  for (let day = 1; day <= 5; day++) {
    const date = new Date(`2026-02-${String(14 + day).padStart(2, "0")}`);
    for (const carrier of eodCarriers) {
      if (carrier === "DHL" && Math.random() > 0.3) continue;
      eodData.push({
        date,
        carrier,
        manifestId: `MAN-${carrier}-${date.toISOString().split("T")[0]}`,
        packageCount: Math.floor(Math.random() * 25 + 1),
        status: day < 5 ? "closed" : randomElement(["open", "picked_up"]),
        pickupTime:
          day < 5
            ? new Date(`2026-02-${String(14 + day).padStart(2, "0")}T17:00:00`)
            : null,
        notes:
          Math.random() > 0.7
            ? randomElement([
                "Driver picked up on time",
                "Late pickup - driver arrived at 5:30",
                "Extra boxes added after manifest",
              ])
            : null,
      });
    }
  }

  const eodRecords = await Promise.all(
    eodData.map((data) => prisma.endOfDayRecord.create({ data }))
  );
  console.log(`   ✅ Created ${eodRecords.length} end-of-day records`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete! Summary:");
  console.log(`   Users:            ${users.length}`);
  console.log(`   Customers:        ${customers.length}`);
  console.log(`   Packages:         ${packages.length}`);
  console.log(`   Mail Pieces:      ${mailPieces.length}`);
  console.log(`   Shipments:        ${shipments.length}`);
  console.log(`   Notifications:    ${notifications.length}`);
  console.log(`   Audit Logs:       ${auditLogs.length}`);
  console.log(`   Carrier Rates:    ${carrierRates.length}`);
  console.log(`   Dropoff Settings: ${dropoffSettings.length}`);
  console.log(`   Invoices:         ${invoices.length}`);
  console.log(`   EOD Records:      ${eodRecords.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
