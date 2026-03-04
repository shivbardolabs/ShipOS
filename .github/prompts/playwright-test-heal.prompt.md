---
agent: playwright-test-healer
description: Fix failing ShipOS tests
---

Run all E2E tests in `tests/e2e/` and fix any failing ones.

Context: ShipOS is a Next.js app with Auth0 authentication. Tests that require
authentication use the `AUTH_COOKIE` environment variable to set the `appSession`
cookie. Tests without auth should work against public pages.

Common issues to watch for:
- Selectors that changed after UI updates
- Timing issues with Next.js client-side navigation
- Auth-gated pages that redirect without session cookie
- Dynamic data that changes between test runs
