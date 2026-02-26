'use client';

/**
 * Google Tag Manager Provider
 *
 * Injects the GTM container script (<head>) and noscript fallback (<body>).
 * Only renders when `NEXT_PUBLIC_GTM_ID` is set, so it's a no-op in local
 * dev unless you explicitly configure a container.
 *
 * Usage (in root layout):
 *   <GTMProvider />
 *   ...
 *   <GTMNoScript />   ← immediately inside <body>
 *
 * Data-layer page-view events are pushed automatically on route changes.
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/* -------------------------------------------------------------------------- */
/*  Data-layer page view tracker                                              */
/* -------------------------------------------------------------------------- */

function GTMPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GTM_ID || typeof window === 'undefined') return;

    const url = searchParams?.size
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Push a virtual page view into the data layer for GTM triggers
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: url,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  GTM Head Script                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Renders the GTM `<script>` tag.  Place in the root layout alongside
 * other providers.  Includes the data-layer page-view tracker.
 */
export function GTMProvider() {
  if (!GTM_ID) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
      <GTMPageView />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  GTM NoScript (body fallback)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Renders the GTM `<noscript>` iframe.  Place immediately inside `<body>`.
 */
export function GTMNoScript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}

/* -------------------------------------------------------------------------- */
/*  TypeScript: extend Window with dataLayer                                  */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}
