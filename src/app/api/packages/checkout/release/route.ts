import { withApiHandler, validateBody, ok, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  calculateFees,
  buildLineItems,
  DEFAULT_FEE_CONFIG,
} from '@/lib/checkout/fees';
import { renderReceipt, buildReceiptData } from '@/lib/checkout/receipt';
import { onPackageCheckout } from '@/lib/charge-event-service';
import type { FeeConfig, PackageForFees } from '@/lib/checkout/fees';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/checkout/release                                       */
/*  BAR-99: Release to Recipient Workflow                                     */
/* -------------------------------------------------------------------------- */

const ReleaseSchema = z.object({
  packageIds: z.array(z.string()).min(1, 'packageIds is required'),
  customerId: z.string().min(1, 'customerId is required'),
  employeeId: z.string().min(1, 'employeeId is required'),
  paymentMethod: z.string().default('post_to_account'),
  signatureData: z.string().optional(),
  delegateName: z.string().optional(),
  delegateIdType: z.string().optional(),
  delegateIdNumber: z.string().optional(),
  receiptMethod: z.string().default('none'),
  addOnTotal: z.number().default(0),
});

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

export const POST = withApiHandler(async (request, { user }) => {
  const {
    packageIds,
    customerId,
    employeeId,
    paymentMethod,
    signatureData,
    delegateName,
    delegateIdType,
    delegateIdNumber,
    receiptMethod,
    addOnTotal,
  } = await validateBody(request, ReleaseSchema);

  const tenantId = user.tenantId!;

  // Verify customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) {
    notFound('Customer not found');
  }

  // Verify employee
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
  });
  if (!employee) {
    notFound('Employee not found');
  }

  // Load eligible packages scoped to tenant
  const packages = await prisma.package.findMany({
    where: {
      id: { in: packageIds },
      customerId,
      status: { in: ['checked_in', 'notified', 'ready'] },
      customer: { tenantId },
    },
  });

  if (packages.length === 0) {
    notFound('No eligible packages found for release');
  }

  // Load fee config from tenant
  let feeConfig: FeeConfig = { ...DEFAULT_FEE_CONFIG };
  let storeName = 'ShipOS Store';
  let storeAddress: string | undefined;
  let storePhone: string | undefined;
  let storeLogo: string | undefined;

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

  // --- BAR-308: Auto-generate storage charge events ---
  try {
    const storagePackages = feeResult.packages
      .filter((p) => p.billableDays > 0 && p.storageFee > 0)
      .map((p) => {
        const originalPkg = packages.find((op) => op.id === p.packageId);
        return {
          id: p.packageId,
          checkedInAt: originalPkg?.checkedInAt || new Date(),
          storageFee: p.storageFee,
          billableDays: p.billableDays,
        };
      });

    if (storagePackages.length > 0) {
      await onPackageCheckout({
        tenantId,
        customerId,
        pmbNumber: customer.pmbNumber,
        packages: storagePackages,
        createdById: employeeId,
      });
    }
  } catch (err) {
    // Charge event generation is non-blocking — log but don't fail checkout
    console.error('[checkout/release] Charge event generation failed:', err);
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

  return ok({
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
});
