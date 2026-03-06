import { withApiHandler, ok } from '@/lib/api-utils';
import { getPaymentMode, isDemoMode } from '@/lib/payment-mode';
import { DEMO_CARD_DISPLAY } from '@/lib/demo-payment';

/**
 * GET /api/billing/demo-status
 *
 * Returns the current payment mode and demo instructions.
 * Useful for the frontend to conditionally show the demo badge
 * and provide test card instructions.
 */
export const GET = withApiHandler(async () => {
  const demo = isDemoMode();

  return ok({
    paymentMode: getPaymentMode(),
    isDemoMode: demo,
    ...(demo && {
      testCard: {
        number: DEMO_CARD_DISPLAY,
        expiry: 'Any future date',
        cvv: 'Any 3 digits',
      },
      message: 'Payments are simulated. No real charges will be processed.',
    }),
  });
});
