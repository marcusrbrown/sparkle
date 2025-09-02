import type {CSSProperties} from 'react'

/**
 * Color scale definition for theme colors
 * Supports both named colors and numeric scales (50, 100, 200, etc.)
 */
export interface ColorScale {
  [key: string]: Record<string | number, string>
}

/**
 * Typography scale with font families, sizes, weights, and line heights
 */
export interface TypographyScale {
  fontFamily: Record<string, string>
  fontSize: Record<string, string>
  fontWeight: Record<string, string | number>
  lineHeight: Record<string, string | number>
  letterSpacing: Record<string, string>
}

/**
 * Spacing scale for consistent spacing values
 */
export interface SpacingScale {
  [key: string | number]: string
}

/**
 * Shadow scale for box shadows and elevation
 */
export interface ShadowScale {
  [key: string]: string
}

/**
 * Border radius scale for consistent corner radius values
 */
export interface BorderRadiusScale {
  [key: string]: string
}

/**
 * Animation scale for durations, easing curves, and transitions
 */
export interface AnimationScale {
  duration: Record<string, string>
  easing: Record<string, string>
  transition: Record<string, string>
}

/**
 * Comprehensive theme configuration with design token system
 * Compatible with both Tailwind CSS (web) and React Native StyleSheet (mobile)
 */
export interface ThemeConfig {
  /**
   * Color system with semantic and brand colors
   * Supports nested scales (e.g., primary: { 50: '#...', 500: '#...' })
   */
  colors: ColorScale
  /**
   * Typography system with fonts, sizes, weights, and spacing
   */
  typography: TypographyScale
  /**
   * Spacing scale for margins, padding, gaps, and layout
   */
  spacing: SpacingScale
  /**
   * Shadow system for elevation and depth
   */
  shadows: ShadowScale
  /**
   * Border radius system for consistent corner treatments
   */
  borderRadius: BorderRadiusScale
  /**
   * Animation system for durations, easing, and transitions
   */
  animation: AnimationScale
}

/**
 * Common component prop types
 */
export interface BaseProps {
  className?: string
  style?: CSSProperties
  id?: string
  'data-testid'?: string
}

/**
 * Common form field props
 */
export interface FieldProps extends BaseProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  description?: string
}

/**
 * Extended form field props for advanced form components
 */
export interface FormFieldProps extends FieldProps {
  /**
   * Field name for form submission and validation
   */
  name: string
  /**
   * Validation state of the field
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Size variant for the field
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Field type for input elements
   */
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select'
}

/**
 * Form validation message props
 */
export interface FormMessageProps extends BaseProps {
  /**
   * Custom validation function
   */
  match?: (value: string, formData: FormData) => boolean | Promise<boolean>
  /**
   * Built-in validation type
   */
  validationType?:
    | 'valueMissing'
    | 'typeMismatch'
    | 'patternMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'rangeUnderflow'
    | 'rangeOverflow'
    | 'stepMismatch'
    | 'badInput'
}

/**
 * Common API response types
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

/**
 * Common user types
 */
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}
