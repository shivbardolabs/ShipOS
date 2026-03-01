/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * PS1583-Protected Fields — changes to these require warning + audit + re-filing trigger
 */
const PS1583_PROTECTED_FIELDS = [
  'firstName',
  'lastName',
  'homeAddress',
  'homeCity',
  'homeState',
  'homeZip',
  'idType',
  'idExpiration',
  'passportExpiration',
] as const;

/**
 * POST /api/customers/[id]/change-guard
 * BAR-235: Check if proposed changes affect PS1583-protected fields.
 * Returns which fields are protected and whether a warning is needed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { changes } = body; // { fieldName: newValue }

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has an active/verified PS1583
    const hasActive1583 = customer.form1583Status === 'verified' ||
      customer.form1583Status === 'approved' ||
      customer.form1583Status === 'submitted';

    if (!hasActive1583) {
      return NextResponse.json({
        warningRequired: false,
        reason: 'no_active_1583',
        protectedFieldsChanged: [],
      });
    }

    // Check which changed fields are PS1583-protected
    const protectedChanges: Array<{
      field: string;
      label: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const fieldLabels: Record<string, string> = {
      firstName: 'First Name (Legal)',
      lastName: 'Last Name (Legal)',
      homeAddress: 'Home Address',
      homeCity: 'City',
      homeState: 'State',
      homeZip: 'ZIP Code',
      idType: 'Government ID Type',
      idExpiration: 'ID Expiration Date',
      passportExpiration: 'Passport Expiration Date',
    };

    for (const field of PS1583_PROTECTED_FIELDS) {
      if (field in changes) {
        const oldVal = (customer as any)[field];
        const newVal = changes[field];
        // Only flag if the value actually changed
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          protectedChanges.push({
            field,
            label: fieldLabels[field] || field,
            oldValue: oldVal ? String(oldVal) : null,
            newValue: newVal ? String(newVal) : null,
          });
        }
      }
    }

    return NextResponse.json({
      warningRequired: protectedChanges.length > 0,
      reason: protectedChanges.length > 0 ? 'ps1583_protected_fields' : 'no_protected_changes',
      protectedFieldsChanged: protectedChanges,
      customerName: `${customer.firstName} ${customer.lastName}`,
      pmbNumber: customer.pmbNumber,
      form1583Status: customer.form1583Status,
    });
  } catch (err) {
    console.error('[POST /api/customers/[id]/change-guard]', err);
    return NextResponse.json({ error: 'Change guard check failed' }, { status: 500 });
  }
}

/**
 * PATCH /api/customers/[id]/change-guard
 * BAR-235: Apply PS1583-protected changes after user confirmation.
 * Logs audit trail and triggers re-filing status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { changes, confirmedProtectedFields } = body;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Apply all changes
    const updateData: Record<string, any> = { ...changes };

    // If protected fields were changed and customer has active 1583, trigger re-filing
    const hasProtectedChanges = confirmedProtectedFields && confirmedProtectedFields.length > 0;
    const hasActive1583 = existing.form1583Status === 'verified' ||
      existing.form1583Status === 'approved' ||
      existing.form1583Status === 'submitted';

    if (hasProtectedChanges && hasActive1583) {
      updateData.form1583Status = 'needs_refiling';
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Log audit trail for each protected field change
    if (hasProtectedChanges) {
      const auditEntries = confirmedProtectedFields.map((field: string) => ({
        customerId: id,
        fieldName: field,
        oldValue: (existing as any)[field] ? String((existing as any)[field]) : null,
        newValue: changes[field] ? String(changes[field]) : null,
        changedById: user.id,
        wasWarned: true,
        action: 'edit',
        notes: hasActive1583 ? 'PS1583 re-filing triggered' : null,
      }));

      await (prisma as any).form1583AuditLog.createMany({
        data: auditEntries,
      });
    }

    return NextResponse.json({
      success: true,
      form1583Status: (updated as any).form1583Status,
      reFilingTriggered: hasProtectedChanges && hasActive1583,
    });
  } catch (err) {
    console.error('[PATCH /api/customers/[id]/change-guard]', err);
    return NextResponse.json({ error: 'Failed to apply protected changes' }, { status: 500 });
  }
}
