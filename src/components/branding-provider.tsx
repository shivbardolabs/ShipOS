'use client';

/**
 * BrandingProvider — Injects tenant branding as CSS custom properties.
 *
 * Reads branding settings from the tenant context and applies them
 * as CSS custom properties on the root element. Components can use
 * `var(--brand-accent)` etc. to pick up tenant colors.
 *
 * Behind the `white_label_branding` feature flag.
 */

import { useEffect, type ReactNode } from 'react';
import { useTenant } from './tenant-provider';
import { useFlags } from './feature-flag-provider';

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { tenant } = useTenant();
  const { isEnabled } = useFlags();
  const brandingEnabled = isEnabled('white_label_branding');

  useEffect(() => {
    if (!brandingEnabled || !tenant) return;

    const root = document.documentElement;

    // Apply branding CSS custom properties
    const brandAccent = tenant.brandAccentColor ?? null;

    if (brandAccent && /^#[0-9a-fA-F]{6}$/.test(brandAccent)) {
      root.style.setProperty('--brand-accent', brandAccent);

      // Generate RGB version for opacity variants
      const r = parseInt(brandAccent.slice(1, 3), 16);
      const g = parseInt(brandAccent.slice(3, 5), 16);
      const b = parseInt(brandAccent.slice(5, 7), 16);
      root.style.setProperty('--brand-accent-rgb', `${r}, ${g}, ${b}`);
    }

    if (tenant.brandLogo) {
      root.style.setProperty('--brand-logo', `url(${tenant.brandLogo})`);
    }

    // Update favicon if provided
    const brandFavicon = tenant.brandFavicon ?? null;
    if (brandFavicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = brandFavicon;
    }

    return () => {
      // Clean up custom properties on unmount
      root.style.removeProperty('--brand-accent');
      root.style.removeProperty('--brand-accent-rgb');
      root.style.removeProperty('--brand-logo');
    };
  }, [tenant, brandingEnabled]);

  return <>{children}</>;
}
