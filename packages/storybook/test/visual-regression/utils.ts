import type {Page} from '@playwright/test'

/**
 * Utility functions for visual regression testing
 *
 * These utilities provide common functionality for interacting with
 * themed components and managing theme state during visual tests.
 */

/**
 * Theme identifiers used throughout the application
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

export type ThemeMode = (typeof THEMES)[keyof typeof THEMES]

/**
 * Common test selectors for themed components
 */
export const SELECTORS = {
  // Theme controls
  THEME_SWITCHER: '[data-testid="theme-switcher"]',
  LIGHT_THEME_BUTTON: '[aria-label="Switch to Light theme"]',
  DARK_THEME_BUTTON: '[aria-label="Switch to Dark theme"]',
  SYSTEM_THEME_BUTTON: '[aria-label*="System"]',

  // Component test IDs
  THEMED_BUTTON: '[data-testid="themed-button"]',
  THEMED_FORM: '[data-testid="themed-form"]',
  THEME_SHOWCASE: '[data-testid="theme-showcase"]',
  INTEGRATION_DEMO: '[data-testid="integration-demo"]',

  // Component sections
  COLOR_PALETTE: '[data-testid="color-palette"]',
  TYPOGRAPHY_SHOWCASE: '[data-testid="typography-showcase"]',
  SPACING_SHOWCASE: '[data-testid="spacing-showcase"]',
  SHADOW_SHOWCASE: '[data-testid="shadow-showcase"]',
  BORDER_SHOWCASE: '[data-testid="border-showcase"]',
  SEMANTIC_COLORS: '[data-testid="semantic-colors"]',
} as const

/**
 * Standard wait times for theme transitions and component loading
 */
export const WAIT_TIMES = {
  COMPONENT_LOAD: 10000, // 10 seconds for component to load
  THEME_TRANSITION: 500, // 500ms for theme change to apply
  INTERACTION_DELAY: 300, // 300ms for user interactions
  ANIMATION_COMPLETE: 1000, // 1 second for animations to complete
} as const

/**
 * Standard viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  MOBILE: {width: 375, height: 667},
  TABLET: {width: 768, height: 1024},
  DESKTOP: {width: 1280, height: 720},
  DESKTOP_LARGE: {width: 1920, height: 1080},
} as const

/**
 * Sets the active theme for visual testing
 * @param page - Playwright page instance
 * @param theme - Theme mode to activate
 * @param waitForTransition - Whether to wait for theme transition
 */
export async function setTheme(page: Page, theme: ThemeMode, waitForTransition = true): Promise<void> {
  let selector: string

  switch (theme) {
    case THEMES.LIGHT:
      selector = SELECTORS.LIGHT_THEME_BUTTON
      break
    case THEMES.DARK:
      selector = SELECTORS.DARK_THEME_BUTTON
      break
    case THEMES.SYSTEM:
      selector = SELECTORS.SYSTEM_THEME_BUTTON
      break
    default:
      throw new Error(`Unknown theme: ${theme}`)
  }

  // Click the theme button using JavaScript to ensure it works
  await page.evaluate(buttonSelector => {
    const button = document.querySelector(buttonSelector) as HTMLElement
    if (button) {
      button.click()
    } else {
      throw new Error(`Theme button not found: ${buttonSelector}`)
    }
  }, selector)

  if (waitForTransition) {
    await page.waitForTimeout(WAIT_TIMES.THEME_TRANSITION)
  }
}

/**
 * Waits for a themed component to load completely
 * @param page - Playwright page instance
 * @param selector - Component selector to wait for
 * @param timeout - Custom timeout (optional)
 */
export async function waitForComponent(
  page: Page,
  selector: string,
  timeout = WAIT_TIMES.COMPONENT_LOAD,
): Promise<void> {
  await page.waitForSelector(selector, {timeout})

  // Wait a bit more for any dynamic content or theme application
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)
}

/**
 * Navigates to a Storybook story and waits for it to load
 * @param page - Playwright page instance
 * @param storyId - Storybook story ID (e.g., 'components-button--primary')
 * @param componentSelector - Primary component selector to wait for
 */
export async function navigateToStory(page: Page, storyId: string, componentSelector: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await waitForComponent(page, componentSelector)
}

/**
 * Fills form inputs for testing form states
 * @param page - Playwright page instance
 * @param formData - Object containing input values
 */
export async function fillFormInputs(page: Page, formData: Record<string, string>): Promise<void> {
  for (const [selector, value] of Object.entries(formData)) {
    await page.fill(selector, value)
  }

  // Wait for form validation or state changes
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)
}

/**
 * Sets the viewport size for responsive testing
 * @param page - Playwright page instance
 * @param viewport - Viewport configuration object
 * @param viewport.width - Viewport width in pixels
 * @param viewport.height - Viewport height in pixels
 */
export async function setViewport(page: Page, viewport: {width: number; height: number}): Promise<void> {
  await page.setViewportSize(viewport)

  // Wait for responsive layout changes
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)
}

/**
 * Captures a component screenshot with consistent naming
 * @param page - Playwright page instance
 * @param componentName - Component name for screenshot filename
 * @param variant - Component variant (e.g., 'primary', 'secondary')
 * @param theme - Current theme mode
 * @param suffix - Additional suffix for filename (optional)
 */
export async function captureComponentScreenshot(
  page: Page,
  componentName: string,
  variant: string,
  theme: ThemeMode,
  suffix?: string,
): Promise<void> {
  const filename = `${[componentName, variant, theme, suffix].filter(Boolean).join('-')}.png`

  // Get the main component element for focused screenshots
  const component = page.locator(SELECTORS.THEMED_BUTTON).first() // Default fallback
  await component.waitFor()

  await component.screenshot({path: `test-results/screenshots/${filename}`})
}

/**
 * Tests theme transition smoothness by switching themes rapidly
 * @param page - Playwright page instance
 * @param componentSelector - Component to monitor during transitions
 */
export async function testThemeTransitions(page: Page, componentSelector: string): Promise<void> {
  await waitForComponent(page, componentSelector)

  // Start with light theme
  await setTheme(page, THEMES.LIGHT)
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)

  // Switch to dark theme
  await setTheme(page, THEMES.DARK)
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)

  // Switch back to light theme
  await setTheme(page, THEMES.LIGHT)
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)

  // Test system theme
  await setTheme(page, THEMES.SYSTEM)
  await page.waitForTimeout(WAIT_TIMES.INTERACTION_DELAY)
}

/**
 * Gets the current active theme from the page
 * @param page - Playwright page instance
 * @returns Promise resolving to the current theme mode
 */
export async function getCurrentTheme(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Try to get theme from various possible sources
    const themeIndicator = document.querySelector('[data-testid="current-theme"]')
    if (themeIndicator) {
      return themeIndicator.textContent || 'unknown'
    }

    // Fallback: check for theme classes on document
    const {documentElement} = document
    if (documentElement.classList.contains('dark')) {
      return 'dark'
    } else if (documentElement.classList.contains('light')) {
      return 'light'
    }

    // Fallback: check CSS custom properties
    const computedStyle = getComputedStyle(documentElement)
    const bgColor = computedStyle.getPropertyValue('--theme-background')

    if ((bgColor && bgColor.includes('0')) || bgColor.includes('black')) {
      return 'dark'
    }

    return 'light' // Default fallback
  })
}

/**
 * Validates that a theme has been applied correctly
 * @param page - Playwright page instance
 * @param expectedTheme - Expected theme mode
 */
export async function validateThemeApplication(page: Page, expectedTheme: ThemeMode): Promise<boolean> {
  const currentTheme = await getCurrentTheme(page)
  return currentTheme === expectedTheme
}

/**
 * Test data for consistent form filling across tests
 */
export const TEST_FORM_DATA = {
  SAMPLE_TEXT: {
    'input[type="text"]': 'Sample text input',
    'input[type="email"]': 'test@example.com',
    textarea: 'This is a sample textarea content for testing theme integration.',
  },
  VALIDATION_ERRORS: {
    'input[type="email"]': 'invalid-email',
    'input[type="url"]': 'not-a-url',
  },
} as const
