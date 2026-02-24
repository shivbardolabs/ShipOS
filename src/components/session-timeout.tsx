'use client';

/**
 * Session timeout warning modal.
 *
 * Shows a warning modal after 15 minutes of inactivity with a countdown
 * to automatic logout. User can click "Stay Logged In" to reset the timer.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { createSessionTimeout, DEFAULT_SESSION_CONFIG } from '@/lib/session';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Shield } from 'lucide-react';

export function SessionTimeout() {
  const { user } = useUser();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const managerRef = useRef<ReturnType<typeof createSessionTimeout> | null>(null);

  const handleLogout = useCallback(() => {
    window.location.href = '/api/auth/logout';
  }, []);

  useEffect(() => {
    if (!user) return;

    const manager = createSessionTimeout(DEFAULT_SESSION_CONFIG, {
      onWarn: (seconds) => {
        setShowWarning(true);
        setSecondsRemaining(seconds);
      },
      onLogout: handleLogout,
      onActivity: () => {
        setShowWarning(false);
      },
    });

    managerRef.current = manager;
    manager.start();

    return () => {
      manager.stop();
    };
  }, [user, handleLogout]);

  const handleStayLoggedIn = () => {
    managerRef.current?.extend();
    setShowWarning(false);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <Modal
      open={showWarning}
      onClose={handleStayLoggedIn}
      title=""
      size="sm"
    >
      <div className="text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-4">
          <Shield className="h-8 w-8 text-amber-500" />
        </div>

        <h3 className="text-lg font-semibold text-surface-100 mb-2">
          Session Expiring Soon
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          Your session will expire due to inactivity. You will be automatically
          logged out for security.
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-amber-500" />
          <span className="text-2xl font-mono font-bold text-amber-500">
            {formatTime(secondsRemaining)}
          </span>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log Out Now
          </Button>
          <Button onClick={handleStayLoggedIn}>
            Stay Logged In
          </Button>
        </div>
      </div>
    </Modal>
  );
}
