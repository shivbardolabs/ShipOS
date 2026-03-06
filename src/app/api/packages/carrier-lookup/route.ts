import { withApiHandler, validateBody, ok } from '@/lib/api-utils';
import { lookupCarrierTracking } from '@/lib/carrier-api';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/carrier-lookup                                         */
/*  BAR-240: Carrier API Integration for Sender/Recipient Data Enrichment     */
/*                                                                            */
/*  After scanning a tracking number, call this endpoint to fetch             */
/*  sender/recipient data from the carrier's tracking API.                    */
/* -------------------------------------------------------------------------- */

const LookupSchema = z.object({
  trackingNumber: z.string().min(1, 'trackingNumber is required'),
  carrier: z.string().min(1, 'carrier is required'),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { trackingNumber, carrier } = await validateBody(request, LookupSchema);

  const result = await lookupCarrierTracking(trackingNumber, carrier);

  return ok({
    success: !result.error,
    data: result,
  });
});
