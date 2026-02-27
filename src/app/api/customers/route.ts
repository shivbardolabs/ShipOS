import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 *
 * Returns all customers for the current tenant.
 * Supports optional query params: ?search=&status=&platform=
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const platform = searchParams.get('platform') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
      ...(user.tenantId ? { tenantId: user.tenantId } : {}),
    };

    if (status && status !== 'all') {
      where.status = status;
    }
    if (platform && platform !== 'all') {
      where.platform = platform;
    }
    if (search.trim()) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { pmbNumber: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error('[GET /api/customers]', err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

/**
 * POST /api/customers
 *
 * Creates a new customer record.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      idType,
      idExpiration,
      form1583Status,
      form1583Notarized,
      agreementSigned,
      notifyEmail,
      notifySms,
      notes,
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

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        businessName: businessName || null,
        pmbNumber,
        platform: platform || 'physical',
        status: 'active',
        billingTerms: billingTerms || null,
        homeAddress: homeAddress || null,
        homeCity: homeCity || null,
        homeState: homeState || null,
        homeZip: homeZip || null,
        idType: idType || null,
        idExpiration: idExpiration ? new Date(idExpiration) : null,
        form1583Status: form1583Status || 'pending',
        form1583Date: form1583Status === 'submitted' ? new Date() : null,
        form1583Notarized: !!form1583Notarized,
        agreementSigned: !!agreementSigned,
        agreementSignedAt: agreementSigned ? new Date() : null,
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        renewalStatus: 'current',
        notifyEmail: notifyEmail ?? true,
        notifySms: notifySms ?? true,
        smsConsent: !!phone,
        smsConsentAt: phone ? new Date() : null,
        smsConsentMethod: phone ? 'web_form' : null,
        notes: notes || null,
        tenantId: user.tenantId || null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'customer_created',
        entityType: 'customer',
        entityId: customer.id,
        details: JSON.stringify({ pmbNumber, platform: platform || 'physical' }),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/customers]', err);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
