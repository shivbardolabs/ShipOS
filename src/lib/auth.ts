/**
 * Server-side auth helpers.
 *
 * `getOrProvisionUser(session)` is the single entry-point for connecting an
 * Auth0 session to a local User + Tenant row.  On first login it creates both;
 * on subsequent logins it returns the existing records.
 *
 * The `superadmin` role is auto-assigned to designated platform owner emails.
 * Superadmins have cross-tenant visibility in the Master Admin panel.
 */

import { getSession } from '@auth0/nextjs-auth0';
import prisma from './prisma';

/* ── Superadmin emails ─────────────────────────────────────────────────────── */
const SUPERADMIN_EMAILS = ['shiv@bardolabs.ai'];

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'employee';

export interface LocalUser {
  id: string;
  auth0Id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  tenantId: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  tenant: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string;
    phone: string | null;
    email: string | null;
    timezone: string;
    businessHours: string | null;
    taxRate: number;
    logoUrl: string | null;
  } | null;
}

/**
 * Look up (or auto-create) the local User & Tenant for the current Auth0
 * session.  Every Auth0 user gets a local row the first time they hit any
 * authenticated API route.
 */
export async function getOrProvisionUser(): Promise<LocalUser | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const { sub, name, email, picture } = session.user;

  // Determine if this email is a superadmin
  const isSuperadmin = SUPERADMIN_EMAILS.includes((email as string)?.toLowerCase());

  // 1. Try to find existing user by auth0Id
  let user = await prisma.user.findUnique({
    where: { auth0Id: sub },
    include: { tenant: true },
  });

  if (user) {
    // Ensure superadmin role is enforced for designated emails
    const targetRole = isSuperadmin ? 'superadmin' : user.role;
    if (user.role !== targetRole) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: targetRole },
        include: { tenant: true },
      });
    }

    return toLocalUser(user);
  }

  // 2. Also check by email (user might exist from seed but not linked yet)
  user = await prisma.user.findUnique({
    where: { email: email as string },
    include: { tenant: true },
  });

  if (user) {
    // Link existing user to Auth0
    const targetRole = isSuperadmin ? 'superadmin' : user.role;
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        auth0Id: sub,
        name: name || user.name,
        avatar: picture || user.avatar,
        role: targetRole,
      },
      include: { tenant: true },
    });

    // If user has no tenant, check for invitation first, then create one
    if (!user.tenantId) {
      const invite = await prisma.invitation.findFirst({
        where: { email: email as string, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });

      let tenantId: string;
      let role: string | undefined;

      if (invite) {
        tenantId = invite.tenantId;
        role = isSuperadmin ? 'superadmin' : invite.role;
        await prisma.invitation.update({ where: { id: invite.id }, data: { status: 'accepted' } });
      } else {
        const tenant = await createDefaultTenant(name || email);
        tenantId = tenant.id;
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: { tenantId, ...(role ? { role } : {}) },
        include: { tenant: true },
      });
    }

    return toLocalUser(user);
  }

  // 3. Brand-new user — check for pending invitation first
  const pendingInvite = await prisma.invitation.findFirst({
    where: {
      email: email as string,
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
  });

  let targetTenantId: string;
  let assignedRole: string;

  if (pendingInvite) {
    // Accept the invitation — join the inviter's tenant with the specified role
    targetTenantId = pendingInvite.tenantId;
    assignedRole = isSuperadmin ? 'superadmin' : pendingInvite.role;

    await prisma.invitation.update({
      where: { id: pendingInvite.id },
      data: { status: 'accepted' },
    });
  } else {
    // No invitation — create a new tenant (original flow)
    const newTenant = await createDefaultTenant(name || email);
    targetTenantId = newTenant.id;
    assignedRole = isSuperadmin ? 'superadmin' : 'admin';
  }

  const newUser = await prisma.user.create({
    data: {
      auth0Id: sub,
      name: name || (email as string).split('@')[0],
      email: email as string,
      role: assignedRole,
      avatar: picture || null,
      tenantId: targetTenantId,
    },
    include: { tenant: true },
  });

  return toLocalUser(newUser);
}

/**
 * Record a login session for the current user.
 * Called from /api/users/me on each page load (deduplicated by session).
 */
export async function recordLogin(userId: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      }),
      prisma.loginSession.create({
        data: { userId },
      }),
    ]);
  } catch (err) {
    // Non-critical — don't break auth flow
    console.error('[recordLogin]', err);
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLocalUser(user: any): LocalUser {
  return {
    id: user.id,
    auth0Id: user.auth0Id!,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    avatar: user.avatar,
    tenantId: user.tenantId,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    loginCount: user.loginCount ?? 0,
    tenant: user.tenant,
  };
}

/** Create a default tenant with a unique slug derived from the user name. */
async function createDefaultTenant(ownerName: string | null | undefined) {
  const baseName = ownerName || 'My Store';
  const baseSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  // Ensure slug uniqueness
  let slug = baseSlug || 'store';
  let attempt = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  return prisma.tenant.create({
    data: {
      name: `${baseName}'s Store`,
      slug,
    },
  });
}
