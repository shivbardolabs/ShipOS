import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  POST /api/customers/id-scan                                               */
/*  Accepts a base64 image of a government ID and returns structured          */
/*  customer data extracted via AI vision (OpenAI GPT-4o).                    */
/* -------------------------------------------------------------------------- */

export interface IdScanResult {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  idNumber: string;
  expirationDate: string;
  idType: 'drivers_license' | 'passport' | 'military_id' | 'other';
  confidence: number;
}

export interface IdScanResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  result: IdScanResult | null;
  error?: string;
}

/* ── Demo data — used when OPENAI_API_KEY is not configured ─────────────── */
const DEMO_RESULTS: IdScanResult[] = [
  {
    firstName: 'Rachel',
    lastName: 'Green',
    address: '495 Grove St, Apt 20',
    city: 'New York',
    state: 'NY',
    zipCode: '10014',
    dateOfBirth: '1988-05-05',
    idNumber: 'D12345678',
    expirationDate: '2028-05-05',
    idType: 'drivers_license',
    confidence: 0.95,
  },
  {
    firstName: 'Marcus',
    lastName: 'Chen',
    address: '1200 Lake Shore Dr, Ste 14B',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60610',
    dateOfBirth: '1992-11-17',
    idNumber: 'C98765432',
    expirationDate: '2027-11-17',
    idType: 'drivers_license',
    confidence: 0.97,
  },
  {
    firstName: 'Priya',
    lastName: 'Patel',
    address: '9200 Wilshire Blvd',
    city: 'Beverly Hills',
    state: 'CA',
    zipCode: '90212',
    dateOfBirth: '1985-03-22',
    idNumber: 'P44556677',
    expirationDate: '2029-03-22',
    idType: 'passport',
    confidence: 0.93,
  },
  {
    firstName: 'Tyler',
    lastName: 'Brooks',
    address: '820 Congress Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    dateOfBirth: '1995-08-10',
    idNumber: 'T11223344',
    expirationDate: '2027-08-10',
    idType: 'drivers_license',
    confidence: 0.96,
  },
];

let demoIndex = 0;

/* ── Vision AI prompt ──────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a government ID analysis AI for a postal mailbox store (CMRA).
Analyze the ID image and extract the following fields as a single JSON object.

Return a JSON object with these fields:
- firstName: the person's first name
- lastName: the person's last name
- address: the street address (number and street, include apt/unit if visible)
- city: the city name
- state: the two-letter state code (e.g. "CA", "NY")
- zipCode: the zip code
- dateOfBirth: the date of birth in YYYY-MM-DD format
- idNumber: the ID/license/passport number
- expirationDate: the expiration date in YYYY-MM-DD format
- idType: one of "drivers_license", "passport", "military_id", or "other"
- confidence: your confidence score from 0 to 1

If a field is not visible or unclear, use an empty string (except confidence, which should reflect your overall extraction confidence).
Always return valid JSON only, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, idType } = body as { image: string; idType?: string };

    if (!image) {
      return NextResponse.json(
        { success: false, mode: 'ai', result: null, error: 'No image provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* ── Demo mode when no API key ─────────────────────────────────────── */
    if (!apiKey) {
      // Simulate ~1.5s processing delay for realism
      await new Promise((r) => setTimeout(r, 1500));

      const result = DEMO_RESULTS[demoIndex % DEMO_RESULTS.length];
      demoIndex++;
      return NextResponse.json({
        success: true,
        mode: 'demo',
        result,
      } satisfies IdScanResponse);
    }

    /* ── Real AI Vision call ───────────────────────────────────────────── */
    const base64Data = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;

    const userPrompt = idType
      ? `Analyze this ${idType.replace('_', ' ')} and extract the person's information.`
      : 'Analyze this government-issued ID and extract the person\'s information.';

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
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: { url: base64Data, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 1500,
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
          result: null,
          error: `Vision API error: ${detail}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';

    // Parse the JSON from the AI response
    let result: IdScanResult;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          result: null,
          error: 'Failed to parse ID data from image',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'ai',
      result,
    } satisfies IdScanResponse);
  } catch (err) {
    console.error('ID scan error:', err);
    return NextResponse.json(
      { success: false, mode: 'ai' as const, result: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
