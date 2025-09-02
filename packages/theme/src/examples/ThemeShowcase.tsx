import type {ThemeConfig} from '@sparkle/types'
import React from 'react'
import {useTheme} from '../hooks'

export interface ThemeShowcaseProps {
  /**
   * Whether to show the color palette demonstration
   * @default true
   */
  showColorPalette?: boolean
  /**
   * Whether to show component demonstrations
   * @default true
   */
  showComponents?: boolean
  /**
   * Whether to show semantic color demonstrations
   * @default true
   */
  showSemanticColors?: boolean
  /**
   * Additional CSS classes for the showcase container
   */
  className?: string
}

/**
 * ColorPaletteDemo component showing all available theme colors
 */
function ColorPaletteDemo({colors}: {colors: ThemeConfig['colors']}) {
  const colorCategories = [
    {name: 'Primary', colors: colors.primary},
    {name: 'Secondary', colors: colors.secondary},
    {name: 'Neutral', colors: colors.neutral},
  ].filter(({colors}) => colors) // Filter out undefined color scales

  return (
    <div className="space-y-6">
      <h3 className="text-theme-text-primary text-lg font-semibold">Color Palette</h3>
      <div className="space-y-4">
        {colorCategories.map(({name, colors: colorScale}) => {
          if (!colorScale) return null

          return (
            <div key={name}>
              <h4 className="text-theme-text-secondary text-sm font-medium mb-2">{name}</h4>
              <div className="flex gap-1 rounded-lg overflow-hidden">
                {Object.entries(colorScale).map(([shade, value]) => (
                  <div
                    key={shade}
                    className="flex-1 h-16 flex items-end justify-center relative group"
                    style={{backgroundColor: value}}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="text-xs font-mono mb-1 text-white bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {shade}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * SemanticColorsDemo component showing semantic color meanings
 */
function SemanticColorsDemo({colors}: {colors: ThemeConfig['colors']}) {
  const semanticColors = [
    {
      name: 'Success',
      description: 'Used for positive actions and confirmations',
      colors: colors.success,
      textColor: 'text-theme-success-600',
      bgColor: 'bg-theme-success-50',
      borderColor: 'border-theme-success-200',
    },
    {
      name: 'Warning',
      description: 'Used for caution and important notices',
      colors: colors.warning,
      textColor: 'text-theme-warning-600',
      bgColor: 'bg-theme-warning-50',
      borderColor: 'border-theme-warning-200',
    },
    {
      name: 'Error',
      description: 'Used for errors and destructive actions',
      colors: colors.error,
      textColor: 'text-theme-error-600',
      bgColor: 'bg-theme-error-50',
      borderColor: 'border-theme-error-200',
    },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-theme-text-primary text-lg font-semibold">Semantic Colors</h3>
      <div className="grid gap-4">
        {semanticColors.map(({name, description, colors: colorScale, textColor, bgColor, borderColor}) => {
          if (!colorScale) return null

          return (
            <div key={name} className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className={`font-semibold ${textColor}`}>{name}</h4>
                  <p className="text-theme-text-secondary text-sm">{description}</p>
                </div>
                <div className="flex gap-1">
                  {[50, 500, 600].map(shade => {
                    const color = colorScale[shade as keyof typeof colorScale]
                    if (!color) return null

                    return (
                      <div
                        key={shade}
                        className="w-8 h-8 rounded border-2 border-white shadow-sm"
                        style={{backgroundColor: color}}
                        title={`${name} ${shade}`}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                >
                  {name} Badge
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ComponentsDemo component showing themed UI components
 */
function ComponentsDemo() {
  return (
    <div className="space-y-6">
      <h3 className="text-theme-text-primary text-lg font-semibold">Component Examples</h3>

      {/* Button Examples */}
      <div className="space-y-3">
        <h4 className="text-theme-text-secondary text-sm font-medium">Buttons</h4>
        <div className="flex flex-wrap gap-3">
          {/* Primary buttons */}
          <div className="space-y-2">
            <p className="text-xs text-theme-text-secondary">Primary Variants</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-theme-primary-500 text-white rounded-md hover:bg-theme-primary-600 transition-colors">
                Primary
              </button>
              <button className="px-4 py-2 bg-theme-success-500 text-white rounded-md hover:bg-theme-success-600 transition-colors">
                Success
              </button>
              <button className="px-4 py-2 bg-theme-warning-500 text-white rounded-md hover:bg-theme-warning-600 transition-colors">
                Warning
              </button>
              <button className="px-4 py-2 bg-theme-error-500 text-white rounded-md hover:bg-theme-error-600 transition-colors">
                Error
              </button>
            </div>
          </div>

          {/* Outline buttons */}
          <div className="space-y-2">
            <p className="text-xs text-theme-text-secondary">Outline Variants</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-theme-primary-500 text-theme-primary-600 rounded-md hover:bg-theme-primary-50 transition-colors">
                Primary
              </button>
              <button className="px-4 py-2 border border-theme-success-500 text-theme-success-600 rounded-md hover:bg-theme-success-50 transition-colors">
                Success
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Examples */}
      <div className="space-y-3">
        <h4 className="text-theme-text-secondary text-sm font-medium">Surfaces & Cards</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-theme-surface-primary border border-theme-border rounded-lg">
            <h5 className="font-medium text-theme-text-primary mb-2">Primary Surface</h5>
            <p className="text-theme-text-secondary text-sm">
              This is a primary surface with theme-aware background and text colors.
            </p>
          </div>
          <div className="p-4 bg-theme-surface-secondary border border-theme-border rounded-lg">
            <h5 className="font-medium text-theme-text-primary mb-2">Secondary Surface</h5>
            <p className="text-theme-text-secondary text-sm">
              This is a secondary surface showing hierarchy through background variation.
            </p>
          </div>
        </div>
      </div>

      {/* Form Elements */}
      <div className="space-y-3">
        <h4 className="text-theme-text-secondary text-sm font-medium">Form Elements</h4>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-1">Input Field</label>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-theme-border rounded-md bg-theme-surface-primary text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-1">Select Dropdown</label>
            <select className="w-full px-3 py-2 border border-theme-border rounded-md bg-theme-surface-primary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ThemeShowcase component demonstrating all theme features
 *
 * This component provides a comprehensive demonstration of the theme system
 * including color palettes, semantic colors, and themed UI components.
 */
export function ThemeShowcase({
  showColorPalette = true,
  showComponents = true,
  showSemanticColors = true,
  className,
}: ThemeShowcaseProps) {
  const {theme, activeTheme, systemTheme} = useTheme()

  const displayTheme = activeTheme === 'system' ? systemTheme : activeTheme

  return (
    <div className={`space-y-8 p-6 ${className || ''}`}>
      {/* Header */}
      <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-theme-text-primary text-2xl font-semibold">Theme Showcase</h2>
          <div className="flex items-center gap-4">
            <span className="text-theme-text-secondary text-sm">
              Active Theme: <span className="font-medium text-theme-text-primary capitalize">{displayTheme}</span>
            </span>
            {activeTheme === 'system' && (
              <span className="text-xs bg-theme-secondary-100 text-theme-secondary-700 px-2 py-1 rounded">
                Following System
              </span>
            )}
          </div>
        </div>
        <p className="text-theme-text-secondary">
          Explore the comprehensive theme system with design tokens, semantic colors, and component examples. Switch
          between light and dark themes to see the system in action.
        </p>
      </div>

      {/* Color Palette Section */}
      {showColorPalette && (
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <ColorPaletteDemo colors={theme.colors} />
        </div>
      )}

      {/* Semantic Colors Section */}
      {showSemanticColors && (
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <SemanticColorsDemo colors={theme.colors} />
        </div>
      )}

      {/* Components Section */}
      {showComponents && (
        <div className="bg-theme-surface-primary border border-theme-border rounded-lg p-6">
          <ComponentsDemo />
        </div>
      )}

      {/* Theme Token Information */}
      <div className="bg-theme-surface-secondary border border-theme-border rounded-lg p-6">
        <h3 className="text-theme-text-primary text-lg font-semibold mb-4">Theme Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Typography</h4>
            <p className="text-theme-text-secondary">Font families, sizes, and spacing</p>
          </div>
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Colors</h4>
            <p className="text-theme-text-secondary">Semantic and brand color scales</p>
          </div>
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Spacing</h4>
            <p className="text-theme-text-secondary">Consistent spacing system</p>
          </div>
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Shadows</h4>
            <p className="text-theme-text-secondary">Elevation and depth tokens</p>
          </div>
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Borders</h4>
            <p className="text-theme-text-secondary">Border radius and width scales</p>
          </div>
          <div>
            <h4 className="font-medium text-theme-text-primary mb-1">Animation</h4>
            <p className="text-theme-text-secondary">Timing and easing functions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
