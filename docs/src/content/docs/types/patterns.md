---
title: Type Patterns
description: Common TypeScript patterns and best practices for Sparkle Design System development.
---

## Component Type Patterns

### Basic Component Props

Standard pattern for component prop interfaces that extend HTML elements:

```tsx
import type { HTMLAttributes } from 'react'

interface ButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Polymorphic Components

Components that can render as different HTML elements:

```tsx
interface PolymorphicProps<T extends React.ElementType = React.ElementType> {
  as?: T
  children?: React.ReactNode
}

type PolymorphicComponentProps<
  T extends React.ElementType,
  Props
> = PolymorphicProps<T> &
  Props &
  Omit<React.ComponentProps<T>, keyof PolymorphicProps<T> | keyof Props>

interface TextProps {
  variant?: 'body' | 'caption' | 'heading'
  weight?: 'normal' | 'medium' | 'bold'
}

function Text<T extends React.ElementType = 'span'>({
  as,
  variant = 'body',
  weight = 'normal',
  className,
  children,
  ...props
}: PolymorphicComponentProps<T, TextProps>) {
  const Component = as || 'span'

  return (
    <Component
      className={`text text-${variant} text-${weight} ${className || ''}`}
      {...props}
    >
      {children}
    </Component>
  )
}

// Usage examples:
// <Text>Default span</Text>
// <Text as="h1" variant="heading">Heading</Text>
// <Text as="p" variant="body">Paragraph</Text>
```

### Discriminated Unions

Use discriminated unions for components with mutually exclusive props:

```tsx
interface BaseAlertProps {
  title: string
  onClose?: () => void
}

interface SuccessAlert extends BaseAlertProps {
  type: 'success'
  message: string
}

interface ErrorAlert extends BaseAlertProps {
  type: 'error'
  error: Error
  onRetry?: () => void
}

interface LoadingAlert extends BaseAlertProps {
  type: 'loading'
  progress?: number
}

type AlertProps = SuccessAlert | ErrorAlert | LoadingAlert

function Alert(props: AlertProps) {
  switch (props.type) {
    case 'success':
      return (
        <div className="alert alert-success">
          <h3>{props.title}</h3>
          <p>{props.message}</p>
        </div>
      )
    case 'error':
      return (
        <div className="alert alert-error">
          <h3>{props.title}</h3>
          <p>{props.error.message}</p>
          {props.onRetry && (
            <button onClick={props.onRetry}>Retry</button>
          )}
        </div>
      )
    case 'loading':
      return (
        <div className="alert alert-loading">
          <h3>{props.title}</h3>
          {props.progress && (
            <progress value={props.progress} max={100} />
          )}
        </div>
      )
  }
}
```

## Form Type Patterns

### Form Field Types

Consistent typing for form fields with validation:

```typescript
interface BaseFieldProps<T = string> {
  name: string
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  value?: T
  defaultValue?: T
  error?: string | string[]
  'data-testid'?: string
}

interface TextInputProps extends BaseFieldProps<string> {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  placeholder?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  autoComplete?: string
  onChange?: (value: string) => void
}

interface SelectProps<T extends string = string> extends BaseFieldProps<T> {
  options: {
    value: T
    label: string
    disabled?: boolean
  }[]
  placeholder?: string
  multiple?: boolean
  onChange?: (value: T | T[]) => void
}

interface NumberInputProps extends BaseFieldProps<number> {
  min?: number
  max?: number
  step?: number
  placeholder?: string
  onChange?: (value: number | undefined) => void
}
```

### Form Validation Types

Type-safe validation patterns:

```typescript
interface ValidationRule<T> {
  required?: boolean | string
  min?: number | string
  max?: number | string
  pattern?: RegExp | string
  custom?: (value: T) => string | undefined
}

type FormErrors<T extends Record<string, any>> = {
  [K in keyof T]?: string | string[]
}

type FormData<T extends Record<string, any>> = {
  [K in keyof T]: T[K]
}

interface FormState<T extends Record<string, any>> {
  values: FormData<T>
  errors: FormErrors<T>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Usage example:
interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

const loginValidation: Record<keyof LoginForm, ValidationRule<any>> = {
  email: {
    required: 'Email is required',
    pattern: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
    custom: (value) => value.includes('@') ? undefined : 'Invalid email format'
  },
  password: {
    required: 'Password is required',
    min: 8
  },
  rememberMe: {}
}
```

## Theme Type Patterns

### Token Path Types

Create type-safe token path references:

```typescript
// Generate paths for nested token objects
type TokenPath<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? `${K}.${TokenPath<T[K]>}`
    : K
  : never

// Example usage with theme tokens
interface ThemeTokens {
  colors: {
    primary: { 50: string; 500: string; 900: string }
    secondary: { 50: string; 500: string; 900: string }
  }
  spacing: {
    xs: string
    sm: string
    md: string
  }
}

type ColorPath = TokenPath<ThemeTokens['colors']> // 'primary.50' | 'primary.500' | etc.
type SpacingPath = TokenPath<ThemeTokens['spacing']> // 'xs' | 'sm' | 'md'

// Type-safe token getter
function getToken<T extends TokenPath<ThemeTokens>>(
  path: T,
  tokens: ThemeTokens
): string {
  const keys = path.split('.')
  let value: any = tokens
  for (const key of keys) {
    value = value[key]
  }
  return value
}

// Usage: getToken('colors.primary.500', tokens) // Type-safe!
```

### Responsive Type Patterns

Handle responsive design with type safety:

```typescript
type Breakpoint = 'mobile' | 'tablet' | 'desktop'

type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

interface ResponsiveSpacing {
  margin?: ResponsiveValue<string>
  padding?: ResponsiveValue<string>
}

interface ResponsiveProps {
  spacing?: ResponsiveSpacing
  display?: ResponsiveValue<'block' | 'flex' | 'grid' | 'none'>
  width?: ResponsiveValue<string>
}

function resolveResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint
): T {
  if (typeof value === 'object' && value !== null) {
    return value[breakpoint] ?? value.mobile ?? Object.values(value)[0]
  }
  return value
}
```

## API Type Patterns

### Generic API Response Types

Standardized API response patterns:

```typescript
interface ApiSuccess<T> {
  success: true
  data: T
  meta?: {
    timestamp: string
    requestId: string
    [key: string]: any
  }
}

interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
    field?: string // For validation errors
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

type ApiResponse<T> = ApiSuccess<T> | ApiError

// Type guards for response handling
function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true
}

function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false
}

// Usage
async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

const userResponse = await fetchUser('123')
if (isApiSuccess(userResponse)) {
  console.log('User:', userResponse.data) // TypeScript knows this is User
} else {
  console.error('Error:', userResponse.error.message)
}
```

### Pagination Type Patterns

Consistent pagination interfaces:

```typescript
interface PaginationRequest {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}

interface PaginationResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

type PaginatedApiResponse<T> = ApiResponse<PaginationResponse<T>>

// Generic paginated fetch function
async function fetchPaginated<T>(
  endpoint: string,
  params: PaginationRequest = {}
): Promise<PaginatedApiResponse<T>> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value))
    }
  })

  const response = await fetch(`${endpoint}?${searchParams}`)
  return response.json()
}
```

## Error Type Patterns

### Structured Error Types

Create specific error types for different scenarios:

```typescript
abstract class SparkleError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string, readonly context?: Record<string, any>) {
    super(message)
    this.name = this.constructor.name
  }
}

class ValidationError extends SparkleError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    message: string,
    readonly field: string,
    readonly value: any,
    context?: Record<string, any>
  ) {
    super(message, { ...context, field, value })
  }
}

class NotFoundError extends SparkleError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(resource: string, id: string, context?: Record<string, any>) {
    super(`${resource} with id "${id}" not found`, { ...context, resource, id })
  }
}

class NetworkError extends SparkleError {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode = 0

  constructor(
    message: string,
    readonly originalError: Error,
    context?: Record<string, any>
  ) {
    super(message, { ...context, originalError: originalError.message })
  }
}

// Error result type for functions that can fail
type Result<T, E = SparkleError> =
  | { success: true; data: T }
  | { success: false; error: E }

// Usage
function parseUserInput(input: string): Result<User, ValidationError> {
  try {
    const user = JSON.parse(input)
    if (!user.email) {
      return {
        success: false,
        error: new ValidationError('Email is required', 'email', user.email)
      }
    }
    return { success: true, data: user }
  } catch {
    return {
      success: false,
      error: new ValidationError('Invalid JSON format', 'input', input)
    }
  }
}
```

## Utility Type Patterns

### Common Utility Types

Frequently used utility type patterns:

```typescript
// Make specific properties required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Make specific properties optional
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Flatten nested object types
type Flatten<T> = T extends object ? T[keyof T] : T

// Get function return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

// Extract array element type
type ArrayElement<T> = T extends (infer U)[] ? U : never

// Deep partial for nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Usage examples:
interface User {
  id: string
  email: string
  name?: string
  profile?: {
    age: number
    location: string
  }
}

type UserWithRequiredName = RequireFields<User, 'name'>
type UserUpdate = OptionalFields<User, 'id' | 'email'>
type DeepPartialUser = DeepPartial<User> // All properties including nested ones are optional
```
