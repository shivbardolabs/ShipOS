/**
 * Server-side auth helpers.
 *
 * `getOrProvisionUser(session)` is the single entry-point for connecting an
 * Auth0 session to a local User + Tenant row.  On first login it creates both;
 * on subsequent logins it returns the existing records.
 */

import { getSession } from '@auth0/nextjs-auth0';
import prisma from './prisma';

export interface LocalUser {
  id: string;
  auth0Id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  avatar: string | null;
  tenantId: string | null;
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

  // 1. Try to find existing user by auth0Id
  let user = await prisma.user.findUnique({
    where: { auth0Id: sub },
    include: { tenant: true },
  });

  if (user) {
    return {
      id: user.id,
      auth0Id: user.auth0Id!,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'manager' | 'employee',
      avatar: user.avatar,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  }

  // 2. Also check by email (user might exist from seed but not linked yet)
  user = await prisma.user.findUnique({
    where: { email: email as string },
    include: { tenant: true },
  });

  if (user) {
    // Link existing user to Auth0
    user = await prisma.user.update({
      where: { id: user.id },
      data: { auth0Id: sub, name: name || user.name, avatar: picture || user.avatar },
      include: { tenant: true },
    });

    // If user has no tenant, create one
    if (!user.tenantId) {
      const tenant = await createDefaultTenant(name || email);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
        include: { tenant: true },
      });
    }

    return {
      id: user.id,
      auth0Id: user.auth0Id!,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'manager' | 'employee',
      avatar: user.avatar,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  }

  // 3. Brand-new user — create User + Tenant together
  const tenant = await createDefaultTenant(name || email);
  const newUser = await prisma.user.create({
    data: {
      auth0Id: sub,
      name: name || (email as string).split('@')[0],
      email: email as string,
      role: 'admin', // Default admin for testing
      avatar: picture || null,
      tenantId: tenant.id,
    },
    include: { tenant: true },
  });

  return {
    id: newUser.id,
    auth0Id: newUser.auth0Id!,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role as 'admin' | 'manager' | 'employee',
    avatar: newUser.avatar,
    tenantId: newUser.tenantId,
    tenant: newUser.tenant,
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
