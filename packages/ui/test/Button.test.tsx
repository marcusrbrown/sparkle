import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {Button} from '../src/components/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByText('Click me')
    expect(button).toBeDefined()
    expect(button.classList.contains('btn-primary')).toBe(true)
  })

  it('renders with different variants', () => {
    const {rerender} = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByText('Secondary').classList.contains('btn-secondary')).toBe(true)

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByText('Outline').classList.contains('btn-outline')).toBe(true)
  })

  it('renders with different sizes', () => {
    const {rerender} = render(<Button size="sm">Small</Button>)
    expect(screen.getByText('Small').classList.contains('btn-sm')).toBe(true)

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByText('Large').classList.contains('btn-lg')).toBe(true)
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
