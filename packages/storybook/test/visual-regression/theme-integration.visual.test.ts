import {expect, test} from '@playwright/test'

/**
 * Cross-component visual regression tests for theme integration
 *
 * These tests ensure that all themed components work together consistently
 * and that the overall theme system maintains visual harmony across
 * different component combinations.
 */
test.describe('Cross-Component Theme Integration - Visual Regression', () => {
  // Test component integration in light theme
  test.describe('Light Theme Integration', () => {
    test.beforeEach(async ({page}) => {
      // Ensure light theme is active across all tests
      await page.goto('/iframe.html?id=components-theme--integration-demo&viewMode=story')

      // Wait for components to load
      await page.waitForSelector('[data-testid="integration-demo"]', {timeout: 10000})

      // Set light theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })

      // Wait for theme change to apply
      await page.waitForTimeout(500)
    })

    test('Button and Form integration', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--button-form-integration&viewMode=story')
      const integration = page.locator('[data-testid="button-form-integration"]').first()
      await expect(integration).toHaveScreenshot('integration-button-form-light.png')
    })

    test('Complete page layout with all components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--complete-layout&viewMode=story')
      const layout = page.locator('[data-testid="complete-layout"]').first()
      await expect(layout).toHaveScreenshot('integration-complete-layout-light.png')
    })

    test('Navigation and content components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--navigation-content&viewMode=story')
      const navContent = page.locator('[data-testid="navigation-content"]').first()
      await expect(navContent).toHaveScreenshot('integration-navigation-content-light.png')
    })

    test('Card layouts with themed components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--card-layouts&viewMode=story')
      const cardLayouts = page.locator('[data-testid="card-layouts"]').first()
      await expect(cardLayouts).toHaveScreenshot('integration-card-layouts-light.png')
    })
  })

  // Test component integration in dark theme
  test.describe('Dark Theme Integration', () => {
    test.beforeEach(async ({page}) => {
      // Ensure dark theme is active across all tests
      await page.goto('/iframe.html?id=components-theme--integration-demo&viewMode=story')

      // Wait for components to load
      await page.waitForSelector('[data-testid="integration-demo"]', {timeout: 10000})

      // Set dark theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Dark theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })

      // Wait for theme change to apply
      await page.waitForTimeout(500)
    })

    test('Button and Form integration', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--button-form-integration&viewMode=story')
      const integration = page.locator('[data-testid="button-form-integration"]').first()
      await expect(integration).toHaveScreenshot('integration-button-form-dark.png')
    })

    test('Complete page layout with all components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--complete-layout&viewMode=story')
      const layout = page.locator('[data-testid="complete-layout"]').first()
      await expect(layout).toHaveScreenshot('integration-complete-layout-dark.png')
    })

    test('Navigation and content components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--navigation-content&viewMode=story')
      const navContent = page.locator('[data-testid="navigation-content"]').first()
      await expect(navContent).toHaveScreenshot('integration-navigation-content-dark.png')
    })

    test('Card layouts with themed components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--card-layouts&viewMode=story')
      const cardLayouts = page.locator('[data-testid="card-layouts"]').first()
      await expect(cardLayouts).toHaveScreenshot('integration-card-layouts-dark.png')
    })
  })

  // Test theme transitions across multiple components
  test.describe('Theme Transition Consistency', () => {
    test('Simultaneous theme change across all components', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--transition-demo&viewMode=story')

      // Wait for components to load
      await page.waitForSelector('[data-testid="transition-demo"]', {timeout: 10000})

      const demo = page.locator('[data-testid="transition-demo"]').first()

      // Start with light theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)
      await expect(demo).toHaveScreenshot('transition-light-state.png')

      // Switch to dark theme and verify consistency
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Dark theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)
      await expect(demo).toHaveScreenshot('transition-dark-state.png')

      // Switch back to light theme
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label="Switch to Light theme"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)
      await expect(demo).toHaveScreenshot('transition-light-return.png')
    })

    test('System theme preference handling', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--system-preference&viewMode=story')

      // Wait for components to load
      await page.waitForSelector('[data-testid="system-preference-demo"]', {timeout: 10000})

      // Set system theme preference
      await page.evaluate(() => {
        const themeButton = document.querySelector('[aria-label*="System"]') as HTMLElement
        if (themeButton) {
          themeButton.click()
        }
      })
      await page.waitForTimeout(300)

      const systemDemo = page.locator('[data-testid="system-preference-demo"]').first()
      await expect(systemDemo).toHaveScreenshot('theme-system-preference.png')
    })
  })

  // Test error states and edge cases
  test.describe('Edge Cases and Error States', () => {
    test('Components with missing theme fallbacks', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--fallback-demo&viewMode=story')

      const fallbackDemo = page.locator('[data-testid="fallback-demo"]').first()
      await expect(fallbackDemo).toHaveScreenshot('theme-fallback-handling.png')
    })

    test('High contrast mode compatibility', async ({page}) => {
      // Enable high contrast emulation
      await page.emulateMedia({colorScheme: 'dark', reducedMotion: 'reduce'})

      await page.goto('/iframe.html?id=components-theme--high-contrast&viewMode=story')

      const highContrast = page.locator('[data-testid="high-contrast-demo"]').first()
      await expect(highContrast).toHaveScreenshot('theme-high-contrast.png')
    })

    test('Reduced motion preference', async ({page}) => {
      // Enable reduced motion
      await page.emulateMedia({reducedMotion: 'reduce'})

      await page.goto('/iframe.html?id=components-theme--reduced-motion&viewMode=story')

      const reducedMotion = page.locator('[data-testid="reduced-motion-demo"]').first()
      await expect(reducedMotion).toHaveScreenshot('theme-reduced-motion.png')
    })
  })

  // Test theme customization scenarios
  test.describe('Custom Theme Scenarios', () => {
    test('Custom brand colors application', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--custom-brand&viewMode=story')

      const customBrand = page.locator('[data-testid="custom-brand-demo"]').first()
      await expect(customBrand).toHaveScreenshot('theme-custom-brand.png')
    })

    test('Extended color palette usage', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--extended-palette&viewMode=story')

      const extendedPalette = page.locator('[data-testid="extended-palette-demo"]').first()
      await expect(extendedPalette).toHaveScreenshot('theme-extended-palette.png')
    })

    test('Multi-theme showcase comparison', async ({page}) => {
      await page.goto('/iframe.html?id=components-theme--multi-theme-comparison&viewMode=story')

      // This story should show multiple themes side by side
      const comparison = page.locator('[data-testid="multi-theme-comparison"]').first()
      await expect(comparison).toHaveScreenshot('theme-multi-comparison.png')
    })
  })
})
