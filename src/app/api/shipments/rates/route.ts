import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';

/**
 * POST /api/shipments/rates
 * BAR-16: Carrier rate estimation.
 * Returns estimated rates for available carriers/services based on package dimensions and destination.
 * Initially uses configurable base rates; can be swapped for live API calls later.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { weight = 1, length = 10, width = 8, height = 6, destination = '', international = false } = body;

    // Calculate dimensional weight (industry standard: L×W×H / 139 for domestic)
    const dimWeight = (length * width * height) / (international ? 166 : 139);
    const billableWeight = Math.max(weight, dimWeight);

    // Base rate tables (configurable per tenant in future)
    const domesticRates: { carrier: string; service: string; baseRate: number; perLb: number; transitDays: string }[] = [
      { carrier: 'usps', service: 'Ground Advantage', baseRate: 4.50, perLb: 0.55, transitDays: '2-5' },
      { carrier: 'usps', service: 'Priority Mail', baseRate: 8.00, perLb: 0.75, transitDays: '1-3' },
      { carrier: 'usps', service: 'Priority Mail Express', baseRate: 26.00, perLb: 1.10, transitDays: '1-2' },
      { carrier: 'ups', service: 'Ground', baseRate: 9.50, perLb: 0.85, transitDays: '3-5' },
      { carrier: 'ups', service: '2-Day Air', baseRate: 22.00, perLb: 1.50, transitDays: '2' },
      { carrier: 'ups', service: 'Next Day Air', baseRate: 38.00, perLb: 2.20, transitDays: '1' },
      { carrier: 'fedex', service: 'Ground', baseRate: 9.75, perLb: 0.90, transitDays: '3-5' },
      { carrier: 'fedex', service: 'Express', baseRate: 24.00, perLb: 1.60, transitDays: '2' },
      { carrier: 'fedex', service: 'Overnight', baseRate: 42.00, perLb: 2.40, transitDays: '1' },
      { carrier: 'dhl', service: 'Ground', baseRate: 10.00, perLb: 0.95, transitDays: '3-5' },
    ];

    const intlRates: { carrier: string; service: string; baseRate: number; perLb: number; transitDays: string }[] = [
      { carrier: 'usps', service: 'First Class Intl', baseRate: 14.00, perLb: 1.80, transitDays: '7-21' },
      { carrier: 'usps', service: 'Priority Mail Intl', baseRate: 28.00, perLb: 2.50, transitDays: '6-10' },
      { carrier: 'ups', service: 'Worldwide Expedited', baseRate: 45.00, perLb: 3.50, transitDays: '3-5' },
      { carrier: 'fedex', service: 'Intl Economy', baseRate: 40.00, perLb: 3.20, transitDays: '4-6' },
      { carrier: 'fedex', service: 'Intl Priority', baseRate: 55.00, perLb: 4.00, transitDays: '1-3' },
      { carrier: 'dhl', service: 'Intl Express', baseRate: 48.00, perLb: 3.80, transitDays: '2-4' },
    ];

    const rates = (international ? intlRates : domesticRates).map((r) => {
      const estimatedCost = r.baseRate + r.perLb * billableWeight;
      return {
        carrier: r.carrier,
        service: r.service,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        transitDays: r.transitDays,
        billableWeight: Math.round(billableWeight * 10) / 10,
      };
    });

    // Sort by price ascending
    rates.sort((a, b) => a.estimatedCost - b.estimatedCost);

    return NextResponse.json({ rates, billableWeight: Math.round(billableWeight * 10) / 10 });
  } catch (err) {
    console.error('[POST /api/shipments/rates]', err);
    return NextResponse.json({ error: 'Failed to estimate rates' }, { status: 500 });
  }
}
