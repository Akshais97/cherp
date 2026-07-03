import { test, expect } from '@playwright/test'

test.describe('Brand Profile Editing & Change Log E2E Flow', () => {
  const pmEmail = 'akshaiindia97@gmail.com'
  const password = 'SakhaaOnTop123'

  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto('/')
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible()

    // Fill credentials
    await page.locator('[data-testid="input-email"]').fill(pmEmail)
    await page.locator('[data-testid="input-password"]').fill(password)
    
    // Sign in
    await page.locator('[data-testid="button-sign-in"]').click()
    
    // Wait for redirect/load
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to Brands tab and verify page contents, edit brand profile, and verify change logs', async ({ page }) => {
    // Navigate to brands tab
    await page.locator('[data-testid="nav-brands"]').click()
    
    // Verify Brand cards exist
    await expect(page.locator('h1:has-text("Brands")')).toBeVisible()
    
    // Verify there is an Edit Profile button
    const editButton = page.locator('button:has-text("Edit Profile")').first()
    await expect(editButton).toBeVisible()
    
    // Click Edit Profile
    await editButton.click()
    
    // Verify Modal is open
    await expect(page.locator('h2:has-text("Edit Brand Profile:")')).toBeVisible()
    
    // Find Brand URL field and fill it
    const urlInput = page.locator('label:has-text("Brand URL") + input')
    const originalValue = await urlInput.inputValue()
    const newValue = `https://new-brand-url-${Date.now()}.com`
    await urlInput.fill(newValue)
    
    // Save Profile
    await page.locator('button:has-text("Save Profile")').click()
    
    // Wait for modal to close
    await expect(page.locator('h2:has-text("Edit Brand Profile:")')).not.toBeVisible()
    
    // Verify the URL displays on the card
    await expect(page.locator(`a:has-text("${newValue}")`)).toBeVisible()
    
    // Reopen modal to verify change log history entry is listed
    await editButton.click()
    await expect(page.locator('p:has-text("Brand URL")').first()).toBeVisible()
    
    // Close modal
    await page.locator('button[aria-label="Close brand profile editor"]').click()
  })
})
