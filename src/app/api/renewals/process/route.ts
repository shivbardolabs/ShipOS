/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/renewals/process
 * BAR-191: Process individual customer renewal — auto-renew or flag for manual handling.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { customerId, action, renewalTermMonths, infoChanged } = body;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null, ...tenantScope },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const now = new Date();
    const c = customer as any;

    switch (action) {
      case 'auto_renew': {
        // Check if PS1583 is valid
        const form1583Valid = customer.form1583Status === 'verified' || customer.form1583Status === 'approved';
        const idValid = customer.idExpiration ? new Date(customer.idExpiration) > now : false;
        const form1583Expired = c.form1583ExpiresAt ? new Date(c.form1583ExpiresAt) < now : false;

        if (!form1583Valid || form1583Expired) {
          return NextResponse.json({
            success: false,
            reason: 'form1583_invalid',
            message: 'Cannot auto-renew: Form 1583 is not verified or has expired. A new PS1583 is required.',
          });
        }

        if (!idValid) {
          return NextResponse.json({
            success: false,
            reason: 'id_expired',
            message: 'Cannot auto-renew: Customer ID has expired. New ID required before renewal.',
          });
        }

        // Perform auto-renewal
        const termMonths = renewalTermMonths || c.renewalTermMonths || 12;
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + termMonths);

        await prisma.customer.update({
          where: { id: customerId },
          data: {
            renewalDate: newRenewalDate,
            renewalStatus: 'current',
            lastRenewalNotice: now,
          },
        });

        return NextResponse.json({
          success: true,
          action: 'auto_renewed',
          newRenewalDate: newRenewalDate.toISOString(),
          termMonths,
        });
      }

      case 'manual_renew': {
        // Manual renewal when info has changed
        const termMonths = renewalTermMonths || c.renewalTermMonths || 12;
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + termMonths);

        const updateData: Record<string, any> = {
          renewalDate: newRenewalDate,
          renewalStatus: 'current',
          lastRenewalNotice: now,
        };

        // If customer info changed, trigger PS1583 re-filing
        if (infoChanged) {
          updateData.form1583Status = 'needs_refiling';
        }

        await prisma.customer.update({
          where: { id: customerId },
          data: updateData,
        });

        return NextResponse.json({
          success: true,
          action: 'manual_renewed',
          newRenewalDate: newRenewalDate.toISOString(),
          form1583RefilingRequired: !!infoChanged,
        });
      }

      case 'send_reminder': {
        // Mark that a reminder was sent
        await prisma.customer.update({
          where: { id: customerId },
          data: { lastRenewalNotice: now },
        });

        return NextResponse.json({
          success: true,
          action: 'reminder_sent',
          sentAt: now.toISOString(),
        });
      }

      case 'suspend': {
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            renewalStatus: 'suspended',
            status: 'suspended',
          },
        });

        return NextResponse.json({
          success: true,
          action: 'suspended',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[POST /api/renewals/process]', err);
    return NextResponse.json({ error: 'Renewal processing failed' }, { status: 500 });
  }
}
