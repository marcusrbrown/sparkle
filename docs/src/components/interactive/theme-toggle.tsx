/**
 * Theme Toggle Component
 *
 * Interactive toggle for switching between light, dark, and auto themes.
 * Syncs with Starlight's built-in theme system and persists user preference.
 */

import {useEffect, useState} from 'react'

export type Theme = 'light' | 'dark' | 'auto'

export interface ThemeToggleProps {
  /**
   * Initial theme mode
   * @default 'auto'
   */
  initialTheme?: Theme
  /**
   * Display variant of the toggle
   * @default 'buttons'
   */
  variant?: 'buttons' | 'dropdown' | 'icons'
  /**
   * Size of the toggle
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Show labels for theme options
   * @default true
   */
  showLabels?: boolean
  /**
   * Custom className for styling
   */
  className?: string
  /**
   * Callback when theme changes
   */
  onThemeChange?: (theme: Theme) => void
}

const STORAGE_KEY = 'starlight-theme'

/**
 * Get the current theme from Starlight's system
 */
function getStarlightTheme(): Theme {
  if (typeof window === 'undefined') return 'auto'

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }

  return 'auto'
}

/**
 * Set theme in Starlight's system
 */
function setStarlightTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEY, theme)

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effectiveTheme = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme

  document.documentElement.dataset.theme = effectiveTheme
}

/**
 * ThemeToggle component for switching between light, dark, and auto themes
 */
export function ThemeToggle({
  initialTheme = 'auto',
  variant = 'buttons',
  size = 'md',
  showLabels = true,
  className = '',
  onThemeChange,
}: ThemeToggleProps): React.JSX.Element {
  const [currentTheme, setCurrentTheme] = useState<Theme>(initialTheme)
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const theme = getStarlightTheme()
    setCurrentTheme(theme)
    setMounted(true)
  }, [])

  // Listen for system theme preference changes
  useEffect(() => {
    if (currentTheme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      const effectiveTheme = mediaQuery.matches ? 'dark' : 'light'
      document.documentElement.dataset.theme = effectiveTheme
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [currentTheme])

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme)
    setStarlightTheme(theme)
    onThemeChange?.(theme)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className={`theme-toggle theme-toggle-loading ${className}`} />
  }

  const sizeClasses = {
    sm: 'theme-toggle-sm',
    md: 'theme-toggle-md',
    lg: 'theme-toggle-lg',
  }

  if (variant === 'dropdown') {
    return (
      <div className={`theme-toggle theme-toggle-dropdown ${sizeClasses[size]} ${className}`}>
        <label htmlFor="theme-select" className="theme-toggle-label">
          {showLabels && <span>Theme:</span>}
          <select
            id="theme-select"
            value={currentTheme}
            onChange={e => handleThemeChange(e.target.value as Theme)}
            className="theme-toggle-select"
            aria-label="Select theme"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </div>
    )
  }

  if (variant === 'icons') {
    return (
      <div
        className={`theme-toggle theme-toggle-icons ${sizeClasses[size]} ${className}`}
        role="radiogroup"
        aria-label="Theme selection"
      >
        <button
          type="button"
          onClick={() => handleThemeChange('light')}
          className={`theme-toggle-icon ${currentTheme === 'light' ? 'active' : ''}`}
          aria-label="Light theme"
          aria-pressed={currentTheme === 'light'}
          title="Light theme"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
        </button>
        <button
          type="button"
          onClick={() => handleThemeChange('dark')}
          className={`theme-toggle-icon ${currentTheme === 'dark' ? 'active' : ''}`}
          aria-label="Dark theme"
          aria-pressed={currentTheme === 'dark'}
          title="Dark theme"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
        </button>
        <button
          type="button"
          onClick={() => handleThemeChange('auto')}
          className={`theme-toggle-icon ${currentTheme === 'auto' ? 'active' : ''}`}
          aria-label="Auto theme"
          aria-pressed={currentTheme === 'auto'}
          title="Auto theme (system preference)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </button>
      </div>
    )
  }

  // Default: buttons variant
  return (
    <div
      className={`theme-toggle theme-toggle-buttons ${sizeClasses[size]} ${className}`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      <button
        type="button"
        onClick={() => handleThemeChange('light')}
        className={`theme-toggle-button ${currentTheme === 'light' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'light'}
      >
        {showLabels && <span>Light</span>}
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('dark')}
        className={`theme-toggle-button ${currentTheme === 'dark' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'dark'}
      >
        {showLabels && <span>Dark</span>}
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('auto')}
        className={`theme-toggle-button ${currentTheme === 'auto' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'auto'}
      >
        {showLabels && <span>Auto</span>}
      </button>
    </div>
  )
}
