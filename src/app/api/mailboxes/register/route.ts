/* eslint-disable */
/**
 * BAR-230: Updated mailbox registration API with plan tier, business entity,
 * forwarding, payment, CMRA signature, and recipients support.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/mailboxes/register
 * BAR-77: Get available PMB numbers and mailbox inventory.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    // Get all assigned PMB numbers
    const assignedPmbs = await prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'suspended'] },
        deletedAt: null,
      },
      select: { pmbNumber: true },
    });

    const assignedSet = new Set(assignedPmbs.map((c) => c.pmbNumber));

    // Generate available range (PMB 1001-1500 typical for CMRA)
    const available: string[] = [];
    for (let i = 1001; i <= 1500; i++) {
      const pmb = `PMB ${i}`;
      if (!assignedSet.has(pmb)) {
        available.push(pmb);
      }
    }

    return NextResponse.json({
      totalSlots: 500,
      assigned: assignedPmbs.length,
      available: available.length,
      nextAvailable: available[0] || null,
      availableNumbers: available.slice(0, 50), // First 50
    });
  } catch (err) {
    console.error('[GET /api/mailboxes/register]', err);
    return NextResponse.json({ error: 'Failed to get mailbox inventory' }, { status: 500 });
  }
});

/**
 * POST /api/mailboxes/register
 * BAR-77: Register a new mailbox account for a customer.
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      businessName,
      pmbNumber,
      platform,
      billingTerms,
      renewalTermMonths,
      autoRenew,
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      idType,
      idExpiration,
      form1583SignatureUrl,
      agreementSignatureUrl,
      notes,
      // BAR-230: New fields
      planTierId,
      billingCycle,
      businessType,
      businessRegPlace,
      businessAddress,
      businessCity,
      businessState,
      businessZip,
      businessPhone,
      businessEmail,
      businessWebsite,
      hasForwardingAddress,
      forwardingAddress,
      forwardingCity,
      forwardingState,
      forwardingZip,
      isCourtProtected,
      cmraSignatureUrl,
      cmraSignedBy,
      onboardingPaymentStatus,
      onboardingPaymentMethod,
      onboardingPaymentAmount,
      onboardingPaymentRef,
      recipients,
    } = body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !pmbNumber?.trim()) {
      return NextResponse.json(
        { error: 'firstName, lastName, and pmbNumber are required' },
        { status: 400 }
      );
    }

    // Check PMB uniqueness
    const existingPmb = await prisma.customer.findFirst({
      where: { pmbNumber, deletedAt: null },
    });

    if (existingPmb) {
      return NextResponse.json(
        { error: `PMB ${pmbNumber} is already assigned to another customer` },
        { status: 409 }
      );
    }

    // Calculate renewal date based on term
    const termMonths = renewalTermMonths || 12;
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + termMonths);

    // Create customer record
    const customer = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        pmbNumber: pmbNumber.trim(),
        platform: platform || 'physical',
        status: 'active',
        billingTerms: billingTerms || 'Monthly',
        renewalDate,
        renewalTermMonths: termMonths,
        autoRenew: autoRenew || false,
        renewalStatus: 'current',
        homeAddress: homeAddress || null,
        homeCity: homeCity || null,
        homeState: homeState || null,
        homeZip: homeZip || null,
        idType: idType || null,
        idExpiration: idExpiration ? new Date(idExpiration) : null,
        form1583Status: 'pending',
        form1583SignatureUrl: form1583SignatureUrl || null,
        agreementSigned: !!agreementSignatureUrl,
        agreementSignedAt: agreementSignatureUrl ? new Date() : null,
        notes: notes || null,
        tenantId: user.tenantId,
        storeId: (user as any).storeId || null,
        // BAR-230: Rate plan
        planTierId: planTierId || null,
        billingCycle: billingCycle || 'monthly',
        // BAR-230: Business entity fields
        businessType: businessType || null,
        businessRegPlace: businessRegPlace || null,
        businessAddress: businessAddress || null,
        businessCity: businessCity || null,
        businessState: businessState || null,
        businessZip: businessZip || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        businessWebsite: businessWebsite || null,
        // BAR-230: Forwarding address
        hasForwardingAddress: hasForwardingAddress || false,
        forwardingAddress: forwardingAddress || null,
        forwardingCity: forwardingCity || null,
        forwardingState: forwardingState || null,
        forwardingZip: forwardingZip || null,
        // BAR-230: Court protection & CMRA signature
        isCourtProtected: isCourtProtected || false,
        cmraSignatureUrl: cmraSignatureUrl || null,
        cmraSignedAt: cmraSignatureUrl ? new Date() : null,
        cmraSignedBy: cmraSignedBy || null,
        // BAR-230: Payment info
        onboardingPaymentStatus: onboardingPaymentStatus || null,
        onboardingPaymentMethod: onboardingPaymentMethod || null,
        onboardingPaymentAmount: onboardingPaymentAmount || null,
        onboardingPaymentRef: onboardingPaymentRef || null,
      },
    });

    // BAR-230: Create additional recipients if provided
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      await prisma.pmbRecipient.createMany({
        data: recipients.map((r: any) => ({
          customerId: customer.id,
          tenantId: user.tenantId!,
          type: r.type || 'additional_recipient',
          firstName: r.firstName,
          lastName: r.lastName,
          phone: r.phone || null,
          email: r.email || null,
          address: r.address || null,
          city: r.city || null,
          state: r.state || null,
          zip: r.zip || null,
          primaryIdType: r.primaryIdType || null,
          primaryIdNumber: r.primaryIdNumber || null,
          primaryIdIssuer: r.primaryIdIssuer || null,
          secondaryIdType: r.secondaryIdType || null,
          secondaryIdNumber: r.secondaryIdNumber || null,
          secondaryIdIssuer: r.secondaryIdIssuer || null,
          dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : null,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        pmbNumber: customer.pmbNumber,
        status: customer.status,
        renewalDate: customer.renewalDate?.toISOString(),
        createdAt: customer.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/mailboxes/register]', err);
    return NextResponse.json({ error: 'Failed to register mailbox' }, { status: 500 });
  }
});
