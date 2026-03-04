/**
 * Seed test for Playwright Test Agents.
 *
 * This sets up the default environment needed for test generation.
 * The Planner and Generator agents use this as a starting point to
 * explore the app and produce test files.
 *
 * For unauthenticated flows: navigates to the public landing page.
 * For authenticated flows: sets up Auth0 session cookie if available.
 */

import { test, expect } from '@playwright/test';

test.describe('ShipOS Seed', () => {
  test('seed — public pages', async ({ page }) => {
    // Navigate to the public landing page
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('seed — authenticated dashboard', async ({ page, context }) => {
    // If AUTH_COOKIE is set, inject it for authenticated testing
    if (process.env.AUTH_COOKIE) {
      const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
      await context.addCookies([{
        name: 'appSession',
        value: process.env.AUTH_COOKIE,
        domain: new URL(baseURL).hostname,
        path: '/',
      }]);
    }

    await page.goto('/dashboard');

    // If we have a session cookie, we should see the dashboard
    // Otherwise we'll be redirected to login
    const url = page.url();
    if (url.includes('dashboard')) {
      await expect(page.locator('body')).toContainText(/dashboard|packages|customers/i);
    } else {
      // Redirected to login — expected without AUTH_COOKIE
      await expect(page).toHaveURL(/login|auth0/);
    }
  });
});
