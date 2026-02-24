'use client';

/**
 * Agreement Gate — /agree
 *
 * Shown to users who haven't agreed to Terms of Service & Privacy Policy yet.
 * After first login, if `agreedToTermsAt` is null, user is redirected here
 * before they can access the dashboard.
 *
 * On acceptance, calls POST /api/users/agree to set the timestamp, then
 * redirects to /dashboard.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/components/tenant-provider';
import { Shield, FileText, Lock, Check, ArrowRight, Loader2 } from 'lucide-react';

export default function AgreePage() {
  const router = useRouter();
  const { refresh } = useTenant();
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canContinue = agreedTerms && agreedPrivacy;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users/agree', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record agreement');
      }
      // Refresh the cached user so AgreementGate sees the updated agreedToTermsAt
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shipos-logo-mark.svg" alt="ShipOS" width={40} height={40} />
          <span className="text-xl font-bold text-surface-100">
            Ship<span className="text-primary-500">OS</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-surface-700 bg-surface-900/80 p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                <Shield className="h-7 w-7 text-primary-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-surface-100 mb-1">Welcome to ShipOS</h1>
            <p className="text-sm text-surface-400">
              Before you get started, please review and accept our policies.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                onClick={() => setAgreedTerms(!agreedTerms)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  agreedTerms
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : 'bg-surface-900 border-surface-600 text-transparent group-hover:border-surface-500'
                }`}
              >
                <Check className="h-3 w-3" />
              </button>
              <div>
                <span className="text-sm text-surface-200 block">
                  I have read and agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-400 underline inline-flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Terms of Service
                  </Link>
                </span>
                <span className="text-xs text-surface-500 block mt-0.5">
                  Covers acceptable use, account responsibilities, and service terms
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                onClick={() => setAgreedPrivacy(!agreedPrivacy)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  agreedPrivacy
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : 'bg-surface-900 border-surface-600 text-transparent group-hover:border-surface-500'
                }`}
              >
                <Check className="h-3 w-3" />
              </button>
              <div>
                <span className="text-sm text-surface-200 block">
                  I have read and agree to the{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-400 underline inline-flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    Privacy Policy
                  </Link>
                </span>
                <span className="text-xs text-surface-500 block mt-0.5">
                  How we collect, use, store, and protect your information
                </span>
              </div>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!canContinue || submitting}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              canContinue
                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/20 hover:-translate-y-0.5'
                : 'bg-surface-800 text-surface-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-surface-600 text-center mt-4">
            You can review these policies at any time from the footer of any page.
          </p>
        </div>
      </div>
    </div>
  );
}
