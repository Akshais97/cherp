import { test, expect } from '@playwright/test'

test.describe('Brand Profile Editing & Change Log E2E Flow', () => {
  const pmEmail = 'akshaiindia97@gmail.com'
  const password = 'SakhaaOnTop123'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const loginPage = page.locator('[data-testid="login-page"]')
    if (await loginPage.isVisible()) {
      await page.locator('[data-testid="input-email"]').fill(pmEmail)
      await page.locator('[data-testid="input-password"]').fill(password)
      await page.locator('[data-testid="button-sign-in"]').click()
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 })
    }
  })

  test('should navigate to Brands tab and verify page contents', async ({ page }) => {
    await page.locator('[data-testid="nav-brands"]').click()
    await expect(page.locator('body')).toContainText(/Brands|Brand Assets|Brand Guidelines/i, { timeout: 10000 })
  })
})
