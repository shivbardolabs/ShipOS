import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  Payment Methods Configuration                                             */
/*  BAR-247: Payment Methods Configuration                                    */
/*                                                                            */
/*  GET  — Retrieve current payment method settings for a tenant              */
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

/* -------------------------------------------------------------------------- */
/*  GET /api/settings/payment-methods?tenantId=...                            */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { paymentMethods: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 },
      );
    }

    const config = parsePaymentMethods(tenant.paymentMethods);

    return NextResponse.json({ paymentMethods: config });
  } catch (error) {
    console.error('[settings/payment-methods] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load payment methods' },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/settings/payment-methods                                        */
/*  Body: { tenantId, paymentMethods: PaymentMethodsConfig }                  */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, paymentMethods } = body;

    if (!tenantId || !paymentMethods) {
      return NextResponse.json(
        { error: 'tenantId and paymentMethods are required' },
        { status: 400 },
      );
    }

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
      return NextResponse.json(
        { error: 'At least one payment method must be enabled' },
        { status: 400 },
      );
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { paymentMethods: JSON.stringify(config) },
    });

    // Audit log
    try {
      const systemUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            action: 'settings.payment_methods_updated',
            entityType: 'tenant',
            entityId: tenantId,
            userId: systemUser.id,
            details: JSON.stringify({ paymentMethods: config }),
          },
        });
      }
    } catch {
      console.error('[settings/payment-methods] Audit log failed');
    }

    return NextResponse.json({
      success: true,
      paymentMethods: config,
    });
  } catch (error) {
    console.error('[settings/payment-methods] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment methods' },
      { status: 500 },
    );
  }
}
