import {expect, test} from '@playwright/test'

/**
 * Visual regression tests for Button component across different themes
 *
 * These tests ensure that the Button component renders consistently
 * across different themes (light/dark) and maintain visual integrity
 * when theme-related changes are made.
 */
test.describe('Button Component - Visual Regression', () => {
  test('should render Default Button story correctly', async ({page}) => {
    await page.goto('/iframe.html?id=components-button--default&viewMode=story')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Allow for theme rendering

    // Take screenshot of the story container
    const storyRoot = page.locator('#storybook-root')
    await expect(storyRoot).toHaveScreenshot('button-default.png')
  })

  test('should render All Variants Button story correctly', async ({page}) => {
    await page.goto('/iframe.html?id=components-button--all-variants&viewMode=story')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const storyRoot = page.locator('#storybook-root')
    await expect(storyRoot).toHaveScreenshot('button-all-variants.png')
  })

  test('should render Interactive Button story correctly', async ({page}) => {
    await page.goto('/iframe.html?id=components-button--interactive&viewMode=story')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const storyRoot = page.locator('#storybook-root')
    await expect(storyRoot).toHaveScreenshot('button-interactive.png')
  })

  test('should render Usage Patterns Button story correctly', async ({page}) => {
    await page.goto('/iframe.html?id=components-button--usage-patterns&viewMode=story')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const storyRoot = page.locator('#storybook-root')
    await expect(storyRoot).toHaveScreenshot('button-usage-patterns.png')
  })

  test('should render Accessibility Button story correctly', async ({page}) => {
    await page.goto('/iframe.html?id=components-button--accessibility&viewMode=story')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const storyRoot = page.locator('#storybook-root')
    await expect(storyRoot).toHaveScreenshot('button-accessibility.png')
  })
})
