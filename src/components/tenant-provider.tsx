'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface Tenant {
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
}

export interface LocalUser {
  id: string;
  auth0Id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'employee';
  avatar: string | null;
  tenantId: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  tenant: Tenant | null;
}

interface TenantContextValue {
  /** The current local user (with role & tenant). null while loading. */
  localUser: LocalUser | null;
  /** The current tenant. Shortcut for localUser.tenant. */
  tenant: Tenant | null;
  /** Whether initial fetch is in progress. */
  loading: boolean;
  /** Re-fetch user & tenant data (e.g. after saving settings). */
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  localUser: null,
  tenant: null,
  loading: true,
  refresh: async () => {},
});

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */
export function TenantProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    let resolved = false;

    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data: LocalUser = await res.json();
        setLocalUser(data);
        resolved = true;
      }
    } catch (e) {
      console.error('Failed to fetch user data', e);
    }

    // Fallback: if DB is temporarily unreachable, build a minimal LocalUser
    // from the Auth0 session so role-based UI still renders.
    // Superadmin emails get superadmin role.
    if (!resolved && auth0User) {
      const email = (auth0User.email as string) ?? '';
      const isSuperadmin = email.toLowerCase() === 'shiv@bardolabs.ai';
      setLocalUser({
        id: (auth0User.sub as string) ?? 'local',
        auth0Id: (auth0User.sub as string) ?? '',
        name: (auth0User.name as string) ?? email.split('@')[0] ?? 'User',
        email,
        role: isSuperadmin ? 'superadmin' : 'admin',
        avatar: (auth0User.picture as string) ?? null,
        tenantId: null,
        lastLoginAt: null,
        loginCount: 0,
        tenant: null,
      });
    }

    setLoading(false);
  }, [auth0User]);

  useEffect(() => {
    if (!auth0Loading && auth0User) {
      fetchMe();
    } else if (!auth0Loading) {
      setLoading(false);
    }
  }, [auth0Loading, auth0User, fetchMe]);

  return (
    <TenantContext.Provider
      value={{
        localUser,
        tenant: localUser?.tenant ?? null,
        loading,
        refresh: fetchMe,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */
export function useTenant() {
  return useContext(TenantContext);
}
