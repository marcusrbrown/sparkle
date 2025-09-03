import type {StorybookConfig} from '@storybook/react-vite'
import {dirname, join} from 'node:path'
import {mergeConfig} from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
  ],

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  core: {
    builder: getAbsolutePath('@storybook/builder-vite'),
    disableTelemetry: true,
  },

  viteFinal: async config => {
    return mergeConfig(config, {
      optimizeDeps: {
        include: ['storybook-dark-mode'],
      },
      build: {
        sourcemap: true,
      },
    })
  },
}

export default config

/**
 * Get absolute path to addon package directory
 * @param value - Package name (e.g., '@storybook/addon-links')
 * @returns Absolute path to the package directory
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')))
}
