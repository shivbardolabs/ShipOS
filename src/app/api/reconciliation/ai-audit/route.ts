import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  POST /api/reconciliation/ai-audit                                         */
/*  Accepts a carrier invoice (PDF as base64 or CSV text) and returns         */
/*  AI-powered audit findings with cross-referenced discrepancies.            */
/* -------------------------------------------------------------------------- */

export interface AuditDiscrepancy {
  id: string;
  type: string;
  trackingNumber: string;
  description: string;
  chargedAmount: number;
  correctAmount: number;
  overchargeAmount: number;
  confidence: number;
}

export interface AuditSummary {
  totalCharges: number;
  totalOvercharges: number;
  discrepancyCount: number;
  carrier: string;
}

export interface AuditResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  summary: AuditSummary;
  discrepancies: AuditDiscrepancy[];
  error?: string;
}

/* ── Mock ShipOS shipment records for cross-referencing ─────────────────── */
const MOCK_SHIPMENTS: Record<string, { weight: number; service: string; zone: number; negotiatedRate: number; address: { residential: boolean } }> = {
  '1Z999AA10123456784': { weight: 4.2, service: 'UPS Ground', zone: 5, negotiatedRate: 12.45, address: { residential: false } },
  '1Z999AA10123456791': { weight: 2.8, service: 'UPS Ground', zone: 3, negotiatedRate: 9.80, address: { residential: true } },
  '1Z999AA10123456808': { weight: 15.0, service: 'UPS 2nd Day Air', zone: 4, negotiatedRate: 24.30, address: { residential: false } },
  '1Z999AA10123456815': { weight: 1.1, service: 'UPS Ground', zone: 2, negotiatedRate: 7.95, address: { residential: false } },
  '1Z999AA10123456822': { weight: 8.5, service: 'UPS Next Day Air', zone: 6, negotiatedRate: 38.50, address: { residential: true } },
  '1Z999AA10123456839': { weight: 3.0, service: 'UPS Ground', zone: 4, negotiatedRate: 10.20, address: { residential: false } },
  '1Z999AA10123456846': { weight: 6.3, service: 'UPS 3 Day Select', zone: 5, negotiatedRate: 18.75, address: { residential: false } },
  '1Z999AA10123456853': { weight: 22.0, service: 'UPS Ground', zone: 7, negotiatedRate: 28.60, address: { residential: true } },
  '794644790128': { weight: 5.5, service: 'FedEx Ground', zone: 4, negotiatedRate: 11.90, address: { residential: false } },
  '794644790135': { weight: 3.2, service: 'FedEx Express Saver', zone: 3, negotiatedRate: 16.40, address: { residential: false } },
  '794644790142': { weight: 12.0, service: 'FedEx Home Delivery', zone: 5, negotiatedRate: 19.50, address: { residential: true } },
  '794644790159': { weight: 1.8, service: 'FedEx Ground', zone: 2, negotiatedRate: 8.25, address: { residential: false } },
};

/* ── Demo audit results — realistic findings for UPS invoice ───────────── */
const DEMO_DISCREPANCIES_UPS: AuditDiscrepancy[] = [
  {
    id: 'disc_001',
    type: 'weight_overcharge',
    trackingNumber: '1Z999AA10123456784',
    description: 'Carrier billed 6.0 lbs but actual weight is 4.2 lbs. Excess weight charge of $3.87 applied.',
    chargedAmount: 16.32,
    correctAmount: 12.45,
    overchargeAmount: 3.87,
    confidence: 0.94,
  },
  {
    id: 'disc_002',
    type: 'duplicate_charge',
    trackingNumber: '1Z999AA10123456791',
    description: 'Shipment billed twice on invoice lines 14 and 47. Second charge of $9.80 is a duplicate.',
    chargedAmount: 19.60,
    correctAmount: 9.80,
    overchargeAmount: 9.80,
    confidence: 0.98,
  },
  {
    id: 'disc_003',
    type: 'invalid_surcharge',
    trackingNumber: '1Z999AA10123456808',
    description: 'Extended Area Surcharge applied but delivery ZIP 10001 is not in UPS extended area list.',
    chargedAmount: 28.50,
    correctAmount: 24.30,
    overchargeAmount: 4.20,
    confidence: 0.89,
  },
  {
    id: 'disc_004',
    type: 'service_mismatch',
    trackingNumber: '1Z999AA10123456815',
    description: 'Billed as UPS 2nd Day Air ($14.95) but shipment was booked as UPS Ground ($7.95).',
    chargedAmount: 14.95,
    correctAmount: 7.95,
    overchargeAmount: 7.00,
    confidence: 0.92,
  },
  {
    id: 'disc_005',
    type: 'residential_surcharge',
    trackingNumber: '1Z999AA10123456839',
    description: 'Residential surcharge of $4.35 applied to a verified commercial address.',
    chargedAmount: 14.55,
    correctAmount: 10.20,
    overchargeAmount: 4.35,
    confidence: 0.91,
  },
  {
    id: 'disc_006',
    type: 'address_correction',
    trackingNumber: '1Z999AA10123456846',
    description: 'Address correction fee of $13.00 applied but original address was valid and deliverable.',
    chargedAmount: 31.75,
    correctAmount: 18.75,
    overchargeAmount: 13.00,
    confidence: 0.87,
  },
  {
    id: 'disc_007',
    type: 'weight_overcharge',
    trackingNumber: '1Z999AA10123456853',
    description: 'Carrier billed at dimensional weight 30 lbs but actual/dim weight should be 22.0 lbs.',
    chargedAmount: 35.80,
    correctAmount: 28.60,
    overchargeAmount: 7.20,
    confidence: 0.93,
  },
  {
    id: 'disc_008',
    type: 'late_delivery',
    trackingNumber: '1Z999AA10123456822',
    description: 'UPS Next Day Air guaranteed delivery missed by 2 hours. Full refund eligible under GSR.',
    chargedAmount: 42.70,
    correctAmount: 0.00,
    overchargeAmount: 42.70,
    confidence: 0.96,
  },
];

const DEMO_DISCREPANCIES_FEDEX: AuditDiscrepancy[] = [
  {
    id: 'disc_101',
    type: 'weight_overcharge',
    trackingNumber: '794644790128',
    description: 'Carrier billed 8.0 lbs but actual weight is 5.5 lbs. Overcharge of $4.15.',
    chargedAmount: 16.05,
    correctAmount: 11.90,
    overchargeAmount: 4.15,
    confidence: 0.95,
  },
  {
    id: 'disc_102',
    type: 'invalid_surcharge',
    trackingNumber: '794644790135',
    description: 'Fuel surcharge rate of 14.5% applied instead of agreed 11.0%. Excess charge of $1.14.',
    chargedAmount: 17.54,
    correctAmount: 16.40,
    overchargeAmount: 1.14,
    confidence: 0.88,
  },
  {
    id: 'disc_103',
    type: 'residential_surcharge',
    trackingNumber: '794644790142',
    description: 'Additional Handling surcharge of $5.25 applied incorrectly — package dimensions within limits.',
    chargedAmount: 24.75,
    correctAmount: 19.50,
    overchargeAmount: 5.25,
    confidence: 0.90,
  },
  {
    id: 'disc_104',
    type: 'duplicate_charge',
    trackingNumber: '794644790159',
    description: 'Delivery confirmation fee of $3.20 charged but already included in service level.',
    chargedAmount: 11.45,
    correctAmount: 8.25,
    overchargeAmount: 3.20,
    confidence: 0.93,
  },
];

const DEMO_DISCREPANCIES_USPS: AuditDiscrepancy[] = [
  {
    id: 'disc_201',
    type: 'service_mismatch',
    trackingNumber: '9400111899223100012847',
    description: 'Billed as Priority Mail Express ($28.75) but shipped as Priority Mail ($9.45).',
    chargedAmount: 28.75,
    correctAmount: 9.45,
    overchargeAmount: 19.30,
    confidence: 0.95,
  },
  {
    id: 'disc_202',
    type: 'weight_overcharge',
    trackingNumber: '9400111899223100012854',
    description: 'Billed weight 5 lbs but actual was 2.1 lbs. Zone 4 rate difference of $3.60.',
    chargedAmount: 12.80,
    correctAmount: 9.20,
    overchargeAmount: 3.60,
    confidence: 0.91,
  },
];

const DEMO_DISCREPANCIES_DHL: AuditDiscrepancy[] = [
  {
    id: 'disc_301',
    type: 'invalid_surcharge',
    trackingNumber: 'JD014600011438483201',
    description: 'Remote area surcharge applied but delivery address is within standard service area.',
    chargedAmount: 45.00,
    correctAmount: 32.50,
    overchargeAmount: 12.50,
    confidence: 0.88,
  },
  {
    id: 'disc_302',
    type: 'weight_overcharge',
    trackingNumber: 'JD014600011438483218',
    description: 'Volumetric weight calculation used 5000 divisor instead of agreed 6000. Overcharge of $8.40.',
    chargedAmount: 38.20,
    correctAmount: 29.80,
    overchargeAmount: 8.40,
    confidence: 0.92,
  },
];

function getDemoDiscrepancies(carrier: string): AuditDiscrepancy[] {
  switch (carrier.toLowerCase()) {
    case 'fedex': return DEMO_DISCREPANCIES_FEDEX;
    case 'usps': return DEMO_DISCREPANCIES_USPS;
    case 'dhl': return DEMO_DISCREPANCIES_DHL;
    default: return DEMO_DISCREPANCIES_UPS;
  }
}

function buildSummary(carrier: string, discrepancies: AuditDiscrepancy[]): AuditSummary {
  const totalOvercharges = discrepancies.reduce((s, d) => s + d.overchargeAmount, 0);
  const totalCharges = discrepancies.reduce((s, d) => s + d.chargedAmount, 0);
  return {
    totalCharges: parseFloat(totalCharges.toFixed(2)),
    totalOvercharges: parseFloat(totalOvercharges.toFixed(2)),
    discrepancyCount: discrepancies.length,
    carrier,
  };
}

/* ── AI prompt for invoice parsing ─────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a shipping invoice auditor AI for a postal mailbox store (CMRA).
You analyze carrier invoices and identify potential billing discrepancies.

Given the invoice data, extract each line item and compare against the provided shipment records.
Look for these discrepancy types:
- weight_overcharge: billed weight exceeds actual weight
- duplicate_charge: same tracking number billed more than once
- invalid_surcharge: surcharges that should not apply
- service_mismatch: billed service differs from booked service
- address_correction: address correction fees for valid addresses
- residential_surcharge: residential fees applied to commercial addresses
- late_delivery: guaranteed service missed delivery window (eligible for refund)

Return ONLY a JSON object with this exact structure:
{
  "lineItems": [
    {
      "trackingNumber": "string",
      "service": "string",
      "billedWeight": number,
      "chargedAmount": number,
      "surcharges": ["string"]
    }
  ],
  "discrepancies": [
    {
      "type": "weight_overcharge|duplicate_charge|invalid_surcharge|service_mismatch|address_correction|residential_surcharge|late_delivery",
      "trackingNumber": "string",
      "description": "string",
      "chargedAmount": number,
      "correctAmount": number,
      "overchargeAmount": number,
      "confidence": 0.0-1.0
    }
  ]
}

No markdown, no explanation — only valid JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoice, carrier, format } = body as {
      invoice: string;
      carrier: string;
      format: 'pdf' | 'csv';
    };

    if (!invoice) {
      return NextResponse.json(
        { success: false, mode: 'ai', summary: { totalCharges: 0, totalOvercharges: 0, discrepancyCount: 0, carrier: carrier || 'unknown' }, discrepancies: [], error: 'No invoice data provided' },
        { status: 400 }
      );
    }

    if (!carrier) {
      return NextResponse.json(
        { success: false, mode: 'ai', summary: { totalCharges: 0, totalOvercharges: 0, discrepancyCount: 0, carrier: 'unknown' }, discrepancies: [], error: 'No carrier specified' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* ── Demo mode when no API key ─────────────────────────────────────── */
    if (!apiKey) {
      // Simulate processing delay for realism
      await new Promise((r) => setTimeout(r, 2000));

      const discrepancies = getDemoDiscrepancies(carrier);
      const summary = buildSummary(carrier, discrepancies);

      return NextResponse.json({
        success: true,
        mode: 'demo',
        summary,
        discrepancies,
      } satisfies AuditResponse);
    }

    /* ── Real AI call ─────────────────────────────────────────────────── */
    const shipmentContext = JSON.stringify(MOCK_SHIPMENTS, null, 2);

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> }>;

    if (format === 'pdf') {
      // PDF → send as image to GPT-4o Vision
      const base64Data = invoice.startsWith('data:')
        ? invoice
        : `data:application/pdf;base64,${invoice}`;

      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this ${carrier.toUpperCase()} carrier invoice and cross-reference against our shipment records:\n\n${shipmentContext}\n\nIdentify all discrepancies and overcharges.`,
            },
            {
              type: 'image_url',
              image_url: { url: base64Data, detail: 'high' },
            },
          ],
        },
      ];
    } else {
      // CSV → send as text to GPT-4o
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this ${carrier.toUpperCase()} carrier invoice CSV data and cross-reference against our shipment records.\n\nInvoice CSV:\n${invoice}\n\nShipment records:\n${shipmentContext}\n\nIdentify all discrepancies and overcharges.`,
        },
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);

      let detail = `OpenAI returned ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        detail = errJson?.error?.message ?? detail;
      } catch {
        // keep generic detail
      }

      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          summary: { totalCharges: 0, totalOvercharges: 0, discrepancyCount: 0, carrier },
          discrepancies: [],
          error: `AI analysis error: ${detail}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: { discrepancies?: Array<{ type: string; trackingNumber: string; description: string; chargedAmount: number; correctAmount: number; overchargeAmount: number; confidence: number }> };
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          summary: { totalCharges: 0, totalOvercharges: 0, discrepancyCount: 0, carrier },
          discrepancies: [],
          error: 'Failed to parse audit results from AI',
        },
        { status: 422 }
      );
    }

    const discrepancies: AuditDiscrepancy[] = (parsed.discrepancies || []).map((d, i) => ({
      id: `disc_ai_${String(i + 1).padStart(3, '0')}`,
      type: d.type,
      trackingNumber: d.trackingNumber,
      description: d.description,
      chargedAmount: d.chargedAmount,
      correctAmount: d.correctAmount,
      overchargeAmount: d.overchargeAmount,
      confidence: d.confidence,
    }));

    const summary = buildSummary(carrier, discrepancies);

    return NextResponse.json({
      success: true,
      mode: 'ai',
      summary,
      discrepancies,
    } satisfies AuditResponse);
  } catch (err) {
    console.error('AI audit error:', err);
    return NextResponse.json(
      {
        success: false,
        mode: 'ai' as const,
        summary: { totalCharges: 0, totalOvercharges: 0, discrepancyCount: 0, carrier: 'unknown' },
        discrepancies: [],
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
