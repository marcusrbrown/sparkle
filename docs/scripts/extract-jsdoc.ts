import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join, relative} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {parse as parseJSDoc, type Annotation} from 'doctrine'
import {Project, SyntaxKind, type FunctionDeclaration, type VariableDeclaration} from 'ts-morph'

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
 * Extracts JSDoc comments and component metadata from @sparkle/ui components
 */
export class JSDocExtractor {
  private project: Project
  private uiPackagePath: string
  private outputPath: string

  constructor() {
    // Initialize TypeScript project for parsing
    this.project = new Project({
      tsConfigFilePath: join(scriptDir, '../../packages/ui/tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    })

    this.uiPackagePath = join(scriptDir, '../../packages/ui/src')
    this.outputPath = join(scriptDir, '../src/content/docs/components')

    // Ensure output directory exists
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, {recursive: true})
    }
  }

  /**
   * Extracts documentation from all components in the UI package
   */
  async extractAll(): Promise<ComponentDocumentation[]> {
    console.log('🔍 Extracting JSDoc documentation from @sparkle/ui components...')

    const componentFiles = this.project.getSourceFiles().filter(file => {
      const filePath = file.getFilePath()
      return (
        filePath.includes('packages/ui/src/components') &&
        (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) &&
        !filePath.includes('.test.') &&
        !filePath.includes('.stories.') &&
        !filePath.includes('index.ts')
      )
    })

    const documentation: ComponentDocumentation[] = []

    for (const file of componentFiles) {
      try {
        const componentDocs = await this.extractFromFile(file.getFilePath())
        documentation.push(...componentDocs)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`⚠️  Failed to extract documentation from ${file.getFilePath()}: ${errorMessage}`)
      }
    }

    console.log(`✅ Extracted documentation for ${documentation.length} components`)
    return documentation
  }

  /**
   * Extracts documentation from a single TypeScript file
   */
  private async extractFromFile(filePath: string): Promise<ComponentDocumentation[]> {
    const sourceFile = this.project.getSourceFile(filePath)
    if (!sourceFile) {
      throw new Error(`Could not load source file: ${filePath}`)
    }

    const documentation: ComponentDocumentation[] = []
    const relativeFilePath = relative(this.uiPackagePath, filePath)

    // Find all exported React components (functions with JSX.Element return type or React.forwardRef)
    const exportedDeclarations = sourceFile.getExportedDeclarations()

    for (const [exportName, declarations] of exportedDeclarations) {
      for (const declaration of declarations) {
        // Handle React.forwardRef components
        if (declaration.getKind() === SyntaxKind.VariableDeclaration) {
          const variableDeclaration = declaration as VariableDeclaration
          const initializer = variableDeclaration.getInitializer()

          if (initializer?.getText().includes('React.forwardRef')) {
            const componentDoc = this.extractComponentDocumentation(exportName, relativeFilePath, variableDeclaration)
            if (componentDoc) {
              documentation.push(componentDoc)
            }
          }
        }

        // Handle regular function components
        if (declaration.getKind() === SyntaxKind.FunctionDeclaration) {
          const functionDeclaration = declaration as FunctionDeclaration
          const returnType = functionDeclaration.getReturnType()

          if (this.isReactComponent(returnType.getText())) {
            const componentDoc = this.extractComponentDocumentation(exportName, relativeFilePath, functionDeclaration)
            if (componentDoc) {
              documentation.push(componentDoc)
            }
          }
        }
      }
    }

    return documentation
  }

  /**
   * Extracts documentation for a specific component declaration
   */
  private extractComponentDocumentation(
    name: string,
    filePath: string,
    declaration: VariableDeclaration | FunctionDeclaration,
  ): ComponentDocumentation | null {
    try {
      // Get JSDoc comments using a more robust approach
      let jsDocTags: any[] = []
      let description = ''
      let jsdoc: Annotation | undefined
      let examples: string[] = []

      // Try multiple approaches to get JSDoc comments
      // 1. Try getJsDocs() method first
      try {
        jsDocTags = (declaration as any).getJsDocs?.() || []
      } catch {
        jsDocTags = []
      }

      // 2. If no JSDoc found via getJsDocs, look for leading comments manually
      if (jsDocTags.length === 0) {
        const sourceFile = declaration.getSourceFile()
        const declarationStart = declaration.getStart()

        // Get all comments in the file
        const allComments = sourceFile.getFullText().match(/\/\*\*[\s\S]*?\*\//g) || []

        // Find the comment that appears just before this declaration
        for (const comment of allComments) {
          const commentIndex = sourceFile.getFullText().indexOf(comment)
          const commentEnd = commentIndex + comment.length

          // Check if this comment is within ~100 characters before the declaration
          // (allowing for whitespace and export keywords)
          if (commentEnd < declarationStart && declarationStart - commentEnd < 100) {
            // Check if there's mostly whitespace between comment and declaration
            const betweenText = sourceFile.getFullText().slice(commentEnd, declarationStart)
            if (/^\s*(?:export\s+)?(?:const\s+)?$/m.test(betweenText)) {
              try {
                jsdoc = parseJSDoc(comment, {unwrap: true})
                if (jsdoc) {
                  description = jsdoc.description || ''
                  examples =
                    jsdoc.tags
                      ?.filter(tag => tag.title === 'example')
                      .map(tag => tag.description || '')
                      .filter(Boolean) || []
                }
                break // Found the right comment
              } catch {
                // Continue looking for other comments
              }
            }
          }
        }
      } else {
        // Process JSDoc from getJsDocs()
        const jsDocText = jsDocTags[0].getFullText()
        jsdoc = parseJSDoc(jsDocText, {unwrap: true})

        if (jsdoc) {
          description = jsdoc.description || ''
          examples =
            jsdoc.tags
              ?.filter(tag => tag.title === 'example')
              .map(tag => tag.description || '')
              .filter(Boolean) || []
        }
      }

      // Extract props interface documentation
      const props = this.extractPropsDocumentation(declaration)

      return {
        name,
        filePath,
        description,
        jsdoc,
        props,
        examples,
        isDefault: name === 'default',
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Failed to extract documentation for component ${name}: ${errorMessage}`)
      return null
    }
  }

  /**
   * Extracts props documentation from component interface or type
   */
  private extractPropsDocumentation(declaration: VariableDeclaration | FunctionDeclaration): PropDocumentation[] {
    const props: PropDocumentation[] = []

    try {
      // For forwardRef components, look for Props interface
      const sourceFile = declaration.getSourceFile()
      const componentName = declaration.getName()
      const propsInterfaceName = `${componentName}Props`

      // Find the props interface
      const propsInterface = sourceFile.getInterface(propsInterfaceName)
      if (propsInterface) {
        const properties = propsInterface.getProperties()

        for (const property of properties) {
          const propName = property.getName()
          const typeText = property.getType().getText()
          const isOptional = property.hasQuestionToken()
          const jsDocTags = property.getJsDocs()

          let propDescription = ''
          if (jsDocTags.length > 0) {
            const jsDocText = jsDocTags[0].getFullText()
            const parsed = parseJSDoc(jsDocText, {unwrap: true})
            propDescription = parsed.description || ''
          }

          // Extract default value from initializer if present
          let defaultValue: string | undefined
          const initializer = property.getInitializer?.()
          if (initializer) {
            defaultValue = initializer.getText()
          }

          props.push({
            name: propName,
            type: typeText,
            required: !isOptional,
            defaultValue,
            description: propDescription,
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Failed to extract props for ${declaration.getName()}: ${errorMessage}`)
    }

    return props
  }

  /**
   * Checks if a type string represents a React component
   */
  private isReactComponent(typeText: string): boolean {
    return (
      typeText.includes('JSX.Element') ||
      typeText.includes('React.ReactElement') ||
      typeText.includes('ReactNode') ||
      typeText.includes('Element')
    )
  }

  /**
   * Saves extracted documentation to JSON file for further processing
   */
  async saveDocumentation(documentation: ComponentDocumentation[]): Promise<void> {
    const outputFile = join(scriptDir, '../src/generated/component-docs.json')
    const outputDir = dirname(outputFile)

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, {recursive: true})
    }

    writeFileSync(outputFile, JSON.stringify(documentation, null, 2))
    console.log(`📝 Saved component documentation to ${outputFile}`)
  }
}

// CLI execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new JSDocExtractor()

  try {
    const documentation = await extractor.extractAll()
    await extractor.saveDocumentation(documentation)
    console.log('🎉 JSDoc extraction completed successfully!')
  } catch (error) {
    console.error('❌ JSDoc extraction failed:', error)
    process.exit(1)
  }
}
