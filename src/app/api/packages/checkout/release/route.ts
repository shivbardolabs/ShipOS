import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  calculateFees,
  buildLineItems,
  DEFAULT_FEE_CONFIG,
} from '@/lib/checkout/fees';
import { renderReceipt, buildReceiptData } from '@/lib/checkout/receipt';
import type { FeeConfig, PackageForFees } from '@/lib/checkout/fees';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/checkout/release                                       */
/*  BAR-99: Release to Recipient Workflow                                     */
/*                                                                            */
/*  Body:                                                                     */
/*    packageIds       — string[]                                             */
/*    customerId       — string                                               */
/*    employeeId       — string     (staff performing checkout)               */
/*    tenantId         — string?                                              */
/*    paymentMethod    — string     (post_to_account, cash, etc.)             */
/*    signatureData    — string?    (base64 data URL)                         */
/*    delegateName     — string?                                              */
/*    delegateIdType   — string?                                              */
/*    delegateIdNumber — string?                                              */
/*    receiptMethod    — string     (email, sms, print, sms+print, none)      */
/*    addOnTotal       — number?                                              */
/* -------------------------------------------------------------------------- */

function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${dateStr}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      packageIds,
      customerId,
      employeeId,
      tenantId,
      paymentMethod = 'post_to_account',
      signatureData,
      delegateName,
      delegateIdType,
      delegateIdNumber,
      receiptMethod = 'none',
      addOnTotal = 0,
    } = body;

    if (!packageIds?.length || !customerId || !employeeId) {
      return NextResponse.json(
        { error: 'packageIds, customerId, and employeeId are required' },
        { status: 400 },
      );
    }

    // Verify customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify employee
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Load eligible packages
    const packages = await prisma.package.findMany({
      where: {
        id: { in: packageIds },
        customerId,
        status: { in: ['checked_in', 'notified', 'ready'] },
      },
    });

    if (packages.length === 0) {
      return NextResponse.json(
        { error: 'No eligible packages found for release' },
        { status: 404 },
      );
    }

    // Load fee config from tenant
    let feeConfig: FeeConfig = { ...DEFAULT_FEE_CONFIG };
    let storeName = 'ShipOS Store';
    let storeAddress: string | undefined;
    let storePhone: string | undefined;
    let storeLogo: string | undefined;

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenant) {
        feeConfig = {
          storageRate: tenant.storageRate,
          storageFreedays: tenant.storageFreedays,
          storageCountWeekends: tenant.storageCountWeekends,
          receivingFeeRate: tenant.receivingFeeRate,
          packageQuota: tenant.packageQuota,
          packageQuotaOverage: tenant.packageQuotaOverage,
          taxRate: tenant.taxRate,
        };
        storeName = tenant.name;
        storeAddress = [tenant.address, tenant.city, tenant.state, tenant.zipCode]
          .filter(Boolean)
          .join(', ');
        storePhone = tenant.phone ?? undefined;
        storeLogo = tenant.logoUrl ?? undefined;
      }
    }

    // Calculate fees
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await prisma.package.count({
      where: { customerId, checkedInAt: { gte: monthStart } },
    });

    const pkgsForFees: PackageForFees[] = packages.map((p) => ({
      id: p.id,
      checkedInAt: p.checkedInAt,
      receivingFee: p.receivingFee,
      carrier: p.carrier,
      trackingNumber: p.trackingNumber,
      packageType: p.packageType,
      storageFee: p.storageFee,
    }));

    const feeResult = calculateFees(
      pkgsForFees,
      feeConfig,
      monthlyCount - packages.length,
      addOnTotal,
      now,
    );
    const lineItems = buildLineItems(feeResult);

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    const releasedIds = packages.map((p) => p.id);

    // Update packages to released status
    await prisma.package.updateMany({
      where: { id: { in: releasedIds } },
      data: {
        status: 'released',
        releasedAt: now,
        releaseSignature: signatureData || null,
        delegateName: delegateName || null,
        delegateIdType: delegateIdType || null,
        delegateIdNumber: delegateIdNumber || null,
        checkedOutById: employeeId,
      },
    });

    // Update individual package fee fields
    for (const pkgFee of feeResult.packages) {
      await prisma.package.update({
        where: { id: pkgFee.packageId },
        data: {
          storageFee: pkgFee.storageFee,
          receivingFee: pkgFee.receivingFee,
          quotaFee: pkgFee.quotaFee,
        },
      });
    }

    // Create checkout transaction record
    const transaction = await prisma.checkoutTransaction.create({
      data: {
        customerId,
        employeeId,
        invoiceNumber,
        storageFees: feeResult.storageFeeTotal,
        receivingFees: feeResult.receivingFeeTotal,
        quotaFees: feeResult.quotaFeeTotal,
        addOnFees: feeResult.addOnTotal,
        subtotal: feeResult.subtotal,
        taxRate: feeResult.taxRate,
        taxAmount: feeResult.taxAmount,
        total: feeResult.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'post_to_account' ? 'pending' : 'completed',
        packageIds: JSON.stringify(releasedIds),
        packageCount: releasedIds.length,
        recipientName: delegateName || null,
        recipientIdType: delegateIdType || null,
        signatureData: signatureData || null,
        receiptMethod,
        lineItems: JSON.stringify(lineItems),
      },
    });

    // Create audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          action: 'package.checkout_release',
          entityType: 'checkout_transaction',
          entityId: transaction.id,
          userId: employeeId,
          details: JSON.stringify({
            invoiceNumber,
            packageCount: releasedIds.length,
            total: feeResult.total,
            paymentMethod,
            customerName: `${customer.firstName} ${customer.lastName}`,
            pmbNumber: customer.pmbNumber,
            hasSignature: !!signatureData,
            delegateName: delegateName || null,
          }),
        },
      });
    } catch {
      console.error('[checkout/release] Audit log write failed');
    }

    // Generate receipt HTML
    const receiptData = buildReceiptData(feeResult, lineItems, {
      invoiceNumber,
      storeName,
      storeAddress,
      storePhone,
      storeLogo,
      customerName: `${customer.firstName} ${customer.lastName}`,
      pmbNumber: customer.pmbNumber,
      packages: packages.map((p) => ({
        id: p.id,
        trackingNumber: p.trackingNumber,
        carrier: p.carrier,
        packageType: p.packageType,
      })),
      paymentMethod,
      employeeName: employee.name,
      signatureDataUrl: signatureData,
    });

    const receiptHtml = renderReceipt(receiptData);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        invoiceNumber,
        total: feeResult.total,
        packageCount: releasedIds.length,
        paymentMethod,
        paymentStatus: transaction.paymentStatus,
      },
      feeBreakdown: feeResult,
      lineItems,
      receiptHtml,
      released: releasedIds.length,
      skipped: packageIds.length - releasedIds.length,
    });
  } catch (error) {
    console.error('[checkout/release] Error:', error);
    return NextResponse.json(
      { error: 'Failed to release packages' },
      { status: 500 },
    );
  }
}
