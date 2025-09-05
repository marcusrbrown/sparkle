import {expect, test} from '@playwright/test'

/**
 * Basic visual regression test to verify the setup is working
 */
test.describe('Basic Visual Regression Setup', () => {
  test('should load Storybook homepage', async ({page}) => {
    await page.goto('/')

    // Wait for the Storybook interface to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Give Storybook time to fully load

    // Check that we're on Storybook
    await expect(page).toHaveTitle(/Storybook/)

    // Verify the Storybook container exists
    const storybookContainer = page.locator('#storybook-root, #root, .sidebar-container, .manager-container')
    await expect(storybookContainer.first()).toBeVisible()
  })

  test('should be able to navigate to Button stories', async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Try to navigate to a Button story using URL
    await page.goto('/docs/button--docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Check if we can find story content
    const storyContent = page.locator('#storybook-root, #docs-root, .docs-story')
    await expect(storyContent.first()).toBeVisible()
  })
})
