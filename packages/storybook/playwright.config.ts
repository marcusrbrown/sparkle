import process from 'node:process'

import {defineConfig, devices} from '@playwright/test'

/**
 * Playwright configuration for visual regression testing of Storybook components
 *
 * This configuration sets up visual testing for themed components across different
 * browsers and themes, ensuring consistent visual appearance.
 */
export default defineConfig({
  testDir: './test/visual-regression',

  // Run tests in files matching this pattern
  testMatch: '**/*.visual.test.ts',

  // Fully parallel execution
  fullyParallel: true,

  // Fail the build on CI if tests were created without added to git
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', {outputFolder: 'test-results/visual-regression-report'}],
    ['json', {outputFile: 'test-results/visual-regression-results.json'}],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL for the Storybook instance
    baseURL: 'http://localhost:6006',

    // Take screenshots on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',
  },

  // Visual comparison settings - global for all tests
  expect: {
    // Screenshot comparison settings
    toHaveScreenshot: {
      threshold: 0.2, // 20% difference threshold
    },
    toMatchSnapshot: {
      threshold: 0.3, // 30% threshold for snapshot comparison
    },
  },

  // Test projects for different browsers and themes
  projects: [
    {
      name: 'Desktop Chrome - Light Theme',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        viewport: {width: 1280, height: 720},
      },
    },
    {
      name: 'Desktop Chrome - Dark Theme',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        viewport: {width: 1280, height: 720},
      },
    },
    {
      name: 'Desktop Firefox - Light Theme',
      use: {
        ...devices['Desktop Firefox'],
        colorScheme: 'light',
        viewport: {width: 1280, height: 720},
      },
    },
    {
      name: 'Desktop Firefox - Dark Theme',
      use: {
        ...devices['Desktop Firefox'],
        colorScheme: 'dark',
        viewport: {width: 1280, height: 720},
      },
    },
    {
      name: 'Mobile Safari - Light Theme',
      use: {
        ...devices['iPhone 13'],
        colorScheme: 'light',
      },
    },
    {
      name: 'Mobile Safari - Dark Theme',
      use: {
        ...devices['iPhone 13'],
        colorScheme: 'dark',
      },
    },
  ],

  // Web server configuration for Storybook
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  // Output directories
  outputDir: 'test-results/playwright-output',
})
