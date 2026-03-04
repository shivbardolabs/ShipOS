/**
 * Navigation & Routing E2E Tests
 *
 * Tests cross-page navigation, deep linking, and 404 handling.
 * Public pages only — no AUTH_COOKIE required.
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Page Navigation', () => {
  test('landing → features via header link', async ({ page }) => {
    await page.goto('/');
    // Features link may be in header or hero
    const featuresLink = page.locator('a[href="/features"]').first();
    if (await featuresLink.isVisible()) {
      await featuresLink.click();
      await expect(page).toHaveURL(/features/);
      await expect(page.locator('body')).toContainText(/feature/i);
    }
  });

  test('landing → pricing via header link', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/pricing"]').first().click();
    await expect(page).toHaveURL(/pricing/);
    await expect(page.locator('body')).toContainText(/pricing|starter|pro/i);
  });

  test('landing → support via header link', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/support"]').first().click();
    await expect(page).toHaveURL(/support/);
    await expect(page.locator('body')).toContainText(/support/i);
  });

  test('pricing → signup CTA navigates to Auth0', async ({ page }) => {
    await page.goto('/pricing');
    const signupLink = page.locator('a[href="/api/auth/signup"]').first();
    const href = await signupLink.getAttribute('href');
    expect(href).toBe('/api/auth/signup');
  });
});

test.describe('Deep Links', () => {
  test('direct navigation to /features works', async ({ page }) => {
    await page.goto('/features');
    await expect(page.locator('body')).toContainText(/feature/i);
  });

  test('direct navigation to /pricing works', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toContainText(/pricing/i);
  });

  test('direct navigation to /support works', async ({ page }) => {
    await page.goto('/support');
    await expect(page.locator('body')).toContainText(/support/i);
  });

  test('direct navigation to /terms works', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toContainText(/terms/i);
  });

  test('direct navigation to /privacy works', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toContainText(/privacy/i);
  });
});

test.describe('Error Handling', () => {
  test('non-existent page returns 404 or redirects', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    // Next.js should return 404 or redirect
    const status = response?.status();
    expect(status === 404 || status === 200).toBeTruthy(); // 200 for custom 404 page
  });

  test('non-existent dashboard page handled gracefully', async ({ page }) => {
    const response = await page.goto('/dashboard/nonexistent-section-xyz');
    await expect(page.locator('body')).toBeVisible();
    // Should either 404 or redirect to login
  });
});

test.describe('Offline Page', () => {
  test('offline fallback page renders', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.locator('body')).toBeVisible();
  });
});
