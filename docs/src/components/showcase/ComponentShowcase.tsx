import React, {useState} from 'react'
import {PropsTable, type PropDocumentation} from './PropsTable'

/**
 * Component documentation structure matching JSDoc extraction output
 */
export interface ComponentDocumentation {
  /** Component name */
  name: string
  /** File path relative to packages/ui/src */
  filePath: string
  /** Component description from JSDoc */
  description?: string
  /** Component props interface documentation */
  props?: PropDocumentation[]
  /** Usage examples extracted from JSDoc */
  examples?: string[]
  /** Whether this is the default export */
  isDefault: boolean
}

/**
 * Configuration for a live component example
 */
export interface ExampleConfig {
  /** Example title */
  title: string
  /** Description of what this example demonstrates */
  description?: string
  /** React component to render */
  component: React.ReactNode
  /** Source code to display */
  code: string
  /** Whether to show code by default */
  showCode?: boolean
}

/**
 * Props for the ComponentShowcase component
 */
export interface ComponentShowcaseProps {
  /** Component documentation extracted from JSDoc */
  documentation: ComponentDocumentation
  /** Live examples to demonstrate the component */
  examples: ExampleConfig[]
  /** Optional Storybook story ID for iframe embed */
  storybookId?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Comprehensive component showcase with live examples, props table, and API documentation
 *
 * Combines interactive component demonstrations with comprehensive documentation
 * extracted from JSDoc comments and TypeScript interfaces.
 */
export const ComponentShowcase: React.FC<ComponentShowcaseProps> = ({
  documentation,
  examples,
  storybookId,
  className = '',
}) => {
  const [activeExampleIndex, setActiveExampleIndex] = useState(0)
  const [showCode, setShowCode] = useState(false)

  const activeExample = examples[activeExampleIndex]

  return (
    <div className={`component-showcase ${className}`}>
      {/* Header Section */}
      <div className="showcase-header">
        <h1 className="component-title">{documentation.name}</h1>
        {documentation.description && <p className="component-description">{documentation.description}</p>}
        <div className="component-meta">
          <span className="file-path">📁 {documentation.filePath}</span>
          {documentation.isDefault && <span className="default-export-badge">Default Export</span>}
        </div>
      </div>

      {/* Live Examples Section */}
      <section className="examples-section">
        <div className="section-header">
          <h2>Examples</h2>
          {examples.length > 1 && (
            <div className="example-tabs">
              {examples.map((example, index) => (
                <button
                  key={index}
                  className={`example-tab ${index === activeExampleIndex ? 'active' : ''}`}
                  onClick={() => setActiveExampleIndex(index)}
                >
                  {example.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeExample && (
          <div className="example-content">
            <div className="example-header">
              <h3>{activeExample.title}</h3>
              {activeExample.description && <p className="example-description">{activeExample.description}</p>}
              <div className="example-controls">
                <button
                  className={`toggle-code-btn ${showCode ? 'active' : ''}`}
                  onClick={() => setShowCode(!showCode)}
                >
                  {showCode ? '👁️ Hide Code' : '👁️ Show Code'}
                </button>
              </div>
            </div>

            <div className="example-demo">
              <div className="demo-container">{activeExample.component}</div>

              {showCode && (
                <div className="code-container">
                  <div className="code-header">
                    <span className="code-label">React Code</span>
                    <button className="copy-code-btn" onClick={() => navigator.clipboard.writeText(activeExample.code)}>
                      📋 Copy
                    </button>
                  </div>
                  <pre className="code-block">
                    <code>{activeExample.code}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Storybook Integration */}
      {storybookId && (
        <section className="storybook-section">
          <h2>Interactive Playground</h2>
          <p className="storybook-description">
            Explore all variations and configurations in our interactive Storybook playground:
          </p>
          <div className="storybook-container">
            <iframe
              src={`/storybook/iframe.html?id=${storybookId}&viewMode=story`}
              className="storybook-iframe"
              title={`${documentation.name} Storybook`}
              loading="lazy"
            />
          </div>
          <div className="storybook-links">
            <a
              href={`/storybook/?path=/story/${storybookId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="storybook-link"
            >
              🚀 Open in Storybook
            </a>
          </div>
        </section>
      )}

      {/* Props Documentation */}
      {documentation.props && documentation.props.length > 0 && (
        <section className="props-section">
          <PropsTable props={documentation.props} title="Props API" />
        </section>
      )}

      {/* JSDoc Examples */}
      {documentation.examples && documentation.examples.length > 0 && (
        <section className="jsdoc-examples-section">
          <h2>Additional Examples</h2>
          <p className="jsdoc-examples-description">Code examples extracted from JSDoc documentation:</p>
          {documentation.examples.map((example, index) => (
            <div key={index} className="jsdoc-example">
              <h4>Example {index + 1}</h4>
              <pre className="example-code">
                <code>{example}</code>
              </pre>
            </div>
          ))}
        </section>
      )}

      {/* Source Code Links */}
      <section className="source-section">
        <h2>Source Code</h2>
        <div className="source-links">
          <a
            href={`https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/${documentation.filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            📄 View Source on GitHub
          </a>
          <a
            href={`https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/${documentation.filePath.replace('.tsx', '.test.tsx')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            🧪 View Tests
          </a>
        </div>
      </section>
    </div>
  )
}

/**
 * Hook to load component documentation from the generated JSON file
 */
export const useComponentDocumentation = (componentName: string): ComponentDocumentation | null => {
  const [documentation, setDocumentation] = React.useState<ComponentDocumentation | null>(null)

  React.useEffect(() => {
    // In a real implementation, this would fetch from the generated component-docs.json
    // For now, we'll return null and let the parent component provide the data
    // This hook structure allows for future async loading if needed
    setDocumentation(null)
  }, [componentName])

  return documentation
}

/**
 * Utility function to create an ExampleConfig
 */
export const createExample = (
  title: string,
  component: React.ReactNode,
  code: string,
  options: {
    description?: string
    showCode?: boolean
  } = {},
): ExampleConfig => ({
  title,
  component,
  code,
  description: options.description,
  showCode: options.showCode ?? false,
})
