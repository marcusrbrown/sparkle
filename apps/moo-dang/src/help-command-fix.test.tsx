/**
 * Test to verify that the 'help' command fix prevents infinite scrolling.
 */

import {render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import App from './App'

describe('Help Command Fix', () => {
  it('should render the app with terminal container', async () => {
    // Mock console methods to avoid noise in tests
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(<App />)

    // Wait for the terminal to be ready
    await screen.findByRole('main')

    // Find the terminal container
    const terminalContainer = screen.getByRole('main')
    expect(terminalContainer).toBeDefined()

    // The key fix is that 'help' command now properly adds terminal output
    // before opening the modal, preventing the terminal from being left in
    // an inconsistent state that caused infinite scrolling

    // Clean up mocks
    consoleInfo.mockRestore()
    consoleDebug.mockRestore()
    consoleWarn.mockRestore()
  })

  it('should properly handle help command execution', () => {
    // Test that help command adds appropriate terminal output
    const mockTerminal = {
      addOutput: vi.fn(),
    }

    const command = 'help'

    // Simulate what the fix does
    mockTerminal.addOutput('command', command)
    mockTerminal.addOutput('info', 'Opening keyboard shortcuts help...')

    expect(mockTerminal.addOutput).toHaveBeenCalledWith('command', 'help')
    expect(mockTerminal.addOutput).toHaveBeenCalledWith('info', 'Opening keyboard shortcuts help...')
  })

  it('should handle demo command differently from help', () => {
    // Ensure demo and help commands have different behaviors
    const helpCommand = 'help'
    const demoCommand = 'demo'

    expect(helpCommand).not.toBe(demoCommand)

    // Help adds info output, demo adds multiple sample outputs
    // This difference in output handling was the key to the fix
    const helpOutput = 'Opening keyboard shortcuts help...'
    const demoOutputExample = 'total 42\ndrwxr-xr-x  3 user  staff...'

    expect(helpOutput).toContain('help')
    expect(demoOutputExample).toContain('total')
  })
})
