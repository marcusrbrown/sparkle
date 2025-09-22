import {render, screen} from '@testing-library/react'
import {describe, expect, expectTypeOf, it} from 'vitest'
import App from './App.js'

describe('App Component', () => {
  it('should render the main application', () => {
    render(<App />)

    // Check for the main heading
    const heading = screen.getByRole('heading', {level: 1})
    expect(heading.textContent).toBe('moo-dang')

    // Check for the subtitle
    expect(screen.getByText('WASM-based Web Shell')).toBeDefined()

    // Check for the placeholder content
    expect(screen.getByText('Terminal interface coming soon...')).toBeDefined()
  })

  it('should have the correct component structure', () => {
    render(<App />)

    // Check for semantic HTML structure
    expect(screen.getByRole('banner')).toBeDefined() // header
    expect(screen.getByRole('main')).toBeDefined() // main
  })

  it('should export App as default', () => {
    expectTypeOf(App).toBeFunction()
  })
})
