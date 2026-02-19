import type {ThemeConfig} from '@sparkle/types'
import type {ReactElement} from 'react'

import {ThemeProvider} from '@sparkle/theme'
import {render, type RenderOptions, type RenderResult} from '@testing-library/react'

/**
 * Options for rendering components with theme provider.
 */
export interface RenderWithThemeOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark' | 'system'
  themes?: {light: ThemeConfig; dark: ThemeConfig}
}

/**
 * Renders a React component wrapped in ThemeProvider.
 * Simplifies testing theme-aware components by providing consistent theme context.
 *
 * @param ui - React component to render
 * @param options - Render options including theme configuration
 * @returns Testing Library render result
 *
 * @example
 * ```typescript
 * it('should render with dark theme', () => {
 *   const {container} = renderWithTheme(<Button>Click me</Button>, {theme: 'dark'})
 *   expect(container).toBeInTheDocument()
 * })
 * ```
 */
export function renderWithTheme(ui: ReactElement, options?: RenderWithThemeOptions): RenderResult {
  const {theme = 'light', themes, ...renderOptions} = options ?? {}

  const Wrapper = ({children}: {children: React.ReactNode}) => (
    <ThemeProvider defaultTheme={theme} themes={themes}>
      {children}
    </ThemeProvider>
  )

  return render(ui, {wrapper: Wrapper, ...renderOptions})
}

/**
 * Options for rendering with multiple providers.
 */
export interface RenderWithProvidersOptions extends RenderWithThemeOptions {
  additionalProviders?: React.ComponentType<{children: React.ReactNode}>[]
}

/**
 * Renders a React component with theme and additional providers.
 * Allows composing multiple context providers for complex component testing.
 *
 * @param ui - React component to render
 * @param options - Render options including theme and provider configuration
 * @returns Testing Library render result
 *
 * @example
 * ```typescript
 * const {getByText} = renderWithProviders(<MyComponent />, {
 *   theme: 'dark',
 *   additionalProviders: [QueryClientProvider]
 * })
 * ```
 */
export function renderWithProviders(ui: ReactElement, options?: RenderWithProvidersOptions): RenderResult {
  const {theme = 'light', themes, additionalProviders = [], ...renderOptions} = options ?? {}

  const Wrapper = ({children}: {children: React.ReactNode}) => {
    let wrapped = (
      <ThemeProvider defaultTheme={theme} themes={themes}>
        {children}
      </ThemeProvider>
    )

    for (const Provider of additionalProviders) {
      wrapped = <Provider>{wrapped}</Provider>
    }

    return wrapped
  }

  return render(ui, {wrapper: Wrapper, ...renderOptions})
}

/**
 * Creates a reusable test wrapper component with providers.
 * Useful for consistent test setup across multiple test files.
 *
 * @param options - Configuration for providers
 * @returns Wrapper component that can be reused in tests
 *
 * @example
 * ```typescript
 * const TestWrapper = createTestWrapper({theme: 'dark'})
 *
 * it('should render in wrapper', () => {
 *   render(<MyComponent />, {wrapper: TestWrapper})
 * })
 * ```
 */
export function createTestWrapper(
  options?: RenderWithProvidersOptions,
): React.ComponentType<{children: React.ReactNode}> {
  const {theme = 'light', themes, additionalProviders = []} = options ?? {}

  return function TestWrapper({children}: {children: React.ReactNode}) {
    let wrapped = (
      <ThemeProvider defaultTheme={theme} themes={themes}>
        {children}
      </ThemeProvider>
    )

    for (const Provider of additionalProviders) {
      wrapped = <Provider>{wrapped}</Provider>
    }

    return wrapped
  }
}
