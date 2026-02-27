/**
 * BAR-240: Carrier API Integration for Sender/Recipient Data Enrichment
 *
 * Unified interface for querying carrier tracking APIs.
 * - Extracts sender/recipient from tracking data
 * - Caches responses to avoid duplicate API calls
 * - Graceful fallback when APIs are unavailable
 * - Rate limiting per carrier
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface CarrierTrackingData {
  /** Carrier that provided the data */
  carrier: string;
  /** Tracking number queried */
  trackingNumber: string;
  /** Sender information (if available) */
  sender?: {
    name?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  /** Recipient information (if available) */
  recipient?: {
    name?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  /** Current tracking status */
  status?: string;
  /** Estimated delivery date */
  estimatedDelivery?: string;
  /** Service type (e.g. "Priority Mail", "Ground") */
  serviceType?: string;
  /** Weight (if available) */
  weight?: { value: number; unit: string };
  /** Whether data was from cache */
  fromCache: boolean;
  /** API response timestamp */
  fetchedAt: string;
  /** If the lookup failed, the error message */
  error?: string;
}

export interface CarrierApiConfig {
  /** API key for this carrier */
  apiKey?: string;
  /** Whether this carrier API is enabled */
  enabled: boolean;
  /** Optional secondary API key or account number */
  accountNumber?: string;
}

/* ── In-Memory Cache ────────────────────────────────────────────────────── */

interface CacheEntry {
  data: CarrierTrackingData;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute cache
const lookupCache = new Map<string, CacheEntry>();

function getCached(
  trackingNumber: string,
  carrier: string
): CarrierTrackingData | null {
  const key = `${carrier}:${trackingNumber}`;
  const entry = lookupCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    lookupCache.delete(key);
    return null;
  }
  return { ...entry.data, fromCache: true };
}

function setCache(
  trackingNumber: string,
  carrier: string,
  data: CarrierTrackingData
): void {
  const key = `${carrier}:${trackingNumber}`;
  lookupCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  // Evict old entries if cache grows too large
  if (lookupCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of lookupCache.entries()) {
      if (now > v.expiresAt) lookupCache.delete(k);
    }
  }
}

/* ── Rate Limiting ──────────────────────────────────────────────────────── */

const rateLimits: Record<string, { count: number; resetAt: number }> = {};
const MAX_REQUESTS_PER_MINUTE = 30;

function checkRateLimit(carrier: string): boolean {
  const now = Date.now();
  const limit = rateLimits[carrier];

  if (!limit || now > limit.resetAt) {
    rateLimits[carrier] = { count: 1, resetAt: now + 60_000 };
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_MINUTE) return false;
  limit.count++;
  return true;
}

/* ── Carrier-Specific Lookup Stubs ──────────────────────────────────────── */
// These are ready for real API integration. Currently they return structured
// mock data to demonstrate the enrichment pipeline. Replace with real API
// calls when carrier API credentials are configured.

async function lookupUSPS(
  trackingNumber: string,
  config: CarrierApiConfig
): Promise<CarrierTrackingData> {
  // TODO: Integrate with USPS Web Tools API (tracking + delivery details)
  // Endpoint: https://secure.shippingapis.com/ShippingAPI.dll
  void config; // Will use config.apiKey when real API is connected
  await new Promise((r) => setTimeout(r, 200)); // simulate latency
  return {
    carrier: 'usps',
    trackingNumber,
    sender: {
      name: 'USPS Sender',
      city: 'Washington',
      state: 'DC',
      zip: '20260',
    },
    recipient: {
      name: 'Recipient',
      city: 'New York',
      state: 'NY',
    },
    status: 'In Transit',
    serviceType: 'Priority Mail',
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };
}

async function lookupUPS(
  trackingNumber: string,
  config: CarrierApiConfig
): Promise<CarrierTrackingData> {
  // TODO: Integrate with UPS Tracking API
  // Endpoint: https://onlinetools.ups.com/api/track/v1/details
  void config; // Will use config.apiKey when real API is connected
  await new Promise((r) => setTimeout(r, 200));
  return {
    carrier: 'ups',
    trackingNumber,
    sender: {
      name: 'UPS Shipper',
      city: 'Atlanta',
      state: 'GA',
    },
    recipient: {
      name: 'Recipient',
    },
    status: 'Out for Delivery',
    serviceType: 'UPS Ground',
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };
}

async function lookupFedEx(
  trackingNumber: string,
  config: CarrierApiConfig
): Promise<CarrierTrackingData> {
  // TODO: Integrate with FedEx Track API
  // Endpoint: https://apis.fedex.com/track/v1/trackingnumbers
  void config; // Will use config.apiKey when real API is connected
  await new Promise((r) => setTimeout(r, 200));
  return {
    carrier: 'fedex',
    trackingNumber,
    sender: {
      name: 'FedEx Shipper',
      city: 'Memphis',
      state: 'TN',
    },
    recipient: {
      name: 'Recipient',
    },
    status: 'Delivered',
    serviceType: 'FedEx Ground',
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };
}

async function lookupDHL(
  trackingNumber: string,
  config: CarrierApiConfig
): Promise<CarrierTrackingData> {
  // TODO: Integrate with DHL Shipment Tracking API
  // Endpoint: https://api-eu.dhl.com/track/shipments
  void config; // Will use config.apiKey when real API is connected
  await new Promise((r) => setTimeout(r, 200));
  return {
    carrier: 'dhl',
    trackingNumber,
    sender: {
      name: 'DHL Shipper',
      country: 'DE',
    },
    recipient: {
      name: 'Recipient',
    },
    status: 'In Transit',
    serviceType: 'DHL Express',
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };
}

/* ── Carrier Router ─────────────────────────────────────────────────────── */

const carrierLookupFunctions: Record<
  string,
  (
    trackingNumber: string,
    config: CarrierApiConfig
  ) => Promise<CarrierTrackingData>
> = {
  usps: lookupUSPS,
  ups: lookupUPS,
  fedex: lookupFedEx,
  dhl: lookupDHL,
};

/** Carriers that support API enrichment */
export const ENRICHABLE_CARRIERS = Object.keys(carrierLookupFunctions);

/**
 * Look up tracking information from a carrier API.
 * Uses cache first, then rate-limited API call, with graceful fallback.
 */
export async function lookupCarrierTracking(
  trackingNumber: string,
  carrier: string,
  config?: CarrierApiConfig
): Promise<CarrierTrackingData> {
  const cleaned = trackingNumber.trim();

  // 1. Check cache
  const cached = getCached(cleaned, carrier);
  if (cached) return cached;

  // 2. Check if carrier is supported
  const lookupFn = carrierLookupFunctions[carrier];
  if (!lookupFn) {
    return {
      carrier,
      trackingNumber: cleaned,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
      error: `No API integration available for ${carrier}`,
    };
  }

  // 3. Check carrier API config
  const effectiveConfig: CarrierApiConfig = config || { enabled: true };
  if (!effectiveConfig.enabled) {
    return {
      carrier,
      trackingNumber: cleaned,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
      error: `${carrier} API is disabled in settings`,
    };
  }

  // 4. Rate limit check
  if (!checkRateLimit(carrier)) {
    return {
      carrier,
      trackingNumber: cleaned,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
      error: `Rate limit exceeded for ${carrier} — try again in a moment`,
    };
  }

  // 5. Make the API call
  try {
    const data = await lookupFn(cleaned, effectiveConfig);
    setCache(cleaned, carrier, data);
    return data;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown carrier API error';
    return {
      carrier,
      trackingNumber: cleaned,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
