/**
 * BAR-387: Mailbox range configuration API
 *
 * GET  /api/settings/mailbox-ranges — fetch saved ranges (or defaults)
 * PUT  /api/settings/mailbox-ranges — save ranges with overlap validation
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/** Mapping between UI platform keys and DB platform values */
const UI_TO_DB_PLATFORM: Record<string, string> = {
  store: 'physical',
  anytime: 'anytime',
  ipostal1: 'iPostal',
  postscan: 'postscan',
};

const DB_TO_UI_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries(UI_TO_DB_PLATFORM).map(([k, v]) => [v, k])
);

const DEFAULT_LABELS: Record<string, string> = {
  store: 'Store (Physical)',
  anytime: 'Anytime Mailbox',
  ipostal1: 'iPostal1',
  postscan: 'PostScan Mail',
};

const DEFAULT_RANGES: Record<string, { rangeStart: number; rangeEnd: number }> = {
  store: { rangeStart: 1, rangeEnd: 550 },
  anytime: { rangeStart: 700, rangeEnd: 999 },
  ipostal1: { rangeStart: 1000, rangeEnd: 1200 },
  postscan: { rangeStart: 2000, rangeEnd: 2999 },
};

/**
 * GET /api/settings/mailbox-ranges
 * Returns ranges keyed by UI platform (store, anytime, ipostal1, postscan).
 */
export const GET = withApiHandler(async (_request, { user }) => {
  try {
    const dbRanges = await prisma.mailboxRange.findMany({
      orderBy: { rangeStart: 'asc' },
    });

    // If no saved ranges, return defaults
    if (dbRanges.length === 0) {
      return NextResponse.json({ ranges: DEFAULT_RANGES });
    }

    // Map DB records to UI-keyed object
    const ranges: Record<string, { rangeStart: number; rangeEnd: number }> = {};
    for (const row of dbRanges) {
      const uiKey = DB_TO_UI_PLATFORM[row.platform];
      if (uiKey) {
        ranges[uiKey] = { rangeStart: row.rangeStart, rangeEnd: row.rangeEnd };
      }
    }

    // Fill in defaults for any missing platforms
    for (const key of Object.keys(DEFAULT_RANGES)) {
      if (!ranges[key]) {
        ranges[key] = DEFAULT_RANGES[key];
      }
    }

    return NextResponse.json({ ranges });
  } catch (err) {
    console.error('[GET /api/settings/mailbox-ranges]', err);
    return NextResponse.json({ error: 'Failed to fetch mailbox ranges' }, { status: 500 });
  }
});

/**
 * PUT /api/settings/mailbox-ranges
 * Accepts { ranges: Record<uiPlatform, { rangeStart, rangeEnd }>, enabledPlatforms: Record<uiPlatform, boolean> }
 * Validates for overlaps among enabled platforms before saving.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { ranges, enabledPlatforms } = body as {
      ranges: Record<string, { rangeStart: number; rangeEnd: number }>;
      enabledPlatforms: Record<string, boolean>;
    };

    if (!ranges || typeof ranges !== 'object') {
      return NextResponse.json({ error: 'ranges object is required' }, { status: 400 });
    }

    // Validate individual ranges
    for (const [key, range] of Object.entries(ranges)) {
      if (!UI_TO_DB_PLATFORM[key]) {
        return NextResponse.json({ error: `Unknown platform: ${key}` }, { status: 400 });
      }
      if (
        typeof range.rangeStart !== 'number' ||
        typeof range.rangeEnd !== 'number' ||
        range.rangeStart < 0 ||
        range.rangeEnd < 0
      ) {
        return NextResponse.json(
          { error: `Invalid range values for ${key}` },
          { status: 400 }
        );
      }
      if (range.rangeStart >= range.rangeEnd) {
        return NextResponse.json(
          { error: `Range start must be less than range end for ${DEFAULT_LABELS[key] || key}` },
          { status: 400 }
        );
      }
    }

    // Overlap validation among enabled platforms
    const enabledKeys = Object.keys(ranges).filter(
      (k) => enabledPlatforms?.[k] !== false
    );

    for (let i = 0; i < enabledKeys.length; i++) {
      for (let j = i + 1; j < enabledKeys.length; j++) {
        const a = ranges[enabledKeys[i]];
        const b = ranges[enabledKeys[j]];
        if (a.rangeStart <= b.rangeEnd && b.rangeStart <= a.rangeEnd) {
          return NextResponse.json(
            {
              error: `Overlapping ranges: ${DEFAULT_LABELS[enabledKeys[i]] || enabledKeys[i]} (${a.rangeStart}–${a.rangeEnd}) overlaps with ${DEFAULT_LABELS[enabledKeys[j]] || enabledKeys[j]} (${b.rangeStart}–${b.rangeEnd})`,
              overlap: { platforms: [enabledKeys[i], enabledKeys[j]] },
            },
            { status: 400 }
          );
        }
      }
    }

    // Upsert each range
    for (const [uiKey, range] of Object.entries(ranges)) {
      const dbPlatform = UI_TO_DB_PLATFORM[uiKey];
      const label = DEFAULT_LABELS[uiKey] || uiKey;
      const isActive = enabledPlatforms?.[uiKey] !== false;

      const existing = await prisma.mailboxRange.findFirst({
        where: { platform: dbPlatform },
      });

      if (existing) {
        await prisma.mailboxRange.update({
          where: { id: existing.id },
          data: {
            rangeStart: range.rangeStart,
            rangeEnd: range.rangeEnd,
            isActive,
            label,
          },
        });
      } else {
        await prisma.mailboxRange.create({
          data: {
            platform: dbPlatform,
            label,
            rangeStart: range.rangeStart,
            rangeEnd: range.rangeEnd,
            isActive,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/settings/mailbox-ranges]', err);
    return NextResponse.json({ error: 'Failed to save mailbox ranges' }, { status: 500 });
  }
});
