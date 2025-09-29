/**
 * Completion display component for terminal completion suggestions.
 *
 * This component provides a visual overlay showing completion suggestions
 * with keyboard navigation support, styled to match the terminal theme.
 */

import type {CompletionResult, CompletionType} from '../shell/completion-types'

import {cx} from '@sparkle/ui'
import {consola} from 'consola'

/**
 * Position coordinates for the completion overlay.
 */
export interface CompletionPosition {
  /** Horizontal position in pixels */
  readonly left: number
  /** Vertical position in pixels */
  readonly top: number
}

/**
 * Props for the CompletionDisplay component.
 */
export interface CompletionDisplayProps {
  /** Current completion result to display */
  readonly result: CompletionResult | null
  /** Index of currently selected suggestion */
  readonly selectedIndex: number
  /** Whether to show type icons */
  readonly showIcons?: boolean
  /** Whether to show descriptions */
  readonly showDescriptions?: boolean
  /** Maximum number of visible suggestions */
  readonly maxVisible?: number
  /** Custom CSS class names */
  readonly className?: string
  /** Position for the completion overlay */
  readonly position?: CompletionPosition
}

/**
 * Icon mapping for different completion types.
 *
 * These icons provide visual cues to help users quickly identify
 * the type of completion being suggested.
 */
const COMPLETION_TYPE_ICONS = {
  command: '⚡',
  file: '📄',
  directory: '📁',
  environment: '🌍',
  option: '⚙️',
  argument: '📝',
  alias: '🔗',
} as const satisfies Record<CompletionType, string>

/**
 * Get icon for completion type.
 */
function getCompletionIcon(type: CompletionType): string {
  return COMPLETION_TYPE_ICONS[type as keyof typeof COMPLETION_TYPE_ICONS] ?? '•'
}

/**
 * CSS class mapping for different completion types.
 *
 * These colors help users distinguish between different types of completions
 * and align with common terminal color conventions.
 */
const COMPLETION_TYPE_CLASSES = {
  command: 'text-blue-400',
  file: 'text-gray-300',
  directory: 'text-yellow-400',
  environment: 'text-green-400',
  option: 'text-purple-400',
  argument: 'text-cyan-400',
  alias: 'text-orange-400',
} as const satisfies Record<CompletionType, string>

/**
 * Get CSS class for completion type.
 */
function getCompletionTypeClass(type: CompletionType): string {
  return COMPLETION_TYPE_CLASSES[type as keyof typeof COMPLETION_TYPE_CLASSES] ?? 'text-gray-400'
}

/**
 * Completion display component.
 *
 * Renders a styled list of completion suggestions with keyboard selection
 * support and accessibility features.
 */
export function CompletionDisplay({
  result,
  selectedIndex,
  showIcons = true,
  showDescriptions = true,
  maxVisible = 8,
  className,
  position,
}: CompletionDisplayProps): React.JSX.Element | null {
  if (!result || result.suggestions.length === 0) {
    return null
  }

  // Determine visible suggestions based on selection and max visible
  const suggestions = result.suggestions
  const totalSuggestions = suggestions.length

  let startIndex = 0
  let endIndex = Math.min(totalSuggestions, maxVisible)

  // Adjust window if selection is outside visible range
  if (selectedIndex >= endIndex) {
    endIndex = selectedIndex + 1
    startIndex = Math.max(0, endIndex - maxVisible)
  } else if (selectedIndex < startIndex) {
    startIndex = selectedIndex
    endIndex = Math.min(totalSuggestions, startIndex + maxVisible)
  }

  const visibleSuggestions = suggestions.slice(startIndex, endIndex)
  const adjustedSelectedIndex = selectedIndex - startIndex

  const containerStyle = position
    ? {
        position: 'absolute' as const,
        left: position.left,
        top: position.top,
      }
    : {}

  return (
    <div
      className={cx(
        'bg-gray-900 border border-gray-600 rounded-md shadow-lg z-50',
        'max-w-md min-w-0 overflow-hidden',
        'font-mono text-sm',
        className,
      )}
      style={containerStyle}
      role="listbox"
      aria-label="Completion suggestions"
    >
      {/* Header */}
      <div className="px-3 py-1 bg-gray-800 border-b border-gray-600 text-gray-300 text-xs">
        {startIndex + 1}-{endIndex} of {totalSuggestions} suggestions
        {result.hasMore && ' (more available)'}
      </div>

      {/* Suggestions list */}
      <div className="py-1 max-h-64 overflow-y-auto">
        {visibleSuggestions.map((suggestion, index) => {
          const isSelected = index === adjustedSelectedIndex
          const actualIndex = startIndex + index

          return (
            <div
              key={`${suggestion.text}-${actualIndex}`}
              className={cx(
                'px-3 py-1.5 cursor-pointer flex items-start gap-2 min-h-0',
                isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700',
              )}
              role="option"
              aria-selected={isSelected}
              aria-describedby={showDescriptions ? `completion-desc-${actualIndex}` : undefined}
            >
              {/* Icon */}
              {showIcons && (
                <span className="flex-shrink-0 text-base leading-none mt-0.5" aria-hidden="true">
                  {getCompletionIcon(suggestion.type)}
                </span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Text and type */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate flex-1">{suggestion.text}</span>
                  <span
                    className={cx(
                      'text-xs px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0',
                      getCompletionTypeClass(suggestion.type),
                      isSelected ? 'bg-blue-700' : 'bg-gray-800',
                    )}
                  >
                    {suggestion.type}
                  </span>
                </div>

                {/* Description */}
                {showDescriptions && suggestion.description && (
                  <div
                    id={`completion-desc-${actualIndex}`}
                    className={cx('text-xs mt-0.5 truncate', isSelected ? 'text-blue-100' : 'text-gray-400')}
                  >
                    {suggestion.description}
                  </div>
                )}

                {/* Detail */}
                {suggestion.detail && (
                  <div
                    className={cx('text-xs mt-0.5 truncate font-mono', isSelected ? 'text-blue-200' : 'text-gray-500')}
                  >
                    {suggestion.detail}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with navigation hints */}
      <div className="px-3 py-1 bg-gray-800 border-t border-gray-600 text-gray-400 text-xs">
        <div className="flex items-center justify-between">
          <span>↑↓ navigate • Tab/Enter apply • Esc cancel</span>
          {result.commonPrefix && <span className="text-yellow-400">Tab: "{result.commonPrefix}"</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * Calculates the optimal position for displaying completion suggestions.
 *
 * Determines where to position the completion popup based on the current
 * cursor position in the terminal. Uses character width estimation to
 * position the popup near the cursor for better user experience.
 *
 * @param terminalElement - Terminal DOM element for viewport calculations
 * @param cursorPosition - Current cursor position in characters
 * @param _currentCommand - Current command text (reserved for future enhancements)
 * @returns Position coordinates {left, top} in pixels, or null if calculation fails
 */
export function useCompletionPosition(
  terminalElement: HTMLElement | null,
  cursorPosition: number,
  _currentCommand: string,
): {left: number; top: number} | null {
  if (!terminalElement) {
    return null
  }

  try {
    // Get terminal viewport
    const terminalRect = terminalElement.getBoundingClientRect()

    // Estimate cursor position based on character width
    // This is a rough approximation - in a real implementation you'd
    // want to measure the actual cursor position from xterm.js
    const charWidth = 8 // Approximate monospace character width
    const lineHeight = 20 // Approximate line height

    const cursorX = cursorPosition * charWidth
    const cursorY = lineHeight // Assume single line for now

    return {
      left: terminalRect.left + cursorX,
      top: terminalRect.top + cursorY + lineHeight,
    }
  } catch (error) {
    consola.error('Failed to calculate completion position:', error)
    return null
  }
}
