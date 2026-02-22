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
  role: 'admin' | 'manager' | 'employee';
  avatar: string | null;
  tenantId: string | null;
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
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data: LocalUser = await res.json();
        setLocalUser(data);
      }
    } catch (e) {
      console.error('Failed to fetch user data', e);
    } finally {
      setLoading(false);
    }
  }, []);

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
