import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/customers/provision
 *
 * Atomically provisions a new customer account:
 * 1. Creates Customer record
 * 2. Creates CustomerAgreement
 * 3. Creates first Invoice
 * 4. Assigns PMB number
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
      // Step 2: Personal info
      firstName,
      lastName,
      email,
      phone,
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      // Step 3: ID verification
      idType,
      idExpiration,
      // Step 4: Form 1583
      form1583Acknowledged,
      // Step 5: Agreement
      signatureDataUrl,
      // Step 6: PMB
      pmbNumber,
      platform,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !pmbNumber) {
      return NextResponse.json(
        { error: 'First name, last name, and PMB number are required' },
        { status: 400 }
      );
    }

    // Check PMB uniqueness
    const existingPmb = await prisma.customer.findUnique({
      where: { pmbNumber },
    });
    if (existingPmb) {
      return NextResponse.json(
        { error: `PMB ${pmbNumber} is already assigned` },
        { status: 409 }
      );
    }

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
          platform: platform || 'physical',
          status: 'active',
          homeAddress: homeAddress || null,
          homeCity: homeCity || null,
          homeState: homeState || null,
          homeZip: homeZip || null,
          idType: idType || null,
          idExpiration: idExpiration ? new Date(idExpiration) : null,
          form1583Status: form1583Acknowledged ? 'submitted' : 'pending',
          form1583Date: form1583Acknowledged ? new Date() : null,
          agreementSigned: !!signatureDataUrl,
          agreementSignedAt: signatureDataUrl ? new Date() : null,
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          renewalStatus: 'current',
          smsConsent: !!phone,
          smsConsentAt: phone ? new Date() : null,
          smsConsentMethod: phone ? 'web_form' : null,
          tenantId: user.tenantId,
        },
      });

      // 2. Create CustomerAgreement if signed
      let agreement = null;
      if (signatureDataUrl) {
        // Find default template
        const template = await tx.mailboxAgreementTemplate.findFirst({
          where: { isDefault: true },
        });

        if (template) {
          agreement = await tx.customerAgreement.create({
            data: {
              customerId: customer.id,
              templateId: template.id,
              signedAt: new Date(),
              signatureDataUrl,
              status: 'signed',
            },
          });
        }
      }

      // 3. Create initial Invoice
      const invoiceNumber = `NEW-${pmbNumber}-${Date.now().toString(36).toUpperCase()}`;
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
            { description: `Account Setup — ${pmbNumber}`, quantity: 1, price: amount },
          ]),
        },
      });

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          action: 'customer_provisioned',
          entityType: 'customer',
          entityId: customer.id,
          details: JSON.stringify({
            pmbNumber,
            planId,
            hasAgreement: !!agreement,
            invoiceId: invoice.id,
          }),
          userId: user.id,
        },
      });

      return { customer, agreement, invoice };
    });

    return NextResponse.json({
      success: true,
      customerId: result.customer.id,
      pmbNumber: result.customer.pmbNumber,
      invoiceId: result.invoice.id,
    });
  } catch (err) {
    console.error('[POST /api/customers/provision]', err);
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 });
  }
}
