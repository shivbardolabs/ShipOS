'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Loader2 } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;  // 2-letter abbreviation
  zip: string;
}

interface AddressAutocompleteProps {
  /** Current street value */
  value: string;
  /** Called on every keystroke (street field only) */
  onChange: (street: string) => void;
  /** Called when user selects an autocomplete suggestion — provides parsed components */
  onSelect: (address: ParsedAddress) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Google Maps script loader                                                 */
/* -------------------------------------------------------------------------- */
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.maps?.places) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/* -------------------------------------------------------------------------- */
/*  Parse a Google Place into address components                              */
/* -------------------------------------------------------------------------- */
function parsePlaceResult(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components ?? [];
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';

  for (const comp of components) {
    const type = comp.types[0];
    switch (type) {
      case 'street_number':
        streetNumber = comp.long_name;
        break;
      case 'route':
        route = comp.short_name;
        break;
      case 'locality':
        city = comp.long_name;
        break;
      case 'sublocality_level_1':
        // fallback for cities like NYC boroughs
        if (!city) city = comp.long_name;
        break;
      case 'administrative_area_level_1':
        state = comp.short_name; // 2-letter state code
        break;
      case 'postal_code':
        zip = comp.long_name;
        break;
    }
  }

  const street = streetNumber ? `${streetNumber} ${route}` : route;
  return { street, city, state, zip };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  label = 'Street Address *',
  placeholder = '123 Main St',
  error,
  disabled,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keep a stable reference to onSelect so the listener doesn't go stale
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Load Google Maps and initialise Autocomplete
  useEffect(() => {
    if (!GOOGLE_API_KEY || disabled) return;

    let cancelled = false;
    setLoading(true);

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        if (autocompleteRef.current) return; // already init

        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address'],
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.address_components) return;
          const parsed = parsePlaceResult(place);
          // Update street input
          onChangeRef.current(parsed.street);
          // Send all components to parent
          onSelectRef.current(parsed);
        });

        autocompleteRef.current = ac;
        setReady(true);
      })
      .catch(() => {
        /* Google Maps not available — graceful degradation */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  // Sync value into the input (for controlled behaviour)
  // Google Autocomplete hijacks the input, so we need to be careful
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const hasAutocomplete = !!GOOGLE_API_KEY;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-300">{label}</label>
      )}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-500">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-surface-900 pl-10 pr-3.5 py-2 text-sm text-surface-100 placeholder:text-surface-500',
            'border-surface-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30',
            'transition-colors duration-150 outline-none',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          autoComplete="off"
        />
        {hasAutocomplete && ready && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-[10px] text-surface-600 font-medium">
              autocomplete
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
