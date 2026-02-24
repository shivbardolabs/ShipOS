import { NextRequest, NextResponse } from 'next/server';
import { customers, packages, customerFees } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  POST /api/voice/command                                                   */
/*  Accepts a voice transcript and returns an AI-parsed intent + response.    */
/* -------------------------------------------------------------------------- */

type Intent =
  | 'check_in'
  | 'query_packages'
  | 'send_reminder'
  | 'count_packages'
  | 'storage_fees'
  | 'general';

export interface VoiceCommandResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  intent: Intent;
  response: string;
  data?: Record<string, unknown>;
  requiresConfirmation: boolean;
}

/* ── Demo intent matcher ─────────────────────────────────────────────────── */

function matchDemoIntent(transcript: string): {
  intent: Intent;
  response: string;
  data?: Record<string, unknown>;
  requiresConfirmation: boolean;
} {
  const t = transcript.toLowerCase().trim();

  // --- check_in ---
  if (t.includes('check in') || t.includes('checkin') || t.includes('checking in')) {
    const carrierMatch = t.match(
      /\b(amazon|ups|fedex|usps|dhl|lasership|ontrac|walmart|target)\b/i
    );
    const pmbMatch = t.match(/pmb[- ]?(\d+)/i);

    const carrier = carrierMatch?.[1] ?? 'ups';
    const pmbNum = pmbMatch ? `PMB-${pmbMatch[1].padStart(4, '0')}` : 'PMB-0001';

    const customer = customers.find(
      (c) => c.pmbNumber.toLowerCase() === pmbNum.toLowerCase()
    );
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`
      : 'James Morrison';

    return {
      intent: 'check_in',
      response: `Ready to check in a ${carrier.toUpperCase()} package for ${customerName} (${pmbNum}). Shall I proceed?`,
      data: {
        carrier: carrier.toLowerCase(),
        pmbNumber: pmbNum,
        customerName,
        customerId: customer?.id ?? 'cust_001',
      },
      requiresConfirmation: true,
    };
  }

  // --- query_packages ---
  if (
    t.includes('what packages') ||
    t.includes('packages does') ||
    t.includes('packages for') ||
    t.includes('show packages') ||
    t.includes('list packages')
  ) {
    const pmbMatch = t.match(/pmb[- ]?(\d+)/i);
    const nameMatch = t.match(
      /(?:packages (?:does|for|of))\s+([a-z]+(?: [a-z]+)?)/i
    );

    let customer = null;

    if (pmbMatch) {
      const pmbNum = `PMB-${pmbMatch[1].padStart(4, '0')}`;
      customer = customers.find(
        (c) => c.pmbNumber.toLowerCase() === pmbNum.toLowerCase()
      );
    } else if (nameMatch) {
      const search = nameMatch[1].toLowerCase();
      customer = customers.find(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search)
      );
    }

    if (!customer) {
      customer = customers[0]; // default fallback
    }

    const custPackages = packages
      .filter(
        (p) =>
          p.customerId === customer!.id &&
          p.status !== 'released' &&
          p.status !== 'returned'
      )
      .slice(0, 5);

    const pkgList = custPackages.map(
      (p) =>
        `• ${p.carrier.toUpperCase()} — ${p.senderName ?? 'Unknown'} (${p.status.replace('_', ' ')})`
    );

    return {
      intent: 'query_packages',
      response:
        custPackages.length > 0
          ? `${customer.firstName} ${customer.lastName} (${customer.pmbNumber}) has ${custPackages.length} pending package${custPackages.length !== 1 ? 's' : ''}:\n${pkgList.join('\n')}`
          : `${customer.firstName} ${customer.lastName} (${customer.pmbNumber}) has no pending packages.`,
      data: {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        pmbNumber: customer.pmbNumber,
        packageCount: custPackages.length,
        packages: custPackages.map((p) => ({
          id: p.id,
          carrier: p.carrier,
          sender: p.senderName,
          status: p.status,
        })),
      },
      requiresConfirmation: false,
    };
  }

  // --- send_reminder ---
  if (
    t.includes('send reminder') ||
    t.includes('pickup reminder') ||
    t.includes('remind') ||
    t.includes('notify')
  ) {
    const pmbMatch = t.match(/pmb[- ]?(\d+)/i);
    const pmbNum = pmbMatch ? `PMB-${pmbMatch[1].padStart(4, '0')}` : 'PMB-0003';
    const customer = customers.find(
      (c) => c.pmbNumber.toLowerCase() === pmbNum.toLowerCase()
    );
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`
      : 'Robert Singh';

    const pendingCount = customer
      ? packages.filter(
          (p) =>
            p.customerId === customer.id &&
            (p.status === 'checked_in' ||
              p.status === 'notified' ||
              p.status === 'ready')
        ).length
      : 3;

    return {
      intent: 'send_reminder',
      response: `Send pickup reminder to ${customerName} (${pmbNum})? They have ${pendingCount} pending package${pendingCount !== 1 ? 's' : ''}.`,
      data: {
        pmbNumber: pmbNum,
        customerName,
        customerId: customer?.id ?? 'cust_003',
        pendingPackages: pendingCount,
        channels: customer
          ? [
              customer.notifyEmail ? 'email' : null,
              customer.notifySms ? 'sms' : null,
            ].filter(Boolean)
          : ['email', 'sms'],
      },
      requiresConfirmation: true,
    };
  }

  // --- count_packages ---
  if (
    t.includes('how many packages') ||
    t.includes('package count') ||
    t.includes('total packages') ||
    t.includes('packages today') ||
    t.includes('packages came')
  ) {
    const todayPkgs = packages.filter((p) => {
      const d = new Date(p.checkedInAt);
      const now = new Date('2026-02-21');
      return d.toDateString() === now.toDateString();
    });

    const byCarrier: Record<string, number> = {};
    todayPkgs.forEach((p) => {
      byCarrier[p.carrier] = (byCarrier[p.carrier] || 0) + 1;
    });

    const total =
      todayPkgs.length > 0
        ? todayPkgs.length
        : 14; // fallback count for demo

    const carrierBreakdown =
      todayPkgs.length > 0
        ? Object.entries(byCarrier)
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => `${c.toUpperCase()}: ${n}`)
            .join(', ')
        : 'Amazon: 5, UPS: 4, FedEx: 3, USPS: 2';

    return {
      intent: 'count_packages',
      response: `${total} packages received today. Breakdown: ${carrierBreakdown}.`,
      data: { total, byCarrier },
      requiresConfirmation: false,
    };
  }

  // --- storage_fees ---
  if (
    t.includes('storage fee') ||
    t.includes('storage fees') ||
    t.includes('fees') ||
    t.includes('fee total') ||
    t.includes('what do i owe') ||
    t.includes('outstanding')
  ) {
    const unpaidFees = customerFees.filter(
      (f) =>
        f.status !== 'paid' &&
        f.status !== 'waived' &&
        f.category === 'storage'
    );

    const totalStorage = unpaidFees.reduce((sum, f) => sum + f.amount, 0);
    const affectedCustomers = new Set(unpaidFees.map((f) => f.customerId)).size;

    const allUnpaidFees = customerFees.filter(
      (f) => f.status !== 'paid' && f.status !== 'waived'
    );
    const grandTotal = allUnpaidFees.reduce((sum, f) => sum + f.amount, 0);

    return {
      intent: 'storage_fees',
      response: `Outstanding storage fees: ${formatCurrency(totalStorage)} across ${affectedCustomers} customer${affectedCustomers !== 1 ? 's' : ''}. Total outstanding fees (all types): ${formatCurrency(grandTotal)}.`,
      data: {
        storageFeeTotal: totalStorage,
        grandTotal,
        affectedCustomers,
        feeCount: unpaidFees.length,
      },
      requiresConfirmation: false,
    };
  }

  // --- general ---
  const generalResponses: Record<string, string> = {
    hello: "Hello! I'm your ShipOS voice assistant. I can help with check-ins, package queries, reminders, counts, and fee lookups. What do you need?",
    help: "I can help with:\n• Check in packages — \"Check in a FedEx package for PMB 0003\"\n• Query packages — \"What packages does James Morrison have?\"\n• Send reminders — \"Send pickup reminder to PMB 0005\"\n• Count packages — \"How many packages today?\"\n• Fee lookups — \"What's the storage fee total?\"\n\nJust speak naturally!",
    default:
      "I'm not sure I understood that. Try commands like:\n• \"Check in a UPS package for PMB 0001\"\n• \"What packages does Linda Nakamura have?\"\n• \"How many packages today?\"\n• \"Send pickup reminder to PMB 0003\"\n• \"What's the storage fee total?\"",
  };

  let generalResponse = generalResponses.default;
  if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
    generalResponse = generalResponses.hello;
  } else if (t.includes('help') || t.includes('what can you do')) {
    generalResponse = generalResponses.help;
  }

  return {
    intent: 'general',
    response: generalResponse,
    requiresConfirmation: false,
  };
}

/* ── OpenAI prompt for intent parsing ────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a voice command parser for ShipOS, a postal mailbox store management app.
Parse the user's spoken transcript into a structured intent.

Supported intents:
1. "check_in" — Check in a package. Extract: carrier, pmbNumber
2. "query_packages" — Ask about a customer's packages. Extract: customerName or pmbNumber
3. "send_reminder" — Send a pickup reminder. Extract: pmbNumber
4. "count_packages" — How many packages received today
5. "storage_fees" — Ask about fee totals
6. "general" — Anything else about store operations

Return JSON only:
{
  "intent": "<intent>",
  "entities": {
    "carrier": "<carrier or null>",
    "pmbNumber": "<PMB-XXXX or null>",
    "customerName": "<name or null>"
  }
}

Rules:
- carrier must be one of: amazon, ups, fedex, usps, dhl, or null
- pmbNumber should be formatted as PMB-XXXX (zero-padded to 4 digits)
- Always return valid JSON, no markdown, no explanation`;

/* ── Main handler ────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body as { transcript?: string };

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          mode: 'demo',
          intent: 'general',
          response: 'No transcript provided.',
          requiresConfirmation: false,
        } satisfies VoiceCommandResponse,
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    /* ── Demo mode ────────────────────────────────────────────────────── */
    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 800));
      const result = matchDemoIntent(transcript);

      return NextResponse.json({
        success: true,
        mode: 'demo',
        ...result,
      } satisfies VoiceCommandResponse);
    }

    /* ── AI mode ──────────────────────────────────────────────────────── */
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
          { role: 'user', content: transcript },
        ],
        max_tokens: 300,
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
        // keep generic
      }

      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          intent: 'general' as Intent,
          response: `Voice AI error: ${detail}`,
          requiresConfirmation: false,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: { intent: Intent; entities: Record<string, string | null> };
    try {
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fall back to demo mode if we can't parse AI response
      const result = matchDemoIntent(transcript);
      return NextResponse.json({
        success: true,
        mode: 'ai',
        ...result,
      } satisfies VoiceCommandResponse);
    }

    // Use the AI-parsed intent with our local data to build a rich response
    const intent = parsed.intent as Intent;
    const entities = parsed.entities ?? {};

    // Override entities into the transcript so the demo matcher can work
    // Build a synthetic transcript that the demo matcher will match
    let syntheticTranscript = transcript;
    if (intent === 'check_in') {
      syntheticTranscript = `check in ${entities.carrier ?? ''} package for pmb ${entities.pmbNumber?.replace('PMB-', '') ?? '0001'}`;
    } else if (intent === 'query_packages') {
      syntheticTranscript = entities.pmbNumber
        ? `what packages for pmb ${entities.pmbNumber.replace('PMB-', '')}`
        : `what packages does ${entities.customerName ?? 'James Morrison'} have`;
    } else if (intent === 'send_reminder') {
      syntheticTranscript = `send reminder to pmb ${entities.pmbNumber?.replace('PMB-', '') ?? '0003'}`;
    } else if (intent === 'count_packages') {
      syntheticTranscript = 'how many packages today';
    } else if (intent === 'storage_fees') {
      syntheticTranscript = 'storage fee total';
    }

    const result = matchDemoIntent(syntheticTranscript);

    return NextResponse.json({
      success: true,
      mode: 'ai',
      ...result,
      intent, // preserve AI-detected intent
    } satisfies VoiceCommandResponse);
  } catch (err) {
    console.error('Voice command error:', err);
    return NextResponse.json(
      {
        success: false,
        mode: 'demo' as const,
        intent: 'general' as Intent,
        response: 'Internal server error',
        requiresConfirmation: false,
      },
      { status: 500 }
    );
  }
}
