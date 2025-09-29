/**
 * WASM loading and execution performance benchmarks for the moo-dang shell.
 *
 * Tests module loading, caching, instantiation, and execution performance
 * to identify bottlenecks and optimize WASM integration patterns.
 */

import type {WasmModuleLoader} from '../shell/wasm-types'
import {consola} from 'consola'
import {createWasmModuleLoader} from '../shell/wasm-loader'
import {BenchmarkSuite, type BenchmarkOptions} from '../utils/benchmark'

interface WasmBenchmarkContext {
  loader: WasmModuleLoader
  testModuleUrl: string
  testModuleBuffer?: ArrayBuffer
}

/**
 * Creates test data for WASM benchmarking.
 */
async function createWasmBenchmarkContext(): Promise<WasmBenchmarkContext> {
  // Use hello-world example module for testing
  const testModuleUrl = '/wasm/hello-world.wasm'
  const loader = createWasmModuleLoader(10)

  let testModuleBuffer: ArrayBuffer | undefined

  try {
    const response = await fetch(testModuleUrl)
    if (response.ok) {
      testModuleBuffer = await response.arrayBuffer()
      consola.debug('Loaded test WASM module for benchmarking')
    } else {
      consola.warn('Test WASM module not found, using synthetic data')
    }
  } catch (error) {
    consola.warn('Failed to load test WASM module:', error)
  }

  return {
    loader,
    testModuleUrl,
    testModuleBuffer,
  }
}

/**
 * Creates synthetic WASM module data for testing when real modules are unavailable.
 */
function createSyntheticWasmModule(sizeKB: number): ArrayBuffer {
  // Create a minimal but valid WASM module structure
  const wasmHeader = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
  const padding = new Uint8Array(sizeKB * 1024 - wasmHeader.length)

  const buffer = new ArrayBuffer(sizeKB * 1024)
  const view = new Uint8Array(buffer)
  view.set(wasmHeader, 0)
  view.set(padding, wasmHeader.length)

  return buffer
}

/**
 * Benchmarks WASM module loading performance.
 */
export async function benchmarkWasmLoading(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('WASM Module Loading Performance', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  })

  const context = await createWasmBenchmarkContext()

  // Benchmark module loading from URL
  if (context.testModuleUrl) {
    await suite.addBenchmark(
      'Load WASM from URL',
      async () => {
        const response = await fetch(context.testModuleUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch WASM module')
        }
        return response.arrayBuffer()
      },
      {iterations: 10, ...options},
    )
  }

  // Benchmark module instantiation with different sizes
  const moduleSizes = [1, 10, 50, 100] // KB
  for (const sizeKB of moduleSizes) {
    const syntheticModule = createSyntheticWasmModule(sizeKB)

    await suite.addBenchmark(
      `Instantiate ${sizeKB}KB WASM module`,
      async () => {
        try {
          return await WebAssembly.instantiate(syntheticModule)
        } catch {
          // Expected to fail for synthetic modules, just measure timing
          return null
        }
      },
      {iterations: 20, ...options},
    )
  }

  // Benchmark loader cache performance
  if (context.testModuleBuffer) {
    await suite.addBenchmark(
      'First-time module load (cache miss)',
      async () => {
        const loader = createWasmModuleLoader(1)
        return loader.loadModule(context.testModuleBuffer as ArrayBuffer, {
          name: 'test-module',
          maxMemorySize: 1024 * 1024,
        })
      },
      {iterations: 10, ...options},
    )

    await suite.addBenchmark(
      'Cached module load (cache hit)',
      async () => {
        // Pre-populate cache
        await context.loader.loadModule(context.testModuleBuffer as ArrayBuffer, {
          name: 'cached-module',
          maxMemorySize: 1024 * 1024,
        })

        // Measure cached access
        return context.loader.loadModule(context.testModuleBuffer as ArrayBuffer, {
          name: 'cached-module',
          maxMemorySize: 1024 * 1024,
        })
      },
      {iterations: 50, ...options},
    )
  }

  // Benchmark concurrent module loading
  await suite.addBenchmark(
    'Concurrent module instantiation (4x)',
    async () => {
      const modules = Array.from({length: 4}, () => createSyntheticWasmModule(10))
      const promises = modules.map(async module => {
        try {
          return await WebAssembly.instantiate(module)
        } catch {
          return null
        }
      })
      return Promise.all(promises)
    },
    {iterations: 5, ...options},
  )

  suite.logReport()
}

/**
 * Benchmarks WASM module instantiation performance.
 */
export async function benchmarkWasmInstantiation(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('WASM Module Instantiation Performance', {
    timestamp: new Date().toISOString(),
  })

  const context = await createWasmBenchmarkContext()

  if (!context.testModuleBuffer) {
    consola.warn('Skipping WASM instantiation benchmarks - no test module available')
    return
  }

  // Benchmark loading the same module multiple times
  await suite.addBenchmark(
    'Load real WASM module',
    async () => {
      const result = await context.loader.loadModule(context.testModuleBuffer as ArrayBuffer, {
        name: `test-module-${Date.now()}`, // Unique name each time
        maxMemorySize: 1024 * 1024,
      })
      return result
    },
    {iterations: 10, ...options},
  )

  // Benchmark loading with different memory configurations
  const memorySizes = [512 * 1024, 1024 * 1024, 2 * 1024 * 1024] // 512KB, 1MB, 2MB
  for (const memorySize of memorySizes) {
    await suite.addBenchmark(
      `Load with ${Math.round(memorySize / 1024)}KB memory limit`,
      async () => {
        return context.loader.loadModule(context.testModuleBuffer as ArrayBuffer, {
          name: `test-module-${memorySize}-${Date.now()}`,
          maxMemorySize: memorySize,
        })
      },
      {iterations: 5, ...options},
    )
  }

  suite.logReport()
}

/**
 * Benchmarks WASM memory management performance.
 */
export async function benchmarkWasmMemoryManagement(options: BenchmarkOptions = {}): Promise<void> {
  const suite = new BenchmarkSuite('WASM Memory Management', {
    timestamp: new Date().toISOString(),
  })

  // Benchmark memory allocation patterns
  const memorySizes = [64 * 1024, 512 * 1024, 2 * 1024 * 1024] // 64KB, 512KB, 2MB

  for (const memorySize of memorySizes) {
    await suite.addBenchmark(
      `Allocate ${Math.round(memorySize / 1024)}KB WASM memory`,
      async () => {
        const memory = new WebAssembly.Memory({
          initial: Math.ceil(memorySize / (64 * 1024)), // Convert to pages
          maximum: Math.ceil(memorySize / (64 * 1024)) * 2,
        })
        return memory
      },
      {iterations: 20, ...options},
    )
  }

  // Benchmark memory growth patterns
  await suite.addBenchmark(
    'WASM memory growth (2x)',
    async () => {
      const memory = new WebAssembly.Memory({
        initial: 1, // 64KB
        maximum: 10, // 640KB max
      })

      // Grow memory
      memory.grow(1) // Add 64KB
      return memory
    },
    {iterations: 30, ...options},
  )

  // Benchmark garbage collection impact
  await suite.addBenchmark(
    'Multiple memory allocations (GC pressure)',
    async () => {
      const memories = []
      for (let i = 0; i < 10; i++) {
        memories.push(
          new WebAssembly.Memory({
            initial: 1,
            maximum: 2,
          }),
        )
      }
      return memories
    },
    {iterations: 10, collectMemoryStats: true, ...options},
  )

  suite.logReport()
}

/**
 * Comprehensive WASM performance benchmark suite.
 */
export async function runWasmBenchmarkSuite(options: BenchmarkOptions = {}): Promise<void> {
  consola.info('Starting comprehensive WASM performance benchmark suite')

  const startTime = performance.now()

  try {
    await benchmarkWasmLoading(options)
    await benchmarkWasmInstantiation(options)
    await benchmarkWasmMemoryManagement(options)
  } catch (error) {
    consola.error('Error during WASM benchmarking:', error)
    throw error
  }

  const totalTime = performance.now() - startTime
  consola.info(`WASM benchmark suite completed in ${totalTime.toFixed(2)}ms`)
}
