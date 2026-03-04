import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/customers
 * List customers with search, filtering, and pagination.
 * Query params: search?, status?, platform?, page?, limit?
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      deletedAt: null,
    };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { pmbNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { _count: { select: { packages: true, mailPieces: true, shipments: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = customers.map((c: any) => ({
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
      packageCount: c._count.packages,
      mailCount: c._count.mailPieces,
      shipmentCount: c._count.shipments,
      _count: undefined,
    }));

    return NextResponse.json({ customers: serialized, total, page, limit });
  } catch (err) {
    console.error('[GET /api/customers]', err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
});

/**
 * POST /api/customers
 * Create a new customer (Quick Add flow).
 * BAR-344: This handler was missing, causing Quick Add to return 405.
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
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
      notifyEmail,
      notifySms,
      notes,
    } = body as {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      businessName?: string;
      pmbNumber?: string;
      platform?: string;
      billingTerms?: string;
      notifyEmail?: boolean;
      notifySms?: boolean;
      notes?: string;
    };

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Auto-generate PMB number if not provided
    const finalPmb = pmbNumber?.trim() || `PMB-${Date.now().toString(36).toUpperCase()}`;

    const customer = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        pmbNumber: finalPmb,
        platform: platform || 'physical',
        status: 'active',
        billingTerms: billingTerms || null,
        notifyEmail: notifyEmail ?? true,
        notifySms: notifySms ?? false,
        notes: notes?.trim() || null,
        tenantId: user.tenantId,
        smsConsent: notifySms ?? false,
        smsConsentAt: notifySms ? new Date() : null,
        smsConsentMethod: notifySms ? 'web_form' : null,
      },
    });

    return NextResponse.json({
      customer: {
        ...customer,
        dateOpened: customer.dateOpened?.toISOString() ?? null,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        packageCount: 0,
        mailCount: 0,
        shipmentCount: 0,
      },
    });
  } catch (err) {
    console.error('[POST /api/customers]', err);
    // Handle unique constraint violation (duplicate PMB number)
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A customer with this PMB number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
});
