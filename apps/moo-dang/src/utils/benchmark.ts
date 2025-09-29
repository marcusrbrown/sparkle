/**
 * Performance benchmarking utilities for the moo-dang shell application.
 *
 * Provides comprehensive timing, memory, and performance measurement tools
 * optimized for browser-based shell environment testing and optimization.
 */

import {consola} from 'consola'

export interface BenchmarkOptions {
  /** Number of iterations to run for statistical accuracy */
  iterations?: number
  /** Warmup iterations to exclude from timing results */
  warmupIterations?: number
  /** Whether to collect memory usage statistics */
  collectMemoryStats?: boolean
  /** Whether to force garbage collection before measurements */
  forceGC?: boolean
  /** Timeout in milliseconds for long-running benchmarks */
  timeout?: number
}

export interface BenchmarkResult {
  /** Test name for identification */
  name: string
  /** Number of successful iterations completed */
  iterations: number
  /** Total execution time in milliseconds */
  totalTime: number
  /** Average time per iteration in milliseconds */
  averageTime: number
  /** Minimum execution time in milliseconds */
  minTime: number
  /** Maximum execution time in milliseconds */
  maxTime: number
  /** Standard deviation of execution times */
  standardDeviation: number
  /** Operations per second (iterations/second) */
  operationsPerSecond: number
  /** Memory statistics if collected */
  memoryStats?: BenchmarkMemoryStats
  /** Additional metadata */
  metadata: Record<string, unknown>
}

export interface BenchmarkMemoryStats {
  /** Initial memory usage in bytes */
  initialMemory: number
  /** Peak memory usage during benchmark */
  peakMemory: number
  /** Final memory usage after benchmark */
  finalMemory: number
  /** Memory allocated during benchmark */
  memoryDelta: number
  /** Number of garbage collections triggered */
  gcCount: number
}

export interface BenchmarkSuiteData {
  /** Suite name for reporting */
  name: string
  /** Individual benchmark results */
  results: BenchmarkResult[]
  /** Suite-wide metadata */
  metadata: Record<string, unknown>
  /** Total suite execution time */
  totalTime: number
}

/**
 * Default benchmark configuration optimized for browser environment.
 */
const DEFAULT_BENCHMARK_OPTIONS: Required<BenchmarkOptions> = {
  iterations: 100,
  warmupIterations: 10,
  collectMemoryStats: true,
  forceGC: false,
  timeout: 30000, // 30 seconds
} as const

/**
 * Extended Performance interface with memory information.
 */
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
}

/**
 * Measures memory usage if Performance API is available.
 */
function measureMemoryUsage(): number {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as PerformanceWithMemory).memory
    return memory?.usedJSHeapSize ?? 0
  }
  return 0
}

/**
 * Forces garbage collection if available in the environment.
 */
function forceGarbageCollection(): void {
  if (typeof globalThis !== 'undefined' && 'gc' in globalThis) {
    const globalWithGC = globalThis as typeof globalThis & {gc?: () => void}
    globalWithGC.gc?.()
  }
}

/**
 * Calculates statistical metrics for timing measurements.
 */
function calculateStatistics(times: number[]): {
  average: number
  min: number
  max: number
  standardDeviation: number
} {
  const average = times.reduce((sum, time) => sum + time, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  const variance = times.reduce((sum, time) => sum + (time - average) ** 2, 0) / times.length
  const standardDeviation = Math.sqrt(variance)

  return {average, min, max, standardDeviation}
}

/**
 * Runs a single benchmark with comprehensive timing and memory measurement.
 *
 * @param name - Descriptive name for the benchmark
 * @param testFunction - Function to benchmark (sync or async)
 * @param options - Benchmark configuration options
 * @returns Comprehensive benchmark results with timing and memory stats
 */
export async function benchmark<T = void>(
  name: string,
  testFunction: () => T | Promise<T>,
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const config = {...DEFAULT_BENCHMARK_OPTIONS, ...options}

  consola.debug(`Starting benchmark: ${name} (${config.iterations} iterations)`)

  const times: number[] = []
  const memoryReadings: number[] = []
  let initialMemory = 0
  let peakMemory = 0
  let finalMemory = 0
  const gcCount = 0

  // Force garbage collection before starting if requested
  if (config.forceGC) {
    forceGarbageCollection()
  }

  // Measure initial memory
  if (config.collectMemoryStats) {
    initialMemory = measureMemoryUsage()
    peakMemory = initialMemory
  }

  const benchmarkStartTime = performance.now()

  // Warmup iterations
  for (let i = 0; i < config.warmupIterations; i++) {
    await testFunction()
  }

  // Actual benchmark iterations
  for (let i = 0; i < config.iterations; i++) {
    const startTime = performance.now()

    try {
      await testFunction()
    } catch (error) {
      consola.error(`Benchmark iteration ${i} failed:`, error)
      continue
    }

    const endTime = performance.now()
    const iterationTime = endTime - startTime

    times.push(iterationTime)

    // Memory measurement
    if (config.collectMemoryStats) {
      const currentMemory = measureMemoryUsage()
      memoryReadings.push(currentMemory)
      peakMemory = Math.max(peakMemory, currentMemory)
    }

    // Check for timeout
    if (performance.now() - benchmarkStartTime > config.timeout) {
      consola.warn(`Benchmark ${name} timed out after ${i + 1} iterations`)
      break
    }
  }

  // Final memory measurement
  if (config.collectMemoryStats) {
    finalMemory = measureMemoryUsage()
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0)
  const {average, min, max, standardDeviation} = calculateStatistics(times)
  const operationsPerSecond = times.length > 0 ? 1000 / average : 0

  const result: BenchmarkResult = {
    name,
    iterations: times.length,
    totalTime,
    averageTime: average,
    minTime: min,
    maxTime: max,
    standardDeviation,
    operationsPerSecond,
    metadata: {
      warmupIterations: config.warmupIterations,
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
    },
  }

  if (config.collectMemoryStats && memoryReadings.length > 0) {
    result.memoryStats = {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryDelta: finalMemory - initialMemory,
      gcCount,
    }
  }

  consola.debug(`Benchmark completed: ${name}`, {
    avgTime: `${average.toFixed(2)}ms`,
    ops: `${operationsPerSecond.toFixed(0)} ops/sec`,
    iterations: times.length,
  })

  return result
}

/**
 * Compares execution speed between two functions.
 */
export async function compareBenchmark<T = void>(
  name: string,
  testA: {name: string; fn: () => T | Promise<T>},
  testB: {name: string; fn: () => T | Promise<T>},
  options: BenchmarkOptions = {},
): Promise<{
  comparison: string
  resultA: BenchmarkResult
  resultB: BenchmarkResult
  speedupFactor: number
}> {
  const resultA = await benchmark(`${name} - ${testA.name}`, testA.fn, options)
  const resultB = await benchmark(`${name} - ${testB.name}`, testB.fn, options)

  const speedupFactor = resultA.averageTime / resultB.averageTime
  const fasterTest = speedupFactor > 1 ? testB.name : testA.name
  const slowerTest = speedupFactor > 1 ? testA.name : testB.name
  const factor = Math.abs(speedupFactor)

  const comparison = `${fasterTest} is ${factor.toFixed(2)}x faster than ${slowerTest}`

  return {
    comparison,
    resultA,
    resultB,
    speedupFactor,
  }
}

/**
 * Creates and manages a suite of related benchmarks.
 */
export class BenchmarkSuite {
  private results: BenchmarkResult[] = []
  private readonly metadata: Record<string, unknown> = {}
  private readonly startTime = performance.now()

  constructor(
    private readonly name: string,
    metadata: Record<string, unknown> = {},
  ) {
    this.metadata = {...metadata}
    consola.info(`Starting benchmark suite: ${name}`)
  }

  /**
   * Adds a benchmark to the suite.
   */
  async addBenchmark<T = void>(
    name: string,
    testFunction: () => T | Promise<T>,
    options: BenchmarkOptions = {},
  ): Promise<BenchmarkResult> {
    const result = await benchmark(name, testFunction, options)
    this.results.push(result)
    return result
  }

  /**
   * Adds a comparison benchmark to the suite.
   */
  async addComparison<T = void>(
    name: string,
    testA: {name: string; fn: () => T | Promise<T>},
    testB: {name: string; fn: () => T | Promise<T>},
    options: BenchmarkOptions = {},
  ): Promise<{
    comparison: string
    resultA: BenchmarkResult
    resultB: BenchmarkResult
    speedupFactor: number
  }> {
    const comparison = await compareBenchmark(name, testA, testB, options)
    this.results.push(comparison.resultA, comparison.resultB)
    return comparison
  }

  /**
   * Gets the complete suite results.
   */
  getResults(): BenchmarkSuiteData {
    const totalTime = performance.now() - this.startTime

    return {
      name: this.name,
      results: [...this.results],
      metadata: {...this.metadata},
      totalTime,
    }
  }

  /**
   * Generates a formatted report of all benchmark results.
   */
  generateReport(): string {
    const suite = this.getResults()
    const lines: string[] = []

    lines.push(`\n=== Benchmark Suite: ${suite.name} ===`)
    lines.push(`Total Suite Time: ${suite.totalTime.toFixed(2)}ms`)
    lines.push(`Total Benchmarks: ${suite.results.length}`)
    lines.push('')

    for (const result of suite.results) {
      lines.push(`${result.name}:`)
      lines.push(`  Iterations: ${result.iterations}`)
      lines.push(`  Average: ${result.averageTime.toFixed(2)}ms`)
      lines.push(`  Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms`)
      lines.push(`  Std Dev: ${result.standardDeviation.toFixed(2)}ms`)
      lines.push(`  Ops/sec: ${result.operationsPerSecond.toFixed(0)}`)

      if (result.memoryStats) {
        lines.push(`  Memory Delta: ${result.memoryStats.memoryDelta} bytes`)
        lines.push(`  Peak Memory: ${result.memoryStats.peakMemory} bytes`)
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Logs the benchmark suite report to console.
   */
  logReport(): void {
    const report = this.generateReport()
    consola.info(report)
  }
}

/**
 * Utility for measuring async operation performance with timeout handling.
 */
export async function measureAsyncOperation<T>(
  operation: () => Promise<T>,
  timeoutMs = 5000,
): Promise<{result: T; duration: number} | {error: Error; duration: number}> {
  const startTime = performance.now()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    const result = await Promise.race([operation(), timeoutPromise])
    const duration = performance.now() - startTime

    return {result, duration}
  } catch (error) {
    const duration = performance.now() - startTime
    return {error: error as Error, duration}
  }
}

/**
 * Creates a memory usage tracker for monitoring resource consumption.
 */
export function createMemoryTracker(): {
  start: () => void
  measure: () => number
  getDelta: () => number
  getReport: () => string
} {
  let initialMemory = 0
  let measurements: {timestamp: number; memory: number}[] = []

  return {
    start() {
      initialMemory = measureMemoryUsage()
      measurements = []
    },

    measure() {
      const memory = measureMemoryUsage()
      measurements.push({
        timestamp: performance.now(),
        memory,
      })
      return memory
    },

    getDelta() {
      const currentMemory = measureMemoryUsage()
      return currentMemory - initialMemory
    },

    getReport() {
      const currentMemory = measureMemoryUsage()
      const delta = currentMemory - initialMemory
      const maxMemory = Math.max(...measurements.map(m => m.memory), currentMemory)

      return [
        `Memory Report:`,
        `  Initial: ${initialMemory} bytes`,
        `  Current: ${currentMemory} bytes`,
        `  Delta: ${delta} bytes`,
        `  Peak: ${maxMemory} bytes`,
        `  Measurements: ${measurements.length}`,
      ].join('\n')
    },
  }
}
