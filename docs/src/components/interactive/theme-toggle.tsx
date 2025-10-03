/**
 * Theme Toggle Component
 *
 * Interactive toggle for switching between light, dark, and auto themes.
 * Syncs with Starlight's built-in theme system and persists user preference
 * using localStorage for cross-session persistence.
 */

import {useEffect, useState} from 'react'
import {MonitorIcon, MoonIcon, SunIcon} from './icons'

export type Theme = 'light' | 'dark' | 'auto'

export interface ThemeToggleProps {
  /** @default 'auto' */
  initialTheme?: Theme
  /** @default 'buttons' */
  variant?: 'buttons' | 'dropdown' | 'icons'
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default true */
  showLabels?: boolean
  className?: string
  onThemeChange?: (theme: Theme) => void
}

const STORAGE_KEY = 'starlight-theme' as const

/**
 * Retrieves the persisted theme preference from localStorage.
 * Falls back to 'auto' mode if no valid preference is stored.
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
 * Persists theme preference to localStorage and updates the DOM.
 * Resolves 'auto' theme to actual light/dark based on system preference.
 */
function setStarlightTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEY, theme)

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effectiveTheme = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme

  document.documentElement.dataset.theme = effectiveTheme
}

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

  useEffect(() => {
    const theme = getStarlightTheme()
    setCurrentTheme(theme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (currentTheme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (): void => {
      const effectiveTheme = mediaQuery.matches ? 'dark' : 'light'
      document.documentElement.dataset.theme = effectiveTheme
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [currentTheme])

  const handleThemeChange = (theme: Theme): void => {
    setCurrentTheme(theme)
    setStarlightTheme(theme)
    onThemeChange?.(theme)
  }

  if (!mounted) {
    return <div className={`theme-toggle theme-toggle-loading ${className}`} />
  }

  const sizeClasses = {
    sm: 'theme-toggle-sm',
    md: 'theme-toggle-md',
    lg: 'theme-toggle-lg',
  } as const satisfies Record<'sm' | 'md' | 'lg', string>

  if (variant === 'dropdown') {
    return (
      <div className={`theme-toggle theme-toggle-dropdown ${sizeClasses[size]} ${className}`}>
        <label htmlFor="theme-select" className="theme-toggle-label">
          {showLabels && <span>Theme:</span>}
          <select
            id="theme-select"
            value={currentTheme}
            onChange={(e): void => handleThemeChange(e.target.value as Theme)}
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
          onClick={(): void => handleThemeChange('light')}
          className={`theme-toggle-icon ${currentTheme === 'light' ? 'active' : ''}`}
          aria-label="Light theme"
          aria-pressed={currentTheme === 'light'}
          title="Light theme"
        >
          <SunIcon size={20} />
        </button>
        <button
          type="button"
          onClick={(): void => handleThemeChange('dark')}
          className={`theme-toggle-icon ${currentTheme === 'dark' ? 'active' : ''}`}
          aria-label="Dark theme"
          aria-pressed={currentTheme === 'dark'}
          title="Dark theme"
        >
          <MoonIcon size={20} />
        </button>
        <button
          type="button"
          onClick={(): void => handleThemeChange('auto')}
          className={`theme-toggle-icon ${currentTheme === 'auto' ? 'active' : ''}`}
          aria-label="Auto theme"
          aria-pressed={currentTheme === 'auto'}
          title="Auto theme (system preference)"
        >
          <MonitorIcon size={20} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`theme-toggle theme-toggle-buttons ${sizeClasses[size]} ${className}`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      <button
        type="button"
        onClick={(): void => handleThemeChange('light')}
        className={`theme-toggle-button ${currentTheme === 'light' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'light'}
      >
        {showLabels && <span>Light</span>}
      </button>
      <button
        type="button"
        onClick={(): void => handleThemeChange('dark')}
        className={`theme-toggle-button ${currentTheme === 'dark' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'dark'}
      >
        {showLabels && <span>Dark</span>}
      </button>
      <button
        type="button"
        onClick={(): void => handleThemeChange('auto')}
        className={`theme-toggle-button ${currentTheme === 'auto' ? 'active' : ''}`}
        aria-pressed={currentTheme === 'auto'}
      >
        {showLabels && <span>Auto</span>}
      </button>
    </div>
  )
}
