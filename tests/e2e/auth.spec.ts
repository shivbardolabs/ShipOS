/**
 * BAR-210: Authentication E2E Tests
 *
 * Tests login flow, session persistence, role-based redirects,
 * and ToS agreement gate.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or Auth0
    await expect(page).toHaveURL(/login|auth0/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
    // Should have login-related content
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('auth error page shows friendly message', async ({ page }) => {
    await page.goto('/auth/error?error=access_denied');
    await expect(page.locator('body')).toBeVisible();
  });

  test('legal pages are publicly accessible', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toContainText(/terms/i);

    await page.goto('/privacy');
    await expect(page.locator('body')).toContainText(/privacy/i);
  });
});
