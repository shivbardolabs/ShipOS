import { withApiHandler, ok, notFound, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/[id]
 * Fetch a single customer with all related data.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing customer id');

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

  if (!customer) notFound('Customer not found');

  const serialized = {
    ...customer,
    dateOpened: customer.dateOpened?.toISOString() ?? null,
    dateClosed: customer.dateClosed?.toISOString() ?? null,
    renewalDate: customer.renewalDate?.toISOString() ?? null,
    idExpiration: customer.idExpiration?.toISOString() ?? null,
    passportExpiration: customer.passportExpiration?.toISOString() ?? null,
    form1583Date: customer.form1583Date?.toISOString() ?? null,
    lastRenewalNotice: customer.lastRenewalNotice?.toISOString() ?? null,
    agreementSignedAt: customer.agreementSignedAt?.toISOString() ?? null,
    smsConsentAt: customer.smsConsentAt?.toISOString() ?? null,
    smsOptOutAt: customer.smsOptOutAt?.toISOString() ?? null,
    crdUploadDate: customer.crdUploadDate?.toISOString() ?? null,
    proofOfAddressDateOfIssue: customer.proofOfAddressDateOfIssue?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: null,
    // Serialize nested packages
    packages: customer.packages.map((p) => ({
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
    mailPieces: customer.mailPieces.map((m) => ({
      ...m,
      receivedAt: m.receivedAt?.toISOString() ?? null,
      actionAt: m.actionAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    // Serialize nested shipments
    shipments: customer.shipments.map((s) => ({
      ...s,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    // Serialize nested notifications
    notifications: customer.notifications.map((n) => ({
      ...n,
      sentAt: n.sentAt?.toISOString() ?? null,
      deliveredAt: n.deliveredAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    // Loyalty account (if exists)
    loyaltyAccount: customer.loyaltyAccount ? {
      ...customer.loyaltyAccount,
      createdAt: customer.loyaltyAccount.createdAt?.toISOString() ?? null,
      updatedAt: customer.loyaltyAccount.updatedAt?.toISOString() ?? null,
      currentTier: customer.loyaltyAccount.currentTier ?? null,
    } : null,
  };

  return ok(serialized);
});
