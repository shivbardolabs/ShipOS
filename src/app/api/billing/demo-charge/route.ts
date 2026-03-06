import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import { isDemoMode } from '@/lib/payment-mode';
import { DemoPaymentProcessor } from '@/lib/demo-payment';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const DemoChargeSchema = z.object({
  cardNumber: z.string().min(1, 'Card number is required'),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  cvv: z.string().min(3).max(4),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('usd'),
  description: z.string().optional(),
});

/**
 * POST /api/billing/demo-charge
 *
 * Process a demo payment charge. Only works in demo mode.
 * Validates the demo card (0000 0000 0000 0000) and returns a mock transaction.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!isDemoMode()) {
    forbidden('Demo charge endpoint is only available in demo mode');
  }

  const body = await validateBody(request, DemoChargeSchema);

  // Validate the demo card
  const validation = DemoPaymentProcessor.validateCard({
    number: body.cardNumber,
    expMonth: body.expMonth,
    expYear: body.expYear,
    cvv: body.cvv,
  });

  if (!validation.valid) {
    badRequest(validation.error || 'Invalid demo card');
  }

  // Process the demo charge
  const charge = DemoPaymentProcessor.charge(body.amount, body.currency);

  return ok({
    ...charge,
    description: body.description || 'Demo charge',
    demo: true,
  });
});
