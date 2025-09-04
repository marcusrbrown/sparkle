import type {Meta, StoryObj} from '@storybook/react-vite'
import {ThemeProvider, ThemeShowcase, useTheme} from '@sparkle/theme'
import {Button} from '@sparkle/ui'
import React from 'react'

/**
 * Theme System Documentation and Examples
 *
 * The `@sparkle/theme` package provides a comprehensive design token system with cross-platform
 * compatibility for web (Tailwind CSS) and mobile (React Native StyleSheet) environments.
 *
 * ## Features
 * - **Design Tokens**: Comprehensive system of colors, typography, spacing, shadows, and animations
 * - **Theme Modes**: Support for light, dark, and system preference-based theming
 * - **Semantic Colors**: Success, warning, error, and informational color variants
 * - **Cross-Platform**: Compatible with both web and React Native applications
 * - **CSS Custom Properties**: Seamless integration with Tailwind CSS using CSS variables
 * - **React Context**: Theme state management with provider pattern and hooks
 *
 * ## Design Token Categories
 * - **Colors**: Primary, secondary, neutral, and semantic color scales (50-950)
 * - **Typography**: Font families, sizes, weights, line heights, and letter spacing
 * - **Spacing**: Consistent spacing scale for margins, padding, and gaps
 * - **Shadows**: Elevation system with multiple shadow levels
 * - **Borders**: Border radius and width tokens for consistent styling
 * - **Animation**: Duration, timing functions, and easing for smooth transitions
 *
 * ## Basic Usage
 * ```tsx
 * import { ThemeProvider, useTheme } from '@sparkle/theme'
 *
 * function App() {
 *   return (
 *     <ThemeProvider defaultTheme="system">
 *       <YourApplication />
 *     </ThemeProvider>
 *   )
 * }
 *
 * function ThemedComponent() {
 *   const { theme, activeTheme, setTheme } = useTheme()
 *
 *   return (
 *     <div className="bg-theme-surface-primary text-theme-text-primary">
 *       <button
 *         onClick={() => setTheme(activeTheme === 'light' ? 'dark' : 'light')}
 *         className="bg-theme-primary-500 text-white p-2 rounded"
 *       >
 *         Toggle Theme
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * ## Theme-Aware Component Styling
 * ```tsx
 * // Using CSS custom properties with Tailwind
 * function ProductCard({ product }) {
 *   return (
 *     <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-4">
 *       <h3 className="text-theme-text-primary font-semibold">{product.name}</h3>
 *       <p className="text-theme-text-secondary">{product.description}</p>
 *       <Button variant="primary" semantic="success">
 *         Add to Cart
 *       </Button>
 *     </div>
 *   )
 * }
 * ```
 *
 * ## Semantic Color Usage
 * ```tsx
 * // Status indicators with semantic colors
 * function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
 *   return (
 *     <span className={`
 *       inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
 *       bg-theme-${status}-100 text-theme-${status}-800 border border-theme-${status}-200
 *     `}>
 *       {status.charAt(0).toUpperCase() + status.slice(1)}
 *     </span>
 *   )
 * }
 * ```
 */
const meta = {
  title: 'Theme System/Documentation',
  component: ThemeShowcase,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive documentation and examples of the Sparkle theme system featuring design tokens, theme switching, and component integration.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeShowcase>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Advanced theme switcher with visual feedback and system theme detection
 */
function AdvancedThemeSwitcher() {
  const {activeTheme, setTheme, systemTheme} = useTheme()

  const themes = [
    {
      value: 'light',
      label: 'Light',
      icon: '☀️',
      description: 'Bright theme optimized for daylight usage',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '🌙',
      description: 'Dark theme optimized for low-light environments',
    },
    {
      value: 'system',
      label: 'System',
      icon: '⚙️',
      description: `Follows system preference (currently ${systemTheme})`,
    },
  ] as const

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="bg-theme-surface-primary border border-theme-border rounded-xl shadow-lg p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-theme-primary-500 rounded-full animate-pulse" />
          <h3 className="text-theme-text-primary font-semibold text-sm">Theme Settings</h3>
        </div>

        <div className="space-y-2">
          {themes.map(theme => {
            const isActive = activeTheme === theme.value
            return (
              <button
                key={theme.value}
                onClick={() => setTheme(theme.value)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all duration-200
                  ${
                    isActive
                      ? 'bg-theme-primary-500 text-white shadow-md'
                      : 'bg-theme-surface-secondary text-theme-text-primary hover:bg-theme-surface-hover'
                  }
                `}
                aria-label={`Switch to ${theme.label} theme`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{theme.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{theme.label}</div>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-theme-text-secondary'}`}>
                      {theme.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-theme-border">
          <div className="text-xs text-theme-text-secondary">
            Current: <span className="font-medium text-theme-text-primary capitalize">{activeTheme}</span>
            {activeTheme === 'system' && <span className="ml-1 text-theme-secondary-600">({systemTheme})</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Theme-aware wrapper component providing context and layout
 */
function ThemeWrapper({
  children,
  showAdvancedSwitcher = false,
}: {
  children: React.ReactNode
  showAdvancedSwitcher?: boolean
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-theme-surface-primary text-theme-text-primary transition-colors duration-300">
        {showAdvancedSwitcher && <AdvancedThemeSwitcher />}
        <div className="container mx-auto">{children}</div>
      </div>
    </ThemeProvider>
  )
}

/**
 * Complete theme system showcase featuring all design tokens, semantic colors,
 * and component integration examples. Perfect for understanding the full
 * capabilities of the @sparkle/theme system.
 */
export const CompleteShowcase: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <ThemeShowcase showColorPalette={true} showSemanticColors={true} showComponents={true} />
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Comprehensive demonstration of the theme system including color palettes, semantic colors, and component examples. Use the theme switcher to see real-time theme changes.',
      },
    },
  },
}

/**
 * Color-focused demonstration showing the complete color token system
 * including primary, secondary, neutral, and semantic color scales.
 */
export const ColorSystemShowcase: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <ThemeShowcase showColorPalette={true} showSemanticColors={true} showComponents={false} />
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Focused view of the color system showcasing primary, secondary, neutral, and semantic color scales. Each color includes hover interactions showing shade values.',
      },
    },
  },
}

/**
 * Component integration examples showing how UI components leverage
 * the theme system for consistent styling across different themes.
 */
export const ComponentIntegration: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <ThemeShowcase showColorPalette={false} showSemanticColors={false} showComponents={true} />
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates how UI components integrate with the theme system, showing buttons, forms, and surfaces with consistent theming.',
      },
    },
  },
}

/**
 * Design token reference showing the structure and organization
 * of the theme system including color, typography, spacing, and other tokens.
 */
export const DesignTokens: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <div className="space-y-8 p-6">
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-4">Design Token Reference</h2>
          <p className="text-theme-text-secondary mb-6">
            Explore the comprehensive design token system that powers the Sparkle UI component library.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Color Tokens */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-theme-text-primary">Color Tokens</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-primary-*
                  </code>
                  <p className="text-theme-text-secondary">Primary brand colors (50-950)</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-success-*
                  </code>
                  <p className="text-theme-text-secondary">Success state colors</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-warning-*
                  </code>
                  <p className="text-theme-text-secondary">Warning state colors</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-error-*
                  </code>
                  <p className="text-theme-text-secondary">Error state colors</p>
                </div>
              </div>
            </div>

            {/* Surface Tokens */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-theme-text-primary">Surface Tokens</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-surface-primary
                  </code>
                  <p className="text-theme-text-secondary">Main application background</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-surface-secondary
                  </code>
                  <p className="text-theme-text-secondary">Secondary surface areas</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-border
                  </code>
                  <p className="text-theme-text-secondary">Border and divider colors</p>
                </div>
              </div>
            </div>

            {/* Text Tokens */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-theme-text-primary">Text Tokens</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-text-primary
                  </code>
                  <p className="text-theme-text-secondary">Primary text color</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-text-secondary
                  </code>
                  <p className="text-theme-text-secondary">Secondary text color</p>
                </div>
                <div>
                  <code className="bg-theme-surface-secondary px-2 py-1 rounded text-theme-text-primary">
                    --theme-text-muted
                  </code>
                  <p className="text-theme-text-secondary">Muted text for subtle content</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-theme-surface-secondary rounded-lg">
            <h4 className="font-semibold text-theme-text-primary mb-2">Usage Example</h4>
            <pre className="text-sm text-theme-text-secondary overflow-x-auto">
              <code>{`/* CSS Custom Properties */
.button-primary {
  background: var(--theme-primary-500);
  color: var(--theme-primary-contrast);
  border: 1px solid var(--theme-primary-600);
}

/* Tailwind CSS Classes */
<button className="bg-theme-primary-500 text-theme-primary-contrast border-theme-primary-600">
  Primary Button
</button>`}</code>
            </pre>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Reference documentation for design tokens including color, surface, and text tokens with usage examples and CSS custom property names.',
      },
    },
  },
}

/**
 * Real-world usage examples showing practical application of the theme system
 * in common UI patterns like forms, cards, and navigation elements.
 */
export const RealWorldExamples: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <div className="space-y-8 p-6">
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-6">Real-World Usage Examples</h2>

          {/* Dashboard Card Example */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Dashboard Card Pattern</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-theme-surface-secondary border border-theme-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-theme-text-primary">Total Sales</h4>
                    <div className="w-8 h-8 bg-theme-success-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">↗</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-theme-text-primary mb-1">$24,500</div>
                  <div className="text-sm text-theme-success-600">+12% from last month</div>
                </div>

                <div className="bg-theme-surface-secondary border border-theme-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-theme-text-primary">Active Users</h4>
                    <div className="w-8 h-8 bg-theme-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">👥</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-theme-text-primary mb-1">1,234</div>
                  <div className="text-sm text-theme-text-secondary">Online now</div>
                </div>

                <div className="bg-theme-surface-secondary border border-theme-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-theme-text-primary">Conversion Rate</h4>
                    <div className="w-8 h-8 bg-theme-warning-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-theme-text-primary mb-1">3.4%</div>
                  <div className="text-sm text-theme-warning-600">-2% from last month</div>
                </div>
              </div>
            </div>

            {/* Form Example */}
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Contact Form Pattern</h3>
              <div className="max-w-md">
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-text-primary mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2 bg-theme-surface-primary border border-theme-border rounded-md text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text-primary mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 bg-theme-surface-primary border border-theme-border rounded-md text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text-primary mb-1">Message</label>
                    <textarea
                      placeholder="Type your message here..."
                      rows={4}
                      className="w-full px-3 py-2 bg-theme-surface-primary border border-theme-border rounded-md text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="primary" className="flex-1">
                      Send Message
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Reset Form
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Status Messages */}
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Status Message Patterns</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-theme-success-50 border border-theme-success-200 rounded-lg">
                  <div className="w-5 h-5 bg-theme-success-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-medium text-theme-success-800">Success!</div>
                    <div className="text-sm text-theme-success-700">Your changes have been saved successfully.</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-theme-warning-50 border border-theme-warning-200 rounded-lg">
                  <div className="w-5 h-5 bg-theme-warning-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <div>
                    <div className="font-medium text-theme-warning-800">Warning</div>
                    <div className="text-sm text-theme-warning-700">Please review your input before proceeding.</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-theme-error-50 border border-theme-error-200 rounded-lg">
                  <div className="w-5 h-5 bg-theme-error-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✕</span>
                  </div>
                  <div>
                    <div className="font-medium text-theme-error-800">Error</div>
                    <div className="text-sm text-theme-error-700">Something went wrong. Please try again.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Real-world examples showing how to implement common UI patterns using the theme system, including dashboard cards, forms, and status messages.',
      },
    },
  },
}

/**
 * Accessibility and contrast demonstration showing how the theme system
 * maintains WCAG compliance across different themes.
 */
export const AccessibilityShowcase: Story = {
  render: () => (
    <ThemeWrapper showAdvancedSwitcher={true}>
      <div className="space-y-8 p-6">
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-4">Accessibility & Contrast</h2>
          <p className="text-theme-text-secondary mb-6">
            The theme system is designed to maintain WCAG 2.1 AA compliance across all themes with proper contrast
            ratios and accessible color combinations.
          </p>

          <div className="space-y-6">
            {/* Contrast Examples */}
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Text Contrast Examples</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-theme-text-primary">Light Backgrounds</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-theme-surface-primary border border-theme-border rounded">
                      <div className="text-theme-text-primary font-semibold">Primary Text</div>
                      <div className="text-theme-text-secondary">Secondary Text</div>
                      <div className="text-theme-text-muted">Muted Text</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-theme-text-primary">Colored Backgrounds</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-theme-primary-500 rounded">
                      <div className="text-white font-semibold">Primary Background</div>
                      <div className="text-white/80">With white text</div>
                    </div>
                    <div className="p-3 bg-theme-success-500 rounded">
                      <div className="text-white font-semibold">Success Background</div>
                      <div className="text-white/80">WCAG AA compliant</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Focus States */}
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Focus State Accessibility</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-theme-primary-500 text-white rounded focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:ring-offset-2 focus:ring-offset-theme-surface-primary">
                    Primary Button
                  </button>
                  <button className="px-4 py-2 border border-theme-border text-theme-text-primary rounded focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:ring-offset-2 focus:ring-offset-theme-surface-primary">
                    Outline Button
                  </button>
                </div>
                <p className="text-sm text-theme-text-secondary">
                  Try tabbing through the buttons above to see focus indicators
                </p>
              </div>
            </div>

            {/* Error States */}
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Error State Accessibility</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-theme-text-primary mb-1">
                    Email Address <span className="text-theme-error-600">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-theme-surface-primary border-2 border-theme-error-500 rounded-md text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-error-500 focus:border-transparent"
                    aria-invalid="true"
                    aria-describedby="email-error"
                  />
                  <div id="email-error" className="mt-1 text-sm text-theme-error-600" role="alert">
                    Please enter a valid email address
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates accessibility features of the theme system including proper contrast ratios, focus states, and error handling with WCAG 2.1 AA compliance.',
      },
    },
  },
}
