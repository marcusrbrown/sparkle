/**
 * Command execution performance benchmarks for the moo-dang shell.
 *
 * Tests parsing and core shell functionality performance with various
 * workloads to identify optimization opportunities.
 */

import {consola} from 'consola'

import {parseCommand, parseCommandPipeline} from '../shell/parser'
import {BenchmarkSuite, type BenchmarkOptions} from '../utils/benchmark'

/**
 * Benchmarks command parsing performance.
 */
export async function benchmarkCommandParsing(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('Command Parsing Performance', {
    timestamp: new Date().toISOString(),
  })

  // Simple command parsing
  await suite.addBenchmark(
    'Parse simple command',
    async () => {
      return parseCommand('echo hello world')
    },
    {iterations: 1000, ...options},
  )

  // Complex command parsing
  await suite.addBenchmark(
    'Parse complex command with quotes',
    async () => {
      return parseCommand('echo "hello world" \'single quotes\' --flag=value')
    },
    {iterations: 500, ...options},
  )

  // Pipeline parsing
  await suite.addBenchmark(
    'Parse simple pipeline',
    async () => {
      return parseCommandPipeline('ls | grep txt | cat')
    },
    {iterations: 200, ...options},
  )

  // Complex pipeline parsing
  await suite.addBenchmark(
    'Parse complex pipeline',
    async () => {
      return parseCommandPipeline('cat /home/user/large.txt | grep "Entry" | head -n 10 | tail -n 5')
    },
    {iterations: 100, ...options},
  )

  // Environment variable expansion
  await suite.addBenchmark(
    'Parse command with env variables',
    async () => {
      return parseCommand('echo $HOME/documents $USER@$HOSTNAME')
    },
    {iterations: 300, ...options},
  )

  suite.logReport()
}

/**
 * Benchmarks string processing operations used throughout the shell.
 */
export async function benchmarkStringProcessing(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('String Processing Performance', {
    timestamp: new Date().toISOString(),
  })

  // Path manipulation
  await suite.addBenchmark(
    'Path normalization',
    async () => {
      const paths = ['/home/user/../user/./documents', '../../tmp/./log/../data', '/usr/bin/../lib/./shared']
      return paths.map(path => path.replaceAll('/./', '/').replaceAll(/\/[^/]+\/\.\.\//g, '/'))
    },
    {iterations: 1000, ...options},
  )

  // Command argument tokenization
  await suite.addBenchmark(
    'Argument tokenization',
    async () => {
      const commands = [
        'echo "hello world" --flag=value',
        'cat file1.txt file2.txt > output.txt',
        'grep -r "pattern" /search/path --include="*.ts"',
      ]
      return commands.map(cmd => cmd.split(/\s+/))
    },
    {iterations: 2000, ...options},
  )

  // Output formatting
  await suite.addBenchmark(
    'Large output formatting',
    async () => {
      const lines = Array.from({length: 1000}, (_, i) => `Line ${i}: Some data content`)
      return lines.join('\n')
    },
    {iterations: 100, ...options},
  )

  suite.logReport()
}

/**
 * Comprehensive command execution benchmark suite.
 */
export async function runCommandBenchmarkSuite(options: BenchmarkOptions = {}): Promise<void> {
  consola.info('Starting command execution benchmark suite')

  const startTime = performance.now()

  try {
    await benchmarkCommandParsing(options)
    await benchmarkStringProcessing(options)
  } catch (error) {
    consola.error('Error during command benchmarking:', error)
    throw error
  }

  const totalTime = performance.now() - startTime
  consola.info(`Command benchmark suite completed in ${totalTime.toFixed(2)}ms`)
}
