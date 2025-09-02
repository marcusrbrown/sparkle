import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {Button} from '../src/components/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByText('Click me')
    expect(button).toBeDefined()
    // Check for theme-aware classes instead of old btn-* classes
    expect(button.classList.contains('bg-theme-primary-500')).toBe(true)
    expect(button.classList.contains('text-white')).toBe(true)
  })

  it('renders with different variants', () => {
    const {rerender} = render(<Button variant="secondary">Secondary</Button>)
    // Check for secondary variant theme classes
    expect(screen.getByText('Secondary').classList.contains('bg-theme-secondary-100')).toBe(true)

    rerender(<Button variant="outline">Outline</Button>)
    // Check for outline variant theme classes
    expect(screen.getByText('Outline').classList.contains('border-theme-primary-500')).toBe(true)

    rerender(<Button variant="ghost">Ghost</Button>)
    // Check for ghost variant theme classes
    expect(screen.getByText('Ghost').classList.contains('text-theme-primary-600')).toBe(true)
  })

  it('renders with different sizes', () => {
    const {rerender} = render(<Button size="sm">Small</Button>)
    // Check for small size classes
    expect(screen.getByText('Small').classList.contains('px-3')).toBe(true)
    expect(screen.getByText('Small').classList.contains('py-1.5')).toBe(true)

    rerender(<Button size="lg">Large</Button>)
    // Check for large size classes
    expect(screen.getByText('Large').classList.contains('px-6')).toBe(true)
    expect(screen.getByText('Large').classList.contains('py-3')).toBe(true)
  })

  it('renders with semantic variants', () => {
    const {rerender} = render(<Button semantic="success">Success</Button>)
    // Check for success semantic classes
    expect(screen.getByText('Success').classList.contains('bg-theme-success-500')).toBe(true)
    expect(screen.getByText('Success').classList.contains('focus:ring-theme-success-500')).toBe(true)

    rerender(
      <Button semantic="warning" variant="outline">
        Warning
      </Button>,
    )
    // Check for warning semantic classes with outline variant
    expect(screen.getByText('Warning').classList.contains('border-theme-warning-500')).toBe(true)
    expect(screen.getByText('Warning').classList.contains('text-theme-warning-600')).toBe(true)

    rerender(
      <Button semantic="error" variant="ghost">
        Error
      </Button>,
    )
    // Check for error semantic classes with ghost variant
    expect(screen.getByText('Error').classList.contains('text-theme-error-600')).toBe(true)
    expect(screen.getByText('Error').classList.contains('hover:bg-theme-error-50')).toBe(true)
  })

  it('includes base theme transition classes', () => {
    render(<Button>Theme Button</Button>)
    const button = screen.getByText('Theme Button')
    // Check for base theme classes
    expect(button.classList.contains('theme-transition')).toBe(true)
    expect(button.classList.contains('focus:ring-2')).toBe(true)
    expect(button.classList.contains('disabled:opacity-50')).toBe(true)
  })

  it('forwards ref correctly', () => {
    const ref = {current: null}
    render(<Button ref={ref}>With Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('spreads additional props', () => {
    render(<Button data-testid="custom-button">Props</Button>)
    expect(screen.getByTestId('custom-button')).toBeTruthy()
  })
})
