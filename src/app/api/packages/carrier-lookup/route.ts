import { NextRequest, NextResponse } from 'next/server';
import { lookupCarrierTracking } from '@/lib/carrier-api';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/carrier-lookup                                         */
/*  BAR-240: Carrier API Integration for Sender/Recipient Data Enrichment     */
/*                                                                            */
/*  After scanning a tracking number, call this endpoint to fetch             */
/*  sender/recipient data from the carrier's tracking API.                    */
/* -------------------------------------------------------------------------- */

interface LookupBody {
  trackingNumber: string;
  carrier: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LookupBody = await request.json();

    if (!body.trackingNumber || !body.carrier) {
      return NextResponse.json(
        { error: 'trackingNumber and carrier are required' },
        { status: 400 }
      );
    }

    const result = await lookupCarrierTracking(
      body.trackingNumber,
      body.carrier
    );

    return NextResponse.json({
      success: !result.error,
      data: result,
    });
  } catch (error) {
    console.error('[carrier-lookup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to look up carrier tracking data' },
      { status: 500 }
    );
  }
}
