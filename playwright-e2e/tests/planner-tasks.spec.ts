import { test, expect } from '@playwright/test'

test.describe('Planner-Style Tasks Workspace E2E Flow', () => {
  const pmEmail = 'akshaiindia97@gmail.com'
  const password = 'SakhaaOnTop123'

  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto('/')
    const loginPage = page.locator('[data-testid="login-page"]')
    if (await loginPage.isVisible()) {
      await page.locator('[data-testid="input-email"]').fill(pmEmail)
      await page.locator('[data-testid="input-password"]').fill(password)
      await page.locator('[data-testid="button-sign-in"]').click()
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 })
    }
  })

  test('should navigate to Tasks tab and toggle between Grid, Board, Calendar, and Charts', async ({ page }) => {
    await page.locator('[data-testid="nav-tasks"]').click()
    await expect(page.locator('[data-testid="tasks-overview-page"]')).toBeVisible()

    // 1. Grid view check
    await page.locator('[data-testid="view-tab-grid"]').click()
    await expect(page.locator('[data-testid="task-grid-view"]')).toBeVisible({ timeout: 5000 })

    // 2. Board view check
    await page.locator('[data-testid="view-tab-board"]').click()
    await expect(page.locator('[data-testid="task-board-view"]')).toBeVisible({ timeout: 5000 })

    // 3. Calendar view check
    await page.locator('[data-testid="view-tab-calendar"]').click()
    await expect(page.locator('[data-testid="task-calendar-view"]')).toBeVisible({ timeout: 5000 })

    // 4. Charts view check
    await page.locator('[data-testid="view-tab-charts"]').click()
    await expect(page.locator('body')).toContainText(/Task Status Progress|Priority Workload|Analytics/i, { timeout: 10000 })
  })

  test('should open global filter popover, apply a filter, and clear it', async ({ page }) => {
    await page.locator('[data-testid="nav-tasks"]').click()
    await expect(page.locator('[data-testid="tasks-overview-page"]')).toBeVisible()

    // Open filter popover
    await page.locator('[data-testid="filter-toggle-button"]').click()
    
    // Click Priority tab inside filter popover
    await page.locator('button:has-text("Priority")').click()

    // Check 'high' priority filter checkbox
    const highCheckbox = page.locator('label:has-text("high") input[type="checkbox"]')
    await highCheckbox.check()
    await expect(highCheckbox).toBeChecked()

    // Clear all filters
    await page.locator('button:has-text("Clear All Filters")').click()

    // Close popover
    await page.locator('[data-testid="filter-toggle-button"]').click()
  })

  test('should open create task modal and verify title input field exists', async ({ page }) => {
    await page.locator('[data-testid="nav-tasks"]').click()
    await expect(page.locator('[data-testid="tasks-overview-page"]')).toBeVisible()

    // Open Create Modal
    await page.locator('button:has-text("New Task")').click()
    
    // Verify modal is open and has Task Title field
    const modal = page.locator('h2:has-text("Create Custom Task")')
    await expect(modal).toBeVisible()

    const titleInput = page.locator('input[placeholder="e.g. Schedule June Content Calendar"]')
    await expect(titleInput).toBeVisible()

    // Close Modal
    await page.locator('button:has-text("Cancel")').click()
  })
})
