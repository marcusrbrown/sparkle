import type {BundledLanguage, BundledTheme, HighlighterGeneric} from 'shiki'
import {consola} from 'consola'
import React, {useEffect, useState} from 'react'

import {CopyButton} from './CopyButton'

/**
 * Props for the CodeHighlight component
 */
export interface CodeHighlightProps {
  /** Code content to syntax highlight */
  code: string
  /** Programming language for syntax highlighting */
  language?: BundledLanguage
  /** Theme for syntax highlighting (light or dark) */
  theme?: 'light' | 'dark' | 'auto'
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Lines to highlight (e.g., "1,3-5,7") */
  highlightLines?: string
  /** Starting line number for line numbers display */
  startLineNumber?: number
  /** Optional title for the code block */
  title?: string
  /** Show copy button */
  showCopyButton?: boolean
  /** Copy button position */
  copyButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Additional CSS classes */
  className?: string
  /** Maximum height for scrollable code blocks */
  maxHeight?: string | number
  /** Enable word wrap */
  wordWrap?: boolean
}

/**
 * Parses highlight lines string into a Set of line numbers
 *
 * Supports both individual lines and ranges for flexible highlighting configuration.
 * Uses Set to avoid duplicate line numbers and enable O(1) lookup during rendering.
 *
 * @param highlightLines - String like "1,3-5,7" representing lines to highlight
 * @returns Set of line numbers to highlight
 * @example
 * parseHighlightLines("1,3-5,7") // Returns Set {1, 3, 4, 5, 7}
 */
function parseHighlightLines(highlightLines?: string): Set<number> {
  const lines = new Set<number>()
  if (!highlightLines) return lines

  const parts = highlightLines.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number)
      if (start && end) {
        for (let i = start; i <= end; i++) {
          lines.add(i)
        }
      }
    } else {
      const lineNum = Number(trimmed)
      if (lineNum) lines.add(lineNum)
    }
  }
  return lines
}

/**
 * CodeHighlight - Syntax highlighting component using Shiki
 *
 * Provides syntax highlighting for code blocks with support for multiple languages,
 * themes (light/dark/auto), line numbers, line highlighting, copy-to-clipboard,
 * and various display options.
 *
 * @example
 * ```tsx
 * <CodeHighlight
 *   code="const hello = 'world'"
 *   language="typescript"
 *   theme="dark"
 *   showLineNumbers
 *   highlightLines="1"
 * />
 * ```
 */
export function CodeHighlight(props: CodeHighlightProps): React.ReactElement {
  const {
    code,
    language = 'typescript',
    theme = 'auto',
    showLineNumbers = false,
    highlightLines,
    startLineNumber = 1,
    title,
    showCopyButton = true,
    copyButtonPosition = 'top-right',
    className = '',
    maxHeight,
    wordWrap = false,
  } = props

  const [highlightedCode, setHighlightedCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  // Detect system theme for 'auto' mode
  useEffect(() => {
    if (theme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  // Determine effective theme
  const effectiveTheme = theme === 'auto' ? systemTheme : theme

  // Shiki highlighter instance
  useEffect(() => {
    let cancelled = false

    async function highlightCode() {
      try {
        setLoading(true)
        setError(null)

        // Dynamically import Shiki to avoid SSR issues
        const {createHighlighter} = await import('shiki')

        // Map theme names to Shiki bundled themes
        const shikiTheme: BundledTheme = effectiveTheme === 'dark' ? 'vitesse-dark' : 'vitesse-light'

        // Create highlighter with specified language and theme
        const highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> = await createHighlighter({
          themes: [shikiTheme],
          langs: [language],
        })

        if (cancelled) return

        // Generate highlighted HTML
        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: shikiTheme,
        })

        setHighlightedCode(html)
      } catch (error_) {
        if (!cancelled) {
          consola.error('Shiki highlighting error:', error_)
          setError(error_ instanceof Error ? error_.message : 'Failed to highlight code')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    highlightCode()

    return () => {
      cancelled = true
    }
  }, [code, language, effectiveTheme])

  // Parse highlighted lines
  const highlightedLines = React.useMemo(() => parseHighlightLines(highlightLines), [highlightLines])

  /**
   * Post-process Shiki's HTML output to add line numbers and highlighting
   *
   * Shiki generates clean HTML but doesn't support line numbers or custom highlighting.
   * This post-processing step injects line numbers and applies highlighting classes
   * by manipulating the HTML string before rendering.
   */
  const processedHtml = React.useMemo(() => {
    if (!highlightedCode || (!showLineNumbers && highlightedLines.size === 0)) {
      return highlightedCode
    }

    const lines = highlightedCode.split('\n')
    const codeLines = lines.slice(1, -1) // Remove wrapper divs from Shiki output

    return codeLines
      .map((line, index) => {
        const lineNumber = startLineNumber + index
        const isHighlighted = highlightedLines.has(lineNumber)

        let processedLine = line

        // Add line highlighting
        if (isHighlighted) {
          processedLine = processedLine.replace(/<span class="line">/, '<span class="line highlighted-line">')
        }

        // Add line numbers
        if (showLineNumbers) {
          processedLine = processedLine.replace(
            /<span class="line"([^>]*)>/,
            `<span class="line"$1><span class="line-number">${lineNumber}</span>`,
          )
        }

        return processedLine
      })
      .join('\n')
  }, [highlightedCode, showLineNumbers, highlightedLines, startLineNumber])

  /**
   * Calculate CSS positioning for the copy button
   *
   * Positions the button absolutely within the code block container.
   * Uses rem units for consistent spacing across different viewport sizes.
   */
  const copyButtonStyles: React.CSSProperties = React.useMemo(() => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10,
    }

    const positionMap: Record<typeof copyButtonPosition, React.CSSProperties> = {
      'top-left': {...baseStyles, top: '0.5rem', left: '0.5rem'},
      'top-right': {...baseStyles, top: '0.5rem', right: '0.5rem'},
      'bottom-left': {...baseStyles, bottom: '0.5rem', left: '0.5rem'},
      'bottom-right': {...baseStyles, bottom: '0.5rem', right: '0.5rem'},
    }

    return positionMap[copyButtonPosition] || positionMap['top-right']
  }, [copyButtonPosition])

  if (loading) {
    return (
      <div className={`code-highlight-wrapper loading ${className}`}>
        <div className="code-highlight-loading">
          <div className="loading-spinner" />
          <span>Loading syntax highlighting...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`code-highlight-wrapper error ${className}`}>
        <div className="code-highlight-error">
          <strong>Syntax Highlighting Error:</strong> {error}
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className={`code-highlight-wrapper ${effectiveTheme} ${className}`} style={{position: 'relative'}}>
      {title && (
        <div className="code-highlight-header">
          <span className="code-highlight-title">{title}</span>
          <span className="code-highlight-language">{language}</span>
        </div>
      )}
      <div
        className="code-highlight-container"
        style={{
          maxHeight: maxHeight ? (typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight) : undefined,
          overflow: maxHeight ? 'auto' : undefined,
        }}
      >
        {showCopyButton && (
          <div style={copyButtonStyles}>
            <CopyButton
              textToCopy={code}
              variant="minimal"
              size="sm"
              ariaLabel="Copy code to clipboard"
              title="Copy code"
            />
          </div>
        )}
        <div
          className={`code-highlight-content ${showLineNumbers ? 'with-line-numbers' : ''} ${wordWrap ? 'word-wrap' : ''}`}
          dangerouslySetInnerHTML={{__html: processedHtml || highlightedCode}}
        />
      </div>
    </div>
  )
}

export default CodeHighlight
