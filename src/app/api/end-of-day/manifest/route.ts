import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/end-of-day/manifest
 * BAR-80: Generate a carrier manifest for end-of-day processing.
 * Groups today's shipments by carrier and generates manifest data.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await request.json();
    const { carrier, date } = body;

    if (!carrier) {
      return NextResponse.json({ error: 'carrier is required' }, { status: 400 });
    }

    // Get today's date range (or specified date)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all shipments for this carrier today that need manifesting
    const shipments = await prisma.shipment.findMany({
      where: {
        carrier,
        customer: { tenantId: user.tenantId },
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['label_created', 'shipped'] },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, pmbNumber: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Generate manifest
    const manifestId = `MFT-${carrier.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const totalWeight = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
    const totalWholesale = shipments.reduce((sum, s) => sum + s.wholesaleCost, 0);
    const totalRetail = shipments.reduce((sum, s) => sum + s.retailPrice, 0);

    const manifest = {
      manifestId,
      carrier,
      date: targetDate.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      generatedBy: user.name || user.email,
      tenantId: user.tenantId,
      summary: {
        totalPackages: shipments.length,
        totalWeight: Math.round(totalWeight * 10) / 10,
        totalWholesaleCost: Math.round(totalWholesale * 100) / 100,
        totalRetailRevenue: Math.round(totalRetail * 100) / 100,
        totalProfit: Math.round((totalRetail - totalWholesale) * 100) / 100,
      },
      shipments: shipments.map((s, i) => ({
        seq: i + 1,
        id: s.id,
        trackingNumber: s.trackingNumber || 'N/A',
        service: s.service || 'Standard',
        destination: s.destination || 'N/A',
        weight: s.weight || 0,
        dimensions: s.dimensions || 'N/A',
        wholesaleCost: s.wholesaleCost,
        retailPrice: s.retailPrice,
        customer: s.customer
          ? `${s.customer.firstName} ${s.customer.lastName} (${s.customer.pmbNumber})`
          : 'Unknown',
        status: s.status,
      })),
      // Carrier-specific manifest format flags
      carrierManifestType: getCarrierManifestType(carrier),
    };

    return NextResponse.json(manifest, { status: 201 });
  } catch (err) {
    console.error('[POST /api/end-of-day/manifest]', err);
    return NextResponse.json({ error: 'Failed to generate manifest' }, { status: 500 });
  }
}

function getCarrierManifestType(carrier: string): string {
  switch (carrier.toLowerCase()) {
    case 'fedex':
      return 'FEDEX_GROUND_CLOSE'; // FedEx Ground End-of-Day close
    case 'usps':
      return 'USPS_SCAN_FORM'; // USPS SCAN form (indicia)
    case 'ups':
      return 'UPS_WORLDSHIP_EOD'; // UPS WorldShip end-of-day
    case 'dhl':
      return 'DHL_SHIPMENT_CLOSE';
    default:
      return 'GENERIC_MANIFEST';
  }
}

/**
 * GET /api/end-of-day/manifest
 * List manifests generated today (or specified date).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get shipment counts by carrier for today
    const shipments = await prisma.shipment.findMany({
      where: {
        customer: { tenantId: user.tenantId },
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['label_created', 'shipped'] },
      },
      select: { carrier: true, trackingNumber: true, weight: true, status: true },
    });

    // Group by carrier
    const byCarrier: Record<string, { count: number; totalWeight: number; trackingNumbers: string[] }> = {};
    for (const s of shipments) {
      if (!byCarrier[s.carrier]) {
        byCarrier[s.carrier] = { count: 0, totalWeight: 0, trackingNumbers: [] };
      }
      byCarrier[s.carrier].count++;
      byCarrier[s.carrier].totalWeight += s.weight || 0;
      if (s.trackingNumber) byCarrier[s.carrier].trackingNumbers.push(s.trackingNumber);
    }

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      carriers: byCarrier,
      totalShipments: shipments.length,
    });
  } catch (err) {
    console.error('[GET /api/end-of-day/manifest]', err);
    return NextResponse.json({ error: 'Failed to fetch manifest data' }, { status: 500 });
  }
}
