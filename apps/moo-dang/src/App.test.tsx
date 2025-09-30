import {render, screen, waitFor} from '@testing-library/react'
import {describe, expect, expectTypeOf, it} from 'vitest'
import App from './App.js'

describe('App Component', () => {
  it('should render the main application', async () => {
    render(<App />)

    // Wait for async component initialization (CommandTerminal effects)
    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    // Check for the main heading
    const heading = screen.getByRole('heading', {level: 1})
    expect(heading.textContent).toBe('moo-dang')

    // Check for the subtitle
    expect(screen.getByText('WASM-based Web Shell')).toBeDefined()

    // Check for the terminal interface
    expect(screen.getByLabelText('Terminal interface')).toBeDefined()
  })

  it('should have the correct component structure', async () => {
    render(<App />)

    // Wait for async component initialization
    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    // Check for semantic HTML structure
    expect(screen.getByRole('banner')).toBeDefined() // header
    expect(screen.getByRole('main')).toBeDefined() // main
  })

  it('should export App as default', () => {
    expectTypeOf(App).toBeFunction()
  })
})
