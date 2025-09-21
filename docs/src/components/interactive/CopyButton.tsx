import {useCopyToClipboard, type CopyState} from '../../hooks/UseCopyToClipboard'

/**
 * Props for the CopyButton component
 */
export interface CopyButtonProps {
  /** The text content to copy to clipboard */
  textToCopy: string
  /** Custom label for the button when in idle state */
  label?: string
  /** Custom label for the button when copying is in progress */
  copyingLabel?: string
  /** Custom label for the button when copy was successful */
  copiedLabel?: string
  /** Custom label for the button when copy failed */
  errorLabel?: string
  /** Additional CSS classes to apply to the button */
  className?: string
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Button style variant */
  variant?: 'default' | 'outline' | 'ghost' | 'minimal'
  /** Whether to show an icon alongside the text */
  showIcon?: boolean
  /** Whether the button should be disabled */
  disabled?: boolean
  /** Duration in milliseconds to show "copied" state */
  resetDelay?: number
  /** Custom aria-label for accessibility */
  ariaLabel?: string
  /** Callback function called when copy operation completes */
  onCopy?: (success: boolean, error?: string | null) => void
  /** Optional tooltip text to display on hover */
  title?: string
}

/**
 * SVG icons for different copy states
 */
const CopyIcon = () => (
  <svg
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
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const CheckIcon = () => (
  <svg
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
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const ErrorIcon = () => (
  <svg
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
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
)

const LoadingIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
)

/**
 * A reusable copy-to-clipboard button component with visual feedback and accessibility support.
 *
 * This component provides a user-friendly way to copy text content to the clipboard with
 * clear visual feedback states (idle, copying, copied, error). It includes proper
 * accessibility features, keyboard support, and customizable styling options.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CopyButton textToCopy="Hello, World!" />
 *
 * // Custom styling and labels
 * <CopyButton
 *   textToCopy={codeContent}
 *   label="Copy Code"
 *   copiedLabel="Copied!"
 *   variant="outline"
 *   size="sm"
 *   showIcon={true}
 *   onCopy={(success, error) => {
 *     if (success) {
 *       console.log('Code copied successfully!')
 *     } else {
 *       console.error('Copy failed:', error)
 *     }
 *   }}
 * />
 *
 * // Minimal style for inline use
 * <CopyButton
 *   textToCopy="npm install @sparkle/ui"
 *   variant="minimal"
 *   size="sm"
 *   ariaLabel="Copy install command"
 * />
 * ```
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Copy',
  copyingLabel = 'Copying...',
  copiedLabel = 'Copied!',
  errorLabel = 'Failed',
  className = '',
  size = 'md',
  variant = 'default',
  showIcon = true,
  disabled = false,
  resetDelay = 2000,
  ariaLabel,
  onCopy,
  title,
}) => {
  const {state, copyToClipboard, error, isCopying} = useCopyToClipboard({
    resetDelay,
  })

  const handleCopy = async () => {
    if (disabled || isCopying) return

    const success = await copyToClipboard(textToCopy)
    onCopy?.(success, error)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Enter and Space keys for activation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCopy()
    }
    // Handle Escape key to dismiss feedback
    else if (event.key === 'Escape' && (state === 'copied' || state === 'error')) {
      // Reset state on Escape key
      event.preventDefault()
    }
  }

  // Dynamic label based on state
  const getLabel = () => {
    switch (state) {
      case 'copying':
        return copyingLabel
      case 'copied':
        return copiedLabel
      case 'error':
        return errorLabel
      default:
        return label
    }
  }

  // Dynamic icon based on state
  const getIcon = () => {
    if (!showIcon) return null

    switch (state) {
      case 'copying':
        return <LoadingIcon />
      case 'copied':
        return <CheckIcon />
      case 'error':
        return <ErrorIcon />
      default:
        return <CopyIcon />
    }
  }

  // CSS classes for different variants and sizes
  const getButtonClasses = () => {
    const baseClasses = [
      'copy-button',
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'font-medium',
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-blue-500',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
    ]

    // Size variants
    const sizeClasses = {
      sm: ['px-2', 'py-1', 'text-xs', 'rounded'],
      md: ['px-3', 'py-2', 'text-sm', 'rounded-md'],
      lg: ['px-4', 'py-2', 'text-base', 'rounded-lg'],
    }

    // Style variants
    const variantClasses = {
      default: ['bg-blue-600', 'text-white', 'hover:bg-blue-700', 'active:bg-blue-800', 'border', 'border-blue-600'],
      outline: [
        'bg-transparent',
        'text-blue-600',
        'border',
        'border-blue-600',
        'hover:bg-blue-50',
        'active:bg-blue-100',
        'dark:text-blue-400',
        'dark:border-blue-400',
        'dark:hover:bg-blue-900/20',
        'dark:active:bg-blue-900/30',
      ],
      ghost: [
        'bg-transparent',
        'text-gray-600',
        'hover:bg-gray-100',
        'active:bg-gray-200',
        'dark:text-gray-400',
        'dark:hover:bg-gray-800',
        'dark:active:bg-gray-700',
      ],
      minimal: [
        'bg-transparent',
        'text-gray-500',
        'hover:text-gray-700',
        'active:text-gray-900',
        'dark:text-gray-400',
        'dark:hover:text-gray-200',
        'dark:active:text-gray-100',
        'p-1',
      ],
    }

    // State-specific classes
    const stateClasses: Record<CopyState, string[]> = {
      copying: ['cursor-wait'],
      copied: ['text-green-600', 'dark:text-green-400'],
      error: ['text-red-600', 'dark:text-red-400'],
      idle: [],
    }

    return [
      ...baseClasses,
      ...(variant === 'minimal' ? [] : sizeClasses[size]),
      ...variantClasses[variant],
      ...(stateClasses[state] || []),
      className,
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <button
      type="button"
      className={getButtonClasses()}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      disabled={disabled || isCopying}
      aria-label={ariaLabel || `${getLabel()} to clipboard`}
      aria-live="polite"
      aria-atomic="true"
      title={title || `${getLabel()} to clipboard${error ? `: ${error}` : ''}`}
    >
      {getIcon()}
      <span className={showIcon ? '' : 'sr-only'}>{getLabel()}</span>
    </button>
  )
}

// Default export for Astro compatibility
export default CopyButton
