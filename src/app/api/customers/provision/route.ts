import { withApiHandler, validateBody, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/**
 * POST /api/customers/provision
 *
 * Atomically provisions a new customer account:
 * 1. Creates Customer record (auto-generates PMB number)
 * 2. Creates first Invoice
 * 3. Records Form 1583-A upload metadata
 *
 * All within a transaction for consistency.
 */

const ProvisionSchema = z.object({
  // Step 1: Plan
  planId: z.string().optional(),
  // Step 2: Client contact information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  homeCity: z.string().optional().nullable(),
  homeState: z.string().optional().nullable(),
  homeZip: z.string().optional().nullable(),
  // Step 3: Form 1583-A uploads (metadata only — files handled client-side)
  form1583Uploads: z.array(z.unknown()).optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const {
    planId,
    firstName,
    lastName,
    email,
    phone,
    homeAddress,
    homeCity,
    homeState,
    homeZip,
    form1583Uploads,
  } = await validateBody(request, ProvisionSchema);

  // Determine Form 1583 status based on uploads
  const hasForm1583Uploads =
    Array.isArray(form1583Uploads) && form1583Uploads.length > 0;

  // Auto-generate a unique PMB number
  const pmbNumber = `PMB-${Date.now().toString(36).toUpperCase()}`;

  // Atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Customer
    const customer = await tx.customer.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        pmbNumber,
        platform: 'physical',
        status: 'active',
        homeAddress: homeAddress || null,
        homeCity: homeCity || null,
        homeState: homeState || null,
        homeZip: homeZip || null,
        form1583Status: hasForm1583Uploads ? 'submitted' : 'pending',
        form1583Date: hasForm1583Uploads ? new Date() : null,
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        renewalStatus: 'current',
        smsConsent: !!phone,
        smsConsentAt: phone ? new Date() : null,
        smsConsentMethod: phone ? 'web_form' : null,
        tenantId: user.tenantId,
      },
    });

    // 2. Create initial Invoice
    const invoiceNumber = `NEW-${customer.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
    let amount = 0;

    if (planId) {
      const plan = await tx.billingPlan.findUnique({ where: { id: planId } });
      if (plan) {
        amount = plan.priceMonthly;
      }
    }

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        type: 'service',
        amount,
        status: 'draft',
        dueDate: new Date(),
        items: JSON.stringify([
          { description: `Account Setup — ${firstName} ${lastName}`, quantity: 1, price: amount },
        ]),
      },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        action: 'customer_provisioned',
        entityType: 'customer',
        entityId: customer.id,
        details: JSON.stringify({
          planId,
          form1583Uploads: form1583Uploads || [],
          invoiceId: invoice.id,
        }),
        userId: user.id,
      },
    });

    return { customer, invoice };
  });

  return ok({
    success: true,
    customerId: result.customer.id,
    invoiceId: result.invoice.id,
  });
});
