import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Types ────────────────────────────────────────────────────────────────── */

type IntentType = 'check_in' | 'lookup_package' | 'lookup_customer' | 'notify' | 'shipment_status' | 'help';

interface ParsedIntent {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
}

interface VoiceCommandResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  intent: ParsedIntent;
  data: Record<string, unknown>;
  response: string;
}

/* ── Schema ───────────────────────────────────────────────────────────────── */

const VoiceCommandBodySchema = z.object({
  transcript: z.string().min(1, 'Voice transcript is required'),
});

/* ── Intent matching ─────────────────────────────────────────────────────── */

function matchIntent(transcript: string): ParsedIntent {
  const lower = transcript.toLowerCase();

  // Tracking number patterns
  const trackingMatch = lower.match(
    /(?:1z[a-z0-9]{16}|[0-9]{20,22}|[0-9]{12}|[0-9]{15}|[a-z]{2}[0-9]{9}[a-z]{2})/i,
  );
  // PMB numbers
  const pmbMatch = lower.match(/(?:pmb|mailbox|box)\s*#?\s*(\d+)/i);
  // Customer name
  const nameMatch = lower.match(
    /(?:for|customer|name)\s+([a-z]+ [a-z]+)/i,
  );

  if (/check\s*in|receive|arrived|intake/i.test(lower)) {
    return {
      intent: 'check_in',
      confidence: 0.9,
      entities: {
        ...(trackingMatch ? { trackingNumber: trackingMatch[0] } : {}),
        ...(pmbMatch ? { pmbNumber: pmbMatch[1] } : {}),
      },
    };
  }

  if (/find|look\s*up|where|search|track/i.test(lower) && (trackingMatch || pmbMatch)) {
    return {
      intent: trackingMatch ? 'lookup_package' : 'lookup_customer',
      confidence: 0.85,
      entities: {
        ...(trackingMatch ? { trackingNumber: trackingMatch[0] } : {}),
        ...(pmbMatch ? { pmbNumber: pmbMatch[1] } : {}),
        ...(nameMatch ? { name: nameMatch[1] } : {}),
      },
    };
  }

  if (/notify|alert|send|text|email|remind/i.test(lower)) {
    return {
      intent: 'notify',
      confidence: 0.85,
      entities: {
        ...(pmbMatch ? { pmbNumber: pmbMatch[1] } : {}),
        ...(nameMatch ? { name: nameMatch[1] } : {}),
      },
    };
  }

  if (/ship|shipment|status|delivery/i.test(lower)) {
    return {
      intent: 'shipment_status',
      confidence: 0.8,
      entities: {
        ...(trackingMatch ? { trackingNumber: trackingMatch[0] } : {}),
      },
    };
  }

  if (nameMatch || pmbMatch) {
    return {
      intent: 'lookup_customer',
      confidence: 0.7,
      entities: {
        ...(pmbMatch ? { pmbNumber: pmbMatch[1] } : {}),
        ...(nameMatch ? { name: nameMatch[1] } : {}),
      },
    };
  }

  return { intent: 'help', confidence: 0.5, entities: {} };
}

/* ── System prompt for AI refinement ─────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a voice command interpreter for ShipOS, a pack-and-ship store management system. Parse the user's voice transcript and return a structured JSON response.

Return ONLY valid JSON:
{
  "intent": "check_in|lookup_package|lookup_customer|notify|shipment_status|help",
  "confidence": 0.0-1.0,
  "entities": {
    "trackingNumber": "optional",
    "pmbNumber": "optional",
    "name": "optional",
    "carrier": "optional"
  },
  "naturalResponse": "A conversational response summarizing what you understood and what action to take"
}

No markdown, no explanation — only valid JSON.`;

/**
 * POST /api/voice/command
 * Process a voice transcript: parse intent, look up data, return response.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, VoiceCommandBodySchema);
  const tenantId = user.tenantId;

  // Step 1: Parse intent
  let intent = matchIntent(body.transcript);

  // Step 2: Optionally refine with AI
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && intent.confidence < 0.8) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: body.transcript },
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        const content: string = result.choices?.[0]?.message?.content ?? '';
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        intent = {
          intent: parsed.intent,
          confidence: parsed.confidence,
          entities: parsed.entities || {},
        };
      }
    } catch {
      // Keep local intent on AI failure
    }
  }

  // Step 3: Fetch relevant data based on intent
  let data: Record<string, unknown> = {};
  let response = '';

  switch (intent.intent) {
    case 'lookup_package': {
      if (intent.entities.trackingNumber) {
        const pkg = await prisma.package.findFirst({
          where: {
            customer: { tenantId },
            trackingNumber: { contains: intent.entities.trackingNumber, mode: 'insensitive' },
          },
          include: { customer: { select: { firstName: true, lastName: true, pmbNumber: true } } },
        });
        if (pkg) {
          data = { package: pkg };
          response = `Found package ${pkg.trackingNumber} for ${pkg.customer?.firstName} ${pkg.customer?.lastName} (PMB ${pkg.customer?.pmbNumber}). Status: ${pkg.status}.`;
        } else {
          response = `No package found with tracking number ${intent.entities.trackingNumber}.`;
        }
      }
      break;
    }

    case 'lookup_customer': {
      const where: Record<string, unknown> = { tenantId };
      if (intent.entities.pmbNumber) {
        where.pmbNumber = { contains: intent.entities.pmbNumber, mode: 'insensitive' };
      } else if (intent.entities.name) {
        const [first, ...rest] = intent.entities.name.split(' ');
        where.OR = [
          { firstName: { contains: first, mode: 'insensitive' } },
          { lastName: { contains: rest.join(' ') || first, mode: 'insensitive' } },
        ];
      }

      const customer = await prisma.customer.findFirst({
        where,
        include: { _count: { select: { packages: { where: { status: { in: ['checked_in', 'notified'] } } } } } },
      });

      if (customer) {
        data = { customer };
        response = `Found ${customer.firstName} ${customer.lastName} (PMB ${customer.pmbNumber}). They have ${customer._count.packages} package(s) waiting.`;
      } else {
        response = 'No matching customer found.';
      }
      break;
    }

    case 'check_in': {
      response = intent.entities.trackingNumber
        ? `Ready to check in package ${intent.entities.trackingNumber}. Please confirm.`
        : 'Ready to check in a package. Please scan or provide the tracking number.';
      data = { action: 'check_in', entities: intent.entities };
      break;
    }

    case 'notify': {
      response = intent.entities.pmbNumber
        ? `Ready to send notification to PMB ${intent.entities.pmbNumber}.`
        : 'Which customer would you like to notify?';
      data = { action: 'notify', entities: intent.entities };
      break;
    }

    case 'shipment_status': {
      if (intent.entities.trackingNumber) {
        const shipment = await prisma.shipment.findFirst({
          where: { customer: { tenantId }, trackingNumber: intent.entities.trackingNumber },
        });
        if (shipment) {
          data = { shipment };
          response = `Shipment ${shipment.trackingNumber} is ${shipment.status}.`;
        } else {
          response = `No shipment found with tracking ${intent.entities.trackingNumber}.`;
        }
      } else {
        response = 'Please provide a tracking number to look up.';
      }
      break;
    }

    default:
      response = 'I can help you check in packages, look up customers, send notifications, or check shipment status. What would you like to do?';
      break;
  }

  return ok({
    success: true,
    mode: apiKey ? 'ai' : 'demo',
    intent,
    data,
    response,
  } satisfies VoiceCommandResponse);
});
