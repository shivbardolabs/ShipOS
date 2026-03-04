import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * BAR-386: Label Roll Usage Tracking API
 *
 * POST /api/settings/printer/roll
 * Actions:
 *   - increment: Record label(s) printed (increments counter)
 *   - reset: New roll loaded (resets counter, sets rollLoadedAt)
 *   - configure: Update roll capacity and low-supply threshold
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const { printerId, action, count, rollCapacity, lowSupplyThreshold } = body;

    if (!printerId) {
      return NextResponse.json(
        { error: 'printerId is required' },
        { status: 400 }
      );
    }

    // Verify printer belongs to this tenant
    const printer = await prisma.printerConfig.findFirst({
      where: { id: printerId, tenantId: user.tenantId },
    });

    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'increment': {
        // Record labels printed
        const incrementBy = Math.max(1, count || 1);
        const updated = await prisma.printerConfig.update({
          where: { id: printerId },
          data: {
            labelsPrinted: { increment: incrementBy },
          },
        });

        const remaining =
          updated.rollCapacity - updated.labelsPrinted;
        const isLow = remaining <= updated.lowSupplyThreshold;

        return NextResponse.json({
          printer: updated,
          labelsPrinted: updated.labelsPrinted,
          remaining,
          isLow,
        });
      }

      case 'reset': {
        // New roll loaded — reset counter
        const updated = await prisma.printerConfig.update({
          where: { id: printerId },
          data: {
            labelsPrinted: 0,
            rollLoadedAt: new Date(),
          },
        });

        return NextResponse.json({
          printer: updated,
          labelsPrinted: 0,
          remaining: updated.rollCapacity,
          isLow: false,
        });
      }

      case 'configure': {
        // Update roll capacity and threshold settings
        if (
          user.role !== 'admin' &&
          user.role !== 'superadmin' &&
          user.role !== 'manager'
        ) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }

        const updateData: Record<string, number> = {};
        if (rollCapacity !== undefined && rollCapacity > 0) {
          updateData.rollCapacity = rollCapacity;
        }
        if (lowSupplyThreshold !== undefined && lowSupplyThreshold >= 0) {
          updateData.lowSupplyThreshold = lowSupplyThreshold;
        }

        const updated = await prisma.printerConfig.update({
          where: { id: printerId },
          data: updateData,
        });

        const remaining =
          updated.rollCapacity - updated.labelsPrinted;
        const isLow = remaining <= updated.lowSupplyThreshold;

        return NextResponse.json({
          printer: updated,
          labelsPrinted: updated.labelsPrinted,
          remaining,
          isLow,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: increment, reset, or configure' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[POST /api/settings/printer/roll]', err);
    return NextResponse.json(
      { error: 'Failed to update roll tracking' },
      { status: 500 }
    );
  }
});
