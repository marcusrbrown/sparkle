import type {CSSProperties} from 'react'

/**
 * Common theme configuration types
 */
export interface ThemeConfig {
  colors: Record<string, Record<string | number, string>>
  spacing: Record<string | number, string>
  borderRadius: Record<string, string>
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
