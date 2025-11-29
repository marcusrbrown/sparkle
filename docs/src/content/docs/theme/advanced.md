---
title: Advanced Customization
description: Advanced patterns for customizing and extending Sparkle's theme system, including enterprise-level theme management.
---

## Overview

This guide covers advanced customization patterns for Sparkle's theme system, including enterprise-level theme management, custom token transformers, theme validation strategies, and migration approaches.

## Related Pages

- [Theme Overview](./overview) - Introduction to Sparkle's theme system
- [Token Transformation](./token-transformation) - Basic transformation patterns
- [Theme Providers](./providers) - Provider setup and configuration
- [Complete Workflow](./workflow) - Standard implementation workflow
- [Troubleshooting](./troubleshooting) - Common issues and debugging

## Advanced Theme Architecture

### Multi-Brand Theme System

For applications supporting multiple brands or clients:

```typescript
// themes/brands/index.ts
import type {ThemeConfig} from '@sparkle/types'

import {baseTokens} from '@sparkle/theme'

interface BrandTheme {
  id: string
  name: string
  light: ThemeConfig
  dark: ThemeConfig
  metadata?: {
    logo?: string
    primaryColor: string
    description: string
  }
}

export const brandThemes: Record<string, BrandTheme> = {
  acme: {
    id: 'acme',
    name: 'Acme Corp',
    metadata: {
      logo: '/logos/acme.svg',
      primaryColor: '#0066cc',
      description: 'Professional blue theme for Acme Corp',
    },
    light: {
      ...baseTokens,
      colors: {
        ...baseTokens.colors,
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0066cc', // Acme brand blue
          600: '#0052a3',
          700: '#003d7a',
          800: '#002851',
          900: '#001328',
          950: '#000a14',
        },
      },
    },
    dark: {
      // Dark variant with adjusted colors
      ...baseTokens,
      colors: {
        ...baseTokens.colors,
        primary: {
          // Lighter variants for dark mode
          500: '#3399ff',
          600: '#66b3ff',
        },
        background: {
          primary: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },
      },
    },
  },
  startup: {
    id: 'startup',
    name: 'Startup Inc',
    metadata: {
      logo: '/logos/startup.svg',
      primaryColor: '#8b5cf6',
      description: 'Modern purple theme for Startup Inc',
    },
    light: {
      ...baseTokens,
      colors: {
        ...baseTokens.colors,
        primary: {
          500: '#8b5cf6', // Purple
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
    },
    dark: {
      ...baseTokens,
      colors: {
        ...baseTokens.colors,
        primary: {
          500: '#a78bfa',
          600: '#c4b5fd',
        },
      },
    },
  },
}
```

### Dynamic Brand Theme Provider

```tsx
// providers/BrandThemeProvider.tsx
import type {ThemeMode} from '@sparkle/theme'

import {NativeThemeProvider, ThemeProvider} from '@sparkle/theme'
import {createContext, useContext, useEffect, useState} from 'react'

import {brandThemes, type BrandTheme} from '../themes/brands'

interface BrandThemeContextValue {
  currentBrand: string
  setBrand: (brandId: string) => void
  availableBrands: string[]
  brandMetadata: BrandTheme['metadata']
}

const BrandThemeContext = createContext<BrandThemeContextValue | null>(null)

interface BrandThemeProviderProps {
  children: React.ReactNode
  defaultBrand?: string
  defaultTheme?: ThemeMode
  platform?: 'web' | 'native'
  onBrandChange?: (brandId: string) => void
}

export function BrandThemeProvider({
  children,
  defaultBrand = 'acme',
  defaultTheme = 'system',
  platform = 'web',
  onBrandChange,
}: BrandThemeProviderProps) {
  const [currentBrand, setCurrentBrand] = useState(defaultBrand)

  const brand = brandThemes[currentBrand]
  const availableBrands = Object.keys(brandThemes)

  const handleBrandChange = (brandId: string) => {
    if (brandThemes[brandId]) {
      setCurrentBrand(brandId)
      onBrandChange?.(brandId)

      // Persist brand preference
      localStorage.setItem('selected-brand', brandId)
    }
  }

  // Load persisted brand on mount
  useEffect(() => {
    const savedBrand = localStorage.getItem('selected-brand')
    if (savedBrand && brandThemes[savedBrand]) {
      setCurrentBrand(savedBrand)
    }
  }, [])

  const contextValue = {
    currentBrand,
    setBrand: handleBrandChange,
    availableBrands,
    brandMetadata: brand?.metadata,
  }

  const ThemeProviderComponent = platform === 'web' ? ThemeProvider : NativeThemeProvider

  return (
    <BrandThemeContext.Provider value={contextValue}>
      <ThemeProviderComponent
        themes={{
          light: brand.light,
          dark: brand.dark,
        }}
        defaultTheme={defaultTheme}
        storageKey={`theme-${currentBrand}`}
      >
        {children}
      </ThemeProviderComponent>
    </BrandThemeContext.Provider>
  )
}

export function useBrandTheme() {
  const context = useContext(BrandThemeContext)
  if (!context) {
    throw new Error('useBrandTheme must be used within BrandThemeProvider')
  }
  return context
}
```

## Custom Token Transformers

### Creating Custom Transformers

For specialized transformation needs:

```typescript
// utils/customTransformers.ts
import type {ThemeConfig} from '@sparkle/types'
import {TokenTransformer} from '@sparkle/theme'

export class EnterpriseTokenTransformer extends TokenTransformer {
  /**
   * Transform tokens with enterprise-specific modifications
   */
  transformForEnterprise(
    tokens: ThemeConfig,
    options: {
      addVendorPrefixes?: boolean
      includeAccessibilityTokens?: boolean
      generateUtilityClasses?: boolean
    } = {},
  ) {
    const baseResult = this.toWeb(tokens)
    let transformedTokens = {...baseResult}

    // Add vendor prefixes for better browser support
    if (options.addVendorPrefixes) {
      transformedTokens = this.addVendorPrefixes(transformedTokens)
    }

    // Generate accessibility-specific tokens
    if (options.includeAccessibilityTokens) {
      transformedTokens = {
        ...transformedTokens,
        ...this.generateAccessibilityTokens(tokens),
      }
    }

    // Generate utility class tokens
    if (options.generateUtilityClasses) {
      transformedTokens = {
        ...transformedTokens,
        ...this.generateUtilityTokens(tokens),
      }
    }

    return transformedTokens
  }

  private addVendorPrefixes(tokens: Record<string, string>): Record<string, string> {
    const prefixed: Record<string, string> = {}

    Object.entries(tokens).forEach(([key, value]) => {
      prefixed[key] = value

      // Add vendor prefixes for certain properties
      if (key.includes('transition') || key.includes('animation')) {
        prefixed[`${key}-webkit`] = value
        prefixed[`${key}-moz`] = value
      }

      if (key.includes('transform')) {
        prefixed[`${key}-webkit`] = value
        prefixed[`${key}-ms`] = value
      }
    })

    return prefixed
  }

  private generateAccessibilityTokens(tokens: ThemeConfig): Record<string, string> {
    return {
      // High contrast variants
      '--color-primary-high-contrast': tokens.colors.primary[900],
      '--color-secondary-high-contrast': tokens.colors.secondary[800],

      // Focus indicators
      '--focus-ring-width': '2px',
      '--focus-ring-offset': '2px',
      '--focus-ring-color': tokens.colors.primary[500],

      // Text scaling
      '--text-scale-factor': '1',
      '--line-height-accessible': '1.5',

      // Motion preferences
      '--animation-duration-reduced': '0ms',
      '--transition-duration-reduced': '0ms',
    }
  }

  private generateUtilityTokens(tokens: ThemeConfig): Record<string, string> {
    const utilities: Record<string, string> = {}

    // Generate spacing utilities
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      utilities[`--spacing-${key}-negative`] = `-${value}`
      utilities[`--spacing-${key}-half`] = `calc(${value} / 2)`
      utilities[`--spacing-${key}-double`] = `calc(${value} * 2)`
    })

    // Generate color utilities with opacity variants
    Object.entries(tokens.colors).forEach(([colorName, colorScale]) => {
      if (typeof colorScale === 'object') {
        Object.entries(colorScale).forEach(([shade, color]) => {
          utilities[`--color-${colorName}-${shade}-10`] = `rgb(from ${color} r g b / 0.1)`
          utilities[`--color-${colorName}-${shade}-20`] = `rgb(from ${color} r g b / 0.2)`
          utilities[`--color-${colorName}-${shade}-50`] = `rgb(from ${color} r g b / 0.5)`
          utilities[`--color-${colorName}-${shade}-80`] = `rgb(from ${color} r g b / 0.8)`
        })
      }
    })

    return utilities
  }
}

// Create instance for use
export const enterpriseTransformer = new EnterpriseTokenTransformer()
```

### Platform-Specific Transformers

```typescript
import type {ThemeConfig} from '@sparkle/types'
// utils/platformTransformers.ts
import {TokenTransformer} from '@sparkle/theme'

export class IOSTokenTransformer extends TokenTransformer {
  /**
   * Transform tokens with iOS-specific considerations
   */
  toiOS(tokens: ThemeConfig) {
    const baseTokens = this.toNative(tokens, {
      baseFontSize: 17, // iOS default
      flattenColors: true,
    })

    return {
      ...baseTokens,
      // iOS-specific adaptations
      shadows: this.adaptShadowsForiOS(tokens.shadows),
      haptics: this.generateHapticsTokens(),
      safeArea: this.generateSafeAreaTokens(),
    }
  }

  private adaptShadowsForiOS(shadows: ThemeConfig['shadows']) {
    const adapted: Record<string, any> = {}

    Object.entries(shadows).forEach(([key, shadow]) => {
      // Convert CSS shadows to iOS shadow properties
      const matches = shadow.match(/(\d+(?:\.\d+)?px)\s+(\d+(?:\.\d+)?px)\s+(\d+(?:\.\d+)?px)\s+(\d+(?:\.\d+)?px)?\s*(.+)?/)

      if (matches) {
        const [, offsetX, offsetY, blurRadius, spreadRadius, color] = matches

        adapted[key] = {
          shadowOffset: {
            width: Number.parseFloat(offsetX),
            height: Number.parseFloat(offsetY),
          },
          shadowRadius: Number.parseFloat(blurRadius),
          shadowColor: color?.trim() || '#000000',
          shadowOpacity: 0.25,
        }
      }
    })

    return adapted
  }

  private generateHapticsTokens() {
    return {
      selection: 'selection',
      impactLight: 'impactLight',
      impactMedium: 'impactMedium',
      impactHeavy: 'impactHeavy',
      notificationSuccess: 'notificationSuccess',
      notificationWarning: 'notificationWarning',
      notificationError: 'notificationError',
    }
  }

  private generateSafeAreaTokens() {
    return {
      top: 'env(safe-area-inset-top)',
      bottom: 'env(safe-area-inset-bottom)',
      left: 'env(safe-area-inset-left)',
      right: 'env(safe-area-inset-right)',
    }
  }
}

export class AndroidTokenTransformer extends TokenTransformer {
  /**
   * Transform tokens with Android-specific considerations
   */
  toAndroid(tokens: ThemeConfig) {
    const baseTokens = this.toNative(tokens, {
      baseFontSize: 14, // Android default
      flattenColors: true,
    })

    return {
      ...baseTokens,
      // Android-specific adaptations
      elevation: this.generateElevationTokens(),
      materialYou: this.generateMaterialYouTokens(tokens),
    }
  }

  private generateElevationTokens() {
    return {
      level0: 0,
      level1: 1,
      level2: 2,
      level3: 3,
      level4: 4,
      level5: 5,
    }
  }

  private generateMaterialYouTokens(tokens: ThemeConfig) {
    return {
      // Material You color roles
      primary: tokens.colors.primary[500],
      onPrimary: tokens.colors.text?.inverse || '#ffffff',
      primaryContainer: tokens.colors.primary[100],
      onPrimaryContainer: tokens.colors.primary[900],

      secondary: tokens.colors.secondary[500],
      onSecondary: tokens.colors.text?.inverse || '#ffffff',
      secondaryContainer: tokens.colors.secondary[100],
      onSecondaryContainer: tokens.colors.secondary[900],

      surface: tokens.colors.background?.primary || '#ffffff',
      onSurface: tokens.colors.text?.primary || '#000000',
      surfaceVariant: tokens.colors.background?.secondary || '#f5f5f5',
      onSurfaceVariant: tokens.colors.text?.secondary || '#666666',
    }
  }
}

// Create platform-specific instances
export const iosTransformer = new IOSTokenTransformer()
export const androidTransformer = new AndroidTokenTransformer()
```

## Advanced Theme Validation

### Custom Validation Rules

```typescript
// utils/themeValidation.ts
import type {ThemeConfig} from '@sparkle/types'
import {validateTheme, type ValidationResult} from '@sparkle/theme'

interface CustomValidationRule {
  name: string
  validate: (theme: ThemeConfig) => boolean
  message: string
  severity: 'error' | 'warning'
}

export class EnterpriseThemeValidator {
  private customRules: CustomValidationRule[] = []

  addRule(rule: CustomValidationRule) {
    this.customRules.push(rule)
  }

  validateWithEnterpriseRules(theme: ThemeConfig): ValidationResult & {
    warnings: string[]
    customErrors: string[]
  } {
    // Run standard validation first
    const baseValidation = validateTheme(theme)

    const warnings: string[] = []
    const customErrors: string[] = []

    // Run custom rules
    this.customRules.forEach(rule => {
      const isValid = rule.validate(theme)
      if (!isValid) {
        if (rule.severity === 'error') {
          customErrors.push(`${rule.name}: ${rule.message}`)
        } else {
          warnings.push(`${rule.name}: ${rule.message}`)
        }
      }
    })

    return {
      ...baseValidation,
      isValid: baseValidation.isValid && customErrors.length === 0,
      errors: [...baseValidation.errors, ...customErrors],
      warnings,
      customErrors,
    }
  }
}

// Create validator with enterprise rules
export const enterpriseValidator = new EnterpriseThemeValidator()

// Add accessibility rules
enterpriseValidator.addRule({
  name: 'WCAG_AA_CONTRAST',
  message: 'Theme must meet WCAG AA contrast requirements',
  severity: 'error',
  validate: (theme) => {
    // Check contrast ratios between text and background colors
    const textColor = theme.colors.text?.primary
    const backgroundColor = theme.colors.background?.primary

    if (!textColor || !backgroundColor) return false

    // Simplified contrast check (implement proper contrast calculation)
    return calculateContrastRatio(textColor, backgroundColor) >= 4.5
  },
})

// Add brand consistency rules
enterpriseValidator.addRule({
  name: 'BRAND_COLORS_PRESENT',
  message: 'Theme must include required brand colors',
  severity: 'error',
  validate: (theme) => {
    const requiredColors = ['primary', 'secondary']
    return requiredColors.every(color =>
      theme.colors[color] &&
      typeof theme.colors[color] === 'object' &&
      theme.colors[color][500]
    )
  },
})

// Add performance rules
enterpriseValidator.addRule({
  name: 'REASONABLE_TOKEN_COUNT',
  message: 'Theme should not exceed 500 tokens for performance',
  severity: 'warning',
  validate: (theme) => {
    const tokenCount = countThemeTokens(theme)
    return tokenCount <= 500
  },
})

function calculateContrastRatio(color1: string, color2: string): number {
  // Simplified implementation - use a proper contrast calculation library
  // like 'color2k' or 'polished' in production
  return 5 // Placeholder
}

function countThemeTokens(theme: ThemeConfig): number {
  let count = 0

  function countObject(obj: any): void {
    Object.values(obj).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        countObject(value)
      } else {
        count++
      }
    })
  }

  countObject(theme)
  return count
}
```

## Theme Migration Strategies

### Version Migration System

```typescript
// utils/themeMigration.ts
import type {ThemeConfig} from '@sparkle/types'

interface ThemeMigration {
  fromVersion: string
  toVersion: string
  migrate: (oldTheme: any) => ThemeConfig
  description: string
}

export class ThemeMigrationManager {
  private migrations: ThemeMigration[] = []

  addMigration(migration: ThemeMigration) {
    this.migrations.push(migration)
  }

  migrateTheme(oldTheme: any, currentVersion: string, targetVersion: string): ThemeConfig {
    const applicableMigrations = this.findMigrationPath(currentVersion, targetVersion)

    let migratedTheme = oldTheme

    for (const migration of applicableMigrations) {
      console.log(`Migrating theme from ${migration.fromVersion} to ${migration.toVersion}`)
      migratedTheme = migration.migrate(migratedTheme)
    }

    return migratedTheme
  }

  private findMigrationPath(fromVersion: string, toVersion: string): ThemeMigration[] {
    // Simple implementation - in production, use a graph algorithm
    return this.migrations.filter(migration =>
      this.isVersionBetween(migration.fromVersion, fromVersion, toVersion)
    )
  }

  private isVersionBetween(version: string, start: string, end: string): boolean {
    // Simplified version comparison - use semver library in production
    return version >= start && version <= end
  }
}

// Create migration manager
export const migrationManager = new ThemeMigrationManager()

// Add migrations
migrationManager.addMigration({
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  description: 'Migrate from v1 color structure to v2 semantic colors',
  migrate: (oldTheme) => ({
    ...oldTheme,
    colors: {
      ...oldTheme.colors,
      // Add semantic colors that didn't exist in v1
      text: {
        primary: oldTheme.colors.black || '#000000',
        secondary: oldTheme.colors.gray?.[600] || '#666666',
        tertiary: oldTheme.colors.gray?.[500] || '#888888',
        inverse: oldTheme.colors.white || '#ffffff',
      },
      background: {
        primary: oldTheme.colors.white || '#ffffff',
        secondary: oldTheme.colors.gray?.[50] || '#f9f9f9',
        tertiary: oldTheme.colors.gray?.[100] || '#f3f3f3',
      },
      // Convert old flat colors to scale format
      primary: oldTheme.colors.primary || {
        500: '#3b82f6',
      },
    },
  }),
})

migrationManager.addMigration({
  fromVersion: '2.0.0',
  toVersion: '3.0.0',
  description: 'Add animation tokens and update spacing scale',
  migrate: (oldTheme) => ({
    ...oldTheme,
    animation: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
      },
      transition: {
        all: 'all 300ms ease',
        colors: 'color 150ms ease, background-color 150ms ease',
        transform: 'transform 200ms ease',
      },
    },
    spacing: {
      ...oldTheme.spacing,
      // Add new spacing values
      '2xs': '0.125rem',
      '3xl': '3rem',
      '4xl': '4rem',
      '5xl': '5rem',
    },
  }),
})
```

## Enterprise Theme Management

### Theme Registry System

```typescript
// enterprise/themeRegistry.ts
import type {ThemeConfig} from '@sparkle/types'

interface ThemeRegistryEntry {
  id: string
  name: string
  version: string
  themes: {
    light: ThemeConfig
    dark: ThemeConfig
  }
  metadata: {
    description: string
    author: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export class EnterpriseThemeRegistry {
  private themes = new Map<string, ThemeRegistryEntry>()

  async registerTheme(entry: Omit<ThemeRegistryEntry, 'validation'>): Promise<boolean> {
    // Validate theme before registration
    const validation = await this.validateThemeEntry(entry)

    const fullEntry: ThemeRegistryEntry = {
      ...entry,
      validation,
    }

    if (validation.isValid) {
      this.themes.set(entry.id, fullEntry)
      await this.persistToStorage(fullEntry)
      return true
    }

    console.error(`Theme registration failed for ${entry.id}:`, validation.errors)
    return false
  }

  getTheme(id: string): ThemeRegistryEntry | undefined {
    return this.themes.get(id)
  }

  listThemes(filter?: {
    tags?: string[]
    author?: string
    validOnly?: boolean
  }): ThemeRegistryEntry[] {
    let themes = Array.from(this.themes.values())

    if (filter) {
      if (filter.tags) {
        themes = themes.filter(theme =>
          filter.tags?.some(tag => theme.metadata.tags.includes(tag))
        )
      }      if (filter.author) {
        themes = themes.filter(theme => theme.metadata.author === filter.author)
      }

      if (filter.validOnly) {
        themes = themes.filter(theme => theme.validation?.isValid)
      }
    }

    return themes
  }

  async updateTheme(id: string, updates: Partial<ThemeRegistryEntry>): Promise<boolean> {
    const existing = this.themes.get(id)
    if (!existing) return false

    const updated = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    }

    // Re-validate if themes changed
    if (updates.themes) {
      updated.validation = await this.validateThemeEntry(updated)

      if (!updated.validation.isValid) {
        console.error(`Theme update failed for ${id}:`, updated.validation.errors)
        return false
      }
    }

    this.themes.set(id, updated)
    await this.persistToStorage(updated)
    return true
  }

  deleteTheme(id: string): boolean {
    const success = this.themes.delete(id)
    if (success) {
      this.removeFromStorage(id)
    }
    return success
  }

  private async validateThemeEntry(entry: Omit<ThemeRegistryEntry, 'validation'>) {
    const {enterpriseValidator} = await import('../utils/themeValidation')

    const lightValidation = enterpriseValidator.validateWithEnterpriseRules(entry.themes.light)
    const darkValidation = enterpriseValidator.validateWithEnterpriseRules(entry.themes.dark)

    return {
      isValid: lightValidation.isValid && darkValidation.isValid,
      errors: [...lightValidation.errors, ...darkValidation.errors],
      warnings: [...lightValidation.warnings, ...darkValidation.warnings],
    }
  }

  private async persistToStorage(theme: ThemeRegistryEntry): Promise<void> {
    // Implement storage persistence (database, file system, etc.)
    localStorage.setItem(`theme-registry-${theme.id}`, JSON.stringify(theme))
  }

  private removeFromStorage(id: string): void {
    localStorage.removeItem(`theme-registry-${id}`)
  }

  async loadFromStorage(): Promise<void> {
    // Load themes from persistent storage
    const keys = Object.keys(localStorage).filter(key => key.startsWith('theme-registry-'))

    for (const key of keys) {
      try {
        const themeData = localStorage.getItem(key)
        if (themeData) {
          const theme = JSON.parse(themeData)
          this.themes.set(theme.id, theme)
        }
      } catch (error) {
        console.error(`Failed to load theme from storage: ${key}`, error)
      }
    }
  }
}

// Create global registry
export const themeRegistry = new EnterpriseThemeRegistry()
```

### Theme Builder Interface

```typescript
// enterprise/themeBuilder.ts
import type {ThemeConfig} from '@sparkle/types'
import {baseTokens} from '@sparkle/theme'

export interface ThemeBuilderConfig {
  baseTheme: ThemeConfig
  overrides: Partial<ThemeConfig>
  presets?: {
    colorPalette?: 'blue' | 'purple' | 'green' | 'custom'
    fontSystem?: 'system' | 'modern' | 'classic'
    spacing?: 'compact' | 'comfortable' | 'spacious'
  }
}

export class ThemeBuilder {
  private config: ThemeBuilderConfig

  constructor(config: Partial<ThemeBuilderConfig> = {}) {
    this.config = {
      baseTheme: baseTokens,
      overrides: {},
      presets: {},
      ...config,
    }
  }

  setColorPalette(palette: 'blue' | 'purple' | 'green' | 'custom', customColors?: any) {
    const palettes = {
      blue: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      purple: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      green: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      custom: customColors || {},
    }

    this.config.presets = this.config.presets || {}
    this.config.presets.colorPalette = palette
    this.config.overrides.colors = {
      ...this.config.overrides.colors,
      ...palettes[palette],
    }

    return this
  }

  setFontSystem(system: 'system' | 'modern' | 'classic') {
    const fontSystems = {
      system: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      modern: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      classic: {
        sans: ['Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
    }

    this.config.presets = this.config.presets || {}
    this.config.presets.fontSystem = system
    this.config.overrides.typography = {
      ...this.config.overrides.typography,
      fontFamily: fontSystems[system],
    }

    return this
  }

  setSpacingScale(scale: 'compact' | 'comfortable' | 'spacious') {
    const scales = {
      compact: {
        xs: '0.125rem',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      comfortable: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      spacious: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
    }

    this.config.presets = this.config.presets || {}
    this.config.presets.spacing = scale
    this.config.overrides.spacing = {
      ...this.config.overrides.spacing,
      ...scales[scale],
    }

    return this
  }

  addCustomOverride(path: string, value: any) {
    // Use lodash-style path notation to set nested values
    const pathArray = path.split('.')
    let current = this.config.overrides

    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i]
      if (!(key in current)) {
        current[key] = {}
      }
      current = current[key]
    }

    current[pathArray.at(-1)] = value
    return this
  }

  build(): ThemeConfig {
    return this.deepMerge(this.config.baseTheme, this.config.overrides)
  }

  buildBoth(): {light: ThemeConfig; dark: ThemeConfig} {
    const lightTheme = this.build()

    // Generate dark variant with automatic adaptations
    const darkTheme = this.generateDarkVariant(lightTheme)

    return {light: lightTheme, dark: darkTheme}
  }

  private generateDarkVariant(lightTheme: ThemeConfig): ThemeConfig {
    return {
      ...lightTheme,
      colors: {
        ...lightTheme.colors,
        // Invert semantic colors for dark mode
        background: {
          primary: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },
        text: {
          primary: '#ffffff',
          secondary: '#cccccc',
          tertiary: '#999999',
          inverse: '#000000',
        },
        // Lighten primary colors for better contrast on dark backgrounds
        primary: this.lightenColorScale(lightTheme.colors.primary),
        secondary: this.lightenColorScale(lightTheme.colors.secondary),
      },
    }
  }

  private lightenColorScale(colorScale: any) {
    if (!colorScale || typeof colorScale !== 'object') return colorScale

    const lightened = {...colorScale}

    // Simple lightening - in production, use a proper color manipulation library
    if (lightened[500]) lightened[500] = this.lightenColor(lightened[500], 0.2)
    if (lightened[600]) lightened[600] = this.lightenColor(lightened[600], 0.3)

    return lightened
  }

  private lightenColor(color: string, amount: number): string {
    // Simplified color lightening - use a proper color library in production
    return color // Placeholder
  }

  private deepMerge(target: any, source: any): any {
    const result = {...target}

    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    })

    return result
  }
}

// Usage examples
export function createEnterpriseTheme() {
  return new ThemeBuilder()
    .setColorPalette('blue')
    .setFontSystem('modern')
    .setSpacingScale('comfortable')
    .addCustomOverride('colors.brand.500', '#0066cc')
    .addCustomOverride('borderRadius.brand', '8px')
    .buildBoth()
}
```

This advanced customization documentation provides enterprise-level patterns for managing themes at scale, including multi-brand support, custom transformers, validation systems, migration strategies, and theme building tools.
