---
title: Best Practices & Advanced Patterns
description: Advanced usage patterns, best practices, and optimization techniques for Sparkle utilities.
---

This guide covers advanced usage patterns, performance optimizations, and best practices for using Sparkle utilities in production applications.

## 🎯 Best Practices

### React Hooks

#### Hook Dependencies and Memoization

```tsx
import { useAsync, useClickOutside, useDebounce } from '@sparkle/utils'
import { useCallback, useMemo } from 'react'

function OptimizedSearchComponent() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Memoize the search function to prevent unnecessary re-renders
  const searchFunction = useCallback(async (searchTerm: string) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
    return response.json()
  }, [])

  const [loading, error, executeSearch] = useAsync(searchFunction)

  // Memoize search results to prevent re-processing
  const searchResults = useMemo(() => {
    if (debouncedQuery && !loading && !error) {
      executeSearch(debouncedQuery)
    }
  }, [debouncedQuery, loading, error, executeSearch])

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

#### Error Handling Patterns

```tsx
import { useAsync } from '@sparkle/utils'

function RobustDataComponent() {
  const [loading, error, fetchData] = useAsync(async (id: string) => {
    try {
      const response = await fetch(`/api/data/${id}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (networkError) {
      // Transform network errors into user-friendly messages
      if (networkError instanceof TypeError) {
        throw new TypeError('Network connection failed. Please check your internet connection.')
      }
      throw networkError
    }
  })

  const handleRetry = () => {
    fetchData('user-123')
  }

  if (loading) return <div>Loading...</div>

  if (error) {
    return (
      <div className="error-state">
        <p>Failed to load data: {error.message}</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    )
  }

  return <div>Data loaded successfully</div>
}
```

#### Custom Hook Composition

```tsx
import { useAsync, useClickOutside, useDebounce } from '@sparkle/utils'

// Combine utilities into domain-specific hooks
function useSearchWithDropdown(searchFn: (query: string) => Promise<any[]>) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)
  const [loading, error, search] = useAsync(searchFn)
  const [results, setResults] = useState([])

  // Close dropdown when clicking outside
  const dropdownRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false)
    setSelectedIndex(-1)
  })

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      search(debouncedQuery)
        .then((searchResults) => {
          setResults(searchResults)
          setIsOpen(true)
          setSelectedIndex(-1)
        })
        .catch(() => {
          setResults([])
          setIsOpen(false)
        })
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [debouncedQuery, search])

  return {
    query,
    setQuery,
    results,
    isOpen,
    loading,
    error,
    selectedIndex,
    setSelectedIndex,
    dropdownRef
  }
}
```

### String Utilities

#### Performance-Optimized Processing

```typescript
import { slugify, toKebabCase, toTitleCase, truncate } from '@sparkle/utils'

// Cache frequently used transformations
const transformationCache = new Map<string, { slug: string; kebab: string; title: string }>()

function processTextWithCaching(text: string, maxLength = 100): {
  original: string
  truncated: string
  slug: string
  kebab: string
  title: string
} {
  const cacheKey = `${text}:${maxLength}`

  if (transformationCache.has(cacheKey)) {
    const cached = transformationCache.get(cacheKey)
    if (cached) {
      return {
        original: text,
        truncated: truncate(text, maxLength),
        ...cached
      }
    }
  }

  const transformations = {
    slug: slugify(text),
    kebab: toKebabCase(text),
    title: toTitleCase(text)
  }

  transformationCache.set(cacheKey, transformations)

  return {
    original: text,
    truncated: truncate(text, maxLength),
    ...transformations
  }
}

// Batch processing for large datasets
function batchProcessText(texts: string[]): { original: string; processed: string }[] {
  return texts.map(text => ({
    original: text,
    processed: slugify(text)
  }))
}
```

#### Content Management Patterns

```typescript
import { slugify, toTitleCase, truncate } from '@sparkle/utils'

interface BlogPost {
  title: string
  content: string
  tags: string[]
  publishedAt: Date
}

class ContentProcessor {
  private static readonly MAX_SLUG_LENGTH = 60
  private static readonly MAX_EXCERPT_LENGTH = 160
  private static readonly MAX_META_TITLE_LENGTH = 60

  static processForSEO(post: BlogPost) {
    const baseSlug = slugify(post.title)
    const slug = truncate(baseSlug, this.MAX_SLUG_LENGTH)

    return {
      slug,
      metaTitle: truncate(post.title, this.MAX_META_TITLE_LENGTH),
      excerpt: truncate(post.content, this.MAX_EXCERPT_LENGTH),
      formattedTags: post.tags.map(tag => toTitleCase(tag)),
      urlPath: `/blog/${post.publishedAt.getFullYear()}/${String(post.publishedAt.getMonth() + 1).padStart(2, '0')}/${slug}`
    }
  }

  static generateNavigation(posts: BlogPost[]) {
    return posts.map(post => {
      const processed = this.processForSEO(post)
      return {
        label: processed.metaTitle,
        href: processed.urlPath,
        tags: processed.formattedTags
      }
    })
  }
}
```

## 🚀 Performance Optimizations

### Memory Management

```typescript
import { useAsync, useDebounce } from '@sparkle/utils'

// Prevent memory leaks with proper cleanup
function useOptimizedSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Use AbortController for cancellable requests
  const searchFunction = useCallback(async (searchTerm: string) => {
    const controller = new AbortController()

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal
      })
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        return null // Request was cancelled
      }
      throw error
    }
  }, [])

  const [loading, error, executeSearch] = useAsync(searchFunction)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (loading) {
        // Cancel any pending requests
        // Implementation depends on your fetch strategy
      }
    }
  }, [loading])

  return { query, setQuery, debouncedQuery, loading, error, executeSearch }
}
```

### Efficient String Processing

```typescript
import { slugify, toKebabCase } from '@sparkle/utils'

// Avoid unnecessary string operations
class EfficientTextProcessor {
  private readonly cache = new Map<string, string>()
  private readonly maxCacheSize = 1000

  processWithCache(text: string, transformer: (str: string) => string): string {
    const cacheKey = `${transformer.name}:${text}`

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Prevent memory leaks by limiting cache size
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const result = transformer(text)
    this.cache.set(cacheKey, result)
    return result
  }

  kebabCase(text: string): string {
    return this.processWithCache(text, toKebabCase)
  }

  slugify(text: string): string {
    return this.processWithCache(text, slugify)
  }

  clearCache(): void {
    this.cache.clear()
  }
}
```

## 🧪 Testing Strategies

### React Hook Testing

```typescript
import { useAsync, useClickOutside, useDebounce } from '@sparkle/utils'
import { act, renderHook } from '@testing-library/react'

describe('Sparkle Utils Hook Testing', () => {
  describe('useDebounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('debounces value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      )

      expect(result.current).toBe('initial')

      // Update value
      rerender({ value: 'updated', delay: 100 })
      expect(result.current).toBe('initial') // Still old value

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current).toBe('updated') // Now updated
    })
  })

  describe('useAsync', () => {
    test('manages loading and error states', async () => {
      const mockAsyncFn = jest.fn()
      const { result } = renderHook(() => useAsync(mockAsyncFn))

      const [initialLoading, initialError, execute] = result.current
      expect(initialLoading).toBe(false)
      expect(initialError).toBe(null)

      // Test successful execution
      mockAsyncFn.mockResolvedValueOnce('success')

      await act(async () => {
        await execute('test-arg')
      })

      expect(mockAsyncFn).toHaveBeenCalledWith('test-arg')
    })
  })

  describe('useClickOutside', () => {
    test('calls handler on outside click', () => {
      const mockHandler = jest.fn()
      const { result } = renderHook(() => useClickOutside(mockHandler))

      // Simulate click outside
      const outsideElement = document.createElement('div')
      document.body.append(outsideElement)

      act(() => {
        outsideElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })

      expect(mockHandler).toHaveBeenCalled()

      outsideElement.remove()
    })
  })
})
```

### String Utility Testing

```typescript
import { slugify, toKebabCase, toTitleCase, truncate } from '@sparkle/utils'

describe('String Utilities', () => {
  describe('toKebabCase', () => {
    const testCases = [
      ['camelCase', 'camel-case'],
      ['PascalCase', 'pascal-case'],
      ['snake_case', 'snake-case'],
      ['UPPER CASE', 'upper-case'],
      ['mixed-Case_String', 'mixed-case-string']
    ]

    test.each(testCases)('converts "%s" to "%s"', (input, expected) => {
      expect(toKebabCase(input)).toBe(expected)
    })
  })

  describe('slugify', () => {
    test('creates URL-safe slugs', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
      expect(slugify('  JavaScript & TypeScript  ')).toBe('javascript-typescript')
      expect(slugify('Special!@#$%Characters')).toBe('specialcharacters')
    })
  })

  describe('truncate', () => {
    test('truncates long strings', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is...')
      expect(truncate('Short', 10)).toBe('Short')
      expect(truncate('Exactly ten characters', 10)).toBe('Exactly...')
    })
  })

  describe('toTitleCase', () => {
    test('capitalizes first letter of each word', () => {
      expect(toTitleCase('hello world')).toBe('Hello World')
      expect(toTitleCase('JAVASCRIPT DEVELOPER')).toBe('Javascript Developer')
    })
  })
})
```

## 🔧 Integration Patterns

### Form Handling

```tsx
import { toKebabCase, toTitleCase, useAsync, useDebounce  } from '@sparkle/utils'

interface FormFieldProps {
  name: string
  label?: string
  value: string
  onChange: (value: string) => void
  validate?: (value: string) => Promise<string | null>
}

function ValidatedFormField({ name, label, value, onChange, validate }: FormFieldProps) {
  const [error, setError] = useState<string | null>(null)
  const debouncedValue = useDebounce(value, 500)

  const [isValidating, validationError, executeValidation] = useAsync(async (val: string) => {
    if (validate) {
      return await validate(val)
    }
    return null
  })

  useEffect(() => {
    if (debouncedValue && validate) {
      executeValidation(debouncedValue)
        .then(setError)
        .catch(() => setError('Validation failed'))
    }
  }, [debouncedValue, validate, executeValidation])

  const fieldId = toKebabCase(name)
  const displayLabel = label || toTitleCase(name.replaceAll(/([A-Z])/g, ' $1').trim())

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      <label htmlFor={fieldId}>{displayLabel}</label>
      <input
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
      {isValidating && <div className="validation-spinner">Validating...</div>}
      {error && (
        <div id={`${fieldId}-error`} className="field-error">
          {error}
        </div>
      )}
    </div>
  )
}
```

### API Client Integration

```typescript
import { slugify, useAsync  } from '@sparkle/utils'

class APIClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Use slugify for endpoint generation
  getResourceEndpoint(resourceType: string, identifier: string): string {
    return `/${slugify(resourceType)}/${slugify(identifier)}`
  }
}

// Hook for API integration
function useAPIResource<T>(resourceType: string, id: string) {
  const apiClient = useMemo(() => new APIClient('/api'), [])

  const [loading, error, fetchResource] = useAsync(async (type: string, resourceId: string) => {
    const endpoint = apiClient.getResourceEndpoint(type, resourceId)
    return apiClient.request<T>(endpoint)
  })

  useEffect(() => {
    if (resourceType && id) {
      fetchResource(resourceType, id)
    }
  }, [resourceType, id, fetchResource])

  return { loading, error, refetch: () => fetchResource(resourceType, id) }
}
```

## 📈 Monitoring and Analytics

### Performance Tracking

```typescript
import { useAsync, useDebounce } from '@sparkle/utils'

function usePerformanceTracking() {
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    debounceHits: number
    asyncOperations: number
    averageResponseTime: number
  }>({
    debounceHits: 0,
    asyncOperations: 0,
    averageResponseTime: 0
  })

  const trackDebounceUsage = useCallback(() => {
    setPerformanceMetrics(prev => ({
      ...prev,
      debounceHits: prev.debounceHits + 1
    }))
  }, [])

  const trackAsyncOperation = useCallback((responseTime: number) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      asyncOperations: prev.asyncOperations + 1,
      averageResponseTime: (prev.averageResponseTime + responseTime) / 2
    }))
  }, [])

  return { performanceMetrics, trackDebounceUsage, trackAsyncOperation }
}
```

These patterns demonstrate how to effectively use Sparkle utilities in production applications with proper error handling, performance optimization, and testing strategies.
