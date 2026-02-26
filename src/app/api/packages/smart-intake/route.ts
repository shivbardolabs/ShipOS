import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake                                           */
/*  Accepts a base64 image of a package label and returns structured data     */
/*  extracted via AI vision (OpenAI GPT-4o).                                  */
/* -------------------------------------------------------------------------- */

export interface SmartIntakeResult {
  carrier: string;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  pmbNumber: string;
  packageSize: string;
  confidence: number;
}

export interface SmartIntakeResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  results: SmartIntakeResult[];
  error?: string;
}

/* ── Demo data — used when OPENAI_API_KEY is not configured ─────────────── */
const DEMO_RESULTS: SmartIntakeResult[][] = [
  [
    {
      carrier: 'amazon',
      trackingNumber: 'TBA934857201847',
      senderName: 'Amazon.com',
      senderAddress: '410 Terry Ave N, Seattle, WA 98109',
      recipientName: 'James Morrison',
      pmbNumber: 'PMB-0001',
      packageSize: 'medium',
      confidence: 0.96,
    },
  ],
  [
    {
      carrier: 'ups',
      trackingNumber: '1Z999AA10123456784',
      senderName: 'Best Buy',
      senderAddress: '7601 Penn Ave S, Richfield, MN 55423',
      recipientName: 'David Kim',
      pmbNumber: 'PMB-0005',
      packageSize: 'large',
      confidence: 0.94,
    },
  ],
  [
    {
      carrier: 'fedex',
      trackingNumber: '794644790128',
      senderName: 'Chewy.com',
      senderAddress: '7700 W Sunrise Blvd, Plantation, FL 33322',
      recipientName: 'Linda Nakamura',
      pmbNumber: 'PMB-0002',
      packageSize: 'large',
      confidence: 0.97,
    },
  ],
  [
    {
      carrier: 'usps',
      trackingNumber: '9400111899223100012847',
      senderName: 'Etsy Seller - CraftHaven',
      senderAddress: '455 Artisan Way, Portland, OR 97201',
      recipientName: 'Sarah Taylor',
      pmbNumber: 'PMB-0012',
      packageSize: 'small',
      confidence: 0.92,
    },
  ],
];

const DEMO_BATCH: SmartIntakeResult[] = [
  {
    carrier: 'amazon',
    trackingNumber: 'TBA934857201847',
    senderName: 'Amazon.com',
    senderAddress: '410 Terry Ave N, Seattle, WA 98109',
    recipientName: 'James Morrison',
    pmbNumber: 'PMB-0001',
    packageSize: 'medium',
    confidence: 0.96,
  },
  {
    carrier: 'fedex',
    trackingNumber: '794644790128',
    senderName: 'Chewy.com',
    senderAddress: '7700 W Sunrise Blvd, Plantation, FL 33322',
    recipientName: 'Linda Nakamura',
    pmbNumber: 'PMB-0002',
    packageSize: 'large',
    confidence: 0.97,
  },
  {
    carrier: 'ups',
    trackingNumber: '1Z999AA10123456784',
    senderName: 'Best Buy',
    senderAddress: '7601 Penn Ave S, Richfield, MN 55423',
    recipientName: 'Robert Singh',
    pmbNumber: 'PMB-0003',
    packageSize: 'small',
    confidence: 0.91,
  },
];

let demoIndex = 0;

/* ── Vision AI prompt ──────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a shipping label analysis AI for a postal mailbox store (CMRA). 
Analyze the package label image and extract the following fields as JSON.

Return a JSON array of objects (one per visible label). Each object must have:
- carrier: lowercase carrier id (one of: amazon, ups, fedex, usps, dhl, lasership, temu, ontrac, walmart, target, other)
- trackingNumber: the tracking/barcode number visible on the label
- senderName: the sender/shipper name
- senderAddress: the sender/return address
- recipientName: the recipient name
- pmbNumber: the PMB, Suite, Unit, Box, or Apt number from the delivery address (format as "PMB-XXXX" if it's a number)
- packageSize: estimated size (one of: letter, pack, small, medium, large, xlarge)
- confidence: your confidence score from 0 to 1

If a field is not visible or unclear, use an empty string. 
Always return valid JSON array only, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, batch } = body as { image: string; batch?: boolean };

    if (!image) {
      return NextResponse.json(
        { success: false, mode: 'ai', results: [], error: 'No image provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* ── Demo mode when no API key ─────────────────────────────────────── */
    if (!apiKey) {
      // Simulate ~1s processing delay for realism
      await new Promise((r) => setTimeout(r, 1200));

      if (batch) {
        return NextResponse.json({
          success: true,
          mode: 'demo',
          results: DEMO_BATCH,
        } satisfies SmartIntakeResponse);
      }

      const result = DEMO_RESULTS[demoIndex % DEMO_RESULTS.length];
      demoIndex++;
      return NextResponse.json({
        success: true,
        mode: 'demo',
        results: result,
      } satisfies SmartIntakeResponse);
    }

    /* ── Real AI Vision call ───────────────────────────────────────────── */
    // Ensure valid image MIME type — only allow image types
    let base64Data: string;
    if (image.startsWith('data:')) {
      // Validate MIME type prefix
      const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (!mimeMatch) {
        return NextResponse.json(
          { success: false, mode: 'ai' as const, results: [], error: 'Invalid image format. Please upload a JPEG or PNG image.' },
          { status: 400 }
        );
      }
      base64Data = image;
    } else {
      // Assume raw base64 is JPEG
      base64Data = `data:image/jpeg;base64,${image}`;
    }

    // Validate the base64 payload is not too small (likely empty/black frame)
    const payload = base64Data.split(',')[1] || '';
    if (payload.length < 500) {
      return NextResponse.json(
        { success: false, mode: 'ai' as const, results: [], error: 'Image appears to be empty or too small. Please capture again.' },
        { status: 400 }
      );
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
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: batch
                  ? 'Analyze ALL visible shipping labels in this image. Return one object per label detected.'
                  : 'Analyze the shipping label in this image and extract the package information.',
              },
              {
                type: 'image_url',
                image_url: { url: base64Data, detail: 'high' },
              },
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

      // Parse OpenAI error for a user-friendly message
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
          results: [],
          error: `Vision API error: ${detail}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '[]';

    // Parse the JSON from the AI response
    let results: SmartIntakeResult[];
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      results = JSON.parse(cleaned);
      if (!Array.isArray(results)) results = [results];
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          results: [],
          error: 'Failed to parse label data',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'ai',
      results,
    } satisfies SmartIntakeResponse);
  } catch (err) {
    console.error('Smart intake error:', err);
    return NextResponse.json(
      { success: false, mode: 'ai' as const, results: [], error: 'Internal server error' },
      { status: 500 }
    );
  }
}
