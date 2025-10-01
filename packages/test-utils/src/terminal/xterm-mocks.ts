import {vi} from 'vitest'

/**
 * Mock XTerm terminal interface for testing.
 * Prevents actual terminal initialization during tests while maintaining API compatibility.
 */
export interface MockTerminal {
  write: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
  open: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  loadAddon: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
  onResize: ReturnType<typeof vi.fn>
  options: Record<string, unknown>
  cols: number
  rows: number
}

/**
 * Mock FitAddon interface for testing.
 * Simulates terminal size fitting behavior without actual DOM manipulation.
 */
export interface MockFitAddon {
  fit: ReturnType<typeof vi.fn>
  proposeDimensions: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock XTerm Terminal instance.
 * Provides all standard Terminal methods as Vitest mocks.
 *
 * @returns Mock terminal with standard API methods
 *
 * @example
 * ```typescript
 * const mockTerminal = createTerminalMock()
 * mockTerminal.write('hello')
 * expect(mockTerminal.write).toHaveBeenCalledWith('hello')
 * ```
 */
export function createTerminalMock(): MockTerminal {
  return {
    write: vi.fn(),
    clear: vi.fn(),
    focus: vi.fn(),
    open: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    onData: vi.fn(() => ({dispose: vi.fn()})),
    onResize: vi.fn(() => ({dispose: vi.fn()})),
    options: {},
    cols: 80,
    rows: 24,
  }
}

/**
 * Creates a mock FitAddon instance.
 * Simulates automatic terminal sizing without DOM dependencies.
 *
 * @returns Mock FitAddon with standard methods
 *
 * @example
 * ```typescript
 * const mockFitAddon = createFitAddonMock()
 * const dimensions = mockFitAddon.proposeDimensions()
 * expect(dimensions).toEqual({cols: 80, rows: 24})
 * ```
 */
export function createFitAddonMock(): MockFitAddon {
  return {
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({cols: 80, rows: 24})),
  }
}

/**
 * Configures global @xterm/xterm and @xterm/addon-fit mocks.
 * Sets up vi.mock calls for terminal component testing.
 *
 * @example
 * ```typescript
 * // At the top of your test file
 * setupXTermMocks()
 *
 * describe('Terminal component', () => {
 *   it('should create terminal', () => {
 *     // Terminal and FitAddon are now mocked
 *   })
 * })
 * ```
 */
export function setupXTermMocks(): void {
  vi.mock('@xterm/xterm', () => ({
    Terminal: vi.fn().mockImplementation(() => createTerminalMock()),
  }))

  vi.mock('@xterm/addon-fit', () => ({
    FitAddon: vi.fn().mockImplementation(() => createFitAddonMock()),
  }))
}
