import {render, screen, waitFor} from '@testing-library/react'
import {describe, expect, expectTypeOf, it} from 'vitest'
import App from './App.js'

describe('App Component', () => {
  it('should render the main application', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    const heading = screen.getByRole('heading', {level: 1})
    expect(heading.textContent).toBe('moo-dang')

    expect(screen.getByText('WASM-based Web Shell')).toBeDefined()

    expect(screen.getByLabelText('Terminal interface')).toBeDefined()
  })

  it('should have the correct component structure', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    expect(screen.getByRole('banner')).toBeDefined()
    expect(screen.getByRole('main')).toBeDefined()
  })

  it('should export App as default', () => {
    expectTypeOf(App).toBeFunction()
  })
})
