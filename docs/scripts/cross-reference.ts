import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const filename = fileURLToPath(import.meta.url)
const scriptDir = dirname(filename)

interface CrossReferenceOptions {
  /** Verbose logging */
  verbose?: boolean
}

interface ComponentRelationship {
  from: string
  to: string
  type: 'related' | 'parent' | 'child' | 'variant'
  description?: string
}

interface CrossReference {
  sourceFile: string
  githubUrl: string
  apiDocUrl?: string
  relatedComponents: ComponentRelationship[]
}

/**
 * Generates cross-reference links between documentation sections and source code.
 *
 * This system creates:
 * - Links from component documentation to GitHub source code
 * - Cross-references between related components (e.g., Form components)
 * - Links from component docs to API documentation
 * - "See also" sections with related components
 */
export class CrossReferenceGenerator {
  private options: CrossReferenceOptions
  private scriptDir: string
  private componentData: any[]
  private readonly githubBaseUrl = 'https://github.com/marcusrbrown/sparkle/blob/main'

  constructor(options: CrossReferenceOptions = {}) {
    this.options = {
      verbose: false,
      ...options,
    }
    this.scriptDir = scriptDir
    this.componentData = []
  }

  /**
   * Generates all cross-references for the documentation
   */
  async generateAll(): Promise<void> {
    this.log('Loading component data...')
    await this.loadComponentData()

    this.log('Analyzing component relationships...')
    const relationships = this.analyzeComponentRelationships()

    this.log('Generating cross-references...')
    const crossReferences = this.generateCrossReferences(relationships)

    this.log('Updating documentation files...')
    await this.updateDocumentationFiles(crossReferences)

    this.log('Cross-reference generation completed')
  }

  /**
   * Loads component data from the generated JSON file
   */
  private async loadComponentData(): Promise<void> {
    const componentDataPath = join(this.scriptDir, '../src/generated/component-docs.json')

    if (!existsSync(componentDataPath)) {
      throw new Error(`Component data file not found: ${componentDataPath}`)
    }

    const rawData = readFileSync(componentDataPath, 'utf-8')
    this.componentData = JSON.parse(rawData)
    this.log(`Loaded ${this.componentData.length} components`)
  }

  /**
   * Analyzes relationships between components based on naming patterns and props
   */
  private analyzeComponentRelationships(): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = []

    for (const component of this.componentData) {
      const componentName = component.name

      // Form component relationships
      if (componentName.startsWith('Form') && componentName !== 'Form') {
        relationships.push({
          from: componentName,
          to: 'Form',
          type: 'parent',
          description: 'Used within Form components for structured form layouts',
        })

        // Add reciprocal relationship
        relationships.push({
          from: 'Form',
          to: componentName,
          type: 'child',
          description: `Child component for ${componentName.replace('Form', '').toLowerCase()} functionality`,
        })
      }

      // FormField specific relationships - it's used by many form input components
      if (componentName.startsWith('Form') && componentName !== 'Form' && componentName !== 'FormField') {
        relationships.push({
          from: componentName,
          to: 'FormField',
          type: 'related',
          description: 'Often used together with FormField for complete form field structure',
        })
      }

      // Button variants (if any semantic props exist)
      if (component.props?.some((prop: any) => prop.name === 'semantic')) {
        relationships.push({
          from: componentName,
          to: 'Button',
          type: 'variant',
          description: 'Shares semantic color variants for consistent theming',
        })
      }
    }

    // Group related form input components
    const formInputComponents = this.componentData
      .filter(c => ['FormInput', 'FormPassword', 'FormTextarea', 'FormSelect'].includes(c.name))
      .map(c => c.name)

    for (const component of formInputComponents) {
      for (const relatedComponent of formInputComponents) {
        if (component !== relatedComponent) {
          relationships.push({
            from: component,
            to: relatedComponent,
            type: 'related',
            description: 'Alternative form input component',
          })
        }
      }
    }

    this.log(`Found ${relationships.length} component relationships`)
    return relationships
  }

  /**
   * Generates cross-reference data for each component
   */
  private generateCrossReferences(relationships: ComponentRelationship[]): Map<string, CrossReference> {
    const crossReferences = new Map<string, CrossReference>()

    for (const component of this.componentData) {
      const componentName = component.name
      const filePath = component.filePath

      // Generate GitHub source URL
      const githubUrl = `${this.githubBaseUrl}/packages/ui/src/${filePath}`

      // Generate API documentation URL
      const apiDocUrl = `/api/ui/src#${componentName.toLowerCase()}`

      // Find related components
      const relatedComponents = relationships.filter(rel => rel.from === componentName)

      crossReferences.set(componentName, {
        sourceFile: filePath,
        githubUrl,
        apiDocUrl,
        relatedComponents,
      })
    }

    return crossReferences
  }

  /**
   * Updates documentation files with cross-reference information
   */
  private async updateDocumentationFiles(crossReferences: Map<string, CrossReference>): Promise<void> {
    const componentsDir = join(this.scriptDir, '../src/content/docs/components')

    for (const [componentName, crossRef] of crossReferences) {
      const fileName = `${componentName
        .replaceAll(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')}.md`
      const filePath = join(componentsDir, fileName)

      if (!existsSync(filePath)) {
        this.log(`Warning: Documentation file not found for ${componentName}: ${filePath}`)
        continue
      }

      try {
        await this.updateComponentDocumentation(filePath, componentName, crossRef)
        this.log(`Updated cross-references for ${componentName}`)
      } catch (error) {
        console.warn(`Failed to update cross-references for ${componentName}:`, error)
      }
    }
  }

  /**
   * Updates a single component documentation file with cross-references
   */
  private async updateComponentDocumentation(
    filePath: string,
    componentName: string,
    crossRef: CrossReference,
  ): Promise<void> {
    let content = readFileSync(filePath, 'utf-8')

    // Add source code section if not present
    if (!content.includes('## Source Code')) {
      const sourceSection = this.generateSourceCodeSection(crossRef)

      // Insert at the end
      content = `${content}\n\n${sourceSection}`
    }

    // Add related components section if not present and there are related components
    if (crossRef.relatedComponents.length > 0 && !content.includes('## Related Components')) {
      const relatedSection = this.generateRelatedComponentsSection(crossRef.relatedComponents)
      content = `${content}\n\n${relatedSection}`
    }

    // Add API reference section if not present
    if (!content.includes('## API Reference')) {
      const apiSection = this.generateApiReferenceSection(crossRef)
      content = `${content}\n\n${apiSection}`
    }

    writeFileSync(filePath, content)
  }

  /**
   * Generates the source code section
   */
  private generateSourceCodeSection(crossRef: CrossReference): string {
    return `## Source Code

View the source code for this component on GitHub:

- [${crossRef.sourceFile}](${crossRef.githubUrl})`
  }

  /**
   * Generates the related components section
   */
  private generateRelatedComponentsSection(relationships: ComponentRelationship[]): string {
    const sections = new Map<string, ComponentRelationship[]>()

    // Group relationships by type
    for (const rel of relationships) {
      if (!sections.has(rel.type)) {
        sections.set(rel.type, [])
      }
      const typeSection = sections.get(rel.type)
      if (typeSection) {
        typeSection.push(rel)
      }
    }

    let content = '## Related Components\n\n'

    for (const [type, rels] of sections) {
      const typeTitle = this.getRelationshipTypeTitle(type)
      content += `### ${typeTitle}\n\n`

      for (const rel of rels) {
        const componentLink = this.getComponentDocLink(rel.to)
        content += `- [${rel.to}](${componentLink})`

        if (rel.description) {
          content += ` - ${rel.description}`
        }
        content += '\n'
      }
      content += '\n'
    }

    return content.trim()
  }

  /**
   * Generates the API reference section
   */
  private generateApiReferenceSection(crossRef: CrossReference): string {
    return `## API Reference

For detailed TypeScript definitions and additional API information, see:

- [API Documentation](${crossRef.apiDocUrl})`
  }

  /**
   * Gets a human-readable title for relationship types
   */
  private getRelationshipTypeTitle(type: string): string {
    switch (type) {
      case 'parent':
        return 'Parent Components'
      case 'child':
        return 'Child Components'
      case 'related':
        return 'Related Components'
      case 'variant':
        return 'Variant Components'
      default:
        return 'Related Components'
    }
  }

  /**
   * Gets the documentation link for a component
   */
  private getComponentDocLink(componentName: string): string {
    const fileName = componentName
      .replaceAll(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
    return `/components/${fileName}`
  }

  /**
   * Logs a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`  🔗 ${message}`)
    }
  }
}

/**
 * CLI interface for the cross-reference generator
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const options: CrossReferenceOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Cross-Reference Generator

Usage: tsx scripts/cross-reference.ts [options]

Options:
  --verbose, -v        Enable verbose logging
  --help, -h           Show this help message

Examples:
  tsx scripts/cross-reference.ts                    # Generate cross-references
  tsx scripts/cross-reference.ts --verbose          # Generate with verbose output
`)
    return
  }

  const generator = new CrossReferenceGenerator(options)

  try {
    console.log('🔗 Starting cross-reference generation...')
    await generator.generateAll()
    console.log('🎉 Cross-reference generation completed successfully!')
  } catch (error) {
    console.error('❌ Cross-reference generation failed:', error)
    process.exit(1)
  }
}

// CLI execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
