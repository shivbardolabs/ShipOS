import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages/rts
 *
 * List RTS records with filtering and pagination.
 * Query params: step?, reason?, carrier?, search?, page?, limit?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');
    const reason = searchParams.get('reason');
    const carrier = searchParams.get('carrier');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Tenant scoping
    if (user.role !== 'superadmin' && user.tenantId) {
      where.tenantId = user.tenantId;
    }

    if (step) where.step = step;
    if (reason) where.reason = reason;
    if (carrier) where.carrier = carrier;
    if (search) {
      where.OR = [
        { returnTrackingNumber: { contains: search, mode: 'insensitive' } },
        { pmbNumber: { contains: search, mode: 'insensitive' } },
        { reasonDetail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.returnToSender.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.returnToSender.count({ where }),
    ]);

    // Fetch related package/mail info in a second query for enrichment
    const packageIds = records.filter((r) => r.packageId).map((r) => r.packageId!);
    const mailIds = records.filter((r) => r.mailPieceId).map((r) => r.mailPieceId!);

    const [packages, mailPieces] = await Promise.all([
      packageIds.length > 0
        ? prisma.package.findMany({
            where: { id: { in: packageIds } },
            select: {
              id: true,
              trackingNumber: true,
              carrier: true,
              packageType: true,
              senderName: true,
              storageLocation: true,
              customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } },
            },
          })
        : [],
      mailIds.length > 0
        ? prisma.mailPiece.findMany({
            where: { id: { in: mailIds } },
            select: { id: true, type: true, sender: true },
          })
        : [],
    ]);

    const pkgMap = new Map(packages.map((p) => [p.id, p]));
    const mailMap = new Map(mailPieces.map((m) => [m.id, m]));

    const enriched = records.map((r) => ({
      ...r,
      initiatedAt: r.initiatedAt.toISOString(),
      labelPrintedAt: r.labelPrintedAt?.toISOString() ?? null,
      carrierHandoffAt: r.carrierHandoffAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      package: r.packageId ? pkgMap.get(r.packageId) ?? null : null,
      mailPiece: r.mailPieceId ? mailMap.get(r.mailPieceId) ?? null : null,
    }));

    return NextResponse.json({ records: enriched, total, page, limit });
  } catch (err) {
    console.error('[GET /api/packages/rts]', err);
    return NextResponse.json({ error: 'Failed to fetch RTS records' }, { status: 500 });
  }
}

/**
 * POST /api/packages/rts
 *
 * Initiate a Return to Sender action for a package or mail piece.
 * Requires confirmation (front-end shows dialog before calling).
 *
 * Body: {
 *   packageId?: string,
 *   mailPieceId?: string,
 *   reason: RtsReason,
 *   reasonDetail?: string,
 *   carrier?: string,
 *   confirmed: boolean   // must be true — prevents accidental RTS
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { packageId, mailPieceId, reason, reasonDetail, carrier, confirmed } = body;

    // -- Validation --
    if (!confirmed) {
      return NextResponse.json(
        { error: 'RTS must be explicitly confirmed to prevent accidental returns.' },
        { status: 400 },
      );
    }

    if (!packageId && !mailPieceId) {
      return NextResponse.json(
        { error: 'Either packageId or mailPieceId is required.' },
        { status: 400 },
      );
    }

    const validReasons = [
      'no_matching_customer',
      'closed_pmb',
      'expired_pmb',
      'customer_request',
      'storage_policy_expiry',
      'refused',
      'unclaimed',
      'other',
    ];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve item details for audit trail
    let customerId: string | null = null;
    let pmbNumber: string | null = null;
    let entityLabel = '';
    let resolvedCarrier = carrier || null;

    if (packageId) {
      const pkg = await prisma.package.findFirst({
        where: {
          id: packageId,
          ...(user.role !== 'superadmin' && user.tenantId
            ? { customer: { tenantId: user.tenantId } }
            : {}),
        },
        include: { customer: { select: { id: true, pmbNumber: true, firstName: true, lastName: true } } },
      });
      if (!pkg) {
        return NextResponse.json({ error: 'Package not found.' }, { status: 404 });
      }
      // Prevent RTS on already-released or already-RTS packages
      if (['released', 'rts_initiated', 'rts_labeled', 'rts_completed'].includes(pkg.status)) {
        return NextResponse.json(
          { error: `Cannot RTS a package with status "${pkg.status}".` },
          { status: 409 },
        );
      }
      customerId = pkg.customer?.id ?? null;
      pmbNumber = pkg.customer?.pmbNumber ?? null;
      entityLabel = pkg.trackingNumber || pkg.id;
      resolvedCarrier = resolvedCarrier || pkg.carrier;

      // Update package status
      await prisma.package.update({
        where: { id: packageId },
        data: { status: 'rts_initiated' },
      });
    }

    if (mailPieceId) {
      const mail = await prisma.mailPiece.findFirst({
        where: {
          id: mailPieceId,
          ...(user.role !== 'superadmin' && user.tenantId
            ? { customer: { tenantId: user.tenantId } }
            : {}),
        },
        include: { customer: { select: { id: true, pmbNumber: true } } },
      });
      if (!mail) {
        return NextResponse.json({ error: 'Mail piece not found.' }, { status: 404 });
      }
      customerId = mail.customer?.id ?? null;
      pmbNumber = mail.customer?.pmbNumber ?? null;
      entityLabel = mail.sender || mail.id;
    }

    // -- Create RTS record --
    const rts = await prisma.returnToSender.create({
      data: {
        tenantId: user.tenantId || '',
        packageId: packageId || null,
        mailPieceId: mailPieceId || null,
        reason,
        reasonDetail: reasonDetail?.trim() || null,
        step: 'initiated',
        carrier: resolvedCarrier,
        initiatedById: user.id,
        customerId,
        pmbNumber,
      },
    });

    // -- Audit log --
    await prisma.auditLog.create({
      data: {
        action: 'rts.initiated',
        entityType: packageId ? 'package' : 'mail',
        entityId: packageId || mailPieceId!,
        details: JSON.stringify({
          rtsId: rts.id,
          reason,
          reasonDetail: reasonDetail || null,
          carrier: resolvedCarrier,
          trackingNumber: entityLabel,
          customerId,
          pmbNumber,
          description: `Return to Sender initiated for ${packageId ? 'package' : 'mail'} ${entityLabel} — reason: ${reason}`,
        }),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, rts });
  } catch (err) {
    console.error('[POST /api/packages/rts]', err);
    return NextResponse.json({ error: 'Failed to initiate RTS' }, { status: 500 });
  }
}
