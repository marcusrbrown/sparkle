#!/usr/bin/env tsx
import {execSync} from 'node:child_process'
import {readdirSync, statSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {consola} from 'consola'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

interface BuildMetrics {
  totalTime: number
  bundleSize: number
  assetCount: number
  chunkCount: number
  largestChunk: {name: string; size: number}
  buildDate: string
}

interface PerformanceReport {
  metrics: BuildMetrics
  recommendations: string[]
  status: 'excellent' | 'good' | 'needs-improvement'
}

/**
 * Build performance monitoring utility for documentation site builds.
 *
 * Tracks and reports key performance metrics including:
 * - Build time
 * - Bundle sizes
 * - Asset counts
 * - Chunk distribution
 * - Performance recommendations
 */
export class BuildPerformanceMonitor {
  private distPath: string
  private startTime = 0

  constructor() {
    this.distPath = join(__dirname, '../dist')
  }

  /**
   * Starts build performance monitoring
   */
  start(): void {
    this.startTime = Date.now()
    consola.info('🚀 Starting build performance monitoring...')
  }

  /**
   * Recursively walks a directory and executes a callback for each file
   */
  private walkDirectory(dirPath: string, callback: (filePath: string, file: string, stats: any) => void): void {
    try {
      const files = readdirSync(dirPath)

      for (const file of files) {
        const filePath = join(dirPath, file)
        const stats = statSync(filePath)

        if (stats.isDirectory()) {
          this.walkDirectory(filePath, callback)
        } else {
          callback(filePath, file, stats)
        }
      }
    } catch (error) {
      consola.warn(`Failed to read directory ${dirPath}:`, error)
    }
  }

  /**
   * Analyzes build output and generates performance report
   */
  async analyze(): Promise<PerformanceReport> {
    const buildTime = Date.now() - this.startTime

    consola.info('📊 Analyzing build output...')

    const metrics: BuildMetrics = {
      totalTime: buildTime,
      bundleSize: this.calculateBundleSize(),
      assetCount: this.countAssets(),
      chunkCount: this.countChunks(),
      largestChunk: this.findLargestChunk(),
      buildDate: new Date().toISOString(),
    }

    const recommendations = this.generateRecommendations(metrics)
    const status = this.determineStatus(metrics)

    return {metrics, recommendations, status}
  }

  /**
   * Calculates total bundle size in bytes
   */
  private calculateBundleSize(): number {
    let totalSize = 0

    this.walkDirectory(this.distPath, (_filePath, _file, stats) => {
      totalSize += stats.size
    })

    return totalSize
  }

  /**
   * Counts total number of assets (excluding HTML files)
   */
  private countAssets(): number {
    let assetCount = 0

    this.walkDirectory(this.distPath, (_filePath, file, _stats) => {
      if (!file.endsWith('.html')) {
        assetCount++
      }
    })

    return assetCount
  }

  /**
   * Counts number of JavaScript chunks
   */
  private countChunks(): number {
    let chunkCount = 0

    this.walkDirectory(this.distPath, (_filePath, file, _stats) => {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        chunkCount++
      }
    })

    return chunkCount
  }

  /**
   * Finds the largest JavaScript chunk
   */
  private findLargestChunk(): {name: string; size: number} {
    let largestChunk = {name: '', size: 0}

    this.walkDirectory(this.distPath, (_filePath, file, stats) => {
      if ((file.endsWith('.js') || file.endsWith('.mjs')) && stats.size > largestChunk.size) {
        largestChunk = {name: file, size: stats.size}
      }
    })

    return largestChunk
  }

  /**
   * Generates performance recommendations based on metrics
   */
  private generateRecommendations(metrics: BuildMetrics): string[] {
    const recommendations: string[] = []

    // Build time recommendations
    if (metrics.totalTime > 120_000) {
      recommendations.push('⚠️ Build time exceeds 2 minutes - consider optimizing documentation generation scripts')
    } else if (metrics.totalTime > 60_000) {
      recommendations.push('ℹ️ Build time is acceptable but could be optimized further')
    }

    // Bundle size recommendations
    const bundleSizeMB = metrics.bundleSize / (1024 * 1024)
    if (bundleSizeMB > 50) {
      recommendations.push(
        `⚠️ Total bundle size (${bundleSizeMB.toFixed(2)}MB) is large - consider aggressive code splitting`,
      )
    } else if (bundleSizeMB > 30) {
      recommendations.push(`ℹ️ Bundle size (${bundleSizeMB.toFixed(2)}MB) is moderate - monitor for growth`)
    }

    // Chunk size recommendations
    const largestChunkMB = metrics.largestChunk.size / (1024 * 1024)
    if (largestChunkMB > 1) {
      recommendations.push(
        `⚠️ Largest chunk (${metrics.largestChunk.name}, ${largestChunkMB.toFixed(2)}MB) exceeds 1MB - consider splitting`,
      )
    }

    // Chunk count recommendations
    if (metrics.chunkCount > 100) {
      recommendations.push('⚠️ High number of chunks - consider consolidating smaller chunks')
    } else if (metrics.chunkCount < 5) {
      recommendations.push('ℹ️ Low number of chunks - ensure vendor code is properly split')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Build performance is excellent - no recommendations')
    }

    return recommendations
  }

  /**
   * Determines overall performance status
   */
  private determineStatus(metrics: BuildMetrics): 'excellent' | 'good' | 'needs-improvement' {
    const bundleSizeMB = metrics.bundleSize / (1024 * 1024)
    const largestChunkMB = metrics.largestChunk.size / (1024 * 1024)
    const buildTimeMinutes = metrics.totalTime / 60_000

    const issues = [
      buildTimeMinutes > 2,
      bundleSizeMB > 50,
      largestChunkMB > 1,
      metrics.chunkCount > 100 || metrics.chunkCount < 5,
    ]

    const issueCount = issues.filter(Boolean).length

    if (issueCount === 0) return 'excellent'
    if (issueCount <= 2) return 'good'
    return 'needs-improvement'
  }

  /**
   * Prints detailed performance report
   */
  printReport(report: PerformanceReport): void {
    const {metrics, recommendations, status} = report

    consola.box({
      title: '📊 Build Performance Report',
      message: this.formatReport(metrics, recommendations, status),
      style: {
        borderColor: status === 'excellent' ? 'green' : status === 'good' ? 'yellow' : 'red',
        borderStyle: 'rounded',
      },
    })
  }

  /**
   * Formats performance report as string
   */
  private formatReport(
    metrics: BuildMetrics,
    recommendations: string[],
    status: 'excellent' | 'good' | 'needs-improvement',
  ): string {
    const bundleSizeMB = (metrics.bundleSize / (1024 * 1024)).toFixed(2)
    const largestChunkKB = (metrics.largestChunk.size / 1024).toFixed(2)
    const buildTimeSeconds = (metrics.totalTime / 1000).toFixed(2)

    const statusEmoji = status === 'excellent' ? '🟢' : status === 'good' ? '🟡' : '🔴'

    return `
${statusEmoji} Status: ${status.toUpperCase()}

📈 Metrics:
  • Build Time: ${buildTimeSeconds}s
  • Total Bundle Size: ${bundleSizeMB}MB
  • Asset Count: ${metrics.assetCount}
  • Chunk Count: ${metrics.chunkCount}
  • Largest Chunk: ${metrics.largestChunk.name} (${largestChunkKB}KB)

💡 Recommendations:
${recommendations.map(rec => `  ${rec}`).join('\n')}

🕐 Build Date: ${new Date(metrics.buildDate).toLocaleString()}
`.trim()
  }

  /**
   * Writes performance report to CI summary (GitHub Actions)
   */
  writeCISummary(report: PerformanceReport): void {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY
    if (!summaryFile) {
      consola.debug('Not running in GitHub Actions - skipping CI summary')
      return
    }

    const {metrics, recommendations, status} = report
    const bundleSizeMB = (metrics.bundleSize / (1024 * 1024)).toFixed(2)
    const buildTimeSeconds = (metrics.totalTime / 1000).toFixed(2)

    const statusBadge = status === 'excellent' ? '🟢 Excellent' : status === 'good' ? '🟡 Good' : '🔴 Needs Improvement'

    const markdown = `
## 📊 Build Performance Report

**Status**: ${statusBadge}

### 📈 Build Metrics

| Metric | Value |
|--------|-------|
| Build Time | ${buildTimeSeconds}s |
| Total Bundle Size | ${bundleSizeMB}MB |
| Asset Count | ${metrics.assetCount} |
| Chunk Count | ${metrics.chunkCount} |
| Largest Chunk | ${metrics.largestChunk.name} (${(metrics.largestChunk.size / 1024).toFixed(2)}KB) |

### 💡 Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

---

*Build completed at ${new Date(metrics.buildDate).toLocaleString()}*
`.trim()

    try {
      execSync(`echo "${markdown}" >> "${summaryFile}"`, {encoding: 'utf8'})
      consola.success('Build performance report written to GitHub Actions summary')
    } catch (error) {
      consola.warn('Failed to write CI summary:', error)
    }
  }
}

/**
 * CLI entry point for build performance monitoring
 */
async function main() {
  const monitor = new BuildPerformanceMonitor()

  // Start monitoring
  monitor.start()

  // Run build
  consola.info('🔨 Building documentation site...')
  try {
    execSync('pnpm astro build', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      encoding: 'utf8',
    })
  } catch (error) {
    consola.error('❌ Build failed:', error)
    process.exit(1)
  }

  // Analyze and report
  const report = await monitor.analyze()
  monitor.printReport(report)
  monitor.writeCISummary(report)

  // Exit with appropriate code
  if (report.status === 'needs-improvement') {
    consola.warn('⚠️ Build performance needs improvement')
    process.exit(1)
  }

  consola.success('✅ Build performance monitoring completed')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    consola.error('💥 Build performance monitoring failed:', error)
    process.exit(1)
  })
}
