import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok } from '@/lib/api-utils';
import { z } from 'zod';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface MailSortResult {
  pmbNumber: string;
  confidence: number;
  senderName: string;
  mailType: 'letter' | 'magazine' | 'catalog' | 'package_slip' | 'government' | 'junk' | 'unknown';
  priority: 'high' | 'normal' | 'low';
  actionSuggestion: 'deliver' | 'scan_notify' | 'hold' | 'shred' | 'return';
}

interface MailSortResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  results: MailSortResult[];
  processingTime: number;
  error?: string;
}

/* ── Demo data ────────────────────────────────────────────────────────────── */

const DEMO_RESULTS: MailSortResult[] = [
  { pmbNumber: 'PMB-1001', confidence: 0.95, senderName: 'IRS', mailType: 'government', priority: 'high', actionSuggestion: 'scan_notify' },
  { pmbNumber: 'PMB-1003', confidence: 0.92, senderName: 'Amazon', mailType: 'package_slip', priority: 'normal', actionSuggestion: 'deliver' },
  { pmbNumber: 'PMB-1005', confidence: 0.88, senderName: 'Verizon', mailType: 'letter', priority: 'normal', actionSuggestion: 'deliver' },
  { pmbNumber: 'PMB-1007', confidence: 0.97, senderName: 'AARP', mailType: 'junk', priority: 'low', actionSuggestion: 'shred' },
  { pmbNumber: 'PMB-1002', confidence: 0.91, senderName: 'Chase Bank', mailType: 'letter', priority: 'high', actionSuggestion: 'scan_notify' },
  { pmbNumber: 'PMB-1004', confidence: 0.85, senderName: 'National Geographic', mailType: 'magazine', priority: 'low', actionSuggestion: 'hold' },
  { pmbNumber: 'PMB-1006', confidence: 0.78, senderName: 'Unknown Sender', mailType: 'unknown', priority: 'normal', actionSuggestion: 'deliver' },
  { pmbNumber: 'PMB-1001', confidence: 0.93, senderName: 'Blue Cross', mailType: 'letter', priority: 'high', actionSuggestion: 'scan_notify' },
];

/* ── Schema ───────────────────────────────────────────────────────────────── */

const AiSortBodySchema = z.object({
  image: z.string().min(1, 'base64 image data is required'),
  format: z.enum(['base64', 'url']).optional().default('base64'),
});

/* ── System prompt ────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a mail sorting AI for a pack-and-ship store (CMRA). You analyze images of incoming mail batches and identify:

1. The PMB number (mailbox number) from the address
2. The sender name
3. The mail type (letter, magazine, catalog, package_slip, government, junk, unknown)
4. Priority level (high for government/financial, normal for regular, low for junk/catalogs)
5. Suggested action (deliver, scan_notify for important, hold, shred for junk, return for unknown PMB)

Return ONLY a JSON array of results:
[
  {
    "pmbNumber": "PMB-XXXX",
    "confidence": 0.0-1.0,
    "senderName": "string",
    "mailType": "letter|magazine|catalog|package_slip|government|junk|unknown",
    "priority": "high|normal|low",
    "actionSuggestion": "deliver|scan_notify|hold|shred|return"
  }
]

No markdown, no explanation — only valid JSON array.`;

/**
 * POST /api/mail/ai-sort
 * Accepts a base64 image of a mail batch and returns AI-powered sorting results.
 *
 * SECURITY FIX: Now requires authentication.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  const body = await validateBody(request, AiSortBodySchema);

  const apiKey = process.env.OPENAI_API_KEY;

  /* ── Demo mode when no API key ─────────────────────────────────────── */
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1500));
    return ok({
      success: true,
      mode: 'demo',
      results: DEMO_RESULTS,
      processingTime: Date.now() - startTime,
    } satisfies MailSortResponse);
  }

  /* ── Real AI call ─────────────────────────────────────────────────── */
  const base64Data = body.image.startsWith('data:')
    ? body.image
    : `data:image/jpeg;base64,${body.image}`;

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
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this mail batch image and sort the items:' },
            { type: 'image_url', image_url: { url: base64Data, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI API error:', response.status, errText);

    return ok({
      success: false,
      mode: 'ai' as const,
      results: DEMO_RESULTS,
      processingTime: Date.now() - startTime,
      error: `AI API error: ${response.status}`,
    } satisfies MailSortResponse);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';

  let results: MailSortResult[];
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    results = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse AI sort response:', content);
    return ok({
      success: true,
      mode: 'demo',
      results: DEMO_RESULTS,
      processingTime: Date.now() - startTime,
      error: 'Failed to parse AI response, using demo data',
    } satisfies MailSortResponse);
  }

  return ok({
    success: true,
    mode: 'ai',
    results,
    processingTime: Date.now() - startTime,
  } satisfies MailSortResponse);
});
