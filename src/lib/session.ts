/**
 * Session timeout manager.
 *
 * Client-side utility that tracks user activity and triggers warnings/logouts
 * based on configurable timeout thresholds.
 *
 * Default: warn at 15 minutes, force logout at 20 minutes of inactivity.
 */

export interface SessionTimeoutConfig {
  /** Minutes of inactivity before showing warning (default: 15) */
  warnAfterMinutes: number;
  /** Minutes of inactivity before forcing logout (default: 20) */
  logoutAfterMinutes: number;
  /** Activity events to listen for */
  activityEvents: string[];
}

export const DEFAULT_SESSION_CONFIG: SessionTimeoutConfig = {
  warnAfterMinutes: 15,
  logoutAfterMinutes: 20,
  activityEvents: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
};

export type SessionTimeoutCallback = {
  onWarn: (secondsRemaining: number) => void;
  onLogout: () => void;
  onActivity: () => void;
};

/**
 * Create a session timeout manager.
 * Call start() to begin tracking, stop() to clean up.
 */
export function createSessionTimeout(
  config: SessionTimeoutConfig = DEFAULT_SESSION_CONFIG,
  callbacks: SessionTimeoutCallback,
) {
  let lastActivity = Date.now();
  let warnTimer: ReturnType<typeof setTimeout> | null = null;
  let logoutTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let isWarning = false;

  const warnMs = config.warnAfterMinutes * 60 * 1000;
  const logoutMs = config.logoutAfterMinutes * 60 * 1000;

  function resetTimers() {
    lastActivity = Date.now();
    isWarning = false;

    if (warnTimer) clearTimeout(warnTimer);
    if (logoutTimer) clearTimeout(logoutTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    warnTimer = setTimeout(() => {
      isWarning = true;
      // Start countdown
      countdownInterval = setInterval(() => {
        const elapsed = Date.now() - lastActivity;
        const remaining = Math.max(0, Math.ceil((logoutMs - elapsed) / 1000));
        callbacks.onWarn(remaining);
        if (remaining <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          callbacks.onLogout();
        }
      }, 1000);
    }, warnMs);

    logoutTimer = setTimeout(() => {
      callbacks.onLogout();
    }, logoutMs);
  }

  function handleActivity() {
    if (isWarning) {
      callbacks.onActivity();
    }
    resetTimers();
  }

  function start() {
    config.activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    resetTimers();
  }

  function stop() {
    config.activityEvents.forEach((event) => {
      document.removeEventListener(event, handleActivity);
    });
    if (warnTimer) clearTimeout(warnTimer);
    if (logoutTimer) clearTimeout(logoutTimer);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  /** Extend session (called when user clicks "Stay logged in") */
  function extend() {
    resetTimers();
  }

  return { start, stop, extend };
}
