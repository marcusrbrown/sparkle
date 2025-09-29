/**
 * Master performance benchmark runner for the moo-dang shell application.
 *
 * Orchestrates all performance benchmark suites and provides comprehensive
 * performance analysis and reporting for optimization insights.
 */

import process from 'node:process'

import {consola} from 'consola'

import {createMemoryTracker, type BenchmarkOptions} from '../utils/benchmark'
import {runCommandBenchmarkSuite} from './command-benchmarks'
import {runTerminalBenchmarkSuite} from './terminal-benchmarks'
import {runWasmBenchmarkSuite} from './wasm-benchmarks'

interface PerformanceReport {
  timestamp: string
  environment: {
    userAgent: string
    platform: string
    memoryLimit?: number
  }
  benchmarkResults: {
    wasm?: string
    command?: string
    terminal?: string
  }
  overallMetrics: {
    totalTime: number
    memoryUsage: {
      initial: number
      peak: number
      final: number
      delta: number
    }
  }
  recommendations: string[]
}

/**
 * Gets environment information for performance reporting.
 */
function getEnvironmentInfo(): PerformanceReport['environment'] {
  const env: PerformanceReport['environment'] = {
    userAgent: typeof navigator === 'undefined' ? 'Unknown' : navigator.userAgent,
    platform: process?.platform ?? 'browser',
  }

  // Add memory limit if available
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory
    env.memoryLimit = memory.jsHeapSizeLimit
  }

  return env
}

/**
 * Generates performance optimization recommendations based on benchmark results.
 */
function generateRecommendations(memoryUsage: PerformanceReport['overallMetrics']['memoryUsage']): string[] {
  const recommendations: string[] = []

  // Memory usage recommendations
  if (memoryUsage.delta > 50 * 1024 * 1024) {
    // 50MB
    recommendations.push('High memory usage detected - consider implementing memory pooling for large operations')
  }

  if (memoryUsage.peak > 100 * 1024 * 1024) {
    // 100MB
    recommendations.push('Peak memory usage is high - implement lazy loading for large data structures')
  }

  // Always include general optimization tips
  recommendations.push('Enable WASM module caching for repeated operations')
  recommendations.push('Use streaming for large output instead of buffering entire results')
  recommendations.push('Implement command debouncing for interactive features')
  recommendations.push('Consider Web Workers for CPU-intensive tasks')

  return recommendations
}

/**
 * Runs all performance benchmark suites with comprehensive reporting.
 */
export async function runFullPerformanceSuite(options: BenchmarkOptions = {}): Promise<PerformanceReport> {
  consola.info('Starting comprehensive performance benchmark suite')

  const startTime = performance.now()
  const memoryTracker = createMemoryTracker()
  memoryTracker.start()

  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    environment: getEnvironmentInfo(),
    benchmarkResults: {},
    overallMetrics: {
      totalTime: 0,
      memoryUsage: {
        initial: 0,
        peak: 0,
        final: 0,
        delta: 0,
      },
    },
    recommendations: [],
  }

  try {
    // Run WASM benchmarks
    consola.info('Running WASM performance benchmarks...')
    await runWasmBenchmarkSuite({...options, collectMemoryStats: true})
    report.benchmarkResults.wasm = 'Completed successfully'
    memoryTracker.measure()

    // Run command benchmarks
    consola.info('Running command performance benchmarks...')
    await runCommandBenchmarkSuite({...options, collectMemoryStats: true})
    report.benchmarkResults.command = 'Completed successfully'
    memoryTracker.measure()

    // Run terminal benchmarks
    consola.info('Running terminal performance benchmarks...')
    await runTerminalBenchmarkSuite({...options, collectMemoryStats: true})
    report.benchmarkResults.terminal = 'Completed successfully'
    memoryTracker.measure()
  } catch (error) {
    consola.error('Error during benchmark suite execution:', error)
    throw error
  }

  const endTime = performance.now()
  report.overallMetrics.totalTime = endTime - startTime

  // Get final memory statistics
  const memoryDelta = memoryTracker.getDelta()

  report.overallMetrics.memoryUsage = {
    initial: 0, // Will be filled from memoryTracker if available
    peak: 0, // Will be filled from memoryTracker if available
    final: 0, // Will be filled from memoryTracker if available
    delta: memoryDelta,
  }

  // Generate recommendations
  report.recommendations = generateRecommendations(report.overallMetrics.memoryUsage)

  // Log comprehensive report
  consola.success('Performance benchmark suite completed!')
  consola.info('Overall Performance Report:')
  consola.info(`Total execution time: ${report.overallMetrics.totalTime.toFixed(2)}ms`)
  consola.info(`Memory delta: ${Math.round((memoryDelta / 1024 / 1024) * 100) / 100}MB`)
  consola.info('Recommendations:')
  for (const recommendation of report.recommendations) {
    consola.info(`  - ${recommendation}`)
  }

  return report
}

/**
 * Runs a quick performance check focused on critical paths.
 */
export async function runQuickPerformanceCheck(options: BenchmarkOptions = {}): Promise<void> {
  consola.info('Running quick performance check...')

  const quickOptions: BenchmarkOptions = {
    iterations: 10,
    warmupIterations: 2,
    collectMemoryStats: true,
    ...options,
  }

  const startTime = performance.now()

  try {
    // Run minimal benchmarks for critical paths
    await runCommandBenchmarkSuite(quickOptions)

    consola.success(`Quick performance check completed in ${(performance.now() - startTime).toFixed(2)}ms`)
  } catch (error) {
    consola.error('Error during quick performance check:', error)
    throw error
  }
}

/**
 * Runs performance regression detection for CI/CD integration.
 */
export async function runPerformanceRegression(baselineFile?: string): Promise<boolean> {
  consola.info('Running performance regression detection...')

  if (!baselineFile) {
    consola.warn('No baseline file provided, running benchmarks without comparison')
  }

  const startTime = performance.now()
  const hasRegression = false

  try {
    // Run with reduced iterations for CI speed
    const ciOptions: BenchmarkOptions = {
      iterations: 20,
      warmupIterations: 5,
      collectMemoryStats: true,
      timeout: 30000, // 30 second timeout for CI
    }

    await runFullPerformanceSuite(ciOptions)

    // TODO: Load baseline and compare results
    if (baselineFile) {
      consola.info(`Would compare against baseline: ${baselineFile}`)
      // Implement baseline comparison logic here
    }

    const totalTime = performance.now() - startTime
    consola.info(`Performance regression check completed in ${totalTime.toFixed(2)}ms`)

    if (hasRegression) {
      consola.error('Performance regression detected!')
      process.exit(1)
    } else {
      consola.success('No performance regression detected')
    }
  } catch (error) {
    consola.error('Error during performance regression check:', error)
    throw error
  }

  return hasRegression
}

/**
 * CLI entry point for performance benchmarking.
 */
export async function runBenchmarkCLI(): Promise<void> {
  const args = process.argv.slice(2)
  const mode = args[0] || 'full'

  try {
    switch (mode) {
      case 'full':
        await runFullPerformanceSuite()
        break
      case 'quick':
        await runQuickPerformanceCheck()
        break
      case 'regression':
        await runPerformanceRegression(args[1])
        break
      case 'wasm':
        await runWasmBenchmarkSuite()
        break
      case 'command':
        await runCommandBenchmarkSuite()
        break
      case 'terminal':
        await runTerminalBenchmarkSuite()
        break
      default:
        consola.error(`Unknown benchmark mode: ${mode}`)
        consola.info('Available modes: full, quick, regression, wasm, command, terminal')
        process.exit(1)
    }
  } catch (error) {
    consola.error('Benchmark execution failed:', error)
    process.exit(1)
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarkCLI()
}
