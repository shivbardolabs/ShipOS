import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  POST /api/mail/ai-sort                                                    */
/*  Accepts a base64 image of mail pieces and returns structured sort data    */
/*  extracted via AI vision (OpenAI GPT-4o).                                  */
/* -------------------------------------------------------------------------- */

export interface MailSortResult {
  recipientName: string;
  pmbNumber: string;
  sender: string;
  mailType: 'letter' | 'magazine' | 'catalog' | 'legal' | 'other';
  confidence: number;
}

export interface MailSortResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  results: MailSortResult[];
  error?: string;
}

/* -- Demo data -- used when OPENAI_API_KEY is not configured --------------- */
const DEMO_SINGLE: MailSortResult[] = [
  {
    recipientName: 'James Morrison',
    pmbNumber: 'PMB-0001',
    sender: 'Chase Bank',
    mailType: 'letter',
    confidence: 0.96,
  },
  {
    recipientName: 'Linda Nakamura',
    pmbNumber: 'PMB-0002',
    sender: 'Vogue Magazine',
    mailType: 'magazine',
    confidence: 0.94,
  },
  {
    recipientName: 'Robert Singh',
    pmbNumber: 'PMB-0003',
    sender: 'IRS - Department of Treasury',
    mailType: 'legal',
    confidence: 0.98,
  },
];

const DEMO_BATCH: MailSortResult[] = [
  {
    recipientName: 'James Morrison',
    pmbNumber: 'PMB-0001',
    sender: 'Chase Bank',
    mailType: 'letter',
    confidence: 0.96,
  },
  {
    recipientName: 'Linda Nakamura',
    pmbNumber: 'PMB-0002',
    sender: 'Vogue Magazine',
    mailType: 'magazine',
    confidence: 0.94,
  },
  {
    recipientName: 'Robert Singh',
    pmbNumber: 'PMB-0003',
    sender: 'IRS - Department of Treasury',
    mailType: 'legal',
    confidence: 0.98,
  },
  {
    recipientName: 'David Kim',
    pmbNumber: 'PMB-0005',
    sender: 'Amazon.com',
    mailType: 'catalog',
    confidence: 0.91,
  },
  {
    recipientName: 'Elizabeth Martinez',
    pmbNumber: 'PMB-0010',
    sender: 'State Bar Association',
    mailType: 'legal',
    confidence: 0.97,
  },
  {
    recipientName: 'Sarah Taylor',
    pmbNumber: 'PMB-0012',
    sender: 'Pottery Barn',
    mailType: 'catalog',
    confidence: 0.89,
  },
  {
    recipientName: 'Patricia Williams',
    pmbNumber: 'PMB-0006',
    sender: 'Blue Cross Blue Shield',
    mailType: 'letter',
    confidence: 0.93,
  },
  {
    recipientName: 'Anthony Clark',
    pmbNumber: 'PMB-0019',
    sender: 'Wells Fargo',
    mailType: 'letter',
    confidence: 0.95,
  },
  {
    recipientName: 'Thomas Anderson',
    pmbNumber: 'PMB-0011',
    sender: 'National Geographic',
    mailType: 'magazine',
    confidence: 0.92,
  },
  {
    recipientName: 'Jessica White',
    pmbNumber: 'PMB-0014',
    sender: 'Adobe Systems',
    mailType: 'letter',
    confidence: 0.88,
  },
  {
    recipientName: 'Unknown Recipient',
    pmbNumber: '',
    sender: 'Current Resident - Comcast',
    mailType: 'other',
    confidence: 0.45,
  },
  {
    recipientName: 'Mark Walker',
    pmbNumber: 'PMB-0021',
    sender: 'Crate & Barrel',
    mailType: 'catalog',
    confidence: 0.90,
  },
];

/* -- Vision AI prompt ----------------------------------------------------- */
const SYSTEM_PROMPT = `You are a mail sorting AI for a postal mailbox store (CMRA).
Analyze the image of mail pieces spread on a counter and extract information about each visible piece.

Return a JSON array of objects (one per visible mail piece). Each object must have:
- recipientName: the name of the person the mail is addressed to
- pmbNumber: the PMB, Suite, Unit, Box, or Apt number from the delivery address (format as "PMB-XXXX" if it is a number, zero-padded to 4 digits)
- sender: the sender name or return address organization
- mailType: one of "letter", "magazine", "catalog", "legal", "other"
- confidence: your confidence score from 0 to 1

Mail type hints:
- "letter": standard envelope, bank statements, utility bills
- "magazine": glossy periodicals, subscriptions
- "catalog": product catalogs, marketing mailers
- "legal": government mail, court documents, IRS, official-looking envelopes
- "other": anything that does not fit above

If a field is not visible or unclear, use an empty string for text fields.
Always return valid JSON array only, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, batch } = body as { image: string; batch?: boolean };

    if (!image) {
      return NextResponse.json(
        { success: false, mode: 'ai', results: [], error: 'No image provided' },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* -- Demo mode when no API key ---------------------------------------- */
    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 1500));

      return NextResponse.json({
        success: true,
        mode: 'demo',
        results: batch ? DEMO_BATCH : DEMO_SINGLE,
      } satisfies MailSortResponse);
    }

    /* -- Real AI Vision call ---------------------------------------------- */
    const base64Data = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;

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
                  ? 'Analyze ALL visible mail pieces in this image. There should be multiple pieces spread out. Return one object per piece detected.'
                  : 'Analyze the mail pieces visible in this image and extract the recipient and sender information for each.',
              },
              {
                type: 'image_url',
                image_url: { url: base64Data, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 3000,
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
          results: [],
          error: `Vision API error: ${detail}`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '[]';

    let results: MailSortResult[];
    try {
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      results = JSON.parse(cleaned);
      if (!Array.isArray(results)) results = [results];
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          results: [],
          error: 'Failed to parse mail data from image',
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'ai',
      results,
    } satisfies MailSortResponse);
  } catch (err) {
    console.error('Mail AI sort error:', err);
    return NextResponse.json(
      { success: false, mode: 'ai' as const, results: [], error: 'Internal server error' },
      { status: 500 },
    );
  }
}
