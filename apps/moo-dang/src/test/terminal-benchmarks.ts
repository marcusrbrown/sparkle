/**
 * Terminal rendering performance benchmarks for the moo-dang shell.
 *
 * Tests xterm.js integration, output rendering, and terminal interaction
 * performance to identify UI bottlenecks and optimization opportunities.
 */

import {consola} from 'consola'

import {BenchmarkSuite, type BenchmarkOptions} from '../utils/benchmark'

/**
 * Benchmarks simulated terminal output performance without actual xterm.js dependency.
 *
 * Since xterm.js requires DOM environment, we simulate the key operations that
 * would be performance-critical in the actual terminal integration.
 */

/**
 * Simulates large text output processing like what xterm.js would handle.
 */
function simulateTerminalWrite(text: string): {lines: number; characters: number} {
  const lines = text.split('\n')
  const characters = text.length

  // Simulate processing each line (like xterm.js would do)
  for (const line of lines) {
    // Simulate character counting and wrapping calculations
    const charCount = line.length
    if (charCount > 80) {
      // Simulate line wrapping calculations
      Math.ceil(charCount / 80)
    }
  }

  return {lines: lines.length, characters}
}

/**
 * Simulates terminal scrolling and buffer management.
 */
function simulateTerminalScroll(lines: string[], bufferSize: number): string[] {
  if (lines.length <= bufferSize) {
    return lines
  }

  // Simulate removing old lines to stay within buffer limit
  return lines.slice(-bufferSize)
}

/**
 * Simulates text processing for terminal formatting.
 */
function simulateTextProcessing(text: string): string {
  // Simulate basic text processing operations that terminals do
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
}

/**
 * Benchmarks terminal output rendering performance.
 */
export async function benchmarkTerminalOutput(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('Terminal Output Performance', {
    timestamp: new Date().toISOString(),
  })

  // Small output
  const smallOutput = Array.from({length: 10}, (_, i) => `Line ${i + 1}: Small output test`).join('\n')

  await suite.addBenchmark(
    'Render small output (10 lines)',
    async () => {
      return simulateTerminalWrite(smallOutput)
    },
    {iterations: 1000, ...options},
  )

  // Medium output
  const mediumOutput = Array.from(
    {length: 100},
    (_, i) => `Line ${i + 1}: Medium output with more content and data`,
  ).join('\n')

  await suite.addBenchmark(
    'Render medium output (100 lines)',
    async () => {
      return simulateTerminalWrite(mediumOutput)
    },
    {iterations: 100, ...options},
  )

  // Large output
  const largeOutput = Array.from(
    {length: 1000},
    (_, i) => `Line ${i + 1}: Large output with substantial content and data for testing performance`,
  ).join('\n')

  await suite.addBenchmark(
    'Render large output (1000 lines)',
    async () => {
      return simulateTerminalWrite(largeOutput)
    },
    {iterations: 10, ...options},
  )

  // Very large output
  const veryLargeOutput = Array.from(
    {length: 10000},
    (_, i) =>
      `Entry ${i + 1}: Very large output with extensive content for stress testing terminal performance and memory usage`,
  ).join('\n')

  await suite.addBenchmark(
    'Render very large output (10000 lines)',
    async () => {
      return simulateTerminalWrite(veryLargeOutput)
    },
    {iterations: 3, ...options},
  )

  suite.logReport()
}

/**
 * Benchmarks text formatting and processing performance.
 */
export async function benchmarkTextFormatting(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('Text Formatting Performance', {
    timestamp: new Date().toISOString(),
  })

  // Simple text processing
  const simpleText = `Error: Something went wrong
Success: Operation completed
Warning: Check this issue
Info: Additional information`

  await suite.addBenchmark(
    'Process simple formatted text',
    async () => {
      return simulateTextProcessing(simpleText)
    },
    {iterations: 1000, ...options},
  )

  // Complex text formatting
  const complexText = Array.from({length: 100}, (_, i) => {
    const types = ['ERROR', 'SUCCESS', 'WARNING', 'INFO', 'DEBUG', 'TRACE']
    const type = types[i % types.length]
    return `[${type}] Line ${i + 1}: Complex formatting test with various message types`
  }).join('\n')

  await suite.addBenchmark(
    'Process complex formatted text',
    async () => {
      return simulateTextProcessing(complexText)
    },
    {iterations: 100, ...options},
  )

  // Heavy text processing
  const heavyText = Array.from({length: 500}, (_, i) => {
    return `[TIMESTAMP] [LEVEL] [COMPONENT] Heavily formatted line ${i + 1} with multiple data fields and metadata`
  }).join('\n')

  await suite.addBenchmark(
    'Process heavy formatted text',
    async () => {
      return simulateTextProcessing(heavyText)
    },
    {iterations: 50, ...options},
  )

  suite.logReport()
}

/**
 * Benchmarks terminal scrolling and buffer management performance.
 */
export async function benchmarkTerminalScrolling(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('Terminal Scrolling Performance', {
    timestamp: new Date().toISOString(),
  })

  // Create test data sets
  const lines100 = Array.from({length: 100}, (_, i) => `Line ${i + 1}`)
  const lines1000 = Array.from({length: 1000}, (_, i) => `Line ${i + 1}`)
  const lines5000 = Array.from({length: 5000}, (_, i) => `Line ${i + 1}`)

  // Buffer management with different sizes
  await suite.addBenchmark(
    'Buffer management (100 lines, 50 buffer)',
    async () => {
      return simulateTerminalScroll(lines100, 50)
    },
    {iterations: 1000, ...options},
  )

  await suite.addBenchmark(
    'Buffer management (1000 lines, 100 buffer)',
    async () => {
      return simulateTerminalScroll(lines1000, 100)
    },
    {iterations: 100, ...options},
  )

  await suite.addBenchmark(
    'Buffer management (5000 lines, 200 buffer)',
    async () => {
      return simulateTerminalScroll(lines5000, 200)
    },
    {iterations: 20, ...options},
  )

  // Simulate rapid scrolling
  await suite.addBenchmark(
    'Rapid scrolling simulation',
    async () => {
      let buffer: string[] = []
      const bufferSize = 100

      // Simulate adding lines rapidly
      for (let i = 0; i < 500; i++) {
        buffer.push(`Rapid line ${i}`)
        if (buffer.length > bufferSize) {
          buffer = buffer.slice(-bufferSize)
        }
      }

      return buffer
    },
    {iterations: 100, ...options},
  )

  suite.logReport()
}

/**
 * Benchmarks interactive terminal features performance.
 */
export async function benchmarkTerminalInteraction(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('Terminal Interaction Performance', {
    timestamp: new Date().toISOString(),
  })

  // Simulate cursor movement calculations
  await suite.addBenchmark(
    'Cursor position calculations',
    async () => {
      const results = []
      for (let i = 0; i < 100; i++) {
        const row = Math.floor(i / 10)
        const col = i % 10
        results.push({row, col, absolute: row * 80 + col})
      }
      return results
    },
    {iterations: 1000, ...options},
  )

  // Simulate input line editing
  await suite.addBenchmark(
    'Input line editing simulation',
    async () => {
      let commandLine = ''
      const operations = [
        'echo hello world',
        'BACKSPACE_5', // Simulate backspace 5 chars
        'testing', // Type new text
        'LEFT_ARROW_2', // Simulate left arrow twice
        'new ', // Insert text
      ]

      for (const op of operations) {
        if (op === 'BACKSPACE_5') {
          commandLine = commandLine.slice(0, -5)
        } else if (op === 'LEFT_ARROW_2') {
          // Simulate cursor movement (no actual change to string)
          continue
        } else {
          commandLine += op
        }
      }

      return commandLine
    },
    {iterations: 1000, ...options},
  )

  // Simulate selection highlighting
  await suite.addBenchmark(
    'Text selection simulation',
    async () => {
      const text = 'This is a sample command line with various words'
      const selections = []

      // Simulate selecting different ranges
      for (let start = 0; start < text.length - 10; start += 5) {
        const end = Math.min(start + 10, text.length)
        selections.push({
          start,
          end,
          text: text.slice(start, end),
        })
      }

      return selections
    },
    {iterations: 500, ...options},
  )

  suite.logReport()
}

/**
 * Comprehensive terminal rendering benchmark suite.
 */
export async function runTerminalBenchmarkSuite(options: BenchmarkOptions = {}): Promise<void> {
  consola.info('Starting terminal rendering benchmark suite')

  const startTime = performance.now()

  try {
    await benchmarkTerminalOutput(options)
    await benchmarkTextFormatting(options)
    await benchmarkTerminalScrolling(options)
    await benchmarkTerminalInteraction(options)
  } catch (error) {
    consola.error('Error during terminal benchmarking:', error)
    throw error
  }

  const totalTime = performance.now() - startTime
  consola.info(`Terminal benchmark suite completed in ${totalTime.toFixed(2)}ms`)
}
