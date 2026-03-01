/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/mailboxes/register
 * BAR-77: Get available PMB numbers and mailbox inventory.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
}

/**
 * POST /api/mailboxes/register
 * BAR-77: Register a new mailbox account for a customer.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
      },
    });

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
}
