/**
 * In-memory sliding window rate limiter for notifications.
 *
 * Limits:
 *   - Max 3 notifications per customer per hour
 *   - Max 10 notifications per customer per day
 *
 * Uses a simple timestamp-based sliding window stored in memory.
 * In a multi-instance deployment, replace with Redis-backed storage.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next send is allowed (only set when blocked) */
  retryAfter?: number;
  /** Human-readable reason when blocked */
  reason?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 10;

// ── Storage ──────────────────────────────────────────────────────────────────

/**
 * Map of customerId → array of send timestamps (epoch ms).
 * Periodically pruned to avoid unbounded growth.
 */
const sendLog = new Map<string, number[]>();

/** Last time we ran a full prune pass. */
let lastPruneAt = Date.now();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

function pruneOldEntries(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;

  const cutoff = now - DAY_MS;
  for (const [customerId, timestamps] of sendLog.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      sendLog.delete(customerId);
    } else {
      sendLog.set(customerId, valid);
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether a notification can be sent to the given customer
 * without exceeding rate limits.
 */
export function checkRateLimit(customerId: string): RateLimitResult {
  pruneOldEntries();

  const now = Date.now();
  const timestamps = sendLog.get(customerId) ?? [];

  // Filter to relevant windows
  const hourWindow = timestamps.filter((t) => t > now - HOUR_MS);
  const dayWindow = timestamps.filter((t) => t > now - DAY_MS);

  // Check hourly limit
  if (hourWindow.length >= MAX_PER_HOUR) {
    const oldest = hourWindow[0];
    const retryAfter = Math.ceil((oldest + HOUR_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `Hourly limit reached (${MAX_PER_HOUR}/hr). Retry in ${retryAfter}s.`,
    };
  }

  // Check daily limit
  if (dayWindow.length >= MAX_PER_DAY) {
    const oldest = dayWindow[0];
    const retryAfter = Math.ceil((oldest + DAY_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `Daily limit reached (${MAX_PER_DAY}/day). Retry in ${retryAfter}s.`,
    };
  }

  return { allowed: true };
}

/**
 * Record that a notification was successfully sent to a customer.
 * Call this *after* a successful send so the rate limiter tracks it.
 */
export function recordNotification(customerId: string): void {
  const timestamps = sendLog.get(customerId) ?? [];
  timestamps.push(Date.now());
  sendLog.set(customerId, timestamps);
}

/**
 * Reset rate limit state for a specific customer (useful for testing / admin override).
 */
export function resetRateLimit(customerId: string): void {
  sendLog.delete(customerId);
}

/**
 * Get current rate limit status for a customer (for display purposes).
 */
export function getRateLimitStatus(customerId: string): {
  hourCount: number;
  dayCount: number;
  hourLimit: number;
  dayLimit: number;
} {
  const now = Date.now();
  const timestamps = sendLog.get(customerId) ?? [];

  return {
    hourCount: timestamps.filter((t) => t > now - HOUR_MS).length,
    dayCount: timestamps.filter((t) => t > now - DAY_MS).length,
    hourLimit: MAX_PER_HOUR,
    dayLimit: MAX_PER_DAY,
  };
}
