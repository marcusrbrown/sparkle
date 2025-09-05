import {expect, test} from '@playwright/test'

/**
 * Visual regression tests for Form component across different themes
 *
 * These tests ensure that the Form component and its form controls render
 * consistently across different themes (light/dark) and maintain visual
 * integrity when theme-related changes are made.
 */
test.describe('Form Component - Visual Regression', () => {
  // Test form components in light theme
  test.describe('Light Theme', () => {
    test.beforeEach(async ({page}) => {
      // Navigate to Form stories and set light theme
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')

      // Wait for the component to load
      await page.waitForSelector('[data-testid="themed-form"]', {timeout: 10000})

      // Ensure light theme is active
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })

      // Wait for theme change to apply
      await page.waitForTimeout(500)
    })

    test('Default form layout', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-default-light.png')
    })

    test('Form with text inputs', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--text-inputs&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-text-inputs-light.png')
    })

    test('Form with validation errors', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--with-errors&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-validation-errors-light.png')
    })

    test('Form with disabled fields', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--disabled-fields&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-disabled-fields-light.png')
    })

    test('Form input focus states', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')
      const input = page.locator('input[type="text"]').first()
      await input.focus()
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-input-focused-light.png')
    })

    test('Form with different input types', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--input-types&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-input-types-light.png')
    })

    test('Form with checkboxes and radio buttons', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--checkboxes-radio&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-checkboxes-radio-light.png')
    })
  })

  // Test form components in dark theme
  test.describe('Dark Theme', () => {
    test.beforeEach(async ({page}) => {
      // Navigate to Form stories and set dark theme
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')

      // Wait for the component to load
      await page.waitForSelector('[data-testid="themed-form"]', {timeout: 10000})

      // Ensure dark theme is active
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Dark theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })

      // Wait for theme change to apply
      await page.waitForTimeout(500)
    })

    test('Default form layout', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-default-dark.png')
    })

    test('Form with text inputs', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--text-inputs&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-text-inputs-dark.png')
    })

    test('Form with validation errors', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--with-errors&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-validation-errors-dark.png')
    })

    test('Form with disabled fields', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--disabled-fields&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-disabled-fields-dark.png')
    })

    test('Form input focus states', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')
      const input = page.locator('input[type="text"]').first()
      await input.focus()
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-input-focused-dark.png')
    })

    test('Form with different input types', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--input-types&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-input-types-dark.png')
    })

    test('Form with checkboxes and radio buttons', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--checkboxes-radio&viewMode=story')
      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-checkboxes-radio-dark.png')
    })
  })

  // Test form interaction states
  test.describe('Form Interactions', () => {
    test('Form with filled inputs in light theme', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')

      // Set light theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)

      // Fill form inputs
      await page.fill('input[type="text"]', 'Sample text input')
      await page.fill('input[type="email"]', 'test@example.com')

      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-filled-light.png')
    })

    test('Form with filled inputs in dark theme', async ({page}) => {
      await page.goto('/iframe.html?id=components-form--default&viewMode=story')

      // Set dark theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Dark theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)

      // Fill form inputs
      await page.fill('input[type="text"]', 'Sample text input')
      await page.fill('input[type="email"]', 'test@example.com')

      const form = page.locator('[data-testid="themed-form"]').first()
      await expect(form).toHaveScreenshot('form-filled-dark.png')
    })
  })
})
