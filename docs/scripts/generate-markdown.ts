import type {Annotation} from 'doctrine'

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {consola} from 'consola'

const filename = fileURLToPath(import.meta.url)
const scriptDir = dirname(filename)

interface ComponentDocumentation {
  /** Component name */
  name: string
  /** File path relative to packages/ui/src */
  filePath: string
  /** Component description from JSDoc */
  description?: string
  /** JSDoc tags and examples */
  jsdoc?: Annotation
  /** Component props interface documentation */
  props?: PropDocumentation[]
  /** Usage examples extracted from JSDoc */
  examples?: string[]
  /** Whether this is the default export */
  isDefault: boolean
}

interface PropDocumentation {
  /** Property name */
  name: string
  /** TypeScript type */
  type: string
  /** Whether the prop is required */
  required: boolean
  /** Default value if any */
  defaultValue?: string
  /** JSDoc description */
  description?: string
}

/**
 * Generates Markdown documentation from extracted JSDoc component data
 */
export class MarkdownGenerator {
  private outputPath: string
  private componentDocs: ComponentDocumentation[]

  constructor(componentDocsPath?: string) {
    this.outputPath = join(scriptDir, '../src/content/docs/components')

    // Load component documentation from JSON file
    const docsPath = componentDocsPath || join(scriptDir, '../src/generated/component-docs.json')

    if (!existsSync(docsPath)) {
      throw new Error(`Component documentation file not found: ${docsPath}`)
    }

    const docsContent = readFileSync(docsPath, 'utf-8')
    this.componentDocs = JSON.parse(docsContent) as ComponentDocumentation[]

    // Ensure output directory exists
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, {recursive: true})
    }
  }

  /**
   * Generates markdown documentation for all components
   */
  async generateAll(): Promise<void> {
    consola.info('📝 Generating Markdown documentation from JSDoc...')

    // Generate index page for components
    await this.generateComponentIndex()

    // Generate individual component pages
    let generatedCount = 0
    for (const componentDoc of this.componentDocs) {
      try {
        await this.generateComponentPage(componentDoc)
        generatedCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.warn(`⚠️  Failed to generate documentation for ${componentDoc.name}: ${errorMessage}`)
      }
    }

    consola.success(`✅ Generated ${generatedCount} component documentation pages`)
  }

  /**
   * Generates the main components index page
   */
  private async generateComponentIndex(): Promise<void> {
    const content = this.buildComponentIndexContent()
    const outputFile = join(this.outputPath, 'index.md')

    writeFileSync(outputFile, content)
    consola.info(`📄 Generated components index: ${outputFile}`)
  }

  /**
   * Generates documentation page for a single component
   */
  private async generateComponentPage(componentDoc: ComponentDocumentation): Promise<void> {
    const content = this.buildComponentPageContent(componentDoc)
    const filename = this.getComponentFilename(componentDoc.name)
    const outputFile = join(this.outputPath, filename)

    writeFileSync(outputFile, content)
    consola.info(`📄 Generated component page: ${outputFile}`)
  }

  /**
   * Builds the content for the components index page
   * @returns Markdown content for the index page
   */
  private buildComponentIndexContent(): string {
    const sortedComponents = [...this.componentDocs].sort((a, b) => a.name.localeCompare(b.name))

    const componentList = sortedComponents
      .map(component => {
        // Normalize description to single line for index
        const description = component.description
          ? component.description.replaceAll('\n', ' ').replaceAll(/\s+/g, ' ').trim()
          : 'No description available'
        const link = this.getComponentFilename(component.name).replace('.md', '')
        return `- [${component.name}](./${link}) - ${description}`
      })
      .join('\n')

    return `---
title: UI Components
description: Complete reference for all Sparkle UI components
---

# UI Components

This section contains documentation for all components in the \`@sparkle/ui\` package. Each component includes detailed API documentation, usage examples, and interactive demos.

## Available Components

${componentList}

## Getting Started

To use any of these components in your project:

\`\`\`bash
pnpm add @sparkle/ui @sparkle/theme
\`\`\`

\`\`\`tsx
import { Button } from '@sparkle/ui'
import '@sparkle/ui/styles.css'

export function MyComponent() {
  return <Button variant="primary">Click me</Button>
}
\`\`\`

## Component Patterns

All Sparkle UI components follow these patterns:

- **Theme Integration**: Components use CSS custom properties from \`@sparkle/theme\`
- **Accessibility**: Built with accessibility best practices and ARIA support
- **TypeScript**: Full TypeScript support with detailed prop interfaces
- **Flexible Styling**: Support for custom className props and CSS-in-JS
- **Forward Refs**: All components properly forward refs for library integration
`
  }

  /**
   * Builds the content for a single component documentation page
   * @param componentDoc - Component documentation data
   * @returns Markdown content for the component page
   */
  private buildComponentPageContent(componentDoc: ComponentDocumentation): string {
    const {name, description, props = [], examples = [], jsdoc} = componentDoc

    // Extract first paragraph as short description for frontmatter
    const firstParagraph = description?.split('\n\n')[0] || `Documentation for the ${name} component`
    const yamlSafeDescription = firstParagraph
      .replaceAll('\n', ' ')
      .replaceAll(/\s+/g, ' ')
      .trim()
      .replaceAll('"', String.raw`\"`)

    const frontmatter = `---
title: ${name}
description: "${yamlSafeDescription}"
---`

    // Build main content
    let content = `${frontmatter}

# ${name}

${description || 'No description available'}

## Import

\`\`\`tsx
import { ${name} } from '@sparkle/ui'
\`\`\`
`

    // Add props documentation if available
    if (props.length > 0) {
      content += `
## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
${props.map(prop => this.formatPropRow(prop)).join('\n')}
`
    }

    // Add examples from JSDoc
    if (examples.length > 0) {
      content += `\n## Examples\n`

      for (const [index, example] of examples.entries()) {
        // Check if example already has title and code fences (new JSDoc format)
        const hasCodeFence = example.includes('```')

        if (hasCodeFence) {
          // Example already formatted with title and code block, use as-is
          const lines = example.split('\n')
          const title = lines[0] || `Example ${index + 1}`

          content += `
### ${title}

${lines.slice(1).join('\n')}
`
        } else {
          // Legacy format: plain code, extract title from comment
          const titleMatch = example.match(/^\/\/ (.*)$/m)
          const title = titleMatch ? titleMatch[1] : `Example ${index + 1}`

          content += `
### ${title}

\`\`\`tsx
${example}
\`\`\`
`
        }
      }
    }

    // Extract and add sections from JSDoc tags
    const jsdocSections = this.extractJSDocSections(jsdoc)

    // Add features section if available
    if (jsdocSections.features) {
      content += `
## Features

${jsdocSections.features}
`
    }

    // Add validation states for Form components
    if (jsdocSections.validationStates) {
      content += `
## Validation States

${jsdocSections.validationStates}
`
    }

    // Add best practices section if available
    if (jsdocSections.bestPractices) {
      content += `
## Best Practices

${jsdocSections.bestPractices}
`
    }

    // Add theme integration section
    const themeTokens = jsdocSections.themeTokens || this.getDefaultThemeTokens(name)
    content += `
## Theme Integration

This component uses CSS custom properties from \`@sparkle/theme\` for consistent styling across light and dark modes.

### Design Tokens Used

${themeTokens}

You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your \`@sparkle/theme\` configuration
2. **CSS Classes**: Apply custom CSS classes via the \`className\` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component
`

    // Add accessibility section
    const accessibilityNotes = jsdocSections.accessibility || this.generateAccessibilityNotes(name)
    content += `
## Accessibility

${accessibilityNotes}
`

    // Add related components
    content += `
## Related Components

${this.generateRelatedComponents(componentDoc)}
`

    // Add links to API reference and source code
    const apiLink = this.getComponentApiLink(componentDoc)
    const sourceLink = this.getComponentSourceLink(componentDoc)

    content += `
## Additional Resources

- [View source code](${sourceLink})
- [API Documentation](${apiLink})
`

    return content
  }

  /**
   * Extracts structured sections from JSDoc tags
   * @param jsdoc - JSDoc annotation object
   * @returns Record of section names to their content
   */
  private extractJSDocSections(jsdoc?: Annotation): Record<string, string> {
    const sections: Record<string, string> = {}

    if (!jsdoc) return sections

    // Extract @features tag content
    const featuresTag = jsdoc.tags?.find(tag => tag.title === 'features')
    if (featuresTag?.description) {
      sections.features = featuresTag.description
    }

    // Extract @best or @best-practices tag content
    // Note: JSDoc parser treats hyphens as word separators, so "@best-practices" becomes tag "best" with description "-practices..."
    const bestPracticesTag = jsdoc.tags?.find(tag => tag.title === 'best' || tag.title === 'best-practices')
    if (bestPracticesTag?.description) {
      // Remove leading "-practices" if present
      sections.bestPractices = bestPracticesTag.description.replace(/^-practices\s*/, '')
    }

    // Extract @accessibility tag content
    const accessibilityTag = jsdoc.tags?.find(tag => tag.title === 'accessibility')
    if (accessibilityTag?.description) {
      sections.accessibility = accessibilityTag.description
    }

    // Extract @theme or @theme-tokens tag content
    const themeTokensTag = jsdoc.tags?.find(tag => tag.title === 'theme' || tag.title === 'theme-tokens')
    if (themeTokensTag?.description) {
      // Remove leading "-tokens" if present
      sections.themeTokens = themeTokensTag.description.replace(/^-tokens\s*/, '')
    }

    // Extract @validation or @validation-states tag content
    const validationStatesTag = jsdoc.tags?.find(tag => tag.title === 'validation' || tag.title === 'validation-states')
    if (validationStatesTag?.description) {
      // Remove leading "-states" if present
      sections.validationStates = validationStatesTag.description.replace(/^-states\s*/, '')
    }

    return sections
  }

  /**
   * Gets default theme tokens for common components
   * @param componentName - Name of the component
   * @returns Markdown list of theme tokens used by the component
   */
  private getDefaultThemeTokens(componentName: string): string {
    const commonTokens: Record<string, string> = {
      Button: `- \`--theme-primary-*\`: Primary button variants
- \`--theme-success-*\`: Success semantic variants
- \`--theme-warning-*\`: Warning semantic variants
- \`--theme-error-*\`: Error semantic variants
- \`--theme-surface-*\`: Secondary and ghost variants`,
      Form: `- \`--theme-surface-primary\`: Form background
- \`--theme-border\`: Form border
- \`--theme-text-primary\`: Label text
- \`--theme-error-500\`: Error messages
- \`--theme-success-500\`: Success messages`,
    }

    return commonTokens[componentName] || `- \`--theme-*\`: Uses theme design tokens for consistent styling`
  }

  /**
   * Gets the GitHub source link for a component
   * @param componentDoc - Component documentation data
   * @returns GitHub URL to the component source file
   */
  private getComponentSourceLink(componentDoc: ComponentDocumentation): string {
    const repoBase = 'https://github.com/marcusrbrown/sparkle/blob/main'
    return `${repoBase}/packages/ui/src/${componentDoc.filePath}`
  }

  /**
   * Gets the API reference link for a component
   * @param componentDoc - Component documentation data
   * @returns Relative URL to the API reference page
   */
  private getComponentApiLink(componentDoc: ComponentDocumentation): string {
    const apiBase = '/api/ui/src#'
    return `${apiBase}${componentDoc.name.toLowerCase()}`
  }

  /**
   * Formats a single prop row for the props table
   * @param prop - Property documentation data
   * @returns Markdown table row for the prop
   */
  private formatPropRow(prop: PropDocumentation): string {
    const {name, type, required, defaultValue, description} = prop

    const escapedType = type.replaceAll('|', String.raw`\|`)
    const requiredText = required ? '✓' : ''
    const defaultText = defaultValue || ''
    const descriptionText = description || ''

    return `| \`${name}\` | \`${escapedType}\` | ${requiredText} | \`${defaultText}\` | ${descriptionText} |`
  }

  /**
   * Generates accessibility notes for a component
   * @param componentName - Name of the component
   * @returns Accessibility guidance text
   */
  private generateAccessibilityNotes(componentName: string): string {
    const commonNotes = {
      Button:
        'Supports keyboard navigation, focus management, and screen reader announcements. Use semantic button elements for actions.',
      Form: 'Includes proper form labeling, validation states, and error messaging for screen readers.',
      Input: 'Provides proper labeling, validation feedback, and keyboard navigation support.',
    }

    return (
      commonNotes[componentName as keyof typeof commonNotes] ||
      'This component follows accessibility best practices with proper ARIA attributes and keyboard support.'
    )
  }

  /**
   * Generates related components section
   * @param componentDoc - Component documentation data
   * @returns Markdown list of related components or message if none found
   */
  private generateRelatedComponents(componentDoc: ComponentDocumentation): string {
    const componentName = componentDoc.name
    const allComponentNames = this.componentDocs.map(doc => doc.name)

    // Simple heuristic to find related components
    const related = allComponentNames.filter(name => {
      if (name === componentName) return false

      // Look for components with similar prefixes (e.g., Form*, Button*)
      const componentPrefix = componentName.match(/^[A-Z][a-z]+/)?.[0]
      const namePrefix = name.match(/^[A-Z][a-z]+/)?.[0]

      return componentPrefix && namePrefix && componentPrefix === namePrefix
    })

    if (related.length === 0) {
      return 'No directly related components found.'
    }

    return related
      .map(name => {
        const filename = this.getComponentFilename(name).replace('.md', '')
        return `- [${name}](./${filename})`
      })
      .join('\n')
  }

  /**
   * Gets the filename for a component documentation page
   * @param componentName - Name of the component in PascalCase
   * @returns Kebab-case filename with .md extension
   */
  private getComponentFilename(componentName: string): string {
    // Convert PascalCase to kebab-case
    const kebabCase = componentName.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

    return `${kebabCase}.md`
  }
}

// CLI execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const generator = new MarkdownGenerator()
    await generator.generateAll()
    consola.success('🎉 Markdown generation completed successfully!')
  } catch (error) {
    consola.error('❌ Markdown generation failed:', error)
    process.exit(1)
  }
}
