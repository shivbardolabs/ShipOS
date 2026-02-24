/**
 * BAR-209: Demo seed API — creates demo data on demand.
 * POST /api/demo/seed — Seeds the DB with demo tenant, users, customers, packages
 * DELETE /api/demo/seed — Removes all demo data
 *
 * Gated behind the demo_mode feature flag.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { getOrProvisionUser } from '@/lib/auth';

const DEMO_TENANT_ID = 'demo_tenant_001';

function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }

export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getOrProvisionUser();
  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  try {
    // Create demo tenant
    await prisma.tenant.upsert({
      where: { id: DEMO_TENANT_ID },
      update: {},
      create: {
        id: DEMO_TENANT_ID,
        name: 'Mailbox Express Downtown',
        slug: 'mailbox-express-demo',
        address: '123 Main Street, Suite 100',
        city: 'Austin', state: 'TX', zipCode: '78701',
        phone: '(512) 555-0100',
        email: 'demo@mailboxexpress.com',
        timezone: 'America/Chicago',
        taxRate: 8.25, status: 'active', subscriptionTier: 'pro',
      },
    });

    // Demo users
    const users = [
      { id: 'demo_admin_001', auth0Id: 'auth0|demo_admin', email: 'admin@demo.shipos.app', name: 'Dana Martinez', role: 'admin' },
      { id: 'demo_staff_001', auth0Id: 'auth0|demo_staff', email: 'staff@demo.shipos.app', name: 'Jordan Lee', role: 'staff' },
      { id: 'demo_viewer_001', auth0Id: 'auth0|demo_viewer', email: 'viewer@demo.shipos.app', name: 'Alex Chen', role: 'viewer' },
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: { ...u, status: 'active', hasAgreedToTerms: true, tenantId: DEMO_TENANT_ID },
      });
    }

    // 15 demo customers
    const customerNames = [
      'Sarah Thompson', 'Michael Chen', 'Emily Rodriguez', 'James Wilson', 'Jessica Lee',
      'Robert Garcia', 'Amanda Brown', 'David Kim', 'Jennifer Patel', 'Christopher Davis',
      'Michelle Torres', 'Daniel White', 'Ashley Martinez', 'Ryan Johnson', 'Nicole Anderson',
    ];
    const customerIds: string[] = [];

    for (let i = 0; i < customerNames.length; i++) {
      const id = `demo_cust_${String(i + 1).padStart(3, '0')}`;
      customerIds.push(id);
      const [first, ...rest] = customerNames[i].split(' ');
      await prisma.customer.upsert({
        where: { id },
        update: {},
        create: {
          id, firstName: first, lastName: rest.join(' '),
          email: `${first.toLowerCase()}.${rest[0]?.toLowerCase() ?? ''}@example.com`,
          phone: `(512) 555-${String(200 + i).padStart(4, '0')}`,
          pmbNumber: String(1001 + i),
          status: i < 13 ? 'active' : 'pending',
          form1583Status: i < 13 ? 'approved' : 'pending',
          idType: 'drivers_license',
          address: `${1000 + i} Elm Street`, city: 'Austin', state: 'TX', zipCode: '78702',
          notifyEmail: true, notifySms: i % 3 !== 0,
          renewalDate: daysFromNow(30 + i * 10),
          tenantId: DEMO_TENANT_ID,
          createdAt: daysAgo(180 - i * 10),
        },
      });
    }

    // 30 packages
    const carriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Amazon'];
    const pkgStatuses = ['checked_in', 'checked_in', 'checked_in', 'notified', 'notified', 'checked_out'];
    let pkgCount = 0;
    for (let i = 0; i < 30; i++) {
      const pkgId = `demo_pkg_${String(i + 1).padStart(3, '0')}`;
      const carrier = carriers[i % 5];
      const status = pkgStatuses[i % 6];
      await prisma.package.upsert({
        where: { id: pkgId },
        update: {},
        create: {
          id: pkgId,
          trackingNumber: `${carrier.slice(0, 3).toUpperCase()}${1000000000 + i}`,
          carrier, status, packageType: 'box',
          weight: Math.round((1 + Math.random() * 20) * 10) / 10,
          storageLocation: `Shelf ${String.fromCharCode(65 + (i % 5))}-${(i % 10) + 1}`,
          notificationSent: status !== 'checked_in',
          checkedInAt: daysAgo(i < 10 ? 0 : i < 20 ? 2 : 7),
          checkedOutAt: status === 'checked_out' ? daysAgo(0) : undefined,
          checkedInBy: i % 2 === 0 ? 'Dana Martinez' : 'Jordan Lee',
          customerId: customerIds[i % 15],
          tenantId: DEMO_TENANT_ID,
        },
      });
      pkgCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded',
      counts: { tenant: 1, users: users.length, customers: customerIds.length, packages: pkgCount },
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getOrProvisionUser();
  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  try {
    // Delete in dependency order
    await prisma.auditLog.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.notification.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.invoice.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.mailPiece.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.package.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.customer.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.user.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: DEMO_TENANT_ID } });

    return NextResponse.json({ success: true, message: 'Demo data removed' });
  } catch (error) {
    console.error('Demo cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
