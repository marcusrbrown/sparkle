/**
 * Theme Preview Component
 *
 * Provides an isolated theme environment for component testing.
 * Allows previewing in light/dark modes without affecting the main site theme,
 * using scoped CSS custom properties for theme isolation.
 */

import {useState} from 'react'
import {MoonIcon, SunIcon} from './icons'

export type PreviewTheme = 'light' | 'dark'

export interface ThemePreviewProps {
  /** @default 'light' */
  initialTheme?: PreviewTheme
  children: React.ReactNode
  /** @default true */
  showControls?: boolean
  title?: string
  className?: string
}

/**
 * Renders content in an isolated theme container with optional theme controls.
 * Uses data-theme attribute and scoped CSS variables to prevent theme bleed.
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
                onClick={(): void => setTheme('light')}
                className={`theme-preview-control ${theme === 'light' ? 'active' : ''}`}
                aria-pressed={theme === 'light'}
                aria-label="Preview in light mode"
              >
                <SunIcon />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={(): void => setTheme('dark')}
                className={`theme-preview-control ${theme === 'dark' ? 'active' : ''}`}
                aria-pressed={theme === 'dark'}
                aria-label="Preview in dark mode"
              >
                <MoonIcon />
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
