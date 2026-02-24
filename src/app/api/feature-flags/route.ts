import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Superadmin always sees everything
    if (me.role === 'superadmin') {
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
              { targetType: 'user', targetId: me.id },
              ...(me.tenantId ? [{ targetType: 'tenant', targetId: me.tenantId }] : []),
            ],
          },
        },
      },
    });

    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      // Check user-level override first
      const userOverride = flag.overrides.find(
        (o) => o.targetType === 'user' && o.targetId === me.id,
      );
      if (userOverride) {
        result[flag.key] = userOverride.enabled;
        continue;
      }

      // Check tenant-level override
      const tenantOverride = flag.overrides.find(
        (o) => o.targetType === 'tenant' && o.targetId === me.tenantId,
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
}
