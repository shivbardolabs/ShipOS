'use client';

/**
 * Agreement Gate — Redirects users to /agree if they haven't accepted ToS
 *
 * Wraps dashboard content. Checks two conditions:
 * 1. User has never agreed (agreedToTermsAt is null) → redirect to /agree
 * 2. A new legal document version was published after the user agreed → redirect to /agree
 *
 * For version checking, fetches the latest active versions from /api/legal
 * and compares against the user's termsVersionAccepted / privacyVersionAccepted.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTenant } from '@/components/tenant-provider';

interface VersionInfo {
  termsVersion: number | null;
  privacyVersion: number | null;
}

export function AgreementGate({ children }: { children: React.ReactNode }) {
  const { localUser, loading } = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const [latestVersions, setLatestVersions] = useState<VersionInfo | null>(null);

  // Fetch latest published legal document versions
  useEffect(() => {
    let cancelled = false;

    async function fetchVersions() {
      try {
        const [termsRes, privacyRes] = await Promise.all([
          fetch('/api/legal?type=terms'),
          fetch('/api/legal?type=privacy'),
        ]);

        if (cancelled) return;

        const termsData = termsRes.ok ? await termsRes.json() : { doc: null };
        const privacyData = privacyRes.ok ? await privacyRes.json() : { doc: null };

        setLatestVersions({
          termsVersion: termsData.doc?.version ?? null,
          privacyVersion: privacyData.doc?.version ?? null,
        });
      } catch {
        // If we can't fetch versions, don't block the user — skip version check
        setLatestVersions({ termsVersion: null, privacyVersion: null });
      }
    }

    fetchVersions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Don't redirect while loading or if user isn't loaded yet
    if (loading || !localUser) return;

    // Skip for kiosk mode pages
    if (pathname?.startsWith('/dashboard/kiosk')) return;

    // Case 1: User has never agreed to terms
    if (!localUser.agreedToTermsAt) {
      router.replace('/agree');
      return;
    }

    // Case 2: Check if there are newer versions the user hasn't accepted
    // Only check once we've fetched the latest versions
    if (latestVersions) {
      const needsTermsReAccept =
        latestVersions.termsVersion !== null &&
        (localUser.termsVersionAccepted == null ||
          localUser.termsVersionAccepted < latestVersions.termsVersion);

      const needsPrivacyReAccept =
        latestVersions.privacyVersion !== null &&
        (localUser.privacyVersionAccepted == null ||
          localUser.privacyVersionAccepted < latestVersions.privacyVersion);

      if (needsTermsReAccept || needsPrivacyReAccept) {
        router.replace('/agree');
      }
    }
  }, [localUser, loading, router, pathname, latestVersions]);

  // While loading, render children (they'll have their own loading states)
  // If user hasn't agreed, the redirect will happen via useEffect
  return <>{children}</>;
}
