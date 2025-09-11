import React from 'react'

interface AccessibleCodeBlockProps {
  code: string
  language: string
  title?: string
  description?: string
  _showLineNumbers?: boolean
}

/**
 * An accessible code block component that follows WCAG 2.1 AA guidelines
 *
 * Features:
 * - Proper semantic markup with role="region"
 * - Accessible labels and descriptions
 * - Copy to clipboard functionality with screen reader announcements
 * - Keyboard navigation support
 * - High contrast support
 */
export function AccessibleCodeBlock({
  code,
  language,
  title,
  description,
  _showLineNumbers = false,
}: AccessibleCodeBlockProps): React.JSX.Element {
  const [copied, setCopied] = React.useState(false)
  const codeRef = React.useRef<HTMLElement>(null)
  const announcementRef = React.useRef<HTMLDivElement>(null)

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)

      // Announce to screen readers
      if (announcementRef.current) {
        announcementRef.current.textContent = 'Code copied to clipboard'
      }

      setTimeout(() => {
        setCopied(false)
        if (announcementRef.current) {
          announcementRef.current.textContent = ''
        }
      }, 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
      if (announcementRef.current) {
        announcementRef.current.textContent = 'Failed to copy code'
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    // Allow copying with Ctrl+C or Cmd+C when focused
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      copyToClipboard()
    }
  }

  const codeBlockId = React.useId()
  const titleId = title ? `${codeBlockId}-title` : undefined
  const descriptionId = description ? `${codeBlockId}-description` : undefined

  return (
    <div className="sparkle-code-block" role="region" aria-labelledby={titleId} aria-describedby={descriptionId}>
      {/* Screen reader announcement area */}
      <div ref={announcementRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {/* Header with title and copy button */}
      <div className="sparkle-code-block__header">
        {title && (
          <h3 id={titleId} className="sparkle-code-block__title">
            {title}
          </h3>
        )}

        <button
          type="button"
          onClick={copyToClipboard}
          className="sparkle-code-block__copy-button"
          aria-label={`Copy ${language} code to clipboard`}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <span aria-hidden="true">✓</span>
              <span className="sr-only">Copied</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">📋</span>
              <span className="sr-only">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Description */}
      {description && (
        <p id={descriptionId} className="sparkle-code-block__description">
          {description}
        </p>
      )}

      {/* Code container */}
      <div className="sparkle-code-block__container">
        <pre
          className={`sparkle-code-block__pre language-${language}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={`${language} code block${title ? `: ${title}` : ''}`}
        >
          <code ref={codeRef} className={`sparkle-code-block__code language-${language}`} data-language={language}>
            {code}
          </code>
        </pre>

        {/* Language indicator */}
        <div className="sparkle-code-block__language" aria-label={`Programming language: ${language}`}>
          {language}
        </div>
      </div>
    </div>
  )
}

// CSS-in-JS styles (these would typically be in a separate CSS file)
const styles = `
.sparkle-code-block {
  border: 1px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-md);
  background: var(--sl-color-gray-1);
  overflow: hidden;
  font-family: var(--sparkle-font-family-mono);
}

.sparkle-code-block__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  background: var(--sl-color-gray-2);
  border-bottom: 1px solid var(--sl-color-gray-3);
}

.sparkle-code-block__title {
  margin: 0;
  font-size: var(--sparkle-font-size-sm);
  font-weight: 600;
  color: var(--sl-color-text);
}

.sparkle-code-block__copy-button {
  background: transparent;
  border: 1px solid var(--sl-color-gray-4);
  border-radius: var(--sparkle-border-radius-sm);
  padding: var(--sparkle-spacing-xs);
  cursor: pointer;
  font-size: var(--sparkle-font-size-sm);
  color: var(--sl-color-text);
  min-height: 32px;
  min-width: 32px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.sparkle-code-block__copy-button:hover {
  background: var(--sl-color-gray-3);
  border-color: var(--sl-color-gray-5);
}

.sparkle-code-block__copy-button:focus-visible {
  outline: 2px solid var(--sl-color-accent);
  outline-offset: 2px;
}

.sparkle-code-block__description {
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  margin: 0;
  font-size: var(--sparkle-font-size-sm);
  color: var(--sl-color-gray-6);
  background: var(--sl-color-gray-1);
}

.sparkle-code-block__container {
  position: relative;
}

.sparkle-code-block__pre {
  margin: 0;
  padding: var(--sparkle-spacing-md);
  overflow-x: auto;
  background: var(--sl-color-white);
  font-family: var(--sparkle-font-family-mono);
  font-size: var(--sparkle-font-size-sm);
  line-height: 1.5;
  color: var(--sl-color-text);
}

.sparkle-code-block__pre:focus-visible {
  outline: 2px solid var(--sl-color-accent);
  outline-offset: -2px;
}

.sparkle-code-block__code {
  display: block;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.sparkle-code-block__language {
  position: absolute;
  top: var(--sparkle-spacing-xs);
  right: var(--sparkle-spacing-xs);
  background: var(--sl-color-gray-5);
  color: white;
  padding: 2px var(--sparkle-spacing-xs);
  border-radius: var(--sparkle-border-radius-sm);
  font-size: var(--sparkle-font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .sparkle-code-block {
    border-width: 2px;
    border-color: var(--sl-color-text);
  }

  .sparkle-code-block__copy-button {
    border-width: 2px;
    border-color: var(--sl-color-text);
  }

  .sparkle-code-block__language {
    border: 1px solid var(--sl-color-text);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .sparkle-code-block__copy-button {
    transition: none;
  }
}
`

// Inject styles (in a real app, these would be in a CSS file)
if (typeof document !== 'undefined' && !document.querySelector('#sparkle-code-block-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'sparkle-code-block-styles'
  styleSheet.textContent = styles
  document.head.append(styleSheet)
}

export default AccessibleCodeBlock
