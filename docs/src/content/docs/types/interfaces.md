---
title: TypeScript Interfaces
description: Complete reference of TypeScript interfaces and types provided by the Sparkle Design System.
---

## Core Theme Types

### ThemeConfig

The main configuration interface for Sparkle themes, providing a comprehensive type-safe structure for design tokens.

```typescript
interface ThemeConfig {
  colors: ColorScale
  typography: TypographyScale
  spacing: SpacingScale
  shadows: ShadowScale
  borderRadius: BorderRadiusScale
  animation: AnimationScale
}
```

**Usage:**

```typescript
import type { ThemeConfig } from '@sparkle/types'

const myTheme: ThemeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      950: '#172554'
    }
  },
  typography: {
    fontFamily: { sans: 'Inter, sans-serif' },
    fontSize: { base: '1rem' },
    fontWeight: { medium: 500 },
    lineHeight: { normal: 1.5 },
    letterSpacing: { normal: '0' }
  },
  // ... other theme properties
}
```

---

### ColorScale

Defines the structure for color token systems with support for both named colors and numeric scales.

```typescript
interface ColorScale {
  [key: string]: Record<string | number, string>
}
```

**Examples:**

```typescript
// Numeric scale (recommended)
const colors: ColorScale = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    900: '#1e3a8a'
  }
}

// Named scale
const colors: ColorScale = {
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444'
  }
}
```

---

### TypographyScale

Comprehensive typography system with all text-related design tokens.

```typescript
interface TypographyScale {
  fontFamily: Record<string, string>
  fontSize: Record<string, string>
  fontWeight: Record<string, string | number>
  lineHeight: Record<string, string | number>
  letterSpacing: Record<string, string>
}
```

**Usage:**

```typescript
const typography: TypographyScale = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'Menlo, Monaco, monospace'
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  },
  letterSpacing: {
    tighter: '-0.05em',
    normal: '0',
    wider: '0.05em'
  }
}
```

## Component Props Types

### BaseProps

Foundation interface for all Sparkle components, providing common HTML attributes.

```typescript
interface BaseProps {
  className?: string
  style?: CSSProperties
  id?: string
  'data-testid'?: string
}
```

**Usage in Components:**

```tsx
interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

function Button({ className, style, id, children, ...props }: ButtonProps) {
  return (
    <button
      className={className}
      style={style}
      id={id}
      {...props}
    >
      {children}
    </button>
  )
}
```

---

### FieldProps

Base interface for form field components with common form-related properties.

```typescript
interface FieldProps extends BaseProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  description?: string
}
```

**Form Field Example:**

```typescript
interface InputProps extends FieldProps {
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}
```

---

### FormFieldProps

Extended form field interface for advanced form components with validation support.

```typescript
interface FormFieldProps extends FieldProps {
  name: string
  validationState?: 'default' | 'error' | 'success'
  size?: 'sm' | 'md' | 'lg'
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select'
}
```

**Advanced Form Example:**

```tsx
function FormInput({ name, validationState, size = 'md', ...props }: FormFieldProps) {
  return (
    <div className={`form-field form-field--${size} form-field--${validationState}`}>
      <input name={name} {...props} />
    </div>
  )
}
```

## Validation Types

### FormMessageProps

Interface for form validation messages with built-in and custom validation support.

```typescript
interface FormMessageProps extends BaseProps {
  match?: (value: string, formData: FormData) => boolean | Promise<boolean>
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
```

**Validation Examples:**

```tsx
<>
// Built-in validation
<FormMessage validationType="valueMissing">
  This field is required
</FormMessage>

// Custom validation
<FormMessage
  match={(value) => value.includes('@')}
>
  Email must contain @ symbol
</FormMessage>

// Async validation
<FormMessage
  match={async (value) => {
    const response = await checkEmailAvailability(value)
    return response.available
  }}
>
  Email address is already taken
</FormMessage>
</>
```

## API and Data Types

### ApiResponse

Generic interface for API responses with consistent error handling and metadata.

```typescript
interface ApiResponse<T = unknown> {
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
```

**API Usage Examples:**

```typescript
// User data response
const userResponse: ApiResponse<User> = await fetchUser(id)
if (userResponse.error) {
  console.error('Failed to fetch user:', userResponse.error.message)
} else {
  console.log('User data:', userResponse.data)
}

// Paginated list response
const usersResponse: ApiResponse<User[]> = await fetchUsers({ page: 1, limit: 10 })
if (usersResponse.data) {
  console.log(`Found ${usersResponse.meta?.total} total users`)
  console.log('Users:', usersResponse.data)
}
```

---

### User

Standard user interface for authentication and user management.

```typescript
interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}
```

**User Examples:**

```tsx
// Creating a new user
const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
  email: 'user@example.com',
  name: 'John Doe',
  role: 'user'
}

// User profile component
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className={`role role--${user.role}`}>{user.role}</span>
    </div>
  )
}
```

---

### PaginationParams

Parameters for paginated API requests with sorting support.

```typescript
interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

**Pagination Example:**

```typescript
async function fetchUsers(params: PaginationParams = {}) {
  const {
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = params

  const response = await fetch(`/api/users?page=${page}&limit=${limit}&sort=${sort}&order=${order}`)
  return response.json() as Promise<ApiResponse<User[]>>
}

// Usage
const users = await fetchUsers({ page: 2, limit: 50, sort: 'name', order: 'asc' })
```

## Utility Types

### Type Helpers

Sparkle provides several utility types for common TypeScript patterns:

```typescript
// Extract component props from a component type
type ButtonProps = React.ComponentProps<typeof Button>

// Make specific properties required
type RequiredUser = Required<Pick<User, 'id' | 'email'>> & Partial<User>

// Create variant types from arrays
const buttonVariants = ['primary', 'secondary', 'outline'] as const
type ButtonVariant = typeof buttonVariants[number] // 'primary' | 'secondary' | 'outline'

// Theme token paths
type ColorPath = `colors.${string}.${number}` // e.g., 'colors.primary.500'
type SpacingPath = `spacing.${string}` // e.g., 'spacing.md'
```

### Generic Component Types

Common patterns for building type-safe components:

```tsx
// Polymorphic component props
interface PolymorphicProps<T extends React.ElementType> {
  as?: T
  children?: React.ReactNode
}

type ComponentProps<T extends React.ElementType> = PolymorphicProps<T> &
  Omit<React.ComponentProps<T>, keyof PolymorphicProps<T>>

// Usage
function Button<T extends React.ElementType = 'button'>({
  as,
  children,
  ...props
}: ComponentProps<T>) {
  const Component = as || 'button'
  return <Component {...props}>{children}</Component>
}

// Can be used as button or link
<>
<Button onClick={handleClick}>Button</Button>
<Button as="a" href="/link">Link</Button>
</>
```

## Best Practices

### Type Safety

1. **Use strict TypeScript configuration** with `strict: true`
2. **Prefer interfaces over types** for object definitions
3. **Use generic types** for reusable components
4. **Export all public types** for consumer usage

### Component Props

1. **Extend BaseProps** for common HTML attributes
2. **Use discriminated unions** for variant props
3. **Make required props explicit** in the interface
4. **Provide default values** in the implementation

### API Types

1. **Use generic ApiResponse** for consistent error handling
2. **Define specific error types** for different failure modes
3. **Include metadata** for pagination and additional info
4. **Version API types** when making breaking changes

### Performance

1. **Use `React.ComponentProps`** to inherit existing types
2. **Prefer `Pick` and `Omit`** over manual property selection
3. **Use conditional types** sparingly to avoid complexity
4. **Cache complex type computations** with type aliases
