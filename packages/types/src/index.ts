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
  style?: React.CSSProperties
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
