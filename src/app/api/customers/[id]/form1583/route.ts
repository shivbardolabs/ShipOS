/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/[id]/form1583
 * BAR-19: Get Form 1583 status and history for a customer.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pmbNumber: true,
        form1583Status: true,
        form1583Date: true,
        form1583Notarized: true,
        form1583FileUrl: true,
        form1583SignatureUrl: true,
        form1583NotarizedAt: true,
        form1583ExpiresAt: true,
        form1583Version: true,
        crdUploaded: true,
        crdUploadDate: true,
        homeAddress: true,
        homeCity: true,
        homeState: true,
        homeZip: true,
        idType: true,
        idExpiration: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get audit history
    const auditLog = await (prisma as any).form1583AuditLog.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Compute status details
    const now = new Date();
    const expiresAt = (customer as any).form1583ExpiresAt
      ? new Date((customer as any).form1583ExpiresAt)
      : null;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)
      : null;

    return NextResponse.json({
      ...(customer as any),
      form1583Date: (customer as any).form1583Date?.toISOString() ?? null,
      form1583NotarizedAt: (customer as any).form1583NotarizedAt?.toISOString() ?? null,
      form1583ExpiresAt: expiresAt?.toISOString() ?? null,
      crdUploadDate: (customer as any).crdUploadDate?.toISOString() ?? null,
      idExpiration: customer.idExpiration?.toISOString() ?? null,
      daysUntilExpiry,
      auditLog: auditLog.map((a: any) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/customers/[id]/form1583]', err);
    return NextResponse.json({ error: 'Failed to fetch Form 1583 data' }, { status: 500 });
  }
}

/**
 * PATCH /api/customers/[id]/form1583
 * BAR-19: Update Form 1583 status, upload document, record notarization.
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
    const {
      form1583Status,
      form1583FileUrl,
      form1583SignatureUrl,
      form1583Notarized,
      form1583NotarizedAt,
      crdUploaded,
    } = body;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (form1583Status !== undefined) updateData.form1583Status = form1583Status;
    if (form1583FileUrl !== undefined) updateData.form1583FileUrl = form1583FileUrl;
    if (form1583SignatureUrl !== undefined) updateData.form1583SignatureUrl = form1583SignatureUrl;
    if (form1583Notarized !== undefined) {
      updateData.form1583Notarized = form1583Notarized;
      if (form1583Notarized && !existing.form1583Notarized) {
        const notarizedDate = form1583NotarizedAt ? new Date(form1583NotarizedAt) : new Date();
        updateData.form1583NotarizedAt = notarizedDate;
        // PS1583 is valid for 1 year from notarization
        const expiresAt = new Date(notarizedDate);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        updateData.form1583ExpiresAt = expiresAt;
      }
    }
    if (crdUploaded !== undefined) {
      updateData.crdUploaded = crdUploaded;
      if (crdUploaded && !(existing as any).crdUploaded) {
        updateData.crdUploadDate = new Date();
      }
    }

    // If status is being set to "verified", set the form date
    if (form1583Status === 'verified' && existing.form1583Status !== 'verified') {
      updateData.form1583Date = new Date();
      updateData.form1583Version = ((existing as any).form1583Version || 0) + 1;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Log the status change
    await (prisma as any).form1583AuditLog.create({
      data: {
        customerId: id,
        fieldName: 'form1583Status',
        oldValue: existing.form1583Status,
        newValue: form1583Status || existing.form1583Status,
        changedById: user.id,
        wasWarned: false,
        action: 'status_change',
        notes: body.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      form1583Status: (updated as any).form1583Status,
      form1583Version: (updated as any).form1583Version,
    });
  } catch (err) {
    console.error('[PATCH /api/customers/[id]/form1583]', err);
    return NextResponse.json({ error: 'Failed to update Form 1583' }, { status: 500 });
  }
}
