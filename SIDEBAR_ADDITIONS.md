# Sidebar & Feature Flag Additions for BAR-228/229

These changes need to be applied by the thread that owns `sidebar.tsx` and `feature-flag-definitions.ts`.

## Sidebar Nav Items

Add to the **PLATFORM** section in `src/components/layout/sidebar.tsx`:

```ts
// After the Feature Flags entry:
{ label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
{ label: 'Tag Manager', href: '/dashboard/admin/tag-manager', icon: Tag },
```

Icons to import from `lucide-react`: `BarChart3`, `Tag` (BarChart3 is already imported).

Both should inherit the section's `requiredRole: 'superadmin'`.

## Feature Flag Definitions

Add to the **Platform** category in `src/lib/feature-flag-definitions.ts`:

```ts
{
  key: 'web_analytics',
  name: 'Web Analytics',
  description: 'Enhanced PostHog analytics wrapper with page tracking, event catalogue, and weekly report cron',
  category: 'platform',
  defaultEnabled: false,
},
{
  key: 'tag_manager',
  name: 'Google Tag Manager',
  description: 'Google Tag Manager integration for third-party tag deployment without code changes',
  category: 'platform',
  defaultEnabled: false,
},
```

## Files Created (BAR-228 & BAR-229)

- `src/lib/analytics.ts` — analytics wrapper (trackEvent, trackPageView, trackLogin, event catalogue)
- `src/components/gtm-provider.tsx` — GTMProvider + GTMNoScript components
- `src/app/dashboard/admin/analytics/page.tsx` — admin analytics page (superadmin)
- `src/app/dashboard/admin/tag-manager/page.tsx` — admin tag manager page (superadmin)
- `src/app/api/cron/analytics-report/route.ts` — weekly report cron endpoint
- `src/app/layout.tsx` — updated with GTMProvider + GTMNoScript
