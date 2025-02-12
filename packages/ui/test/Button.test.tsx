import {describe, it, expect} from 'vitest'
import {render, screen} from '@testing-library/react'
import {Button} from '../src/components/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByText('Click me')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-blue-600') // primary variant
  })

  it('renders with different variants', () => {
    const {rerender} = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-gray-200')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByText('Outline')).toHaveClass('border-2')
  })

  it('renders with different sizes', () => {
    const {rerender} = render(<Button size="sm">Small</Button>)
    expect(screen.getByText('Small')).toHaveClass('px-2.5')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByText('Large')).toHaveClass('px-6')
  })

  it('forwards ref correctly', () => {
    const ref = {current: null}
    render(<Button ref={ref}>With Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('spreads additional props', () => {
    render(<Button data-testid="custom-button">Props</Button>)
    expect(screen.getByTestId('custom-button')).toBeInTheDocument()
  })
})
