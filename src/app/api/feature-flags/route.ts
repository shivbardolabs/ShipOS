import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/feature-flags
 *
 * Evaluates all feature flags for the current user and returns a
 * Record<string, boolean> map.
 *
 * Evaluation order:
 *   1. Superadmin → all flags enabled (platform owner sees everything)
 *   2. User-level override → takes priority
 *   3. Tenant-level override → second priority
 *   4. Flag defaultEnabled → fallback
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {

    // Superadmin always sees everything
    if (user.role === 'superadmin') {
      const flags = await prisma.featureFlag.findMany({ select: { key: true } });
      const result: Record<string, boolean> = {};
      for (const f of flags) result[f.key] = true;
      return NextResponse.json(result);
    }

    // Fetch all flags with their overrides for this user & tenant
    const flags = await prisma.featureFlag.findMany({
      include: {
        overrides: {
          where: {
            OR: [
              { targetType: 'user', targetId: user.id },
              ...(user.tenantId ? [{ targetType: 'tenant', targetId: user.tenantId }] : []),
            ],
          },
        },
      },
    });

    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      // Check user-level override first
      const userOverride = flag.overrides.find(
        (o) => o.targetType === 'user' && o.targetId === user.id,
      );
      if (userOverride) {
        result[flag.key] = userOverride.enabled;
        continue;
      }

      // Check tenant-level override
      const tenantOverride = flag.overrides.find(
        (o) => o.targetType === 'tenant' && o.targetId === user.tenantId,
      );
      if (tenantOverride) {
        result[flag.key] = tenantOverride.enabled;
        continue;
      }

      // Fall back to default
      result[flag.key] = flag.defaultEnabled;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/feature-flags]', err);
    // On error, return empty map (don't block the app)
    return NextResponse.json({});
  }
});
