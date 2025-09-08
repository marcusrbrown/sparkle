import {execSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {CrossReferenceGenerator} from './cross-reference.js'
import {JSDocExtractor} from './extract-jsdoc.js'
import {MarkdownGenerator} from './generate-markdown.js'

const filename = fileURLToPath(import.meta.url)
const scriptDir = dirname(filename)

interface GenerationStep {
  name: string
  description: string
  execute: () => Promise<void>
  required: boolean
}

interface GenerationOptions {
  /** Force regeneration even if files exist */
  force?: boolean
  /** Skip API reference generation (TypeDoc) */
  skipApi?: boolean
  /** Skip component documentation generation */
  skipComponents?: boolean
  /** Verbose logging */
  verbose?: boolean
  /** Development mode (faster builds, less validation) */
  dev?: boolean
}

/**
 * Comprehensive documentation automation system that orchestrates all documentation generation processes.
 *
 * This system coordinates:
 * - TypeDoc API reference generation
 * - JSDoc component documentation extraction
 * - Markdown documentation generation
 * - Cross-reference validation
 * - Output validation and cleanup
 *
 * The automation ensures proper order of operations, handles errors gracefully,
 * and provides detailed logging for debugging issues.
 */
export class DocumentationAutomator {
  private options: GenerationOptions
  private startTime = 0
  private generatedFiles: string[] = []

  constructor(options: GenerationOptions = {}) {
    this.options = {
      force: false,
      skipApi: false,
      skipComponents: false,
      verbose: false,
      dev: false,
      ...options,
    }
  }

  /**
   * Runs the complete documentation generation pipeline
   */
  async generateAll(): Promise<void> {
    this.startTime = Date.now()
    console.log('🚀 Starting comprehensive documentation generation...')
    console.log(`⚙️  Options: ${JSON.stringify(this.options, null, 2)}`)

    try {
      // Define generation steps in order of execution
      const steps: GenerationStep[] = [
        {
          name: 'validate-environment',
          description: 'Validate environment and dependencies',
          execute: () => this.validateEnvironment(),
          required: true,
        },
        {
          name: 'cleanup-previous',
          description: 'Clean up previous generated files if forced',
          execute: () => this.cleanupPrevious(),
          required: false,
        },
        {
          name: 'generate-api-docs',
          description: 'Generate TypeScript API reference documentation',
          execute: () => this.generateApiDocs(),
          required: !this.options.skipApi,
        },
        {
          name: 'extract-component-docs',
          description: 'Extract JSDoc documentation from components',
          execute: () => this.extractComponentDocs(),
          required: !this.options.skipComponents,
        },
        {
          name: 'generate-component-markdown',
          description: 'Generate Markdown files from component documentation',
          execute: () => this.generateComponentMarkdown(),
          required: !this.options.skipComponents,
        },
        {
          name: 'generate-cross-references',
          description: 'Generate cross-reference links between documentation sections',
          execute: () => this.generateCrossReferences(),
          required: false,
        },
        {
          name: 'validate-output',
          description: 'Validate generated documentation files',
          execute: () => this.validateOutput(),
          required: true,
        },
        {
          name: 'format-output',
          description: 'Format generated documentation files',
          execute: () => this.formatOutput(),
          required: true,
        },
      ]

      // Execute steps sequentially
      for (const step of steps) {
        if (!step.required && this.shouldSkipStep(step.name)) {
          this.log(`⏭️  Skipping ${step.name}: ${step.description}`)
          continue
        }

        console.log(`\n🔄 ${step.name}: ${step.description}`)
        const stepStart = Date.now()

        try {
          await step.execute()
          const stepTime = Date.now() - stepStart
          console.log(`✅ ${step.name} completed in ${stepTime}ms`)
        } catch (error) {
          const stepTime = Date.now() - stepStart
          console.error(`❌ ${step.name} failed after ${stepTime}ms:`, error)

          if (step.required) {
            throw new Error(`Required step '${step.name}' failed: ${error}`)
          } else {
            console.warn(`⚠️  Optional step '${step.name}' failed, continuing...`)
          }
        }
      }

      await this.printSummary()
    } catch (error) {
      const totalTime = Date.now() - this.startTime
      console.error(`\n💥 Documentation generation failed after ${totalTime}ms:`, error)
      process.exit(1)
    }
  }

  /**
   * Validates that the environment is ready for documentation generation
   */
  private async validateEnvironment(): Promise<void> {
    this.log('Validating environment...')

    // Check that required source packages exist
    const requiredPaths = [
      join(scriptDir, '../../packages/ui/src'),
      join(scriptDir, '../../packages/types/src'),
      join(scriptDir, '../../packages/utils/src'),
      join(scriptDir, '../../packages/theme/src'),
      join(scriptDir, '../../packages/error-testing/src'),
    ]

    for (const path of requiredPaths) {
      if (!existsSync(path)) {
        throw new Error(`Required source directory not found: ${path}`)
      }
    }

    // Check that output directories can be created
    const outputPaths = [
      join(scriptDir, '../src/content/docs/api'),
      join(scriptDir, '../src/content/docs/components'),
      join(scriptDir, '../src/generated'),
    ]

    for (const path of outputPaths) {
      try {
        if (!existsSync(path)) {
          const {mkdirSync} = await import('node:fs')
          mkdirSync(path, {recursive: true})
        }
      } catch (error) {
        throw new Error(`Cannot create output directory ${path}: ${error}`)
      }
    }

    this.log('Environment validation completed')
  }

  /**
   * Cleans up previously generated files if force option is enabled
   */
  private async cleanupPrevious(): Promise<void> {
    if (!this.options.force) {
      this.log('Skipping cleanup (force option not enabled)')
      return
    }

    this.log('Cleaning up previous generated files...')

    const cleanupPaths = [
      join(scriptDir, '../src/content/docs/api'),
      join(scriptDir, '../src/content/docs/components'),
      join(scriptDir, '../src/generated/component-docs.json'),
    ]

    const {rmSync} = await import('node:fs')

    for (const path of cleanupPaths) {
      if (existsSync(path)) {
        try {
          rmSync(path, {recursive: true, force: true})
          this.log(`Removed ${path}`)
        } catch (error) {
          console.warn(`⚠️  Failed to remove ${path}:`, error)
        }
      }
    }
  }

  /**
   * Generates TypeScript API reference documentation using TypeDoc
   */
  private async generateApiDocs(): Promise<void> {
    this.log('Generating TypeScript API reference...')

    try {
      const command = this.options.dev ? 'pnpm docs:api' : 'pnpm docs:api'
      execSync(command, {
        cwd: join(scriptDir, '..'),
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
      })

      // Verify API docs were generated
      const apiDocsPath = join(scriptDir, '../src/content/docs/api')
      if (!existsSync(apiDocsPath)) {
        throw new Error('API documentation directory was not created')
      }

      this.generatedFiles.push('API reference documentation')
      this.log('TypeScript API reference generated successfully')
    } catch (error) {
      throw new Error(`TypeDoc generation failed: ${error}`)
    }
  }

  /**
   * Extracts JSDoc documentation from UI components
   */
  private async extractComponentDocs(): Promise<void> {
    this.log('Extracting JSDoc from components...')

    const extractor = new JSDocExtractor()
    const documentation = await extractor.extractAll()

    if (documentation.length === 0) {
      console.warn('⚠️  No component documentation extracted')
      return
    }

    await extractor.saveDocumentation(documentation)
    this.generatedFiles.push(`${documentation.length} component documentation entries`)
    this.log(`Extracted documentation for ${documentation.length} components`)
  }

  /**
   * Generates Markdown documentation from extracted component data
   */
  private async generateComponentMarkdown(): Promise<void> {
    this.log('Generating component Markdown documentation...')

    const generator = new MarkdownGenerator()
    await generator.generateAll()

    this.generatedFiles.push('Component Markdown documentation')
    this.log('Component Markdown documentation generated')
  }

  /**
   * Generates cross-reference links between documentation sections
   */
  private async generateCrossReferences(): Promise<void> {
    this.log('Generating cross-references...')

    try {
      const crossRefGenerator = new CrossReferenceGenerator({
        verbose: this.options.verbose,
      })
      await crossRefGenerator.generateAll()

      this.generatedFiles.push('Cross-reference links and related components')
      this.log('Cross-reference generation completed')
    } catch (error) {
      throw new Error(`Cross-reference generation failed: ${error}`)
    }
  }

  /**
   * Validates that all expected output files were generated correctly
   */
  private async validateOutput(): Promise<void> {
    this.log('Validating generated output...')

    const expectedFiles = [
      join(scriptDir, '../src/content/docs/components/index.md'),
      join(scriptDir, '../src/generated/component-docs.json'),
    ]

    // Only check API docs if we didn't skip them
    if (!this.options.skipApi) {
      expectedFiles.push(join(scriptDir, '../src/content/docs/api/README.md'))
    }

    const missingFiles: string[] = []
    for (const file of expectedFiles) {
      if (!existsSync(file)) {
        missingFiles.push(file)
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing expected output files: ${missingFiles.join(', ')}`)
    }

    this.log('Output validation completed - all expected files present')
  }

  /**
   * Format generated documentation files
   */
  private async formatOutput(): Promise<void> {
    this.log('Formatting generated documentation...')

    try {
      const command = 'pnpm docs:format'
      execSync(command, {
        cwd: join(scriptDir, '..'),
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
      })

      this.log('Generated documentation formatted successfully')
    } catch (error) {
      throw new Error(`Documentation formatting failed: ${error}`)
    }
  }

  /**
   * Determines if a step should be skipped based on options and existing files
   */
  private shouldSkipStep(stepName: string): boolean {
    if (this.options.force) {
      return false // Never skip if force is enabled
    }

    // Skip API generation if files exist and not forced
    if (stepName === 'generate-api-docs' && !this.options.force) {
      const apiDocsPath = join(scriptDir, '../src/content/docs/api/README.md')
      return existsSync(apiDocsPath)
    }

    return false
  }

  /**
   * Prints a summary of the generation process
   */
  private async printSummary(): Promise<void> {
    const totalTime = Date.now() - this.startTime
    console.log('\n🎉 Documentation generation completed successfully!')
    console.log(`⏱️  Total time: ${totalTime}ms`)
    console.log(`📄 Generated content:`)

    for (const file of this.generatedFiles) {
      console.log(`   - ${file}`)
    }

    console.log('\n📍 Output locations:')
    console.log('   - API Reference: src/content/docs/api/')
    console.log('   - Component Docs: src/content/docs/components/')
    console.log('   - Raw Data: src/generated/component-docs.json')
  }

  /**
   * Logs a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`  🔍 ${message}`)
    }
  }
}

/**
 * CLI interface for the documentation automation system
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const options: GenerationOptions = {
    force: args.includes('--force'),
    skipApi: args.includes('--skip-api'),
    skipComponents: args.includes('--skip-components'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    dev: args.includes('--dev'),
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Automation Tool

Usage: tsx scripts/automation.ts [options]

Options:
  --force              Force regeneration of all files
  --skip-api           Skip TypeScript API reference generation
  --skip-components    Skip component documentation generation
  --verbose, -v        Enable verbose logging
  --dev                Development mode (faster builds)
  --help, -h           Show this help message

Examples:
  tsx scripts/automation.ts                    # Generate all documentation
  tsx scripts/automation.ts --force            # Force regenerate everything
  tsx scripts/automation.ts --skip-api -v      # Skip API docs, verbose output
  tsx scripts/automation.ts --dev              # Development mode
`)
    return
  }

  const automator = new DocumentationAutomator(options)
  await automator.generateAll()
}

// CLI execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
