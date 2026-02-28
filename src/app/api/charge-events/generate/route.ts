import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateChargeEvent, generateDailyStorageCharges } from '@/lib/charge-event-service';

type ChargeServiceType =
  | 'receiving' | 'storage' | 'forwarding' | 'scanning'
  | 'pickup' | 'disposal' | 'shipping' | 'custom';

/**
 * POST /api/charge-events/generate
 *
 * BAR-308: Manual charge event generation endpoint.
 *
 * Supports two modes:
 *   1. Single: Generate a charge event for a specific service action
 *      Body: { mode: 'single', customerId, serviceType, description, quantity?, packageId?, ... }
 *
 *   2. Batch storage: Generate daily storage charges for all qualifying packages
 *      Body: { mode: 'batch_storage' }
 *
 * Requires admin/superadmin role.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { mode = 'single' } = body;

    // ── Batch storage mode ───────────────────────────────────────────────
    if (mode === 'batch_storage') {
      const result = await generateDailyStorageCharges(user.tenantId);
      return NextResponse.json({
        mode: 'batch_storage',
        chargesCreated: result.chargesCreated,
        errors: result.errors,
      });
    }

    // ── Single charge mode ───────────────────────────────────────────────
    const {
      customerId,
      serviceType,
      description,
      quantity = 1,
      packageId,
      shipmentId,
      mailPieceId,
      notes,
    } = body;

    if (!customerId || !serviceType || !description) {
      return NextResponse.json(
        { error: 'customerId, serviceType, and description are required' },
        { status: 400 },
      );
    }

    // Validate serviceType
    const validTypes: ChargeServiceType[] = [
      'receiving', 'storage', 'forwarding', 'scanning',
      'pickup', 'disposal', 'shipping', 'custom',
    ];
    if (!validTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Look up customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true, pmbNumber: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const result = await generateChargeEvent({
      tenantId: user.tenantId,
      customerId,
      pmbNumber: customer.pmbNumber,
      serviceType,
      description,
      quantity,
      packageId,
      shipmentId,
      mailPieceId,
      createdById: user.id,
      notes,
    });

    if (!result) {
      return NextResponse.json({ message: 'No charge generated (zero amount)' });
    }

    // Fetch the full charge event for the response
    const chargeEvent = await prisma.chargeEvent.findUnique({
      where: { id: result.chargeEventId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      mode: 'single',
      chargeEvent,
      pricing: result.pricing,
      tosChargeId: result.tosChargeId || null,
      usageRecordId: result.usageRecordId || null,
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/charge-events/generate]', err);
    return NextResponse.json(
      { error: 'Failed to generate charge event', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
