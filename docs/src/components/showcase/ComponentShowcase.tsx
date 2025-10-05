import React, {useState} from 'react'
import {PropsTable, type PropDocumentation} from './PropsTable'

/**
 * Component documentation structure matching JSDoc extraction output.
 *
 * Used by automated documentation generation scripts to display API information.
 */
export interface ComponentDocumentation {
  name: string
  /** Path relative to packages/ui/src for source code links */
  filePath: string
  description?: string
  /** Extracted from TypeScript interface and JSDoc comments */
  props?: PropDocumentation[]
  /** JSDoc @example blocks transformed into code snippets */
  examples?: string[]
  /** Affects display prominence and export syntax in examples */
  isDefault: boolean
}

/**
 * Configuration for live interactive component demonstrations.
 *
 * Combines rendered component with viewable source code for documentation.
 */
export interface ExampleConfig {
  title: string
  /** Explains use case or variant purpose beyond the title */
  description?: string
  /** Live component instance with real props and interactivity */
  component: React.ReactNode
  /** Formatted source code for syntax highlighting and copying */
  code: string
  /** Controls initial code visibility (defaults to hidden) */
  showCode?: boolean
}

/**
 * Props for ComponentShowcase component.
 */
export interface ComponentShowcaseProps {
  /** Automated JSDoc extraction output from packages/ui */
  documentation: ComponentDocumentation
  /** Interactive demos with variant examples and source code */
  examples: ExampleConfig[]
  /** Links to full Storybook playground when provided */
  storybookId?: string
  className?: string
}

/**
 * Comprehensive component showcase combining live demos, API docs, and Storybook integration.
 *
 * Serves as the primary documentation display for Sparkle UI components by unifying
 * automated JSDoc extraction, interactive examples with source code, props tables,
 * and optional Storybook playground links. Implements ARIA tab pattern for accessible
 * navigation between multiple component variants.
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
      <section className="examples-section" aria-labelledby="examples-heading">
        <div className="section-header">
          <h2 id="examples-heading">Examples</h2>
          {examples.length > 1 && (
            <div className="example-tabs" role="tablist" aria-label="Component example variations">
              {examples.map((example, index) => (
                <button
                  key={index}
                  className={`example-tab ${index === activeExampleIndex ? 'active' : ''}`}
                  onClick={() => setActiveExampleIndex(index)}
                  role="tab"
                  aria-selected={index === activeExampleIndex}
                  aria-controls={`example-panel-${index}`}
                  aria-label={`View ${example.title} example`}
                  id={`example-tab-${index}`}
                >
                  {example.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeExample && (
          <div
            className="example-content"
            role="tabpanel"
            id={`example-panel-${activeExampleIndex}`}
            aria-labelledby={`example-tab-${activeExampleIndex}`}
          >
            <div className="example-header">
              <h3>{activeExample.title}</h3>
              {activeExample.description && <p className="example-description">{activeExample.description}</p>}
              <div className="example-controls">
                <button
                  className={`toggle-code-btn ${showCode ? 'active' : ''}`}
                  onClick={() => setShowCode(!showCode)}
                  aria-label={showCode ? 'Hide code example' : 'Show code example'}
                  aria-expanded={showCode}
                  aria-controls="code-container"
                >
                  <span aria-hidden="true">{showCode ? '👁️' : '👁️'}</span> {showCode ? 'Hide Code' : 'Show Code'}
                </button>
              </div>
            </div>

            <div className="example-demo">
              <div className="demo-container" role="region" aria-label={`${activeExample.title} live demo`}>
                {activeExample.component}
              </div>

              {showCode && (
                <div className="code-container" id="code-container" role="region" aria-label="Code example">
                  <div className="code-header">
                    <span className="code-label">React Code</span>
                    <button
                      className="copy-code-btn"
                      onClick={() => navigator.clipboard.writeText(activeExample.code)}
                      aria-label="Copy code to clipboard"
                    >
                      <span aria-hidden="true">📋</span> Copy
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
        <section className="storybook-section" aria-labelledby="storybook-heading">
          <h2 id="storybook-heading">Interactive Playground</h2>
          <p className="storybook-description">
            Explore all variations and configurations in our interactive Storybook playground:
          </p>
          <div className="storybook-container">
            <iframe
              src={`/storybook/iframe.html?id=${storybookId}&viewMode=story`}
              className="storybook-iframe"
              title={`Interactive Storybook playground for ${documentation.name} component`}
              aria-label={`${documentation.name} Storybook interactive examples`}
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
