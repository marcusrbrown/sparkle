import process from 'node:process'

import {JSDocExtractor} from './extract-jsdoc.js'
import {MarkdownGenerator} from './generate-markdown.js'

/**
 * Main script that orchestrates JSDoc extraction and Markdown generation
 */
async function generateDocumentation(): Promise<void> {
  console.log('🚀 Starting automated documentation generation...')

  try {
    // Step 1: Extract JSDoc documentation from components
    console.log('\n📖 Step 1: Extracting JSDoc from @sparkle/ui components')
    const extractor = new JSDocExtractor()
    const documentation = await extractor.extractAll()
    await extractor.saveDocumentation(documentation)

    // Step 2: Generate Markdown documentation
    console.log('\n📝 Step 2: Generating Markdown documentation')
    const generator = new MarkdownGenerator()
    await generator.generateAll()

    console.log('\n🎉 Documentation generation completed successfully!')
    console.log('📄 Generated files:')
    console.log('  - src/generated/component-docs.json (extracted JSDoc data)')
    console.log('  - src/content/docs/components/*.md (Markdown documentation)')
  } catch (error) {
    console.error('\n❌ Documentation generation failed:', error)
    process.exit(1)
  }
}

// CLI execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await generateDocumentation()
}
