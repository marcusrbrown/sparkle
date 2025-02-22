import type {StorybookConfig} from '@storybook/react-vite'
import {mergeConfig} from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  core: {
    builder: '@storybook/builder-vite',
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
