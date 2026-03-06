import { withApiHandler, validateBody, validateQuery, ok, forbidden, notFound, badRequest } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const ApprovalQuerySchema = z.object({
  status: z.enum(['pending_approval', 'all']).default('pending_approval'),
});

const ApprovalActionSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

/**
 * GET /api/super-admin/approvals
 * Lists tenants pending approval (the approval queue).
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const query = validateQuery(request, ApprovalQuerySchema);

  const where = query.status === 'all'
    ? { status: { in: ['pending_approval', 'active', 'trial'] } }
    : { status: 'pending_approval' };

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      users: {
        where: { role: { in: ['admin', 'manager'] }, deletedAt: null },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          title: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const queue = tenants.map((t) => {
    const owner = t.users[0];
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      address: [t.address, t.city, t.state, t.zipCode].filter(Boolean).join(', '),
      status: t.status,
      statusReason: t.statusReason,
      affiliationType: t.affiliationType,
      franchiseType: t.franchiseType,
      storeCount: t.storeCount,
      subscriptionTier: t.subscriptionTier,
      planId: t.planId,
      createdAt: t.createdAt.toISOString(),
      statusChangedAt: t.statusChangedAt?.toISOString() ?? null,
      owner: owner
        ? {
            id: owner.id,
            name: owner.name,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
            phone: owner.phone,
            title: owner.title,
          }
        : null,
    };
  });

  return ok({ queue, total: queue.length });
});

/**
 * POST /api/super-admin/approvals
 * Approve or reject a pending tenant sign-up.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const { tenantId, action, reason } = await validateBody(request, ApprovalActionSchema);

  // Look up the tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { deletedAt: null },
        select: { id: true, email: true, name: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!tenant) notFound('Tenant not found');

  if (tenant.status !== 'pending_approval') {
    badRequest(`Tenant is already "${tenant.status}" — can only approve/reject pending applications`);
  }

  const now = new Date();

  if (action === 'approve') {
    // Calculate trial end date based on plan
    const trialDays = tenant.planId === 'starter' ? 7 : 30;
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'trial',
        statusChangedAt: now,
        statusChangedBy: user.id,
        statusReason: null,
        trialEndsAt: trialEnd,
      },
    });

    // TODO: Send approval email to tenant owner (BAR-396 email integration)
    // const owner = tenant.users[0];
    // if (owner) await sendApprovalEmail(owner.email, tenant.name);

    return ok({
      success: true,
      action: 'approved',
      tenantId,
      tenantName: tenant.name,
      newStatus: 'trial',
      trialEndsAt: trialEnd.toISOString(),
    });
  }

  // Reject
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'closed',
      statusChangedAt: now,
      statusChangedBy: user.id,
      statusReason: reason || 'Application not approved',
    },
  });

  // TODO: Send rejection email to tenant owner (BAR-396 email integration)

  return ok({
    success: true,
    action: 'rejected',
    tenantId,
    tenantName: tenant.name,
    newStatus: 'closed',
    reason: reason || 'Application not approved',
  });
});
