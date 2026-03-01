import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest } from '@/lib/api-utils';
import { z } from 'zod';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface AuditDiscrepancy {
  trackingNumber: string;
  invoicedAmount: number;
  expectedAmount: number;
  difference: number;
  issueType: 'overcharge' | 'undercharge' | 'duplicate' | 'phantom' | 'surcharge';
  confidence: number;
  explanation: string;
  suggestedAction: 'dispute' | 'accept' | 'review';
}

interface AuditResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  discrepancies: AuditDiscrepancy[];
  summary: {
    totalInvoiced: number;
    totalExpected: number;
    totalDifference: number;
    discrepancyCount: number;
    estimatedRecovery: number;
  };
  processingTime: number;
  error?: string;
}

/* ── Demo data ────────────────────────────────────────────────────────────── */

const DEMO_DISCREPANCIES: AuditDiscrepancy[] = [
  { trackingNumber: '1Z999AA10123456784', invoicedAmount: 24.50, expectedAmount: 18.75, difference: 5.75, issueType: 'overcharge', confidence: 0.95, explanation: 'Residential surcharge applied incorrectly to commercial address', suggestedAction: 'dispute' },
  { trackingNumber: '9400111899223100012', invoicedAmount: 7.80, expectedAmount: 7.80, difference: 7.80, issueType: 'duplicate', confidence: 0.92, explanation: 'Same tracking number invoiced twice in billing period', suggestedAction: 'dispute' },
  { trackingNumber: '794644790132', invoicedAmount: 45.20, expectedAmount: 32.10, difference: 13.10, issueType: 'surcharge', confidence: 0.88, explanation: 'Additional handling surcharge may not apply — package within standard dimensions', suggestedAction: 'dispute' },
  { trackingNumber: '1Z999AA10987654321', invoicedAmount: 12.30, expectedAmount: 0, difference: 12.30, issueType: 'phantom', confidence: 0.90, explanation: 'No shipment record found for this tracking number — possible phantom charge', suggestedAction: 'dispute' },
  { trackingNumber: '9261290100130470898', invoicedAmount: 3.50, expectedAmount: 4.20, difference: -0.70, issueType: 'undercharge', confidence: 0.85, explanation: 'First-class rate billed but Priority was used — verify service level', suggestedAction: 'review' },
];

/* ── Schema ───────────────────────────────────────────────────────────────── */

const AuditBodySchema = z.object({
  format: z.enum(['pdf_base64', 'csv']),
  data: z.string().min(1),
  carrier: z.string().optional(),
});

/* ── System prompt ────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a carrier invoice auditor for a pack-and-ship store. You analyze carrier invoices (UPS, FedEx, USPS, DHL) and compare them against expected charges to find discrepancies.

Common discrepancy types:
- overcharge: Invoiced amount higher than expected (wrong rate, surcharge error, etc.)
- duplicate: Same tracking number billed more than once
- phantom: Charge for a shipment with no matching record
- surcharge: Questionable surcharge (residential, additional handling, fuel, etc.)
- undercharge: Carrier billed less than expected (flag for awareness)

For each discrepancy, return a JSON array:
[
  {
    "trackingNumber": "string",
    "invoicedAmount": number,
    "expectedAmount": number,
    "difference": number,
    "issueType": "overcharge|duplicate|phantom|surcharge|undercharge",
    "confidence": 0.0-1.0,
    "explanation": "Brief explanation of the issue",
    "suggestedAction": "dispute|accept|review"
  }
]

Only return valid JSON. No markdown or explanation.`;

/**
 * POST /api/reconciliation/ai-audit
 * Accepts a carrier invoice and returns AI-powered audit findings.
 *
 * SECURITY FIX: Now requires authentication.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  const body = await validateBody(request, AuditBodySchema);

  const apiKey = process.env.OPENAI_API_KEY;

  /* ── Demo mode when no API key ─────────────────────────────────────── */
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 2000));

    const totalInvoiced = DEMO_DISCREPANCIES.reduce((s, d) => s + d.invoicedAmount, 0);
    const totalExpected = DEMO_DISCREPANCIES.reduce(
      (s, d) => s + d.expectedAmount,
      0,
    );
    const estimatedRecovery = DEMO_DISCREPANCIES
      .filter((d) => d.suggestedAction === 'dispute')
      .reduce((s, d) => s + Math.abs(d.difference), 0);

    return ok({
      success: true,
      mode: 'demo',
      discrepancies: DEMO_DISCREPANCIES,
      summary: {
        totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
        totalExpected: parseFloat(totalExpected.toFixed(2)),
        totalDifference: parseFloat((totalInvoiced - totalExpected).toFixed(2)),
        discrepancyCount: DEMO_DISCREPANCIES.length,
        estimatedRecovery: parseFloat(estimatedRecovery.toFixed(2)),
      },
      processingTime: Date.now() - startTime,
    } satisfies AuditResponse);
  }

  /* ── Real AI call ─────────────────────────────────────────────────── */
  let content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;

  if (body.format === 'pdf_base64') {
    const base64 = body.data.startsWith('data:')
      ? body.data
      : `data:image/jpeg;base64,${body.data}`;

    content = [
      { type: 'text', text: `Audit this carrier${body.carrier ? ` (${body.carrier})` : ''} invoice and find discrepancies:` },
      { type: 'image_url', image_url: { url: base64, detail: 'high' } },
    ];
  } else {
    content = [
      { type: 'text', text: `Audit this carrier${body.carrier ? ` (${body.carrier})` : ''} CSV invoice data and find discrepancies:\n\n${body.data}` },
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
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error:', response.status, await response.text());
    const totalInvoiced = DEMO_DISCREPANCIES.reduce((s, d) => s + d.invoicedAmount, 0);
    const totalExpected = DEMO_DISCREPANCIES.reduce((s, d) => s + d.expectedAmount, 0);

    return ok({
      success: false,
      mode: 'ai' as const,
      discrepancies: DEMO_DISCREPANCIES,
      summary: {
        totalInvoiced,
        totalExpected,
        totalDifference: totalInvoiced - totalExpected,
        discrepancyCount: DEMO_DISCREPANCIES.length,
        estimatedRecovery: 0,
      },
      processingTime: Date.now() - startTime,
      error: `AI API error: ${response.status}`,
    } satisfies AuditResponse);
  }

  const result = await response.json();
  const rawText: string = result.choices?.[0]?.message?.content ?? '[]';

  let discrepancies: AuditDiscrepancy[];
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    discrepancies = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse AI audit response:', rawText);
    return ok({
      success: false,
      mode: 'demo' as const,
      discrepancies: DEMO_DISCREPANCIES,
      summary: {
        totalInvoiced: 0,
        totalExpected: 0,
        totalDifference: 0,
        discrepancyCount: 0,
        estimatedRecovery: 0,
      },
      processingTime: Date.now() - startTime,
      error: 'Failed to parse AI response, showing demo data',
    } satisfies AuditResponse);
  }

  const totalInvoiced = discrepancies.reduce((s, d) => s + d.invoicedAmount, 0);
  const totalExpected = discrepancies.reduce((s, d) => s + d.expectedAmount, 0);
  const estimatedRecovery = discrepancies
    .filter((d) => d.suggestedAction === 'dispute')
    .reduce((s, d) => s + Math.abs(d.difference), 0);

  return ok({
    success: true,
    mode: 'ai',
    discrepancies,
    summary: {
      totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
      totalExpected: parseFloat(totalExpected.toFixed(2)),
      totalDifference: parseFloat((totalInvoiced - totalExpected).toFixed(2)),
      discrepancyCount: discrepancies.length,
      estimatedRecovery: parseFloat(estimatedRecovery.toFixed(2)),
    },
    processingTime: Date.now() - startTime,
  } satisfies AuditResponse);
});
