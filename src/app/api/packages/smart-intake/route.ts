import { NextResponse } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, ApiError } from '@/lib/api-utils';
import {
  processExtractionResults,
  generateValidationReport,
  ENHANCED_SYSTEM_PROMPT,
} from '@/lib/smart-intake';
import type {
  RawVisionResult,
  ExtractionResult,
  ServiceType,
  FieldValidation,
} from '@/lib/smart-intake';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake                                           */
/*  Accepts a base64 image of a package label and returns structured data     */
/*  extracted via AI vision (OpenAI GPT-4o) + post-processing extraction      */
/*  rules (BAR-331).                                                          */
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

  // ── BAR-331: New extraction fields ─────────────────────────────────────
  /** Whether tracking number passes carrier-specific validation */
  trackingNumberValid?: boolean;
  /** Carrier detection confidence level */
  carrierConfidence?: 'high' | 'medium' | 'low';
  /** Whether recipient appears to be a business */
  recipientIsBusiness?: boolean;
  /** Detected service type / program */
  serviceType?: ServiceType;
  /** Service type human-readable label */
  serviceTypeLabel?: string;
  /** Validation report for each field */
  validationReport?: FieldValidation[];
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
      trackingNumberValid: true,
      carrierConfidence: 'high',
      recipientIsBusiness: false,
      serviceType: 'pmb_customer',
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
      trackingNumberValid: true,
      carrierConfidence: 'high',
      recipientIsBusiness: false,
      serviceType: 'pmb_customer',
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
      trackingNumberValid: true,
      carrierConfidence: 'medium',
      recipientIsBusiness: false,
      serviceType: 'pmb_customer',
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
      trackingNumberValid: true,
      carrierConfidence: 'high',
      recipientIsBusiness: false,
      serviceType: 'pmb_customer',
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
    trackingNumberValid: true,
    carrierConfidence: 'high',
    recipientIsBusiness: false,
    serviceType: 'pmb_customer',
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
    trackingNumberValid: true,
    carrierConfidence: 'medium',
    recipientIsBusiness: false,
    serviceType: 'pmb_customer',
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
    trackingNumberValid: true,
    carrierConfidence: 'high',
    recipientIsBusiness: false,
    serviceType: 'pmb_customer',
  },
];

let demoIndex = 0;

const SmartIntakeSchema = z.object({
  image: z.string().min(1, 'No image provided'),
  batch: z.boolean().optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { image, batch } = await validateBody(request, SmartIntakeSchema);

  const apiKey = process.env.OPENAI_API_KEY;

  /* ── Demo mode when no API key ─────────────────────────────────────── */
  if (!apiKey) {
    // Simulate ~1s processing delay for realism
    await new Promise((r) => setTimeout(r, 1200));

    if (batch) {
      return ok({
        success: true,
        mode: 'demo',
        results: DEMO_BATCH,
      } satisfies SmartIntakeResponse);
    }

    const result = DEMO_RESULTS[demoIndex % DEMO_RESULTS.length];
    demoIndex++;
    return ok({
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
      badRequest('Invalid image format. Please upload a JPEG or PNG image.');
    }
    base64Data = image;
  } else {
    // Assume raw base64 is JPEG
    base64Data = `data:image/jpeg;base64,${image}`;
  }

  // Validate the base64 payload is not too small (likely empty/black frame)
  const payload = base64Data.split(',')[1] || '';
  if (payload.length < 500) {
    badRequest('Image appears to be empty or too small. Please capture again.');
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
        { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
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

    throw new ApiError(`Vision API error: ${detail}`, 502);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';

  // Parse the JSON from the AI response
  let rawResults: RawVisionResult[];
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    rawResults = JSON.parse(cleaned);
    if (!Array.isArray(rawResults)) rawResults = [rawResults];
  } catch {
    console.error('Failed to parse AI response:', content);
    throw new ApiError('Failed to parse label data', 422);
  }

  /* ── BAR-331: Post-process through extraction rules ────────────────── */
  const processed = processExtractionResults(rawResults);

  // Map processed results to the SmartIntakeResult format
  const results: SmartIntakeResult[] = processed.map((ext: ExtractionResult, i: number) => {
    const raw = rawResults[i];
    const report = generateValidationReport(raw, ext);

    return {
      carrier: ext.carrier,
      trackingNumber: ext.trackingNumber,
      senderName: ext.senderName,
      senderAddress: ext.senderAddress,
      recipientName: ext.recipientName,
      pmbNumber: ext.pmbNumber,
      packageSize: ext.packageSize,
      confidence: ext.confidence,

      // BAR-331 enrichment fields
      trackingNumberValid: ext.trackingNumberValid,
      carrierConfidence: ext.carrierConfidence,
      recipientIsBusiness: ext.recipientIsBusiness,
      serviceType: ext.serviceType,
      validationReport: report,
    };
  });

  return ok({
    success: true,
    mode: 'ai',
    results,
  } satisfies SmartIntakeResponse);
});
