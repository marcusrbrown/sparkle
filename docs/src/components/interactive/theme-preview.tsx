/**
 * Theme Preview Component
 *
 * Wraps content in a theme-switchable container for previewing components
 * in both light and dark modes independently of the main site theme.
 */

import {useState} from 'react'

export type PreviewTheme = 'light' | 'dark'

export interface ThemePreviewProps {
  /**
   * Initial theme for the preview
   * @default 'light'
   */
  initialTheme?: PreviewTheme
  /**
   * Content to preview (passed as children)
   */
  children: React.ReactNode
  /**
   * Show theme controls
   * @default true
   */
  showControls?: boolean
  /**
   * Title for the preview section
   */
  title?: string
  /**
   * Custom className for the container
   */
  className?: string
}

/**
 * ThemePreview component for previewing content in different themes
 */
export function ThemePreview({
  initialTheme = 'light',
  children,
  showControls = true,
  title,
  className = '',
}: ThemePreviewProps): React.JSX.Element {
  const [theme, setTheme] = useState<PreviewTheme>(initialTheme)

  return (
    <div className={`theme-preview-wrapper ${className}`}>
      {(title || showControls) && (
        <div className="theme-preview-header">
          {title && <h4 className="theme-preview-title">{title}</h4>}
          {showControls && (
            <div className="theme-preview-controls" role="radiogroup" aria-label="Preview theme selection">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`theme-preview-control ${theme === 'light' ? 'active' : ''}`}
                aria-pressed={theme === 'light'}
                aria-label="Preview in light mode"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`theme-preview-control ${theme === 'dark' ? 'active' : ''}`}
                aria-pressed={theme === 'dark'}
                aria-label="Preview in dark mode"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Dark</span>
              </button>
            </div>
          )}
        </div>
      )}
      <div className={`theme-preview-content`} data-theme={theme}>
        {children}
      </div>
    </div>
  )
}
