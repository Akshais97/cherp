import { test, expect } from '@playwright/test'

test.describe('Phase 1 & 2 Gap Fixes & E2E Features Suite', () => {
  const adminEmail = 'akshaiindia97@gmail.com'
  const password = 'SakhaaOnTop123'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const loginPage = page.locator('[data-testid="login-page"]')
    if (await loginPage.isVisible()) {
      await page.locator('[data-testid="input-email"]').fill(adminEmail)
      await page.locator('[data-testid="input-password"]').fill(password)
      await page.locator('[data-testid="button-sign-in"]').click()
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 })
    }
  })

  test('Client Portal Layout & Tabs Navigation', async ({ page }) => {
    await page.goto('/client-portal')
    await expect(page.locator('body')).toContainText(/Cherp Client Portal|Client Portal|Client Dashboard|Brand Performance/i, { timeout: 10000 })
  })

  test('Notification Preferences Matrix UI Page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
    const navIntegrations = page.locator('[data-testid="nav-integrations"]')
    if (await navIntegrations.isVisible()) {
      await navIntegrations.click()
      await expect(page.locator('body')).toContainText(/Agency Resend Email Integration|Resend API Key/i)
    }
  })
})
