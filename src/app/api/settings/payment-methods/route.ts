import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  Payment Methods Configuration                                             */
/*  BAR-247: Payment Methods Configuration                                    */
/*                                                                            */
/*  GET  — Retrieve current payment method settings for the tenant            */
/*  POST — Update enabled payment methods                                     */
/* -------------------------------------------------------------------------- */

export interface PaymentMethodsConfig {
  /** Card number keyed manually (phone orders, chip/tap failures) */
  manualCard: boolean;
  /** SMS payment link sent to customer */
  text2pay: boolean;
  /** Device used as NFC contactless terminal (Apple Pay, Google Pay) */
  tapToGlass: boolean;
  /** External NFC card reader (Stripe Terminal, Square Reader) */
  nfcReader: boolean;
  /** Cash — defer to store POS */
  cash: boolean;
  /** Post charges to customer account for later billing */
  postToAccount: boolean;
  /** Hardware terminal integration ID (optional) */
  terminalDeviceId?: string;
  /** Payment processor name */
  processorName?: string;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodsConfig = {
  manualCard: false,
  text2pay: false,
  tapToGlass: false,
  nfcReader: false,
  cash: true,
  postToAccount: true,
};

function parsePaymentMethods(json: string | null): PaymentMethodsConfig {
  if (!json) return { ...DEFAULT_PAYMENT_METHODS };
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_PAYMENT_METHODS, ...parsed };
  } catch {
    return { ...DEFAULT_PAYMENT_METHODS };
  }
}

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const PaymentMethodsSchema = z.object({
  manualCard: z.boolean().optional(),
  text2pay: z.boolean().optional(),
  tapToGlass: z.boolean().optional(),
  nfcReader: z.boolean().optional(),
  cash: z.boolean().optional(),
  postToAccount: z.boolean().optional(),
  terminalDeviceId: z.string().optional(),
  processorName: z.string().optional(),
});

const UpdatePaymentMethodsSchema = z.object({
  paymentMethods: PaymentMethodsSchema,
});

/* -------------------------------------------------------------------------- */
/*  GET /api/settings/payment-methods                                         */
/* -------------------------------------------------------------------------- */

export const GET = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId! },
    select: { paymentMethods: true },
  });

  if (!tenant) badRequest('Tenant not found');

  const config = parsePaymentMethods(tenant!.paymentMethods);

  return ok({ paymentMethods: config });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/settings/payment-methods                                        */
/*  Body: { paymentMethods: PaymentMethodsConfig }                            */
/* -------------------------------------------------------------------------- */

export const POST = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const { paymentMethods } = await validateBody(request, UpdatePaymentMethodsSchema);

  // Validate structure
  const config: PaymentMethodsConfig = {
    manualCard: !!paymentMethods.manualCard,
    text2pay: !!paymentMethods.text2pay,
    tapToGlass: !!paymentMethods.tapToGlass,
    nfcReader: !!paymentMethods.nfcReader,
    cash: !!paymentMethods.cash,
    postToAccount: !!paymentMethods.postToAccount,
    terminalDeviceId: paymentMethods.terminalDeviceId || undefined,
    processorName: paymentMethods.processorName || undefined,
  };

  // Ensure at least one method is enabled
  const anyEnabled =
    config.manualCard ||
    config.text2pay ||
    config.tapToGlass ||
    config.nfcReader ||
    config.cash ||
    config.postToAccount;

  if (!anyEnabled) {
    badRequest('At least one payment method must be enabled');
  }

  await prisma.tenant.update({
    where: { id: user.tenantId! },
    data: { paymentMethods: JSON.stringify(config) },
  });

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        action: 'settings.payment_methods_updated',
        entityType: 'tenant',
        entityId: user.tenantId!,
        userId: user.id,
        details: JSON.stringify({ paymentMethods: config }),
      },
    });
  } catch {
    console.error('[settings/payment-methods] Audit log failed');
  }

  return ok({
    success: true,
    paymentMethods: config,
  });
});
