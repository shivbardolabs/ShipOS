import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';

/**
 * POST /api/packages/measure-dimensions
 *
 * Accepts a base64-encoded photo of a package and uses AI vision
 * to estimate its dimensions (L × W × H in inches).
 *
 * Falls back to demo data when OPENAI_API_KEY is not configured.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface MeasureDimensionsResult {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  confidence: number; // 0-1
  suggestedPackageType: string; // letter, pack, small, medium, large, xlarge
  estimatedWeightLbs?: number;
  notes?: string;
}

export interface MeasureDimensionsResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  result?: MeasureDimensionsResult;
  error?: string;
}

/* ── System prompt for AI vision ──────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a package measurement assistant for a shipping store. 
You analyze photos of packages/boxes/envelopes to estimate their dimensions.

INSTRUCTIONS:
1. Look at the package in the photo and estimate its Length, Width, and Height in inches.
2. Use visual cues for scale: door frames (~80in tall), floor tiles (~12in), hands (~7in), 
   standard shipping labels (~4x6in), credit cards (~3.4x2.1in), pens (~6in).
3. If a tape measure, ruler, or reference object is visible, use it for more accurate estimation.
4. Round to the nearest 0.5 inch.
5. Estimate the package type based on size:
   - letter: flat envelope (under 0.5in thick)
   - pack: bubble mailer or soft pack (under 2in thick)
   - small: small box (all dims under 12in, estimated <2 lbs)
   - medium: standard box (largest dim under 24in, estimated 2-8 lbs)
   - large: large box (any dim 24-36in, estimated 8-15 lbs)
   - xlarge: very large/heavy (any dim over 36in, or estimated 20+ lbs)
6. If you can estimate weight from the package type and size, include it.

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "lengthIn": <number>,
  "widthIn": <number>,
  "heightIn": <number>,
  "confidence": <0-1 number>,
  "suggestedPackageType": "<letter|pack|small|medium|large|xlarge>",
  "estimatedWeightLbs": <number or null>,
  "notes": "<brief note about estimation method or caveats>"
}

IMPORTANT:
- Length is always the longest dimension, Width the second longest, Height the shortest.
- If the image is unclear or not a package, set confidence below 0.3 and note the issue.
- Be conservative with confidence — only use >0.8 when reference objects are clearly visible.`;

/* ── Demo data — cycles through realistic examples ─────────────────── */
const DEMO_RESULTS: MeasureDimensionsResult[] = [
  {
    lengthIn: 24.5,
    widthIn: 18.0,
    heightIn: 12.0,
    confidence: 0.85,
    suggestedPackageType: 'large',
    estimatedWeightLbs: 12,
    notes: 'Large cardboard box. Estimated using floor tile reference (~12in).',
  },
  {
    lengthIn: 14.0,
    widthIn: 10.0,
    heightIn: 6.0,
    confidence: 0.78,
    suggestedPackageType: 'medium',
    estimatedWeightLbs: 5,
    notes: 'Standard shipping box. No reference object visible — estimated from label size.',
  },
  {
    lengthIn: 10.0,
    widthIn: 8.0,
    heightIn: 4.0,
    confidence: 0.82,
    suggestedPackageType: 'small',
    estimatedWeightLbs: 2,
    notes: 'Small Amazon-style box. Shipping label used as size reference (~4×6in).',
  },
  {
    lengthIn: 12.0,
    widthIn: 9.0,
    heightIn: 1.0,
    confidence: 0.9,
    suggestedPackageType: 'pack',
    estimatedWeightLbs: 1,
    notes: 'Bubble mailer / padded envelope. Clear dimensions from flat shape.',
  },
  {
    lengthIn: 36.0,
    widthIn: 24.0,
    heightIn: 18.0,
    confidence: 0.72,
    suggestedPackageType: 'xlarge',
    estimatedWeightLbs: 25,
    notes: 'Extra-large box. Estimated using doorway reference visible in background.',
  },
];

let demoIndex = 0;

/* ── Route handler ─────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as MeasureDimensionsResponse,
        { status: 401 },
      );
    }

    const body = await req.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json(
        { success: false, mode: 'ai' as const, error: 'No image provided' } as MeasureDimensionsResponse,
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* ── Demo mode when no API key ───────────────────────────────── */
    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 1500));
      const result = DEMO_RESULTS[demoIndex % DEMO_RESULTS.length];
      demoIndex++;
      return NextResponse.json({
        success: true,
        mode: 'demo',
        result,
      } satisfies MeasureDimensionsResponse);
    }

    /* ── Real AI Vision call ─────────────────────────────────────── */
    let base64Data: string;
    if (image.startsWith('data:')) {
      const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (!mimeMatch) {
        return NextResponse.json(
          { success: false, mode: 'ai' as const, error: 'Invalid image format. Please upload a JPEG or PNG image.' } as MeasureDimensionsResponse,
          { status: 400 },
        );
      }
      base64Data = image;
    } else {
      base64Data = `data:image/jpeg;base64,${image}`;
    }

    // Validate payload size
    const payload = base64Data.split(',')[1] || '';
    if (payload.length < 500) {
      return NextResponse.json(
        { success: false, mode: 'ai' as const, error: 'Image appears empty or too small. Please capture again.' } as MeasureDimensionsResponse,
        { status: 400 },
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
                text: 'Analyze this package photo and estimate the dimensions (Length × Width × Height) in inches. If you can see a reference object (tape measure, ruler, shipping label, hand, etc.), use it for more accurate estimation.',
              },
              {
                type: 'image_url',
                image_url: { url: base64Data, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return NextResponse.json(
        { success: false, mode: 'ai' as const, error: `AI analysis failed (${response.status})` } as MeasureDimensionsResponse,
        { status: 502 },
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { success: false, mode: 'ai' as const, error: 'AI returned empty response' } as MeasureDimensionsResponse,
        { status: 502 },
      );
    }

    // Parse JSON — strip markdown code fences if present
    let parsed: MeasureDimensionsResult;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { success: false, mode: 'ai' as const, error: 'Could not parse AI measurement result' } as MeasureDimensionsResponse,
        { status: 502 },
      );
    }

    // Validate and sanitize
    const result: MeasureDimensionsResult = {
      lengthIn: Math.round((Number(parsed.lengthIn) || 0) * 2) / 2, // Round to 0.5
      widthIn: Math.round((Number(parsed.widthIn) || 0) * 2) / 2,
      heightIn: Math.round((Number(parsed.heightIn) || 0) * 2) / 2,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      suggestedPackageType: ['letter', 'pack', 'small', 'medium', 'large', 'xlarge'].includes(parsed.suggestedPackageType)
        ? parsed.suggestedPackageType
        : 'medium',
      estimatedWeightLbs: parsed.estimatedWeightLbs ? Math.round(Number(parsed.estimatedWeightLbs) * 10) / 10 : undefined,
      notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 200) : undefined,
    };

    // Ensure L ≥ W ≥ H ordering
    const dims = [result.lengthIn, result.widthIn, result.heightIn].sort((a, b) => b - a);
    result.lengthIn = dims[0];
    result.widthIn = dims[1];
    result.heightIn = dims[2];

    return NextResponse.json({
      success: true,
      mode: 'ai',
      result,
    } satisfies MeasureDimensionsResponse);
  } catch (err) {
    console.error('[POST /api/packages/measure-dimensions]', err);
    return NextResponse.json(
      { success: false, mode: 'ai' as const, error: 'Internal server error' } as MeasureDimensionsResponse,
      { status: 500 },
    );
  }
}
