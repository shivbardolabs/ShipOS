'use client';

/**
 * Store selector dropdown for multi-store tenants.
 * Shows in the dashboard header when the tenant has multiple stores.
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { useFlags } from '@/components/feature-flag-provider';
import { MapPin, ChevronDown, Check } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  isDefault: boolean;
}

interface StoreContextValue {
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store) => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue>({
  stores: [],
  activeStore: null,
  setActiveStore: () => {},
  loading: true,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const { isEnabled } = useFlags();

  useEffect(() => {
    if (!isEnabled('multi_store')) {
      setLoading(false);
      return;
    }

    fetch('/api/stores')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.stores) {
          setStores(data.stores);
          const defaultStore = data.stores.find((s: Store) => s.isDefault) || data.stores[0];
          if (defaultStore && !activeStore) {
            setActiveStore(defaultStore);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  return (
    <StoreContext.Provider value={{ stores, activeStore, setActiveStore, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

export function StoreSelector() {
  const { stores, activeStore, setActiveStore } = useStore();
  const [open, setOpen] = useState(false);
  const { isEnabled } = useFlags();

  // Don't show if feature is disabled or only 1 store
  if (!isEnabled('multi_store') || stores.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-sm text-surface-300 hover:border-surface-600 hover:text-surface-200 transition-colors"
      >
        <MapPin className="h-3.5 w-3.5 text-primary-500" />
        <span className="max-w-[120px] truncate">{activeStore?.name || 'All Stores'}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-surface-700 bg-surface-900 py-1 shadow-xl">
            <div className="px-3 py-2 border-b border-surface-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">
                Select Store
              </p>
            </div>
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  setActiveStore(store);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-800 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-surface-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{store.name}</p>
                  {store.city && store.state && (
                    <p className="text-[11px] text-surface-500 truncate">
                      {store.city}, {store.state}
                    </p>
                  )}
                </div>
                {activeStore?.id === store.id && (
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
