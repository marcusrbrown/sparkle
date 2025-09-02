import type {Meta, StoryObj} from '@storybook/react-vite'

import {ThemeProvider, useTheme} from '@sparkle/theme'
import {Button} from '@sparkle/ui'
import React from 'react'

/**
 * Button component with theme-aware styling, semantic color variants, and comprehensive accessibility.
 *
 * ## Features
 * - **Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes
 * - **Semantic Colors**: Support for success, warning, and error variants for contextual actions
 * - **Accessibility**: Full WCAG 2.1 AA compliance with proper focus states and keyboard navigation
 * - **Size Variants**: Small (sm), medium (md), and large (lg) sizes
 * - **Style Variants**: Primary, secondary, outline, and ghost appearances
 * - **Cross-Platform**: Compatible with both web and React Native environments
 *
 * ## Design Tokens
 * Uses CSS custom properties from the theme system:
 * - `--theme-primary-*` for primary button variants
 * - `--theme-success-*` for success semantic variants
 * - `--theme-warning-*` for warning semantic variants
 * - `--theme-error-*` for error semantic variants
 *
 * ## Basic Usage
 * ```tsx
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 * ```
 *
 * ## Theme Integration
 * ```tsx
 * <ThemeProvider>
 *   <Button variant="primary" semantic="success">
 *     Success Action
 *   </Button>
 * </ThemeProvider>
 * ```
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Versatile button component with comprehensive theme integration and semantic variants.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Theme switcher component for demonstrating theme-aware button behavior
 */
function ThemeSwitcher() {
  const {activeTheme, setTheme, systemTheme} = useTheme()

  const themes = [
    {value: 'light', label: 'Light', icon: '☀️'},
    {value: 'dark', label: 'Dark', icon: '🌙'},
    {value: 'system', label: `System (${systemTheme})`, icon: '⚙️'},
  ] as const

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex gap-2 p-2 bg-theme-surface-primary border border-theme-border rounded-lg shadow-lg">
        <span className="text-theme-text-secondary text-sm font-medium">Theme:</span>
        {themes.map(theme => (
          <button
            key={theme.value}
            onClick={() => setTheme(theme.value)}
            className={`
              px-3 py-1 text-xs rounded transition-colors
              ${
                activeTheme === theme.value
                  ? 'bg-theme-primary-500 text-white'
                  : 'bg-theme-surface-secondary text-theme-text-primary hover:bg-theme-surface-hover'
              }
            `}
            aria-label={`Switch to ${theme.label} theme`}
          >
            {theme.icon} {theme.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Theme-aware wrapper component for stories
 */
function ThemeWrapper({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-theme-surface-primary text-theme-text-primary transition-colors">
        <ThemeSwitcher />
        <div className="flex items-center justify-center min-h-screen p-8">{children}</div>
      </div>
    </ThemeProvider>
  )
}

/**
 * Default button showcasing the primary variant with medium size.
 * Demonstrates the most common button configuration.
 */
export const Default: Story = {
  render: () => (
    <ThemeWrapper>
      <Button variant="primary" size="md">
        Click me
      </Button>
    </ThemeWrapper>
  ),
}

/**
 * Comprehensive showcase of all button variants in different sizes.
 * Perfect for testing theme integration across all button styles.
 */
export const AllVariants: Story = {
  render: () => (
    <ThemeWrapper>
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-6">Button Variants</h2>
          <p className="text-theme-text-secondary mb-8">
            All button variants demonstrating theme integration. Switch themes using the controls above.
          </p>
        </div>

        {/* Default Variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-theme-text-primary">Default Semantic</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-theme-text-secondary text-center">Primary</p>
              <div className="space-y-2">
                <Button variant="primary" size="sm">
                  Small
                </Button>
                <Button variant="primary" size="md">
                  Medium
                </Button>
                <Button variant="primary" size="lg">
                  Large
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-theme-text-secondary text-center">Secondary</p>
              <div className="space-y-2">
                <Button variant="secondary" size="sm">
                  Small
                </Button>
                <Button variant="secondary" size="md">
                  Medium
                </Button>
                <Button variant="secondary" size="lg">
                  Large
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-theme-text-secondary text-center">Outline</p>
              <div className="space-y-2">
                <Button variant="outline" size="sm">
                  Small
                </Button>
                <Button variant="outline" size="md">
                  Medium
                </Button>
                <Button variant="outline" size="lg">
                  Large
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-theme-text-secondary text-center">Ghost</p>
              <div className="space-y-2">
                <Button variant="ghost" size="sm">
                  Small
                </Button>
                <Button variant="ghost" size="md">
                  Medium
                </Button>
                <Button variant="ghost" size="lg">
                  Large
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-theme-text-primary">Semantic Colors</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-theme-success-600 text-center">Success</p>
              <div className="space-y-2">
                <Button variant="primary" semantic="success" size="md">
                  Save Changes
                </Button>
                <Button variant="outline" semantic="success" size="md">
                  Confirm
                </Button>
                <Button variant="ghost" semantic="success" size="md">
                  Continue
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-theme-warning-600 text-center">Warning</p>
              <div className="space-y-2">
                <Button variant="primary" semantic="warning" size="md">
                  Proceed Anyway
                </Button>
                <Button variant="outline" semantic="warning" size="md">
                  Review
                </Button>
                <Button variant="ghost" semantic="warning" size="md">
                  Skip
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-theme-error-600 text-center">Error</p>
              <div className="space-y-2">
                <Button variant="primary" semantic="error" size="md">
                  Delete
                </Button>
                <Button variant="outline" semantic="error" size="md">
                  Cancel
                </Button>
                <Button variant="ghost" semantic="error" size="md">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* States */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-theme-text-primary">States</h3>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" size="md">
              Normal
            </Button>
            <Button variant="primary" size="md" {...({disabled: true} as any)}>
              Disabled
            </Button>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Complete showcase of all button variants, sizes, and semantic colors. Use the theme switcher to see how buttons adapt to different themes.',
      },
    },
  },
}

/**
 * Interactive playground for testing button configurations with live theme switching.
 * Perfect for exploring different combinations of props and themes.
 */
export const Interactive: Story = {
  render: () => (
    <ThemeWrapper>
      <div className="space-y-6 text-center">
        <div>
          <h3 className="text-lg font-semibold text-theme-text-primary mb-2">Interactive Button</h3>
          <p className="text-theme-text-secondary">
            Use the theme switcher to see live updates across different color schemes
          </p>
        </div>
        <Button variant="primary" size="md">
          Interactive Button
        </Button>
        <div className="text-sm text-theme-text-secondary max-w-md">
          <strong>Try:</strong> Switch between light and dark themes to see how the button automatically adapts
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use the theme switcher to test different color schemes and see live theme transitions.',
      },
    },
  },
}

/**
 * Demonstrates common usage patterns with real-world button combinations.
 * Shows how buttons work together in typical UI scenarios.
 */
export const UsagePatterns: Story = {
  render: () => (
    <ThemeWrapper>
      <div className="space-y-8 max-w-4xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-4">Common Usage Patterns</h2>
          <p className="text-theme-text-secondary">Real-world examples of button combinations and usage patterns</p>
        </div>

        {/* Dialog Actions */}
        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Dialog Actions</h3>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="md">
              Cancel
            </Button>
            <Button variant="primary" size="md">
              Confirm
            </Button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Form Actions</h3>
          <div className="flex justify-between">
            <Button variant="outline" size="md">
              Reset Form
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" size="md">
                Save Draft
              </Button>
              <Button variant="primary" semantic="success" size="md">
                Submit
              </Button>
            </div>
          </div>
        </div>

        {/* Destructive Actions */}
        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Destructive Actions</h3>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="md">
              Keep Data
            </Button>
            <Button variant="primary" semantic="error" size="md">
              Delete Forever
            </Button>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Toolbar Actions</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              Edit
            </Button>
            <Button variant="ghost" size="sm">
              Share
            </Button>
            <Button variant="ghost" size="sm">
              Copy
            </Button>
            <div className="mx-2 border-l border-theme-border" />
            <Button variant="ghost" semantic="error" size="sm">
              Delete
            </Button>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Common button patterns used in real applications. Switch themes to see how these patterns adapt to different color schemes.',
      },
    },
    layout: 'padded',
  },
}

/**
 * Accessibility demonstration showing proper focus states and keyboard navigation.
 * Essential for testing screen reader compatibility and keyboard accessibility.
 */
export const Accessibility: Story = {
  render: () => (
    <ThemeWrapper>
      <div className="space-y-8 max-w-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-4">Accessibility Features</h2>
          <p className="text-theme-text-secondary">Focus states, keyboard navigation, and screen reader support</p>
        </div>

        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Focus States</h3>
          <p className="text-sm text-theme-text-secondary mb-4">
            Tab through these buttons to see focus indicators. Focus rings use theme colors for consistency.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="md">
              Focus Me
            </Button>
            <Button variant="secondary" size="md">
              Then Me
            </Button>
            <Button variant="outline" size="md">
              And Me
            </Button>
            <Button variant="ghost" size="md">
              Finally Me
            </Button>
          </div>
        </div>

        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Semantic Buttons</h3>
          <p className="text-sm text-theme-text-secondary mb-4">
            Semantic colors provide additional context for screen readers and users.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" semantic="success" size="md" aria-label="Approve request">
              ✓ Approve
            </Button>
            <Button variant="primary" semantic="warning" size="md" aria-label="Review before proceeding">
              ⚠ Review
            </Button>
            <Button variant="primary" semantic="error" size="md" aria-label="Reject request">
              ✗ Reject
            </Button>
          </div>
        </div>

        <div className="p-6 bg-theme-surface-secondary rounded-lg border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Disabled State</h3>
          <p className="text-sm text-theme-text-secondary mb-4">
            Disabled buttons are properly excluded from tab order and announced to screen readers.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="md" {...({disabled: true} as any)} aria-label="Action not available">
              Disabled Primary
            </Button>
            <Button variant="outline" size="md" {...({disabled: true} as any)} aria-label="Feature coming soon">
              Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates accessibility features including focus states, ARIA labels, and keyboard navigation. Test with screen readers and keyboard-only navigation.',
      },
    },
    layout: 'padded',
  },
}
