import {expect, test} from '@playwright/test'

/**
 * Visual regression tests for ThemeShowcase component across different themes
 *
 * The ThemeShowcase component displays all design tokens and theme elements,
 * making it crucial for visual regression testing to ensure the entire
 * theme system maintains consistency.
 */
test.describe('ThemeShowcase Component - Visual Regression', () => {
  // Test the comprehensive theme showcase in light theme
  test.describe('Light Theme', () => {
    test.beforeEach(async ({page}) => {
      // Navigate to ThemeShowcase story and set light theme
      await page.goto('/iframe.html?id=components-theme--showcase&viewMode=story')

      // Wait for the component to load
      await page.waitForSelector('[data-testid="theme-showcase"]', {timeout: 10000})

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

    test('Complete theme showcase layout', async ({page}) => {
      const showcase = page.locator('[data-testid="theme-showcase"]').first()
      await expect(showcase).toHaveScreenshot('theme-showcase-complete-light.png')
    })

    test('Color palette section', async ({page}) => {
      const colorSection = page.locator('[data-testid="color-palette"]').first()
      await expect(colorSection).toHaveScreenshot('theme-colors-light.png')
    })

    test('Typography section', async ({page}) => {
      const typographySection = page.locator('[data-testid="typography-showcase"]').first()
      await expect(typographySection).toHaveScreenshot('theme-typography-light.png')
    })

    test('Spacing scale section', async ({page}) => {
      const spacingSection = page.locator('[data-testid="spacing-showcase"]').first()
      await expect(spacingSection).toHaveScreenshot('theme-spacing-light.png')
    })

    test('Shadow system section', async ({page}) => {
      const shadowSection = page.locator('[data-testid="shadow-showcase"]').first()
      await expect(shadowSection).toHaveScreenshot('theme-shadows-light.png')
    })

    test('Border system section', async ({page}) => {
      const borderSection = page.locator('[data-testid="border-showcase"]').first()
      await expect(borderSection).toHaveScreenshot('theme-borders-light.png')
    })

    test('Semantic colors section', async ({page}) => {
      const semanticSection = page.locator('[data-testid="semantic-colors"]').first()
      await expect(semanticSection).toHaveScreenshot('theme-semantic-colors-light.png')
    })
  })

  // Test the comprehensive theme showcase in dark theme
  test.describe('Dark Theme', () => {
    test.beforeEach(async ({page}) => {
      // Navigate to ThemeShowcase story and set dark theme
      await page.goto('/iframe.html?id=components-theme--showcase&viewMode=story')

      // Wait for the component to load
      await page.waitForSelector('[data-testid="theme-showcase"]', {timeout: 10000})

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

    test('Complete theme showcase layout', async ({page}) => {
      const showcase = page.locator('[data-testid="theme-showcase"]').first()
      await expect(showcase).toHaveScreenshot('theme-showcase-complete-dark.png')
    })

    test('Color palette section', async ({page}) => {
      const colorSection = page.locator('[data-testid="color-palette"]').first()
      await expect(colorSection).toHaveScreenshot('theme-colors-dark.png')
    })

    test('Typography section', async ({page}) => {
      const typographySection = page.locator('[data-testid="typography-showcase"]').first()
      await expect(typographySection).toHaveScreenshot('theme-typography-dark.png')
    })

    test('Spacing scale section', async ({page}) => {
      const spacingSection = page.locator('[data-testid="spacing-showcase"]').first()
      await expect(spacingSection).toHaveScreenshot('theme-spacing-dark.png')
    })

    test('Shadow system section', async ({page}) => {
      const shadowSection = page.locator('[data-testid="shadow-showcase"]').first()
      await expect(shadowSection).toHaveScreenshot('theme-shadows-dark.png')
    })

    test('Border system section', async ({page}) => {
      const borderSection = page.locator('[data-testid="border-showcase"]').first()
      await expect(borderSection).toHaveScreenshot('theme-borders-dark.png')
    })

    test('Semantic colors section', async ({page}) => {
      const semanticSection = page.locator('[data-testid="semantic-colors"]').first()
      await expect(semanticSection).toHaveScreenshot('theme-semantic-colors-dark.png')
    })
  })

  // Test theme switching behavior
  test.describe('Theme Switching', () => {
    test('Theme switcher controls', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--showcase&viewMode=story')

      // Wait for component to load
      await page.waitForSelector('[data-testid="theme-showcase"]', {timeout: 10000})

      // Find and capture theme switcher
      const themeSwitcher = page.locator('[data-testid="theme-switcher"]').first()
      await expect(themeSwitcher).toHaveScreenshot('theme-switcher-controls.png')
    })

    test('Live theme demonstration', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--live-demo&viewMode=story')

      // Wait for component to load
      await page.waitForSelector('[data-testid="live-theme-demo"]', {timeout: 10000})

      const liveDemo = page.locator('[data-testid="live-theme-demo"]').first()
      await expect(liveDemo).toHaveScreenshot('theme-live-demo.png')
    })

    test('Custom theme application', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--custom-theme&viewMode=story')

      // Wait for component to load
      await page.waitForSelector('[data-testid="custom-theme-demo"]', {timeout: 10000})

      const customDemo = page.locator('[data-testid="custom-theme-demo"]').first()
      await expect(customDemo).toHaveScreenshot('theme-custom-demo.png')
    })
  })

  // Test theme consistency across viewports
  test.describe('Responsive Behavior', () => {
    test('Theme showcase on mobile viewport', async ({page}) => {
      await page.setViewportSize({width: 375, height: 667})
      await page.goto('/iframe.html?id=components-theme--showcase&viewMode=story')

      // Set light theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)

      const showcase = page.locator('[data-testid="theme-showcase"]').first()
      await expect(showcase).toHaveScreenshot('theme-showcase-mobile-light.png')
    })

    test('Theme showcase on tablet viewport', async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024})
      await page.goto('/iframe.html?id=components-theme--showcase&viewMode=story')

      // Set dark theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Dark theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)

      const showcase = page.locator('[data-testid="theme-showcase"]').first()
      await expect(showcase).toHaveScreenshot('theme-showcase-tablet-dark.png')
    })
  })

  // Test individual design token groups
  test.describe('Design Token Visual Verification', () => {
    test('Primary color scale consistency', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--color-scales&viewMode=story')

      const primaryScale = page.locator('[data-testid="primary-color-scale"]').first()
      await expect(primaryScale).toHaveScreenshot('color-scale-primary.png')
    })

    test('Semantic color variations', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--semantic-variations&viewMode=story')

      const semanticColors = page.locator('[data-testid="semantic-color-variations"]').first()
      await expect(semanticColors).toHaveScreenshot('color-semantic-variations.png')
    })

    test('Typography scale rendering', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--typography-scale&viewMode=story')

      const typographyScale = page.locator('[data-testid="typography-scale"]').first()
      await expect(typographyScale).toHaveScreenshot('typography-scale-rendering.png')
    })
  })
})
