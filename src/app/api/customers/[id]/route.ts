import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/[id]
 * Fetch a single customer with all related data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId }
      : {};

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
      include: {
        packages: { orderBy: { checkedInAt: 'desc' }, take: 50 },
        mailPieces: { orderBy: { receivedAt: 'desc' }, take: 50 },
        shipments: { orderBy: { createdAt: 'desc' }, take: 20 },
        notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
        loyaltyAccount: { include: { currentTier: true } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Serialize all dates on customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = customer as any;
    const serialized = {
      ...c,
      dateOpened: c.dateOpened?.toISOString() ?? null,
      dateClosed: c.dateClosed?.toISOString() ?? null,
      renewalDate: c.renewalDate?.toISOString() ?? null,
      idExpiration: c.idExpiration?.toISOString() ?? null,
      passportExpiration: c.passportExpiration?.toISOString() ?? null,
      form1583Date: c.form1583Date?.toISOString() ?? null,
      lastRenewalNotice: c.lastRenewalNotice?.toISOString() ?? null,
      agreementSignedAt: c.agreementSignedAt?.toISOString() ?? null,
      smsConsentAt: c.smsConsentAt?.toISOString() ?? null,
      smsOptOutAt: c.smsOptOutAt?.toISOString() ?? null,
      crdUploadDate: c.crdUploadDate?.toISOString() ?? null,
      proofOfAddressDateOfIssue: c.proofOfAddressDateOfIssue?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      deletedAt: null,
      // Serialize nested packages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      packages: c.packages.map((p: any) => ({
        ...p,
        checkedInAt: p.checkedInAt?.toISOString() ?? null,
        notifiedAt: p.notifiedAt?.toISOString() ?? null,
        releasedAt: p.releasedAt?.toISOString() ?? null,
        holdDeadline: p.holdDeadline?.toISOString() ?? null,
        carrierUploadedAt: p.carrierUploadedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      // Serialize nested mail pieces
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mailPieces: c.mailPieces.map((m: any) => ({
        ...m,
        receivedAt: m.receivedAt?.toISOString() ?? null,
        actionAt: m.actionAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      // Serialize nested shipments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shipments: c.shipments.map((s: any) => ({
        ...s,
        shippedAt: s.shippedAt?.toISOString() ?? null,
        deliveredAt: s.deliveredAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      // Serialize nested notifications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifications: c.notifications.map((n: any) => ({
        ...n,
        sentAt: n.sentAt?.toISOString() ?? null,
        deliveredAt: n.deliveredAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      // Loyalty account (if exists)
      loyaltyAccount: c.loyaltyAccount ? {
        ...c.loyaltyAccount,
        createdAt: c.loyaltyAccount.createdAt?.toISOString() ?? null,
        updatedAt: c.loyaltyAccount.updatedAt?.toISOString() ?? null,
        currentTier: c.loyaltyAccount.currentTier ?? null,
      } : null,
    };

    return NextResponse.json(serialized);
  } catch (err) {
    console.error('[GET /api/customers/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}
