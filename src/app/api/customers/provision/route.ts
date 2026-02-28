import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
export async function POST(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const {
      // Step 1: Plan
      planId,
      // Step 2: Client contact information
      firstName,
      lastName,
      email,
      phone,
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      // Step 3: Form 1583-A uploads (metadata only — files handled client-side)
      form1583Uploads,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Determine Form 1583 status based on uploads
    const hasForm1583Uploads =
      Array.isArray(form1583Uploads) && form1583Uploads.length > 0;

    // Auto-generate a unique PMB number
    const pmbNumber = `PMB-${Date.now().toString(36).toUpperCase()}`;

    // Atomic transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
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

    return NextResponse.json({
      success: true,
      customerId: result.customer.id,
      invoiceId: result.invoice.id,
    });
  } catch (err) {
    console.error('[POST /api/customers/provision]', err);
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 });
  }
}
