import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/check-out                                              */
/*  BAR-12: Release packages to customer — update status, record signature    */
/* -------------------------------------------------------------------------- */

interface CheckOutBody {
  packageIds: string[];
  customerId: string;
  releaseSignature?: string;     // Base64 data URL
  delegateName?: string;         // If someone else is picking up
  delegateIdType?: string;
  delegateIdNumber?: string;
  receiptMethod?: 'email' | 'sms' | 'print' | 'none';
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckOutBody = await request.json();

    if (!body.packageIds?.length || !body.customerId) {
      return NextResponse.json(
        { error: 'packageIds and customerId are required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify all packages belong to customer and are checked in
    const packages = await prisma.package.findMany({
      where: {
        id: { in: body.packageIds },
        customerId: body.customerId,
        status: { in: ['checked_in', 'notified', 'ready'] },
      },
    });

    if (packages.length === 0) {
      return NextResponse.json(
        { error: 'No eligible packages found for release' },
        { status: 404 }
      );
    }

    const releasedIds = packages.map((p) => p.id);
    const now = new Date();

    // Batch update all packages to released
    await prisma.package.updateMany({
      where: { id: { in: releasedIds } },
      data: {
        status: 'released',
        releasedAt: now,
        releaseSignature: body.releaseSignature || null,
        delegateName: body.delegateName || null,
        delegateIdType: body.delegateIdType || null,
        delegateIdNumber: body.delegateIdNumber || null,
      },
    });

    // Create audit log entry (best-effort — userId may not be available in API context)
    try {
      // Find a system/admin user for the audit log
      const systemUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            action: 'package.release',
            entityType: 'package',
            entityId: releasedIds.join(','),
            userId: systemUser.id,
            details: JSON.stringify({
              description: `Released ${releasedIds.length} package(s) to ${customer.firstName} ${customer.lastName} (${customer.pmbNumber})${body.delegateName ? ` via delegate: ${body.delegateName}` : ''}`,
              packageIds: releasedIds,
              customerId: customer.id,
              pmbNumber: customer.pmbNumber,
              hasSignature: !!body.releaseSignature,
              delegateName: body.delegateName || null,
              receiptMethod: body.receiptMethod || 'none',
            }),
          },
        });
      }
    } catch {
      // Audit log failure should not block the release
      console.error('[check-out] Audit log write failed');
    }

    return NextResponse.json({
      success: true,
      released: releasedIds.length,
      skipped: body.packageIds.length - releasedIds.length,
      packages: releasedIds.map((id) => ({ id, status: 'released', releasedAt: now })),
    });
  } catch (error) {
    console.error('[check-out] Error:', error);
    return NextResponse.json(
      { error: 'Failed to release packages' },
      { status: 500 }
    );
  }
}
