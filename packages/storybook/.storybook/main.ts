import type {StorybookConfig} from '@storybook/react-vite'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {mergeConfig} from 'vite'

const require = createRequire(import.meta.url)

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-docs'),
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

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')))
}
