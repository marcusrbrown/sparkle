/**
 * Performance optimizations for the moo-dang shell application.
 *
 * Implements caching, memory pooling, lazy loading, and other optimization
 * strategies based on benchmark results to improve application responsiveness.
 */

import {consola} from 'consola'

/**
 * Enhanced LRU cache implementation with memory-aware eviction policies.
 */
export class OptimizedCache<T> {
  private cache = new Map<string, {value: T; timestamp: number; accessCount: number}>()
  private readonly maxSize: number
  private readonly maxAge: number
  private readonly memoryThreshold: number

  constructor(
    maxSize = 100,
    maxAge = 5 * 60 * 1000, // 5 minutes
    memoryThreshold = 50 * 1024 * 1024, // 50MB
  ) {
    this.maxSize = maxSize
    this.maxAge = maxAge
    this.memoryThreshold = memoryThreshold
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      return undefined
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return undefined
    }

    // Update access information
    entry.accessCount++
    entry.timestamp = Date.now()

    // Move to end for LRU behavior
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: string, value: T): void {
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Check memory usage and evict if necessary
    this.evictIfNecessary()

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    })

    // Ensure cache doesn't exceed max size
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  /**
   * Evicts old or less frequently used entries when memory pressure is high.
   */
  private evictIfNecessary(): void {
    const memoryUsage = this.getMemoryUsage()

    if (memoryUsage > this.memoryThreshold) {
      // Sort entries by access count and timestamp for intelligent eviction
      const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
        // Prefer evicting less frequently accessed and older entries
        const scoreA = a.accessCount + (Date.now() - a.timestamp) / 1000
        const scoreB = b.accessCount + (Date.now() - b.timestamp) / 1000
        return scoreA - scoreB
      })

      // Remove the least valuable entries (up to 25% of cache)
      const evictCount = Math.max(1, Math.floor(this.cache.size * 0.25))
      for (let i = 0; i < evictCount && i < entries.length; i++) {
        const entry = entries[i]
        if (entry) {
          this.cache.delete(entry[0])
        }
      }

      consola.debug(`Evicted ${evictCount} cache entries due to memory pressure`)
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize || 0
    }
    return 0
  }
}

/**
 * Memory pool for reducing garbage collection pressure from frequent allocations.
 */
export class ArrayBufferPool {
  private pools: Map<number, ArrayBuffer[]> = new Map()
  private readonly maxPoolSize: number

  constructor(maxPoolSize = 50) {
    this.maxPoolSize = maxPoolSize
  }

  /**
   * Gets an ArrayBuffer of the requested size from the pool or creates a new one.
   */
  get(size: number): ArrayBuffer {
    const pool = this.pools.get(size)
    if (pool && pool.length > 0) {
      const buffer = pool.pop()
      if (!buffer) {
        throw new Error('No buffer available in pool')
      }
      consola.debug(`Reused ArrayBuffer of size ${size} from pool`)
      return buffer
    }

    consola.debug(`Created new ArrayBuffer of size ${size}`)
    return new ArrayBuffer(size)
  }

  /**
   * Returns an ArrayBuffer to the pool for reuse.
   */
  release(buffer: ArrayBuffer): void {
    const size = buffer.byteLength
    let pool = this.pools.get(size)

    if (!pool) {
      pool = []
      this.pools.set(size, pool)
    }

    if (pool.length < this.maxPoolSize) {
      pool.push(buffer)
      consola.debug(`Returned ArrayBuffer of size ${size} to pool`)
    }
  }

  /**
   * Clears all pools to free memory.
   */
  clear(): void {
    this.pools.clear()
    consola.debug('Cleared all ArrayBuffer pools')
  }

  /**
   * Gets statistics about pool usage.
   */
  getStats(): Record<string, {size: number; available: number}> {
    const stats: Record<string, {size: number; available: number}> = {}

    for (const [size, pool] of this.pools) {
      stats[`${size}B`] = {
        size,
        available: pool.length,
      }
    }

    return stats
  }
}

/**
 * Optimized string processing utilities for shell operations.
 */
// Cache for path normalization
const pathNormalizationCache = new OptimizedCache<string>(500)
// Cache for command tokenization
const tokenizationCache = new OptimizedCache<string[]>(200)

export const StringProcessor = {
  /**
   * Optimized path normalization with caching.
   */
  normalizePath(path: string): string {
    const cached = pathNormalizationCache.get(path)
    if (cached) {
      return cached
    }

    let normalized = path.replaceAll('/./', '/').replaceAll(/\/[^/]+\/\.\.\//g, '/')

    // Handle multiple consecutive slashes
    normalized = normalized.replaceAll(/\/+/g, '/')

    // Handle trailing slashes
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }

    pathNormalizationCache.set(path, normalized)
    return normalized
  },

  /**
   * Optimized command line tokenization with caching.
   */
  tokenizeCommand(command: string): string[] {
    const cached = tokenizationCache.get(command)
    if (cached) {
      return cached
    }

    const tokens: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''
    let escapeNext = false

    for (const char of command) {
      if (escapeNext) {
        current += char
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true
        quoteChar = char
        continue
      }

      if (inQuotes && char === quoteChar) {
        inQuotes = false
        quoteChar = ''
        continue
      }

      if (!inQuotes && char && /\s/.test(char)) {
        if (current.length > 0) {
          tokens.push(current)
          current = ''
        }
        continue
      }

      current += char
    }

    if (current.length > 0) {
      tokens.push(current)
    }

    tokenizationCache.set(command, tokens)
    return tokens
  },

  /**
   * Clears all caches to free memory.
   */
  clearCaches(): void {
    pathNormalizationCache.clear()
    tokenizationCache.clear()
  },
}

/**
 * Lazy loading utility for deferring expensive operations until needed.
 */
export class LazyLoader<T> {
  private value?: T
  private loaded = false
  private loading = false
  private loadPromise?: Promise<T>

  constructor(private readonly factory: () => Promise<T> | T) {}

  /**
   * Gets the value, loading it if necessary.
   */
  async get(): Promise<T> {
    if (this.loaded) {
      if (this.value === undefined) {
        throw new Error('Value not loaded')
      }
      return this.value
    }

    if (this.loading) {
      if (!this.loadPromise) {
        throw new Error('Loader not initialized')
      }
      return this.loadPromise
    }

    this.loading = true

    try {
      this.loadPromise = Promise.resolve(this.factory())
      this.value = await this.loadPromise
      this.loaded = true
      return this.value
    } finally {
      this.loading = false
    }
  }

  /**
   * Checks if the value has been loaded.
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Resets the loader to allow reloading.
   */
  reset(): void {
    this.value = undefined
    this.loaded = false
    this.loading = false
    this.loadPromise = undefined
  }
}

/**
 * Debounced function executor for performance optimization.
 */
export class Debouncer {
  private timers = new Map<string, NodeJS.Timeout>()

  /**
   * Debounces a function call with the given key and delay.
   */
  debounce<T extends unknown[]>(key: string, fn: (...args: T) => void, delay: number): (...args: T) => void {
    return (...args: T) => {
      const existingTimer = this.timers.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        fn(...args)
        this.timers.delete(key)
      }, delay)

      this.timers.set(key, timer)
    }
  }

  /**
   * Cancels all pending debounced calls.
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Cancels a specific debounced call.
   */
  cancel(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }
}

/**
 * Performance monitoring utility for tracking optimization effectiveness.
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>()
  private readonly maxSamples: number

  constructor(maxSamples = 100) {
    this.maxSamples = maxSamples
  }

  /**
   * Records a timing metric.
   */
  recordTiming(key: string, duration: number): void {
    let samples = this.metrics.get(key)
    if (!samples) {
      samples = []
      this.metrics.set(key, samples)
    }

    samples.push(duration)

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift()
    }
  }

  /**
   * Gets statistics for a metric.
   */
  getStats(key: string):
    | {
        count: number
        average: number
        min: number
        max: number
        recent: number
      }
    | undefined {
    const samples = this.metrics.get(key)
    if (!samples || samples.length === 0) {
      return undefined
    }

    const average = samples.reduce((sum, val) => sum + val, 0) / samples.length
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    const recent = samples.at(-1)

    return {
      count: samples.length,
      average,
      min,
      max,
      recent: recent ?? 0,
    }
  }

  /**
   * Gets all metrics.
   */
  getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
    const allStats: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {}

    for (const key of this.metrics.keys()) {
      allStats[key] = this.getStats(key)
    }

    return allStats
  }

  /**
   * Times a function execution and records the result.
   */
  async time<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await fn()
      return result
    } finally {
      const duration = performance.now() - startTime
      this.recordTiming(key, duration)
    }
  }
}

/**
 * Global optimization instances for shared use across the application.
 */
export const globalOptimizations = {
  wasmCache: new OptimizedCache<any>(50, 10 * 60 * 1000), // 10 minute TTL for WASM modules
  commandCache: new OptimizedCache<any>(200, 2 * 60 * 1000), // 2 minute TTL for command results
  bufferPool: new ArrayBufferPool(30),
  debouncer: new Debouncer(),
  monitor: new PerformanceMonitor(200),
} as const

/**
 * Initializes performance optimizations for the application.
 */
export function initializeOptimizations(): void {
  consola.info('Initializing performance optimizations...')

  // Set up periodic cache cleanup
  setInterval(
    () => {
      pathNormalizationCache.clear()
      tokenizationCache.clear()
      consola.debug('Performed periodic cache cleanup')
    },
    5 * 60 * 1000,
  ) // Every 5 minutes

  // Set up memory pressure monitoring
  setInterval(
    () => {
      const stats = globalOptimizations.bufferPool.getStats()
      const monitorStats = globalOptimizations.monitor.getAllStats()

      consola.debug('Performance statistics:', {
        bufferPools: stats,
        timings: Object.keys(monitorStats).length,
      })
    },
    2 * 60 * 1000,
  ) // Every 2 minutes

  consola.success('Performance optimizations initialized')
}

/**
 * Cleans up optimization resources.
 */
export function cleanupOptimizations(): void {
  globalOptimizations.wasmCache.clear()
  globalOptimizations.commandCache.clear()
  globalOptimizations.bufferPool.clear()
  globalOptimizations.debouncer.cancelAll()
  pathNormalizationCache.clear()
  tokenizationCache.clear()

  consola.info('Performance optimization resources cleaned up')
}
