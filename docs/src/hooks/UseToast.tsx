import {useCallback, useEffect, useState} from 'react'

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast notification interface
 */
export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  isVisible?: boolean
}

/**
 * Options for showing a toast
 */
export interface ShowToastOptions {
  type?: ToastType
  duration?: number
}

/**
 * Return type for the toast hook
 */
export interface UseToastResult {
  /** Array of current toasts */
  toasts: Toast[]
  /** Function to show a new toast */
  showToast: (message: string, options?: ShowToastOptions) => string
  /** Function to hide a specific toast */
  hideToast: (id: string) => void
  /** Function to hide all toasts */
  clearToasts: () => void
}

/**
 * Custom hook for managing toast notifications with auto-dismiss functionality.
 *
 * This hook provides a simple toast notification system with support for different
 * types, custom durations, and automatic dismissal. It's designed to be lightweight
 * and easy to integrate into any component.
 *
 * @param defaultDuration Default duration in milliseconds before auto-dismiss
 * @returns Object containing toasts array and management functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toasts, showToast, hideToast } = useToast(3000)
 *
 *   const handleCopy = async () => {
 *     const success = await copyToClipboard('Hello')
 *     if (success) {
 *       showToast('Copied to clipboard!', { type: 'success' })
 *     } else {
 *       showToast('Failed to copy', { type: 'error' })
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleCopy}>Copy</button>
 *       <ToastContainer toasts={toasts} onHide={hideToast} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useToast(defaultDuration = 3000): UseToastResult {
  const [toasts, setToasts] = useState<Toast[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.map(toast => (toast.id === id ? {...toast, isVisible: false} : toast)))

    // Remove from array after animation completes
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id))
    }, 300)
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const showToast = useCallback(
    (message: string, options: ShowToastOptions = {}): string => {
      const {type = 'info', duration = defaultDuration} = options
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const newToast: Toast = {
        id,
        message,
        type,
        duration,
        isVisible: true,
      }

      setToasts(currentToasts => [...currentToasts, newToast])

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }

      return id
    },
    [defaultDuration, hideToast],
  )

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
  }
}

/**
 * Props for individual toast component
 */
export interface ToastItemProps {
  toast: Toast
  onHide: (id: string) => void
}

/**
 * Individual toast notification component with animations and styling.
 */
export const ToastItem: React.FC<ToastItemProps> = ({toast, onHide}) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!toast.isVisible && !isExiting) {
      setIsExiting(true)
    }
  }, [toast.isVisible, isExiting])

  const getToastClasses = () => {
    const baseClasses = [
      'relative',
      'flex',
      'items-center',
      'gap-3',
      'px-4',
      'py-3',
      'rounded-lg',
      'shadow-lg',
      'border',
      'transition-all',
      'duration-300',
      'transform',
      'max-w-sm',
    ]

    const typeClasses = {
      success: [
        'bg-green-50',
        'border-green-200',
        'text-green-800',
        'dark:bg-green-900/20',
        'dark:border-green-700',
        'dark:text-green-300',
      ],
      error: [
        'bg-red-50',
        'border-red-200',
        'text-red-800',
        'dark:bg-red-900/20',
        'dark:border-red-700',
        'dark:text-red-300',
      ],
      warning: [
        'bg-yellow-50',
        'border-yellow-200',
        'text-yellow-800',
        'dark:bg-yellow-900/20',
        'dark:border-yellow-700',
        'dark:text-yellow-300',
      ],
      info: [
        'bg-blue-50',
        'border-blue-200',
        'text-blue-800',
        'dark:bg-blue-900/20',
        'dark:border-blue-700',
        'dark:text-blue-300',
      ],
    }

    const animationClasses =
      isExiting || !toast.isVisible
        ? ['opacity-0', 'translate-x-full', 'scale-95']
        : ['opacity-100', 'translate-x-0', 'scale-100']

    return [...baseClasses, ...typeClasses[toast.type], ...animationClasses].join(' ')
  }

  const getIcon = () => {
    const iconClasses = 'w-5 h-5 flex-shrink-0'

    switch (toast.type) {
      case 'success':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'error':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'warning':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  }

  return (
    <div className={getToastClasses()} role="alert" aria-live="polite">
      {getIcon()}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        type="button"
        className="flex-shrink-0 ml-auto pl-3 hover:opacity-70 transition-opacity"
        onClick={() => onHide(toast.id)}
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * Props for the toast container
 */
export interface ToastContainerProps {
  toasts: Toast[]
  onHide: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  className?: string
}

/**
 * Container component for displaying multiple toast notifications.
 *
 * This component handles the positioning and layout of multiple toasts,
 * providing a clean and accessible notification system.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onHide,
  position = 'top-right',
  className = '',
}) => {
  if (toasts.length === 0) return null

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 flex flex-col gap-2 p-4'

    switch (position) {
      case 'top-left':
        return `${baseClasses} top-0 left-0`
      case 'top-right':
        return `${baseClasses} top-0 right-0`
      case 'top-center':
        return `${baseClasses} top-0 left-1/2 transform -translate-x-1/2`
      case 'bottom-left':
        return `${baseClasses} bottom-0 left-0`
      case 'bottom-right':
        return `${baseClasses} bottom-0 right-0`
      case 'bottom-center':
        return `${baseClasses} bottom-0 left-1/2 transform -translate-x-1/2`
      default:
        return `${baseClasses} top-0 right-0`
    }
  }

  return (
    <div className={`${getPositionClasses()} ${className}`} aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  )
}
