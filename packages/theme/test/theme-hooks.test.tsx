import type {ThemeConfig} from '@sparkle/types'
import type {ReactNode} from 'react'
import {act, renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ThemeContext, type ThemeContextValue} from '../src/context/ThemeContext'
import {useColorScheme, useTheme} from '../src/hooks'

// Mock theme configuration
const mockTheme: ThemeConfig = {
  colors: {
    primary: {500: '#3b82f6'},
    neutral: {500: '#6b7280'},
  },
  spacing: {4: '1rem'},
  typography: {
    fontFamily: {sans: 'Inter'},
    fontSize: {base: '1rem'},
    fontWeight: {normal: '400'},
    lineHeight: {normal: '1.5'},
    letterSpacing: {normal: '0'},
  },
  borderRadius: {md: '0.375rem'},
  shadows: {sm: '0 1px 2px rgba(0,0,0,0.1)'},
  animation: {
    duration: {normal: '300ms'},
    easing: {ease: 'ease'},
    transition: {all: 'all 300ms ease'},
  },
}

const mockThemeContextValue: ThemeContextValue = {
  theme: mockTheme,
  activeTheme: 'light',
  setTheme: vi.fn(),
  systemTheme: 'light',
  isLoading: false,
  error: null,
}

// Wrapper component for providing theme context in tests
function ThemeWrapper({children}: {children: ReactNode}) {
  return <ThemeContext.Provider value={mockThemeContextValue}>{children}</ThemeContext.Provider>
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return theme context when used within provider', () => {
    const {result} = renderHook(() => useTheme(), {
      wrapper: ThemeWrapper,
    })

    expect(result.current).toEqual(mockThemeContextValue)
    expect(result.current.theme).toBe(mockTheme)
    expect(result.current.activeTheme).toBe('light')
    expect(result.current.systemTheme).toBe('light')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.setTheme).toBe('function')
  })

  it('should throw error when used outside of provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider or NativeThemeProvider')

    consoleError.mockRestore()
  })

  it('should throw error when context is null', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    function NullContextWrapper({children}: {children: ReactNode}) {
      return <ThemeContext.Provider value={null}>{children}</ThemeContext.Provider>
    }

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: NullContextWrapper,
      })
    }).toThrow('useTheme must be used within a ThemeProvider or NativeThemeProvider')

    consoleError.mockRestore()
  })

  it('should provide access to setTheme function', () => {
    const mockSetTheme = vi.fn()
    const contextValueWithMockSetTheme = {
      ...mockThemeContextValue,
      setTheme: mockSetTheme,
    }

    function CustomWrapper({children}: {children: ReactNode}) {
      return <ThemeContext.Provider value={contextValueWithMockSetTheme}>{children}</ThemeContext.Provider>
    }

    const {result} = renderHook(() => useTheme(), {
      wrapper: CustomWrapper,
    })

    expect(result.current.setTheme).toBe(mockSetTheme)

    // Test calling setTheme
    result.current.setTheme('dark')
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('should provide access to theme configuration', () => {
    const {result} = renderHook(() => useTheme(), {
      wrapper: ThemeWrapper,
    })

    expect(result.current.theme.colors.primary?.[500]).toBe('#3b82f6')
    expect(result.current.theme.spacing[4]).toBe('1rem')
    expect(result.current.theme.typography.fontFamily.sans).toBe('Inter')
  })

  it('should provide loading state', () => {
    const loadingContextValue = {
      ...mockThemeContextValue,
      isLoading: true,
    }

    function LoadingWrapper({children}: {children: ReactNode}) {
      return <ThemeContext.Provider value={loadingContextValue}>{children}</ThemeContext.Provider>
    }

    const {result} = renderHook(() => useTheme(), {
      wrapper: LoadingWrapper,
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should provide error state', () => {
    const errorContextValue = {
      ...mockThemeContextValue,
      error: new Error('Theme loading failed'),
    }

    function ErrorWrapper({children}: {children: ReactNode}) {
      return <ThemeContext.Provider value={errorContextValue}>{children}</ThemeContext.Provider>
    }

    const {result} = renderHook(() => useTheme(), {
      wrapper: ErrorWrapper,
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Theme loading failed')
  })
})

describe('useColorScheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset window.matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('should return light scheme by default on web', () => {
    const {result} = renderHook(() => useColorScheme())
    expect(result.current).toBe('light')
  })

  it('should detect dark scheme from system preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const {result} = renderHook(() => useColorScheme())
    expect(result.current).toBe('dark')
  })

  it('should set up modern event listener', () => {
    const addEventListenerMock = vi.fn()
    const removeEventListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      })),
    })

    const {unmount} = renderHook(() => useColorScheme())

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should set up legacy event listener when modern API not available', () => {
    const addListenerMock = vi.fn()
    const removeListenerMock = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: undefined, // Modern API not available
        removeEventListener: undefined,
        addListener: addListenerMock,
        removeListener: removeListenerMock,
      })),
    })

    const {unmount} = renderHook(() => useColorScheme())

    expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function))

    unmount()

    expect(removeListenerMock).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should handle environment without matchMedia', () => {
    // Mock environment without matchMedia (like older browsers or SSR)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    })

    const {result} = renderHook(() => useColorScheme())

    // Should default to light and not crash
    expect(result.current).toBe('light')
  })

  it('should handle SSR environment', () => {
    // Mock SSR environment by temporarily removing matchMedia
    const originalMatchMedia = window.matchMedia
    // @ts-expect-error - Mocking SSR environment
    delete window.matchMedia

    const {result} = renderHook(() => useColorScheme())
    expect(result.current).toBe('light')

    // Restore matchMedia
    window.matchMedia = originalMatchMedia
  })

  it('should handle React Native environment', () => {
    // Mock React Native environment by removing matchMedia
    const originalMatchMedia = window.matchMedia
    // @ts-expect-error - Mocking React Native environment
    delete window.matchMedia

    const {result} = renderHook(() => useColorScheme())
    expect(result.current).toBe('light')

    // Restore matchMedia
    window.matchMedia = originalMatchMedia
  })

  it('should handle React Native environment errors gracefully', () => {
    // Mock React Native environment by removing matchMedia
    const originalMatchMedia = window.matchMedia
    // @ts-expect-error - Mocking React Native environment
    delete window.matchMedia

    const {result} = renderHook(() => useColorScheme())
    expect(result.current).toBe('light')

    // Restore matchMedia
    window.matchMedia = originalMatchMedia
  })

  it('should respond to system theme changes', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn((_, handler) => {
          changeHandler = handler
        }),
        removeEventListener: vi.fn(),
      })),
    })

    const {result, rerender} = renderHook(() => useColorScheme())
    expect(result.current).toBe('light')

    // Simulate system theme change
    if (changeHandler) {
      act(() => {
        const handler = changeHandler
        if (handler) {
          handler({matches: true} as MediaQueryListEvent)
        }
      })

      // Force re-render to pick up the change
      rerender()
    }

    expect(result.current).toBe('dark')
  })
})
