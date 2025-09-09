---
title: String Utilities
description: Collection of string manipulation utilities for common text processing tasks in Sparkle Design System.
---

## Overview

Sparkle provides a set of string utility functions for common text processing needs in web applications. These utilities are designed to be simple, efficient, and type-safe.

## toKebabCase

Converts a string to kebab-case format (lowercase with hyphens).

```typescript
function toKebabCase(str: string): string
```

### Parameters

- `str: string` - The input string to convert

### Returns

- `string` - The kebab-cased string

### Usage

```typescript
import { toKebabCase } from '@sparkle/utils'

toKebabCase('HelloWorld')        // 'hello-world'
toKebabCase('camelCaseString')   // 'camel-case-string'
toKebabCase('snake_case_string') // 'snake-case-string'
toKebabCase('UPPER CASE TEXT')   // 'upper-case-text'
toKebabCase('Mixed_Case-String') // 'mixed-case-string'
```

### Common Use Cases

- **CSS class names**: Converting component names to CSS classes
- **File naming**: Creating consistent file names
- **URL slugs**: Converting titles to URL-friendly formats
- **API endpoints**: Standardizing endpoint naming

### Example in Components

```tsx
import { toKebabCase } from '@sparkle/utils'

interface ButtonProps {
  variant?: string
  size?: string
}

function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const className = [
    'btn',
    `btn--${toKebabCase(variant)}`,
    `btn--${toKebabCase(size)}`
  ].join(' ')

  return <button className={className} {...props} />
}

// Usage: <Button variant="primaryLarge" /> → class="btn btn--primary-large btn--md"
```

---

## truncate

Truncates a string to a specified maximum length and adds ellipsis if needed.

```typescript
function truncate(str: string, maxLength: number): string
```

### Parameters

- `str: string` - The input string to truncate
- `maxLength: number` - The maximum length including ellipsis

### Returns

- `string` - The truncated string with ellipsis if needed

### Usage

```typescript
import { truncate } from '@sparkle/utils'

truncate('This is a very long string', 10)  // 'This is...'
truncate('Short text', 20)                  // 'Short text'
truncate('Exactly ten chars', 10)           // 'Exactly...'
truncate('Hello', 10)                       // 'Hello'
```

### Component Usage

```tsx
import { truncate } from '@sparkle/utils'

interface CardProps {
  title: string
  description: string
  maxTitleLength?: number
  maxDescriptionLength?: number
}

function Card({
  title,
  description,
  maxTitleLength = 50,
  maxDescriptionLength = 120
}: CardProps) {
  return (
    <div className="card">
      <h3 className="card-title">
        {truncate(title, maxTitleLength)}
      </h3>
      <p className="card-description">
        {truncate(description, maxDescriptionLength)}
      </p>
    </div>
  )
}
```

### Responsive Truncation

```tsx
import { truncate } from '@sparkle/utils'
import { useWindowSize } from './hooks'

function ResponsiveText({ text }: { text: string }) {
  const { width } = useWindowSize()

  // Adjust truncation based on screen size
  const maxLength = width < 768 ? 50 : width < 1024 ? 100 : 150

  return <span>{truncate(text, maxLength)}</span>
}
```

---

## slugify

Converts a string to a URL-friendly slug format.

```typescript
function slugify(str: string): string
```

### Parameters

- `str: string` - The input string to slugify

### Returns

- `string` - The URL-friendly slug

### Usage

```typescript
import { slugify } from '@sparkle/utils'

slugify('Hello World!')              // 'hello-world'
slugify('JavaScript & TypeScript')   // 'javascript-typescript'
slugify('  Multiple   Spaces  ')     // 'multiple-spaces'
slugify('Special!@#$%Characters')    // 'specialcharacters'
slugify('Mixed-Case_String')         // 'mixed-case-string'
```

### Blog Post Example

```tsx
import { slugify } from '@sparkle/utils'

interface BlogPost {
  title: string
  content: string
  publishedAt: Date
}

function generatePostUrl(post: BlogPost): string {
  const slug = slugify(post.title)
  const year = post.publishedAt.getFullYear()
  const month = String(post.publishedAt.getMonth() + 1).padStart(2, '0')

  return `/blog/${year}/${month}/${slug}`
}

// Usage
const post = {
  title: 'Getting Started with React Hooks!',
  content: '...',
  publishedAt: new Date('2024-03-15')
}

const url = generatePostUrl(post)
// Result: '/blog/2024/03/getting-started-with-react-hooks'
```

### SEO-Friendly Navigation

```tsx
import { slugify } from '@sparkle/utils'

interface NavigationItem {
  label: string
  href?: string
  children?: NavigationItem[]
}

function Navigation({ items }: { items: NavigationItem[] }) {
  return (
    <nav>
      {items.map((item) => {
        const href = item.href || `#${slugify(item.label)}`

        return (
          <a key={href} href={href}>
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
```

---

## toTitleCase

Converts a string to title case (first letter of each word capitalized).

```typescript
function toTitleCase(str: string): string
```

### Parameters

- `str: string` - The input string to convert

### Returns

- `string` - The title-cased string

### Usage

```typescript
import { toTitleCase } from '@sparkle/utils'

toTitleCase('hello world')           // 'Hello World'
toTitleCase('UPPERCASE TEXT')        // 'Uppercase Text'
toTitleCase('mixed CaSe string')     // 'Mixed Case String'
toTitleCase('javascript developer')  // 'Javascript Developer'
```

### Form Field Labels

```tsx
import { toTitleCase } from '@sparkle/utils'

interface FormFieldProps {
  name: string
  label?: string
  value: string
  onChange: (value: string) => void
}

function FormField({ name, label, value, onChange }: FormFieldProps) {
  // Auto-generate label from field name if not provided
  const displayLabel = label || toTitleCase(name.replaceAll(/([A-Z])/g, ' $1'))

  return (
    <div className="form-field">
      <label htmlFor={name}>{displayLabel}</label>
      <input
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// Usage
<FormField name="firstName" value={firstName} onChange={setFirstName} />
// Renders label as "First Name"
```

### Breadcrumb Navigation

```tsx
import { toTitleCase } from '@sparkle/utils'

function Breadcrumbs({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean)

  return (
    <nav className="breadcrumbs">
      <a href="/">Home</a>
      {segments.map((segment, index) => {
        const href = `/${  segments.slice(0, index + 1).join('/')}`
        const label = toTitleCase(segment.replaceAll(/[-_]/g, ' '))

        return (
          <span key={href}>
            <span className="separator">/</span>
            <a href={href}>{label}</a>
          </span>
        )
      })}
    </nav>
  )
}

// Usage with path "/products/electronics/smartphones"
// Renders: Home / Products / Electronics / Smartphones
```

## Utility Composition

### Chaining String Operations

```typescript
import { slugify, toKebabCase, toTitleCase, truncate } from '@sparkle/utils'

// Create a URL-safe filename from a title
function createFilename(title: string, maxLength = 50): string {
  return `${truncate(slugify(title), maxLength)  }.md`
}

// Generate CSS class from component name
function generateComponentClass(componentName: string, variant?: string): string {
  const baseClass = toKebabCase(componentName)
  return variant ? `${baseClass} ${baseClass}--${toKebabCase(variant)}` : baseClass
}

// Format field name for display
function formatFieldLabel(fieldName: string): string {
  return toTitleCase(fieldName.replaceAll(/([A-Z])/g, ' $1').trim())
}

// Examples
createFilename('Getting Started with React Hooks!')
// Result: 'getting-started-with-react-hooks.md'

generateComponentClass('PrimaryButton', 'large')
// Result: 'primary-button primary-button--large'

formatFieldLabel('emailAddress')
// Result: 'Email Address'
```

### Advanced Text Processing

```tsx
import { slugify, toTitleCase, truncate } from '@sparkle/utils'

interface ArticleCardProps {
  article: {
    title: string
    excerpt: string
    tags: string[]
    author: string
  }
  maxTitleLength?: number
  maxExcerptLength?: number
}

function ArticleCard({
  article,
  maxTitleLength = 60,
  maxExcerptLength = 120
}: ArticleCardProps) {
  const articleUrl = `/articles/${slugify(article.title)}`

  return (
    <article className="article-card">
      <h2 className="article-title">
        <a href={articleUrl}>
          {truncate(article.title, maxTitleLength)}
        </a>
      </h2>

      <p className="article-excerpt">
        {truncate(article.excerpt, maxExcerptLength)}
      </p>

      <div className="article-meta">
        <span className="author">By {toTitleCase(article.author)}</span>

        <div className="tags">
          {article.tags.map(tag => (
            <span key={tag} className="tag">
              {toTitleCase(tag)}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
```

## Performance Considerations

### Memoization for Expensive Operations

```tsx
import { slugify, truncate } from '@sparkle/utils'
import { useMemo } from 'react'

function ExpensiveTextProcessing({ items }: { items: string[] }) {
  // Memoize processed strings to avoid recalculation
  const processedItems = useMemo(() => {
    return items.map(item => ({
      original: item,
      slug: slugify(item),
      truncated: truncate(item, 50)
    }))
  }, [items])

  return (
    <ul>
      {processedItems.map(({ original, slug, truncated }) => (
        <li key={slug}>
          <a href={`#${slug}`}>{truncated}</a>
        </li>
      ))}
    </ul>
  )
}
```

### Batch Processing

```typescript
import { slugify, toKebabCase } from '@sparkle/utils'

function processBatch(strings: string[]): {
  original: string
  kebab: string
  slug: string
}[] {
  return strings.map(str => ({
    original: str,
    kebab: toKebabCase(str),
    slug: slugify(str)
  }))
}

// Process multiple strings efficiently
const results = processBatch([
  'Component Name',
  'Another Component',
  'Third Component'
])
```

## Testing String Utilities

### Unit Tests

```typescript
import { slugify, toKebabCase, toTitleCase, truncate } from '@sparkle/utils'

describe('String Utilities', () => {
  describe('toKebabCase', () => {
    test('converts camelCase to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case')
    })

    test('handles multiple words', () => {
      expect(toKebabCase('Hello World Test')).toBe('hello-world-test')
    })
  })

  describe('truncate', () => {
    test('truncates long strings', () => {
      expect(truncate('This is a long string', 10)).toBe('This is...')
    })

    test('leaves short strings unchanged', () => {
      expect(truncate('Short', 10)).toBe('Short')
    })
  })

  describe('slugify', () => {
    test('creates URL-safe slugs', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
    })

    test('removes special characters', () => {
      expect(slugify('Test@#$%')).toBe('test')
    })
  })

  describe('toTitleCase', () => {
    test('capitalizes first letter of each word', () => {
      expect(toTitleCase('hello world')).toBe('Hello World')
    })
  })
})
```
